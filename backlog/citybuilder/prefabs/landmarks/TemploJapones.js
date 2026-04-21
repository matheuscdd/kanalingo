import { createPrefabBuilder, addFilledRectSafe } from "../shared/core.js";

const TemploJapones = {
    dx: 16,
    dy: 17,
    dz: 16,
    blocks: (function () {
        const builder = createPrefabBuilder();
        const green = "#237841";
        const red = "#e3000b";
        const ivory = "#f4f4f4";
        const dark = "#111111";
        const gold = "#f2cd37";
        // Bases
        addFilledRectSafe(builder, 2, 0, 2, 12, 12, green);
        addFilledRectSafe(builder, 4, 1, 4, 8, 8, red);
        addFilledRectSafe(builder, 5, 2, 5, 6, 6, ivory);
        // Pilares
        [
            [4, 4], [7, 4], [10, 4], [4, 10], [7, 10], [10, 10], [4, 7], [10, 7],
        ].forEach(([lx, lz]) => {
            builder.add("Pillar", red, 0, lx, 2, lz);
            builder.add("Pillar", red, 0, lx, 5, lz);
        });
        // Paredes
        for (let y = 2; y < 5; y++) {
            for (let x = 5; x < 10; x++) {
                if (x === 7) continue;
                builder.add("1x1", ivory, 0, x, y, 4);
                builder.add("1x1", ivory, 0, x, y, 11);
            }
            for (let z = 5; z < 11; z++) {
                if (z === 7 || z === 8) continue;
                builder.add("1x1", ivory, 0, 4, y, z);
                builder.add("1x1", ivory, 0, 11, y, z);
            }
        }
        // Bases superiores
        addFilledRectSafe(builder, 3, 8, 3, 10, 10, dark);
        addFilledRectSafe(builder, 6, 10, 6, 4, 4, dark);
        // Telhados
        for (let step = 0; step < 3; step++) {
            const edgeMin = 3 + step;
            const edgeMax = 11 - step;
            for (let x = edgeMin; x <= edgeMax; x += 2) {
                builder.add("Roof 1x2", dark, 0, x, 9 + step, 2 + step);
                builder.add("Roof 1x2", dark, 2, x, 9 + step, 12 - step);
            }
            for (let z = edgeMin + 2; z <= edgeMax - 2; z += 2) {
                builder.add("Roof 1x2", dark, 1, 2 + step, 9 + step, z);
                builder.add("Roof 1x2", dark, 3, 12 - step, 9 + step, z);
            }
        }
        // Bases internas
        for (let y = 11; y < 13; y++) {
            addFilledRectSafe(builder, 6, y, 6, 4, 4, red);
        }
        addFilledRectSafe(builder, 5, 13, 5, 6, 6, dark);
        // Telhados finais
        for (let step = 0; step < 2; step++) {
            const edgeMin = 5 + step;
            const edgeMax = 9 - step;
            for (let x = edgeMin; x <= edgeMax; x += 2) {
                builder.add("Roof 1x2", dark, 0, x, 14 + step, 4 + step);
                builder.add("Roof 1x2", dark, 2, x, 14 + step, 10 - step);
            }
            for (let z = edgeMin + 2; z <= edgeMax - 2; z += 2) {
                builder.add("Roof 1x2", dark, 1, 4 + step, 14 + step, z);
                builder.add("Roof 1x2", dark, 3, 10 - step, 14 + step, z);
            }
        }
        // Topo
        builder.add("2x2", dark, 0, 7, 14, 7);
        builder.add("2x2", dark, 0, 7, 15, 7);
        builder.add("2x2", gold, 0, 7, 16, 7);
        return builder.blocks;
    })(),
};

export default TemploJapones;
