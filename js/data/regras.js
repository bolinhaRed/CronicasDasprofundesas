/* Dados de regras: classes, armas, armaduras, objectos, tesouros. */
(function (D) {
  'use strict';

  D.classes = {
    guerreiro: {
      nome: 'Guerreiro', vida: 10, attr: { FOR: 2, AGI: 0, MEN: 0, SEN: 1 },
      arma: 'espada', armadura: 'gibao', escudo: true, foco: 0, itens: { pocao: 1 },
      desc: 'Aço, músculo e teimosia. Aguenta golpes que matariam outros.',
      habs: ['Escudo: uma vez por combate, anula por completo um golpe inimigo.', '+1 para forçar portas, tampas e grades.']
    },
    ladrao: {
      nome: 'Ladrão', vida: 7, attr: { FOR: 0, AGI: 2, MEN: 0, SEN: 1 },
      arma: 'punhal', armadura: null, foco: 0, itens: { gazuas: 1, oleo: 1 },
      desc: 'Dedos leves, passos de gato e pouca vontade de lutar de frente.',
      habs: ['+1 em armadilhas, fechaduras e furtividade.', 'Ataque furtivo: com o punhal, o dano duplica contra inimigos desprevenidos.']
    },
    explorador: {
      nome: 'Explorador', vida: 8, attr: { FOR: 1, AGI: 1, MEN: 0, SEN: 2 },
      arma: 'arco', armadura: null, foco: 0, itens: { lanterna: 1, corda: 1, bandagens: 1 },
      desc: 'Lê pegadas, cheira o perigo e acerta num rato a vinte passos.',
      habs: ['Primeiro disparo: o primeiro ataque com arco de cada combate nunca sofre resposta.', '+1 a ouvir e a esquivar armadilhas.', 'Instinto: uma vez por expedição, pressente armadilhas e perigos próximos.']
    },
    mistico: {
      nome: 'Místico', vida: 6, attr: { FOR: 0, AGI: 0, MEN: 2, SEN: 1 },
      arma: 'cajado', armadura: null, foco: 3, itens: { aguabenta: 1 },
      desc: 'Conhece as palavras antigas e o preço de as dizer.',
      habs: ['Foco (3 por expedição): Curar (3 Vida), Selo (ataque de Mente: 3 de dano a mortos-vivos, 2 aos restantes), Revelar (mostra o que está oculto na zona).', '+1 a decifrar inscrições.']
    }
  };

  D.armas = {
    punhos: { nome: 'Punhos', attr: 'FOR', dano: 1, preco: 0 },
    espada: { nome: 'Espada', attr: 'FOR', dano: 2, preco: 12 },
    espada_velha: { nome: 'Espada velha', attr: 'FOR', dano: 2, preco: 6 },
    machado: { nome: 'Machado', attr: 'FOR', dano: 2, forcar: 1, preco: 14, nota: '+1 para forçar' },
    maca: { nome: 'Maça', attr: 'FOR', dano: 2, vsMorto: 1, preco: 14, nota: '+1 contra mortos-vivos' },
    punhal: { nome: 'Punhal', attr: 'AGI', dano: 1, furtivo: true, preco: 4, nota: 'dano duplo em ataque furtivo (Ladrão)' },
    arco: { nome: 'Arco', attr: 'AGI', dano: 1, distancia: true, preco: 10, nota: 'primeiro disparo sem resposta (Explorador)' },
    cajado: { nome: 'Cajado', attr: 'FOR', dano: 1, preco: 2 },
    espada_ana: { nome: 'Espada anã', attr: 'FOR', dano: 3, preco: 40, nota: 'forjada com o bronze da mina' }
  };

  D.armaduras = {
    gibao: { nome: 'Gibão de couro', vida: 1, preco: 8 },
    cota: { nome: 'Cota de malha', vida: 2, preco: 20 }
  };

  /* uso: cura | cura_fora | santa | fogo | polvora | revelar | reliquia | passivo | chave | valor */
  D.itens = {
    pocao: { nome: 'Poção de cura', uso: 'cura', valor: 3, preco: 6, desc: 'Recupera 3 de Vida.' },
    bandagens: { nome: 'Bandagens', uso: 'cura_fora', valor: 1, preco: 3, desc: 'Fora de combate, recupera 2 de Vida.' },
    aguabenta: { nome: 'Água benta', uso: 'santa', valor: 2, preco: 5, desc: 'Em combate: 2 de dano automático a um morto-vivo.' },
    oleo: { nome: 'Frasco de óleo', uso: 'fogo', valor: 2, preco: 4, desc: 'Em combate: 2 de dano automático (3 a feras).' },
    polvora: { nome: 'Saco de pólvora', uso: 'polvora', valor: 3, preco: 0, desc: 'Em combate: 3 de dano automático. Barulhento.' },
    pergaminho: { nome: 'Pergaminho de luz', uso: 'revelar', valor: 3, preco: 0, desc: 'Revela tudo o que está oculto na zona.' },
    gazuas: { nome: 'Gazuas', uso: 'passivo', valor: 2, preco: 6, desc: '+1 para arrombar fechaduras.' },
    lanterna: { nome: 'Lanterna', uso: 'passivo', valor: 2, preco: 5, desc: '+1 para procurar.' },
    corda: { nome: 'Corda', uso: 'passivo', valor: 1, preco: 2, desc: 'Reduz em 1 o dano de fossos e quedas.' },
    pecabra: { nome: 'Pé-de-cabra', uso: 'passivo', valor: 2, preco: 5, desc: '+1 para forçar.' },
    amuleto: { nome: 'Amuleto de âmbar', uso: 'passivo', valor: 6, preco: 0, desc: '+1 para decifrar e para magia.' },
    gema: { nome: 'Gema', uso: 'valor', valor: 8, preco: 0, desc: 'Vale 8 moedas no mercado.' },
    chave: { nome: 'Chave de ferro', uso: 'chave', valor: 0, preco: 0, desc: 'Abre uma porta trancada desta masmorra.', temporario: true },
    // objectos de missão
    anel_valdrem: { nome: 'Anel de Valdrem', uso: 'passivo', valor: 15, preco: 0, desc: 'Prata negra e fria. +1 para decifrar e para magia.' },
    fragmento_ilva: { nome: 'Cabeça da estátua de Santa Ilva', uso: 'valor', valor: 0, preco: 0, desc: 'Um fragmento de pedra branca.', temporario: true },
    almotolia: { nome: 'Almotolia de óleo', uso: 'valor', valor: 0, preco: 0, desc: 'Óleo grosso de máquina.', temporario: true },
    coracao_bronze: { nome: 'Coração de bronze', uso: 'valor', valor: 30, preco: 0, desc: 'Um mecanismo anão, ainda morno. Vale 30 moedas.' },
    calice: { nome: 'Cálice de prata', uso: 'valor', valor: 0, preco: 0, desc: 'O cálice da capela de Corvamonte.', temporario: true },
    mao_ilva: { nome: 'Mão de Santa Ilva', uso: 'reliquia', valor: 0, preco: 0, desc: 'Uma vez por expedição: todo o grupo recupera 2 de Vida. Diz-se que sela os mortos.' },
    jarro: { nome: 'Jarro canópico', uso: 'valor', valor: 0, preco: 0, desc: 'Lá dentro, algo bate como um coração.', temporario: true },
    dente: { nome: 'Dente da criatura', uso: 'valor', valor: 0, preco: 0, desc: 'Prova do que fizeste.', temporario: true }
  };

  D.loot = {
    pequeno: [{ ouro: [2, 5] }, { item: 'bandagens' }, { item: 'oleo' }, { ouro: [3, 6] }, { ouro: [1, 3] }],
    medio: [{ ouro: [5, 10] }, { item: 'pocao' }, { item: 'gema' }, { item: 'aguabenta' }, { ouro: [4, 8], item: 'bandagens' }],
    grande: [{ ouro: [10, 16], item: 'pocao' }, { ouro: [8, 12], item: 'gema' }, { ouro: [5, 8], item: 'amuleto' }, { ouro: [6, 10], item: 'pergaminho' }]
  };

  D.mercado = ['pocao', 'bandagens', 'oleo', 'aguabenta', 'lanterna', 'corda', 'gazuas', 'pecabra'];
  D.ferreiro = ['espada', 'machado', 'maca', 'punhal', 'arco', 'cajado', 'gibao', 'cota', 'espada_ana'];
})(window.CP.DATA);
