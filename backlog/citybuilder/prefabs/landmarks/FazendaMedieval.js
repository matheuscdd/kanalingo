import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

// FazendaMedieval — Fazenda medieval com casa principal de dois andares (half-timber)
// e celeiro/galpão aberto ao lado, pátio central com caminho de pedra e detalhes externos.
//
// Composição visual (referência: imagem LEGO medieval farmhouse com celeiro):
//   Celeiro (esquerda, x=1..11) :
//     - Frente aberta (z=2) com apenas postes de canto
//     - Parede traseira e laterais em half-timber (madeira + reboco)
//     - Telhado cinza médio em duas águas, cumeeira baixa
//     - Interior: piso escuro, ferramenta, fardos de feno
//   Pátio (centro, x=12..15) :
//     - Caminho de pedra arenosa, galinha branca e marrom, barril
//   Casa principal (direita, x=16..28) :
//     - Térreo pedra cinza, porta central, 2 janelas frente, 1 lateral, 1 fundos
//     - Pórtico frontal com pilares e lintel
//     - Laje de transição/jetty (overhang 1u) para o 1º andar
//     - 1º andar half-timber (postes escuros + reboco), bay window de 3 janelas
//     - Empenas com roseta ornamental, telhado cinza escuro em 5 degraus
//     - Chaminé lateral com capelo em cruz e fumaça simbólica
//     - Cerca frontal direita, flores e trepadeira
//
// Eixos: X esquerda=0 direita=29 | Y solo=0 | Z frente=0 fundo=17
// Bounding box: dx=30, dy=19, dz=18

const FazendaMedieval = {
    dx: 30,
    dy: 19,
    dz: 18,
    blocks: (function () {
        const builder = createPrefabBuilder();

        // ── Paleta ────────────────────────────────────────────────────────────
        const grass      = "#4a7c40"; // gramado
        const stone      = "#8a8a8a"; // fundação / piso exterior
        const stoneDark  = "#5c5c5c"; // piso interior celeiro
        const timber     = "#4a2010"; // madeira escura (estrutura half-timber)
        const plaster    = "#ddd8cc"; // reboco creme (enchimento entre postes)
        const roofTile   = "#3a3a3a"; // telha casa (cinza escuro)
        const roofBarn   = "#7a7a7a"; // telhado celeiro (cinza médio)
        const glass      = "#9ac1d5"; // vidro azulado
        const door       = "#5a3218"; // porta madeira
        const fence      = "#6b3a1f"; // cerca
        const path       = "#b8a060"; // caminho arenoso
        const chimney    = "#7a7a7a"; // chaminé
        const smoke      = "#d0d0d0"; // fumaça
        const flowerRed  = "#c43c3c"; // flor vermelha
        const flowerYel  = "#d4a020"; // flor amarela
        const chickenW   = "#e8e8e8"; // galinha branca
        const chickenBr  = "#cc6620"; // galinha marrom

        // ════════════════════════════════════════════════════════════════════
        // PHASE 1 — Gramado base (y=0)
        // ════════════════════════════════════════════════════════════════════
        addFilledRectSafe(builder, 0, 0, 0, 30, 18, grass);

        // Caminho de pedra arenosa no pátio (x=12..15, z=2..13)
        for (let x = 12; x <= 15; x++) {
            for (let z = 2; z <= 13; z++) {
                builder.add("1x1", path, 0, x, 0, z);
            }
        }
        // Pedras individuais ao longo do caminho
        builder.add("1x1", stone, 0, 13, 0, 3);
        builder.add("1x1", stone, 0, 13, 0, 5);
        builder.add("1x1", stone, 0, 13, 0, 7);
        builder.add("1x1", stone, 0, 13, 0, 9);
        builder.add("1x1", stone, 0, 13, 0, 11);

        // ════════════════════════════════════════════════════════════════════
        // PHASE 2 — Fundações (y=1)
        // ════════════════════════════════════════════════════════════════════
        // Laje pedra celeiro (x=1..11, z=2..14 = 11×13)
        addFilledRectSafe(builder, 1, 1, 2, 10, 12, stone);
        // Plinto pedra casa (x=16..28, z=2..15 = 13×14)
        addFilledRectSafe(builder, 16, 1, 2, 12, 14, stone);

        // ════════════════════════════════════════════════════════════════════
        // PHASE 3 — Piso interior celeiro (y=2)
        // ════════════════════════════════════════════════════════════════════
        addFilledRectSafe(builder, 2, 2, 3, 8, 10, stoneDark);

        // ════════════════════════════════════════════════════════════════════
        // PHASE 4 — Celeiro: paredes e postes (y=2..5)
        // ════════════════════════════════════════════════════════════════════
        // Frente ABERTA (z=2): apenas postes de canto x=1 e x=10
        addPillarStackSafe(builder, 1,  2, 2, 4, timber);
        addPillarStackSafe(builder, 10, 2, 2, 4, timber);

        // Viga lintel frontal (y=5, z=2)
        for (let x = 2; x <= 9; x++) {
            builder.add("1x1", timber, 0, x, 5, 2);
        }

        // Parede traseira (z=13)
        for (let y = 2; y <= 5; y++) {
            for (let x = 1; x <= 10; x++) {
                const isPost = (x === 1 || x === 4 || x === 7 || x === 10);
                builder.add("1x1", isPost ? timber : plaster, 0, x, y, 13);
            }
        }

        // Parede lateral esquerda (x=1, z=3..12)
        for (let y = 2; y <= 5; y++) {
            for (let z = 3; z <= 12; z++) {
                const isPost = (z === 3 || z === 8 || z === 12);
                builder.add("1x1", isPost ? timber : plaster, 0, 1, y, z);
            }
        }

        // Parede lateral direita (x=10, z=3..12) — com janelinha em z=8, y=3
        for (let y = 2; y <= 5; y++) {
            for (let z = 3; z <= 12; z++) {
                const isPost = (z === 3 || z === 8 || z === 12);
                // Reserva para Window em y=3, z=8
                if (z === 8 && y === 3) continue;
                builder.add("1x1", isPost ? timber : plaster, 0, 10, y, z);
            }
        }
        // Janela lateral do celeiro
        builder.add("Window", glass, 1, 10, 3, 8);

        // Viga lintel traseiro (y=5, z=13)
        for (let x = 1; x <= 10; x++) {
            builder.add("1x1", timber, 0, x, 5, 13);
        }

        // ── Props interiores do celeiro ───────────────────────────────────────
        // Cabo de ferramenta (leme/forcado) — pillar vertical em x=3, z=4
        builder.add("1x1", timber, 0, 3, 3, 4);
        builder.add("1x1", timber, 0, 3, 4, 4);
        // Fardos de feno (caixas baixas) — x=7..8, z=5..6
        builder.add("1x1", path, 0, 7, 2, 5);
        builder.add("1x1", path, 0, 8, 2, 5);
        builder.add("1x1", path, 0, 7, 2, 6);
        builder.add("1x1", path, 0, 8, 2, 6);
        builder.add("1x1", flowerYel, 0, 7, 3, 5); // palha no topo

        // ════════════════════════════════════════════════════════════════════
        // PHASE 5 — Celeiro: empenas laterais (y=5..8)
        // Ridge ao longo do eixo X; empenas em z=2 e z=13
        // ════════════════════════════════════════════════════════════════════
        // Roseta/ornamento celeiro pré-colocado ANTES do loop de empena
        builder.add("1x1", timber, 0, 5, 7, 2);
        builder.add("1x1", timber, 0, 7, 7, 2);
        builder.add("1x1", timber, 0, 6, 6, 2);
        builder.add("1x1", timber, 0, 6, 8, 2);

        const barnGableSteps = [
            { y: 5, xStart: 1, xEnd: 10 },
            { y: 6, xStart: 2, xEnd:  9 },
            { y: 7, xStart: 3, xEnd:  8 },
            { y: 8, xStart: 4, xEnd:  7 },
        ];

        for (const { y, xStart, xEnd } of barnGableSteps) {
            for (let x = xStart; x <= xEnd; x++) {
                builder.add("1x1", plaster, 0, x, y, 2);
                builder.add("1x1", plaster, 0, x, y, 13);
            }
            // Borda de madeira nas quinas das empenas
            builder.add("1x1", timber, 0, xStart, y, 2);
            builder.add("1x1", timber, 0, xEnd,   y, 2);
            builder.add("1x1", timber, 0, xStart, y, 13);
            builder.add("1x1", timber, 0, xEnd,   y, 13);
        }

        // ════════════════════════════════════════════════════════════════════
        // PHASE 6 — Celeiro: telhado (y=5..8, 4 degraus)
        // Roof 1x2 ao longo do eixo Z; cumeeira no topo
        // ════════════════════════════════════════════════════════════════════
        // rot=0 → inclinação para +z (água frontal)
        // rot=2 → inclinação para -z (água traseira)
        for (let step = 0; step < 4; step++) {
            const y  = 5 + step;
            const zF = 2 + step;        // água frontal
            const zB = 11 - step;       // água traseira (sz=2, zB-1..zB)
            for (let x = 2; x <= 9; x++) {
                builder.add("Roof 1x2", roofBarn, 0, x, y, zF);
                builder.add("Roof 1x2", roofBarn, 2, x, y, zB);
            }
        }

        // Cumeeira celeiro (y=9, z=6..7)
        builder.add("Tile 2x2", roofBarn, 0, 2, 9, 6);
        builder.add("Tile 2x2", roofBarn, 0, 4, 9, 6);
        builder.add("Tile 2x2", roofBarn, 0, 6, 9, 6);
        builder.add("Tile 2x2", roofBarn, 0, 8, 9, 6);

        // ════════════════════════════════════════════════════════════════════
        // PHASE 7 — Casa: piso interior (y=2)
        // ════════════════════════════════════════════════════════════════════
        addFilledRectSafe(builder, 17, 2, 3, 10, 12, path);

        // ════════════════════════════════════════════════════════════════════
        // PHASE 8 — Casa: paredes térreo (y=2..5)
        // Pré-colocar janelas ANTES do loop para reservar células
        // ════════════════════════════════════════════════════════════════════
        // Janelas frontais (rot=0, sz aponta +z)
        builder.add("Window", glass, 0, 18, 3, 2);  // frontal esquerda
        builder.add("Window", glass, 0, 25, 3, 2);  // frontal direita
        // Janela lateral direita (rot=1, sx aponta +x)
        builder.add("Window", glass, 1, 28, 3, 9);  // lateral direita
        // Janela traseira
        builder.add("Window", glass, 0, 22, 3, 15); // fundos

        for (let y = 2; y <= 5; y++) {
            // Fachada frontal (z=2)
            for (let x = 16; x <= 28; x++) {
                // Porta central: x=21..22, y=2..4
                if ((x === 21 || x === 22) && y <= 4) continue;
                // Window frontal esq ocupa (x=18, y=3..4, z=2..3) — reservar x=18, y=3,4
                if (x === 18 && (y === 3 || y === 4)) continue;
                // Window frontal dir ocupa (x=25, y=3..4, z=2..3)
                if (x === 25 && (y === 3 || y === 4)) continue;
                const isPost = (x === 16 || x === 20 || x === 24 || x === 28);
                builder.add("1x1", isPost ? timber : stone, 0, x, y, 2);
            }
            // Fachada traseira (z=15)
            for (let x = 16; x <= 28; x++) {
                // Window traseira ocupa (x=22, y=3..4, z=15..16) — reservar x=22, y=3,4
                if (x === 22 && (y === 3 || y === 4)) continue;
                builder.add("1x1", stone, 0, x, y, 15);
            }
            // Lateral esquerda (x=16, z=3..14)
            for (let z = 3; z <= 14; z++) {
                builder.add("1x1", stone, 0, 16, y, z);
            }
            // Lateral direita (x=28, z=3..14)
            for (let z = 3; z <= 14; z++) {
                // Window lateral dir ocupa (x=28..29, y=3..4, z=9) — reservar z=9, y=3,4
                if (z === 9 && (y === 3 || y === 4)) continue;
                builder.add("1x1", stone, 0, 28, y, z);
            }
        }

        // Porta: preencher com madeira escura
        for (let y = 2; y <= 4; y++) {
            builder.add("1x1", door, 0, 21, y, 2);
            builder.add("1x1", door, 0, 22, y, 2);
        }

        // Verga sobre porta e janelas (topo paredes y=5)
        for (let x = 19; x <= 24; x++) {
            builder.add("1x1", timber, 0, x, 5, 2);
        }
        builder.add("1x1", timber, 0, 17, 5, 2);
        builder.add("1x1", timber, 0, 18, 5, 2);
        builder.add("1x1", timber, 0, 19, 5, 2);
        builder.add("1x1", timber, 0, 24, 5, 2);
        builder.add("1x1", timber, 0, 25, 5, 2);
        builder.add("1x1", timber, 0, 26, 5, 2);

        // ════════════════════════════════════════════════════════════════════
        // PHASE 9 — Casa: pórtico frontal
        // ════════════════════════════════════════════════════════════════════
        // Degrau de pedra (z=1)
        builder.add("2x2", stone, 0, 20, 1, 1);
        builder.add("2x2", stone, 0, 22, 1, 1);
        // Pilares do pórtico
        addPillarStackSafe(builder, 20, 3, 1, 3, stone);
        addPillarStackSafe(builder, 23, 3, 1, 3, stone);
        // Lintel do pórtico
        for (let x = 20; x <= 23; x++) {
            builder.add("1x1", stone, 0, x, 6, 1);
        }

        // ════════════════════════════════════════════════════════════════════
        // PHASE 10 — Casa: laje de transição/jetty (y=6)
        // Overhang de 1u em todas as direções
        // ════════════════════════════════════════════════════════════════════
        addFilledRectSafe(builder, 15, 6, 1, 14, 16, timber);

        // ════════════════════════════════════════════════════════════════════
        // PHASE 11 — Casa: 1º andar half-timber (y=7..9)
        // ════════════════════════════════════════════════════════════════════
        // Pré-colocar bay window (3 painéis frontais projetados) ANTES do loop
        builder.add("Window", glass, 0, 19, 7, 2);
        builder.add("Window", glass, 0, 21, 7, 2);
        builder.add("Window", glass, 0, 23, 7, 2);

        for (let y = 7; y <= 9; y++) {
            // Fachada frontal (z=2)
            for (let x = 16; x <= 28; x++) {
                // Bay window ocupa x=19..20, x=21..22, x=23..24 em y=7..8, z=2..3
                if ((x === 19 || x === 21 || x === 23) && (y === 7 || y === 8)) continue;
                const isPost = (x === 16 || x === 20 || x === 24 || x === 28);
                const isBeam = (y === 8);
                builder.add("1x1", (isPost || isBeam) ? timber : plaster, 0, x, y, 2);
            }
            // Fachada traseira (z=15)
            for (let x = 16; x <= 28; x++) {
                const isPost = (x === 16 || x === 20 || x === 24 || x === 28);
                const isBeam = (y === 8);
                builder.add("1x1", (isPost || isBeam) ? timber : plaster, 0, x, y, 15);
            }
            // Lateral esquerda (x=16, z=3..14)
            for (let z = 3; z <= 14; z++) {
                const isPost = (z === 3 || z === 8 || z === 14);
                const isBeam = (y === 8);
                builder.add("1x1", (isPost || isBeam) ? timber : plaster, 0, 16, y, z);
            }
            // Lateral direita (x=28, z=3..14)
            for (let z = 3; z <= 14; z++) {
                const isPost = (z === 3 || z === 8 || z === 14);
                const isBeam = (y === 8);
                builder.add("1x1", (isPost || isBeam) ? timber : plaster, 0, 28, y, z);
            }
        }

        // ════════════════════════════════════════════════════════════════════
        // PHASE 12 — Casa: empenas laterais (y=10..14)
        // ════════════════════════════════════════════════════════════════════
        // Roseta ornamental ANTES do loop de empena (para não ser sobrescrita)
        // Posicionada em x=16 (empena esquerda), y=12, z central
        builder.add("1x1", timber, 0, 16, 11, 8);
        builder.add("1x1", timber, 0, 16, 13, 8);
        builder.add("1x1", timber, 0, 16, 12, 7);
        builder.add("1x1", timber, 0, 16, 12, 9);

        const houseGableSteps = [
            { y: 10, zStart: 2, zEnd: 15 },
            { y: 11, zStart: 3, zEnd: 14 },
            { y: 12, zStart: 4, zEnd: 13 },
            { y: 13, zStart: 5, zEnd: 12 },
            { y: 14, zStart: 6, zEnd: 11 },
        ];

        for (const { y, zStart, zEnd } of houseGableSteps) {
            for (let z = zStart; z <= zEnd; z++) {
                builder.add("1x1", plaster, 0, 16, y, z);
                builder.add("1x1", plaster, 0, 28, y, z);
            }
            // Borda de madeira nas quinas das empenas
            builder.add("1x1", timber, 0, 16, y, zStart);
            builder.add("1x1", timber, 0, 16, y, zEnd);
            builder.add("1x1", timber, 0, 28, y, zStart);
            builder.add("1x1", timber, 0, 28, y, zEnd);
        }

        // ════════════════════════════════════════════════════════════════════
        // PHASE 13 — Casa: telhado (y=10..14, 5 degraus)
        // Roof 1x2 ao longo do eixo X
        // ════════════════════════════════════════════════════════════════════
        for (let step = 0; step < 5; step++) {
            const y  = 10 + step;
            const zF = 2 + step;   // água frontal (rot=0)
            const zB = 13 - step;  // água traseira (rot=2, sz=2: posição zB..zB+1)
            for (let x = 17; x <= 27; x++) {
                builder.add("Roof 1x2", roofTile, 0, x, y, zF);
                builder.add("Roof 1x2", roofTile, 2, x, y, zB);
            }
        }

        // Cumeeira da casa (y=15, z=7..8)
        for (let x = 16; x <= 28; x += 2) {
            builder.add("Tile 2x2", roofTile, 0, x, 15, 7);
        }
        // Ornamento cumeeira (y=16)
        builder.add("1x1", roofTile, 0, 22, 16, 8);

        // ════════════════════════════════════════════════════════════════════
        // PHASE 14 — Chaminé (y=2..17)
        // ════════════════════════════════════════════════════════════════════
        addPillarStackSafe(builder, 26, 2, 12, 15, chimney);
        // Capelo em cruz (y=17)
        builder.add("1x1", chimney, 0, 25, 17, 12);
        builder.add("1x1", chimney, 0, 27, 17, 12);
        builder.add("1x1", chimney, 0, 26, 17, 11);
        builder.add("1x1", chimney, 0, 26, 17, 13);
        // Fumaça simbólica
        builder.add("1x1", smoke, 0, 26, 18, 12);

        // ════════════════════════════════════════════════════════════════════
        // PHASE 15 — Detalhes externos
        // ════════════════════════════════════════════════════════════════════
        // Cerca frontal (direita da casa, z=0..6)
        addPillarStackSafe(builder, 29, 1, 0, 3, fence);
        addPillarStackSafe(builder, 29, 1, 3, 3, fence);
        addPillarStackSafe(builder, 29, 1, 6, 3, fence);
        // Rails da cerca
        builder.add("1x1", fence, 0, 29, 3, 1);
        builder.add("1x1", fence, 0, 29, 3, 2);
        builder.add("1x1", fence, 0, 29, 3, 4);
        builder.add("1x1", fence, 0, 29, 3, 5);

        // Galinha branca (pátio frontal)
        builder.add("1x1", chickenW,  0, 13, 1, 1);
        // Galinha marrom
        builder.add("1x1", chickenBr, 0, 14, 1, 0);
        // Barril (entrada do pátio)
        addPillarStackSafe(builder, 12, 1, 2, 2, timber);

        // Flores vermelhas (frente da casa)
        builder.add("1x1", flowerRed, 0, 17, 1, 0);
        builder.add("1x1", flowerRed, 0, 27, 1, 0);
        // Flores amarelas
        builder.add("1x1", flowerYel, 0, 20, 1, 0);
        builder.add("1x1", flowerYel, 0, 24, 1, 0);
        // Trepadeira na lateral direita da casa
        builder.add("1x1", grass, 0, 28, 2, 5);
        builder.add("1x1", grass, 0, 28, 3, 5);
        builder.add("1x1", grass, 0, 28, 4, 5);

        return builder.blocks;
    })(),
};

export default FazendaMedieval;
