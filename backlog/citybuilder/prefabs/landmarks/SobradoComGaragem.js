import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

const SobradoComGaragem = {
    dx: 18,
    dy: 10,
    dz: 16,
    blocks: (function () {
        const builder = createPrefabBuilder();
        const facade = "#e8dcc7";
        const roof = "#5d3f2f";
        const glass = "#6f90a8";
        const door = "#5b3a2a";
        const garageDoor = "#2f2f2f";
        const slab = "#d6d9db";

        // Fundação / piso
        addFilledRectSafe(builder, 0, 0, 0, 18, 16, facade);

        // Laje do segundo pavimento (apenas sobre o corpo principal)
        addFilledRectSafe(builder, 0, 3, 0, 12, 16, slab);

        // Paredes térreo (corpo principal: x 0..11)
        for (let y = 1; y <= 3; y++) {
            for (let x = 0; x <= 11; x++) {
                // abertura para porta dupla central
                if (y < 3 && (x === 5 || x === 6)) continue;
                // janelas frontais em x=3 e x=8
                if (y === 2 && (x === 3 || x === 8)) continue;
                builder.add("1x1", facade, 0, x, y, 0);
                builder.add("1x1", facade, 0, x, y, 15);
            }
            for (let z = 1; z < 15; z++) {
                builder.add("1x1", facade, 0, 0, y, z);
                builder.add("1x1", facade, 0, 11, y, z);
            }
        }

        // Porta dupla frontal
        builder.add("1x1", door, 0, 5, 1, 0);
        builder.add("1x1", door, 0, 6, 1, 0);
        builder.add("1x1", door, 0, 5, 2, 0);
        builder.add("1x1", door, 0, 6, 2, 0);

        // Janelas frontais
        builder.add("Window", glass, 1, 3, 2, 0);
        builder.add("Window", glass, 1, 8, 2, 0);

        // Garagem (x 12..17, z 0..9) - um pavimento, porta ampla
        for (let y = 1; y <= 2; y++) {
            for (let x = 12; x <= 17; x++) {
                // porta da garagem: abrir em x=14..15 na frente
                if (y < 2 && (x === 14 || x === 15)) continue;
                builder.add("1x1", facade, 0, x, y, 0);
            }
            for (let z = 1; z <= 9; z++) {
                builder.add("1x1", facade, 0, 12, y, z);
                builder.add("1x1", facade, 0, 17, y, z);
            }
        }
        // Laje da garagem
        addFilledRectSafe(builder, 12, 3, 0, 6, 10, slab);

        // Janelas laterais e do 2º pavimento
        for (let x of [2, 7]) builder.add("Window", glass, 1, x, 5, 0);
        for (let x = 3; x <= 8; x += 5) builder.add("Window", glass, 1, x, 5, 0);

        // Paredes segundo pavimento (x 1..10)
        for (let y = 4; y <= 6; y++) {
            for (let x = 1; x <= 10; x++) {
                // pequenas variações para sacadas
                if (y === 5 && (x === 4 || x === 7)) continue;
                builder.add("1x1", facade, 0, x, y, 0);
                builder.add("1x1", facade, 0, x, y, 15);
            }
            for (let z = 1; z < 15; z++) {
                builder.add("1x1", facade, 0, 1, y, z);
                builder.add("1x1", facade, 0, 10, y, z);
            }
        }

        // Telhado plano do sobrado (laje)
        addFilledRectSafe(builder, 0, 7, 0, 12, 16, roof);
        // Telhado baixo sobre a garagem
        addFilledRectSafe(builder, 12, 4, 0, 6, 10, roof);

        // Chaminé técnica
        addPillarStackSafe(builder, 3, 6, 3, 2, roof);

        return builder.blocks;
    })(),
};

export default SobradoComGaragem;
