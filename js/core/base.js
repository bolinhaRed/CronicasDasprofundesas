/* Crónicas das Profundezas — núcleo: espaço de nomes, RNG com sementes, coordenadas, regras D6, gravação.
   Nada aqui toca no DOM. */
window.CP = window.CP || {};
CP.DATA = CP.DATA || {};

(function (CP) {
  'use strict';

  /* ---------- Hash e RNG (mulberry32) — só para GERAR conteúdo, nunca para dados do jogador ---------- */
  CP.hash = function (str) {
    str = String(str);
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };

  CP.rstep = function (s) {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return [s, ((t ^ (t >>> 14)) >>> 0) / 4294967296];
  };

  CP.RNG = function (seed) {
    const o = {
      s: typeof seed === 'number' ? seed | 0 : CP.hash(seed) | 0,
      next() { const r = CP.rstep(o.s); o.s = r[0]; return r[1]; },
      int(a, b) { return a + Math.floor(o.next() * (b - a + 1)); },
      pick(a) { return a[Math.floor(o.next() * a.length)]; },
      chance(p) { return o.next() < p; },
      shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(o.next() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    };
    return o;
  };

  /* ---------- Coordenadas: colunas A.., linhas 1.. (linha 1 = sul, em baixo na folha) ---------- */
  const LET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  CP.C = {
    n(x, y) { return LET[x] + (y + 1); },
    col(x) { return LET[x]; },
    parse(s) {
      const m = /^([a-z])(\d{1,2})$/i.exec(s);
      if (!m) return null;
      return { x: LET.indexOf(m[1].toUpperCase()), y: parseInt(m[2], 10) - 1 };
    },
    DIR: { N: [0, 1], S: [0, -1], E: [1, 0], O: [-1, 0] },
    NOME: { N: 'norte', S: 'sul', E: 'este', O: 'oeste' },
    OPP: { N: 'S', S: 'N', E: 'O', O: 'E' },
    key(x, y) { return x + ',' + y; }
  };

  /* ---------- Regras D6 ---------- */
  CP.Rules = {
    LABEL: { falha: 'Falha', parcial: 'Sucesso parcial', sucesso: 'Sucesso' },
    ATTR: { FOR: 'Força', AGI: 'Agilidade', MEN: 'Mente', SEN: 'Sentidos' },
    // tipo de teste -> atributo
    TESTES: {
      procurar: { attr: 'SEN', nome: 'Procurar' },
      armadilhas: { attr: 'SEN', nome: 'Detectar armadilhas' },
      ouvir: { attr: 'SEN', nome: 'Ouvir' },
      forcar: { attr: 'FOR', nome: 'Forçar' },
      intimidar: { attr: 'FOR', nome: 'Intimidar' },
      arrombar: { attr: 'AGI', nome: 'Arrombar fechadura' },
      desarmar: { attr: 'AGI', nome: 'Desarmar' },
      esquivar: { attr: 'AGI', nome: 'Esquivar' },
      furtivo: { attr: 'AGI', nome: 'Furtividade' },
      fuga: { attr: 'AGI', nome: 'Fuga' },
      defesa: { attr: 'AGI', nome: 'Defesa' },
      ler: { attr: 'MEN', nome: 'Decifrar' },
      falar: { attr: 'MEN', nome: 'Persuadir' },
      magia: { attr: 'MEN', nome: 'Magia' },
      ataque: { attr: null, nome: 'Ataque' }
    },
    MOD_MIN: -2,
    MOD_MAX: 3,
    clamp(m) { return Math.max(this.MOD_MIN, Math.min(this.MOD_MAX, m)); },
    /* 1 natural falha sempre; 6 natural tem sempre sucesso.
       Total 1–2 falha · 3–4 sucesso parcial · 5+ sucesso */
    resolve(nat, mod) {
      const total = nat + mod;
      let band;
      if (nat === 1) band = 'falha';
      else if (nat === 6) band = 'sucesso';
      else band = total <= 2 ? 'falha' : total <= 4 ? 'parcial' : 'sucesso';
      return { nat, mod, total, band };
    },
    XP: [0, 5, 12, 20, 30, 45, 65, 90],
    nivelPorXP(xp) { let n = 1; for (let i = 1; i < this.XP.length; i++) if (xp >= this.XP[i]) n = i + 1; return n; }
  };

  /* ---------- Gravação ---------- */
  CP.Store = {
    KEY: 'cronicas_profundezas_v1',
    load() { try { const s = localStorage.getItem(this.KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
    save(s) { try { localStorage.setItem(this.KEY, JSON.stringify(s)); return true; } catch (e) { return false; } },
    clear() { try { localStorage.removeItem(this.KEY); } catch (e) { /* */ } },
    exportar(s) { return JSON.stringify({ jogo: 'cronicas-das-profundezas', versao: 1, exportado: new Date().toISOString(), campanha: s }, null, 1); },
    importar(txt) {
      const o = JSON.parse(txt);
      const c = o && o.campanha ? o.campanha : o;
      if (!c || c.v !== 1 || !Array.isArray(c.herois)) throw new Error('Ficheiro de campanha inválido.');
      return c;
    }
  };

  /* ---------- Texto ---------- */
  CP.norm = function (s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s#:_-]/g, ' ').replace(/\s+/g, ' ').trim();
  };
  CP.cap = function (s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };
})(window.CP);
