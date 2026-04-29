import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

// ─────────────────────────────────────────────────────────────────────────────
// SagradaFamilia — Basílica monumental (Gaudí), construção em múltiplas fases.
//
// Fase 1 (esta entrega): fundação, plinto escalonado, estilobato, criptas
// dianteira/traseira, nave central (pilastras + vãos com janelas + paredes
// de fachada lisas) e naves laterais (paredes externas com seteiras + tetos
// + paredes-fim). As torres hiperbólicas, ábside, fachadas esculpidas e
// cipreste virão nas próximas fases.
//
// Bounding box generoso para acomodar a Torre de Jesus (≈ y=70) nas próximas
// fases. Algumas células do envelope ficarão vazias até as fases seguintes.
// ─────────────────────────────────────────────────────────────────────────────

const SagradaFamilia = {
    dx: 64,
    dy: 72,
    dz: 44,
    blocks: (function () {
        const builder = createPrefabBuilder();

        // Paleta inspirada na imagem de referência (tons ósseos/areia + acentos).
        const sand = "#daccb0";   // sandstone principal das paredes
        const cream = "#e3d9bd";  // realces, plinto superior
        const bone = "#f4f4f4";   // cornijas, frisos brancos
        const shadow = "#8b5a2b"; // sombras / portais (reservado p/ fases 2+)
        const gold = "#f2cd37";   // pinacles dourados (fases 3+)
        const glass = "#0055bf";  // vitrais
        const crimson = "#c74e24"; // frutos vermelhos (Fase 4)
        void shadow; void gold; void crimson; // referenciados nas fases 2-4

        // ── Helpers internos ────────────────────────────────────────────────
        function addSlab(x0, y, z0, w, d, color) {
            // requer w,d pares ≥ 2 (addFilledRectSafe usa 2x2/2x4)
            addFilledRectSafe(builder, x0, y, z0, w, d, color);
        }
        function addBoxLayered(x0, y0, z0, w, h, d, color) {
            for (let y = y0; y < y0 + h; y++) addSlab(x0, y, z0, w, d, color);
        }
        function addColumn(lx, ly, lz, h, color) {
            addPillarStackSafe(builder, lx, ly, lz, h, color);
        }
        function addLineX(x0, x1, y, z, color) {
            for (let x = x0; x <= x1; x++) builder.add("1x1", color, 0, x, y, z);
        }
        function addLineZ(z0, z1, y, x, color) {
            for (let z = z0; z <= z1; z++) builder.add("1x1", color, 0, x, y, z);
        }

        // ── Constantes geométricas da Fase 1 ────────────────────────────────
        const NAVE_X0 = 20, NAVE_X1 = 43;     // paredes longitudinais da nave
        const NAVE_Z0 = 8,  NAVE_Z1 = 35;     // paredes transversais da nave
        const AISLE_W_X0 = 8,  AISLE_W_X1 = 19;  // nave lateral oeste
        const AISLE_E_X0 = 44, AISLE_E_X1 = 55;  // nave lateral leste
        const WALL_Y0 = 4;                    // arranque das paredes
        const NAVE_TOP = 18;                  // topo das paredes da nave
        const AISLE_TOP = 12;                 // topo das naves laterais

        // ── Plataforma escalonada ───────────────────────────────────────────
        addSlab(0, 0, 0, 64, 44, sand);       // praça em y=0 (cobertura total)
        addSlab(2, 1, 2, 60, 40, sand);       // primeiro degrau
        addBoxLayered(4, 2, 4, 56, 2, 36, cream); // segundo degrau (2 layers)
        addSlab(6, 3, 6, 52, 32, cream);      // estilobato (top da plataforma)

        // Cripta/escadaria dianteira (z=0..1) e traseira (z=42..43)
        addSlab(10, 1, 0, 44, 2, sand);
        addSlab(12, 2, 0, 40, 2, cream);
        addSlab(10, 1, 42, 44, 2, sand);
        addSlab(12, 2, 42, 40, 2, cream);

        // ── Pilastras da nave (a cada 4 cells) ──────────────────────────────
        const naveBays = [NAVE_Z0, 12, 16, 20, 24, 28, 32, NAVE_Z1];
        const pilasterH = NAVE_TOP - WALL_Y0;       // 14 cells
        naveBays.forEach((z) => {
            addColumn(NAVE_X0, WALL_Y0, z, pilasterH, cream);
            addColumn(NAVE_X1, WALL_Y0, z, pilasterH, cream);
        });

        // Painel de parede entre duas pilastras consecutivas (vão com janela alta).
        function addNaveBayPanel(wallX, z0, z1) {
            // base sólida
            for (let y = WALL_Y0; y <= 10; y++) addLineZ(z0, z1, y, wallX, sand);
            // friso branco
            addLineZ(z0, z1, 11, wallX, bone);
            // arcada com janela central (vitral)
            const winZ = Math.floor((z0 + z1) / 2);
            for (let y = 12; y <= 16; y++) {
                for (let z = z0; z <= z1; z++) {
                    const isGlass = y >= 13 && y <= 15 && z === winZ;
                    builder.add("1x1", isGlass ? glass : sand, 0, wallX, y, z);
                }
            }
            // cornija superior
            addLineZ(z0, z1, 17, wallX, bone);
        }
        for (let i = 0; i < naveBays.length - 1; i++) {
            const z0 = naveBays[i] + 1;
            const z1 = naveBays[i + 1] - 1;
            if (z1 < z0) continue;
            addNaveBayPanel(NAVE_X0, z0, z1);
            addNaveBayPanel(NAVE_X1, z0, z1);
        }

        // ── Paredes-fim da nave (z=NAVE_Z0 e z=NAVE_Z1) ─────────────────────
        // Maciças nesta fase — Fase 2 esculpe os portais e o rosetão.
        function addNaveEndWall(z) {
            for (let y = WALL_Y0; y <= NAVE_TOP - 1; y++) {
                for (let x = NAVE_X0 + 1; x <= NAVE_X1 - 1; x++) {
                    builder.add("1x1", sand, 0, x, y, z);
                }
            }
            // friso topo
            for (let x = NAVE_X0 + 1; x <= NAVE_X1 - 1; x++) {
                builder.add("1x1", bone, 0, x, NAVE_TOP - 1, z);
            }
        }
        addNaveEndWall(NAVE_Z0);
        addNaveEndWall(NAVE_Z1);

        // ── Naves laterais ──────────────────────────────────────────────────
        function addAisleOuterWall(wallX) {
            for (let y = WALL_Y0; y < AISLE_TOP; y++) {
                for (let z = NAVE_Z0; z <= NAVE_Z1; z++) {
                    // seteiras altas a cada 4 z
                    const isLoop = y >= 7 && y <= 9 && (z - NAVE_Z0) % 4 === 2;
                    builder.add("1x1", isLoop ? glass : sand, 0, wallX, y, z);
                }
            }
            // cornija branca no topo
            addLineZ(NAVE_Z0, NAVE_Z1, AISLE_TOP, wallX, bone);
        }
        addAisleOuterWall(AISLE_W_X0);
        addAisleOuterWall(AISLE_E_X1);

        // Tetos das naves laterais (entre parede externa e nave central).
        function addAisleCeiling(xMin, xMax) {
            for (let z = NAVE_Z0; z <= NAVE_Z1; z++) {
                for (let x = xMin; x <= xMax; x++) {
                    builder.add("1x1", cream, 0, x, AISLE_TOP, z);
                }
            }
        }
        addAisleCeiling(AISLE_W_X0 + 1, AISLE_W_X1);  // x=9..19
        addAisleCeiling(AISLE_E_X0, AISLE_E_X1 - 1);  // x=44..54

        // Paredes-fim das laterais (fechamento simples nesta fase).
        function addAisleEndWall(xMin, xMax, z) {
            for (let y = WALL_Y0; y < AISLE_TOP; y++) {
                for (let x = xMin; x <= xMax; x++) {
                    builder.add("1x1", sand, 0, x, y, z);
                }
            }
        }
        addAisleEndWall(AISLE_W_X0 + 1, AISLE_W_X1, NAVE_Z0);
        addAisleEndWall(AISLE_E_X0,     AISLE_E_X1 - 1, NAVE_Z0);
        addAisleEndWall(AISLE_W_X0 + 1, AISLE_W_X1, NAVE_Z1);
        addAisleEndWall(AISLE_E_X0,     AISLE_E_X1 - 1, NAVE_Z1);

        // ── Marcos de canto (futura base das torres dos Apóstolos) ──────────
        // Pequenos núcleos que servirão de fundação para as torres da Fase 4.
        // Mantidos baixos aqui para não invadir o silhueta antes da hora.
        const apostleAnchors = [
            [AISLE_W_X0,     NAVE_Z0],
            [AISLE_E_X1,     NAVE_Z0],
            [AISLE_W_X0,     NAVE_Z1],
            [AISLE_E_X1,     NAVE_Z1],
        ];
        apostleAnchors.forEach(([x, z]) => {
            // cubo 2x2 levemente acima do estilobato — futura base de torre
            builder.add("2x2", cream, 0, x, AISLE_TOP + 1, z);
            builder.add("2x2", bone,  0, x, AISLE_TOP + 2, z);
        });

        // ── FASE 2 ─────────────────────────────────────────────────────────
        // Estende plinto/estilobato sob o apse (z=38..43) e sob a fachada do
        // Nascimento (z=2..3) para garantir vizinhos de suporte às novas
        // paredes em y=4 (groundedness por 26-conexões).
        // Sobreposições parciais com Phase 1 são silenciosamente ignoradas
        // por addFilledRectSafe (cells já ocupadas → builder.add devolve false).
        addSlab(22, 2, 40, 20, 2, cream);   // y=2: x=22..41 z=40..41
        addSlab(22, 3, 38, 20, 6, cream);   // y=3: x=22..41 z=38..43
        addSlab(4, 2, 2, 56, 2, cream);     // y=2: x=4..59 z=2..3
        addSlab(4, 3, 2, 56, 2, cream);     // y=3: x=4..59 z=2..3

        // — Apse semielíptico (z>=36) ao redor de (cx=32, cz=35) —
        const apseCx = 32, apseCz = 35;
        const apseRx = 11, apseRz = 7;
        const apseInnerRx = 9, apseInnerRz = 5;
        const apseTop = 16; // topo das paredes (cornija a 17, cúpula 18+)

        function inApseOuter(x, z) {
            return ((x - apseCx) / apseRx) ** 2 + ((z - apseCz) / apseRz) ** 2 <= 1.0;
        }
        function inApseInner(x, z) {
            return ((x - apseCx) / apseInnerRx) ** 2 + ((z - apseCz) / apseInnerRz) ** 2 < 1.0;
        }
        // Paredes do apse: anel entre elipse externa e interna, y=4..apseTop
        for (let y = WALL_Y0; y <= apseTop; y++) {
            for (let x = 22; x <= 42; x++) {
                for (let z = 36; z <= 42; z++) {
                    if (!inApseOuter(x, z) || inApseInner(x, z)) continue;
                    const isWindowY = y >= 8 && y <= 11;
                    const isWindowCol = (x % 4) === 0;
                    const color = (isWindowY && isWindowCol) ? glass : sand;
                    builder.add("1x1", color, 0, x, y, z);
                }
            }
        }
        // Tampa/cornija a y=17: anel bone + miolo cream (preenche para servir
        // de base à meia-cúpula — sem isso a cúpula em y=18 ficaria flutuante)
        for (let x = 22; x <= 42; x++) {
            for (let z = 36; z <= 42; z++) {
                if (!inApseOuter(x, z)) continue;
                const color = inApseInner(x, z) ? cream : bone;
                builder.add("1x1", color, 0, x, 17, z);
            }
        }
        // Meia-cúpula em camadas decrescentes (parabólica simplificada)
        const domeLayers = [
            { dy: 1, rx: 9,  rz: 5, color: cream },
            { dy: 2, rx: 7,  rz: 3, color: cream },
            { dy: 3, rx: 5,  rz: 2, color: bone  },
        ];
        domeLayers.forEach(({ dy, rx, rz, color }) => {
            const ly = 17 + dy;
            for (let x = apseCx - rx; x <= apseCx + rx; x++) {
                for (let z = 36; z <= apseCz + rz; z++) {
                    const v = ((x - apseCx) / rx) ** 2 + ((z - apseCz) / rz) ** 2;
                    if (v <= 1.0) builder.add("1x1", color, 0, x, ly, z);
                }
            }
        });
        // Pináculo dourado no ápice da cúpula
        builder.add("1x1", gold, 0, apseCx, 21, 36);
        builder.add("1x1", gold, 0, apseCx, 22, 36);

        // — Fachada do Nascimento (z=0..3) — paredes laterais + plano frontal
        // Paredes laterais a x=20/43 ligam o plano frontal (z=2) à parede
        // final da nave (z=8), garantindo conectividade.
        function addNativitySideWall(wallX) {
            for (let z = 2; z <= 7; z++) {
                for (let y = WALL_Y0; y <= 14; y++) {
                    const isWin = (z === 4 || z === 5) && y >= 10 && y <= 12;
                    builder.add("1x1", isWin ? glass : sand, 0, wallX, y, z);
                }
            }
        }
        addNativitySideWall(NAVE_X0);
        addNativitySideWall(NAVE_X1);

        // Geometria do portal central (vão arqueado)
        function isNativityPortalOpen(x, y) {
            if (y < WALL_Y0 || y > 9) return false;
            if (x < 29 || x > 34) return false;
            // Em y=9, deixa só o vão central (x=30..33) aberto; x=29,34 são
            // arrancadores do arco e ficam preenchidos.
            if (y === 9 && (x === 29 || x === 34)) return false;
            return true;
        }
        // Geometria do rosetão (círculo) centrado em (31.5, 13.5), raio 3
        const roseCx = 31.5, roseCy = 13.5, roseR = 3;
        function isRose(x, y) {
            const dx = x - roseCx;
            const dy = y - roseCy;
            return dx * dx + dy * dy <= roseR * roseR;
        }
        function roseColorAt(x, y) {
            const dx = x - roseCx, dy = y - roseCy;
            const r2 = dx * dx + dy * dy;
            if (r2 <= 1.5) return bone;   // miolo claro
            return glass;                  // anel de vitral
        }

        // Plano frontal em z=2, x=NAVE_X0..NAVE_X1, y=4..18
        for (let y = WALL_Y0; y <= 18; y++) {
            for (let x = NAVE_X0; x <= NAVE_X1; x++) {
                if (isNativityPortalOpen(x, y)) continue;
                if (isRose(x, y)) {
                    builder.add("1x1", roseColorAt(x, y), 0, x, y, 2);
                    continue;
                }
                const isCornice = y === 11 || y === 17;
                builder.add("1x1", isCornice ? bone : sand, 0, x, y, 2);
            }
        }

        // Pináculos pequenos sobre a fachada do Nascimento (cantos + 3 centrais)
        [NAVE_X0, NAVE_X1].forEach((cx) => {
            builder.add("1x1", cream, 0, cx, 19, 2);
            builder.add("1x1", cream, 0, cx, 20, 2);
            builder.add("1x1", gold,  0, cx, 21, 2);
        });
        [26, 31, 37].forEach((cx) => {
            builder.add("1x1", cream, 0, cx, 19, 2);
            builder.add("1x1", gold,  0, cx, 20, 2);
        });

        // ── FASE 3 — Cluster central de torres hiperbólicas ────────────────
        // Taper: r(t) = topR + (baseR - topR) * cosh(1 - t) / cosh(1), com
        // t = dy / (H - 1) ∈ [0, 1]. cosh(1)≈1.5431. Em t=0 → r=baseR; em
        // t=1 → r=topR. A curvatura cosh imita o estreitamento parabólico
        // hiperbólico das torres de Gaudí (mais rápido perto do topo).
        const COSH1 = Math.cosh(1);

        function addDiskAt(cx, cz, r, y, color) {
            // disco preenchido para garantir conectividade vertical entre
            // camadas (26-conn). r pode ser fracionário; usa r^2 contínuo.
            const ri = Math.max(1, Math.ceil(r));
            const r2 = r * r;
            for (let dx = -ri; dx <= ri; dx++) {
                for (let dz = -ri; dz <= ri; dz++) {
                    if (dx * dx + dz * dz <= r2) {
                        builder.add("1x1", color, 0, cx + dx, y, cz + dz);
                    }
                }
            }
        }

        function buildHyperbolicTower(cx, cz, baseR, topR, H, y0, palette) {
            for (let dy = 0; dy < H; dy++) {
                const t = H <= 1 ? 1 : dy / (H - 1);
                const r = topR + (baseR - topR) * Math.cosh(1 - t) / COSH1;
                // gradiente vertical de cor: pé arenito → meio creme → topo bone
                let color;
                if (t < 0.55) color = palette.stem;
                else if (t < 0.85) color = palette.crown;
                else color = palette.tip;
                addDiskAt(cx, cz, r, y0 + dy, color);
            }
            // Caule do pináculo + fruto colorido no ápice
            const yTop = y0 + H;
            builder.add("1x1", palette.tip, 0, cx, yTop, cz);
            builder.add("1x1", palette.cap, 0, cx, yTop + 1, cz);
        }

        // Paletas das torres
        const jesusPalette       = { stem: sand,  crown: cream, tip: bone, cap: gold };
        const evangelistPaletteN = { stem: sand,  crown: cream, tip: bone, cap: gold };
        const evangelistPaletteS = { stem: sand,  crown: cream, tip: bone, cap: glass };

        // Torre de Jesus — pico mais alto, no centro do cruzeiro/nave central
        // (32, 22). Inicia no chão da nave (estilobato em y=3) e sobe até y≈70.
        buildHyperbolicTower(32, 22, /*baseR*/5, /*topR*/1, /*H*/66, /*y0*/4, jesusPalette);
        // Reforça ápice com cruz dourada (estaurós) — y=70..71 no eixo central
        builder.add("1x1", gold, 0, 32, 70, 22);    // já placeado pelo cap; idempotente (false silenciosamente)
        builder.add("1x1", gold, 0, 31, 70, 22);    // braço esquerdo
        builder.add("1x1", gold, 0, 33, 70, 22);    // braço direito
        builder.add("1x1", gold, 0, 32, 71, 22);    // alto da cruz

        // 4 Torres dos Evangelistas — agrupadas em volta de Jesus, tops ≈y=60
        // Posições nos quatro quadrantes da nave (sem colidir com Jesus r=5).
        const evangelistPositions = [
            { cx: 24, cz: 12, palette: evangelistPaletteN }, // NW
            { cx: 40, cz: 12, palette: evangelistPaletteN }, // NE
            { cx: 24, cz: 32, palette: evangelistPaletteS }, // SW
            { cx: 40, cz: 32, palette: evangelistPaletteS }, // SE
        ];
        evangelistPositions.forEach(({ cx, cz, palette }) => {
            buildHyperbolicTower(cx, cz, /*baseR*/2.4, /*topR*/0.7, /*H*/56, /*y0*/4, palette);
        });

        // ── FASE 4 — 12 Apóstolos + Fachada da Glória + cipreste ───────────

        // Plinto extra sob a Fachada da Glória (transepto x=0..3, z=10..33)
        // necessário para apoiar paredes e torres em y=4 com 26-conn.
        addSlab(2, 1, 10, 4, 24, sand);
        addSlab(2, 2, 10, 4, 24, cream);
        addSlab(2, 3, 10, 4, 24, cream);

        // Paredes laterais norte/sul (z=8..9 e z=34..35) ligando o plinto da
        // Glória às paredes da nave existente (em x=20).
        for (let y = WALL_Y0; y <= 12; y++) {
            for (let x = 4; x <= 19; x++) {
                builder.add("1x1", sand, 0, x, y, 8);
                builder.add("1x1", sand, 0, x, y, 35);
            }
        }
        // Cornija branca topo das paredes laterais
        for (let x = 4; x <= 19; x++) {
            builder.add("1x1", bone, 0, x, 13, 8);
            builder.add("1x1", bone, 0, x, 13, 35);
        }

        // Plano frontal da Fachada da Glória em x=2, z=10..33, y=4..18.
        // Portal central triplo (z=18..25) e rosetão alto (centro 14, 21.5).
        function isGloryPortalOpen(z, y) {
            if (y < WALL_Y0 || y > 9) return false;
            if (z < 18 || z > 25) return false;
            if (y === 9 && (z === 18 || z === 21 || z === 22 || z === 25)) return false;
            return true;
        }
        const gloryRoseCy = 14, gloryRoseCz = 21.5, gloryRoseR = 3;
        function isGloryRose(z, y) {
            const dz = z - gloryRoseCz, dy = y - gloryRoseCy;
            return dz * dz + dy * dy <= gloryRoseR * gloryRoseR;
        }
        function gloryRoseColorAt(z, y) {
            const dz = z - gloryRoseCz, dy = y - gloryRoseCy;
            return (dz * dz + dy * dy) <= 1.5 ? bone : glass;
        }
        for (let y = WALL_Y0; y <= 18; y++) {
            for (let z = 10; z <= 33; z++) {
                if (isGloryPortalOpen(z, y)) continue;
                if (isGloryRose(z, y)) {
                    builder.add("1x1", gloryRoseColorAt(z, y), 0, 2, y, z);
                    continue;
                }
                const isCornice = y === 11 || y === 17;
                builder.add("1x1", isCornice ? bone : sand, 0, 2, y, z);
            }
        }
        // Pináculos pequenos topo da Fachada da Glória
        [10, 16, 27, 33].forEach((cz) => {
            builder.add("1x1", cream, 0, 2, 19, cz);
            builder.add("1x1", gold,  0, 2, 20, cz);
        });

        // — 12 Torres dos Apóstolos: 4 por fachada × 3 fachadas —
        // Pequenas torres hiperbólicas (baseR=1.6, topR=0.6, H=44, top≈48).
        const apostlePalette = { stem: sand, crown: cream, tip: bone, cap: gold };
        const apostleAccent  = { stem: sand, crown: cream, tip: bone, cap: glass };
        const apostleAccent2 = { stem: sand, crown: cream, tip: bone, cap: crimson };

        // Helper local de fruto colorido extra acima do cap
        function addFruit(cx, cz, yTop, accent) {
            builder.add("1x1", accent, 0, cx, yTop + 2, cz);
        }

        // Nativity (z≈2): 4 torres
        const nativityCols = [12, 22, 41, 51];
        nativityCols.forEach((cx, i) => {
            const palette = i === 1 || i === 2 ? apostlePalette : apostleAccent;
            buildHyperbolicTower(cx, 2, 1.6, 0.6, 44, 4, palette);
            addFruit(cx, 2, 4 + 44, i % 2 === 0 ? crimson : gold);
        });
        // Passion (z=41): 4 torres
        const passionCols = [12, 22, 41, 51];
        passionCols.forEach((cx, i) => {
            const palette = i === 0 || i === 3 ? apostleAccent2 : apostlePalette;
            buildHyperbolicTower(cx, 41, 1.6, 0.6, 44, 4, palette);
            addFruit(cx, 41, 4 + 44, i % 2 === 0 ? gold : glass);
        });
        // Glory (x=2 transepto): 4 torres
        const gloryRows = [12, 16, 27, 31];
        gloryRows.forEach((cz, i) => {
            const palette = i === 1 || i === 2 ? apostlePalette : apostleAccent;
            buildHyperbolicTower(2, cz, 1.6, 0.6, 44, 4, palette);
            addFruit(2, cz, 4 + 44, i % 2 === 0 ? gold : crimson);
        });

        // — Cipreste “Árvore da Vida” entre as torres centrais do Nascimento —
        // Tronco em (32, 1) y=4..14, copa cônica de cells crimson/cream/gold.
        // Copa intencionalmente estreita (r≤1) para não invadir z=-1.
        for (let y = 4; y <= 14; y++) builder.add("1x1", shadow, 0, 32, y, 1);
        const cypressLayers = [
            { dy: 0, r: 1, color: cream },
            { dy: 1, r: 1, color: cream },
            { dy: 2, r: 1, color: cream },
            { dy: 3, r: 1, color: cream },
            { dy: 4, r: 0, color: bone  },
            { dy: 5, r: 0, color: gold  },
        ];
        cypressLayers.forEach(({ dy, r, color }) => {
            const y = 15 + dy;
            for (let dx = -r; dx <= r; dx++) {
                for (let dz = -r; dz <= r; dz++) {
                    if (dx * dx + dz * dz > r * r) continue;
                    builder.add("1x1", color, 0, 32 + dx, y, 1 + dz);
                }
            }
        });
        // Frutos pontuais nos flancos da copa
        builder.add("1x1", crimson, 0, 31, 16, 1);
        builder.add("1x1", crimson, 0, 33, 16, 1);
        builder.add("1x1", gold,    0, 32, 16, 0);

        return builder.blocks;
    })(),
};

export default SagradaFamilia;
