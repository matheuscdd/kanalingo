import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

// GuaritaMedieval -- torre de vigilancia medieval com base ameada, escadaria
// frontal, torre alta com mirante aberto, telhado azul em piramide escalonada
// e anexo half-timber preso ao corpo principal.
//
// Composicao visual:
//   - Plataforma ameada na esquerda, com peitoril de pedra e fendas estreitas.
//   - Corpo principal em pedra com arco frontal elevado e patamar superior.
//   - Torre alta no fundo com janelas estreitas, mirante aberto e bandeiras.
//   - Anexo lateral direito em pedra + timber/plaster com telhado azul.
//   - Muitos detalhes manuais com 1x1 para quebrar superfices lisas.
//
// Eixos: X esquerda=0 direita=17 | Y solo=0 topo=31 | Z frente=0 fundo=17
// Bounding box: dx=18, dy=32, dz=18

const PALETTE = {
    grass: "#4a7c40",
    stone: "#b8b8b6",
    stoneDark: "#8e8e8c",
    stoneAccent: "#a98b60",
    floorStone: "#9b8a70",
    timber: "#4a2b1b",
    plaster: "#e4dccd",
    roofBlue: "#4568a3",
    roofBlueDark: "#273756",
    glass: "#89a9c4",
    door: "#5a341a",
    bannerRed: "#b32020",
    bannerYellow: "#d6a228",
    vine: "#2f6b2f",
    flowerBlue: "#6d86d6",
    flowerWhite: "#d8d8d8",
    iron: "#4f463d",
    warmLight: "#d7b35b",
    shadow: "#2a2a2a",
};

function createStonePicker({ stone, stoneDark, stoneAccent }) {
    return (x, y, z) => {
        if ((x + y + z) % 13 === 0 || (x * 3 + z * 2 + y) % 19 === 0) return stoneAccent;
        if ((x * 2 + y + z * 3) % 7 === 0 || (x + z * 2 + y) % 9 === 0) return stoneDark;
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
    builder.add("1x1", palette.warmLight, 0, glowX, glowY, glowZ);
}

function addGroundAndFoundations(builder, palette) {
    addFilledRectSafe(builder, 0, 0, 0, 18, 18, palette.grass);

    addFilledRectSafe(builder, 0, 1, 6, 4, 8, palette.stoneDark);
    addFilledRectSafe(builder, 4, 1, 4, 8, 10, palette.stone);
    addFilledRectSafe(builder, 12, 1, 4, 6, 6, palette.stone);
    addFilledRectSafe(builder, 12, 1, 10, 2, 4, palette.stoneDark);
    addFilledRectSafe(builder, 8, 1, 14, 6, 4, palette.stone);

    addFilledRectSafe(builder, 1, 2, 7, 2, 6, palette.floorStone);
    addFilledRectSafe(builder, 5, 2, 5, 6, 8, palette.floorStone);
    addFilledRectSafe(builder, 13, 2, 5, 4, 4, palette.floorStone);
    addFilledRectSafe(builder, 9, 2, 15, 4, 2, palette.floorStone);
}

function addFrontStairs(builder, palette) {
    const stairs = [
        { z: 0, x0: 6, x1: 10, height: 1 },
        { z: 1, x0: 6, x1: 10, height: 2 },
        { z: 2, x0: 6, x1: 10, height: 3 },
        { z: 3, x0: 6, x1: 9, height: 4 },
    ];

    stairs.forEach(({ z, x0, x1, height }) => {
        for (let x = x0; x <= x1; x++) {
            for (let y = 1; y <= height; y++) {
                builder.add("1x1", palette.stoneDark, 0, x, y, z);
            }
        }
    });

    for (let z = 1; z <= 3; z++) {
        builder.add("1x1", palette.stone, 0, 5, Math.min(4, z + 1), z);
        builder.add("1x1", palette.stone, 0, 10, Math.min(4, z + 1), z);
    }
    builder.add("1x1", palette.stoneAccent, 0, 6, 1, 4);
    builder.add("1x1", palette.stoneAccent, 0, 9, 1, 4);
    builder.add("1x1", palette.stoneDark, 0, 4, 1, 2);
    builder.add("1x1", palette.stoneDark, 0, 11, 1, 2);
}

function reserveOpenings(builder, palette) {
    builder.add("Window", palette.glass, 0, 5, 4, 4);
    builder.add("Window", palette.glass, 0, 10, 4, 4);
    builder.add("Window", palette.glass, 0, 6, 4, 12);
    builder.add("Window", palette.glass, 0, 9, 4, 12);
    builder.add("Window", palette.glass, 1, 4, 4, 8);

    builder.add("Window", palette.glass, 0, 14, 4, 4);
    builder.add("Window", palette.glass, 0, 13, 4, 8);
    builder.add("Window", palette.glass, 1, 16, 4, 6);
    builder.add("Window", palette.glass, 0, 13, 9, 4);
    builder.add("Window", palette.glass, 0, 16, 9, 4);
    builder.add("Window", palette.glass, 1, 16, 9, 7);

    builder.add("Window", palette.glass, 0, 10, 14, 10);
    builder.add("Window", palette.glass, 0, 10, 16, 14);
    builder.add("Window", palette.glass, 1, 8, 16, 13);
    builder.add("Window", palette.glass, 1, 12, 15, 12);
}

function buildLeftBastion(builder, pickStone, palette) {
    for (let y = 2; y <= 8; y++) {
        for (let x = 0; x <= 3; x++) {
            builder.add("1x1", pickStone(x, y, 6), 0, x, y, 6);
            builder.add("1x1", pickStone(x, y, 13), 0, x, y, 13);
        }
        for (let z = 7; z <= 12; z++) {
            builder.add("1x1", pickStone(0, y, z), 0, 0, y, z);
        }
    }

    addFilledRectSafe(builder, 1, 8, 7, 2, 6, palette.floorStone);
    for (let x = 0; x <= 3; x++) {
        if (x % 2 !== 0) continue;
        builder.add("1x1", palette.stoneDark, 0, x, 9, 6);
        builder.add("1x1", palette.stoneDark, 0, x, 9, 13);
    }
    for (let z = 7; z <= 12; z++) {
        if (z % 2 === 1) builder.add("1x1", palette.stoneDark, 0, 0, 9, z);
    }
    addMerlonsAlongX(builder, 0, 3, 10, 6, palette.stone, 0);
    addMerlonsAlongX(builder, 0, 3, 10, 13, palette.stone, 1);
    addMerlonsAlongZ(builder, 7, 12, 10, 0, palette.stoneDark, 0);
    addMerlonsAlongZ(builder, 7, 12, 10, 3, palette.stoneDark, 1);
    builder.add("1x1", palette.stoneAccent, 0, 0, 10, 6);
    builder.add("1x1", palette.stoneAccent, 0, 3, 10, 13);
    builder.add("1x1", palette.shadow, 0, 1, 5, 6);
    builder.add("1x1", palette.shadow, 0, 2, 4, 13);
    builder.add("1x1", palette.stoneAccent, 0, 3, 2, 7);
    builder.add("1x1", palette.stoneAccent, 0, 3, 2, 12);
}

function addMainFrontWallLayer(builder, pickStone, y) {
    for (let x = 4; x <= 11; x++) {
        const isDoorVoid = (x === 7 || x === 8) && y <= 4;
        const isFrontWindowVoid = (x === 5 || x === 10) && (y === 4 || y === 5);
        if (isDoorVoid || isFrontWindowVoid) continue;
        builder.add("1x1", pickStone(x, y, 4), 0, x, y, 4);
    }
}

function addMainRearWallLayer(builder, pickStone, y) {
    for (let x = 4; x <= 11; x++) {
        if ((x === 6 || x === 9) && (y === 4 || y === 5)) continue;
        builder.add("1x1", pickStone(x, y, 13), 0, x, y, 13);
    }
}

function addMainLeftWallLayer(builder, pickStone, y) {
    for (let z = 5; z <= 12; z++) {
        if (z === 8 && (y === 4 || y === 5)) continue;
        builder.add("1x1", pickStone(4, y, z), 0, 4, y, z);
    }
}

function addMainRightCheekLayer(builder, pickStone, y) {
    for (let z = 4; z <= 7; z++) {
        builder.add("1x1", pickStone(11, y, z), 0, 11, y, z);
    }
}

function buildMainStoneWalls(builder, pickStone) {
    for (let y = 2; y <= 9; y++) {
        addMainFrontWallLayer(builder, pickStone, y);
        addMainRearWallLayer(builder, pickStone, y);
        addMainLeftWallLayer(builder, pickStone, y);
        addMainRightCheekLayer(builder, pickStone, y);
    }
}

function addMainPortalDetails(builder, palette) {
    for (let y = 2; y <= 4; y++) {
        builder.add("1x1", palette.door, 0, 7, y, 4);
        builder.add("1x1", palette.door, 0, 8, y, 4);
    }

    builder.add("1x1", palette.stoneDark, 0, 6, 5, 3);
    builder.add("1x1", palette.stoneDark, 0, 9, 5, 3);
    for (let x = 6; x <= 9; x++) {
        builder.add("1x1", palette.stoneDark, 0, x, 6, 3);
    }
    builder.add("1x1", palette.stoneAccent, 0, 7, 6, 3);
    builder.add("1x1", palette.stoneAccent, 0, 8, 6, 3);
    builder.add("1x1", palette.stoneAccent, 0, 6, 7, 3);
    builder.add("1x1", palette.stoneDark, 0, 7, 7, 3);
    builder.add("1x1", palette.stoneDark, 0, 8, 7, 3);
    builder.add("1x1", palette.stoneAccent, 0, 9, 7, 3);
    builder.add("1x1", palette.shadow, 0, 10, 4, 3);
    builder.add("1x1", palette.shadow, 0, 5, 4, 3);
    addLantern(builder, palette, { supportX: 5, supportY: 6, supportZ: 3, glowX: 5, glowY: 5, glowZ: 2 });
    addLantern(builder, palette, { supportX: 10, supportY: 6, supportZ: 3, glowX: 10, glowY: 5, glowZ: 2 });
}

function addMainUpperDeck(builder, palette) {
    addFilledRectSafe(builder, 5, 10, 5, 6, 8, palette.stoneDark);
    fillRect1x1(builder, 8, 13, 10, 10, 15, (x, y, z) => {
        if (x === 8 || x === 13 || z === 10 || z === 15) return palette.stoneDark;
        return palette.floorStone;
    });
    addMerlonsAlongX(builder, 5, 10, 11, 5, palette.stoneDark, 1);
    addMerlonsAlongZ(builder, 6, 11, 11, 5, palette.stoneDark, 0);
    builder.add("1x1", palette.stoneAccent, 0, 6, 11, 5);
    builder.add("1x1", palette.stoneAccent, 0, 9, 11, 5);
    builder.add("1x1", palette.stoneAccent, 0, 6, 8, 3);
    builder.add("1x1", palette.stoneDark, 0, 7, 8, 3);
    builder.add("1x1", palette.stoneDark, 0, 8, 8, 3);
    builder.add("1x1", palette.stoneAccent, 0, 9, 8, 3);
    builder.add("1x1", palette.stoneDark, 0, 6, 9, 4);
    builder.add("1x1", palette.stoneDark, 0, 8, 9, 4);
    builder.add("1x1", palette.stoneDark, 0, 10, 9, 4);
}

function buildTowerSupports(builder, palette) {
    for (let y = 2; y <= 9; y++) {
        const sideColor = y % 2 === 0 ? palette.stoneDark : palette.stone;
        const rearColor = y % 3 === 0 ? palette.stoneDark : palette.stone;
        addFilledRectSafe(builder, 12, y, 10, 2, 4, sideColor);
        addFilledRectSafe(builder, 8, y, 14, 6, 4, rearColor);
    }

    for (let y = 3; y <= 8; y++) {
        builder.add("1x1", palette.stoneAccent, 0, 12, y, 10);
        builder.add("1x1", palette.stoneAccent, 0, 13, y, 10);
        builder.add("1x1", palette.stoneAccent, 0, 9, y, 17);
        builder.add("1x1", palette.stoneAccent, 0, 12, y, 17);
    }
}

function addAnnexFrontWallLayer(builder, pickStone, y) {
    for (let x = 12; x <= 17; x++) {
        if (x === 14 && (y === 4 || y === 5)) continue;
        builder.add("1x1", pickStone(x, y, 4), 0, x, y, 4);
    }
}

function addAnnexBackWallLayer(builder, pickStone, y) {
    for (let x = 12; x <= 17; x++) {
        if (x === 13 && (y === 4 || y === 5)) continue;
        builder.add("1x1", pickStone(x, y, 9), 0, x, y, 9);
    }
}

function addAnnexSideWallLayer(builder, pickStone, y) {
    for (let z = 5; z <= 8; z++) {
        builder.add("1x1", pickStone(12, y, z), 0, 12, y, z);
        if (z === 6 && (y === 4 || y === 5)) continue;
        builder.add("1x1", pickStone(17, y, z), 0, 17, y, z);
    }
}

function buildAnnexStoneBase(builder, pickStone) {
    for (let y = 2; y <= 6; y++) {
        addAnnexFrontWallLayer(builder, pickStone, y);
        addAnnexBackWallLayer(builder, pickStone, y);
        addAnnexSideWallLayer(builder, pickStone, y);
    }
}

function addAnnexFrontBackFrameLayer(builder, palette, y) {
    for (let x = 11; x <= 17; x++) {
        const isWindowVoid = (x === 13 || x === 16) && (y === 9 || y === 10);
        const isPost = x === 11 || x === 13 || x === 15 || x === 17;
        const color = isPost || y === 10 ? palette.timber : palette.plaster;
        if (!isWindowVoid) builder.add("1x1", color, 0, x, y, 4);
        builder.add("1x1", color, 0, x, y, 9);
    }
}

function addAnnexSideFrameLayer(builder, palette, y) {
    for (let z = 5; z <= 8; z++) {
        const isPost = z === 5 || z === 7 || z === 8;
        const color = isPost || y === 10 ? palette.timber : palette.plaster;
        builder.add("1x1", color, 0, 11, y, z);
        if (z === 7 && (y === 9 || y === 10)) continue;
        builder.add("1x1", color, 0, 17, y, z);
    }
}

function buildAnnexUpperFrame(builder, palette) {
    fillRect1x1(builder, 11, 17, 7, 4, 9, palette.timber);
    builder.add("1x1", palette.timber, 0, 11, 6, 5);
    builder.add("1x1", palette.timber, 0, 11, 6, 8);
    builder.add("1x1", palette.timber, 0, 12, 6, 5);
    builder.add("1x1", palette.timber, 0, 12, 6, 8);

    for (let y = 8; y <= 11; y++) {
        addAnnexFrontBackFrameLayer(builder, palette, y);
        addAnnexSideFrameLayer(builder, palette, y);
    }

    const annexGables = [
        { y: 12, zStart: 4, zEnd: 9 },
        { y: 13, zStart: 5, zEnd: 8 },
        { y: 14, zStart: 6, zEnd: 7 },
    ];
    annexGables.forEach(({ y, zStart, zEnd }) => {
        for (let z = zStart; z <= zEnd; z++) {
            const color = z === zStart || z === zEnd ? palette.timber : palette.plaster;
            builder.add("1x1", color, 0, 11, y, z);
            builder.add("1x1", color, 0, 17, y, z);
        }
    });
}

function addAnnexRoofAndBanner(builder, palette) {
    for (let x = 12; x <= 16; x++) {
        builder.add("Roof 1x2", palette.roofBlue, 0, x, 12, 4);
        builder.add("Roof 1x2", palette.roofBlue, 2, x, 12, 8);
        builder.add("Roof 1x2", palette.roofBlue, 0, x, 13, 5);
        builder.add("Roof 1x2", palette.roofBlue, 2, x, 13, 7);
        builder.add("1x1", palette.roofBlueDark, 0, x, 14, 6);
        builder.add("1x1", palette.roofBlueDark, 0, x, 14, 7);
    }

    builder.add("1x1", palette.timber, 0, 12, 11, 3);
    builder.add("1x1", palette.timber, 0, 14, 11, 3);
    builder.add("1x1", palette.timber, 0, 16, 11, 3);
    addLantern(builder, palette, { supportX: 15, supportY: 8, supportZ: 3, glowX: 15, glowY: 7, glowZ: 2 });

    builder.add("1x1", palette.bannerRed, 0, 17, 3, 5);
    builder.add("1x1", palette.bannerYellow, 0, 17, 4, 5);
    builder.add("1x1", palette.bannerRed, 0, 17, 5, 5);
    builder.add("1x1", palette.bannerYellow, 0, 17, 6, 5);
    builder.add("1x1", palette.bannerRed, 0, 17, 7, 5);
}

function addTowerFrontLayer(builder, pickStone, y) {
    for (let x = 8; x <= 13; x++) {
        if (x === 10 && (y === 14 || y === 15)) continue;
        builder.add("1x1", pickStone(x, y, 10), 0, x, y, 10);
    }
}

function addTowerBackLayer(builder, pickStone, y) {
    for (let x = 8; x <= 13; x++) {
        if (x === 10 && (y === 16 || y === 17)) continue;
        builder.add("1x1", pickStone(x, y, 15), 0, x, y, 15);
    }
}

function addTowerSideLayer(builder, pickStone, y) {
    for (let z = 11; z <= 14; z++) {
        if (!(z === 13 && (y === 16 || y === 17))) {
            builder.add("1x1", pickStone(8, y, z), 0, 8, y, z);
        }
        if (z === 12 && (y === 15 || y === 16)) continue;
        builder.add("1x1", pickStone(13, y, z), 0, 13, y, z);
    }
}

function buildTowerShaft(builder, pickStone) {
    for (let y = 11; y <= 21; y++) {
        addTowerFrontLayer(builder, pickStone, y);
        addTowerBackLayer(builder, pickStone, y);
        addTowerSideLayer(builder, pickStone, y);
    }
}

function addTowerShoulder(builder, palette) {
    fillRect1x1(builder, 7, 14, 21, 9, 16, (x, y, z) => {
        if (x === 7 || x === 14 || z === 9 || z === 16) return palette.stoneDark;
        if (x === 8 || x === 13 || z === 10 || z === 15) return palette.stone;
        return palette.floorStone;
    });
    addMerlonsAlongX(builder, 7, 14, 22, 9, palette.stoneDark, 0);
    addMerlonsAlongX(builder, 7, 14, 22, 16, palette.stoneDark, 1);
    addMerlonsAlongZ(builder, 10, 15, 22, 7, palette.stoneDark, 1);
    addMerlonsAlongZ(builder, 10, 15, 22, 14, palette.stoneDark, 0);
    builder.add("1x1", palette.stoneAccent, 0, 7, 20, 11);
    builder.add("1x1", palette.stoneAccent, 0, 7, 20, 14);
    builder.add("1x1", palette.stoneAccent, 0, 14, 20, 11);
    builder.add("1x1", palette.stoneAccent, 0, 14, 20, 14);
    builder.add("1x1", palette.stoneDark, 0, 9, 20, 9);
    builder.add("1x1", palette.stoneDark, 0, 12, 20, 16);
}

function addTowerArchFaceX(builder, palette, { x0, x1, y0, y1, z, gapStart, gapEnd }) {
    for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
            const isGap = x >= gapStart && x <= gapEnd && y < y1;
            if (isGap) continue;
            const color = y === y1 ? palette.stoneDark : palette.stone;
            builder.add("1x1", color, 0, x, y, z);
        }
    }
}

function addTowerArchFaceZ(builder, palette, { z0, z1, y0, y1, x, gapStart, gapEnd }) {
    for (let y = y0; y <= y1; y++) {
        for (let z = z0; z <= z1; z++) {
            const isGap = z >= gapStart && z <= gapEnd && y < y1;
            if (isGap) continue;
            const color = y === y1 ? palette.stoneDark : palette.stone;
            builder.add("1x1", color, 0, x, y, z);
        }
    }
}

function addTowerLookout(builder, palette) {
    addTowerShoulder(builder, palette);
    addFilledRectSafe(builder, 9, 23, 11, 4, 4, palette.floorStone);
    addPillarStackSafe(builder, 8, 22, 10, 5, palette.stoneDark);
    addPillarStackSafe(builder, 13, 22, 10, 5, palette.stoneDark);
    addPillarStackSafe(builder, 8, 22, 15, 5, palette.stoneDark);
    addPillarStackSafe(builder, 13, 22, 15, 5, palette.stoneDark);

    addTowerArchFaceX(builder, palette, { x0: 9, x1: 12, y0: 23, y1: 26, z: 10, gapStart: 10, gapEnd: 11 });
    addTowerArchFaceX(builder, palette, { x0: 9, x1: 12, y0: 23, y1: 26, z: 15, gapStart: 10, gapEnd: 11 });
    addTowerArchFaceZ(builder, palette, { z0: 11, z1: 14, y0: 23, y1: 26, x: 8, gapStart: 12, gapEnd: 13 });
    addTowerArchFaceZ(builder, palette, { z0: 11, z1: 14, y0: 23, y1: 26, x: 13, gapStart: 12, gapEnd: 13 });

    builder.add("1x1", palette.stoneAccent, 0, 9, 25, 10);
    builder.add("1x1", palette.stoneAccent, 0, 12, 25, 15);
    builder.add("1x1", palette.stoneAccent, 0, 8, 25, 11);
    builder.add("1x1", palette.stoneAccent, 0, 13, 25, 14);
    fillRect1x1(builder, 8, 13, 27, 10, 15, (x, y, z) => {
        if (x === 8 || x === 13 || z === 10 || z === 15) return palette.timber;
        return palette.roofBlueDark;
    });
}

function addTowerRoof(builder, palette) {
    fillRect1x1(builder, 7, 14, 28, 9, 16, (x, y, z) => {
        if (x === 7 || x === 14 || z === 9 || z === 16) return palette.timber;
        if (x === 8 || x === 13 || z === 10 || z === 15) return palette.roofBlueDark;
        return palette.roofBlue;
    });
    fillRect1x1(builder, 8, 13, 29, 10, 15, (x, y, z) => {
        if (x === 8 || x === 13 || z === 10 || z === 15) return palette.roofBlueDark;
        if ((x === 9 || x === 12) && (z === 11 || z === 14)) return palette.roofBlue;
        return palette.roofBlueDark;
    });
    fillRect1x1(builder, 9, 12, 30, 11, 14, (x, y, z) => {
        if (x === 9 || x === 12 || z === 11 || z === 14) return palette.roofBlue;
        return palette.roofBlueDark;
    });
    fillRect1x1(builder, 10, 11, 31, 12, 13, palette.roofBlueDark);

    builder.add("1x1", palette.shadow, 0, 10, 31, 12);
    builder.add("1x1", palette.bannerRed, 0, 11, 31, 12);
    builder.add("1x1", palette.bannerYellow, 0, 11, 31, 13);
}

function addFinalDetails(builder, palette) {
    builder.add("1x1", palette.shadow, 0, 10, 4, 3);
    builder.add("1x1", palette.shadow, 0, 9, 9, 10);
    builder.add("1x1", palette.shadow, 0, 12, 18, 9);
    builder.add("1x1", palette.shadow, 0, 14, 5, 4);
    builder.add("1x1", palette.shadow, 0, 15, 6, 4);
    builder.add("1x1", palette.stoneAccent, 0, 3, 6, 6);
    builder.add("1x1", palette.stoneAccent, 0, 3, 7, 10);
    builder.add("1x1", palette.shadow, 0, 4, 6, 11);
    builder.add("1x1", palette.shadow, 0, 13, 14, 9);
    builder.add("1x1", palette.stoneAccent, 0, 14, 12, 10);

    builder.add("1x1", palette.vine, 0, 2, 1, 5);
    builder.add("1x1", palette.vine, 0, 2, 2, 6);
    builder.add("1x1", palette.vine, 0, 3, 2, 6);
    builder.add("1x1", palette.vine, 0, 3, 3, 7);
    builder.add("1x1", palette.flowerBlue, 0, 2, 1, 4);
    builder.add("1x1", palette.flowerWhite, 0, 4, 1, 5);
    builder.add("1x1", palette.flowerBlue, 0, 15, 1, 3);
    builder.add("1x1", palette.flowerWhite, 0, 16, 1, 3);
    builder.add("1x1", palette.flowerBlue, 0, 15, 1, 10);
    builder.add("1x1", palette.vine, 0, 16, 2, 10);
    builder.add("1x1", palette.flowerWhite, 0, 1, 1, 14);

    builder.add("1x1", palette.stoneAccent, 0, 0, 1, 6);
    builder.add("1x1", palette.stoneAccent, 0, 3, 1, 13);
    builder.add("1x1", palette.stoneAccent, 0, 8, 1, 17);
    builder.add("1x1", palette.stoneAccent, 0, 13, 1, 17);
    builder.add("1x1", palette.timber, 0, 7, 28, 9);
    builder.add("1x1", palette.timber, 0, 14, 28, 16);
    builder.add("1x1", palette.roofBlue, 0, 9, 29, 11);
    builder.add("1x1", palette.roofBlue, 0, 12, 29, 14);
}

function buildGuaritaMedievalBlocks() {
    const builder = createPrefabBuilder();
    const pickStone = createStonePicker(PALETTE);

    addGroundAndFoundations(builder, PALETTE);
    addFrontStairs(builder, PALETTE);
    reserveOpenings(builder, PALETTE);
    buildLeftBastion(builder, pickStone, PALETTE);
    buildMainStoneWalls(builder, pickStone);
    addMainPortalDetails(builder, PALETTE);
    addMainUpperDeck(builder, PALETTE);
    buildTowerSupports(builder, PALETTE);
    buildAnnexStoneBase(builder, pickStone);
    buildAnnexUpperFrame(builder, PALETTE);
    addAnnexRoofAndBanner(builder, PALETTE);
    buildTowerShaft(builder, pickStone);
    addTowerLookout(builder, PALETTE);
    addTowerRoof(builder, PALETTE);
    addFinalDetails(builder, PALETTE);

    return builder.blocks;
}

const GuaritaMedieval = {
    dx: 18,
    dy: 32,
    dz: 18,
    blocks: buildGuaritaMedievalBlocks(),
};

export default GuaritaMedieval;