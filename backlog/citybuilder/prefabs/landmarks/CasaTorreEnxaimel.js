import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

// CasaTorreEnxaimel -- casa mercantil medieval com torre lateral de vigia,
// terreo em reboco claro, pavimento superior azul em enxaimel e telhado alto
// em duas aguas. Toda a composicao sai como um unico prefab.
//
// Eixos: X esquerda=0 direita=17 | Y solo=0 topo=26 | Z frente=0 fundo=11
// Bounding box: dx=18, dy=27, dz=12

const PALETTE = {
    cobble: "#7e7a74",
    stone: "#c7c7c4",
    stoneDark: "#9a9a96",
    stoneAccent: "#b89a6b",
    timber: "#5a3423",
    plasterCream: "#e6d8ba",
    plasterBlue: "#a9bfd2",
    floorOak: "#a77b52",
    roofDark: "#202020",
    roofTrim: "#4a2d1c",
    glass: "#d0b060",
    iron: "#3a352f",
    lanternGlow: "#d8b35a",
    door: "#4a2415",
    flagBlack: "#1b1b1b",
    flagGold: "#d6a230",
    metal: "#b8b8c0",
    shadow: "#2a2a2a",
};

function createStonePicker({ stone, stoneDark, stoneAccent }) {
    return (x, y, z) => {
        if ((x + y + z) % 11 === 0 || (x * 3 + z + y) % 17 === 0) return stoneAccent;
        if ((x * 2 + z * 3 + y) % 7 === 0 || (x + z * 2 + y) % 9 === 0) return stoneDark;
        return stone;
    };
}

function fillRect1x1(builder, x0, x1, y, z0, z1, colorOrFn) {
    for (let x = x0; x <= x1; x++) {
        for (let z = z0; z <= z1; z++) {
            const color = typeof colorOrFn === "function" ? colorOrFn(x, y, z) : colorOrFn;
            builder.add("1x1", color, 0, x, y, z);
        }
    }
}

function addMerlonsAlongX(builder, x0, x1, y, z, color, parity = 0) {
    for (let x = x0; x <= x1; x++) {
        if ((x + parity) % 2 !== 0) continue;
        builder.add("1x1", color, 0, x, y, z);
    }
}

function addMerlonsAlongZ(builder, z0, z1, y, x, color, parity = 0) {
    for (let z = z0; z <= z1; z++) {
        if ((z + parity) % 2 !== 0) continue;
        builder.add("1x1", color, 0, x, y, z);
    }
}

function addLantern(builder, palette, { supportX, supportY, supportZ, glowX, glowY, glowZ }) {
    builder.add("1x1", palette.iron, 0, supportX, supportY, supportZ);
    builder.add("1x1", palette.lanternGlow, 0, glowX, glowY, glowZ);
}

function addGroundAndFloors(builder, palette) {
    addFilledRectSafe(builder, 0, 0, 0, 18, 12, palette.cobble);

    addFilledRectSafe(builder, 4, 1, 0, 14, 12, palette.stone);
    addFilledRectSafe(builder, 0, 1, 2, 4, 6, palette.stoneDark);
    addFilledRectSafe(builder, 1, 1, 0, 2, 2, palette.stoneDark);

    addFilledRectSafe(builder, 0, 2, 2, 4, 6, palette.stone);
    addFilledRectSafe(builder, 6, 2, 2, 10, 8, palette.floorOak);
}

function buildTowerBase(builder, pickStone, palette) {
    for (let y = 3; y <= 10; y++) {
        for (let x = 0; x <= 3; x++) {
            const isDoorVoid = (x === 1 || x === 2) && y <= 5;
            const isFrontSlit = x === 1 && (y === 7 || y === 8);
            if (!isDoorVoid && !isFrontSlit) builder.add("1x1", pickStone(x, y, 2), 0, x, y, 2);
            builder.add("1x1", pickStone(x, y, 7), 0, x, y, 7);
        }

        for (let z = 3; z <= 6; z++) {
            const isLeftSlit = z === 4 && (y === 6 || y === 7);
            if (!isLeftSlit) builder.add("1x1", pickStone(0, y, z), 0, 0, y, z);
            builder.add("1x1", pickStone(3, y, z), 0, 3, y, z);
        }
    }

    for (let y = 3; y <= 5; y++) {
        builder.add("1x1", palette.door, 0, 1, y, 2);
        builder.add("1x1", palette.door, 0, 2, y, 2);
    }

    builder.add("1x1", palette.stoneDark, 0, 0, 6, 1);
    builder.add("1x1", palette.stoneDark, 0, 3, 6, 1);
    for (let x = 1; x <= 2; x++) {
        builder.add("1x1", palette.stoneDark, 0, x, 6, 1);
    }
    builder.add("1x1", palette.stoneAccent, 0, 1, 6, 1);
    builder.add("1x1", palette.stoneAccent, 0, 2, 6, 1);

    builder.add("1x1", palette.glass, 0, 1, 7, 2);
    builder.add("1x1", palette.glass, 0, 0, 6, 4);
    builder.add("1x1", palette.glass, 0, 1, 6, 7);

    addLantern(builder, palette, { supportX: 3, supportY: 6, supportZ: 1, glowX: 3, glowY: 5, glowZ: 1 });
    builder.add("1x1", palette.stoneAccent, 0, 0, 4, 2);
    builder.add("1x1", palette.stoneAccent, 0, 3, 4, 2);
    builder.add("1x1", palette.shadow, 0, 0, 8, 2);
    builder.add("1x1", palette.shadow, 0, 3, 8, 2);
}

function addTowerBelfry(builder, pickStone, palette) {
    for (let x = 0; x <= 3; x++) {
        builder.add("1x1", palette.roofDark, 0, x, 11, 2);
        builder.add("1x1", palette.roofDark, 0, x, 11, 7);
    }
    for (let z = 3; z <= 6; z++) {
        builder.add("1x1", palette.roofDark, 0, 0, 11, z);
        builder.add("1x1", palette.roofDark, 0, 3, 11, z);
    }

    builder.add("Window", palette.glass, 0, 1, 13, 2);
    builder.add("Window", palette.glass, 0, 2, 13, 2);
    builder.add("Window", palette.glass, 1, 0, 13, 4);

    for (let y = 12; y <= 17; y++) {
        for (let x = 0; x <= 3; x++) {
            const isFrontWindowVoid = (x === 1 || x === 2) && (y === 13 || y === 14);
            if (!isFrontWindowVoid) builder.add("1x1", pickStone(x, y, 2), 0, x, y, 2);
            if (!(x === 1 && (y === 14 || y === 15))) builder.add("1x1", pickStone(x, y, 7), 0, x, y, 7);
        }

        for (let z = 3; z <= 6; z++) {
            const isLeftWindowVoid = z === 4 && (y === 13 || y === 14);
            if (!isLeftWindowVoid) builder.add("1x1", pickStone(0, y, z), 0, 0, y, z);
            builder.add("1x1", pickStone(3, y, z), 0, 3, y, z);
        }
    }

    builder.add("1x1", palette.roofTrim, 0, 4, 11, 3);
    builder.add("1x1", palette.roofTrim, 0, 5, 11, 3);
    builder.add("1x1", palette.roofTrim, 0, 4, 11, 4);
    builder.add("1x1", palette.roofTrim, 0, 5, 11, 4);
    builder.add("1x1", palette.shadow, 0, 1, 15, 2);
    builder.add("1x1", palette.shadow, 0, 0, 15, 4);
}

function addTowerBattlements(builder, palette) {
    fillRect1x1(builder, 0, 3, 18, 2, 5, palette.stoneDark);

    for (let x = 0; x <= 3; x++) {
        builder.add("1x1", palette.roofTrim, 0, x, 17, 1);
        builder.add("1x1", palette.roofTrim, 0, x, 17, 6);
    }
    builder.add("1x1", palette.roofTrim, 0, 4, 17, 3);
    builder.add("1x1", palette.roofTrim, 0, 4, 17, 4);
    builder.add("1x1", palette.stoneDark, 0, 3, 17, 2);
    builder.add("1x1", palette.stoneDark, 0, 3, 17, 5);

    for (let y = 19; y <= 21; y++) {
        for (let x = 0; x <= 3; x++) {
            builder.add("1x1", palette.stone, 0, x, y, 2);
            builder.add("1x1", palette.stone, 0, x, y, 5);
        }
        for (let z = 3; z <= 4; z++) {
            builder.add("1x1", palette.stone, 0, 0, y, z);
            builder.add("1x1", palette.stone, 0, 3, y, z);
        }
    }

    addMerlonsAlongX(builder, 0, 3, 22, 2, palette.stoneDark, 0);
    addMerlonsAlongX(builder, 0, 3, 22, 5, palette.stoneDark, 1);
    addMerlonsAlongZ(builder, 3, 4, 22, 0, palette.stoneDark, 1);
    addMerlonsAlongZ(builder, 3, 4, 22, 3, palette.stoneDark, 0);
    builder.add("1x1", palette.stoneDark, 0, 1, 22, 3);
    builder.add("1x1", palette.stoneDark, 0, 2, 22, 4);

    addPillarStackSafe(builder, 1, 22, 3, 4, palette.metal);
    addPillarStackSafe(builder, 2, 22, 4, 4, palette.metal);
    addPillarStackSafe(builder, 3, 22, 2, 4, palette.metal);
    builder.add("1x1", palette.metal, 0, 2, 23, 4);
    builder.add("1x1", palette.metal, 0, 2, 24, 4);
    builder.add("1x1", palette.metal, 0, 3, 24, 4);

    builder.add("1x1", palette.flagBlack, 0, 2, 25, 4);
    builder.add("1x1", palette.flagBlack, 0, 3, 26, 4);
    builder.add("1x1", palette.flagGold, 0, 2, 24, 4);
    builder.add("1x1", palette.flagGold, 0, 2, 25, 5);
    builder.add("1x1", palette.flagGold, 0, 3, 25, 5);
    builder.add("1x1", palette.metal, 0, 1, 25, 3);
    builder.add("1x1", palette.metal, 0, 3, 25, 2);
}

function buildHouseGroundFloor(builder, palette) {
    builder.add("Window", palette.glass, 0, 11, 4, 1);
    builder.add("Window", palette.glass, 0, 14, 4, 1);
    builder.add("Window", palette.glass, 0, 8, 4, 10);
    builder.add("Window", palette.glass, 0, 13, 4, 10);
    builder.add("Window", palette.glass, 1, 16, 4, 7);

    for (let y = 3; y <= 6; y++) {
        for (let x = 5; x <= 16; x++) {
            const isArchVoid = (x === 7 || x === 8) && y <= 5;
            const isFrontWindowVoid = (x === 11 || x === 14) && (y === 4 || y === 5);
            const isFrontPost = x === 5 || x === 6 || x === 9 || x === 13 || x === 16;
            const frontColor = y === 3 ? palette.stoneDark : (isFrontPost || y === 6 ? palette.timber : palette.plasterCream);
            if (!isArchVoid && !isFrontWindowVoid) builder.add("1x1", frontColor, 0, x, y, 1);

            const isBackWindowVoid = (x === 8 || x === 13) && (y === 4 || y === 5);
            const isBackPost = x === 5 || x === 9 || x === 13 || x === 16;
            const backColor = y === 3 ? palette.stoneDark : (isBackPost || y === 6 ? palette.timber : palette.plasterCream);
            if (!isBackWindowVoid) builder.add("1x1", backColor, 0, x, y, 10);
        }

        for (let z = 2; z <= 9; z++) {
            const isRightWindowVoid = z === 7 && (y === 4 || y === 5);
            const leftColor = y === 3 ? palette.stoneDark : ((z === 2 || z === 6 || z === 9 || y === 6) ? palette.timber : palette.plasterCream);
            const rightColor = y === 3 ? palette.stoneDark : ((z === 2 || z === 6 || z === 9 || y === 6) ? palette.timber : palette.plasterCream);
            builder.add("1x1", leftColor, 0, 4, y, z);
            if (!isRightWindowVoid) builder.add("1x1", rightColor, 0, 17, y, z);
        }
    }

    for (let y = 3; y <= 5; y++) {
        builder.add("1x1", palette.timber, 0, 6, y, 1);
        builder.add("1x1", palette.timber, 0, 9, y, 1);
    }
    for (let x = 6; x <= 9; x++) {
        builder.add("1x1", palette.timber, 0, x, 6, 0);
    }

    builder.add("1x1", palette.iron, 0, 11, 5, 0);
    builder.add("1x1", palette.lanternGlow, 0, 12, 5, 0);
    builder.add("1x1", palette.shadow, 0, 10, 4, 0);
    builder.add("1x1", palette.flagGold, 0, 12, 4, 1);
    builder.add("1x1", palette.shadow, 0, 13, 4, 1);
    addLantern(builder, palette, { supportX: 15, supportY: 5, supportZ: 0, glowX: 15, glowY: 4, glowZ: 0 });
}

function addHouseJettyAndSupports(builder, palette) {
    addFilledRectSafe(builder, 4, 7, 0, 14, 12, palette.timber);

    [6, 10, 14, 16].forEach((x) => {
        builder.add("1x1", palette.timber, 0, x, 6, 0);
        builder.add("1x1", palette.timber, 0, x, 5, 0);
    });
    [3, 6, 9].forEach((z) => {
        builder.add("1x1", palette.timber, 0, 17, 6, z);
    });
    builder.add("1x1", palette.roofDark, 0, 4, 8, 1);
    builder.add("1x1", palette.roofDark, 0, 5, 8, 1);
    builder.add("1x1", palette.roofDark, 0, 6, 8, 1);
}

function buildHouseUpperFloor(builder, palette) {
    builder.add("Window", palette.glass, 0, 6, 9, 0);
    builder.add("Window", palette.glass, 0, 10, 9, 0);
    builder.add("Window", palette.glass, 0, 14, 9, 0);
    builder.add("Window", palette.glass, 0, 8, 9, 10);
    builder.add("Window", palette.glass, 0, 13, 9, 10);
    builder.add("Window", palette.glass, 1, 16, 9, 4);
    builder.add("Window", palette.glass, 1, 16, 9, 8);

    for (let y = 8; y <= 11; y++) {
        for (let x = 4; x <= 17; x++) {
            const isFrontWindowVoid = (x === 6 || x === 10 || x === 14) && (y === 9 || y === 10);
            const isFrontPost = x === 4 || x === 8 || x === 12 || x === 15 || x === 17;
            const frontColor = isFrontPost || y === 10 ? palette.timber : palette.plasterBlue;
            if (!isFrontWindowVoid) builder.add("1x1", frontColor, 0, x, y, 0);

            const isBackWindowVoid = (x === 8 || x === 13) && (y === 9 || y === 10);
            const isBackPost = x === 4 || x === 8 || x === 12 || x === 17;
            const backColor = isBackPost || y === 10 ? palette.timber : palette.plasterBlue;
            if (!isBackWindowVoid) builder.add("1x1", backColor, 0, x, y, 11);
        }

        for (let z = 1; z <= 10; z++) {
            const isRightWindowVoid = (z === 4 || z === 8) && (y === 9 || y === 10);
            const leftColor = (z === 1 || z === 6 || z === 10 || y === 10) ? palette.timber : palette.plasterBlue;
            const rightColor = (z === 1 || z === 6 || z === 10 || y === 10) ? palette.timber : palette.plasterBlue;
            builder.add("1x1", leftColor, 0, 4, y, z);
            if (!isRightWindowVoid) builder.add("1x1", rightColor, 0, 17, y, z);
        }
    }

    builder.add("1x1", palette.timber, 0, 5, 8, 0);
    builder.add("1x1", palette.timber, 0, 7, 8, 0);
    builder.add("1x1", palette.timber, 0, 9, 8, 0);
    builder.add("1x1", palette.timber, 0, 11, 8, 0);
    builder.add("1x1", palette.timber, 0, 13, 8, 0);
    builder.add("1x1", palette.timber, 0, 15, 8, 0);
}

function getHouseGableSteps() {
    return [
        { y: 12, x0: 4, x1: 17 },
        { y: 13, x0: 5, x1: 16 },
        { y: 14, x0: 6, x1: 15 },
        { y: 15, x0: 7, x1: 14 },
        { y: 16, x0: 8, x1: 13 },
        { y: 17, x0: 9, x1: 12 },
        { y: 18, x0: 10, x1: 11 },
    ];
}

function addFrontGable(builder, palette) {
    const steps = getHouseGableSteps();

    steps.forEach(({ y, x0, x1 }) => {
        for (let x = x0; x <= x1; x++) {
            const isNicheVoid = (y === 14 || y === 15) && (x === 10 || x === 11);
            if (isNicheVoid) continue;
            const color = x === x0 || x === x1 ? palette.timber : palette.plasterBlue;
            builder.add("1x1", color, 0, x, y, 0);
        }
    });

    builder.add("1x1", palette.timber, 0, 9, 14, 0);
    builder.add("1x1", palette.timber, 0, 12, 14, 0);
    builder.add("1x1", palette.timber, 0, 10, 15, 0);
    builder.add("1x1", palette.timber, 0, 11, 15, 0);
    builder.add("1x1", palette.glass, 0, 10, 16, 0);
    builder.add("1x1", palette.glass, 0, 11, 16, 0);
    builder.add("1x1", palette.flagGold, 0, 10, 17, 0);
    builder.add("1x1", palette.shadow, 0, 11, 17, 0);
    builder.add("1x1", palette.timber, 0, 10, 19, 0);
    builder.add("1x1", palette.timber, 0, 11, 19, 0);
    builder.add("1x1", palette.roofTrim, 0, 10, 20, 0);
    builder.add("1x1", palette.roofTrim, 0, 11, 20, 0);
}

function addBackGable(builder, palette) {
    const steps = getHouseGableSteps();

    steps.forEach(({ y, x0, x1 }) => {
        for (let x = x0; x <= x1; x++) {
            const color = x === x0 || x === x1 ? palette.timber : palette.plasterBlue;
            builder.add("1x1", color, 0, x, y, 11);
        }
    });

    builder.add("1x1", palette.timber, 0, 10, 19, 11);
    builder.add("1x1", palette.timber, 0, 11, 19, 11);
    builder.add("1x1", palette.roofTrim, 0, 10, 20, 11);
    builder.add("1x1", palette.roofTrim, 0, 11, 20, 11);
}

function addHouseRoof(builder, palette) {
    for (let step = 0; step < 6; step++) {
        const y = 12 + step;
        const leftX = 4 + step;
        const rightX = 16 - step;
        for (let z = 1; z <= 10; z++) {
            builder.add("Roof 1x2", palette.roofDark, 1, leftX, y, z);
            builder.add("Roof 1x2", palette.roofDark, 3, rightX, y, z);
        }
    }

    for (let z = 1; z <= 9; z += 2) {
        builder.add("Tile 2x2", palette.roofTrim, 0, 10, 18, z);
    }
    [2, 5, 8].forEach((z) => {
        builder.add("Tile 2x2", palette.roofDark, 0, 10, 19, z);
    });
    builder.add("1x1", palette.roofTrim, 0, 10, 20, 5);
    builder.add("1x1", palette.roofTrim, 0, 11, 20, 5);

    builder.add("1x1", palette.stoneDark, 0, 15, 15, 4);
    builder.add("1x1", palette.stoneDark, 0, 15, 16, 4);
    builder.add("1x1", palette.stoneDark, 0, 15, 17, 4);
    addPillarStackSafe(builder, 15, 18, 4, 3, palette.stoneDark);
    builder.add("1x1", palette.stone, 0, 14, 20, 4);
    builder.add("1x1", palette.stone, 0, 15, 20, 3);
    builder.add("1x1", palette.stone, 0, 16, 20, 4);
    builder.add("1x1", palette.lanternGlow, 0, 15, 21, 4);
}

function addFinalDetails(builder, pickStone, palette) {
    builder.add("1x1", palette.shadow, 0, 6, 4, 1);
    builder.add("1x1", palette.shadow, 0, 9, 4, 1);
    builder.add("1x1", palette.shadow, 0, 12, 4, 1);
    builder.add("1x1", palette.shadow, 0, 15, 4, 1);

    builder.add("1x1", palette.stoneAccent, 0, 4, 3, 2);
    builder.add("1x1", palette.stoneAccent, 0, 4, 3, 8);
    builder.add("1x1", palette.stoneAccent, 0, 17, 3, 4);
    builder.add("1x1", palette.stoneAccent, 0, 17, 3, 9);

    builder.add("1x1", pickStone(2, 9, 7), 0, 2, 9, 7);
    builder.add("1x1", pickStone(0, 10, 5), 0, 0, 10, 5);
    builder.add("1x1", palette.iron, 0, 12, 5, 1);
    builder.add("1x1", palette.flagGold, 0, 13, 5, 1);
    builder.add("1x1", palette.shadow, 0, 12, 10, 11);
    builder.add("1x1", palette.shadow, 0, 17, 9, 5);
}

function buildCasaTorreEnxaimelBlocks() {
    const builder = createPrefabBuilder();
    const pickStone = createStonePicker(PALETTE);

    addGroundAndFloors(builder, PALETTE);
    buildTowerBase(builder, pickStone, PALETTE);
    addTowerBelfry(builder, pickStone, PALETTE);
    addTowerBattlements(builder, PALETTE);
    buildHouseGroundFloor(builder, PALETTE);
    addHouseJettyAndSupports(builder, PALETTE);
    buildHouseUpperFloor(builder, PALETTE);
    addFrontGable(builder, PALETTE);
    addBackGable(builder, PALETTE);
    addHouseRoof(builder, PALETTE);
    addFinalDetails(builder, pickStone, PALETTE);

    return builder.blocks;
}

const CasaTorreEnxaimel = {
    dx: 18,
    dy: 27,
    dz: 12,
    blocks: buildCasaTorreEnxaimelBlocks(),
};

export default CasaTorreEnxaimel;