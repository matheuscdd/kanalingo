import { createPrefabBuilder, addFilledRectSafe } from "../shared/core.js";

const EstatuaLiberdade = {
    dx: 18,
    dy: 24,
    dz: 12,
    blocks: (function () {
        const builder = createPrefabBuilder();
        const ivory = "#f4f4f4";
        const green = "#237841";
        const dark = "#111111";
        const gold = "#f2cd37";
        // Bases
        [
            [2, 0, 1, 14, 10, ivory],
            [3, 1, 2, 12, 8, ivory],
            [4, 2, 3, 10, 6, ivory],
            [5, 3, 4, 8, 4, dark],
            [6, 4, 4, 6, 4, ivory],
            [6, 5, 4, 6, 4, ivory],
        ].forEach(([x0, y, z0, width, depth, color]) => {
            addFilledRectSafe(builder, x0, y, z0, width, depth, color);
        });
        // Corpo
        for (let y = 6; y < 12; y++) {
            const shrink = Math.floor((y - 6) / 2);
            addFilledRectSafe(builder, 5 + shrink, y, 4, 8 - shrink * 2, 4, green);
        }
        // Detalhes inferiores
        [6, 11].forEach((y) => {
            builder.add("1x1", green, 0, 4, y, 5);
            builder.add("1x1", green, 0, 4, y, 6);
            builder.add("1x1", green, 0, 13, y, 5);
            builder.add("1x1", green, 0, 13, y, 6);
        });
        builder.add("2x2", green, 0, 11, 11, 5);
        // Corpo superior
        for (let y = 12; y < 16; y++) {
            builder.add("2x4", green, 0, 8, y, 4);
        }
        [12, 13, 14].forEach((y) => builder.add("2x2", green, 0, 6, y, 5));
        [
            [10, 12], [11, 13], [12, 14], [13, 15],
        ].forEach(([lx, ly]) => builder.add("2x2", green, 0, lx, ly, 5));
        // Braços e cabeça
        for (let y = 11; y < 15; y++) {
            builder.add("1x1", green, 0, 5, y, 4);
            builder.add("1x1", green, 0, 5, y, 7);
        }
        builder.add("1x1", green, 0, 5, 13, 5);
        builder.add("1x1", green, 0, 5, 13, 6);
        [16, 17, 18].forEach((y) => builder.add("2x2", green, 0, 8, y, 5));
        // Detalhes finais
        [
            [7, 19, 5], [8, 19, 4], [10, 19, 5], [8, 19, 7], [9, 19, 7], [9, 20, 5],
        ].forEach(([lx, ly, lz]) => builder.add("1x1", green, 0, lx, ly, lz));
        [
            [14, 16, dark], [14, 17, dark], [14, 18, gold], [14, 19, gold], [13, 19, gold], [15, 19, gold],
        ].forEach(([lx, ly, color]) => builder.add("1x1", color, 0, lx, ly, 5));
        return builder.blocks;
    })(),
};

export default EstatuaLiberdade;
