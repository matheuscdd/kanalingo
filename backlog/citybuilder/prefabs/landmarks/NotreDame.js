import {
    addFilledRectSafe,
    addPillarStackSafe,
    createPrefabBuilder,
} from "../shared/core.js";

const PALETTE = {
    baseDark: "#22252c",
    baseMid: "#4c515b",
    ground: "#d9d7d0",
    path: "#c7c16b",
    stone: "#daccb0",
    stoneLight: "#e3d9bd",
    stoneDark: "#b89b5c",
    shadow: "#8c7340",
    trim: "#f4f4f4",
    glass: "#cfe0f4",
    glassDark: "#aabed6",
    roof: "#4a4a4a",
    roofDark: "#2f343b",
    spire: "#535860",
    spireDark: "#353940",
    gold: "#f2cd37",
    treeTrunk: "#6b4b34",
    treeLeaf: "#237841",
    treeLeafLight: "#3aad4f",
};

const ENVELOPE = {
    dx: 64,
    dy: 58,
    dz: 70,
};

const LAYOUT = {
    bodyX0: 8,
    bodyX1: 55,
    frontZ0: 6,
    frontZ1: 17,
    naveZ0: 18,
    naveZ1: 53,
    apseZ0: 54,
    apseZ1: 66,
    naveX0: 20,
    naveX1: 43,
    aisleWestX0: 12,
    aisleWestX1: 19,
    aisleEastX0: 44,
    aisleEastX1: 51,
    towerLeftX0: 8,
    towerRightX0: 45,
    towerZ0: 6,
    towerWidth: 11,
    towerDepth: 12,
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

function addRectPerimeter(builder, spec) {
    const {
        x0,
        z0,
        width,
        depth,
        y,
        color,
        skip = null,
    } = spec;
    const x1 = x0 + width - 1;
    const z1 = z0 + depth - 1;

    for (let x = x0; x <= x1; x++) {
        if (!skip?.(x, y, z0)) builder.add("1x1", color, 0, x, y, z0);
        if (!skip?.(x, y, z1)) builder.add("1x1", color, 0, x, y, z1);
    }

    for (let z = z0 + 1; z < z1; z++) {
        if (!skip?.(x0, y, z)) builder.add("1x1", color, 0, x0, y, z);
        if (!skip?.(x1, y, z)) builder.add("1x1", color, 0, x1, y, z);
    }
}

function addTrimLevel(builder, spec) {
    const { x0, z0, width, depth, y, color } = spec;
    const x1 = x0 + width - 1;
    const z1 = z0 + depth - 1;

    for (let x = x0; x <= x1; x += 2) {
        builder.add("1x1", color, 0, x, y, z0);
        builder.add("1x1", color, 0, x, y, z1);
    }

    for (let z = z0 + 1; z < z1; z += 2) {
        builder.add("1x1", color, 0, x0, y, z);
        builder.add("1x1", color, 0, x1, y, z);
    }
}

function addArchFrameFront(builder, spec) {
    const { centerX, zFront, y0, width, height, color, depth = 2 } = spec;
    const x0 = centerX - Math.floor(width / 2);
    const x1 = x0 + width - 1;

    for (let z = zFront; z < zFront + depth; z++) {
        for (let y = y0; y < y0 + height; y++) {
            for (let x = x0; x <= x1; x++) {
                const localY = y - y0;
                const innerLeft = x0 + 1;
                const innerRight = x1 - 1;
                const edge = x === x0 || x === x1;
                const cap = localY === height - 1 && x > x0 && x < x1;
                const shoulder = localY === height - 2 && x >= innerLeft && x <= innerRight;
                const sill = localY === 0 && x > x0 && x < x1;

                if (edge || cap || shoulder || sill) {
                    const shade = (x + y + z) % 5 === 0 ? PALETTE.shadow : color;
                    builder.add("1x1", shade, 0, x, y, z);
                }
            }
        }
    }

    addPillarStackSafe(builder, x0 - 1, y0, zFront + depth - 1, 3, PALETTE.stoneDark);
    addPillarStackSafe(builder, x1 + 1, y0, zFront + depth - 1, 3, PALETTE.stoneDark);
}

function addRoseWindowFront(builder, spec) {
    const { cx, cy, zFront, radius } = spec;

    for (let x = cx - radius - 1; x <= cx + radius + 1; x++) {
        for (let y = cy - radius - 1; y <= cy + radius + 1; y++) {
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.hypot(dx, dy);

            if (dist >= radius - 0.8 && dist <= radius + 0.4) {
                builder.add("1x1", PALETTE.trim, 0, x, y, zFront);
                builder.add("1x1", PALETTE.stoneDark, 0, x, y, zFront + 1);
                continue;
            }

            const spoke = Math.abs(dx) <= 0.5 || Math.abs(dy) <= 0.5 || Math.abs(Math.abs(dx) - Math.abs(dy)) <= 0.5;
            if (dist <= radius - 1.2 && spoke) {
                builder.add("1x1", PALETTE.trim, 0, x, y, zFront + 1);
            }
        }
    }

    const petals = [
        [cx - 4, cy],
        [cx + 2, cy],
        [cx - 1, cy - 4],
        [cx - 1, cy + 2],
        [cx - 4, cy - 4],
        [cx + 2, cy - 4],
        [cx - 4, cy + 2],
        [cx + 2, cy + 2],
    ];

    petals.forEach(([x, y], index) => {
        const color = index % 2 === 0 ? PALETTE.glass : PALETTE.glassDark;
        builder.add("Window", color, 1, x, y, zFront + 1);
    });

    builder.add("2x2", PALETTE.trim, 0, cx - 1, cy - 1, zFront + 1);
}

function addSideRoseWindow(builder, spec) {
    const { x, cy, cz, radius } = spec;

    for (let z = cz - radius - 1; z <= cz + radius + 1; z++) {
        for (let y = cy - radius - 1; y <= cy + radius + 1; y++) {
            const dz = z - cz;
            const dy = y - cy;
            const dist = Math.hypot(dz, dy);

            if (dist >= radius - 0.8 && dist <= radius + 0.3) {
                builder.add("1x1", PALETTE.trim, 0, x, y, z);
                continue;
            }

            const spoke = Math.abs(dz) <= 0.5 || Math.abs(dy) <= 0.5 || Math.abs(Math.abs(dz) - Math.abs(dy)) <= 0.5;
            if (dist <= radius - 1.2 && spoke) {
                builder.add("1x1", PALETTE.trim, 0, x, y, z);
            }
        }
    }

    builder.add("Window", PALETTE.glass, 0, x, cy - 1, cz - 1);
}

function isTowerOpening(spec, x, y, z) {
    const { x0, z0, width, depth } = spec;
    const x1 = x0 + width - 1;
    const z1 = z0 + depth - 1;
    const midX = Math.floor((x0 + x1) / 2);
    const midZ = Math.floor((z0 + z1) / 2);
    const isFrontDoor = z === z0 && y >= 6 && y <= 14 && x >= midX - 1 && x <= midX + 1;
    const isBelfryFront = z === z0 && y >= 28 && y <= 35 && x >= midX - 2 && x <= midX + 2;
    const isBelfryBack = z === z1 && y >= 28 && y <= 35 && x >= midX - 2 && x <= midX + 2;
    const isSideLeft = x === x0 && y >= 29 && y <= 35 && z >= midZ - 2 && z <= midZ + 2;
    const isSideRight = x === x1 && y >= 29 && y <= 35 && z >= midZ - 2 && z <= midZ + 2;
    const isLowerWindow = (y === 18 || y === 19) && ((z === z0 && x === midX) || (z === z1 && x === midX));

    return isFrontDoor || isBelfryFront || isBelfryBack || isSideLeft || isSideRight || isLowerWindow;
}

function addTower(builder, spec) {
    const { x0, z0, width, depth } = spec;
    const x1 = x0 + width - 1;
    const z1 = z0 + depth - 1;
    const midX = Math.floor((x0 + x1) / 2);

    addOptimizedRect(builder, x0, 4, z0, width, depth, PALETTE.stoneDark);

    for (let y = 5; y <= 38; y++) {
        addRectPerimeter(builder, {
            x0,
            z0,
            width,
            depth,
            y,
            color: y <= 18 ? PALETTE.stone : PALETTE.stoneLight,
            skip: (x, yy, z) => isTowerOpening(spec, x, yy, z),
        });

        if (y === 14 || y === 22 || y === 38) {
            addTrimLevel(builder, { x0, z0, width, depth, y, color: PALETTE.trim });
        }
    }

    addOptimizedRect(builder, x0 + 1, 23, z0 + 1, width - 2, depth - 2, PALETTE.stoneLight);
    addOptimizedRect(builder, x0 + 1, 39, z0 + 1, width - 2, depth - 2, PALETTE.stoneLight);

    for (let y = 40; y <= 45; y++) {
        addRectPerimeter(builder, {
            x0,
            z0,
            width,
            depth,
            y,
            color: y === 45 ? PALETTE.trim : PALETTE.stoneLight,
        });
    }

    [
        [x0, z0],
        [x1, z0],
        [x0, z1],
        [x1, z1],
    ].forEach(([x, z]) => {
        addPillarStackSafe(builder, x, 46, z, 4, PALETTE.stoneDark);
        builder.add("1x1", PALETTE.gold, 0, x, 50, z);
    });

    addPillarStackSafe(builder, midX, 40, z0 + 2, 11, PALETTE.spireDark);
}

function addFrontFacade(builder) {
    const frontPortals = [
        { centerX: 24, width: 6, height: 9 },
        { centerX: 31, width: 8, height: 11 },
        { centerX: 39, width: 6, height: 9 },
    ];

    addOptimizedRect(builder, 19, 4, 6, 26, 10, PALETTE.stoneDark);

    function isPortalOpening(x, y) {
        return frontPortals.some((portal) => {
            const x0 = portal.centerX - Math.floor(portal.width / 2) + 1;
            const x1 = x0 + portal.width - 3;
            const baseY = 5;
            const localY = y - baseY;
            if (x < x0 || x > x1 || y < baseY || y > baseY + portal.height - 1) return false;
            if (localY <= portal.height - 3) return true;
            return localY === portal.height - 2 && x > x0 && x < x1;
        });
    }

    function isRoseOpening(x, y) {
        const dist = Math.hypot(x - 31, y - 21);
        return dist <= 5.2;
    }

    for (let z = 6; z <= 8; z++) {
        for (let y = 5; y <= 27; y++) {
            for (let x = 19; x <= 44; x++) {
                if (isPortalOpening(x, y) || isRoseOpening(x, y)) continue;
                const color = y >= 18 ? PALETTE.stoneLight : PALETTE.stone;
                builder.add("1x1", color, 0, x, y, z);
            }
        }
    }

    frontPortals.forEach((portal) => addArchFrameFront(builder, {
        centerX: portal.centerX,
        zFront: 6,
        y0: 5,
        width: portal.width,
        height: portal.height,
        color: PALETTE.trim,
        depth: 3,
    }));

    for (let x = 21; x <= 42; x += 4) {
        builder.add("Window", PALETTE.glass, 1, x, 14, 7);
    }

    addRoseWindowFront(builder, { cx: 31, cy: 21, zFront: 6, radius: 6 });

    addTrimLevel(builder, { x0: 19, z0: 6, width: 26, depth: 3, y: 13, color: PALETTE.trim });
    addTrimLevel(builder, { x0: 19, z0: 6, width: 26, depth: 3, y: 18, color: PALETTE.trim });
    addTrimLevel(builder, { x0: 19, z0: 6, width: 26, depth: 3, y: 27, color: PALETTE.trim });

    addOptimizedRect(builder, 22, 28, 6, 20, 4, PALETTE.stoneLight);
    addOptimizedRect(builder, 24, 29, 7, 16, 3, PALETTE.stoneLight);
    addOptimizedRect(builder, 26, 30, 8, 12, 2, PALETTE.trim);
    addOptimizedRect(builder, 28, 31, 8, 8, 2, PALETTE.trim);

    [21, 44].forEach((x) => addPillarStackSafe(builder, x, 18, 8, 10, PALETTE.stoneDark));
    [23, 40].forEach((x) => {
        addPillarStackSafe(builder, x, 29, 8, 3, PALETTE.stoneDark);
        builder.add("1x1", PALETTE.gold, 0, x, 31, 8);
        builder.add("1x1", PALETTE.gold, 0, x, 32, 8);
    });
}

function addSideButtress(builder, spec) {
    const { side, zCenter } = spec;
    const outerX = side === "west" ? 9 : 54;
    const midX = side === "west" ? 10 : 53;
    const upperX = side === "west" ? 11 : 52;

    for (let z = zCenter - 1; z <= zCenter + 1; z++) {
        for (let y = 4; y <= 12; y++) builder.add("1x1", PALETTE.stoneDark, 0, outerX, y, z);
        for (let y = 8; y <= 17; y++) builder.add("1x1", PALETTE.stone, 0, midX, y, z);
        for (let y = 13; y <= 22; y++) builder.add("1x1", PALETTE.stoneLight, 0, upperX, y, z);
        builder.add("1x1", PALETTE.gold, 0, upperX, 23, z);
    }
}

function addAisleWalls(builder) {
    const bayWindows = [21, 27, 33, 39, 45, 51];
    const outerWalls = [
        { x: LAYOUT.aisleWestX0, z0: LAYOUT.naveZ0, z1: LAYOUT.naveZ1 },
        { x: LAYOUT.aisleEastX1, z0: LAYOUT.naveZ0, z1: LAYOUT.naveZ1 },
    ];

    outerWalls.forEach(({ x, z0, z1 }) => {
        for (let y = 5; y <= 18; y++) {
            for (let z = z0; z <= z1; z++) {
                const windowSlot = bayWindows.includes(z) || bayWindows.includes(z - 1);
                const isWindow = y >= 10 && y <= 13 && windowSlot;
                builder.add("1x1", isWindow ? PALETTE.glass : PALETTE.stone, 0, x, y, z);
            }
        }
    });

    for (let y = 5; y <= 24; y++) {
        for (let z = LAYOUT.naveZ0; z <= LAYOUT.naveZ1; z++) {
            const clerestoryWindow = (z - LAYOUT.naveZ0) % 6 === 3;
            const leftColor = y >= 16 && y <= 19 && clerestoryWindow ? PALETTE.glass : PALETTE.stoneLight;
            const rightColor = y >= 16 && y <= 19 && clerestoryWindow ? PALETTE.glass : PALETTE.stoneLight;
            builder.add("1x1", leftColor, 0, LAYOUT.naveX0, y, z);
            builder.add("1x1", rightColor, 0, LAYOUT.naveX1, y, z);
        }
    }

    [18, 24, 30, 36, 42, 48, 54].forEach((zCenter) => {
        addSideButtress(builder, { side: "west", zCenter });
        addSideButtress(builder, { side: "east", zCenter });
    });

    for (let z = LAYOUT.naveZ0; z <= LAYOUT.naveZ1; z += 2) {
        builder.add("1x1", PALETTE.trim, 0, LAYOUT.aisleWestX0, 19, z);
        builder.add("1x1", PALETTE.trim, 0, LAYOUT.aisleEastX1, 19, z);
        builder.add("1x1", PALETTE.trim, 0, LAYOUT.naveX0, 25, z);
        builder.add("1x1", PALETTE.trim, 0, LAYOUT.naveX1, 25, z);
    }
}

function addSideRoseWindows(builder) {
    addSideRoseWindow(builder, {
        x: LAYOUT.aisleWestX0,
        cy: 16,
        cz: 36,
        radius: 4,
    });
    addSideRoseWindow(builder, {
        x: LAYOUT.aisleEastX1,
        cy: 16,
        cz: 36,
        radius: 4,
    });
}

function addNaveRoof(builder) {
    for (let step = 0; step < 6; step++) {
        const leftX = LAYOUT.naveX0 + step * 2;
        const rightX = LAYOUT.naveX1 - step * 2 + (step === 0 ? -1 : 0);
        const roofY = 22 + step;

        for (let z = LAYOUT.naveZ0; z <= LAYOUT.naveZ1; z++) {
            if (z >= 31 && z <= 39 && step <= 1) continue;
            builder.add("Roof 1x2", step % 2 === 0 ? PALETTE.roof : PALETTE.roofDark, 1, leftX, roofY, z);
            builder.add("Roof 1x2", step % 2 === 0 ? PALETTE.roof : PALETTE.roofDark, 3, rightX, roofY, z);
        }
    }

    for (let step = 0; step < 3; step++) {
        const leftX = LAYOUT.aisleWestX0 + 2 + step * 2;
        const rightX = LAYOUT.aisleEastX1 - 3 - step * 2;
        const roofY = 18 + step;

        for (let z = LAYOUT.naveZ0; z <= LAYOUT.naveZ1; z++) {
            if (z >= 31 && z <= 39 && step === 0) continue;
            builder.add("Roof 1x2", PALETTE.roofDark, 1, leftX, roofY, z);
            builder.add("Roof 1x2", PALETTE.roofDark, 3, rightX, roofY, z);
        }
    }

    for (let z = LAYOUT.naveZ0 + 2; z <= LAYOUT.naveZ1 - 2; z += 3) {
        builder.add("Tile 2x2", PALETTE.roofDark, 0, 30, 28, z);
    }
}

function addCrossingSpire(builder) {
    addOptimizedRect(builder, 26, 24, 30, 12, 10, PALETTE.roofDark);
    addOptimizedRect(builder, 27, 25, 31, 10, 8, PALETTE.roofDark);
    addBorder1x1(builder, 27, 26, 31, 10, 8, PALETTE.trim);

    [
        [27, 31],
        [36, 31],
        [27, 38],
        [36, 38],
    ].forEach(([x, z]) => {
        for (let y = 26; y <= 30; y++) {
            builder.add("1x1", PALETTE.treeLeaf, 0, x, y, z);
        }
        builder.add("1x1", PALETTE.gold, 0, x, 31, z);
    });

    addOptimizedRect(builder, 29, 28, 33, 6, 4, PALETTE.spire);
    addOptimizedRect(builder, 30, 29, 34, 4, 2, PALETTE.spire);

    for (let y = 30; y <= 53; y++) {
        builder.add("1x1", y % 2 === 0 ? PALETTE.spire : PALETTE.spireDark, 0, 31, y, 34);

        if (y >= 31 && y <= 40 && y % 3 === 0) {
            builder.add("1x1", PALETTE.spire, 0, 30, y, 34);
            builder.add("1x1", PALETTE.spire, 0, 32, y, 34);
            builder.add("1x1", PALETTE.spire, 0, 31, y, 33);
            builder.add("1x1", PALETTE.spire, 0, 31, y, 35);
        }

        if (y >= 41 && y <= 48 && y % 4 === 1) {
            builder.add("1x1", PALETTE.spireDark, 0, 30, y, 34);
            builder.add("1x1", PALETTE.spireDark, 0, 32, y, 34);
        }
    }

    builder.add("1x1", PALETTE.trim, 0, 31, 54, 34);
    builder.add("1x1", PALETTE.gold, 0, 31, 55, 34);
    builder.add("1x1", PALETTE.gold, 0, 31, 56, 34);
    builder.add("1x1", PALETTE.gold, 0, 31, 57, 34);
}

function addApse(builder) {
    const sections = [
        { z0: 54, depth: 4, x0: 16, width: 32 },
        { z0: 58, depth: 3, x0: 18, width: 28 },
        { z0: 61, depth: 3, x0: 21, width: 22 },
        { z0: 64, depth: 3, x0: 25, width: 14 },
    ];

    sections.forEach(({ z0, depth, x0, width }) => {
        addOptimizedRect(builder, x0, 4, z0, width, depth, PALETTE.stoneDark);

        for (let y = 5; y <= 18; y++) {
            addRectPerimeter(builder, {
                x0,
                z0,
                width,
                depth,
                y,
                color: y >= 15 ? PALETTE.stoneLight : PALETTE.stone,
            });
        }

        addTrimLevel(builder, { x0, z0, width, depth, y: 19, color: PALETTE.trim });
    });

    [
        [16, 57], [18, 60], [21, 63], [25, 66],
        [47, 57], [45, 60], [42, 63], [38, 66],
    ].forEach(([x, z]) => {
        addPillarStackSafe(builder, x, 5, z, 16, PALETTE.stoneDark);
        builder.add("1x1", PALETTE.gold, 0, x, 21, z);
    });

    const roofSections = [
        { z0: 54, z1: 57, left: 20, right: 42, y: 20 },
        { z0: 58, z1: 60, left: 22, right: 40, y: 21 },
        { z0: 61, z1: 63, left: 25, right: 37, y: 22 },
        { z0: 64, z1: 66, left: 28, right: 34, y: 23 },
    ];

    roofSections.forEach(({ z0, z1, left, right, y }) => {
        for (let step = 0; step < 3; step++) {
            const leftX = left + step * 2;
            const rightX = right - step * 2;
            for (let z = z0; z <= z1; z++) {
                builder.add("Roof 1x2", PALETTE.roofDark, 1, leftX, y + step, z);
                builder.add("Roof 1x2", PALETTE.roofDark, 3, rightX, y + step, z);
            }
        }
    });
}

function addSmallTree(builder, x, z) {
    for (let y = 2; y <= 5; y++) {
        builder.add("1x1", PALETTE.treeTrunk, 0, x, y, z);
    }

    [
        [x - 1, z - 1, PALETTE.treeLeaf],
        [x + 1, z - 1, PALETTE.treeLeafLight],
        [x - 1, z + 1, PALETTE.treeLeafLight],
        [x + 1, z + 1, PALETTE.treeLeaf],
        [x - 2, z, PALETTE.treeLeaf],
        [x, z - 2, PALETTE.treeLeafLight],
    ].forEach(([lx, lz, color]) => {
        builder.add("2x2", color, 0, lx, 5, lz);
    });

    builder.add("2x2", PALETTE.treeLeaf, 0, x - 1, 6, z - 1);
}

function addDisplayBase(builder) {
    addOptimizedRect(builder, 0, 0, 0, ENVELOPE.dx, ENVELOPE.dz, PALETTE.baseDark);
    addOptimizedRect(builder, 1, 1, 1, ENVELOPE.dx - 2, ENVELOPE.dz - 2, PALETTE.baseMid);
    addOptimizedRect(builder, 2, 2, 2, ENVELOPE.dx - 4, ENVELOPE.dz - 4, PALETTE.ground);
    addBorder1x1(builder, 2, 3, 2, ENVELOPE.dx - 4, ENVELOPE.dz - 4, PALETTE.path);

    addOptimizedRect(builder, 8, 3, 6, 48, 61, PALETTE.stoneDark);
    addOptimizedRect(builder, 10, 4, 8, 44, 57, PALETTE.stoneLight);

    addOptimizedRect(builder, 24, 2, 2, 16, 2, PALETTE.ground);
    addOptimizedRect(builder, 22, 3, 4, 20, 2, PALETTE.stoneDark);
    addOptimizedRect(builder, 24, 4, 6, 16, 2, PALETTE.stoneLight);
}

function addLandscape(builder) {
    addOptimizedRect(builder, 56, 3, 10, 5, 54, PALETTE.path);
    addOptimizedRect(builder, 56, 3, 10, 2, 54, PALETTE.ground);

    [16, 24, 32, 40, 48, 56].forEach((z) => addSmallTree(builder, 58, z));

    [14, 22, 30, 38, 46, 54, 62].forEach((z) => {
        builder.add("1x1", PALETTE.treeLeaf, 0, 60, 3, z);
        builder.add("1x1", PALETTE.treeLeafLight, 0, 61, 3, z + 1 > 67 ? z : z + 1);
    });
}

function addMainStructure(builder) {
    addOptimizedRect(builder, LAYOUT.aisleWestX0, 4, LAYOUT.naveZ0, LAYOUT.aisleEastX1 - LAYOUT.aisleWestX0 + 1, LAYOUT.naveZ1 - LAYOUT.naveZ0 + 1, PALETTE.stoneDark);
    addOptimizedRect(builder, LAYOUT.naveX0, 5, LAYOUT.naveZ0, LAYOUT.naveX1 - LAYOUT.naveX0 + 1, LAYOUT.naveZ1 - LAYOUT.naveZ0 + 1, PALETTE.stoneLight);

    addTower(builder, {
        x0: LAYOUT.towerLeftX0,
        z0: LAYOUT.towerZ0,
        width: LAYOUT.towerWidth,
        depth: LAYOUT.towerDepth,
    });
    addTower(builder, {
        x0: LAYOUT.towerRightX0,
        z0: LAYOUT.towerZ0,
        width: LAYOUT.towerWidth,
        depth: LAYOUT.towerDepth,
    });

    addFrontFacade(builder);
    addAisleWalls(builder);
    addSideRoseWindows(builder);
    addNaveRoof(builder);
    addCrossingSpire(builder);
    addApse(builder);

    [
        [12, 18], [19, 18], [44, 18], [51, 18],
        [12, 54], [19, 54], [44, 54], [51, 54],
    ].forEach(([x, z]) => {
        addPillarStackSafe(builder, x, 5, z, 16, PALETTE.stoneDark);
        builder.add("1x1", PALETTE.gold, 0, x, 21, z);
    });
}

function addFinalDetails(builder) {
    [
        [20, 54], [24, 54], [28, 54], [34, 54], [38, 54], [42, 54],
    ].forEach(([x, z]) => {
        builder.add("1x1", PALETTE.trim, 0, x, 18, z);
        builder.add("1x1", PALETTE.gold, 0, x, 19, z);
    });

    for (let z = LAYOUT.naveZ0 + 3; z <= LAYOUT.naveZ1 - 2; z += 6) {
        builder.add("1x1", PALETTE.stoneDark, 0, LAYOUT.naveX0, 26, z);
        builder.add("1x1", PALETTE.stoneDark, 0, LAYOUT.naveX1, 26, z);
        builder.add("1x1", PALETTE.gold, 0, LAYOUT.naveX0, 27, z);
        builder.add("1x1", PALETTE.gold, 0, LAYOUT.naveX1, 27, z);
    }

}

function buildNotreDame() {
    const builder = createPrefabBuilder();

    addDisplayBase(builder);
    addLandscape(builder);
    addMainStructure(builder);
    addFinalDetails(builder);

    return builder.blocks;
}

const NotreDame = {
    dx: ENVELOPE.dx,
    dy: ENVELOPE.dy,
    dz: ENVELOPE.dz,
    blocks: buildNotreDame(),
};

export default NotreDame;