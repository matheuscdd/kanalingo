import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe, addSolid } from "../shared/core.js";
const BasilicaSaoPedro = {
    dx: 40,
    dy: 27,
    dz: 34,
    blocks: (function () {
        const builder = createPrefabBuilder();
        const stone = "#f4f4f4";
        const dark = "#111111";
        const gold = "#f2cd37";
        const glass = "#0055bf";

        // Funções auxiliares migradas para helpers otimizados
        const addSolidHelper = (x0, y0, z0, width, depth, height, color) => {
            addSolid(builder.blocks, x0, y0, z0, width, depth, [height, color]);
        };
        const addColumn = (lx, ly, lz, height, color) => {
            addPillarStackSafe(builder, lx, ly, lz, height, color);
        };
        const addPediment = (x0, width, z0, y0, color) => {
            let currentX = x0;
            let span = width;
            let currentY = y0;
            while (span >= 4) {
                addFilledRectSafe(builder, currentX, currentY, z0, span, 2, color);
                currentX += 2;
                span -= 4;
                currentY += 1;
            }
        };
        const addRoofBandX = (x0, x1, z, y, rot, color) => {
            for (let x = x0; x <= x1; x += 2) {
                builder.add("Roof 1x2", color, rot, x, y, z);
            }
        };

        addSolidHelper(4, 0, 4, 32, 26, 1, stone);
        addSolidHelper(6, 1, 6, 28, 22, 1, stone);
        addSolidHelper(8, 0, 0, 24, 4, 1, stone);
        addSolidHelper(10, 1, 2, 20, 4, 1, stone);

        addSolidHelper(10, 2, 8, 20, 18, 6, stone);
        addSolidHelper(4, 2, 14, 6, 6, 5, stone);
        addSolidHelper(30, 2, 14, 6, 6, 5, stone);
        addSolidHelper(12, 2, 26, 16, 6, 5, stone);
        addSolidHelper(8, 2, 4, 24, 4, 1, stone);

        for (let y = 3; y <= 8; y++) {
            for (let x = 10; x < 30; x++) {
                if (y <= 5 && x >= 17 && x <= 22) continue;
                builder.add("1x1", stone, 0, x, y, 7);
            }
        }

        for (let y = 3; y <= 8; y++) {
            for (let z = 4; z <= 7; z++) {
                builder.add("1x1", stone, 0, 8, y, z);
                builder.add("1x1", stone, 0, 31, y, z);
            }
        }

        [9, 12, 15, 18, 21, 24, 27, 30].forEach((x) => addColumn(x, 3, 4, 6, stone));

        addSolidHelper(8, 9, 4, 24, 4, 1, stone);
        addPediment(14, 12, 3, 10, stone);

        [10, 14, 18, 22, 26, 30].forEach((x) => {
            builder.add("1x1", gold, 0, x, 10, 6);
        });
        builder.add("1x1", gold, 0, 19, 13, 4);
        builder.add("1x1", gold, 0, 20, 13, 4);

        [10, 14, 20, 24].forEach((z) => {
            addColumn(9, 3, z, 4, stone);
            addColumn(30, 3, z, 4, stone);
        });
        [15, 18].forEach((z) => {
            addColumn(3, 3, z, 4, stone);
            addColumn(36, 3, z, 4, stone);
        });

        [12, 18, 23].forEach((z) => {
            builder.add("Window", glass, 0, 9, 4, z);
            builder.add("Window", glass, 0, 30, 4, z);
        });

        [16, 20, 24].forEach((x) => {
            builder.add("Window", glass, 1, x, 4, 32);
        });

        for (let step = 0; step < 4; step++) {
            const leftX = 10 + step * 2;
            const rightX = 28 - step * 2;
            const roofY = 8 + step;
            for (let z = 9; z <= 24; z++) {
                if (z >= 13 && z <= 22) continue;
                builder.add("Roof 1x2", dark, 1, leftX, roofY, z);
                builder.add("Roof 1x2", dark, 3, rightX, roofY, z);
            }
        }

        [9, 11, 23].forEach((z) => {
            builder.add("Tile 2x2", dark, 0, 19, 12, z);
        });

        [4, 30].forEach((x0) => {
            addRoofBandX(x0, x0 + 4, 14, 7, 0, dark);
            addRoofBandX(x0, x0 + 4, 18, 7, 2, dark);
            addRoofBandX(x0, x0 + 4, 15, 8, 0, dark);
            addRoofBandX(x0, x0 + 4, 17, 8, 2, dark);
        });

        builder.add("Tile 2x2", dark, 0, 6, 9, 16);
        builder.add("Tile 2x2", dark, 0, 32, 9, 16);

        addRoofBandX(12, 26, 26, 7, 0, dark);
        addRoofBandX(12, 26, 30, 7, 2, dark);
        addRoofBandX(14, 24, 27, 8, 0, dark);
        addRoofBandX(14, 24, 29, 8, 2, dark);

        [16, 20, 24].forEach((x) => {
            builder.add("Tile 2x2", dark, 0, x, 9, 28);
        });

        addFilledRectSafe(builder, 15, 8, 13, 10, 10, stone);

        for (let y = 9; y <= 11; y++) {
            for (let x = 15; x < 25; x++) {
                builder.add("1x1", stone, 0, x, y, 13);
                builder.add("1x1", stone, 0, x, y, 22);
            }
            for (let z = 14; z < 22; z++) {
                builder.add("1x1", stone, 0, 15, y, z);
                builder.add("1x1", stone, 0, 24, y, z);
            }
        }

        builder.add("Window", glass, 1, 18, 9, 12);
        builder.add("Window", glass, 1, 18, 9, 23);
        builder.add("Window", glass, 0, 14, 9, 17);
        builder.add("Window", glass, 0, 25, 9, 17);

        addFilledRectSafe(builder, 16, 12, 14, 8, 8, stone);
        addFilledRectSafe(builder, 16, 13, 14, 8, 8, stone);
        addFilledRectSafe(builder, 17, 14, 15, 6, 6, stone);
        addFilledRectSafe(builder, 17, 15, 15, 6, 6, stone);
        addFilledRectSafe(builder, 18, 16, 16, 4, 4, stone);
        addFilledRectSafe(builder, 18, 17, 16, 4, 4, stone);
        builder.add("2x2", stone, 0, 19, 18, 17);
        builder.add("2x2", stone, 0, 19, 19, 17);
        addColumn(19, 20, 17, 3, stone);

        builder.add("1x1", gold, 0, 19, 23, 17);
        builder.add("1x1", gold, 0, 19, 24, 17);
        builder.add("1x1", gold, 0, 19, 25, 17);
        builder.add("1x1", gold, 0, 18, 24, 17);
        builder.add("1x1", gold, 0, 20, 24, 17);

        return builder.blocks;
    })(),
};

export default BasilicaSaoPedro;
