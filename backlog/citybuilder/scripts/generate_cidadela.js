// Generator for prefabs/exports/CidadelaTorresConicas.json
// Builds an irregular adobe citadel with many thin towers crowned by white pyramids.
// Run: node scripts/generate_cidadela.js

import { writeFileSync } from "node:fs";

const W = 120, H = 90, D = 120;
const occ = new Uint8Array(W * H * D);
const idx = (x, y, z) => (y * D + z) * W + x;
const inBounds = (x, y, z) => x >= 0 && x < W && y >= 0 && y < H && z >= 0 && z < D;

const steps = [];

function canPlace(x0, y0, z0, w, h, d) {
    for (let dy = 0; dy < h; dy++)
        for (let dz = 0; dz < d; dz++)
            for (let dx = 0; dx < w; dx++) {
                if (!inBounds(x0 + dx, y0 + dy, z0 + dz)) return false;
                if (occ[idx(x0 + dx, y0 + dy, z0 + dz)]) return false;
            }
    return true;
}
function mark(x0, y0, z0, w, h, d) {
    for (let dy = 0; dy < h; dy++)
        for (let dz = 0; dz < d; dz++)
            for (let dx = 0; dx < w; dx++) {
                occ[idx(x0 + dx, y0 + dy, z0 + dz)] = 1;
            }
}

function solid(x0, y0, z0, w, h, d, color, label = "") {
    if (w < 2 || d < 2 || h < 1) throw new Error(`bad dims ${label} ${w}x${h}x${d}`);
    if (!canPlace(x0, y0, z0, w, h, d)) {
        throw new Error(`OVERLAP solid ${label} at ${x0},${y0},${z0} size ${w}x${h}x${d}`);
    }
    mark(x0, y0, z0, w, h, d);
    steps.push({ op: "solid", x0, y0, z0, width: w, height: h, depth: d, color });
}

function shape(x0, y0, z0, name, sw, sh, sd, color, label = "") {
    if (!canPlace(x0, y0, z0, sw, sh, sd)) {
        throw new Error(`OVERLAP shape ${label} at ${x0},${y0},${z0}`);
    }
    mark(x0, y0, z0, sw, sh, sd);
    steps.push({
        op: "block",
        type: `ShapeMesh:${name}:${sw}:${sh}:${sd}`,
        color,
        lx: x0,
        ly: y0,
        lz: z0,
        rot: 0,
    });
}

// Colors
const C_BASE = "#0a0a0a";
const C_L1 = "#6e4828";
const C_L2 = "#7a4f30";
const C_L3 = "#8c5530";
const C_L4 = "#a26a3d";
const C_L5 = "#b2784a";
const C_TOWER_A = "#9a6038";
const C_TOWER_B = "#b07a4a";
const C_WHITE = "#efe9dc";
const C_AMEIA = "#b07a4a";
const C_TUFO = "#3d6b3a";
const C_MANCHA = "#c08b5a";
const C_WALL = "#7a4f30";

// 1) Placa-base preta 120x120 (1 layer at y=0)
solid(0, 0, 0, 120, 1, 120, C_BASE, "placa");

// Helpers for hollow level: 4 walls forming a rectangle perimeter, 2-thick.
function ringWalls(x0, z0, w, d, y, h, color, label) {
    // x0,z0 = outer corner; w,d = outer footprint (must be >=6 to fit hollow + 2-thick wall)
    // y..y+h-1 = wall vertical range
    // N strip: full width, z=[z0..z0+1]
    solid(x0, y, z0, w, h, 2, color, `${label}-N`);
    // S strip: full width, z=[z0+d-2..z0+d-1]
    solid(x0, y, z0 + d - 2, w, h, 2, color, `${label}-S`);
    // W strip: between the N/S strips
    solid(x0, y, z0 + 2, 2, h, d - 4, color, `${label}-W`);
    // E strip
    solid(x0 + w - 2, y, z0 + 2, 2, h, d - 4, color, `${label}-E`);
}

// Cap ring at given y: covers area between outer footprint and the inner footprint of the
// next level, but EXTENDS 2 cells inward on each side so the next level's walls (2-thick)
// sit on top of cap cells (face-connectedness).
function capRing(ox, oz, ow, od, ix, iz, iw, id, y, color, label) {
    // Effective inner hole = (ix+2..ix+iw-3) × (iz+2..iz+id-3)
    const nDepth = iz + 2 - oz;
    const sDepth = oz + od - (iz + id - 2);
    if (nDepth >= 1) solid(ox, y, oz, ow, 1, nDepth, color, `${label}-Ncap`);
    if (sDepth >= 1) solid(ox, y, iz + id - 2, ow, 1, sDepth, color, `${label}-Scap`);
    const innerZStart = iz + 2;
    const innerZDepth = id - 4;
    const wWidth = ix + 2 - ox;
    const eWidth = ox + ow - (ix + iw - 2);
    if (wWidth >= 1 && innerZDepth >= 1) solid(ox, y, innerZStart, wWidth, 1, innerZDepth, color, `${label}-Wcap`);
    if (eWidth >= 1 && innerZDepth >= 1) solid(ix + iw - 2, y, innerZStart, eWidth, 1, innerZDepth, color, `${label}-Ecap`);
}

// Level 1: outer 80x80 at x=20..99, z=20..99, walls y=1..2, ring-cap y=3 around L2 (60x60 at x=30..89, z=30..89)
const L1 = { ox: 20, oz: 20, ow: 80, od: 80 };
const L2 = { ox: 30, oz: 30, ow: 60, od: 60 };
const L3 = { ox: 42, oz: 42, ow: 36, od: 36 };
const L4 = { ox: 50, oz: 50, ow: 22, od: 22 };
const L5 = { ox: 56, oz: 56, ow: 10, od: 10 };

ringWalls(L1.ox, L1.oz, L1.ow, L1.od, 1, 2, C_L1, "L1");
capRing(L1.ox, L1.oz, L1.ow, L1.od, L2.ox, L2.oz, L2.ow, L2.od, 3, C_L1, "L1");

// L1 lobes — asymmetric bumps protruding outside the L1 ring
// N lobe (touches L1's north wall at z=20)
solid(44, 1, 14, 24, 3, 6, C_L1, "lobe-N");
// E lobe (touches L1's east wall at x=99)
solid(100, 1, 40, 8, 3, 28, C_L1, "lobe-E");
// S lobe (touches L1's south wall at z=99) - asymmetric
solid(36, 1, 100, 26, 3, 10, C_L1, "lobe-S");
// W lobe - smaller
solid(12, 1, 46, 8, 3, 22, C_L1, "lobe-W");
// Extra small NW bump
solid(24, 1, 14, 8, 3, 6, C_L1, "lobe-NW");
// Extra small SE bump (outside L1 east wall x=98..99)
solid(100, 1, 76, 8, 3, 8, C_L1, "lobe-SE");

// Level 2
ringWalls(L2.ox, L2.oz, L2.ow, L2.od, 4, 3, C_L2, "L2");
capRing(L2.ox, L2.oz, L2.ow, L2.od, L3.ox, L3.oz, L3.ow, L3.od, 7, C_L2, "L2");

// (L2 lobes omitted — would clash with L1 cap-ring towers.)

// Level 3
ringWalls(L3.ox, L3.oz, L3.ow, L3.od, 8, 4, C_L3, "L3");
capRing(L3.ox, L3.oz, L3.ow, L3.od, L4.ox, L4.oz, L4.ow, L4.od, 12, C_L3, "L3");

// (L3 lobes omitted — would clash with L2 cap-ring towers.)

// Level 4
ringWalls(L4.ox, L4.oz, L4.ow, L4.od, 13, 7, C_L4, "L4");
capRing(L4.ox, L4.oz, L4.ow, L4.od, L5.ox, L5.oz, L5.ow, L5.od, 20, C_L4, "L4");

// (L4 lobe omitted — keep cap ring clean for L4 towers.)

// Level 5 - top mass
ringWalls(L5.ox, L5.oz, L5.ow, L5.od, 21, 8, C_L5, "L5");
// Solid top cap at y=29 covers entire L5 footprint (10x10)
solid(L5.ox, 29, L5.oz, L5.ow, 1, L5.od, C_L5, "L5-cap");

// ----- TORRES (thin towers + cones) -----
// Each tower: 2x2 vertical pillar with square_pyramid:2:Hc:2 cone on top.
// Place on each level's cap ring, starting at y = (capY + 1).

function placeTower(x0, z0, supportTopY, h, hCone, colorBody, label) {
    const y0 = supportTopY + 1;
    solid(x0, y0, z0, 2, h, 2, colorBody, `${label}-body`);
    shape(x0, y0 + h, z0, "square_pyramid", 2, hCone, 2, C_WHITE, `${label}-cone`);
}

// L1 cap ring (y=3) → towers start at y=4. Cap ring footprint: x in [20..29] or [90..99], z in [30..89]; and z in [20..29] or [90..99], x in [20..99].
// Tower 2x2 must fit fully on the ring, i.e. not enter L2's interior (x in [30..89] && z in [30..89]).
// Also must avoid lobes (they extend out, but lobes have free tops at y=4+).
// Use ring-only positions to avoid colliding with the L2 walls (y=4..6).

// North strip of L1 (z=20..29). Place towers at z=22, varying x. Cluster them in groups.
const l1NTowers = [
    { x: 22, h: 12, hCone: 3 },
    { x: 26, h: 10, hCone: 3 },
    { x: 30, h: 14, hCone: 4 }, // x=30..31 still in N strip (z=22..23 is ring)
    { x: 50, h: 11, hCone: 3 },
    { x: 64, h: 13, hCone: 4 },
    { x: 80, h: 10, hCone: 3 },
    { x: 88, h: 12, hCone: 3 },
    { x: 92, h: 14, hCone: 4 },
    { x: 96, h: 11, hCone: 3 },
];
for (const t of l1NTowers) placeTower(t.x, 22, 3, t.h, t.hCone, t.x % 4 === 0 ? C_TOWER_A : C_TOWER_B, `l1N-${t.x}`);

// South strip of L1 (z=90..99). z=94 for towers.
const l1STowers = [
    { x: 22, h: 11, hCone: 3 },
    { x: 26, h: 14, hCone: 4 },
    { x: 40, h: 10, hCone: 3 },
    { x: 56, h: 13, hCone: 3 },
    { x: 72, h: 12, hCone: 4 },
    { x: 88, h: 11, hCone: 3 },
    { x: 92, h: 13, hCone: 3 },
    { x: 96, h: 10, hCone: 3 },
];
for (const t of l1STowers) placeTower(t.x, 94, 3, t.h, t.hCone, t.x % 4 === 0 ? C_TOWER_A : C_TOWER_B, `l1S-${t.x}`);

// West strip of L1 (x=20..29, z=30..89). Place at x=22, varying z.
const l1WTowers = [
    { z: 34, h: 12, hCone: 3 },
    { z: 38, h: 10, hCone: 3 },
    { z: 54, h: 13, hCone: 4 },
    { z: 68, h: 11, hCone: 3 },
    { z: 82, h: 14, hCone: 4 },
    { z: 86, h: 10, hCone: 3 },
];
for (const t of l1WTowers) placeTower(22, t.z, 3, t.h, t.hCone, t.z % 4 === 0 ? C_TOWER_A : C_TOWER_B, `l1W-${t.z}`);

// East strip of L1 (x=90..99, z=30..89). Place at x=94.
const l1ETowers = [
    { z: 34, h: 11, hCone: 3 },
    { z: 50, h: 14, hCone: 4 },
    { z: 54, h: 10, hCone: 3 },
    { z: 70, h: 13, hCone: 3 },
    { z: 84, h: 12, hCone: 4 },
];
for (const t of l1ETowers) placeTower(94, t.z, 3, t.h, t.hCone, t.z % 4 === 0 ? C_TOWER_A : C_TOWER_B, `l1E-${t.z}`);

// L2 cap ring (y=7) → towers start at y=8. Ring is between L2 (x=30..89, z=30..89) and L3 (x=42..77, z=42..77).
// Strips: N=z[30..41], S=z[78..89], W=x[30..41] z[42..77], E=x[78..89] z[42..77].
const l2NTowers = [
    { x: 32, h: 11, hCone: 3 },
    { x: 38, h: 14, hCone: 4 },
    { x: 54, h: 12, hCone: 3 },
    { x: 70, h: 13, hCone: 4 },
    { x: 80, h: 11, hCone: 3 },
    { x: 86, h: 14, hCone: 3 },
];
for (const t of l2NTowers) placeTower(t.x, 34, 7, t.h, t.hCone, t.x % 4 === 0 ? C_TOWER_A : C_TOWER_B, `l2N-${t.x}`);

const l2STowers = [
    { x: 32, h: 12, hCone: 4 },
    { x: 44, h: 11, hCone: 3 },
    { x: 60, h: 13, hCone: 4 },
    { x: 78, h: 12, hCone: 3 },
    { x: 86, h: 14, hCone: 3 },
];
for (const t of l2STowers) placeTower(t.x, 84, 7, t.h, t.hCone, t.x % 4 === 0 ? C_TOWER_A : C_TOWER_B, `l2S-${t.x}`);

const l2WTowers = [
    { z: 44, h: 10, hCone: 3 },
    { z: 58, h: 13, hCone: 4 },
    { z: 72, h: 11, hCone: 3 },
];
for (const t of l2WTowers) placeTower(32, t.z, 7, t.h, t.hCone, t.z % 4 === 0 ? C_TOWER_A : C_TOWER_B, `l2W-${t.z}`);

const l2ETowers = [
    { z: 44, h: 12, hCone: 4 },
    { z: 60, h: 14, hCone: 3 },
    { z: 72, h: 11, hCone: 3 },
];
for (const t of l2ETowers) placeTower(84, t.z, 7, t.h, t.hCone, t.z % 4 === 0 ? C_TOWER_A : C_TOWER_B, `l2E-${t.z}`);

// L3 cap ring (y=12) → towers at y=13. Ring between L3 (42..77) and L4 (50..71).
// Strips: N z=42..49, S z=72..77, W x=42..49 z=50..71, E x=72..77 z=50..71.
const l3NTowers = [
    { x: 44, h: 10, hCone: 3 },
    { x: 58, h: 13, hCone: 4 },
    { x: 72, h: 11, hCone: 3 },
];
for (const t of l3NTowers) placeTower(t.x, 44, 12, t.h, t.hCone, t.x % 4 === 0 ? C_TOWER_A : C_TOWER_B, `l3N-${t.x}`);

const l3STowers = [
    { x: 44, h: 12, hCone: 4 },
    { x: 64, h: 10, hCone: 3 },
    { x: 72, h: 14, hCone: 3 },
];
for (const t of l3STowers) placeTower(t.x, 74, 12, t.h, t.hCone, t.x % 4 === 0 ? C_TOWER_A : C_TOWER_B, `l3S-${t.x}`);

const l3WTowers = [
    { z: 52, h: 11, hCone: 3 },
    { z: 64, h: 13, hCone: 4 },
];
for (const t of l3WTowers) placeTower(44, t.z, 12, t.h, t.hCone, t.z % 4 === 0 ? C_TOWER_A : C_TOWER_B, `l3W-${t.z}`);

const l3ETowers = [
    { z: 54, h: 12, hCone: 3 },
    { z: 66, h: 10, hCone: 3 },
];
for (const t of l3ETowers) placeTower(74, t.z, 12, t.h, t.hCone, t.z % 4 === 0 ? C_TOWER_A : C_TOWER_B, `l3E-${t.z}`);

// L4 cap ring (y=20) → towers at y=21. Ring between L4 (50..71) and L5 (56..65).
// Strips: N z=50..55, S z=66..71, W x=50..55 z=56..65, E x=66..71 z=56..65.
const l4Towers = [
    [52, 52, 8, 3], [66, 50, 10, 3], [52, 68, 9, 3], [68, 68, 11, 4],
];
for (const [x, z, h, hCone] of l4Towers) placeTower(x, z, 20, h, hCone, x % 4 === 0 ? C_TOWER_A : C_TOWER_B, `l4-${x},${z}`);

// ----- CROWN CLUSTER (atop L5 cap at y=29) -----
// L5 footprint: x=56..65, z=56..65 (10x10). Build a few buildings.
// Central tall tower (axial) with white pyramid on top.
solid(60, 30, 60, 2, 14, 2, C_TOWER_A, "crown-tower");
shape(60, 44, 60, "square_pyramid", 2, 6, 2, C_WHITE, "crown-pyramid");

// Surrounding buildings on L5 cap (y=30 first free).
// Building A: 4x4 NW corner
solid(56, 30, 56, 4, 6, 4, C_L4, "crown-A");
shape(56, 36, 56, "square_pyramid", 4, 4, 4, C_WHITE, "crown-A-roof");
// Building B: 4x4 NE corner
solid(62, 30, 56, 4, 5, 4, C_L4, "crown-B");
shape(62, 35, 56, "square_pyramid", 4, 3, 4, C_WHITE, "crown-B-roof");
// Building C: 4x4 SW corner
solid(56, 30, 62, 4, 5, 4, C_L4, "crown-C");
shape(56, 35, 62, "square_pyramid", 4, 3, 4, C_WHITE, "crown-C-roof");
// Building D: 4x4 SE corner
solid(62, 30, 62, 4, 6, 4, C_L4, "crown-D");
shape(62, 36, 62, "square_pyramid", 4, 4, 4, C_WHITE, "crown-D-roof");

// ----- MURALHAS SERPENTEANTES at base -----
// Run from L1 perimeter outward in zigzag across placa-base. y=1..2 (2 layers high).
// Each segment 2-thick. Must be face-connected to neighboring segment.
function wall(x0, z0, w, d, label) {
    solid(x0, 1, z0, w, 2, d, C_WALL, label);
}
// NW serpentine: starts at L1 N wall (z=20), heads northwest with zigzag
wall(8, 8, 16, 2, "wallNW-1");   // x=8..23, z=8..9
wall(8, 10, 2, 8, "wallNW-2");   // x=8..9, z=10..17
wall(2, 10, 6, 2, "wallNW-3");   // x=2..7, z=10..11 (lateral kink)
// End-tower sits on top of wallNW-3 end
solid(2, 3, 10, 2, 4, 2, C_L1, "wallNW-endtower");
shape(2, 7, 10, "square_pyramid", 2, 3, 2, C_WHITE, "wallNW-endcone");

// NE serpentine: from L1 N wall, heads northeast
wall(108, 8, 8, 2, "wallNE-1");  // x=108..115, z=8..9
wall(108, 10, 2, 10, "wallNE-2"); // x=108..109, z=10..19

// End-tower on top of wallNE-1 east end
solid(114, 3, 8, 2, 4, 2, C_L1, "wallNE-endtower");
shape(114, 7, 8, "square_pyramid", 2, 3, 2, C_WHITE, "wallNE-endcone");

// SW serpentine
wall(8, 110, 16, 2, "wallSW-1");
wall(8, 102, 2, 8, "wallSW-2");
wall(2, 110, 6, 2, "wallSW-3");
solid(2, 3, 110, 2, 4, 2, C_L1, "wallSW-endtower");
shape(2, 7, 110, "square_pyramid", 2, 3, 2, C_WHITE, "wallSW-endcone");

// SE serpentine
wall(108, 110, 8, 2, "wallSE-1");
wall(108, 100, 2, 10, "wallSE-2");
solid(114, 3, 110, 2, 4, 2, C_L1, "wallSE-endtower");
shape(114, 7, 110, "square_pyramid", 2, 3, 2, C_WHITE, "wallSE-endcone");

// ----- TUFOS DE VEGETAÇÃO -----
// Spread in y=1 around the base, in cells outside any level/wall/lobe.
// Need face-connected to base (y=0 placa) - they sit at y=1 directly above the base. y=0 base is occupied so tufo at y=1 has support beneath at y=0 (✓ face-connected).
const tufoSpots = [
    [4, 4], [4, 80], [80, 4], [110, 80],
    [16, 30], [16, 80], [100, 30], [80, 110],
    [40, 4], [40, 116], [4, 30], [110, 30],
    [70, 4], [70, 116],
];
for (const [x, z] of tufoSpots) {
    if (canPlace(x, 1, z, 2, 2, 2)) {
        solid(x, 1, z, 2, 2, 2, C_TUFO, `tufo-${x},${z}`);
    }
}

// ----- MANCHAS CLARAS de adobe (small lighter blocks attached to wall faces) -----
// Each must face-touch a wall. We place them adjacent to existing wall masses.
const manchas = [
    // attached to L1 N wall outer face (z=18..19), at random x. y=1..2.
    // But L1 N wall is at z=20..21, so its outer face is z=19. A 2x2 mancha at z=18..19 would touch face z=19↔20.
    [30, 18, 1], [60, 18, 1], [80, 18, 1],
    // attached to L2 walls (outer at z=29 north, z=90 south). z=28..29 touches z=29↔30.
    [40, 28, 4], [70, 28, 4],
    // east side of L2: x=88..89 outer at x=90. mancha at x=90..91 z=40
    [90, 40, 4], [90, 70, 4],
    // L3 outer (z=41 north): mancha at z=40..41 → touches z=41↔42
    [50, 40, 8], [66, 40, 8],
    // L4 outer (z=49 north): mancha at z=48..49 → touches z=49↔50
    [54, 48, 13], [66, 48, 13],
];
for (const [x, z, y] of manchas) {
    if (canPlace(x, y, z, 2, 2, 2)) {
        solid(x, y, z, 2, 2, 2, C_MANCHA, `mancha-${x},${y},${z}`);
    } else {
        console.error(`Skipped mancha at ${x},${y},${z} (overlap)`);
    }
}

// ----- AMEIAS (battlements) on top of crown buildings -----
// On y=29 (top of L5 cap), around the perimeter of L5 (10x10 footprint at x=56..65, z=56..65),
// but only where NOT under a crown building (crown buildings cover y=30..). At y=29 the L5 cap is solid (we just placed it), so ameias at y=30 must be on the L5 cap perimeter NOT under crown buildings.
// Crown buildings cover x=56..65 z=56..65 mostly. So no room for ameias on L5 perimeter at y=30.
// Instead, put ameias on top of crown buildings A, B, C, D as small studs (2x2x1 at y=top+roof_y? but pyramid covers the top).
// Skip ameias to avoid overlap. Could add ameias on L4 cap-ring perimeter at y=21 wait that's where l4 towers are.
// Let's add small "merlons" on top of the 4 crown buildings adjacent to their pyramids.
// Each pyramid top is at y=39/38/38/39. The pyramid bbox is 4x{3..4}x4 starting at y=35/35/36/36. So nothing more above without colliding.
// Skip ameias for now (visual fidelity already strong).

console.error(`steps=${steps.length}`);

const recipe = {
    version: 1,
    kind: "prefab",
    name: "CidadelaTorresConicas",
    recipe: steps,
};
const out = JSON.stringify(recipe, null, 2);
writeFileSync("prefabs/exports/CidadelaTorresConicas.json", out);
console.error("Wrote prefabs/exports/CidadelaTorresConicas.json");
