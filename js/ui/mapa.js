/* Mapa desenhado (opcional): papel quadriculado, paredes a tinta, rocha tracejada.
   Desenha só as zonas já exploradas, com as mesmas coordenadas da folha do jogador. */
(function (CP) {
  'use strict';
  const K = (x, y) => x + ',' + y;
  const LET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  function h32(x, y, n) { let h = (x * 374761393 + y * 668265263 + (n || 0) * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

  CP.desenharMapa = function (m) {
    if (!m) return '';
    const s = 30, ml = 24, mb = 22, mt = 10, mr = 10;
    const Wpx = ml + m.W * s + mr, Hpx = mt + m.H * s + mb;
    const X = x => ml + x * s;
    const Y = y => mt + (m.H - 1 - y) * s;          // linha 1 em baixo
    const f = m.floor;
    const isF = (x, y) => f[K(x, y)] !== undefined;
    const doorAt = {};
    m.doors.forEach(d => { doorAt[K(d.rx, d.ry) + '|' + K(d.cx, d.cy)] = d; doorAt[K(d.cx, d.cy) + '|' + K(d.rx, d.ry)] = d; });
    const out = [];

    // papel e grelha
    out.push(`<rect class="mp-papel" x="0" y="0" width="${Wpx}" height="${Hpx}"/>`);
    let g = '';
    for (let i = 0; i <= m.W; i++) g += `M${X(i)} ${mt}V${mt + m.H * s}`;
    for (let j = 0; j <= m.H; j++) g += `M${ml} ${mt + j * s}H${ml + m.W * s}`;
    out.push(`<path class="mp-grelha" d="${g}"/>`);

    // rocha tracejada à volta do que foi explorado
    const rocha = {};
    Object.keys(f).forEach(k => {
      const [x, y] = k.split(',').map(Number);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= m.W || ny >= m.H || isF(nx, ny)) continue;
        rocha[K(nx, ny)] = true;
      }
    });
    let hp = '';
    Object.keys(rocha).forEach(k => {
      const [x, y] = k.split(',').map(Number);
      const cx = X(x) + s / 2, cy = Y(y) + s / 2;
      const ang = h32(x, y, 1) * Math.PI;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const n = 3 + Math.floor(h32(x, y, 2) * 2);
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * 5.5;
        const len = 9 + h32(x, y, i + 3) * 5;
        const px = cx - sa * off, py = cy + ca * off;
        hp += `M${(px - ca * len).toFixed(1)} ${(py - sa * len).toFixed(1)}L${(px + ca * len).toFixed(1)} ${(py + sa * len).toFixed(1)}`;
      }
    });
    out.push(`<path class="mp-rocha" d="${hp}"/>`);

    // chão
    let fl = '';
    Object.keys(f).forEach(k => { const [x, y] = k.split(',').map(Number); fl += `M${X(x)} ${Y(y)}h${s}v${s}h${-s}z`; });
    out.push(`<path class="mp-chao" d="${fl}"/>`);
    // grelha sobre o chão
    let gf = '';
    Object.keys(f).forEach(k => { const [x, y] = k.split(',').map(Number); gf += `M${X(x)} ${Y(y)}h${s}v${s}`; });
    out.push(`<path class="mp-grelha-chao" d="${gf}"/>`);

    // paredes (com sombra interior) e portas
    let paredes = '', sombra = '';
    const portas = [];
    Object.keys(f).forEach(k => {
      const [x, y] = k.split(',').map(Number);
      const lados = [[0, 1, 'N'], [0, -1, 'S'], [1, 0, 'E'], [-1, 0, 'O']];
      lados.forEach(([dx, dy, l]) => {
        const nx = x + dx, ny = y + dy;
        const porta = doorAt[K(x, y) + '|' + K(nx, ny)];
        const mesmo = isF(nx, ny) && f[K(nx, ny)] === f[k];
        if (mesmo) return;
        if (porta && isF(nx, ny) && K(x, y) > K(nx, ny)) return; // desenha cada porta uma vez
        let x1, y1, x2, y2, ix, iy;
        if (l === 'N') { x1 = X(x); y1 = Y(y); x2 = X(x) + s; y2 = y1; ix = 0; iy = 4; }
        if (l === 'S') { x1 = X(x); y1 = Y(y) + s; x2 = X(x) + s; y2 = y1; ix = 0; iy = -4; }
        if (l === 'E') { x1 = X(x) + s; y1 = Y(y); x2 = x1; y2 = Y(y) + s; ix = -4; iy = 0; }
        if (l === 'O') { x1 = X(x); y1 = Y(y); x2 = x1; y2 = Y(y) + s; ix = 4; iy = 0; }
        if (!porta) sombra += `M${x1 + ix} ${y1 + iy}L${x2 + ix} ${y2 + iy}`;
        if (porta) { portas.push({ d: porta, x1, y1, x2, y2, vert: l === 'E' || l === 'O', fora: !isF(nx, ny) }); return; }
        paredes += `M${x1} ${y1}L${x2} ${y2}`;
      });
    });
    out.push(`<path class="mp-sombra" d="${sombra}"/>`);
    out.push(`<path class="mp-parede" d="${paredes}"/>`);
    portas.forEach(p => {
      const { d } = p;
      const mx = (p.x1 + p.x2) / 2, my = (p.y1 + p.y2) / 2;
      const a = s * 0.28, b = s * 0.13; // meia largura, meia espessura
      // ombreiras: troços de parede de cada lado da abertura
      if (p.vert) out.push(`<path class="mp-parede" d="M${p.x1} ${p.y1}L${mx} ${my - a}M${mx} ${my + a}L${p.x2} ${p.y2}"/>`);
      else out.push(`<path class="mp-parede" d="M${p.x1} ${p.y1}L${mx - a} ${my}M${mx + a} ${my}L${p.x2} ${p.y2}"/>`);
      if (d.secreto) { out.push(`<text class="mp-s" x="${mx}" y="${my + 4}">S</text>`); return; }
      if (d.tipo === 'aberta') return; // passagem em arco: só a abertura
      const w = p.vert ? 2 * b : 2 * a, h = p.vert ? 2 * a : 2 * b;
      const cls = d.tipo === 'trancada' && !d.aberta ? 'mp-porta tranc' : d.aberta ? 'mp-porta aberta' : 'mp-porta';
      out.push(`<rect class="${cls}" x="${mx - w / 2}" y="${my - h / 2}" width="${w}" height="${h}" rx="1.5"/>`);
    });

    // escadas
    if (isF(m.stairs[0], m.stairs[1])) {
      const sx = X(m.stairs[0]), sy = Y(m.stairs[1]);
      let st = '';
      for (let i = 1; i <= 4; i++) st += `M${sx + 5} ${sy + s - i * 5.5}H${sx + s - 5}`;
      out.push(`<path class="mp-escadas" d="${st}"/>`);
    }

    // marcas
    m.marks.forEach(k => {
      const cx = X(k.x) + s / 2, cy = Y(k.y) + s / 2;
      const t = `<title>${(k.n || '').replace(/</g, '')}</title>`;
      if (k.k === 'inimigo') out.push(`<g class="mp-inim">${t}<path d="M${cx - 7} ${cy - 7}L${cx + 7} ${cy + 7}M${cx + 7} ${cy - 7}L${cx - 7} ${cy + 7}"/></g>`);
      else if (k.k === 'trap') out.push(`<text class="mp-trap" x="${cx}" y="${cy + 6}">${t}T</text>`);
      else if (k.k === 'pista') out.push(`<text class="mp-pista" x="${cx}" y="${cy + 6}">${t}?</text>`);
      else if (k.k === 'pista-ok') out.push(`<text class="mp-pista ok" x="${cx}" y="${cy + 5}">${t}✓</text>`);
      else if (k.k === 'npc') out.push(`<g class="mp-npc">${t}<circle cx="${cx}" cy="${cy - 4}" r="3.5"/><path d="M${cx - 6} ${cy + 8}Q${cx} ${cy - 2} ${cx + 6} ${cy + 8}"/></g>`);
      else if (k.k === 'item') out.push(`<path class="mp-obj item" d="M${cx} ${cy - 6}L${cx + 6} ${cy}L${cx} ${cy + 6}L${cx - 6} ${cy}z">${t}</path>`);
      else if (k.k === 'enigma') out.push(`<g class="mp-obj ${k.usada ? 'usada' : ''}">${t}<rect x="${cx - 7}" y="${cy - 7}" width="14" height="14" rx="2"/><text class="mp-mini" x="${cx}" y="${cy + 4}">?</text></g>`);
      else out.push(`<circle class="mp-obj ${k.usada ? 'usada' : ''}" cx="${cx}" cy="${cy}" r="5">${t}</circle>`);
    });

    // tu
    const px = X(m.pos[0]) + s / 2, py = Y(m.pos[1]) + s / 2;
    out.push(`<g id="mpTu" class="mp-tu"><circle cx="${px}" cy="${py}" r="11" class="anel"/><circle cx="${px}" cy="${py}" r="6.5"/></g>`);

    // margens com coordenadas
    let lab = '';
    for (let i = 0; i < m.W; i++) lab += `<text x="${X(i) + s / 2}" y="${Hpx - 6}">${LET[i]}</text>`;
    for (let j = 0; j < m.H; j++) lab += `<text x="${ml / 2}" y="${Y(j) + s / 2 + 4}">${j + 1}</text>`;
    out.push(`<g class="mp-coord">${lab}</g>`);

    return `<svg class="mapa-svg" viewBox="0 0 ${Wpx} ${Hpx}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mapa das zonas exploradas">${out.join('')}</svg>`;
  };
})(window.CP);
