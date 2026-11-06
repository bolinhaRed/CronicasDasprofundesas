/* Os três tipos de masmorra: salas, corredores, objectos, criaturas, armadilhas, enigmas, personagens, eventos, rumores.
   Efeitos (DSL): {t:texto} {dano} {cura} {ouro} {item} {removeItem} {flag} {tick} {loot} {inimigo}
   {combate} {bossMod} {remove} {completa} {revela} {dica} {foco} {buff} {acorda} */
(function (D) {
  'use strict';

  D.masmorras = {
    /* ===================================================== CRIPTA */
    cripta: {
      nome: 'Cripta',
      entrada: { nome: 'Câmara das Escadas', desc: 'Uma pequena câmara de pedra, no fundo das escadas. O ar cheira a mofo e a cera queimada. As paredes estão cobertas de salitre.' },
      salas: [
        { nome: 'Ossário', desc: 'Paredes forradas de crânios, arrumados em filas. Centenas de órbitas vazias parecem olhar para o centro da sala.' },
        { nome: 'Capela Mortuária', desc: 'Bancos de pedra virados para um altar despido. Alguém arrancou os castiçais há muito tempo.' },
        { nome: 'Galeria dos Nichos', desc: 'Nichos escavados nas paredes, do chão ao tecto, cada um com um corpo embrulhado em linho amarelado.' },
        { nome: 'Câmara dos Sarcófagos', desc: 'Pedra fria e silêncio. As tampas dos túmulos têm cavaleiros esculpidos, de mãos postas.' },
        { nome: 'Sala do Embalsamador', desc: 'Mesas de pedra com caleiras, jarros partidos e um cheiro adocicado que não sai da garganta.' },
        { nome: 'Cripta Menor', desc: 'Uma câmara baixa, onde jazem as crianças da família. Há brinquedos de madeira podres junto às lápides.' },
        { nome: 'Antecâmara', desc: 'Colunas grossas sustentam um tecto rachado pelo terramoto. Pedaços de reboco cobrem o chão.' },
        { nome: 'Sala das Oferendas', desc: 'Taças de barro alinhadas no chão, cheias de pó e moedas verdes de azebre.' },
        { nome: 'Câmara Desabada', desc: 'Metade do tecto caiu. Entre os blocos de pedra, raízes brancas descem do mundo de cima.' },
        { nome: 'Sala dos Brasões', desc: 'Escudos de pedra com corvos e torres decoram as paredes. Os rostos dos corvos foram picados à martelada.' }
      ],
      corredores: [
        'Um corredor baixo; tens de curvar a cabeça. Teias de aranha roçam-te a cara.',
        'Um corredor ladeado de nichos vazios. O eco dos teus passos chega atrasado.',
        'O chão do corredor é feito de lápides gastas, com nomes já ilegíveis.',
        'Pingos de água caem do tecto num ritmo lento e paciente.'
      ],
      pistaSecreta: 'Uma corrente de ar fria faz tremer o pó junto à parede {lado}.',
      features: [
        { id: 'sarcofago', nome: 'sarcófago', kw: ['sarcofago', 'tampa', 'tumulo', 'caixao'], desc: 'um sarcófago de pedra com a tampa fechada',
          exame: 'A tampa pesa como um boi. Na pedra, um nome gasto: «Dom Afonso de Valdrem, que dorme com a espada».', armadilhavel: true,
          acao: { verbos: ['abrir', 'empurrar', 'levantar', 'forcar', 'arrastar'], rotulo: 'Abrir o sarcófago', teste: 'forcar',
            res: { sucesso: [{ t: 'A tampa desliza com um gemido de pedra. Lá dentro, entre ossos, brilha qualquer coisa.' }, { loot: 'medio' }],
              parcial: [{ t: 'Consegues abrir, mas a tampa esmaga-te os dedos ao escorregar.' }, { dano: 1 }, { loot: 'medio' }],
              falha: [{ t: 'A tampa não cede, e o arrastar ecoa por toda a cripta.' }, { tick: 1 }] } } },
        { id: 'sarcofago_vivo', nome: 'túmulo rachado', kw: ['tumulo', 'rachado', 'sarcofago', 'tampa'], desc: 'um túmulo rachado, com a tampa ligeiramente deslocada',
          exame: 'Pela fenda sai um cheiro a terra velha. A tampa foi empurrada... de dentro para fora.',
          acao: { verbos: ['abrir', 'empurrar', 'levantar', 'forcar'], rotulo: 'Abrir o túmulo rachado', efeitos: [{ t: 'Empurras a tampa. Uma mão óssea agarra a borda de pedra e um esqueleto ergue-se, a ranger!' }, { inimigo: 'esqueleto' }] } },
        { id: 'vela', nome: 'vela', kw: ['vela', 'nicho', 'chama', 'cera'], desc: 'um nicho com uma vela ainda acesa',
          exame: 'Uma vela de sebo, acesa há menos de uma hora. A cera ainda está mole. Alguém passa por aqui.',
          acao: { verbos: ['levar', 'pegar', 'apanhar', 'tirar', 'agarrar'], rotulo: 'Levar a vela', efeitos: [{ t: 'Levas a vela contigo. A luz extra vai ajudar-te a procurar (+1 a procurar nesta expedição).' }, { buff: 'luz' }] } },
        { id: 'ossos', nome: 'pilha de ossos', kw: ['ossos', 'pilha', 'cranios', 'femures', 'osso'], desc: 'uma pilha de ossos arrumada com cuidado macabro',
          exame: 'Crânios e fémures, empilhados como lenha. Alguns têm marcas de dentes pequenos.',
          acao: { verbos: ['revistar', 'remexer', 'mexer', 'vasculhar', 'procurar'], rotulo: 'Revistar os ossos', efeitos: [{ t: 'Remexes os ossos com a ponta da bota. Entre eles, umas moedas antigas.' }, { loot: 'pequeno' }, { tick: 1 }] } },
        { id: 'estatua', nome: 'estátua de cavaleiro', kw: ['estatua', 'cavaleiro', 'espada'], desc: 'a estátua de um cavaleiro de espada erguida',
          exame: 'Um cavaleiro de pedra, de rosto sereno. A espada que segura é de ferro verdadeiro, presa por anos de ferrugem.',
          acao: { verbos: ['tirar', 'arrancar', 'puxar', 'levar', 'pegar'], rotulo: 'Arrancar a espada da estátua', teste: 'forcar',
            res: { sucesso: [{ t: 'Com um estalo, a espada solta-se. Está boa, só precisa de óleo.' }, { item: 'espada_velha' }],
              parcial: [{ t: 'A espada solta-se, mas cortas a palma da mão.' }, { dano: 1 }, { item: 'espada_velha' }],
              falha: [{ t: 'A ferrugem não cede. Fazes barulho de mais.' }, { tick: 1 }] } } },
        { id: 'altar', nome: 'altar de oferendas', kw: ['altar', 'oferendas', 'taca', 'tacas', 'moedas'], desc: 'um pequeno altar coberto de oferendas',
          exame: 'Taças de barro com moedas, contas de vidro e anéis de latão. Oferendas aos mortos. Sentes que é má ideia mexer-lhes.',
          acao: { verbos: ['pegar', 'levar', 'roubar', 'tirar', 'apanhar'], rotulo: 'Pegar nas oferendas', efeitos: [{ t: 'Guardas as moedas. Por um instante, todas as velas da cripta parecem tremer ao mesmo tempo.' }, { ouro: 6 }, { tick: 3 }] } },
        { id: 'urna', nome: 'urna funerária', kw: ['urna', 'jarro', 'vaso'], desc: 'uma urna funerária de barro, selada com cera',
          exame: 'O selo de cera tem um corvo gravado. Abana-la e algo tilinta lá dentro.', armadilhavel: true,
          acao: { verbos: ['partir', 'abrir', 'quebrar', 'rebentar'], rotulo: 'Partir a urna', efeitos: [{ t: 'O barro estala. Entre cinzas, algo útil.' }, { loot: 'pequeno' }] } }
      ],
      inimigos: [
        { id: 'esqueleto', nome: 'esqueleto', g: 'm', desc: 'um esqueleto em armadura podre', hp: 2, dano: 1, def: 0, tipo: 'morto', exame: 'Ossos amarelos presos por arames e ódio antigo. Frágil, mas incansável.' },
        { id: 'ratazanas', nome: 'bando de ratazanas', g: 'm', desc: 'um bando de ratazanas do tamanho de gatos', hp: 2, dano: 1, def: 0, tipo: 'fera', exame: 'Olhos vermelhos e dentes amarelos. Têm fome.' },
        { id: 'carnical', nome: 'carniçal', g: 'm', desc: 'um carniçal de pele cinzenta, agachado', hp: 3, dano: 2, def: 0, tipo: 'morto', exame: 'Unhas negras, compridas como facas. Um morto que come mortos.' },
        { id: 'espectro', nome: 'espectro', g: 'm', desc: 'um espectro translúcido que flutua sobre o chão', hp: 2, dano: 1, def: 1, tipo: 'morto', exame: 'Difícil de acertar: as armas atravessam-no como fumo (−1 para lhe acertar).' }
      ],
      armadilhas: [
        { id: 'dardos', nome: 'placa de pressão', descAchada: 'Uma laje ligeiramente mais alta do que as outras e, na parede, pequenos orifícios: dardos.', disparo: 'Uma laje afunda sob o teu pé. Da parede silvam dardos!', dano: 2 },
        { id: 'fosso', nome: 'laje falsa', descAchada: 'Uma laje que soa a oco: por baixo há um fosso.', disparo: 'O chão cede! Caes num fosso cheio de ossos.', dano: 2, fosso: true },
        { id: 'pendulo', nome: 'lâmina pendular', descAchada: 'Um fio esticado rente ao chão e, no tecto, uma ranhura comprida.', disparo: 'Ouves um clique. Uma lâmina desce do tecto em arco!', dano: 2 }
      ],
      armadilhasObjecto: [
        { id: 'agulha', nome: 'agulha envenenada', descAchada: 'Uma agulha minúscula escondida no fecho, com a ponta escura.', disparo: 'Uma agulha salta e pica-te o dedo. Um frio sobe-te pelo braço.', dano: 2 }
      ],
      enigmas: [
        { id: 'porta_mortos', nome: 'lápide falante', kw: ['lapide', 'inscricao', 'enigma', 'pedra'], desc: 'uma lápide com uma inscrição e uma gaveta de pedra',
          exame: 'Na lápide lê-se: «QUANTO MAIS ME TIRAS, MAIOR EU FICO. DIZ O MEU NOME E A PEDRA ABRE.» Por baixo, uma gaveta de pedra fechada.',
          opcoes: ['buraco', 'sombra', 'silêncio'], certa: 'buraco',
          premio: [{ t: 'A gaveta de pedra desliza sozinha. Lá dentro, embrulhado em seda, um tesouro esquecido.' }, { loot: 'grande' }],
          erro: [{ t: 'A pedra fica muda. Da gaveta sai um sopro gelado que te queima os pulmões.' }, { dano: 1 }] },
        { id: 'vela_enigma', nome: 'cofre do sacristão', kw: ['cofre', 'inscricao', 'enigma'], desc: 'um cofre de pedra com letras gravadas na tampa',
          exame: 'Na tampa: «NASÇO ALTA E MORRO BAIXA. CHORO ENQUANTO ILUMINO.» Há uma ranhura onde se diz a resposta.',
          opcoes: ['vela', 'lua', 'fogueira'], certa: 'vela',
          premio: [{ t: 'Um mecanismo estala e a tampa levanta.' }, { loot: 'grande' }],
          erro: [{ t: 'Um sino toca algures. Não devia ter tocado.' }, { tick: 2 }] }
      ],
      npcs: [
        { id: 'velha', nome: 'velha das velas', g: 'f', kw: ['velha', 'mulher', 'senhora'], desc: 'uma velha de xaile preto, a acender velas',
          fala: '«Uma moeda pela vela, e digo-te onde procurar», diz a velha, sem olhar para ti. A voz dela não faz eco.',
          opcoes: [
            { id: 'pagar', rotulo: 'Dar-lhe uma moeda', kw: ['moeda', 'dar', 'pagar'], requerOuro: 1, efeitos: [{ ouro: -1 }, { dica: true }, { remove: true }, { t: 'Quando voltas a olhar, já não está ali. Só a vela acesa.' }] },
            { id: 'quem', rotulo: 'Perguntar quem é', kw: ['quem', 'perguntar', 'nome'], efeitos: [{ t: '«Acendo velas aos mortos de Valdrem há sessenta anos.» Pisca os olhos brancos. Quando pestanejas, desapareceu.' }, { remove: true }] }
          ] }
      ],
      eventos: [
        { t: 'Passos ósseos atrás de ti. Um esqueleto errante entra, a arrastar uma espada partida!', inimigo: 'esqueleto' },
        { t: 'Um vento frio apaga a tua luz por um instante. Algo passa por ti, sem tocar... e segue o seu caminho.' },
        { t: 'Das fendas das paredes jorra um bando de ratazanas, guinchando!', inimigo: 'ratazanas' },
        { t: 'Um sino toca, muito perto. Depois, silêncio. O coração bate-te nos ouvidos.' }
      ],
      tesouro: { id: 'cofre', nome: 'cofre esquecido', kw: ['cofre', 'arca', 'bau'], desc: 'um cofre de ferro esquecido por todos', exame: 'Ferro escurecido, sem fechadura. Ninguém o abre há um século.',
        acao: { verbos: ['abrir', 'forcar'], rotulo: 'Abrir o cofre esquecido', efeitos: [{ t: 'A tampa range. Lá dentro, o tesouro de alguém que nunca voltou.' }, { loot: 'grande' }] } },
      rumores: [
        { titulo: 'O Ninho do Carniçal', local: 'Cripta dos Pobres', gancho: 'O coveiro de Corvamonte encontrou campas abertas por dentro. Algo come os mortos na Cripta dos Pobres. Paga a quem o acabar.',
          entrada: 'Desces para o escuro. O cheiro a carne velha agarra-se à roupa.',
          pistas: [
            { id: 'p1', nome: 'campa escavada', kw: ['campa', 'terra', 'buraco'], desc: 'uma campa escavada à unha', exame: 'Marcas de unhas compridas... e sangue seco nelas: a criatura magoa-se a cavar. Tem um lado fraco, o esquerdo — arrasta essa perna.' },
            { id: 'p2', nome: 'farrapos', kw: ['farrapos', 'roupa', 'trapo'], desc: 'farrapos de mortalha pelo chão', exame: 'A criatura arrasta os corpos para o fundo da cripta. O ninho fica longe da entrada.' },
            { id: 'p3', nome: 'osso roído', kw: ['osso', 'roido'], desc: 'um fémur roído até ao tutano', exame: 'Dentes grandes. Maior do que um carniçal comum. Tem cuidado.' }
          ],
          sala: 'Ninho do Carniçal', salaDesc: 'Um monte de ossos e mortalhas forma uma espécie de ninho.',
          intro: 'No meio do ninho, uma figura enorme, de pele cinzenta, ergue a cabeça e fareja o ar. Arrasta a perna esquerda.',
          boss: { id: 'carnical_mor', nome: 'Carniçal-Mor', g: 'm', desc: 'o Carniçal-Mor, enorme e faminto', hp: 5, dano: 2, def: 0, tipo: 'morto', estado: 'alerta', exame: 'Arrasta a perna esquerda.' },
          vitoria: 'O Carniçal-Mor tomba sobre os próprios ossos. Silêncio, finalmente.', desfecho: 'O coveiro paga-te e jura que esta noite vai dormir.' },
        { titulo: 'Os Mortos que Andam', local: 'Mausoléu dos Brancos', gancho: 'Um pastor jura ter visto mortos a passear à noite junto ao Mausoléu dos Brancos. A confraria paga para que alguém vá ver e acabe com isso.',
          entrada: 'A porta do mausoléu está aberta. Por dentro.',
          pistas: [
            { id: 'p1', nome: 'círculo de giz', kw: ['circulo', 'giz', 'simbolos'], desc: 'um círculo de giz com símbolos', exame: 'Símbolos de chamamento. Quem os fez ligou os mortos a um objecto — destrói-lo e eles enfraquecem. Uma caveira com uma vela costuma ser o foco.' },
            { id: 'p2', nome: 'livro queimado', kw: ['livro', 'queimado', 'paginas'], desc: 'um livro meio queimado', exame: 'Um aprendiz de necromante tentou e falhou. O que chamou devorou-o.' },
            { id: 'p3', nome: 'pegadas de lama', kw: ['pegadas', 'lama'], desc: 'pegadas de lama seca', exame: 'Saem e entram muitas vezes. Todas vão dar ao fundo.' }
          ],
          sala: 'Sala do Chamamento', salaDesc: 'Uma sala com velas pretas em círculo e uma caveira ao centro.',
          intro: 'Dentro do círculo, um morto enorme, coberto de velas derretidas, vira a cabeça para ti.',
          boss: { id: 'chamado', nome: 'Morto Chamado', g: 'm', desc: 'o Morto Chamado, coberto de cera negra', hp: 5, dano: 2, def: 1, tipo: 'morto', estado: 'alerta', exame: 'Duro de acertar (−1).' },
          vitoria: 'O Morto Chamado desfaz-se em cera e pó. As velas pretas apagam-se todas de uma vez.', desfecho: 'A confraria paga e manda benzer o mausoléu.' }
      ]
    },

    /* ===================================================== MINA */
    mina: {
      nome: 'Mina',
      entrada: { nome: 'Fundo do Poço de Entrada', desc: 'Uma câmara tosca, escavada a picareta, onde termina a escada de madeira. Há carris enferrujados no chão.' },
      salas: [
        { nome: 'Galeria Principal', desc: 'Uma galeria larga, sustentada por escoras de carvalho. Algumas estão rachadas.' },
        { nome: 'Depósito de Ferramentas', desc: 'Prateleiras tombadas, cabos de picareta partidos, um balde furado.' },
        { nome: 'Câmara do Poço de Ar', desc: 'Um respiradouro sobe pelo tecto. Ouve-se o vento lá em cima, como um assobio triste.' },
        { nome: 'Refeitório dos Mineiros', desc: 'Uma mesa comprida, bancos e tigelas de madeira. Ficou tudo como estava no dia em que fugiram.' },
        { nome: 'Galeria Inundada', desc: 'Água negra até aos joelhos. Coisas pequenas fogem-te por entre as pernas.' },
        { nome: 'Câmara dos Carris', desc: 'Várias linhas de carris cruzam-se aqui. Uma vagoneta tombada bloqueia parte da sala.' },
        { nome: 'Desmoronamento', desc: 'Rocha caída de um lado. Do outro, uma bota sai de debaixo das pedras.' },
        { nome: 'Câmara do Cristal', desc: 'Veios de quartzo brilham nas paredes quando lhes chega a luz.' },
        { nome: 'Capela dos Mineiros', desc: 'Um nicho com uma Santa Bárbara de madeira, rodeada de lamparinas apagadas.' },
        { nome: 'Galeria das Escoras', desc: 'Uma galeria baixa, cheia de escoras novas. Alguém andou a trabalhar aqui recentemente.' }
      ],
      corredores: [
        'Uma galeria estreita, escorada com troncos. O tecto range.',
        'Um túnel húmido. Os carris continuam pelo chão, a brilhar de água.',
        'Uma passagem tão baixa que vais de cócoras. Cheira a enxofre.',
        'Uma galeria antiga, com marcas de picareta em espinha.'
      ],
      pistaSecreta: 'Junto à parede {lado}, as escoras são mais recentes e a rocha soa diferente quando lhe bates.',
      features: [
        { id: 'vagoneta', nome: 'vagoneta', kw: ['vagoneta', 'carro', 'carrinho'], desc: 'uma vagoneta virada', exame: 'Uma vagoneta de ferro, tombada. Debaixo dela há qualquer coisa presa.',
          acao: { verbos: ['virar', 'levantar', 'empurrar', 'forcar', 'revistar'], rotulo: 'Levantar a vagoneta', teste: 'forcar',
            res: { sucesso: [{ t: 'Viras a vagoneta. Por baixo estava a sacola de um mineiro.' }, { loot: 'medio' }],
              parcial: [{ t: 'A vagoneta cai-te no pé ao voltar, mas a sacola é tua.' }, { dano: 1 }, { loot: 'medio' }],
              falha: [{ t: 'Pesada de mais. O estrondo ecoa pelas galerias.' }, { tick: 1 }] } } },
        { id: 'mesa', nome: 'mesa dos mineiros', kw: ['mesa', 'bancos', 'tigelas'], desc: 'uma mesa com restos de comida', exame: 'Pão transformado em pedra e um saco de pano esquecido.',
          acao: { verbos: ['revistar', 'procurar', 'abrir', 'pegar'], rotulo: 'Revistar o saco', efeitos: [{ t: 'No saco há coisas úteis.' }, { loot: 'pequeno' }] } },
        { id: 'polvora', nome: 'caixote de pólvora', kw: ['caixote', 'polvora', 'caixa'], desc: 'um caixote marcado com uma caveira', exame: 'Pólvora de mineiro, ainda seca. Perigosa e útil.',
          acao: { verbos: ['levar', 'pegar', 'abrir', 'apanhar'], rotulo: 'Levar um saco de pólvora', efeitos: [{ t: 'Guardas um saco de pólvora, com todo o cuidado do mundo.' }, { item: 'polvora' }, { remove: true }] } },
        { id: 'veio', nome: 'veio de prata', kw: ['veio', 'prata', 'parede', 'minerio'], desc: 'um veio de prata à vista na parede', exame: 'Prata nativa, fina como teia, entranhada na rocha. Com força, saem umas lascas.',
          acao: { verbos: ['extrair', 'partir', 'arrancar', 'picar', 'tirar'], rotulo: 'Arrancar a prata', teste: 'forcar',
            res: { sucesso: [{ t: 'Arrancas lascas de prata pura.' }, { ouro: 7 }],
              parcial: [{ t: 'Arrancas algumas lascas, mas o barulho espalha-se pelas galerias.' }, { ouro: 4 }, { tick: 1 }],
              falha: [{ t: 'A rocha estilhaça e uma lasca acerta-te na cara.' }, { dano: 1 }, { tick: 1 }] } } },
        { id: 'mineiro', nome: 'esqueleto de mineiro', kw: ['esqueleto', 'mineiro', 'corpo', 'bota'], desc: 'o esqueleto de um mineiro, meio soterrado', exame: 'Morreu a escavar para sair. Na mão, um medalhão de Santa Bárbara.', armadilhavel: false,
          acao: { verbos: ['revistar', 'procurar', 'pegar', 'tirar'], rotulo: 'Revistar o mineiro', efeitos: [{ t: 'Pedes desculpa ao morto e revistas-lhe os bolsos.' }, { loot: 'pequeno' }] } },
        { id: 'santa', nome: 'Santa Bárbara de madeira', kw: ['santa', 'barbara', 'imagem', 'nicho'], desc: 'uma pequena imagem de Santa Bárbara', exame: 'A padroeira dos mineiros, de rosto gasto pelos beijos.',
          acao: { verbos: ['rezar', 'orar', 'acender', 'benzer'], rotulo: 'Rezar à santa', efeitos: [{ t: 'Rezas em voz baixa. Sentes os ombros mais leves.' }, { cura: 1 }, { foco: 1 }, { remove: true }] } },
        { id: 'arca_mina', nome: 'arca de ferramentas', kw: ['arca', 'bau', 'ferramentas'], desc: 'uma arca de ferramentas com cadeado', exame: 'Uma arca pesada com um cadeado ferrugento.', armadilhavel: true,
          acao: { verbos: ['abrir', 'forcar', 'arrombar'], rotulo: 'Abrir a arca', teste: 'forcar',
            res: { sucesso: [{ t: 'O cadeado salta. Lá dentro há ferramentas e algo mais.' }, { item: 'pecabra' }, { loot: 'pequeno' }],
              parcial: [{ t: 'Abres, à custa de muito barulho.' }, { tick: 1 }, { item: 'pecabra' }],
              falha: [{ t: 'O cadeado aguenta.' }, { tick: 1 }] } } }
      ],
      inimigos: [
        { id: 'goblin', nome: 'goblin', g: 'm', desc: 'um goblin magro, de faca na mão', hp: 2, dano: 1, def: 0, tipo: 'humanoide', exame: 'Orelhas compridas, dentes de agulha. Cobarde sozinho, perigoso em bando.' },
        { id: 'aranha', nome: 'aranha das galerias', g: 'f', desc: 'uma aranha das galerias, do tamanho de um cão', hp: 2, dano: 1, def: 0, tipo: 'fera', exame: 'Oito olhos e uma teia que brilha como prata.' },
        { id: 'toupeira', nome: 'rato-toupeira', g: 'm', desc: 'um rato-toupeira cego, gordo e irritado', hp: 1, dano: 1, def: 0, tipo: 'fera', exame: 'Cego, mas ouve tudo.' },
        { id: 'brutamontes', nome: 'brutamontes goblin', g: 'm', desc: 'um brutamontes goblin, com uma moca cravejada de pregos', hp: 4, dano: 2, def: 0, tipo: 'humanoide', exame: 'Três goblins de peso num só. Bate com força.' }
      ],
      armadilhas: [
        { id: 'tecto', nome: 'tecto instável', descAchada: 'Uma escora podre segura um bloco de rocha solto. Não lhe toques.', disparo: 'Roças numa escora podre. O tecto desaba!', dano: 2 },
        { id: 'poco', nome: 'poço escondido', descAchada: 'Tábuas podres cobertas de terra escondem um poço antigo.', disparo: 'As tábuas partem-se! Caes num poço velho.', dano: 2, fosso: true },
        { id: 'guizos', nome: 'arame com guizos', descAchada: 'Um arame fino atravessa a passagem, com guizos de cobre: um alarme goblin.', disparo: 'O teu pé prende num arame. Guizos tocam por toda a mina!', dano: 0, acorda: true }
      ],
      armadilhasObjecto: [
        { id: 'virote', nome: 'besta escondida', descAchada: 'Um fio liga a tampa a uma pequena besta escondida.', disparo: 'Ao abrir, um virote dispara-te contra o ombro!', dano: 2 }
      ],
      enigmas: [
        { id: 'alavancas', nome: 'porta de ferro anã', kw: ['porta', 'ferro', 'runas', 'enigma', 'alavancas'], desc: 'uma pequena porta de ferro com runas e três alavancas',
          exame: 'As runas dizem, em letra comum por baixo: «CORRO SEM PÉS, MURMURO SEM BOCA, NUNCA DURMO NA MINHA CAMA.» As alavancas têm símbolos: uma onda, uma chama, uma pedra.',
          opcoes: ['onda', 'chama', 'pedra'], certa: 'onda',
          premio: [{ t: 'Puxas a alavanca da onda. A porta de ferro abre-se para um cofre anão.' }, { loot: 'grande' }],
          erro: [{ t: 'A alavanca solta um jacto de vapor a ferver!' }, { dano: 1 }] }
      ],
      npcs: [
        { id: 'fantasma_mineiro', nome: 'fantasma de mineiro', g: 'm', kw: ['fantasma', 'mineiro', 'vulto'], desc: 'o vulto pálido de um mineiro, de lanterna na mão',
          fala: 'O mineiro fantasma aponta-te a lanterna. «Cuidado onde pões os pés, vivo. Esta mina come gente.»',
          opcoes: [
            { id: 'ouvir', rotulo: 'Pedir-lhe que te guie', kw: ['guiar', 'guia', 'ajuda', 'pedir'], efeitos: [{ t: 'O fantasma anda à tua frente e vai apontando o chão, aqui e ali, antes de se desfazer em pó de carvão.' }, { revela: 'armadilhas' }, { remove: true }] },
            { id: 'benzer', rotulo: 'Benzer-te e seguir', kw: ['benzer', 'seguir', 'ignorar'], efeitos: [{ t: 'O mineiro encolhe os ombros e apaga-se como uma vela.' }, { remove: true }] }
          ] }
      ],
      eventos: [
        { t: 'Passinhos rápidos na escuridão. Um goblin batedor aparece e ataca!', inimigo: 'goblin' },
        { t: 'Um tremor. Pó cai do tecto. As escoras gemem... e aguentam. Por agora.' },
        { t: 'Algo desce do tecto num fio de seda. Uma aranha das galerias!', inimigo: 'aranha' },
        { t: 'Ao longe, uma vagoneta rola sozinha pelos carris e choca contra a rocha.' }
      ],
      tesouro: { id: 'esconderijo', nome: 'esconderijo de contrabandista', kw: ['esconderijo', 'sacos', 'arca', 'cofre'], desc: 'sacos e uma arca escondidos atrás de uma rocha', exame: 'Alguém escondia aqui o que tirava da mina sem pagar o dízimo.',
        acao: { verbos: ['abrir', 'revistar', 'pegar'], rotulo: 'Abrir o esconderijo', efeitos: [{ t: 'Prata, ferramentas e uma pequena fortuna esquecida.' }, { loot: 'grande' }] } },
      rumores: [
        { titulo: 'A Aranha-Mãe', local: 'Galerias de Fundo Branco', gancho: 'Os carvoeiros falam de teias que atravessam as Galerias de Fundo Branco de ponta a ponta. Três cabras desapareceram. Pagam para que alguém limpe o ninho.',
          entrada: 'Fios de seda brilham à luz logo à entrada. Tudo cheira a mofo doce.',
          pistas: [
            { id: 'p1', nome: 'casulo', kw: ['casulo', 'seda', 'cabra'], desc: 'um casulo de seda do tamanho de uma cabra', exame: 'A seda arde muito bem. A aranha vai proteger o ninho com o corpo — se o ameaçares, abre a guarda.' },
            { id: 'p2', nome: 'teia rasgada', kw: ['teia', 'fios'], desc: 'uma teia rasgada', exame: 'Fios grossos como corda. A criatura é enorme.' },
            { id: 'p3', nome: 'pele largada', kw: ['pele', 'muda', 'casca'], desc: 'uma pele de aranha largada', exame: 'Mudou de pele há pouco. A pele nova ainda está mole.' }
          ],
          sala: 'Ninho da Aranha-Mãe', salaDesc: 'Uma câmara forrada de seda, do chão ao tecto.',
          intro: 'Do tecto desce, devagar, uma aranha do tamanho de um boi. Os olhos brilham como contas de azeviche.',
          boss: { id: 'aranha_mae', nome: 'Aranha-Mãe', g: 'f', desc: 'a Aranha-Mãe, do tamanho de um boi', hp: 5, dano: 2, def: 0, tipo: 'fera', estado: 'alerta', exame: 'Pele nova, ainda mole.' },
          vitoria: 'A Aranha-Mãe enrola as patas e cai. A seda deixa de vibrar.', desfecho: 'Os carvoeiros pagam e queimam o resto das teias.' },
        { titulo: 'O Bando do Túnel Velho', local: 'Túnel Velho', gancho: 'Um brutamontes goblin e o seu bando assaltam carroças na estrada e escondem-se no Túnel Velho. O almocreve paga pela paz.',
          entrada: 'Restos de carroças à entrada. Os goblins nem se deram ao trabalho de os esconder.',
          pistas: [
            { id: 'p1', nome: 'garrafa vazia', kw: ['garrafa', 'vinho'], desc: 'garrafas de vinho vazias', exame: 'Vinho roubado. O chefe bebe muito: deve estar lento e com a guarda baixa.' },
            { id: 'p2', nome: 'mapa rabiscado', kw: ['mapa', 'rabisco', 'papel'], desc: 'um papel rabiscado', exame: 'Um mapa de goblin: a toca do chefe fica no ponto mais fundo.' },
            { id: 'p3', nome: 'roda partida', kw: ['roda', 'carroca'], desc: 'uma roda de carroça partida', exame: 'Partiram-na à pancada. O chefe tem força de boi.' }
          ],
          sala: 'Toca do Chefe', salaDesc: 'Um covil de peles, barris roubados e ossos de galinha.',
          intro: 'Um brutamontes goblin ressona em cima de um barril. Arrota, abre um olho e pega na moca.',
          boss: { id: 'chefe_brutamontes', nome: 'Chefe Brutamontes', g: 'm', desc: 'o Chefe Brutamontes, com uma moca do tamanho de uma perna', hp: 6, dano: 2, def: 0, tipo: 'humanoide', estado: 'alerta', exame: 'Bêbedo e lento.' },
          vitoria: 'O Chefe tomba de costas, por cima dos barris roubados.', desfecho: 'O almocreve paga e recupera dois barris.' }
      ]
    },

    /* ===================================================== SANTUÁRIO AFOGADO */
    santuario: {
      nome: 'Santuário Afogado',
      entrada: { nome: 'Átrio Alagado', desc: 'Degraus de mármore desaparecem em água parada. A luz que entra lá de cima é verde e fraca. Há musgo em tudo.' },
      salas: [
        { nome: 'Nave Inundada', desc: 'Colunas brancas saem da água como dentes. Peixes pálidos fogem da tua luz.' },
        { nome: 'Claustro', desc: 'Um pátio quadrado com arcadas. O jardim do centro é agora um charco de juncos.' },
        { nome: 'Sacristia', desc: 'Armários de madeira inchada, cheios de paramentos podres.' },
        { nome: 'Capela Lateral', desc: 'Uma capela pequena, com um mosaico de peixes no chão, ainda bonito debaixo do lodo.' },
        { nome: 'Biblioteca Apodrecida', desc: 'Estantes até ao tecto. Os livros colaram-se uns aos outros numa massa cinzenta.' },
        { nome: 'Câmara dos Votos', desc: 'Centenas de ex-votos de cera — mãos, pés, corações — pendurados por fios.' },
        { nome: 'Refeitório das Irmãs', desc: 'Mesas compridas e pratos de estanho. Uma rã enorme olha para ti de cima de uma cadeira.' },
        { nome: 'Cisterna', desc: 'Um tanque quadrado, fundo e escuro. A água mexe-se sem vento.' },
        { nome: 'Jardim Morto', desc: 'Árvores sem folhas, de troncos brancos, crescem dentro de uma sala sem tecto.' },
        { nome: 'Dormitório', desc: 'Catres de pedra alinhados. Num deles, o contorno de alguém que se deitou há pouco.' }
      ],
      corredores: [
        'Uma galeria com água pelos tornozelos. Cada passo faz um eco molhado.',
        'Um corredor de azulejos azuis, muitos caídos. Os que restam mostram ondas e barcos.',
        'Uma passagem estreita, com o chão escorregadio de limo.',
        'Um corredor de arcos baixos. Gotas caem do tecto em fio.'
      ],
      pistaSecreta: 'Junto à parede {lado}, a água escorre para uma fenda que não devia existir.',
      features: [
        { id: 'fonte', nome: 'fonte', kw: ['fonte', 'agua', 'bica'], desc: 'uma pequena fonte que ainda corre', exame: 'Água fria e límpida, a única limpa neste lugar.',
          acao: { verbos: ['beber', 'lavar'], rotulo: 'Beber da fonte', efeitos: [{ t: 'A água é fria e sabe a pedra. Sentes-te melhor.' }, { cura: 2 }, { remove: true }] } },
        { id: 'estatua_santa', nome: 'estátua da santa', kw: ['estatua', 'santa', 'imagem'], desc: 'uma estátua de Santa Ilva, coberta de limo', exame: 'A santa estende uma mão aberta. Na palma, alguém deixou flores secas.',
          acao: { verbos: ['rezar', 'orar', 'limpar'], rotulo: 'Rezar à santa', efeitos: [{ t: 'Limpas o limo do rosto da santa e rezas. Por um momento, sentes calor.' }, { foco: 1 }, { cura: 1 }, { remove: true }] } },
        { id: 'exvotos', nome: 'ex-votos', kw: ['exvotos', 'ex-votos', 'votos', 'cera'], desc: 'fios com ex-votos de cera e prata', exame: 'Alguns ex-votos são de prata. Promessas de gente que pediu milagres.',
          acao: { verbos: ['pegar', 'levar', 'tirar', 'roubar'], rotulo: 'Levar os ex-votos de prata', efeitos: [{ t: 'Guardas a prata. A água à tua volta fica mais fria.' }, { ouro: 5 }, { tick: 2 }] } },
        { id: 'estante', nome: 'estante podre', kw: ['estante', 'livros', 'livro', 'prateleira'], desc: 'uma estante com livros apodrecidos', exame: 'Quase tudo é papa. Mas há um estojo de cobre numa prateleira alta.',
          acao: { verbos: ['revistar', 'procurar', 'pegar', 'abrir'], rotulo: 'Procurar na estante', teste: 'procurar',
            res: { sucesso: [{ t: 'No estojo de cobre, um pergaminho intacto, com letras que brilham.' }, { item: 'pergaminho' }],
              parcial: [{ t: 'Encontras o estojo, mas a estante cai com estrondo.' }, { item: 'pergaminho' }, { tick: 1 }],
              falha: [{ t: 'A estante desfaz-se nas tuas mãos.' }, { tick: 1 }] } } },
        { id: 'pia', nome: 'pia baptismal', kw: ['pia', 'baptismal', 'batismal', 'concha'], desc: 'uma pia baptismal de pedra, cheia de água clara', exame: 'Água benzida, ainda pura, num lugar onde tudo apodreceu.',
          acao: { verbos: ['encher', 'pegar', 'levar', 'recolher', 'tirar'], rotulo: 'Encher um frasco de água benta', efeitos: [{ t: 'Enches um frasco com a água da pia.' }, { item: 'aguabenta' }, { remove: true }] } },
        { id: 'sino', nome: 'sino caído', kw: ['sino', 'badalo'], desc: 'um sino caído, meio enterrado no lodo', exame: 'O badalo é uma bola de ferro presa a um cabo: daria uma boa maça.',
          acao: { verbos: ['tirar', 'arrancar', 'pegar', 'levar'], rotulo: 'Arrancar o badalo', teste: 'forcar',
            res: { sucesso: [{ t: 'O badalo solta-se. Pesado e bem equilibrado.' }, { item: 'maca' }],
              parcial: [{ t: 'Soltas o badalo, mas o sino toca uma vez, alto.' }, { item: 'maca' }, { tick: 2 }],
              falha: [{ t: 'O sino toca, e o som espalha-se pela água.' }, { tick: 2 }] } } },
        { id: 'relicario_menor', nome: 'arca de oferendas', kw: ['arca', 'cofre', 'caixa'], desc: 'uma arca de oferendas com uma ranhura', exame: 'Uma arca fechada, com uma fechadura delicada.', armadilhavel: true,
          acao: { verbos: ['abrir', 'forcar', 'arrombar'], rotulo: 'Abrir a arca de oferendas', efeitos: [{ t: 'Moedas antigas e uma oferenda esquecida.' }, { loot: 'medio' }] } }
      ],
      inimigos: [
        { id: 'afogado', nome: 'afogado', g: 'm', desc: 'um afogado inchado, a escorrer água', hp: 3, dano: 1, def: 0, tipo: 'morto', exame: 'Um morto que o lago devolveu. Lento, mas não sente dor.' },
        { id: 'enguia', nome: 'enguia das cisternas', g: 'f', desc: 'uma enguia grossa como uma coxa, na água', hp: 2, dano: 1, def: 1, tipo: 'fera', exame: 'Escorregadia: difícil de acertar (−1).' },
        { id: 'sectario', nome: 'sectário do lodo', g: 'm', desc: 'um sectário de capuz verde, de faca na mão', hp: 2, dano: 1, def: 0, tipo: 'humanoide', exame: 'Um louco que adora o que vive no fundo do lago.' },
        { id: 'sapo', nome: 'sapo-boi gigante', g: 'm', desc: 'um sapo-boi do tamanho de um porco', hp: 3, dano: 1, def: 0, tipo: 'fera', exame: 'Uma língua que chega a três metros.' }
      ],
      armadilhas: [
        { id: 'limo', nome: 'degrau de limo', descAchada: 'Um degrau coberto de limo, mesmo à beira de um buraco na água.', disparo: 'Escorregas no limo e caes de mau jeito contra a pedra!', dano: 1, fosso: true },
        { id: 'grade', nome: 'grade suspensa', descAchada: 'Uma grade de ferro suspensa no tecto, presa por uma corda podre.', disparo: 'A corda parte-se e uma grade de ferro cai do tecto!', dano: 2 },
        { id: 'dardos_s', nome: 'mosaico armadilhado', descAchada: 'Uma pedra do mosaico desencaixada, ligada a um mecanismo na parede.', disparo: 'O mosaico afunda e dardos saltam da parede!', dano: 2 }
      ],
      armadilhasObjecto: [
        { id: 'acido', nome: 'tampa com ácido', descAchada: 'Um tubo fino escondido na tampa: líquido verde.', disparo: 'Um jacto de líquido verde queima-te as mãos!', dano: 2 }
      ],
      enigmas: [
        { id: 'mosaico', nome: 'mosaico dos peixes', kw: ['mosaico', 'peixes', 'inscricao', 'enigma'], desc: 'um mosaico com uma inscrição à volta',
          exame: 'À volta dos peixes lê-se: «TODOS ME PISAM E EU NÃO ME QUEIXO. LEVO-TE A TODA A PARTE E FICO SEMPRE.» No centro, três pedras soltas: um barco, uma estrada, uma ponte.',
          opcoes: ['estrada', 'barco', 'ponte'], certa: 'estrada',
          premio: [{ t: 'Carregas na pedra da estrada. Um compartimento abre-se no chão, seco por milagre.' }, { loot: 'grande' }],
          erro: [{ t: 'A pedra afunda e água gelada jorra do chão.' }, { dano: 1 }, { tick: 1 }] }
      ],
      npcs: [
        { id: 'peregrina', nome: 'peregrina perdida', g: 'f', kw: ['peregrina', 'mulher', 'rapariga'], desc: 'uma peregrina encharcada, encolhida a um canto',
          fala: '«Perdi-me... ando aqui há dois dias», diz a peregrina, a tremer. Tem uma perna ferida.',
          opcoes: [
            { id: 'pocao', rotulo: 'Dar-lhe uma poção', kw: ['pocao', 'dar', 'curar'], requerItem: 'pocao', efeitos: [{ removeItem: 'pocao' }, { t: 'Ela bebe e a cor volta-lhe à cara. Em troca, dá-te um amuleto de âmbar: «Guardou-me até aqui. Agora guarda-te a ti.»' }, { item: 'amuleto' }, { remove: true }] },
            { id: 'saida', rotulo: 'Indicar-lhe a saída', kw: ['saida', 'indicar', 'caminho'], efeitos: [{ t: '«Obrigada. Uma coisa: vi algo brilhar por aqui...» E conta-te onde.' }, { dica: true }, { remove: true }] }
          ] }
      ],
      eventos: [
        { t: 'A água agita-se. Um afogado ergue-se mesmo à tua frente!', inimigo: 'afogado' },
        { t: 'Um canto distante, de muitas vozes, sobe da água e cala-se de repente.' },
        { t: 'Algo enorme passa por baixo dos teus pés, na água escura. Uma enguia ataca!', inimigo: 'enguia' },
        { t: 'As velas de um altar distante acendem-se sozinhas... e apagam-se.' }
      ],
      tesouro: { id: 'tesouro_irmas', nome: 'tesouro das irmãs', kw: ['tesouro', 'arca', 'cofre', 'caixa'], desc: 'uma arca selada com o símbolo da santa', exame: 'As irmãs esconderam aqui o que salvaram da inundação.',
        acao: { verbos: ['abrir', 'forcar'], rotulo: 'Abrir a arca das irmãs', efeitos: [{ t: 'Prata da igreja e coisas que as irmãs não quiseram deixar ao lago.' }, { loot: 'grande' }] } },
      rumores: [
        { titulo: 'A Coisa do Lodo', local: 'Capela do Lago', gancho: 'Os pescadores dizem que uma massa de lodo vivo engoliu um barco junto à Capela do Lago. Pagam para que alguém a destrua.',
          entrada: 'A capela está meio afundada. A água tem uma película oleosa.',
          pistas: [
            { id: 'p1', nome: 'peixes secos', kw: ['peixes', 'secos', 'peixe'], desc: 'peixes mortos e secos', exame: 'A coisa suga a água de tudo o que apanha... e evita a luz. Ataca-a onde a luz bate e ela recua.' },
            { id: 'p2', nome: 'remo partido', kw: ['remo', 'barco'], desc: 'um remo partido', exame: 'Do barco engolido. Mordido? Não... dissolvido.' },
            { id: 'p3', nome: 'rasto de lodo', kw: ['rasto', 'lodo'], desc: 'um rasto de lodo nas paredes', exame: 'Sobe pelas paredes. A coisa pode estar no tecto.' }
          ],
          sala: 'Câmara do Lodo', salaDesc: 'Uma câmara onde a água é espessa como sopa.',
          intro: 'O chão mexe-se. Uma massa de lodo negro levanta-se como uma onda e tem olhos — dezenas de olhos de peixe.',
          boss: { id: 'coisa_lodo', nome: 'Coisa do Lodo', g: 'f', desc: 'a Coisa do Lodo, uma onda de lama com olhos', hp: 6, dano: 2, def: 0, tipo: 'fera', estado: 'alerta', exame: 'Evita a luz.' },
          vitoria: 'A Coisa do Lodo espalha-se em água suja e não volta a juntar-se.', desfecho: 'Os pescadores pagam e voltam ao lago.' },
        { titulo: 'O Profeta do Fundo', local: 'Mosteiro Submerso', gancho: 'Um profeta louco junta sectários no Mosteiro Submerso e rapta pescadores para «oferecer ao fundo». A confraria do lago paga a quem acabar com isso.',
          entrada: 'Velas verdes flutuam na água em pequenas jangadas de cortiça.',
          pistas: [
            { id: 'p1', nome: 'sermão escrito', kw: ['sermao', 'papel', 'escrito'], desc: 'um sermão escrito em pele de peixe', exame: 'O profeta acredita que o seu deus o protege. Tem medo da água benta — e da dúvida.' },
            { id: 'p2', nome: 'corda cortada', kw: ['corda', 'cortada'], desc: 'cordas cortadas', exame: 'Os prisioneiros fugiram. Os sectários estão nervosos.' },
            { id: 'p3', nome: 'máscara de escamas', kw: ['mascara', 'escamas'], desc: 'uma máscara de escamas', exame: 'Usada nas cerimónias. O profeta deve estar no fundo, no altar.' }
          ],
          sala: 'Altar do Fundo', salaDesc: 'Um altar de pedra junto a um poço de água negra.',
          intro: 'Um homem de barbas compridas e manto de escamas ergue os braços diante do poço: «Mais uma oferenda para o Fundo!»',
          boss: { id: 'profeta', nome: 'Profeta do Fundo', g: 'm', desc: 'o Profeta do Fundo, de manto de escamas', hp: 5, dano: 2, def: 0, tipo: 'humanoide', estado: 'alerta', exame: 'Fanático, mas carne e osso.' },
          vitoria: 'O Profeta cai para dentro do poço negro. A água não devolve nada.', desfecho: 'A confraria paga e manda emparedar o poço.' }
      ]
    }
  };
})(window.CP.DATA);
