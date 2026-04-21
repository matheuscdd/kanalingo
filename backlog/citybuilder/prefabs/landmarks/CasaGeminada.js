import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

const CasaGeminada = {
    dx: 22,
    dy: 9,
    dz: 12,
    blocks: (function () {
        const builder = createPrefabBuilder();
        const base = "#e6dccb";
        const roof = "#7b3b2a";
        const window = "#7fb0c8";
        const door = "#6b3b1f";
        const porch = "#acc99a";
        const chimney = "#a89c8e";

        // Fundação / piso
        addFilledRectSafe(builder, 0, 0, 0, 22, 12, base);

        // Paredes e aberturas - ALVO: duas unidades espelhadas (0..10) e (11..21)
        // Ala esquerda (x: 0..10)
        for (let y = 1; y <= 3; y++) {
            for (let x = 1; x <= 9; x++) {
                // Porta na posição x=4
                if (y < 3 && x === 4) continue;
                // Janelas frontais
                if (y === 2 && (x === 2 || x === 7)) continue;
                builder.add("1x1", base, 0, x, y, 0);
                builder.add("1x1", base, 0, x, y, 11);
            }
            for (let z = 1; z <= 10; z++) {
                builder.add("1x1", base, 0, 0, y, z);
                builder.add("1x1", base, 0, 10, y, z);
            }
        }

        // Porta e janelas ala esquerda
        builder.add("1x1", door, 0, 4, 1, 0);
        builder.add("1x1", door, 0, 4, 2, 0);
        builder.add("Window", window, 1, 2, 2, 0);
        builder.add("Window", window, 1, 7, 2, 0);

        // Ala direita (x: 11..21)
        for (let y = 1; y <= 3; y++) {
            for (let x = 12; x <= 20; x++) {
                // Porta na posição x=17
                if (y < 3 && x === 17) continue;
                // Janelas frontais
                if (y === 2 && (x === 14 || x === 19)) continue;
                builder.add("1x1", base, 0, x, y, 0);
                builder.add("1x1", base, 0, x, y, 11);
            }
            for (let z = 1; z <= 10; z++) {
                builder.add("1x1", base, 0, 11, y, z);
                builder.add("1x1", base, 0, 21, y, z);
            }
        }

        // Porta e janelas ala direita
        builder.add("1x1", door, 0, 17, 1, 0);
        builder.add("1x1", door, 0, 17, 2, 0);
        builder.add("Window", window, 1, 14, 2, 0);
        builder.add("Window", window, 1, 19, 2, 0);

        // Parede divisória central (sem janelas)
        for (let y = 1; y <= 3; y++) {
            for (let z = 0; z <= 11; z++) {
                builder.add("1x1", base, 0, 11, y, z);
            }
        }

        // Porches/tiles frontais para cada unidade
        builder.add("Tile 2x2", porch, 0, 2, 1, 1);
        builder.add("Tile 2x2", porch, 0, 6, 1, 1);
        builder.add("Tile 2x2", porch, 0, 15, 1, 1);
        builder.add("Tile 2x2", porch, 0, 19, 1, 1);

        // Telhado em camadas cobrindo ambas as unidades, fechado
        addFilledRectSafe(builder, 0, 4, 0, 22, 12, roof);
        addFilledRectSafe(builder, 1, 5, 1, 20, 10, roof);
        addFilledRectSafe(builder, 2, 6, 2, 18, 8, roof);
        addFilledRectSafe(builder, 3, 7, 3, 16, 6, roof);

        // Chaminés discretas em cada unidade
        addPillarStackSafe(builder, 3, 6, 4, 2, chimney);
        addPillarStackSafe(builder, 18, 6, 4, 2, chimney);

        return builder.blocks;
    })(),
};

export default CasaGeminada;
