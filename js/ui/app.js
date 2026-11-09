/* Interface: livro de aventuras para telemóvel. Só lê o estado do motor e envia acções. */
(function (CP) {
  'use strict';
  const G = CP.Game, D = CP.DATA, R = CP.Rules;
  const $app = document.getElementById('app');
  const ui = { mapaOculto: lerPref('cronicas_mapa') === 'oculto', mapaZoom: false, screen: 'capa', folha: null, criar: null, tudo: false, mais: false, vistos: -1, expId: null, tema: lerTema() };

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
  function lerPref(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lerTema() { try { return localStorage.getItem('cronicas_tema') || 'auto'; } catch (e) { return 'auto'; } }
  function aplicarTema() {
    const t = 'pixel';
    document.documentElement.dataset.tema = t;
    const m = document.querySelector('meta[name=theme-color]');
    if (m) m.content = '#1c1520';
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
    sons(s);
    if (s && s.exp) posScroll();
    else if (s && !s.exp && !ui.folha && ui.rolarAldeia) { ui.rolarAldeia = false; const a = $app.querySelector('.aldeia'); if (a) a.scrollTop = 0; }
    const cx = $app.querySelector('#mapaCaixa');
    const tu = $app.querySelector('#mpTu');
    if (cx && tu) { const r = tu.getBoundingClientRect(), c = cx.getBoundingClientRect(); cx.scrollLeft += (r.left + r.width / 2) - (c.left + c.width / 2); cx.scrollTop += (r.top + r.height / 2) - (c.top + c.height / 2); }
    const inp = $app.querySelector('#cmdIn');
    if (inp && ui.focar) { inp.focus(); ui.focar = false; }
  }

  /* ------------------------------------------------------------ arte em pixel */
  const A = D.arte;
  function ret(chave, expr, px, cls) {
    const r = A.personagens.indexOf(chave);
    if (r < 0) return '';
    const c = Math.max(0, A.expressoes.indexOf(expr || 'neutral'));
    return `<span class="px ret ${cls || ''}" style="width:${px}px;height:${px}px;background-size:${6 * px}px ${12 * px}px;background-position:${-c * px}px ${-r * px}px"></span>`;
  }
  function ico(item, px) {
    px = px || 24;
    const i = A.objectos.indexOf(A.itens[item] || item);
    if (i < 0) return '';
    return `<span class="px ico" style="width:${px}px;height:${px}px;background-size:${A.objectos.length * px}px ${px}px;background-position:${-i * px}px 0"></span>`;
  }
  function ret2(n, px, cls) {
    return `<span class="px ret2 ${cls || ''}" style="width:${px}px;height:${px}px;background-size:${40 * px}px ${px}px;background-position:${-(n - 1) * px}px 0"></span>`;
  }
  const p39De = (k, tipo) => A.p39[k] || A.porTipoP39[tipo] || 24;
  function retFalaHtml(k, px) { if (A.p39[k]) return ret2(A.p39[k], px); const r = A.npcs[k] || ['bard', 'neutral']; return ret(r[0], r[1], px); }
  function retHeroi(h) { return h.retrato || A.porClasse[h.cls]; }
  function retH(h, expr, px) { const k = retHeroi(h); return /^p39:/.test(k) ? ret2(+k.slice(4), px) : ret(k, expr, px); }
  function exprHeroi(h) {
    const s = S(), e = s.exp;
    if (h.estado === 'caido') return 'hurt';
    if (!e) return s.ultimo && s.ultimo.fim === 'sucesso' ? 'happy' : (h.vida < G.vmax(h) / 2 ? 'sad' : 'neutral');
    const ini = ultimaJogada(e.log);
    const lote = e.log.slice(ini);
    if (lote.some(l => l.k === 'bad' && l.t.indexOf(h.nome + ' sofre') === 0)) return 'hurt';
    const u = e.ultimoRes;
    if (u && u.heroi === h.id && u.i >= ini) { if (u.band === 'sucesso') return 'happy'; if (u.band === 'falha') return 'sad'; }
    if (lote.some(l => l.k === 'event' || l.k === 'combat' && /Combate!/.test(l.t) || (l.k === 'draw' && /disparada/.test(l.t)))) return 'surprised';
    if (e.combat) return 'angry';
    if (h.vida <= G.vmax(h) / 3) return 'hurt';
    if (e.completo) return 'happy';
    return 'neutral';
  }
  function seletorOrigem(actual, act) {
    return `<div class="origens">${Object.keys(D.origens).filter(k => !D.origens[k].bloqueado || (S() && S().desbloq && S().desbloq[k])).map(k => `<button class="${actual === k ? 'on' : ''}" data-act="${act}" data-v="${k}"><b>${D.origens[k].nome}</b><small>${esc(D.origens[k].desc)}</small></button>`).join('')}</div>`;
  }
  function seletorRetrato(actual, act) {
    return `<div class="retratos">${A.herois.map(k => `<button class="${actual === k ? 'on' : ''}" data-act="${act}" data-v="${k}" aria-label="${k}">${ret(k, actual === k ? 'happy' : 'neutral', 44)}</button>`).join('')}</div>
      <p class="sans peq mudo" style="margin:-6px 0 4px">Estes mudam de expressão durante o jogo. Ou escolhe um retrato clássico:</p>
      <div class="retratos">${A.heroisP39.map(n => `<button class="${actual === 'p39:' + n ? 'on' : ''}" data-act="${act}" data-v="p39:${n}">${ret2(n, 44)}</button>`).join('')}</div>`;
  }

  /* ------------------------------------------------------------ som */
  function sons(s) {
    if (!CP.Som) return;
    if (!s) return;
    const L = s.exp ? s.exp.log : s.log;
    const chave = s.exp ? 'x' + s.exp.seed : 'aldeia';
    if (ui.somChave !== chave) { const novo = ui.somChave !== undefined && !!s.exp; ui.somChave = chave; ui.somIdx = L.length; if (novo) CP.Som.tocar('porta'); }
    CP.Som.processar(L, ui.somIdx);
    efeitosVisuais(L, ui.somIdx);
    ui.somIdx = L.length;
    CP.Som.setCombate(!!(s.exp && s.exp.combat));
  }

  /* ------------------------------------------------------------ efeitos visuais */
  function efeitosVisuais(L, desde) {
    if (desde >= L.length) return;
    const novos = L.slice(desde);
    let carimbo = null, dano = false, cura = false, ouro = false, pista = false;
    novos.forEach(l => {
      if (l.k === 'res') {
        if (/\(6 natural\)/.test(l.t)) carimbo = ['CRÍTICO!', 'crit'];
        else if (/\(1 natural\)/.test(l.t)) carimbo = ['DESASTRE!', 'mau'];
        else if (/Sucesso parcial/.test(l.t)) carimbo = carimbo || ['PARCIAL', 'meio'];
        else if (/Sucesso/.test(l.t)) carimbo = carimbo || ['SUCESSO!', 'bom'];
        else if (/Falha/.test(l.t)) carimbo = carimbo || ['FALHA', 'mau'];
      }
      if (l.k === 'bad' && /sofre|cai por terra/.test(l.t)) dano = true;
      if (l.k === 'good' && /recupera/.test(l.t)) cura = true;
      if (l.i === 'ouro') ouro = true;
      if (l.k === 'clue' || l.k === 'done') pista = true;
      if (l.k === 'done') carimbo = ['OBJECTIVO!', 'crit'];
      if (l.k === 'tesouro') carimbo = ['TESOURO!', 'crit'];
      if (l.k === 'feito') carimbo = ['FEITO!', 'crit'];
      if (l.k === 'sombra') carimbo = ['SOMBRA!', 'mau'];
    });
    const fx = document.createElement('div');
    fx.className = 'fx';
    if (dano) fx.classList.add('fx-dano');
    else if (cura) fx.classList.add('fx-cura');
    else if (pista) fx.classList.add('fx-ouro');
    if (carimbo) fx.innerHTML = `<div class="carimbo ${carimbo[1]}">${carimbo[0]}</div>`;
    if (ouro && !carimbo) fx.innerHTML = `<div class="moedas">${ico('ouro', 48)}</div>`;
    if (fx.className !== 'fx' || fx.innerHTML) { $app.appendChild(fx); setTimeout(() => fx.remove(), 1300); }
    if (dano) { $app.classList.remove('tremer'); void $app.offsetWidth; $app.classList.add('tremer'); try { navigator.vibrate && navigator.vibrate([40, 30, 60]); } catch (e) { /* */ } }
    const h = $app.querySelector('#hist');
    if (h) h.querySelectorAll('[data-i]').forEach(el => { if (+el.dataset.i >= desde) el.classList.add('novo'); });
  }

  /* ------------------------------------------------------------ capa */
  function telaCapa() {
    const tem = !!CP.Store.load();
    return `<div class="capa">
      <div class="logo">${ico('d6', 96)}
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
      <div class="sec">Origem</div>${seletorOrigem(h.origem || 'humano', 'origem')}
      <div class="sec">Retrato</div>${seletorRetrato(h.ret || A.porClasse[h.cls], 'ret')}
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
        ${retH(h, exprHeroi(h), 40)}<span class="hcol"><b>${esc(h.nome)}</b><span class="barra"><span style="width:${pct}%"></span></span>
        <span class="st">${h.estado === 'caido' && h.morrer ? `<em class="morrer">a morrer: ${h.morrer}</em>` : `♥ ${h.vida}/${vm}${h.focoMax ? ` · ✦ ${h.foco}` : ''}`}</span></span></button>`;
    }).join('')}<button class="heroi ouro" title="Ímpeto: ganhas com cada sucesso, perdes com cada falha. Gasta 2 para +1 num teste."><span class="hcol"><b>Ímpeto</b><span class="impeto">${Array.from({ length: 6 }, (_, i) => `<i class="${i < (s.impeto || 0) ? 'on' : ''}"></i>`).join('')}</span></span></button><button class="heroi ouro" data-act="tab" data-v="mochila" title="${s.exp && s.exp.ganhoOuro ? 'O ouro encontrado só fica seguro quando saíres. Derrota: perdes metade.' : ''}">${ico('ouro', 32)}<span class="hcol"><b>${s.ouro}</b><span class="st">${s.exp && s.exp.ganhoOuro ? `<span class="risco">${s.exp.ganhoOuro} em risco</span>` : 'moedas'}</span></span></button></div>`;
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
        ${indicadorLuz()}
        <div class="relogio" title="Tensão: quando enche, algo acontece"><div class="pips">${pips}</div></div>
        <button class="btn-ic" data-act="tab" data-v="mapa" aria-label="Mapa">▦</button>
        <button class="btn-ic" data-act="tab" data-v="menu" aria-label="Menu">☰</button></div>
      ${barraGrupo(true)}
      ${barraComps()}
      <div class="historia" id="hist">${hist}</div>
      ${doca()}
      ${tabs(['historia', 'ficha', 'mochila', 'mapa', 'diario'])}`;
  }
  function indicadorLuz() {
    const l = G.estadoLuz();
    if (!l) return '';
    if (l.marcas <= 0) return `<button class="luz escuro" data-act="tab" data-v="mochila" title="Às escuras">${ico('tocha', 24)}<span><b>ESCURO</b>×${l.tochas}</span></button>`;
    const pct = Math.round(100 * l.marcas / l.max);
    const nome = l.fonte === 'lanterna' ? 'lanterna' : l.fonte === 'magia' ? 'luz mágica' : 'tocha';
    return `<button class="luz ${l.marcas <= 2 ? 'fraca' : ''}" data-act="tab" data-v="mochila" title="Luz: ${nome}, ${l.marcas} marcas">${ico('tocha', 24)}<span><i class="chama"><i style="width:${pct}%"></i></i>${l.marcas} · ×${l.tochas}</span></button>`;
  }
  function ultimaJogada(L) { for (let i = L.length - 1; i >= 0; i--) if (L[i].k === 'you') return i; return 0; }
  function entrada(l, i) {
    const k = l.k;
    if (k === 'title') return `<h2 class="t-title" data-i="${i}">${esc(l.t)}</h2>`;
    if (k === 'roll') return `<p class="t-roll" data-i="${i}">🎲 ${fmt(l.t)}</p>`;
    if (k === 'oraculo') return `<p class="t-clue" data-i="${i}">${ico('olho', 24)} ${fmt(l.t)}</p>`;
    if (k === 'fala') { return `<div class="t-fala ${l.cena ? 'cena' : ''}" data-i="${i}">${l.ic ? ico(l.ic, 48) : retFalaHtml(l.r, 52)}<div><b>${esc(l.n || '')}</b><p>${fmt(l.t)}</p></div></div>`; }
    if (l.i) return `<p class="t-${k} com-ico" data-i="${i}">${ico(l.i, 24)}<span>${fmt(l.t)}</span></p>`;
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
      const mods = t.morte || t.percalco || t.tabela ? '' : `<div class="mods">${t.mods.length ? t.mods.map(m => `${esc(m[0])} ${m[1] > 0 ? '+' : '−'}${Math.abs(m[1])}`).join(' · ') + ' = ' : ''}<b>modificador ${t.mod >= 0 ? '+' : '−'}${Math.abs(t.mod)}</b>${t.ajuda ? ' (com ajuda)' : ''}</div>`;
      const leg = t.morte
        ? '<span>1–2 morte</span><span>3–4 inconsciente</span><span>5–6 levanta-se</span>'
        : t.tabela ? t.tabela.map((x, i) => `<span class="${x.usado ? 'riscado' : ''}">${i + 1}: ${esc(x.t)}</span>`).join('')
        : t.percalco ? D.percalcos.map((x, i) => `<span>${i + 1}: ${esc(x.t.split(/[.:]/)[0])}</span>`).join('')
        : '<span>1–2 falha</span><span>3–4 parcial</span><span>5+ sucesso</span><span>1 falha sempre · 6 acerta sempre</span>';
      const impB = t.podeImpeto ? `<button data-act="impeto" class="${t.impeto ? 'on' : ''}">⚡ Ímpeto (+1, gasta 2)</button>` : '';
      const sorteB = t.podeSorte ? `<button data-act="sorte" class="${t.sorte ? 'on' : ''}">🍀 Usar a sorte (+2, uma vez por expedição)</button>` : '';
      const ajud = (t.ajudantes.length && !t.percalco && !t.tabela) || sorteB || impB ? `<div class="ajud">${t.percalco ? '' : t.ajudantes.map(a => `<button data-act="ajuda" data-v="${a.id}" class="${t.ajuda === a.id ? 'on' : ''}">${esc(a.nome)} ajuda (+1, partilha o risco)</button>`).join('')}${sorteB}${impB}</div>` : '';
      return `<div class="doca com-tabs">${painelCombate()}<div class="dado">
        <div class="q">${esc(t.rotulo.replace(/\s*Lança 1D6\.?$/, ''))}</div>${mods}
        <div class="leg">${leg}</div>${ajud}
        <div class="faces">${faces}</div>
        <div class="nota">Lança o teu dado e toca no resultado.</div></div></div>`;
    }
    if (e.escolha) return `<div class="doca com-tabs">${painelBencao()}</div>`;
    const sug = G.sugestoes();
    const prim = sug.filter(x => x.t === 'cena' || x.t === 'combate');
    const resto = sug.filter(x => !(x.t === 'cena' || x.t === 'combate'));
    const lim = ui.mais ? resto.length : Math.max(0, 7 - prim.length);
    let chips = prim.concat(resto.slice(0, lim)).map(x => `<button class="sug ${x.t || ''}" data-act="sug" data-v="${esc(x.c)}">${esc(x.l)}</button>`).join('');
    if (!e.combat) chips += `<button class="sug mais" data-act="tab" data-v="oraculo">${ico('olho', 16)} Oráculo</button>`;
    if (resto.length > lim) chips += `<button class="sug mais" data-act="mais">mais ${resto.length - lim}…</button>`;
    else if (ui.mais && resto.length > 4) chips += `<button class="sug mais" data-act="mais">menos</button>`;
    const act = G.actor();
    const quem = s.herois.filter(h => h.estado === 'ok').length > 1 && act ? `<div class="quem">A agir: <b>${esc(act.nome)}</b>${e.combat ? ' (vez de combate)' : ' · toca num herói para mudar'}</div>` : '';
    return `<div class="doca com-tabs">${painelCombate()}${quem}<div class="sugs">${chips}</div>
      <form class="cmd" data-form="cmd"><input id="cmdIn" autocomplete="off" autocapitalize="off" enterkeyhint="send" placeholder="${e.combat ? 'Em combate! O que fazes?' : 'O que fazes?'}"><button aria-label="Enviar">➤</button></form></div>`;
  }
  function barraComps() {
    const e = S().exp;
    const cs = G.compsExp();
    const sv = e ? (e.sobrev || []).filter(x => !x.morto) : [];
    const caidos = e ? (e.compCaidos || []).map(id => S().comps.find(c => c.id === id)).filter(Boolean) : [];
    if (!cs.length && !sv.length && !caidos.length) return '';
    return `<div class="comps">${cs.map(c => `<span class="comp" title="${esc(D.companheiros[c.tipo].desc)}">${ico(D.companheiros[c.tipo].icone, 16)}${esc(c.nome)} <b>${c.vida}/${c.vidaMax}</b></span>`).join('')}${caidos.map(c => `<span class="comp caido">${ico(D.companheiros[c.tipo].icone, 16)}${esc(c.nome)} caído</span>`).join('')}${sv.length ? `<span class="comp sv">${ico('vida', 16)}Sobrevivente${sv.length > 1 ? 's ×' + sv.length : ''} — leva-o à saída</span>` : ''}</div>`;
  }
  function painelSobrev() {
    const p = G.pendenteSobrev();
    if (!p) return '';
    const quem = p.tipo === 'heroi' ? retH(p.heroi, 'sad', 48) : ico(D.companheiros[p.comp.tipo].icone, 48);
    const tit = p.fase === 'cicatriz' ? `${esc(p.nome)}: que cicatriz fica?` : `${esc(p.nome)} caiu na masmorra. Sobrevive inteiro?`;
    return `<div class="cartao sobrev"><div class="ficha-topo">${quem}<div><h3>${tit}</h3><p class="sans peq mudo" style="margin:0">Lança 1D6 e toca no resultado.</p></div></div>
      <ol class="sans peq talentos">${p.tabela.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
      <div class="faces">${[1, 2, 3, 4, 5, 6].map(n => `<button class="face" data-act="face-sobrev" data-v="${n}" aria-label="${n}">${pips(n)}</button>`).join('')}</div></div>`;
  }
  function cartaoComps() {
    const s = S();
    const max = G.maxComps();
    const meus = s.comps;
    const cheio = meus.length >= max;
    return `<div class="cartao"><h3 class="com-ret">${ret2(A.p39.estalagem, 48)}Companheiros</h3>
      <p class="sans peq">Gente (e bichos) que vai contigo para as profundezas. Agem sozinhos, mas os inimigos também os atacam. Máximo ${max} ${max === 1 ? 'companheiro' : 'companheiros'} ${s.herois.filter(h => h.estado !== 'morto').length > 1 ? 'em cooperativo' : 'a jogar sozinho'}.</p>
      ${meus.map(c => `<div class="linha-loja"><span>${ico(D.companheiros[c.tipo].icone, 24)} <b>${esc(c.nome)}</b> — ${esc(D.companheiros[c.tipo].nome)} · ♥ ${c.vidaMax}${c.estado === 'ferido' ? ' · <span style="color:var(--sangue)">ferido</span>' : ''}${c.missoes ? ` · ${c.missoes} ${c.missoes === 1 ? 'missão' : 'missões'}` : ''}<br><small class="mudo">${esc(D.companheiros[c.tipo].desc)}</small></span><button class="btn peq sec2" data-act="despedir" data-v="${c.id}">Despedir</button></div>`).join('')}
      ${cheio ? '' : Object.keys(D.companheiros).map(k => { const d = D.companheiros[k]; return `<div class="linha-loja"><span>${ico(d.icone, 24)} <b>${esc(d.nome)}</b> · ♥ ${d.vida}<br><small class="mudo">${esc(d.desc)}</small></span><button class="btn peq" data-act="contratar" data-v="${k}" ${s.ouro < d.preco ? 'disabled' : ''}>${d.preco} ◈</button></div>`; }).join('')}</div>`;
  }
  function listaFacanhas(L) {
    return `<ul class="facanhas">${L.map(f => `<li class="${f.ok ? 'ok' : ''}">${f.ok ? '✓' : '·'} ${esc(f.nome)} <b>+${f.xp} XP</b>${f.prog ? ` <small class="mudo">${f.prog}</small>` : ''}</li>`).join('')}</ul>`;
  }
  const RAR = { comum: 'Comum', raro: 'Raro', lendario: 'Lendário' };
  function cartaPassivo(id, act, extra) {
    const p = D.passivos[id];
    return `<button class="carta-pass ${p.raridade}" data-act="${act}" data-v="${id}"${extra || ''}>${ico(p.icone, 32)}<span class="hcol"><b>${esc(p.nome)}</b><small>${RAR[p.raridade]}</small><span class="d">${esc(p.desc)}</span></span></button>`;
  }
  function painelBencao() {
    const e = S().exp;
    if (!e || !e.escolha) return '';
    return `<div class="escolha"><div class="q">✦ Escolhe uma bênção <span class="mudo sans peq">(dura até saíres da masmorra)</span></div>
      <div class="cartas">${e.escolha.opcoes.map(id => cartaPassivo(id, 'bencao')).join('')}</div>
      <button class="sug mais" data-act="bencao-nao">Recusar</button></div>`;
  }
  function painelReliquia() {
    const o = G.ofertaReliquia();
    if (!o) return '';
    const cheio = o.cheio;
    return `<div class="cartao reliq"><h3 class="com-ret">${ico('estrela', 32)}Uma relíquia para a companhia</h3>
      <p class="sans peq">Depois da missão, o velho Tobias abre o baú do santuário. Escolhe uma relíquia: fica contigo para sempre (máximo ${S().slots}).${cheio ? ' <b>Já tens o máximo: escolhe e depois indica qual deixas.</b>' : ''}</p>
      ${ui.relEscolhida ? `<p class="sans peq">Deixar no santuário:</p><div class="cartas">${o.atuais.map(id => cartaPassivo(id, 'rel-largar')).join('')}</div><button class="sug mais" data-act="rel-cancelar">Voltar</button>`
        : `<div class="cartas">${o.opcoes.map(id => cartaPassivo(id, 'reliquia')).join('')}</div><button class="sug mais" data-act="rel-nao">Recusar</button>`}</div>`;
  }
  function relatorio() {
    const u = S().ultimo;
    if (!u || !u.relatorio || ui.relVisto === u) return '';
    const r = u.relatorio;
    const T = { sucesso: ['Missão cumprida', 'bom'], retirada: ['Retirada', 'meio'], derrota: ['Derrota', 'mau'], morte: ['A companhia caiu', 'mau'] }[u.fim] || ['Fim', 'meio'];
    const quase = u.fim !== 'sucesso' && r.falta != null ? `<p class="quase">${r.falta <= 1 ? 'Estavas a <b>uma sala</b> do objectivo!' : `Estavas a <b>${r.falta} salas</b> do objectivo.`}</p>` : '';
    return `<div class="cartao relatorio ${T[1]}"><h3>${T[0]} — ${esc(u.titulo)}</h3>${quase}
      <div class="stats">
        <span><b>${r.salas}/${r.salasTot}</b>salas</span><span><b>${r.pistas}/${r.pistasTot}</b>pistas</span>
        <span><b>${r.mortes}</b>inimigos</span><span><b>${r.ouro - r.perdido}</b>ouro trazido</span>
        ${r.perdido ? `<span class="perda"><b>−${r.perdido}</b>ouro perdido</span>` : ''}${u.pontos != null ? `<span class="pts"><b>${u.pontos}</b>pontos do dia</span>` : ''}</div>
      ${u.facanhas ? `<p class="sans peq" style="margin:6px 0 0"><b>Façanhas</b>${u.xpFacanhas ? ` (+${u.xpFacanhas} XP)` : ''}</p>${listaFacanhas(u.facanhas)}` : ''}
      ${r.salvos ? `<p class="sans peq" style="color:var(--ouro)">Salvaste ${r.salvos} ${r.salvos === 1 ? 'sobrevivente' : 'sobreviventes'}.</p>` : ''}
      ${r.dano === 0 && u.fim === 'sucesso' ? '<p class="sans peq" style="color:var(--ouro)">Sem um arranhão!</p>' : ''}
      <button class="btn peq sec2" data-act="rel-visto">Fechar</button></div>`;
  }
  function melhorDiario() {
    const s = S();
    const L = Object.keys(s.diarios).filter(k => s.diarios[k].estado === 'feito');
    if (!L.length) return '';
    const hoje = s.diarios[G.hojeId()];
    const melhor = Math.max.apply(null, L.map(k => s.diarios[k].pontos || 0));
    return `<div class="cartao"><p class="sans peq" style="margin:0">${ico('vela', 16)} Masmorra do dia: ${hoje && hoje.estado === 'feito' ? `hoje fizeste <b>${hoje.pontos}</b> pontos. Volta amanhã para uma nova.` : 'já jogada.'} Melhor resultado: <b>${melhor}</b> (${L.length} ${L.length === 1 ? 'dia' : 'dias'}).</p></div>`;
  }
  function proximoFeito() {
    const s = S();
    const L = D.feitos.filter(f => !s.feitos[f.id]).map(f => ({ f, p: Math.min(1, (s.stats[f.stat] || 0) / f.alvo) })).sort((a, b) => b.p - a.p);
    if (!L.length) return '';
    const { f, p } = L[0];
    return `<div class="cartao feito-prox"><div class="ficha-topo">${ico('estrela', 32)}<div style="flex:1"><h3>Próximo feito: ${esc(f.nome)}</h3>
      <p class="sans peq mudo" style="margin:0">${esc(f.desc)} — <b>${esc(f.premioTxt)}</b></p>
      <div class="barra xp"><span style="width:${Math.round(p * 100)}%"></span></div><small class="sans mudo">${Math.min(s.stats[f.stat] || 0, f.alvo)}/${f.alvo}</small></div></div></div>`;
  }
  function listaFeitos() {
    const s = S();
    const n = D.feitos.filter(f => s.feitos[f.id]).length;
    return `<div class="sec">Feitos (${n}/${D.feitos.length})</div>` + D.feitos.map(f => {
      const ok = s.feitos[f.id];
      const v = Math.min(s.stats[f.stat] || 0, f.alvo);
      return `<div class="linha feito ${ok ? 'ok' : ''}"><div class="n">${ok ? '★' : '☆'} ${esc(f.nome)}<small>${esc(f.desc)} ${ok ? '' : `(${v}/${f.alvo})`} → ${esc(f.premioTxt)}</small></div></div>`;
    }).join('');
  }
  function passivosAtivos() {
    const s = S();
    const b = s.exp ? s.exp.bencaos || [] : [];
    let h = '';
    if (s.reliquias.length) h += `<div class="sec">Relíquias (${s.reliquias.length}/${s.slots})</div><div class="cartas">${s.reliquias.map(id => cartaPassivo(id, '', ' disabled')).join('')}</div>`;
    if (b.length) h += `<div class="sec">Bênçãos desta expedição</div><div class="cartas">${b.map(id => cartaPassivo(id, '', ' disabled')).join('')}</div>`;
    return h;
  }
  function painelCombate() {
    const L = G.combateInfo();
    if (!L || !L.length) return '';
    return `<div class="inimigos">${L.map(en => {
      const pct = Math.max(0, Math.round(100 * en.hp / en.hpMax));
      return `<div class="inimigo ${en.boss ? 'boss' : ''}">${ret2(p39De(en.chave, en.tipo), 40, en.hp <= en.hpMax / 2 ? 'ferido' : '')}<span class="hcol"><b>${esc(CP.cap(en.nome))}</b><span class="barra"><span style="width:${pct}%"></span></span><span class="st">♥ ${en.hp}/${en.hpMax}</span><span class="intencao ${en.perigo ? 'perigo' : ''} ${en.int || ''}">${en.intIc} ${esc(en.intTxt)}</span></span></div>`;
    }).join('')}</div>`;
  }
  function pips(n) { return ico('d' + n, 48) + `<b class="num">${n}</b>`; }
  function tabs(lista) {
    const T = { historia: ['livro', 'História'], aldeia: ['caneca', 'Aldeia'], ficha: ['escudo', 'Ficha'], mochila: ['saco', 'Mochila'], mapa: ['mapa', 'Mapa'], diario: ['vela', 'Diário'], menu: ['estrela', 'Menu'] };
    return `<nav class="tabs">${lista.map(k => `<button data-act="tab" data-v="${k}" class="${(ui.folha || (S() && S().exp ? 'historia' : 'aldeia')) === k ? 'on' : ''}">${ico(T[k][0], 26)}${T[k][1]}</button>`).join('')}</nav>`;
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
        ${relatorio()}
        ${painelSobrev()}
        ${painelReliquia()}
        ${painelTalento()}
        ${proximoFeito()}
        ${s.juramento ? `<div class="cartao"><h3 class="com-ret">${ico('estrela', 32)}Juramento da companhia</h3><p class="peq" style="margin:2px 0">${esc(s.juramento.texto)}</p>
          <div class="juramento">${Array.from({ length: 10 }, (_, i) => `<i class="${i < s.juramento.marcas ? 'on' : ''}"></i>`).join('')}</div>
          <p class="sans peq mudo" style="margin:0">${s.juramento.feito ? 'Cumprido!' : 'Cada missão cumprida avança o juramento.'}</p></div>` : ''}
        ${relato.length ? `<div class="sec">Últimas notícias</div><div class="cartao relato">${relato.map(l => l.k === 'title' ? `<h3>${esc(l.t)}</h3>` : `<p class="${l.k === 'narr' ? '' : 't-' + l.k}">${fmt(l.t)}</p>`).join('')}</div>` : ''}
        ${sobe.length && !G.pendenteAldeia() ? `<div class="cartao" style="border-color:var(--ouro)"><h3>✦ Experiência suficiente</h3><p class="sans peq">${sobe.map(h => esc(h.nome)).join(', ')} ${sobe.length > 1 ? 'podem' : 'pode'} subir de nível.</p><button class="btn peq" data-act="tab" data-v="ficha">Abrir a ficha</button></div>` : ''}
        <div class="sec">Quadro de missões</div>
        ${ms.length ? ms.map(m => `<div class="cartao missao ${m.diario ? 'diaria' : ''}"><span class="rec">${m.recompensa} ◈</span><h3>${esc(m.titulo)}</h3>
            <div class="meta">${esc(m.categoria)} · ${esc(m.local)} · ${esc(D.masmorras[m.tipo].nome)}</div>
            <p class="gancho">${esc(m.gancho)}</p>
            <button class="btn" data-act="partir" data-v="${m.id}" ${aptos && !G.pendenteSobrev() ? '' : 'disabled'}>${G.pendenteSobrev() ? 'Primeiro, trata dos feridos' : 'Partir em expedição'}</button></div>`).join('')
          : '<div class="cartao"><p>Não há trabalho no quadro hoje. Descansa na estalagem: amanhã há sempre rumores novos.</p></div>'}
        ${melhorDiario()}
        <div class="sec">Corvamonte</div>
        <div class="cartao"><p>${esc(G.descricaoAldeia())}</p></div>
        <div class="cartao"><h3 class="com-ret">${ret2(A.p39.estalagem, 48)}Estalagem do Corvo Manco</h3>
          <p class="sans peq">Uma noite de sono: todos recuperam a Vida e o Foco, e passa um dia (há rumores novos no quadro). ${custo} ${custo === 1 ? 'moeda' : 'moedas'}.</p>
          <button class="btn ${feridos ? '' : 'sec2'}" data-act="estalagem">Dormir na estalagem</button></div>
        ${cartaoComps()}
        <div class="cartao"><h3 class="com-ret">${ret2(A.p39.mercado, 48)}Mercado</h3>${loja('mercado')}</div>
        <div class="cartao"><h3 class="com-ret">${ret2(A.p39.forja, 48)}Forja de Anselmo</h3>${s.flags.tome_salvo ? '<p class="sans peq mudo">Desconto de 20% por teres salvo o Tomé.</p>' : ''}${loja('ferreiro')}</div>
        <div class="cartao"><h3>A companhia</h3>
          <p class="sans peq">${s.herois.filter(h => h.estado !== 'morto').map(h => `${esc(h.nome)} (${D.classes[h.cls].nome}, nível ${h.nivel})`).join(' · ')}</p>
          ${s.herois.length < 4 ? '<button class="btn sec2 peq" data-act="recrutar">Recrutar outro herói (co-op)</button>' : ''}
          ${s.cemiterio.length ? `<p class="sans peq mudo">No cemitério: ${s.cemiterio.map(c => esc(c.nome)).join(', ')}.</p>` : ''}</div>
      </div>
      ${tabs(['aldeia', 'ficha', 'mochila', 'diario', 'menu'])}`;
  }
  function painelTalento() {
    const p = G.pendenteAldeia();
    if (!p) return '';
    const h = S().herois.find(x => x.id === p.heroi);
    if (p.tipo === 'talento') {
      return `<div class="cartao" style="border-color:var(--ouro)"><div class="ficha-topo">${retH(h, 'happy', 48)}<div><h3>${esc(p.nome)} sobe de nível!</h3><p class="sans peq mudo" style="margin:0">Lança 1D6 para o talento.</p></div></div>
        <ol class="sans peq talentos">${p.tabela.map(t => `<li>${esc(t.nome)}${t.desc ? ' — ' + esc(t.desc) : ''}${t.ja ? ' <span class="mudo">(já tem: +2 Vida)</span>' : ''}</li>`).join('')}</ol>
        <div class="faces">${[1, 2, 3, 4, 5, 6].map(n => `<button class="face" data-act="face-aldeia" data-v="${n}" aria-label="${n}">${pips(n)}</button>`).join('')}</div></div>`;
    }
    return `<div class="cartao" style="border-color:var(--ouro)"><h3>${esc(p.nome)}: escolhe um talento</h3>
      ${p.tabela.filter(t => t.i < 5).map(t => `<button class="btn sec2 grande" style="text-align:left" data-act="talento" data-v="${t.i}">${esc(t.nome)}${t.desc ? ' — ' + esc(t.desc) : ''}</button>`).join('')}</div>`;
  }
  function loja(nome) {
    const s = S();
    return G.loja(nome).map(it => `<div class="linha">${ico(it.id, 32)}<div class="n">${esc(it.nome)} <small>${esc(it.desc || '')}</small></div>
      <button class="btn peq" data-act="comprar" data-v="${it.id}" data-l="${nome}" ${s.ouro >= it.preco ? '' : 'disabled'}>${it.preco} ◈</button></div>`).join('');
  }

  /* ------------------------------------------------------------ folhas */
  function folha() {
    const T = { ficha: 'Ficha', mochila: 'Mochila', mapa: 'Mapa', diario: 'Diário', menu: 'Menu', regras: 'Como se joga', recrutar: 'Recrutar herói', colar: 'Importar campanha', oraculo: 'Oráculo' };
    const corpo = { ficha: folhaFicha, mochila: folhaMochila, mapa: folhaMapa, diario: folhaDiario, menu: folhaMenu, regras: folhaRegras, recrutar: folhaRecrutar, colar: folhaColar, oraculo: folhaOraculo }[ui.folha]();
    return `<div class="folha-fundo" data-act="fechar-fundo"><div class="folha" role="dialog"><header><h2>${T[ui.folha]}</h2><button class="btn-ic" data-act="fechar" aria-label="Fechar">✕</button></header><div class="corpo">${corpo}</div></div></div>`;
  }

  function folhaFicha() {
    const s = S();
    const cs = s.comps.length ? `<div class="sec">Companheiros</div>` + s.comps.map(c => `<div class="linha"><div class="n">${ico(D.companheiros[c.tipo].icone, 24)} ${esc(c.nome)} — ${esc(D.companheiros[c.tipo].nome)} (♥ ${c.estado === 'caido' ? 'caído' : c.vida + '/' + c.vidaMax})<small>${esc(D.companheiros[c.tipo].desc)}</small></div></div>`).join('') : '';
    return passivosAtivos() + cs + s.herois.filter(h => h.estado !== 'morto').map(h => {
      const c = D.classes[h.cls];
      const w = G.arma(h);
      const prox = R.XP[h.nivel];
      const ant = R.XP[h.nivel - 1] || 0;
      const pct = prox ? Math.min(100, Math.round(100 * (h.xp - ant) / (prox - ant))) : 100;
      let subir = '';
      if (G.podeSubir(h) && !s.exp) subir = `<p class="sans peq" style="color:var(--ouro);font-weight:650;margin-bottom:6px">✦ Pode subir ao nível ${h.nivel + 1}: +1 Vida e um talento ao calhas (lança o dado).</p><button class="btn peq" data-act="subir" data-v="${h.id}">Subir de nível</button>`;
      else if (G.podeSubir(h)) subir = '<p class="sans peq" style="color:var(--ouro)">✦ Pode subir de nível quando voltar à aldeia.</p>';
      const tal = (h.talentos || []).map(id => { const t = D.talentos[h.cls].find(x => x.id === id); return t ? `<li><b>${esc(t.nome)}</b>: ${esc(t.desc || '')}</li>` : ''; }).join('');
      const org = D.origens[h.origem || 'humano'];
      return `<div class="cartao"><div class="ficha-topo">${retH(h, exprHeroi(h), 64)}<div><h3>${esc(h.nome)}</h3><div class="meta">${org.nome} · ${c.nome} · nível ${h.nivel} · ${h.xp} XP${prox ? ' (próximo: ' + prox + ')' : ''}</div>
        <div class="xp"><span style="width:${pct}%"></span></div></div></div>
        <p class="sans peq">♥ Vida <b>${h.vida}/${G.vmax(h)}</b>${h.focoMax ? ` · ✦ Foco <b>${h.foco}/${h.focoMax}</b>` : ''}${h.estado === 'caido' ? ' · <b style="color:var(--sangue)">caído</b>' : ''}</p>
        <div class="attrs">${Object.keys(R.ATTR).map(a => `<div><b>+${h.attr[a]}</b>${R.ATTR[a]}</div>`).join('')}</div>
        <p class="sans peq">${ico(h.arma, 24) || '⚔'} ${esc(w.nome)} — ${R.ATTR[w.attr]}, dano ${w.dano}${w.nota ? ' · ' + esc(w.nota) : ''}<br>
        ${h.armadura ? ico(h.armadura, 24) : '⛨'} ${h.armadura ? esc(D.armaduras[h.armadura].nome) + ' (+' + D.armaduras[h.armadura].vida + ' Vida)' : 'Sem armadura'}${h.escudo ? ' · Escudo' : ''}</p>
        <ul>${c.habs.map(x => `<li>${esc(x)}</li>`).join('')}<li><b>${esc(org.nome)}</b> — ${esc(org.desc)}</li>${tal}${(h.cicatrizes || []).map(cid => { const c = D.cicatrizes.find(x => x.id === cid); return c ? `<li style="color:#d08070"><b>Cicatriz: ${esc(c.nome)}</b> — ${esc(c.desc)}</li>` : ''; }).join('')}${h.feridoGrave ? '<li style="color:var(--sangue)">Gravemente ferido: −2 de Vida no início da próxima expedição.</li>' : ''}</ul>${subir}
        ${!s.exp ? `<details class="sans peq" style="margin-top:8px"><summary class="mudo">Mudar retrato</summary>${seletorRetrato(retHeroi(h), 'ret-heroi" data-h="' + h.id)}</details>` : ''}
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
      if (emExp && !combate && G.peso(k) > 0) btns.push(`<button class="btn peq perigo" data-act="largar" data-v="${k}">Largar</button>`);
      const desc = d.desc || d.nota || (D.armas[k] ? `Arma: ${R.ATTR[D.armas[k].attr]}, dano ${D.armas[k].dano}` : D.armaduras[k] ? `+${D.armaduras[k].vida} Vida máxima` : '');
      return `<div class="linha">${ico(k, 32)}<div class="n">${esc(d.nome)}${n > 1 ? ' ×' + n : ''}<small>${esc(desc)}${G.peso(k) ? ` · peso ${G.peso(k)}` : ' · não ocupa espaço'}</small></div><div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end">${btns.join('')}</div></div>`;
    }).join('');
    return `<div class="cartao"><h3 class="com-ret">${ico('ouro', 32)}${s.ouro} moedas de ouro</h3><p class="sans peq mudo">A bolsa e a mochila são partilhadas por toda a companhia. Lanternas, gazuas, cordas e pés-de-cabra funcionam sozinhos, desde que estejam na mochila.</p>
        <p class="sans peq" style="margin-bottom:0"><b>Carga ${G.carga()}/${G.capacidade()}</b> ${G.carga() > G.capacidade() ? '<span style="color:var(--sangue)">— sobrecarregados: −1 em Agilidade, furtividade, defesa e fuga.</span>' : '<span class="mudo">(6 + Força por herói)</span>'}</p></div>
      <div class="cartao">${linhas || '<p class="mudo">A mochila está vazia.</p>'}</div>`;
  }

  function folhaMapa() {
    const s = S();
    if (!s.exp) return '<p>O mapa só existe durante uma expedição.</p>';
    const e = s.exp;
    const zs = G.zonasVisitadas();
    const oculto = ui.mapaOculto;
    const desenho = oculto ? `<div class="cartao"><p class="sans peq">Mapa escondido: desenha primeiro na tua folha e depois compara.</p></div>`
      : `<div class="mapa-caixa ${ui.mapaZoom ? 'zoom' : ''}" id="mapaCaixa">${CP.desenharMapa(G.dadosMapa())}</div>
        <div class="mapa-leg"><span><b style="color:var(--sangue)">●</b> estás aqui (${CP.C.n(e.pos[0], e.pos[1])})</span><span><b style="color:var(--sangue)">✕</b> inimigo</span><span><b style="color:var(--sangue)">T</b> armadilha</span><span><b style="color:var(--ouro)">?</b> pista</span><span><b>○</b> objecto</span><span><b>▭</b> porta</span><span><b>■</b> trancada</span><span><b style="color:var(--sangue)">S</b> secreta</span><span><b>≡</b> escadas</span></div>`;
    return `<div class="mapa-barra">
        ${oculto ? '' : `<button class="btn peq sec2" data-act="mapa-zoom">${ui.mapaZoom ? 'Ver tudo' : 'Aproximar'}</button>`}
        <button class="btn peq sec2" data-act="mapa-ocultar">${oculto ? 'Mostrar o mapa' : 'Esconder (desenhar primeiro)'}</button></div>
      ${desenho}
      <div class="sec">Descrição das zonas</div>
      <p class="sans peq mudo">Grelha ${e.dg.W} colunas (A–${CP.C.col(e.dg.W - 1)}) × ${e.dg.H} linhas, linha 1 em baixo, norte em cima. Na folha: E escadas · X inimigo · T armadilha.</p>` +
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
    if (s.exp) h += `<div class="sec">Façanhas desta expedição (XP extra)</div>` + listaFacanhas(G.facanhasEmCurso());
    h += listaFeitos();
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
        <button class="btn sec2" data-act="tab" data-v="oraculo">Oráculo</button>
        <button class="btn sec2" data-act="regras">Regras e como se joga</button>
        ${s && s.exp ? '<button class="btn sec2" data-act="sug" data-v="#ajuda">Lista de acções</button>' : ''}</div></div>
      ${CP.Som ? `<div class="cartao"><h3>Som</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
          <button class="btn peq ${CP.Som.musica ? '' : 'sec2'}" data-act="musica">Música: ${CP.Som.musica ? 'ligada' : 'desligada'}</button>
          <button class="btn peq ${CP.Som.efeitos ? '' : 'sec2'}" data-act="efeitos">Efeitos: ${CP.Som.efeitos ? 'ligados' : 'desligados'}</button></div>
        <label class="sans peq mudo" style="display:flex;align-items:center;gap:10px">Volume da música <input type="range" min="0" max="1" step="0.05" value="${CP.Som.volume}" data-input="volume" style="flex:1"></label>
        <p class="sans peq mudo" style="margin-bottom:0">Música: «The Longest Journey», de Alexander Nakarada. Os efeitos são gerados pelo jogo.</p></div>` : ''}
      <div class="cartao"><h3>Créditos</h3><p class="sans peq mudo" style="margin:0">Interface: Humble Pixel. Ícones: «MV Icons». Retratos: «Free 39 Portraits Pixel Art» (CraftPix) e «RPG Character Portraits». Música: Alexander Nakarada. Algumas ideias inspiram-se no Ironsworn, de Shawn Tomkin (ímpeto, oráculo, juramento), e no Rangers of Shadow Deep, de Joseph A. McCullough (companheiros, sobrevivência, pontos de busca, eventos de sombra); todo o texto é original.</p></div>

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
      <div class="sec">Origem</div>${seletorOrigem(r.origem || 'humano', 'rec-origem')}
      <div class="sec">Retrato</div>${seletorRetrato(r.ret || A.porClasse[r.cls], 'rec-ret')}
      <button class="btn grande" data-act="rec-ok">Juntar à companhia</button>`;
  }

  function folhaOraculo() {
    const o = ui.or || (ui.or = { prob: 'equilibrado', q: '', res: null, insp: null, ins: null });
    const faces = act => [1, 2, 3, 4, 5, 6].map(n => `<button class="face" data-act="${act}" data-v="${n}">${pips(n)}</button>`).join('');
    const probs = { improvavel: 'Improvável (5+)', equilibrado: 'Tanto faz (4+)', provavel: 'Provável (3+)' };
    return `<p class="sans peq mudo">Quando não sabes o que acontece — «a ponte aguenta?», «o mercador mente?» — pergunta ao oráculo. Escolhe a probabilidade e lança o dado.</p>
      <input class="campo" id="perguntaOr" placeholder="A tua pergunta (sim ou não)" value="${esc(o.q)}">
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin:10px 0">${Object.keys(probs).map(k => `<button class="btn peq ${o.prob === k ? '' : 'sec2'}" data-act="or-prob" data-v="${k}">${probs[k]}</button>`).join('')}</div>
      <div class="faces">${faces('or-face')}</div>
      ${o.res ? `<div class="oraculo-res">${esc(o.res)}</div>` : ''}
      <div class="sec">Inspiração</div>
      <p class="sans peq mudo">Para improvisar uma cena, uma personagem ou um segredo: lança o dado duas vezes.</p>
      ${o.insp ? `<p class="sans peq"><b>Acção: ${esc(D.inspiracao.accoes[o.insp - 1])}</b> — agora lança para o tema.</p>` : ''}
      <div class="faces">${faces('insp-face')}</div>
      ${o.ins ? `<div class="oraculo-res">${esc(o.ins)}</div>` : ''}`;
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
      <p>Tu desenhas a masmorra na tua folha. Se te perderes, o separador <b>Mapa</b> (ou o botão ▦ em cima) mostra um mapa desenhado de tudo o que já exploraste, com a tua posição; podes escondê-lo para desenhares primeiro e compararem depois.</p>
      <p>No início de cada aventura, prepara uma grelha (normalmente 12 colunas, A a L, e 16 linhas, 1 a 16). A linha 1 fica em baixo e o norte é o topo da folha. Cada sala nova vem com dimensões e coordenadas exactas, e as portas ficam sempre <i>entre</i> dois quadrados (por exemplo, «entre D9 e D10»). As salas encaixam sempre nas ligações existentes. Marca E nas escadas, X nos inimigos e T nas armadilhas.</p>
      <p>Por baixo do mapa tens também a descrição escrita de cada zona.</p>
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
      <h3>Luz</h3>
      <p>Sem luz, morres. Cada tocha dura 6 marcas e a lanterna 10 (gasta um frasco de óleo). Gastas uma marca ao entrar numa sala nova ou ao procurar, e duas ao descansar. Quando a luz acaba, acende-se a seguinte sozinha. Sem nenhuma, ficas às escuras: −2 em todos os testes, não podes procurar nem ler, e cada passo enche a tensão. O Místico pode criar luz mágica. Compra tochas no mercado: são baratas, mas pesam.</p>
      <h3>Carga</h3>
      <p>A companhia carrega 6 + Força espaços por herói. Quase tudo ocupa 1; gemas, chaves e amuletos não ocupam nada; armaduras e armas pesadas ocupam mais. Com carga a mais, −1 em Agilidade, furtividade, defesa e fuga, até largares alguma coisa.</p>
      <h3>Ímpeto</h3>
      <p>A companhia ganha 1 de ímpeto (até 6) com cada sucesso e perde 1 com cada falha. Antes de lançares, podes gastar 2 de ímpeto para +1 no teste.</p>
      <h3>Oráculo</h3>
      <p>Quando quiseres saber algo que o jogo não responde, pergunta ao oráculo (botão «Oráculo»): escreve uma pergunta de sim ou não, escolhe se é improvável, indiferente ou provável, e lança o dado. A inspiração dá uma acção e um tema para improvisares uma cena.</p>
      <h3>Juramento</h3>
      <p>A companhia jurou livrar o vale da sombra. Cada missão cumprida avança o juramento; ao chegar às 10 marcas, todos ganham experiência.</p>
      <h3>Bênçãos, relíquias e feitos</h3>
      <p>À entrada de cada masmorra, e sempre que abres um grande tesouro, escolhes <b>uma bênção entre três</b>: um poder que dura até saíres. Depois de cumprires uma missão da campanha, escolhes uma <b>relíquia</b>, que fica para sempre (até 3; o 4.º espaço desbloqueia-se). Os <b>feitos</b> (no Diário) contam o que fazes e desbloqueiam bênçãos novas, armas na forja, uma origem nova e mais escolhas.</p>
      <h3>Ouro em risco</h3>
      <p>O ouro que encontras numa masmorra só fica seguro quando sais pelo teu pé. Se fores derrotado, perdes metade; se a companhia cair, perdes tudo. Às vezes vale mais sair a tempo.</p>
      <h3>Masmorra do dia</h3>
      <p>Todos os dias aparece no quadro uma masmorra igual para toda a gente que joga nesse dia. Só tens uma tentativa: o jogo dá-te pontos (ouro, pistas, inimigos, salas e +50 por cumprir) e guarda o teu melhor resultado.</p>
      <h3>Companheiros</h3>
      <p>Na aldeia podes contratar companheiros (2 a jogar sozinho, 1 em cooperativo): um cão de caça, uma arqueira, um escudeiro, um escriba ou uma curandeira. Agem sozinhos, sem dados, mas os inimigos também os atacam. Quem cair volta à aldeia e lança o dado para ver se sobrevive.</p>
      <h3>Pontos de busca</h3>
      <p>Algumas salas têm um sítio para revistar (marca-o com ✦). Faz um teste de Procurar; se correr bem, lança 1D6 na tabela de achados: emboscada, poção, ouro, mapa, um sobrevivente para levar até à saída, ou um tesouro escondido. Cada resultado só sai uma vez por expedição.</p>
      <h3>Façanhas</h3>
      <p>Cada expedição tem metas que dão experiência extra: explorar todas as salas, encontrar todas as pistas, salvar um sobrevivente, ninguém cair, vencer 5 inimigos, revistar 3 pontos de busca. Vês o progresso no Diário.</p>
      <h3>Sombra profunda</h3>
      <p>A partir da segunda vez que a tensão enche, a masmorra reage: uivos que tiram a coragem, névoa, criaturas mais fortes, frio que come a luz, ou um campeão da sombra que vem à tua procura.</p>
      <h3>Feridas e cicatrizes</h3>
      <p>Quem cai numa masmorra e sobrevive lança 1D6 quando volta à aldeia: 1 fica com uma cicatriz para sempre (outro dado diz qual), 2–3 fica gravemente ferido, 4–5 perde algo da mochila, 6 recupera por completo.</p>
      <h3>Combate táctico</h3>
      <p>No painel de combate vês o que cada inimigo vai fazer a seguir. Contra um golpe pesado ou um salto, <b>defende-te</b>; contra quem se fecha na defensiva, tenta <b>derrubá-lo</b> (fica atordoado, não ataca e o próximo ataque tem +2); quando tens vantagem, arrisca um <b>golpe arriscado</b> (+1 de dano, mas levas +1 se não acertares em cheio). Os feridos tentam fugir e alguns chamam reforços: não lhes dês tempo.</p>
      <h3>Tensão</h3>
      <p>O relógio de tensão (seis círculos, em cima) enche quando fazes barulho, procuras devagar ou descansas. Quando enche, a masmorra reage: uma criatura errante, um sinal, um susto.</p>
      <h3>Recuperação, morte e retirada</h3>
      <p>Poções e bandagens curam; podes descansar duas vezes por expedição (cura 2, mas gasta luz e enche a tensão). Na aldeia, a estalagem cura tudo.</p>
      <p>Um herói que chega a 0 de Vida cai e <b>começa a esvair-se</b>: os companheiros têm 3 turnos (4 para um anão) para o salvar com uma poção, bandagens, uma cura ou primeiros socorros (teste de Mente). Se ninguém chegar a tempo, ou se estiver sozinho, lança 1D6: <b>1–2</b> morte, <b>3–4</b> inconsciente, <b>5–6</b> levanta-se com 1 de Vida. Podes retirar-te a qualquer momento pelas escadas: perdes a recompensa, mas não a vida.</p>
      <h3>Magia</h3>
      <p>Cada feitiço gasta 1 de Foco e é um teste de Mente. Com um 1 natural, algo corre mal: lança 1D6 na tabela de percalços.</p>
      <h3>Cooperativo</h3>
      <p>Até quatro heróis, um por jogador, no mesmo telemóvel e no mesmo mapa. Toca num herói para escolher quem age; em combate, a vez passa por ordem. Num teste, outro herói pode ajudar (+1), mas se falharem, também sofre 1 de dano. Os inimigos ficam mais duros com grupos maiores.</p>
      <h3>Progressão e mundo</h3>
      <p>Escolhe a origem do herói: humano, anão, elfo ou halfling, cada um com a sua vantagem. Ganhas experiência com as missões e também com os <b>tesouros que trazes para a luz do dia</b> (1 por cada 10 moedas encontradas e por cada objecto valioso), mesmo que a missão falhe. Ao subir de nível ganhas +1 de Vida e lanças o dado na tabela de talentos da tua classe.</p>
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
      case 'cls': { const hh = ui.criar.herois[ui.criar.idx]; hh.nome = lerNome('nomeHeroi'); hh.cls = v; if (!hh.retManual) hh.ret = A.porClasse[v]; break; }
      case 'origem': { const hh = ui.criar.herois[ui.criar.idx]; hh.nome = lerNome('nomeHeroi'); hh.origem = v; break; }
      case 'rec-origem': ui.rec.nome = lerNome('nomeRec'); ui.rec.origem = v; break;
      case 'sorte': G.sorte(); break;
      case 'impeto': G.usarImpeto(); break;
      case 'or-prob': ui.or.q = lerNome('perguntaOr'); ui.or.prob = v; break;
      case 'or-face': ui.or.q = lerNome('perguntaOr'); if (CP.Som) CP.Som.tocar('dado'); ui.or.res = G.oraculo(ui.or.q, ui.or.prob, +v); break;
      case 'insp-face': if (CP.Som) CP.Som.tocar('dado'); if (!ui.or.insp) { ui.or.insp = +v; ui.or.ins = null; } else { ui.or.ins = G.inspiracao(ui.or.insp, +v); ui.or.insp = null; } break;
      case 'largar': G.largar(v); break;
      case 'subir': G.subirNivel(v); ui.folha = null; ui.rolarAldeia = true; break;
      case 'face-aldeia': if (CP.Som) CP.Som.tocar('dado'); G.rollAldeia(+v); break;
      case 'talento': G.escolherTalento(+v); break;
      case 'face-sobrev': if (CP.Som) CP.Som.tocar('dado'); G.rollSobrev(+v); break;
      case 'contratar': if (G.contratar(v)) toast(D.companheiros[v].nome + ' contratado.'); break;
      case 'despedir': ui.confirmar = { texto: 'Despedir este companheiro? Não devolve o dinheiro.', ok: 'Despedir', perigo: true, fn: () => G.despedir(v) }; break;
      case 'bencao': G.escolherBencao(v); if (CP.Som) CP.Som.tocar('pista'); break;
      case 'bencao-nao': G.recusarBencao(); break;
      case 'reliquia': if (S().reliquias.length >= S().slots) ui.relEscolhida = v; else { G.escolherReliquia(v); toast('Relíquia guardada: ' + D.passivos[v].nome); } break;
      case 'rel-largar': G.escolherReliquia(ui.relEscolhida, v); toast('Relíquia guardada: ' + D.passivos[ui.relEscolhida].nome); ui.relEscolhida = null; break;
      case 'rel-cancelar': ui.relEscolhida = null; break;
      case 'rel-nao': ui.confirmar = { texto: 'Recusar a relíquia? Perdes esta escolha.', ok: 'Recusar', fn: () => G.recusarReliquia() }; break;
      case 'rel-visto': ui.relVisto = S().ultimo; break;
      case 'ret': { const hh = ui.criar.herois[ui.criar.idx]; hh.nome = lerNome('nomeHeroi'); hh.ret = v; hh.retManual = true; break; }
      case 'ret-heroi': { const hh = S().herois.find(x => x.id === b.dataset.h); if (hh) { hh.retrato = v; G.save(); } break; }
      case 'rec-ret': ui.rec.nome = lerNome('nomeRec'); ui.rec.ret = v; ui.rec.retManual = true; break;
      case 'criar-voltar': ui.criar.herois[ui.criar.idx].nome = lerNome('nomeHeroi'); ui.criar.idx--; break;
      case 'criar-ok': {
        const c = ui.criar;
        c.herois[c.idx].nome = lerNome('nomeHeroi') || sugerirNome(c.herois[c.idx].cls, c.idx);
        if (c.idx < c.n - 1) { c.idx++; break; }
        if (c.nova) {
          G.novaCampanha(c.modo);
          c.herois.forEach(h => G.criarHeroi(h.nome, h.cls, h.ret, h.origem));
          G.log('title', 'Corvamonte');
          G.log('narr', `Chegas a Corvamonte ao cair da tarde, com ${c.n > 1 ? 'os teus companheiros e ' : ''}poucas moedas no bolso. ${D.regiao.descricao} No adro da igreja, um quadro de madeira cheio de papéis pregados: gente que precisa de alguém que não tenha medo do escuro.`);
          G.log('sys', 'Escolhe uma missão no quadro. Tem à mão papel quadriculado, um lápis e o teu dado.');
        } else c.herois.forEach(h => G.criarHeroi(h.nome, h.cls, h.ret, h.origem));
        G.save();
        ui.criar = null; ui.screen = 'jogo'; ui.rolarAldeia = true;
        break;
      }
      case 'sug': ui.folha = null; ui.mais = false; G.input(v); vibra(); break;
      case 'face': {
        if (ui.rolando) return;
        ui.rolando = true;
        if (CP.Som) CP.Som.tocar('dado');
        vibra(10);
        const painel = $app.querySelector('.dado');
        if (painel) painel.classList.add('rolar');
        b.classList.add('escolhida');
        setTimeout(() => { ui.rolando = false; G.roll(+v); render(); }, 420);
        return;
      }
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
      case 'reformar': ui.confirmar = { texto: 'Este herói deixa a companhia para sempre. Continuar?', ok: 'Deixar partir', perigo: true, fn: () => G.removerHeroi(v) }; break;
      case 'recrutar': ui.folha = 'recrutar'; ui.rec = null; break;
      case 'rec-cls': ui.rec.nome = lerNome('nomeRec'); ui.rec.cls = v; if (!ui.rec.retManual) ui.rec.ret = A.porClasse[v]; break;
      case 'rec-ok': {
        const nome = lerNome('nomeRec') || sugerirNome(ui.rec.cls, S().herois.length);
        G.criarHeroi(nome, ui.rec.cls, ui.rec.ret, ui.rec.origem);
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
      case 'musica': CP.Som.setMusica(!CP.Som.musica); break;
      case 'efeitos': CP.Som.setEfeitos(!CP.Som.efeitos); break;
      case 'mapa-zoom': ui.mapaZoom = !ui.mapaZoom; break;
      case 'mapa-ocultar': ui.mapaOculto = !ui.mapaOculto; try { localStorage.setItem('cronicas_mapa', ui.mapaOculto ? 'oculto' : 'visivel'); } catch (e) { /* */ } break;
      case 'tema-x': ui.tema = v; try { localStorage.setItem('cronicas_tema', v); } catch (e) { /* */ } break;
    }
    render();
  });

  $app.addEventListener('input', ev => {
    if (ev.target.dataset.input === 'volume' && CP.Som) CP.Som.setVolume(parseFloat(ev.target.value));
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
