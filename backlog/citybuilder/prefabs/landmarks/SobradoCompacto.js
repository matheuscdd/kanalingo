import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

const SobradoCompacto = {
    dx: 14,
    dy: 10,
    dz: 14,
    blocks: (function () {
        const builder = createPrefabBuilder();
        const facade = "#e9dfcf";
        const roof = "#6d513b";
        const glass = "#6f90a8";
        const door = "#5a3a2b";
        const slab = "#cfd6d9";

        // Fundação / piso
        addFilledRectSafe(builder, 1, 0, 1, 12, 12, slab);

        // Laje entre pavimentos
        addFilledRectSafe(builder, 1, 3, 1, 12, 12, slab);

        // Paredes térreo (y=1..3)
        for (let y = 1; y <= 3; y++) {
            for (let x = 1; x <= 12; x++) {
                // abertura para porta dupla
                if (y < 3 && (x === 6 || x === 7)) continue;
                // janelas frontais
                if (y === 2 && (x === 3 || x === 9)) continue;
                builder.add("1x1", facade, 0, x, y, 1);
                builder.add("1x1", facade, 0, x, y, 12);
            }
            for (let z = 2; z <= 11; z++) {
                builder.add("1x1", facade, 0, 1, y, z);
                builder.add("1x1", facade, 0, 12, y, z);
            }
        }

        // Porta dupla
        builder.add("1x1", door, 0, 6, 1, 1);
        builder.add("1x1", door, 0, 7, 1, 1);
        builder.add("1x1", door, 0, 6, 2, 1);
        builder.add("1x1", door, 0, 7, 2, 1);

        // Paredes segundo pavimento (y=4..6)
        for (let y = 4; y <= 6; y++) {
            for (let x = 2; x <= 11; x++) {
                // janelas segundo pavimento
                if (y === 5 && (x === 3 || x === 9)) continue;
                builder.add("1x1", facade, 0, x, y, 1);
                builder.add("1x1", facade, 0, x, y, 12);
            }
            for (let z = 2; z <= 11; z++) {
                builder.add("1x1", facade, 0, 1, y, z);
                builder.add("1x1", facade, 0, 12, y, z);
            }
        }

        // Janelas - térreo e 2º pavimento
        builder.add("Window", glass, 1, 3, 2, 1);
        builder.add("Window", glass, 1, 9, 2, 1);
        builder.add("Window", glass, 1, 3, 5, 1);
        builder.add("Window", glass, 1, 9, 5, 1);

        // Telhado plano (laje) sobre o 2º pavimento
        addFilledRectSafe(builder, 1, 7, 1, 12, 12, roof);

        // Pequena chaminé técnica
        addPillarStackSafe(builder, 10, 6, 10, 2, roof);

        return builder.blocks;
    })(),
};

export default SobradoCompacto;
