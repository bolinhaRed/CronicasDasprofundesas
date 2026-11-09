/* Intérprete de acções em texto livre (português). Sem IA: um conjunto fechado de verbos, alvos e coordenadas. */
(function (CP) {
  'use strict';

  const V = {
    examinar: ['examinar', 'examino', 'examina', 'ver', 'vejo', 've', 'olhar', 'olho', 'olha', 'observar', 'observo', 'inspeccionar', 'inspecionar', 'inspeciono', 'investigar', 'investigo', 'estudar', 'ler', 'leio', 'le', 'analisar', 'verificar', 'tocar', 'mexer', 'espreitar', 'descrever', 'cheirar'],
    procurar: ['procurar', 'procuro', 'procura', 'revistar', 'revisto', 'buscar', 'vasculhar', 'pesquisar', 'apalpar'],
    ouvir: ['ouvir', 'ouco', 'escutar', 'escuto', 'encostar'],
    abrir: ['abrir', 'abro', 'abre', 'empurrar', 'empurro', 'puxar', 'puxo'],
    forcar: ['forcar', 'forco', 'arrombar', 'arrombo', 'rebentar', 'derrubar', 'pontapear', 'quebrar'],
    destrancar: ['destrancar', 'destranco', 'gazua', 'gazuas', 'fechadura'],
    ir: ['ir', 'vou', 'vai', 'avancar', 'avanco', 'avanca', 'mover', 'movo', 'andar', 'ando', 'entrar', 'entro', 'atravessar', 'atravesso', 'seguir', 'sigo', 'caminhar', 'caminho', 'passar', 'passo', 'dirigir', 'correr', 'corro', 'descer', 'subir', 'continuar', 'continuo', 'deslocar', 'aproximar', 'chegar'],
    voltar: ['voltar', 'volto', 'recuar', 'recuo', 'regressar', 'regresso', 'retroceder'],
    atacar: ['atacar', 'ataco', 'ataca', 'golpear', 'golpeio', 'lutar', 'luto', 'bater', 'bato', 'matar', 'mato', 'disparar', 'disparo', 'esfaquear', 'combater', 'acertar', 'espetar', 'flechar'],
    fugir: ['fugir', 'fujo', 'escapar', 'escapo'],
    furtivo: ['esgueirar', 'esgueiro', 'furtivo', 'furtivamente', 'sorrateiro', 'sorrateiramente', 'despercebido', 'silencio', 'rastejar'],
    falar: ['falar', 'falo', 'fala', 'conversar', 'converso', 'perguntar', 'pergunto', 'dizer', 'digo', 'chamar', 'cumprimentar', 'negociar', 'responder', 'respondo'],
    usar: ['usar', 'uso', 'beber', 'bebo', 'atirar', 'atiro', 'aplicar', 'acender', 'tomar', 'deitar', 'despejar'],
    apanhar: ['apanhar', 'apanho', 'pegar', 'pego', 'levar', 'levo', 'recolher', 'recolho', 'agarrar', 'agarro', 'guardar', 'guardo', 'tirar', 'tiro'],
    descansar: ['descansar', 'descanso', 'repousar', 'dormir', 'acampar'],
    magia: ['conjurar', 'conjuro', 'lancar', 'lanco', 'feitico', 'invocar', 'magia'],
    desarmar: ['desarmar', 'desarmo', 'neutralizar'],
    defender: ['defender', 'defendo', 'bloquear', 'bloqueio', 'aparar', 'aparo', 'guarda'],
    arriscado: ['arriscar', 'arrisco', 'arriscado', 'furia', 'feroz', 'brutal'],
    manobra: ['rasteira', 'manobra', 'atordoar', 'derrubar-o', 'derruba-lo', 'desequilibrar'],
    socorrer: ['socorrer', 'socorro', 'acudir', 'estancar', 'estabilizar', 'tratar'],
    instinto: ['instinto', 'pressentir', 'farejar', 'sentir'],
    sair: ['sair', 'saio', 'abandonar', 'retirar', 'retiro'],
    ajuda: ['ajuda', 'help', 'comandos', 'socorro'],
    estado: ['estado', 'vida', 'ficha'],
    inventario: ['inventario', 'mochila', 'itens', 'objectos', 'objetos'],
    mapa: ['mapa', 'diario']
  };
  const VMAP = {};
  Object.keys(V).forEach(k => V[k].forEach(w => { if (!VMAP[w]) VMAP[w] = k; }));

  const DIRS = { norte: 'N', sul: 'S', este: 'E', leste: 'E', oeste: 'O', poente: 'O', nascente: 'E' };
  const STOP = new Set(['o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas', 'para', 'pra', 'ao', 'aos', 'com', 'e', 'que', 'me', 'te', 'se', 'por', 'pelo', 'pela', 'pelos', 'pelas', 'eu', 'vou', 'quero', 'tento', 'tentar', 'isso', 'esse', 'essa', 'este', 'esta', 'aquele', 'aquela', 'ali', 'aqui', 'la', 'sobre', 'contra', 'entre', 'ate', 'muito', 'bem', 'mais', 'lado', 'parede', 'cuidado', 'com', 'cuidadosamente']);

  CP.Parser = {
    VERBOS: V,
    parse(txt) {
      const raw = CP.norm(txt);
      if (raw.startsWith('#')) return { cmd: raw.slice(1).split(' '), raw };
      const toks = raw.split(' ').filter(Boolean);
      let verb = null, coord = null, dir = null;
      const words = [];
      let num = null;
      for (let i = 0; i < toks.length; i++) {
        let t = toks[i];
        // coordenadas: "c2", "c 2"
        if (/^[a-z]\d{1,2}$/.test(t)) { coord = CP.C.parse(t); continue; }
        if (/^[a-z]$/.test(t) && toks[i + 1] && /^\d{1,2}$/.test(toks[i + 1]) && t !== 'a' && t !== 'o' && t !== 'e') { coord = CP.C.parse(t + toks[i + 1]); i++; continue; }
        if (/^[1-9]$/.test(t) && toks.length === 1) { num = parseInt(t, 10); continue; }
        if (DIRS[t]) {
          const nxt = toks[i + 1];
          const pronome = t === 'este' && nxt && !STOP.has(nxt) && !DIRS[nxt];
          if (!pronome) { dir = DIRS[t]; continue; }
        }
        const raiz = t.split('-')[0];
        if (!verb && (VMAP[t] || VMAP[raiz])) { verb = VMAP[t] || VMAP[raiz]; continue; }
        if (!STOP.has(t)) words.push(t);
      }
      // expressões especiais
      if (/armadilh/.test(raw) && (verb === 'procurar' || verb === 'examinar' || verb === null)) verb = 'armadilhas';
      if (verb === 'desarmar') { /* mantém */ }
      if (/secret|passage|passagens/.test(raw) && (verb === 'procurar' || verb === 'examinar' || verb === null)) verb = 'procurar';
      if (verb === 'ver' && /a volta|em volta|sala/.test(raw)) verb = 'examinar';
      if (!verb && (coord || dir)) verb = 'ir';
      if (!verb && /^(olhar|ver)$/.test(raw)) verb = 'examinar';
      return { verb, coord, dir, words, raw, num };
    }
  };
})(window.CP);
