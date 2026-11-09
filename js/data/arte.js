/* Arte em pixel: retratos (12 personagens × 6 expressões) e ícones de objectos.
   Folhas: assets/retratos.png (linhas = personagens, colunas = expressões, 32×32) e assets/objectos.png (uma linha, 32×32).
   Licenças em assets/LICENCAS.md. */
(function (D) {
  'use strict';
  D.arte = {
    personagens: ['knight', 'warrior', 'mage', 'rogue', 'cleric', 'ranger', 'merchant', 'bard', 'goblin', 'skeleton', 'slime', 'wolf'],
    expressoes: ['neutral', 'happy', 'angry', 'sad', 'surprised', 'hurt'],
    // retratos que os heróis podem escolher
    herois: ['knight', 'warrior', 'rogue', 'ranger', 'mage', 'cleric', 'bard', 'merchant'],
    porClasse: { guerreiro: 'knight', ladrao: 'rogue', explorador: 'ranger', mistico: 'mage' },
    // criaturas e personagens (por id de definição ou nome)
    inimigos: {
      esqueleto: 'skeleton', ratazanas: 'wolf', carnical: 'skeleton', espectro: 'skeleton',
      goblin: 'goblin', aranha: 'wolf', toupeira: 'wolf', brutamontes: 'goblin',
      afogado: 'skeleton', enguia: 'slime', sectario: 'warrior', sapo: 'slime',
      carnical_mor: 'skeleton', chamado: 'skeleton', aranha_mae: 'wolf', chefe_brutamontes: 'goblin', coisa_lodo: 'slime', profeta: 'cleric',
      senhor: 'skeleton', grakk: 'goblin', fole: 'goblin', lampreia: 'slime', sentinela: 'knight', rufo: 'warrior', capanga: 'warrior',
      guardiao: 'skeleton', rei: 'skeleton', guarda_real: 'skeleton'
    },
    porTipo: { morto: 'skeleton', fera: 'wolf', humanoide: 'warrior', constructo: 'knight' },
    npcs: { velha: ['mage', 'neutral'], fantasma_mineiro: ['skeleton', 'sad'], peregrina: ['bard', 'sad'], 'Irmão Osric': ['cleric', 'surprised'], 'Tomé': ['merchant', 'sad'], 'Lia': ['bard', 'sad'] },
    aldeia: { mercado: ['merchant', 'happy'], forja: ['warrior', 'neutral'], estalagem: ['bard', 'happy'], templo: ['cleric', 'neutral'] },
    // ícones (assets/icones.png, células de 32×32, por esta ordem)
    objectos: ["pocao", "aguabenta", "ouro", "chave", "gema", "amuleto", "anel_valdrem", "coracao_bronze", "espada", "machado", "arco", "cajado", "punhal", "maca", "gibao", "cota", "tocha", "lanterna", "oleo", "polvora", "pergaminho", "bandagens", "gazuas", "corda", "pecabra", "fragmento_ilva", "almotolia", "calice", "mao_ilva", "jarro", "dente", "d1", "d2", "d3", "d4", "d5", "d6", "dado", "saco", "livro", "escudo", "mapa", "estrela", "vida", "caneca", "caldeirao", "vela", "olho", "teia"],
    itens: { espada_velha: 'espada', espada_ana: 'espada', maca_prata: 'maca', arco_longo: 'arco' },
    // retratos redondos (assets/retratos2.png, 40 células): criaturas e personagens
    p39: {
      esqueleto: 24, ratazanas: 22, carnical: 11, espectro: 37, goblin: 8, aranha: 25, toupeira: 40, brutamontes: 10,
      afogado: 39, enguia: 39, sectario: 33, sapo: 5, carnical_mor: 11, chamado: 24, aranha_mae: 25, chefe_brutamontes: 35,
      coisa_lodo: 4, profeta: 13, senhor: 14, grakk: 9, fole: 8, lampreia: 23, sentinela: 26, rufo: 15, capanga: 32,
      guardiao: 29, rei: 34, guarda_real: 24,
      velha: 37, fantasma_mineiro: 36, peregrina: 2, 'Irmão Osric': 13, 'Tomé': 18, 'Lia': 16,
      estalagem: 1, mercado: 3, forja: 15, templo: 13
    },
    porTipoP39: { morto: 24, fera: 21, humanoide: 32, constructo: 26 },
    heroisP39: [1, 2, 3, 13, 14, 15, 16, 17, 18, 32, 33, 36]
  };
})(window.CP.DATA);
