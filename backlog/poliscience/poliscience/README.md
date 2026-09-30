# Reta Final

Jogo de corrida 3D em linha reta feito com [Babylon.js](https://www.babylonjs.com/) (via CDN) e física [Havok](https://doc.babylonjs.com/features/featureDeepDive/physics/havokPlugin), em JavaScript puro com ES modules. Câmera de perseguição atrás do carro, velocímetro, obstáculos fixos na pista, efeito de rebote nas batidas e uma viatura de polícia que persegue o jogador.

## Como rodar

ES modules exigem um servidor HTTP (abrir o `index.html` direto do disco não funciona).

```bash
npm start
# abre http://localhost:3000
```

Ou use qualquer servidor estático (Live Server do VS Code, `python -m http.server`, etc.).

Requer conexão com a internet na primeira carga: Babylon.js, os loaders e o WASM do Havok vêm do CDN `cdn.babylonjs.com`.

## Controles

| Ação | Teclas |
|---|---|
| Acelerar | `W` ou `↑` |
| Frear / ré | `S` ou `↓` |
| Esterçar para a esquerda / direita | `A` `D` ou `←` `→` |
| Reiniciar | `R` |

A corrida começa no primeiro toque no acelerador ou direção. Cruze a linha de chegada (1 km) para ver o tempo e a quantidade de batidas.

## Direção

O carro só anda de lado porque está andando com o bico apontado para o lado, como um carro de verdade:

- Parado, a direção só gira as rodas da frente; o carro não sai do lugar.
- O bico gira na proporção da velocidade (limite de curvatura pelo entre-eixos), então em baixa velocidade o deslocamento lateral é pequeno.
- O ângulo máximo do bico diminui com a velocidade (≈20° devagar, ≈9° no máximo), para a reta continuar controlável a 250 km/h.
- De ré, esterçar para a direita leva a traseira para a direita (o bico aponta para a esquerda).
- Ao soltar a direção, o carro se alinha de volta e as rodas contra-esterçam; a carroceria só inclina enquanto está curvando.
- Rebotes e batidas carro-carro dão um escorregão lateral que se dissipa sozinho.

Ajustes em `CAR` em `js/config.js`: `wheelbase`, `headingMaxLow` / `headingMaxHigh` (ângulo máximo do bico, em rad), `headingResponse` (rapidez para atingir o ângulo), `slideDecel`, `steerMax`.

## Polícia

Uma viatura sai de trás da largada 1,2 s depois do jogador, com giroflex azul/vermelho. Ela aparece no retrovisor (espelhado, no topo da tela) e o painel no canto inferior esquerdo mostra a distância.

- Em perseguição, segue na sua faixa, desvia dos obstáculos e acelera mais quando está longe (até 252 km/h) para não ficar para trás. Perto de você, mantém o ritmo um pouco acima do seu.
- Ela obedece a mesma direção do jogador: só troca de faixa andando. Se um desvio não cabe na distância que sobra, ela reduz; se nem assim cabe, dá ré para abrir espaço.
- Se você ficar lento (menos de ~50 km/h, por exemplo depois de bater num obstáculo), ela encosta ao lado para encurralar. O medidor do painel enche e, em 1,5 s, você é pego: a corrida termina e `R` reinicia.
- Acelerar de volta esvazia o medidor. Batidas entre os dois carros trocam parte da velocidade e empurram cada um para um lado.

Os ajustes ficam em `POLICE` e `RAM` em `js/config.js`. Com `POLICE.canBust = false` a viatura só persegue, sem encerrar a corrida.

## Estrutura

```
index.html            página com canvas e HUD; carrega Babylon/Havok do CDN
css/style.css         HUD (velocímetro, cronômetro, mensagens, painel da polícia, retrovisor)
js/
  main.js             bootstrap: cena, física, pista, carros, câmeras, loop do jogo
  config.js           constantes (pista, carro, rebote, obstáculos, polícia, câmeras, modelo)
  physics.js          inicialização do HavokPlugin
  track.js            asfalto, paredes invisíveis, meios-fios, faixas, largada/chegada
  input.js            teclado (setas + WASD)
  carPhysics.js       modelo arcade do carro, rebote e batida carro-carro (puro, testável)
  car.js              corpo físico Havok + modelo arcade + colisões (jogador e viatura)
  carModel.js         carrega e normaliza os .glb (escala, orientação, rodas, materiais)
  police.js           viatura: IA ligada ao corpo físico, giroflex, batida com o jogador
  policeAI.js         IA da viatura: perseguir, desviar, encurralar, medidor de "pego" (puro)
  camera.js           chase cam (suavização, FOV, shake) e retrovisor espelhado
  hud.js              velocímetro, cronômetro, mensagens e painel da polícia em HTML
  obstacleLayout.js   gerador determinístico de obstáculos (puro, testável)
  obstacles.js        malhas e corpos estáticos dos obstáculos
  gameState.js        máquina de estados da corrida, incluindo "pego" (puro, testável)
assets/models/        car.glb e police.glb (Quaternius, CC0) e créditos
tests/                testes unitários (node --test)
tools/                servidor estático e testes headless via Chrome DevTools Protocol
```

## Testes

```bash
npm test          # unitários (Node, sem dependências)
npm run smoke     # abre o jogo em Chrome headless e confere que a cena sobe sem erros
npm run drive     # dirige o carro via teclas simuladas e valida física/HUD/câmera
npm run collide   # bate num obstáculo e valida o rebote
npm run race      # fluxo completo: largada, cronômetro, chegada, reinício
npm run police    # viatura: retrovisor, perseguição, encurralar/pego, batida, desvio de obstáculos
npm run model     # confere escala, orientação, rodas e pose do modelo do jogador
npm run verify    # unitários + smoke, drive, collide, race e police
```

Os testes headless precisam de Chrome ou Edge instalados no Windows (caminhos padrão) e rodam com SwiftShader, então ficam em ~15 fps; isso não afeta o jogo em um navegador normal.

## Parâmetros de URL (depuração)

- `?obstacles=0` remove os obstáculos
- `?seed=N` muda o layout dos obstáculos
- `?police=0` remove a viatura (e o retrovisor)
- `?flip=1` gira o modelo do carro 180° (caso troque o `.glb` por um que aponte para -Z)

## Créditos

Modelos "Sports Car" e "Police Car" por [Quaternius](https://quaternius.com/), licença CC0, via poly.pizza ([carro](https://poly.pizza/m/1mkmFkAz5v), [viatura](https://poly.pizza/m/BwwnUrWGmV)). Detalhes em `assets/models/CREDITS.md`.
