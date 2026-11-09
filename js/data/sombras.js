/* Sombras: companheiros contratados, sobrevivência e cicatrizes, pontos de busca,
   façanhas (XP extra) e eventos de sombra profunda. Texto original. */
(function (D) {
  'use strict';

  /* companheiros: agem sozinhos, sem dados (o dado é sempre do jogador) */
  D.companheiros = {
    cao: { nome: 'Cão de caça', icone: 'dente', vida: 4, preco: 15, desc: 'Nas rondas pares de cada combate, morde o inimigo mais ferido (1 de dano). Fareja: +1 a ouvir.' },
    arqueira: { nome: 'Arqueira', icone: 'arco', vida: 3, preco: 20, desc: 'No início de cada combate dispara uma flecha (1 de dano). Quem foge leva outra.' },
    escudeiro: { nome: 'Escudeiro', icone: 'escudo', vida: 6, preco: 20, desc: 'O primeiro golpe de cada combate vai para ele e não para ti.' },
    escriba: { nome: 'Escriba', icone: 'pergaminho', vida: 3, preco: 15, desc: '+1 a decifrar e a procurar. Descobre pontos de busca extra.' },
    curandeira: { nome: 'Irmã curandeira', icone: 'bandagens', vida: 3, preco: 25, desc: 'No fim de cada combate, trata 1 de Vida ao herói mais ferido.' }
  };
  D.maxCompanheiros = n => (n <= 1 ? 2 : 1);

  /* sobrevivência: quem caiu na masmorra lança 1D6 na aldeia */
  D.sobrevivencia = [
    { t: 'Cicatriz para a vida. Lança outra vez para ver qual.', tipo: 'cicatriz' },
    { t: 'Gravemente ferido. Começa a próxima expedição com −2 de Vida.', tipo: 'ferido' },
    { t: 'Gravemente ferido. Começa a próxima expedição com −2 de Vida.', tipo: 'ferido' },
    { t: 'Por um triz. Na confusão, perdeu algo da mochila.', tipo: 'perda' },
    { t: 'Por um triz. Na confusão, perdeu algo da mochila.', tipo: 'perda' },
    { t: 'Só arranhões. Recupera por completo.', tipo: 'ok' }
  ];
  D.cicatrizes = [
    { id: 'perna', nome: 'Joelho torto', desc: '−1 a fuga e esquivar.', testes: ['fuga', 'esquivar'] },
    { id: 'braco', nome: 'Braço mal soldado', desc: '−1 a ataques corpo a corpo.', testes: ['ataque'], corpo: true },
    { id: 'dedos', nome: 'Dedos a menos', desc: '−1 a arrombar e desarmar.', testes: ['arrombar', 'desarmar'] },
    { id: 'olho', nome: 'Olho vazado', desc: '−1 a procurar e detectar armadilhas.', testes: ['procurar', 'armadilhas'] },
    { id: 'peito', nome: 'Costelas partidas', desc: '−1 de Vida máxima.', vida: -1 },
    { id: 'pesadelos', nome: 'Pesadelos', desc: '−1 a decifrar e a magia.', testes: ['ler', 'magia'] }
  ];
  D.sobrevCompanheiro = [
    { t: 'Não resistiu aos ferimentos.', tipo: 'morto' },
    { t: 'Não resistiu aos ferimentos.', tipo: 'morto' },
    { t: 'Ferido: falta à próxima expedição.', tipo: 'ferido' },
    { t: 'Ferido: falta à próxima expedição.', tipo: 'ferido' },
    { t: 'Recupera e está pronto.', tipo: 'ok' },
    { t: 'Recupera e está pronto.', tipo: 'ok' }
  ];

  /* pontos de busca: aparecem em algumas salas; revistar pede um teste e, se correr bem, 1D6 nesta tabela */
  D.locaisBusca = ['um monte de entulho', 'o cadáver de um aventureiro', 'um baú desfeito', 'um ninho de trapos', 'uma pilha de ossos', 'um armário caído'];
  D.achados = [
    { t: 'Algo se mexe por baixo! Era um esconderijo, e o dono não gostou da visita.', efeitos: [{ inimigo: '*' }, { combate: true }] },
    { t: 'Um frasco de unguento, ainda selado.', efeitos: [{ item: 'pocao' }] },
    { t: 'Uma bolsa de couro com moedas.', efeitos: [{ ouro: 6 }] },
    { t: 'Um mapa rabiscado por quem cá esteve antes de ti.', efeitos: [{ revela: 'zona' }, { luz: 2 }] },
    { t: 'Um sobrevivente! Ferido, mas vivo. Junta-se a ti; leva-o até à saída.', sobrevivente: true },
    { t: 'Um esconderijo de tesouro!', efeitos: [{ loot: 'grande' }] }
  ];

  /* façanhas: XP extra em cada expedição (excepto se a companhia cair) */
  D.facanhas = [
    { id: 'todas_salas', nome: 'Explorar todas as salas', xp: 2 },
    { id: 'todas_pistas', nome: 'Encontrar todas as pistas', xp: 2 },
    { id: 'resgate', nome: 'Levar um sobrevivente até à saída', xp: 2 },
    { id: 'ninguem_caiu', nome: 'Ninguém da companhia cai', xp: 1 },
    { id: 'cinco', nome: 'Vencer 5 inimigos', xp: 1 },
    { id: 'buscas', nome: 'Revistar 3 pontos de busca', xp: 1 }
  ];

  /* sombra profunda: a partir da segunda vez que a tensão enche, a masmorra reage */
  D.sombras = [
    { id: 'uivo', t: 'Um uivo atravessa as paredes e gela o sangue. O próximo teste de cada herói tem −1.' },
    { id: 'nevoa', t: 'Uma névoa fria sobe do chão. Até saíres, −1 a procurar, ouvir e detectar armadilhas.' },
    { id: 'furia', t: 'Sentes um formigueiro no ar: as criaturas ganham forças. No próximo combate, fazem +1 de dano.' },
    { id: 'frio', t: 'Um sopro gelado quase apaga a chama.', luz: -2 },
    { id: 'desanimo', t: 'Um peso esmaga-vos o peito. Perdes 2 de ímpeto.' },
    { id: 'campeao', t: 'A escuridão junta-se num vulto, e o vulto ganha forma. Algo maior do que os outros vem a caminho!' }
  ];
})(window.CP.DATA);
