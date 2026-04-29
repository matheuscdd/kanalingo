import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

const PALETTE = {
    cobble: "#7e786f",
    cobbleDark: "#5f5a53",
    foundation: "#9f9484",
    streetLight: "#b1a79a",
    iron: "#2f2d2a",
    shadow: "#2b2723",
    roofTile: "#b96c39",
    roofDark: "#4c2515",
    glass: "#a8c6d5",
    plantGreen: "#3f6c34",
    flowerRed: "#cb4338",
    flowerYellow: "#d7a92d",
    lampGlow: "#d9bc6a",
};

const FACADES = [
    {
        x0: 2,
        x1: 13,
        baseColor: "#c98d39",
        facadeColor: "#d9ad50",
        trim: "#f3e7d1",
        shutter: "#355f34",
        door: "#5a3423",
        groundWindows: [9, 11],
        upperWindows: [4, 8, 11],
        backGroundWindows: [5, 10],
        backUpperWindows: [5, 8, 10],
        doorRange: [5, 6],
        thirdWindowY: 13,
        roofBaseY: 16,
        balconyRows: [{ x0: 4, x1: 10, y: 7 }],
        flower: "#cb4338",
        accent: "flat",
    },
    {
        x0: 14,
        x1: 27,
        baseColor: "#31758a",
        facadeColor: "#4f9cb2",
        trim: "#f5edde",
        shutter: "#244e5b",
        door: "#57301d",
        groundWindows: [16, 24],
        upperWindows: [17, 21, 24],
        backGroundWindows: [17, 24],
        backUpperWindows: [17, 21, 24],
        doorRange: [20, 21],
        thirdWindowY: 13,
        roofBaseY: 17,
        balconyRows: [{ x0: 18, x1: 23, y: 7 }, { x0: 19, x1: 22, y: 12 }],
        flower: "#d7a92d",
        accent: "pediment",
    },
    {
        x0: 28,
        x1: 39,
        baseColor: "#c8695f",
        facadeColor: "#dd8576",
        trim: "#f8ecdf",
        shutter: "#637d35",
        door: "#533221",
        groundWindows: [35, 37],
        upperWindows: [31, 35, 37],
        backGroundWindows: [31, 36],
        backUpperWindows: [31, 35],
        doorRange: [31, 32],
        thirdWindowY: 12,
        roofBaseY: 15,
        balconyRows: [{ x0: 33, x1: 37, y: 7 }],
        flower: "#cb4338",
        accent: "arched",
    },
];

const CHURCH = {
    x0: 40,
    x1: 53,
    naveX1: 49,
    frontZ0: 5,
    frontZ1: 6,
    backZ0: 12,
    backZ1: 13,
    roofBaseY: 15,
    towerX0: 50,
    towerX1: 53,
    towerTopY: 22,
    bodyColor: "#eadfce",
    trim: "#fff5e8",
    accent: "#d6b86e",
    door: "#5e3924",
    roofTile: "#b86a3d",
    roofDark: "#4d2416",
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

    if (depth % 2 !== 0) {
        for (let x = x0; x < x0 + evenWidth; x++) {
            builder.add("1x1", color, 0, x, y, maxZ);
        }
    }

    if (width % 2 !== 0) {
        for (let z = z0; z < z0 + evenDepth; z++) {
            builder.add("1x1", color, 0, maxX, y, z);
        }
    }

    if (width % 2 !== 0 && depth % 2 !== 0) {
        builder.add("1x1", color, 0, maxX, y, maxZ);
    }
}

function addBand(builder, x0, x1, z0, z1, y, color) {
    addOptimizedRect(builder, x0, y, z0, x1 - x0 + 1, z1 - z0 + 1, color);
}

function addSegmentsX(builder, segments, z0, z1, y, color) {
    segments.forEach(([x0, x1]) => addBand(builder, x0, x1, z0, z1, y, color));
}

function addSegmentsZ(builder, segments, x0, x1, y, color) {
    segments.forEach(([z0, z1]) => addBand(builder, x0, x1, z0, z1, y, color));
}

function getSegments(start, end, gaps) {
    if (!gaps.length) return [[start, end]];

    const segments = [];
    const sorted = [...gaps].sort((left, right) => left[0] - right[0]);
    let cursor = start;

    sorted.forEach(([gapStart, gapEnd]) => {
        if (gapStart > cursor) segments.push([cursor, gapStart - 1]);
        cursor = Math.max(cursor, gapEnd + 1);
    });

    if (cursor <= end) segments.push([cursor, end]);
    return segments;
}

function addStoryWallX(builder, xRange, zRange, yRange, color, openings = []) {
    for (let y = yRange.start; y <= yRange.end; y++) {
        const gaps = openings
            .filter((opening) => y >= opening.y0 && y <= opening.y1)
            .map((opening) => [opening.start, opening.end]);
        addSegmentsX(builder, getSegments(xRange.start, xRange.end, gaps), zRange.start, zRange.end, y, color);
    }
}

function addStoryWallZ(builder, zRange, xRange, yRange, color, openings = []) {
    for (let y = yRange.start; y <= yRange.end; y++) {
        const gaps = openings
            .filter((opening) => y >= opening.y0 && y <= opening.y1)
            .map((opening) => [opening.start, opening.end]);
        addSegmentsZ(builder, getSegments(zRange.start, zRange.end, gaps), xRange.start, xRange.end, y, color);
    }
}

function addDoor(builder, facade) {
    const [doorStart, doorEnd] = facade.doorRange;

    for (let y = 2; y <= 5; y++) {
        for (let x = doorStart; x <= doorEnd; x++) {
            builder.add("1x1", facade.door, 0, x, y, 5);
            builder.add("1x1", y === 5 ? PALETTE.shadow : facade.door, 0, x, y, 6);
        }
    }

    for (let y = 2; y <= 5; y++) {
        builder.add("1x1", facade.trim, 0, doorStart - 1, y, 4);
        builder.add("1x1", facade.trim, 0, doorEnd + 1, y, 4);
    }

    for (let x = doorStart - 1; x <= doorEnd + 1; x++) {
        builder.add("1x1", facade.trim, 0, x, 6, 4);
        builder.add("1x1", PALETTE.foundation, 0, x, 1, 4);
    }

    builder.add("1x1", PALETTE.shadow, 0, doorStart, 5, 4);
    builder.add("1x1", PALETTE.shadow, 0, doorEnd, 5, 4);
}

function addFrontWindow(builder, facade, x, y, back = false) {
    const windowZ = back ? 12 : 5;
    const trimZ = back ? 14 : 4;
    const leftLimit = facade.x0 + 1;
    const rightLimit = facade.x1 - 1;

    builder.add("Window", PALETTE.glass, 0, x, y, windowZ);
    builder.add("1x1", facade.trim, 0, x, y - 1, trimZ);
    builder.add("1x1", facade.trim, 0, x, y, trimZ);
    builder.add("1x1", facade.trim, 0, x, y + 1, trimZ);
    builder.add("1x1", facade.trim, 0, x, y + 2, trimZ);

    if (x - 1 >= leftLimit) {
        builder.add("1x1", facade.shutter, 0, x - 1, y, trimZ);
        builder.add("1x1", facade.shutter, 0, x - 1, y + 1, trimZ);
    }

    if (x + 1 <= rightLimit) {
        builder.add("1x1", facade.shutter, 0, x + 1, y, trimZ);
        builder.add("1x1", facade.shutter, 0, x + 1, y + 1, trimZ);
    }
}

function addSideWindow(builder, x, y, z) {
    builder.add("Window", PALETTE.glass, 1, x, y, z);
}

function addBalcony(builder, facade, balcony) {
    addOptimizedRect(builder, balcony.x0, balcony.y, 3, balcony.x1 - balcony.x0 + 1, 2, facade.trim);

    for (let x = balcony.x0; x <= balcony.x1; x++) {
        builder.add("1x1", PALETTE.iron, 0, x, balcony.y + 1, 2);
    }

    for (let z = 2; z <= 4; z++) {
        builder.add("1x1", PALETTE.iron, 0, balcony.x0, balcony.y + 1, z);
        builder.add("1x1", PALETTE.iron, 0, balcony.x1, balcony.y + 1, z);
    }

    for (let x = balcony.x0 + 1; x <= balcony.x1 - 1; x += 2) {
        builder.add("1x1", PALETTE.shadow, 0, x, balcony.y - 1, 4);
    }

    builder.add("1x1", PALETTE.plantGreen, 0, balcony.x0 + 1, balcony.y + 1, 3);
    builder.add("1x1", facade.flower, 0, balcony.x0 + 1, balcony.y + 2, 3);
    builder.add("1x1", PALETTE.plantGreen, 0, balcony.x1 - 1, balcony.y + 1, 3);
    builder.add("1x1", facade.flower, 0, balcony.x1 - 1, balcony.y + 2, 3);
}

function addCornice(builder, facade, y) {
    for (let x = facade.x0; x <= facade.x1; x++) {
        builder.add("1x1", facade.trim, 0, x, y, 4);
    }
}

function addFrontAccent(builder, facade) {
    addCornice(builder, facade, 6);
    addCornice(builder, facade, 11);
    addCornice(builder, facade, facade.roofBaseY - 1);

    addPillarStackSafe(builder, facade.x0, 2, 4, facade.roofBaseY - 1, facade.trim);
    addPillarStackSafe(builder, facade.x1, 2, 4, facade.roofBaseY - 1, facade.trim);

    if (facade.accent === "pediment") {
        for (let x = facade.x0 + 3; x <= facade.x1 - 3; x++) {
            builder.add("1x1", facade.trim, 0, x, facade.roofBaseY, 4);
        }
        for (let x = facade.x0 + 5; x <= facade.x1 - 5; x++) {
            builder.add("1x1", facade.trim, 0, x, facade.roofBaseY + 1, 4);
        }
        builder.add("1x1", facade.trim, 0, Math.floor((facade.x0 + facade.x1) / 2), facade.roofBaseY + 2, 4);
    }

    if (facade.accent === "arched") {
        for (let x = facade.x0 + 3; x <= facade.x1 - 3; x++) {
            builder.add("1x1", facade.trim, 0, x, facade.roofBaseY, 4);
        }
        builder.add("1x1", facade.trim, 0, facade.x0 + 5, facade.roofBaseY + 1, 4);
        builder.add("1x1", facade.trim, 0, facade.x1 - 5, facade.roofBaseY + 1, 4);
    }

    if (facade.accent === "flat") {
        builder.add("1x1", facade.trim, 0, facade.x0 + 3, facade.roofBaseY, 4);
        builder.add("1x1", facade.trim, 0, facade.x1 - 3, facade.roofBaseY, 4);
    }
}

function addRoofModule(builder, facade) {
    for (let x = facade.x0; x <= facade.x1; x++) {
        builder.add("Roof 1x2", PALETTE.roofTile, 0, x, facade.roofBaseY, 5);
        builder.add("Roof 1x2", PALETTE.roofTile, 2, x, facade.roofBaseY, 11);
        builder.add("Roof 1x2", PALETTE.roofTile, 0, x, facade.roofBaseY + 1, 7);
        builder.add("Roof 1x2", PALETTE.roofTile, 2, x, facade.roofBaseY + 1, 9);
        builder.add("1x1", PALETTE.roofDark, 0, x, facade.roofBaseY + 2, 8);
    }

    builder.add("1x1", PALETTE.roofDark, 0, facade.x0 + 1, facade.roofBaseY + 2, 7);
    builder.add("1x1", PALETTE.roofDark, 0, facade.x1 - 1, facade.roofBaseY + 2, 7);
}

function addChurchWindow(builder, x, y, z, back = false) {
    const trimZ = back ? 14 : 4;
    builder.add("Window", PALETTE.glass, 0, x, y, z);
    builder.add("1x1", CHURCH.trim, 0, x, y - 1, trimZ);
    builder.add("1x1", CHURCH.trim, 0, x, y, trimZ);
    builder.add("1x1", CHURCH.trim, 0, x, y + 1, trimZ);
    builder.add("1x1", CHURCH.trim, 0, x, y + 2, trimZ);
}

function addChurchSideWindow(builder, x, y, z) {
    builder.add("Window", PALETTE.glass, 1, x, y, z);
    builder.add("1x1", CHURCH.trim, 0, x - 1, y, z);
    builder.add("1x1", CHURCH.trim, 0, x - 1, y + 1, z);
    builder.add("1x1", CHURCH.trim, 0, x - 1, y + 2, z);
}

function addChurchDoor(builder) {
    for (let y = 2; y <= 6; y++) {
        for (let x = 44; x <= 46; x++) {
            builder.add("1x1", CHURCH.door, 0, x, y, 5);
            builder.add("1x1", y === 6 ? PALETTE.shadow : CHURCH.door, 0, x, y, 6);
        }
    }

    for (let y = 2; y <= 6; y++) {
        builder.add("1x1", CHURCH.trim, 0, 43, y, 4);
        builder.add("1x1", CHURCH.trim, 0, 47, y, 4);
    }

    for (let x = 43; x <= 47; x++) {
        builder.add("1x1", CHURCH.trim, 0, x, 7, 4);
        builder.add("1x1", CHURCH.accent, 0, x, 1, 4);
    }
}

function addChurchShell(builder) {
    addStoryWallX(
        builder,
        { start: CHURCH.x0, end: CHURCH.naveX1 },
        { start: CHURCH.frontZ0, end: CHURCH.frontZ1 },
        { start: 2, end: 14 },
        CHURCH.bodyColor,
        [
            { start: 44, end: 46, y0: 2, y1: 6 },
            { start: 42, end: 42, y0: 7, y1: 8 },
            { start: 47, end: 47, y0: 7, y1: 8 },
            { start: 45, end: 45, y0: 11, y1: 12 },
        ],
    );
    addStoryWallX(
        builder,
        { start: CHURCH.x0, end: CHURCH.x1 },
        { start: CHURCH.backZ0, end: CHURCH.backZ1 },
        { start: 2, end: 14 },
        CHURCH.bodyColor,
        [
            { start: 44, end: 44, y0: 8, y1: 9 },
            { start: 47, end: 47, y0: 8, y1: 9 },
            { start: 51, end: 51, y0: 11, y1: 12 },
        ],
    );

    addStoryWallZ(
        builder,
        { start: 7, end: 11 },
        { start: CHURCH.x0, end: CHURCH.x0 + 1 },
        { start: 2, end: 14 },
        CHURCH.bodyColor,
        [
            { start: 8, end: 8, y0: 8, y1: 9 },
            { start: 10, end: 10, y0: 11, y1: 12 },
        ],
    );
    addStoryWallZ(
        builder,
        { start: 7, end: 11 },
        { start: CHURCH.towerX1 - 1, end: CHURCH.towerX1 },
        { start: 2, end: CHURCH.towerTopY },
        CHURCH.bodyColor,
        [
            { start: 8, end: 8, y0: 11, y1: 12 },
            { start: 10, end: 10, y0: 16, y1: 17 },
        ],
    );

    addStoryWallX(
        builder,
        { start: CHURCH.towerX0, end: CHURCH.towerX1 },
        { start: CHURCH.frontZ0, end: CHURCH.frontZ1 },
        { start: 15, end: CHURCH.towerTopY },
        CHURCH.bodyColor,
        [
            { start: 51, end: 51, y0: 16, y1: 17 },
            { start: 52, end: 52, y0: 16, y1: 17 },
        ],
    );
    addStoryWallX(
        builder,
        { start: CHURCH.towerX0, end: CHURCH.towerX1 },
        { start: CHURCH.backZ0, end: CHURCH.backZ1 },
        { start: 15, end: CHURCH.towerTopY },
        CHURCH.bodyColor,
        [
            { start: 51, end: 51, y0: 16, y1: 17 },
            { start: 52, end: 52, y0: 16, y1: 17 },
        ],
    );
}

function addChurchDetails(builder) {
    addChurchDoor(builder);
    addChurchWindow(builder, 42, 7, 5);
    addChurchWindow(builder, 47, 7, 5);
    addChurchWindow(builder, 45, 11, 5);
    addChurchWindow(builder, 44, 8, 12, true);
    addChurchWindow(builder, 47, 8, 12, true);

    addChurchSideWindow(builder, 40, 8, 8);
    addChurchSideWindow(builder, 40, 11, 10);

    for (let x = CHURCH.x0; x <= CHURCH.naveX1; x++) {
        builder.add("1x1", CHURCH.trim, 0, x, 7, 4);
        builder.add("1x1", CHURCH.trim, 0, x, 11, 4);
        builder.add("1x1", CHURCH.trim, 0, x, 14, 4);
    }

    addPillarStackSafe(builder, CHURCH.x0, 2, 4, 13, CHURCH.trim);
    addPillarStackSafe(builder, CHURCH.naveX1, 2, 4, 13, CHURCH.trim);

    for (let x = 43; x <= 47; x++) {
        builder.add("1x1", CHURCH.trim, 0, x, 15, 4);
    }
    for (let x = 44; x <= 46; x++) {
        builder.add("1x1", CHURCH.trim, 0, x, 16, 4);
    }
    builder.add("1x1", CHURCH.accent, 0, 45, 17, 4);

    for (let x = CHURCH.x0; x <= CHURCH.naveX1; x++) {
        builder.add("Roof 1x2", CHURCH.roofTile, 0, x, CHURCH.roofBaseY, 5);
        builder.add("Roof 1x2", CHURCH.roofTile, 2, x, CHURCH.roofBaseY, 11);
        builder.add("Roof 1x2", CHURCH.roofTile, 0, x, CHURCH.roofBaseY + 1, 7);
        builder.add("Roof 1x2", CHURCH.roofTile, 2, x, CHURCH.roofBaseY + 1, 9);
        builder.add("1x1", CHURCH.roofDark, 0, x, CHURCH.roofBaseY + 2, 8);
    }

    addOptimizedRect(builder, CHURCH.towerX0, 23, 7, 4, 5, CHURCH.trim);
    for (let x = CHURCH.towerX0; x <= CHURCH.towerX1; x++) {
        builder.add("1x1", CHURCH.accent, 0, x, 24, 7);
        builder.add("1x1", CHURCH.accent, 0, x, 24, 11);
    }
    builder.add("1x1", CHURCH.accent, 0, 50, 24, 8);
    builder.add("1x1", CHURCH.accent, 0, 53, 24, 8);
    builder.add("1x1", CHURCH.accent, 0, 50, 24, 10);
    builder.add("1x1", CHURCH.accent, 0, 53, 24, 10);

    addPillarStackSafe(builder, 51, 24, 9, 3, CHURCH.trim);
    builder.add("1x1", CHURCH.accent, 0, 50, 26, 9);
    builder.add("1x1", CHURCH.accent, 0, 51, 27, 9);
    builder.add("1x1", CHURCH.accent, 0, 52, 26, 9);
    builder.add("1x1", CHURCH.accent, 0, 51, 26, 8);
    builder.add("1x1", CHURCH.accent, 0, 51, 26, 10);
}

function addSquareDetails(builder) {
    addOptimizedRect(builder, 41, 1, 0, 15, 5, PALETTE.streetLight);

    [
        [42, 1, 1], [44, 1, 3], [46, 1, 1], [48, 1, 3], [50, 1, 1], [52, 1, 3], [54, 1, 1],
        [43, 1, 4], [47, 1, 4], [51, 1, 4],
    ].forEach(([x, y, z]) => builder.add("1x1", PALETTE.cobbleDark, 0, x, y, z));

    addOptimizedRect(builder, 47, 1, 2, 2, 2, CHURCH.trim);
    addPillarStackSafe(builder, 47, 2, 2, 5, CHURCH.trim);
    builder.add("1x1", CHURCH.accent, 0, 47, 7, 2);
    builder.add("1x1", CHURCH.accent, 0, 46, 6, 2);
    builder.add("1x1", CHURCH.accent, 0, 48, 6, 2);
    builder.add("1x1", CHURCH.accent, 0, 47, 6, 1);
    builder.add("1x1", CHURCH.accent, 0, 47, 6, 3);

    addOptimizedRect(builder, 43, 1, 2, 2, 2, PALETTE.foundation);
    builder.add("1x1", PALETTE.plantGreen, 0, 43, 2, 2);
    builder.add("1x1", PALETTE.plantGreen, 0, 44, 2, 2);
    builder.add("1x1", PALETTE.flowerYellow, 0, 43, 3, 2);
    builder.add("1x1", PALETTE.flowerRed, 0, 44, 3, 2);

    addOptimizedRect(builder, 52, 1, 2, 2, 2, PALETTE.foundation);
    builder.add("1x1", PALETTE.plantGreen, 0, 52, 2, 2);
    builder.add("1x1", PALETTE.plantGreen, 0, 53, 2, 2);
    builder.add("1x1", PALETTE.flowerRed, 0, 52, 3, 2);
    builder.add("1x1", PALETTE.flowerYellow, 0, 53, 3, 2);

    addPillarStackSafe(builder, 54, 1, 2, 5, PALETTE.iron);
    builder.add("1x1", PALETTE.lampGlow, 0, 55, 5, 2);
}

function addStreetBase(builder) {
    addFilledRectSafe(builder, 0, 0, 0, 56, 16, PALETTE.cobble);
    addOptimizedRect(builder, 2, 1, 5, 52, 9, PALETTE.foundation);
    addOptimizedRect(builder, 0, 1, 0, 56, 2, PALETTE.streetLight);

    [
        [3, 1, 3], [6, 1, 2], [9, 1, 3], [12, 1, 2], [15, 1, 3],
        [18, 1, 2], [22, 1, 3], [26, 1, 2], [30, 1, 3], [34, 1, 2], [38, 1, 3],
        [42, 1, 2], [46, 1, 3], [50, 1, 2], [54, 1, 3],
    ].forEach(([x, y, z]) => builder.add("1x1", PALETTE.cobbleDark, 0, x, y, z));

    addOptimizedRect(builder, 4, 2, 7, 50, 5, PALETTE.foundation);
    addOptimizedRect(builder, 4, 7, 7, 50, 5, PALETTE.foundation);
    addOptimizedRect(builder, 4, 12, 7, 50, 5, PALETTE.foundation);
}

function addFacadeShell(builder, facade) {
    const secondWindowOpenings = facade.upperWindows.map((x) => ({ start: x, end: x, y0: 8, y1: 9 }));
    const thirdWindowOpenings = facade.upperWindows.map((x) => ({ start: x, end: x, y0: facade.thirdWindowY, y1: facade.thirdWindowY + 1 }));

    addStoryWallX(
        builder,
        { start: facade.x0, end: facade.x1 },
        { start: 5, end: 6 },
        { start: 2, end: 5 },
        facade.baseColor,
        [
            { start: facade.doorRange[0], end: facade.doorRange[1], y0: 2, y1: 5 },
            ...facade.groundWindows.map((x) => ({ start: x, end: x, y0: 3, y1: 4 })),
        ],
    );
    addStoryWallX(
        builder,
        { start: facade.x0, end: facade.x1 },
        { start: 5, end: 6 },
        { start: 7, end: 10 },
        facade.facadeColor,
        secondWindowOpenings,
    );
    addStoryWallX(
        builder,
        { start: facade.x0, end: facade.x1 },
        { start: 5, end: 6 },
        { start: 12, end: facade.roofBaseY - 1 },
        facade.facadeColor,
        thirdWindowOpenings,
    );

    addStoryWallX(
        builder,
        { start: facade.x0, end: facade.x1 },
        { start: 12, end: 13 },
        { start: 2, end: 5 },
        facade.baseColor,
        facade.backGroundWindows.map((x) => ({ start: x, end: x, y0: 3, y1: 4 })),
    );
    addStoryWallX(
        builder,
        { start: facade.x0, end: facade.x1 },
        { start: 12, end: 13 },
        { start: 7, end: 10 },
        facade.facadeColor,
        facade.backUpperWindows.map((x) => ({ start: x, end: x, y0: 8, y1: 9 })),
    );
    addStoryWallX(
        builder,
        { start: facade.x0, end: facade.x1 },
        { start: 12, end: 13 },
        { start: 12, end: facade.roofBaseY - 1 },
        facade.facadeColor,
        facade.backUpperWindows.map((x) => ({ start: x, end: x, y0: facade.thirdWindowY, y1: facade.thirdWindowY + 1 })),
    );
}

function addOuterSideWalls(builder) {
    addStoryWallZ(
        builder,
        { start: 7, end: 11 },
        { start: 2, end: 3 },
        { start: 2, end: FACADES[0].roofBaseY - 1 },
        FACADES[0].facadeColor,
        [
            { start: 8, end: 8, y0: 8, y1: 9 },
            { start: 10, end: 10, y0: FACADES[0].thirdWindowY, y1: FACADES[0].thirdWindowY + 1 },
        ],
    );

    addStoryWallZ(
        builder,
        { start: 7, end: 11 },
        { start: 38, end: 39 },
        { start: 2, end: FACADES[2].roofBaseY - 1 },
        FACADES[2].facadeColor,
        [
            { start: 8, end: 8, y0: 8, y1: 9 },
            { start: 10, end: 10, y0: FACADES[2].thirdWindowY, y1: FACADES[2].thirdWindowY + 1 },
        ],
    );

    addSideWindow(builder, 2, 8, 8);
    addSideWindow(builder, 2, FACADES[0].thirdWindowY, 10);
    addSideWindow(builder, 38, 8, 8);
    addSideWindow(builder, 38, FACADES[2].thirdWindowY, 10);
}

function addFacadeDetails(builder, facade) {
    addDoor(builder, facade);
    facade.groundWindows.forEach((x) => addFrontWindow(builder, facade, x, 3));
    facade.upperWindows.forEach((x) => addFrontWindow(builder, facade, x, 8));
    facade.upperWindows.forEach((x) => addFrontWindow(builder, facade, x, facade.thirdWindowY));

    facade.backGroundWindows.forEach((x) => addFrontWindow(builder, facade, x, 3, true));
    facade.backUpperWindows.forEach((x) => addFrontWindow(builder, facade, x, 8, true));
    facade.backUpperWindows.forEach((x) => addFrontWindow(builder, facade, x, facade.thirdWindowY, true));

    facade.balconyRows.forEach((balcony) => addBalcony(builder, facade, balcony));
    addFrontAccent(builder, facade);
    addRoofModule(builder, facade);
}

function addUrbanDetails(builder) {
    addPillarStackSafe(builder, 1, 1, 2, 5, PALETTE.iron);
    addPillarStackSafe(builder, 39, 1, 2, 5, PALETTE.iron);
    builder.add("1x1", PALETTE.lampGlow, 0, 2, 5, 2);
    builder.add("1x1", PALETTE.lampGlow, 0, 40, 5, 2);

    addOptimizedRect(builder, 17, 1, 3, 2, 2, PALETTE.foundation);
    builder.add("1x1", PALETTE.plantGreen, 0, 17, 2, 3);
    builder.add("1x1", PALETTE.plantGreen, 0, 18, 2, 3);
    builder.add("1x1", PALETTE.flowerRed, 0, 17, 3, 3);
    builder.add("1x1", PALETTE.flowerYellow, 0, 18, 3, 3);

    addOptimizedRect(builder, 23, 1, 3, 2, 2, PALETTE.foundation);
    builder.add("1x1", PALETTE.plantGreen, 0, 23, 2, 3);
    builder.add("1x1", PALETTE.plantGreen, 0, 24, 2, 3);
    builder.add("1x1", PALETTE.flowerYellow, 0, 23, 3, 3);
    builder.add("1x1", PALETTE.flowerRed, 0, 24, 3, 3);

    [
        [4, 1, 4], [5, 1, 4], [20, 1, 4], [21, 1, 4], [31, 1, 4], [32, 1, 4],
        [9, 1, 4], [10, 1, 4], [35, 1, 4], [36, 1, 4],
    ].forEach(([x, y, z]) => builder.add("1x1", PALETTE.streetLight, 0, x, y, z));

    [
        [3, 2, 6], [4, 3, 6], [38, 2, 10], [37, 3, 10],
        [15, 2, 13], [26, 2, 13],
    ].forEach(([x, y, z]) => builder.add("1x1", PALETTE.plantGreen, 0, x, y, z));
}

const Pelourinho = {
    dx: 56,
    dy: 28,
    dz: 16,
    blocks: (function () {
        const builder = createPrefabBuilder();

        addStreetBase(builder);
        FACADES.forEach((facade) => addFacadeShell(builder, facade));
        addOuterSideWalls(builder);
        FACADES.forEach((facade) => addFacadeDetails(builder, facade));
        addChurchShell(builder);
        addChurchDetails(builder);
        addUrbanDetails(builder);
        addSquareDetails(builder);

        return builder.blocks;
    })(),
};

export default Pelourinho;