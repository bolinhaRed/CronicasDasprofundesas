/* Motor de jogo: o Mestre de Jogo. Estado da campanha, expedição, acções, testes, combate, cenas, aldeia.
   Não toca no DOM. A interface chama G.input(texto), G.roll(n), G.ajudar(id) e lê G.S(), G.sugestoes(). */
(function (CP) {
  'use strict';
  const D = CP.DATA, C = CP.C, R = CP.Rules;
  const G = CP.Game = {};
  let S = null;

  const clone = o => JSON.parse(JSON.stringify(o));
  G.S = () => S;
  G.load = function () { S = CP.Store.load(); if (S && S.v !== 1) S = null; return S; };
  G.save = function () { if (S) CP.Store.save(S); };
  G.setState = function (s) { S = s; G.save(); };
  G.reset = function () { S = null; CP.Store.clear(); };

  /* =========================================================== utilidades */
  const E = () => S && S.exp;
  const H = id => S.herois.find(h => h.id === id);
  const vivos = () => S.herois.filter(h => h.estado !== 'morto');
  const aptos = () => S.herois.filter(h => h.estado === 'ok');
  function vmax(h) { const a = h.armadura ? D.armaduras[h.armadura] : null; return h.vidaBase + (a ? a.vida : 0); }
  G.vmax = vmax;
  function arma(h) { return D.armas[h.arma] || D.armas.punhos; }
  G.arma = arma;
  function itemDef(id) { return D.itens[id] || D.armas[id] || D.armaduras[id] || { nome: id }; }
  G.itemDef = itemDef;
  const has = id => (S.mochila[id] || 0) > 0;
  function addItem(id, n) { S.mochila[id] = (S.mochila[id] || 0) + (n || 1); }
  function delItem(id) { if (!S.mochila[id]) return; S.mochila[id]--; if (S.mochila[id] <= 0) delete S.mochila[id]; }
  function art(en, cap) {
    if (!en) return '';
    const s = en.g === 'p' ? en.nome : (en.g === 'f' ? 'a ' : 'o ') + en.nome;
    return cap ? CP.cap(s) : s;
  }
  const plural = (n, s, p) => n === 1 ? s : p;

  function log(k, t) {
    const L = S.exp ? S.exp.log : S.log;
    L.push({ k, t });
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
    if (tipo === 'procurar' && (has('lanterna') || (E() && E().buffs.luz))) L.push(['Luz', 1]);
    if (tipo === 'arrombar') { if (has('gazuas')) L.push(['Gazuas', 1]); else if (c !== 'ladrao') L.push(['Sem gazuas', -1]); }
    if (tipo === 'forcar' && (has('pecabra') || arma(h).forcar)) L.push([has('pecabra') ? 'Pé-de-cabra' : 'Machado', 1]);
    if ((tipo === 'ler' || tipo === 'magia') && (has('amuleto') || has('anel_valdrem'))) L.push([has('anel_valdrem') ? 'Anel de Valdrem' : 'Amuleto', 1]);
    if (tipo === 'furtivo' && aptos().length >= 3) L.push(['Grupo numeroso', -1]);
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
    else {
      let mod = p.mod;
      if (p.ajuda) mod = R.clamp(mod + 1);
      const r = R.resolve(n, mod);
      const ms = mod ? (mod > 0 ? ` + ${mod}` : ` − ${-mod}`) : '';
      const nota = n === 1 ? ' (1 natural)' : n === 6 ? ' (6 natural)' : '';
      log('res', `🎲 ${n}${ms} = ${r.total}${nota} → ${R.LABEL[r.band]}`);
      const h = H(p.heroi);
      (HANDLERS[p.h] || (() => {}))(r, p, h);
      if (r.band === 'falha' && p.ajuda) {
        const ha = H(p.ajuda);
        if (ha && ha.estado === 'ok') { bad(`${ha.nome} partilha o risco da falha.`); ferir(ha, 1); }
      }
    }
    depois();
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
    if (e && e.combat && h.escudo && !e.combat.escudo[h.id] && origem === 'inimigo') {
      e.combat.escudo[h.id] = true;
      good(`O escudo de ${h.nome} apara o golpe por completo!`);
      return;
    }
    h.vida = Math.max(0, h.vida - n);
    bad(`${h.nome} sofre ${n} de dano. Vida ${h.vida}/${vmax(h)}.`);
    if (h.vida <= 0) {
      h.estado = 'caido';
      bad(`${h.nome} cai por terra!`);
      if (e) pedir({ tipo: 'morte', heroi: h.id, rotulo: `${h.nome} está às portas da morte. Lança 1D6 para saber o seu destino.` });
    }
  }
  function curar(h, n) {
    if (!h || h.estado === 'morto') return;
    const antes = h.vida;
    h.vida = Math.min(vmax(h), h.vida + n);
    if (h.estado === 'caido' && h.vida > 0) { h.estado = 'ok'; good(`${h.nome} recupera os sentidos.`); }
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
      h.estado = 'caido'; h.vida = 0;
      bad(`${h.nome} fica inconsciente, mas respira. ${aptos().length ? 'Uma poção, bandagens ou uma cura podem acordá-lo.' : ''}`);
    } else {
      h.estado = 'ok'; h.vida = 1;
      good(`Contra todas as probabilidades, ${h.nome} levanta-se com 1 de Vida.`);
    }
  }
  function verificarDerrota() {
    const e = E();
    if (!e || aptos().length) return false;
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
    const def = clone(T.inimigos.find(i => i.id === defId) || T.inimigos[0]);
    def.hp += Math.max(0, S.herois.filter(h => h.estado !== 'morto').length - 1);
    const id = 'x' + (E().nx++);
    const en = Object.assign(def, { id, kind: 'inimigo', zone: zid, x: cell[0], y: cell[1], estado: 'alerta', hpMax: def.hp });
    dg().ents[id] = en;
    return en;
  }

  /* =========================================================== campanha */
  G.novaCampanha = function (modo) {
    S = { v: 1, modo: modo || 'solo', criado: Date.now(), dia: 1, ouro: 10, mochila: {}, herois: [], cemiterio: [], missoes: {}, flags: {}, diario: [], locais: {}, log: [], exp: null, seed: String(Math.floor(Math.random() * 1e9)), nh: 1, rumoresFeitos: {} };
    Object.values(D.missoes).forEach(m => { if (m.inicial) S.missoes[m.id] = { estado: 'disponivel', vezes: 0 }; });
    G.save();
    return S;
  };
  G.criarHeroi = function (nome, cls) {
    const c = D.classes[cls];
    const h = { id: 'h' + (S.nh++), nome: (nome || c.nome).trim().slice(0, 18), cls, nivel: 1, xp: 0, vidaBase: c.vida, attr: clone(c.attr), arma: c.arma, armadura: c.armadura, escudo: !!c.escudo, focoMax: c.foco, foco: c.foco, estado: 'ok', usos: {} };
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
  G.gerarRumor = function (id) {
    const rng = CP.RNG(S.seed + '/' + id);
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
    return fixas.concat(rumoresDoDia());
  };

  /* ---------- partir em expedição ---------- */
  G.partir = function (mid) {
    if (S.exp) return;
    G.limparMortos();
    if (!aptos().length) return;
    let m = D.missoes[mid] ? clone(D.missoes[mid]) : (mid.startsWith('rumor-') ? G.gerarRumor(mid) : null);
    if (!m) return;
    const reg = S.missoes[mid] || (S.missoes[mid] = { estado: 'disponivel', vezes: 0 });
    reg.vezes++;
    const seed = `${S.seed}/${mid}/${reg.vezes}`;
    const n = aptos().length;
    const masm = CP.prepararAventura(m, seed, n);
    S.herois.forEach(h => { h.foco = h.focoMax; h.usos = {}; });
    S.exp = {
      mid, m, titulo: m.titulo, tipo: m.tipo, local: m.local, seed, dg: masm, zone: 0, pos: masm.stairs.slice(), via: null, prev: null,
      clock: 0, combat: null, pending: null, queue: [], cont: null, scene: null, flags: {}, completo: null, log: [], actor: aptos()[0].id,
      sneak: {}, rests: 0, buffs: {}, rs: CP.hash(seed + '/run') | 0, nx: 0, eventoPendente: false, vitoriaFeita: false, inicioDia: S.dia
    };
    title(m.titulo);
    narr(m.gancho);
    narr(m.entrada);
    draw(`Prepara a folha: uma grelha de ${masm.W} colunas (A a ${C.col(masm.W - 1)}, da esquerda para a direita) e ${masm.H} linhas (1 a ${masm.H}, de baixo para cima). O norte fica no topo da folha. Começa a desenhar junto à margem de baixo.`);
    entrar(0, null);
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
    e.sneak[zid] = false;
    if (e.scene && e.scene.tipo !== 'final') e.scene = null;
    if (primeira) descrever(z, via, true);
    else if (!e.quiet) { narr(`Regressas a ${nomeZona(z)}.`); sys(`Estás em ${posTxt()}.`); }

    const final = zid === dg().obj && !e.completo;
    if (final) {
      e.scene = { tipo: 'final' };
      if (primeira) narr(e.m.final.intro);
      e.quiet = false;
    }
    const temOpcoes = final && opcoesValidas(e.m.final.opcoes).length > 0;
    const alerta = inimigos(zid).filter(en => en.estado === 'alerta' && !(en.boss && temOpcoes && !e.combateFinal));
    if (alerta.length) {
      e.quiet = false;
      narr(`${alerta.map(en => art(en, true)).join(' e ')} ${plural(alerta.length, 'vê-te e ataca', 'vêem-te e atacam')}!`);
      iniciarCombate(alerta.map(en => en.id));
    }
    if (zid === 0 && e.completo && !e.combat) {
      sys('Estás de volta às escadas da entrada. Podes subir e terminar a aventura.');
    }
  }

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
    if (z.kind === 'sala') {
      narr(z.desc + (z.pistaSecreta ? ' ' + z.pistaSecreta : ''));
      if (primeira) draw(`Desenha uma sala de ${z.w}×${z.h} quadrados: colunas ${C.col(z.x)} a ${C.col(z.x + z.w - 1)}, linhas ${z.y + 1} a ${z.y + z.h}.`);
      if (z.id === 0) draw(`As escadas por onde desceste acabam em ${C.n(d.stairs[0], d.stairs[1])}. Marca-as com um E.`);
      portas(z.id).forEach(c => {
        draw(`${CP.cap(nomePorta(c, z.id))}: ${portaTxt(c)}, na parede ${C.NOME[c.side]}, ${entre(c)}.${c.id === via ? ' Foi por aqui que entraste.' : ''}`);
      });
    } else {
      const ends = z.ends.map(i => d.conns[i]);
      let ini = via != null ? d.conns[via] : ends[0];
      const fim = ends.find(c => c !== ini);
      const a = celula(ini, z.id), b = celula(fim, z.id);
      const dir = C.NOME[ladoDe(fim, z.id)];
      narr(z.desc);
      const n = z.cells.length;
      if (primeira) draw(n === 1 ? `Desenha um corredor curto, de 1 quadrado, em ${C.n(a[0], a[1])}.` : `Desenha um corredor com 1 quadrado de largura, de ${C.n(a[0], a[1])} a ${C.n(b[0], b[1])} (${n} quadrados, para ${dir}).`);
      draw(`Ao fundo, para ${dir}, ${entre(fim)}: ${portaTxt(fim)}.`);
    }
    ents(z.id).forEach(en => draw(linhaEnt(en)));
    traps(z.id).filter(t => t.achada).forEach(t => draw(`Em ${C.n(t.x, t.y)}: ${t.nome} (armadilha detectada — marca com um T).`));
    sys(`Estás em ${posTxt()}.`);
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
    if (e.combat) { ids.forEach(id => { if (!e.combat.ens.includes(id)) e.combat.ens.push(id); }); return; }
    e.combat = { ens: ids.slice(), escudo: {}, disparo: {}, ronda: 1, anunciado: null };
    e.scene && (e.scene.pausada = true);
    log('combat', 'Combate!');
    sys('Cada ataque é um teste: 5–6 acertas sem sofrer nada · 3–4 trocam golpes · 1–2 falhas e és atingido.');
  }
  function vivosCombate() { const e = E(); return e.combat ? e.combat.ens.map(id => dg().ents[id]).filter(en => en && !en.gone && en.hp > 0) : []; }

  function atacar(en, h) {
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
    const verbo = w.distancia ? 'dispara contra' : 'ataca';
    narr(`${h.nome} ${verbo} ${art(en)}${surpresa ? ', apanhando-' + (en.g === 'f' ? 'a' : 'o') + ' desprevenid' + (en.g === 'f' ? 'a' : 'o') : ''}.`);
    pedir({ h: 'ataque', heroi: h.id, mods: modsFor(h, 'ataque', extra), rotulo: `Ataque de ${h.nome} (${w.nome}). Lança 1D6.`, d: { en: en.id, surpresa } });
  }

  function golpeInimigo(en, h, extraDano) {
    narr(`${art(en, true)} ${en.tipo === 'fera' ? 'morde' : 'golpeia'} ${h.nome}!`);
    ferir(h, en.dano + (extraDano || 0), 'inimigo');
  }

  function danoEm(en, n, h) {
    en.hp = Math.max(0, en.hp - n);
    if (en.hp <= 0) {
      good(`${art(en, true)} cai${en.tipo === 'morto' ? ' e desfaz-se em pó e ossos' : ''}! (${n} de dano)`);
      draw(`Apaga o X de ${C.n(en.x, en.y)}.`);
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
    if (e.scene) e.scene.pausada = false;
    verificarVitoria();
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
    const en = vivosCombate()[0];
    if (!en) return;
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
      if (ef.ouro) { S.ouro = Math.max(0, S.ouro + ef.ouro); (ef.ouro > 0 ? good : sys)(ef.ouro > 0 ? `+${ef.ouro} moedas de ouro (bolsa: ${S.ouro}).` : `Pagas ${-ef.ouro} moedas (bolsa: ${S.ouro}).`); }
      if (ef.item) { addItem(ef.item); good(`Ganhas: ${itemDef(ef.item).nome}.`); }
      if (ef.removeItem) delItem(ef.removeItem);
      if (ef.flag) e.flags[ef.flag] = true;
      if (ef.tick) tick(ef.tick);
      if (ef.loot) loot(ef.loot);
      if (ef.buff) e.buffs[ef.buff] = true;
      if (ef.foco) { const m = aptos().find(x => x.focoMax > 0); if (m) { m.foco = Math.min(m.focoMax + 1, m.foco + ef.foco); good(`${m.nome} recupera ${ef.foco} de Foco (${m.foco}).`); } }
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
    if (r.ouro) { const n = rint(r.ouro[0], r.ouro[1]); S.ouro += n; good(`Encontras ${n} moedas de ouro (bolsa: ${S.ouro}).`); }
    if (r.item) { addItem(r.item); good(`Encontras: ${itemDef(r.item).nome}.`); }
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
    dg().conns.forEach(c => { if (c.secreto && !c.achada && c.room === e.zone) { c.achada = true; algo = true; good('Uma porta secreta!'); draw(`Desenha uma porta secreta na parede ${C.NOME[c.side]}, ${entre(c)}.`); } });
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
      let dano = w.dano + (r.nat === 6 ? 1 : 0);
      const furtivo = surpresa && w.furtivo && h.cls === 'ladrao';
      if (furtivo) dano *= 2;
      if (!e.combat && !surpresa) comecarLuta(en);
      const primeiroDisparo = w.distancia && h.cls === 'explorador' && e.combat && !e.combat.disparo[h.id];
      if (r.nat === 6) good('Golpe certeiro! (+1 de dano)');
      if (furtivo && r.band !== 'falha') good('Ataque furtivo! Dano a dobrar.');
      if (r.band === 'sucesso') danoEm(en, dano, h);
      else if (r.band === 'parcial') {
        danoEm(en, dano, h);
        if (en.hp > 0 && !surpresa) {
          if (primeiroDisparo) good('Disparas de longe: não há resposta.');
          else golpeInimigo(en, h);
        }
      } else {
        narr(`${h.nome} falha.`);
        if (!surpresa) {
          if (primeiroDisparo) narr('O inimigo ainda está longe; não te consegue atingir.');
          else golpeInimigo(en, h);
          vivosCombate().filter(o => o.id !== en.id).forEach(o => { narr(`${art(o, true)} aproveita a abertura.`); ferir(h, 1, 'inimigo'); });
        } else narr(`${art(en, true)} desperta, furios${en.g === 'f' ? 'a' : 'o'}.`);
      }
      if (e.combat) e.combat.disparo[h.id] = true;
      if (surpresa && inimigos(e.zone).length) comecarLuta(en);
      fimCombateSePreciso();
      verificarVitoria();
      if (E() && E().combat) { proximoTurno(); E().combat.ronda++; }
    },
    defesa(r, p, h) {
      const en = dg().ents[p.d.en];
      if (!en || en.hp <= 0 || !h) return;
      if (r.band === 'falha') golpeInimigo(en, h);
      else if (r.band === 'parcial') { narr(`Recuas a tempo, mas ${art(en)} arranha-te.`); ferir(h, 1, 'inimigo'); }
      else good(`${h.nome} esquiva-se.`);
      if (E() && E().combat) proximoTurno();
    },
    fuga(r, p, h) {
      const e = E();
      const en = vivosCombate()[0];
      if (r.band === 'falha') { narr('Não consegues escapar!'); if (en) golpeInimigo(en, h); if (E() && E().combat) proximoTurno(); return; }
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
    },
    selo(r, p, h) {
      const e = E();
      const en = dg().ents[p.d.en];
      if (!en) return;
      const dano = en.tipo === 'morto' ? 3 : 2;
      if (!e.combat) comecarLuta(en);
      if (r.band === 'sucesso') danoEm(en, dano, h);
      else if (r.band === 'parcial') { danoEm(en, dano - 1, h); if (en.hp > 0) golpeInimigo(en, h); }
      else { narr('As palavras falham-te na garganta.'); golpeInimigo(en, h); }
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
    if (!furtivoOk({ a: 'exam', id: en.id })) return;
    moverPara(en);
    if (en.kind === 'pista') {
      if (e.flags[en.pid]) { narr(en.exame); return; }
      if (en.teste) {
        const h = actor();
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
    if (en.kind === 'item') { addItem(en.item); en.gone = true; good(`Apanhas ${en.desc.replace(/^uma? /, 'a ')}.`); draw(`Apaga o objecto de ${C.n(en.x, en.y)}.`); return; }
    if (en.kind === 'feat' && en.acao) { acaoFeat(en); return; }
    narr('Não é coisa que se leve.');
  }

  function procurar() {
    const e = E();
    if (!furtivoOk({ a: 'procurar' })) return;
    const ocultos = dg().conns.filter(c => c.secreto && !c.achada && c.room === e.zone).length +
      Object.values(dg().ents).filter(en => en.zone === e.zone && en.oculto && en.kind !== 'inimigo').length;
    if (!ocultos) { tick(1); narr('Procuras com cuidado nas paredes e no chão... não encontras nada de especial.'); return; }
    const h = actor();
    pedir({ h: 'procurar', heroi: h.id, mods: modsFor(h, 'procurar'), rotulo: `Teste de Procurar de ${h.nome}. Lança 1D6.` });
  }

  function procurarArmadilhas() {
    const e = E();
    if (!furtivoOk({ a: 'armadilhas' })) return;
    const t = traps(e.zone).filter(t => !t.achada);
    if (!t.length) { narr('Examinas o chão, as paredes e as portas. Não encontras armadilhas.'); return; }
    const h = actor();
    pedir({ h: 'armadilhas', heroi: h.id, mods: modsFor(h, 'armadilhas'), rotulo: `Teste de Detectar armadilhas de ${h.nome}. Lança 1D6.` });
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
    narr(en.fala || `${art(en, true)} olha para ti em silêncio.`);
    if (en.final) { e.scene = { tipo: 'final' }; return; }
    e.scene = { tipo: 'npc', ent: en.id };
  }

  function descansar() {
    const e = E();
    if (e.combat) { narr('Não há descanso a meio de um combate.'); return; }
    if (inimigos(e.zone).length) { narr('Não podes descansar com inimigos tão perto.'); return; }
    if (e.rests >= 2) { narr('Já descansaste o suficiente nesta expedição. Mais tempo aqui em baixo e não voltas a subir.'); return; }
    e.rests++;
    narr('Sentas-te com as costas na pedra fria e recuperas o fôlego. O tempo passa.');
    S.herois.filter(h => h.estado !== 'morto').forEach(h => curar(h, 2));
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
    if (caster.foco <= 0) { narr(`${caster.nome} já não tem Foco.`); return; }
    if (/cura|curar/.test(nome)) {
      const alvo = acharHeroi(alvoTxt) || [...S.herois].filter(x => x.estado !== 'morto').sort((a, b) => (a.vida / vmax(a)) - (b.vida / vmax(b)))[0];
      caster.foco--;
      narr(`${caster.nome} pousa as mãos em ${alvo.nome} e murmura as palavras antigas.`);
      curar(alvo, 3);
      if (e.combat) acaoEmCombate(caster, 'reza');
      return;
    }
    if (/revel|ocult/.test(nome)) {
      caster.foco--;
      narr(`${caster.nome} fecha os olhos e as sombras afastam-se.`);
      revelarZona();
      return;
    }
    if (/selo|banir|ataque|luz/.test(nome)) {
      const en = acharInimigo(alvoTxt) || inimigos(e.zone)[0];
      if (!en) { narr('Não há inimigos aqui.'); return; }
      caster.foco--;
      const extra = en.def ? [[`Defesa ${en.nome}`, -en.def]] : [];
      narr(`${caster.nome} ergue a mão e grita a palavra do selo contra ${art(en)}.`);
      pedir({ h: 'selo', heroi: caster.id, mods: modsFor(caster, 'magia', extra), rotulo: `Teste de Magia de ${caster.nome}. Lança 1D6.`, d: { en: en.id } });
      return;
    }
    sys('Feitiços: «lançar curar [herói]», «lançar selo [inimigo]», «lançar revelar».');
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
      const ok = ['atacar', 'fugir', 'usar', 'magia', 'examinar', 'voltar'];
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
        fimCombateSePreciso();
        if (E().combat) proximoTurno();
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
      case 'furtivo': log('you', 'Esgueirar-me'); return despachar({ verb: 'furtivo', words: [], raw: 'furtivo' });
      case 'procurar': log('you', 'Procurar passagens e objectos ocultos'); return procurar();
      case 'armadilhas': log('you', 'Procurar armadilhas'); return procurarArmadilhas();
      case 'descansar': log('you', 'Descansar'); return descansar();
      case 'instinto': log('you', 'Usar o Instinto'); return instinto();
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
      vivosCombate().forEach(en => L.push({ l: `Atacar ${en.nome}`, c: `#atacar ${en.id}`, t: 'combate' }));
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
    L.push({ l: 'Procurar armadilhas', c: '#armadilhas', t: 'util' });
    if (z.kind === 'sala') L.push({ l: 'Procurar passagens', c: '#procurar', t: 'util' });
    if (aptos().some(x => x.cls === 'explorador' && !x.usos.instinto)) L.push({ l: 'Instinto', c: '#instinto', t: 'util' });
    const m = aptos().find(x => x.focoMax > 0 && x.foco > 0);
    if (m && S.herois.some(x => x.estado !== 'morto' && x.vida < vmax(x))) L.push({ l: 'Curar (1 Foco)', c: '#magia curar', t: 'magia' });
    if (m) L.push({ l: 'Revelar (1 Foco)', c: '#magia revelar', t: 'magia' });
    S.herois.filter(x => x.estado === 'caido').forEach(x => { if (has('pocao')) L.push({ l: `Poção a ${x.nome}`, c: `#usar pocao ${x.id}`, t: 'item' }); if (has('bandagens')) L.push({ l: `Bandagens a ${x.nome}`, c: `#usar bandagens ${x.id}`, t: 'item' }); });
    if (e.rests < 2 && !inimigos(e.zone).length && S.herois.some(x => x.estado !== 'morto' && x.vida < vmax(x))) L.push({ l: 'Descansar', c: '#descansar', t: 'util' });
    if (e.zone === 0 && !e.completo) L.push({ l: 'Abandonar a masmorra', c: '#sair', t: 'perigo' });
    else if (!e.completo) L.push({ l: 'Retirar para a saída', c: '#sair', t: 'perigo' });
    return L;
  };

  G.estadoTeste = function () {
    const e = E();
    if (!e || !e.pending) return null;
    const p = e.pending;
    const h = H(p.heroi);
    return {
      morte: p.tipo === 'morte', rotulo: p.rotulo, mods: p.mods || [], mod: p.ajuda ? R.clamp(p.mod + 1) : p.mod,
      heroi: h ? h.nome : '', ajuda: p.ajuda,
      ajudantes: p.tipo === 'morte' ? [] : aptos().filter(x => x.id !== p.heroi).map(x => ({ id: x.id, nome: x.nome }))
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
      res.xp = xp; res.ouro = (dz.ouro || 0) + (res.extra ? (dz.extra.ouro || 0) : 0);
      S.diario.push({ dia: S.dia, t: `${m.titulo}: ${dz.titulo}. ${dz.texto}` });
    } else {
      res.xp = 0;
      S.diario.push({ dia: S.dia, t: `${m.titulo}: ${fim === 'morte' ? 'ninguém regressou.' : fim === 'derrota' ? 'derrota.' : 'retirada sem cumprir a missão.'}` });
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
      log('good', `+${res.ouro} moedas · +${res.xp} de experiência.`);
    } else if (fim === 'retirada') log('narr', 'Regressas a Corvamonte. A missão continua no quadro, à espera de alguém mais corajoso — ou mais bem preparado.');
    else if (fim === 'derrota') log('narr', 'Voltas a Corvamonte a coxear. A missão continua por cumprir. Os feridos recuperam com tempo e descanso.');
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
    return ids.filter(id => !(id === 'espada_ana' && !S.flags.mina_segura) && !(id === 'aguabenta' && S.flags.templo_hostil)).map(id => ({ id, nome: itemDef(id).nome, preco: precoLoja(id, loja), desc: itemDef(id).desc || itemDef(id).nota || (D.armas[id] ? `Arma de ${R.ATTR[D.armas[id].attr]}, dano ${D.armas[id].dano}` : D.armaduras[id] ? `+${D.armaduras[id].vida} Vida máxima` : '') }));
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
    S.herois.forEach(h => { if (h.estado !== 'morto') { h.vida = vmax(h); h.estado = 'ok'; h.foco = h.focoMax; } });
    S.dia++;
    log('narr', pago < custo ? 'O estalajadeiro fia-te a cama e a sopa. «Pagas quando puderes.» Dormes como uma pedra.' : `Sopa quente, uma cama de palha e o crepitar da lareira. (−${pago} ${plural(pago, 'moeda', 'moedas')}) Acordas com todas as forças.`);
    G.save();
  };
  G.podeSubir = h => h.xp >= (R.XP[h.nivel] || Infinity);
  G.subirNivel = function (hid, escolha) {
    const h = H(hid);
    if (!h || !G.podeSubir(h)) return;
    h.nivel++;
    h.vidaBase += 1;
    let t = '+1 Vida máxima';
    if (R.ATTR[escolha] && h.attr[escolha] < 3) { h.attr[escolha]++; t += `, +1 ${R.ATTR[escolha]}`; }
    else if (escolha === 'foco' && h.focoMax > 0) { h.focoMax++; h.foco++; t += ', +1 Foco'; }
    else { h.vidaBase += 2; t = '+3 Vida máxima'; }
    h.vida = vmax(h);
    log('good', `${h.nome} sobe ao nível ${h.nivel}! ${t}.`);
    S.diario.push({ dia: S.dia, t: `${h.nome} chega ao nível ${h.nivel}.` });
    G.save();
  };

  G.desistir = function () { if (!S.exp) return; log('sys', 'Abandonas a expedição.'); terminarExpedicao('retirada'); };
})(window.CP);
