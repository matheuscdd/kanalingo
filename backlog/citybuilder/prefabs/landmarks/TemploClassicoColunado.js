import { createPrefabBuilder, addFilledRectSafe } from "../shared/core.js";

const TemploClassicoColunado = {
    dx: 40,
    dy: 22,
    dz: 30,
    blocks: (function () {
        const builder = createPrefabBuilder();

        const palette = {
            baseDark: "#2f2a22",
            baseLight: "#e7d8b5",
            grass: "#3e6e36",
            path: "#78736d",
            pathLight: "#9e9992",
            podium: "#c7ad85",
            podiumLight: "#d7bf98",
            wallLight: "#eadfc7",
            wallShade: "#d5c7ad",
            redWall: "#8b3d34",
            roof: "#b78456",
            roofLight: "#cca06c",
            roofDark: "#8d6748",
            gold: "#c89d35",
            teal: "#2b6f73",
            greenColumn: "#3d5a42",
            redColumn: "#8b3b35",
            columnStone: "#d7c9ac",
            bark: "#6d4b32",
            leaf: "#274e34",
            leafLight: "#3a6d42",
            flame: "#f2a52b",
            flameCore: "#f6d76d",
            statue: "#d8d4cb",
            trimDark: "#6d5844",
        };

        function place(type, color, rot, lx, ly, lz, options = {}) {
            const added = builder.add(type, color, rot, lx, ly, lz, options);
            if (!added) {
                throw new Error(`TemploClassicoColunado overlap near ${type} @ ${lx},${ly},${lz}`);
            }
        }

        function fillRect(x0, y, z0, width, depth, color) {
            if (width <= 0 || depth <= 0) return;

            const evenWidth = width - (width % 2);
            const evenDepth = depth - (depth % 2);

            if (evenWidth >= 2 && evenDepth >= 2) {
                addFilledRectSafe(builder, x0, y, z0, evenWidth, evenDepth, color);
            }

            for (let x = x0 + evenWidth; x < x0 + width; x++) {
                for (let z = z0; z < z0 + depth; z++) {
                    place("1x1", color, 0, x, y, z);
                }
            }

            for (let x = x0; x < x0 + evenWidth; x++) {
                for (let z = z0 + evenDepth; z < z0 + depth; z++) {
                    place("1x1", color, 0, x, y, z);
                }
            }
        }

        function addSolid(x0, y0, z0, width, depth, height, color) {
            for (let y = y0; y < y0 + height; y++) {
                fillRect(x0, y, z0, width, depth, color);
            }
        }

        function addPillarStackStrict(lx, y0, lz, height, color) {
            let y = y0;
            for (; y + 3 <= y0 + height; y += 3) {
                place("Pillar", color, 0, lx, y, lz);
            }
            for (; y < y0 + height; y++) {
                place("1x1", color, 0, lx, y, lz);
            }
        }

        function addColumn(lx, lz, shaftColor) {
            addPillarStackStrict(lx, 6, lz, 5, shaftColor);
            place("1x1", palette.gold, 0, lx, 11, lz);
        }

        function addPediment(x0, width, z0, y0, color) {
            let currentX = x0;
            let span = width;
            let currentY = y0;

            while (span >= 4) {
                fillRect(currentX, currentY, z0, span, 2, color);
                currentX += 2;
                span -= 4;
                currentY += 1;
            }
        }

        function addCypress(lx, lz, height = 10) {
            addPillarStackStrict(lx, 3, lz, height - 2, palette.bark);

            for (let y = 4; y <= 10; y++) {
                place("1x1", palette.leaf, 0, lx, y, lz - 1);
                place("1x1", palette.leaf, 0, lx, y, lz + 1);
            }

            for (let y = 5; y <= 9; y++) {
                place("1x1", palette.leafLight, 0, lx - 1, y, lz);
                place("1x1", palette.leafLight, 0, lx + 1, y, lz);
            }

            for (let y = 6; y <= 8; y++) {
                place("1x1", palette.leaf, 0, lx, y, lz - 2);
                place("1x1", palette.leaf, 0, lx, y, lz + 2);
            }
        }

        function addTorch(lx, lz) {
            addPillarStackStrict(lx, 6, lz, 2, palette.trimDark);
            place("1x1", palette.flame, 0, lx, 8, lz);
            place("1x1", palette.flameCore, 0, lx, 9, lz);
        }

        function addStatue(lx, lz) {
            fillRect(lx, 3, lz, 2, 2, palette.podiumLight);
            place("1x1", palette.statue, 0, lx, 4, lz);
            place("1x1", palette.statue, 0, lx + 1, 4, lz);
            place("1x1", palette.statue, 0, lx, 5, lz + 1);
        }

        fillRect(0, 0, 0, 40, 30, palette.baseDark);
        fillRect(0, 1, 0, 40, 30, palette.baseLight);
        fillRect(1, 2, 1, 38, 28, palette.grass);

        [
            [2, 2], [3, 3], [4, 2], [5, 4], [6, 3], [7, 4], [8, 5], [9, 4],
            [2, 4], [3, 5], [4, 4], [5, 6], [6, 5], [7, 6], [8, 7], [9, 6],
            [3, 7], [4, 8], [5, 7], [6, 8], [7, 7], [8, 8], [9, 8], [10, 8],
        ].forEach(([lx, lz], index) => {
            place("1x1", index % 3 === 0 ? palette.pathLight : palette.path, 0, lx, 3, lz);
        });

        addSolid(8, 3, 8, 24, 16, 1, palette.podium);
        addSolid(9, 4, 9, 22, 14, 1, palette.podiumLight);
        addSolid(10, 5, 10, 20, 12, 1, palette.wallShade);

        fillRect(13, 3, 4, 14, 2, palette.podium);
        fillRect(14, 4, 6, 12, 2, palette.podiumLight);
        fillRect(15, 5, 8, 10, 2, palette.wallShade);

        for (let y = 6; y <= 11; y++) {
            const lowerColor = y <= 8 ? palette.redWall : palette.wallLight;

            for (let x = 14; x <= 25; x++) {
                place("1x1", y === 11 ? palette.wallShade : lowerColor, 0, x, y, 19);
            }

            for (let z = 13; z <= 18; z++) {
                place("1x1", y === 11 ? palette.wallShade : lowerColor, 0, 14, y, z);
                place("1x1", y === 11 ? palette.wallShade : lowerColor, 0, 25, y, z);
            }

            for (let x = 14; x <= 17; x++) {
                place("1x1", y === 11 ? palette.wallShade : lowerColor, 0, x, y, 12);
            }
            for (let x = 22; x <= 25; x++) {
                place("1x1", y === 11 ? palette.wallShade : lowerColor, 0, x, y, 12);
            }
        }

        for (let x = 18; x <= 21; x++) {
            place("1x1", palette.trimDark, 0, x, 6, 13);
            place("1x1", palette.trimDark, 0, x, 7, 13);
            place("1x1", palette.trimDark, 0, x, 8, 13);
        }

        [10, 13, 16, 19, 22, 25, 28].forEach((x, index) => {
            const frontColor = index === 0 || index === 6 ? palette.greenColumn : (index % 2 === 0 ? palette.redColumn : palette.columnStone);
            addColumn(x, 10, frontColor);
            addColumn(x, 21, palette.columnStone);
        });

        [13, 16, 19].forEach((z) => {
            addColumn(10, z, palette.columnStone);
            addColumn(28, z, palette.columnStone);
        });

        for (let x = 10; x <= 28; x++) {
            const frontColor = x % 3 === 0 ? palette.teal : (x % 2 === 0 ? palette.gold : palette.wallLight);
            const backColor = x % 3 === 0 ? palette.teal : (x % 2 === 0 ? palette.gold : palette.wallShade);
            place("1x1", frontColor, 0, x, 12, 10);
            place("1x1", backColor, 0, x, 12, 21);
        }

        for (let z = 11; z <= 20; z++) {
            const leftColor = z % 3 === 0 ? palette.teal : palette.gold;
            const rightColor = z % 3 === 0 ? palette.teal : palette.gold;
            place("1x1", leftColor, 0, 10, 12, z);
            place("1x1", rightColor, 0, 28, 12, z);
        }

        fillRect(11, 12, 11, 16, 10, palette.wallShade);
        fillRect(9, 13, 9, 22, 14, palette.wallLight);

        addPediment(9, 22, 8, 14, palette.wallLight);
        addPediment(9, 22, 21, 14, palette.wallLight);

        for (let step = 0; step < 5; step++) {
            const leftX = 9 + step * 2;
            const rightX = 29 - step * 2;
            const roofY = 14 + step;

            for (let z = 10; z <= 20; z++) {
                place("Roof 1x2", (z + step) % 3 === 0 ? palette.roofLight : palette.roof, 1, leftX, roofY, z);
                place("Roof 1x2", (z + step + 1) % 3 === 0 ? palette.roofLight : palette.roof, 3, rightX, roofY, z);
            }
        }

        for (let z = 10; z <= 20; z += 2) {
            place("Tile 2x2", palette.roofDark, 0, 19, 19, z);
        }

        place("1x1", palette.gold, 0, 19, 19, 9);
        place("1x1", palette.gold, 0, 20, 19, 9);
        place("1x1", palette.gold, 0, 19, 19, 22);
        place("1x1", palette.gold, 0, 20, 19, 22);

        addTorch(12, 10);
        addTorch(26, 10);
        addStatue(5, 3);

        [
            [4, 11], [4, 20], [35, 11], [35, 20], [33, 8], [33, 23],
        ].forEach(([lx, lz]) => addCypress(lx, lz));

        [
            [6, 12], [7, 13], [6, 14], [6, 15], [7, 17], [33, 12], [34, 13], [33, 14],
            [32, 21], [33, 22], [32, 24], [12, 24], [13, 24], [14, 25],
        ].forEach(([lx, lz], index) => {
            place("1x1", index % 2 === 0 ? palette.leaf : palette.leafLight, 0, lx, 3, lz);
        });

        [
            [31, 6], [32, 6], [33, 7], [34, 6], [35, 7], [36, 8], [37, 8],
        ].forEach(([lx, lz], index) => {
            place("1x1", index % 2 === 0 ? palette.pathLight : palette.path, 0, lx, 3, lz);
        });

        return builder.blocks;
    })(),
};

export default TemploClassicoColunado;