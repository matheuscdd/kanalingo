import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

const MansaoClassica = {
    dx: 28,
    dy: 12,
    dz: 20,
    blocks: (function () {
        const builder = createPrefabBuilder();
        const lawn = "#2f6034";
        const stone = "#efe6d8"; // fachada
        const roof = "#6d513b";
        const trim = "#d1c6b8";
        const windowColor = "#90aabd";
        const column = "#f4f4f4";

        // Base / gramado
        addFilledRectSafe(builder, 0, 0, 0, 28, 20, lawn);

        // Janelas frontais e traseiras por níveis (colocadas antes das camadas de parede para reservar espaço)
        for (let x = 5; x <= 21; x += 4) {
            builder.add("Window", windowColor, 1, x, 2, 3);
            builder.add("Window", windowColor, 1, x, 2, 16);
            builder.add("Window", windowColor, 1, x, 4, 3);
            builder.add("Window", windowColor, 1, x, 4, 16);
        }

        // Corpo principal (paredes verticais): y = 1..5 para dar aparência de casa
        // posição x:3..24 (width 22), z:3..16 (depth 14)
        for (let y = 1; y <= 5; y++) {
            addFilledRectSafe(builder, 3, y, 3, 22, 14, stone);
        }

        // Conectores verticais estratégicos (colunas de suporte) para garantir conectividade em todas rotações
        for (const cx of [3, 7, 11, 15, 19, 23]) {
            addPillarStackSafe(builder, cx, 1, 3, 6, column); // frente
            addPillarStackSafe(builder, cx, 1, 16, 6, column); // verso
        }

        // Portico frontal central
        const porticoX = 10;
        const porticoZ = 2;
        addFilledRectSafe(builder, porticoX, 1, porticoZ, 8, 2, trim);
        // Colunas do pórtico (mais frequentes para leitura clássica)
        for (let px = porticoX + 1; px < porticoX + 7; px += 3) addPillarStackSafe(builder, px, 1, porticoZ, 3, column);
        // Escadas frontais (degraus em tiles) - dois níveis
        addFilledRectSafe(builder, porticoX + 1, 1, 0, 6, 2, trim);
        addFilledRectSafe(builder, porticoX + 1, 2, 0, 6, 1, trim);
        // Pequenas sacadas no segundo pavimento ao redor do pórtico
        builder.add("Tile 2x2", trim, 0, porticoX + 2, 5, 2);
        builder.add("Tile 2x2", trim, 0, porticoX + 4, 5, 2);
        // Colunas decorativas adicionais apoiando as sacadas
        addPillarStackSafe(builder, porticoX + 2, 3, 2, 2, column);
        addPillarStackSafe(builder, porticoX + 4, 3, 2, 2, column);

        // Telhado em camadas contínuas (mais compacto e sem gaps)
        // base do telhado encostada ao topo das paredes (y=6)
        addFilledRectSafe(builder, 2, 6, 2, 24, 16, roof);
        addFilledRectSafe(builder, 4, 7, 4, 20, 12, roof);
        addFilledRectSafe(builder, 6, 8, 6, 16, 8, roof);

        // Parapeitos no topo do telhado (colocados depois do telhado para não criar ilhas isoladas)
        for (let x = 2; x < 26; x += 2) {
            builder.add("1x1", trim, 0, x, 7, 2);
            builder.add("1x1", trim, 0, x, 7, 15);
        }

        // Pico do telhado (um nível acima do topo)
        builder.add("Tile 2x2", roof, 0, 10, 9, 8);

        // Chaminé técnica (ajustada para o telhado compacto)
        addPillarStackSafe(builder, 18, 7, 10, 2, roof);

        return builder.blocks;
    })(),
};

export default MansaoClassica;
