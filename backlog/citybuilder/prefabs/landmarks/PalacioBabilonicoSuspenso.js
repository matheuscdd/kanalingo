import {
    addFilledRectSafe,
    addPillarStackSafe,
    createPrefabBuilder,
} from "../shared/core.js";

const ENVELOPE = {
    dx: 84,
    dy: 44,
    dz: 72,
};

const PALETTE = {
    baseBlue: "#0055bf",
    baseBlueDark: "#2f4057",
    wallBlue: "#4b79bf",
    wallBlueDark: "#2d4f83",
    cream: "#f4f4f4",
    creamWarm: "#efe8d6",
    creamShadow: "#e3d6bb",
    sand: "#d7c08a",
    sandShadow: "#8f7a4f",
    red: "#8f3b3f",
    redBright: "#c72a2a",
    vine: "#2f5d1f",
    green: "#237841",
    greenLight: "#3aad4f",
    trunk: "#6b4b34",
    trunkDark: "#553823",
    darkTrim: "#111111",
    gold: "#c6a04d",
    brightGold: "#f2cd37",
    flower: "#f57c00",
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

function addRectPrism(builder, x0, y0, z0, width, depth, height, color) {
    for (let y = y0; y < y0 + height; y++) {
        addOptimizedRect(builder, x0, y, z0, width, depth, color);
    }
}

function addMerlons(builder, x0, y, z0, width, depth, color) {
    const x1 = x0 + width - 1;
    const z1 = z0 + depth - 1;

    for (let x = x0; x <= x1; x += 2) {
        builder.add("1x1", color, 0, x, y, z0);
        builder.add("1x1", color, 0, x, y, z1);
    }

    for (let z = z0 + 2; z < z1; z += 2) {
        builder.add("1x1", color, 0, x0, y, z);
        builder.add("1x1", color, 0, x1, y, z);
    }
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

function wallZ(x0, x1, z, y0, height, color, arches = []) {
    return { x0, x1, z, y0, height, color, arches };
}

function addWallWithArchesZ(builder, wall) {
    const { x0, x1, z, y0, height, color, arches = [] } = wall;

    for (let y = y0; y < y0 + height; y++) {
        for (let x = x0; x <= x1; x++) {
            if (arches.some((arch) => isArchOpeningX(x, y, arch, y0))) continue;
            builder.add("1x1", color, 0, x, y, z);
        }
    }
}

function addTopPlanter(builder, x0, y, z0, width, depth, options = {}) {
    const {
        baseColor = PALETTE.green,
        flowerColor = PALETTE.flower,
    } = options;

    fillRect1x1(builder, x0, y, z0, width, depth, baseColor);
    builder.add("1x1", flowerColor, 0, x0, y + 1, z0);
    builder.add("1x1", flowerColor, 0, x0 + width - 1, y + 1, z0 + depth - 1);
    if (width > 2 && depth > 2) {
        builder.add("1x1", PALETTE.greenLight, 0, x0 + 1, y + 1, z0 + 1);
        builder.add("1x1", PALETTE.greenLight, 0, x0 + width - 2, y + 1, z0 + depth - 2);
    }
}

function addTallPalm(builder, lx, ly, lz, options = {}) {
    const { height = 8, leanX = 0, leanZ = 0 } = options;
    let topX = lx;
    let topZ = lz;

    for (let index = 0; index < height; index++) {
        topX = lx + Math.round((index / Math.max(1, height - 1)) * leanX);
        topZ = lz + Math.round((index / Math.max(1, height - 1)) * leanZ);
        const color = index % 2 === 0 ? PALETTE.trunkDark : PALETTE.trunk;
        builder.add("1x1", color, 0, topX, ly + index, topZ);
    }

    const topY = ly + height - 1;
    [
        [-1, -1, 1, PALETTE.greenLight],
        [-3, -1, 0, PALETTE.green],
        [1, -1, 0, PALETTE.green],
        [-1, -3, 0, PALETTE.green],
        [-1, 1, 0, PALETTE.green],
        [-3, -3, 0, PALETTE.greenLight],
        [1, -3, 0, PALETTE.greenLight],
        [-3, 1, 0, PALETTE.greenLight],
        [1, 1, 0, PALETTE.greenLight],
    ].forEach(([ox, oz, oy, color]) => {
        builder.add("2x2", color, 0, topX + ox, topY + oy, topZ + oz);
    });
}

function addVineRun(builder, x, y0, z, height) {
    for (let index = 0; index < height; index++) {
        builder.add("1x1", index % 2 === 0 ? PALETTE.vine : PALETTE.greenLight, 0, x, y0 + index, z);
    }
    if (height >= 3) {
        builder.add("1x1", PALETTE.greenLight, 0, x, y0 + 2, z + 1);
    }
    if (height >= 5) {
        builder.add("1x1", PALETTE.greenLight, 0, x, y0 + 4, z - 1);
    }
}

function addWallGlyphZ(builder, centerX, centerY, z) {
    builder.add("1x1", PALETTE.gold, 0, centerX, centerY, z);
    builder.add("1x1", PALETTE.cream, 0, centerX - 1, centerY, z);
    builder.add("1x1", PALETTE.cream, 0, centerX + 1, centerY, z);
    builder.add("1x1", PALETTE.creamWarm, 0, centerX, centerY - 1, z);
    builder.add("1x1", PALETTE.creamWarm, 0, centerX, centerY + 1, z);
}

function addWallGlyphX(builder, x, centerY, centerZ) {
    builder.add("1x1", PALETTE.gold, 0, x, centerY, centerZ);
    builder.add("1x1", PALETTE.cream, 0, x, centerY, centerZ - 1);
    builder.add("1x1", PALETTE.cream, 0, x, centerY, centerZ + 1);
    builder.add("1x1", PALETTE.creamWarm, 0, x, centerY - 1, centerZ);
    builder.add("1x1", PALETTE.creamWarm, 0, x, centerY + 1, centerZ);
}

function getPatternCenters(start, end, step) {
    const centers = [];
    for (let value = start; value <= end; value += step) {
        centers.push(value);
    }
    return centers;
}

function addTowerRoofVariation(builder, x0, z0, variant) {
    if (variant === "northGarden") {
        addTopPlanter(builder, x0 + 2, 12, z0 + 3, 3, 2, {
            baseColor: PALETTE.greenLight,
            flowerColor: PALETTE.redBright,
        });
        addTopPlanter(builder, x0 + 5, 12, z0 + 5, 2, 2, {
            flowerColor: PALETTE.flower,
        });
        builder.add("1x1", PALETTE.brightGold, 0, x0 + 4, 13, z0 + 5);
        return;
    }

    if (variant === "eastGarden") {
        addTopPlanter(builder, x0 + 2, 12, z0 + 2, 2, 3, {
            flowerColor: PALETTE.flower,
        });
        addTopPlanter(builder, x0 + 5, 12, z0 + 4, 2, 2, {
            baseColor: PALETTE.greenLight,
            flowerColor: PALETTE.red,
        });
        builder.add("1x1", PALETTE.redBright, 0, x0 + 4, 13, z0 + 3);
        return;
    }

    if (variant === "southGarden") {
        addTopPlanter(builder, x0 + 2, 12, z0 + 5, 2, 2, {
            baseColor: PALETTE.greenLight,
            flowerColor: PALETTE.redBright,
        });
        addTopPlanter(builder, x0 + 5, 12, z0 + 2, 2, 2, {
            flowerColor: PALETTE.flower,
        });
        builder.add("1x1", PALETTE.gold, 0, x0 + 4, 13, z0 + 6);
        return;
    }

    addTopPlanter(builder, x0 + 2, 12, z0 + 4, 2, 2, {
        baseColor: PALETTE.greenLight,
        flowerColor: PALETTE.red,
    });
    addTopPlanter(builder, x0 + 5, 12, z0 + 2, 2, 3, {
        flowerColor: PALETTE.flower,
    });
    builder.add("1x1", PALETTE.brightGold, 0, x0 + 5, 13, z0 + 5);
}

function addCornerTower(builder, x0, z0, options = {}) {
    const {
        exposedFaces = [],
        roofVariant = "northGarden",
        vineRuns = [],
    } = options;

    addRectPrism(builder, x0, 2, z0, 10, 10, 8, PALETTE.wallBlueDark);
    addBorder1x1(builder, x0, 6, z0, 10, 10, PALETTE.creamWarm);
    addRectPrism(builder, x0 + 1, 10, z0 + 1, 8, 8, 2, PALETTE.cream);
    addBorder1x1(builder, x0 + 1, 12, z0 + 1, 8, 8, PALETTE.darkTrim);
    addMerlons(builder, x0 + 1, 13, z0 + 1, 8, 8, PALETTE.darkTrim);

    addTowerRoofVariation(builder, x0, z0, roofVariant);
    vineRuns.forEach(({ x, y0, z, height }) => addVineRun(builder, x, y0, z, height));

    [
        [x0 + 1, 14, z0 + 1],
        [x0 + 8, 14, z0 + 1],
        [x0 + 1, 14, z0 + 8],
        [x0 + 8, 14, z0 + 8],
    ].forEach(([x, y, z]) => builder.add("1x1", PALETTE.gold, 0, x, y, z));

    if (exposedFaces.includes("front")) {
        addWallGlyphZ(builder, x0 + 4, 5, z0 - 1);
        addWallGlyphZ(builder, x0 + 4, 8, z0 - 1);
    }
    if (exposedFaces.includes("rear")) {
        addWallGlyphZ(builder, x0 + 4, 5, z0 + 10);
        addWallGlyphZ(builder, x0 + 4, 8, z0 + 10);
    }
    if (exposedFaces.includes("left")) {
        addWallGlyphX(builder, x0 - 1, 5, z0 + 4);
        addWallGlyphX(builder, x0 - 1, 8, z0 + 4);
    }
    if (exposedFaces.includes("right")) {
        addWallGlyphX(builder, x0 + 10, 5, z0 + 4);
        addWallGlyphX(builder, x0 + 10, 8, z0 + 4);
    }
}

function addPerimeterWall(builder, x0, z0, width, depth, options = {}) {
    const { faces = [] } = options;

    addRectPrism(builder, x0, 2, z0, width, depth, 8, PALETTE.wallBlue);
    addOptimizedRect(builder, x0, 10, z0, width, depth, PALETTE.creamWarm);
    addBorder1x1(builder, x0, 11, z0, width, depth, PALETTE.darkTrim);
    addMerlons(builder, x0, 12, z0, width, depth, PALETTE.darkTrim);

    if (faces.includes("front")) {
        getPatternCenters(x0 + 3, x0 + width - 4, 6).forEach((centerX) => {
            addWallGlyphZ(builder, centerX, 5, z0 - 1);
            addWallGlyphZ(builder, centerX, 8, z0 - 1);
        });
    }

    if (faces.includes("rear")) {
        getPatternCenters(x0 + 3, x0 + width - 4, 6).forEach((centerX) => {
            addWallGlyphZ(builder, centerX, 5, z0 + depth);
            addWallGlyphZ(builder, centerX, 8, z0 + depth);
        });
    }

    if (faces.includes("left")) {
        getPatternCenters(z0 + 4, z0 + depth - 5, 7).forEach((centerZ) => {
            addWallGlyphX(builder, x0 - 1, 6, centerZ);
        });
    }

    if (faces.includes("right")) {
        getPatternCenters(z0 + 4, z0 + depth - 5, 7).forEach((centerZ) => {
            addWallGlyphX(builder, x0 + width, 6, centerZ);
        });
    }
}

function addDisplayBase(builder) {
    addOptimizedRect(builder, 0, 0, 0, ENVELOPE.dx, ENVELOPE.dz, PALETTE.baseBlue);
    addOptimizedRect(builder, 1, 1, 1, ENVELOPE.dx - 2, ENVELOPE.dz - 2, PALETTE.baseBlueDark);
}

function addFortifiedRing(builder) {
    addCornerTower(builder, 8, 8, {
        exposedFaces: ["front", "left"],
        roofVariant: "northGarden",
        vineRuns: [
            { x: 12, y0: 9, z: 7, height: 4 },
        ],
    });
    addCornerTower(builder, 66, 8, {
        exposedFaces: ["front", "right"],
        roofVariant: "eastGarden",
        vineRuns: [
            { x: 76, y0: 9, z: 12, height: 4 },
        ],
    });
    addCornerTower(builder, 8, 54, {
        exposedFaces: ["rear", "left"],
        roofVariant: "southGarden",
        vineRuns: [
            { x: 7, y0: 9, z: 58, height: 4 },
        ],
    });
    addCornerTower(builder, 66, 54, {
        exposedFaces: ["rear", "right"],
        roofVariant: "westGarden",
        vineRuns: [
            { x: 76, y0: 9, z: 59, height: 4 },
        ],
    });

    addPerimeterWall(builder, 18, 10, 10, 8, { faces: ["front"] });
    addPerimeterWall(builder, 56, 10, 10, 8, { faces: ["front"] });
    addPerimeterWall(builder, 10, 18, 8, 36, { faces: ["left"] });
    addPerimeterWall(builder, 66, 18, 8, 36, { faces: ["right"] });
    addPerimeterWall(builder, 18, 54, 48, 8, { faces: ["rear"] });

    addVineRun(builder, 9, 4, 26, 5);
    addVineRun(builder, 74, 4, 24, 5);
    addVineRun(builder, 9, 5, 58, 4);
    addVineRun(builder, 74, 5, 56, 4);
}

function addFrontArchGate(builder) {
    addRectPrism(builder, 28, 2, 10, 8, 18, 10, PALETTE.wallBlueDark);
    addRectPrism(builder, 48, 2, 10, 8, 18, 10, PALETTE.wallBlueDark);
    addRectPrism(builder, 36, 2, 11, 3, 13, 10, PALETTE.creamWarm);
    addRectPrism(builder, 45, 2, 11, 3, 13, 10, PALETTE.creamWarm);
    addRectPrism(builder, 36, 2, 24, 12, 4, 10, PALETTE.wallBlueDark);

    addWallWithArchesZ(builder, wallZ(36, 47, 10, 2, 10, PALETTE.cream, [
        { center: 42, width: 10, sideHeight: 6 },
    ]));
    addWallWithArchesZ(builder, wallZ(36, 47, 27, 2, 10, PALETTE.creamShadow, [
        { center: 42, width: 8, sideHeight: 5 },
    ]));

    addOptimizedRect(builder, 36, 12, 10, 12, 18, PALETTE.creamWarm);
    addBorder1x1(builder, 36, 13, 10, 12, 18, PALETTE.darkTrim);
    addMerlons(builder, 36, 14, 10, 12, 18, PALETTE.darkTrim);

    [38, 41, 44, 47].forEach((x) => builder.add("1x1", PALETTE.gold, 0, x, 15, 10));
    [39, 42, 45].forEach((x) => builder.add("1x1", PALETTE.redBright, 0, x, 13, 9));

    addVineRun(builder, 27, 4, 22, 5);
    addVineRun(builder, 56, 4, 20, 5);
}

function addCourtyard(builder) {
    addOptimizedRect(builder, 18, 2, 28, 48, 26, PALETTE.creamShadow);
    addOptimizedRect(builder, 18, 2, 18, 10, 10, PALETTE.creamShadow);
    addOptimizedRect(builder, 56, 2, 18, 10, 10, PALETTE.creamShadow);
    addOptimizedRect(builder, 36, 2, 28, 12, 2, PALETTE.creamWarm);

    addOptimizedRect(builder, 34, 3, 26, 16, 2, PALETTE.sand);
    addOptimizedRect(builder, 36, 4, 28, 12, 2, PALETTE.sand);

    addTopPlanter(builder, 19, 3, 31, 4, 3, {
        baseColor: PALETTE.greenLight,
        flowerColor: PALETTE.redBright,
    });
    addTopPlanter(builder, 61, 3, 31, 4, 3, {
        flowerColor: PALETTE.flower,
    });
    addTopPlanter(builder, 20, 3, 48, 5, 3, {
        baseColor: PALETTE.green,
        flowerColor: PALETTE.flower,
    });
    addTopPlanter(builder, 59, 3, 48, 5, 3, {
        baseColor: PALETTE.greenLight,
        flowerColor: PALETTE.red,
    });
    addTopPlanter(builder, 21, 3, 21, 4, 3, {
        baseColor: PALETTE.greenLight,
        flowerColor: PALETTE.redBright,
    });
    addTopPlanter(builder, 59, 3, 21, 4, 3, {
        flowerColor: PALETTE.flower,
    });

    addTallPalm(builder, 22, 3, 34, { height: 7, leanX: 1, leanZ: 1 });
    addTallPalm(builder, 62, 3, 36, { height: 7, leanX: -1, leanZ: 1 });
    addTallPalm(builder, 24, 3, 50, { height: 8, leanX: 1, leanZ: -1 });
    addTallPalm(builder, 60, 3, 50, { height: 8, leanX: -1, leanZ: -1 });

    addVineRun(builder, 23, 3, 31, 5);
    addVineRun(builder, 60, 3, 31, 5);
    addVineRun(builder, 25, 3, 52, 5);
    addVineRun(builder, 58, 3, 52, 5);
}

function addTerraceLevel(builder, spec) {
    const { x0, y0, z0, width, depth, height, bodyColor, topColor = bodyColor } = spec;

    for (let y = y0; y < y0 + height - 1; y++) {
        addOptimizedRect(builder, x0, y, z0, width, depth, bodyColor);
    }
    addOptimizedRect(builder, x0, y0 + height - 1, z0, width, depth, topColor);
}

function addCentralPalace(builder) {
    addTerraceLevel(builder, {
        x0: 24, y0: 4, z0: 30, width: 36, depth: 26, height: 5,
        bodyColor: PALETTE.creamWarm, topColor: PALETTE.cream,
    });
    addTerraceLevel(builder, {
        x0: 28, y0: 9, z0: 34, width: 28, depth: 18, height: 5,
        bodyColor: PALETTE.cream, topColor: PALETTE.creamWarm,
    });
    addTerraceLevel(builder, {
        x0: 31, y0: 14, z0: 37, width: 22, depth: 12, height: 5,
        bodyColor: PALETTE.creamWarm, topColor: PALETTE.cream,
    });
    addTerraceLevel(builder, {
        x0: 34, y0: 19, z0: 39, width: 16, depth: 8, height: 6,
        bodyColor: PALETTE.cream, topColor: PALETTE.creamWarm,
    });

    [28, 34, 40, 46, 52, 58].forEach((x) => addPillarStackSafe(builder, x, 9, 29, 4, PALETTE.creamWarm));
    addOptimizedRect(builder, 27, 13, 29, 32, 2, PALETTE.creamWarm);
    [30, 36, 42, 48, 54].forEach((x) => builder.add("1x1", PALETTE.red, 0, x, 13, 28));
    [27, 32, 37, 42, 47, 52, 57].forEach((x) => builder.add("1x1", PALETTE.gold, 0, x, 14, 29));

    [31, 37, 43, 49].forEach((x) => addPillarStackSafe(builder, x, 14, 33, 4, PALETTE.cream));
    addOptimizedRect(builder, 30, 18, 33, 22, 2, PALETTE.creamWarm);
    [33, 39, 45].forEach((x) => builder.add("1x1", PALETTE.redBright, 0, x, 18, 32));

    addBorder1x1(builder, 34, 25, 39, 16, 8, PALETTE.darkTrim);
    [35, 48].forEach((x) => {
        builder.add("1x1", PALETTE.gold, 0, x, 26, 39);
        builder.add("1x1", PALETTE.gold, 0, x, 26, 46);
    });
    builder.add("1x1", PALETTE.gold, 0, 42, 25, 42);
    builder.add("1x1", PALETTE.greenLight, 0, 42, 26, 42);
    builder.add("1x1", PALETTE.greenLight, 0, 42, 27, 42);

    addTopPlanter(builder, 25, 9, 31, 4, 3);
    addTopPlanter(builder, 54, 9, 31, 4, 3);
    addTopPlanter(builder, 24, 9, 52, 4, 3);
    addTopPlanter(builder, 55, 9, 52, 4, 3);
    addTopPlanter(builder, 35, 9, 31, 5, 2, {
        baseColor: PALETTE.greenLight,
        flowerColor: PALETTE.redBright,
    });
    addTopPlanter(builder, 44, 9, 31, 5, 2, {
        baseColor: PALETTE.green,
        flowerColor: PALETTE.flower,
    });
    addTopPlanter(builder, 35, 9, 52, 5, 2, {
        baseColor: PALETTE.green,
        flowerColor: PALETTE.flower,
    });
    addTopPlanter(builder, 44, 9, 52, 5, 2, {
        baseColor: PALETTE.greenLight,
        flowerColor: PALETTE.redBright,
    });
    addTopPlanter(builder, 29, 14, 35, 4, 3);
    addTopPlanter(builder, 51, 14, 35, 4, 3);
    addTopPlanter(builder, 33, 14, 34, 4, 2, {
        baseColor: PALETTE.greenLight,
        flowerColor: PALETTE.red,
    });
    addTopPlanter(builder, 47, 14, 34, 4, 2, {
        flowerColor: PALETTE.flower,
    });
    addTopPlanter(builder, 33, 14, 50, 4, 2, {
        flowerColor: PALETTE.flower,
    });
    addTopPlanter(builder, 47, 14, 50, 4, 2, {
        baseColor: PALETTE.greenLight,
        flowerColor: PALETTE.redBright,
    });
    addTopPlanter(builder, 31, 19, 37, 2, 2, {
        baseColor: PALETTE.greenLight,
        flowerColor: PALETTE.redBright,
    });
    addTopPlanter(builder, 50, 19, 37, 2, 2, {
        flowerColor: PALETTE.flower,
    });
    addTopPlanter(builder, 31, 19, 47, 2, 2, {
        flowerColor: PALETTE.flower,
    });
    addTopPlanter(builder, 50, 19, 47, 2, 2, {
        baseColor: PALETTE.greenLight,
        flowerColor: PALETTE.red,
    });
    addTopPlanter(builder, 36, 25, 40, 3, 3);
    addTopPlanter(builder, 45, 25, 40, 3, 3);
    addTopPlanter(builder, 36, 25, 43, 3, 2, {
        baseColor: PALETTE.greenLight,
        flowerColor: PALETTE.redBright,
    });
    addTopPlanter(builder, 45, 25, 43, 3, 2, {
        flowerColor: PALETTE.flower,
    });

    addTallPalm(builder, 29, 15, 35, { height: 7, leanX: -1, leanZ: 1 });
    addTallPalm(builder, 52, 15, 35, { height: 8, leanX: 1, leanZ: 1 });
    addTallPalm(builder, 37, 26, 41, { height: 6, leanX: -1, leanZ: 0 });
    addTallPalm(builder, 46, 26, 41, { height: 6, leanX: 1, leanZ: 0 });

    addVineRun(builder, 23, 8, 41, 6);
    addVineRun(builder, 60, 8, 43, 6);
    addVineRun(builder, 23, 8, 34, 6);
    addVineRun(builder, 60, 8, 51, 6);
    addVineRun(builder, 23, 8, 48, 6);
    addVineRun(builder, 60, 8, 35, 6);
    addVineRun(builder, 30, 13, 46, 4);
    addVineRun(builder, 54, 13, 45, 4);
    addVineRun(builder, 27, 13, 39, 5);
    addVineRun(builder, 56, 13, 42, 5);
    addVineRun(builder, 27, 13, 49, 5);
    addVineRun(builder, 56, 13, 36, 5);
    addVineRun(builder, 30, 18, 42, 4);
    addVineRun(builder, 53, 18, 43, 4);
    addVineRun(builder, 30, 18, 38, 4);
    addVineRun(builder, 53, 18, 47, 4);
    addVineRun(builder, 33, 24, 41, 4);
    addVineRun(builder, 50, 24, 43, 4);
    addVineRun(builder, 33, 24, 44, 4);
    addVineRun(builder, 50, 24, 40, 4);
}

function buildPalacioBabilonicoSuspenso() {
    const builder = createPrefabBuilder();

    addDisplayBase(builder);
    addFortifiedRing(builder);
    addFrontArchGate(builder);
    addCourtyard(builder);
    addCentralPalace(builder);

    return builder.blocks;
}

const PalacioBabilonicoSuspenso = {
    dx: ENVELOPE.dx,
    dy: ENVELOPE.dy,
    dz: ENVELOPE.dz,
    blocks: buildPalacioBabilonicoSuspenso(),
};

export default PalacioBabilonicoSuspenso;