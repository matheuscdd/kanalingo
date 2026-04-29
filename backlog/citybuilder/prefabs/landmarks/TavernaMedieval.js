import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

// TavernaMedieval — Sobrado medieval de dois andares estilo inglês.
//
// Composição visual (referência: imagem LEGO medieval townhouse):
//   Térreo   : pedra cinza sólida, porta arqueada central com pilastras de madeira,
//              degrau frontal de pedra escura, lanterna na parede.
//   1º andar : jetty (balanço 1u em todas as direções), half-timber
//              (postes + viga horizontais de madeira escura sobre reboco creme),
//              bay window de 3 painéis projetando à frente, janela lateral direita.
//   Telhado  : telha terracota em duas águas com beira de madeira escura,
//              chaminé lateral com capelo em cruz.
//   Jardim   : gramado verde, caminho de pedra, flores amarelas e azuis.
//
// Eixos: X esquerda=0 direita=13 | Y solo=0 | Z frente=0 fundo=13
// Bounding box: dx=14, dy=16, dz=14

const TavernaMedieval = {
    dx: 14,
    dy: 16,
    dz: 14,
    blocks: (function () {
        const builder = createPrefabBuilder();

        // ── Paleta ────────────────────────────────────────────────────────────
        const grass       = "#4a7c40"; // gramado verde
        const stone       = "#8a8a8a"; // pedra cinza (térreo)
        const stoneDark   = "#626262"; // pedra escura (degraus, caminho)
        const timber      = "#3d2010"; // madeira escura (half-timber, porta, beira)
        const plaster     = "#ddd8cc"; // reboco creme (enchimento entre postes)
        const roofTile    = "#c46b2a"; // telha terracota laranja
        const glass       = "#4a6070"; // vidro escuro (janelas medievais)
        const chimneyGray = "#7a7a7a"; // chaminé
        const flowerYel   = "#d4c020"; // flores amarelas
        const flowerBlu   = "#5588cc"; // flores azuis

        // ── Phase 1: Gramado (y=0) ────────────────────────────────────────────
        addFilledRectSafe(builder, 0, 0, 0, 14, 14, grass);

        // ── Phase 2: Fundação de pedra (y=1) ─────────────────────────────────
        addFilledRectSafe(builder, 2, 1, 2, 10, 10, stone);

        // Caminho de pedra escura até a porta (z=0..1, x=5..8)
        addFilledRectSafe(builder, 5, 1, 0, 4, 2, stoneDark);

        // ── Phase 3: Paredes do térreo (y=2..4) ──────────────────────────────
        // Loop manual para preservar aberturas e variar cores por posição.
        // Fachada frontal z=2:
        //   - porta: x=6,7 skip em y=2,3
        //   - pilastras: x=5,8 → timber em y=2..4
        //   - verga do arco: x=5..8 em y=4 → timber(5,8) + stone(6,7)
        for (let y = 2; y <= 4; y++) {
            // Fachada frontal (z=2)
            for (let x = 2; x <= 11; x++) {
                if ((x === 6 || x === 7) && y <= 3) continue; // abertura da porta
                const col = (x === 5 || x === 8) ? timber : stone;
                builder.add("1x1", col, 0, x, y, 2);
            }
            // Fachada traseira (z=11)
            for (let x = 2; x <= 11; x++) {
                builder.add("1x1", stone, 0, x, y, 11);
            }
            // Lateral esquerda (x=2, z=3..10)
            for (let z = 3; z <= 10; z++) {
                builder.add("1x1", stone, 0, 2, y, z);
            }
            // Lateral direita (x=11, z=3..10)
            for (let z = 3; z <= 10; z++) {
                builder.add("1x1", stone, 0, 11, y, z);
            }
        }

        // Porta: preencher abertura com madeira escura
        builder.add("1x1", timber, 0, 6, 2, 2);
        builder.add("1x1", timber, 0, 6, 3, 2);
        builder.add("1x1", timber, 0, 7, 2, 2);
        builder.add("1x1", timber, 0, 7, 3, 2);

        // Degrau frontal (y=2, z=1, x=5..8)
        builder.add("2x2", stoneDark, 0, 5, 2, 1);
        builder.add("2x2", stoneDark, 0, 7, 2, 1);

        // Lanterna na parede (y=3, z=2, esquerda da porta)
        builder.add("1x1", "#1a1a10", 0, 4, 3, 2);

        // ── Phase 4: Laje de transição + overhang (y=5) ──────────────────────
        // Laje de madeira cobrindo x=1..12, z=1..12 (overhang 1u vs térreo x=2..11, z=2..11)
        addFilledRectSafe(builder, 1, 5, 1, 12, 12, timber);

        // Suporte do bay window: 3 blocos 1x1 em y=5, z=0 (x=1,2,3)
        // Conectam à laje z=1 via 26-vizinhança → grounded ✓
        builder.add("1x1", timber, 0, 1, 5, 0);
        builder.add("1x1", timber, 0, 2, 5, 0);
        builder.add("1x1", timber, 0, 3, 5, 0);

        // ── Phase 5: 1º andar — half-timber (y=6..8) ─────────────────────────
        // Regras de cor:
        //   postes verticais timber: x=1,5,9,12 (fachadas frontal/traseira)
        //                            z=1,6,12   (laterais)
        //   viga horizontal timber: y===7 em todas as faces
        //   enchimento: plaster
        // Reservas:
        //   bay window (fachada frontal z=1): x=1..3, y=6..7 → skip (Window blocks abaixo)
        //   janela lateral dir (x=12, z=5): y=6..7 → skip (Window rot=1)

        for (let y = 6; y <= 8; y++) {
            // Fachada frontal (z=1)
            for (let x = 1; x <= 12; x++) {
                if (x <= 3 && y <= 7) continue; // bay window
                const isPost = (x === 1 || x === 5 || x === 9 || x === 12);
                const col = (isPost || y === 7) ? timber : plaster;
                builder.add("1x1", col, 0, x, y, 1);
            }
            // Fachada traseira (z=12)
            for (let x = 1; x <= 12; x++) {
                const isPost = (x === 1 || x === 5 || x === 9 || x === 12);
                const col = (isPost || y === 7) ? timber : plaster;
                builder.add("1x1", col, 0, x, y, 12);
            }
            // Lateral esquerda (x=1, z=1..12)
            for (let z = 1; z <= 12; z++) {
                const isPost = (z === 1 || z === 6 || z === 12);
                const col = (isPost || y === 7) ? timber : plaster;
                builder.add("1x1", col, 0, 1, y, z);
            }
            // Lateral direita (x=12, z=1..12)
            for (let z = 1; z <= 12; z++) {
                if (z === 5 && y <= 7) continue; // janela lateral dir
                const isPost = (z === 1 || z === 6 || z === 12);
                const col = (isPost || y === 7) ? timber : plaster;
                builder.add("1x1", col, 0, 12, y, z);
            }
        }

        // Bay window: 3 Window rot=0 projetando z=0 (sz=2 → ocupa z=0..1)
        // lx+dx=2,3,4 ≤14 ✓; ly+sy=8 ≤16 ✓; lz+sz=2 ≤14 ✓
        builder.add("Window", glass, 0, 1, 6, 0);
        builder.add("Window", glass, 0, 2, 6, 0);
        builder.add("Window", glass, 0, 3, 6, 0);

        // Verga do bay window (y=8, z=0)
        builder.add("1x1", timber, 0, 1, 8, 0);
        builder.add("1x1", timber, 0, 2, 8, 0);
        builder.add("1x1", timber, 0, 3, 8, 0);

        // Janela lateral direita: Window rot=1 → dx=2 dz=1
        // lx=11 → lx+dx=13 ≤14 ✓; ly+sy=8 ≤16 ✓; lz+dz=6 ≤14 ✓
        builder.add("Window", glass, 1, 11, 6, 5);

        // ── Phase 6: Empenas laterais (y=9..13, x=1 e x=12) ─────────────────
        // Triângulos plaster com bordas timber fechando as extremidades do telhado.
        const gableSteps = [
            { y: 9,  zStart: 1, zEnd: 12 },
            { y: 10, zStart: 2, zEnd: 11 },
            { y: 11, zStart: 3, zEnd: 10 },
            { y: 12, zStart: 4, zEnd: 9  },
            { y: 13, zStart: 5, zEnd: 8  },
        ];
        for (const { y, zStart, zEnd } of gableSteps) {
            for (let z = zStart; z <= zEnd; z++) {
                const isEdge = (z === zStart || z === zEnd);
                const col = isEdge ? timber : plaster;
                builder.add("1x1", col, 0, 1,  y, z);
                builder.add("1x1", col, 0, 12, y, z);
            }
        }

        // ── Phase 7: Telhado em duas águas (y=9..12) ─────────────────────────
        // 4 passos de Roof 1x2 (sx=1, sy=1, sz=2):
        //   rot=0: inclina para +z (água frontal), lz=1+step
        //   rot=2: inclina para -z (água traseira), lz=11-step
        // Cobertura por step:
        //   step 0 y=9:  frente z=1..2, trás z=11..12
        //   step 1 y=10: frente z=2..3, trás z=10..11
        //   step 2 y=11: frente z=3..4, trás z=9..10
        //   step 3 y=12: frente z=4..5, trás z=8..9
        // Gap restante: z=5..8 → fechado pela cumeeira em y=13
        for (let step = 0; step < 4; step++) {
            const y  = 9 + step;
            const zF = 1 + step;
            const zB = 11 - step;
            for (let x = 2; x <= 11; x++) {
                builder.add("Roof 1x2", roofTile, 0, x, y, zF);
                builder.add("Roof 1x2", roofTile, 2, x, y, zB);
            }
        }

        // Beira do telhado: 1x1 timber na borda inferior frontal e traseira
        for (let x = 1; x <= 12; x++) {
            builder.add("1x1", timber, 0, x, 9, 1);
            builder.add("1x1", timber, 0, x, 9, 12);
        }

        // ── Phase 8: Cumeeira (y=13) ──────────────────────────────────────────
        // Tile 2x2 (sx=2, sz=2) em lz=5 e lz=7, fechando gap z=5..8
        // x=1,3,5,7,9,11 (step 2) → cada Tile cobre x..x+1 e z..z+1
        // lx+sx=13 ≤14 ✓; lz+sz=9 ≤14 ✓
        for (let x = 1; x <= 11; x += 2) {
            builder.add("Tile 2x2", roofTile, 0, x, 13, 5);
            builder.add("Tile 2x2", roofTile, 0, x, 13, 7);
        }

        // Ornamento de cumeeira: 1x1 timber em y=14
        // ly+sy=15 ≤16 ✓
        for (let x = 2; x <= 12; x += 2) {
            builder.add("1x1", timber, 0, x, 14, 6);
        }

        // ── Phase 9: Chaminé (x=3, z=10) ─────────────────────────────────────
        // Stack da fundação (y=2) até y=13 (height=12)
        // 4 Pillar blocks (sy=3): y=2,5,8,11 → max ly+sy = 11+3=14 ≤16 ✓
        addPillarStackSafe(builder, 3, 2, 10, 12, chimneyGray);

        // Capelo em cruz (y=14): ly+sy=15 ≤16 ✓
        builder.add("1x1", chimneyGray, 0, 2, 14, 10);
        builder.add("1x1", chimneyGray, 0, 4, 14, 10);
        builder.add("1x1", chimneyGray, 0, 3, 14, 9);
        builder.add("1x1", chimneyGray, 0, 3, 14, 11);

        // ── Phase 10: Detalhes externos ───────────────────────────────────────
        // Flores amarelas (gramado frontal esquerdo e direito)
        builder.add("1x1", flowerYel, 0, 1, 1, 3);
        builder.add("1x1", flowerYel, 0, 1, 1, 5);
        builder.add("1x1", flowerYel, 0, 10, 1, 1);
        builder.add("1x1", flowerYel, 0, 12, 1, 1);

        // Flores azuis
        builder.add("1x1", flowerBlu, 0, 2, 1, 1);
        builder.add("1x1", flowerBlu, 0, 11, 1, 2);

        // Pedra decorativa lateral traseira
        builder.add("2x2", stoneDark, 0, 11, 1, 12);

        return builder.blocks;
    })(),
};

export default TavernaMedieval;
