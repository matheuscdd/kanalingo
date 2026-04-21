import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

const CasaComVaranda = {
    dx: 16,
    dy: 10,
    dz: 14,
    blocks: (function () {
        const builder = createPrefabBuilder();
        const base = "#efe6d8"; // fachada clara
        const roof = "#a84f2f"; // terracota escura
        const window = "#89b0c5";
        const door = "#6b3b1f";
        const porchTile = "#9dbf83";
        const columnColor = "#e9dfcf";

        // Fundação / piso central
        addFilledRectSafe(builder, 1, 0, 1, 14, 12, base);

        // Paredes (y = 1..3)
        for (let y = 1; y <= 3; y++) {
            for (let x = 1; x <= 14; x++) {
                // Abrir espaço para porta dupla ao centro (x=7,8)
                if (y < 3 && (x === 7 || x === 8)) continue;
                // Janelas frontais estratégicas
                if (y === 2 && (x === 4 || x === 11)) continue;
                builder.add("1x1", base, 0, x, y, 1);
                builder.add("1x1", base, 0, x, y, 12);
            }
            for (let z = 2; z <= 11; z++) {
                builder.add("1x1", base, 0, 1, y, z);
                builder.add("1x1", base, 0, 14, y, z);
            }
        }

        // Porta dupla frontal
        builder.add("1x1", door, 0, 7, 1, 1);
        builder.add("1x1", door, 0, 8, 1, 1);
        builder.add("1x1", door, 0, 7, 2, 1);
        builder.add("1x1", door, 0, 8, 2, 1);

        // Janelas frontais
        builder.add("Window", window, 1, 4, 2, 1);
        builder.add("Window", window, 1, 11, 2, 1);

        // Varanda frontal (3 tiles de largura)
        builder.add("Tile 2x2", porchTile, 0, 5, 1, 1);
        builder.add("Tile 2x2", porchTile, 0, 7, 1, 1);
        builder.add("Tile 2x2", porchTile, 0, 9, 1, 1);

        // Colunas da varanda
        addPillarStackSafe(builder, 5, 1, 1, 2, columnColor);
        addPillarStackSafe(builder, 9, 1, 1, 2, columnColor);

        // Lajes e pequenas varandas laterais
        addFilledRectSafe(builder, 2, 3, 2, 12, 8, base); // laje superior preta (cor base)

        // Telhado em camadas para ficar alto e fechado
        addFilledRectSafe(builder, 1, 4, 1, 14, 12, roof);
        addFilledRectSafe(builder, 2, 5, 2, 12, 10, roof);
        addFilledRectSafe(builder, 3, 6, 3, 10, 8, roof);
        addFilledRectSafe(builder, 4, 7, 4, 8, 6, roof);

        // Chaminé pequena
        addPillarStackSafe(builder, 11, 6, 8, 2, roof);

        return builder.blocks;
    })(),
};

export default CasaComVaranda;
