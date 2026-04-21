import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

const CasaEmL = {
    dx: 20,
    dy: 10,
    dz: 16,
    blocks: (function () {
        const builder = createPrefabBuilder();
        const base = "#e6dccb"; // fachada
        const roof = "#7b3b2a"; // terracota
        const window = "#7fb0c8";
        const door = "#6b3b1f";
        const pillar = "#c8bfae";

        // Fundação: duas alas em L conectadas
        addFilledRectSafe(builder, 0, 0, 0, 12, 8, base); // Ala A (esquerda)
        addFilledRectSafe(builder, 8, 0, 6, 12, 10, base); // Ala B (direita, deslocada)

        // Paredes Ala A (perímetro)
        for (let y = 1; y <= 3; y++) {
            for (let x = 0; x < 12; x++) {
                // porta central da ala A
                if (y < 3 && x === 5) continue;
                // janelas frontais
                if (y === 2 && (x === 3 || x === 8)) continue;
                builder.add("1x1", base, 0, x, y, 0);
                builder.add("1x1", base, 0, x, y, 7);
            }
            for (let z = 1; z < 7; z++) {
                builder.add("1x1", base, 0, 0, y, z);
                builder.add("1x1", base, 0, 11, y, z);
            }
        }

        // Porta e janelas Ala A
        builder.add("1x1", door, 0, 5, 1, 0);
        builder.add("1x1", door, 0, 5, 2, 0);
        builder.add("Window", window, 1, 3, 2, 0);
        builder.add("Window", window, 1, 8, 2, 0);

        // Paredes Ala B (perímetro)
        for (let y = 1; y <= 3; y++) {
            for (let x = 8; x < 20; x++) {
                // pequenas aberturas para portas/varandas
                if (y < 3 && (x === 12 || x === 13)) continue;
                builder.add("1x1", base, 0, x, y, 6);
                builder.add("1x1", base, 0, x, y, 15);
            }
            for (let z = 7; z < 15; z++) {
                builder.add("1x1", base, 0, 8, y, z);
                builder.add("1x1", base, 0, 19, y, z);
            }
        }

        // Porta e janelas Ala B
        builder.add("1x1", door, 0, 12, 1, 6);
        builder.add("1x1", door, 0, 13, 1, 6);
        builder.add("Window", window, 1, 11, 2, 6);
        builder.add("Window", window, 1, 16, 2, 6);

        // Colunas externas
        addPillarStackSafe(builder, 0, 1, 0, 2, pillar);
        addPillarStackSafe(builder, 11, 1, 0, 2, pillar);
        addPillarStackSafe(builder, 8, 1, 6, 2, pillar);
        addPillarStackSafe(builder, 19, 1, 6, 2, pillar);

        // Telhados em camadas para cada ala
        addFilledRectSafe(builder, 0, 4, 0, 12, 8, roof); // topo Ala A
        addFilledRectSafe(builder, 1, 5, 1, 10, 6, roof);

        addFilledRectSafe(builder, 8, 4, 6, 12, 10, roof); // topo Ala B
        addFilledRectSafe(builder, 9, 5, 7, 10, 8, roof);

        // Pequena chaminé técnica na interseção
        addPillarStackSafe(builder, 10, 6, 6, 2, roof);

        return builder.blocks;
    })(),
};

export default CasaEmL;
