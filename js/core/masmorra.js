/* Gerador procedural de masmorras (com sementes) e preparação da aventura.
   Modelo espacial:
   - Grelha global W×H (colunas A.., linhas 1..; linha 1 = sul).
   - Zonas: salas (rectângulos) e corredores (segmentos rectos, 1 quadrado de largura).
   - Ligações: cada ligação é uma porta na parede de uma sala, entre uma célula da sala e a primeira/última célula de um corredor.
   - Nenhuma zona toca noutra excepto através das suas portas → coerência espacial garantida. */
(function (CP) {
  'use strict';
  const C = CP.C;
  const K = C.key;

  function tryGen(rng, nSalas, W, H) {
    const occ = {};
    const zones = [];
    const conns = [];
    const salas = () => zones.filter(z => z.kind === 'sala');

    function addRoom(x, y, w, h, parent) {
      const z = { id: zones.length, kind: 'sala', x, y, w, h, parent, depth: parent == null ? 0 : zones[parent].depth + 1 };
      zones.push(z);
      for (let i = x; i < x + w; i++) for (let j = y; j < y + h; j++) occ[K(i, j)] = z.id;
      return z;
    }

    const ew = rng.int(3, 4), eh = 3;
    const ex = Math.max(0, Math.min(W - ew, Math.floor((W - ew) / 2) + rng.int(-2, 2)));
    addRoom(ex, 0, ew, eh, null);

    let tries = 0;
    while (salas().length < nSalas && tries < 900) {
      tries++;
      const rooms = salas();
      const p = rng.next() < 0.6 ? rooms[rooms.length - 1 - rng.int(0, Math.min(2, rooms.length - 1))] : rng.pick(rooms);
      if (conns.filter(c => c.room === p.id).length >= 4) continue;
      const side = rng.pick(['N', 'N', 'N', 'E', 'O', 'E', 'O', 'S']);
      const [dx, dy] = C.DIR[side];
      let dcx, dcy;
      if (side === 'N') { dcy = p.y + p.h - 1; dcx = rng.int(p.x, p.x + p.w - 1); }
      else if (side === 'S') { dcy = p.y; dcx = rng.int(p.x, p.x + p.w - 1); }
      else if (side === 'E') { dcx = p.x + p.w - 1; dcy = rng.int(p.y, p.y + p.h - 1); }
      else { dcx = p.x; dcy = rng.int(p.y, p.y + p.h - 1); }
      if (conns.some(c => c.room === p.id && c.rx === dcx && c.ry === dcy)) continue;

      const L = rng.int(1, 4);
      const corr = [];
      for (let i = 1; i <= L; i++) corr.push([dcx + dx * i, dcy + dy * i]);
      const [lx, ly] = corr[L - 1];
      const fx = lx + dx, fy = ly + dy;
      const w = rng.int(2, 4), h = rng.int(2, 4);
      let rx, ry;
      if (side === 'N') { ry = fy; rx = fx - rng.int(0, w - 1); }
      else if (side === 'S') { ry = fy - h + 1; rx = fx - rng.int(0, w - 1); }
      else if (side === 'E') { rx = fx; ry = fy - rng.int(0, h - 1); }
      else { rx = fx - w + 1; ry = fy - rng.int(0, h - 1); }

      const cells = corr.slice();
      for (let i = rx; i < rx + w; i++) for (let j = ry; j < ry + h; j++) cells.push([i, j]);
      const set = new Set(cells.map(c => K(c[0], c[1])));
      let ok = true;
      for (const [x, y] of cells) {
        if (x < 0 || y < 0 || x >= W || y >= H || occ[K(x, y)] !== undefined) { ok = false; break; }
      }
      if (ok) {
        outer: for (const [x, y] of cells) {
          for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nk = K(x + ax, y + ay);
            if (occ[nk] !== undefined && !set.has(nk)) {
              const isDoor = x === corr[0][0] && y === corr[0][1] && x + ax === dcx && y + ay === dcy;
              if (!isDoor) { ok = false; break outer; }
            }
          }
        }
      }
      if (!ok) continue;

      const cz = { id: zones.length, kind: 'corredor', cells: corr, dir: side, parent: p.id };
      zones.push(cz);
      corr.forEach(([x, y]) => { occ[K(x, y)] = cz.id; });
      const r = addRoom(rx, ry, w, h, p.id);
      r.via = cz.id;
      conns.push({ id: conns.length, room: p.id, rx: dcx, ry: dcy, side, corr: cz.id, cx: corr[0][0], cy: corr[0][1], tipo: 'aberta' });
      conns.push({ id: conns.length, room: r.id, rx: fx, ry: fy, side: C.OPP[side], corr: cz.id, cx: lx, cy: ly, tipo: 'aberta' });
      cz.ends = [conns.length - 2, conns.length - 1];
    }
    if (salas().length < Math.max(5, nSalas - 1)) return null;
    return { W, H, zones, conns, stairs: [ex + Math.floor(ew / 2), 0] };
  }

  CP.genDungeon = function (seed, nSalas, W, H) {
    W = W || 12; H = H || 16;
    for (let a = 0; a < 40; a++) {
      const d = tryGen(CP.RNG(seed + '#' + a), nSalas || 7, W, H);
      if (d) { d.seed = seed; return d; }
    }
    throw new Error('Não foi possível gerar a masmorra.');
  };

  /* ------------------------------------------------------------------ preparação da aventura */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  CP.prepararAventura = function (m, seed, nHerois) {
    const D = CP.DATA;
    const T = D.masmorras[m.tipo];
    const dg = CP.genDungeon(seed, m.salas || 7);
    const rng = CP.RNG(seed + '/conteudo');
    const Z = dg.zones;
    const rooms = Z.filter(z => z.kind === 'sala');
    const entrance = rooms[0];
    const filhos = id => rooms.filter(r => r.parent === id);
    const obj = rooms.slice(1).sort((a, b) => b.depth - a.depth || (b.w * b.h) - (a.w * a.h))[0];
    const leaves = rooms.filter(r => r.id !== 0 && r !== obj && filhos(r.id).length === 0);
    const corrConn = (room) => dg.conns.find(c => c.room === room.id && c.corr === room.via); // porta de entrada da sala (lado da sala)
    const parentConn = (room) => dg.conns.find(c => c.room === room.parent && c.corr === room.via); // porta na sala-mãe

    // caminho até ao objectivo
    const path = new Set();
    for (let cur = obj; cur; cur = cur.parent != null ? Z[cur.parent] : null) path.add(cur.id);

    dg.obj = obj.id;
    dg.ents = {};
    let eid = 0;
    const add = (o) => { o.id = 'e' + (eid++); dg.ents[o.id] = o; return o; };

    // células usadas: escadas e células de porta
    const used = new Set([K(dg.stairs[0], dg.stairs[1])]);
    dg.conns.forEach(c => used.add(K(c.rx, c.ry)));
    function freeCell(room, preferFar) {
      const cand = [];
      for (let x = room.x; x < room.x + room.w; x++) for (let y = room.y; y < room.y + room.h; y++) if (!used.has(K(x, y))) cand.push([x, y]);
      if (!cand.length) return null;
      let c;
      if (preferFar) {
        const doors = dg.conns.filter(k => k.room === room.id);
        cand.sort((a, b) => dist(b, doors) - dist(a, doors));
        c = cand[0];
      } else c = rng.pick(cand);
      used.add(K(c[0], c[1]));
      return c;
    }
    function dist(p, doors) { return Math.min(...doors.map(d => Math.abs(d.rx - p[0]) + Math.abs(d.ry - p[1]))); }

    // nomes e descrições
    entrance.nome = T.entrada.nome; entrance.desc = T.entrada.desc;
    obj.nome = m.final.sala; obj.desc = m.final.desc;
    const nomes = rng.shuffle(T.salas);
    let ni = 0;
    rooms.forEach(r => { if (!r.nome) { const s = nomes[ni++ % nomes.length]; r.nome = s.nome; r.desc = s.desc; } });
    Z.filter(z => z.kind === 'corredor').forEach(z => { z.nome = 'Corredor'; z.desc = rng.pick(T.corredores); });

    // portas
    dg.conns.forEach(c => { c.tipo = rng.chance(0.45) ? 'aberta' : 'fechada'; });
    const objDoor = corrConn(obj);
    const rr = rng.next();
    objDoor.tipo = rr < 0.5 ? 'trancada' : rr < 0.8 ? 'emperrada' : 'fechada';
    const outras = dg.conns.filter(c => c !== objDoor && c.room !== 0);
    if (outras.length && rng.chance(0.5)) rng.pick(outras).tipo = 'emperrada';

    // sala secreta
    let secreta = null;
    if (leaves.length && rng.chance(0.85)) {
      secreta = rng.pick(leaves);
      const pc = parentConn(secreta);
      pc.secreto = true; pc.tipo = 'fechada';
      const pr = Z[secreta.parent];
      pr.pistaSecreta = T.pistaSecreta.replace('{lado}', C.NOME[pc.side]);
      dg.secreta = secreta.id;
      const c = freeCell(secreta, true);
      if (c) add(Object.assign(clone(T.tesouro), { kind: 'feat', zone: secreta.id, x: c[0], y: c[1] }));
    }

    // chave para a porta trancada (numa sala alcançável sem passar por essa porta)
    if (objDoor.tipo === 'trancada') {
      const cand = rooms.filter(r => r !== obj && r !== secreta && r.id !== 0);
      let kr = null, c = null;
      for (const r of rng.shuffle(cand).concat([entrance])) { c = freeCell(r); if (c) { kr = r; break; } }
      if (c) add({ kind: 'item', item: 'chave', nome: 'chave de ferro', kw: ['chave', 'ferro'], desc: 'uma chave de ferro pendurada num prego', zone: kr.id, x: c[0], y: c[1] });
      else objDoor.tipo = 'emperrada';
    }

    // pistas: salas por profundidade (excepto entrada, objectivo, secreta)
    let cand = rooms.filter(r => r.id !== 0 && r !== obj && r !== secreta).sort((a, b) => a.depth - b.depth || a.id - b.id);
    if (cand.length < 3) cand = rooms.filter(r => r !== obj && r !== secreta).sort((a, b) => a.depth - b.depth);
    m.pistas.forEach((p, i) => {
      const n = cand.length;
      const idx = n >= 3 ? [0, Math.floor(n / 2), n - 1][i] : i % n;
      let room = cand[idx];
      let c = freeCell(room);
      if (!c) { room = cand.find(r => (c = freeCell(r))); }
      add(Object.assign(clone(p), { kind: 'pista', pid: p.id, zone: room.id, x: c[0], y: c[1] }));
    });

    // final
    const scale = Math.max(0, (nHerois || 1) - 1);
    if (m.final.npc) {
      const c = freeCell(obj, true);
      add(Object.assign(clone(m.final.npc), { npcId: m.final.npc.nome, kind: 'npc', final: true, zone: obj.id, x: c[0], y: c[1] }));
    }
    (m.final.inimigos || []).forEach((b, i) => {
      const c = freeCell(obj, i === 0) || [obj.x, obj.y];
      const en = Object.assign(clone(b), { defId: b.id, kind: 'inimigo', boss: true, zone: obj.id, x: c[0], y: c[1] });
      en.def = en.def || 0;
      en.hp += i === 0 ? scale * 2 : scale;
      en.hpMax = en.hp;
      if (en.estado === 'oculto') en.oculto = true;
      add(en);
    });

    // inimigos errantes
    const nInim = (rooms.length > 6 ? 2 : 1) + (nHerois > 1 ? 1 : 0);
    const enRooms = rng.shuffle(rooms.filter(r => r.id !== 0 && r !== obj && r !== secreta));
    for (let i = 0; i < Math.min(nInim, enRooms.length); i++) {
      const r = enRooms[i];
      const c = freeCell(r);
      if (!c) continue;
      const def = clone(rng.pick(T.inimigos));
      def.hp += scale;
      add(Object.assign(def, { kind: 'inimigo', defId: def.id, zone: r.id, x: c[0], y: c[1], estado: rng.chance(0.5) ? 'dormente' : 'alerta', hpMax: def.hp }));
    }

    // armadilhas em corredores (células interiores, nunca nas pontas)
    const trapCells = [];
    Z.filter(z => z.kind === 'corredor' && z.cells.length >= 3).forEach(z => {
      for (let i = 1; i < z.cells.length - 1; i++) trapCells.push([z.id, z.cells[i]]);
    });
    const nTraps = Math.min(trapCells.length, rng.int(1, 2));
    rng.shuffle(trapCells).slice(0, nTraps).forEach(([zid, cell]) => {
      if (Object.values(dg.ents).some(e => e.kind === 'trap' && e.zone === zid)) return;
      add(Object.assign(clone(rng.pick(T.armadilhas)), { kind: 'trap', on: 'cell', zone: zid, x: cell[0], y: cell[1], hidden: true }));
    });
    // armadilha numa porta fechada (fechadura com agulha)
    const fechadas = dg.conns.filter(c => c.tipo === 'fechada' && !c.secreto);
    if (fechadas.length && rng.chance(0.4)) {
      const c = rng.pick(fechadas);
      const t = add(Object.assign(clone(rng.pick(T.armadilhasObjecto)), { kind: 'trap', on: 'conn', conn: c.id, zone: c.room, x: c.rx, y: c.ry, hidden: true }));
      c.armadilha = t.id;
    }

    // objectos/pormenores nas salas (nem todas as salas têm alguma coisa)
    const pool = rng.shuffle(T.features.filter(f => f.id !== 'sarcofago_vivo'));
    const vivo = T.features.find(f => f.id === 'sarcofago_vivo');
    if (vivo && rng.chance(0.5)) pool.splice(rng.int(0, pool.length), 0, vivo);
    let pi = 0;
    let featTrap = false;
    rooms.forEach(r => {
      if (r === obj || r === secreta) return;
      const k = r.id === 0 ? 1 : rng.pick([0, 0, 1, 1, 2]);
      for (let i = 0; i < k && pi < pool.length; i++) {
        const c = freeCell(r);
        if (!c) break;
        const f = add(Object.assign(clone(pool[pi++]), { kind: 'feat', zone: r.id, x: c[0], y: c[1] }));
        if (f.armadilhavel && !featTrap && rng.chance(0.45)) {
          featTrap = true;
          const t = add(Object.assign(clone(rng.pick(T.armadilhasObjecto)), { kind: 'trap', on: 'feat', feat: f.id, zone: r.id, x: c[0], y: c[1], hidden: true }));
          f.armadilha = t.id;
        }
      }
    });

    // dilemas: salas vazias ganham uma escolha com risco e recompensa
    if (D.dilemas) {
      const ocupadas = new Set(Object.values(dg.ents).filter(e => ['inimigo', 'npc', 'enigma'].includes(e.kind)).map(e => e.zone));
      const vazias = rng.shuffle(rooms.filter(r => r !== obj && r.id !== 0 && r !== secreta && !ocupadas.has(r.id)));
      const pool = rng.shuffle(D.dilemas.filter(d => !d.tipos || d.tipos.includes(m.tipo)));
      const n = Math.min(3, vazias.length, pool.length);
      for (let i = 0; i < n; i++) {
        if (i >= 2 && !rng.chance(0.5)) continue;
        const c = freeCell(vazias[i]);
        if (!c) continue;
        const d = clone(pool[i]);
        d.opcoes.forEach(o => { o.id = d.id + '_' + o.id; });
        d.opcoes.push({ id: d.id + '_ignorar', rotulo: 'Deixar e seguir', kw: ['deixar', 'ignorar', 'seguir'], efeitos: [{ t: 'Deixas isso para trás. Talvez seja melhor assim.' }, { fimCena: true }], ignorar: true });
        add(Object.assign(d, { kind: 'dilema', dilemaId: pool[i].id, zone: vazias[i].id, x: c[0], y: c[1] }));
      }
    }

    // enigma
    if (rng.chance(0.6)) {
      const r = rng.pick(rooms.filter(r => r !== obj && r.id !== 0));
      const c = r && freeCell(r);
      if (c) add(Object.assign(clone(rng.pick(T.enigmas)), { kind: 'enigma', zone: r.id, x: c[0], y: c[1] }));
    }

    // personagem misteriosa
    if (rng.chance(0.45)) {
      const ocupadas = new Set(Object.values(dg.ents).filter(e => e.kind === 'inimigo').map(e => e.zone));
      const rs = rooms.filter(r => r !== obj && r.id !== 0 && r !== secreta && !ocupadas.has(r.id));
      if (rs.length) {
        const r = rng.pick(rs);
        const c = freeCell(r);
        if (c) { const np = rng.pick(T.npcs); add(Object.assign(clone(np), { npcId: np.id, kind: 'npc', zone: r.id, x: c[0], y: c[1] })); }
      }
    }

    return dg;
  };
})(window.CP);
