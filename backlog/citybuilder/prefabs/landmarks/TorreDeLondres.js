import { createPrefabBuilder, addFilledRectSafe } from "../shared/core.js";

const TorreDeLondres = {
    dx: 28,
    dy: 16,
    dz: 24,
    blocks: (function () {
        const builder = createPrefabBuilder();
        const green = "#237841";
        const dark = "#111111";
        const ivory = "#f4f4f4";
        const gold = "#f2cd37";
        const red = "#e3000b";

        function addCornerTower(x0, z0) {
            for (let y = 2; y < 8; y++) {
                addFilledRectSafe(builder, x0, y, z0, 4, 4, dark);
            }
            addFilledRectSafe(builder, x0 + 1, 8, z0 + 1, 2, 2, ivory);
            builder.add("1x1", gold, 0, x0 + 1, 9, z0 + 1);
            builder.add("1x1", gold, 0, x0 + 2, 9, z0 + 2);
        }

        function addWallCaps() {
            addFilledRectSafe(builder, 4, 6, 1, 20, 2, ivory);
            addFilledRectSafe(builder, 4, 6, 21, 20, 2, ivory);
            addFilledRectSafe(builder, 1, 6, 4, 2, 16, ivory);
            addFilledRectSafe(builder, 25, 6, 4, 2, 16, ivory);

            for (let x = 4; x < 24; x += 4) {
                builder.add("1x1", ivory, 0, x, 7, 1);
                builder.add("1x1", ivory, 0, x + 1, 7, 1);
                builder.add("1x1", ivory, 0, x, 7, 22);
                builder.add("1x1", ivory, 0, x + 1, 7, 22);
            }

            for (let z = 4; z < 20; z += 4) {
                builder.add("1x1", ivory, 0, 1, 7, z);
                builder.add("1x1", ivory, 0, 1, 7, z + 1);
                builder.add("1x1", ivory, 0, 26, 7, z);
                builder.add("1x1", ivory, 0, 26, 7, z + 1);
            }
        }

        function addWardBuilding(x0) {
            for (let y = 2; y < 5; y++) {
                addFilledRectSafe(builder, x0, y, 7, 4, 8, dark);
            }
            addFilledRectSafe(builder, x0 + 1, 5, 8, 2, 6, red);
            builder.add("1x1", gold, 0, x0 + 1, 6, 10);
            builder.add("1x1", gold, 0, x0 + 2, 6, 11);
        }

        addFilledRectSafe(builder, 0, 0, 0, 28, 24, green);
        addFilledRectSafe(builder, 1, 1, 1, 26, 22, dark);

        [
            [0, 0],
            [24, 0],
            [0, 20],
            [24, 20],
        ].forEach(([x0, z0]) => addCornerTower(x0, z0));

        for (let y = 2; y < 6; y++) {
            addFilledRectSafe(builder, 4, y, 1, 20, 2, dark);
            addFilledRectSafe(builder, 4, y, 21, 20, 2, dark);
            addFilledRectSafe(builder, 1, y, 4, 2, 16, dark);
            addFilledRectSafe(builder, 25, y, 4, 2, 16, dark);
        }

        addWallCaps();

        [5, 19].forEach((x0) => addWardBuilding(x0));

        [17, 19].forEach((lz) => {
            builder.add("Tile 2x2", ivory, 0, 12, 2, lz);
            builder.add("Tile 2x2", ivory, 0, 14, 2, lz);
        });

        for (let y = 2; y < 7; y++) {
            addFilledRectSafe(builder, 9, y, 7, 10, 10, ivory);
        }

        [
            [9, 7],
            [18, 7],
            [9, 16],
            [18, 16],
        ].forEach(([lx, lz]) => {
            builder.add("Pillar", ivory, 0, lx, 7, lz);
            builder.add("1x1", gold, 0, lx, 10, lz);
        });

        for (let y = 7; y < 10; y++) {
            addFilledRectSafe(builder, 10, y, 8, 8, 8, ivory);
        }

        addFilledRectSafe(builder, 11, 10, 9, 6, 6, dark);

        [
            [10, 8],
            [17, 8],
            [10, 15],
            [17, 15],
        ].forEach(([lx, lz]) => {
            builder.add("Pillar", ivory, 0, lx, 10, lz);
            builder.add("1x1", gold, 0, lx, 13, lz);
        });

        builder.add("Pillar", dark, 0, 13, 11, 11);
        builder.add("1x1", gold, 0, 13, 14, 11);
        builder.add("1x1", gold, 0, 13, 8, 22);
        builder.add("1x1", gold, 0, 14, 8, 22);

        return builder.blocks;
    })(),
};

export default TorreDeLondres;
