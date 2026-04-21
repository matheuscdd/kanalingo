import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

const FushimiInariTaisha = {
    dx: 36,
    dy: 22,
    dz: 34,
    blocks: (function () {
        const builder = createPrefabBuilder();
        const vermilion = "#c74e24";
        const wood = "#8b5a2b";
        const ivory = "#f4f4f4";
        const dark = "#111111";
        const gold = "#f2cd37";

        const addColumn = (lx, y0, lz, height, color = vermilion) => {
            for (let y = y0; y < y0 + height; y++) {
                builder.add("1x1", color, 0, lx, y, lz);
            }
        };

        const addTallPillar = (lx, y0, lz, height, color = vermilion) => {
            const top = y0 + height;
            let cursor = y0;
            for (; cursor + 3 <= top; cursor += 3) {
                addPillarStackSafe(builder, lx, cursor, lz, 3, color);
            }
            if (cursor < top) addColumn(lx, cursor, lz, top - cursor, color);
        };

        const addRoof = (minX, maxX, minZ, maxZ, y) => {
            for (let x = minX; x <= maxX; x += 2) {
                builder.add("Roof 1x2", dark, 0, x, y, minZ);
                builder.add("Roof 1x2", dark, 2, x, y, maxZ);
            }
            for (let z = minZ + 2; z <= maxZ - 2; z += 2) {
                builder.add("Roof 1x2", dark, 1, minX, y, z);
                builder.add("Roof 1x2", dark, 3, maxX, y, z);
            }
        };

        const addTorii = (x0, z0) => {
            [x0 + 1, x0 + 8].forEach((lx) => {
                addTallPillar(lx, 1, z0, 6, vermilion);
                addColumn(lx, 7, z0, 1, dark);
            });
            for (let x = x0 + 2; x <= x0 + 7; x++) {
                builder.add("1x1", wood, 0, x, 5, z0);
                builder.add("1x1", vermilion, 0, x, 6, z0);
                builder.add("1x1", dark, 0, x, 7, z0);
            }
            builder.add("1x1", dark, 0, x0, 8, z0);
            builder.add("1x1", dark, 0, x0 + 1, 8, z0);
            builder.add("1x1", dark, 0, x0 + 1, 9, z0);
            builder.add("1x1", dark, 0, x0 + 8, 8, z0);
            builder.add("1x1", dark, 0, x0 + 8, 9, z0);
            builder.add("1x1", dark, 0, x0 + 9, 8, z0);
            builder.add("1x1", gold, 0, x0 + 4, 8, z0);
        };

        const addWing = (x0) => {
            const z0 = 24;
            addFilledRectSafe(builder, x0, 4, z0, 8, 8, wood);
            [ [x0 + 1, z0 + 1], [x0 + 1, z0 + 6], [x0 + 6, z0 + 1], [x0 + 6, z0 + 6] ].forEach(([lx, lz]) => addTallPillar(lx, 5, lz, 3, vermilion));
            for (let y = 5; y < 8; y++) {
                for (let x = x0 + 2; x < x0 + 6; x++) {
                    if (x < x0 + 3 || x > x0 + 4) {
                        builder.add("1x1", ivory, 0, x, y, z0 + 1);
                    }
                    builder.add("1x1", ivory, 0, x, y, z0 + 6);
                }
                for (let z = z0 + 2; z < z0 + 6; z++) {
                    builder.add("1x1", ivory, 0, x0 + 1, y, z);
                    builder.add("1x1", ivory, 0, x0 + 6, y, z);
                }
            }
            addFilledRectSafe(builder, x0, 8, z0, 8, 8, wood);
            addRoof(x0 - 1, x0 + 7, z0 - 1, z0 + 7, 9);
        };

        addFilledRectSafe(builder, 13, 0, 0, 10, 14, ivory);
        addFilledRectSafe(builder, 10, 0, 14, 16, 4, ivory);
        addFilledRectSafe(builder, 4, 0, 18, 28, 16, ivory);

        addFilledRectSafe(builder, 10, 1, 18, 16, 4, wood);
        addFilledRectSafe(builder, 11, 2, 20, 14, 4, wood);
        addFilledRectSafe(builder, 12, 3, 22, 12, 4, wood);

        for (let z = 0; z <= 16; z += 2) {
            addTorii(13, z);
        }

    addFilledRectSafe(builder, 7, 4, 21, 22, 12, wood);
    addWing(2);
    addWing(26);

    const lowerPillars = [ [10, 23], [14, 23], [18, 23], [22, 23], [26, 23], [10, 30], [14, 30], [18, 30], [22, 30], [26, 30] ];
    lowerPillars.forEach(([lx, lz]) => addTallPillar(lx, 5, lz, 4, vermilion));

        for (let y = 5; y < 9; y++) {
            for (let x = 11; x < 26; x++) {
                if (x < 16 || x > 19) {
                    builder.add("1x1", ivory, 0, x, y, 24);
                }
                const rearOpening = y >= 6 && y <= 7 && ((x >= 13 && x <= 14) || (x >= 22 && x <= 23));
                if (!rearOpening) {
                    builder.add("1x1", ivory, 0, x, y, 29);
                }
            }
            for (let z = 25; z < 29; z++) {
                const sideOpening = y >= 6 && y <= 7 && z >= 26 && z <= 27;
                if (!sideOpening) {
                    builder.add("1x1", ivory, 0, 10, y, z);
                    builder.add("1x1", ivory, 0, 26, y, z);
                }
            }
        }

        [12, 22].forEach((lx) => {
            builder.add("Tile 2x2", gold, 0, lx, 5, 22);
            builder.add("Tile 2x2", gold, 0, lx + 4, 5, 22);
        });

    addFilledRectSafe(builder, 7, 9, 21, 22, 10, wood);
    addRoof(6, 28, 20, 32, 10);
    addRoof(7, 27, 21, 31, 11);

    addFilledRectSafe(builder, 12, 12, 24, 12, 8, wood);

    [ [13, 25], [17, 25], [21, 25], [13, 30], [17, 30], [21, 30] ].forEach(([lx, lz]) => addTallPillar(lx, 13, lz, 3, vermilion));

        for (let y = 13; y < 16; y++) {
            for (let x = 14; x < 21; x++) {
                if (x < 16 || x > 18) {
                    builder.add("1x1", ivory, 0, x, y, 26);
                }
                const rearOpening = y === 14 && x >= 16 && x <= 18;
                if (!rearOpening) {
                    builder.add("1x1", ivory, 0, x, y, 29);
                }
            }
            for (let z = 27; z < 29; z++) {
                builder.add("1x1", ivory, 0, 13, y, z);
                builder.add("1x1", ivory, 0, 21, y, z);
            }
        }


        addFilledRectSafe(builder, 11, 16, 23, 14, 10, wood);
        addRoof(10, 24, 22, 32, 17);
        addRoof(11, 23, 23, 31, 18);

        return builder.blocks;
    })(),
};

export default FushimiInariTaisha;
