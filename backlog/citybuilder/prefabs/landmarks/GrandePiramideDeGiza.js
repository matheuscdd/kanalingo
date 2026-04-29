import {
    addFilledRectSafe,
    addPillarStackSafe,
    createPrefabBuilder,
} from "../shared/core.js";

const ENVELOPE = {
    dx: 92,
    dy: 52,
    dz: 80,
};

const PALETTE = {
    baseBlack: "#111111",
    baseDark: "#25282d",
    baseLine: "#3f4349",
    canalFloor: "#1f3650",
    water: "#58b8e4",
    waterDeep: "#2d5375",
    sandShadow: "#8f7a4f",
    sandDark: "#bea56d",
    sand: "#d7c08a",
    sandLight: "#e6d8ab",
    calcite: "#f4f4f4",
    calciteWarm: "#efe8d6",
    calciteCool: "#e3d6bb",
    green: "#237841",
    greenLight: "#3aad4f",
    trunk: "#6b4b34",
    trunkDark: "#553823",
    boat: "#6c4b32",
    boatDark: "#553823",
    sail: "#f4f4f4",
    gold: "#c6a04d",
    brightGold: "#f2cd37",
    statue: "#c6a04d",
    shadow: "#af9057",
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

function addHollowRect(builder, x0, y, z0, width, depth, color, wallThickness = 2) {
    if (width <= 0 || depth <= 0) return;

    if (width <= wallThickness * 2 || depth <= wallThickness * 2) {
        addOptimizedRect(builder, x0, y, z0, width, depth, color);
        return;
    }

    addOptimizedRect(builder, x0, y, z0, width, wallThickness, color);
    addOptimizedRect(builder, x0, y, z0 + depth - wallThickness, width, wallThickness, color);
    addOptimizedRect(builder, x0, y, z0 + wallThickness, wallThickness, depth - wallThickness * 2, color);
    addOptimizedRect(builder, x0 + width - wallThickness, y, z0 + wallThickness, wallThickness, depth - wallThickness * 2, color);
}

function getPyramidSizes(baseSize, repeatUntil = 24) {
    const sizes = [];

    for (let size = baseSize; size >= 2; size -= 2) {
        sizes.push(size);
        if (size >= repeatUntil) sizes.push(size);
    }

    return sizes;
}

function getPyramidColor(index, size) {
    if (size >= 34) return index % 3 === 0 ? PALETTE.calciteWarm : PALETTE.calcite;
    if (size >= 20) return index % 4 === 0 ? PALETTE.calciteCool : PALETTE.calcite;
    if (size >= 8) return index % 2 === 0 ? PALETTE.calciteWarm : PALETTE.calcite;
    return PALETTE.calciteWarm;
}

function addPyramidCourses(builder, x0, baseY, z0, sizes, options = {}) {
    const baseSize = sizes[0];
    const {
        hollowMinSize = Infinity,
        wallThickness = 2,
    } = options;

    sizes.forEach((size, index) => {
        const inset = Math.floor((baseSize - size) / 2);
        const courseX = x0 + inset;
        const courseZ = z0 + inset;
        const color = getPyramidColor(index, size);

        if (size >= hollowMinSize) {
            addHollowRect(builder, courseX, baseY + index, courseZ, size, size, color, wallThickness);
            return;
        }

        addOptimizedRect(builder, courseX, baseY + index, courseZ, size, size, color);
    });

    const topY = baseY + sizes.length;
    const capX = x0 + Math.floor(baseSize / 2);
    const capZ = z0 + Math.floor(baseSize / 2);
    builder.add("1x1", PALETTE.gold, 0, capX, topY, capZ);
    builder.add("1x1", PALETTE.brightGold, 0, capX, topY + 1, capZ);
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

function addRockOrUrnScatter(builder, entries) {
    entries.forEach(([x, z, color = PALETTE.sandDark, height = 1]) => {
        for (let y = 4; y < 4 + height; y++) {
            builder.add("1x1", color, 0, x, y, z);
        }
    });
}

function addDisplayBase(builder) {
    addOptimizedRect(builder, 0, 0, 0, ENVELOPE.dx, ENVELOPE.dz, PALETTE.baseBlack);
    addOptimizedRect(builder, 1, 1, 1, ENVELOPE.dx - 2, ENVELOPE.dz - 2, PALETTE.baseDark);
    addOptimizedRect(builder, 2, 2, 12, ENVELOPE.dx - 4, 66, PALETTE.sandShadow);
    addOptimizedRect(builder, 4, 3, 14, ENVELOPE.dx - 8, 62, PALETTE.sand);

    [8, 18, 28, 38, 48, 58, 68, 78].forEach((x) => {
        builder.add("1x1", PALETTE.baseLine, 0, x, 1, 0);
        builder.add("1x1", PALETTE.baseLine, 0, x, 1, 79);
    });
    [8, 18, 28, 38, 48, 58, 68].forEach((z) => {
        builder.add("1x1", PALETTE.baseLine, 0, 0, 1, z);
        builder.add("1x1", PALETTE.baseLine, 0, 91, 1, z);
    });
}

function addCanalWater(builder) {
    addOptimizedRect(builder, 2, 2, 2, 88, 9, PALETTE.canalFloor);

    for (let x = 4; x <= 86; x += 2) {
        for (let z = 4; z <= 8; z += 2) {
            builder.add("Tile 2x2", (x + z) % 4 === 0 ? PALETTE.water : PALETTE.waterDeep, 0, x, 4, z);
        }
    }

    addBorder1x1(builder, 2, 3, 2, 88, 9, PALETTE.baseDark);
    addBorder1x1(builder, 3, 3, 3, 86, 7, PALETTE.baseLine);

    addOptimizedRect(builder, 4, 3, 11, 22, 4, PALETTE.green);
    addOptimizedRect(builder, 64, 3, 11, 24, 4, PALETTE.green);
    addOptimizedRect(builder, 26, 3, 11, 38, 4, PALETTE.sandLight);

    [
        [6, 12, PALETTE.green],
        [10, 12, PALETTE.green],
        [20, 12, PALETTE.green],
        [73, 12, PALETTE.green],
        [79, 12, PALETTE.green],
        [84, 12, PALETTE.green],
    ].forEach(([x, z, color]) => builder.add("1x1", color, 0, x, 3, z));

    addRockOrUrnScatter(builder, [
        [6, 12, PALETTE.greenLight],
        [8, 13, PALETTE.greenLight],
        [10, 12, PALETTE.greenLight],
        [73, 12, PALETTE.greenLight],
        [76, 13, PALETTE.greenLight],
        [79, 12, PALETTE.greenLight],
        [20, 12, PALETTE.sandDark],
        [24, 13, PALETTE.sandDark],
        [66, 13, PALETTE.sandDark],
        [84, 12, PALETTE.sandDark],
    ]);
}

function addBoat(builder, x0, z0, options = {}) {
    const { width = 8, sail = false, cargoColor = PALETTE.gold } = options;
    const y = 5;

    fillRect1x1(builder, x0 + 1, y, z0 + 1, width - 2, 1, PALETTE.boat);
    fillRect1x1(builder, x0 + 2, y, z0, width - 4, 1, PALETTE.boatDark);
    fillRect1x1(builder, x0 + 2, y, z0 + 2, width - 4, 1, PALETTE.boatDark);
    builder.add("1x1", PALETTE.boatDark, 0, x0, y, z0 + 1);
    builder.add("1x1", PALETTE.boatDark, 0, x0 + width - 1, y, z0 + 1);

    fillRect1x1(builder, x0 + 2, y + 1, z0 + 1, width - 4, 1, PALETTE.boat);
    builder.add("1x1", cargoColor, 0, x0 + 2, y + 1, z0 + 1);
    builder.add("1x1", cargoColor, 0, x0 + width - 3, y + 1, z0 + 1);

    if (sail) {
        const mastX = x0 + Math.floor(width / 2);
        addPillarStackSafe(builder, mastX, y + 2, z0 + 1, 5, PALETTE.trunkDark);
        fillRect1x1(builder, mastX - 2, y + 4, z0 + 1, 3, 1, PALETTE.sail);
        fillRect1x1(builder, mastX - 1, y + 5, z0 + 1, 2, 1, PALETTE.sail);
    }
}

function addPalmClusters(builder) {
    [
        [9, 4, 16, 8, 1, -1],
        [14, 4, 18, 9, 2, 1],
        [19, 4, 15, 7, -1, 1],
        [24, 4, 19, 8, 1, 2],
        [68, 4, 16, 8, -1, 1],
        [73, 4, 19, 9, 1, -1],
        [78, 4, 16, 8, -1, 0],
        [83, 4, 18, 7, 1, 1],
        [70, 4, 28, 8, -2, 1],
        [81, 4, 30, 9, 1, -2],
    ].forEach(([x, y, z, height, leanX, leanZ]) => {
        addOptimizedRect(builder, x - 2, 3, z - 2, 4, 4, PALETTE.green);
        addTallPalm(builder, x, y, z, { height, leanX, leanZ });
    });

    addRockOrUrnScatter(builder, [
        [7, 14, PALETTE.greenLight],
        [12, 15, PALETTE.greenLight],
        [17, 13, PALETTE.greenLight],
        [22, 15, PALETTE.greenLight],
        [69, 14, PALETTE.greenLight],
        [75, 15, PALETTE.greenLight],
        [84, 14, PALETTE.greenLight],
        [72, 27, PALETTE.greenLight],
        [79, 29, PALETTE.greenLight],
        [85, 31, PALETTE.greenLight],
    ]);
}

function addMainPyramid(builder) {
    addOptimizedRect(builder, 6, 4, 34, 46, 44, PALETTE.sandLight);
    addBorder1x1(builder, 6, 5, 34, 46, 44, PALETTE.sandShadow);
    addPyramidCourses(builder, 8, 5, 36, getPyramidSizes(42, 24), {
        hollowMinSize: 18,
        wallThickness: 2,
    });

    addRockOrUrnScatter(builder, [
        [8, 5 + 1, PALETTE.sandDark],
        [49, 5 + 1, PALETTE.sandDark],
        [9, 35, PALETTE.sandDark, 2],
        [48, 35, PALETTE.sandDark, 2],
    ]);
}

function addSmallPyramids(builder) {
    addOptimizedRect(builder, 12, 4, 16, 20, 14, PALETTE.sandLight);
    addBorder1x1(builder, 12, 5, 16, 20, 14, PALETTE.sandShadow);
    addPyramidCourses(builder, 15, 5, 17, getPyramidSizes(16, 10));

    addOptimizedRect(builder, 30, 4, 18, 14, 12, PALETTE.sandLight);
    addBorder1x1(builder, 30, 5, 18, 14, 12, PALETTE.sandShadow);
    addPyramidCourses(builder, 31, 5, 19, getPyramidSizes(12, 8));
}

function addTempleGate(builder) {
    addOptimizedRect(builder, 44, 4, 18, 26, 14, PALETTE.sandDark);
    addOptimizedRect(builder, 46, 5, 19, 22, 12, PALETTE.sandLight);
    addOptimizedRect(builder, 50, 4, 12, 14, 4, PALETTE.sandLight);

    for (let step = 0; step < 5; step++) {
        fillRect1x1(builder, 48 + step, 4 + step, 14 + step, 18 - step * 2, 2, step % 2 === 0 ? PALETTE.calciteWarm : PALETTE.sandLight);
    }

    fillRect1x1(builder, 48, 4, 14, 2, 8, PALETTE.sandShadow);
    fillRect1x1(builder, 64, 4, 14, 2, 8, PALETTE.sandShadow);
    fillRect1x1(builder, 49, 5, 15, 2, 7, PALETTE.calciteCool);
    fillRect1x1(builder, 63, 5, 15, 2, 7, PALETTE.calciteCool);

    for (let level = 0; level < 7; level++) {
        addOptimizedRect(builder, 46 + Math.floor(level / 2), 6 + level, 18 + level, 8 - Math.floor(level / 2), 13 - level, level % 2 === 0 ? PALETTE.calciteWarm : PALETTE.calcite);
        addOptimizedRect(builder, 62, 6 + level, 18 + level, 8 - Math.floor(level / 2), 13 - level, level % 2 === 0 ? PALETTE.calciteWarm : PALETTE.calcite);
    }

    for (let y = 6; y <= 12; y++) {
        fillRect1x1(builder, 54, y, 22, 2, 4, PALETTE.calcite);
        fillRect1x1(builder, 60, y, 22, 2, 4, PALETTE.calcite);
    }

    addOptimizedRect(builder, 54, 6, 26, 8, 6, PALETTE.calciteWarm);
    addOptimizedRect(builder, 54, 7, 27, 8, 5, PALETTE.calcite);
    addOptimizedRect(builder, 54, 8, 28, 8, 4, PALETTE.calciteCool);
    fillRect1x1(builder, 54, 13, 24, 8, 2, PALETTE.calcite);

    addBorder1x1(builder, 46, 13, 22, 8, 2, PALETTE.calcite);
    addBorder1x1(builder, 54, 13, 24, 8, 2, PALETTE.calcite);
    addBorder1x1(builder, 62, 13, 22, 8, 2, PALETTE.calcite);

    [46, 48, 50, 52, 62, 64, 66, 68].forEach((x) => builder.add("1x1", PALETTE.calcite, 0, x, 14, 22));
    [54, 56, 58, 60].forEach((x) => builder.add("1x1", PALETTE.calcite, 0, x, 14, 24));

    builder.add("1x1", PALETTE.shadow, 0, 55, 6, 28);
    builder.add("1x1", PALETTE.statue, 0, 56, 7, 28);
    builder.add("1x1", PALETTE.statue, 0, 56, 8, 28);
    builder.add("1x1", PALETTE.statue, 0, 57, 8, 28);
    builder.add("1x1", PALETTE.statue, 0, 56, 9, 28);
    builder.add("1x1", PALETTE.gold, 0, 57, 10, 28);

    addRockOrUrnScatter(builder, [
        [47, 16, PALETTE.sandDark, 2],
        [67, 16, PALETTE.sandDark, 2],
        [52, 13, PALETTE.greenLight],
        [60, 13, PALETTE.greenLight],
    ]);
}

function addObelisk(builder) {
    addOptimizedRect(builder, 70, 4, 20, 14, 14, PALETTE.sandDark);
    addOptimizedRect(builder, 72, 5, 22, 10, 10, PALETTE.sandLight);
    addOptimizedRect(builder, 74, 6, 24, 6, 6, PALETTE.calciteWarm);

    for (let y = 7; y <= 22; y++) {
        builder.add("2x2", y % 3 === 0 ? PALETTE.calciteCool : PALETTE.calcite, 0, 76, y, 26);
    }

    builder.add("1x1", PALETTE.calciteWarm, 0, 76, 23, 26);
    builder.add("1x1", PALETTE.calciteWarm, 0, 76, 24, 26);
    builder.add("1x1", PALETTE.brightGold, 0, 76, 25, 26);

    addRockOrUrnScatter(builder, [
        [72, 23, PALETTE.greenLight],
        [73, 28, PALETTE.greenLight],
        [82, 24, PALETTE.greenLight],
        [81, 30, PALETTE.greenLight],
        [75, 21, PALETTE.sandDark, 2],
        [80, 31, PALETTE.sandDark, 2],
    ]);
}

function addGroundDetails(builder) {
    addOptimizedRect(builder, 4, 3, 12, 22, 12, PALETTE.green);
    addOptimizedRect(builder, 66, 3, 12, 22, 11, PALETTE.green);
    addOptimizedRect(builder, 71, 3, 24, 17, 12, PALETTE.green);
    addOptimizedRect(builder, 34, 3, 14, 18, 6, PALETTE.sandLight);

    addRockOrUrnScatter(builder, [
        [5, 20, PALETTE.greenLight],
        [9, 22, PALETTE.greenLight],
        [14, 13, PALETTE.greenLight],
        [18, 21, PALETTE.greenLight],
        [23, 14, PALETTE.greenLight],
        [67, 20, PALETTE.greenLight],
        [72, 14, PALETTE.greenLight],
        [77, 17, PALETTE.greenLight],
        [84, 20, PALETTE.greenLight],
        [85, 26, PALETTE.greenLight],
        [7, 23, PALETTE.sandDark],
        [11, 24, PALETTE.sandDark],
        [20, 23, PALETTE.sandDark],
        [70, 24, PALETTE.sandDark],
        [81, 24, PALETTE.sandDark],
        [86, 28, PALETTE.sandDark],
    ]);
}

function buildGrandePiramideDeGiza() {
    const builder = createPrefabBuilder();

    addDisplayBase(builder);
    addCanalWater(builder);
    addGroundDetails(builder);
    addMainPyramid(builder);
    addSmallPyramids(builder);
    addTempleGate(builder);
    addObelisk(builder);
    addPalmClusters(builder);
    addBoat(builder, 10, 5, { width: 6, cargoColor: PALETTE.boatDark });
    addBoat(builder, 76, 5, { width: 8, sail: true, cargoColor: PALETTE.calciteWarm });

    return builder.blocks;
}

const GrandePiramideDeGiza = {
    dx: ENVELOPE.dx,
    dy: ENVELOPE.dy,
    dz: ENVELOPE.dz,
    blocks: buildGrandePiramideDeGiza(),
};

export default GrandePiramideDeGiza;