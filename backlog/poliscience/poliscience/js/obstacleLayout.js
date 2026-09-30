// Gerador determinístico de posições de obstáculos (módulo puro, testável em Node).
// Regras:
//  - nada nos primeiros `safeZone` metros nem nos últimos `endMargin` antes da chegada
//  - fileiras espaçadas entre rowSpacingMin e rowSpacingMax
//  - toda fileira deixa pelo menos um vão livre >= minGap para o carro passar

import { OBSTACLES, TRACK } from "./config.js";

/** PRNG simples e determinístico (mulberry32). */
export function createRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @typedef {Object} ObstacleSpec
 * @property {number} x centro lateral
 * @property {number} z posição na pista
 * @property {number} w largura (X)
 * @property {number} h altura (Y)
 * @property {number} d profundidade (Z)
 * @property {"box"|"cone"|"barrier"} kind tipo visual
 */

/**
 * Gera a lista de obstáculos.
 * @param {{ seed?: number, cfg?: typeof OBSTACLES, track?: typeof TRACK }} [opts]
 * @returns {ObstacleSpec[]}
 */
export function generateObstacles(opts = {}) {
  const cfg = opts.cfg ?? OBSTACLES;
  const track = opts.track ?? TRACK;
  const rng = createRng(opts.seed ?? cfg.seed);

  const halfW = track.width / 2;
  const list = [];

  let z = track.startZ + cfg.safeZone;
  const lastZ = track.finishZ - cfg.endMargin;

  while (z < lastZ) {
    // Dificuldade cresce ao longo da pista: 1 a 3 obstáculos por fileira
    const progress = (z - cfg.safeZone) / (lastZ - cfg.safeZone);
    const maxCount = progress < 0.3 ? 1 : progress < 0.65 ? 2 : 3;
    const count = 1 + Math.floor(rng() * maxCount);

    list.push(...generateRow(rng, z, count, halfW, cfg));

    z += cfg.rowSpacingMin + rng() * (cfg.rowSpacingMax - cfg.rowSpacingMin);
  }

  return list;
}

/**
 * Gera uma fileira com `count` obstáculos garantindo um vão >= minGap.
 * Estratégia: divide a largura em slots, sorteia quais ficam livres.
 */
function generateRow(rng, z, count, halfW, cfg) {
  const size = cfg.size;
  const width = halfW * 2;

  // Número de slots de modo que cada slot caiba um obstáculo com folga
  const slotW = Math.max(size.w + 0.6, cfg.minGap);
  const slots = Math.max(2, Math.floor(width / slotW));
  const realSlotW = width / slots;

  // Garante que fica ao menos 1 slot livre (na prática, minGap = 1 slot livre)
  count = Math.min(count, slots - 1);

  // Escolhe `count` slots distintos para ocupar
  const indices = [...Array(slots).keys()];
  shuffle(indices, rng);
  const occupied = indices.slice(0, count).sort((a, b) => a - b);

  const row = [];
  for (const i of occupied) {
    const kindRoll = rng();
    const kind = kindRoll < 0.5 ? "box" : kindRoll < 0.8 ? "cone" : "barrier";
    const center = -halfW + realSlotW * (i + 0.5);
    // Pequena variação lateral dentro do slot mantendo o vão
    const jitterRange = Math.max(0, (realSlotW - size.w) / 2 - 0.2);
    const x = center + (rng() * 2 - 1) * jitterRange;
    const zJitter = (rng() * 2 - 1) * 3;

    row.push({
      x: round(x),
      z: round(z + zJitter),
      w: size.w,
      h: kind === "cone" ? size.h * 0.8 : kind === "barrier" ? size.h * 0.7 : size.h,
      d: kind === "barrier" ? size.d * 0.5 : size.d,
      kind,
    });
  }
  return row;
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function round(v) {
  return Math.round(v * 100) / 100;
}

/**
 * Agrupa obstáculos em fileiras (por proximidade em Z) e devolve, para cada fileira,
 * o maior vão livre lateral. Útil para testes.
 * @param {ObstacleSpec[]} list
 * @param {number} halfW
 * @param {number} [rowTolerance] distância em Z para considerar mesma fileira
 */
export function largestGapPerRow(list, halfW, rowTolerance = 8) {
  const sorted = [...list].sort((a, b) => a.z - b.z);
  const rows = [];
  for (const o of sorted) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(o.z - last[0].z) <= rowTolerance) last.push(o);
    else rows.push([o]);
  }
  return rows.map((row) => {
    const edges = row
      .map((o) => [o.x - o.w / 2, o.x + o.w / 2])
      .sort((a, b) => a[0] - b[0]);
    let cursor = -halfW;
    let best = 0;
    for (const [l, r] of edges) {
      best = Math.max(best, l - cursor);
      cursor = Math.max(cursor, r);
    }
    best = Math.max(best, halfW - cursor);
    return { z: row[0].z, count: row.length, gap: best };
  });
}
