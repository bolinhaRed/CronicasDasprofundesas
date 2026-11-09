# Crónicas das Profundezas — Old School

RPG de papel, lápis e dado, para jogar sozinho ou em cooperativo (2–4 jogadores no mesmo telemóvel).
A aplicação é o **Mestre de Jogo**: gera a aventura, narra, diz exactamente o que desenhar e interpreta o teu dado.
Tu desenhas a masmorra e lanças o dado; se te perderes, o separador Mapa mostra um mapa desenhado do que já exploraste (pode ser escondido).

Precisas de: papel quadriculado, lápis e um dado de seis faces.

Novidades da versão 2.4: companheiros contratáveis, pontos de busca com tabela de achados, sobreviventes para resgatar, façanhas com XP, eventos de sombra profunda e cicatrizes permanentes.

Versão 2.3: bênçãos à escolha em cada masmorra, relíquias permanentes, 12 feitos com desbloqueios, ouro em risco, masmorra do dia e relatório no fim de cada expedição.

## Publicar no GitHub Pages

1. Cria um repositório e envia todos os ficheiros desta pasta (com `index.html` na raiz).
2. *Settings → Pages → Deploy from a branch → main / (root)*.
3. Abre o endereço no telemóvel e escolhe «Adicionar ao ecrã principal». Depois da primeira visita funciona sem internet.

Também funciona abrindo o `index.html` directamente (sem servidor): todos os scripts são clássicos e os dados estão em ficheiros `.js`. Nesse caso não há modo offline instalável (o service worker exige `http(s)`), mas a gravação funciona.

Quando alterares ficheiros, muda `VERSAO` em `sw.js` para os telemóveis receberem a actualização.

## Inspiração

Algumas ideias de design (luz como recurso, experiência pelos tesouros, talentos aleatórios, morte com contagem decrescente, percalços mágicos, carga limitada) foram inspiradas pelo espírito dos RPG «old school». Todo o texto, tabelas e conteúdos deste jogo são originais.

## Arquitectura

```
index.html                 casca da aplicação
css/estilo.css             interface (tema claro/escuro)
js/core/base.js            espaço de nomes, RNG com sementes, coordenadas, regras D6, gravação
js/core/masmorra.js        gerador procedural de masmorras + preparação da aventura
js/core/parser.js          intérprete de acções em português (sem IA)
js/core/motor.js           motor de regras e de narração (estado, testes, combate, cenas, aldeia)
js/data/regras.js          classes, armas, armaduras, objectos, tesouros
js/data/masmorras.js       3 tipos de masmorra: salas, criaturas, armadilhas, enigmas, personagens, eventos, rumores
js/data/missoes.js         7 missões escritas + região
js/ui/som.js               música de fundo e efeitos sonoros (sintetizados com Web Audio)
audio/musica.mp3           «The Longest Journey», de Alexander Nakarada
assets/                    retratos e ícones em pixel art (folhas de sprites) + LICENCAS.md
js/data/arte.js            correspondência entre heróis, criaturas, objectos e a arte
js/ui/mapa.js              mapa desenhado opcional (SVG), só com as zonas exploradas
js/ui/app.js               interface (só lê o estado e envia acções)
sw.js, manifest.webmanifest, icons/   PWA
tests/sim.js               testes de coerência e jogador-robô
```

* O motor (`js/core`) não toca no DOM. A interface chama `Game.input(texto)`, `Game.roll(n)` e lê `Game.S()` / `Game.sugestoes()`.
* Os conteúdos estão em `js/data`. Os efeitos dos objectos, opções e desfechos usam uma pequena linguagem de dados (`{t}`, `{dano}`, `{ouro}`, `{item}`, `{flag}`, `{combate}`, `{completa}`, …) documentada no topo de `masmorras.js`.
* Cada expedição tem uma semente; a mesma semente gera sempre a mesma masmorra. O RNG serve apenas para gerar conteúdo — nunca substitui o dado do jogador.
* A campanha grava-se em `localStorage` após cada acção, incluindo a meio de um pedido de lançamento, e pode ser exportada/importada em JSON.

## Testes

```
node tests/sim.js 40
```

Verifica ~1350 masmorras (sem sobreposições, salas só ligadas por portas, portas coerentes com as paredes, objectos dentro das salas, uma coisa por quadrado, chave sempre alcançável, pistas fora da sala final, armadilhas nunca nas pontas dos corredores) e joga centenas de aventuras completas com dados aleatórios, solo e em grupo.

## Acrescentar conteúdo

* **Nova missão**: copia uma entrada de `js/data/missoes.js`. Define 3 pistas (são espalhadas da sala mais superficial para a mais funda), a cena final (opções que exigem pistas, objectos ou ouro) e os desfechos (ouro, experiência, marcas no mundo, missões desbloqueadas).
* **Novo tipo de masmorra**: acrescenta uma chave a `js/data/masmorras.js` com as mesmas listas.
* **Rumores**: cada tipo de masmorra tem modelos de aventura curta que a taberna sorteia todos os dias.

## Créditos

* Interface: «Humble Gift», de Humble Pixel.
* Ícones: «MV Icons Complete Sheet».
* Retratos: «Free 39 Portraits Pixel Art» (CraftPix) e «RPG Character Portraits» (Gen XIA).
* Música: «The Longest Journey», de Alexander Nakarada.
* Algumas ideias de regras (ímpeto, oráculo, juramento) inspiram-se no Ironsworn, de Shawn Tomkin. Todo o texto do jogo é original.
* Licenças em `assets/LICENCAS.md`. Os recursos gráficos só podem ser usados como parte deste jogo.
