import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

const VilaComPatio = {
    dx: 24,
    dy: 12,
    dz: 20,
    blocks: (function () {
        const builder = createPrefabBuilder();
        const lawn = "#2f6034";
        const facade = "#efe6d8";
        const roof = "#6d513b";
        const window = "#89b0c8";
        const column = "#cfc5b6";

        // Base: relva / piso
        addFilledRectSafe(builder, 0, 0, 0, 24, 20, lawn);

        // Paredes perimetrais (altura 1..3) - abrindo passagem frontal central
        for (let y = 1; y <= 3; y++) {
            for (let x = 0; x < 24; x++) {
                // abertura central frontal em x 11 e 12
                if (!(x === 11 || x === 12)) builder.add("1x1", facade, 0, x, y, 0);
                builder.add("1x1", facade, 0, x, y, 19);
            }
            for (let z = 1; z < 19; z++) {
                builder.add("1x1", facade, 0, 0, y, z);
                builder.add("1x1", facade, 0, 23, y, z);
            }
        }

        // Janelas de teste (extremidades frontais)
        builder.add("Window", window, 1, 3, 2, 0);
        builder.add("Window", window, 1, 20, 2, 0);

        // Colunas nas esquinas internas do pátio
        addPillarStackSafe(builder, 2, 1, 2, 2, column);
        addPillarStackSafe(builder, 21, 1, 2, 2, column);
        addPillarStackSafe(builder, 2, 1, 17, 2, column);
        addPillarStackSafe(builder, 21, 1, 17, 2, column);

        // Cobertura macro em anel (deixar pátio aberto)
        // Frente
        addFilledRectSafe(builder, 0, 4, 0, 24, 4, roof);
        // Fundo
        addFilledRectSafe(builder, 0, 4, 16, 24, 4, roof);
        // Lados (faixa interna)
        addFilledRectSafe(builder, 0, 4, 4, 4, 12, roof);
        addFilledRectSafe(builder, 20, 4, 4, 4, 12, roof);

        // Parapeitos e lintel na entrada (detalhamento do pátio)
        const trim = "#e0d6c2";

        for (let x = 0; x < 24; x += 2) {
            if (x === 11 || x === 12) continue; // preservar passagem central (x11,x12)
            builder.add("1x1", trim, 0, x, 3, 0);
            builder.add("1x1", trim, 0, x, 3, 19);
        }

        // Lintel decorativo sobre a passagem central
        builder.add("1x1", "#8b5a2b", 0, 11, 3, 0);
        builder.add("1x1", "#8b5a2b", 0, 12, 3, 0);

        // Bancos no pátio (Tile 2x2)
        builder.add("Tile 2x2", "#b69b6b", 0, 4, 1, 4);
        builder.add("Tile 2x2", "#b69b6b", 0, 17, 1, 4);
        builder.add("Tile 2x2", "#b69b6b", 0, 4, 1, 13);
        builder.add("Tile 2x2", "#b69b6b", 0, 17, 1, 13);

        // Pilares decorativos no interior, em ritmo
        addPillarStackSafe(builder, 6, 1, 3, 3, column);
        addPillarStackSafe(builder, 17, 1, 3, 3, column);

        return builder.blocks;
    })(),
};

export default VilaComPatio;
