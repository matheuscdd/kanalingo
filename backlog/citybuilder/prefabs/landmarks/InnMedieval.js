import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

// InnMedieval — Estalagem medieval de 3 andares em jetty Tudor.
//
// Composição visual (referência: LEGO medieval 3-story jettied inn):
//   Térreo   : pedra cinza escura, 5 camadas de altura tipo castelo/fortaleza,
//              porta arqueada com pilastras de madeira, degrau, 2 janelas frontais.
//   1º Andar : 1º jetty (overhang 1u), half-timber (postes+viga+plaster),
//              3 bay windows projetando à frente (lz=0), janela lateral direita.
//   2º Andar : 2º jetty (overhang total, full bounding box), half-timber com
//              4 janelas flush na face frontal (lz=0), janela lateral direita.
//   Telhado  : telha terracota em duas águas (5 steps Roof 1x2), fascia timber
//              em y=14, cumeeira Tile 2x2 terracota em y=20, ornamentos em y=21.
//   Gable    : empenas laterais (5 steps), roseta circular em madeira em x=0.
//   Chaminé  : addPillarStackSafe partindo de y=2, capelo em cruz em y=20.
//
// Eixos: X esquerda=0 direita=13 | Y solo=0 | Z frente=0 fundo=11
// Bounding box: dx=14, dy=22, dz=12

const InnMedieval = {
    dx: 14,
    dy: 22,
    dz: 12,
    blocks: (function () {
        const builder = createPrefabBuilder();

        // ── Paleta ────────────────────────────────────────────────────────────
        const grass     = "#4a7c40"; // gramado verde
        const stone     = "#5c5c5c"; // pedra escura (térreo tipo castelo)
        const stoneDark = "#3c3c3c"; // pedra muito escura (degrau, caminho)
        const timber    = "#3d2010"; // madeira escura (half-timber, porta)
        const plaster   = "#ddd8cc"; // reboco creme (enchimento entre postes)
        const roofTile  = "#c46b2a"; // telha terracota laranja
        const glass     = "#c8a820"; // vidro âmbar medieval
        const chimney   = "#6a6a6a"; // chaminé
        const flowerRed = "#cc2222"; // flores vermelhas
        const flowerYel = "#d4c020"; // flores amarelas

        // ── Phase 1: Gramado, fundação, caminho ───────────────────────────────
        addFilledRectSafe(builder, 0, 0, 0, 14, 12, grass);        // x=0..13, z=0..11
        addFilledRectSafe(builder, 2, 1, 2, 10,  8, stone);        // x=2..11, z=2..9
        addFilledRectSafe(builder, 5, 1, 0,  4,  2, stoneDark);    // caminho z=0..1, x=5..8

        // ── Phase 2: Paredes do térreo (y=2..6) ──────────────────────────────
        // 5 camadas de pedra escura dão aspecto de base sólida tipo castelo.
        // Janelas (rot=0, sy=2, sz=2) colocadas ANTES do loop:
        //   janela esq lx=3, ly=4: x=3, y=4..5, z=2..3; lx+dx=4≤14 ✓
        //   janela dir lx=8, ly=4: x=8, y=4..5, z=2..3; lx+dx=9≤14 ✓
        builder.add("Window", glass, 0, 3, 4, 2);
        builder.add("Window", glass, 0, 8, 4, 2);

        for (let y = 2; y <= 6; y++) {
            // Fachada frontal (z=2): x=2..11
            //   porta x=5,6 skip em y≤4; posts x=4,7 → timber
            for (let x = 2; x <= 11; x++) {
                if ((x === 5 || x === 6) && y <= 4) continue; // porta
                const col = (x === 4 || x === 7) ? timber : stone;
                builder.add("1x1", col, 0, x, y, 2);
            }
            // Fachada traseira (z=9): x=2..11 stone sólido
            for (let x = 2; x <= 11; x++) {
                builder.add("1x1", stone, 0, x, y, 9);
            }
            // Lateral esq (x=2): z=3..8 stone sólido
            for (let z = 3; z <= 8; z++) {
                builder.add("1x1", stone, 0, 2, y, z);
            }
            // Lateral dir (x=11): z=3..8 stone sólido
            for (let z = 3; z <= 8; z++) {
                builder.add("1x1", stone, 0, 11, y, z);
            }
        }

        // Porta: infill timber (y=2..4, x=5..6, z=2)
        for (let y = 2; y <= 4; y++) {
            builder.add("1x1", timber, 0, 5, y, 2);
            builder.add("1x1", timber, 0, 6, y, 2);
        }

        // Degrau frontal: 2x2 stoneDark (lz=1 → z=1..2; ly=2 → y=2)
        builder.add("2x2", stoneDark, 0, 5, 2, 1);
        builder.add("2x2", stoneDark, 0, 7, 2, 1);

        // Lanterna na parede (decoração)
        builder.add("1x1", "#1a1a10", 0, 10, 4, 2);

        // ── Phase 3: 1º Jetty (y=7) + suportes bay window ───────────────────
        // Laje de madeira cobrindo x=1..12, z=1..10 (overhang 1u vs térreo x=2..11 z=2..9)
        addFilledRectSafe(builder, 1, 7, 1, 12, 10, timber);

        // Suportes do bay window em z=0 (conectam à laje z=1 via 26-viz ✓)
        builder.add("1x1", timber, 0, 3, 7, 0);
        builder.add("1x1", timber, 0, 6, 7, 0);
        builder.add("1x1", timber, 0, 9, 7, 0);

        // ── Phase 4: 1º Andar (y=8..10) — half-timber + bay windows ─────────
        // 3 bay windows (rot=0) projetando para lz=0 (y=8..9, z=0..1)
        //   lx=3: x=3, lx+dx=4≤14 ✓; lz+sz=2≤12 ✓; ly+sy=10≤22 ✓
        builder.add("Window", glass, 0, 3, 8, 0);
        builder.add("Window", glass, 0, 6, 8, 0);
        builder.add("Window", glass, 0, 9, 8, 0);

        // Janela lateral dir (rot=1): dx=2 → x=11..12≤14 ✓; dz=1 → z=5≤12 ✓
        builder.add("Window", glass, 1, 11, 8, 5);

        for (let y = 8; y <= 10; y++) {
            // Fachada frontal (z=1): x=1..12
            //   skip células dos bay windows (x=3,6,9 em y=8..9 → occupied at z=1 via sz=2)
            //   posts: x=1,4,7,10,12; viga: y===9; enchimento: plaster
            for (let x = 1; x <= 12; x++) {
                if ((x === 3 || x === 6 || x === 9) && y <= 9) continue;
                const isPost = (x === 1 || x === 4 || x === 7 || x === 10 || x === 12);
                const col = (isPost || y === 9) ? timber : plaster;
                builder.add("1x1", col, 0, x, y, 1);
            }
            // Fachada traseira (z=10): x=1..12
            for (let x = 1; x <= 12; x++) {
                const isPost = (x === 1 || x === 4 || x === 7 || x === 10 || x === 12);
                const col = (isPost || y === 9) ? timber : plaster;
                builder.add("1x1", col, 0, x, y, 10);
            }
            // Lateral esq (x=1): z=1..10
            for (let z = 1; z <= 10; z++) {
                const isPost = (z === 1 || z === 6 || z === 10);
                const col = (isPost || y === 9) ? timber : plaster;
                builder.add("1x1", col, 0, 1, y, z);
            }
            // Lateral dir (x=12): z=1..10; skip z=5 em y≤9 (janela rot=1)
            for (let z = 1; z <= 10; z++) {
                if (z === 5 && y <= 9) continue;
                const isPost = (z === 1 || z === 6 || z === 10);
                const col = (isPost || y === 9) ? timber : plaster;
                builder.add("1x1", col, 0, 12, y, z);
            }
        }

        // Vergas de madeira acima dos bay windows (y=10, z=0)
        // Conectam à bay window abaixo (y=8..9, z=0..1) e à laje em z=1
        for (let x = 3; x <= 11; x++) {
            builder.add("1x1", timber, 0, x, 10, 0);
        }

        // ── Phase 5: 2º Jetty (y=11) — full bounding box ─────────────────────
        // Avança para dx=14, dz=12 completo (overhang total)
        addFilledRectSafe(builder, 0, 11, 0, 14, 12, timber);

        // ── Phase 6: 2º Andar (y=12..14) — half-timber + 4 janelas ──────────
        // 4 janelas (rot=0) flush na face z=0 (y=12..13, z=0..1)
        //   lx+dx: 3,6,9,12 ≤ 14 ✓; lz+sz=2≤12 ✓; ly+sy=14≤22 ✓
        builder.add("Window", glass, 0,  2, 12, 0);
        builder.add("Window", glass, 0,  5, 12, 0);
        builder.add("Window", glass, 0,  8, 12, 0);
        builder.add("Window", glass, 0, 11, 12, 0);

        // Janela lateral dir (rot=1): lx=12, dx=2 → x=12..13≤14 ✓; dz=1 → z=5≤12 ✓
        builder.add("Window", glass, 1, 12, 12, 5);

        // Fascia beira (y=14, z=0 e z=11) colocada ANTES do loop do 2º andar.
        // Isso garante que a fileira superior da face frontal/traseira seja toda timber,
        // independente dos posts/plaster do loop.
        for (let x = 0; x <= 13; x++) {
            builder.add("1x1", timber, 0, x, 14,  0);
            builder.add("1x1", timber, 0, x, 14, 11);
        }

        for (let y = 12; y <= 14; y++) {
            // Fachada frontal (z=0): x=0..13
            //   posts: x=0,4,7,10,13; viga: y===13; enchimento: plaster
            //   skip janelas (x=2,5,8,11 em y≤13 → occupied at z=0 via sz=2)
            for (let x = 0; x <= 13; x++) {
                if ((x === 2 || x === 5 || x === 8 || x === 11) && y <= 13) continue;
                const isPost = (x === 0 || x === 4 || x === 7 || x === 10 || x === 13);
                const col = (isPost || y === 13) ? timber : plaster;
                builder.add("1x1", col, 0, x, y, 0);
            }
            // Fachada traseira (z=11): x=0..13
            for (let x = 0; x <= 13; x++) {
                const isPost = (x === 0 || x === 4 || x === 7 || x === 10 || x === 13);
                const col = (isPost || y === 13) ? timber : plaster;
                builder.add("1x1", col, 0, x, y, 11);
            }
            // Lateral esq (x=0): z=0..11
            for (let z = 0; z <= 11; z++) {
                const isPost = (z === 0 || z === 4 || z === 8 || z === 11);
                const col = (isPost || y === 13) ? timber : plaster;
                builder.add("1x1", col, 0, 0, y, z);
            }
            // Lateral dir (x=13): z=0..11; skip z=5 em y≤13 (janela rot=1)
            for (let z = 0; z <= 11; z++) {
                if (z === 5 && y <= 13) continue;
                const isPost = (z === 0 || z === 4 || z === 8 || z === 11);
                const col = (isPost || y === 13) ? timber : plaster;
                builder.add("1x1", col, 0, 13, y, z);
            }
        }

        // ── Phase 7: Roseta na empena frontal (x=0) — colocar ANTES das empenas ──
        // Colocada antes para que o loop das empenas não substitua os blocos timber
        // por plaster nas posições do anel. O interior da roseta fica como plaster
        // (colocado pelo loop das empenas), resultando num efeito de janela circular.
        const rosetteRing = [
            { y: 16, z: 4 }, { y: 16, z: 5 }, { y: 16, z: 6 }, { y: 16, z: 7 }, // topo
            { y: 17, z: 3 },                                     { y: 17, z: 8 }, // lados
            { y: 18, z: 4 }, { y: 18, z: 5 }, { y: 18, z: 6 }, { y: 18, z: 7 }, // base
        ];
        for (const { y, z } of rosetteRing) {
            builder.add("1x1", timber, 0, 0, y, z);
        }

        // ── Phase 8: Empenas laterais (y=15..19, x=0 e x=13) ────────────────
        // 5 steps triangulares: borda → timber; interior → plaster.
        const gableSteps = [
            { y: 15, zStart:  0, zEnd: 11 },
            { y: 16, zStart:  1, zEnd: 10 },
            { y: 17, zStart:  2, zEnd:  9 },
            { y: 18, zStart:  3, zEnd:  8 },
            { y: 19, zStart:  4, zEnd:  7 },
        ];
        for (const { y, zStart, zEnd } of gableSteps) {
            for (let z = zStart; z <= zEnd; z++) {
                const isEdge = (z === zStart || z === zEnd);
                const col = isEdge ? timber : plaster;
                builder.add("1x1", col, 0,  0, y, z);
                builder.add("1x1", col, 0, 13, y, z);
            }
        }

        // ── Phase 9: Telhado em duas águas (y=15..19, 5 steps) ───────────────
        // Roof 1x2 (sx=1, sy=1, sz=2): rot=0 slopes +z; rot=2 slopes -z.
        //   step 0: y=15, front lz=0→z=0..1, back lz=10→z=10..11 ✓ (lz+sz=12=dz)
        //   step 4: y=19, front lz=4→z=4..5, back lz=6→z=6..7 — sides meet at z=5..6
        //   gap z=5..6: fechado pela cumeeira em y=20
        for (let step = 0; step < 5; step++) {
            const y  = 15 + step;
            const zF = step;
            const zB = 10 - step;
            for (let x = 1; x <= 12; x++) {
                builder.add("Roof 1x2", roofTile, 0, x, y, zF); // rot=0: slopes +z
                builder.add("Roof 1x2", roofTile, 2, x, y, zB); // rot=2: slopes -z
            }
        }

        // ── Phase 10: Cumeeira (y=20) ─────────────────────────────────────────
        // Tile 2x2 (sx=2, sz=2) em lz=5 → z=5..6, fechando o cume do telhado.
        // x=0..12 step 2: lx+sx≤14 ✓; lz+sz=7≤12 ✓; ly+sy=21≤22 ✓
        for (let x = 0; x <= 12; x += 2) {
            builder.add("Tile 2x2", roofTile, 0, x, 20, 5);
        }

        // ── Phase 11: Ornamentos na cumeeira (y=21) ───────────────────────────
        // 1x1 timber alinhados com o cume; ly+sy=22=dy ✓
        for (let x = 1; x <= 13; x += 2) {
            builder.add("1x1", timber, 0, x, 21, 5);
        }

        // ── Phase 12: Chaminé (x=3, z=7) ─────────────────────────────────────
        // addPillarStackSafe passo=3 (Pillar sy=3). Pillar a y=5 e y=11 falham
        // silenciosamente (laje ocupa esses níveis), mas a conectividade via
        // 26-vizinhança é mantida através das estruturas do edifício.
        // height=18: Pillars tentados em y=2,5,8,11,14,17 → max ly+sy=20≤22 ✓
        addPillarStackSafe(builder, 3, 2, 7, 18, chimney);

        // Capelo em y=20: barra horizontal + braço traseiro (z=8)
        // Todos em z=7..8 → evitam cumeeira em z=5..6 ✓; ly+sy=21≤22 ✓
        builder.add("1x1", chimney, 0, 2, 20, 7);
        builder.add("1x1", chimney, 0, 3, 20, 7);
        builder.add("1x1", chimney, 0, 4, 20, 7);
        builder.add("1x1", chimney, 0, 3, 20, 8);

        // ── Phase 13: Detalhes do jardim ──────────────────────────────────────
        builder.add("1x1", flowerRed, 0, 1, 1, 3);
        builder.add("1x1", flowerRed, 0, 2, 1, 4);
        builder.add("1x1", flowerRed, 0, 3, 1, 3);
        builder.add("1x1", flowerYel, 0, 9, 1, 1);
        builder.add("1x1", flowerYel, 0, 11, 1, 1);
        builder.add("1x1", flowerYel, 0, 1, 1, 1);

        return builder.blocks;
    })(),
};

export default InnMedieval;
