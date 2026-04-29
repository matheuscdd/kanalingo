import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

// TorreMedieval — Torre de menagem medieval de pedra com um edifício anexo estilo enxaimel.
//
// Composição visual (referência: torre de menagem medieval de lego):
//   Torre Principal (Esquerda): 
//     - Base de pedra sólida com escadaria monumental frontal.
//     - Porta principal elevada. Janelas com arco ou normais.
//     - Ameias no topo da parte robusta da torre (y=13).
//     - Mirante superior menor, com aberturas e telhado azul pontiagudo.
//     - Bandeirona do topo (mastro e bandeirola vermelha/ouro).
//   Edifício Anexo (Direita):
//     - Base de pedra sólida.
//     - Transição pra 2º andar estilo enxaimel (half-timber, postes + reboco calcário).
//     - Telhado independente de duas águas azul escuro.
//     - Detalhes como flâmulas na parede (banner), e heras/trepadeiras.
//
// Eixos: X esquerda=0 direita=15 | Y solo=0 topo=32 | Z frente=0 fundo=17
// Bounding box: dx=18, dy=33, dz=18

const TorreMedieval = {
    dx: 18,
    dy: 33,
    dz: 18,
    blocks: (function () {
        const builder = createPrefabBuilder();

        // ── Paleta ────────────────────────────────────────────────────────────
        const grass     = "#4a7c40";  // gramado base
        const stone     = "#b0b0b0";  // pedra principal
        const stoneDark = "#8a8a8a";  // pedra escura (degraus, ameias, detalhes)
        const timber    = "#4a2b1b";  // postes enxaimel, madeiras de piso
        const plaster   = "#e8e0c8";  // reboco bege (anexo)
        const roofBlue  = "#3b63a8";  // telhado principal e do anexo
        const roofDark  = "#1a2b4c";  // cumeeira do anexo (azul+escuro)
        const door      = "#3a2010";  // porta
        const glass     = "#4a6070";  // vidro
        const gold      = "#d4a020";  // ouro (bandeiras)
        const red       = "#c43c3c";  // vermelho (bandeiras)
        const vine      = "#3a8c40";  // trepadeiras
        const flowerBlu = "#5588cc";  // flores da trepadeira

        // ── Phase 1: Gramado (y=0) ────────────────────────────────────────────
        addFilledRectSafe(builder, 0, 0, 0, 16, 18, grass);

        // Caminhos de aproximação
        builder.add("1x1", stoneDark, 0, 5, 0, 0);
        builder.add("1x1", stoneDark, 0, 6, 0, 0);
        builder.add("1x1", stoneDark, 0, 8, 0, 5); // pequeno path lateral

        // ── Phase 2: Fundações (y=1) ──────────────────────────────────────────
        // Torre Principal (10x10) x=1..10, z=5..14
        addFilledRectSafe(builder, 1, 1, 5, 10, 10, stone);
        // Anexo (5x8) x=11..15, z=6..13
        addFilledRectSafe(builder, 11, 1, 6, 5, 8, stone);

        // ── Phase 3: Grande Escadaria Frontal ─────────────────────────────────
        // Degraus sobem z=1 até z=4, e cobrem x=4..7. Altura de y=1..4.
        for (let step = 1; step <= 4; step++) {
            let z = step;
            for (let x = 4; x <= 7; x++) {
                // Preenche o degrau atual da base até topo do degrau
                for (let y = 1; y <= step; y++) {
                    builder.add("1x1", stoneDark, 0, x, y, z);
                }
            }
        }
        // Trilhos decorativos na base da escada
        builder.add("1x1", stone, 0, 3, 1, 1);
        builder.add("1x1", stone, 0, 3, 2, 2);
        builder.add("1x1", stone, 0, 8, 1, 1);
        builder.add("1x1", stone, 0, 8, 2, 2);

        // ── Phase 4: Paredes da Torre Principal (y=2..12) ─────────────────────
        // Prepara áreas pra janelas ANTES do loop (janelas em certas alturas)
        // Lateral esquerda x=1
        builder.add("Window", glass, 1, 1, 3, 8);
        builder.add("Window", glass, 1, 1, 8, 10);
        // Frontal z=5 (não em x=5,6 onde fica a porta)
        builder.add("Window", glass, 0, 2, 4, 5);
        builder.add("Window", glass, 0, 8, 4, 5);
        builder.add("Window", glass, 0, 2, 9, 5);
        // Fundos z=14
        builder.add("Window", glass, 0, 4, 6, 14);
        builder.add("Window", glass, 0, 7, 8, 14);

        for (let y = 2; y <= 12; y++) {
            // Frontal (z=5 e z=14) e Laterais (x=1 e x=10) da área 1x10 e 5x14
            for (let x = 1; x <= 10; x++) {
                // Ignora porta (Porta em x=5..6, z=5, y=5..7)
                if ((x === 5 || x === 6) && y >= 5 && y <= 7) continue;

                // Checa aberturas Frontais z=5
                if (y === 3 || y === 4 || y === 8 || y === 9) {
                    if (x === 2 && (y===3 || y===4)) continue; // window sx=1 sy=2 sz=2 => x=2, y=3..4, z=4..5(se rot=0, ocupa atras tb) - o ponto inicial foi z=5 entao avança pra tras.
                    if (x === 8 && y <= 4 && y >=3) continue;
                    if (x === 2 && y <= 9 && y >=8) continue;
                }
                
                // Frontal z=5 (apenas não preeche no anexo pra fundir)
                if (y >= 2 && y <= 12) {
                    if (!(x >= 5 && x <= 6 && y >= 5 && y <= 7)) { // porta
                        if (!(x===2 && (y===4||y===3)) && !(x===8 && (y===4||y===3)) && !(x===2 && (y===9||y===8))) {
                            builder.add("1x1", stone, 0, x, y, 5);
                        }
                    }
                }
                // Traseira z=14
                if (!(x === 4 && (y===6||y===7)) && !(x === 7 && (y===8||y===9))) {
                    builder.add("1x1", stone, 0, x, y, 14);
                }
            }
            
            // X esquedo (x=1)
            for (let lz = 6; lz <= 13; lz++) {
                if (y === 3 || y === 4) { if (lz === 8 || lz === 9) continue; } // sx=2 (z=8 e z=9)
                if (y === 8 || y === 9) { if (lz === 10 || lz === 11) continue; }
                builder.add("1x1", stone, 0, 1, y, lz);
            }
            // X direito da base torre (x=10) separe a conexao com o anexo (z=6..13)
            for (let lz = 6; lz <= 13; lz++) {
                if (y >= 8) { // Anexo faz half-timber acima de y=7
                    builder.add("1x1", stone, 0, 10, y, lz);
                }
                // Parte baixa (y 2 a 7) já conecta.
            }
        }

        // Porta da torre
        for(let y = 5; y <= 7; y++) {
            builder.add("1x1", door, 0, 5, y, 5);
            builder.add("1x1", door, 0, 6, y, 5);
        }

        // ── Phase 5: Anexo (y=2..12) ──────────────────────────────────────────
        // Base pedra y=2..6
        for (let y = 2; y <= 6; y++) {
            for(let x=11; x <= 15; x++) {
                builder.add("1x1", stone, 0, x, y, 6);
                builder.add("1x1", stone, 0, x, y, 13);
            }
            for(let z=7; z <= 12; z++) {
                builder.add("1x1", stone, 0, 15, y, z);
            }
        }
        
        // Janela no anexo pedra Lateral
        builder.add("Window", glass, 1, 14, 4, 13); // z=13 e z=12 (aponta sx pro lado negativo) - rot=1: sx=2 pra +x? rot=1 faz sx=2 (no x). 
        // Em x=14, rot=1 da Window ocupa x=14,15 z=13. Substituto pra ser seguro:
        builder.add("1x1", glass, 0, 15, 4, 9);
        builder.add("1x1", glass, 0, 15, 5, 9);

        // Jetty Anexo y=7 (overhang z=5, x=16)
        for (let x = 10; x <= 15; x++) {
            builder.add("1x1", timber, 0, x, 7, 5);  // Overhang frente
            builder.add("1x1", timber, 0, x, 7, 14); // Overhang costas
        }
        for (let z = 6; z <= 13; z++) {
            builder.add("1x1", timber, 0, 16, 7, z); // Overhang direita
        }
        builder.add("1x1", timber, 0, 16, 7, 5);
        builder.add("1x1", timber, 0, 16, 7, 14);

        // Half Timber Anexo y=8..10 (x=11..16, z=5..14 box mas preenche paredes)
        // Predio anexo sobre o jetty
        builder.add("Window", glass, 0, 12, 8, 5); // janela de frente anexo

        for (let y = 8; y <= 10; y++) {
            // Frente anexo z=5
            for (let x = 11; x <= 16; x++) {
                if (x === 12 && (y === 8 || y === 9)) continue; // window
                const isPost = (x === 11 || x === 14 || x === 16);
                builder.add("1x1", isPost ? timber : plaster, 0, x, y, 5);
            }
            // Fundo anexo z=14
            for (let x = 11; x <= 16; x++) {
                const isPost = (x === 11 || x === 14 || x === 16);
                builder.add("1x1", isPost ? timber : plaster, 0, x, y, 14);
            }
            // Lateral anexo x=16
            for (let z = 6; z <= 13; z++) {
                const isPost = (z === 6 || z === 10 || z === 14);
                builder.add("1x1", isPost ? timber : plaster, 0, 16, y, z);
            }
        }

        // Telhado do anexo y=11..12 (2 Steps, Roof 1x2, roofBlue) (x=11..16)
        for(let step = 0; step < 2; step++) {
            const y = 11 + step;
            const zF = 5 + step;   // água frontal
            const zB = 13 - step;  // água traseira (sz=2, ocupa zB e zB+1)
            for(let x=11; x <= 16; x++) {
                builder.add("Roof 1x2", roofBlue, 0, x, y, zF);
                builder.add("Roof 1x2", roofBlue, 2, x, y, zB);
            }
        }
        // Fecha as laterais do telhado do anexo com acabamento timber
        for(let z=5; z<=14; z++) {
            builder.add("1x1", timber, 0, 16, 11, z);
            if (z >= 6 && z <= 13) {
                builder.add("1x1", timber, 0, 16, 12, z);
            }
        }
        
        // Cumeeira Anexo y=13
        for(let x=11; x<=16; x += 2) {
            builder.add("Tile 2x2", roofDark, 0, x, 13, 7); // sz=2(z=7..8) - preenche espaco central
        }

        // ── Phase 6: Detalles da Parede (Armas, Bandeira, Heras) ──────────────
        // Bandeirão (x=9 exterior, z=4) (pendurado da torre de cima)
        addPillarStackSafe(builder, 9, 6, 4, 3, red);
        addPillarStackSafe(builder, 8, 6, 4, 3, gold);
        // Suporte do bandeirão (y=9)
        builder.add("1x1", timber, 0, 9, 9, 4);
        builder.add("1x1", timber, 0, 8, 9, 4);

        // Heras / Trepadeira na pedra (Lateral esquerda x=1, z=5..6)
        builder.add("1x1", vine, 0, 0, 1, 6);
        builder.add("1x1", vine, 0, 0, 2, 5);
        builder.add("1x1", vine, 0, 0, 3, 6);
        builder.add("1x1", vine, 0, 0, 4, 6);
        builder.add("1x1", vine, 0, 0, 5, 5);
        builder.add("1x1", flowerBlu, 0, 0, 2, 6);
        builder.add("1x1", flowerBlu, 0, 0, 4, 5);

        // ── Phase 7: Ameias da Torre de Defesa (y=13) ─────────────────────────
        // Borda base: x=1..10, z=5..14 (10x10)
        let cren = true;
        for (let x = 1; x <= 10; x++) {
            builder.add("1x1", cren ? stoneDark : stone, 0, x, 13, 5);
            builder.add("1x1", cren ? stoneDark : stone, 0, x, 13, 14);
            cren = !cren;
        }
        cren = false;
        for (let z = 6; z <= 13; z++) {
            builder.add("1x1", cren ? stoneDark : stone, 0, 1, 13, z);
            builder.add("1x1", cren ? stoneDark : stone, 0, 10, 13, z);
            cren = !cren;
        }
        // Chão interno (y=13) 8x8 (x=2..9, z=6..13)
        addFilledRectSafe(builder, 2, 13, 6, 8, 8, stoneDark);

        // ── Phase 8: Mirante do Topo (y=14..22) (x=2..9, z=6..13) ─────────────
        for (let y = 14; y <= 22; y++) {
            for (let x = 2; x <= 9; x++) {
                // Arcos / Janelões em x=4..7, y=17..20
                if (x >= 4 && x <= 7 && y >= 17 && y <= 20) continue;
                const mat = (x === 2 || x === 9) ? stoneDark : stone;
                builder.add("1x1", mat, 0, x, y, 6);
                builder.add("1x1", mat, 0, x, y, 13);
            }
            for (let z = 7; z <= 12; z++) {
                // Arcos laterais
                if (z >= 8 && z <= 11 && y >= 17 && y <= 20) continue;
                const mat = (z === 6 || z === 13) ? stoneDark : stone;
                builder.add("1x1", mat, 0, 2, y, z);
                builder.add("1x1", mat, 0, 9, y, z);
            }
        }
        // Grade/Parapeitos dentro dos arcos (y=17)
        for (let x = 4; x <= 7; x++) {
            builder.add("1x1", timber, 0, x, 17, 6);
            builder.add("1x1", timber, 0, x, 17, 13);
        }
        for (let z = 8; z <= 11; z++) {
            builder.add("1x1", timber, 0, 2, 17, z);
            builder.add("1x1", timber, 0, 9, 17, z);
        }

        // ── Phase 9: Telhado Piramidal do Mirante (y=23..27) ──────────────────
        // Base do mirante = x=2..9, z=6..13 (8x8).
        // Serão 4 degraus para formar o teto piramidal.
        // Passo 0: cobrira borda externa inteira usando peças rotacionadas (0,1,2,3).
        
        // Aba do telhado y=23. Usa timber (suporte) e roof.
        const roofBaseX = 1, roofBaseZ = 5; // Aumentar 1u pra formar aba
        for (let step = 0; step < 4; step++) {
            const y = 23 + step;
            // Aba em y=23 (step=0) x=1..10, z=5..14 (10x10)
            const minX = roofBaseX + step;
            const maxX = 10 - step;
            const minZ = roofBaseZ + step;
            const maxZ = 14 - step;
            
            // +z Frente (rot=0) cobrindo a linha z=minZ
            for (let x = minX; x <= maxX; x++) {
                builder.add("Roof 1x2", roofBlue, 0, x, y, minZ);
            }
            // -z Traseira (rot=2) cobrindo a linha z=maxZ
            for (let x = minX; x <= maxX; x++) {
                builder.add("Roof 1x2", roofBlue, 2, x, y, maxZ-1); // sz=2, pos: maxZ-1,maxZ
            }
            // -x Esquerda (rot=1, sx=2 aponta pra +x) => pos minX-1 cobrindo minX e minX+1? rot=1 faz dx=2, x=minX..
            for (let z = minZ + 1; z <= maxZ - 1; z++) {
                // Ao invés de Roof 1x2 lateral confuso, usamos 1x1 inclinado simbolico
                builder.add("1x1", roofBlue, 0, minX, y, z); 
            }
            // +x Direita (rot=3, aponta pra -x)
            for (let z = minZ + 1; z <= maxZ - 1; z++) {
                builder.add("1x1", roofBlue, 0, maxX, y, z);
            }
        }
        
        // Cumeeira central
        builder.add("Tile 2x2", roofDark, 0, 4, 27, 8);
        builder.add("Tile 2x2", roofDark, 0, 6, 27, 8); 

        // ── Phase 10: Mastro e Bandeiras (y=28..31) ───────────────────────────
        const mastX = 5, mastZ = 9;
        addPillarStackSafe(builder, mastX, 28, mastZ, 4, timber);
        // Bandeira / Flâmula vermelha e ouro, presa nos y=30 e 31 apontando para +x
        builder.add("1x1", red, 0, mastX + 1, 31, mastZ);
        builder.add("1x1", gold, 0, mastX + 2, 31, mastZ);
        builder.add("1x1", red, 0, mastX + 3, 31, mastZ);
        builder.add("1x1", gold, 0, mastX + 1, 30, mastZ);
        builder.add("1x1", red, 0, mastX + 2, 30, mastZ);

        return builder.blocks;
    })(),
};

export default TorreMedieval;