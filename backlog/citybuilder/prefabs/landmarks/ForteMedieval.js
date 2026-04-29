import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

// ForteMedieval — Forte/bailía medieval com muralhas de pedra em três lados,
// portão arqueado na muralha esquerda, torre de vigia no canto direito-fundo
// com bandeiras, casa de meia-tirante (half-timber) dentro do pátio e detalhes
// decorativos no piso.
//
// Composição visual (referência: imagem de forte medieval LEGO):
//   - Muralhas de pedra cinza (3 lados: esquerda, fundo, direita) 8u de altura
//   - Portão arqueado na muralha esquerda com lintel e postes
//   - Ameias alternadas no topo das muralhas
//   - Torre de vigia quadrada (8×8) no canto direito-fundo, 16u alta com seteiras
//   - Ameias duplas na torre, mastro central com bandeiras vermelha e amarela
//   - Casa estilo meia-tirante (half-timber) dentro do pátio (térreo pedra, andar madeira)
//     com telhado duas-águas terracota e chaminé lateral
//   - Pátio calçado com detalhes: barris, pedras decorativas, trepadeiras
//
// Eixos: X esquerda=0 direita=33 | Y solo=0 topo=21 | Z frente=0 fundo=29
// Bounding box: dx=34, dy=22, dz=30

const ForteMedieval = {
    dx: 34,
    dy: 22,
    dz: 30,
    blocks: (function () {
        const builder = createPrefabBuilder();

        // ── Paleta ────────────────────────────────────────────────────────────
        const grass       = "#4a7c40"; // gramado
        const stone       = "#9a9a9a"; // pedra cinza clara — muralhas
        const stoneDark   = "#6a6a6a"; // pedra escura — variação de textura
        const stoneAccent = "#a08050"; // pedra areia — detalhe decorativo
        const floorStone  = "#8a7850"; // piso pátio — pedra areia escura
        const timber      = "#3d2010"; // madeira escura (casa, molduras)
        const plaster     = "#ddd8cc"; // reboco/estuque (casa, infill)
        const roofTile    = "#b85a20"; // telha terracota
        const roofRidge   = "#5a3010"; // cumeeira escura
        const glass       = "#9ac1d5"; // vidro janelas
        const door        = "#5a3218"; // porta madeira
        const flagRed     = "#cc2020"; // bandeira vermelha
        const flagYellow  = "#d4a010"; // bandeira amarela
        const barrel      = "#6b4020"; // barril madeira
        const barrelHoop  = "#8a8a6a"; // aro metal barril
        const vine        = "#2d5c18"; // trepadeira/vegetação

        // ══════════════════════════════════════════════════════════════════════
        // Phase 1: Gramado base (y=0)
        // ══════════════════════════════════════════════════════════════════════
        addFilledRectSafe(builder, 0, 0, 0, 34, 30, grass);

        // ══════════════════════════════════════════════════════════════════════
        // Phase 2: Piso do pátio (y=1) — x=4..25, z=4..27
        // ══════════════════════════════════════════════════════════════════════
        addFilledRectSafe(builder, 4, 1, 4, 22, 24, floorStone);

        // Caminho de entrada (stepping stones fora do portão)
        builder.add("1x1", stoneDark, 0, 1, 1, 8);
        builder.add("1x1", stoneDark, 0, 1, 1, 9);
        builder.add("1x1", stoneDark, 0, 1, 1, 10);
        builder.add("1x1", stoneDark, 0, 0, 1, 9);

        // ══════════════════════════════════════════════════════════════════════
        // Phase 3: Muralha esquerda (x=2..3, z=4..27, y=1..8)
        //          Portão: void em z=8..11, y=1..4
        // ══════════════════════════════════════════════════════════════════════
        for (let z = 4; z <= 27; z++) {
            for (let y = 1; y <= 8; y++) {
                // Void do portão
                if (z >= 8 && z <= 11 && y <= 4) continue;

                const tex = ((z + y * 3) % 7 === 0)
                    ? stoneDark
                    : ((z * 2 + y) % 11 === 0 ? stoneAccent : stone);

                builder.add("1x1", tex, 0, 2, y, z);
                builder.add("1x1", tex, 0, 3, y, z);
            }
        }

        // Postes do portão — pilares de pedra escura flanqueando o vão
        builder.add("1x1", stoneDark, 0, 2, 1, 7);
        builder.add("1x1", stoneDark, 0, 3, 1, 7);
        builder.add("1x1", stoneDark, 0, 2, 2, 7);
        builder.add("1x1", stoneDark, 0, 3, 2, 7);
        builder.add("1x1", stoneDark, 0, 2, 3, 7);
        builder.add("1x1", stoneDark, 0, 3, 3, 7);
        builder.add("1x1", stoneDark, 0, 2, 4, 7);
        builder.add("1x1", stoneDark, 0, 3, 4, 7);
        builder.add("1x1", stoneDark, 0, 2, 1, 12);
        builder.add("1x1", stoneDark, 0, 3, 1, 12);
        builder.add("1x1", stoneDark, 0, 2, 2, 12);
        builder.add("1x1", stoneDark, 0, 3, 2, 12);
        builder.add("1x1", stoneDark, 0, 2, 3, 12);
        builder.add("1x1", stoneDark, 0, 3, 3, 12);
        builder.add("1x1", stoneDark, 0, 2, 4, 12);
        builder.add("1x1", stoneDark, 0, 3, 4, 12);

        // Lintel do arco (y=5, z=8..11)
        for (let z = 8; z <= 11; z++) {
            builder.add("1x1", stoneDark, 0, 2, 5, z);
            builder.add("1x1", stoneDark, 0, 3, 5, z);
        }
        // Pedra chave do arco
        builder.add("1x1", stoneAccent, 0, 2, 5, 9);
        builder.add("1x1", stoneAccent, 0, 3, 5, 9);
        builder.add("1x1", stoneAccent, 0, 2, 5, 10);
        builder.add("1x1", stoneAccent, 0, 3, 5, 10);

        // Trepadeiras nas laterais externas do portão
        builder.add("1x1", vine, 0, 2, 1, 13);
        builder.add("1x1", vine, 0, 2, 2, 13);
        builder.add("1x1", vine, 0, 2, 3, 14);
        builder.add("1x1", vine, 0, 3, 2, 14);
        builder.add("1x1", vine, 0, 2, 1, 6);
        builder.add("1x1", vine, 0, 3, 3, 6);

        // ══════════════════════════════════════════════════════════════════════
        // Phase 4: Muralha do fundo (z=26..27, x=4..25, y=1..8)
        // ══════════════════════════════════════════════════════════════════════
        for (let x = 4; x <= 25; x++) {
            for (let y = 1; y <= 8; y++) {
                const tex = ((x + y * 2) % 7 === 0)
                    ? stoneDark
                    : ((x * 3 + y) % 11 === 0 ? stoneAccent : stone);

                builder.add("1x1", tex, 0, x, y, 26);
                builder.add("1x1", tex, 0, x, y, 27);
            }
        }

        // ══════════════════════════════════════════════════════════════════════
        // Phase 5: Muralha direita (x=26..27, z=4..21, y=1..8)
        // ══════════════════════════════════════════════════════════════════════
        for (let z = 4; z <= 21; z++) {
            for (let y = 1; y <= 8; y++) {
                const tex = ((z + y * 3) % 7 === 0)
                    ? stoneDark
                    : ((z * 2 + y) % 11 === 0 ? stoneAccent : stone);

                builder.add("1x1", tex, 0, 26, y, z);
                builder.add("1x1", tex, 0, 27, y, z);
            }
        }

        // ══════════════════════════════════════════════════════════════════════
        // Phase 6: Ameias das muralhas (y=9) — merlões alternados
        // ══════════════════════════════════════════════════════════════════════
        // Muralha esquerda (x=2..3)
        for (let z = 4; z <= 27; z++) {
            // Pulando a área do portão
            if (z >= 8 && z <= 11) continue;
            if (z % 2 === 0) {
                builder.add("1x1", stone, 0, 2, 9, z);
                builder.add("1x1", stone, 0, 3, 9, z);
            }
        }
        // Muralha fundo (z=26..27)
        for (let x = 4; x <= 25; x++) {
            if (x % 2 === 0) {
                builder.add("1x1", stone, 0, x, 9, 26);
                builder.add("1x1", stone, 0, x, 9, 27);
            }
        }
        // Muralha direita (x=26..27)
        for (let z = 4; z <= 21; z++) {
            if (z % 2 === 0) {
                builder.add("1x1", stone, 0, 26, 9, z);
                builder.add("1x1", stone, 0, 27, 9, z);
            }
        }

        // ══════════════════════════════════════════════════════════════════════
        // Phase 7: Torre de vigia (x=26..33, z=22..29, y=1..14)
        //          Paredes perimétricas 2u espessas; interior vazio: x=28..31, z=24..27
        // ══════════════════════════════════════════════════════════════════════
        for (let y = 1; y <= 14; y++) {
            for (let lx = 26; lx <= 33; lx++) {
                for (let lz = 22; lz <= 29; lz++) {
                    // Interior oco
                    if (lx >= 28 && lx <= 31 && lz >= 24 && lz <= 27) continue;

                    // Seteiras: dois vãos verticais nas faces frontal e direita
                    // Face frontal (lz=22): seteira em lx=30, y=6..7
                    if (lz === 22 && lx === 30 && (y === 6 || y === 7)) continue;
                    // Face direita (lx=33): seteira em lz=25, y=6..7
                    if (lx === 33 && lz === 25 && (y === 6 || y === 7)) continue;

                    const tex = ((lx + y + lz) % 6 === 0)
                        ? stoneDark
                        : ((lx + lz) % 9 === 0 ? stoneAccent : stone);

                    builder.add("1x1", tex, 0, lx, y, lz);
                }
            }
        }

        // Piso interior do térreo da torre (y=1)
        addFilledRectSafe(builder, 28, 1, 24, 4, 4, floorStone);

        // Piso do 1º andar da torre (y=8)
        addFilledRectSafe(builder, 28, 8, 24, 4, 4, stone);

        // Ameias da torre (y=15..16) — merlões duplos
        for (let lx = 26; lx <= 33; lx++) {
            for (let lz = 22; lz <= 29; lz++) {
                if (lx >= 28 && lx <= 31 && lz >= 24 && lz <= 27) continue; // interior
                if ((lx + lz) % 2 === 0) {
                    builder.add("1x1", stone, 0, lx, 15, lz);
                    builder.add("1x1", stone, 0, lx, 16, lz);
                }
            }
        }

        // Piso do walkway no topo das paredes (y=14, interior)
        addFilledRectSafe(builder, 28, 14, 24, 4, 4, stone);

        // Mastro central da torre — começa em y=15 para conectar com as ameias (y=14 walkway)
        builder.add("1x1", timber, 0, 30, 15, 25);
        builder.add("1x1", timber, 0, 30, 16, 25);
        builder.add("1x1", timber, 0, 30, 17, 25);
        builder.add("1x1", timber, 0, 30, 18, 25);
        builder.add("1x1", timber, 0, 30, 19, 25);
        builder.add("1x1", timber, 0, 30, 20, 25);

        // Bandeira vermelha
        builder.add("1x1", flagRed, 0, 31, 20, 25);
        builder.add("1x1", flagRed, 0, 31, 19, 25);
        builder.add("1x1", flagRed, 0, 32, 20, 25);

        // Bandeira amarela
        builder.add("1x1", flagYellow, 0, 31, 18, 25);
        builder.add("1x1", flagYellow, 0, 32, 19, 25);

        // ══════════════════════════════════════════════════════════════════════
        // Phase 8: Casa medieval no pátio (x=7..18, z=7..21)
        //          Padrão half-timber: térreo pedra y=2..6, andar madeira y=7..9
        //          Telhado duas-águas y=10..14, chaminé y=14..17
        // ══════════════════════════════════════════════════════════════════════

        // Fundação de pedra (y=2..3)
        addFilledRectSafe(builder, 7, 2, 7, 12, 15, stone);
        addFilledRectSafe(builder, 7, 3, 7, 12, 15, stone);

        // Degrau de entrada (frente, y=2, z=6)
        addFilledRectSafe(builder, 10, 2, 6, 4, 2, stoneDark);

        // ── Janelas do térreo (colocadas antes das paredes) ──────────────────
        builder.add("Window", glass, 0, 8,  4, 7);  // frente esquerda
        builder.add("Window", glass, 0, 15, 4, 7);  // frente direita
        builder.add("Window", glass, 0, 10, 4, 21); // fundo esquerda
        builder.add("Window", glass, 0, 14, 4, 21); // fundo direita
        builder.add("Window", glass, 1, 7,  4, 12); // lateral esquerda (rot=1)
        builder.add("Window", glass, 1, 17, 4, 14); // lateral direita (rot=1)

        // ── Paredes do térreo (y=4..6) ───────────────────────────────────────
        for (let y = 4; y <= 6; y++) {
            // Fachada frontal (z=7)
            for (let x = 7; x <= 18; x++) {
                // Porta central: void x=11..12, y=4..5
                if ((x === 11 || x === 12) && y <= 5) continue;
                // Janelas (Window sz=2 ocupa z=7..8, sx=1 ocupa x certo)
                if (x === 8  && (y === 4 || y === 5)) continue;
                if (x === 15 && (y === 4 || y === 5)) continue;
                const isPost = (x === 7 || x === 10 || x === 13 || x === 18);
                builder.add("1x1", isPost ? timber : stone, 0, x, y, 7);
            }
            // Fachada traseira (z=21)
            for (let x = 7; x <= 18; x++) {
                if (x === 10 && (y === 4 || y === 5)) continue; // janela esq
                if (x === 14 && (y === 4 || y === 5)) continue; // janela dir
                const isPost = (x === 7 || x === 10 || x === 14 || x === 18);
                builder.add("1x1", isPost ? timber : stone, 0, x, y, 21);
            }
            // Lateral esquerda (x=7)
            for (let z = 8; z <= 20; z++) {
                if (z === 12 && (y === 4 || y === 5)) continue; // janela
                const isPost = (z === 8 || z === 14 || z === 20);
                builder.add("1x1", isPost ? timber : stone, 0, 7, y, z);
            }
            // Lateral direita (x=18)
            for (let z = 8; z <= 20; z++) {
                if (z === 14 && (y === 4 || y === 5)) continue; // janela
                const isPost = (z === 8 || z === 14 || z === 20);
                builder.add("1x1", isPost ? timber : stone, 0, 18, y, z);
            }
        }

        // Porta (y=4..5, x=11..12, z=7)
        for (let y = 4; y <= 5; y++) {
            builder.add("1x1", door, 0, 11, y, 7);
            builder.add("1x1", door, 0, 12, y, 7);
        }
        // Verga da porta (y=6)
        builder.add("1x1", timber, 0, 11, 6, 7);
        builder.add("1x1", timber, 0, 12, 6, 7);

        // ── Laje de transição (jetty) y=7 — overhang 1u ──────────────────────
        addFilledRectSafe(builder, 6, 7, 6, 14, 17, timber);

        // ── Janelas do 1º andar (colocadas antes das paredes) ────────────────
        builder.add("Window", glass, 0, 9,  8, 6);  // frente esq andar
        builder.add("Window", glass, 0, 14, 8, 6);  // frente dir andar
        builder.add("Window", glass, 0, 10, 8, 22); // fundo andar
        builder.add("Window", glass, 1, 6,  8, 13); // lateral esq andar (rot=1)
        builder.add("Window", glass, 1, 19, 8, 11); // lateral dir andar (rot=1)

        // ── Paredes do 1º andar half-timber (y=8..10) ────────────────────────
        for (let y = 8; y <= 10; y++) {
            // Fachada frontal (z=6)
            for (let x = 6; x <= 19; x++) {
                if (x === 9  && (y === 8 || y === 9)) continue;  // window
                if (x === 14 && (y === 8 || y === 9)) continue;  // window
                const isPost = (x === 6 || x === 11 || x === 16 || x === 19);
                const isBeam = (y === 10);
                const isArc  = (y === 8) && (
                    x === 7 || x === 10 || x === 12 || x === 15 ||
                    x === 17 || x === 18
                );
                builder.add("1x1", (isPost || isBeam || isArc) ? timber : plaster, 0, x, y, 6);
            }
            // Fachada traseira (z=22)
            for (let x = 6; x <= 19; x++) {
                if (x === 10 && (y === 8 || y === 9)) continue;  // window
                const isPost = (x === 6 || x === 11 || x === 16 || x === 19);
                builder.add("1x1", (isPost || y === 10) ? timber : plaster, 0, x, y, 22);
            }
            // Lateral esquerda (x=6)
            for (let z = 7; z <= 21; z++) {
                if (z === 13 && (y === 8 || y === 9)) continue;  // window
                const isPost = (z === 7 || z === 13 || z === 21);
                builder.add("1x1", (isPost || y === 10) ? timber : plaster, 0, 6, y, z);
            }
            // Lateral direita (x=19)
            for (let z = 7; z <= 21; z++) {
                if (z === 11 && (y === 8 || y === 9)) continue;  // window
                const isPost = (z === 7 || z === 13 || z === 21);
                builder.add("1x1", (isPost || y === 10) ? timber : plaster, 0, 19, y, z);
            }
        }

        // ── Empenas laterais (gable ends) ────────────────────────────────────
        // Triângulos fechando o telhado nas laterais x=6 e x=19
        // O telhado tem pico em z=14 (centro de z=7..21) e desce 5 passos
        const gableSteps = [
            { y: 11, zStart: 7,  zEnd: 21 },
            { y: 12, zStart: 8,  zEnd: 20 },
            { y: 13, zStart: 9,  zEnd: 19 },
            { y: 14, zStart: 10, zEnd: 18 },
            { y: 15, zStart: 11, zEnd: 17 },
        ];
        for (const { y, zStart, zEnd } of gableSteps) {
            for (let z = zStart; z <= zEnd; z++) {
                const isEdge = (z === zStart || z === zEnd);
                const col = isEdge ? timber : plaster;
                builder.add("1x1", col, 0, 6,  y, z);
                builder.add("1x1", col, 0, 19, y, z);
            }
        }
        // Cumeeira empena
        builder.add("1x1", timber, 0, 6,  16, 14);
        builder.add("1x1", timber, 0, 19, 16, 14);

        // ── Telhado duas-águas (Roof 1x2) ─────────────────────────────────────
        // 5 passos: pico em z=14
        // Água frontal (rot=0, descendo em z decrescente a partir do pico)
        // Água traseira (rot=2, descendo em z crescente a partir do pico)
        for (let step = 0; step < 5; step++) {
            const y  = 11 + step;
            const zF = 7  + step;  // água frontal: z=7,8,9,10,11
            const zB = 21 - step;  // água traseira: z=21,20,19,18,17
            for (let x = 7; x <= 18; x++) {
                builder.add("Roof 1x2", roofTile, 0, x, y, zF);
                builder.add("Roof 1x2", roofTile, 2, x, y, zB);
            }
        }

        // Fascia board (beira do telhado)
        for (let x = 6; x <= 19; x++) {
            builder.add("1x1", timber, 0, x, 11, 7);
            builder.add("1x1", timber, 0, x, 11, 21);
        }

        // Cumeeira (y=16, z=12..16 — Tile 2x2 cobrindo z=12..17)
        for (let x = 7; x <= 17; x += 2) {
            builder.add("Tile 2x2", roofRidge, 0, x, 16, 12);
            builder.add("Tile 2x2", roofRidge, 0, x, 16, 14);
        }

        // Ornamentos de cumeeira
        for (let x = 8; x <= 18; x += 2) {
            builder.add("1x1", timber, 0, x, 17, 14);
        }

        // ── Chaminé (x=16, z=23) — fora da área da jetty (z=6..22) ──────────
        // A chaminé fica na parede dos fundos da casa, do lado de fora do jetty
        addPillarStackSafe(builder, 16, 2, 23, 15, stone);
        // Capelo em cruz (y=17)
        builder.add("1x1", stoneDark, 0, 15, 17, 23);
        builder.add("1x1", stoneDark, 0, 17, 17, 23);
        builder.add("1x1", stoneDark, 0, 16, 17, 22);
        builder.add("1x1", stoneDark, 0, 16, 17, 24);

        // ══════════════════════════════════════════════════════════════════════
        // Phase 9: Detalhes do pátio
        // ══════════════════════════════════════════════════════════════════════

        // Barris empilhados (canto direito do pátio)
        builder.add("1x1", barrel,     0, 22, 2, 10);
        builder.add("1x1", barrelHoop, 0, 22, 3, 10);
        builder.add("1x1", barrel,     0, 22, 4, 10);
        builder.add("1x1", barrel,     0, 23, 2, 10);
        builder.add("1x1", barrel,     0, 23, 3, 10);

        // Pedras decorativas espalhadas no pátio
        builder.add("1x1", stoneDark, 0, 20, 2, 17);
        builder.add("1x1", stoneDark, 0, 21, 2, 22);
        builder.add("1x1", stoneDark, 0, 5,  2, 22);
        builder.add("1x1", stoneDark, 0, 5,  2, 14);
        builder.add("1x1", stoneAccent, 0, 22, 2, 20);

        // Vegetação junto à muralha do fundo (interior)
        builder.add("1x1", vine, 0, 8,  2, 25);
        builder.add("1x1", vine, 0, 8,  3, 25);
        builder.add("1x1", vine, 0, 15, 2, 25);
        builder.add("1x1", vine, 0, 15, 3, 25);
        builder.add("1x1", vine, 0, 22, 2, 25);
        builder.add("1x1", vine, 0, 22, 3, 25);

        // Vegetação no exterior do forte (colada nas muralhas, y=1 apoiado no gramado)
        builder.add("1x1", vine, 0, 1, 1, 4);
        builder.add("1x1", vine, 0, 1, 2, 4);
        builder.add("1x1", vine, 0, 0, 1, 20);
        builder.add("1x1", vine, 0, 0, 2, 20);

        return builder.blocks;
    })(),
};

export default ForteMedieval;
