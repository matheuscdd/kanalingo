import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

const VilaDeLuxo = {
    dx: 32,
    dy: 14,
    dz: 26,
    blocks: (function () {
        const builder = createPrefabBuilder();
        const lawn = "#2f6034";
        const facade = "#f6efe6";
        const roof = "#5b3a2a";
        const trim = "#d4c9b8";
        const glass = "#9ac1d5";
        const pool = "#5ea6c7";
        const deck = "#c6a36e";

        // Geometria/parametros reutilizaveis
        const bodyX0 = 4;
        const bodyZ0 = 6;
        const bodyWidth = 24;
        const bodyDepth = 14;
        const wallTopY = 8;
        const roofBaseY = 9;

        // Base: relva / piso geral
        addFilledRectSafe(builder, 0, 0, 0, 32, 26, lawn);

        // Massa central principal (paredes por nível)
        // reservar vãos de janelas antes de preencher as paredes
        for (let x = 6; x <= 18; x += 4) {
            builder.add("Window", glass, 1, x, 2, 6);
            builder.add("Window", glass, 1, x, 4, 6);
            builder.add("Window", glass, 1, x, 2, 18);
            builder.add("Window", glass, 1, x, 4, 18);
        }

        // construir paredes contínuas por nível (y = 1..wallTopY)
        for (let y = 1; y <= wallTopY; y++) {
            addFilledRectSafe(builder, bodyX0, y, bodyZ0, bodyWidth, bodyDepth, facade);
        }

        // piso interno de ligação (ajuda a manter conectividade entre pavilhões e massa)
        addFilledRectSafe(builder, bodyX0 + 1, 3, bodyZ0 + 1, bodyWidth - 2, bodyDepth - 2, trim);

        // Pavilhões laterais (shell)
        addFilledRectSafe(builder, 0, 1, 0, 8, 8, facade);
        addFilledRectSafe(builder, 24, 1, 18, 8, 8, facade);

        // Terraços e recuos em camadas (shell)
        addFilledRectSafe(builder, 6, 4, 8, 20, 10, trim);
        addFilledRectSafe(builder, 8, 6, 10, 16, 6, trim);

        // Piscina frontal e deck
        addFilledRectSafe(builder, 10, 1, 2, 12, 4, pool);
        addFilledRectSafe(builder, 8, 1, 6, 16, 2, deck);

        // Cobertura macro para massa principal (ancorada e em camadas contínuas)
        addFilledRectSafe(builder, 3, roofBaseY, 5, 26, 16, roof);
        addFilledRectSafe(builder, 5, roofBaseY + 1, 7, 22, 12, roof);
        addFilledRectSafe(builder, 7, roofBaseY + 2, 9, 18, 8, roof);

        // Pilares de suporte para grandes beirais (frontal / traseiro)
        for (const px of [3, 11, 19, 27]) {
            addPillarStackSafe(builder, px, 1, 5, roofBaseY - 1, trim);
            addPillarStackSafe(builder, px, 1, 20, roofBaseY - 1, trim);
        }

        // Janelas: vãos reservados antes da construção das paredes (movidas acima)

        // Colunas de apoio para pavilhões
        addPillarStackSafe(builder, 2, 1, 2, 3, trim);
        addPillarStackSafe(builder, 29, 1, 21, 3, trim);

        // Helpers: parapets and 1x1 border (used for pool coping and trims)
        const addParapet = (x0, z0, width, depth, y, color = trim) => {
            const x1 = x0 + width - 1;
            const z1 = z0 + depth - 1;
            for (let x = x0; x <= x1; x++) {
                builder.add("1x1", color, 0, x, y, z0);
                builder.add("1x1", color, 0, x, y, z1);
            }
            for (let z = z0 + 1; z < z1; z++) {
                builder.add("1x1", color, 0, x0, y, z);
                builder.add("1x1", color, 0, x1, y, z);
            }
        };

        const addBorder1x1 = (x0, z0, width, depth, y, color = deck) => {
            const x1 = x0 + width - 1;
            const z1 = z0 + depth - 1;
            // top/bottom
            for (let x = x0 - 1; x <= x1 + 1; x++) {
                if (x >= 0 && x < 32) {
                    if (z0 - 1 >= 0) builder.add("1x1", color, 0, x, y, z0 - 1);
                    if (z1 + 1 < 26) builder.add("1x1", color, 0, x, y, z1 + 1);
                }
            }
            // left/right
            for (let z = z0; z <= z1; z++) {
                if (z >= 0 && z < 26) {
                    if (x0 - 1 >= 0) builder.add("1x1", color, 0, x0 - 1, y, z);
                    if (x1 + 1 < 32) builder.add("1x1", color, 0, x1 + 1, y, z);
                }
            }
        };

        // Parapet no topo da massa principal (conectado ao telhado inferior via diagonal 26-neighbor)
        addParapet(4, 6, 24, 14, 12, trim);

        // Conectores verticais para parapeito: garantem que a coroa não fique flutuando
        const parapetY = 12;
        for (let x = 4; x <= 27; x += 2) {
            // pilares que vão do topo do telhado até o parapeito
            const h = parapetY - roofBaseY + 1; // ex.: parapetY=12, roofBaseY=9 -> h=4
            addPillarStackSafe(builder, x, roofBaseY, 6, h, trim);
            addPillarStackSafe(builder, x, roofBaseY, 19, h, trim);
        }

        // Se ainda existirem lacunas verticais entre telhado e parapeito, preenche-las com 1x1 intermediários
        for (let x = 4; x <= 27; x++) {
            builder.add("1x1", trim, 0, x, roofBaseY + 1, 6);
            builder.add("1x1", trim, 0, x, roofBaseY + 2, 6);
            builder.add("1x1", trim, 0, x, roofBaseY + 1, 19);
            builder.add("1x1", trim, 0, x, roofBaseY + 2, 19);
        }
        // Obs: pavilhões laterais não têm parapeito (evitar componentes flutuantes)

        // Conectores verticais — liga camadas internas para garantir peça única e grounded
        // facade(y=1) → terrace1(y=4)
        builder.add("1x1", facade, 0, 9, 2, 12);
        builder.add("1x1", facade, 0, 9, 3, 12);
        // terrace1(y=4) → terrace2(y=6)
        builder.add("1x1", trim, 0, 9, 5, 12);
        // terrace2(y=6) → roof1(y=9)
        builder.add("1x1", trim, 0, 9, 7, 12);
        builder.add("1x1", trim, 0, 9, 8, 12);
        // roof1(y=9) → roof2(y=11)
        builder.add("1x1", roof, 0, 10, 10, 12);

        // Pool coping / border (1x1 around pool)
        addBorder1x1(10, 2, 12, 4, 1, deck);

        // Conectores rápidos para garantir que o deck/pool estejam ligados ao corpo principal
        addPillarStackSafe(builder, 12, 1, 5, 1, trim);
        addPillarStackSafe(builder, 20, 1, 5, 1, trim);

        // Small pool ladder (two-step detail)
        builder.add("1x1", trim, 0, 21, 2, 3);
        builder.add("1x1", trim, 0, 21, 1, 3);

        // Small pavilion on the terrace (columns + tile roof)
        const pvX = 12;
        const pvZ = 10;
        const pvSize = 4;
        const pvBaseY = 6; // sits on terrace layer
        // corner columns
        addPillarStackSafe(builder, pvX, pvBaseY, pvZ, 3, trim);
        addPillarStackSafe(builder, pvX + pvSize - 1, pvBaseY, pvZ, 3, trim);
        addPillarStackSafe(builder, pvX, pvBaseY, pvZ + pvSize - 1, 3, trim);
        addPillarStackSafe(builder, pvX + pvSize - 1, pvBaseY, pvZ + pvSize - 1, 3, trim);
        // roof tiles covering the 4x4 pavilion (2x2 tiles)
        for (let x = pvX; x < pvX + pvSize; x += 2) {
            for (let z = pvZ; z < pvZ + pvSize; z += 2) {
                builder.add("Tile 2x2", roof, 0, x, pvBaseY + 3, z);
            }
        }

        // Small decorative tiles on the deck (sun-loungers suggestion)
        builder.add("Tile 2x2", trim, 0, 9, 1, 6);
        builder.add("Tile 2x2", trim, 0, 11, 1, 6);

        // Balcony details (small second-floor balconies)
        const balconyY = 5;
        const balconies = [10, 14];
        for (let bx of balconies) {
            builder.add("Tile 2x2", trim, 0, bx, balconyY, 6);
            builder.add("1x1", trim, 0, bx, balconyY + 1, 6);
            builder.add("1x1", trim, 0, bx + 1, balconyY + 1, 6);
        }

        // Window trims around main facade windows
        for (let x = 6; x <= 18; x += 4) {
            // top trim
            builder.add("1x1", trim, 0, x, 5, 6);
            builder.add("1x1", trim, 0, x, 5, 18);
            // side trims at both window heights
            [2, 4].forEach((wy) => {
                if (x - 1 >= 0) builder.add("1x1", trim, 0, x - 1, wy, 6);
                if (x + 1 < 32) builder.add("1x1", trim, 0, x + 1, wy, 6);
                if (x - 1 >= 0) builder.add("1x1", trim, 0, x - 1, wy, 18);
                if (x + 1 < 32) builder.add("1x1", trim, 0, x + 1, wy, 18);
            });
        }

        // Chimneys on roof
        addPillarStackSafe(builder, 9, 11, 9, 2, roof);
        addPillarStackSafe(builder, 21, 11, 13, 2, roof);

        // Planters on terrace
        addFilledRectSafe(builder, 8, 6, 12, 2, 2, lawn);
        addFilledRectSafe(builder, 20, 6, 12, 2, 2, lawn);

        // Walkway tiles from pool to terrace entrance
        for (let z = 3; z <= 6; z += 2) {
            builder.add("Tile 2x2", deck, 0, 16, 1, z);
        }

        // Path lights
        builder.add("1x1", "#ffdca6", 0, 15, 2, 5);
        builder.add("1x1", "#ffdca6", 0, 17, 2, 5);

        return builder.blocks;
    })(),
};

export default VilaDeLuxo;
