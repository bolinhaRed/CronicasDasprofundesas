/* Legado: bênçãos (por expedição), relíquias (permanentes), feitos com desbloqueios e masmorra do dia.
   Todo o texto é original. */
(function (D) {
  'use strict';

  /* efeitos passivos — usados como bênçãos (só nesta expedição) e como relíquias (para sempre) */
  D.passivos = {
    lamina: { nome: 'Lâmina sedenta', icone: 'espada', raridade: 'raro', desc: '+1 de dano em todos os ataques.' },
    pele: { nome: 'Pele de pedra', icone: 'escudo', raridade: 'comum', desc: 'O primeiro golpe que sofres em cada combate faz −1 de dano.' },
    manto: { nome: 'Manto de cinza', icone: 'vela', raridade: 'comum', desc: '+2 em furtividade.' },
    chama: { nome: 'Chama teimosa', icone: 'tocha', raridade: 'comum', desc: 'Cada tocha dura mais 3 marcas.' },
    sanguessuga: { nome: 'Sede de ferro', icone: 'vida', raridade: 'raro', desc: 'Cada inimigo que vences devolve-te 1 de Vida.' },
    ganancia: { nome: 'Olhos de corvo', icone: 'ouro', raridade: 'raro', desc: 'Encontras 50% mais ouro, mas cada achado faz +1 de Tensão.' },
    mao_firme: { nome: 'Mão de relojoeiro', icone: 'gazuas', raridade: 'comum', desc: '+1 em armadilhas, fechaduras e desarmar.' },
    fe: { nome: 'Fé teimosa', icone: 'estrela', raridade: 'lendario', desc: 'Uma vez por expedição, quando cairias a 0 de Vida, ficas com 1.' },
    sabio: { nome: 'Língua dos mortos', icone: 'pergaminho', raridade: 'comum', desc: '+1 a decifrar e em magia.' },
    furia: { nome: 'Fúria fria', icone: 'machado', raridade: 'raro', desc: 'O golpe arriscado deixa de te custar Vida extra.' },
    contra: { nome: 'Contra-golpe', icone: 'escudo', raridade: 'raro', desc: 'Defender com sucesso faz 2 de dano em vez de 1.' },
    reflexos: { nome: 'Reflexos de gato', icone: 'olho', raridade: 'comum', desc: '+1 em esquivar, defesa e fuga.' },
    faro: { nome: 'Faro de rato', icone: 'teia', raridade: 'comum', desc: 'Ao entrares num corredor, vês as armadilhas que lá estão.' },
    eco: { nome: 'Coração em eco', icone: 'vida', raridade: 'raro', desc: 'Cada sucesso dá +2 de ímpeto em vez de +1.' },
    // desbloqueáveis
    cartografo: { nome: 'Lápis do cartógrafo', icone: 'mapa', raridade: 'raro', desc: 'Ao entrares numa sala, vês as portas secretas que lá estão.', bloqueado: true },
    olhos_gato: { nome: 'Olhos da noite', icone: 'olho', raridade: 'raro', desc: 'Às escuras só tens −1 e podes procurar.', bloqueado: true },
    lendario_ouro: { nome: 'Mão de Midas', icone: 'gema', raridade: 'lendario', desc: 'Cada inimigo vencido deixa 2 moedas.', bloqueado: true }
  };

  /* feitos: contadores da campanha que desbloqueiam coisas novas */
  D.feitos = [
    { id: 'primeira', nome: 'Primeiro sangue', desc: 'Cumpre a primeira missão.', stat: 'missoes', alvo: 1, premio: { tipo: 'ouro', n: 10 }, premioTxt: '+10 moedas' },
    { id: 'secretas', nome: 'Paredes ocas', desc: 'Encontra 3 portas secretas.', stat: 'secretas', alvo: 3, premio: { tipo: 'passivo', id: 'cartografo' }, premioTxt: 'Nova bênção: Lápis do cartógrafo' },
    { id: 'mortos', nome: 'Coveiro', desc: 'Vence 12 mortos-vivos.', stat: 'mortos', alvo: 12, premio: { tipo: 'item', id: 'maca_prata' }, premioTxt: 'Maça de prata na forja' },
    { id: 'feras', nome: 'Caçador', desc: 'Vence 10 feras.', stat: 'feras', alvo: 10, premio: { tipo: 'item', id: 'arco_longo' }, premioTxt: 'Arco longo na forja' },
    { id: 'pistas', nome: 'Detective das trevas', desc: 'Descobre 12 pistas.', stat: 'pistas', alvo: 12, premio: { tipo: 'bencao4' }, premioTxt: 'Escolhes entre 4 bênçãos em vez de 3' },
    { id: 'escuro', nome: 'Filho da noite', desc: 'Entra em 5 salas às escuras.', stat: 'escuro', alvo: 5, premio: { tipo: 'passivo', id: 'olhos_gato' }, premioTxt: 'Nova bênção: Olhos da noite' },
    { id: 'ouro', nome: 'Bolsos fundos', desc: 'Traz 150 moedas das masmorras.', stat: 'ouro', alvo: 150, premio: { tipo: 'origem', id: 'meio_orc' }, premioTxt: 'Nova origem: Meio-orc' },
    { id: 'missoes', nome: 'Herói do vale', desc: 'Cumpre 5 missões.', stat: 'missoes', alvo: 5, premio: { tipo: 'slot' }, premioTxt: '4.º espaço de relíquia' },
    { id: 'finais', nome: 'Cronista', desc: 'Vê 6 desfechos diferentes.', stat: 'finais', alvo: 6, premio: { tipo: 'passivo', id: 'lendario_ouro' }, premioTxt: 'Nova bênção lendária: Mão de Midas' },
    { id: 'intocavel', nome: 'Intocável', desc: 'Cumpre uma missão sem sofrer dano.', stat: 'intocavel', alvo: 1, premio: { tipo: 'reliquia' }, premioTxt: 'Escolhe uma relíquia extra' },
    { id: 'diario', nome: 'Madrugador', desc: 'Joga 3 masmorras do dia.', stat: 'diarios', alvo: 3, premio: { tipo: 'ouro', n: 25 }, premioTxt: '+25 moedas' },
    { id: 'tesouros', nome: 'Caçador de tesouros', desc: 'Abre 8 tesouros grandes.', stat: 'tesouros', alvo: 8, premio: { tipo: 'reliquia' }, premioTxt: 'Escolhe uma relíquia extra' }
  ];

  D.origemExtra = { meio_orc: { nome: 'Meio-orc', desc: 'Sangue forte: +1 de Vida e +1 de dano com armas de Força.' } };
  D.armasExtra = {
    maca_prata: { nome: 'Maça de prata', attr: 'FOR', dano: 2, vsMorto: 2, preco: 22, nota: '+2 contra mortos-vivos' },
    arco_longo: { nome: 'Arco longo', attr: 'AGI', dano: 2, distancia: true, preco: 24, nota: 'primeiro disparo sem resposta (Explorador)' }
  };
  Object.assign(D.armas, D.armasExtra);
  D.ferreiro.push('maca_prata', 'arco_longo');
  D.origens.meio_orc = Object.assign({ bloqueado: true }, D.origemExtra.meio_orc);
})(window.CP.DATA);
