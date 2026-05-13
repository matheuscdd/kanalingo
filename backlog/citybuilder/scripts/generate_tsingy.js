// Generator for prefabs/exports/Tsingy.json
// Builds an aerial-view diorama of Tsingy de Bemaraha: dense field of irregular
// limestone spires formed by stacked blocks, with expanded mossy valleys,
// trees, and low foliage. Run: node scripts/generate_tsingy.js

import { writeFileSync } from "node:fs";

const W = 110, H = 54, D = 110;

// --- RNG (mulberry32) ---
function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const rng = mulberry32(1813);
const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
const rChoice = (arr) => arr[Math.floor(rng() * arr.length)];

// --- 2D occupancy grid ---
// 0 = free | 1 = spire | 2 = moss patch | 3 = tree canopy reserve | 4 = tree trunk
// 5 = bush | 6 = shard | 7 = low groundcover | 9 = border
const occ = new Uint8Array(W * D);
const mossSupport = new Uint8Array(W * D);
const gidx = (x, z) => z * W + x;

function isFree(x, z, w, d) {
    if (x < 1 || z < 1 || x + w > W - 1 || z + d > D - 1) return false;
    for (let dz = 0; dz < d; dz++)
        for (let dx = 0; dx < w; dx++)
            if (occ[gidx(x + dx, z + dz)] !== 0) return false;
    return true;
}
function markRect(x, z, w, d, v) {
    for (let dz = 0; dz < d; dz++)
        for (let dx = 0; dx < w; dx++)
            occ[gidx(x + dx, z + dz)] = v;
}

function markMossSupport(x, z, w, d) {
    for (let dz = 0; dz < d; dz++)
        for (let dx = 0; dx < w; dx++)
            mossSupport[gidx(x + dx, z + dz)] = 1;
}

function getVegetationBaseY(x, z, w, d) {
    if (x < 1 || z < 1 || x + w > W - 1 || z + d > D - 1) return null;
    let support = null;
    for (let dz = 0; dz < d; dz++)
        for (let dx = 0; dx < w; dx++) {
            const v = occ[gidx(x + dx, z + dz)];
            if (v !== 2 && v !== 3) return null;
            const baseY = mossSupport[gidx(x + dx, z + dz)] ? 2 : 1;
            if (support === null) support = baseY;
            else if (baseY !== support) return null;
        }
    return support;
}

const recipe = [];

// ========== Step 1: placa-base calcário (y=0, 110x110) ==========
recipe.push({ op: "filledRect", x0: 0, y: 0, z0: 0, width: W, depth: D, color: "#3a3a3a" });

// Mark 1-cell border as reserved so nothing crosses the edge.
for (let z = 0; z < D; z++) {
    for (let x = 0; x < W; x++) {
        if (x < 1 || x >= W - 1 || z < 1 || z >= D - 1) occ[gidx(x, z)] = 9;
    }
}

// ========== Step 2: moss patches (reserve cells for vegetation) ==========
const mossPalette = ["#2a3a22", "#34472a", "#2f4327", "#314123"];
const mossPatches = [];
const PATCH_COUNT = 56;
for (let i = 0; i < PATCH_COUNT; i++) {
    const w = rChoice([6, 6, 6, 8, 8, 8, 10, 10, 12]);
    const d = rChoice([6, 6, 8, 8, 8, 10, 10, 12]);
    let tries = 90;
    while (tries-- > 0) {
        const x = 2 + 2 * ri(0, Math.floor((W - 4 - w) / 2));
        const z = 2 + 2 * ri(0, Math.floor((D - 4 - d) / 2));
        if (!isFree(x, z, w, d)) continue;
        recipe.push({ op: "filledRect", x0: x, y: 1, z0: z, width: w, depth: d, color: rChoice(mossPalette) });
        markRect(x, z, w, d, 2);
        markMossSupport(x, z, w, d);
        mossPatches.push({ x, z, w, d });
        break;
    }
}

// ========== Step 3: trees inside larger moss patches ==========
const trunkColors = ["#4a3525", "#5c4029", "#523828"];
const canopyMid = ["#3a8a2f", "#3f8a30", "#358226"];
const canopyTop = ["#56a93a", "#62b842", "#6abb4a"];
const canopyHi = ["#7fc94e", "#85d152", "#76c248"];

const treesPlaced = [];
let largeTrees = 0;
let mediumTrees = 0;
mossPatches.sort((a, b) => (b.w * b.d) - (a.w * a.d));
const TREE_TARGET = 52;
const LARGE_TREE_TARGET = 18;

function canReserveTree(tx, tz, size) {
    const pad = size / 2 - 1;
    const rx = tx - pad;
    const rz = tz - pad;
    if (rx < 1 || rz < 1 || rx + size > W - 1 || rz + size > D - 1) return null;
    for (let dz = 0; dz < size; dz++)
        for (let dx = 0; dx < size; dx++) {
            const v = occ[gidx(rx + dx, rz + dz)];
            if (v !== 0 && v !== 2) return null;
        }
    return { rx, rz, size };
}

function markTreeArea(tx, tz, reserve) {
    markRect(reserve.rx, reserve.rz, reserve.size, reserve.size, 3);
    markRect(tx, tz, 2, 2, 4);
}

function plantLargeTree(tx, tz) {
    const reserve = canReserveTree(tx, tz, 8);
    if (!reserve) return false;
    const trunkH = ri(4, 7);
    recipe.push({ op: "solid", x0: tx, y0: 2, z0: tz, width: 2, height: trunkH, depth: 2, color: rChoice(trunkColors) });
    const cy = 2 + trunkH;
    recipe.push({ op: "solid", x0: tx - 2, y0: cy, z0: tz - 2, width: 6, height: 2, depth: 6, color: rChoice(canopyMid) });
    recipe.push({ op: "solid", x0: tx - 3, y0: cy + 2, z0: tz - 3, width: 8, height: 2, depth: 8, color: rChoice(canopyTop) });
    recipe.push({ op: "solid", x0: tx - 1, y0: cy + 4, z0: tz - 1, width: 4, height: 2, depth: 4, color: rChoice(canopyHi) });
    markTreeArea(tx, tz, reserve);
    treesPlaced.push({ tx, tz, size: "large" });
    largeTrees++;
    return true;
}

function plantMediumTree(tx, tz) {
    const reserve = canReserveTree(tx, tz, 6);
    if (!reserve) return false;
    const trunkH = ri(3, 5);
    recipe.push({ op: "solid", x0: tx, y0: 2, z0: tz, width: 2, height: trunkH, depth: 2, color: rChoice(trunkColors) });
    const cy = 2 + trunkH;
    recipe.push({ op: "solid", x0: tx - 1, y0: cy, z0: tz - 1, width: 4, height: 2, depth: 4, color: rChoice(canopyMid) });
    recipe.push({ op: "solid", x0: tx - 2, y0: cy + 2, z0: tz - 2, width: 6, height: 2, depth: 6, color: rChoice(canopyTop) });
    recipe.push({ op: "solid", x0: tx, y0: cy + 4, z0: tz, width: 2, height: 2, depth: 2, color: rChoice(canopyHi) });
    markTreeArea(tx, tz, reserve);
    treesPlaced.push({ tx, tz, size: "medium" });
    mediumTrees++;
    return true;
}

function buildTreeCandidates(p) {
    const cx = p.x + (p.w - 2) / 2;
    const cz = p.z + (p.d - 2) / 2;
    const candidates = [];
    for (let z = p.z; z <= p.z + p.d - 2; z += 2) {
        for (let x = p.x; x <= p.x + p.w - 2; x += 2) {
            candidates.push({
                tx: x,
                tz: z,
                rank: Math.abs(x - cx) + Math.abs(z - cz),
            });
        }
    }
    candidates.sort((a, b) => a.rank - b.rank || a.tx - b.tx || a.tz - b.tz);
    return candidates;
}

for (const p of mossPatches) {
    if (treesPlaced.length >= TREE_TARGET) break;
    const candidates = buildTreeCandidates(p);
    for (let i = 0; i < candidates.length && treesPlaced.length < TREE_TARGET; i++) {
        const { tx, tz } = candidates[i];
        const roomyPatch = p.w >= 6 && p.d >= 6;
        let planted = false;
        if (roomyPatch && i === 0 && largeTrees < LARGE_TREE_TARGET) planted = plantLargeTree(tx, tz);
        if (!planted) planted = plantMediumTree(tx, tz);
        if (!planted && roomyPatch && p.w >= 8 && p.d >= 8 && largeTrees < LARGE_TREE_TARGET) {
            planted = plantLargeTree(tx, tz);
        }
    }
}

// ========== Step 4: rock shards on the calcário (foreground rubble) ==========
const shardColors = ["#6a6a6a", "#787878", "#5e5e5e", "#727272"];
let shards = 0;
const SHARD_TARGET = 10;
let shardTries = 0;
while (shards < SHARD_TARGET && shardTries < 400) {
    shardTries++;
    const horizontal = rng() < 0.5;
    const w = horizontal ? rChoice([4, 6]) : 2;
    const d = horizontal ? 2 : rChoice([4, 6]);
    const x = 2 + 2 * ri(0, Math.floor((W - 4 - w) / 2));
    const z = 2 + 2 * ri(0, Math.floor((D - 4 - d) / 2));
    if (!isFree(x, z, w, d)) continue;
    recipe.push({ op: "solid", x0: x, y0: 1, z0: z, width: w, height: 2, depth: d, color: rChoice(shardColors) });
    markRect(x, z, w, d, 6);
    shards++;
}

// ========== Step 5: spires = IRREGULAR STACKS OF 2x2 BLOCKS (no ShapeMesh) ==========
// A "cluster spire" occupies a 4x4 footprint composed of 4 adjacent 2x2 sub-columns
// with different heights → jagged blocky silhouette like a limestone fang group.
// A "mini spire" is a single 2x2 pillar to fill gaps.
const spirePalette = ["#5e5e5e", "#6a6a6a", "#7a7a7a", "#8a8a8a", "#959595", "#a5a5a5", "#4f4f55", "#787c80", "#9aa0a4", "#6f6f72"];

function chooseSubH(mother) {
    return Math.max(3, Math.min(24, mother + ri(-6, 4)));
}

function plantClusterSpire(x, z) {
    if (!isFree(x, z, 4, 4)) return false;
    const r = rng();
    let mother;
    if (r < 0.55) mother = ri(5, 11);
    else if (r < 0.88) mother = ri(11, 17);
    else mother = ri(17, 22);
    const heights = [chooseSubH(mother), chooseSubH(mother), chooseSubH(mother), chooseSubH(mother)];
    const subs = [
        [x,     z    ],
        [x + 2, z    ],
        [x,     z + 2],
        [x + 2, z + 2],
    ];
    const baseColor = rChoice(spirePalette);
    for (let i = 0; i < 4; i++) {
        const [sx, sz] = subs[i];
        const c = rng() < 0.55 ? baseColor : rChoice(spirePalette);
        recipe.push({ op: "solid", x0: sx, y0: 1, z0: sz, width: 2, height: heights[i], depth: 2, color: c });
    }
    markRect(x, z, 4, 4, 1);
    // 50% chance: extra 2x2 cap on the tallest sub-column for extra jaggedness
    if (rng() < 0.5) {
        let maxIdx = 0;
        for (let i = 1; i < 4; i++) if (heights[i] > heights[maxIdx]) maxIdx = i;
        const [sx, sz] = subs[maxIdx];
        const capH = ri(2, 5);
        recipe.push({ op: "solid", x0: sx, y0: 1 + heights[maxIdx], z0: sz, width: 2, height: capH, depth: 2, color: rChoice(spirePalette) });
    }
    return true;
}

function plantMiniSpire(x, z) {
    if (!isFree(x, z, 2, 2)) return false;
    const h = ri(4, 14);
    recipe.push({ op: "solid", x0: x, y0: 1, z0: z, width: 2, height: h, depth: 2, color: rChoice(spirePalette) });
    markRect(x, z, 2, 2, 1);
    return true;
}

const SPIRE_TARGET = 130;
let clusterSpires = 0;
let spireTries = 0;
const MAX_TRIES = 9000;
const CLUSTER_OFFSETS = [[4, 0], [-4, 0], [0, 4], [0, -4], [4, 4], [-4, 4], [4, -4], [-4, -4]];

while (clusterSpires < SPIRE_TARGET && spireTries < MAX_TRIES) {
    spireTries++;
    const x = 2 + 2 * Math.floor(rng() * Math.floor((W - 6) / 2));
    const z = 2 + 2 * Math.floor(rng() * Math.floor((D - 6) / 2));
    if (!plantClusterSpire(x, z)) continue;
    clusterSpires++;
    if (rng() < 0.7) {
        const neighbors = ri(1, 3);
        const offs = CLUSTER_OFFSETS.slice();
        for (let i = offs.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [offs[i], offs[j]] = [offs[j], offs[i]];
        }
        let placed = 0;
        for (const [dx, dz] of offs) {
            if (placed >= neighbors) break;
            if (plantClusterSpire(x + dx, z + dz)) { clusterSpires++; placed++; }
        }
    }
}

// Fill remaining gaps with mini 2x2 spires for density.
const MINI_TARGET = 90;
let minis = 0;
let miniTries = 0;
while (minis < MINI_TARGET && miniTries < 4000) {
    miniTries++;
    const x = 2 + 2 * Math.floor(rng() * Math.floor((W - 4) / 2));
    const z = 2 + 2 * Math.floor(rng() * Math.floor((D - 4) / 2));
    if (plantMiniSpire(x, z)) minis++;
}

// ========== Step 6: bushes / mato em moss e sob copas ==========
const bushColors = ["#3a7a2a", "#458a32", "#3f7c2b", "#4d8f35"];
let bushes = 0;
const BUSH_TARGET = 120;
let bushTries = 0;
while (bushes < BUSH_TARGET && bushTries < 5200) {
    bushTries++;
    const x = 2 + 2 * Math.floor(rng() * Math.floor((W - 4) / 2));
    const z = 2 + 2 * Math.floor(rng() * Math.floor((D - 4) / 2));
    const baseY = getVegetationBaseY(x, z, 2, 2);
    if (baseY == null) continue;
    recipe.push({ op: "solid", x0: x, y0: baseY, z0: z, width: 2, height: rng() < 0.35 ? 1 : 2, depth: 2, color: rChoice(bushColors) });
    markRect(x, z, 2, 2, 5);
    bushes++;
}

// ========== Step 7: low foliage / groundcover ==========
const groundcoverColors = ["#5b9f3f", "#6ab34a", "#73c652", "#4f8f39"];
let groundcover = 0;
const GROUNDCOVER_TARGET = 112;
let groundcoverTries = 0;
while (groundcover < GROUNDCOVER_TARGET && groundcoverTries < 5600) {
    groundcoverTries++;
    const x = 2 + 2 * Math.floor(rng() * Math.floor((W - 4) / 2));
    const z = 2 + 2 * Math.floor(rng() * Math.floor((D - 4) / 2));
    const baseY = getVegetationBaseY(x, z, 2, 2);
    if (baseY == null) continue;
    recipe.push({ op: "solid", x0: x, y0: baseY, z0: z, width: 2, height: 1, depth: 2, color: rChoice(groundcoverColors) });
    markRect(x, z, 2, 2, 7);
    groundcover++;
}

// ========== Output ==========
const prefab = {
    version: 1,
    kind: "prefab",
    name: "Tsingy",
    dx: W,
    dy: H,
    dz: D,
    recipe,
};

writeFileSync("prefabs/exports/Tsingy.json", JSON.stringify(prefab, null, 2));
console.log(JSON.stringify({
    clusterSpires,
    minis,
    trees: treesPlaced.length,
    largeTrees,
    mediumTrees,
    shards,
    bushes,
    groundcover,
    ops: recipe.length,
}));
