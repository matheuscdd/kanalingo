import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";
import { addBalconySafe } from "../shared/modern.js";

const ModernTownhouse = {
    dx: 18,
    dy: 16,
    dz: 14,
    blocks: (function () {
        const builder = createPrefabBuilder();

        const palette = {
            base: "#d8d2c7",
            shell: "#f4f4f4",
            frame: "#111111",
            trim: "#8b949e",
            wood: "#8b5a2b",
            glass: "#9fd6f2",
            plant: "#237841",
            accent: "#c74e24",
        };

        function addParapet(x0, y, z0, width, depth, color = palette.frame) {
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

        function addPlanter(x0, y, z0) {
            addFilledRectSafe(builder, x0, y, z0, 2, 2, palette.trim);
            builder.add("1x1", palette.plant, 0, x0, y + 1, z0);
            builder.add("1x1", palette.plant, 0, x0 + 1, y + 1, z0);
            builder.add("1x1", palette.plant, 0, x0, y + 1, z0 + 1);
            builder.add("1x1", palette.plant, 0, x0 + 1, y + 1, z0 + 1);
        }

        addFilledRectSafe(builder, 0, 0, 0, 18, 14, palette.base);
        addFilledRectSafe(builder, 4, 1, 0, 6, 2, palette.wood);
        addPlanter(2, 1, 0);
        addPlanter(12, 1, 0);

        for (const z of [4, 9]) {
            addPillarStackSafe(builder, 2, 1, z, 4, palette.frame);
            addPillarStackSafe(builder, 3, 1, z, 4, palette.shell);
        }

        for (const y of [1, 3]) {
            builder.add("Window", palette.glass, 0, 2, y, 5);
            builder.add("Window", palette.glass, 0, 2, y, 7);
            builder.add("Window", palette.glass, 1, 5, y, 2);
            builder.add("Window", palette.glass, 1, 7, y, 2);
            builder.add("Window", palette.glass, 1, 12, y, 2);
        }

        addPillarStackSafe(builder, 4, 1, 2, 4, palette.frame);
        addPillarStackSafe(builder, 14, 1, 2, 4, palette.frame);

        for (let y = 1; y <= 4; y++) {
            addFilledRectSafe(builder, 14, y, 4, 2, 8, palette.shell);
            addFilledRectSafe(builder, 4, y, 10, 10, 2, palette.shell);
        }

        builder.add("2x2", palette.frame, 0, 9, 1, 2);
        builder.add("2x2", palette.frame, 0, 9, 2, 2);

        for (const x of [5, 7, 9, 12, 14]) {
            builder.add("Roof 1x2", palette.trim, 1, x, 4, 1);
        }

        for (let y = 1; y <= 3; y++) {
            addFilledRectSafe(builder, 8, y, 7, 4, 2, palette.trim);
        }

        builder.add("Tile 2x2", palette.accent, 0, 5, 1, 6);
        builder.add("1x1", palette.frame, 0, 6, 2, 6);
        builder.add("Tile 2x2", palette.wood, 0, 12, 1, 7);
        builder.add("1x1", palette.frame, 0, 13, 2, 8);

        addFilledRectSafe(builder, 2, 5, 4, 14, 8, palette.shell);
        addBalconySafe(builder, 10, 5, 0, 6, 4, palette.shell);
        addPillarStackSafe(builder, 10, 1, 1, 4, palette.frame);
        addPillarStackSafe(builder, 15, 1, 1, 4, palette.frame);

        for (const z of [4, 9]) {
            addPillarStackSafe(builder, 2, 6, z, 4, palette.frame);
            addPillarStackSafe(builder, 3, 6, z, 4, palette.shell);
        }

        for (const y of [6, 8]) {
            builder.add("Window", palette.glass, 0, 2, y, 5);
            builder.add("Window", palette.glass, 0, 2, y, 7);
        }

        addPillarStackSafe(builder, 4, 6, 4, 4, palette.frame);
        addPillarStackSafe(builder, 14, 6, 4, 4, palette.frame);

        for (const x of [5, 7, 12]) {
            builder.add("Window", palette.glass, 1, x, 6, 4);
        }

        builder.add("2x2", palette.frame, 0, 10, 6, 4);
        builder.add("2x2", palette.frame, 0, 10, 7, 4);

        for (let y = 6; y <= 9; y++) {
            addFilledRectSafe(builder, 14, y, 4, 2, 8, palette.shell);
            addFilledRectSafe(builder, 4, y, 10, 10, 2, palette.shell);
        }

        for (const x of [10, 12, 14]) {
            builder.add("Roof 1x2", palette.wood, 1, x, 9, 3);
        }

        builder.add("Tile 2x2", palette.trim, 0, 6, 6, 7);
        builder.add("1x1", palette.plant, 0, 7, 7, 7);
        builder.add("Tile 2x2", palette.trim, 0, 11, 6, 7);
        builder.add("1x1", palette.plant, 0, 12, 7, 7);

        addFilledRectSafe(builder, 2, 10, 4, 14, 8, palette.shell);
        addParapet(2, 11, 4, 14, 8, palette.trim);
        addPlanter(5, 11, 5);
        addPlanter(11, 11, 8);

        for (const z of [4, 9]) {
            addPillarStackSafe(builder, 2, 11, z, 3, palette.frame);
            addPillarStackSafe(builder, 3, 11, z, 3, palette.shell);
        }

        builder.add("Window", palette.glass, 0, 2, 11, 5);
        builder.add("Window", palette.glass, 0, 2, 11, 7);

        for (let y = 11; y <= 13; y++) {
            addFilledRectSafe(builder, 6, y, 10, 8, 2, palette.shell);
            addFilledRectSafe(builder, 14, y, 6, 2, 6, palette.shell);
            addFilledRectSafe(builder, 6, y, 8, 2, 2, palette.shell);
            addFilledRectSafe(builder, 6, y, 6, 2, 2, palette.shell);
        }

        for (const x of [8, 10, 12]) {
            builder.add("Window", palette.glass, 1, x, 11, 6);
        }

        addFilledRectSafe(builder, 2, 14, 4, 14, 8, palette.shell);
        addParapet(2, 15, 4, 14, 8, palette.frame);
        addPlanter(7, 14, 5);
        addPlanter(11, 14, 8);

        return builder.blocks;
    })(),
};

export default ModernTownhouse;