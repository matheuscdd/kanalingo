import { createPrefabBuilder, addFilledRectSafe } from "../shared/core.js";

const ParthenonGrego = {
    dx: 18,
    dy: 13,
    dz: 30,
    blocks: (function () {
        const builder = createPrefabBuilder();
        const stone = "#f4f4f4";
        const dark = "#111111";
        const gold = "#f2cd37";

        function addSolid(x0, y0, z0, width, depth, height, color) {
            for (let y = y0; y < y0 + height; y++) {
                addFilledRectSafe(builder, x0, y, z0, width, depth, color);
            }
        }

        function addColumn(lx, ly, lz, height, color, capColor = color) {
            const topY = ly + height - 1;
            let cursor = ly;

            while (cursor + 2 < topY) {
                builder.add("Pillar", color, 0, lx, cursor, lz);
                cursor += 3;
            }

            while (cursor < topY) {
                builder.add("1x1", color, 0, lx, cursor, lz);
                cursor++;
            }

            builder.add("1x1", capColor, 0, lx, topY, lz);
        }

        function addPediment(x0, width, z0, y0, color) {
            let currentX = x0;
            let span = width;
            let currentY = y0;

            while (span >= 4) {
                addFilledRectSafe(builder, currentX, currentY, z0, span, 2, color);
                currentX += 2;
                span -= 4;
                currentY += 1;
            }
        }

        addFilledRectSafe(builder, 0, 0, 0, 18, 30, stone);
        addFilledRectSafe(builder, 1, 1, 1, 16, 28, stone);
        addFilledRectSafe(builder, 1, 2, 2, 16, 26, stone);

        const frontBackXs = [1, 3, 5, 7, 9, 11, 13, 15];
        const sideZs = [7, 11, 15, 19, 23];

        frontBackXs.forEach((x) => {
            addColumn(x, 3, 3, 4, stone, gold);
            addColumn(x, 3, 25, 4, stone, gold);
        });

        sideZs.forEach((z) => {
            addColumn(1, 3, z, 4, stone, gold);
            addColumn(15, 3, z, 4, stone, gold);
        });

        [5, 11].forEach((x) => {
            addColumn(x, 3, 6, 4, stone, gold);
            addColumn(x, 3, 23, 4, stone, gold);
        });

        addSolid(4, 3, 7, 4, 2, 4, stone);
        addSolid(10, 3, 7, 4, 2, 4, stone);
        addSolid(4, 3, 21, 10, 2, 4, stone);
        addSolid(4, 3, 9, 2, 12, 4, stone);
        addSolid(12, 3, 9, 2, 12, 4, stone);
        addFilledRectSafe(builder, 6, 3, 9, 6, 12, dark);

        addFilledRectSafe(builder, 1, 7, 2, 16, 26, stone);

        addPediment(1, 16, 2, 8, stone);
        addPediment(1, 16, 26, 8, stone);

        for (let step = 0; step < 4; step++) {
            const leftX = 1 + step * 2;
            const rightX = 15 - step * 2;
            const roofY = 8 + step;

            for (let z = 4; z <= 25; z++) {
                builder.add("Roof 1x2", dark, 1, leftX, roofY, z);
                builder.add("Roof 1x2", dark, 3, rightX, roofY, z);
            }
        }

        builder.add("1x1", gold, 0, 8, 12, 3);
        builder.add("1x1", gold, 0, 9, 12, 3);
        builder.add("1x1", gold, 0, 8, 12, 26);
        builder.add("1x1", gold, 0, 9, 12, 26);

        return builder.blocks;
    })(),
};

export default ParthenonGrego;
