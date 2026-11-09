/* Dilemas: pequenas cenas que aparecem em salas que de outro modo estariam vazias.
   Cada uma obriga a uma escolha com risco e recompensa. «Deixar e seguir» é acrescentado automaticamente.
   inimigo: '*' = criatura ao calhas do tipo de masmorra; 'morto' = um morto-vivo do tipo de masmorra. */
(function (D) {
  'use strict';
  D.dilemas = [
    { id: 'fosso', nome: 'fosso', icone: 'teia', kw: ['fosso', 'buraco', 'tabua', 'ponte', 'bolsa'], desc: 'um fosso atravessado por uma tábua podre',
      fala: 'O chão abre-se num fosso escuro, atravessado por uma única tábua podre. Do fundo sobe um cheiro a coisa morta. Do outro lado, no rebordo, brilha uma bolsa esquecida.',
      opcoes: [
        { id: 'saltar', rotulo: 'Atravessar a tábua e apanhar a bolsa', kw: ['atravessar', 'tabua', 'saltar', 'bolsa'], teste: 'esquivar', res: {
          sucesso: [{ t: 'Passas leve como um gato e apanhas a bolsa.' }, { loot: 'medio' }],
          parcial: [{ t: 'A tábua estala. Agarras a bolsa, mas esfolas-te a saltar para o rebordo.' }, { dano: 1 }, { loot: 'medio' }],
          falha: [{ t: 'A tábua parte-se. Caes no fosso, entre ossos e lama.' }, { dano: 2 }] } },
        { id: 'corda', rotulo: 'Prender a corda e descer com calma', kw: ['corda', 'prender', 'descer'], requerItem: 'corda', efeitos: [{ t: 'Com a corda bem presa, chegas à bolsa sem pressa nem perigo. Lá dentro há mais do que esperavas.' }, { loot: 'medio' }, { tick: 1 }] }
      ] },
    { id: 'jaula', nome: 'jaula', icone: 'chave', kw: ['jaula', 'gaiola', 'prisioneiro', 'homem', 'grades'], desc: 'uma jaula de ferro com alguém lá dentro',
      fala: 'Numa jaula de ferro pendurada do tecto, um homem magro agarra as grades. «Tira-me daqui, por amor de Deus! Eu sei coisas sobre este lugar!»',
      opcoes: [
        { id: 'libertar', rotulo: 'Forçar as grades', kw: ['forcar', 'libertar', 'abrir', 'grades'], teste: 'forcar', res: {
          sucesso: [{ t: 'As grades cedem. O homem abraça-te, conta-te o que sabe e foge para a superfície.' }, { dica: true }, { impeto: 2 }],
          parcial: [{ t: 'Abres a jaula com um estrondo que ecoa por todo o lado. Ele fala depressa e foge a correr.' }, { dica: true }, { tick: 2 }],
          falha: [{ t: 'O ferro não cede, e o barulho espalha-se. O homem chora baixinho.' }, { tick: 2 }] } },
        { id: 'chave', rotulo: 'Experimentar a chave de ferro', kw: ['chave'], requerItem: 'chave', efeitos: [{ t: 'A chave também serve aqui. O homem sai, agradecido, e dá-te o pouco que tem.' }, { ouro: 4 }, { dica: true }] }
      ] },
    { id: 'idolo', nome: 'ídolo de olhos vermelhos', icone: 'gema', kw: ['idolo', 'olhos', 'estatua', 'rubis', 'rubi'], desc: 'um ídolo de pedra com olhos de rubi',
      fala: 'Num nicho, um ídolo de pedra sorri com dentes afiados. Os olhos são dois rubis do tamanho de nozes. À volta do nicho, a pedra está riscada por unhas.',
      opcoes: [
        { id: 'arrancar', rotulo: 'Soltar os rubis com a faca', kw: ['arrancar', 'rubis', 'olhos', 'tirar', 'soltar'], teste: 'desarmar', res: {
          sucesso: [{ t: 'Com a ponta da faca, soltas os dois rubis sem que nada aconteça.' }, { item: 'gema' }, { item: 'gema' }],
          parcial: [{ t: 'Soltas um rubi. O segundo resiste, e o ídolo range como se acordasse.' }, { item: 'gema' }, { tick: 2 }],
          falha: [{ t: 'Ao tocares no rubi, a boca do ídolo cospe uma nuvem de pó a arder.' }, { dano: 2 }, { tick: 1 }] } }
      ] },
    { id: 'poco_negro', nome: 'poço de água negra', icone: 'caldeirao', kw: ['poco', 'agua', 'fundo', 'brilho'], desc: 'um poço de água negra com um brilho no fundo',
      fala: 'Um poço de água parada, negra como tinta. Lá no fundo, algo brilha. Algo grande, ou algo perto?',
      opcoes: [
        { id: 'mergulhar', rotulo: 'Mergulhar para o apanhar', kw: ['mergulhar', 'agua', 'apanhar', 'nadar'], teste: 'forcar', res: {
          sucesso: [{ t: 'A água gela-te os ossos, mas sobes com o tesouro na mão.' }, { loot: 'grande' }],
          parcial: [{ t: 'Agarras o brilho, mas algo te morde a perna antes de saíres.' }, { loot: 'medio' }, { dano: 2 }],
          falha: [{ t: 'O fundo é muito mais fundo do que parecia. Sobes sem ar e de mãos vazias.' }, { dano: 1 }] } }
      ] },
    { id: 'cadaver', nome: 'aventureiro morto', icone: 'dente', tipos: ['cripta', 'santuario'], kw: ['cadaver', 'corpo', 'aventureiro', 'mochila', 'morto'], desc: 'o corpo de um aventureiro de mochila às costas',
      fala: 'Um aventureiro jaz encostado à parede, ainda de mochila às costas. Não morreu há muito. Não tem ferimentos à vista — e é isso que mais te preocupa.',
      opcoes: [
        { id: 'revistar', rotulo: 'Revistar a mochila', kw: ['revistar', 'mochila', 'procurar'], teste: 'procurar', res: {
          sucesso: [{ t: 'Tochas, pão seco e uma bolsa. Ele já não vai precisar.' }, { item: 'tocha' }, { item: 'tocha' }, { loot: 'pequeno' }],
          parcial: [{ t: 'Encontras uma tocha... e o morto abre os olhos.' }, { item: 'tocha' }, { inimigo: 'morto' }],
          falha: [{ t: 'A mão do morto fecha-se no teu pulso. Ele levanta-se!' }, { inimigo: 'morto' }] } }
      ] },
    { id: 'mineiro_preso', nome: 'mineiro soterrado', icone: 'dente', tipos: ['mina'], kw: ['mineiro', 'pedras', 'soterrado', 'homem'], desc: 'um mineiro preso debaixo de pedras',
      fala: 'Debaixo de um monte de pedras, um mineiro geme. Tem as pernas presas. «Ajuda... por favor... tenho uma coisa para ti.»',
      opcoes: [
        { id: 'tirar', rotulo: 'Levantar as pedras', kw: ['levantar', 'pedras', 'ajudar', 'tirar'], teste: 'forcar', res: {
          sucesso: [{ t: 'Levantas a última pedra. O mineiro dá-te o que guardava no bolso e arrasta-se para a saída, a abençoar-te.' }, { loot: 'medio' }, { impeto: 2 }],
          parcial: [{ t: 'Consegues soltá-lo, mas as pedras escorregam e magoam-te.' }, { dano: 1 }, { loot: 'pequeno' }],
          falha: [{ t: 'As pedras não se mexem. O mineiro chora. O esforço deixa-te sem fôlego.' }, { tick: 2 }] } }
      ] },
    { id: 'altar_sangue', nome: 'altar manchado', icone: 'vida', kw: ['altar', 'sangue', 'pedra', 'oferenda'], desc: 'um altar manchado de sangue seco',
      fala: 'Um altar baixo, escurecido por sangue antigo. Uma voz que não é bem uma voz sussurra-te ao ouvido: «Dá-me um pouco de ti, e dou-te coragem.»',
      opcoes: [
        { id: 'sangue', rotulo: 'Oferecer o teu sangue (2 de dano, +4 ímpeto)', kw: ['sangue', 'oferecer', 'cortar'], efeitos: [{ t: 'Cortas a palma da mão sobre a pedra. O sangue desaparece, como se a pedra tivesse sede. Sentes-te imparável.' }, { dano: 2 }, { impeto: 4 }] },
        { id: 'moedas', rotulo: 'Oferecer 5 moedas', kw: ['moedas', 'ouro'], requerOuro: 5, efeitos: [{ t: 'As moedas afundam-se na pedra como em água. Uma onda morna passa por todo o grupo.' }, { ouro: -5 }, { curaTodos: 2 }] }
      ] },
    { id: 'cogumelos', nome: 'cogumelos luminosos', icone: 'olho', kw: ['cogumelos', 'fungos', 'cogumelo'], desc: 'um tapete de cogumelos que brilham azuis',
      fala: 'O chão está coberto de cogumelos que brilham com uma luz azul e fria. Cheiram a terra molhada e a mel.',
      opcoes: [
        { id: 'provar', rotulo: 'Provar um', kw: ['comer', 'provar'], teste: 'ler', res: {
          sucesso: [{ t: 'Conheces estes: são os que as curandeiras vendem caro.' }, { cura: 3 }],
          parcial: [{ t: 'Sabem a terra. Nada acontece... por agora.' }],
          falha: [{ t: 'As paredes começam a respirar. Vês coisas que não estão lá.' }, { dano: 1 }, { tick: 2 }] } },
        { id: 'colher', rotulo: 'Colher para fazer luz', kw: ['colher', 'apanhar', 'luz'], efeitos: [{ t: 'Juntas um molho de cogumelos num pano. A luz azul não é bonita, mas dura.' }, { luz: 3 }] }
      ] },
    { id: 'ninho', nome: 'ninho de ratos', icone: 'ouro', kw: ['ninho', 'ratos', 'buraco'], desc: 'um ninho de ratos com algo a brilhar lá dentro',
      fala: 'Num buraco da parede, um ninho de trapos e palha. Lá dentro, entre guinchos, brilha metal amarelo.',
      opcoes: [
        { id: 'mao', rotulo: 'Meter a mão', kw: ['mao', 'meter'], teste: 'esquivar', res: {
          sucesso: [{ t: 'Tiras a mão cheia de moedas antes que os dentes cheguem.' }, { ouro: 7 }],
          parcial: [{ t: 'Moedas — e uma dentada.' }, { ouro: 4 }, { dano: 1 }],
          falha: [{ t: 'Uma dúzia de dentes crava-se na tua mão.' }, { dano: 2 }] } },
        { id: 'fumo', rotulo: 'Afugentá-los com fumo (gasta 2 de luz)', kw: ['fumo', 'tocha', 'afugentar'], efeitos: [{ t: 'Encostas a chama à palha. Os ratos fogem em pânico e o ouro fica para ti.' }, { luz: -2 }, { ouro: 5 }] }
      ] },
    { id: 'mapa_parede', nome: 'mapa riscado', icone: 'mapa', kw: ['mapa', 'riscos', 'desenho', 'carvao'], desc: 'um mapa riscado na parede a carvão',
      fala: 'Alguém desenhou um mapa na parede, a carvão, com setas e cruzes. Parte já se apagou com a humidade.',
      opcoes: [
        { id: 'estudar', rotulo: 'Estudar o mapa', kw: ['estudar', 'ler', 'mapa'], teste: 'ler', res: {
          sucesso: [{ t: 'As cruzes são armadilhas. Agora sabes onde estão todas.' }, { revela: 'armadilhas' }],
          parcial: [{ t: 'Percebes pelo menos uma coisa útil.' }, { dica: true }],
          falha: [{ t: 'Riscos sem sentido. Perdeste tempo.' }, { tick: 1 }] } }
      ] },
    { id: 'voz', nome: 'voz na parede', icone: 'vela', kw: ['voz', 'parede', 'sussurro', 'crianca'], desc: 'uma parede de onde sai uma voz',
      fala: 'De dentro da parede sai uma voz de criança: «Estou presa... fala comigo e eu ajudo-te.» Não há porta nem fenda por onde alguém pudesse ter entrado.',
      opcoes: [
        { id: 'conversar', rotulo: 'Falar com a voz', kw: ['falar', 'conversar', 'responder'], teste: 'falar', res: {
          sucesso: [{ t: 'Falas com calma até a voz sossegar. Antes de se calar, conta-te um segredo deste lugar.' }, { dica: true }, { impeto: 1 }],
          parcial: [{ t: 'A voz ri-se, diz-te uma coisa verdadeira e cala-se.' }, { dica: true }, { tick: 1 }],
          falha: [{ t: 'A voz grita. A pedra racha, e algo sai pela fenda!' }, { inimigo: '*' }] } }
      ] },
    { id: 'provisoes', nome: 'provisões esquecidas', icone: 'caneca', kw: ['barril', 'provisoes', 'comida', 'vinho', 'saco'], desc: 'um barril e um saco de provisões esquecidas',
      fala: 'Um barril de vinho azedo e um saco de pão duro, esquecidos por alguém que nunca voltou para os buscar.',
      opcoes: [
        { id: 'comer', rotulo: 'Comer e beber (gasta tempo)', kw: ['comer', 'beber'], efeitos: [{ t: 'O vinho é mau e o pão é pedra, mas aquece por dentro.' }, { curaTodos: 2 }, { tick: 2 }] },
        { id: 'levar', rotulo: 'Levar o que presta', kw: ['levar', 'apanhar'], efeitos: [{ t: 'Aproveitas um frasco de óleo e umas tiras de pano limpo.' }, { item: 'oleo' }, { item: 'bandagens' }] }
      ] }
  ];

  /* eventos com escolha: surgem quando a tensão enche */
  D.eventosEscolha = [
    { id: 'passos', nome: 'passos no escuro', icone: 'vela', fala: 'Passos aproximam-se, pesados e sem pressa. Ainda não te viram. Tens um instante para decidir.',
      opcoes: [
        { id: 'esconder', rotulo: 'Esconder-te nas sombras', kw: ['esconder', 'sombras'], teste: 'furtivo', res: {
          sucesso: [{ t: 'A coisa passa a um palmo de ti e segue caminho. No chão, onde parou, ficou algo caído.' }, { loot: 'pequeno' }],
          parcial: [{ t: 'Passa por ti... e pára. Fareja. Depois segue. O coração quase te salta do peito.' }, { tick: 1 }],
          falha: [{ t: 'Pisas um osso. A coisa vira-se para ti!' }, { inimigo: '*' }] } },
        { id: 'emboscar', rotulo: 'Preparar uma emboscada', kw: ['emboscar', 'emboscada', 'atacar'], efeitos: [{ t: 'Esperas encostado à parede e saltas sobre a criatura antes que ela perceba.' }, { inimigo: '*', ferido: 1 }, { impeto: 1 }] }
      ], semIgnorar: true },
    { id: 'tecto', nome: 'o tecto a ceder', icone: 'teia', fala: 'Um estalo enorme por cima de ti. Pó, pedrinhas... o tecto está a ceder!',
      opcoes: [
        { id: 'correr', rotulo: 'Saltar para longe', kw: ['correr', 'saltar', 'fugir'], teste: 'esquivar', res: {
          sucesso: [{ t: 'Atiras-te para o lado no momento exacto. As pedras caem onde estavas.' }, { impeto: 1 }],
          parcial: [{ t: 'Escapas quase inteiro. Uma pedra apanha-te o ombro.' }, { dano: 1 }],
          falha: [{ t: 'O tecto cai-te em cima.' }, { dano: 2 }] } },
        { id: 'escorar', rotulo: 'Segurar a viga com os braços', kw: ['segurar', 'viga', 'escorar'], teste: 'forcar', res: {
          sucesso: [{ t: 'Seguras a viga com um rugido até o tremor passar. Por trás das pedras soltas aparece um buraco com algo lá dentro.' }, { loot: 'medio' }],
          parcial: [{ t: 'Aguentas, mas os braços gritam de dor.' }, { dano: 1 }, { impeto: 2 }],
          falha: [{ t: 'A viga é pesada de mais.' }, { dano: 2 }] } }
      ], semIgnorar: true },
    { id: 'luz_fantasma', nome: 'luz fantasma', icone: 'olho', fala: 'Uma luzinha azul aparece no ar, dança à tua frente e afasta-se devagar, como quem diz «anda».',
      opcoes: [
        { id: 'seguir', rotulo: 'Seguir a luz', kw: ['seguir', 'luz'], teste: 'procurar', res: {
          sucesso: [{ t: 'A luz pára sobre uma laje solta. Debaixo dela, um esconderijo antigo.' }, { loot: 'medio' }],
          parcial: [{ t: 'A luz leva-te a umas moedas esquecidas e apaga-se.' }, { loot: 'pequeno' }, { tick: 1 }],
          falha: [{ t: 'A luz leva-te direito a uma fenda. Por pouco não caes; esfolas as pernas.' }, { dano: 1 }] } }
      ], ignorar: 'Não seguir', ignorarTxt: 'A luz espera um pouco, desiludida, e apaga-se.' },
    { id: 'ladrao', nome: 'mãozinhas rápidas', icone: 'ouro', fala: 'Algo pequeno e rápido salta das sombras e agarra a tua bolsa!',
      opcoes: [
        { id: 'agarrar', rotulo: 'Agarrá-lo!', kw: ['agarrar', 'apanhar'], teste: 'esquivar', res: {
          sucesso: [{ t: 'Apanha-lo pela cauda. Larga a tua bolsa — e a dele, também.' }, { ouro: 4 }],
          parcial: [{ t: 'Recuperas a bolsa, mas levou umas moedas.' }, { ouro: -2 }],
          falha: [{ t: 'Desaparece por uma fenda com parte do teu ouro.' }, { ouro: -5 }] } }
      ], ignorar: 'Deixá-lo ir', ignorarTxt: 'Foge com algumas moedas.', ignorarEf: [{ ouro: -3 }] },
    { id: 'vento', nome: 'sopro gelado', icone: 'vela', fala: 'Um sopro gelado vem do fundo das galerias e a tua luz vacila. Vai apagar-se!',
      opcoes: [
        { id: 'proteger', rotulo: 'Proteger a chama com o corpo', kw: ['proteger', 'chama'], efeitos: [{ t: 'Encolhes-te sobre a chama. O frio morde-te, mas a luz sobrevive.' }, { dano: 1 }] }
      ], ignorar: 'Deixar', ignorarTxt: 'A chama encolhe e perde força.', ignorarEf: [{ luz: -2 }] },
    { id: 'gemido', nome: 'alguém ferido', icone: 'vida', fala: 'Numa fenda da parede, um vulto geme. É um batedor da aldeia, ferido, com uma perna presa.',
      opcoes: [
        { id: 'tratar', rotulo: 'Dar-lhe bandagens', kw: ['bandagens', 'tratar', 'ajudar'], requerItem: 'bandagens', efeitos: [{ removeItem: 'bandagens' }, { t: 'Tratas-lhe a perna. Agradecido, conta-te o que viu lá em baixo.' }, { dica: true }, { impeto: 2 }] },
        { id: 'soltar', rotulo: 'Soltar-lhe a perna', kw: ['soltar', 'puxar'], teste: 'forcar', res: {
          sucesso: [{ t: 'Soltas-lhe a perna. Ele dá-te o mapa que trazia rabiscado.' }, { dica: true }, { impeto: 1 }],
          parcial: [{ t: 'Soltas-lhe a perna, mas o grito dele ecoa por todo o lado.' }, { dica: true }, { tick: 2 }],
          falha: [{ t: 'A pedra não se mexe. Ele pede-te que vás buscar ajuda.' }, { tick: 1 }] } }
      ], ignorar: 'Seguir em frente', ignorarTxt: 'Os gemidos acompanham-te durante muito tempo.' }
  ];
})(window.CP.DATA);
