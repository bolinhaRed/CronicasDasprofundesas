/* Missões da região do Vale de Corvamonte.
   Cada missão tem a estrutura narrativa preparada ANTES da aventura começar:
   gancho → entrada → 3 pistas (espalhadas pela masmorra, da mais superficial à mais funda) → cena final → desfechos.
   As pistas desbloqueiam opções na cena final ou dão vantagens mecânicas. */
(function (D) {
  'use strict';

  D.missoes = {
    /* ---------------------------------------------------------------- 1 */
    sinos: {
      id: 'sinos', titulo: 'Os Sinos de Valdrem', tipo: 'cripta', local: 'Cripta de Valdrem', salas: 7, inicial: true,
      categoria: 'Investigar desaparecimentos',
      cliente: 'Bartolomeu, regedor de Corvamonte', recompensa: 20,
      gancho: 'Os aldeões de Corvamonte juram que, desde que a velha cripta de Valdrem foi aberta pelo terramoto, as galinhas desaparecem e ouvem-se sinos debaixo da terra. O regedor Bartolomeu paga-te 20 moedas para descobrires o que se passa.',
      entrada: 'Afastas as pedras soltas e desces as escadas de pedra. Algures, muito abaixo, um sino toca uma vez e cala-se.',
      pistas: [
        { id: 'p1', nome: 'penas e ossos de galinha', kw: ['penas', 'pena', 'galinha', 'galinhas', 'ossos'], desc: 'um monte de penas e ossinhos junto a cinzas de uma fogueira',
          exame: 'São penas de galinha e ossos pequenos — não roídos: cortados com faca. Alguém assou a carne numa fogueirinha. Um animal não faz isto. Quem rouba as galinhas come como um homem.' },
        { id: 'p2', nome: 'inscrição do selo', kw: ['inscricao', 'letras', 'parede', 'escrita', 'gravura'], desc: 'uma inscrição gravada na parede', teste: 'ler',
          exame: 'Lês, em letras antigas: «ENQUANTO O BRONZE CANTAR, O SENHOR DE VALDREM DORME. PARA O SELAR, TRÊS TOQUES E O SEU NOME VERDADEIRO: AFONSO.» Por baixo, a carvão, em letra trémula e recente: «o selo partiu-se. tocar a cada hora. não parar.»',
          falhaTxt: 'As letras estão gastas e cobertas de salitre. Só percebes «bronze» e «dorme».' },
        { id: 'p3', nome: 'diário de couro', kw: ['diario', 'livro', 'couro', 'caderno'], desc: 'um livro de capa de couro, inchado de humidade',
          exame: 'É o diário do Irmão Osric, sacristão de Valdrem, que todos julgavam morto há anos. As últimas páginas tremem: «Desde o tremor, o Senhor mexe-se no túmulo. Só o sino o acalma. Já não sei a oração inteira. Tenho fome. Que Deus me perdoe as galinhas.»' }
      ],
      final: {
        sala: 'Câmara do Sino', desc: 'Uma câmara alta. Do tecto pende um sino de bronze esverdeado. Ao fundo, um túmulo de pedra negra, rachado ao meio.',
        intro: 'Um homem esquálido, de hábito em farrapos, agarra a corda do sino com as duas mãos. Ao ver-te, grita: «Não pares o sino! Se eu largar a corda, ele acorda!» Atrás dele, a tampa do túmulo negro range.',
        npc: { nome: 'Irmão Osric', g: 'p', kw: ['osric', 'homem', 'irmao', 'sacristao', 'monge', 'velho'], desc: 'um homem esquálido agarrado à corda do sino',
          fala: 'Osric olha-te com olhos fundos e vermelhos. «Quem és tu? Vieste pela aldeia? Não toques em nada!»' },
        inimigos: [{ id: 'senhor', nome: 'Senhor de Valdrem', g: 'p', desc: 'o Senhor de Valdrem, uma armadura vazia com dois pontos de luz fria no elmo', hp: 6, dano: 2, def: 1, tipo: 'morto', estado: 'oculto', exame: 'Uma armadura ferrugenta animada por ódio. Difícil de ferir (−1).' }],
        opcoes: [
          { id: 'atacar', rotulo: 'Atacar o homem', kw: ['atacar', 'matar', 'golpear', 'bater'], efeitos: [
            { t: 'Osric larga a corda para se defender e cai à primeira pancada, mais fraco do que um cão faminto. O sino cala-se. Do túmulo rachado ergue-se uma armadura vazia, com dois pontos de luz fria no elmo.' },
            { flag: 'osric_morto' }, { remove: 'npc' }, { combate: true }] },
          { id: 'falar', rotulo: 'Acalmá-lo e pedir explicações', kw: ['falar', 'acalmar', 'explicar', 'conversar', 'perguntar'], naoFlag: 'osric_falou', teste: 'falar', res: {
            sucesso: [{ t: 'Osric acalma-se. Conta-te tudo: o terramoto partiu o selo do túmulo; o toque do sino mantém o Senhor de Valdrem adormecido; toca há semanas, dia e noite, e rouba galinhas para não morrer de fome. «Há maneira de renovar o selo... está escrita algures nesta cripta. Eu já não vejo as letras.»' }, { flag: 'osric_falou' }],
            parcial: [{ t: 'Osric fala aos tropeções, sem largar a corda: o selo partiu-se, o sino acalma «o Senhor», e há uma maneira de selar de novo, escrita nas paredes. O esforço de te responder fá-lo falhar um toque — o túmulo range.' }, { flag: 'osric_falou' }, { tick: 1 }],
            falha: [{ t: '«Mentiroso! Vieste roubar o túmulo!» Osric toca o sino mais alto, em pânico, e não te diz mais nada.' }, { tick: 2 }] } },
          { id: 'selar', rotulo: 'Renovar o selo: três toques e o nome «Afonso»', kw: ['selo', 'selar', 'renovar', 'afonso', 'tres', 'toques', 'nome'], requer: ['p2'], teste: 'ler', res: {
            sucesso: [{ t: 'Pegas na corda e tocas o sino três vezes, gritando o nome verdadeiro: «AFONSO!» A rachadura do túmulo fecha-se com um som de pedra a sarar. Silêncio. Osric cai de joelhos e chora de alívio.' }, { completa: 'selado' }],
            parcial: [{ t: 'Tocas três vezes e dizes o nome. A rachadura fecha-se, mas um frio do túmulo morde-te as mãos até ao osso.' }, { dano: 2 }, { completa: 'selado' }],
            falha: [{ t: 'Erras o ritmo dos toques. A tampa do túmulo salta e uma armadura vazia ergue-se — ainda meio presa ao sono, lenta.' }, { bossMod: { hp: -2 } }, { combate: true }] } },
          { id: 'convencer', rotulo: 'Mostrar-lhe o diário e propor fazerem o selo juntos', kw: ['diario', 'mostrar', 'juntos', 'ajudar', 'convencer'], requer: ['p1', 'p3'], efeitos: [
            { t: '«Sabes das galinhas... e leste o meu diário.» Osric baixa os ombros. Combinam: tu tocas o sino, ele recita a oração do selo que afinal ainda sabe — só precisava de mãos livres. O túmulo sela-se com um suspiro de pedra. Osric aceita vir contigo e pedir perdão à aldeia.' },
            { flag: 'osric_salvo' }, { completa: 'osric_salvo' }] }
        ],
        vitoria: [{ t: 'A armadura desfaz-se em ferrugem e pó. Entre os restos brilha um anel de prata negra.' }, { item: 'anel_valdrem' }, { completa: 'destruido', seFlag: 'osric_morto', entao: 'destruido_morto' }]
      },
      desfechos: {
        selado: { titulo: 'O selo renovado', texto: 'Contas ao regedor o que se passa debaixo da terra. Ele ouve-te com desconfiança, mas os sinos calam-se e as galinhas deixam de desaparecer. Paga-te as 20 moedas. Osric ficou lá em baixo, a guardar o túmulo — e agora pode dormir.', ouro: 20, xp: 3, flags: ['valdrem_selado'], desbloqueia: ['reliquia', 'calice'] },
        osric_salvo: { titulo: 'O sacristão volta a casa', texto: 'Osric sobe contigo à luz do dia pela primeira vez em anos. Pede perdão à aldeia pelas galinhas e o padre Gaspar dá-lhe abrigo no templo. Antes de se despedir, conta-te da Mão de Santa Ilva, guardada no Santuário Afogado: «Com ela, o Senhor de Valdrem ficaria selado para sempre.»', ouro: 20, xp: 5, flags: ['valdrem_selado', 'osric_aliado'], desbloqueia: ['reliquia', 'calice'] },
        destruido: { titulo: 'O Senhor destruído', texto: 'Trazes o anel de prata negra como prova. O regedor paga-te 25 moedas, mais do que o combinado. Osric fugiu para as profundezas da cripta durante o combate; ninguém sabe dele.', ouro: 25, xp: 4, flags: ['senhor_destruido'], desbloqueia: ['reliquia', 'calice', 'ossario'] },
        destruido_morto: { titulo: 'Sangue na cripta', texto: 'O regedor paga-te, mas quando os aldeões descem e encontram o corpo do velho sacristão — o homem que os protegia — o padre Gaspar passa a olhar-te de lado. O templo não te venderá nada durante uns tempos.', ouro: 20, xp: 3, flags: ['senhor_destruido', 'osric_morto', 'templo_hostil'], desbloqueia: ['calice', 'ossario'] }
      }
    },

    /* ---------------------------------------------------------------- 2 */
    mineiro: {
      id: 'mineiro', titulo: 'O Filho do Ferreiro', tipo: 'mina', local: 'Mina do Fundo Negro', salas: 7, inicial: true,
      categoria: 'Resgatar um prisioneiro',
      cliente: 'Anselmo, o ferreiro', recompensa: 25,
      gancho: 'Tomé, filho do ferreiro Anselmo, desceu à Mina do Fundo Negro atrás de umas ferramentas esquecidas e não voltou. Isso foi há dois dias. Anselmo oferece-te 25 moedas se o trouxeres vivo.',
      entrada: 'A boca da mina sopra ar frio. Desces por uma escada de madeira presa à rocha. Lá em baixo, no escuro, algo metálico bate: tlim... tlim... tlim.',
      pistas: [
        { id: 'p1', nome: 'pegadas na lama', kw: ['pegadas', 'pegada', 'lama', 'rasto', 'pes'], desc: 'pegadas pequenas na lama',
          exame: 'Pegadas descalças, pequenas de mais para um homem, com marcas de garras. Muitas. E, no meio delas, o rasto de umas botas arrastadas. Goblins — e levavam alguém.' },
        { id: 'p2', nome: 'setas de giz', kw: ['giz', 'seta', 'setas', 'marca', 'marcas'], desc: 'uma seta desenhada a giz na rocha',
          exame: 'Uma seta a giz e as letras T. A. — Tomé Anselmo marcou o caminho! Ao lado das setas, pequenas cruzes indicam onde não pôr os pés. Sabes agora onde estão as armadilhas desta mina.',
          efeitos: [{ revela: 'armadilhas' }] },
        { id: 'p3', nome: 'escória morna', kw: ['escoria', 'cinza', 'metal', 'monte'], desc: 'um monte de escória ainda morna',
          exame: 'Escória de fundição, ainda morna — e mal feita. Os goblins não sabem forjar. Por isso precisavam de um ferreiro... e por isso o Tomé ainda está vivo. Um bom ferreiro preso trabalha mal; um aliado trabalha bem.' }
      ],
      final: {
        sala: 'Forja dos Goblins', desc: 'Uma câmara quente, com uma forja improvisada de pedras e um fole de pele de cabra.',
        intro: 'O calor bate-te na cara. Tomé, acorrentado a uma bigorna, martela uma lâmina torta. Um goblin enorme, com um elmo de panela, grita-lhe ordens; outro aviva o fogo com o fole. Ainda não te viram.',
        npc: { nome: 'Tomé', g: 'p', kw: ['tome', 'rapaz', 'prisioneiro', 'filho'], desc: 'Tomé, acorrentado à bigorna', fala: 'Tomé vê-te e arregala os olhos, mas continua a martelar para não te denunciar.' },
        inimigos: [
          { id: 'grakk', nome: 'Grakk', g: 'p', desc: 'Grakk, o chefe goblin, de elmo de panela', hp: 4, dano: 2, def: 0, tipo: 'humanoide', estado: 'passivo', exame: 'Grande para um goblin. Mais esperto do que parece.' },
          { id: 'fole', nome: 'goblin do fole', g: 'm', desc: 'um goblin a dar ao fole', hp: 2, dano: 1, def: 0, tipo: 'humanoide', estado: 'passivo' }
        ],
        opcoes: [
          { id: 'libertar', rotulo: 'Esgueirar-te e libertar Tomé', kw: ['libertar', 'soltar', 'esgueirar', 'corrente', 'furtivo'], teste: 'furtivo', semCombate: true, res: {
            sucesso: [{ t: 'Esgueiras-te pela sombra da forja. Com uma pedra, partes o elo podre da corrente ao ritmo das marteladas. Tomé e tu saem sem que os goblins dêem por nada.' }, { completa: 'furtivo' }],
            parcial: [{ t: 'Libertas Tomé, mas à saída ele tropeça num balde. Grakk vira-se: «LADRÕES!»' }, { flag: 'tome_livre' }, { combate: true }],
            falha: [{ t: 'Pisas uma pá. O estrondo faz os goblins virarem-se de faca na mão.' }, { combate: true }] } },
          { id: 'acordo', rotulo: 'Propor um acordo: ferro da aldeia em troca do rapaz', kw: ['acordo', 'negociar', 'propor', 'troca', 'ferro'], requer: ['p3'], semCombate: true, teste: 'falar', res: {
            sucesso: [{ t: 'Explicas a Grakk que um ferreiro preso trabalha mal, mas que a aldeia pode vender-lhes ferro bom. Grakk coça o elmo, pensa muito, e aceita: Tomé pela promessa e cinco moedas «de sinal».' }, { ouro: -5 }, { completa: 'acordo' }],
            parcial: [{ t: 'Grakk aceita, mas regateia como um feirante: quer dez moedas.' }, { ouro: -10 }, { completa: 'acordo' }],
            falha: [{ t: 'Grakk ri-se, um riso de serrote. «Ferro? Eu tenho o ferreiro!» E puxa da faca.' }, { combate: true }] }, requerOuro: 10 }
        ],
        vitoria: [{ t: 'O último goblin cai. Partes a corrente de Tomé com o martelo dele.' }, { completa: 'resgatado' }]
      },
      desfechos: {
        resgatado: { titulo: 'Tomé está salvo', texto: 'Anselmo abraça o filho até lhe estalarem as costelas. Paga-te as 25 moedas e jura que, enquanto viver, as tuas armas têm desconto na forja dele.', ouro: 25, xp: 3, flags: ['tome_salvo'], desbloqueia: ['ruido'] },
        furtivo: { titulo: 'Como sombras', texto: 'Ninguém em Corvamonte acredita que tiraste Tomé de um covil de goblins sem desembainhar. Anselmo paga as 25 moedas e dá-te desconto na forja para sempre.', ouro: 25, xp: 4, flags: ['tome_salvo'], desbloqueia: ['ruido'] },
        acordo: { titulo: 'Um pacto estranho', texto: 'Tomé volta inteiro, e Anselmo, depois de muito praguejar, aceita vender ferro aos goblins. Pela primeira vez em décadas, há paz com as galerias. Desconto na forja e 25 moedas.', ouro: 25, xp: 4, flags: ['tome_salvo', 'pacto_goblin'], desbloqueia: ['ruido'] }
      }
    },

    /* ---------------------------------------------------------------- 3 */
    poco: {
      id: 'poco', titulo: 'A Coisa no Poço', tipo: 'santuario', local: 'Santuário Afogado de Ilva', salas: 7, inicial: true,
      categoria: 'Eliminar uma criatura',
      cliente: 'a confraria dos pastores de Ilva-Baixa', recompensa: 30,
      gancho: 'Em Ilva-Baixa, os pastores perdem ovelhas para o velho Santuário Afogado, meio engolido pelo lago. Algo as arrasta para dentro do poço sagrado. A confraria junta 30 moedas pela cabeça da criatura.',
      entrada: 'A água chega-te aos tornozelos logo nos primeiros degraus. Cheira a lodo e a incenso podre. Ao longe, algo pesado mergulha.',
      pistas: [
        { id: 'p1', nome: 'escamas viscosas', kw: ['escamas', 'escama', 'pedra'], desc: 'escamas grandes presas a uma pedra',
          exame: 'Escamas do tamanho de uma mão, viscosas. Quando lhes bate a luz, secam e estalam. A criatura sobe para respirar e, nesse instante, fica exposta: sabes quando atacar (+1 para atacar a criatura).' },
        { id: 'p2', nome: 'cabeça de pedra', kw: ['cabeca', 'fragmento', 'pedra', 'estatua', 'idolo'], desc: 'um pedaço de pedra branca entalhada',
          exame: 'É a cabeça de uma estatueta de Santa Ilva, partida. Na nuca lê-se: «QUE A SANTA GUARDE AS ÁGUAS.» Guardas o fragmento.', efeitos: [{ item: 'fragmento_ilva' }] },
        { id: 'p3', nome: 'sulcos no lodo', kw: ['sulcos', 'marcas', 'lodo', 'arrasto', 'la'], desc: 'sulcos fundos no lodo', teste: 'procurar',
          exame: 'Os sulcos vêm do poço e voltam a ele. Há lã presa nas pedras... e, mais adiante, um pedestal vazio com marcas de dentes: algo derrubou a estátua da santa que guardava o poço. Desde então, o poço apodrece — e a criatura cresce.',
          falhaTxt: 'Só lodo e mais lodo. Não percebes de onde vêm os sulcos.' }
      ],
      final: {
        sala: 'Poço Sagrado', desc: 'Uma sala redonda, meio submersa. No centro, um poço largo de água negra. Ao lado, um pedestal de pedra sem estátua.',
        intro: 'A água do poço borbulha. Uma boca redonda, cheia de dentes em espiral, ergue-se da água, oscila como uma serpente... e vira-se para ti.',
        inimigos: [{ id: 'lampreia', nome: 'Lampreia do Poço', g: 'f', desc: 'a Lampreia do Poço, com uma boca de dentes em espiral', hp: 7, dano: 2, def: 0, tipo: 'fera', estado: 'alerta', exame: 'Enorme. A pele seca e estala onde a luz lhe bate.' }],
        bonus: { p1: 1 },
        opcoes: [
          { id: 'santa', rotulo: 'Correr para o pedestal e pôr lá a cabeça da santa', kw: ['pedestal', 'santa', 'cabeca', 'fragmento', 'por', 'colocar'], requerItem: 'fragmento_ilva', teste: 'esquivar', res: {
            sucesso: [{ t: 'Corres para o pedestal e encaixas a cabeça da santa nos restos da estátua. A pedra brilha, branca como leite. A criatura guincha, encolhe e perde a força.' }, { removeItem: 'fragmento_ilva' }, { flag: 'santa_restaurada' }, { bossMod: { hp: -4 } }, { combate: true }],
            parcial: [{ t: 'Chegas ao pedestal com a criatura agarrada à tua perna. Encaixas a cabeça: a pedra brilha e a Lampreia solta-te, a guinchar, enfraquecida.' }, { dano: 2 }, { removeItem: 'fragmento_ilva' }, { flag: 'santa_restaurada' }, { bossMod: { hp: -4 } }, { combate: true }],
            falha: [{ t: 'A criatura derruba-te antes de chegares ao pedestal.' }, { dano: 2 }, { combate: true }] } }
        ],
        vitoria: [{ t: 'A Lampreia do Poço afunda-se devagar, a cuspir água negra. Cortas-lhe um dente como prova.' }, { item: 'dente' }, { completa: 'morta' }]
      },
      desfechos: {
        morta: { titulo: 'O poço está limpo', texto: 'A confraria dos pastores pesa o dente da criatura numa balança de lã e paga-te as 30 moedas. Há festa em Ilva-Baixa.', ouro: 30, xp: 4, flags: ['lago_limpo'], desbloqueia: ['calice'],
          extra: { flag: 'santa_restaurada', texto: 'O padre Gaspar, ao saber que restauraste a estátua da santa, dá-te mais 10 moedas e uma bênção.', ouro: 10, item: 'aguabenta' } }
      }
    },

    /* ---------------------------------------------------------------- 4 */
    ruido: {
      id: 'ruido', titulo: 'O Martelo nas Profundezas', tipo: 'mina', local: 'Mina do Fundo Negro', salas: 7,
      categoria: 'Descobrir a origem de um ruído',
      cliente: 'Anselmo, o ferreiro', recompensa: 30,
      gancho: 'Desde que Tomé voltou, a mina ressoa à noite com pancadas regulares, como um martelo de gigante. Os goblins fugiram das galerias e as cabras da aldeia não dormem. Anselmo quer saber o que é: 30 moedas.',
      entrada: 'Lá em baixo, as pancadas sentem-se no peito: BUM... BUM... BUM. A cada golpe, cai pó do tecto.',
      pistas: [
        { id: 'p1', nome: 'roda dentada', kw: ['roda', 'dentada', 'engrenagem', 'bronze'], desc: 'uma roda dentada de bronze, do tamanho de um escudo',
          exame: 'Bronze antigo, trabalho anão. Os dentes estão gastos de girar sem parar. Algo mecânico está vivo cá em baixo — e as articulações estão secas, a ranger.' },
        { id: 'p2', nome: 'runas anãs', kw: ['runas', 'runa', 'lintel', 'inscricao', 'letras'], desc: 'runas gravadas num lintel de pedra', teste: 'ler',
          exame: 'Runas anãs. Decifras: «SENTINELA, GUARDA O VEIO. À PALAVRA ‹DORME-PEDRA›, REPOUSA.»',
          falhaTxt: 'As runas anãs dançam diante dos teus olhos. Não as consegues decifrar.' },
        { id: 'p3', nome: 'almotolia de óleo', kw: ['almotolia', 'oleo', 'lata'], desc: 'uma almotolia de óleo grosso',
          exame: 'Óleo de máquina anão, ainda bom, numa almotolia de bico comprido. Guarda-la.', efeitos: [{ item: 'almotolia' }] }
      ],
      final: {
        sala: 'Câmara do Veio', desc: 'Uma câmara enorme, com um veio de bronze nativo a brilhar na parede do fundo.',
        intro: 'Um gigante de bronze, com o dobro da tua altura, martela a parede de rocha com um braço em forma de malho. A cada golpe, faíscas. Uma das articulações chia, seca. Ainda não te viu.',
        inimigos: [{ id: 'sentinela', nome: 'Sentinela de Bronze', g: 'f', desc: 'a Sentinela de Bronze, um gigante de metal com um braço-malho', hp: 8, dano: 2, def: 1, tipo: 'constructo', estado: 'passivo', exame: 'Bronze espesso: difícil de ferir (−1). Bate como um aríete.' }],
        opcoes: [
          { id: 'palavra', rotulo: 'Dizer a palavra: «Dorme-pedra»', kw: ['dorme', 'pedra', 'palavra', 'dizer', 'dorme-pedra'], requer: ['p2'], efeitos: [
            { t: 'Dizes as palavras com voz firme. «DORME-PEDRA.» Os olhos de vidro da Sentinela apagam-se. O malho pára a meio do golpe. Silêncio total — pela primeira vez em semanas. No peito, uma portinhola abre-se e revela um coração de bronze, ainda morno.' },
            { item: 'coracao_bronze' }, { remove: 'boss' }, { completa: 'adormecida' }] },
          { id: 'olear', rotulo: 'Aproximar-te por trás e olear a articulação', kw: ['olear', 'oleo', 'almotolia', 'articulacao'], requerItem: 'almotolia', teste: 'furtivo', semCombate: true, res: {
            sucesso: [{ t: 'Aproximas-te por trás e despejas o óleo na articulação. O chiar pára. A Sentinela também. Vira-se para ti, devagar, e inclina a cabeça como um cão. Parece... grata. Volta ao seu posto e fica imóvel, em silêncio.' }, { removeItem: 'almotolia' }, { remove: 'boss' }, { completa: 'amiga' }],
            parcial: [{ t: 'O óleo resulta, mas o braço apanha-te de raspão antes de a máquina parar.' }, { dano: 2 }, { removeItem: 'almotolia' }, { remove: 'boss' }, { completa: 'amiga' }],
            falha: [{ t: 'A Sentinela sente-te e vira-se, com o malho erguido!' }, { combate: true }] } }
        ],
        vitoria: [{ t: 'A Sentinela de Bronze tomba com um estrondo que se ouve até à aldeia. No peito rachado, um coração de bronze ainda gira.' }, { item: 'coracao_bronze' }, { completa: 'destruida' }]
      },
      desfechos: {
        adormecida: { titulo: 'O silêncio da mina', texto: 'As pancadas acabam. Anselmo paga as 30 moedas e, quando lhe mostras o coração de bronze, oferece-se para forjar com o metal do veio uma espada anã — à venda na forja.', ouro: 30, xp: 4, flags: ['mina_segura'], desbloqueia: ['ossario'] },
        amiga: { titulo: 'A guardiã de bronze', texto: 'A mina fica em silêncio, guardada por uma sentinela que agora te reconhece. Anselmo paga as 30 moedas e começa a trabalhar o bronze do veio: há espadas anãs na forja.', ouro: 30, xp: 5, flags: ['mina_segura', 'sentinela_amiga'], desbloqueia: ['ossario'] },
        destruida: { titulo: 'O gigante caído', texto: 'A mina fica em silêncio. Anselmo paga as 30 moedas e começa a trabalhar o bronze do veio: há espadas anãs na forja.', ouro: 30, xp: 4, flags: ['mina_segura'], desbloqueia: ['ossario'] }
      }
    },

    /* ---------------------------------------------------------------- 5 */
    calice: {
      id: 'calice', titulo: 'O Cálice Roubado', tipo: 'santuario', local: 'Ruínas do Claustro de Ilva', salas: 6,
      categoria: 'Recuperar um objecto roubado',
      cliente: 'o padre Gaspar', recompensa: 25,
      gancho: 'O cálice de prata da capela de Corvamonte desapareceu na noite de S. Martinho. O padre Gaspar suspeita dos salteadores de Rufo Meia-Orelha, que se esconderão nas ruínas do claustro de Ilva. Paga 25 moedas pelo cálice.',
      entrada: 'Há pegadas frescas de botas nos degraus molhados. Alguém subiu e desceu muitas vezes. Ouve-se, ao longe, uma gargalhada.',
      pistas: [
        { id: 'p1', nome: 'pegada de fivela', kw: ['pegada', 'fivela', 'sapato'], desc: 'uma pegada pequena de sapato de fivela',
          exame: 'Sapatos de fivela, pequenos — como os que o padre dá aos acólitos. Não são botas de salteador. Alguém da igreja esteve aqui.' },
        { id: 'p2', nome: 'carta molhada', kw: ['carta', 'papel', 'bilhete'], desc: 'um papel dobrado, meio molhado',
          exame: '«Lia: trazes o cálice até ao fim do mês, ou o teu irmão paga a dívida dele com os dedos. — R.» A acólita Lia roubou o cálice... obrigada.' },
        { id: 'p3', nome: 'cofre vazio', kw: ['cofre', 'caixa', 'vazio'], desc: 'um pequeno cofre aberto e vazio',
          exame: 'Um cofre de salteador, vazio. Estão sem dinheiro. Vão querer vender o cálice depressa — e talvez aceitem moedas por ele.' }
      ],
      final: {
        sala: 'Sacristia dos Salteadores', desc: 'Uma sacristia com uma fogueira acesa no meio do chão de mármore e mantas de salteador pelos cantos.',
        intro: 'À luz da fogueira, um homem com meia orelha embrulha o cálice num pano. A um canto, uma rapariga de hábito de acólita abraça os joelhos. Outro salteador afia uma faca. Rufo põe a mão no punhal: «Mais um curioso. Vai-te embora, ou fica cá para sempre.»',
        npc: { nome: 'Lia', g: 'p', kw: ['lia', 'rapariga', 'acolita'], desc: 'Lia, a acólita, encolhida a um canto', fala: 'Lia não te olha nos olhos.' },
        inimigos: [
          { id: 'rufo', nome: 'Rufo Meia-Orelha', g: 'p', desc: 'Rufo Meia-Orelha, de punhal à cinta', hp: 5, dano: 2, def: 0, tipo: 'humanoide', estado: 'alerta', exame: 'Um salteador velho e manhoso.' },
          { id: 'capanga', nome: 'capanga', g: 'm', desc: 'um capanga de cara marcada', hp: 2, dano: 1, def: 0, tipo: 'humanoide', estado: 'alerta' }
        ],
        opcoes: [
          { id: 'comprar', rotulo: 'Oferecer 15 moedas pelo cálice', kw: ['comprar', 'oferecer', 'pagar', 'moedas'], requer: ['p3'], requerOuro: 15, semCombate: true, efeitos: [
            { ouro: -15 }, { t: 'Rufo conta as moedas duas vezes, morde uma, e atira-te o cálice. «Negócio é negócio.»' }, { item: 'calice' }, { completa: 'comprado' }] },
          { id: 'intimidar', rotulo: 'Intimidá-los', kw: ['intimidar', 'ameacar', 'assustar'], teste: 'intimidar', semCombate: true, res: {
            sucesso: [{ t: 'Dás um passo em frente e a tua voz enche a sacristia. Rufo mede-te de alto a baixo, larga o cálice e foge com o capanga pela outra porta.' }, { item: 'calice' }, { remove: 'boss' }, { completa: 'intimidado' }],
            parcial: [{ t: 'Rufo larga o cálice e foge, mas o capanga não se assusta tão facilmente e atira-se a ti antes de fugir também.' }, { dano: 1 }, { item: 'calice' }, { remove: 'boss' }, { completa: 'intimidado' }],
            falha: [{ t: 'Rufo ri-se. «Bonito discurso.» Puxam das facas.' }, { combate: true }] } },
          { id: 'revelar', rotulo: 'Mostrar a carta a Lia: «Não tens de fazer isto»', kw: ['carta', 'lia', 'mostrar', 'revelar', 'chantagem'], requer: ['p2'], semCombate: true, efeitos: [
            { t: 'Mostras a carta. «O padre sabe que foste obrigada. O teu irmão está a salvo na aldeia.» Lia levanta-se, agarra no cálice e corre para ti. Rufo amaldiçoa e puxa do punhal — mas agora está a lutar em desvantagem, e sabe-o.' },
            { flag: 'lia_salva' }, { item: 'calice' }, { bossMod: { hp: -2 } }, { combate: true }] }
        ],
        vitoria: [{ t: 'Rufo cai de joelhos e entrega o que resta. O cálice está a salvo.' }, { item: 'calice' }, { completa: 'recuperado', seFlag: 'lia_salva', entao: 'lia' }]
      },
      desfechos: {
        recuperado: { titulo: 'O cálice volta ao altar', texto: 'O padre Gaspar beija o cálice e paga-te as 25 moedas. Lia, a acólita, chora no ombro dele e confessa tudo.', ouro: 25, xp: 3, flags: ['calice_devolvido'], desbloqueia: ['ossario'] },
        comprado: { titulo: 'Negócio é negócio', texto: 'O padre Gaspar paga-te as 25 moedas e não pergunta como recuperaste o cálice. Rufo continua à solta... e com mais dinheiro.', ouro: 25, xp: 3, flags: ['calice_devolvido', 'rufo_livre'], desbloqueia: ['ossario'] },
        intimidado: { titulo: 'Salteadores em fuga', texto: 'O padre Gaspar paga-te as 25 moedas. Corre a notícia de que puseste Rufo Meia-Orelha a fugir só com palavras.', ouro: 25, xp: 4, flags: ['calice_devolvido'], desbloqueia: ['ossario'] },
        lia: { titulo: 'A acólita perdoada', texto: 'O padre Gaspar perdoa Lia e paga-te as 25 moedas. A rapariga passa a ajudar no templo — e as poções do mercado ficam mais baratas, porque é ela quem as prepara agora.', ouro: 25, xp: 5, flags: ['calice_devolvido', 'lia_salva'], desbloqueia: ['ossario'] }
      }
    },

    /* ---------------------------------------------------------------- 6 */
    reliquia: {
      id: 'reliquia', titulo: 'A Mão de Santa Ilva', tipo: 'santuario', local: 'Relicário do Santuário Afogado', salas: 7,
      categoria: 'Encontrar uma relíquia',
      cliente: 'o templo de Corvamonte', recompensa: 20,
      gancho: 'No fundo do Santuário Afogado repousa a Mão de Santa Ilva, uma relíquia capaz de selar para sempre os mortos inquietos. Muitos foram buscá-la; nenhum voltou. O templo paga 20 moedas a quem a trouxer — e deixa-ta guardar, se a usares contra o mal.',
      entrada: 'Desces por degraus que nunca viste. A água aqui é limpa e transparente, e por baixo dela há moedas, espadas, ossos. Os que vieram antes de ti.',
      pistas: [
        { id: 'p1', nome: 'vitral partido', kw: ['vitral', 'cacos', 'vidro', 'janela'], desc: 'cacos de um vitral colorido no chão',
          exame: 'Juntas alguns cacos. Mostram a santa a dar a sua única caixa de ouro a um pescador pobre, e a guardar para si uma caixa de madeira. A santa escolheu a humildade.' },
        { id: 'p2', nome: 'livro de votos', kw: ['livro', 'votos', 'registo', 'pergaminho'], desc: 'um livro de votos encadernado em pele de peixe', teste: 'ler',
          exame: 'Entre pedidos de milagres, uma frase sublinhada muitas vezes: «O OURO É PARA OS LADRÕES. A SANTA DORME NA MADEIRA.»',
          falhaTxt: 'A tinta borrou-se toda com a humidade. Não consegues ler.' },
        { id: 'p3', nome: 'esqueleto de ladrão', kw: ['esqueleto', 'ladrao', 'bolsa', 'corpo'], desc: 'um esqueleto com uma bolsa à cintura',
          exame: 'Um ladrão antigo. Os ossos dos dedos estão corroídos, como queimados por ácido. Morreu a tentar abrir alguma coisa. Na bolsa, 6 moedas.', efeitos: [{ ouro: 6 }] }
      ],
      final: {
        sala: 'Relicário', desc: 'Uma capela redonda e seca, milagrosamente, com um altar de mármore ao centro. À frente do altar, a água forma um tanque.',
        intro: 'No altar repousam dois relicários: um de ouro, cravejado de pedras, e uma caixa simples de madeira escura. No tanque à frente do altar, uma figura de armadura afunda e sobe, devagar, como se respirasse. Parece adormecida.',
        inimigos: [{ id: 'guardiao', nome: 'Guardião Afogado', g: 'm', desc: 'o Guardião Afogado, uma armadura cheia de água', hp: 5, dano: 2, def: 0, tipo: 'morto', estado: 'dormente', exame: 'Um cavaleiro que jurou guardar a santa e não deixou de o fazer por estar morto.' }],
        opcoes: [
          { id: 'ouro', rotulo: 'Abrir o relicário de ouro', kw: ['ouro', 'dourado', 'pedras'], naoFlag: 'ouro_aberto', efeitos: [
            { t: 'Ao tocares no ouro, a tampa abre e um jacto de líquido verde salta-te para as mãos! Lá dentro, só ossos de cão. Na água, o Guardião abre os olhos.' },
            { dano: 2 }, { flag: 'ouro_aberto' }, { combate: true }] },
          { id: 'madeira', rotulo: 'Abrir a caixa de madeira', kw: ['madeira', 'caixa', 'simples', 'escura'], efeitos: [
            { t: 'Abres a caixa de madeira. Lá dentro, embrulhada em linho, uma mão mirrada que cheira a rosas. Na água, o Guardião Afogado baixa a cabeça, como quem se despede, e afunda de vez.' },
            { item: 'mao_ilva' }, { remove: 'boss' }, { completa: 'reliquia' }] }
        ],
        vitoria: [{ t: 'O Guardião Afogado desfaz-se em água e ferrugem. Agora podes escolher com calma.' }, { flag: 'guardiao_morto' }]
      },
      desfechos: {
        reliquia: { titulo: 'A Mão de Santa Ilva', texto: 'O padre Gaspar ajoelha-se diante da relíquia. Paga-te 20 moedas e deixa-ta guardar: «Leva-a para onde os mortos não descansam.» Uma vez por expedição, a Mão cura todo o grupo.', ouro: 20, xp: 5, flags: ['reliquia_encontrada'], desbloqueia: ['ossario'] }
      }
    },

    /* ---------------------------------------------------------------- 7 */
    ossario: {
      id: 'ossario', titulo: 'O Rei de Mirvale', tipo: 'cripta', local: 'Ossário de Mirvale', salas: 8,
      categoria: 'Explorar uma ruína',
      cliente: 'o regedor Bartolomeu e o padre Gaspar', recompensa: 50,
      gancho: 'Todos os males do vale — o Senhor de Valdrem, os afogados, as coisas nas minas — começaram quando o terramoto abriu o Ossário de Mirvale, onde jaz o último rei do vale. Dizem que ele não morreu: apenas espera. O regedor e o padre juntam 50 moedas para que alguém desça e acabe com isto de vez.',
      entrada: 'As escadas do ossário são de osso — milhares de ossos encaixados como pedras. Lá em baixo, uma voz antiga sussurra o teu nome. Como é que sabe o teu nome?',
      pistas: [
        { id: 'p1', nome: 'mural do rei', kw: ['mural', 'pintura', 'parede', 'rei'], desc: 'um mural pintado com um rei coroado',
          exame: 'O mural mostra o rei de Mirvale a arrancar o próprio coração e a guardá-lo num jarro, para nunca morrer. Enquanto o coração bater no jarro, o rei não pode ser destruído por completo.' },
        { id: 'p2', nome: 'jarro canópico', kw: ['jarro', 'canopico', 'vaso', 'coracao'], desc: 'um jarro de barro selado, que treme sozinho',
          exame: 'Dentro do jarro, algo bate: tum-tum... tum-tum. É o coração do rei. Guardas o jarro com cuidado.', efeitos: [{ item: 'jarro' }] },
        { id: 'p3', nome: 'epitáfio', kw: ['epitafio', 'inscricao', 'lapide', 'letras'], desc: 'um epitáfio gravado em letras de ouro', teste: 'ler',
          exame: '«AQUI ESPERA O REI. SÓ A MÃO DA SANTA O FARÁ DORMIR.» Alguém riscou por baixo, a faca: «ou o fogo».',
          falhaTxt: 'As letras de ouro foram arrancadas em parte. Não percebes o que dizem.' }
      ],
      final: {
        sala: 'Sala do Trono de Ossos', desc: 'Uma sala enorme. Ao fundo, um trono feito de crânios.',
        intro: 'No trono de crânios está sentado um esqueleto coroado, com um manto de veludo podre. Ergue-se devagar. «Vieste servir-me», diz, numa voz que vem de todas as paredes ao mesmo tempo.',
        inimigos: [{ id: 'rei', nome: 'Rei de Mirvale', g: 'p', desc: 'o Rei de Mirvale, um esqueleto coroado', hp: 8, dano: 2, def: 1, tipo: 'morto', estado: 'alerta', exame: 'Difícil de ferir (−1). Não morre enquanto o coração bater.' },
          { id: 'guarda_real', nome: 'guarda real', g: 'm', desc: 'um guarda real esqueleto, de alabarda', hp: 2, dano: 1, def: 0, tipo: 'morto', estado: 'alerta' }],
        bonus: { p1: 1 },
        opcoes: [
          { id: 'jarro', rotulo: 'Partir o jarro do coração', kw: ['jarro', 'partir', 'coracao', 'quebrar'], requerItem: 'jarro', efeitos: [
            { t: 'Ergues o jarro e atira-lo ao chão. O barro rebenta e o coração seco desfaz-se em pó. O Rei de Mirvale grita, com todas as paredes, e cambaleia — de repente, mortal.' },
            { removeItem: 'jarro' }, { flag: 'coracao_partido' }, { bossMod: { hp: -4, def: -1 } }, { combate: true }] },
          { id: 'mao', rotulo: 'Erguer a Mão de Santa Ilva', kw: ['mao', 'santa', 'ilva', 'reliquia', 'erguer'], requerItem: 'mao_ilva', teste: 'magia', res: {
            sucesso: [{ t: 'Ergues a Mão de Santa Ilva. Um cheiro a rosas enche a sala. O rei recua, tapa os olhos de osso... e senta-se de novo no trono, para sempre imóvel. Os mortos do vale vão, finalmente, dormir.' }, { remove: 'boss' }, { completa: 'selado' }],
            parcial: [{ t: 'A Mão brilha, mas o rei resiste. Por fim cede e senta-se no trono — não sem antes te tocar com dedos gelados.' }, { dano: 2 }, { remove: 'boss' }, { completa: 'selado' }],
            falha: [{ t: 'A tua fé vacila e a luz da relíquia apaga-se. O rei ri-se e avança.' }, { combate: true }] } }
        ],
        vitoria: [{ t: 'O Rei de Mirvale cai, e a coroa rola pelo chão de ossos até aos teus pés.' }, { ouro: 15 }, { completa: 'destruido' }]
      },
      desfechos: {
        destruido: { titulo: 'O fim do rei', texto: 'Trazes a coroa de Mirvale para a luz do dia. O sino do templo toca a tarde inteira. O vale está em paz — por agora. Diz-se nas tabernas que, para lá das serras, nas Terras Altas, há torres que nunca deviam ter sido abertas...', ouro: 50, xp: 6, flags: ['mirvale_livre'] },
        selado: { titulo: 'O sono do rei', texto: 'O rei dorme no seu trono, selado pela santa. Os mortos do vale deixam de andar. O regedor e o padre pagam-te as 50 moedas e mandam gravar o teu nome na porta do templo. Mas os viajantes falam das Terras Altas, e de torres que nunca deviam ter sido abertas...', ouro: 50, xp: 7, flags: ['mirvale_livre', 'rei_selado'] }
      }
    }
  };

  D.regiao = {
    nome: 'Vale de Corvamonte',
    aldeia: 'Corvamonte',
    descricao: 'Uma aldeia de casas de xisto encostada à serra, com um sino rachado na torre da igreja e mais corvos do que gente.'
  };
})(window.CP.DATA);
