import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

// CasaMedieval1 — Casa medieval inglesa de tijolos escuros com telhado de telhas
// creme/bege inclinado em duas águas, pórtico frontal, chaminé lateral e jardim.
//
// Referência visual: casa compacta estilo cottage inglês medieval:
//   - Fundação/plinto: pedra cinza
//   - Paredes: tijolo marrom escuro com detalhes de madeira (enquadramento)
//   - Telhado: telhas bege/creme inclinadas em duas águas, cumeeira com roletes escuros
//   - Pórtico frontal: arco cinza com pilares, porta dupla marrom
//   - Janelas: vidro com caixilhos brancos em lattice
//   - Chaminé: alvenaria cinza com fumaça simbólica
//   - Gramado: verde com flores e cogumelos decorativos
//
// Eixo Z: frente = z=0, fundo = z=15
// Eixo X: esquerda = x=0, direita = x=16
// Bounding box: 18x14x18

const CasaMedieval1 = {
    dx: 18,
    dy: 14,
    dz: 18,
    blocks: (function () {
        const builder = createPrefabBuilder();

        // ── Paleta ────────────────────────────────────────────────────────────
        const grass      = "#4a7c40"; // gramado
        const stone      = "#8c8c8c"; // plinto/fundação de pedra
        const brick      = "#6b3a2a"; // tijolo marrom escuro (paredes)
        const timber     = "#3d2010"; // madeira escura (caixilhos e molduras)
        const roofTile   = "#d4c68a"; // telha creme/bege
        const roofRidge  = "#2a2a2a"; // roletes da cumeeira (escuros)
        const glass      = "#9ac1d5"; // vidro
        const door       = "#5a3218"; // porta madeira escura
        const porch      = "#9a9a9a"; // pórtico cinza
        const floorTile  = "#c8b89a"; // piso interno
        const chimney    = "#7a7a7a"; // chaminé
        const smoke      = "#d0d0d0"; // fumaça (cinza claro)
        const flowerRed  = "#c43c3c"; // flor vermelha
        const flowerYel  = "#d4a020"; // flor amarela
        const mushCap    = "#cc2222"; // cogumelo vermelho
        const mushStem   = "#e0e0e0"; // caule cogumelo

        // ── Gramado base (y=0) ────────────────────────────────────────────────
        // Gramado total exceto onde há fundação
        addFilledRectSafe(builder, 0, 0, 0, 18, 18, grass);

        // ── Fundação de pedra (y=1) — plinto contínuo ─────────────────────────
        // Placa de pedra sob toda a casa (x=2..15, z=2..15 = 14x14)
        addFilledRectSafe(builder, 2, 1, 2, 14, 14, stone);

        // ── Piso interior (y=2) ────────────────────────────────────────────────
        addFilledRectSafe(builder, 3, 2, 3, 12, 12, floorTile);

        // ── Paredes – y=3..5 (3 camadas = altura das paredes) ─────────────────
        // Estratégia: construir paredes de tijolo em loops manuais,
        // reservando espaços para janelas e porta antes de preencher.
        //
        // Aberturas na fachada frontal (z=2):
        //   - Porta: x=8,9 em y=3,4
        //   - Janela esquerda: x=4 em y=4 (Window ocupa sx=1 sy=2 sz=2)
        //   - Janela direita: x=12 em y=4
        //
        // Aberturas na fachada traseira (z=15):
        //   - Janela centro-esq: x=5 em y=4
        //   - Janela centro-dir: x=11 em y=4
        //
        // Aberturas laterais (x=2 e x=15):
        //   - Janela lateral esq: z=7 em y=4 (em x=2)
        //   - Janela lateral dir: z=9 em y=4 (em x=15) — z+sz=11, dentro de dz=18

        for (let y = 3; y <= 5; y++) {
            // Fachada frontal z=2 (exterior)
            for (let x = 2; x <= 15; x++) {
                // Abertura porta central: x=8,9 em y=3,4
                if ((x === 8 || x === 9) && y <= 4) continue;
                // Reserva para Window frontal esquerda em x=4,y=4
                if (x === 4 && y === 4) continue;
                // Reserva para Window frontal direita em x=12,y=4
                if (x === 12 && y === 4) continue;
                builder.add("1x1", brick, 0, x, y, 2);
            }

            // Fachada traseira z=15 (exterior)
            for (let x = 2; x <= 15; x++) {
                if (x === 5 && y === 4) continue;
                if (x === 11 && y === 4) continue;
                builder.add("1x1", brick, 0, x, y, 15);
            }

            // Paredes laterais x=2 e x=15 (interior z=3..14)
            for (let z = 3; z <= 14; z++) {
                if (z === 7 && y === 4) {
                    // deixar espaço para Window em x=2
                } else {
                    builder.add("1x1", brick, 0, 2, y, z);
                }
                if (z === 9 && y === 4) {
                    // deixar espaço para Window em x=15
                } else {
                    builder.add("1x1", brick, 0, 15, y, z);
                }
            }
        }

        // Molduras de madeira (caixilhos verticais) nas quinas e entre janelas
        const timberCols = [2, 7, 10, 15]; // x das colunas de madeira na fachada frontal/traseira
        for (const tx of timberCols) {
            for (let y = 3; y <= 5; y++) {
                builder.add("1x1", timber, 0, tx, y, 2);
                builder.add("1x1", timber, 0, tx, y, 15);
            }
        }
        // Caixilhos horizontais de madeira (verga) sobre porta e janelas
        builder.add("1x1", timber, 0, 7,  5, 2);
        builder.add("1x1", timber, 0, 8,  5, 2);
        builder.add("1x1", timber, 0, 9,  5, 2);
        builder.add("1x1", timber, 0, 10, 5, 2);
        builder.add("1x1", timber, 0, 3,  5, 2);
        builder.add("1x1", timber, 0, 4,  5, 2);
        builder.add("1x1", timber, 0, 5,  5, 2);
        builder.add("1x1", timber, 0, 11, 5, 2);
        builder.add("1x1", timber, 0, 12, 5, 2);
        builder.add("1x1", timber, 0, 13, 5, 2);

        // ── Porta frontal ─────────────────────────────────────────────────────
        builder.add("1x1", door, 0, 8, 3, 2);
        builder.add("1x1", door, 0, 8, 4, 2);
        builder.add("1x1", door, 0, 9, 3, 2);
        builder.add("1x1", door, 0, 9, 4, 2);

        // ── Janelas ───────────────────────────────────────────────────────────
        // Frontal: Window ocupa (sx=1,sy=2,sz=2) — a sz=2 aponta para z+
        // rot=0 → sz para z; rot=1 → sz para x
        builder.add("Window", glass, 0, 4,  4, 2);   // esquerda frontal
        builder.add("Window", glass, 0, 12, 4, 2);   // direita frontal
        builder.add("Window", glass, 0, 5,  4, 14);  // traseira esq (z=14 → ocupa z=14,15)
        builder.add("Window", glass, 0, 11, 4, 14);  // traseira dir
        builder.add("Window", glass, 1, 2,  4, 7);   // lateral esq (rot=1 → sx=2 para x)
        builder.add("Window", glass, 1, 14, 4, 9);   // lateral dir

        // ── Pórtico frontal ───────────────────────────────────────────────────
        // Base do pórtico: degrau z=1 (fora da casa)
        addFilledRectSafe(builder, 7, 2, 1, 4, 2, stone);  // degrau 4x2

        // Pilares do pórtico
        addPillarStackSafe(builder, 7,  3, 1, 3, porch);  // pilar esquerdo
        addPillarStackSafe(builder, 10, 3, 1, 3, porch);  // pilar direito

        // Lintel do pórtico
        for (let x = 7; x <= 10; x++) {
            builder.add("1x1", porch, 0, x, 6, 1);
        }

        // ── Empenas laterais (gable ends) — y=6..9 ────────────────────────────
        // As empenas triangulares fecham os lados do telhado em duas águas
        // Empena esquerda (x=2): preencher o triângulo
        // Layer y=6: z=2..15 (largura 14) — começa logo acima da parede
        // Cada layer sobe 1 e recua 1 de cada lado
        const gableSteps = [
            { y: 6, zStart: 2,  zEnd: 15 },
            { y: 7, zStart: 3,  zEnd: 14 },
            { y: 8, zStart: 4,  zEnd: 13 },
            { y: 9, zStart: 5,  zEnd: 12 },
        ];
        for (const { y, zStart, zEnd } of gableSteps) {
            for (let z = zStart; z <= zEnd; z++) {
                builder.add("1x1", brick, 0, 2,  y, z);
                builder.add("1x1", brick, 0, 15, y, z);
            }
        }
        // Moldura de madeira nas quinas das empenas
        for (const { y } of gableSteps) {
            builder.add("1x1", timber, 0, 2,  y, 2);
            builder.add("1x1", timber, 0, 2,  y, 15);
            builder.add("1x1", timber, 0, 15, y, 2);
            builder.add("1x1", timber, 0, 15, y, 15);
        }

        // ── Telhado em duas águas ─────────────────────────────────────────────
        // Roof 1x2: sx=1, sy=1, sz=2
        //   rot=0 → inclinação para +z (frente)
        //   rot=2 → inclinação para -z (trás)
        // 4 degraus de cada lado, cobrindo x=3..14
        for (let step = 0; step < 4; step++) {
            const y   = 6 + step;
            const zF  = 2 + step;  // z para água frontal (Roof rot=0)
            const zB  = 14 - step; // z para água traseira (Roof rot=2)
            for (let x = 3; x <= 14; x += 1) {
                builder.add("Roof 1x2", roofTile, 0, x, y, zF); // água da frente
                builder.add("Roof 1x2", roofTile, 2, x, y, zB - 1); // água de trás (sz=2 vai de zB-1 a zB)
            }
        }

        // Cumeeira no topo (y=10, z=6..11) com Tile 2x2 e roletes escuros
        for (let x = 2; x <= 14; x += 2) {
            builder.add("Tile 2x2", roofTile, 0, x, 10, 6);
            builder.add("Tile 2x2", roofTile, 0, x, 10, 8);
            builder.add("Tile 2x2", roofTile, 0, x, 10, 10);
        }
        // Roletes escuros na cumeeira
        for (let x = 3; x <= 15; x += 2) {
            builder.add("1x1", roofRidge, 0, x, 11, 8);
        }

        // ── Chaminé ────────────────────────────────────────────────────────────
        // Ancoragem: começa no telhado (y=8), ao longo de x=13 z=4
        addPillarStackSafe(builder, 13, 2, 4, 10, chimney);  // da fundação ao topo
        // Capelo da chaminé
        builder.add("1x1", chimney, 0, 12, 11, 4);
        builder.add("1x1", chimney, 0, 14, 11, 4);
        builder.add("1x1", chimney, 0, 13, 11, 3);
        builder.add("1x1", chimney, 0, 13, 11, 5);
        // Fumaça simbólica
        builder.add("1x1", smoke, 0, 13, 12, 4);
        builder.add("1x1", smoke, 0, 12, 13, 4);

        // ── Detalhes externos – jardim ─────────────────────────────────────────
        // Caminho frontal de pedra (z=0..1, x=8..9)
        builder.add("2x2", stone, 0, 8, 1, 0);

        // Flores amarelas (esquerda)
        builder.add("1x1", flowerYel, 0, 1, 1, 4);
        builder.add("1x1", flowerYel, 0, 1, 1, 6);
        // Flores vermelhas/rosas (centro-esquerda)
        builder.add("1x1", flowerRed, 0, 3, 1, 1);
        builder.add("1x1", flowerRed, 0, 5, 1, 1);
        // Flores amarelas (direita)
        builder.add("1x1", flowerYel, 0, 13, 1, 1);
        builder.add("1x1", flowerYel, 0, 15, 1, 1);

        // Cogumelo vermelho (direita frontal)
        builder.add("1x1", mushStem, 0, 14, 1, 3);
        builder.add("2x2", mushCap,  0, 13, 2, 2);

        // Barril (direita)
        addPillarStackSafe(builder, 16, 1, 4, 2, timber);

        return builder.blocks;
    })(),
};

export default CasaMedieval1;
