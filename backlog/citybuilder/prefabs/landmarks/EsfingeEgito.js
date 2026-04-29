import { addFilledRectSafe, createPrefabBuilder } from "../shared/core.js";

const PALETTE = {
    displayBase: "#b39a61",
    displayTop: "#c7af73",
    displayEdge: "#8f7a4f",
    sandLight: "#e6d8ab",
    sandMid: "#d7c08a",
    sandShadow: "#bea56d",
    faceShadow: "#af9057",
    blueDark: "#2f4057",
    redDark: "#8f3b3f",
    black: "#1f1f1f",
    gold: "#c6a04d",
    jewel: "#b82822",
    jewelGlow: "#d8a462",
    brown: "#6c4b32",
    brownDark: "#553823",
    green: "#227f34",
    greenLight: "#3aad4f",
};

function fillRect1x1(builder, section) {
    const { x0, y, z0, width, depth, color } = section;

    for (let x = x0; x < x0 + width; x++) {
        for (let z = z0; z < z0 + depth; z++) {
            builder.add("1x1", color, 0, x, y, z);
        }
    }
}

function addOptimizedRect(builder, section) {
    const { x0, y, z0, width, depth, color } = section;
    if (width <= 0 || depth <= 0) return;

    if (width === 1 || depth === 1) {
        fillRect1x1(builder, section);
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

function addSectionsAtY(builder, y, color, sections) {
    sections.forEach(({ x0, z0, width, depth }) => {
        addOptimizedRect(builder, { x0, y, z0, width, depth, color });
    });
}

function addLayeredSections(builder, layers) {
    layers.forEach(({ y, color, sections }) => {
        addSectionsAtY(builder, y, color, sections);
    });
}

function addBlocks(builder, entries) {
    entries.forEach(([type, color, lx, ly, lz, rot = 0]) => {
        builder.add(type, color, rot, lx, ly, lz);
    });
}

function addDisplayBase(builder) {
    addLayeredSections(builder, [
        {
            y: 0,
            color: PALETTE.displayBase,
            sections: [
                { x0: 4, z0: 4, width: 52, depth: 36 },
                { x0: 8, z0: 2, width: 44, depth: 2 },
                { x0: 8, z0: 40, width: 44, depth: 2 },
                { x0: 2, z0: 8, width: 2, depth: 28 },
                { x0: 56, z0: 8, width: 2, depth: 28 },
            ],
        },
        {
            y: 1,
            color: PALETTE.displayTop,
            sections: [
                { x0: 6, z0: 6, width: 48, depth: 32 },
                { x0: 10, z0: 4, width: 40, depth: 2 },
                { x0: 10, z0: 38, width: 40, depth: 2 },
                { x0: 4, z0: 10, width: 2, depth: 24 },
                { x0: 54, z0: 10, width: 2, depth: 24 },
            ],
        },
    ]);

    addBlocks(builder, [
        ["1x1", PALETTE.displayEdge, 14, 1, 3],
        ["1x1", PALETTE.displayEdge, 22, 1, 3],
        ["1x1", PALETTE.displayEdge, 30, 1, 3],
        ["1x1", PALETTE.displayEdge, 38, 1, 3],
        ["1x1", PALETTE.displayEdge, 46, 1, 3],
        ["1x1", PALETTE.displayEdge, 14, 1, 40],
        ["1x1", PALETTE.displayEdge, 22, 1, 40],
        ["1x1", PALETTE.displayEdge, 30, 1, 40],
        ["1x1", PALETTE.displayEdge, 38, 1, 40],
        ["1x1", PALETTE.displayEdge, 46, 1, 40],
        ["1x1", PALETTE.displayEdge, 3, 1, 14],
        ["1x1", PALETTE.displayEdge, 3, 1, 22],
        ["1x1", PALETTE.displayEdge, 3, 1, 30],
        ["1x1", PALETTE.displayEdge, 56, 1, 14],
        ["1x1", PALETTE.displayEdge, 56, 1, 22],
        ["1x1", PALETTE.displayEdge, 56, 1, 30],
    ]);
}

function addPedestal(builder) {
    addLayeredSections(builder, [
        {
            y: 2,
            color: PALETTE.sandShadow,
            sections: [
                { x0: 18, z0: 4, width: 24, depth: 10 },
                { x0: 14, z0: 14, width: 32, depth: 22 },
                { x0: 12, z0: 22, width: 4, depth: 12 },
                { x0: 44, z0: 22, width: 4, depth: 12 },
                { x0: 24, z0: 36, width: 12, depth: 4 },
            ],
        },
        {
            y: 3,
            color: PALETTE.sandLight,
            sections: [
                { x0: 16, z0: 16, width: 28, depth: 18 },
                { x0: 26, z0: 8, width: 8, depth: 8 },
                { x0: 14, z0: 22, width: 4, depth: 12 },
                { x0: 42, z0: 22, width: 4, depth: 12 },
            ],
        },
        {
            y: 4,
            color: PALETTE.sandLight,
            sections: [
                { x0: 18, z0: 18, width: 24, depth: 16 },
                { x0: 26, z0: 10, width: 8, depth: 6 },
            ],
        },
        {
            y: 5,
            color: PALETTE.sandMid,
            sections: [
                { x0: 20, z0: 19, width: 20, depth: 14 },
                { x0: 27, z0: 11, width: 6, depth: 4 },
            ],
        },
        {
            y: 6,
            color: PALETTE.sandLight,
            sections: [
                { x0: 24, z0: 12, width: 12, depth: 10 },
            ],
        },
    ]);

    addBlocks(builder, [
        ["1x1", PALETTE.faceShadow, 27, 4, 9],
        ["1x1", PALETTE.faceShadow, 32, 4, 9],
        ["1x1", PALETTE.jewelGlow, 29, 5, 10],
        ["1x1", PALETTE.jewelGlow, 30, 5, 10],
        ["1x1", PALETTE.jewel, 29, 5, 9],
        ["1x1", PALETTE.jewel, 30, 5, 9],
        ["1x1", PALETTE.faceShadow, 28, 6, 11],
        ["1x1", PALETTE.faceShadow, 31, 6, 11],
    ]);
}

function addPaws(builder) {
    addLayeredSections(builder, [
        {
            y: 3,
            color: PALETTE.sandLight,
            sections: [
                { x0: 18, z0: 4, width: 8, depth: 10 },
                { x0: 34, z0: 4, width: 8, depth: 10 },
            ],
        },
        {
            y: 4,
            color: PALETTE.sandMid,
            sections: [
                { x0: 19, z0: 5, width: 6, depth: 8 },
                { x0: 35, z0: 5, width: 6, depth: 8 },
            ],
        },
        {
            y: 5,
            color: PALETTE.sandLight,
            sections: [
                { x0: 20, z0: 6, width: 4, depth: 6 },
                { x0: 36, z0: 6, width: 4, depth: 6 },
            ],
        },
    ]);

    addBlocks(builder, [
        ["1x1", PALETTE.black, 18, 5, 4],
        ["1x1", PALETTE.black, 21, 5, 4],
        ["1x1", PALETTE.black, 24, 5, 4],
        ["1x1", PALETTE.black, 34, 5, 4],
        ["1x1", PALETTE.black, 37, 5, 4],
        ["1x1", PALETTE.black, 40, 5, 4],
        ["1x1", PALETTE.faceShadow, 26, 5, 8],
        ["1x1", PALETTE.faceShadow, 33, 5, 8],
    ]);
}

function addBody(builder) {
    addLayeredSections(builder, [
        {
            y: 7,
            color: PALETTE.sandMid,
            sections: [
                { x0: 16, z0: 16, width: 28, depth: 18 },
                { x0: 12, z0: 24, width: 4, depth: 12 },
                { x0: 44, z0: 24, width: 4, depth: 12 },
                { x0: 26, z0: 34, width: 8, depth: 4 },
            ],
        },
        {
            y: 8,
            color: PALETTE.sandLight,
            sections: [
                { x0: 17, z0: 16, width: 26, depth: 17 },
                { x0: 14, z0: 25, width: 4, depth: 10 },
                { x0: 42, z0: 25, width: 4, depth: 10 },
                { x0: 27, z0: 35, width: 6, depth: 3 },
            ],
        },
        {
            y: 9,
            color: PALETTE.sandLight,
            sections: [
                { x0: 18, z0: 15, width: 24, depth: 17 },
                { x0: 16, z0: 26, width: 4, depth: 8 },
                { x0: 40, z0: 26, width: 4, depth: 8 },
                { x0: 28, z0: 35, width: 4, depth: 3 },
            ],
        },
        {
            y: 10,
            color: PALETTE.sandMid,
            sections: [
                { x0: 19, z0: 16, width: 22, depth: 16 },
            ],
        },
        {
            y: 11,
            color: PALETTE.sandLight,
            sections: [
                { x0: 20, z0: 17, width: 20, depth: 15 },
                { x0: 22, z0: 13, width: 16, depth: 4 },
            ],
        },
        {
            y: 12,
            color: PALETTE.sandLight,
            sections: [
                { x0: 21, z0: 18, width: 18, depth: 14 },
                { x0: 23, z0: 12, width: 14, depth: 5 },
            ],
        },
        {
            y: 13,
            color: PALETTE.sandMid,
            sections: [
                { x0: 22, z0: 19, width: 16, depth: 13 },
                { x0: 24, z0: 11, width: 12, depth: 5 },
            ],
        },
        {
            y: 14,
            color: PALETTE.sandShadow,
            sections: [
                { x0: 23, z0: 20, width: 14, depth: 11 },
                { x0: 25, z0: 10, width: 10, depth: 5 },
            ],
        },
    ]);

    addBlocks(builder, [
        ["1x1", PALETTE.faceShadow, 28, 9, 38],
        ["1x1", PALETTE.faceShadow, 31, 9, 38],
        ["1x1", PALETTE.faceShadow, 30, 8, 39],
    ]);
}

function addHead(builder) {
    addLayeredSections(builder, [
        {
            y: 15,
            color: PALETTE.sandLight,
            sections: [
                { x0: 22, z0: 10, width: 6, depth: 8 },
                { x0: 28, z0: 9, width: 4, depth: 8 },
                { x0: 32, z0: 10, width: 6, depth: 8 },
            ],
        },
        {
            y: 16,
            color: PALETTE.sandLight,
            sections: [
                { x0: 21, z0: 10, width: 18, depth: 8 },
            ],
        },
        {
            y: 17,
            color: PALETTE.sandLight,
            sections: [
                { x0: 20, z0: 9, width: 20, depth: 8 },
            ],
        },
        {
            y: 18,
            color: PALETTE.sandLight,
            sections: [
                { x0: 19, z0: 8, width: 22, depth: 8 },
            ],
        },
        {
            y: 19,
            color: PALETTE.sandLight,
            sections: [
                { x0: 19, z0: 8, width: 7, depth: 7 },
                { x0: 26, z0: 7, width: 8, depth: 7 },
                { x0: 34, z0: 8, width: 7, depth: 7 },
            ],
        },
        {
            y: 20,
            color: PALETTE.sandLight,
            sections: [
                { x0: 20, z0: 8, width: 6, depth: 6 },
                { x0: 26, z0: 6, width: 8, depth: 7 },
                { x0: 34, z0: 8, width: 6, depth: 6 },
            ],
        },
        {
            y: 21,
            color: PALETTE.sandLight,
            sections: [
                { x0: 21, z0: 8, width: 5, depth: 5 },
                { x0: 26, z0: 6, width: 3, depth: 6 },
                { x0: 31, z0: 6, width: 3, depth: 6 },
                { x0: 34, z0: 8, width: 5, depth: 5 },
            ],
        },
        {
            y: 22,
            color: PALETTE.sandLight,
            sections: [
                { x0: 21, z0: 8, width: 6, depth: 2 },
                { x0: 27, z0: 7, width: 6, depth: 2 },
                { x0: 33, z0: 8, width: 6, depth: 2 },
                { x0: 28, z0: 5, width: 4, depth: 6 },
                { x0: 25, z0: 10, width: 10, depth: 2 },
            ],
        },
        {
            y: 23,
            color: PALETTE.sandLight,
            sections: [
                { x0: 24, z0: 8, width: 12, depth: 3 },
                { x0: 28, z0: 4, width: 4, depth: 5 },
            ],
        },
        {
            y: 24,
            color: PALETTE.sandLight,
            sections: [
                { x0: 25, z0: 8, width: 10, depth: 3 },
                { x0: 28, z0: 4, width: 4, depth: 4 },
            ],
        },
        {
            y: 25,
            color: PALETTE.sandLight,
            sections: [
                { x0: 26, z0: 8, width: 8, depth: 3 },
                { x0: 29, z0: 4, width: 2, depth: 3 },
            ],
        },
        {
            y: 26,
            color: PALETTE.sandLight,
            sections: [
                { x0: 27, z0: 8, width: 6, depth: 2 },
                { x0: 29, z0: 4, width: 2, depth: 2 },
            ],
        },
    ]);

    addBlocks(builder, [
        ["1x1", PALETTE.black, 28, 19, 6],
        ["1x1", PALETTE.black, 29, 19, 6],
        ["1x1", PALETTE.black, 30, 19, 6],
        ["1x1", PALETTE.black, 31, 19, 6],
        ["1x1", PALETTE.faceShadow, 26, 21, 9],
        ["1x1", PALETTE.faceShadow, 33, 21, 9],
        ["1x1", PALETTE.black, 27, 22, 9],
        ["1x1", PALETTE.black, 32, 22, 9],
        ["1x1", PALETTE.black, 29, 22, 4],
        ["1x1", PALETTE.black, 30, 22, 4],
        ["1x1", PALETTE.faceShadow, 28, 23, 3],
        ["1x1", PALETTE.faceShadow, 31, 23, 3],
        ["1x1", PALETTE.sandShadow, 19, 20, 11],
        ["1x1", PALETTE.sandShadow, 40, 20, 11],
        ["1x1", PALETTE.gold, 18, 18, 12],
        ["1x1", PALETTE.gold, 41, 18, 12],
    ]);
}

function addNemes(builder) {
    addLayeredSections(builder, [
        {
            y: 15,
            color: PALETTE.blueDark,
            sections: [
                { x0: 14, z0: 12, width: 6, depth: 14 },
                { x0: 40, z0: 12, width: 6, depth: 14 },
            ],
        },
        {
            y: 16,
            color: PALETTE.redDark,
            sections: [
                { x0: 13, z0: 11, width: 6, depth: 15 },
                { x0: 41, z0: 11, width: 6, depth: 15 },
            ],
        },
        {
            y: 17,
            color: PALETTE.blueDark,
            sections: [
                { x0: 13, z0: 10, width: 6, depth: 15 },
                { x0: 41, z0: 10, width: 6, depth: 15 },
            ],
        },
        {
            y: 18,
            color: PALETTE.redDark,
            sections: [
                { x0: 14, z0: 9, width: 5, depth: 15 },
                { x0: 41, z0: 9, width: 5, depth: 15 },
            ],
        },
        {
            y: 19,
            color: PALETTE.blueDark,
            sections: [
                { x0: 15, z0: 8, width: 4, depth: 14 },
                { x0: 41, z0: 8, width: 4, depth: 14 },
            ],
        },
        {
            y: 20,
            color: PALETTE.redDark,
            sections: [
                { x0: 16, z0: 8, width: 4, depth: 13 },
                { x0: 40, z0: 8, width: 4, depth: 13 },
            ],
        },
        {
            y: 21,
            color: PALETTE.blueDark,
            sections: [
                { x0: 17, z0: 8, width: 3, depth: 12 },
                { x0: 40, z0: 8, width: 3, depth: 12 },
            ],
        },
        {
            y: 27,
            color: PALETTE.black,
            sections: [
                { x0: 24, z0: 9, width: 12, depth: 4 },
            ],
        },
        {
            y: 28,
            color: PALETTE.blueDark,
            sections: [
                { x0: 25, z0: 9, width: 10, depth: 4 },
            ],
        },
        {
            y: 29,
            color: PALETTE.black,
            sections: [
                { x0: 26, z0: 9, width: 8, depth: 3 },
            ],
        },
        {
            y: 30,
            color: PALETTE.blueDark,
            sections: [
                { x0: 27, z0: 9, width: 6, depth: 3 },
            ],
        },
    ]);

    addBlocks(builder, [
        ["1x1", PALETTE.gold, 18, 16, 11],
        ["1x1", PALETTE.gold, 41, 16, 11],
        ["1x1", PALETTE.redDark, 19, 15, 23],
        ["1x1", PALETTE.redDark, 40, 15, 23],
        ["1x1", PALETTE.redDark, 18, 17, 21],
        ["1x1", PALETTE.redDark, 41, 17, 21],
    ]);
}

function addTopOrnament(builder) {
    addLayeredSections(builder, [
        {
            y: 31,
            color: PALETTE.black,
            sections: [
                { x0: 28, z0: 10, width: 4, depth: 2 },
            ],
        },
        {
            y: 32,
            color: PALETTE.gold,
            sections: [
                { x0: 29, z0: 10, width: 2, depth: 2 },
            ],
        },
        {
            y: 33,
            color: PALETTE.gold,
            sections: [
                { x0: 29, z0: 9, width: 2, depth: 2 },
            ],
        },
    ]);

    addBlocks(builder, [
        ["1x1", PALETTE.gold, 28, 32, 10],
        ["1x1", PALETTE.gold, 31, 32, 10],
        ["1x1", PALETTE.gold, 30, 34, 9],
        ["1x1", PALETTE.redDark, 30, 35, 8],
    ]);
}

function addPalmTree(builder) {
    addLayeredSections(builder, [
        { y: 2, color: PALETTE.brownDark, sections: [{ x0: 8, z0: 29, width: 4, depth: 4 }] },
        { y: 3, color: PALETTE.brown, sections: [{ x0: 8, z0: 29, width: 4, depth: 4 }] },
        { y: 4, color: PALETTE.brownDark, sections: [{ x0: 9, z0: 28, width: 4, depth: 4 }] },
        { y: 5, color: PALETTE.brown, sections: [{ x0: 9, z0: 28, width: 4, depth: 4 }] },
        { y: 6, color: PALETTE.brownDark, sections: [{ x0: 10, z0: 27, width: 4, depth: 4 }] },
        { y: 7, color: PALETTE.brown, sections: [{ x0: 10, z0: 27, width: 4, depth: 4 }] },
        { y: 8, color: PALETTE.brownDark, sections: [{ x0: 11, z0: 26, width: 4, depth: 4 }] },
        { y: 9, color: PALETTE.brown, sections: [{ x0: 11, z0: 26, width: 4, depth: 4 }] },
        { y: 10, color: PALETTE.brownDark, sections: [{ x0: 12, z0: 24, width: 4, depth: 4 }] },
        { y: 11, color: PALETTE.brown, sections: [{ x0: 12, z0: 24, width: 4, depth: 4 }] },
        { y: 12, color: PALETTE.brownDark, sections: [{ x0: 13, z0: 22, width: 4, depth: 4 }] },
        { y: 13, color: PALETTE.brown, sections: [{ x0: 13, z0: 22, width: 4, depth: 4 }] },
        { y: 14, color: PALETTE.brownDark, sections: [{ x0: 14, z0: 20, width: 4, depth: 4 }] },
        { y: 15, color: PALETTE.brown, sections: [{ x0: 14, z0: 20, width: 4, depth: 4 }] },
        { y: 16, color: PALETTE.brownDark, sections: [{ x0: 15, z0: 18, width: 4, depth: 4 }] },
        { y: 17, color: PALETTE.brown, sections: [{ x0: 15, z0: 18, width: 4, depth: 4 }] },
        {
            y: 18,
            color: PALETTE.green,
            sections: [
                { x0: 6, z0: 18, width: 12, depth: 4 },
                { x0: 10, z0: 14, width: 4, depth: 12 },
                { x0: 14, z0: 20, width: 8, depth: 4 },
            ],
        },
        {
            y: 19,
            color: PALETTE.greenLight,
            sections: [
                { x0: 4, z0: 18, width: 12, depth: 2 },
                { x0: 10, z0: 12, width: 2, depth: 12 },
                { x0: 14, z0: 22, width: 8, depth: 2 },
                { x0: 16, z0: 16, width: 6, depth: 4 },
            ],
        },
        {
            y: 20,
            color: PALETTE.green,
            sections: [
                { x0: 6, z0: 16, width: 10, depth: 2 },
                { x0: 8, z0: 24, width: 8, depth: 2 },
                { x0: 12, z0: 14, width: 2, depth: 8 },
            ],
        },
    ]);

    addBlocks(builder, [
        ["1x1", PALETTE.greenLight, 3, 19, 19],
        ["1x1", PALETTE.green, 2, 19, 19],
        ["1x1", PALETTE.greenLight, 9, 20, 25],
        ["1x1", PALETTE.greenLight, 15, 20, 15],
        ["1x1", PALETTE.green, 18, 19, 17],
        ["1x1", PALETTE.greenLight, 20, 18, 20],
    ]);
}

function buildEsfingeEgito() {
    const builder = createPrefabBuilder();

    addDisplayBase(builder);
    addPedestal(builder);
    addPaws(builder);
    addBody(builder);
    addHead(builder);
    addNemes(builder);
    addTopOrnament(builder);
    addPalmTree(builder);

    return builder.blocks;
}

const EsfingeEgito = {
    dx: 60,
    dy: 36,
    dz: 44,
    blocks: buildEsfingeEgito(),
};

export default EsfingeEgito;