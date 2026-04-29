import {
    addEllipseBandSafe,
    addEllipseOfBlocksSafe,
    addFilledRectSafe,
    addPillarStackSafe,
    createPrefabBuilder,
    getEllipsePoints,
} from "../shared/core.js";

const ENVELOPE = {
    dx: 56,
    dy: 32,
    dz: 56,
};

const CENTER = {
    x: 28,
    z: 33,
};

const PALETTE = {
    baseDark: "#22252c",
    baseMid: "#6c727d",
    plaza: "#d9d7d0",
    road: "#8c8f97",
    roadDark: "#6f747d",
    roadLight: "#b7bcc4",
    grass: "#237841",
    grassLight: "#3f7f46",
    shrub: "#1e5c32",
    stone: "#daccb0",
    stoneLight: "#e3d9bd",
    stoneShadow: "#b89b5c",
    trim: "#f4f4f4",
    roof: "#c74e24",
    roofDark: "#a94a22",
    roofLight: "#d67a34",
    wood: "#8b5a2b",
    woodDark: "#6b4b34",
    gold: "#f2cd37",
    treeTrunk: "#6b4b34",
    leaf: "#237841",
    leafLight: "#3f7f46",
    flowerPink: "#ff9ecd",
    flowerWhite: "#f4f4f4",
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

function addDisk1x1(builder, spec) {
    const {
        y,
        outerRadius,
        color,
        innerRadius = -1,
        cx = CENTER.x,
        cz = CENTER.z,
        minX = 0,
        maxX = ENVELOPE.dx - 1,
        minZ = 0,
        maxZ = ENVELOPE.dz - 1,
        shouldSkip = null,
    } = spec;

    const startX = Math.max(minX, Math.floor(cx - outerRadius - 1));
    const endX = Math.min(maxX, Math.ceil(cx + outerRadius));
    const startZ = Math.max(minZ, Math.floor(cz - outerRadius - 1));
    const endZ = Math.min(maxZ, Math.ceil(cz + outerRadius));

    for (let x = startX; x <= endX; x++) {
        for (let z = startZ; z <= endZ; z++) {
            const dx = x - cx;
            const dz = z - cz;
            const distSq = dx * dx + dz * dz;

            if (distSq > outerRadius * outerRadius) continue;
            if (innerRadius >= 0 && distSq < innerRadius * innerRadius) continue;
            if (shouldSkip?.(x, y, z)) continue;

            builder.add("1x1", color, 0, x, y, z);
        }
    }
}

function getRoofRotation(point) {
    const angle = (point.angle + Math.PI * 2) % (Math.PI * 2);

    if (angle >= Math.PI / 4 && angle < (3 * Math.PI) / 4) return 1;
    if (angle >= (3 * Math.PI) / 4 && angle < (5 * Math.PI) / 4) return 2;
    if (angle >= (5 * Math.PI) / 4 && angle < (7 * Math.PI) / 4) return 3;
    return 0;
}

function addRingTrim(builder, spec) {
    const { y, radii, count, color, offset = 0.5, type = "1x1" } = spec;
    addEllipseOfBlocksSafe(builder, type, color, CENTER, radii, {
        y,
        count,
        offset,
        rotFn: type === "Roof 1x2" ? getRoofRotation : 0,
    });
}

function addLowPost(builder, x, z) {
    for (let y = 3; y <= 6; y++) {
        builder.add("1x1", PALETTE.trim, 0, x, y, z);
    }
    builder.add("1x1", PALETTE.gold, 0, x, 7, z);
}

function addFlowerPatch(builder, x0, z0) {
    [
        [x0, z0, PALETTE.flowerPink],
        [x0 + 1, z0 + 1, PALETTE.flowerWhite],
        [x0 + 2, z0, PALETTE.flowerWhite],
        [x0 + 1, z0 - 1, PALETTE.flowerPink],
    ].forEach(([x, z, color]) => {
        builder.add("1x1", color, 0, x, 4, z);
        builder.add("1x1", PALETTE.grassLight, 0, x, 3, z);
    });
}

function addRoadDetails(builder) {
    for (let x = 4; x <= 50; x += 3) {
        const z = x % 2 === 0 ? 6 : 9;
        builder.add("1x1", PALETTE.roadLight, 0, x, 4, z);
        if (x + 1 <= 51) builder.add("1x1", PALETTE.roadDark, 0, x + 1, 4, z + 2);
    }

    for (let x = 7; x <= 48; x += 5) {
        builder.add("1x1", PALETTE.trim, 0, x, 4, 13);
    }
}

function addFrontPedestal(builder) {
    addOptimizedRect(builder, 24, 4, 11, 8, 8, PALETTE.trim);
    addOptimizedRect(builder, 25, 4, 12, 6, 6, PALETTE.plaza);
    addOptimizedRect(builder, 26, 5, 13, 4, 4, PALETTE.grassLight);
    builder.add("2x2", PALETTE.trim, 0, 27, 6, 14);
    builder.add("1x1", PALETTE.stoneShadow, 0, 28, 7, 15);
    builder.add("1x1", PALETTE.gold, 0, 28, 8, 15);
}

function addShrubBorder(builder) {
    const clumps = [
        { x: 5, z0: 18, heights: [3, 5, 4, 6, 5, 4] },
        { x: 7, z0: 19, heights: [4, 6, 5, 7, 5, 4] },
        { x: 9, z0: 17, heights: [3, 4, 5, 4, 6, 5] },
    ];

    clumps.forEach(({ x, z0, heights }) => {
        heights.forEach((height, index) => {
            const z = z0 + index * 3;
            for (let y = 4; y < 4 + height; y++) {
                builder.add("1x1", y % 2 === 0 ? PALETTE.grass : PALETTE.shrub, 0, x, y, z);
            }
        });
    });
}

function addSceneTree(builder, trunkX, trunkZ) {
    addPillarStackSafe(builder, trunkX, 4, trunkZ, 6, PALETTE.treeTrunk);
    builder.add("1x1", PALETTE.treeTrunk, 0, trunkX - 1, 5, trunkZ);
    builder.add("1x1", PALETTE.treeTrunk, 0, trunkX, 6, trunkZ - 1);
    builder.add("1x1", PALETTE.treeTrunk, 0, trunkX + 1, 6, trunkZ);

    [
        [trunkX - 2, trunkZ - 2, 9, PALETTE.leaf],
        [trunkX, trunkZ - 2, 9, PALETTE.leafLight],
        [trunkX + 2, trunkZ - 1, 9, PALETTE.leaf],
        [trunkX - 4, trunkZ, 9, PALETTE.leafLight],
        [trunkX - 2, trunkZ, 9, PALETTE.leaf],
        [trunkX, trunkZ, 10, PALETTE.leaf],
        [trunkX + 2, trunkZ, 9, PALETTE.leafLight],
        [trunkX + 4, trunkZ, 9, PALETTE.leaf],
        [trunkX - 2, trunkZ + 2, 9, PALETTE.leafLight],
        [trunkX, trunkZ + 2, 9, PALETTE.leaf],
        [trunkX + 2, trunkZ + 2, 9, PALETTE.leafLight],
    ].forEach(([x, z, y, color]) => {
        builder.add("2x2", color, 0, x, y, z);
    });

    builder.add("2x2", PALETTE.leaf, 0, trunkX - 1, 11, trunkZ - 1);
    builder.add("1x1", PALETTE.roofLight, 0, trunkX + 4, 8, trunkZ + 1);
}

function addBenchOrCart(builder, x0, z0) {
    addOptimizedRect(builder, x0 - 1, 4, z0 - 1, 10, 6, PALETTE.grassLight);
    fillRect1x1(builder, x0, 5, z0, 8, 4, PALETTE.woodDark);
    fillRect1x1(builder, x0 + 1, 6, z0 + 1, 6, 2, PALETTE.wood);

    [
        [x0, z0],
        [x0 + 7, z0],
        [x0, z0 + 3],
        [x0 + 7, z0 + 3],
    ].forEach(([x, z]) => {
        builder.add("1x1", PALETTE.woodDark, 0, x, 4, z);
        builder.add("1x1", PALETTE.woodDark, 0, x, 5, z);
        builder.add("1x1", PALETTE.woodDark, 0, x, 6, z);
    });

    [
        [x0 + 1, z0],
        [x0 + 3, z0],
        [x0 + 5, z0],
        [x0 + 1, z0 + 3],
        [x0 + 3, z0 + 3],
        [x0 + 5, z0 + 3],
    ].forEach(([x, z]) => builder.add("1x1", PALETTE.wood, 0, x, 7, z));

    builder.add("Tile 2x2", PALETTE.grass, 0, x0 + 3, 6, z0 + 1);
    builder.add("1x1", PALETTE.flowerWhite, 0, x0 + 4, 7, z0 + 2);
    builder.add("1x1", PALETTE.flowerPink, 0, x0 + 5, 7, z0 + 1);
    builder.add("1x1", PALETTE.roadDark, 0, x0 + 1, 4, z0 - 1);
    builder.add("1x1", PALETTE.roadDark, 0, x0 + 6, 4, z0 - 1);
}

function addDioramaBase(builder) {
    addOptimizedRect(builder, 0, 0, 0, ENVELOPE.dx, ENVELOPE.dz, PALETTE.baseDark);
    addOptimizedRect(builder, 1, 1, 1, ENVELOPE.dx - 2, ENVELOPE.dz - 2, PALETTE.baseMid);
    addOptimizedRect(builder, 2, 2, 2, ENVELOPE.dx - 4, ENVELOPE.dz - 4, PALETTE.plaza);

    addOptimizedRect(builder, 2, 3, 2, 52, 12, PALETTE.road);
    addOptimizedRect(builder, 2, 3, 15, 12, 30, PALETTE.grass);
    addOptimizedRect(builder, 42, 3, 15, 12, 30, PALETTE.grass);
    addOptimizedRect(builder, 14, 3, 50, 28, 4, PALETTE.grass);
    addOptimizedRect(builder, 20, 3, 15, 16, 3, PALETTE.plaza);

    addRoadDetails(builder);
    addFrontPedestal(builder);
    addShrubBorder(builder);

    [
        [4, 16], [4, 26], [4, 36], [4, 46],
        [52, 16], [52, 26], [52, 36], [52, 46],
        [18, 52], [28, 52], [38, 52],
    ].forEach(([x, z]) => addLowPost(builder, x, z));

    addFlowerPatch(builder, 7, 42);
    addFlowerPatch(builder, 11, 19);
    addFlowerPatch(builder, 45, 41);
    addFlowerPatch(builder, 49, 18);
    addFlowerPatch(builder, 44, 14);

    addSceneTree(builder, 48, 30);
    addBenchOrCart(builder, 44, 10);
}

function addPodium(builder) {
    addEllipseBandSafe(builder, CENTER, { x: 18.2, z: 18.2 }, { y: 4, color: PALETTE.stoneShadow, type: "2x2" });
    addEllipseBandSafe(builder, CENTER, { x: 16.8, z: 16.8 }, { y: 5, color: PALETTE.stone, type: "2x2" });
    addEllipseBandSafe(builder, CENTER, { x: 15.4, z: 15.4 }, { y: 6, color: PALETTE.trim, type: "2x2" });

    addDisk1x1(builder, { y: 4, outerRadius: 18.8, innerRadius: 17.0, color: PALETTE.stoneShadow });
    addDisk1x1(builder, { y: 5, outerRadius: 17.2, innerRadius: 15.4, color: PALETTE.stoneLight });
    addDisk1x1(builder, { y: 6, outerRadius: 15.8, innerRadius: 14.2, color: PALETTE.trim });
    addDisk1x1(builder, { y: 7, outerRadius: 6.4, color: PALETTE.plaza });

    fillRect1x1(builder, 19, 4, 10, 18, 3, PALETTE.stoneShadow);
    fillRect1x1(builder, 21, 5, 13, 14, 3, PALETTE.stone);
    fillRect1x1(builder, 23, 6, 15, 10, 2, PALETTE.trim);

    [
        [19, 18], [35, 18], [20, 20], [34, 20],
    ].forEach(([x, z]) => {
        builder.add("2x2", PALETTE.trim, 0, x, 7, z);
        builder.add("1x1", PALETTE.gold, 0, x, 8, z);
    });
}

function addColumn(builder, x, z) {
    builder.add("1x1", PALETTE.stoneShadow, 0, x, 7, z);
    addPillarStackSafe(builder, x, 8, z, 9, PALETTE.trim);
    builder.add("1x1", PALETTE.stoneLight, 0, x, 17, z);
    builder.add("1x1", PALETTE.stoneShadow, 0, x, 18, z);
}

function addRadialColumns(builder) {
    const points = getEllipsePoints(CENTER, { x: 15, z: 15 }, {
        count: 24,
        offset: 0.5,
    });

    points.forEach((point) => addColumn(builder, point.lx, point.lz));
}

function addCellaWalls(builder) {
    const skipDoor = (x, y, z) => z <= 24 && z >= 23 && x >= 25 && x <= 30 && y <= 15;

    for (let y = 7; y <= 16; y++) {
        addDisk1x1(builder, {
            y,
            outerRadius: 9.8,
            innerRadius: 7.2,
            color: y >= 15 ? PALETTE.stoneLight : PALETTE.stone,
            shouldSkip: skipDoor,
        });
    }

    addDisk1x1(builder, {
        y: 17,
        outerRadius: 10.2,
        innerRadius: 6.8,
        color: PALETTE.stoneShadow,
    });

    for (let y = 7; y <= 15; y++) {
        for (let z = 23; z <= 24; z++) {
            for (let x = 26; x <= 29; x++) {
                const color = x === 27 || x === 28 ? PALETTE.wood : PALETTE.woodDark;
                builder.add("1x1", color, 0, x, y, z);
            }
        }
    }

    for (let y = 7; y <= 16; y++) {
        builder.add("1x1", PALETTE.trim, 0, 25, y, 24);
        builder.add("1x1", PALETTE.trim, 0, 30, y, 24);
    }

    [26, 27, 28, 29].forEach((x) => {
        builder.add("1x1", PALETTE.leafLight, 0, x, 16, 24);
        builder.add("1x1", PALETTE.gold, 0, x, 17, 24);
    });

    builder.add("1x1", PALETTE.gold, 0, 27, 10, 23);
    builder.add("1x1", PALETTE.gold, 0, 28, 10, 23);

    getEllipsePoints(CENTER, { x: 9.2, z: 9.2 }, { count: 12, offset: 0.25 }).forEach((point, index) => {
        const accentColor = index % 2 === 0 ? PALETTE.trim : PALETTE.stoneShadow;
        builder.add("1x1", accentColor, 0, point.lx, 12, point.lz);
        builder.add("1x1", accentColor, 0, point.lx, 14, point.lz);
    });
}

function addEntablature(builder) {
    addEllipseBandSafe(builder, CENTER, { x: 17.2, z: 17.2 }, {
        y: 18,
        inner: { x: 12, z: 12 },
        color: PALETTE.stoneShadow,
        type: "2x2",
    });
    addEllipseBandSafe(builder, CENTER, { x: 17.8, z: 17.8 }, {
        y: 19,
        inner: { x: 12.8, z: 12.8 },
        color: PALETTE.stoneLight,
        type: "2x2",
    });
    addEllipseBandSafe(builder, CENTER, { x: 17.4, z: 17.4 }, {
        y: 20,
        inner: { x: 13.4, z: 13.4 },
        color: PALETTE.trim,
        type: "2x2",
    });

    addRingTrim(builder, {
        y: 19,
        radii: { x: 16.3, z: 16.3 },
        count: 28,
        color: PALETTE.stoneShadow,
    });
    addRingTrim(builder, {
        y: 20,
        radii: { x: 16.9, z: 16.9 },
        count: 32,
        color: PALETTE.trim,
    });

    addDisk1x1(builder, {
        y: 21,
        outerRadius: 17.1,
        color: PALETTE.trim,
    });

    addRingTrim(builder, {
        y: 22,
        radii: { x: 15.4, z: 15.4 },
        count: 36,
        color: PALETTE.trim,
    });
}

function addRoofTier(builder, spec) {
    const { y, fillRadius, edgeRadius, fillColor, edgeColor, edgeCount } = spec;

    addRingTrim(builder, {
        y,
        radii: { x: edgeRadius, z: edgeRadius },
        count: edgeCount,
        color: edgeColor,
        offset: 0.5,
        type: "Roof 1x2",
    });

    addDisk1x1(builder, {
        y,
        outerRadius: fillRadius,
        color: fillColor,
    });
}

function addRoof(builder) {
    addRoofTier(builder, {
        y: 22,
        fillRadius: 13.8,
        edgeRadius: 14.5,
        fillColor: PALETTE.roofLight,
        edgeColor: PALETTE.roofDark,
        edgeCount: 24,
    });
    addRoofTier(builder, {
        y: 23,
        fillRadius: 12.8,
        edgeRadius: 13.4,
        fillColor: PALETTE.roof,
        edgeColor: PALETTE.roofLight,
        edgeCount: 24,
    });
    addRoofTier(builder, {
        y: 24,
        fillRadius: 11.7,
        edgeRadius: 12.3,
        fillColor: PALETTE.roofLight,
        edgeColor: PALETTE.roofDark,
        edgeCount: 20,
    });

    addDisk1x1(builder, { y: 25, outerRadius: 10.4, color: PALETTE.roofDark });
    addDisk1x1(builder, { y: 26, outerRadius: 9.2, color: PALETTE.roofLight });
    addDisk1x1(builder, { y: 27, outerRadius: 7.8, color: PALETTE.roofDark });
    addDisk1x1(builder, { y: 28, outerRadius: 6.2, color: PALETTE.roofLight });
    addDisk1x1(builder, { y: 29, outerRadius: 4.4, color: PALETTE.roofDark });

    builder.add("2x2", PALETTE.trim, 0, 27, 30, 32);
    builder.add("2x2", PALETTE.trim, 0, 27, 31, 32);
    builder.add("1x1", PALETTE.gold, 0, 28, 30, 33);
    builder.add("1x1", PALETTE.trim, 0, 28, 31, 33);
}

function addTempleDetails(builder) {
    [
        [20, 20], [36, 20],
        [18, 26], [38, 26],
    ].forEach(([x, z]) => {
        builder.add("2x2", PALETTE.trim, 0, x, 7, z);
        builder.add("1x1", PALETTE.stoneShadow, 0, x, 8, z);
        builder.add("1x1", PALETTE.gold, 0, x, 9, z);
    });

    [
        [22, 19], [28, 18], [34, 19],
    ].forEach(([x, z]) => {
        builder.add("1x1", PALETTE.trim, 0, x, 19, z);
        builder.add("1x1", PALETTE.trim, 0, x, 20, z);
    });
}

function buildTemploRomanoCircular() {
    const builder = createPrefabBuilder();

    addDioramaBase(builder);
    addPodium(builder);
    addRadialColumns(builder);
    addCellaWalls(builder);
    addEntablature(builder);
    addRoof(builder);
    addTempleDetails(builder);

    return builder.blocks;
}

const TemploRomanoCircular = {
    dx: ENVELOPE.dx,
    dy: ENVELOPE.dy,
    dz: ENVELOPE.dz,
    blocks: buildTemploRomanoCircular(),
};

export default TemploRomanoCircular;