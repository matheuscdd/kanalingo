import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

const CasaDeCampo = {
    dx: 14,
    dy: 11,
    dz: 14,
    blocks: (function () {
        const builder = createPrefabBuilder();
        const base = "#d9cdb7"; // fachada
        const roof = "#8b3e2a"; // telha
        const window = "#7fb0c8";
        const door = "#6b3b1f";
        const porchTile = "#7db25a";
        const pillar = "#cfc5b6";

        // Fundação / piso
        addFilledRectSafe(builder, 0, 0, 0, 14, 14, base);

        // Paredes (y = 1..3)
        for (let y = 1; y <= 3; y++) {
            for (let x = 1; x < 13; x++) {
                // deixar abertura para porta dupla no centro
                if (y < 3 && (x === 6 || x === 7)) continue;
                // janelas frontais em x=3 e x=10 (omitidas aqui)
                if (y === 2 && (x === 3 || x === 10)) continue;
                builder.add("1x1", base, 0, x, y, 0);
                builder.add("1x1", base, 0, x, y, 13);
            }
            for (let z = 1; z < 13; z++) {
                builder.add("1x1", base, 0, 0, y, z);
                builder.add("1x1", base, 0, 13, y, z);
            }
        }

        // Porta dupla frontal
        builder.add("1x1", door, 0, 6, 1, 0);
        builder.add("1x1", door, 0, 6, 2, 0);
        builder.add("1x1", door, 0, 7, 1, 0);
        builder.add("1x1", door, 0, 7, 2, 0);

        // Janelas frontais
        builder.add("Window", window, 1, 3, 2, 0);
        builder.add("Window", window, 1, 10, 2, 0);

        // Varanda frontal (Tile 2x2) - duas placas para dar largura
        builder.add("Tile 2x2", porchTile, 0, 4, 1, 1);
        builder.add("Tile 2x2", porchTile, 0, 6, 1, 1);
        builder.add("Tile 2x2", porchTile, 0, 8, 1, 1);

        // Pilares da varanda
        addPillarStackSafe(builder, 4, 1, 1, 2, pillar);
        addPillarStackSafe(builder, 9, 1, 1, 2, pillar);

        // Telhado tipo pirâmide/encorpado em camadas para ficar fechado e alto
        addFilledRectSafe(builder, 1, 4, 1, 12, 12, roof); // base do telhado
        addFilledRectSafe(builder, 2, 5, 2, 10, 10, roof);
        addFilledRectSafe(builder, 3, 6, 3, 8, 8, roof);
        addFilledRectSafe(builder, 4, 7, 4, 6, 6, roof);
        addFilledRectSafe(builder, 5, 8, 5, 4, 4, roof);
        addFilledRectSafe(builder, 6, 9, 6, 2, 2, roof);

        // Chaminé discreta acima da camada de telhado
        addPillarStackSafe(builder, 10, 6, 10, 3, base);

        return builder.blocks;
    })(),
};

export default CasaDeCampo;
