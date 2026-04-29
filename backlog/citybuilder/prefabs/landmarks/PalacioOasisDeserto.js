import {
    addFilledRectSafe,
    addPillarStackSafe,
    createPrefabBuilder,
} from "../shared/core.js";
import { addPoolSafe } from "../shared/modern.js";

const PALETTE = {
    base: "#d7c08a",
    sandLight: "#e6d8ab",
    sandMid: "#d7c08a",
    sandShadow: "#bea56d",
    edge: "#8f7a4f",
    gold: "#c6a04d",
    brightGold: "#f2cd37",
    water: "#58b8e4",
    glass: "#0055bf",
    dark: "#111111",
    wood: "#8b5a2b",
    trunk: "#6b4b34",
    trunkDark: "#553823",
    palm: "#237841",
    palmLight: "#3aad4f",
    fabric: "#c74e24",
    rug: "#8f3b3f",
    amber: "#f57c00",
    glow: "#ffd166",
    green: "#2f6034",
    stone: "#d8c39a",
};

function fillRect1x1(builder, x0, y, z0, width, depth, color) {
    for (let x = x0; x < x0 + width; x++) {
        for (let z = z0; z < z0 + depth; z++) {
            builder.add("1x1", color, 0, x, y, z);
        }
    }
}

function addOptimizedRect(builder, x0, y, z0, width, depth, color) {
    if (width <= 0 || depth <= 0) return;

    if (width === 1 || depth === 1) {
        fillRect1x1(builder, x0, y, z0, width, depth, color);
        return;
    }

    const evenWidth = width - (width % 2);
    const evenDepth = depth - (depth % 2);
    const maxX = x0 + width - 1;
    const maxZ = z0 + depth - 1;

    if (evenWidth >= 2 && evenDepth >= 2) {
        addFilledRectSafe(builder, x0, y, z0, evenWidth, evenDepth, color);
    }

    if (width % 2 !== 0) {
        for (let z = z0; z < z0 + evenDepth; z++) {
            builder.add("1x1", color, 0, maxX, y, z);
        }
    }

    if (depth % 2 !== 0) {
        for (let x = x0; x < x0 + evenWidth; x++) {
            builder.add("1x1", color, 0, x, y, maxZ);
        }
    }

    if (width % 2 !== 0 && depth % 2 !== 0) {
        builder.add("1x1", color, 0, maxX, y, maxZ);
    }
}

function addBorder1x1(builder, x0, y, z0, width, depth, color) {
    const x1 = x0 + width - 1;
    const z1 = z0 + depth - 1;

    for (let x = x0; x <= x1; x++) {
        builder.add("1x1", color, 0, x, y, z0);
        builder.add("1x1", color, 0, x, y, z1);
    }

    for (let z = z0 + 1; z < z1; z++) {
        builder.add("1x1", color, 0, x0, y, z);
        builder.add("1x1", color, 0, x1, y, z);
    }
}

function addLayeredSections(builder, layers) {
    layers.forEach(({ y, color, sections }) => {
        sections.forEach(({ x0, z0, width, depth }) => {
            addOptimizedRect(builder, x0, y, z0, width, depth, color);
        });
    });
}

function isArchOpeningX(x, y, arch, y0) {
    const localY = y - y0;
    const startX = arch.center - Math.floor(arch.width / 2);
    const endX = startX + arch.width - 1;
    if (x < startX || x > endX) return false;
    if (localY < arch.sideHeight) return true;
    if (localY === arch.sideHeight && x > startX && x < endX) return true;
    return false;
}

function isArchOpeningZ(z, y, arch, y0) {
    const localY = y - y0;
    const startZ = arch.center - Math.floor(arch.width / 2);
    const endZ = startZ + arch.width - 1;
    if (z < startZ || z > endZ) return false;
    if (localY < arch.sideHeight) return true;
    if (localY === arch.sideHeight && z > startZ && z < endZ) return true;
    return false;
}

function wallZ(x0, x1, z, y0, height, color, arches = []) {
    return { x0, x1, z, y0, height, color, arches };
}

function wallX(x, z0, z1, y0, height, color, arches = []) {
    return { x, z0, z1, y0, height, color, arches };
}

function addWallWithArchesZ(builder, wall) {
    const { x0, x1, z, y0, height, color, arches = [] } = wall;

    for (let y = y0; y < y0 + height; y++) {
        for (let x = x0; x <= x1; x++) {
            if (arches.some((arch) => isArchOpeningX(x, y, arch, y0))) continue;

            const shade = (x + y + z) % 11 === 0 ? PALETTE.sandShadow : color;
            builder.add("1x1", shade, 0, x, y, z);
        }
    }
}

function addWallWithArchesX(builder, wall) {
    const { x, z0, z1, y0, height, color, arches = [] } = wall;

    for (let y = y0; y < y0 + height; y++) {
        for (let z = z0; z <= z1; z++) {
            if (arches.some((arch) => isArchOpeningZ(z, y, arch, y0))) continue;

            const shade = (x + y + z) % 13 === 0 ? PALETTE.sandShadow : color;
            builder.add("1x1", shade, 0, x, y, z);
        }
    }
}

function addWindowRowZ(builder, z, y, xs) {
    xs.forEach((x) => {
        builder.add("Window", PALETTE.glass, 1, x, y, z);
    });
}

function addWindowRowX(builder, x, y, zs) {
    zs.forEach((z) => {
        builder.add("Window", PALETTE.glass, 0, x, y, z);
    });
}

function addEntryStairs(builder) {
    for (let step = 0; step < 6; step++) {
        const width = 32 - step * 4;
        const x0 = Math.floor((72 - width) / 2);
        const z0 = step * 2;
        const color = step % 2 === 0 ? PALETTE.stone : PALETTE.sandLight;
        addOptimizedRect(builder, x0, 1 + step, z0, width, 2, color);
    }

    addBorder1x1(builder, 31, 7, 12, 10, 3, PALETTE.edge);
}

function addSteppedDome(builder, cx, cz, baseY, layers, finialColor = PALETTE.brightGold) {
    layers.forEach(({ width, depth, color }, index) => {
        const x0 = cx - Math.floor(width / 2);
        const z0 = cz - Math.floor(depth / 2);
        addOptimizedRect(builder, x0, baseY + index, z0, width, depth, color);
    });

    const topY = baseY + layers.length;
    addPillarStackSafe(builder, cx, topY, cz, 3, finialColor);
    builder.add("1x1", finialColor, 0, cx - 1, topY + 2, cz);
    builder.add("1x1", finialColor, 0, cx + 1, topY + 2, cz);
}

function addLantern(builder, x, y, z) {
    for (let yy = 1; yy < y; yy++) {
        builder.add("1x1", PALETTE.wood, 0, x, yy, z);
    }

    builder.add("1x1", PALETTE.wood, 0, x, y, z);
    builder.add("1x1", PALETTE.amber, 0, x, y + 1, z);
    builder.add("1x1", PALETTE.glow, 0, x, y + 2, z);
}

function addMarketStall(builder, x0, z0, fabricColor = PALETTE.fabric) {
    addOptimizedRect(builder, x0, 1, z0, 6, 4, PALETTE.wood);
    builder.add("Tile 2x2", fabricColor, 0, x0 + 2, 2, z0 + 1);
    addPillarStackSafe(builder, x0, 2, z0, 3, PALETTE.wood);
    addPillarStackSafe(builder, x0 + 5, 2, z0, 3, PALETTE.wood);
    addPillarStackSafe(builder, x0, 2, z0 + 3, 3, PALETTE.wood);
    addPillarStackSafe(builder, x0 + 5, 2, z0 + 3, 3, PALETTE.wood);

    for (let x = x0; x < x0 + 6; x += 2) {
        builder.add("Roof 1x2", fabricColor, 1, x, 5, z0);
        builder.add("Roof 1x2", fabricColor, 3, x, 5, z0 + 3);
    }

    builder.add("1x1", PALETTE.brightGold, 0, x0 + 1, 2, z0 + 2);
    builder.add("1x1", PALETTE.sandShadow, 0, x0 + 4, 2, z0 + 2);
}

function addRooftopPergola(builder, x0, y, z0, width, depth) {
    addPillarStackSafe(builder, x0, y, z0, 4, PALETTE.wood);
    addPillarStackSafe(builder, x0 + width - 1, y, z0, 4, PALETTE.wood);
    addPillarStackSafe(builder, x0, y, z0 + depth - 1, 4, PALETTE.wood);
    addPillarStackSafe(builder, x0 + width - 1, y, z0 + depth - 1, 4, PALETTE.wood);

    for (let x = x0; x < x0 + width; x += 2) {
        builder.add("Roof 1x2", PALETTE.dark, 1, x, y + 4, z0);
        builder.add("Roof 1x2", PALETTE.dark, 1, x, y + 4, z0 + depth - 1);
    }

    for (let z = z0 + 1; z < z0 + depth - 1; z += 2) {
        builder.add("Roof 1x2", PALETTE.dark, 0, x0, y + 4, z);
        builder.add("Roof 1x2", PALETTE.dark, 0, x0 + width - 1, y + 4, z);
    }
}

function addTallPalm(builder, lx, ly, lz, options = {}) {
    const { height = 10, leanX = 0, leanZ = 0 } = options;
    let topX = lx;
    let topZ = lz;

    for (let i = 0; i < height; i++) {
        topX = lx + Math.round((i / Math.max(1, height - 1)) * leanX);
        topZ = lz + Math.round((i / Math.max(1, height - 1)) * leanZ);
        const color = i % 2 === 0 ? PALETTE.trunkDark : PALETTE.trunk;
        builder.add("1x1", color, 0, topX, ly + i, topZ);
    }

    const topY = ly + height - 1;
    const leafBlocks = [
        [-1, -1, 1, PALETTE.palmLight],
        [-3, -1, 0, PALETTE.palm],
        [1, -1, 0, PALETTE.palm],
        [-1, -3, 0, PALETTE.palm],
        [-1, 1, 0, PALETTE.palm],
        [-3, -3, 0, PALETTE.palmLight],
        [1, -3, 0, PALETTE.palmLight],
        [-3, 1, 0, PALETTE.palmLight],
        [1, 1, 0, PALETTE.palmLight],
        [-5, -1, -1, PALETTE.palm],
        [3, -1, -1, PALETTE.palm],
        [-1, -5, -1, PALETTE.palm],
        [-1, 3, -1, PALETTE.palm],
    ];

    leafBlocks.forEach(([ox, oz, oy, color]) => {
        builder.add("2x2", color, 0, topX + ox, topY + oy, topZ + oz);
    });
}

function addCactus(builder, x, z, height = 5) {
    for (let y = 1; y <= height; y++) {
        builder.add("1x1", PALETTE.green, 0, x, y, z);
    }

    builder.add("1x1", PALETTE.green, 0, x - 1, Math.max(2, height - 1), z);
    builder.add("1x1", PALETTE.green, 0, x + 1, Math.max(2, height - 2), z);
}

function getMinaretLayer(y) {
    const size = y < 7 ? 8 : 6;
    const x0 = 61 + Math.floor((8 - size) / 2);
    const z0 = 12 + Math.floor((8 - size) / 2);

    return {
        size,
        x0,
        z0,
        x1: x0 + size - 1,
        z1: z0 + size - 1,
        midX: x0 + Math.floor(size / 2),
        midZ: z0 + Math.floor(size / 2),
    };
}

function isMinaretShell(x, z, layer) {
    return x === layer.x0 || x === layer.x1 || z === layer.z0 || z === layer.z1;
}

function isMinaretSlit(x, y, z, layer) {
    const isSlitY = y === 12 || y === 13 || y === 22 || y === 23 || y === 31 || y === 32;
    if (!isSlitY) return false;

    return (
        (x === layer.midX && (z === layer.z0 || z === layer.z1))
        || (z === layer.midZ && (x === layer.x0 || x === layer.x1))
    );
}

function addMinaretLayer(builder, y) {
    const layer = getMinaretLayer(y);

    for (let x = layer.x0; x <= layer.x1; x++) {
        for (let z = layer.z0; z <= layer.z1; z++) {
            if (!isMinaretShell(x, z, layer)) continue;

            const color = isMinaretSlit(x, y, z, layer) ? PALETTE.glass : PALETTE.sandLight;
            builder.add("1x1", color, 0, x, y, z);
        }
    }
}

function addMinaretBody(builder) {
    for (let y = 3; y <= 34; y++) {
        addMinaretLayer(builder, y);
    }
}

function addMinaretBalconies(builder) {
    [14, 27, 35].forEach((y) => {
        addBorder1x1(builder, 60, y, 11, 10, 10, PALETTE.edge);
        addBorder1x1(builder, 61, y + 1, 12, 8, 8, PALETTE.gold);
    });
}

function addMinaretCap(builder) {
    addOptimizedRect(builder, 62, 35, 13, 6, 6, PALETTE.edge);
    addOptimizedRect(builder, 61, 36, 12, 8, 8, PALETTE.dark);
    addOptimizedRect(builder, 62, 37, 13, 6, 6, PALETTE.dark);
    addOptimizedRect(builder, 63, 38, 14, 4, 4, PALETTE.dark);
    addOptimizedRect(builder, 64, 39, 15, 2, 2, PALETTE.dark);
    addPillarStackSafe(builder, 64, 40, 15, 4, PALETTE.gold);
    builder.add("1x1", PALETTE.brightGold, 0, 65, 43, 15);
    builder.add("1x1", PALETTE.brightGold, 0, 64, 44, 15);
}

function addMinaret(builder) {
    addOptimizedRect(builder, 60, 1, 11, 10, 11, PALETTE.sandShadow);
    addBorder1x1(builder, 60, 2, 11, 10, 11, PALETTE.edge);
    addMinaretBody(builder);
    addMinaretBalconies(builder);
    addMinaretCap(builder);
}

function addLeftTorchTower(builder) {
    addOptimizedRect(builder, 16, 1, 13, 8, 8, PALETTE.sandShadow);

    for (let y = 2; y <= 22; y++) {
        for (let x = 18; x <= 21; x++) {
            for (let z = 15; z <= 18; z++) {
                const shell = x === 18 || x === 21 || z === 15 || z === 18;
                if (!shell) continue;
                const color = (y === 11 || y === 12) && x === 19 && z === 15 ? PALETTE.glass : PALETTE.sandLight;
                builder.add("1x1", color, 0, x, y, z);
            }
        }
    }

    addBorder1x1(builder, 17, 23, 14, 6, 6, PALETTE.edge);
    addOptimizedRect(builder, 18, 23, 15, 4, 4, PALETTE.edge);
    addPillarStackSafe(builder, 19, 24, 16, 3, PALETTE.wood);
    builder.add("1x1", PALETTE.amber, 0, 19, 27, 16);
    builder.add("1x1", PALETTE.glow, 0, 19, 28, 16);
}

function addCentralPalace(builder) {
    addLayeredSections(builder, [
        { y: 1, color: PALETTE.sandShadow, sections: [{ x0: 24, z0: 14, width: 34, depth: 30 }] },
        { y: 7, color: PALETTE.sandMid, sections: [{ x0: 25, z0: 14, width: 32, depth: 30 }] },
        { y: 13, color: PALETTE.sandLight, sections: [{ x0: 27, z0: 16, width: 28, depth: 26 }] },
        { y: 19, color: PALETTE.sandLight, sections: [{ x0: 31, z0: 20, width: 20, depth: 18 }] },
    ]);

    const lowerFrontArches = [
        { center: 31, width: 5, sideHeight: 4 },
        { center: 40, width: 6, sideHeight: 5 },
        { center: 49, width: 5, sideHeight: 4 },
    ];
    addWallWithArchesZ(builder, wallZ(25, 56, 14, 2, 5, PALETTE.sandLight, lowerFrontArches));
    addWallWithArchesZ(builder, wallZ(25, 56, 43, 2, 5, PALETTE.sandLight, [
        { center: 34, width: 4, sideHeight: 4 },
        { center: 47, width: 4, sideHeight: 4 },
    ]));
    addWallWithArchesX(builder, wallX(25, 15, 42, 2, 5, PALETTE.sandLight, [
        { center: 24, width: 5, sideHeight: 4 },
        { center: 35, width: 5, sideHeight: 4 },
    ]));
    addWallWithArchesX(builder, wallX(56, 15, 42, 2, 5, PALETTE.sandLight, [
        { center: 24, width: 5, sideHeight: 4 },
        { center: 35, width: 5, sideHeight: 4 },
    ]));

    [27, 35, 45, 54].forEach((x) => addPillarStackSafe(builder, x, 2, 14, 5, PALETTE.edge));
    [27, 35, 45, 54].forEach((x) => addPillarStackSafe(builder, x, 8, 17, 5, PALETTE.edge));
    addWindowRowZ(builder, 16, 8, [30, 38, 47]);
    addWindowRowZ(builder, 42, 8, [32, 48]);
    addWindowRowX(builder, 27, 8, [21, 31, 39]);
    addWindowRowX(builder, 54, 8, [21, 31, 39]);

    addWallWithArchesZ(builder, wallZ(28, 54, 17, 8, 5, PALETTE.sandLight, [
        { center: 40, width: 5, sideHeight: 3 },
    ]));
    addWallWithArchesZ(builder, wallZ(28, 54, 40, 8, 5, PALETTE.sandLight));
    addWallWithArchesX(builder, wallX(28, 18, 39, 8, 5, PALETTE.sandLight));
    addWallWithArchesX(builder, wallX(54, 18, 39, 8, 5, PALETTE.sandLight));

    addBorder1x1(builder, 25, 7, 14, 32, 30, PALETTE.edge);
    addBorder1x1(builder, 27, 13, 16, 28, 26, PALETTE.edge);
    addBorder1x1(builder, 31, 19, 20, 20, 18, PALETTE.gold);

    addWallWithArchesZ(builder, wallZ(32, 50, 20, 14, 5, PALETTE.sandLight, [
        { center: 40, width: 5, sideHeight: 3 },
    ]));
    addWallWithArchesZ(builder, wallZ(32, 50, 37, 14, 5, PALETTE.sandLight));
    addWallWithArchesX(builder, wallX(32, 21, 36, 14, 5, PALETTE.sandLight));
    addWallWithArchesX(builder, wallX(50, 21, 36, 14, 5, PALETTE.sandLight));

    addSteppedDome(builder, 40, 29, 20, [
        { width: 16, depth: 14, color: PALETTE.sandLight },
        { width: 14, depth: 12, color: PALETTE.sandLight },
        { width: 12, depth: 10, color: PALETTE.sandMid },
        { width: 10, depth: 8, color: PALETTE.sandMid },
        { width: 8, depth: 6, color: PALETTE.gold },
        { width: 6, depth: 4, color: PALETTE.gold },
        { width: 4, depth: 4, color: PALETTE.brightGold },
        { width: 2, depth: 2, color: PALETTE.brightGold },
    ]);
}

function addLeftWing(builder) {
    addLayeredSections(builder, [
        { y: 1, color: PALETTE.sandShadow, sections: [{ x0: 8, z0: 22, width: 18, depth: 22 }] },
        { y: 6, color: PALETTE.sandMid, sections: [{ x0: 9, z0: 23, width: 16, depth: 20 }] },
        { y: 12, color: PALETTE.sandLight, sections: [{ x0: 11, z0: 25, width: 12, depth: 16 }] },
    ]);

    addWallWithArchesZ(builder, wallZ(9, 24, 22, 2, 4, PALETTE.sandLight, [
        { center: 14, width: 4, sideHeight: 3 },
        { center: 20, width: 4, sideHeight: 3 },
    ]));
    addWallWithArchesZ(builder, wallZ(9, 24, 43, 2, 4, PALETTE.sandLight));
    addWallWithArchesX(builder, wallX(8, 23, 42, 2, 4, PALETTE.sandLight, [
        { center: 33, width: 5, sideHeight: 3 },
    ]));
    addWallWithArchesX(builder, wallX(25, 23, 42, 2, 4, PALETTE.sandLight));

    addWallWithArchesZ(builder, wallZ(10, 24, 24, 7, 5, PALETTE.sandLight, [
        { center: 17, width: 4, sideHeight: 3 },
    ]));
    addBorder1x1(builder, 9, 6, 23, 16, 20, PALETTE.edge);
    addBorder1x1(builder, 11, 12, 25, 12, 16, PALETTE.edge);
    addRooftopPergola(builder, 12, 13, 28, 9, 8);

    addSteppedDome(builder, 18, 34, 17, [
        { width: 8, depth: 8, color: PALETTE.sandLight },
        { width: 6, depth: 6, color: PALETTE.sandMid },
        { width: 4, depth: 4, color: PALETTE.gold },
        { width: 2, depth: 2, color: PALETTE.brightGold },
    ]);
}

function addRightWing(builder) {
    addLayeredSections(builder, [
        { y: 1, color: PALETTE.sandShadow, sections: [{ x0: 54, z0: 30, width: 14, depth: 18 }] },
        { y: 5, color: PALETTE.sandMid, sections: [{ x0: 55, z0: 31, width: 12, depth: 16 }] },
        { y: 10, color: PALETTE.sandLight, sections: [{ x0: 56, z0: 32, width: 10, depth: 14 }] },
        { y: 16, color: PALETTE.sandLight, sections: [{ x0: 57, z0: 34, width: 8, depth: 10 }] },
    ]);

    addWallWithArchesZ(builder, wallZ(55, 66, 30, 2, 3, PALETTE.sandLight, [
        { center: 60, width: 4, sideHeight: 2 },
    ]));
    addWallWithArchesZ(builder, wallZ(55, 66, 47, 2, 3, PALETTE.sandLight));
    addWallWithArchesX(builder, wallX(67, 31, 46, 2, 3, PALETTE.sandLight, [
        { center: 39, width: 5, sideHeight: 2 },
    ]));

    addWindowRowZ(builder, 31, 6, [57, 62]);
    addWindowRowX(builder, 66, 6, [34, 40]);
    addBorder1x1(builder, 55, 5, 31, 12, 16, PALETTE.edge);
    addBorder1x1(builder, 56, 10, 32, 10, 14, PALETTE.edge);

    addWallWithArchesZ(builder, wallZ(57, 64, 34, 11, 5, PALETTE.sandLight, [
        { center: 60, width: 4, sideHeight: 3 },
    ]));
    addWallWithArchesZ(builder, wallZ(57, 64, 43, 11, 5, PALETTE.sandLight));
    addWallWithArchesX(builder, wallX(57, 35, 42, 11, 5, PALETTE.sandLight));
    addWallWithArchesX(builder, wallX(64, 35, 42, 11, 5, PALETTE.sandLight));

    addSteppedDome(builder, 61, 39, 17, [
        { width: 8, depth: 8, color: PALETTE.sandLight },
        { width: 6, depth: 6, color: PALETTE.sandMid },
        { width: 4, depth: 4, color: PALETTE.gold },
        { width: 2, depth: 2, color: PALETTE.brightGold },
    ]);
}

function addLandscape(builder) {
    addOptimizedRect(builder, 0, 0, 0, 72, 56, PALETTE.base);
    addBorder1x1(builder, 0, 1, 0, 72, 56, PALETTE.edge);
    addOptimizedRect(builder, 23, 1, 8, 30, 6, PALETTE.sandMid);
    addOptimizedRect(builder, 6, 1, 19, 13, 3, PALETTE.sandMid);
    addOptimizedRect(builder, 49, 1, 23, 12, 3, PALETTE.sandMid);
    addOptimizedRect(builder, 28, 1, 45, 26, 4, PALETTE.sandMid);

    addPoolSafe(builder, 6, 1, 6, 16, 10, PALETTE.edge, PALETTE.water);
    addBorder1x1(builder, 5, 2, 5, 18, 12, PALETTE.sandLight);

    for (const [x, z, color, y = 2] of [
        [25, 12, PALETTE.rug],
        [51, 13, PALETTE.rug],
        [30, 18, PALETTE.fabric],
        [47, 18, PALETTE.fabric],
        [14, 46, PALETTE.sandShadow, 1],
        [58, 51, PALETTE.sandShadow, 1],
    ]) {
        builder.add("Tile 2x2", color, 0, x, y, z);
    }

    addMarketStall(builder, 8, 18, PALETTE.fabric);
    addMarketStall(builder, 52, 6, PALETTE.rug);
    addMarketStall(builder, 57, 23, PALETTE.fabric);

    for (const [x, y, z] of [
        [24, 2, 13],
        [50, 2, 13],
        [13, 2, 17],
        [56, 2, 22],
        [22, 2, 45],
        [52, 2, 46],
    ]) {
        addLantern(builder, x, y, z);
    }

    for (const [x, z, h] of [
        [3, 36, 5],
        [6, 43, 4],
        [66, 31, 6],
        [67, 49, 5],
        [28, 51, 4],
    ]) {
        addCactus(builder, x, z, h);
    }
}

function addPalms(builder) {
    addTallPalm(builder, 4, 1, 9, { height: 10, leanX: 1, leanZ: -1 });
    addTallPalm(builder, 6, 1, 24, { height: 13, leanX: 2, leanZ: -2 });
    addTallPalm(builder, 11, 1, 47, { height: 12, leanX: 1, leanZ: -3 });
    addTallPalm(builder, 18, 1, 50, { height: 10, leanX: -1, leanZ: -1 });
    addTallPalm(builder, 55, 1, 50, { height: 11, leanX: -1, leanZ: -2 });
    addTallPalm(builder, 66, 1, 45, { height: 12, leanX: -1, leanZ: -1 });
    addTallPalm(builder, 67, 1, 8, { height: 10, leanX: -1, leanZ: 2 });
}

function addFinalDetails(builder) {
    for (let x = 30; x <= 50; x += 4) {
        builder.add("1x1", PALETTE.gold, 0, x, 14, 16);
        builder.add("1x1", PALETTE.edge, 0, x, 8, 14);
    }

    for (let z = 18; z <= 40; z += 5) {
        builder.add("1x1", PALETTE.gold, 0, 24, 7, z);
        builder.add("1x1", PALETTE.gold, 0, 57, 7, z);
    }

    builder.add("1x1", PALETTE.dark, 0, 40, 31, 29);
    builder.add("1x1", PALETTE.brightGold, 0, 39, 32, 29);
    builder.add("1x1", PALETTE.brightGold, 0, 40, 33, 29);
    builder.add("1x1", PALETTE.brightGold, 0, 41, 32, 29);

    for (const [x, z] of [[27, 11], [45, 11], [18, 20], [53, 23], [59, 29], [11, 25]]) {
        builder.add("1x1", PALETTE.wood, 0, x, 1, z);
        builder.add("1x1", PALETTE.brightGold, 0, x, 2, z);
    }
}

function buildPalacioOasisDeserto() {
    const builder = createPrefabBuilder();

    addLandscape(builder);
    addEntryStairs(builder);
    addCentralPalace(builder);
    addLeftWing(builder);
    addRightWing(builder);
    addMinaret(builder);
    addLeftTorchTower(builder);
    addPalms(builder);
    addFinalDetails(builder);

    return builder.blocks;
}

const PalacioOasisDeserto = {
    dx: 72,
    dy: 46,
    dz: 56,
    blocks: buildPalacioOasisDeserto(),
};

export default PalacioOasisDeserto;
