/* Testes automáticos: coerência espacial + jogador-robô que joga aventuras completas.
   Uso: node tests/sim.js [nJogos] */
global.window = global;
const store = {};
global.localStorage = { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; } };
const base = __dirname + '/../js/';
['core/base.js', 'data/regras.js', 'data/arte.js', 'data/masmorras.js', 'data/missoes.js', 'data/dilemas.js', 'data/legado.js', 'data/sombras.js', 'core/masmorra.js', 'core/parser.js', 'core/motor.js'].forEach(f => require(base + f));
const CP = global.CP, G = CP.Game, C = CP.C;
let falhas = 0;
const erro = (m) => { falhas++; if (falhas < 30) console.log('  ✗', m); };

/* ---------------------------------------------------- 1. coerência espacial */
function verificarMasmorra(m, seed, n) {
  const dg = CP.prepararAventura(JSON.parse(JSON.stringify(m)), seed, n);
  const occ = {};
  dg.zones.forEach(z => {
    const cells = z.kind === 'sala' ? [].concat(...Array.from({ length: z.w }, (_, i) => Array.from({ length: z.h }, (_, j) => [z.x + i, z.y + j]))) : z.cells;
    cells.forEach(([x, y]) => {
      if (x < 0 || y < 0 || x >= dg.W || y >= dg.H) erro(`${seed}: fora da folha ${C.n(x, y)}`);
      const k = x + ',' + y;
      if (occ[k] !== undefined) erro(`${seed}: sobreposição em ${C.n(x, y)}`);
      occ[k] = z.id;
    });
    if (z.kind === 'corredor') {
      for (let i = 1; i < z.cells.length; i++) { const a = z.cells[i - 1], b = z.cells[i]; if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) !== 1) erro(`${seed}: corredor partido`); }
      if (z.ends.length !== 2) erro(`${seed}: corredor sem 2 pontas`);
    }
  });
  // adjacências: só através de portas
  const portasSet = new Set(dg.conns.map(c => [c.rx, c.ry, c.cx, c.cy].join(',')));
  Object.keys(occ).forEach(k => {
    const [x, y] = k.split(',').map(Number);
    [[1, 0], [0, 1]].forEach(([dx, dy]) => {
      const k2 = (x + dx) + ',' + (y + dy);
      if (occ[k2] !== undefined && occ[k2] !== occ[k]) {
        const ok = portasSet.has([x, y, x + dx, y + dy].join(',')) || portasSet.has([x + dx, y + dy, x, y].join(','));
        if (!ok) erro(`${seed}: zonas ${occ[k]} e ${occ[k2]} tocam-se sem porta em ${C.n(x, y)}`);
      }
    });
  });
  dg.conns.forEach(c => {
    const [dx, dy] = C.DIR[c.side];
    if (c.rx + dx !== c.cx || c.ry + dy !== c.cy) erro(`${seed}: porta ${c.id} com lado incoerente`);
    if (occ[c.rx + ',' + c.ry] !== c.room) erro(`${seed}: porta ${c.id} fora da sala`);
    if (occ[c.cx + ',' + c.cy] !== c.corr) erro(`${seed}: porta ${c.id} fora do corredor`);
  });
  // conteúdo
  const ents = Object.values(dg.ents);
  const pistas = ents.filter(e => e.kind === 'pista');
  if (pistas.length !== m.pistas.length) erro(`${seed}: ${pistas.length} pistas`);
  const cellsUsadas = {};
  ents.filter(e => e.kind !== 'trap').forEach(e => {
    if (occ[e.x + ',' + e.y] !== e.zone) erro(`${seed}: ${e.nome} fora da sua zona`);
    const k = e.x + ',' + e.y;
    if (cellsUsadas[k]) erro(`${seed}: duas coisas em ${C.n(e.x, e.y)} (${cellsUsadas[k]} / ${e.nome})`);
    cellsUsadas[k] = e.nome;
  });
  if (pistas.some(p => p.zone === dg.obj)) erro(`${seed}: pista na sala final`);
  const chave = ents.find(e => e.item === 'chave');
  const tranc = dg.conns.find(c => c.tipo === 'trancada');
  if (tranc && !chave) erro(`${seed}: porta trancada sem chave`);
  if (chave && chave.zone === dg.obj) erro(`${seed}: chave atrás da porta trancada`);
  ents.filter(e => e.kind === 'trap' && e.on === 'cell').forEach(t => {
    const z = dg.zones[t.zone];
    const i = z.cells.findIndex(c => c[0] === t.x && c[1] === t.y);
    if (i <= 0 || i >= z.cells.length - 1) erro(`${seed}: armadilha numa ponta do corredor`);
  });
  if (!ents.some(e => e.boss)) erro(`${seed}: sem inimigo final`);
  return dg;
}

let nMasm = 0;
Object.values(CP.DATA.missoes).forEach(m => {
  for (let i = 0; i < 150; i++) { verificarMasmorra(m, 'teste-' + m.id + '-' + i, 1 + (i % 4)); nMasm++; }
});
['cripta', 'mina', 'santuario'].forEach(t => { CP.DATA.masmorras[t].rumores.forEach((r, j) => { for (let i = 0; i < 50; i++) { G.novaCampanha('solo'); const m = G.gerarRumor('rumor-1-' + i); verificarMasmorra(m, 'rum-' + t + j + i, 2); nMasm++; } }); });
console.log(`Coerência espacial: ${nMasm} masmorras verificadas, ${falhas} falhas.`);

/* ---------------------------------------------------- 2. jogador-robô */
function rngSim(seed) { let s = seed; return () => { const r = CP.rstep(s); s = r[0]; return r[1]; }; }

function jogar(mid, nHerois, seed, verbose) {
  G.novaCampanha(nHerois > 1 ? 'coop' : 'solo');
  const S = G.S();
  S.seed = 'sim' + seed;
  const classes = ['guerreiro', 'ladrao', 'explorador', 'mistico'];
  for (let i = 0; i < nHerois; i++) G.criarHeroi('Herói' + (i + 1), classes[(seed + i) % 4]);
  S.ouro = 30;
  if (seed % 3 === 0) { S.ouro += 60; G.contratar(['cao', 'arqueira', 'escudeiro', 'escriba', 'curandeira'][seed % 5]); if (nHerois === 1) G.contratar('curandeira'); }
  if (mid === 'ossario') { S.mochila.mao_ilva = 1; }
  G.partir(mid);
  const rnd = rngSim(seed * 7919 + 13);
  let passos = 0;
  const visitadas = new Set();
  while (S.exp && passos < 600) {
    passos++;
    const e = S.exp;
    if (e.pending) { const n = 1 + Math.floor(rnd() * 6); G.roll(n); continue; }
    if (e.escolha) { G.escolherBencao(e.escolha.opcoes[Math.floor(rnd() * e.escolha.opcoes.length)]); continue; }
    const sug = G.sugestoes();
    const pick = (f) => sug.find(f);
    let s =
      (e.combat && aptosLow(S) && pick(x => x.c.startsWith('#usar pocao'))) ||
      (e.combat && pick(x => x.c.startsWith('#atacar'))) ||
      pick(x => x.c === '#sair' && e.completo) ||
      pick(x => x.c.startsWith('#usar pocao ')) ||
      pick(x => x.t === 'cena' && !/Atacar/.test(x.l)) ||
      pick(x => x.t === 'cena') ||
      pick(x => x.c.startsWith('#exam') && /Examinar/.test(x.l) && !visitadas.has(x.c)) ||
      pick(x => x.c.startsWith('#apanhar')) ||
      pick(x => x.c.startsWith('#acao') && !visitadas.has(x.c)) ||
      pick(x => x.c.startsWith('#falar') && !visitadas.has(x.c)) ||
      pick(x => (x.c.startsWith('#forcar') || x.c.startsWith('#arrombar')) && !visitadas.has(x.c + passos)) ||
      pick(x => x.c === '#seguir' && !/Seguir até/.test(x.l)) ||
      pick(x => x.c.startsWith('#porta') && /^Ir:/.test(x.l) && !zonaVisitada(e, x.c) && !visitadas.has(x.c + ':' + e.zone + ':' + Math.floor(passos / 50))) ||
      pick(x => x.c.startsWith('#atacar'));
    if (!s) {
      // ir para uma zona visitada com portas por explorar
      const alvo = alvoExplorar(e);
      if (alvo != null) { G.input('ir para ' + alvo); visitadas.add('viaj' + alvo + passos); continue; }
      if (!e.procurou) { e.procurou = 0; }
      s = { c: '#sair' };
      if (process.env.DBG) { console.log('RETIRADA', mid, seed, 'obj visitado:', d0(e)); }
    }
    visitadas.add(s.c);
    if (s.c.startsWith('#porta')) visitadas.add(s.c + ':' + e.zone + ':' + Math.floor(passos / 50));
    if (verbose) console.log('>', s.l || s.c);
    G.input(s.c);
  }
  if (S.exp && process.env.DBG) dump(S.exp);
  if (S.exp) { erro(`${mid}/${seed}: não terminou em 600 passos (zona ${S.exp.zone}, combate=${!!S.exp.combat})`); dump(S.exp); G.desistir(); }
  return S.ultimo;
}
function d0(e) { return e.dg.zones[e.dg.obj].vis + ' completo:' + e.completo + ' zonas:' + e.dg.zones.filter(z => z.vis).length + '/' + e.dg.zones.length + ' portas:' + e.dg.conns.filter(c=>!c.secreto&&!e.dg.zones[c.room].vis||!e.dg.zones[c.corr].vis).map(c=>c.tipo+(c.aberta?'+':'')).join(','); }
function aptosLow(S) { return S.herois.some(h => h.estado === 'ok' && h.vida <= 2); }
function zonaVisitada(e, cmd) { const c = e.dg.conns[+cmd.split(' ')[1]]; const o = c.room === e.zone ? c.corr : c.room; return e.dg.zones[o].vis; }
function alvoExplorar(e) {
  const d = e.dg;
  for (const z of d.zones) {
    if (!z.vis || z.id === e.zone) continue;
    const temPorta = d.conns.some(c => (c.room === z.id || c.corr === z.id) && (!c.secreto || c.achada) && !d.zones[c.room === z.id ? c.corr : c.room].vis && c.tipo !== 'trancada');
    if (temPorta) { const cell = z.kind === 'sala' ? [z.x, z.y] : z.cells[0]; return C.n(cell[0], cell[1]); }
  }
  return null;
}
function dump(e) { e.log.slice(-25).forEach(l => console.log('    ', l.k, '|', l.t)); }

const N = +process.argv[2] || 40;
const res = {};
let total = 0;
Object.keys(CP.DATA.missoes).forEach(mid => {
  for (let i = 0; i < N; i++) {
    const n = 1 + (i % 4);
    const r = jogar(mid, n, i + 1, false);
    const k = mid;
    res[k] = res[k] || { sucesso: 0, retirada: 0, derrota: 0, morte: 0, desfechos: {} };
    res[k][r.fim]++;
    if (r.desfecho) res[k].desfechos[r.desfecho.titulo] = (res[k].desfechos[r.desfecho.titulo] || 0) + 1;
    total++;
  }
});
// rumores (aventuras procedurais)
for (let i = 0; i < N; i++) {
  const r = jogar('rumor-1-' + (i % 2), 1 + (i % 3), 500 + i, false);
  res.rumores = res.rumores || { sucesso: 0, retirada: 0, derrota: 0, morte: 0 };
  res.rumores[r.fim]++;
}
// masmorra do dia
{ const hoje = G.hojeId(); const a = jogar(hoje, 2, 900, false); const S = G.S();
  if (!S.diarios[hoje] || S.diarios[hoje].estado !== 'feito') erro('diário não registado');
  if (G.missoesDisponiveis().some(m => m.id === hoje)) erro('diário repetível');
  console.log('diário', a.fim, 'pontos', a.pontos, a.relatorio); }
// legado: verificar que relíquias/feitos não rebentam e que os stats contam
{ G.novaCampanha('solo'); const S = G.S(); S.seed = 'leg'; G.criarHeroi('L', 'guerreiro');
  S.reliquiaPendente = 1; const of = G.ofertaReliquia(); if (!of || of.opcoes.length !== 3) erro('oferta relíquia');
  G.escolherReliquia(of.opcoes[0]); if (S.reliquias.length !== 1) erro('relíquia não ficou');
  G.stat('secretas', 3); if (!S.feitos.secretas || !S.desbloq.cartografo) erro('feito secretas');
  G.stat('missoes', 5); if (S.slots !== 4) erro('slot');
  S.ouro = 100; if (!G.contratar('cao') || !G.contratar('escriba') || G.contratar('arqueira')) erro('contratar/limite');
  const h0 = S.herois[0]; S.sobrev = [{ tipo: 'heroi', id: h0.id }, { tipo: 'comp', id: S.comps[0].id }];
  if (G.partir('sinos'), S.exp) erro('partiu com sobrevivência pendente');
  G.rollSobrev(1); if (G.pendenteSobrev().fase !== 'cicatriz') erro('fase cicatriz'); G.rollSobrev(5);
  if (!h0.cicatrizes.includes('peito')) erro('cicatriz'); G.rollSobrev(1); if (S.comps.length !== 1) erro('comp morto');
  if (G.pendenteSobrev()) erro('fila sobrev');
  console.log('sombras ok', h0.cicatrizes, S.comps.map(c => c.nome));
  console.log('legado ok', S.reliquias, Object.keys(S.feitos)); }
console.log(`\nJogos completos: ${total} + ${N} rumores (dados aleatórios justos, robô simples).`);
Object.keys(res).forEach(k => console.log(k.padEnd(10), JSON.stringify(res[k])));
console.log(`\nFalhas totais: ${falhas}`);
process.exit(falhas ? 1 : 0);
