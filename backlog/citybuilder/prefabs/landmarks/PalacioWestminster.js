import { createPrefabBuilder, addFilledRectSafe } from "../shared/core.js";

const PalacioWestminster = {
    dx: 56,
    dy: 30,
    dz: 24,
    blocks: (function () {
        const builder = createPrefabBuilder();
        const stone = "#b89b5c";
        const shadow = "#8c7340";
        const trim = "#f4f4f4";
        const dark = "#111111";
        const roof = "#4a4a4a";
        const gold = "#f2cd37";
        const glass = "#fff1c7";

        function key(x, z) {
            return `${x},${z}`;
        }

        function addColumn(lx, y0, lz, height, color) {
            for (let y = y0; y < y0 + height; y++) {
                builder.add("1x1", color, 0, lx, y, lz);
            }
        }

        function addWallLevel(x0, z0, width, depth, y, color, skip = new Set()) {
            const x1 = x0 + width - 1;
            const z1 = z0 + depth - 1;

            for (let x = x0 + 1; x < x1; x++) {
                if (!skip.has(key(x, z0))) builder.add("1x1", color, 0, x, y, z0);
                if (!skip.has(key(x, z1))) builder.add("1x1", color, 0, x, y, z1);
            }

            for (let z = z0 + 1; z < z1; z++) {
                if (!skip.has(key(x0, z))) builder.add("1x1", color, 0, x0, y, z);
                if (!skip.has(key(x1, z))) builder.add("1x1", color, 0, x1, y, z);
            }
        }

        function addTrimLevel(x0, z0, width, depth, y, color) {
            const x1 = x0 + width - 1;
            const z1 = z0 + depth - 1;

            for (let x = x0 + 1; x < x1; x += 2) {
                builder.add("1x1", color, 0, x, y, z0);
                builder.add("1x1", color, 0, x, y, z1);
            }

            for (let z = z0 + 1; z < z1; z += 2) {
                builder.add("1x1", color, 0, x0, y, z);
                builder.add("1x1", color, 0, x1, y, z);
            }
        }

        function addSkipCells(skip, cells) {
            cells.forEach(([x, z]) => skip.add(key(x, z)));
        }

        function addRoofLayer(x0, z0, width, depth, y, color) {
            const x1 = x0 + width - 1;
            const z1 = z0 + depth - 1;

            for (let x = x0; x <= x1; x++) {
                builder.add("Roof 1x2", color, 0, x, y, z0 - 1);
                builder.add("Roof 1x2", color, 2, x, y, z1);
            }

            for (let z = z0; z <= z1 - 1; z++) {
                builder.add("Roof 1x2", color, 1, x0 - 1, y, z);
                builder.add("Roof 1x2", color, 3, x1, y, z);
            }
        }

        function addWindowBand(x0, width, zFront, zBack, y, color) {
            const x1 = x0 + width - 1;
            for (let x = x0 + 1; x <= x1 - 2; x += 4) {
                builder.add("Window", color, 1, x, y, zFront);
                builder.add("Window", color, 1, x, y, zBack);
            }
        }

        function buildSection(x0, z0, width, depth, baseY, wallHeight, options = {}) {
            const x1 = x0 + width - 1;
            const z1 = z0 + depth - 1;
            const wallStart = baseY + 1;
            const topY = wallStart + wallHeight;
            const windowStarts = new Set((options.windowOffsets || []).map((offset) => wallStart + offset));
            const windowSkipLevels = new Set();
            const trimLevels = new Set((options.trimOffsets || []).map((offset) => wallStart + offset));
            const buttressHeight =
                options.buttressHeight === undefined ? Math.max(3, wallHeight - 3) : options.buttressHeight;
            const buttressSpacing = options.buttressSpacing === undefined ? 4 : options.buttressSpacing;
            const roofInsets = options.roofInsets || [1];
            const turretExtra = options.turretExtra || 0;

            windowStarts.forEach((start) => {
                windowSkipLevels.add(start);
                windowSkipLevels.add(start + 1);
            });

            addFilledRectSafe(builder, x0, baseY, z0, width, depth, shadow);

            [
                [x0, z0],
                [x1, z0],
                [x0, z1],
                [x1, z1],
            ].forEach(([lx, lz]) => addColumn(lx, wallStart, lz, wallHeight, shadow));

            if (turretExtra > 0 && width > 4 && depth > 4) {
                [
                    [x0 + 1, z0 + 1],
                    [x1 - 1, z0 + 1],
                    [x0 + 1, z1 - 1],
                    [x1 - 1, z1 - 1],
                ].forEach(([lx, lz]) => {
                    addColumn(lx, wallStart, lz, wallHeight + turretExtra - 1, shadow);
                    builder.add("1x1", gold, 0, lx, topY + turretExtra - 1, lz);
                });
            }

            for (let y = wallStart; y < topY; y++) {
                const skip = new Set();

                if (windowSkipLevels.has(y)) {
                    const cells = [];
                    for (let x = x0 + 1; x <= x1 - 2; x += 4) {
                        cells.push([x, z0], [x + 1, z0], [x, z1], [x + 1, z1]);
                    }
                    addSkipCells(skip, cells);

                    if (windowStarts.has(y)) {
                        addWindowBand(x0, width, z0, z1, y, glass);
                    }
                }

                addWallLevel(x0, z0, width, depth, y, stone, skip);

                if (trimLevels.has(y)) {
                    addTrimLevel(x0, z0, width, depth, y, trim);
                }
            }

            if (buttressSpacing > 0 && buttressHeight > 0) {
                for (let x = x0 + 1; x < x1; x += buttressSpacing) {
                    addColumn(x, baseY, z0 - 1, buttressHeight, shadow);
                    addColumn(x, baseY, z1 + 1, buttressHeight, shadow);
                }
            }

            addTrimLevel(x0, z0, width, depth, topY - 1, trim);

            roofInsets.forEach((inset, index) => {
                if (width - inset * 2 >= 4 && depth - inset * 2 >= 4) {
                    addRoofLayer(x0 + inset, z0 + inset, width - inset * 2, depth - inset * 2, topY + index, roof);
                }
            });
        }

        addFilledRectSafe(builder, 1, 0, 1, 54, 22, dark);
        addFilledRectSafe(builder, 2, 1, 2, 52, 20, shadow);
        addFilledRectSafe(builder, 23, 2, 3, 10, 2, stone);

        for (let x = 4; x <= 50; x += 2) {
            builder.add("Tile 2x2", trim, 0, x, 2, 3);
            builder.add("Tile 2x2", trim, 0, x, 2, 19);
        }

        [25, 29].forEach((lx) => builder.add("Pillar", shadow, 0, lx, 3, 4));

        buildSection(2, 5, 8, 14, 2, 13, {
            windowOffsets: [2, 6, 10],
            trimOffsets: [1, 5, 9],
            buttressHeight: 7,
            roofInsets: [1, 2],
            turretExtra: 4,
        });

        buildSection(10, 7, 14, 10, 2, 9, {
            windowOffsets: [2, 5],
            trimOffsets: [1, 4, 7],
            buttressHeight: 6,
            roofInsets: [1],
            turretExtra: 2,
        });

        buildSection(24, 5, 8, 14, 2, 14, {
            windowOffsets: [2, 6, 10],
            trimOffsets: [1, 5, 9, 12],
            buttressHeight: 8,
            roofInsets: [1, 2],
            turretExtra: 5,
        });

        buildSection(32, 7, 14, 10, 2, 9, {
            windowOffsets: [2, 5],
            trimOffsets: [1, 4, 7],
            buttressHeight: 6,
            roofInsets: [1],
            turretExtra: 2,
        });

        buildSection(46, 5, 8, 14, 2, 13, {
            windowOffsets: [2, 6, 10],
            trimOffsets: [1, 5, 9],
            buttressHeight: 7,
            roofInsets: [1, 2],
            turretExtra: 4,
        });

        buildSection(25, 8, 6, 8, 18, 4, {
            windowOffsets: [1],
            trimOffsets: [2],
            buttressHeight: 0,
            buttressSpacing: 0,
            roofInsets: [1],
            turretExtra: 2,
        });

        addColumn(27, 19, 11, 8, stone);
        builder.add("1x1", gold, 0, 27, 27, 11);
        builder.add("1x1", gold, 0, 27, 28, 11);
        builder.add("1x1", gold, 0, 27, 29, 11);

        return builder.blocks;
    })(),
};

export default PalacioWestminster;
