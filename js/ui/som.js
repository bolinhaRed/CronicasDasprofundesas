/* Som: música de fundo (ficheiro) e efeitos sintetizados com Web Audio (sem ficheiros extra, funciona offline). */
(function (CP) {
  'use strict';
  const pref = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
  const guarda = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* */ } };

  const Som = CP.Som = {
    musica: pref('cronicas_musica', 'on') === 'on',
    efeitos: pref('cronicas_sfx', 'on') === 'on',
    volume: parseFloat(pref('cronicas_vol', '0.45')),
    ctx: null, audio: null, iniciado: false, combate: false
  };

  function ctx() {
    if (!Som.ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; Som.ctx = new C(); }
    if (Som.ctx.state === 'suspended') Som.ctx.resume();
    return Som.ctx;
  }

  /* ---------------- música ---------------- */
  function audio() {
    if (!Som.audio) {
      Som.audio = new Audio('audio/musica.mp3');
      Som.audio.loop = true;
      Som.audio.preload = 'auto';
      Som.audio.volume = 0;
    }
    return Som.audio;
  }
  function alvoVolume() { return Som.volume * (Som.combate ? 0.55 : 1); }
  function fade(to, ms) {
    const a = audio();
    clearInterval(Som._fade);
    const from = a.volume, t0 = Date.now();
    Som._fade = setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / ms);
      a.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k >= 1) { clearInterval(Som._fade); if (to === 0) a.pause(); }
    }, 50);
  }
  Som.tocarMusica = function () {
    if (!Som.musica) return;
    const a = audio();
    const p = a.play();
    if (p && p.catch) p.catch(() => { Som.iniciado = false; });
    fade(alvoVolume(), 2500);
  };
  Som.setMusica = function (on) { Som.musica = on; guarda('cronicas_musica', on ? 'on' : 'off'); if (on) Som.tocarMusica(); else if (Som.audio) fade(0, 600); };
  Som.setEfeitos = function (on) { Som.efeitos = on; guarda('cronicas_sfx', on ? 'on' : 'off'); if (on) Som.tocar('moeda'); };
  Som.setVolume = function (v) { Som.volume = v; guarda('cronicas_vol', String(v)); if (Som.audio && Som.musica) Som.audio.volume = alvoVolume(); };
  Som.setCombate = function (c) { if (c === Som.combate) return; Som.combate = c; if (Som.audio && Som.musica && !Som.audio.paused) fade(alvoVolume(), 900); };
  Som.iniciar = function () { if (Som.iniciado) return; Som.iniciado = true; ctx(); Som.tocarMusica(); };

  /* ---------------- síntese ---------------- */
  function saida(c, g) { const m = c.createGain(); m.gain.value = g; m.connect(c.destination); return m; }
  function tom(c, out, f, t, dur, tipo, vol, fFim) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = tipo || 'sine';
    o.frequency.setValueAtTime(f, t);
    if (fFim) o.frequency.exponentialRampToValueAtTime(fFim, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
  }
  function ruido(c, out, t, dur, vol, filtro, fq, q) {
    const n = Math.floor(c.sampleRate * dur);
    const b = c.createBuffer(1, n, c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(); s.buffer = b;
    const f = c.createBiquadFilter(); f.type = filtro || 'lowpass'; f.frequency.value = fq || 1200; f.Q.value = q || 0.7;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(out); s.start(t); s.stop(t + dur);
    return f;
  }

  const SFX = {
    dado(c, o, t) { for (let i = 0; i < 5; i++) ruido(c, o, t + i * 0.055 + Math.random() * 0.02, 0.035, 0.35, 'bandpass', 2500 + Math.random() * 1500, 3); },
    pedido(c, o, t) { tom(c, o, 660, t, 0.12, 'triangle', 0.12); tom(c, o, 880, t + 0.08, 0.16, 'triangle', 0.1); },
    sucesso(c, o, t) { [523, 659, 784].forEach((f, i) => tom(c, o, f, t + i * 0.07, 0.35, 'triangle', 0.16)); },
    parcial(c, o, t) { tom(c, o, 523, t, 0.2, 'triangle', 0.14); tom(c, o, 587, t + 0.1, 0.25, 'triangle', 0.12); },
    falha(c, o, t) { tom(c, o, 220, t, 0.45, 'sawtooth', 0.09, 140); ruido(c, o, t, 0.25, 0.08, 'lowpass', 400); },
    golpe(c, o, t) { ruido(c, o, t, 0.12, 0.6, 'bandpass', 3000, 1.5); tom(c, o, 180, t, 0.12, 'square', 0.12, 60); },
    dano(c, o, t) { tom(c, o, 120, t, 0.3, 'sine', 0.5, 45); ruido(c, o, t, 0.18, 0.35, 'lowpass', 600); },
    combate(c, o, t) { [0, 0.18, 0.36].forEach((d, i) => { tom(c, o, 70, t + d, 0.35, 'sine', 0.55, 40); ruido(c, o, t + d, 0.1, 0.25, 'lowpass', 300); if (i === 2) tom(c, o, 98, t + d, 0.6, 'sawtooth', 0.06); }); },
    pista(c, o, t) { [1046, 1318, 1568, 2093].forEach((f, i) => tom(c, o, f, t + i * 0.09, 0.9, 'sine', 0.09)); },
    porta(c, o, t) {
      const f = ruido(c, o, t, 0.7, 0.18, 'bandpass', 500, 8);
      f.frequency.setValueAtTime(380, t); f.frequency.linearRampToValueAtTime(900, t + 0.35); f.frequency.linearRampToValueAtTime(520, t + 0.7);
      ruido(c, o, t + 0.68, 0.12, 0.35, 'lowpass', 250);
    },
    armadilha(c, o, t) { tom(c, o, 1800, t, 0.05, 'square', 0.12); ruido(c, o, t + 0.06, 0.35, 0.4, 'highpass', 2500); tom(c, o, 900, t + 0.06, 0.3, 'sawtooth', 0.08, 200); },
    moeda(c, o, t) { tom(c, o, 1975, t, 0.18, 'square', 0.06); tom(c, o, 2637, t + 0.07, 0.35, 'square', 0.05); },
    vitoria(c, o, t) { [392, 523, 659, 784, 1046].forEach((f, i) => tom(c, o, f, t + i * 0.12, i === 4 ? 1.2 : 0.4, 'triangle', 0.16)); },
    nivel(c, o, t) { [523, 659, 784, 1046, 1318].forEach((f, i) => tom(c, o, f, t + i * 0.06, 0.6, 'sine', 0.12)); },
    evento(c, o, t) { tom(c, o, 55, t, 2.2, 'sawtooth', 0.07, 52); tom(c, o, 82, t, 2.2, 'sine', 0.12, 78); ruido(c, o, t, 1.8, 0.05, 'lowpass', 300); },
    morte(c, o, t) { [0, 1.3].forEach(d => { tom(c, o, 196, t + d, 2.5, 'sine', 0.3); tom(c, o, 392.5, t + d, 2, 'sine', 0.1); tom(c, o, 587, t + d, 1.4, 'sine', 0.05); }); },
    passo(c, o, t) { [0, 0.28].forEach(d => ruido(c, o, t + d, 0.09, 0.25, 'lowpass', 500)); },
    papel(c, o, t) { ruido(c, o, t, 0.25, 0.12, 'highpass', 3000); }
  };

  Som.tocar = function (nome, atraso) {
    if (!Som.efeitos || !SFX[nome]) return;
    const c = ctx(); if (!c) return;
    try { SFX[nome](c, saida(c, 0.8), c.currentTime + 0.01 + (atraso || 0)); } catch (e) { /* */ }
  };

  /* escolhe os sons de um conjunto de novas entradas do registo */
  const PRIO = ['morte', 'vitoria', 'nivel', 'combate', 'evento', 'pista', 'armadilha', 'dano', 'golpe', 'sucesso', 'falha', 'parcial', 'porta', 'moeda', 'pedido', 'passo'];
  Som.processar = function (log, desde) {
    if (!Som.efeitos || !log || desde >= log.length) return;
    const quer = new Set();
    for (let i = Math.max(0, desde); i < log.length; i++) {
      const { k, t } = log[i];
      if (k === 'res') { if (/Sucesso parcial/.test(t)) quer.add('parcial'); else if (/Sucesso/.test(t)) quer.add('sucesso'); else if (/Falha/.test(t)) quer.add('falha'); }
      else if (k === 'roll') quer.add('pedido');
      else if (k === 'combat' && /Combate!/.test(t)) quer.add('combate');
      else if (k === 'clue') quer.add('pista');
      else if (k === 'done') quer.add('vitoria');
      else if (k === 'event') quer.add('evento');
      else if (k === 'bad') { if (/morre|cai por terra/.test(t)) quer.add('morte'); else if (/sofre/.test(t)) quer.add('dano'); }
      else if (k === 'good') { if (/nível/.test(t)) quer.add('nivel'); else if (/moedas|Ganhas|Encontras|Apanhas/.test(t)) quer.add('moeda'); else if (/cai|dano/.test(t)) quer.add('golpe'); }
      else if (k === 'narr') {
        if (/^Acertas/.test(t)) quer.add('golpe');
        if (/porta (abre|cede|secreta roda)|Abres a porta|fechadura (salta|cede)|A porta abre/.test(t)) quer.add('porta');
      }
      else if (k === 'draw' && /armadilha disparada/.test(t)) quer.add('armadilha');
      else if (k === 'title') quer.add('passo');
    }
    const lista = PRIO.filter(p => quer.has(p)).slice(0, 2);
    lista.forEach((n, i) => Som.tocar(n, i * 0.18));
  };

  // a música só pode começar depois de um toque (regras dos navegadores)
  const arranque = () => { Som.iniciar(); window.removeEventListener('pointerdown', arranque); window.removeEventListener('keydown', arranque); };
  window.addEventListener('pointerdown', arranque);
  window.addEventListener('keydown', arranque);
  document.addEventListener('visibilitychange', () => {
    if (!Som.audio) return;
    if (document.hidden) Som.audio.pause(); else if (Som.musica && Som.iniciado) Som.audio.play().catch(() => {});
  });
})(window.CP);
