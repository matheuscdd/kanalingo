// Constantes do jogo. Unidades: metros, segundos, m/s.
// Módulo puro (sem dependência de BABYLON) para poder ser testado em Node.

export const TRACK = {
  length: 1120, // asfalto de z=0 até aqui (m), inclui área de escape após a chegada
  runUp: 60, // asfalto extra antes da largada (z negativo), onde a polícia começa
  width: 14, // largura da pista (m)
  wallHeight: 1.2, // altura das paredes laterais (m)
  startZ: 0, // posição Z de largada
  finishZ: 1000, // posição Z da linha de chegada (1 km de corrida)
  laneCount: 3, // apenas visual (faixas pintadas)
};

export const CAR = {
  length: 4.5,
  width: 2.0,
  height: 1.3,
  mass: 1200,
  maxSpeed: 60, // m/s (~216 km/h)
  maxReverseSpeed: 8, // m/s
  acceleration: 18, // m/s²
  brakeDecel: 35, // m/s²
  coastDecel: 6, // desaceleração por atrito sem input (m/s²)

  // Direção (modelo de bicicleta): o carro só vai para o lado apontando o nariz
  // e andando. Parado, as rodas esterçam mas ele não se desloca.
  wheelbase: 2.7, // entre-eixos (m): quanto o carro gira por metro percorrido
  steerMax: 0.45, // esterço máximo das rodas dianteiras em baixa velocidade (rad, ~26°)
  steerHighSpeedFactor: 0.35, // fração de steerMax disponível na velocidade máxima
  headingMaxLow: 0.35, // ângulo máximo do carro em relação à pista em baixa velocidade (rad, ~20°)
  headingMaxHigh: 0.15, // ângulo máximo na velocidade máxima (rad, ~8.6°): troca de faixa suave
  headingResponse: 8, // rapidez para chegar ao ângulo pedido (1/s)
  slideDecel: 12, // freio do deslize lateral causado por batidas (m/s²)

  // Pose visual do corpo e das rodas (não afeta a física)
  steerRate: 4, // resposta visual do esterço (rad/s)
  rollAngle: 0.035, // rolagem máxima do corpo para fora da curva (rad, ~2°)
  rollAccelRef: 10, // aceleração lateral (m/s²) que produz a rolagem máxima
  pitchPerAccel: 0.0009, // mergulho ao frear / agachamento ao acelerar, por m/s² (rad)
  pitchMax: 0.03, // limite do mergulho/agachamento (rad, ~1.7°)

  startPosition: { x: 0, y: 0.8, z: 2 },
  bodyColor: { r: 0.85, g: 0.08, b: 0.1 }, // cor da carroceria aplicada ao modelo
};

export const MODEL = {
  dir: "assets/models/",
  file: "car.glb",
  // O modelo "Sports Car" (Quaternius, CC0) já aponta para +Z após o import do glTF.
  // Se trocar o modelo e ele vier de costas, mude para true (ou teste com ?flip=1 na URL).
  flipFront: false,
  // Nome do material da carroceria que recebe CAR.bodyColor
  bodyMaterial: "White",
};

export const BOUNCE = {
  speedFactor: 0.45, // fração da velocidade de impacto que vira velocidade de recuo
  minSpeed: 4, // recuo mínimo (m/s) mesmo em batidas lentas
  lateralPush: 6, // empurrão lateral (m/s) na direção oposta ao obstáculo
  stunDuration: 0.5, // segundos em que o acelerador não responde
  minImpactSpeed: 1.5, // abaixo disso a colisão é ignorada (encosto leve)
};

export const OBSTACLES = {
  seed: 42,
  safeZone: 60, // sem obstáculos nos primeiros metros
  rowSpacingMin: 35,
  rowSpacingMax: 70,
  minGap: 4.5, // vão mínimo passável (m), maior que a largura do carro
  size: { w: 2.2, h: 1.6, d: 2.2 },
  restitution: 0.6,
  endMargin: 40, // sem obstáculos perto da chegada
};

export const POLICE = {
  startPosition: { x: 0, y: 0.8, z: -26 }, // atrás do jogador, na área antes da largada
  startDelay: 1.2, // s depois da largada até a viatura sair
  // Desempenho: sobrepõe CAR. maxSpeed é o teto físico, usado só para alcançar o jogador.
  car: { maxSpeed: 70, acceleration: 17 },
  cruiseSpeed: 62, // m/s: limite quando já está perto (um pouco acima do jogador, 60)
  catchUpGap: 45, // m: a partir desta distância libera até car.maxSpeed (rampa desde followGap)

  // Perseguição
  followGap: 10, // distância em Z (centro a centro) mantida atrás do jogador em velocidade
  tailGap: 6.5, // distância mínima atrás quando alinhados (evita bater na traseira)
  boxMargin: 1, // folga além de um carro ao esperar atrás para abrir para o lado (m)
  boxGap: 1, // ao encurralar: quase lado a lado, levemente atrás
  sideOffset: 3.3, // deslocamento lateral ao encurralar (m)
  sideClearance: 0.3, // folga lateral para considerar "ao lado" (m)
  boxEngageDistance: 45, // encurrala se o jogador estiver lento e mais perto que isto (m)
  boxExitMargin: 4, // histerese: sai do modo encurralar acima de bustSpeed + isto (m/s)
  gapGain: 0.6, // m/s de velocidade extra por metro além da distância desejada
  maxClosing: 40, // velocidade relativa máxima de aproximação (m/s)
  throttleGain: 0.5,
  steerGain: 3, // 1/s: velocidade lateral pedida por metro de erro (limitada pelo que o carro consegue)
  steerDeadband: 0.08, // m: parado, só vira as rodas se o erro for maior que isto
  lookaheadTime: 1.4, // s de antecipação para obstáculos
  lookaheadMin: 20, // m
  obstacleMargin: 0.5, // folga lateral ao desviar de obstáculos (m)
  avoidInset: 0.4, // mira este tanto para dentro do vão, não na borda (m)
  avoidStick: 1.2, // peso de "mexer pouco o volante" ao escolher o vão (evita trocar de lado em cima da hora)
  planDecel: 20, // m/s²: frenagem assumida ao planejar a velocidade para a próxima fileira
  reactionTime: 0.15, // s
  backupSpeed: 3, // m/s de ré quando está perto demais de um obstáculo para desviar andando
  crawlSpeed: 4, // m/s: velocidade mínima numa chicane apertada (nunca para de vez)

  // "Pego": medidor enche quando a polícia está perto e o jogador lento
  canBust: true, // false = a polícia só persegue, nunca encerra a corrida
  bustRadius: 8, // m, centro a centro
  bustSpeed: 14, // m/s (~50 km/h)
  bustTime: 1.5, // s perto e lento para ser pego
  bustRecoverTime: 3, // s para o medidor esvaziar

  sirenInterval: 0.22, // s entre alternâncias vermelho/azul
  model: { file: "police.glb", flipFront: false, bodyMaterial: null },
};

// Batida carro contra carro (jogador x polícia)
export const RAM = {
  restitution: 0.35, // fração da velocidade relativa devolvida na separação
  minClosingSpeed: 1.5, // abaixo disso só separa lateralmente (m/s)
  lateralPush: 4, // empurrão lateral para afastar os carros (m/s)
  stun: 0.35, // s sem acelerador para os dois carros
  cooldown: 0.4, // s entre batidas consecutivas (Havok reporta vários contatos)
};

export const CAMERA = {
  distance: 9, // atrás do carro (m)
  height: 3.5, // acima do carro (m)
  lookAhead: 6, // ponto de mira à frente do carro (m)
  lerp: 0.12, // suavização por frame
  fovMin: 0.9, // rad
  fovMax: 1.15, // rad em velocidade máxima
};

// Retrovisor (câmera traseira espelhada no topo da tela)
export const MIRROR = {
  viewport: { x: 0.35, y: 0.8, w: 0.3, h: 0.15 }, // fração da tela, y a partir de baixo
  height: 1.9, // altura da câmera acima do centro do carro (m)
  lookBehind: 40, // ponto de mira atrás do carro (m)
  fov: 0.42, // rad (vertical)
  minZ: 2.7, // recorta a traseira do próprio carro
  maxZ: 300,
};

export const PHYSICS = {
  gravity: -9.81,
};
