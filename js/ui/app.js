/* Interface: livro de aventuras para telemóvel. Só lê o estado do motor e envia acções. */
(function (CP) {
  'use strict';
  const G = CP.Game, D = CP.DATA, R = CP.Rules;
  const $app = document.getElementById('app');
  const ui = { screen: 'capa', folha: null, criar: null, tudo: false, mais: false, vistos: -1, expId: null, tema: lerTema() };

  /* ------------------------------------------------------------ utilidades */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = s => esc(s).replace(/\b([A-Z])(\d{1,2})\b/g, '<b class="co">$1$2</b>').replace(/\n/g, '<br>');
  const S = () => G.S();
  function toast(t) {
    const d = document.createElement('div');
    d.className = 'toast'; d.textContent = t;
    $app.appendChild(d);
    setTimeout(() => d.remove(), 2200);
  }
  function lerTema() { try { return localStorage.getItem('cronicas_tema') || 'auto'; } catch (e) { return 'auto'; } }
  function aplicarTema() {
    const t = ui.tema === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro') : ui.tema;
    document.documentElement.dataset.tema = t;
    const m = document.querySelector('meta[name=theme-color]');
    if (m) m.content = t === 'escuro' ? '#16130f' : '#f2eadb';
  }

  /* ------------------------------------------------------------ render principal */
  function render() {
    aplicarTema();
    const s = S();
    let html;
    if (!s) html = ui.screen === 'nova' ? telaCriacao(true) : telaCapa();
    else if (!s.herois.some(h => h.estado !== 'morto') && !s.exp) html = telaCriacao(false);
    else if (s.exp) html = telaJogo();
    else html = telaAldeia();
    if (ui.folha) html += folha();
    if (ui.confirmar) html += `<div class="folha-fundo"><div class="folha" role="alertdialog"><div class="corpo" style="padding-top:20px"><p>${esc(ui.confirmar.texto)}</p>
      <div style="display:flex;gap:8px"><button class="btn sec2 grande" data-act="nao">Cancelar</button><button class="btn grande ${ui.confirmar.perigo ? 'perigo' : ''}" data-act="sim">${esc(ui.confirmar.ok || 'Confirmar')}</button></div></div></div></div>`;
    $app.innerHTML = html;
    if (s && s.exp) posScroll();
    else if (s && !s.exp && !ui.folha && ui.rolarAldeia) { ui.rolarAldeia = false; const a = $app.querySelector('.aldeia'); if (a) a.scrollTop = 0; }
    const inp = $app.querySelector('#cmdIn');
    if (inp && ui.focar) { inp.focus(); ui.focar = false; }
  }

  /* ------------------------------------------------------------ capa */
  function telaCapa() {
    const tem = !!CP.Store.load();
    return `<div class="capa">
      <div class="logo"><div class="orn">✦ ❧ ✦</div>
        <h1>Crónicas das Profundezas<small>Old School</small></h1></div>
      <p class="lema">Um Mestre de Jogo de bolso. Tu desenhas a masmorra. Tu lanças o dado. A história é tua.</p>
      ${tem ? `<button class="btn grande" data-act="continuar">Continuar campanha</button>` : ''}
      <button class="btn grande ${tem ? 'sec2' : ''}" data-act="nova">Nova campanha</button>
      <button class="btn grande sec2" data-act="importar">Importar campanha</button>
      <button class="btn grande sec2" data-act="regras">Como se joga</button>
      <p class="precisas">Precisas de: papel quadriculado · lápis · um dado de seis faces.<br>Sozinho ou em grupo, à volta do mesmo telemóvel.</p>
    </div>`;
  }

  /* ------------------------------------------------------------ criação de heróis */
  function telaCriacao(nova) {
    if (!ui.criar) ui.criar = { modo: 'solo', n: 1, idx: 0, herois: [{ nome: '', cls: 'guerreiro' }], nova };
    const c = ui.criar;
    const h = c.herois[c.idx];
    const passo = c.n > 1 ? ` — jogador ${c.idx + 1} de ${c.n}` : '';
    let modos = '';
    if (nova && c.idx === 0) {
      modos = `<div class="sec">Quantos jogadores?</div><div class="modos">${[1, 2, 3, 4].map(n => `<button data-act="modo" data-v="${n}" class="${c.n === n ? 'on' : ''}"><b>${n}</b>${n === 1 ? 'solo' : 'co-op'}</button>`).join('')}</div>
      ${c.n > 1 ? '<p class="sans peq mudo">Modo cooperativo: todos jogam no mesmo telemóvel, com o mesmo mapa e o mesmo dado. Cada jogador controla um herói; em combate a vez passa por ordem; um herói pode ajudar outro num teste (+1), partilhando o risco.</p>' : ''}`;
    }
    const cls = Object.keys(D.classes).map(k => {
      const d = D.classes[k];
      return `<button class="classe ${h.cls === k ? 'on' : ''}" data-act="cls" data-v="${k}"><b>${d.nome}</b><small>${esc(d.desc)}</small>
        <div class="ats">Vida ${d.vida} · FOR ${d.attr.FOR} · AGI ${d.attr.AGI} · MEN ${d.attr.MEN} · SEN ${d.attr.SEN}</div></button>`;
    }).join('');
    const d = D.classes[h.cls];
    return `<div class="capa">
      <h1 style="font-size:26px;text-align:center;margin:0 0 6px">${nova ? 'Nova campanha' : 'Um novo herói'}</h1>
      ${!nova ? '<p class="lema">A companhia está vazia. Alguém tem de continuar o que os outros começaram.</p>' : ''}
      ${modos}
      <div class="sec">Herói${passo}</div>
      <input class="campo" id="nomeHeroi" maxlength="18" placeholder="Nome do herói" value="${esc(h.nome)}">
      <div class="classes">${cls}</div>
      <div class="cartao"><h3>${d.nome}</h3><ul>${d.habs.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        <p class="sans peq mudo">Começa com: ${esc(D.armas[d.arma].nome)}${d.armadura ? ', ' + esc(D.armaduras[d.armadura].nome) : ''}${d.escudo ? ', escudo' : ''}, ${Object.keys(d.itens).map(i => D.itens[i].nome).join(', ')}.</p></div>
      <button class="btn grande" data-act="criar-ok">${c.idx < c.n - 1 ? 'Próximo herói →' : (nova ? 'Começar em Corvamonte' : 'Juntar à companhia')}</button>
      ${c.idx > 0 ? '<button class="btn grande sec2" data-act="criar-voltar">← Voltar</button>' : ''}
      ${nova ? '<button class="btn grande sec2" data-act="capa">Cancelar</button>' : ''}
    </div>`;
  }

  /* ------------------------------------------------------------ grupo */
  function barraGrupo(clicavel) {
    const s = S();
    const act = G.actor();
    const hs = s.herois.filter(h => h.estado !== 'morto');
    return `<div class="grupo">${hs.map(h => {
      const vm = G.vmax(h);
      const pct = Math.max(0, Math.round(100 * h.vida / vm));
      return `<button class="heroi ${act && act.id === h.id && hs.length > 1 ? 'activo' : ''} ${h.estado === 'caido' ? 'caido' : ''}" ${clicavel ? `data-act="heroi" data-v="${h.id}"` : 'data-act="tab" data-v="ficha"'}>
        <b>${esc(h.nome)}</b><div class="barra"><span style="width:${pct}%"></span></div>
        <span class="st">♥ ${h.vida}/${vm}${h.focoMax ? ` · ✦ ${h.foco}` : ''} · ${D.classes[h.cls].nome}</span></button>`;
    }).join('')}<button class="heroi" data-act="tab" data-v="mochila" style="min-width:auto"><b>◈ ${s.ouro}</b><span class="st">moedas</span></button></div>`;
  }

  /* ------------------------------------------------------------ jogo */
  function telaJogo() {
    const s = S(), e = s.exp;
    if (ui.expId !== e.seed) { ui.expId = e.seed; ui.tudo = false; ui.vistos = ultimaJogada(e.log); }
    const pips = Array.from({ length: 6 }, (_, i) => `<i class="${i < e.clock ? 'on' : ''}"></i>`).join('');
    const L = e.log;
    const ini = ui.tudo ? 0 : Math.max(0, L.length - 140);
    let hist = ini > 0 ? `<button class="anteriores" data-act="tudo">Mostrar ${ini} entradas anteriores</button>` : '';
    for (let i = ini; i < L.length; i++) hist += entrada(L[i], i);
    return `<div class="topo"><div class="tit"><small>${esc(e.local)}</small><h1>${esc(e.titulo)}</h1></div>
        <div class="relogio" title="Tensão: quando enche, algo acontece"><div class="pips">${pips}</div>tensão</div>
        <button class="btn-ic" data-act="tab" data-v="menu" aria-label="Menu">☰</button></div>
      ${barraGrupo(true)}
      <div class="historia" id="hist">${hist}</div>
      ${doca()}
      ${tabs(['historia', 'ficha', 'mochila', 'mapa', 'diario'])}`;
  }
  function ultimaJogada(L) { for (let i = L.length - 1; i >= 0; i--) if (L[i].k === 'you') return i; return 0; }
  function entrada(l, i) {
    const k = l.k;
    if (k === 'title') return `<h2 class="t-title" data-i="${i}">${esc(l.t)}</h2>`;
    if (k === 'roll') return `<p class="t-roll" data-i="${i}">🎲 ${fmt(l.t)}</p>`;
    return `<p class="t-${k}" data-i="${i}">${fmt(l.t)}</p>`;
  }
  function posScroll() {
    const h = $app.querySelector('#hist');
    if (!h) return;
    const e = S().exp;
    const alvo = ui.vistos;
    ui.vistos = e.log.length;
    let el = null;
    if (alvo >= 0) el = h.querySelector(`[data-i="${alvo}"]`);
    h.style.scrollBehavior = 'auto';
    if (el) h.scrollTop = Math.max(0, el.offsetTop - h.offsetTop - 6);
    else h.scrollTop = h.scrollHeight;
    h.style.scrollBehavior = '';
  }

  function doca() {
    const s = S(), e = s.exp;
    const t = G.estadoTeste();
    if (t) {
      const faces = [1, 2, 3, 4, 5, 6].map(n => `<button class="face" data-act="face" data-v="${n}" aria-label="${n}">${pips(n)}</button>`).join('');
      const mods = t.morte ? '' : `<div class="mods">${t.mods.length ? t.mods.map(m => `${esc(m[0])} ${m[1] > 0 ? '+' : '−'}${Math.abs(m[1])}`).join(' · ') + ' = ' : ''}<b>modificador ${t.mod >= 0 ? '+' : '−'}${Math.abs(t.mod)}</b>${t.ajuda ? ' (com ajuda)' : ''}</div>`;
      const leg = t.morte
        ? '<span>1–2 morte</span><span>3–4 inconsciente</span><span>5–6 levanta-se</span>'
        : '<span>1–2 falha</span><span>3–4 parcial</span><span>5+ sucesso</span><span>1 falha sempre · 6 acerta sempre</span>';
      const ajud = t.ajudantes.length ? `<div class="ajud">${t.ajudantes.map(a => `<button data-act="ajuda" data-v="${a.id}" class="${t.ajuda === a.id ? 'on' : ''}">${esc(a.nome)} ajuda (+1, partilha o risco)</button>`).join('')}</div>` : '';
      return `<div class="doca com-tabs"><div class="dado">
        <div class="q">${esc(t.rotulo.replace(/\s*Lança 1D6\.?$/, ''))}</div>${mods}
        <div class="leg">${leg}</div>${ajud}
        <div class="faces">${faces}</div>
        <div class="nota">Lança o teu dado e toca no resultado.</div></div></div>`;
    }
    const sug = G.sugestoes();
    const prim = sug.filter(x => x.t === 'cena' || x.t === 'combate');
    const resto = sug.filter(x => !(x.t === 'cena' || x.t === 'combate'));
    const lim = ui.mais ? resto.length : Math.max(0, 7 - prim.length);
    let chips = prim.concat(resto.slice(0, lim)).map(x => `<button class="sug ${x.t || ''}" data-act="sug" data-v="${esc(x.c)}">${esc(x.l)}</button>`).join('');
    if (resto.length > lim) chips += `<button class="sug mais" data-act="mais">mais ${resto.length - lim}…</button>`;
    else if (ui.mais && resto.length > 4) chips += `<button class="sug mais" data-act="mais">menos</button>`;
    const act = G.actor();
    const quem = s.herois.filter(h => h.estado === 'ok').length > 1 && act ? `<div class="quem">A agir: <b>${esc(act.nome)}</b>${e.combat ? ' (vez de combate)' : ' · toca num herói para mudar'}</div>` : '';
    return `<div class="doca com-tabs">${quem}<div class="sugs">${chips}</div>
      <form class="cmd" data-form="cmd"><input id="cmdIn" autocomplete="off" autocapitalize="off" enterkeyhint="send" placeholder="${e.combat ? 'Em combate! O que fazes?' : 'O que fazes?'}"><button aria-label="Enviar">➤</button></form></div>`;
  }
  function pips(n) {
    const P = { 1: [4], 2: [2, 6], 3: [2, 4, 6], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }[n];
    return Array.from({ length: 9 }, (_, i) => `<i class="${P.includes(i) ? 'v' : ''}"></i>`).join('');
  }
  function tabs(lista) {
    const T = { historia: ['❦', 'História'], aldeia: ['⌂', 'Aldeia'], ficha: ['☉', 'Ficha'], mochila: ['◈', 'Mochila'], mapa: ['▦', 'Mapa'], diario: ['✎', 'Diário'], menu: ['☰', 'Menu'] };
    return `<nav class="tabs">${lista.map(k => `<button data-act="tab" data-v="${k}" class="${(ui.folha || (S() && S().exp ? 'historia' : 'aldeia')) === k ? 'on' : ''}"><span>${T[k][0]}</span>${T[k][1]}</button>`).join('')}</nav>`;
  }

  /* ------------------------------------------------------------ aldeia */
  function telaAldeia() {
    const s = S();
    const ms = G.missoesDisponiveis();
    const aptos = s.herois.filter(h => h.estado === 'ok').length;
    const relato = s.log.slice(-8);
    const feridos = s.herois.some(h => h.estado !== 'morto' && h.vida < G.vmax(h));
    const sobe = s.herois.filter(h => G.podeSubir(h));
    const custo = s.herois.filter(h => h.estado !== 'morto').length;
    return `<div class="topo"><div class="tit"><small>${esc(D.regiao.nome)} · dia ${s.dia}</small><h1>${esc(D.regiao.aldeia)}</h1></div>
        <button class="btn-ic" data-act="tab" data-v="menu" aria-label="Menu">☰</button></div>
      ${barraGrupo(false)}
      <div class="aldeia">
        ${relato.length ? `<div class="sec">Últimas notícias</div><div class="cartao relato">${relato.map(l => l.k === 'title' ? `<h3>${esc(l.t)}</h3>` : `<p class="${l.k === 'narr' ? '' : 't-' + l.k}">${fmt(l.t)}</p>`).join('')}</div>` : ''}
        ${sobe.length ? `<div class="cartao" style="border-color:var(--ouro)"><h3>✦ Experiência suficiente</h3><p class="sans peq">${sobe.map(h => esc(h.nome)).join(', ')} ${sobe.length > 1 ? 'podem' : 'pode'} subir de nível.</p><button class="btn peq" data-act="tab" data-v="ficha">Abrir a ficha</button></div>` : ''}
        <div class="sec">Quadro de missões</div>
        ${ms.length ? ms.map(m => `<div class="cartao missao"><span class="rec">${m.recompensa} ◈</span><h3>${esc(m.titulo)}</h3>
            <div class="meta">${esc(m.categoria)} · ${esc(m.local)} · ${esc(D.masmorras[m.tipo].nome)}</div>
            <p class="gancho">${esc(m.gancho)}</p>
            <button class="btn" data-act="partir" data-v="${m.id}" ${aptos ? '' : 'disabled'}>Partir em expedição</button></div>`).join('')
          : '<div class="cartao"><p>Não há trabalho no quadro hoje. Descansa na estalagem: amanhã há sempre rumores novos.</p></div>'}
        <div class="sec">Corvamonte</div>
        <div class="cartao"><p>${esc(G.descricaoAldeia())}</p></div>
        <div class="cartao"><h3>Estalagem do Corvo Manco</h3>
          <p class="sans peq">Uma noite de sono: todos recuperam a Vida e o Foco, e passa um dia (há rumores novos no quadro). ${custo} ${custo === 1 ? 'moeda' : 'moedas'}.</p>
          <button class="btn ${feridos ? '' : 'sec2'}" data-act="estalagem">Dormir na estalagem</button></div>
        <div class="cartao"><h3>Mercado</h3>${loja('mercado')}</div>
        <div class="cartao"><h3>Forja de Anselmo</h3>${s.flags.tome_salvo ? '<p class="sans peq mudo">Desconto de 20% por teres salvo o Tomé.</p>' : ''}${loja('ferreiro')}</div>
        <div class="cartao"><h3>A companhia</h3>
          <p class="sans peq">${s.herois.filter(h => h.estado !== 'morto').map(h => `${esc(h.nome)} (${D.classes[h.cls].nome}, nível ${h.nivel})`).join(' · ')}</p>
          ${s.herois.length < 4 ? '<button class="btn sec2 peq" data-act="recrutar">Recrutar outro herói (co-op)</button>' : ''}
          ${s.cemiterio.length ? `<p class="sans peq mudo">No cemitério: ${s.cemiterio.map(c => esc(c.nome)).join(', ')}.</p>` : ''}</div>
      </div>
      ${tabs(['aldeia', 'ficha', 'mochila', 'diario', 'menu'])}`;
  }
  function loja(nome) {
    const s = S();
    return G.loja(nome).map(it => `<div class="linha"><div class="n">${esc(it.nome)} <small>${esc(it.desc || '')}</small></div>
      <button class="btn peq" data-act="comprar" data-v="${it.id}" data-l="${nome}" ${s.ouro >= it.preco ? '' : 'disabled'}>${it.preco} ◈</button></div>`).join('');
  }

  /* ------------------------------------------------------------ folhas */
  function folha() {
    const T = { ficha: 'Ficha', mochila: 'Mochila', mapa: 'Diário de mapa', diario: 'Diário', menu: 'Menu', regras: 'Como se joga', recrutar: 'Recrutar herói', colar: 'Importar campanha' };
    const corpo = { ficha: folhaFicha, mochila: folhaMochila, mapa: folhaMapa, diario: folhaDiario, menu: folhaMenu, regras: folhaRegras, recrutar: folhaRecrutar, colar: folhaColar }[ui.folha]();
    return `<div class="folha-fundo" data-act="fechar-fundo"><div class="folha" role="dialog"><header><h2>${T[ui.folha]}</h2><button class="btn-ic" data-act="fechar" aria-label="Fechar">✕</button></header><div class="corpo">${corpo}</div></div></div>`;
  }

  function folhaFicha() {
    const s = S();
    return s.herois.filter(h => h.estado !== 'morto').map(h => {
      const c = D.classes[h.cls];
      const w = G.arma(h);
      const prox = R.XP[h.nivel];
      const ant = R.XP[h.nivel - 1] || 0;
      const pct = prox ? Math.min(100, Math.round(100 * (h.xp - ant) / (prox - ant))) : 100;
      let subir = '';
      if (G.podeSubir(h) && !s.exp) {
        const ops = Object.keys(R.ATTR).filter(a => h.attr[a] < 3).map(a => `<button class="btn peq sec2" data-act="subir" data-h="${h.id}" data-v="${a}">+1 ${R.ATTR[a]}</button>`);
        if (h.focoMax > 0) ops.push(`<button class="btn peq sec2" data-act="subir" data-h="${h.id}" data-v="foco">+1 Foco</button>`);
        ops.push(`<button class="btn peq sec2" data-act="subir" data-h="${h.id}" data-v="vida">+2 Vida extra</button>`);
        subir = `<p class="sans peq" style="color:var(--ouro);font-weight:650">✦ Pode subir ao nível ${h.nivel + 1} (+1 Vida e uma escolha):</p><div style="display:flex;gap:6px;flex-wrap:wrap">${ops.join('')}</div>`;
      } else if (G.podeSubir(h)) subir = '<p class="sans peq" style="color:var(--ouro)">✦ Pode subir de nível quando voltar à aldeia.</p>';
      return `<div class="cartao"><h3>${esc(h.nome)}</h3><div class="meta">${c.nome} · nível ${h.nivel} · ${h.xp} XP${prox ? ' (próximo: ' + prox + ')' : ''}</div>
        <div class="xp"><span style="width:${pct}%"></span></div>
        <p class="sans peq">♥ Vida <b>${h.vida}/${G.vmax(h)}</b>${h.focoMax ? ` · ✦ Foco <b>${h.foco}/${h.focoMax}</b>` : ''}${h.estado === 'caido' ? ' · <b style="color:var(--sangue)">caído</b>' : ''}</p>
        <div class="attrs">${Object.keys(R.ATTR).map(a => `<div><b>+${h.attr[a]}</b>${R.ATTR[a]}</div>`).join('')}</div>
        <p class="sans peq">⚔ ${esc(w.nome)} — ${R.ATTR[w.attr]}, dano ${w.dano}${w.nota ? ' · ' + esc(w.nota) : ''}<br>
        ⛨ ${h.armadura ? esc(D.armaduras[h.armadura].nome) + ' (+' + D.armaduras[h.armadura].vida + ' Vida)' : 'Sem armadura'}${h.escudo ? ' · Escudo' : ''}</p>
        <ul>${c.habs.map(x => `<li>${esc(x)}</li>`).join('')}</ul>${subir}
        ${!s.exp && s.herois.length > 1 ? `<p style="margin-top:10px"><button class="btn peq perigo" data-act="reformar" data-v="${h.id}">Deixar a companhia</button></p>` : ''}</div>`;
    }).join('') + `<p class="sans peq mudo">Testes: 1D6 + atributo + bónus. Total 1–2 falha · 3–4 sucesso parcial · 5+ sucesso. O modificador total fica entre −2 e +3.</p>`;
  }

  function folhaMochila() {
    const s = S();
    const ks = Object.keys(s.mochila);
    const emExp = !!s.exp;
    const combate = emExp && s.exp.combat;
    const hs = s.herois.filter(h => h.estado !== 'morto');
    const linhas = ks.map(k => {
      const d = G.itemDef(k);
      const n = s.mochila[k];
      const btns = [];
      if (D.armas[k] || D.armaduras[k]) {
        if (!combate) hs.forEach(h => btns.push(`<button class="btn peq sec2" data-act="equipar" data-h="${h.id}" data-v="${k}">${hs.length > 1 ? 'Dar a ' + esc(h.nome) : 'Equipar'}</button>`));
      } else if (emExp && ['cura', 'cura_fora', 'santa', 'fogo', 'polvora', 'revelar', 'reliquia'].includes(d.uso)) {
        if (d.uso === 'cura' || d.uso === 'cura_fora') hs.forEach(h => btns.push(`<button class="btn peq" data-act="usar" data-v="${k}" data-h="${h.id}">${hs.length > 1 ? esc(h.nome) : 'Usar'}</button>`));
        else btns.push(`<button class="btn peq" data-act="usar" data-v="${k}">Usar</button>`);
      }
      if (!emExp && G.valorVenda(k) > 0) btns.push(`<button class="btn peq sec2" data-act="vender" data-v="${k}">Vender ${G.valorVenda(k)} ◈</button>`);
      const desc = d.desc || d.nota || (D.armas[k] ? `Arma: ${R.ATTR[D.armas[k].attr]}, dano ${D.armas[k].dano}` : D.armaduras[k] ? `+${D.armaduras[k].vida} Vida máxima` : '');
      return `<div class="linha"><div class="n">${esc(d.nome)}${n > 1 ? ' ×' + n : ''}<small>${esc(desc)}</small></div><div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end">${btns.join('')}</div></div>`;
    }).join('');
    return `<div class="cartao"><h3>◈ ${s.ouro} moedas de ouro</h3><p class="sans peq mudo">A bolsa e a mochila são partilhadas por toda a companhia. Lanternas, gazuas, cordas e pés-de-cabra funcionam sozinhos, desde que estejam na mochila.</p></div>
      <div class="cartao">${linhas || '<p class="mudo">A mochila está vazia.</p>'}</div>`;
  }

  function folhaMapa() {
    const s = S();
    if (!s.exp) return '<p>O diário de mapa só existe durante uma expedição.</p>';
    const e = s.exp;
    const zs = G.zonasVisitadas();
    return `<p class="sans peq mudo">A aplicação nunca desenha o mapa: aqui tens, por escrito, tudo o que já exploraste, para confirmares ou refazeres o desenho. Grelha ${e.dg.W} colunas (A–${CP.C.col(e.dg.W - 1)}) × ${e.dg.H} linhas, linha 1 em baixo, norte em cima. Legenda: E escadas · X inimigo · T armadilha.</p>` +
      zs.sort((a, b) => (b === e.zone) - (a === e.zone)).map(id => {
        const d = G.descricaoZona(id);
        return `<div class="cartao ${d.aqui ? 'aqui' : ''}"><h3>${esc(d.nome)}${d.aqui ? ' <span class="sans peq" style="color:var(--sangue)">· estás aqui (' + CP.C.n(e.pos[0], e.pos[1]) + ')</span>' : ''}</h3>
          <p class="peq">${esc(d.desc)}</p><ul>${d.linhas.map(l => `<li>${fmt(l)}</li>`).join('')}</ul></div>`;
      }).join('');
  }

  function folhaDiario() {
    const s = S();
    let h = '';
    if (s.exp) {
      const ps = G.pistasEncontradas();
      h += `<div class="sec">Pistas desta aventura (${ps.filter(p => p.achada).length}/${ps.length})</div>` + ps.map(p => p.achada
        ? `<div class="cartao"><h3>${esc(p.nome)}</h3><p class="peq">${esc(p.texto)}</p></div>`
        : `<div class="cartao"><h3 class="mudo">? ? ?</h3><p class="sans peq mudo">Ainda por descobrir.</p></div>`).join('');
    }
    const feitas = Object.keys(s.missoes).filter(id => s.missoes[id].estado === 'feita' && D.missoes[id]);
    if (feitas.length) h += `<div class="sec">Missões cumpridas</div><div class="cartao"><ul>${feitas.map(id => `<li>${esc(D.missoes[id].titulo)} — ${esc((D.missoes[id].desfechos[s.missoes[id].resultado] || {}).titulo || '')}</li>`).join('')}</ul></div>`;
    const locais = Object.keys(s.locais);
    if (locais.length) h += `<div class="sec">Locais visitados</div><p class="sans peq">${locais.map(esc).join(' · ')}</p>`;
    h += `<div class="sec">Crónica da campanha</div>` + (s.diario.length ? s.diario.slice().reverse().slice(0, 80).map(d => `<div class="linha"><div class="n">${fmt(d.t)}<small>Dia ${d.dia}</small></div></div>`).join('') : '<p class="mudo">Ainda não há nada para contar.</p>');
    if (s.cemiterio.length) h += `<div class="sec">Cemitério de Corvamonte</div>` + s.cemiterio.map(c => `<div class="linha"><div class="n">✝ ${esc(c.nome)}<small>${D.classes[c.cls].nome}, nível ${c.nivel}. Caiu em ${esc(c.onde)}, no dia ${c.dia}.</small></div></div>`).join('');
    return h;
  }

  function folhaMenu() {
    const s = S();
    const temas = { auto: 'Automático', claro: 'Claro', escuro: 'Escuro' };
    return `<div class="cartao"><h3>Campanha</h3>
        <p class="sans peq mudo">${s ? `Dia ${s.dia} · ${s.modo === 'coop' ? 'cooperativo' : 'solo'} · gravação automática neste aparelho.` : ''}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn" data-act="exportar">Exportar ficheiro</button>
          <button class="btn sec2" data-act="copiar">Copiar como texto</button>
          <button class="btn sec2" data-act="importar">Importar ficheiro</button>
          <button class="btn sec2" data-act="colar">Colar texto</button></div></div>
      <div class="cartao"><h3>Ajuda</h3><div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn sec2" data-act="regras">Regras e como se joga</button>
        ${s && s.exp ? '<button class="btn sec2" data-act="sug" data-v="#ajuda">Lista de acções</button>' : ''}</div></div>
      <div class="cartao"><h3>Aparência</h3><div style="display:flex;gap:8px">${Object.keys(temas).map(t => `<button class="btn peq ${ui.tema === t ? '' : 'sec2'}" data-act="tema" data-v="${t}">${temas[t]}</button>`).join('')}</div></div>
      ${s && s.exp ? `<div class="cartao"><h3>Expedição</h3><p class="sans peq mudo">Abandonar conta como retirada: guardas o que encontraste, mas não cumpres a missão.</p><button class="btn perigo" data-act="abandonar">Abandonar a expedição</button></div>` : ''}
      <div class="cartao"><h3>Recomeçar</h3><p class="sans peq mudo">Apaga a campanha deste aparelho. Exporta-a primeiro se a quiseres guardar.</p><button class="btn perigo" data-act="apagar">Apagar campanha</button></div>
      <p class="sans peq mudo" style="text-align:center">Crónicas das Profundezas · funciona sem internet</p>`;
  }

  function folhaRecrutar() {
    if (!ui.rec) ui.rec = { nome: '', cls: 'ladrao' };
    const r = ui.rec;
    return `<p class="sans peq mudo">Cada herói extra é outro jogador à volta da mesa (ou mais um herói teu). Os inimigos ficam mais fortes com grupos maiores.</p>
      <input class="campo" id="nomeRec" maxlength="18" placeholder="Nome do herói" value="${esc(r.nome)}">
      <div class="classes">${Object.keys(D.classes).map(k => `<button class="classe ${r.cls === k ? 'on' : ''}" data-act="rec-cls" data-v="${k}"><b>${D.classes[k].nome}</b><small>${esc(D.classes[k].desc)}</small></button>`).join('')}</div>
      <button class="btn grande" data-act="rec-ok">Juntar à companhia</button>`;
  }

  function folhaColar() {
    return `<p class="sans peq mudo">Cola aqui o texto de uma campanha exportada (substitui a campanha actual).</p>
      <textarea id="colarTxt" class="campo" style="height:180px;padding:10px;font-family:var(--sans);font-size:13px" placeholder='{"jogo":"cronicas-das-profundezas", ...}'></textarea>
      <button class="btn grande" data-act="colar-ok">Importar</button>`;
  }

  function folhaRegras() {
    return `<div class="regras">
      <p>A aplicação é o teu <b>Mestre de Jogo</b>. Narra, descreve as salas, diz-te exactamente o que desenhar e interpreta o teu dado. Tu desenhas a masmorra em papel quadriculado e lanças um dado de seis faces sempre que te for pedido.</p>
      <h3>O mapa</h3>
      <p>No início de cada aventura, prepara uma grelha (normalmente 12 colunas, A a L, e 16 linhas, 1 a 16). A linha 1 fica em baixo e o norte é o topo da folha. Cada sala nova vem com dimensões e coordenadas exactas, e as portas ficam sempre <i>entre</i> dois quadrados (por exemplo, «entre D9 e D10»). As salas encaixam sempre nas ligações existentes. Marca E nas escadas, X nos inimigos e T nas armadilhas.</p>
      <p>No separador <b>Mapa</b> tens a descrição escrita de tudo o que já exploraste.</p>
      <h3>O dado</h3>
      <p>Quando aparecerem os seis dados no ecrã, lança o teu dado físico e toca no resultado. Soma-se o modificador indicado:</p>
      <ul><li><b>1–2</b>: falha — e quase sempre há uma consequência.</li><li><b>3–4</b>: sucesso parcial, ou sucesso com um custo.</li><li><b>5 ou mais</b>: sucesso completo.</li><li>Um <b>1</b> natural falha sempre; um <b>6</b> natural acerta sempre.</li></ul>
      <p>Os modificadores vêm dos atributos (Força, Agilidade, Mente, Sentidos), da classe, do equipamento e da situação. O total fica entre −2 e +3. Não há lançamentos inúteis: mover-te por zonas já desenhadas, abrir portas normais e examinar coisas não exige dado.</p>
      <h3>Acções</h3>
      <p>Escreve o que queres fazer («examinar a vela», «abrir porta norte», «ir para C4», «ouvir», «procurar armadilhas») ou toca numa das acções sugeridas.</p>
      <ul>
        <li><b>Investigar</b>: examinar revela pistas e pormenores. Inscrições antigas pedem um teste de Mente.</li>
        <li><b>Procurar</b>: passagens secretas e coisas escondidas (Sentidos). Uma corrente de ar é bom sinal.</li>
        <li><b>Armadilhas</b>: procura-as antes de atravessar corredores longos. Se não as encontrares, um teste de Agilidade decide se as evitas.</li>
        <li><b>Portas</b>: emperradas pedem Força; trancadas podem ser forçadas (−1, barulhento), arrombadas (Agilidade, com gazuas) ou abertas com a chave, se a encontrares.</li>
        <li><b>Furtividade</b>: para passar por criaturas adormecidas, ou atacá-las de surpresa (+1).</li>
        <li><b>Ouvir</b> a uma porta diz-te o que te espera do outro lado.</li>
      </ul>
      <h3>Combate</h3>
      <p>Curto e perigoso. Cada ataque é um teste: <b>5+</b> acertas sem sofrer nada; <b>3–4</b> trocam golpes; <b>1–2</b> falhas e és atingido. As armas fazem 1 a 3 de dano; um 6 natural faz +1. Fugir é um teste de Agilidade. Usar um objecto a meio da luta dá ao inimigo uma oportunidade (teste de defesa).</p>
      <h3>Tensão</h3>
      <p>O relógio de tensão (seis círculos, em cima) enche quando fazes barulho, procuras devagar ou descansas. Quando enche, a masmorra reage: uma criatura errante, um sinal, um susto.</p>
      <h3>Recuperação, morte e retirada</h3>
      <p>Poções e bandagens curam; podes descansar duas vezes por expedição (cura 2, mas enche a tensão). Na aldeia, a estalagem cura tudo. Ao chegar a 0 de Vida, lança 1D6: <b>1–2</b> morte, <b>3–4</b> inconsciente, <b>5–6</b> levantas-te com 1 de Vida. Podes retirar-te a qualquer momento pelas escadas: perdes a recompensa, mas não a vida.</p>
      <h3>Cooperativo</h3>
      <p>Até quatro heróis, um por jogador, no mesmo telemóvel e no mesmo mapa. Toca num herói para escolher quem age; em combate, a vez passa por ordem. Num teste, outro herói pode ajudar (+1), mas se falharem, também sofre 1 de dano. Os inimigos ficam mais duros com grupos maiores.</p>
      <h3>Progressão e mundo</h3>
      <p>As missões dão ouro e experiência. Na aldeia compras equipamento, sobes de nível e escolhes a próxima missão. As tuas escolhas mudam o vale: personagens salvas tornam-se aliadas, lojas mudam, novas missões aparecem. Quando acabam as missões do quadro, a taberna tem sempre rumores novos.</p>
    </div>`;
  }

  /* ------------------------------------------------------------ acções */
  function lerNome(id) { const i = document.getElementById(id); return i ? i.value.trim() : ''; }

  $app.addEventListener('click', ev => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    const a = b.dataset.act, v = b.dataset.v;
    if (a === 'fechar-fundo' && ev.target !== b) return;
    if (ui.confirmar && a !== 'sim' && a !== 'nao') return;
    switch (a) {
      case 'continuar': G.load(); break;
      case 'nova': ui.screen = 'nova'; ui.criar = null; break;
      case 'capa': ui.screen = 'capa'; ui.criar = null; break;
      case 'modo': ui.criar.herois[ui.criar.idx].nome = lerNome('nomeHeroi'); ui.criar.n = +v; ui.criar.modo = +v > 1 ? 'coop' : 'solo'; while (ui.criar.herois.length < +v) ui.criar.herois.push({ nome: '', cls: ['ladrao', 'explorador', 'mistico', 'guerreiro'][ui.criar.herois.length - 1] }); ui.criar.herois.length = +v; break;
      case 'cls': ui.criar.herois[ui.criar.idx].nome = lerNome('nomeHeroi'); ui.criar.herois[ui.criar.idx].cls = v; break;
      case 'criar-voltar': ui.criar.herois[ui.criar.idx].nome = lerNome('nomeHeroi'); ui.criar.idx--; break;
      case 'criar-ok': {
        const c = ui.criar;
        c.herois[c.idx].nome = lerNome('nomeHeroi') || sugerirNome(c.herois[c.idx].cls, c.idx);
        if (c.idx < c.n - 1) { c.idx++; break; }
        if (c.nova) {
          G.novaCampanha(c.modo);
          c.herois.forEach(h => G.criarHeroi(h.nome, h.cls));
          G.log('title', 'Corvamonte');
          G.log('narr', `Chegas a Corvamonte ao cair da tarde, com ${c.n > 1 ? 'os teus companheiros e ' : ''}poucas moedas no bolso. ${D.regiao.descricao} No adro da igreja, um quadro de madeira cheio de papéis pregados: gente que precisa de alguém que não tenha medo do escuro.`);
          G.log('sys', 'Escolhe uma missão no quadro. Tem à mão papel quadriculado, um lápis e o teu dado.');
        } else c.herois.forEach(h => G.criarHeroi(h.nome, h.cls));
        G.save();
        ui.criar = null; ui.screen = 'jogo'; ui.rolarAldeia = true;
        break;
      }
      case 'sug': ui.folha = null; ui.mais = false; G.input(v); vibra(); break;
      case 'face': G.roll(+v); vibra(10); break;
      case 'ajuda': G.ajudar(v); break;
      case 'heroi': G.setActor(v); break;
      case 'mais': ui.mais = !ui.mais; break;
      case 'tudo': ui.tudo = true; ui.vistos = 0; break;
      case 'tab': ui.folha = (v === 'historia' || v === 'aldeia' || ui.folha === v) ? null : v; break;
      case 'fechar': case 'fechar-fundo': ui.folha = null; ui.rec = null; break;
      case 'regras': ui.folha = 'regras'; break;
      case 'partir': G.partir(v); ui.folha = null; ui.vistos = -1; ui.expId = null; break;
      case 'estalagem': G.descansarEstalagem(); ui.rolarAldeia = true; toast('Uma noite bem dormida.'); break;
      case 'comprar': if (G.comprar(v, b.dataset.l)) toast('Comprado: ' + G.itemDef(v).nome); break;
      case 'vender': G.vender(v); break;
      case 'equipar': G.equipar(b.dataset.h, v); toast('Equipado.'); break;
      case 'usar': ui.folha = null; G.input(`#usar ${v}${b.dataset.h ? ' ' + b.dataset.h : ''}`); break;
      case 'subir': G.subirNivel(b.dataset.h, v); toast('Nível acima!'); break;
      case 'reformar': ui.confirmar = { texto: 'Este herói deixa a companhia para sempre. Continuar?', ok: 'Deixar partir', perigo: true, fn: () => G.removerHeroi(v) }; break;
      case 'recrutar': ui.folha = 'recrutar'; ui.rec = null; break;
      case 'rec-cls': ui.rec.nome = lerNome('nomeRec'); ui.rec.cls = v; break;
      case 'rec-ok': {
        const nome = lerNome('nomeRec') || sugerirNome(ui.rec.cls, S().herois.length);
        G.criarHeroi(nome, ui.rec.cls);
        if (S().herois.length > 1) S().modo = 'coop';
        G.save(); ui.folha = null; ui.rec = null; toast(nome + ' junta-se à companhia.');
        break;
      }
      case 'exportar': exportar(); break;
      case 'importar': importar(); return;
      case 'abandonar': ui.confirmar = { texto: 'Abandonar a expedição? A missão fica por cumprir, mas guardas o que encontraste.', ok: 'Abandonar', perigo: true, fn: () => { G.desistir(); ui.folha = null; ui.rolarAldeia = true; } }; break;
      case 'apagar': ui.confirmar = { texto: 'Apagar toda a campanha deste aparelho? Não há volta atrás.', ok: 'Apagar', perigo: true, fn: () => { G.reset(); ui.folha = null; ui.screen = 'capa'; } }; break;
      case 'sim': { const f = ui.confirmar && ui.confirmar.fn; ui.confirmar = null; if (f) f(); break; }
      case 'nao': ui.confirmar = null; break;
      case 'copiar': { const t = CP.Store.exportar(S()); try { navigator.clipboard.writeText(t).then(() => toast('Campanha copiada. Cola-a num ficheiro ou nota.'), () => toast('Não foi possível copiar.')); } catch (e) { toast('Não foi possível copiar.'); } return; }
      case 'colar-ok': {
        const ta = document.getElementById('colarTxt');
        try { const c = CP.Store.importar(ta.value); G.setState(c); ui.folha = null; ui.expId = null; toast('Campanha importada.'); }
        catch (e) { toast('Texto inválido: ' + e.message); return; }
        break;
      }
      case 'colar': ui.folha = 'colar'; break;
      case 'tema': ui.tema = v; try { localStorage.setItem('cronicas_tema', v); } catch (e) { /* */ } break;
    }
    render();
  });

  $app.addEventListener('submit', ev => {
    ev.preventDefault();
    const inp = document.getElementById('cmdIn');
    const t = inp && inp.value.trim();
    if (!t) return;
    ui.mais = false;
    G.input(t);
    ui.focar = !G.estadoTeste();
    render();
  });

  function vibra(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 8); } catch (e) { /* */ } }
  function sugerirNome(cls, i) {
    const N = { guerreiro: ['Brites', 'Gonçalo', 'Urraca'], ladrao: ['Lázaro', 'Mécia', 'Rato'], explorador: ['Vasco', 'Aldonça', 'Fernão'], mistico: ['Irene', 'Tristão', 'Leonor'] };
    return N[cls][i % 3];
  }

  function exportar() {
    const s = S(); if (!s) return;
    const blob = new Blob([CP.Store.exportar(s)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cronicas-campanha-dia-${s.dia}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Campanha exportada.');
  }
  function importar() {
    const i = document.createElement('input');
    i.type = 'file'; i.accept = 'application/json,.json';
    i.onchange = () => {
      const f = i.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try { const c = CP.Store.importar(r.result); G.setState(c); ui.folha = null; ui.expId = null; toast('Campanha importada.'); }
        catch (e) { toast('Não foi possível importar: ' + e.message); }
        render();
      };
      r.readAsText(f);
    };
    i.click();
  }

  matchMedia('(prefers-color-scheme: dark)').addEventListener && matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (ui.tema === 'auto') aplicarTema(); });

  /* ------------------------------------------------------------ arranque */
  G.load();
  render();
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* sem modo offline */ });
  }
})(window.CP);
