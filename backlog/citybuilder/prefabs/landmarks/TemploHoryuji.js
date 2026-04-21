import { createPrefabBuilder, addFilledRectSafe } from "../shared/core.js";

const TemploHoryuji = {
    dx: 16,
    dy: 25,
    dz: 17,
    blocks: (function () {
        const baseBuilder = createPrefabBuilder();
        const builder = {
            blocks: baseBuilder.blocks,
            add(type, color, rot, lx, ly, lz) {
                return baseBuilder.add(type, color, rot, lx - 1, ly, lz);
            },
        };
        const green = "#237841";
        const red = "#e3000b";
        const ivory = "#f4f4f4";
        const dark = "#111111";
        const gold = "#f2cd37";
        const stages = [
            { bodyMin: 4, size: 10, floorY: 2, roofMin: 2, roofMax: 15, windowOffsets: [6, 10], chamberSize: 4 },
            { bodyMin: 5, size: 8, floorY: 6, roofMin: 3, roofMax: 14, windowOffsets: [8], chamberSize: 4 },
            { bodyMin: 6, size: 6, floorY: 10, roofMin: 4, roofMax: 13, windowOffsets: [8], chamberSize: 2 },
            { bodyMin: 6, size: 6, floorY: 14, roofMin: 5, roofMax: 12, windowOffsets: [], chamberSize: 2 },
            { bodyMin: 7, size: 4, floorY: 18, roofMin: 6, roofMax: 11, windowOffsets: [], chamberSize: 2 },
        ];

        function addColumn(lx, y0, lz, height, color) {
            for (let y = y0; y < y0 + height; y++) {
                builder.add("1x1", color, 0, lx, y, lz);
            }
        }

        function addRoof(roofMin, roofMax, y) {
            for (let x = roofMin; x < roofMax; x += 2) {
                builder.add("Roof 1x2", dark, 0, x, y, roofMin);
                builder.add("Roof 1x2", dark, 2, x, y, roofMax - 1);
            }

            for (let z = roofMin + 2; z < roofMax; z += 2) {
                builder.add("Roof 1x2", dark, 1, roofMin, y, z);
                builder.add("Roof 1x2", dark, 3, roofMax, y, z);
            }
        }

        addFilledRectSafe(builder, 1, 0, 1, 16, 16, green);
        addFilledRectSafe(builder, 2, 1, 2, 14, 14, dark);

        [
            [7, 1, 0],
            [9, 1, 0],
            [5, 2, 2],
            [11, 2, 2],
        ].forEach(([lx, ly, lz]) => {
            builder.add("Tile 2x2", gold, 0, lx, ly, lz);
        });

        [
            [3, 2, 3],
            [14, 2, 3],
            [3, 2, 14],
            [14, 2, 14],
        ].forEach(([lx, ly, lz]) => {
            builder.add("1x1", gold, 0, lx, ly, lz);
            builder.add("1x1", dark, 0, lx, ly + 1, lz);
        });

        stages.forEach((stage, index) => {
            const bodyMax = stage.bodyMin + stage.size - 1;
            const roofY = stage.floorY + 3;
            const roofSpan = stage.roofMax - stage.roofMin;
            const chamberMin = Math.floor((stage.bodyMin + bodyMax + 1 - stage.chamberSize) / 2);
            const columnPoints = [
                [stage.bodyMin, stage.bodyMin],
                [bodyMax, stage.bodyMin],
                [stage.bodyMin, bodyMax],
                [bodyMax, bodyMax],
            ];

            if (index === 0) {
                const mid = Math.floor((stage.bodyMin + bodyMax) / 2);
                columnPoints.push([mid, stage.bodyMin], [mid, bodyMax], [stage.bodyMin, mid], [bodyMax, mid]);
            }

            addFilledRectSafe(builder, stage.bodyMin, stage.floorY, stage.bodyMin, stage.size, stage.size, red);

            columnPoints.forEach(([lx, lz]) => addColumn(lx, stage.floorY + 1, lz, 2, red));

            for (let y = stage.floorY + 1; y <= stage.floorY + 2; y++) {
                addFilledRectSafe(builder, chamberMin, y, chamberMin, stage.chamberSize, stage.chamberSize, ivory);
            }

            stage.windowOffsets.forEach((offset) => {
                builder.add("Window", ivory, 1, offset, stage.floorY + 1, stage.bodyMin);
                builder.add("Window", ivory, 1, offset, stage.floorY + 1, bodyMax);
                builder.add("Window", ivory, 0, stage.bodyMin, stage.floorY + 1, offset);
                builder.add("Window", ivory, 0, bodyMax, stage.floorY + 1, offset);
            });

            addFilledRectSafe(builder, stage.roofMin + 1, roofY - 1, stage.roofMin + 1, roofSpan, roofSpan, dark);

            [
                [stage.roofMin + 1, stage.roofMin + 1],
                [stage.roofMax, stage.roofMin + 1],
                [stage.roofMin + 1, stage.roofMax],
                [stage.roofMax, stage.roofMax],
            ].forEach(([lx, lz]) => {
                builder.add("1x1", gold, 0, lx, roofY - 1, lz);
            });

            addRoof(stage.roofMin, stage.roofMax, roofY);
            builder.add("2x2", dark, 0, 8, roofY, 8);
        });

        builder.add("2x2", gold, 0, 8, 22, 8);
        builder.add("1x1", gold, 0, 8, 23, 8);
        builder.add("1x1", gold, 0, 8, 24, 8);

        return builder.blocks;
    })(),
};

export default TemploHoryuji;
