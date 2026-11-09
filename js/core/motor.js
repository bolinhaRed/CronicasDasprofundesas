/* Motor de jogo: o Mestre de Jogo. Estado da campanha, expedição, acções, testes, combate, cenas, aldeia.
   Não toca no DOM. A interface chama G.input(texto), G.roll(n), G.ajudar(id) e lê G.S(), G.sugestoes(). */
(function (CP) {
  'use strict';
  const D = CP.DATA, C = CP.C, R = CP.Rules;
  const G = CP.Game = {};
  let S = null;

  const clone = o => JSON.parse(JSON.stringify(o));
  G.S = () => S;
  G.load = function () { S = CP.Store.load(); if (S && S.v !== 1) S = null; if (S) migrar(); return S; };
  function migrar() {
    S.herois.forEach(h => { h.origem = h.origem || 'humano'; h.talentos = h.talentos || []; h.usos = h.usos || {}; });
    if (S.impeto == null) S.impeto = 2;
    S.reliquias = S.reliquias || [];
    S.stats = S.stats || {};
    S.feitos = S.feitos || {};
    S.desbloq = S.desbloq || {};
    S.diarios = S.diarios || {};
    S.finais = S.finais || {};
    S.slots = S.slots || 3;
    S.comps = S.comps || [];
    S.sobrev = S.sobrev || [];
    S.herois.forEach(h => { h.cicatrizes = h.cicatrizes || []; });
    if (S.exp) { S.exp.bencaos = S.exp.bencaos || []; S.exp.mortes = S.exp.mortes || 0; S.exp.danoSofrido = S.exp.danoSofrido || 0; }
    if (!S.juramento) S.juramento = { texto: JURAMENTO, marcas: 0, feito: false };
    if (S.exp && !S.exp.luz) S.exp.luz = { marcas: 6, max: 6, fonte: 'tocha' };
    if (S.exp) { S.exp.ganhoOuro = S.exp.ganhoOuro || 0; S.exp.tesouros = S.exp.tesouros || 0; }
  }
  const JURAMENTO = 'Livrar o Vale de Corvamonte da sombra que saiu da terra com o terramoto.';
  /* passivo activo: bênção desta expedição ou relíquia */
  const tp = id => !!((S.exp && S.exp.bencaos && S.exp.bencaos.includes(id)) || (S.reliquias && S.reliquias.includes(id)));
  G.tp = tp;
  function poolPassivos(excluir) {
    return Object.keys(D.passivos).filter(k => (!D.passivos[k].bloqueado || S.desbloq[k]) && !(excluir || []).includes(k));
  }
  function sortear(n, excluir, rng) {
    const pool = poolPassivos(excluir);
    const out = [];
    const peso = k => D.passivos[k].raridade === 'lendario' ? 1 : D.passivos[k].raridade === 'raro' ? 3 : 6;
    while (out.length < n && pool.length) {
      const tot = pool.reduce((a, k) => a + peso(k), 0);
      let r = (rng ? rng() : Math.random()) * tot;
      let i = 0;
      for (; i < pool.length; i++) { r -= peso(pool[i]); if (r <= 0) break; }
      out.push(pool.splice(Math.min(i, pool.length - 1), 1)[0]);
    }
    return out;
  }
  function oferecerBencao(motivo) {
    const e = E();
    if (!e || e.escolha) return;
    const n = S.desbloq.bencao4 ? 4 : 3;
    const ops = sortear(n, e.bencaos.concat(S.reliquias), rnd);
    if (!ops.length) return;
    e.escolha = { tipo: 'bencao', opcoes: ops, motivo };
    log('escolha', motivo || 'Escolhe uma bênção para esta expedição.');
  }
  G.escolherBencao = function (id) {
    const e = E();
    if (!e || !e.escolha || !e.escolha.opcoes.includes(id)) return;
    e.bencaos.push(id);
    e.escolha = null;
    log('good', `Bênção: ${D.passivos[id].nome} — ${D.passivos[id].desc}`);
    if (id === 'chama' && e.luz && e.luz.fonte === 'tocha') { e.luz.marcas += 3; e.luz.max += 3; }
    G.save();
  };
  G.recusarBencao = function () { const e = E(); if (e && e.escolha) { e.escolha = null; G.save(); } };
  /* feitos */
  function stat(k, n) {
    S.stats[k] = (S.stats[k] || 0) + (n == null ? 1 : n);
    D.feitos.forEach(f => {
      if (f.stat !== k || S.feitos[f.id] || (S.stats[k] || 0) < f.alvo) return;
      S.feitos[f.id] = true;
      log('feito', `Feito desbloqueado: ${f.nome}! ${f.premioTxt}.`);
      const p = f.premio;
      if (p.tipo === 'ouro') S.ouro += p.n;
      if (p.tipo === 'passivo') S.desbloq[p.id] = true;
      if (p.tipo === 'item') S.desbloq[p.id] = true;
      if (p.tipo === 'origem') S.desbloq[p.id] = true;
      if (p.tipo === 'bencao4') S.desbloq.bencao4 = true;
      if (p.tipo === 'slot') S.slots = 4;
      if (p.tipo === 'reliquia') S.reliquiaPendente = (S.reliquiaPendente || 0) + 1;
      S.diario.push({ dia: S.dia, t: `Feito: ${f.nome}. ${f.premioTxt}.` });
    });
  }
  G.stat = stat;
  /* companheiros */
  const NOMES_COMP = ['Bruno', 'Lia', 'Tomás', 'Inês', 'Duarte', 'Marta', 'Rui', 'Beatriz', 'Gaspar', 'Leonor', 'Simão', 'Clara'];
  const NOMES_CAO = ['Farrusco', 'Tejo', 'Pimenta', 'Lobo', 'Fiel', 'Brasa'];
  const compsExp = () => (E() && E().comps ? E().comps.map(id => S.comps.find(c => c.id === id)).filter(c => c && c.estado === 'ok') : []);
  const temComp = t => compsExp().some(c => c.tipo === t);
  const compDe = t => compsExp().find(c => c.tipo === t);
  G.compsExp = compsExp;
  G.maxComps = () => D.maxCompanheiros(S.herois.filter(h => h.estado !== 'morto').length);
  G.contratar = function (tipo) {
    const d = D.companheiros[tipo];
    if (!d || S.exp || S.ouro < d.preco || S.comps.filter(c => c.estado !== 'morto').length >= G.maxComps()) return false;
    S.ouro -= d.preco;
    const L = tipo === 'cao' ? NOMES_CAO : NOMES_COMP;
    const usados = S.comps.map(c => c.nome);
    const nome = L.find(n => !usados.includes(n)) || L[Math.floor(Math.random() * L.length)];
    S.comps.push({ id: 'c' + (S.nh++), tipo, nome, vida: d.vida, vidaMax: d.vida, estado: 'ok', missoes: 0 });
    log('good', `${nome} (${d.nome}) junta-se à companhia.`);
    G.save();
    return true;
  };
  G.despedir = function (id) { S.comps = S.comps.filter(c => c.id !== id); G.save(); };
  function ferirComp(c, n, quem) {
    c.vida = Math.max(0, c.vida - n);
    bad(`${quem ? quem + ' acerta em ' : ''}${c.nome} (${c.vida}/${c.vidaMax}).`);
    if (c.vida <= 0) {
      c.estado = 'caido';
      bad(`${c.nome} cai!`);
      E().compCaidos = (E().compCaidos || []).concat(c.id);
    }
  }
  function ferirSobrev(sv, n) {
    sv.vida = Math.max(0, sv.vida - n);
    if (sv.vida <= 0) { sv.morto = true; bad(`O sobrevivente que resgataste não aguenta o golpe. Morre nos teus braços.`); }
    else bad(`O sobrevivente é atingido (${sv.vida}/2).`);
  }
  /* sombra profunda */
  function eventoSombra() {
    const e = E();
    const ev = rpick(D.sombras);
    log('sombra', 'A sombra profunda desperta...');
    narr(ev.t);
    if (ev.id === 'uivo') { e.uivo = {}; aptos().forEach(h => { e.uivo[h.id] = true; }); }
    if (ev.id === 'nevoa') e.nevoa = true;
    if (ev.id === 'furia') e.furiaProx = true;
    if (ev.luz) gastarLuz(-ev.luz);
    if (ev.id === 'desanimo') S.impeto = Math.max(0, S.impeto - 2);
    if (ev.id === 'campeao') {
      const via = e.via != null ? celula(dg().conns[e.via], e.zone) : e.pos;
      const en = criarInimigo('*', e.zone, via);
      en.nome = en.nome + ' da sombra'; en.hp += 3; en.hpMax += 3; en.dano += 1; en.sombrio = true;
      draw(`Marca ${art(en)} em ${C.n(en.x, en.y)} com um X grande.`);
      iniciarCombate([en.id]);
    }
  }
  /* tabelas lançadas com o dado (achados, sobrevivência) */
  function achado(n) {
    const e = E();
    e.achados = e.achados || [];
    let i = n - 1;
    let tent = 0;
    while (e.achados.includes(i) && tent < 6) { i = (i + 1) % 6; tent++; }
    if (e.achados.includes(i)) { narr('Já não há aqui nada que não tenhas visto.'); return; }
    e.achados.push(i);
    if (i !== n - 1) sys(`(Esse resultado já saiu nesta expedição: passa ao seguinte, ${i + 1}.)`);
    const a = D.achados[i];
    log('good', a.t);
    if (a.sobrevivente) { e.sobrev = (e.sobrev || []).concat({ vida: 2 }); sys('Leva-o contigo até à saída (escadas). Os inimigos também o podem atacar.'); }
    if (a.efeitos) correrEfeitos(a.efeitos, {});
  }
  const tem = (h, t) => !!(h && h.talentos && h.talentos.includes(t));
  G.tem = tem;
  G.save = function () { if (S) CP.Store.save(S); };
  G.setState = function (s) { S = s; migrar(); G.save(); };
  G.reset = function () { S = null; CP.Store.clear(); };

  /* =========================================================== utilidades */
  const E = () => S && S.exp;
  const H = id => S.herois.find(h => h.id === id);
  const vivos = () => S.herois.filter(h => h.estado !== 'morto');
  const aptos = () => S.herois.filter(h => h.estado === 'ok');
  function vmax(h) { const a = h.armadura ? D.armaduras[h.armadura] : null; return h.vidaBase + (a ? a.vida : 0) + (h.origem === 'anao' ? 2 : 0) + (h.origem === 'meio_orc' ? 1 : 0) - (h.cicatrizes || []).filter(c => c === 'peito').length; }
  G.vmax = vmax;
  function arma(h) { return D.armas[h.arma] || D.armas.punhos; }
  G.arma = arma;
  function itemDef(id) { return D.itens[id] || D.armas[id] || D.armaduras[id] || { nome: id }; }
  G.itemDef = itemDef;
  const has = id => (S.mochila[id] || 0) > 0;
  function addItem(id, n) { S.mochila[id] = (S.mochila[id] || 0) + (n || 1); }
  function delItem(id) { if (!S.mochila[id]) return; S.mochila[id]--; if (S.mochila[id] <= 0) delete S.mochila[id]; }
  const peso = id => (D.pesos[id] != null ? D.pesos[id] : 1);
  G.carga = () => Object.keys(S.mochila).reduce((a, k) => a + peso(k) * S.mochila[k], 0);
  G.capacidade = () => vivos().reduce((a, h) => a + D.capacidade(h), 0);
  G.peso = peso;
  const sobrecarga = () => G.carga() > G.capacidade();
  G.largar = function (id) {
    if (!has(id)) return;
    delItem(id);
    if (S.exp) { log('sys', `Deixas ${itemDef(id).nome.toLowerCase()} para trás.`); G.save(); depois(); }
    else { log('sys', `Deitas fora: ${itemDef(id).nome}.`); G.save(); }
  };
  function art(en, cap) {
    if (!en) return '';
    const s = en.g === 'p' ? en.nome : (en.g === 'f' ? 'a ' : 'o ') + en.nome;
    return cap ? CP.cap(s) : s;
  }
  const plural = (n, s, p) => n === 1 ? s : p;

  function log(k, t, extra) {
    const L = S.exp ? S.exp.log : S.log;
    L.push(extra ? Object.assign({ k, t }, extra) : { k, t });
    if (L.length > 700) L.splice(0, L.length - 700);
  }
  const title = t => log('title', t), narr = t => log('narr', t), draw = t => log('draw', t),
    sys = t => log('sys', t), good = t => log('good', t), bad = t => log('bad', t);
  G.log = log;

  function rnd() { const e = E(); const r = CP.rstep(e.rs); e.rs = r[0]; return r[1]; }
  const rint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const rpick = a => a[Math.floor(rnd() * a.length)];

  /* =========================================================== masmorra: consultas */
  const dg = () => E().dg;
  const Z = id => dg().zones[id];
  function zAt(x, y) {
    return dg().zones.find(z => z.kind === 'sala' ? (x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) : z.cells.some(c => c[0] === x && c[1] === y));
  }
  function ents(zid, todos) { return Object.values(dg().ents).filter(en => en.zone === zid && !en.gone && (todos || !en.oculto) && en.kind !== 'trap'); }
  function inimigos(zid) { return ents(zid).filter(en => en.kind === 'inimigo' && en.hp > 0); }
  function traps(zid) {
    const d = dg();
    const doorIds = d.conns.filter(c => c.room === zid || c.corr === zid).map(c => c.armadilha).filter(Boolean);
    return Object.values(d.ents).filter(t => t.kind === 'trap' && !t.gone && !t.sprung &&
      ((t.on === 'cell' && t.zone === zid) || (t.on === 'feat' && t.zone === zid) || (t.on === 'conn' && doorIds.includes(t.id))));
  }
  function portas(zid) { return dg().conns.filter(c => (c.room === zid || c.corr === zid) && (!c.secreto || c.achada || Z(zid).kind === 'corredor')); }
  const outra = (c, zid) => c.room === zid ? c.corr : c.room;
  const celula = (c, zid) => zid === c.room ? [c.rx, c.ry] : [c.cx, c.cy];
  const ladoDe = (c, zid) => zid === c.room ? c.side : C.OPP[c.side];
  const entre = c => `entre ${C.n(c.rx, c.ry)} e ${C.n(c.cx, c.cy)}`;
  const posTxt = () => C.n(E().pos[0], E().pos[1]);
  function aberta(c) { return c.tipo === 'aberta' || c.aberta; }

  function portaTxt(c) {
    if (c.secreto) return 'uma porta secreta de pedra' + (c.aberta ? ', agora aberta' : '');
    const T = { aberta: 'uma passagem em arco, sem porta', fechada: 'uma porta de madeira', trancada: 'uma porta reforçada a ferro, com fechadura', emperrada: 'uma porta de madeira inchada pela humidade' };
    let t = T[c.tipo];
    if (c.tipo !== 'aberta' && c.aberta) t += ' (aberta)';
    return t;
  }
  function nomePorta(c, zid) {
    const lado = ladoDe(c, zid);
    const z = Z(zid);
    const base = (c.tipo === 'aberta' && !c.secreto) ? 'passagem' : 'porta';
    if (z.kind === 'corredor') {
      const outro = Z(outra(c, zid));
      return `${base} ${C.NOME[lado]}` + (outro.vis ? ` (${outro.nome})` : '');
    }
    const same = portas(zid).filter(o => ladoDe(o, zid) === lado);
    return `${base} ${C.NOME[lado]}` + (same.length > 1 ? ` (${C.n(...celula(c, zid))})` : '');
  }
  function nomeZona(z) { return z.kind === 'sala' ? z.nome : 'o corredor'; }

  /* =========================================================== modificadores e testes */
  function modsFor(h, tipo, extra) {
    const T = R.TESTES[tipo];
    const attr = tipo === 'ataque' ? arma(h).attr : T.attr;
    const L = [];
    const av = h.attr[attr] || 0;
    if (av) L.push([R.ATTR[attr], av]);
    const c = h.cls;
    if (c === 'ladrao' && ['armadilhas', 'arrombar', 'desarmar', 'furtivo'].includes(tipo)) L.push(['Ladrão', 1]);
    if (c === 'explorador' && ['ouvir', 'esquivar'].includes(tipo)) L.push(['Explorador', 1]);
    if (c === 'mistico' && tipo === 'ler') L.push(['Místico', 1]);
    if (c === 'guerreiro' && tipo === 'forcar') L.push(['Guerreiro', 1]);
    if (tipo === 'procurar' && E() && ((E().luz && E().luz.fonte === 'lanterna' && E().luz.marcas > 0) || E().buffs.luz)) L.push(['Boa luz', 1]);
    if (tipo === 'arrombar') { if (has('gazuas')) L.push(['Gazuas', 1]); else if (c !== 'ladrao') L.push(['Sem gazuas', -1]); }
    if (tipo === 'forcar' && (has('pecabra') || arma(h).forcar)) L.push([has('pecabra') ? 'Pé-de-cabra' : 'Machado', 1]);
    if ((tipo === 'ler' || tipo === 'magia') && (has('amuleto') || has('anel_valdrem'))) L.push([has('anel_valdrem') ? 'Anel de Valdrem' : 'Amuleto', 1]);
    if (tipo === 'furtivo' && aptos().length >= 3) L.push(['Grupo numeroso', -1]);
    if (tipo === 'furtivo' && tem(h, 'sombra')) L.push(['Sombra', 1]);
    if (tipo === 'furtivo' && tp('manto')) L.push(['Manto de cinza', 2]);
    if (['armadilhas', 'arrombar', 'desarmar'].includes(tipo) && tp('mao_firme')) L.push(['Mão de relojoeiro', 1]);
    if ((tipo === 'ler' || tipo === 'magia') && tp('sabio')) L.push(['Língua dos mortos', 1]);
    if (['esquivar', 'defesa', 'fuga'].includes(tipo) && tp('reflexos')) L.push(['Reflexos', 1]);
    if (E()) {
      if ((tipo === 'ler' || tipo === 'procurar') && temComp('escriba')) L.push(['Escriba', 1]);
      if (tipo === 'ouvir' && temComp('cao')) L.push(['Faro do cão', 1]);
      if (E().nevoa && ['procurar', 'ouvir', 'armadilhas'].includes(tipo)) L.push(['Névoa', -1]);
      if (E().uivo && E().uivo[h.id]) { L.push(['Uivo', -1]); delete E().uivo[h.id]; }
    }
    (h.cicatrizes || []).forEach(cid => { const c = D.cicatrizes.find(x => x.id === cid); if (c && c.testes && c.testes.includes(tipo) && !(c.corpo && G.arma(h).distancia)) L.push([c.nome, -1]); });
    if ((tipo === 'defesa' || tipo === 'fuga') && tem(h, 'veterano')) L.push(['Veterano', 1]);
    if (tipo === 'ataque' && arma(h).distancia && tem(h, 'tiro')) L.push(['Tiro certeiro', 1]);
    if (tipo === 'ler' && h.origem === 'elfo') L.push(['Elfo', 1]);
    if (['esquivar', 'furtivo', 'fuga', 'defesa', 'arrombar', 'desarmar'].includes(tipo) && sobrecarga()) L.push(['Carga a mais', -1]);
    if (E() && escuro()) L.push(['Escuridão', h.origem === 'elfo' || tp('olhos_gato') ? -1 : -2]);
    if (extra) extra.forEach(x => L.push(x));
    return L;
  }
  const somaMods = L => R.clamp(L.reduce((a, b) => a + b[1], 0));

  /* pedido de lançamento: o jogador lança o dado físico */
  function pedir(o) {
    const e = E();
    o.mods = o.mods || [];
    o.mod = somaMods(o.mods);
    if (e.pending) { e.queue.push(o); return; }
    e.pending = o;
    log('roll', o.rotulo);
  }

  G.roll = function (n) {
    const e = E();
    if (!e || !e.pending) return;
    n = Math.max(1, Math.min(6, n | 0));
    const p = e.pending;
    e.pending = null;
    if (p.tipo === 'morte') resolverMorte(p, n);
    else if (p.h === 'percalco') { log('res', `🎲 ${n}`); HANDLERS.percalco({ nat: n }, p, H(p.heroi)); }
    else if (p.h === 'achado') { log('res', `🎲 ${n}`); achado(n); }
    else {
      let mod = p.mod;
      if (p.ajuda) mod = R.clamp(mod + 1);
      if (p.impeto && S.impeto >= 2) { mod = R.clamp(mod + 1); S.impeto -= 2; sys('Gastas 2 de ímpeto (+1).'); }
      if (p.sorte) { mod = R.clamp(mod + 2); const hs = H(p.heroi); if (hs) { hs.usos.sorte = true; good(`${hs.nome} confia na sorte (+2).`); } }
      const r = R.resolve(n, mod);
      const ms = mod ? (mod > 0 ? ` + ${mod}` : ` − ${-mod}`) : '';
      const nota = n === 1 ? ' (1 natural)' : n === 6 ? ' (6 natural)' : '';
      log('res', `🎲 ${n}${ms} = ${r.total}${nota} → ${R.LABEL[r.band]}`);
      const h = H(p.heroi);
      e.ultimoRes = { heroi: p.heroi, band: r.band, i: e.log.length };
      if (r.band === 'sucesso') S.impeto = Math.min(6, S.impeto + (tp('eco') ? 2 : 1));
      else if (r.band === 'falha' && S.impeto > 0) S.impeto--;
      (HANDLERS[p.h] || (() => {}))(r, p, h);
      if (p.magia && n === 1 && E()) pedir({ h: 'percalco', heroi: p.heroi, rotulo: `Percalço mágico! Lança 1D6 para ver o que corre mal.`, mods: [] });
      if (r.band === 'falha' && p.ajuda) {
        const ha = H(p.ajuda);
        if (ha && ha.estado === 'ok') { bad(`${ha.nome} partilha o risco da falha.`); ferir(ha, 1); }
      }
    }
    depois();
  };

  G.usarImpeto = function () {
    const e = E();
    if (!e || !e.pending || e.pending.tipo === 'morte' || e.pending.h === 'percalco' || e.pending.h === 'achado') return;
    if (S.impeto < 2 && !e.pending.impeto) return;
    e.pending.impeto = !e.pending.impeto;
    G.save();
  };
  /* oráculo: o jogador faz uma pergunta de sim/não, escolhe a probabilidade e lança o dado */
  G.oraculo = function (pergunta, prob, n) {
    const lim = prob === 'provavel' ? 3 : prob === 'improvavel' ? 5 : 4;
    let r;
    if (n >= lim) r = n === 6 ? 'Sim — e mais do que isso.' : n === lim ? 'Sim, mas com um senão.' : 'Sim.';
    else r = n === 1 ? 'Não — e pior do que isso.' : n === lim - 1 ? 'Não, mas há uma brecha.' : 'Não.';
    log('oraculo', `${pergunta ? '«' + pergunta + '» ' : ''}🎲 ${n} → ${r}`);
    G.save();
    return r;
  };
  G.inspiracao = function (a, b) {
    const t = `${D.inspiracao.accoes[a - 1]} ${D.inspiracao.temas[b - 1]}`;
    log('oraculo', `Inspiração (🎲 ${a}, ${b}): ${t}.`);
    G.save();
    return t;
  };
  G.sorte = function () {
    const e = E();
    if (!e || !e.pending || e.pending.tipo === 'morte') return;
    const h = H(e.pending.heroi);
    if (!h || h.origem !== 'halfling' || h.usos.sorte) return;
    e.pending.sorte = !e.pending.sorte;
    G.save();
  };
  G.ajudar = function (hid) {
    const e = E();
    if (!e || !e.pending || e.pending.tipo === 'morte') return;
    const h = H(hid);
    if (!h || h.estado !== 'ok' || h.id === e.pending.heroi) return;
    e.pending.ajuda = e.pending.ajuda === hid ? null : hid;
    G.save();
  };

  function depois() {
    const e = E();
    if (!e) { G.save(); return; }
    let guard = 0;
    while (guard++ < 20) {
      if (!E()) break;
      if (!e.pending && e.queue.length) { e.pending = e.queue.shift(); log('roll', e.pending.rotulo); }
      if (e.pending) break;
      if (verificarDerrota()) return;
      if (e.cont) {
        const c = e.cont; e.cont = null;
        if (!e.combat) correrCont(c);
        continue;
      }
      if (e.eventoPendente && !e.combat) { e.eventoPendente = false; eventoRelogio(); continue; }
      break;
    }
    if (E() && E().combat && !E().pending) acertarTurno();
    G.save();
  }

  /* =========================================================== vida, dano, morte */
  function ferir(h, n, origem) {
    const e = E();
    if (!h || h.estado !== 'ok' || n <= 0) return;
    if (e && e.combat && h.escudo && (e.combat.escudo[h.id] || 0) < (tem(h, 'escudo2') ? 2 : 1) && origem === 'inimigo') {
      e.combat.escudo[h.id] = (e.combat.escudo[h.id] || 0) + 1;
      good(`O escudo de ${h.nome} apara o golpe por completo!`);
      return;
    }
    if (e && e.combat && origem === 'inimigo' && tp('pele') && !e.combat.pele) { e.combat.pele = true; n = Math.max(0, n - 1); if (!n) { good('A pele de pedra aguenta o golpe.'); return; } }
    if (e) e.danoSofrido = (e.danoSofrido || 0) + n;
    if (e && tp('fe') && !e.usouFe && h.vida - n <= 0) { e.usouFe = true; h.vida = 1; good(`A fé teimosa mantém ${h.nome} de pé com 1 de Vida!`); return; }
    h.vida = Math.max(0, h.vida - n);
    bad(`${h.nome} sofre ${n} de dano. Vida ${h.vida}/${vmax(h)}.`);
    if (h.vida <= 0) {
      h.estado = 'caido';
      bad(`${h.nome} cai por terra!`);
      if (!e) return;
      if (!(e.caidos || []).includes(h.id)) e.caidos = (e.caidos || []).concat(h.id);
      if (aptos().length) {
        h.morrer = 3 + (h.origem === 'anao' ? 1 : 0);
        bad(`${h.nome} está a esvair-se. Tem ${h.morrer} turnos para ser socorrido(a) — poção, bandagens, cura ou primeiros socorros.`);
      } else {
        h.morrer = 0;
        pedir({ tipo: 'morte', heroi: h.id, rotulo: `${h.nome} está às portas da morte. Lança 1D6 para saber o seu destino.` });
      }
    }
  }
  function curar(h, n) {
    if (!h || h.estado === 'morto') return;
    const antes = h.vida;
    h.vida = Math.min(vmax(h), h.vida + n);
    if (h.estado === 'caido' && h.vida > 0) { h.estado = 'ok'; h.morrer = 0; good(`${h.nome} recupera os sentidos.`); }
    if (h.vida > antes) good(`${h.nome} recupera ${h.vida - antes} de Vida (${h.vida}/${vmax(h)}).`);
  }
  function resolverMorte(p, n) {
    const h = H(p.heroi);
    if (!h) return;
    log('res', `🎲 ${n}`);
    if (h.vida > 0 && h.estado === 'ok') { good(`${h.nome} já está de pé.`); return; }
    if (n <= 2) {
      h.estado = 'morto';
      bad(`${h.nome} morre. A sua história termina aqui, no escuro.`);
      S.cemiterio.push({ nome: h.nome, cls: h.cls, nivel: h.nivel, dia: S.dia, onde: E() ? E().local : '' });
      S.diario.push({ dia: S.dia, t: `${h.nome} (${D.classes[h.cls].nome}) morreu em ${E() ? E().local : 'lugar incerto'}.` });
    } else if (n <= 4) {
      h.estado = 'caido'; h.vida = 0; h.morrer = 0;
      bad(`${h.nome} fica inconsciente, mas respira. ${aptos().length ? 'Uma poção, bandagens ou uma cura podem acordá-lo.' : ''}`);
    } else {
      h.estado = 'ok'; h.vida = 1;
      good(`Contra todas as probabilidades, ${h.nome} levanta-se com 1 de Vida.`);
    }
  }
  /* cada acção do jogador é um turno: quem está a morrer aproxima-se do fim */
  function passarTurno() {
    S.herois.forEach(h => {
      if (h.estado !== 'caido' || !h.morrer) return;
      h.morrer--;
      if (h.morrer > 0) sys(`${h.nome} está a esvair-se: ${h.morrer} ${h.morrer === 1 ? 'turno' : 'turnos'}.`);
      else pedir({ tipo: 'morte', heroi: h.id, rotulo: `Ninguém chegou a tempo. ${h.nome} está às portas da morte. Lança 1D6.` });
    });
  }
  function verificarDerrota() {
    const e = E();
    if (!e || aptos().length) return false;
    S.herois.forEach(h => { if (h.estado === 'caido' && h.morrer > 0) { h.morrer = 0; pedir({ tipo: 'morte', heroi: h.id, rotulo: `Já não há quem socorra ${h.nome}. Lança 1D6.` }); } });
    if (e.pending || e.queue.length) return false;
    if (vivos().length) {
      narr(vivos().length > 1 || S.herois.length > 1
        ? 'Quando acordam, estão caídos no fundo das escadas, sem saber como lá chegaram. Arrastam-se para a luz, derrotados.'
        : 'Acordas no escuro, com a boca a saber a sangue. Não sabes quanto tempo passou. Rastejas até às escadas e sobes, derrotado.');
      terminarExpedicao('derrota');
    } else {
      narr('Ninguém sobe aquelas escadas. Em Corvamonte, acendem uma vela por ti.');
      terminarExpedicao('morte');
    }
    return true;
  }

  /* =========================================================== luz */
  const escuro = () => { const e = E(); return !!(e && e.luz && e.luz.marcas <= 0); };
  G.escuro = escuro;
  const elfoNoGrupo = () => aptos().some(h => h.origem === 'elfo') || tp('olhos_gato');
  function acenderLuz(inicio) {
    const e = E();
    if (has('lanterna') && has('oleo')) {
      delItem('oleo');
      e.luz = { marcas: 10, max: 10, fonte: 'lanterna' };
      narr(inicio ? 'Acendes a lanterna. Uma luz firme e amarela enche o espaço à tua volta.' : 'A chama treme e morre. Deitas mais óleo na lanterna e a luz volta.');
      return true;
    }
    if (has('tocha')) {
      delItem('tocha');
      const n = 6 + (aptos().some(h => tem(h, 'poupado')) ? 2 : 0) + (tp('chama') ? 3 : 0);
      e.luz = { marcas: n, max: n, fonte: 'tocha' };
      narr(inicio ? 'Acendes uma tocha. A luz treme nas paredes e as sombras recuam.' : 'A tocha estala e apaga-se. Acendes outra.');
      return true;
    }
    e.luz = { marcas: 0, max: 6, fonte: null };
    log('event', 'Escuridão');
    bad(inicio ? 'Não tens com que fazer luz. Desces às escuras.' : 'A última luz apaga-se. A escuridão fecha-se à tua volta.');
    sys(elfoNoGrupo() ? 'Às escuras: −1 em todos os testes (olhos de elfo).' : 'Às escuras: −2 em todos os testes e não consegues procurar nem ler. A tensão sobe a cada zona nova.');
    return false;
  }
  function gastarLuz(n) {
    const e = E();
    if (!e.luz) e.luz = { marcas: 0, max: 6, fonte: null };
    if (e.luz.marcas <= 0) { tick(n); return; }
    e.luz.marcas = Math.max(0, e.luz.marcas - n);
    if (e.luz.marcas <= 0) acenderLuz(false);
    else if (e.luz.marcas <= 2 && e.luz.fonte !== 'magia') sys(`A ${e.luz.fonte === 'lanterna' ? 'lanterna' : 'tocha'} está quase a apagar-se (${e.luz.marcas}).`);
  }
  G.estadoLuz = function () {
    const e = E(); if (!e || !e.luz) return null;
    return { marcas: e.luz.marcas, max: e.luz.max || 6, fonte: e.luz.fonte, tochas: S.mochila.tocha || 0, oleo: has('lanterna') ? (S.mochila.oleo || 0) : 0 };
  };
  function bloqueadoPeloEscuro(o) {
    if (!escuro() || elfoNoGrupo()) return false;
    narr(`Às escuras é impossível ${o}. Precisas de luz.`);
    return true;
  }

  /* =========================================================== relógio de tensão */
  function tick(n) {
    const e = E();
    e.clock += n;
    if (e.clock >= 6) {
      e.clock = 0;
      if (e.combat || e.pending) e.eventoPendente = true; else e.eventoPendente = true;
    }
  }
  function eventoRelogio() {
    const e = E();
    const T = D.masmorras[e.tipo];
    e.enchidas = (e.enchidas || 0) + 1;
    if (e.enchidas >= 2 && D.sombras && rnd() < 0.5) { eventoSombra(); return; }
    if (D.eventosEscolha && rnd() < 0.55) {
      const ev = clone(rpick(D.eventosEscolha));
      const id = 'v' + (e.nx++);
      ev.opcoes.forEach(o => { o.id = id + '_' + o.id; });
      if (!ev.semIgnorar) ev.opcoes.push({ id: id + '_ignorar', rotulo: ev.ignorar || 'Não fazer nada', kw: ['nada', 'ignorar'], efeitos: [{ t: ev.ignorarTxt || 'Ficas quieto e esperas que passe.' }].concat(ev.ignorarEf || []), ignorar: true });
      const en = Object.assign(ev, { id, kind: 'dilema', evento: true, zone: e.zone, x: e.pos[0], y: e.pos[1] });
      dg().ents[id] = en;
      log('event', 'A tensão chega ao limite...');
      log('fala', en.fala, { ic: en.icone, n: CP.cap(en.nome), cena: true });
      e.scene = { tipo: 'npc', ent: id };
      return;
    }
    const ev = rpick(T.eventos);
    log('event', 'A tensão chega ao limite...');
    narr(ev.t);
    if (ev.inimigo) {
      const via = e.via != null ? celula(dg().conns[e.via], e.zone) : e.pos;
      const en = criarInimigo(ev.inimigo, e.zone, via);
      draw(`Marca ${art(en)} em ${C.n(en.x, en.y)} com um X.`);
      iniciarCombate([en.id]);
    }
  }
  function criarInimigo(defId, zid, cell) {
    const T = D.masmorras[E().tipo];
    let base = T.inimigos.find(i => i.id === defId);
    if (defId === 'morto') base = T.inimigos.find(i => i.tipo === 'morto');
    if (defId === '*') base = rpick(T.inimigos);
    const def = clone(base || T.inimigos[0]);
    def.hp += Math.max(0, S.herois.filter(h => h.estado !== 'morto').length - 1);
    const id = 'x' + (E().nx++);
    const en = Object.assign(def, { id, defId: def.id, kind: 'inimigo', zone: zid, x: cell[0], y: cell[1], estado: 'alerta', hpMax: def.hp });
    dg().ents[id] = en;
    return en;
  }

  /* =========================================================== campanha */
  G.novaCampanha = function (modo) {
    S = { v: 1, modo: modo || 'solo', criado: Date.now(), dia: 1, ouro: 10, mochila: {}, herois: [], cemiterio: [], missoes: {}, flags: {}, diario: [], locais: {}, log: [], exp: null, seed: String(Math.floor(Math.random() * 1e9)), nh: 1, rumoresFeitos: {}, impeto: 2, reliquias: [], stats: {}, feitos: {}, desbloq: {}, diarios: {}, finais: {}, slots: 3, comps: [], sobrev: [], juramento: { texto: JURAMENTO, marcas: 0, feito: false } };
    Object.values(D.missoes).forEach(m => { if (m.inicial) S.missoes[m.id] = { estado: 'disponivel', vezes: 0 }; });
    G.save();
    return S;
  };
  G.criarHeroi = function (nome, cls, retrato, origem) {
    const c = D.classes[cls];
    const h = { id: 'h' + (S.nh++), nome: (nome || c.nome).trim().slice(0, 18), cls, retrato: retrato || (D.arte ? D.arte.porClasse[cls] : null), nivel: 1, xp: 0, vidaBase: c.vida, attr: clone(c.attr), arma: c.arma, armadura: c.armadura, escudo: !!c.escudo, focoMax: c.foco, foco: c.foco, estado: 'ok', usos: {}, origem: origem || 'humano', talentos: [] };
    h.vida = vmax(h);
    Object.keys(c.itens).forEach(k => addItem(k, c.itens[k]));
    S.herois.push(h);
    S.diario.push({ dia: S.dia, t: `${h.nome}, ${c.nome.toLowerCase()}, junta-se à companhia.` });
    G.save();
    return h;
  };
  G.removerHeroi = function (hid) {
    const h = H(hid);
    if (!h || S.exp) return;
    S.herois = S.herois.filter(x => x.id !== hid);
    S.diario.push({ dia: S.dia, t: `${h.nome} deixa a companhia e volta à sua vida.` });
    G.save();
  };
  G.limparMortos = function () { S.herois = S.herois.filter(h => h.estado !== 'morto'); };

  /* ---------- quadro de missões ---------- */
  function rumoresDoDia() {
    if (!Object.values(S.missoes).some(m => m.estado === 'feita')) return [];
    const out = [];
    for (let i = 0; i < 2; i++) {
      const id = `rumor-${S.dia}-${i}`;
      if (S.rumoresFeitos[id]) continue;
      out.push(G.gerarRumor(id));
    }
    return out;
  }
  G.hojeId = function () { const d = new Date(); return `diario-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`; };
  G.gerarRumor = function (id) {
    const rng = CP.RNG(id.startsWith('diario-') ? 'diario/' + id : S.seed + '/' + id);
    const tipo = rng.pick(['cripta', 'mina', 'santuario']);
    const T = D.masmorras[tipo];
    const r = rng.pick(T.rumores);
    const ouro = rng.int(12, 20);
    return {
      id, rumor: true, tipo, titulo: r.titulo, local: r.local, salas: rng.int(5, 7), categoria: 'Rumor da taberna',
      cliente: 'gente da aldeia', recompensa: ouro, gancho: r.gancho, entrada: r.entrada,
      pistas: r.pistas,
      final: { sala: r.sala, desc: r.salaDesc, intro: r.intro, inimigos: [clone(r.boss)], bonus: { p1: 1 }, opcoes: [], vitoria: [{ t: r.vitoria }, { completa: 'feito' }] },
      desfechos: { feito: { titulo: r.titulo, texto: r.desfecho, ouro, xp: 2, flags: [] } }
    };
  };
  G.missoesDisponiveis = function () {
    const fixas = Object.keys(S.missoes).filter(id => S.missoes[id].estado === 'disponivel' && D.missoes[id]).map(id => D.missoes[id]);
    const hoje = G.hojeId();
    const diario = [];
    if (!S.diarios[hoje]) { const m = G.gerarRumor(hoje); m.titulo = 'Masmorra do dia: ' + m.titulo; m.categoria = 'Desafio diário — uma tentativa, igual para todos'; m.diario = true; diario.push(m); }
    return diario.concat(fixas, rumoresDoDia());
  };

  /* ---------- partir em expedição ---------- */
  G.partir = function (mid) {
    if (S.exp) return;
    G.limparMortos();
    if (!aptos().length) return;
    let m = D.missoes[mid] ? clone(D.missoes[mid]) : (mid.startsWith('rumor-') || mid.startsWith('diario-') ? G.gerarRumor(mid) : null);
    if (!m) return;
    const reg = S.missoes[mid] || (S.missoes[mid] = { estado: 'disponivel', vezes: 0 });
    reg.vezes++;
    const seed = mid.startsWith('diario-') ? `diario/${mid}` : `${S.seed}/${mid}/${reg.vezes}`;
    if (mid.startsWith('diario-')) S.diarios[mid] = { estado: 'em curso' };
    const n = aptos().length;
    const masm = CP.prepararAventura(m, seed, n);
    if (S.sobrev && S.sobrev.length) return;
    S.herois.forEach(h => { h.foco = h.focoMax; h.usos = {}; });
    S.exp = {
      mid, m, titulo: m.titulo, tipo: m.tipo, local: m.local, seed, dg: masm, zone: 0, pos: masm.stairs.slice(), via: null, prev: null,
      clock: 0, combat: null, pending: null, queue: [], cont: null, scene: null, flags: {}, completo: null, log: [], actor: aptos()[0].id,
      sneak: {}, rests: 0, buffs: {}, rs: CP.hash(seed + '/run') | 0, nx: 0, eventoPendente: false, vitoriaFeita: false, inicioDia: S.dia,
      luz: null, ganhoOuro: 0, tesouros: 0, bencaos: [], escolha: null, mortes: 0, danoSofrido: 0, diario: mid.startsWith('diario-'),
      comps: S.comps.filter(c => c.estado === 'ok').map(c => c.id), caidos: [], compCaidos: [], sobrev: [], buscas: 0, achados: [], enchidas: 0
    };
    S.herois.forEach(h => { h.mudo = false; h.morrer = 0; });
    title(m.titulo);
    narr(m.gancho);
    narr(m.entrada);
    draw(`Prepara a folha: uma grelha de ${masm.W} colunas (A a ${C.col(masm.W - 1)}, da esquerda para a direita) e ${masm.H} linhas (1 a ${masm.H}, de baixo para cima). O norte fica no topo da folha. Começa a desenhar junto à margem de baixo.`);
    S.comps.forEach(c => { if (c.estado === 'ferido') { c.estado = 'ok'; sys(`${c.nome} ainda se está a recuperar e fica na aldeia desta vez.`); } else if (c.estado === 'ok') c.vida = c.vidaMax; });
    S.herois.forEach(h => { if (h.feridoGrave && h.estado === 'ok') { h.vida = Math.max(1, vmax(h) - 2); h.feridoGrave = false; bad(`${h.nome} ainda traz as feridas da última vez (Vida ${h.vida}/${vmax(h)}).`); } });
    if (S.exp.comps.length) sys(`Contigo vão: ${S.exp.comps.map(id => { const c = S.comps.find(x => x.id === id); return `${c.nome} (${D.companheiros[c.tipo].nome})`; }).join(', ')}.`);
    acenderLuz(true);
    entrar(0, null);
    oferecerBencao('À entrada, deixas uma oferenda no velho altar dos viajantes. Escolhe uma bênção para esta expedição.');
    if (n > 1) sys(`Modo cooperativo: ${aptos().map(h => h.nome).join(', ')}. Toca num herói, em cima, para escolher quem age. Em combate, a vez passa automaticamente.`);
    G.save();
  };

  /* =========================================================== entrar e descrever zonas */
  function entrar(zid, via) {
    const e = E();
    const z = Z(zid);
    e.prev = e.zone; e.zone = zid; e.via = via;
    if (via != null) e.pos = celula(dg().conns[via], zid);
    const primeira = !z.vis;
    z.vis = true;
    if (primeira && z.kind === 'sala' && zid !== 0) { if (escuro()) stat('escuro'); gastarLuz(1); tick(1); }
    e.sneak[zid] = false;
    if (e.scene && e.scene.tipo !== 'final') e.scene = null;
    if (primeira && z.kind === 'corredor' && tp('faro')) traps(zid).forEach(t => { t.achada = true; });
    if (primeira && z.kind === 'sala' && zid !== 0 && zid !== dg().obj && D.locaisBusca) {
      const chance = temComp('escriba') ? 0.6 : 0.4;
      if (rnd() < chance) {
        const livres = [];
        for (let x = z.x; x < z.x + z.w; x++) for (let y = z.y; y < z.y + z.h; y++) if (!Object.values(dg().ents).some(o => o.zone === zid && o.x === x && o.y === y && !o.gone)) livres.push([x, y]);
        if (livres.length) {
          const c = rpick(livres);
          const nome = rpick(D.locaisBusca);
          const id = 'b' + (E().nx++);
          dg().ents[id] = { id, kind: 'feat', busca: true, zone: zid, x: c[0], y: c[1], nome, desc: `${nome}; pode haver algo útil (marca com ✦)`, exame: `Pode valer a pena revistar ${nome}, mas leva tempo.`,
            acao: { rotulo: `Revistar ${nome}`, teste: 'procurar', res: { sucesso: [{ busca: 1 }], parcial: [{ t: 'Demoras, mas encontras algo.' }, { tick: 1 }, { busca: 1 }], falha: [{ t: 'Remexes tudo e não encontras nada, a não ser barulho.' }, { tick: 1 }] } } };
        }
      }
    }
    if (primeira && z.kind === 'sala' && tp('cartografo')) dg().conns.forEach(c => { if (c.secreto && !c.achada && c.room === zid) { c.achada = true; stat('secretas'); good('O lápis do cartógrafo treme: há uma porta secreta aqui!'); } });
    if (primeira) descrever(z, via, true);
    if (primeira && z.kind === 'corredor' && rnd() < 0.3 && !e.quiet) {
      narr(rpick(['Entre as pedras do chão, algo brilha.', 'Um esqueleto antigo, encostado à parede, ainda segura uma bolsa.', 'Num buraco da parede, alguém escondeu qualquer coisa há muito tempo.', 'Tropeças em algo metálico, meio enterrado no pó.']));
      loot('pequeno');
    }
    else if (!e.quiet) { narr(`Regressas ${contrA(nomeZona(z))}.`); sys(`Estás em ${posTxt()}.`); }

    const final = zid === dg().obj && !e.completo;
    if (final) {
      e.scene = { tipo: 'final' };
      if (primeira) {
        const quem = Object.values(dg().ents).find(x => x.zone === zid && x.final && x.kind === 'npc') || Object.values(dg().ents).find(x => x.zone === zid && x.boss && !x.oculto);
        if (quem) log('fala', e.m.final.intro, { r: quem.npcId || quem.defId || quem.nome, n: CP.cap(quem.nome), cena: true });
        else narr(e.m.final.intro);
      }
      e.quiet = false;
    }
    const temOpcoes = final && opcoesValidas(e.m.final.opcoes).length > 0;
    const alerta = inimigos(zid).filter(en => en.estado === 'alerta' && !(en.boss && temOpcoes && !e.combateFinal));
    if (alerta.length) {
      e.quiet = false;
      narr(`${alerta.map(en => art(en, true)).join(' e ')} ${plural(alerta.length, 'vê-te e ataca', 'vêem-te e atacam')}!`);
      iniciarCombate(alerta.map(en => en.id));
    }
    if (!e.combat && !e.quiet) {
      const dil = ents(zid).find(x => x.kind === 'dilema');
      if (dil && (!e.scene || e.scene.tipo !== 'final')) {
        log('fala', dil.fala, { ic: dil.icone, n: CP.cap(dil.nome), cena: true });
        e.scene = { tipo: 'npc', ent: dil.id };
      }
    }
    if (zid === 0 && e.completo && !e.combat) {
      sys('Estás de volta às escadas da entrada. Podes subir e terminar a aventura.');
    }
  }

  function contrA(n) { const m = /^(o|os|a|as) (.*)$/.exec(n); if (!m) return 'a ' + n; return ({ o: 'ao', os: 'aos', a: 'à', as: 'às' })[m[1]] + ' ' + m[2]; }
  function linhaEnt(en) {
    const c = C.n(en.x, en.y);
    if (en.kind === 'inimigo') {
      let s = `Em ${c}: ${en.desc} — marca com um X.`;
      if (en.estado === 'dormente') s += ' Parece não ter dado por ti.';
      if (en.estado === 'passivo') s += ' Está ocupado e não te viu.';
      return s;
    }
    if (en.kind === 'pista' && E().flags[en.pid]) return `Em ${c}: ${en.desc} (já examinado).`;
    if (en.kind === 'feat' && en.usada) return `Em ${c}: ${en.desc} (já mexeste).`;
    return `Em ${c}: ${en.desc}.`;
  }

  function descrever(z, via, primeira) {
    const e = E();
    const d = dg();
    title(z.kind === 'sala' ? z.nome : 'Corredor');
    const L = [];
    if (z.kind === 'sala') {
      narr(z.desc + (z.pistaSecreta ? ' ' + z.pistaSecreta : ''));
      if (primeira) L.push(`Sala ${z.w}×${z.h}: colunas ${C.col(z.x)}–${C.col(z.x + z.w - 1)}, linhas ${z.y + 1}–${z.y + z.h}.`);
      if (z.id === 0) L.push(`Escadas (E) em ${C.n(d.stairs[0], d.stairs[1])}.`);
      portas(z.id).forEach(c => {
        L.push(`${CP.cap(C.NOME[c.side])}: ${portaCurta(c)} entre ${C.n(c.rx, c.ry)} e ${C.n(c.cx, c.cy)}${c.id === via ? ' (vieste daqui)' : ''}.`);
      });
    } else {
      const ends = z.ends.map(i => d.conns[i]);
      const ini = via != null ? d.conns[via] : ends[0];
      const fim = ends.find(c => c !== ini);
      const a = celula(ini, z.id), b = celula(fim, z.id);
      const dir = C.NOME[ladoDe(fim, z.id)];
      narr(z.desc);
      const n = z.cells.length;
      if (primeira) L.push(n === 1 ? `Corredor de 1 quadrado em ${C.n(a[0], a[1])}.` : `Corredor de ${C.n(a[0], a[1])} a ${C.n(b[0], b[1])} (${n} quadrados, para ${dir}).`);
      L.push(`Ao fundo: ${portaCurta(fim)} entre ${C.n(fim.rx, fim.ry)} e ${C.n(fim.cx, fim.cy)}.`);
    }
    ents(z.id).forEach(en => L.push(linhaEnt(en).replace(/^Em ([A-Z]\d+): /, '$1: ')));
    traps(z.id).filter(t => t.achada).forEach(t => L.push(`${C.n(t.x, t.y)}: ${t.nome} (T).`));
    if (L.length) draw(L.join('\n'));
    sys(`Estás em ${posTxt()}.`);
  }
  function portaCurta(c) {
    if (c.secreto) return 'porta secreta';
    const T = { aberta: 'arco aberto', fechada: 'porta de madeira', trancada: 'porta de ferro com fechadura', emperrada: 'porta inchada' };
    return T[c.tipo] + (c.tipo !== 'aberta' && c.aberta ? ' (aberta)' : '');
  }

  /* descrição actual de uma zona, para o diário de mapa */
  G.descricaoZona = function (zid) {
    const e = E(); if (!e) return null;
    const d = dg(); const z = d.zones[zid];
    if (!z || !z.vis) return null;
    const L = [];
    if (z.kind === 'sala') L.push(`Sala de ${z.w}×${z.h}: colunas ${C.col(z.x)}–${C.col(z.x + z.w - 1)}, linhas ${z.y + 1}–${z.y + z.h}.`);
    else { const a = z.cells[0], b = z.cells[z.cells.length - 1]; L.push(z.cells.length === 1 ? `Corredor de 1 quadrado, em ${C.n(a[0], a[1])}.` : `Corredor de ${C.n(a[0], a[1])} a ${C.n(b[0], b[1])} (${z.cells.length} quadrados).`); }
    if (zid === 0) L.push(`Escadas (E) em ${C.n(d.stairs[0], d.stairs[1])}.`);
    portas(zid).forEach(c => { const o = d.zones[outra(c, zid)]; L.push(`${CP.cap(nomePorta(c, zid))}, ${entre(c)}: ${portaTxt(c)}${o.vis ? ' → ' + (o.kind === 'sala' ? o.nome : 'corredor') : ' → inexplorado'}.`); });
    ents(zid).forEach(en => L.push(linhaEnt(en).replace(' — marca com um X.', '.')));
    traps(zid).filter(t => t.achada).forEach(t => L.push(`Armadilha (T) em ${C.n(t.x, t.y)}: ${t.nome}.`));
    return { nome: z.kind === 'sala' ? z.nome : 'Corredor', desc: z.desc, linhas: L, aqui: zid === e.zone };
  };
  /* dados para o mapa desenhado (só o que já foi explorado) */
  G.dadosMapa = function () {
    const e = E(); if (!e) return null;
    const d = dg();
    const celulas = z => z.kind === 'sala' ? [].concat(...Array.from({ length: z.w }, (_, i) => Array.from({ length: z.h }, (_, j) => [z.x + i, z.y + j]))) : z.cells;
    const floor = {};
    d.zones.filter(z => z.vis).forEach(z => celulas(z).forEach(([x, y]) => { floor[C.key(x, y)] = z.id; }));
    const doors = d.conns.filter(c => (d.zones[c.room].vis || d.zones[c.corr].vis) && (!c.secreto || c.achada))
      .map(c => ({ rx: c.rx, ry: c.ry, cx: c.cx, cy: c.cy, tipo: c.tipo, aberta: aberta(c), secreto: !!c.secreto }));
    const marks = [];
    Object.values(d.ents).forEach(en => {
      if (en.gone || !d.zones[en.zone].vis) return;
      if (en.kind === 'trap') { if (en.achada || en.sprung) marks.push({ k: 'trap', x: en.x, y: en.y, n: en.nome }); return; }
      if (en.oculto) return;
      if (en.kind === 'inimigo') { if (en.hp > 0) marks.push({ k: 'inimigo', x: en.x, y: en.y, n: en.nome }); return; }
      if (en.kind === 'pista') { marks.push({ k: e.flags[en.pid] ? 'pista-ok' : 'pista', x: en.x, y: en.y, n: en.nome }); return; }
      marks.push({ k: en.kind, x: en.x, y: en.y, n: en.nome, usada: !!en.usada || !!en.resolvido });
    });
    return { W: d.W, H: d.H, floor, doors, marks, pos: e.pos.slice(), stairs: d.stairs.slice(), zona: e.zone,
      nomes: d.zones.filter(z => z.vis && z.kind === 'sala').map(z => ({ nome: z.nome, x: z.x, y: z.y, w: z.w, h: z.h })) };
  };
  G.zonasVisitadas = function () { const e = E(); if (!e) return []; return dg().zones.filter(z => z.vis).map(z => z.id); };

  /* =========================================================== movimento */
  function precisaFurtivo() {
    const e = E();
    if (e.combat || e.sneak[e.zone]) return false;
    return inimigos(e.zone).some(en => en.estado === 'dormente' && !en.boss);
  }
  /* devolve true se pode avançar; senão pede teste de furtividade e guarda a continuação */
  function furtivoOk(cont) {
    if (!precisaFurtivo()) return true;
    const e = E(); const h = actor();
    const dorm = inimigos(e.zone).filter(en => en.estado === 'dormente' && !en.boss);
    narr(`Para isso tens de passar perto de ${dorm.map(en => art(en)).join(' e ')} sem ${plural(dorm.length, 'o', 'os')} acordar.`);
    pedir({ h: 'furtivo', heroi: h.id, mods: modsFor(h, 'furtivo'), rotulo: `Teste de Furtividade de ${h.nome}. Lança 1D6.`, cont });
    return false;
  }

  function andarCorredor(alvo, cont) {
    const e = E();
    const z = Z(e.zone);
    if (z.kind !== 'corredor') { e.pos = alvo.slice(); return true; }
    const cells = z.cells;
    let i = cells.findIndex(c => c[0] === e.pos[0] && c[1] === e.pos[1]);
    const j = cells.findIndex(c => c[0] === alvo[0] && c[1] === alvo[1]);
    if (i < 0) i = 0;
    if (j < 0) return true;
    const step = j > i ? 1 : -1;
    for (let k = i + step; step > 0 ? k <= j : k >= j; k += step) {
      const c = cells[k];
      const t = Object.values(dg().ents).find(t => t.kind === 'trap' && t.on === 'cell' && !t.sprung && !t.gone && t.x === c[0] && t.y === c[1]);
      e.pos = c.slice();
      if (t) {
        if (t.achada) { narr(`Passas com cuidado pela armadilha em ${C.n(c[0], c[1])}.`); continue; }
        dispararArmadilha(t, cont);
        return false;
      }
    }
    return true;
  }

  function dispararArmadilha(t, cont) {
    const h = actor();
    narr(t.disparo);
    if (t.dano > 0) pedir({ h: 'armadilha', heroi: h.id, mods: modsFor(h, 'esquivar'), rotulo: `Teste de Esquiva de ${h.nome}. Lança 1D6.`, d: { t: t.id }, cont });
    else { t.sprung = true; efeitoArmadilha(t); E().cont = cont; }
  }
  function efeitoArmadilha(t) {
    if (t.acorda) {
      Object.values(dg().ents).forEach(en => { if (en.kind === 'inimigo' && en.estado === 'dormente' && !en.boss) en.estado = 'alerta'; });
      bad('O alarme ecoa por toda a masmorra. Nada continua a dormir.');
      tick(2);
    }
  }

  function atravessar(c, cont) {
    const e = E();
    const zid = e.zone;
    cont = cont || { a: 'porta', c: c.id };
    if (c.id !== e.via && !furtivoOk(cont)) return false;
    const z = Z(zid);
    const alvo = celula(c, zid);
    if (z.kind === 'corredor') { if (!andarCorredor(alvo, cont)) return false; }
    else e.pos = alvo.slice();
    if (!aberta(c)) { if (!abrirPorta(c, cont)) return false; }
    entrar(outra(c, zid), c.id);
    return true;
  }

  function abrirPorta(c, cont) {
    const e = E();
    const h = actor();
    if (c.armadilha) {
      const t = dg().ents[c.armadilha];
      if (t && !t.sprung && !t.gone) {
        if (t.achada) narr('Abres com cuidado, evitando a agulha da fechadura.');
        else { dispararArmadilha(t, cont); return false; }
        t.gone = true;
      }
    }
    if (c.tipo === 'fechada') { c.aberta = true; narr(c.secreto ? 'Empurras a pedra. A porta secreta roda sobre um eixo escondido.' : 'Abres a porta. As dobradiças rangem.'); return true; }
    if (c.tipo === 'emperrada') {
      c.tentada = true;
      narr('A porta está emperrada. Vais ter de a forçar.');
      pedir({ h: 'forcarPorta', heroi: h.id, mods: modsFor(h, 'forcar'), rotulo: `Teste de Força de ${h.nome} para forçar a porta. Lança 1D6.`, d: { c: c.id }, cont });
      return false;
    }
    if (c.tipo === 'trancada') {
      if (has('chave')) { c.aberta = true; narr('A chave de ferro roda na fechadura com um estalido. A porta abre-se.'); return true; }
      narr('A porta está trancada.');
      sys('Podes forçá-la (Força, −1, barulhento) ou arrombar a fechadura (Agilidade; precisas de gazuas ou de ser ladrão). Ou procurar a chave.');
      e.portaAlvo = c.id;
      return false;
    }
    return true;
  }

  /* procura de caminho por zonas já exploradas */
  function caminho(de, para) {
    const d = dg();
    const prev = { [de]: null };
    const fila = [de];
    while (fila.length) {
      const z = fila.shift();
      if (z === para) break;
      d.conns.forEach(c => {
        if (c.room !== z && c.corr !== z) return;
        if (c.secreto && !c.achada) return;
        if (c.tipo === 'trancada' && !c.aberta && !has('chave')) return;
        if (c.tipo === 'emperrada' && !c.aberta) return;
        const o = outra(c, z);
        if (!d.zones[o].vis || o in prev) return;
        prev[o] = { z, c: c.id };
        fila.push(o);
      });
    }
    if (!(para in prev)) return null;
    const passos = [];
    for (let z = para; prev[z]; z = prev[z].z) passos.unshift(prev[z].c);
    return passos;
  }

  function viajar(zid, cell, depoisDe) {
    const e = E();
    let guard = 0;
    while (e.zone !== zid && guard++ < 40) {
      const p = caminho(e.zone, zid);
      if (!p) { narr('Não conheces um caminho aberto até lá.'); e.quiet = false; return; }
      const c = dg().conns[p[0]];
      const zona = Z(e.zone);
      const barra = inimigos(e.zone).filter(en => en.estado === 'alerta');
      if (barra.length) { e.quiet = false; narr(`${art(barra[0], true)} barra-te o caminho!`); comecarLuta(barra[0]); return; }
      e.quiet = true;
      if (!atravessar(c, { a: 'viajar', z: zid, cell, depois: depoisDe })) { e.quiet = false; return; }
      if (e.combat || e.pending) { e.quiet = false; return; }
      if (Z(e.zone).kind === 'sala' && inimigos(e.zone).some(en => en.estado === 'dormente' && !en.boss) && e.zone !== zid) {
        // continua, mas vai precisar de furtividade ao sair
      }
      void zona;
    }
    e.quiet = false;
    if (e.zone !== zid) return;
    if (cell) {
      if (Z(zid).kind === 'corredor') { if (!andarCorredor(cell, { a: 'viajar', z: zid, cell, depois: depoisDe })) return; }
      else e.pos = cell.slice();
    }
    if (depoisDe === 'sair') { sairMasmorra(); return; }
    narr(`Chegas a ${nomeZona(Z(zid))}. Estás em ${posTxt()}.`);
  }

  function correrCont(c) {
    const e = E();
    if (!e || !actor()) return;
    if (c.a === 'porta') atravessar(dg().conns[c.c], c);
    else if (c.a === 'viajar') viajar(c.z, c.cell, c.depois);
    else if (c.a === 'feat') acaoFeat(dg().ents[c.id], true);
    else if (c.a === 'exam') examinarEnt(dg().ents[c.id]);
    else if (c.a === 'apanhar') apanharEnt(dg().ents[c.id]);
    else if (c.a === 'procurar') procurar();
    else if (c.a === 'armadilhas') procurarArmadilhas();
    else if (c.a === 'falar') falarCom(dg().ents[c.id]);
  }

  /* =========================================================== quem age */
  function actor() {
    const e = E();
    let h = H(e.actor);
    if (!h || h.estado !== 'ok') { h = aptos()[0]; if (h) e.actor = h.id; }
    return h;
  }
  G.actor = () => (E() ? actor() : null);
  G.setActor = function (hid) {
    const e = E(); if (!e) return;
    const h = H(hid);
    if (!h || h.estado !== 'ok') return;
    if (e.combat) { sys('Em combate, a vez passa por ordem. Espera pela tua.'); G.save(); return; }
    e.actor = hid; G.save();
  };
  function proximoTurno() {
    const e = E();
    const a = aptos();
    if (a.length <= 1) return;
    const i = a.findIndex(h => h.id === e.actor);
    e.actor = a[(i + 1) % a.length].id;
  }
  function acertarTurno() {
    const e = E();
    if (aptos().length > 1 && e.combat && e.combat.anunciado !== e.actor + ':' + e.combat.ronda) {
      e.combat.anunciado = e.actor + ':' + e.combat.ronda;
      sys(`Vez de ${actor().nome}.`);
    }
  }

  /* =========================================================== combate */
  function iniciarCombate(ids) {
    const e = E();
    ids.forEach(id => { const en = dg().ents[id]; if (en) { en.estado = 'alerta'; en.oculto = false; } });
    if (e.combat) { ids.forEach(id => { if (!e.combat.ens.includes(id)) { e.combat.ens.push(id); const n = dg().ents[id]; if (n) novaIntencao(n); } }); return; }
    e.combat = { ens: ids.slice(), escudo: {}, disparo: {}, ronda: 1, anunciado: null, chamou: false, furia: !!e.furiaProx };
    e.furiaProx = false;
    ids.forEach(id => { const n = dg().ents[id]; if (n) novaIntencao(n); });
    const arq = compDe('arqueira');
    if (arq) { const alvo = rpick(vivosCombate()); if (alvo) { narr(`${arq.nome} dispara a primeira flecha contra ${art(alvo)}!`); danoEm(alvo, 1, null); if (!vivosCombate().length) { fimCombateSePreciso(); return; } } }
    e.scene && (e.scene.pausada = true);
    log('combat', 'Combate!');
    sys('Vê o que cada inimigo vai fazer (no painel). Atacar: 5+ acertas sem sofrer · 3–4 trocam golpes · 1–2 falhas. Contra um golpe pesado, defende-te; um inimigo atordoado não ataca.');
  }
  /* intenções dos inimigos: anunciadas antes de cada ronda */
  const INT = {
    ataque: { txt: 'vai atacar', ic: '⚔', ataca: true, dano: 0 },
    pesado: { txt: 'prepara um golpe pesado', ic: '‼', ataca: true, dano: 1 },
    salto: { txt: 'agacha-se para saltar', ic: '↯', ataca: true, dano: 2 },
    defende: { txt: 'fecha-se na defensiva', ic: '🛡', ataca: false, dano: 0 },
    chamar: { txt: 'vai chamar reforços', ic: '📯', ataca: false, dano: 0 },
    fugir: { txt: 'procura por onde fugir', ic: '↩', ataca: false, dano: 0 },
    atordoado: { txt: 'está atordoado', ic: '✶', ataca: false, dano: 0 }
  };
  G.INT = INT;
  function novaIntencao(en) {
    const e = E();
    if (en.atordoado) { en.int = 'atordoado'; return; }
    const r = rnd();
    const ferido = en.hp <= (en.hpMax || en.hp) / 2;
    if (ferido && !en.boss && en.tipo !== 'morto' && en.tipo !== 'constructo' && r < 0.4) { en.int = 'fugir'; return; }
    if (en.tipo === 'fera' && r < 0.3) { en.int = 'salto'; return; }
    if ((en.tipo === 'morto' || en.tipo === 'humanoide') && !e.combat.chamou && r < 0.12) { en.int = 'chamar'; return; }
    if (r < 0.32) { en.int = 'pesado'; return; }
    if (r < 0.48) { en.int = 'defende'; return; }
    en.int = 'ataque';
  }
  const intDe = en => INT[en.int] || INT.ataque;
  function fimRonda() {
    const e = E();
    if (!e || !e.combat) return;
    vivosCombate().forEach(en => {
      const it = en.int;
      if (it === 'chamar' && !e.combat.chamou) {
        e.combat.chamou = true;
        const T = D.masmorras[e.tipo];
        const fraco = T.inimigos.filter(i => i.tipo === en.tipo).sort((a, b) => a.hp - b.hp)[0] || T.inimigos[0];
        const n = criarInimigo(fraco.id, e.zone, [en.x, en.y]);
        narr(`${art(en, true)} solta um grito. ${CP.cap(n.desc)} responde ao chamamento!`);
        draw(`Marca ${art(n)} perto de ${C.n(n.x, n.y)} com um X.`);
        e.combat.ens.push(n.id);
        n.int = 'ataque';
      } else if (it === 'fugir') {
        const arq = compDe('arqueira');
        if (arq) { narr(`${arq.nome} dispara contra quem foge!`); danoEm(en, 1, null); if (en.hp <= 0) return; }
        en.gone = true;
        narr(`${art(en, true)} foge pela escuridão e desaparece.`);
        draw(`Apaga o X de ${C.n(en.x, en.y)}.`);
      }
      if (it === 'atordoado') en.atordoado = false;
    });
    const cao = compDe('cao');
    if (cao && e.combat.ronda % 2 === 0) { const alvo = vivosCombate().sort((a, b) => a.hp - b.hp)[0]; if (alvo) { narr(`${cao.nome} salta e ferra os dentes n${alvo.g === 'f' ? 'a' : 'o'} ${alvo.nome}!`); danoEm(alvo, 1, null); } }
    vivosCombate().forEach(en => { if (en.int !== 'ataque' || !e.combat.novo) novaIntencao(en); });
    e.combat.ronda++;
    fimCombateSePreciso();
  }

  function vivosCombate() { const e = E(); return e.combat ? e.combat.ens.map(id => dg().ents[id]).filter(en => en && !en.gone && en.hp > 0) : []; }

  function atacar(en, h, arriscado) {
    const e = E();
    h = h || actor();
    if (!en || en.hp <= 0) { narr('Não há aí nada para atacar.'); return; }
    const w = arma(h);
    const surpresa = !e.combat && (en.estado === 'dormente' || en.estado === 'passivo');
    const extra = [];
    if (en.def) extra.push([`Defesa ${en.nome}`, -en.def]);
    if (surpresa) extra.push(['Surpresa', 1]);
    if (w.vsMorto && en.tipo === 'morto') extra.push([w.nome, w.vsMorto]);
    if (en.boss && e.m.final.bonus) Object.keys(e.m.final.bonus).forEach(p => { if (e.flags[p]) extra.push(['Pista', e.m.final.bonus[p]]); });
    if (e.buffs.instinto === en.id) extra.push(['Instinto', 1]);
    if (e.combat && en.int === 'defende') extra.push(['Em guarda', -1]);
    if (en.atordoado) extra.push(['Atordoado', 2]);
    if (arriscado) narr('Golpe arriscado: +1 de dano, mas se não acertares em cheio, levas mais 1.');
    const verbo = w.distancia ? 'dispara contra' : 'ataca';
    narr(`${h.nome} ${verbo} ${art(en)}${surpresa ? ', apanhando-' + (en.g === 'f' ? 'a' : 'o') + ' desprevenid' + (en.g === 'f' ? 'a' : 'o') : ''}.`);
    pedir({ h: 'ataque', heroi: h.id, mods: modsFor(h, 'ataque', extra), rotulo: `${arriscado ? 'Golpe arriscado' : 'Ataque'} de ${h.nome} (${w.nome}). Lança 1D6.`, d: { en: en.id, surpresa, arriscado: !!arriscado } });
  }

  function golpeInimigo(en, h, extraDano) {
    const it = intDe(en);
    if (!it.ataca) { narr(`${art(en, true)} ${en.int === 'defende' ? 'mantém a guarda e não ataca' : 'não te ataca'}.`); return; }
    const verbo = en.int === 'salto' ? 'salta-te em cima' : en.int === 'pesado' ? 'acerta-te com toda a força' : en.tipo === 'fera' ? 'morde' : 'golpeia';
    const e = E();
    const dano = en.dano + it.dano + (extraDano || 0) + (e.combat && e.combat.furia ? 1 : 0);
    const esc = compDe('escudeiro');
    if (esc && e.combat && !e.combat.escudeiro) {
      e.combat.escudeiro = true;
      narr(`${esc.nome} mete-se à frente e leva o golpe por ${h.nome}!`);
      ferirComp(esc, dano, CP.cap(art(en))); return;
    }
    const outros = compsExp().map(c => ({ c })).concat((e.sobrev || []).filter(x => !x.morto).map(sv => ({ sv })));
    if (outros.length && rnd() < 0.2) {
      const o = rpick(outros);
      if (o.c) { narr(`${art(en, true)} vira-se contra ${o.c.nome}!`); ferirComp(o.c, dano); }
      else { narr(`${art(en, true)} vira-se contra o sobrevivente!`); ferirSobrev(o.sv, dano); }
      return;
    }
    narr(`${art(en, true)} ${verbo}${en.int === 'salto' || en.int === 'pesado' ? '' : ' ' + h.nome}!`);
    ferir(h, dano, 'inimigo');
  }

  function danoEm(en, n, h) {
    en.hp = Math.max(0, en.hp - n);
    if (en.hp <= 0) {
      good(`${art(en, true)} cai${en.tipo === 'morto' ? ' e desfaz-se em pó e ossos' : ''}! (${n} de dano)`);
      draw(`Apaga o X de ${C.n(en.x, en.y)}.`);
      if (S.impeto < 6) S.impeto++;
      E().mortes = (E().mortes || 0) + 1;
      if (en.tipo === 'morto') stat('mortos'); else if (en.tipo === 'fera') stat('feras');
      if (tp('sanguessuga') && h) curar(h, 1);
      if (tp('lendario_ouro')) { S.ouro += 2; E().ganhoOuro += 2; log('good', '+2 moedas (Mão de Midas).', { i: 'ouro' }); }
      if (!en.boss && rnd() < 0.4) { narr(`${CP.cap(en.tipo === 'fera' ? 'no ninho dele' : 'no que deixou para trás')}, algo te chama a atenção.`); loot('pequeno'); }
    } else {
      const f = en.hp / (en.hpMax || en.hp);
      narr(`Acertas: ${n} de dano. ${art(en, true)} está ${f > 0.66 ? 'pouco ferid' : f > 0.33 ? 'ferid' : 'muito ferid'}${en.g === 'f' ? 'a' : 'o'}.`);
    }
    void h;
  }

  /* começa uma luta com todos os inimigos visíveis na zona */
  function comecarLuta(en) {
    const e = E();
    const ids = inimigos(e.zone).filter(o => o.hp > 0).map(o => o.id);
    if (!ids.includes(en.id)) ids.unshift(en.id);
    if (ids.some(id => dg().ents[id].boss)) {
      e.combateFinal = true;
      Object.values(dg().ents).forEach(b => { if (b.boss && b.kind === 'inimigo' && !b.gone && !b.oculto && b.hp > 0 && !ids.includes(b.id)) ids.push(b.id); });
    }
    iniciarCombate(ids);
  }
  function verificarVitoria() {
    const e = E();
    if (!e || e.vitoriaFeita || e.combat) return;
    const bosses = Object.values(dg().ents).filter(en => en.boss && en.kind === 'inimigo');
    if (!bosses.length) return;
    const algumMorto = bosses.some(b => b.hp <= 0 && !b.gone);
    const vivo = bosses.some(b => !b.gone && b.hp > 0);
    if (algumMorto && !vivo) { e.vitoriaFeita = true; correrEfeitos(e.m.final.vitoria, { h: actor() }); }
  }

  function fimCombateSePreciso() {
    const e = E();
    if (!e.combat) return;
    if (vivosCombate().length) return;
    e.combat = null;
    log('combat', 'O combate terminou.');
    const cur = compDe('curandeira');
    if (cur) { const h = S.herois.filter(x => x.estado !== 'morto' && x.vida < vmax(x)).sort((a, b) => (a.vida - vmax(a)) - (b.vida - vmax(b)))[0]; if (h) { narr(`${cur.nome} ajoelha-se junto de ${h.nome} e trata-lhe as feridas.`); curar(h, 1); } }
    if (e.scene) e.scene.pausada = false;
    verificarVitoria();
  }

  function defender(h) {
    const e = E();
    if (!e.combat) { narr('Não há nada de que te defenderes.'); return; }
    const atac = vivosCombate().filter(x => intDe(x).ataca);
    if (!atac.length) { narr('Ninguém te está a atacar. Recuperas o fôlego e preparas o próximo golpe.'); if (S.impeto < 6) S.impeto++; fimRonda(); proximoTurno(); return; }
    narr(`${h.nome} levanta a guarda e espera o golpe.`);
    pedir({ h: 'defender', heroi: h.id, mods: modsFor(h, 'defesa', [['Em guarda', 1]]), rotulo: `Defesa de ${h.nome}. Lança 1D6.` });
  }
  function manobra(en, h) {
    const e = E();
    if (!e.combat || !en || en.hp <= 0) { narr('Não há aí ninguém para derrubar.'); return; }
    const attr = h.attr.FOR >= h.attr.AGI ? 'intimidar' : 'esquivar';
    narr(`${h.nome} tenta ${attr === 'intimidar' ? 'empurrar' : 'passar uma rasteira a'} ${art(en)}.`);
    const extra = en.boss ? [['Corpulento', -1]] : [];
    pedir({ h: 'manobra', heroi: h.id, mods: modsFor(h, attr, extra), rotulo: `Manobra de ${h.nome} (${attr === 'intimidar' ? 'Força' : 'Agilidade'}). Lança 1D6.`, d: { en: en.id } });
  }

  function fugir(h) {
    const e = E();
    h = h || actor();
    if (e.via == null && e.zone === 0) {
      narr(`${h.nome} corre para as escadas!`);
      pedir({ h: 'fugaSaida', heroi: h.id, mods: modsFor(h, 'fuga'), rotulo: `Teste de Fuga de ${h.nome}. Lança 1D6.` });
      return;
    }
    narr(`${h.nome} tenta fugir por onde veio.`);
    pedir({ h: 'fuga', heroi: h.id, mods: modsFor(h, 'fuga'), rotulo: `Teste de Fuga de ${h.nome}. Lança 1D6.` });
  }

  /* acção que não é ataque, em combate: o inimigo aproveita — teste de defesa */
  function acaoEmCombate(h, desc) {
    const e = E();
    if (!e.combat) return;
    const en = vivosCombate().filter(x => intDe(x).ataca).sort((a, b) => (b.dano + intDe(b).dano) - (a.dano + intDe(a).dano))[0];
    if (!en) { narr('Nenhum inimigo te ataca neste momento.'); fimRonda(); return; }
    narr(`Enquanto ${desc}, ${art(en)} aproveita para atacar.`);
    pedir({ h: 'defesa', heroi: h.id, mods: modsFor(h, 'defesa'), rotulo: `Teste de Defesa de ${h.nome}. Lança 1D6.`, d: { en: en.id } });
  }

  /* =========================================================== efeitos (DSL dos dados) */
  function correrEfeitos(lista, ctx) {
    const e = E();
    ctx = ctx || {};
    const h = ctx.h || actor();
    let combate = false;
    (lista || []).forEach(ef => {
      if (!E()) return;
      if (ef.t) narr(ef.t.replace(/\{heroi\}/g, h ? h.nome : ''));
      if (ef.dano) ferir(h, ef.dano);
      if (ef.cura) curar(h, ef.cura);
      if (ef.ouro > 0 && tp('ganancia') && E()) { ef = Object.assign({}, ef, { ouro: Math.ceil(ef.ouro * 1.5) }); tick(1); }
      if (ef.ouro > 0) e.ganhoOuro += ef.ouro;
      if (ef.item && D.tesouros.includes(ef.item)) e.tesouros++;
      if (ef.ouro) { S.ouro = Math.max(0, S.ouro + ef.ouro); log(ef.ouro > 0 ? 'good' : 'sys', ef.ouro > 0 ? `+${ef.ouro} moedas de ouro (bolsa: ${S.ouro}).` : `Pagas ${-ef.ouro} moedas (bolsa: ${S.ouro}).`, { i: 'ouro' }); }
      if (ef.item) { addItem(ef.item); log('good', `Ganhas: ${itemDef(ef.item).nome}.`, { i: ef.item }); }
      if (ef.removeItem) delItem(ef.removeItem);
      if (ef.flag) e.flags[ef.flag] = true;
      if (ef.tick) tick(ef.tick);
      if (ef.loot) loot(ef.loot);
      if (ef.buff) e.buffs[ef.buff] = true;
      if (ef.busca) { e.buscas = (e.buscas || 0) + 1; pedir({ h: 'achado', heroi: (actor() || {}).id, rotulo: 'Encontras alguma coisa! Lança 1D6 na tabela de achados.' }); }
      if (ef.foco) { const m = aptos().find(x => x.focoMax > 0); if (m) { m.foco = Math.min(m.focoMax + 1, m.foco + ef.foco); good(`${m.nome} recupera ${ef.foco} de Foco (${m.foco}).`); } }
      if (ef.impeto) { S.impeto = Math.max(0, Math.min(6, (S.impeto || 0) + ef.impeto)); log('good', `Ímpeto ${ef.impeto > 0 ? '+' : ''}${ef.impeto} (${S.impeto}).`); }
      if (ef.curaTodos) S.herois.filter(x => x.estado !== 'morto').forEach(x => curar(x, ef.curaTodos));
      if (ef.luz) {
        if (ef.luz < 0) gastarLuz(-ef.luz);
        else if (e.luz && e.luz.marcas > 0) { e.luz.marcas += ef.luz; e.luz.max = Math.max(e.luz.max, e.luz.marcas); good(`A luz dura mais ${ef.luz} marcas.`); }
        else { e.luz = { marcas: ef.luz, max: ef.luz, fonte: 'magia' }; good(`Tens luz outra vez (${ef.luz} marcas).`); }
      }
      if (ef.fimCena) e.scene = null;
      if (ef.revela === 'armadilhas') revelarArmadilhasTodas();
      if (ef.revela === 'zona') revelarZona();
      if (ef.dica) dica();
      if (ef.bossMod) Object.values(dg().ents).forEach(en => { if (en.boss && en.kind === 'inimigo' && en.hp > 0 && !en.gone && (!ef.bossMod.so || ef.bossMod.so === en.defId)) { if (ef.bossMod.hp) { en.hp = Math.max(1, en.hp + ef.bossMod.hp); } if (ef.bossMod.def) en.def = Math.max(0, en.def + ef.bossMod.def); } });
      if (ef.remove === true && ctx.ent) ctx.ent.gone = true;
      if (ef.remove === 'npc') Object.values(dg().ents).forEach(en => { if (en.kind === 'npc' && en.final) en.gone = true; });
      if (ef.remove === 'boss') Object.values(dg().ents).forEach(en => { if (en.boss) { en.gone = true; } });
      if (ef.inimigo) {
        const cell = ctx.ent ? [ctx.ent.x, ctx.ent.y] : e.pos;
        const en = criarInimigo(ef.inimigo, e.zone, cell);
        if (ef.ferido) en.hp = Math.max(1, en.hp - ef.ferido);
        draw(`Marca ${art(en)} em ${C.n(en.x, en.y)} com um X.`);
        iniciarCombate([en.id]);
      }
      if (ef.combate) combate = true;
      if (ef.completa) completar(ef);
    });
    if (combate && E()) {
      const bosses = Object.values(dg().ents).filter(en => en.boss && en.kind === 'inimigo' && !en.gone && en.hp > 0);
      if (bosses.length) {
        bosses.forEach(b => { if (b.oculto) { b.oculto = false; draw(`Marca ${art(b)} em ${C.n(b.x, b.y)} com um X.`); } });
        e.combateFinal = true;
        iniciarCombate(bosses.map(b => b.id));
      }
    }
  }

  function completar(ef) {
    const e = E();
    let id = ef.completa;
    if (ef.seFlag && e.flags[ef.seFlag]) id = ef.entao;
    if (e.completo) return;
    e.completo = id;
    e.scene = null;
    // quem sobra da cena final deixa de ser hostil
    if (!e.combat) Object.values(dg().ents).forEach(en => { if (en.boss && en.kind === 'inimigo' && en.hp > 0 && !en.gone) { en.gone = true; } });
    log('done', '✦ Objectivo cumprido');
    sys('Regressa às escadas da entrada para terminares a aventura. Podes continuar a explorar antes de sair, se quiseres.');
  }

  function loot(tab) {
    const L = D.loot[tab] || D.loot.pequeno;
    const r = rpick(L);
    const e = E();
    if (tab === 'grande') { e.tesouros += 2; stat('tesouros'); log('tesouro', 'Tesouro!'); }
    if (r.item && D.tesouros.includes(r.item)) e.tesouros++;
    if (r.ouro) { let n = rint(r.ouro[0], r.ouro[1]) + (aptos().some(h => tem(h, 'olho')) ? 2 : 0); if (tp('ganancia')) { n = Math.ceil(n * 1.5); tick(1); } S.ouro += n; e.ganhoOuro += n; log('good', `Encontras ${n} moedas de ouro (bolsa: ${S.ouro}).`, { i: 'ouro' }); }
    if (r.item) { addItem(r.item); log('good', `Encontras: ${itemDef(r.item).nome}.`, { i: r.item }); }
    if (tab === 'grande') oferecerBencao('Entre o tesouro há algo mais: um objecto que pulsa com poder. Escolhe uma bênção.');
  }

  function revelarArmadilhasTodas() {
    const lista = Object.values(dg().ents).filter(t => t.kind === 'trap' && !t.sprung && !t.gone);
    if (!lista.length) { sys('Não há armadilhas nesta masmorra... pelo menos, não que se saiba.'); return; }
    lista.forEach(t => { t.achada = true; });
    lista.forEach(t => { const z = Z(t.zone); if (z.vis) draw(`Armadilha em ${C.n(t.x, t.y)}: ${t.nome}. Marca com um T.`); });
    const n = lista.filter(t => !Z(t.zone).vis).length;
    if (n) sys(`Conheces mais ${n} ${plural(n, 'armadilha', 'armadilhas')} em zonas que ainda não exploraste. Serão assinaladas quando lá chegares.`);
  }
  function revelarZona() {
    const e = E();
    let algo = false;
    dg().conns.forEach(c => { if (c.secreto && !c.achada && c.room === e.zone) { c.achada = true; algo = true; stat('secretas'); good('Uma porta secreta!'); draw(`Desenha uma porta secreta na parede ${C.NOME[c.side]}, ${entre(c)}.`); } });
    traps(e.zone).forEach(t => { if (!t.achada) { t.achada = true; algo = true; good(`Uma armadilha: ${t.nome}.`); narr(t.descAchada); draw(`Marca um T em ${C.n(t.x, t.y)}.`); } });
    Object.values(dg().ents).forEach(en => { if (en.zone === e.zone && en.oculto && en.kind !== 'inimigo') { en.oculto = false; algo = true; draw(linhaEnt(en)); } });
    if (!algo) narr('Nada está oculto aqui.');
  }
  function dica() {
    const e = E();
    const p = Object.values(dg().ents).find(en => en.kind === 'pista' && !e.flags[en.pid]);
    if (p) { narr(`Ficas a saber que vale a pena procurar ${p.desc}, em ${C.n(p.x, p.y)}.`); S.diario.push({ dia: S.dia, t: `Dica: ${p.desc} em ${C.n(p.x, p.y)} (${e.local}).` }); }
    else narr('«Já sabes tudo o que eu sei», ouves.');
  }

  /* =========================================================== handlers de resultados */
  const HANDLERS = {
    ataque(r, p, h) {
      const e = E();
      const en = dg().ents[p.d.en];
      if (!en || !h) return;
      const w = arma(h);
      const surpresa = p.d.surpresa;
      let dano = w.dano + (r.nat === 6 ? 1 : 0) + (w.attr === 'FOR' && tem(h, 'feroz') ? 1 : 0) + (surpresa && tem(h, 'golpe_baixo') ? 1 : 0) + (p.d.arriscado ? 1 : 0) + (tp('lamina') ? 1 : 0) + (h.origem === 'meio_orc' && w.attr === 'FOR' ? 1 : 0);
      const extraRisco = p.d.arriscado && !tp('furia') ? 1 : 0;
      const furtivo = surpresa && w.furtivo && h.cls === 'ladrao';
      if (furtivo) dano *= 2;
      if (!e.combat && !surpresa) comecarLuta(en);
      const primeiroDisparo = w.distancia && h.cls === 'explorador' && e.combat && !e.combat.disparo[h.id];
      if (r.nat === 6) good('Golpe certeiro! (+1 de dano)');
      if (furtivo && r.band !== 'falha') good('Ataque furtivo! Dano a dobrar.');
      const estavaAtordoado = en.atordoado;
      if (estavaAtordoado) en.atordoado = false;
      if (r.band === 'sucesso') danoEm(en, dano, h);
      else if (r.band === 'parcial') {
        danoEm(en, dano, h);
        if (en.hp > 0 && !surpresa) {
          if (primeiroDisparo) good('Disparas de longe: não há resposta.');
          else golpeInimigo(en, h, extraRisco);
        }
      } else {
        narr(`${h.nome} falha.`);
        if (!surpresa) {
          if (primeiroDisparo) narr('O inimigo ainda está longe; não te consegue atingir.');
          else golpeInimigo(en, h, extraRisco);
          vivosCombate().filter(o => o.id !== en.id && intDe(o).ataca).forEach(o => { narr(`${art(o, true)} aproveita a abertura.`); ferir(h, 1, 'inimigo'); });
        } else narr(`${art(en, true)} desperta, furios${en.g === 'f' ? 'a' : 'o'}.`);
      }
      if (e.combat) e.combat.disparo[h.id] = true;
      if (surpresa && inimigos(e.zone).length) comecarLuta(en);
      else if (E() && E().combat && en.hp > 0 && en.atordoado && r.band !== 'falha') { /* continua atordoado só uma ronda */ }
      if (E() && E().combat && !surpresa) fimRonda();
      fimCombateSePreciso();
      verificarVitoria();
      if (E() && E().combat) proximoTurno();
    },
    defesa(r, p, h) {
      const en = dg().ents[p.d.en];
      if (!en || en.hp <= 0 || !h) return;
      if (r.band === 'falha') golpeInimigo(en, h);
      else if (r.band === 'parcial') { narr(`Recuas a tempo, mas ${art(en)} arranha-te.`); ferir(h, 1, 'inimigo'); }
      else good(`${h.nome} esquiva-se.`);
      if (E() && E().combat) { fimRonda(); proximoTurno(); }
    },
    defender(r, p, h) {
      const e = E();
      const atac = vivosCombate().filter(x => intDe(x).ataca).sort((a, b) => (b.dano + intDe(b).dano) - (a.dano + intDe(a).dano));
      const forte = atac[0];
      if (r.band === 'sucesso') {
        good(`${h.nome} apara tudo o que vem!`);
        if (forte) { narr(`E responde com um contra-golpe!`); danoEm(forte, tp('contra') ? 2 : 1, h); }
        if (S.impeto < 6) S.impeto++;
      } else if (r.band === 'parcial') {
        if (forte) { const d = Math.max(0, forte.dano + intDe(forte).dano - 1); narr(`Aparas parte do golpe.`); if (d) ferir(h, d, 'inimigo'); else good('Não sofres nada.'); }
      } else {
        if (forte) golpeInimigo(forte, h);
        atac.slice(1).forEach(o => { narr(`${art(o, true)} também te acerta.`); ferir(h, 1, 'inimigo'); });
      }
      if (E() && E().combat) { fimRonda(); fimCombateSePreciso(); verificarVitoria(); if (E() && E().combat) proximoTurno(); }
      void e;
    },
    manobra(r, p, h) {
      const en = dg().ents[p.d.en];
      if (!en || en.hp <= 0) return;
      if (r.band === 'falha') { narr(`${art(en, true)} esquiva-se da manobra.`); golpeInimigo(en, h); }
      else {
        en.atordoado = true; en.int = 'atordoado';
        good(`${art(en, true)} cambaleia, atordoad${en.g === 'f' ? 'a' : 'o'}! Não ataca nesta ronda e o próximo ataque contra ${en.g === 'f' ? 'ela' : 'ele'} tem +2.`);
        if (r.band === 'parcial') { const o = vivosCombate().find(x => x.id !== en.id && intDe(x).ataca); if (o) { narr(`Mas ${art(o)} aproveita a abertura.`); ferir(h, 1, 'inimigo'); } }
      }
      if (E() && E().combat) {
        // a ronda passa, mas o atordoamento mantém-se até ao próximo ataque
        const keep = en.atordoado;
        fimRonda();
        if (keep && en.hp > 0 && !en.gone) { en.atordoado = true; en.int = 'atordoado'; }
        if (E() && E().combat) proximoTurno();
      }
    },
    fuga(r, p, h) {
      const e = E();
      const en = vivosCombate()[0];
      if (r.band === 'falha') { narr('Não consegues escapar!'); if (en) golpeInimigo(en, h); if (E() && E().combat) { fimRonda(); proximoTurno(); } return; }
      if (r.band === 'parcial' && en) { narr('Escapas, mas levas um golpe pelas costas.'); golpeInimigo(en, h); }
      if (!E()) return;
      const c = dg().conns[e.via];
      e.combat = null;
      if (e.scene) e.scene.pausada = false;
      narr(aptos().length > 1 ? 'O grupo recua em debandada.' : 'Foges por onde vieste.');
      if (c) { const z = outra(c, e.zone); e.quiet = true; entrar(z, c.id); e.quiet = false; e.pos = celula(c, z); sys(`Estás em ${posTxt()}, ${nomeZona(Z(z))}. Os inimigos ficaram para trás — por agora.`); }
    },
    fugaSaida(r, p, h) {
      const en = vivosCombate()[0];
      if (r.band === 'falha') { narr('Não consegues chegar às escadas!'); if (en) golpeInimigo(en, h); if (E() && E().combat) proximoTurno(); return; }
      if (r.band === 'parcial' && en) golpeInimigo(en, h);
      if (!E() || !aptos().length) return;
      E().combat = null;
      narr('Sobes as escadas a correr e só paras cá fora, ao sol.');
      terminarExpedicao(E().completo ? 'sucesso' : 'retirada');
    },
    armadilha(r, p, h) {
      const t = dg().ents[p.d.t];
      t.sprung = true;
      if (t.on === 'conn') t.gone = true;
      let dano = t.dano;
      if (t.fosso && has('corda')) dano = Math.max(0, dano - 1);
      if (tem(h, 'pe_firme')) dano = Math.max(0, dano - 1);
      if (r.band === 'sucesso') good(`${h.nome} esquiva-se por um triz!`);
      else if (r.band === 'parcial') { narr('Esquivas-te em parte.'); ferir(h, Math.max(1, dano - 1)); }
      else ferir(h, dano);
      if (t.fosso && r.band !== 'sucesso') narr(has('corda') ? 'Com a corda, sais do fosso sem mais estragos.' : 'Sais do fosso a custo, agarrado às pedras.');
      efeitoArmadilha(t);
      draw(`Marca um T em ${C.n(t.x, t.y)} (armadilha disparada).`);
      if (h.estado === 'ok' || aptos().length) E().cont = p.cont;
    },
    furtivo(r, p, h) {
      const e = E();
      const dorm = inimigos(e.zone).filter(en => en.estado === 'dormente' && !en.boss);
      if (r.band === 'sucesso') { e.sneak[e.zone] = true; narr('Avanças em silêncio, pé ante pé. Nada se mexe.'); e.cont = p.cont; }
      else if (r.band === 'parcial') { e.sneak[e.zone] = true; tick(1); narr(`Uma pedrinha rola. ${dorm.length ? art(dorm[0], true) + ' mexe-se... mas não acorda.' : ''}`); e.cont = p.cont; }
      else {
        narr(`Tropeças. ${dorm.map(en => art(en, true)).join(' e ')} ${plural(dorm.length, 'acorda', 'acordam')}!`);
        iniciarCombate(dorm.map(en => en.id));
      }
      void h;
    },
    forcarPorta(r, p) {
      const c = dg().conns[p.d.c];
      const trancada = c.tipo === 'trancada';
      if (r.band === 'sucesso') { c.aberta = true; narr(trancada ? 'Com um estrondo, a fechadura salta.' : 'A porta cede com um estalo.'); if (trancada) tick(1); E().cont = p.cont; }
      else if (r.band === 'parcial') { c.aberta = true; narr('A porta abre-se, mas o barulho espalha-se pelas pedras.'); tick(1); if (trancada) ferir(H(p.heroi), 1); E().cont = p.cont; }
      else { narr('A porta não cede.' + (trancada ? ' Magoas o ombro.' : '')); tick(1); if (trancada) ferir(H(p.heroi), 1); sys('Podes tentar outra vez.'); }
    },
    arrombar(r, p) {
      const c = dg().conns[p.d.c];
      if (r.band === 'sucesso') { c.aberta = true; narr('Clique. A fechadura cede sem um ruído.'); E().cont = p.cont; }
      else if (r.band === 'parcial') { c.aberta = true; narr('Demoras, mas a fechadura acaba por ceder.'); tick(1); E().cont = p.cont; }
      else { narr('A gazua escorrega. A fechadura resiste.'); tick(1); sys('Podes tentar outra vez.'); }
    },
    procurar(r) {
      if (r.band === 'falha') { tick(1); narr('Procuras com cuidado... e não encontras nada de especial.'); return; }
      if (r.band === 'parcial') tick(1);
      revelarZona();
    },
    armadilhas(r) {
      const e = E();
      if (r.band === 'falha') { tick(1); narr('Examinas o chão, as paredes e as portas. Não encontras armadilhas.'); return; }
      if (r.band === 'parcial') { tick(1); narr('Demoras, mas encontras.'); }
      traps(e.zone).forEach(t => { if (!t.achada) { t.achada = true; good(`Armadilha: ${t.nome}.`); narr(t.descAchada); draw(`Marca um T em ${C.n(t.x, t.y)}.`); } });
    },
    desarmar(r, p) {
      const t = dg().ents[p.d.t];
      if (r.band === 'sucesso') { t.gone = true; good('Desarmas a armadilha.'); draw(`Apaga o T de ${C.n(t.x, t.y)}.`); }
      else if (r.band === 'parcial') { t.gone = true; tick(1); good('Desarmas a armadilha, devagar.'); draw(`Apaga o T de ${C.n(t.x, t.y)}.`); }
      else { narr('Tocas no sítio errado...'); t.achada = false; dispararArmadilha(t, null); }
    },
    ouvir(r, p) {
      const e = E();
      const alvos = p.d.zonas.flatMap(z => ents(z, true).filter(en => (en.kind === 'inimigo' && en.hp > 0) || en.kind === 'npc'));
      if (r.band === 'falha') { narr('Não ouves nada.'); return; }
      if (r.band === 'parcial') { narr('Do outro lado, algo se mexe. Não percebes o quê.'); return; }
      const desc = alvos.map(en => {
        if (en.kind === 'npc') return 'uma voz que murmura sozinha';
        if (en.estado === 'oculto') return 'um ranger de pedra, como se algo se mexesse num túmulo';
        if (en.estado === 'dormente') return `respiração lenta — ${en.desc}, a dormir`;
        if (en.estado === 'passivo') return 'trabalho, vozes, ferramentas';
        return `passos e movimento — ${en.desc}`;
      });
      narr(`Encostas o ouvido. Ouves ${desc.join('; e ')}.`);
      void e;
    },
    pista(r, p) {
      const en = dg().ents[p.d.id];
      if (r.band === 'falha') { narr(en.falhaTxt || 'Não consegues perceber.'); tick(1); sys('Podes tentar outra vez (custa tempo).'); return; }
      if (r.band === 'parcial') tick(1);
      revelarPista(en);
    },
    feat(r, p) {
      const en = dg().ents[p.d.id];
      en.usada = true;
      correrEfeitos(en.acao.res[r.band], { ent: en });
      if (r.band === 'falha') en.usada = false;
    },
    opcao(r, p) {
      const o = (p.d.lista === 'final' ? E().m.final.opcoes : (dg().ents[p.d.ent] || {}).opcoes || []).find(x => x.id === p.d.oid);
      if (!o) return;
      const ent = p.d.ent ? dg().ents[p.d.ent] : null;
      correrEfeitos(o.res[r.band], { ent, h: H(p.heroi) });
      if (ent && ent.kind === 'dilema') { ent.gone = true; if (E() && E().scene && E().scene.ent === ent.id) E().scene = null; }
    },
    percalco(r, p, h) {
      const n = r.nat;
      const pc = D.percalcos[n - 1];
      narr(pc.t);
      if (pc.dano) ferir(h, pc.dano);
      if (pc.foco === 'todo' && h) h.foco = 0;
      if (pc.tick) tick(pc.tick);
      if (pc.luz) { const e = E(); if (e.luz && e.luz.marcas > 0) { e.luz.marcas = 0; acenderLuz(false); } }
      if (pc.mudo && h) h.mudo = true;
    },
    feiticoCurar(r, p, h) {
      const alvo = H(p.d.alvo);
      if (!alvo) return;
      const base = 3 + (tem(h, 'maos') ? 1 : 0);
      if (r.band === 'sucesso') curar(alvo, base);
      else if (r.band === 'parcial') curar(alvo, base - 1);
      else narr('As palavras perdem-se no ar. Nada acontece.');
      if (E() && E().combat) acaoEmCombate(h, 'rezas');
    },
    feiticoRevelar(r) {
      if (r.band === 'falha') { narr('As sombras não se afastam. O feitiço falha.'); return; }
      if (r.band === 'parcial') tick(1);
      revelarZona();
    },
    feiticoLuz(r, p, h) {
      const e = E();
      if (r.band === 'falha') { narr('Uma faísca, e nada mais.'); return; }
      const n = r.band === 'sucesso' ? 5 : 3;
      e.luz = { marcas: n, max: n, fonte: 'magia' };
      good(`Uma esfera de luz pálida nasce na mão de ${h.nome} (${n} marcas).`);
    },
    socorro(r, p) {
      const alvo = H(p.d.alvo);
      if (!alvo || alvo.estado !== 'caido') return;
      if (r.band === 'falha') { narr('O sangue não pára. Não consegues.'); return; }
      if (r.band === 'parcial') tick(1);
      alvo.morrer = 0;
      good(`${alvo.nome} fica estável. Continua inconsciente, mas já não corre perigo de vida.`);
    },
    selo(r, p, h) {
      const e = E();
      const en = dg().ents[p.d.en];
      if (!en) return;
      const dano = (en.tipo === 'morto' ? 3 : 2) + (tem(h, 'selo_maior') ? 1 : 0);
      if (!e.combat) comecarLuta(en);
      if (r.band === 'sucesso') danoEm(en, dano, h);
      else if (r.band === 'parcial') { danoEm(en, dano - 1, h); if (en.hp > 0) golpeInimigo(en, h); }
      else { narr('As palavras falham-te na garganta.'); golpeInimigo(en, h); }
      if (E() && E().combat) fimRonda();
      fimCombateSePreciso();
      verificarVitoria();
      if (E() && E().combat) proximoTurno();
    }
  };

  /* =========================================================== acções de exploração */
  function revelarPista(en) {
    const e = E();
    narr(en.exame);
    if (!e.flags[en.pid]) {
      e.flags[en.pid] = true;
      const tot = e.m.pistas.length;
      const n = e.m.pistas.filter(p => e.flags[p.id]).length;
      log('clue', `Pista descoberta: ${en.nome} (${n}/${tot})`);
      stat('pistas');
      S.diario.push({ dia: S.dia, t: `${e.titulo} — ${en.nome}: ${en.exame}` });
      correrEfeitos(en.efeitos || [], { ent: en });
    }
  }

  function moverPara(en) {
    const e = E();
    if (Z(e.zone).kind === 'sala' && (e.pos[0] !== en.x || e.pos[1] !== en.y)) {
      e.pos = [en.x, en.y];
      sys(`Vais até ${C.n(en.x, en.y)}.`);
    }
  }

  function examinarEnt(en) {
    const e = E();
    if (!en) return;
    if (en.kind === 'inimigo') {
      const f = en.hp / (en.hpMax || en.hp);
      narr(`${CP.cap(en.desc)}. ${en.exame || ''} ${f < 1 ? 'Está ferid' + (en.g === 'f' ? 'a' : 'o') + '.' : ''}`.trim());
      if (en.estado === 'dormente') sys('Não deu por ti. Podes atacá-lo de surpresa (+1), esgueirar-te, ou deixá-lo em paz.');
      return;
    }
    if (en.kind === 'npc') { narr(`${CP.cap(en.desc)}.`); sys('Podes falar com ' + art(en) + '.'); return; }
    if (en.kind === 'dilema') { falarCom(en); return; }
    if (!furtivoOk({ a: 'exam', id: en.id })) return;
    moverPara(en);
    if (en.kind === 'pista') {
      if (e.flags[en.pid]) { narr(en.exame); return; }
      if (en.teste) {
        const h = actor();
        if (en.teste === 'ler' && bloqueadoPeloEscuro('ler')) return;
        narr(`Tentas perceber ${en.desc}.`);
        pedir({ h: 'pista', heroi: h.id, mods: modsFor(h, en.teste), rotulo: `Teste de ${R.TESTES[en.teste].nome} de ${h.nome}. Lança 1D6.`, d: { id: en.id } });
        return;
      }
      revelarPista(en);
      return;
    }
    if (en.kind === 'enigma') {
      narr(en.exame);
      if (en.resolvido) { sys('Já resolveste este enigma.'); return; }
      e.scene = { tipo: 'enigma', ent: en.id };
      sys(`Responde com «responder ...» ou escolhe uma opção.`);
      return;
    }
    if (en.kind === 'item') { narr(`É ${en.desc}.`); return; }
    if (en.kind === 'feat') {
      en.vista = true;
      narr(en.exame);
      if (en.acao && !en.usada) sys(`Podes: ${en.acao.rotulo.toLowerCase()}.`);
    }
  }

  function acaoFeat(en, retomar) {
    const e = E();
    if (!en || !en.acao) return;
    if (en.usada) { narr('Já o fizeste.'); return; }
    if (!retomar && !furtivoOk({ a: 'feat', id: en.id })) return;
    if (retomar && !furtivoOk({ a: 'feat', id: en.id })) return;
    moverPara(en);
    if (en.armadilha) {
      const t = dg().ents[en.armadilha];
      if (t && !t.sprung && !t.gone) {
        if (t.achada) { narr(`Com cuidado, evitas ${t.nome}.`); t.gone = true; }
        else { dispararArmadilha(t, { a: 'feat', id: en.id }); return; }
      }
    }
    const a = en.acao;
    if (a.teste) {
      const h = actor();
      pedir({ h: 'feat', heroi: h.id, mods: modsFor(h, a.teste), rotulo: `${a.rotulo}: teste de ${R.TESTES[a.teste].nome} de ${actor().nome}. Lança 1D6.`, d: { id: en.id } });
      return;
    }
    en.usada = true;
    correrEfeitos(a.efeitos, { ent: en });
    void e;
  }

  function apanharEnt(en) {
    if (!en) return;
    if (!furtivoOk({ a: 'apanhar', id: en.id })) return;
    moverPara(en);
    if (en.kind === 'item') { addItem(en.item); en.gone = true; log('good', `Apanhas ${en.desc.replace(/^uma? /, 'a ')}.`, { i: en.item }); draw(`Apaga o objecto de ${C.n(en.x, en.y)}.`); return; }
    if (en.kind === 'feat' && en.acao) { acaoFeat(en); return; }
    narr('Não é coisa que se leve.');
  }

  function procurar() {
    const e = E();
    if (bloqueadoPeloEscuro('procurar')) return;
    if (!furtivoOk({ a: 'procurar' })) return;
    const ocultos = dg().conns.filter(c => c.secreto && !c.achada && c.room === e.zone).length +
      Object.values(dg().ents).filter(en => en.zone === e.zone && en.oculto && en.kind !== 'inimigo').length;
    if (!ocultos) { tick(1); gastarLuz(1); narr('Procuras com cuidado nas paredes e no chão... não encontras nada de especial.'); return; }
    const h = actor();
    const mp = modsFor(h, 'procurar');
    gastarLuz(1);
    pedir({ h: 'procurar', heroi: h.id, mods: mp, rotulo: `Teste de Procurar de ${h.nome}. Lança 1D6.` });
  }

  function procurarArmadilhas() {
    const e = E();
    if (bloqueadoPeloEscuro('procurar armadilhas')) return;
    if (!furtivoOk({ a: 'armadilhas' })) return;
    const t = traps(e.zone).filter(t => !t.achada);
    if (!t.length) { gastarLuz(1); narr('Examinas o chão, as paredes e as portas. Não encontras armadilhas.'); return; }
    const h = actor();
    const ma = modsFor(h, 'armadilhas');
    gastarLuz(1);
    pedir({ h: 'armadilhas', heroi: h.id, mods: ma, rotulo: `Teste de Detectar armadilhas de ${h.nome}. Lança 1D6.` });
  }

  function ouvirPorta(c) {
    const e = E();
    const h = actor();
    const b = outra(c, e.zone);
    const zonas = [b];
    if (Z(b).kind === 'corredor') Z(b).ends.forEach(i => { const k = dg().conns[i]; const o = outra(k, b); if (o !== e.zone) zonas.push(o); });
    const algo = zonas.some(z => ents(z, true).some(en => (en.kind === 'inimigo' && en.hp > 0) || en.kind === 'npc'));
    narr(`Encostas o ouvido à ${nomePorta(c, e.zone)}.`);
    if (!algo) { narr('Silêncio. Só ouves a tua própria respiração e, ao longe, água a pingar.'); return; }
    pedir({ h: 'ouvir', heroi: h.id, mods: modsFor(h, 'ouvir'), rotulo: `Teste de Ouvir de ${h.nome}. Lança 1D6.`, d: { zonas } });
  }

  function falarCom(en) {
    const e = E();
    if (!en) { narr('Não há aqui ninguém com quem falar.'); return; }
    if (en.kind === 'inimigo') { narr(`${art(en, true)} não parece interessad${en.g === 'f' ? 'a' : 'o'} em conversa.`); return; }
    if (!en.final && !furtivoOk({ a: 'falar', id: en.id })) return;
    log('fala', en.fala || `${art(en, true)} olha para ti em silêncio.`, en.kind === 'dilema' ? { ic: en.icone, n: CP.cap(en.nome), cena: true } : { r: en.npcId || en.nome, n: CP.cap(en.nome) });
    if (en.final) { e.scene = { tipo: 'final' }; return; }
    e.scene = { tipo: 'npc', ent: en.id };
  }

  function socorrer(alvo) {
    const e = E();
    const h = actor();
    if (!alvo || alvo.estado !== 'caido') { narr('Não há ninguém caído para socorrer.'); return; }
    if (alvo === h) return;
    narr(`${h.nome} ajoelha-se junto a ${alvo.nome} e tenta estancar o sangue.`);
    pedir({ h: 'socorro', heroi: h.id, mods: modsFor(h, 'socorro'), rotulo: `Primeiros socorros de ${h.nome}. Lança 1D6.`, d: { alvo: alvo.id } });
    if (e.combat) acaoEmCombate(h, 'socorres o teu companheiro');
  }

  function descansar() {
    const e = E();
    if (e.combat) { narr('Não há descanso a meio de um combate.'); return; }
    if (inimigos(e.zone).length) { narr('Não podes descansar com inimigos tão perto.'); return; }
    if (e.rests >= 2) { narr('Já descansaste o suficiente nesta expedição. Mais tempo aqui em baixo e não voltas a subir.'); return; }
    e.rests++;
    narr('Sentas-te com as costas na pedra fria e recuperas o fôlego. O tempo passa.');
    S.herois.filter(h => h.estado !== 'morto').forEach(h => { curar(h, 2); h.mudo = false; });
    gastarLuz(2);
    tick(2);
  }

  function sairMasmorra() {
    const e = E();
    if (e.zone !== 0) { viajar(0, dg().stairs, 'sair'); return; }
    narr(e.completo ? 'Sobes as escadas devagar. Lá em cima, o ar nunca soube tão bem.' : 'Sobes as escadas e deixas a masmorra para trás, sem teres cumprido o que vieste fazer.');
    terminarExpedicao(e.completo ? 'sucesso' : 'retirada');
  }

  /* ---------------------------------------------------------------- magia e habilidades */
  function magia(nome, alvoTxt) {
    const e = E();
    const h = actor();
    const m = aptos().find(x => x.focoMax > 0);
    if (!m) { narr('Ninguém no grupo sabe as palavras antigas.'); return; }
    const caster = h.focoMax > 0 ? h : m;
    if (caster !== h && aptos().length > 1) { e.actor = caster.id; }
    if (caster.mudo) { narr(`A voz de ${caster.nome} continua presa. Só depois de descansar voltará a lançar feitiços.`); return; }
    if (caster.foco <= 0) { narr(`${caster.nome} já não tem Foco.`); return; }
    const teste = (hh, d, rot) => pedir({ h: hh, heroi: caster.id, mods: modsFor(caster, 'magia', d.extra), rotulo: `${rot}: teste de Magia de ${caster.nome}. Lança 1D6.`, d, magia: true });
    if (/cura|curar/.test(nome)) {
      const alvo = acharHeroi(alvoTxt) || [...S.herois].filter(x => x.estado !== 'morto').sort((a, b) => (a.vida / vmax(a)) - (b.vida / vmax(b)))[0];
      caster.foco--;
      narr(`${caster.nome} pousa as mãos em ${alvo.nome} e murmura as palavras antigas.`);
      teste('feiticoCurar', { alvo: alvo.id }, 'Curar');
      return;
    }
    if (/revel|ocult/.test(nome)) {
      caster.foco--;
      narr(`${caster.nome} fecha os olhos e procura o que se esconde.`);
      teste('feiticoRevelar', {}, 'Revelar');
      return;
    }
    if (/^luz|^iluminar/.test(nome)) {
      caster.foco--;
      narr(`${caster.nome} junta as mãos em concha e sussurra para dentro delas.`);
      teste('feiticoLuz', {}, 'Luz');
      return;
    }
    if (/selo|banir|ataque/.test(nome)) {
      const en = acharInimigo(alvoTxt) || inimigos(e.zone)[0];
      if (!en) { narr('Não há inimigos aqui.'); return; }
      caster.foco--;
      const extra = en.def ? [[`Defesa ${en.nome}`, -en.def]] : [];
      narr(`${caster.nome} ergue a mão e grita a palavra do selo contra ${art(en)}.`);
      teste('selo', { en: en.id, extra }, 'Selo');
      return;
    }
    sys('Feitiços: «lançar curar [herói]», «lançar selo [inimigo]», «lançar revelar», «lançar luz».');
  }

  function instinto() {
    const e = E();
    const h = aptos().find(x => x.cls === 'explorador');
    if (!h) { narr('Ninguém no grupo tem esse instinto.'); return; }
    if (h.usos.instinto) { narr(`${h.nome} já usou o Instinto nesta expedição.`); return; }
    h.usos.instinto = true;
    narr(`${h.nome} pára, fecha os olhos e deixa o corpo escutar a masmorra.`);
    traps(e.zone).forEach(t => { t.achada = true; good(`Armadilha: ${t.nome}.`); draw(`Marca um T em ${C.n(t.x, t.y)}.`); });
    const perigos = [];
    portas(e.zone).forEach(c => {
      const o = outra(c, e.zone);
      const zs = [o];
      if (Z(o).kind === 'corredor') Z(o).ends.forEach(i => { const k = dg().conns[i]; if (outra(k, o) !== e.zone) zs.push(outra(k, o)); });
      const n = zs.reduce((a, z) => a + inimigos(z).length + traps(z).length, 0);
      if (n) perigos.push(nomePorta(c, e.zone));
    });
    narr(perigos.length ? `Sentes perigo para lá de: ${perigos.join(', ')}.` : 'Nada de perigoso por perto. Por agora.');
  }

  /* =========================================================== resolução de alvos */
  function pontua(words, kws, nome) {
    const ks = (kws || []).concat(CP.norm(nome || '').split(' '));
    let s = 0;
    words.forEach(w => { if (w.length < 3) return; if (ks.some(k => k === w || (w.length > 3 && (k.startsWith(w) || w.startsWith(k))))) s++; });
    return s;
  }
  function acharEnt(p, filtro) {
    const e = E();
    let lista = ents(e.zone).filter(filtro || (() => true));
    if (p.coord) {
      const at = lista.filter(en => en.x === p.coord.x && en.y === p.coord.y);
      if (at.length) return at[0];
    }
    let best = null, bs = 0;
    lista.forEach(en => { const s = pontua(p.words, en.kw, en.nome); if (s > bs) { bs = s; best = en; } });
    return best;
  }
  function acharPorta(p) {
    const e = E();
    const ps = portas(e.zone);
    if (p.coord) {
      const c = ps.find(c => (c.rx === p.coord.x && c.ry === p.coord.y) || (c.cx === p.coord.x && c.cy === p.coord.y));
      if (c) return c;
    }
    if (p.dir) {
      const l = ps.filter(c => ladoDe(c, e.zone) === p.dir);
      if (l.length === 1) return l[0];
      if (l.length > 1) return l.find(c => !Z(outra(c, e.zone)).vis) || l[0];
    }
    if (p.words.some(w => /^(porta|passagem|arco|saida|corredor)/.test(w))) {
      const fechadas = ps.filter(c => !aberta(c));
      if (e.portaAlvo != null && ps.some(c => c.id === e.portaAlvo)) return dg().conns[e.portaAlvo];
      if (ps.length === 1) return ps[0];
      if (fechadas.length === 1) return fechadas[0];
    }
    return null;
  }
  function acharHeroi(txt) {
    const w = CP.norm(txt || '');
    if (!w) return null;
    return S.herois.find(h => h.estado !== 'morto' && w.split(' ').some(x => x.length > 2 && CP.norm(h.nome).split(' ').includes(x)));
  }
  function acharInimigo(txt) {
    const w = CP.norm(txt || '').split(' ').filter(Boolean);
    const l = E().combat ? vivosCombate() : inimigos(E().zone);
    let best = null, bs = 0;
    l.forEach(en => { const s = pontua(w, [en.defId || '', en.id], en.nome); if (s > bs) { bs = s; best = en; } });
    return best;
  }
  function itemDeTexto(words) {
    const mapa = { pocao: ['pocao', 'pocoes', 'cura'], bandagens: ['bandagem', 'bandagens', 'ligaduras'], aguabenta: ['agua', 'benta'], oleo: ['oleo', 'frasco', 'fogo'], polvora: ['polvora'], pergaminho: ['pergaminho'], mao_ilva: ['mao', 'reliquia'], chave: ['chave'], corda: ['corda'], lanterna: ['lanterna'] };
    for (const k of Object.keys(mapa)) if (words.some(w => mapa[k].includes(w)) && has(k)) return k;
    for (const k of Object.keys(mapa)) if (words.some(w => mapa[k].includes(w))) return k;
    return null;
  }

  /* =========================================================== cenas (diálogos, finais, enigmas) */
  function opcoesValidas(lista) {
    const e = E();
    return (lista || []).filter(o => (!o.requer || o.requer.every(f => e.flags[f])) && (!o.requerItem || has(o.requerItem)) && (!o.requerOuro || S.ouro >= o.requerOuro) && (!o.naoFlag || !e.flags[o.naoFlag]) && !(o.unica !== false && e.flags['op_' + o.id] && !o.res));
  }
  function opcoesCena() {
    const e = E();
    if (!e || !e.scene || e.combat) return [];
    if (e.scene.tipo === 'final') {
      const bossVivo = Object.values(dg().ents).some(en => en.boss && en.kind === 'inimigo' && !en.gone && en.hp > 0);
      return opcoesValidas(e.m.final.opcoes).filter(o => !(o.id === 'atacar' && !Object.values(dg().ents).some(en => en.kind === 'npc' && en.final && !en.gone))).filter(o => bossVivo || !o.semCombate).map(o => ({ o, lista: 'final' }));
    }
    if (e.scene.tipo === 'npc') {
      const en = dg().ents[e.scene.ent];
      if (!en || en.gone) return [];
      return opcoesValidas(en.opcoes).map(o => ({ o, lista: 'npc', ent: en.id }));
    }
    if (e.scene.tipo === 'enigma') {
      const en = dg().ents[e.scene.ent];
      if (!en || en.resolvido) return [];
      return en.opcoes.map(r => ({ o: { id: r, rotulo: `Responder: «${r}»`, kw: [CP.norm(r)] }, lista: 'enigma', ent: en.id }));
    }
    return [];
  }
  function escolherOpcao(item) {
    const e = E();
    const o = item.o;
    const ent = item.ent ? dg().ents[item.ent] : null;
    if (item.lista === 'enigma') {
      if (CP.norm(o.id) === CP.norm(ent.certa)) { narr(`Dizes em voz alta: «${o.id}».`); ent.resolvido = true; e.scene = null; correrEfeitos(ent.premio, { ent }); }
      else { narr(`Dizes em voz alta: «${o.id}».`); correrEfeitos(ent.erro, { ent }); }
      return;
    }
    const h = actor();
    if (o.teste) {
      pedir({ h: 'opcao', heroi: h.id, mods: modsFor(h, o.teste), rotulo: `${o.rotulo}: teste de ${R.TESTES[o.teste].nome} de ${h.nome}. Lança 1D6.`, d: { oid: o.id, lista: item.lista, ent: item.ent } });
      return;
    }
    e.flags['op_' + o.id] = true;
    correrEfeitos(o.efeitos, { ent, h });
    if (ent && ent.kind === 'dilema' && (!o.ignorar || ent.evento)) { ent.gone = true; if (e.scene && e.scene.ent === ent.id) e.scene = null; }
    if (item.lista === 'npc' && ent && ent.gone && e.scene && e.scene.ent === ent.id) e.scene = null;
  }
  function matchOpcao(p) {
    const ops = opcoesCena();
    if (!ops.length) return null;
    if (p.num && ops[p.num - 1]) return ops[p.num - 1];
    let best = null, bs = 0;
    ops.forEach(it => {
      const s = pontua(p.words.concat(p.verb ? [p.verb] : []), it.o.kw || [], it.o.rotulo);
      if (s > bs) { bs = s; best = it; }
    });
    return bs > 0 ? best : null;
  }

  /* =========================================================== entrada principal */
  G.input = function (txt) {
    const e = E();
    if (!e) return;
    if (e.pending) { sys('Primeiro, lança o dado.'); G.save(); return; }
    const raw = String(txt || '').trim();
    if (!raw) return;
    const p = CP.Parser.parse(raw);
    if (!p.cmd) log('you', raw);
    try { despachar(p); } catch (err) { console.error(err); sys('Algo correu mal ao interpretar essa acção. Tenta de outra forma.'); }
    if (E()) passarTurno();
    depois();
  };

  function despachar(p) {
    const e = E();
    const h = actor();
    if (!h) return;

    if (p.cmd) return comando(p.cmd);

    if (['ajuda'].includes(p.verb)) return ajuda();
    if (p.verb === 'estado') { S.herois.filter(x => x.estado !== 'morto').forEach(x => sys(`${x.nome}: Vida ${x.vida}/${vmax(x)}${x.focoMax ? ', Foco ' + x.foco : ''}${x.estado === 'caido' ? ' (caído)' : ''}.`)); return; }
    if (p.verb === 'inventario') { const ks = Object.keys(S.mochila); sys(`Mochila: ${ks.length ? ks.map(k => itemDef(k).nome + (S.mochila[k] > 1 ? ' ×' + S.mochila[k] : '')).join(', ') : 'vazia'}. Ouro: ${S.ouro}.`); return; }
    if (p.verb === 'mapa') { descrever(Z(e.zone), e.via, false); return; }

    // cenas: opções por número ou palavras
    if (e.scene && !e.combat) {
      if (e.scene.tipo === 'enigma' && (p.verb === 'falar' || /responder|resposta/.test(p.raw))) {
        const en = dg().ents[e.scene.ent];
        const resp = p.words.filter(w => !/responder|resposta/.test(w)).join(' ');
        const certa = CP.norm(en.certa);
        if (resp) { escolherOpcao({ o: { id: resp.includes(certa) ? en.certa : resp }, lista: 'enigma', ent: en.id }); return; }
      }
      const m = matchOpcao(p);
      if (m && (p.num || !p.verb || ['falar', 'usar', 'abrir', 'atacar', 'apanhar', 'furtivo', 'examinar', 'forcar'].includes(p.verb))) {
        if (!(p.verb === 'examinar' && acharEnt(p))) { log('you', '→ ' + m.o.rotulo); escolherOpcao(m); return; }
      }
    }

    if (e.combat) {
      if (p.verb === 'defender') return defender(h);
      if (p.verb === 'manobra') { const en = acharInimigo(p.words.join(' ')) || vivosCombate()[0]; return manobra(en, h); }
      if (p.verb === 'arriscado') { const en = acharInimigo(p.words.join(' ')) || vivosCombate()[0]; return atacar(en, h, true); }
      const ok = ['atacar', 'fugir', 'usar', 'magia', 'examinar', 'voltar', 'socorrer'];
      if (!ok.includes(p.verb)) { narr('Estás em combate! Ataca, foge, usa um objecto ou lança um feitiço.'); return; }
    }

    switch (p.verb) {
      case 'examinar': {
        const en = acharEnt(p);
        if (en) return examinarEnt(en);
        const c = acharPorta(p);
        if (c) { narr(`${CP.cap(nomePorta(c, e.zone))}: ${portaTxt(c)}. ${c.tipo === 'emperrada' && !c.aberta ? 'A madeira está inchada; vai ser preciso força.' : ''}${c.tipo === 'trancada' && !c.aberta ? 'Tem uma fechadura de ferro.' : ''}`); return; }
        if (p.words.some(w => /^armadilh/.test(w))) return procurarArmadilhas();
        return descrever(Z(e.zone), e.via, false);
      }
      case 'procurar': {
        const en = acharEnt(p, x => x.kind === 'feat' && x.acao && x.acao.verbos.some(v => ['revistar', 'procurar', 'vasculhar'].includes(v)));
        if (en && p.words.length) return acaoFeat(en);
        return procurar();
      }
      case 'armadilhas': return procurarArmadilhas();
      case 'desarmar': {
        const t = traps(e.zone).find(t => t.achada);
        if (!t) { narr('Não conheces nenhuma armadilha aqui para desarmar.'); return; }
        pedir({ h: 'desarmar', heroi: h.id, mods: modsFor(h, 'desarmar'), rotulo: `Teste de Desarmar de ${h.nome}. Lança 1D6.`, d: { t: t.id } });
        return;
      }
      case 'ouvir': {
        let c = acharPorta(p);
        if (!c) { const fechadas = portas(e.zone).filter(c => !aberta(c) && !Z(outra(c, e.zone)).vis); c = fechadas.length === 1 ? fechadas[0] : null; }
        if (!c) { const ps = portas(e.zone).filter(x => !Z(outra(x, e.zone)).vis); c = ps.length === 1 ? ps[0] : null; }
        if (!c) { narr('Ouvir onde? Diz qual a porta (por exemplo, «ouvir porta norte»).'); return; }
        return ouvirPorta(c);
      }
      case 'abrir':
      case 'forcar':
      case 'destrancar': {
        const en = acharEnt(p, x => (x.kind === 'feat' && x.acao) || x.kind === 'enigma');
        if (en && (!p.words.some(w => /^porta/.test(w)) || en.kind === 'enigma')) { if (en.kind === 'enigma') return examinarEnt(en); return acaoFeat(en); }
        const c = acharPorta(p) || (e.portaAlvo != null && portas(e.zone).some(x => x.id === e.portaAlvo) ? dg().conns[e.portaAlvo] : null);
        if (!c) { narr('Abrir o quê? Diz qual a porta ou o objecto.'); return; }
        if (aberta(c)) { narr('Já está aberta.'); return; }
        if (c.tipo === 'trancada' && !has('chave') && (p.verb === 'forcar' || p.verb === 'destrancar')) {
          if (!furtivoOk({ a: 'porta', c: c.id })) return;
          const z = Z(e.zone); if (z.kind === 'corredor') { if (!andarCorredor(celula(c, e.zone), { a: 'porta', c: c.id })) return; } else e.pos = celula(c, e.zone);
          if (p.verb === 'destrancar' || /fechadura|gazua/.test(p.raw)) {
            pedir({ h: 'arrombar', heroi: h.id, mods: modsFor(h, 'arrombar'), rotulo: `Teste de Arrombar de ${h.nome}. Lança 1D6.`, d: { c: c.id }, cont: { a: 'porta', c: c.id } });
          } else {
            pedir({ h: 'forcarPorta', heroi: h.id, mods: modsFor(h, 'forcar', [['Fechadura', -1]]), rotulo: `Teste de Força de ${h.nome} para arrombar a porta. Lança 1D6.`, d: { c: c.id }, cont: { a: 'porta', c: c.id } });
          }
          return;
        }
        // abrir e passar
        return atravessar(c);
      }
      case 'ir': return irPara(p);
      case 'voltar': {
        if (e.combat) return fugir(h);
        if (/saida|aldeia|superficie/.test(p.raw)) return sairMasmorra();
        if (/escada|entrada/.test(p.raw)) { if (e.zone === 0) { e.pos = dg().stairs.slice(); narr(`Recuas até às escadas, em ${posTxt()}. Para sair da masmorra, diz «sair».`); return; } return viajar(0, dg().stairs); }
        const c = e.via != null ? dg().conns[e.via] : null;
        if (!c) { narr('Estás no fundo das escadas. Para sair da masmorra, diz «sair».'); return; }
        return atravessar(c);
      }
      case 'atacar': {
        let en = acharInimigo(p.words.join(' ')) || (p.coord && acharEnt(p, x => x.kind === 'inimigo'));
        const npc = acharEnt(p, x => x.kind === 'npc');
        if (!en && npc && npc.final && e.scene) { const at = opcoesCena().find(it => it.o.id === 'atacar'); if (at) { escolherOpcao(at); return; } }
        if (!en) en = e.combat ? vivosCombate()[0] : inimigos(e.zone)[0];
        if (!en) {
          if (npc) { const at = opcoesCena().find(it => it.o.id === 'atacar'); if (at) { escolherOpcao(at); return; } narr(`Atacar ${art(npc)} não te levaria a lado nenhum.`); return; }
          narr('Não há nada aqui para atacar.'); return;
        }
        return atacar(en, h);
      }
      case 'fugir': if (!e.combat) { narr('Não há de que fugir. Para voltar atrás, diz «voltar».'); return; } return fugir(h);
      case 'furtivo': {
        if (!precisaFurtivo()) { narr('Não há aqui ninguém a quem tenhas de passar despercebido.'); return; }
        pedir({ h: 'furtivo', heroi: h.id, mods: modsFor(h, 'furtivo'), rotulo: `Teste de Furtividade de ${h.nome}. Lança 1D6.`, cont: null });
        return;
      }
      case 'falar': {
        const en = acharEnt(p, x => x.kind === 'npc') || ents(e.zone).find(x => x.kind === 'npc');
        return falarCom(en);
      }
      case 'usar': return usar(p);
      case 'apanhar': {
        const en = acharEnt(p, x => x.kind === 'item' || (x.kind === 'feat' && x.acao && !x.usada));
        if (!en) { const it = ents(e.zone).filter(x => x.kind === 'item'); if (it.length === 1 && !p.words.length) return apanharEnt(it[0]); narr('Não vês isso por aqui.'); return; }
        return apanharEnt(en);
      }
      case 'descansar': return descansar();
      case 'socorrer': { const al = acharHeroi(p.words.join(' ')) || S.herois.find(x => x.estado === 'caido'); return socorrer(al); }
      case 'magia': return magia(p.words[0] || '', p.words.slice(1).join(' '));
      case 'instinto': return instinto();
      case 'sair': return sairMasmorra();
    }

    // sem verbo: tentar alvo directo
    const en = acharEnt(p);
    if (en) {
      if (en.kind === 'feat' && en.acao && pontua(p.words, en.acao.verbos, '') > 0) return acaoFeat(en);
      return examinarEnt(en);
    }
    // acção de objecto por verbo desconhecido (ex.: «rezar», «beber da fonte»)
    const f = ents(e.zone).find(x => x.kind === 'feat' && x.acao && !x.usada && x.acao.verbos.some(v => p.raw.split(' ').includes(v)));
    if (f) return acaoFeat(f);
    narr('Não percebi essa acção.');
    sys('Experimenta, por exemplo: «examinar vela», «abrir porta norte», «ir para C4», «procurar armadilhas», «ouvir», «atacar esqueleto». Escreve «ajuda» para ver tudo.');
  }

  function irPara(p) {
    const e = E();
    const z = Z(e.zone);
    if (p.coord) {
      const { x, y } = p.coord;
      if (x < 0 || y < 0 || x >= dg().W || y >= dg().H) { narr('Essa coordenada está fora da folha.'); return; }
      const alvo = zAt(x, y);
      if (alvo && alvo.id === e.zone) {
        if (z.kind === 'corredor') { andarCorredor([x, y], null); sys(`Estás em ${posTxt()}.`); return; }
        e.pos = [x, y]; narr(`Vais até ${C.n(x, y)}.`); return;
      }
      if (alvo && alvo.vis) {
        if (inimigos(e.zone).some(en => en.estado === 'alerta')) { narr('Há inimigos a barrar-te o caminho.'); return; }
        return viajar(alvo.id, [x, y]);
      }
      const c = portas(e.zone).find(c => { const o = Z(outra(c, e.zone)); return alvo && o.id === alvo.id; });
      if (c) return atravessar(c);
      narr(`Ainda não sabes o que há em ${C.n(x, y)}.`);
      return;
    }
    if (/escada|saida|entrada/.test(p.raw)) { if (e.zone === 0) { e.pos = dg().stairs.slice(); narr(`Vais até às escadas, em ${posTxt()}. Para sair da masmorra, diz «sair».`); return; } return viajar(0, dg().stairs); }
    const c = acharPorta(p);
    if (c) return atravessar(c);
    if (z.kind === 'corredor') {
      const ends = z.ends.map(i => dg().conns[i]);
      const frente = ends.find(k => k.id !== e.via) || ends[0];
      if (p.dir) { const k = ends.find(k => ladoDe(k, z.id) === p.dir); if (k) return atravessar(k); }
      return atravessar(frente);
    }
    // nome de uma sala já visitada
    const sala = dg().zones.find(s => s.vis && s.kind === 'sala' && pontua(p.words, [], s.nome) > 0);
    if (sala) return viajar(sala.id, null);
    const en = acharEnt(p);
    if (en) { moverPara(en); if (en.kind !== 'inimigo') sys(`Estás junto a ${en.nome}.`); return; }
    if (p.dir) { narr(`Não há saída para ${C.NOME[p.dir]} aqui.`); return; }
    narr('Ir para onde? Indica uma coordenada (ex.: «ir para C4»), uma direcção ou uma porta.');
  }

  function usar(p) {
    const id = itemDeTexto(p.words);
    if (!id) {
      const f = acharEnt(p, x => x.kind === 'feat' && x.acao);
      if (f) return acaoFeat(f);
      narr('Usar o quê?'); return;
    }
    return usarItem(id, acharHeroi(p.words.join(' ')), p.words.join(' '));
  }
  function usarItem(id, alvoH, txt) {
    const e = E();
    const h = actor();
    if (!has(id)) { narr(`Não tens ${itemDef(id).nome.toLowerCase()}.`); return; }
    const d = itemDef(id);
    alvoH = alvoH || h;
    switch (d.uso) {
      case 'cura':
        delItem(id);
        narr(`${h.nome} ${alvoH === h ? 'bebe' : 'dá a ' + alvoH.nome} uma poção.`);
        curar(alvoH, 3);
        if (e.combat) acaoEmCombate(h, 'a poção faz efeito');
        return;
      case 'cura_fora':
        if (e.combat) { narr('Não há tempo para ligaduras a meio de um combate.'); return; }
        delItem(id); narr(`${h.nome} trata as feridas de ${alvoH === h ? 'si próprio' : alvoH.nome}.`); curar(alvoH, 2); return;
      case 'santa':
      case 'fogo':
      case 'polvora': {
        if (!e.combat) {
          if (d.uso === 'polvora') {
            const c = portas(e.zone).find(c => !aberta(c) && c.tipo !== 'aberta');
            if (c) { delItem(id); c.aberta = true; narr('Acendes o rastilho e afastas-te. BUM! A porta desfaz-se em lascas.'); tick(3); return; }
          }
          narr('Guarda isso para um combate.'); return;
        }
        const en = acharInimigo(txt) || vivosCombate()[0];
        if (!en) return;
        delItem(id);
        let dano = d.uso === 'santa' ? (en.tipo === 'morto' ? 2 : 0) : d.uso === 'fogo' ? (en.tipo === 'fera' ? 3 : 2) : 3;
        if (d.uso === 'polvora') tick(2);
        narr(d.uso === 'santa' ? `${h.nome} atira água benta contra ${art(en)}.` : d.uso === 'fogo' ? `${h.nome} atira o frasco de óleo a arder contra ${art(en)}.` : `${h.nome} atira o saco de pólvora aceso. BUM!`);
        if (!dano) narr('Não faz efeito nenhum. Não é um morto-vivo.');
        else danoEm(en, dano, h);
        if (E().combat) fimRonda();
        fimCombateSePreciso();
        if (E() && E().combat) proximoTurno();
        return;
      }
      case 'revelar': delItem(id); narr('Lês o pergaminho em voz alta. As letras ardem e desaparecem.'); revelarZona(); return;
      case 'reliquia':
        if (h.usos.reliquia || e.usosReliquia) { narr('A Mão de Santa Ilva já fez o seu milagre nesta expedição.'); return; }
        e.usosReliquia = true;
        narr('Ergues a Mão de Santa Ilva. Um cheiro a rosas enche o ar.');
        S.herois.filter(x => x.estado !== 'morto').forEach(x => curar(x, 2));
        return;
      case 'chave': {
        const c = portas(e.zone).find(c => c.tipo === 'trancada' && !c.aberta);
        if (c) return atravessar(c);
        narr('Não há aqui nenhuma fechadura para esta chave.'); return;
      }
      default: narr(`${d.nome}: ${d.desc} (funciona automaticamente).`);
    }
  }

  function comando(cmd) {
    const e = E();
    const [c, a, b] = cmd;
    const h = actor();
    const d = dg();
    switch (c) {
      case 'porta': log('you', 'Ir: ' + nomePorta(d.conns[+a], e.zone)); return atravessar(d.conns[+a]);
      case 'ouvir': log('you', 'Ouvir à ' + nomePorta(d.conns[+a], e.zone)); return ouvirPorta(d.conns[+a]);
      case 'forcar': case 'arrombar': {
        const k = d.conns[+a];
        log('you', (c === 'forcar' ? 'Forçar a ' : 'Arrombar a fechadura da ') + nomePorta(k, e.zone));
        if (!furtivoOk({ a: 'porta', c: k.id })) return;
        if (Z(e.zone).kind === 'corredor') { if (!andarCorredor(celula(k, e.zone), { a: 'porta', c: k.id })) return; } else e.pos = celula(k, e.zone);
        if (c === 'forcar') pedir({ h: 'forcarPorta', heroi: h.id, mods: modsFor(h, 'forcar', k.tipo === 'trancada' ? [['Fechadura', -1]] : []), rotulo: `Teste de Força de ${h.nome}. Lança 1D6.`, d: { c: k.id }, cont: { a: 'porta', c: k.id } });
        else pedir({ h: 'arrombar', heroi: h.id, mods: modsFor(h, 'arrombar'), rotulo: `Teste de Arrombar de ${h.nome}. Lança 1D6.`, d: { c: k.id }, cont: { a: 'porta', c: k.id } });
        return;
      }
      case 'exam': { const en = d.ents[a]; log('you', 'Examinar ' + (en.kind === 'inimigo' ? art(en) : en.nome)); return examinarEnt(en); }
      case 'acao': { const en = d.ents[a]; log('you', en.acao.rotulo); return acaoFeat(en); }
      case 'apanhar': { const en = d.ents[a]; log('you', 'Apanhar ' + en.nome); return apanharEnt(en); }
      case 'falar': { const en = d.ents[a]; log('you', 'Falar com ' + art(en)); return falarCom(en); }
      case 'atacar': { const en = d.ents[a]; log('you', 'Atacar ' + art(en)); if (!e.combat && en.boss) e.combateFinal = true; return atacar(en, h); }
      case 'op': { const ops = opcoesCena(); const it = ops[+a]; if (it) { log('you', '→ ' + it.o.rotulo); escolherOpcao(it); } return; }
      case 'fugir': log('you', 'Fugir'); return fugir(h);
      case 'arriscado': { const en = d.ents[a]; log('you', 'Golpe arriscado contra ' + art(en)); return atacar(en, h, true); }
      case 'defender': log('you', 'Defender'); return defender(h);
      case 'manobra': { const en = d.ents[a]; log('you', 'Manobra contra ' + art(en)); return manobra(en, h); }
      case 'furtivo': log('you', 'Esgueirar-me'); return despachar({ verb: 'furtivo', words: [], raw: 'furtivo' });
      case 'procurar': log('you', 'Procurar passagens e objectos ocultos'); return procurar();
      case 'armadilhas': log('you', 'Procurar armadilhas'); return procurarArmadilhas();
      case 'descansar': log('you', 'Descansar'); return descansar();
      case 'instinto': log('you', 'Usar o Instinto'); return instinto();
      case 'socorrer': { const al = H(a); log('you', 'Socorrer ' + (al ? al.nome : '')); return socorrer(al); }
      case 'sair': log('you', e.completo ? 'Regressar à aldeia' : 'Abandonar a masmorra'); return sairMasmorra();
      case 'seguir': { const z = Z(e.zone); const k = z.ends.map(i => d.conns[i]).find(k => k.id !== e.via) || d.conns[z.ends[1]]; log('you', 'Seguir pelo corredor'); return atravessar(k); }
      case 'voltar': { const k = d.conns[e.via]; log('you', 'Voltar para trás'); return atravessar(k); }
      case 'usar': { log('you', 'Usar ' + itemDef(a).nome + (b && H(b) ? ' em ' + H(b).nome : '')); return usarItem(a, b ? H(b) : null, ''); }
      case 'magia': { log('you', 'Lançar ' + a); return magia(a, b ? (H(b) ? H(b).nome : (d.ents[b] ? d.ents[b].nome : '')) : ''); }
      case 'olhar': log('you', 'Olhar à volta'); return descrever(Z(e.zone), e.via, false);
      case 'ajuda': return ajuda();
    }
  }

  function ajuda() {
    sys('Acções que o Mestre compreende:\n' +
      '• examinar/ler/ver [objecto] · olhar (descreve a zona)\n' +
      '• ir para C4 · ir norte · ir pela porta este · seguir (corredor) · voltar\n' +
      '• abrir/forçar/arrombar [porta] · ouvir [porta]\n' +
      '• procurar (passagens secretas) · procurar armadilhas · desarmar\n' +
      '• apanhar/levar [objecto] · usar/beber [objecto] [em herói]\n' +
      '• atacar [inimigo] · fugir · esgueirar-me\n' +
      '• falar [com alguém] · responder [palavra] (enigmas)\n' +
      '• lançar curar/selo/revelar (Místico) · instinto (Explorador)\n' +
      '• descansar · sair · estado · mochila · mapa\n' +
      'Mover-te dentro de zonas já desenhadas nunca exige lançamentos.');
  }

  /* =========================================================== sugestões de acções */
  G.sugestoes = function () {
    const e = E();
    if (!e || e.pending) return [];
    const L = [];
    const d = dg();
    const h = actor();
    if (!h) return [];
    if (e.combat) {
      const vc = vivosCombate();
      vc.forEach(en => L.push({ l: `Atacar ${en.nome}${en.atordoado ? ' (+2)' : ''}`, c: `#atacar ${en.id}`, t: 'combate' }));
      const alvo = vc.find(x => x.atordoado) || vc.slice().sort((a, b) => a.hp - b.hp)[0];
      if (alvo) L.push({ l: `Golpe arriscado (+1 dano)`, c: `#arriscado ${alvo.id}`, t: 'combate' });
      if (vc.some(x => intDe(x).ataca)) L.push({ l: vc.some(x => intDe(x).dano > 0) ? '🛡 Defender (vem aí um golpe forte!)' : '🛡 Defender', c: '#defender', t: 'cena' });
      const mv = vc.find(x => !x.atordoado && intDe(x).dano > 0) || vc.find(x => !x.atordoado);
      if (mv) L.push({ l: `Derrubar ${mv.nome}`, c: `#manobra ${mv.id}`, t: 'cena' });
      const m = aptos().find(x => x.focoMax > 0 && x.foco > 0);
      if (m && (h === m || aptos().length === 1)) {
        L.push({ l: 'Selo (1 Foco)', c: '#magia selo', t: 'magia' });
        L.push({ l: 'Curar (1 Foco)', c: '#magia curar', t: 'magia' });
      }
      if (has('pocao')) L.push({ l: 'Beber poção', c: '#usar pocao', t: 'item' });
      if (has('aguabenta') && vivosCombate().some(en => en.tipo === 'morto')) L.push({ l: 'Água benta', c: '#usar aguabenta', t: 'item' });
      if (has('oleo')) L.push({ l: 'Óleo a arder', c: '#usar oleo', t: 'item' });
      if (has('polvora')) L.push({ l: 'Pólvora', c: '#usar polvora', t: 'item' });
      const caidos = S.herois.filter(x => x.estado === 'caido');
      if (caidos.length && has('pocao')) caidos.forEach(x => L.push({ l: `Poção a ${x.nome}`, c: `#usar pocao ${x.id}`, t: 'item' }));
      caidos.filter(x => x.morrer > 0 && x.id !== h.id).forEach(x => L.push({ l: `Socorrer ${x.nome} (${x.morrer})`, c: `#socorrer ${x.id}`, t: 'cena' }));
      L.push({ l: 'Fugir', c: '#fugir', t: 'fuga' });
      return L;
    }
    opcoesCena().forEach((it, i) => L.push({ l: it.o.rotulo, c: `#op ${i}`, t: 'cena' }));
    if (e.completo) L.push({ l: e.zone === 0 ? 'Subir e terminar a aventura' : 'Regressar à saída', c: '#sair', t: 'cena' });
    const z = Z(e.zone);
    ents(e.zone).forEach(en => {
      if (en.kind === 'pista' && !e.flags[en.pid]) L.push({ l: `Examinar ${en.nome}`, c: `#exam ${en.id}` });
      else if (en.kind === 'feat') {
        if (!en.vista) L.push({ l: `Examinar ${en.nome}`, c: `#exam ${en.id}` });
        if (en.acao && !en.usada) L.push({ l: en.acao.rotulo, c: `#acao ${en.id}` });
      } else if (en.kind === 'enigma' && !en.resolvido && !(e.scene && e.scene.ent === en.id)) L.push({ l: `Examinar ${en.nome}`, c: `#exam ${en.id}` });
      else if (en.kind === 'item') L.push({ l: `Apanhar ${en.nome}`, c: `#apanhar ${en.id}` });
      else if (en.kind === 'dilema' && !(e.scene && e.scene.ent === en.id)) L.push({ l: `Voltar a: ${en.nome}`, c: `#falar ${en.id}` });
      else if (en.kind === 'npc' && !en.final && !(e.scene && e.scene.ent === en.id)) L.push({ l: `Falar com ${art(en)}`, c: `#falar ${en.id}` });
      else if (en.kind === 'npc' && en.final && !(e.scene && e.scene.tipo === 'final')) L.push({ l: `Falar com ${art(en)}`, c: `#falar ${en.id}` });
      else if (en.kind === 'inimigo' && en.hp > 0) {
        L.push({ l: (en.estado === 'dormente' || en.estado === 'passivo') ? `Atacar ${en.nome} de surpresa` : `Atacar ${en.nome}`, c: `#atacar ${en.id}`, t: 'combate' });
      }
    });
    if (precisaFurtivo()) L.push({ l: 'Esgueirar-me', c: '#furtivo' });
    if (z.kind === 'corredor') {
      const ends = z.ends.map(i => d.conns[i]);
      const frente = ends.find(k => k.id !== e.via);
      if (frente) {
        const o = Z(outra(frente, e.zone));
        const bloqueada = frente.tipo === 'trancada' && !aberta(frente) && e.portaAlvo === frente.id && !has('chave');
        if (!bloqueada) L.push({ l: o.vis ? `Seguir até ${o.nome}` : (frente.tentada && !aberta(frente) ? 'Forçar a porta ao fundo' : 'Seguir pelo corredor'), c: '#seguir', t: 'mov' });
        if (!o.vis) L.push({ l: 'Ouvir ao fundo', c: `#ouvir ${frente.id}` });
        if (!aberta(frente) && frente.tipo === 'trancada') { L.push({ l: 'Forçar a porta', c: `#forcar ${frente.id}` }); L.push({ l: 'Arrombar a fechadura', c: `#arrombar ${frente.id}` }); }
      }
      if (e.via != null) L.push({ l: 'Voltar para trás', c: '#voltar', t: 'mov' });
    } else {
      portas(e.zone).forEach(c => {
        const o = Z(outra(c, e.zone));
        const nm = nomePorta(c, e.zone);
        if (c.id === e.via && o.vis) L.push({ l: `Voltar (${nm})`, c: `#porta ${c.id}`, t: 'mov' });
        else if (!(c.tipo === 'trancada' && !aberta(c) && e.portaAlvo === c.id && !has('chave'))) L.push({ l: (c.tentada && !aberta(c)) ? `Forçar: ${nm}` : `Ir: ${nm}`, c: `#porta ${c.id}`, t: 'mov' });
        if (!o.vis && !aberta(c)) L.push({ l: `Ouvir à ${nm}`, c: `#ouvir ${c.id}` });
        if (e.portaAlvo === c.id && !aberta(c)) { L.push({ l: 'Forçar a porta', c: `#forcar ${c.id}` }); L.push({ l: 'Arrombar a fechadura', c: `#arrombar ${c.id}` }); }
      });
    }
    if (!escuro() || elfoNoGrupo()) {
      L.push({ l: 'Procurar armadilhas', c: '#armadilhas', t: 'util' });
      if (z.kind === 'sala') L.push({ l: 'Procurar passagens', c: '#procurar', t: 'util' });
    }
    if (aptos().some(x => x.cls === 'explorador' && !x.usos.instinto)) L.push({ l: 'Instinto', c: '#instinto', t: 'util' });
    const m = aptos().find(x => x.focoMax > 0 && x.foco > 0);
    if (m && S.herois.some(x => x.estado !== 'morto' && x.vida < vmax(x))) L.push({ l: 'Curar (1 Foco)', c: '#magia curar', t: 'magia' });
    if (m && !escuro()) L.push({ l: 'Revelar (1 Foco)', c: '#magia revelar', t: 'magia' });
    S.herois.filter(x => x.estado === 'caido' && x.morrer > 0 && x.id !== h.id).forEach(x => L.unshift({ l: `Socorrer ${x.nome} (${x.morrer})`, c: `#socorrer ${x.id}`, t: 'cena' }));
    if (escuro() && m) L.unshift({ l: 'Luz mágica (1 Foco)', c: '#magia luz', t: 'magia' });
    S.herois.filter(x => x.estado === 'caido').forEach(x => { if (has('pocao')) L.push({ l: `Poção a ${x.nome}`, c: `#usar pocao ${x.id}`, t: 'item' }); if (has('bandagens')) L.push({ l: `Bandagens a ${x.nome}`, c: `#usar bandagens ${x.id}`, t: 'item' }); });
    if (e.rests < 2 && !inimigos(e.zone).length && S.herois.some(x => x.estado !== 'morto' && x.vida < vmax(x))) L.push({ l: 'Descansar', c: '#descansar', t: 'util' });
    if (e.zone === 0 && !e.completo) L.push({ l: 'Abandonar a masmorra', c: '#sair', t: 'perigo' });
    else if (!e.completo) L.push({ l: 'Retirar para a saída', c: '#sair', t: 'perigo' });
    return L;
  };

  G.combateInfo = function () {
    const e = E();
    if (!e || !e.combat) return null;
    return vivosCombate().map(en => { const it = intDe(en); return { id: en.id, nome: en.nome, chave: en.defId || en.nome, tipo: en.tipo, hp: en.hp, hpMax: en.hpMax || en.hp, boss: !!en.boss, int: en.int, intTxt: it.txt + (it.ataca ? ` (${en.dano + it.dano})` : ''), intIc: it.ic, perigo: it.dano > 0 }; });
  };
  G.ultimoRes = () => (E() ? E().ultimoRes : null);

  G.estadoTeste = function () {
    const e = E();
    if (!e || !e.pending) return null;
    const p = e.pending;
    const h = H(p.heroi);
    return {
      morte: p.tipo === 'morte', percalco: p.h === 'percalco', tabela: p.h === 'achado' ? D.achados.map((a, i) => ({ t: a.t.split(/[.!:]/)[0], usado: (e.achados || []).includes(i) })) : null, rotulo: p.rotulo, mods: p.mods || [], mod: R.clamp(p.mod + (p.ajuda ? 1 : 0) + (p.sorte ? 2 : 0) + (p.impeto ? 1 : 0)),
      heroi: h ? h.nome : '', ajuda: p.ajuda, sorte: !!p.sorte, impeto: !!p.impeto, podeImpeto: p.tipo !== 'morte' && p.h !== 'percalco' && p.h !== 'achado' && (S.impeto >= 2 || !!p.impeto), podeSorte: !!(h && h.origem === 'halfling' && !h.usos.sorte && p.tipo !== 'morte' && p.h !== 'achado'),
      ajudantes: p.tipo === 'morte' || p.h === 'achado' ? [] : aptos().filter(x => x.id !== p.heroi).map(x => ({ id: x.id, nome: x.nome }))
    };
  };
  G.pistasEncontradas = function () {
    const e = E(); if (!e) return [];
    return e.m.pistas.map(p => ({ nome: p.nome, achada: !!e.flags[p.id], texto: e.flags[p.id] ? p.exame : null }));
  };

  /* =========================================================== fim da expedição */
  function terminarExpedicao(fim) {
    const e = E();
    if (!e) return;
    const m = e.m;
    const res = { fim, titulo: m.titulo, local: m.local, desfecho: null };
    // o ouro encontrado só fica seguro quando sais pelo teu pé
    const ganho = e.ganhoOuro || 0;
    if (fim === 'derrota' && ganho) { const perde = Math.ceil(ganho / 2); S.ouro = Math.max(0, S.ouro - perde); res.perdido = perde; }
    if (fim === 'morte' && ganho) { S.ouro = Math.max(0, S.ouro - ganho); res.perdido = ganho; }
    // relatório
    const salas = dg().zones.filter(z => z.kind === 'sala');
    const vistas = salas.filter(z => z.vis).length;
    const pistas = m.pistas.filter(p => e.flags[p.id]).length;
    let falta = null;
    if (!e.completo) {
      const dist = {}; const fila = [];
      dg().zones.forEach(z => { if (z.vis) { dist[z.id] = 0; fila.push(z.id); } });
      while (fila.length) { const z = fila.shift(); dg().conns.forEach(c => { if (c.room !== z && c.corr !== z) return; const o = outra(c, z); if (dist[o] == null) { dist[o] = dist[z] + (dg().zones[o].kind === 'sala' ? 1 : 0); fila.push(o); } }); }
      falta = dist[dg().obj] != null ? dist[dg().obj] : null;
    }
    const vivos = (e.sobrev || []).filter(x => !x.morto).length;
    const aPe = fim === 'sucesso' || fim === 'retirada';
    const salvos = aPe ? vivos : 0;
    if (salvos) { S.ouro += 5 * salvos; sys(`As famílias dos sobreviventes agradecem: +${5 * salvos} moedas.`); }
    const ok = { todas_salas: vistas === salas.length, todas_pistas: pistas === m.pistas.length && m.pistas.length > 0, resgate: salvos > 0, ninguem_caiu: !(e.caidos || []).length, cinco: (e.mortes || 0) >= 5, buscas: (e.buscas || 0) >= 3 };
    res.facanhas = D.facanhas.map(f => ({ nome: f.nome, xp: f.xp, ok: !!ok[f.id] }));
    const xpF = fim === 'morte' ? 0 : res.facanhas.filter(f => f.ok).reduce((a, f) => a + f.xp, 0);
    if (xpF) { S.herois.filter(h => h.estado !== 'morto').forEach(h => { h.xp += xpF; }); log('good', `Façanhas: +${xpF} de experiência para cada herói.`); }
    res.xpFacanhas = xpF;
    // sobrevivência: quem caiu lança o dado na aldeia
    if (fim !== 'morte') {
      (e.caidos || []).forEach(id => { const h = H(id); if (h && h.estado !== 'morto') S.sobrev.push({ tipo: 'heroi', id }); });
      (e.compCaidos || []).forEach(id => { if (S.comps.find(c => c.id === id)) S.sobrev.push({ tipo: 'comp', id }); });
    } else {
      (e.comps || []).forEach(id => { const c = S.comps.find(x => x.id === id); if (c) c.estado = 'morto'; });
    }
    S.comps.forEach(c => { if (e.comps && e.comps.includes(c.id) && c.estado === 'ok') c.missoes++; });
    S.comps = S.comps.filter(c => c.estado !== 'morto');
    res.relatorio = { salas: vistas, salasTot: salas.length, pistas, pistasTot: m.pistas.length, mortes: e.mortes || 0, ouro: ganho, perdido: res.perdido || 0, falta, dano: e.danoSofrido || 0, bencaos: (e.bencaos || []).slice(), salvos, buscas: e.buscas || 0 };
    if (e.diario) {
      const pontos = ganho + pistas * 10 + (e.mortes || 0) * 5 + (e.completo && fim === 'sucesso' ? 50 : 0) + vistas * 3;
      S.diarios[m.id] = { estado: 'feito', pontos, fim };
      res.pontos = pontos;
      stat('diarios');
    }
    S.locais[m.local] = true;
    if (fim === 'sucesso' && e.completo) {
      const dz = m.desfechos[e.completo] || Object.values(m.desfechos)[0];
      res.desfecho = dz;
      if (m.rumor) S.rumoresFeitos[m.id] = true;
      else S.missoes[m.id].estado = 'feita';
      if (S.missoes[m.id]) S.missoes[m.id].resultado = e.completo;
      S.ouro += dz.ouro || 0;
      let xp = dz.xp || 0;
      (dz.flags || []).forEach(f => { S.flags[f] = true; });
      if (dz.extra && e.flags[dz.extra.flag]) { S.ouro += dz.extra.ouro || 0; if (dz.extra.item) addItem(dz.extra.item); res.extra = dz.extra.texto; }
      (dz.desbloqueia || []).forEach(id => { if (!S.missoes[id]) { S.missoes[id] = { estado: 'disponivel', vezes: 0 }; S.diario.push({ dia: S.dia, t: `Nova missão: ${D.missoes[id].titulo}.` }); } });
      S.herois.filter(h => h.estado !== 'morto').forEach(h => { h.xp += xp; });
      stat('missoes');
      if (!S.finais[m.id + ':' + e.completo]) { S.finais[m.id + ':' + e.completo] = true; stat('finais'); }
      if (!(e.danoSofrido > 0)) stat('intocavel');
      if (!m.rumor) S.reliquiaPendente = (S.reliquiaPendente || 0) + 1;
      const J = S.juramento;
      if (J && !J.feito) {
        const ganho = m.id === 'ossario' ? 4 : m.rumor ? 1 : 2;
        J.marcas = Math.min(10, J.marcas + ganho);
        res.juramento = ganho;
        if (J.marcas >= 10) { J.feito = true; res.juramentoFeito = true; xp += 3; }
      }
      res.xp = xp; res.ouro = (dz.ouro || 0) + (res.extra ? (dz.extra.ouro || 0) : 0);
      S.diario.push({ dia: S.dia, t: `${m.titulo}: ${dz.titulo}. ${dz.texto}` });
    } else {
      res.xp = 0;
      S.diario.push({ dia: S.dia, t: `${m.titulo}: ${fim === 'morte' ? 'ninguém regressou.' : fim === 'derrota' ? 'derrota.' : 'retirada sem cumprir a missão.'}` });
    }
    // experiência pelos tesouros trazidos para a luz do dia
    if (fim !== 'morte') {
      const xpT = Math.floor((e.ganhoOuro || 0) / 10) + (e.tesouros || 0);
      res.xpTesouro = xpT;
      S.herois.filter(h => h.estado !== 'morto').forEach(h => { h.xp += xpT + (fim === 'sucesso' && e.completo && h.origem === 'humano' ? 1 : 0); });
    }
    // objectos temporários (chaves, provas) desaparecem
    Object.keys(S.mochila).forEach(k => { if (D.itens[k] && D.itens[k].temporario) delete S.mochila[k]; });
    S.herois.forEach(h => { if (h.estado === 'caido') { h.estado = 'ok'; h.vida = 1; } h.foco = h.focoMax; });
    S.dia++;
    S.ultimo = res;
    S.exp = null;
    // regista na aldeia
    log('title', res.desfecho ? res.desfecho.titulo : (fim === 'retirada' ? 'De mãos vazias' : fim === 'morte' ? 'Silêncio' : 'Derrota'));
    if (res.desfecho) {
      log('narr', res.desfecho.texto);
      if (res.extra) log('narr', res.extra);
      log('good', `+${res.ouro} moedas · +${res.xp} de experiência pela missão.`);
    } else if (fim === 'retirada') log('narr', 'Regressas a Corvamonte. A missão continua no quadro, à espera de alguém mais corajoso — ou mais bem preparado.');
    else if (fim === 'derrota') log('narr', 'Voltas a Corvamonte a coxear. A missão continua por cumprir. Os feridos recuperam com tempo e descanso.');
    if (fim !== 'morte') stat('ouro', ganho - (res.perdido || 0));
    if (res.juramento) log('sys', `O juramento da companhia avança (${S.juramento.marcas}/10).`);
    if (res.juramentoFeito) log('good', 'Juramento cumprido! O vale está livre da sombra. +3 de experiência para todos.');
    if (res.xpTesouro) log('good', `Tesouros trazidos para a luz do dia: +${res.xpTesouro} de experiência.`);
    G.limparMortos();
    G.save();
  }

  /* =========================================================== aldeia */
  G.descricaoAldeia = function () {
    const f = S.flags;
    const L = [D.regiao.descricao];
    if (f.valdrem_selado || f.senhor_destruido) L.push('Os sinos debaixo da terra calaram-se e as galinhas dormem descansadas.');
    if (f.osric_aliado) L.push('O velho Osric varre o adro da igreja e cumprimenta-te sempre com uma vénia.');
    if (f.templo_hostil) L.push('O padre Gaspar fecha a porta do templo quando passas.');
    if (f.tome_salvo) L.push('Da forja ouvem-se dois martelos: o de Anselmo e o do filho.');
    if (f.pacto_goblin) L.push('Às vezes, ao fim da tarde, um goblin desce à aldeia com um saco de moedas e volta com ferro.');
    if (f.mina_segura) L.push('Carroças de bronze descem da mina, agora silenciosa.');
    if (f.lago_limpo) L.push('Os pastores de Ilva-Baixa voltaram a levar as ovelhas ao lago.');
    if (f.lia_salva) L.push('Lia, a acólita, prepara poções no templo e vende-as baratas.');
    if (f.mirvale_livre) L.push('O vale está em paz. Nas tabernas fala-se das Terras Altas.');
    return L.join(' ');
  };
  function precoLoja(id, loja) {
    const d = itemDef(id);
    let p = d.preco;
    if (loja === 'mercado' && id === 'pocao' && S.flags.lia_salva) p -= 2;
    if (loja === 'ferreiro' && S.flags.tome_salvo) p = Math.ceil(p * 0.8);
    return p;
  }
  G.loja = function (loja) {
    const ids = loja === 'mercado' ? D.mercado : D.ferreiro;
    return ids.filter(id => !(D.armasExtra && D.armasExtra[id] && !S.desbloq[id])).filter(id => !(id === 'espada_ana' && !S.flags.mina_segura) && !(id === 'aguabenta' && S.flags.templo_hostil)).map(id => ({ id, nome: itemDef(id).nome, preco: precoLoja(id, loja), desc: itemDef(id).desc || itemDef(id).nota || (D.armas[id] ? `Arma de ${R.ATTR[D.armas[id].attr]}, dano ${D.armas[id].dano}` : D.armaduras[id] ? `+${D.armaduras[id].vida} Vida máxima` : '') }));
  };
  G.comprar = function (id, loja) {
    const p = precoLoja(id, loja);
    if (S.ouro < p) return false;
    S.ouro -= p; addItem(id);
    log('sys', `Compras: ${itemDef(id).nome} (−${p} moedas).`);
    G.save(); return true;
  };
  G.valorVenda = function (id) { const d = itemDef(id); return d.valor != null ? d.valor : Math.floor((d.preco || 0) / 2); };
  G.vender = function (id) {
    if (!has(id) || S.exp) return;
    const v = G.valorVenda(id);
    delItem(id); S.ouro += v;
    log('sys', `Vendes: ${itemDef(id).nome} (+${v} moedas).`);
    G.save();
  };
  G.equipar = function (hid, id) {
    const h = H(hid);
    if (!h || !has(id) || (S.exp && S.exp.combat)) return;
    if (D.armas[id]) { delItem(id); if (h.arma && h.arma !== 'punhos') addItem(h.arma); h.arma = id; }
    else if (D.armaduras[id]) { delItem(id); if (h.armadura) addItem(h.armadura); h.armadura = id; h.vida = Math.min(h.vida + D.armaduras[id].vida, vmax(h)); }
    h.vida = Math.min(h.vida, vmax(h));
    (S.exp ? log : log)('sys', `${h.nome} equipa ${itemDef(id).nome}.`);
    G.save();
  };
  G.descansarEstalagem = function () {
    const n = S.herois.filter(h => h.estado !== 'morto').length;
    const custo = n;
    const pago = Math.min(custo, S.ouro);
    S.ouro -= pago;
    S.herois.forEach(h => { if (h.estado !== 'morto') { h.vida = vmax(h); h.estado = 'ok'; h.foco = h.focoMax; h.mudo = false; } });
    S.dia++;
    log('narr', pago < custo ? 'O estalajadeiro fia-te a cama e a sopa. «Pagas quando puderes.» Dormes como uma pedra.' : `Sopa quente, uma cama de palha e o crepitar da lareira. (−${pago} ${plural(pago, 'moeda', 'moedas')}) Acordas com todas as forças.`);
    G.save();
  };
  G.podeSubir = h => h.xp >= (R.XP[h.nivel] || Infinity);
  /* subir de nível: +1 Vida e um talento lançado com o dado físico */
  G.subirNivel = function (hid) {
    const h = H(hid);
    if (!h || !G.podeSubir(h) || S.exp || S.pendAldeia) return;
    S.pendAldeia = { tipo: 'talento', heroi: hid };
    G.save();
  };
  G.pendenteAldeia = function () {
    const p = S && S.pendAldeia;
    if (!p) return null;
    const h = H(p.heroi);
    if (!h) { S.pendAldeia = null; return null; }
    const tab = D.talentos[h.cls];
    return { tipo: p.tipo, heroi: h.id, nome: h.nome, tabela: tab.map((t, i) => ({ i, nome: t.nome, desc: t.desc || '', ja: !!(t.id && t.id !== 'escolha' && tem(h, t.id)) })) };
  };
  function aplicarTalento(h, t) {
    let txt = t.nome;
    if (t.attr) { if (h.attr[t.attr] < 3) h.attr[t.attr]++; else { h.vidaBase += 2; txt = `${R.ATTR[t.attr]} já está no máximo: +2 Vida máxima`; } }
    else if (t.vida) h.vidaBase += t.vida;
    else if (t.foco) { h.focoMax++; h.foco++; }
    else if (t.id) { if (tem(h, t.id)) { h.vidaBase += 2; txt = `${t.nome} repetido: +2 Vida máxima`; } else h.talentos.push(t.id); }
    h.nivel++;
    h.vidaBase += 1;
    h.vida = vmax(h);
    log('good', `${h.nome} sobe ao nível ${h.nivel}! +1 Vida e talento: ${txt}.`);
    S.diario.push({ dia: S.dia, t: `${h.nome} chega ao nível ${h.nivel} — ${txt}.` });
  }
  G.rollAldeia = function (n) {
    const p = S.pendAldeia;
    if (!p || p.tipo !== 'talento') return;
    const h = H(p.heroi);
    const t = D.talentos[h.cls][n - 1];
    log('res', `🎲 ${n} → ${t.nome}`);
    if (t.id === 'escolha') { S.pendAldeia = { tipo: 'escolha', heroi: h.id }; log('sys', `${h.nome} pode escolher um talento.`); G.save(); return; }
    S.pendAldeia = null;
    aplicarTalento(h, t);
    G.save();
  };
  G.escolherTalento = function (i) {
    const p = S.pendAldeia;
    if (!p || p.tipo !== 'escolha') return;
    const h = H(p.heroi);
    const t = D.talentos[h.cls][i];
    if (!t || t.id === 'escolha') return;
    S.pendAldeia = null;
    aplicarTalento(h, t);
    G.save();
  };

  /* relíquias: escolhidas na aldeia depois de uma missão; ficam para sempre (máx. S.slots) */
  G.ofertaReliquia = function () {
    if (!S || S.exp || !S.reliquiaPendente) return null;
    if (!S.ofertaRel) S.ofertaRel = sortear(3, S.reliquias);
    return { opcoes: S.ofertaRel, cheio: S.reliquias.length >= S.slots, atuais: S.reliquias.slice() };
  };
  G.escolherReliquia = function (id, largar) {
    if (!S.reliquiaPendente || !S.ofertaRel || !S.ofertaRel.includes(id)) return;
    if (S.reliquias.length >= S.slots) { if (!largar || !S.reliquias.includes(largar)) return; S.reliquias = S.reliquias.filter(x => x !== largar); }
    S.reliquias.push(id);
    S.reliquiaPendente--; S.ofertaRel = null;
    log('good', `Relíquia: ${D.passivos[id].nome} — ${D.passivos[id].desc}`);
    G.save();
  };
  G.recusarReliquia = function () { if (S.reliquiaPendente) { S.reliquiaPendente--; S.ofertaRel = null; G.save(); } };
  G.facanhasEmCurso = function () {
    const e = E(); if (!e) return [];
    const salas = dg().zones.filter(z => z.kind === 'sala');
    const vistas = salas.filter(z => z.vis).length;
    const pistas = e.m.pistas.filter(p => e.flags[p.id]).length;
    const sv = (e.sobrev || []).filter(x => !x.morto).length;
    const P = {
      todas_salas: [vistas >= salas.length, `${vistas}/${salas.length}`],
      todas_pistas: [pistas === e.m.pistas.length && pistas > 0, `${pistas}/${e.m.pistas.length}`],
      resgate: [false, sv ? `${sv} contigo` : 'procura em pontos de busca'],
      ninguem_caiu: [!(e.caidos || []).length, (e.caidos || []).length ? 'falhado' : 'até agora'],
      cinco: [(e.mortes || 0) >= 5, `${Math.min(5, e.mortes || 0)}/5`],
      buscas: [(e.buscas || 0) >= 3, `${Math.min(3, e.buscas || 0)}/3`]
    };
    return D.facanhas.map(f => ({ nome: f.nome, xp: f.xp, ok: P[f.id][0], prog: P[f.id][1] }));
  };
  G.pendenteSobrev = function () {
    if (!S || !S.sobrev || !S.sobrev.length) return null;
    const p = S.sobrev[0];
    if (p.tipo === 'heroi') {
      const h = H(p.id);
      if (!h || h.estado === 'morto') { S.sobrev.shift(); return G.pendenteSobrev(); }
      return { tipo: 'heroi', nome: h.nome, heroi: h, fase: p.fase || 'sobrev', tabela: p.fase === 'cicatriz' ? D.cicatrizes.map(c => `${c.nome}: ${c.desc}`) : D.sobrevivencia.map(x => x.t) };
    }
    const c = S.comps.find(x => x.id === p.id);
    if (!c) { S.sobrev.shift(); return G.pendenteSobrev(); }
    return { tipo: 'comp', nome: c.nome, comp: c, fase: 'sobrev', tabela: D.sobrevCompanheiro.map(x => x.t) };
  };
  G.rollSobrev = function (n) {
    const p = S.sobrev[0];
    if (!p) return;
    n = Math.max(1, Math.min(6, n | 0));
    if (p.tipo === 'comp') {
      const c = S.comps.find(x => x.id === p.id);
      const r = D.sobrevCompanheiro[n - 1];
      S.sobrev.shift();
      if (!c) return;
      log(r.tipo === 'morto' ? 'bad' : 'good', `🎲 ${n} — ${c.nome}: ${r.t}`);
      if (r.tipo === 'morto') { S.comps = S.comps.filter(x => x.id !== c.id); S.diario.push({ dia: S.dia, t: `${c.nome} (${D.companheiros[c.tipo].nome}) morreu dos ferimentos.` }); }
      else { c.estado = r.tipo === 'ferido' ? 'ferido' : 'ok'; c.vida = c.vidaMax; }
      G.save(); return;
    }
    const h = H(p.id);
    if (p.fase === 'cicatriz') {
      const c = D.cicatrizes[n - 1];
      h.cicatrizes = (h.cicatrizes || []).concat(c.id);
      log('bad', `🎲 ${n} — ${h.nome} fica com uma cicatriz: ${c.nome} (${c.desc})`);
      S.diario.push({ dia: S.dia, t: `${h.nome} ganhou uma cicatriz: ${c.nome}.` });
      if (c.vida) h.vida = Math.min(h.vida, vmax(h));
      S.sobrev.shift(); G.save(); return;
    }
    const r = D.sobrevivencia[n - 1];
    log(r.tipo === 'ok' ? 'good' : 'bad', `🎲 ${n} — ${h.nome}: ${r.t}`);
    if (r.tipo === 'cicatriz') { p.fase = 'cicatriz'; G.save(); return; }
    if (r.tipo === 'ferido') h.feridoGrave = true;
    if (r.tipo === 'perda') {
      const ks = Object.keys(S.mochila).filter(k => S.mochila[k] > 0 && !D.armas[k] && !D.armaduras[k] && k !== 'tocha');
      if (ks.length) { const k = ks[Math.floor(Math.random() * ks.length)]; S.mochila[k]--; if (!S.mochila[k]) delete S.mochila[k]; log('bad', `Perdeu-se: ${itemDef(k).nome}.`); }
      else log('sys', 'Por sorte, não havia nada para perder.');
    }
    S.sobrev.shift(); G.save();
  };
  G.escolhaBencao = () => (E() ? E().escolha : null);

  G.desistir = function () { if (!S.exp) return; log('sys', 'Abandonas a expedição.'); terminarExpedicao('retirada'); };
})(window.CP);
