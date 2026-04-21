import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";
import { addPoolSafe, addPalm, addLounger } from "../shared/modern.js";

const ModernBeachVilla = {
    dx: 40,
    dy: 18,
    dz: 30,
    blocks: (function () {
        const builder = createPrefabBuilder();

        const palette = {
            base: "#ece7dd",
            shell: "#f4f4f4",
            frame: "#1d242a",
            glass: "#9fd6f2",
            wood: "#8b5a2b",
            poolTrim: "#d8d2c7",
            poolWater: "#58b8e4",
            deck: "#c7b297",
            sand: "#d8c59f",
            sea: "#7ad3f4",
            stone: "#6c6258",
            ember: "#ffd166",
            flame: "#f57c00",
            sofa: "#d7e6eb",
            cushion: "#8ea4af",
            planter: "#2f6034",
            metal: "#8b949e",
        };

        const lowerWing = { x0: 2, z0: 10, width: 22, depth: 14 };
        const upperWing = { x0: 0, z0: 9, width: 24, depth: 12 };
        const tower = { x0: 24, z0: 6, width: 12, depth: 14 };
        const balcony = { x0: 26, z0: 2, width: 8, depth: 4, y: 5 };

        function addBorder1x1(x0, y, z0, width, depth, color) {
            const x1 = x0 + width - 1;
            const z1 = z0 + depth - 1;

            for (let x = x0; x <= x1; x++) {
                builder.add("1x1", color, 0, x, y, z0);
                builder.add("1x1", color, 0, x, y, z1);
            }

            for (let z = z0 + 1; z < z1; z++) {
                builder.add("1x1", color, 0, x0, y, z);
                builder.add("1x1", color, 0, x1, y, z);
            }
        }

        function addWoodAccentPanel(x0, y0, z0, width, height, color) {
            for (let x = x0; x < x0 + width; x++) {
                for (let y = y0; y < y0 + height; y++) {
                    builder.add("1x1", color, 0, x, y, z0);
                }
            }
        }

        function addGlassBalcony(x0, y, z0, width, depth) {
            addFilledRectSafe(builder, x0, y, z0, width, depth, palette.shell);

            const x1 = x0 + width - 1;
            const z1 = z0 + depth - 1;
            const railY = y + 1;

            addPillarStackSafe(builder, x0, railY, z0, 2, palette.frame);
            addPillarStackSafe(builder, x1, railY, z0, 2, palette.frame);
            addPillarStackSafe(builder, x0, railY, z1, 2, palette.frame);
            addPillarStackSafe(builder, x1, railY, z1, 2, palette.frame);

            for (let x = x0 + 1; x <= x1 - 2; x += 2) {
                builder.add("Window", palette.glass, 1, x, railY, z0);
            }

            for (let z = z0 + 1; z <= z1 - 2; z += 2) {
                builder.add("Window", palette.glass, 0, x0, railY, z);
                builder.add("Window", palette.glass, 0, x1, railY, z);
            }
        }

        function addFirepit(cx, y, cz) {
            const ring = [
                [-1, 0],
                [1, 0],
                [0, -1],
                [0, 1],
                [-1, -1],
                [1, -1],
                [-1, 1],
                [1, 1],
            ];

            ring.forEach(([ox, oz]) => {
                builder.add("1x1", palette.stone, 0, cx + ox, y, cz + oz);
            });

            builder.add("1x1", palette.flame, 0, cx, y, cz);
            builder.add("1x1", palette.ember, 0, cx, y + 1, cz);
            builder.add("1x1", palette.flame, 0, cx, y + 2, cz);
        }

        function addSofa(x0, y, z0) {
            builder.add("Tile 2x2", palette.sofa, 0, x0, y, z0);
            builder.add("Tile 2x2", palette.sofa, 0, x0 + 2, y, z0);

            for (let x = x0; x < x0 + 4; x++) {
                builder.add("1x1", palette.cushion, 0, x, y + 1, z0);
            }
        }

        function addCoffeeTable(x0, y, z0) {
            builder.add("Tile 2x2", palette.deck, 0, x0, y, z0);
            builder.add("1x1", palette.frame, 0, x0 + 1, y + 1, z0 + 1);
        }

        const towerWallRanges = [
            [1, 4],
            [6, 4],
            [11, 4],
        ];

        // Base plate and outdoor program.
        addFilledRectSafe(builder, 0, 0, 0, 40, 30, palette.base);
        addPoolSafe(builder, 6, 0, 3, 18, 6, palette.poolTrim, palette.poolWater);
        addBorder1x1(5, 1, 2, 20, 8, palette.shell);
        addFilledRectSafe(builder, 26, 1, 8, 12, 4, palette.deck);
        addFilledRectSafe(builder, 28, 1, 12, 10, 4, palette.sand);
        addFilledRectSafe(builder, 34, 1, 6, 4, 4, palette.sand);

        for (const z of [3, 5, 7, 9, 11]) {
            builder.add("Tile 2x2", palette.sea, 0, 38, 1, z);
        }

        // Lower wing shell.
        for (let y = 1; y <= 4; y++) {
            addFilledRectSafe(builder, 2, y, 12, 2, 10, palette.shell);
            addFilledRectSafe(builder, 4, y, 22, 18, 2, palette.shell);
            addFilledRectSafe(builder, 22, y, 14, 2, 8, palette.shell);
        }

        addFilledRectSafe(builder, lowerWing.x0, 5, lowerWing.z0, lowerWing.width, lowerWing.depth, palette.shell);

        addPillarStackSafe(builder, 2, 1, 10, 4, palette.frame);
        addPillarStackSafe(builder, 16, 1, 10, 4, palette.frame);
        addPillarStackSafe(builder, 23, 1, 10, 4, palette.frame);
        addWoodAccentPanel(13, 1, 10, 3, 4, palette.wood);

        for (const y of [1, 3]) {
            for (const x of [3, 5, 7, 9, 11, 17, 19, 21]) {
                builder.add("Window", palette.glass, 1, x, y, 10);
            }
        }

        // Upper wing and roof terrace.
        for (let y = 6; y <= 9; y++) {
            addFilledRectSafe(builder, 0, y, 11, 2, 8, palette.shell);
            addFilledRectSafe(builder, 20, y, 11, 2, 8, palette.shell);
            addFilledRectSafe(builder, 2, y, 18, 20, 2, palette.shell);

            for (const x of [0, 1, 2, 3, 19, 20, 21, 22, 23]) {
                builder.add("1x1", palette.shell, 0, x, y, 9);
            }
        }

        addPillarStackSafe(builder, 4, 6, 9, 4, palette.frame);
        addPillarStackSafe(builder, 19, 6, 9, 4, palette.frame);

        for (const y of [6, 8]) {
            for (const x of [5, 7, 9, 11, 13, 15, 17]) {
                builder.add("Window", palette.glass, 1, x, y, 9);
            }
        }

        addFilledRectSafe(builder, upperWing.x0, 10, 8, upperWing.width, 14, palette.shell);
        addBorder1x1(0, 11, 8, 24, 14, palette.shell);
        addFilledRectSafe(builder, 10, 11, 10, 4, 4, palette.metal);
        addFilledRectSafe(builder, 6, 11, 17, 4, 4, palette.shell);

        // Tower volume.
        towerWallRanges.forEach(([y0, height]) => {
            for (let y = y0; y < y0 + height; y++) {
                addFilledRectSafe(builder, tower.x0, y, tower.z0, 2, tower.depth, palette.shell);
                addFilledRectSafe(builder, tower.x0, y, 18, tower.width, 2, palette.shell);
            }

            addPillarStackSafe(builder, 28, y0, 6, height, palette.frame);
            addPillarStackSafe(builder, 35, y0, 6, height, palette.frame);

            for (let y = y0; y < y0 + height; y++) {
                for (const x of [26, 27]) {
                    for (const z of [6, 7]) {
                        builder.add("1x1", palette.wood, 0, x, y, z);
                    }
                }
            }
        });

        for (const y of [1, 3, 6, 8, 11, 13]) {
            for (const x of [29, 31, 33]) {
                builder.add("Window", palette.glass, 1, x, y, 6);
            }

            for (const z of [8, 10, 12, 14, 16]) {
                builder.add("Window", palette.glass, 0, 35, y, z);
            }
        }

        addFilledRectSafe(builder, 26, 5, 8, 10, 10, palette.shell);
        addFilledRectSafe(builder, 26, 10, 8, 10, 10, palette.shell);
        addFilledRectSafe(builder, 28, 5, 6, 8, 2, palette.frame);
        addFilledRectSafe(builder, 28, 10, 6, 8, 2, palette.frame);
        addFilledRectSafe(builder, 23, 15, 5, 14, 16, palette.shell);
        addBorder1x1(23, 16, 5, 14, 16, palette.shell);
        addFilledRectSafe(builder, 28, 16, 10, 4, 4, palette.metal);

        // Front balcony.
        addGlassBalcony(balcony.x0, balcony.y, balcony.z0, balcony.width, balcony.depth);
        addPillarStackSafe(builder, 26, 1, 2, 4, palette.frame);
        addPillarStackSafe(builder, 33, 1, 2, 4, palette.frame);

        // Outdoor furniture and landscape.
        addLounger(builder, 28, 2, 12, 0);
        addLounger(builder, 32, 2, 12, 0);
        builder.add("Tile 2x2", palette.deck, 0, 30, 2, 9);
        builder.add("1x1", palette.frame, 0, 31, 3, 10);
        addFirepit(35, 2, 8);

        addPalm(builder, 4, 1, 7);
        addPalm(builder, 35, 1, 24);
        addBorder1x1(3, 1, 6, 3, 3, palette.planter);
        addBorder1x1(34, 1, 23, 3, 3, palette.planter);

        // Interior hints behind the glazing.
        addSofa(6, 1, 15);
        addCoffeeTable(11, 1, 15);
        builder.add("Tile 2x2", palette.deck, 0, 16, 1, 17);
        builder.add("1x1", palette.frame, 0, 15, 2, 17);
        builder.add("1x1", palette.frame, 0, 18, 2, 17);
        builder.add("Tile 2x2", palette.sofa, 0, 7, 6, 14);
        builder.add("1x1", palette.cushion, 0, 8, 7, 14);
        builder.add("Tile 2x2", palette.sofa, 0, 29, 11, 12);
        builder.add("1x1", palette.cushion, 0, 30, 12, 12);

        return builder.blocks;
    })(),
};

export default ModernBeachVilla;