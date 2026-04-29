import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

// ManorMedieval — Mansão medieval de dois andares estilo inglês.
//
// Composição visual:
//   Térreo   : pedra cinza sólida (4u), porta arqueada central com pilastras de
//              madeira, degrau, 2 janelas frontais e janela lateral.
//   1º andar : overhang 1u (jetty), half-timber (postes + viga em madeira escura
//              sobre reboco creme/bege), arcos decorativos curvos em cada painel,
//              dentilhado de Tile 2x2 plaster na cornija, janelas envidraçadas.
//   Telhado  : telha tan/areia em duas águas (6 passos Roof 1x2), fascia de
//              madeira nas beiras, cumeeira com Tile 2x2, roseta na empena.
//   Exterior : chaminé com capelo em cruz, cerca de madeira na lateral direita,
//              vegetação alta no lado esquerdo, rosas vermelhas e caminho de pedra.
//
// Eixos: X esquerda=0 direita=21 | Y solo=0 | Z frente=0 fundo=19
// Bounding box: dx=22, dy=19, dz=20

const ManorMedieval = {
    dx: 22,
    dy: 19,
    dz: 20,
    blocks: (function () {
        const builder = createPrefabBuilder();

        // ── Paleta ────────────────────────────────────────────────────────────
        const grass     = "#4a7c40"; // gramado
        const stone     = "#8a8a8a"; // pedra cinza (térreo)
        const stoneDark = "#5e5e5e"; // pedra escura (degraus, caminho)
        const timber    = "#4a2010"; // madeira marrom escura
        const plaster   = "#e8e0c8"; // reboco creme/bege claro
        const roofTan   = "#c8b87a"; // telha tan/areia
        const glass     = "#c8b840"; // vidro amarelado medieval
        const chimney   = "#707070"; // chaminé
        const fenceWood = "#6b3a1f"; // cerca de madeira
        const flowerRed = "#cc2222"; // rosa vermelha
        const veg       = "#2a5a20"; // vegetação escura

        // ── Phase 1: Gramado e terreno (y=0..1) ──────────────────────────────
        addFilledRectSafe(builder, 0, 0, 0, 22, 20, grass);

        // Fundação de pedra sob toda a casa
        addFilledRectSafe(builder, 2, 1, 2, 18, 16, stone);

        // Caminho de pedra escura até a porta
        addFilledRectSafe(builder, 8, 1, 0, 6, 2, stoneDark);

        // ── Phase 2: Paredes do térreo (y=2..5) ──────────────────────────────
        // Fachada frontal z=2:
        //   - porta: x=10,11 skip em y=2..4
        //   - pilastras: x=9,12 → timber
        //   - janelas frontais: x=5 e x=15 em y=3 (Window rot=0, sz=2 → ocupa z=2..3)
        // Lateral direita x=19:
        //   - janela: z=8 em y=3 (Window rot=1, dx=2 → ocupa x=18..19)

        // Janelas colocadas ANTES das paredes para reservar células via occupied set
        builder.add("Window", glass, 0, 5,  3, 2); // frontal esq: lx+dx=6≤22✓ lz+sz=4≤20✓
        builder.add("Window", glass, 0, 15, 3, 2); // frontal dir: lx+dx=16≤22✓
        builder.add("Window", glass, 1, 18, 3, 8); // lateral dir: dx=2→lx+dx=20≤22✓

        for (let y = 2; y <= 5; y++) {
            // Fachada frontal (z=2)
            for (let x = 2; x <= 19; x++) {
                if ((x === 10 || x === 11) && y <= 4) continue; // porta
                const col = (x === 9 || x === 12) ? timber : stone;
                builder.add("1x1", col, 0, x, y, 2);
            }
            // Fachada traseira (z=17)
            for (let x = 2; x <= 19; x++) {
                builder.add("1x1", stone, 0, x, y, 17);
            }
            // Lateral esquerda (x=2)
            for (let z = 3; z <= 16; z++) {
                builder.add("1x1", stone, 0, 2, y, z);
            }
            // Lateral direita (x=19)
            for (let z = 3; z <= 16; z++) {
                builder.add("1x1", stone, 0, 19, y, z);
            }
        }

        // Porta: preencher abertura y=2..4 com madeira escura
        for (let y = 2; y <= 4; y++) {
            builder.add("1x1", timber, 0, 10, y, 2);
            builder.add("1x1", timber, 0, 11, y, 2);
        }

        // Degrau frontal
        addFilledRectSafe(builder, 9, 2, 1, 4, 2, stoneDark);

        // Lanterna (y=4, esquerda da porta)
        builder.add("1x1", "#1a1a10", 0, 8, 4, 2);

        // ── Phase 3: Laje de transição + overhang (y=6) ──────────────────────
        // Cobertura x=1..20, z=1..18 → overhang 1u vs térreo x=2..19, z=2..17
        addFilledRectSafe(builder, 1, 6, 1, 20, 18, timber);

        // ── Phase 4: 1º andar — half-timber com arcos decorativos (y=7..10) ──
        //
        // Postes verticais timber (fachadas frontal/traseira): x=1,6,11,16,20
        // Postes verticais timber (laterais): z=1,6,12,18
        // Viga horizontal timber: y=9 em todas as faces
        // Arcos decorativos (timber) por painel:
        //   - Cada painel tem 2 blocos timber em y=7 nas bordas internas (simulação de arco)
        //   - y=8: plaster (interior do arco)
        //   - y=9: viga timber contínua
        // Janelas do 1º andar (rot=0): x=6,12 y=8 z=1
        // Janela lateral dir (rot=1): x=18 y=8 z=9

        // Janelas antes das paredes para reservar células
        builder.add("Window", glass, 0, 6,  8, 1); // frontal esq: lx+dx=7≤22✓ lz+sz=3≤20✓
        builder.add("Window", glass, 0, 12, 8, 1); // frontal dir: lx+dx=13≤22✓
        builder.add("Window", glass, 1, 18, 8, 9); // lateral: dx=2→lx+dx=20≤22✓ lz+dz=10≤20✓

        for (let y = 7; y <= 10; y++) {
            // Fachada frontal (z=1)
            for (let x = 1; x <= 20; x++) {
                const isPost = (x === 1 || x === 6 || x === 11 || x === 16 || x === 20);
                const isBeam = (y === 9);
                // Arco decorativo: bordas internas dos painéis em y=7
                // Painéis: [1..6], [6..11], [11..16], [16..20]
                // Borda interna de cada painel = x=2,5 | x=7,10 | x=12,15 | x=17,19
                const isArcEdge = (y === 7) && (
                    x === 2 || x === 5 ||
                    x === 7 || x === 10 ||
                    x === 12 || x === 15 ||
                    x === 17 || x === 19
                );
                const col = (isPost || isBeam || isArcEdge) ? timber : plaster;
                builder.add("1x1", col, 0, x, y, 1);
            }
            // Fachada traseira (z=18)
            for (let x = 1; x <= 20; x++) {
                const isPost = (x === 1 || x === 6 || x === 11 || x === 16 || x === 20);
                const isArcEdge = (y === 7) && (x === 2 || x === 5 || x === 7 || x === 10 || x === 12 || x === 15 || x === 17 || x === 19);
                const col = (isPost || y === 9 || isArcEdge) ? timber : plaster;
                builder.add("1x1", col, 0, x, y, 18);
            }
            // Lateral esquerda (x=1)
            for (let z = 1; z <= 18; z++) {
                const isPost = (z === 1 || z === 6 || z === 12 || z === 18);
                const isArcEdge = (y === 7) && (z === 2 || z === 5 || z === 7 || z === 11 || z === 13 || z === 17);
                const col = (isPost || y === 9 || isArcEdge) ? timber : plaster;
                builder.add("1x1", col, 0, 1, y, z);
            }
            // Lateral direita (x=20)
            for (let z = 1; z <= 18; z++) {
                if (z === 9 && y <= 9) continue; // janela lateral
                const isPost = (z === 1 || z === 6 || z === 12 || z === 18);
                const isArcEdge = (y === 7) && (z === 2 || z === 5 || z === 7 || z === 11 || z === 13 || z === 17);
                const col = (isPost || y === 9 || isArcEdge) ? timber : plaster;
                builder.add("1x1", col, 0, 20, y, z);
            }
        }

        // ── Phase 5: Dentilhado na cornija (y=11) ────────────────────────────
        // Tile 2x2 plaster simulando triângulos decorativos na linha da cornija.
        // Frontal (z=1): Tile sx=2 sz=2 → ocupa z=1..2; lz+sz=3≤20✓
        // Traseira (z=17): lz+sz=19≤20✓
        for (let x = 1; x <= 19; x += 2) {
            builder.add("Tile 2x2", plaster, 0, x, 11, 1);  // frontal
            builder.add("Tile 2x2", plaster, 0, x, 11, 17); // traseira
        }

        // ── Phase 6: Empenas laterais (y=12..16) ─────────────────────────────
        // Triângulos fechando as extremidades do telhado (x=1 e x=20).
        // Borda: timber; interior: plaster.
        // Roseta circular na empena (ornamento):
        //   - Centralizada em z=9..10, y=13..15
        const gableSteps = [
            { y: 12, zStart: 1,  zEnd: 18 },
            { y: 13, zStart: 3,  zEnd: 16 },
            { y: 14, zStart: 5,  zEnd: 14 },
            { y: 15, zStart: 7,  zEnd: 12 },
            { y: 16, zStart: 9,  zEnd: 10 },
        ];
        for (const { y, zStart, zEnd } of gableSteps) {
            for (let z = zStart; z <= zEnd; z++) {
                const isEdge = (z === zStart || z === zEnd);
                const col = isEdge ? timber : plaster;
                builder.add("1x1", col, 0, 1,  y, z);
                builder.add("1x1", col, 0, 20, y, z);
            }
        }

        // Roseta circular na empena frontal (x=1, y=13..15, z=8..11)
        // Anel externo circular aproximado com timber, interior plaster
        const rosetteCenter = { z: 9, y: 14 };
        const rosetteRing = [
            { y: 13, z: 8 }, { y: 13, z: 9 }, { y: 13, z: 10 }, { y: 13, z: 11 },
            { y: 14, z: 7 },                                       { y: 14, z: 12 },
            { y: 15, z: 8 }, { y: 15, z: 9 }, { y: 15, z: 10 }, { y: 15, z: 11 },
        ];
        for (const { y, z } of rosetteRing) {
            builder.add("1x1", timber, 0, 1, y, z);
        }

        // ── Phase 7: Telhado em duas águas (y=12..17) ────────────────────────
        // 6 passos de Roof 1x2 (sx=1, sy=1, sz=2):
        //   rot=0: inclina para +z (água frontal), lz=1+step
        //   rot=2: inclina para -z (água traseira), lz=17-step
        // Cobertura:
        //   step 0 y=12: frente z=1..2,  trás z=17..18
        //   step 1 y=13: frente z=2..3,  trás z=16..17
        //   step 2 y=14: frente z=3..4,  trás z=15..16
        //   step 3 y=15: frente z=4..5,  trás z=14..15
        //   step 4 y=16: frente z=5..6,  trás z=13..14
        //   step 5 y=17: frente z=6..7,  trás z=12..13
        // Gap restante: z=7..12 → fechado pela cumeeira y=17 (Tile 2x2)
        for (let step = 0; step < 6; step++) {
            const y  = 12 + step;
            const zF = 1 + step;
            const zB = 17 - step;
            for (let x = 2; x <= 19; x++) {
                builder.add("Roof 1x2", roofTan, 0, x, y, zF);
                builder.add("Roof 1x2", roofTan, 2, x, y, zB);
            }
        }

        // Fascia board de madeira (beira do telhado)
        for (let x = 1; x <= 20; x++) {
            builder.add("1x1", timber, 0, x, 12, 1);
            builder.add("1x1", timber, 0, x, 12, 18);
        }

        // ── Phase 8: Cumeeira (y=17) ──────────────────────────────────────────
        // Tile 2x2 em lz=7, lz=9, lz=11 fechando gap z=7..12 (6 células)
        // lx+sx: máx = 19+2=21≤22✓; lz+sz: máx = 11+2=13≤20✓
        for (let x = 1; x <= 19; x += 2) {
            builder.add("Tile 2x2", roofTan, 0, x, 17, 7);
            builder.add("Tile 2x2", roofTan, 0, x, 17, 9);
            builder.add("Tile 2x2", roofTan, 0, x, 17, 11);
        }

        // Ornamento de cumeeira: 1x1 timber em y=18
        // ly+sy=19=dy → 19≤19✓
        for (let x = 2; x <= 20; x += 2) {
            builder.add("1x1", timber, 0, x, 18, 9);
        }

        // ── Phase 9: Chaminé (x=4, z=14) ─────────────────────────────────────
        // height=15: 5 Pillar blocks (y=2,5,8,11,14 → max ly+sy=14+3=17≤19✓)
        addPillarStackSafe(builder, 4, 2, 14, 15, chimney);

        // Capelo em cruz (y=17): ly+sy=18≤19✓
        builder.add("1x1", chimney, 0, 3, 17, 14);
        builder.add("1x1", chimney, 0, 5, 17, 14);
        builder.add("1x1", chimney, 0, 4, 17, 13);
        builder.add("1x1", chimney, 0, 4, 17, 15);

        // ── Phase 10: Cerca de madeira (lateral direita, x=21) ───────────────
        // Postes verticais em x=20, z=3..17 (step 2), altura 2
        for (let z = 3; z <= 17; z += 3) {
            addPillarStackSafe(builder, 20, 1, z, 2, fenceWood);
        }
        // Réguas horizontais da cerca em y=2, conectando postes
        for (let z = 3; z <= 17; z++) {
            builder.add("1x1", fenceWood, 0, 20, 2, z);
        }

        // ── Phase 11: Vegetação (lateral esquerda, x=0..1) ───────────────────
        // Pillar stacks curtos de cor verde escura simulando arbustos altos
        const vegPositions = [3, 5, 7, 9, 11, 13, 15];
        for (const z of vegPositions) {
            addPillarStackSafe(builder, 0, 1, z, 2, veg);
        }
        // Arbustos mais baixos em x=1
        for (const z of [4, 8, 12]) {
            builder.add("1x1", veg, 0, 1, 1, z);
            builder.add("1x1", veg, 0, 1, 2, z);
        }

        // ── Phase 12: Detalhes do jardim ─────────────────────────────────────
        // Rosas vermelhas (frente, lado esquerdo)
        const rosePos = [
            { x: 2, z: 2 }, { x: 4, z: 2 }, { x: 6, z: 2 },
            { x: 3, z: 3 }, { x: 5, z: 4 }, { x: 2, z: 5 },
        ];
        for (const { x, z } of rosePos) {
            builder.add("1x1", flowerRed, 0, x, 1, z);
        }

        // Rosas do lado direito da porta
        builder.add("1x1", flowerRed, 0, 14, 1, 2);
        builder.add("1x1", flowerRed, 0, 16, 1, 2);

        return builder.blocks;
    })(),
};

export default ManorMedieval;
