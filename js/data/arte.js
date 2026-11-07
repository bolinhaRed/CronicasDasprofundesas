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
    objectos: ['potion', 'heart', 'feedingBottle', 'gelatin', 'bomb', 'parchment', 'hook', 'lantern', 'rope', 'pickaxe', 'goldenLeaf', 'ruby', 'key', 'chain', 'mask', 'waterBucket', 'compass', 'balance', 'star', 'purse', 'bone', 'sword', 'axe', 'hammer', 'knife', 'bow', 'rod', 'shield', 'money', 'chest', 'padlock', 'door', 'candle', 'crown', 'hourglass', 'treasureMap', 'diamond'],
    itens: {
      pocao: 'potion', bandagens: 'heart', aguabenta: 'feedingBottle', oleo: 'gelatin', polvora: 'bomb', pergaminho: 'parchment',
      gazuas: 'hook', lanterna: 'lantern', corda: 'rope', pecabra: 'pickaxe', amuleto: 'goldenLeaf', gema: 'ruby', chave: 'key',
      anel_valdrem: 'chain', fragmento_ilva: 'mask', almotolia: 'waterBucket', coracao_bronze: 'compass', calice: 'balance',
      mao_ilva: 'star', jarro: 'money', dente: 'bone',
      espada: 'sword', espada_velha: 'sword', espada_ana: 'sword', machado: 'axe', maca: 'hammer', punhal: 'knife', arco: 'bow', cajado: 'rod',
      gibao: 'shield', cota: 'shield', ouro: 'purse'
    }
  };
})(window.CP.DATA);
