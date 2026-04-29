import {
    addFilledRectSafe,
    addPillarStackSafe,
    createPrefabBuilder,
    getEllipsePoints,
} from "../shared/core.js";

const CasteloNormando = {
    dx: 48,
    dy: 34,
    dz: 44,
    blocks: (function () {
        const builder = createPrefabBuilder();

        const palette = {
            grass: "#537c3b",
            moat: "#4b79bf",
            patio: "#9a8864",
            floorStone: "#8e8368",
            stone: "#b5b2ad",
            stoneDark: "#84827e",
            stoneAccent: "#c4a36a",
            timber: "#5b3420",
            roofTile: "#bb6a2b",
            roofRidge: "#4f2410",
            glass: "#97afbf",
            iron: "#3d3932",
            flagRed: "#c72a2a",
            flagYellow: "#d8a41a",
            vine: "#2f5d1f",
            barrel: "#6c4324",
            shadow: "#312d28",
        };

        function getStoneColor(x, y, z, bias = 0) {
            const sample = (x * 11 + y * 7 + z * 5 + bias * 13) % 19;
            if (sample === 0 || sample === 6 || sample === 13) return palette.stoneDark;
            if (sample === 3 || sample === 9 || sample === 16) return palette.stoneAccent;
            return palette.stone;
        }

        function addStone(x, y, z, bias = 0) {
            builder.add("1x1", getStoneColor(x, y, z, bias), 0, x, y, z);
        }

        function addSingleStoneRect(x0, y, z0, width, depth, color) {
            for (let x = x0; x < x0 + width; x++) {
                for (let z = z0; z < z0 + depth; z++) {
                    builder.add("1x1", color, 0, x, y, z);
                }
            }
        }

        function addStoneRectRemainders(x0, y, z0, size, evenSize, color) {
            const maxX = x0 + size.width - 1;
            const maxZ = z0 + size.depth - 1;

            if (size.depth % 2 !== 0) {
                for (let x = x0; x < x0 + evenSize.width; x++) {
                    builder.add("1x1", color, 0, x, y, maxZ);
                }
            }

            if (size.width % 2 !== 0) {
                for (let z = z0; z < z0 + evenSize.depth; z++) {
                    builder.add("1x1", color, 0, maxX, y, z);
                }
            }

            if (size.width % 2 !== 0 && size.depth % 2 !== 0) {
                builder.add("1x1", color, 0, maxX, y, maxZ);
            }
        }

        function addStoneRect(x0, y, z0, width, depth, bias = 0) {
            if (width <= 0 || depth <= 0) return;

            const color = getStoneColor(x0, y, z0, bias);

            if (width === 1 || depth === 1) {
                addSingleStoneRect(x0, y, z0, width, depth, color);
                return;
            }

            const evenWidth = width - (width % 2);
            const evenDepth = depth - (depth % 2);

            if (evenWidth >= 2 && evenDepth >= 2) {
                addFilledRectSafe(builder, x0, y, z0, evenWidth, evenDepth, color);
            }

            addStoneRectRemainders(
                x0,
                y,
                z0,
                { width, depth },
                { width: evenWidth, depth: evenDepth },
                color,
            );
        }

        function addStoneBand(x0, x1, z0, z1, y, bias = 0) {
            addStoneRect(x0, y, z0, x1 - x0 + 1, z1 - z0 + 1, bias);
        }

        function addStoneSegmentsX(segments, z0, z1, y, bias = 0) {
            segments.forEach(([x0, x1]) => addStoneBand(x0, x1, z0, z1, y, bias));
        }

        function addStoneSegmentsZ(segments, x0, x1, y, bias = 0) {
            segments.forEach(([z0, z1]) => addStoneBand(x0, x1, z0, z1, y, bias));
        }

        function addRectBattlementsX(x0, x1, z0, z1, y) {
            for (let x = x0; x <= x1; x++) {
                if (x % 2 !== 0) continue;
                for (let z = z0; z <= z1; z++) {
                    addStone(x, y, z, 4);
                }
            }
        }

        function addRectBattlementsZ(z0, z1, x0, x1, y) {
            for (let z = z0; z <= z1; z++) {
                if (z % 2 !== 0) continue;
                for (let x = x0; x <= x1; x++) {
                    addStone(x, y, z, 4);
                }
            }
        }

        function isTowerSlit(x, y, z, cx, cz, radius) {
            if (!(y === 10 || y === 11 || y === 15 || y === 16)) return false;
            return (
                (x === cx && (z === cz - radius || z === cz + radius)) ||
                (z === cz && (x === cx - radius || x === cx + radius))
            );
        }

        function getTowerCellType(dist, y, topY, radius) {
            const isShell = dist >= radius - 0.85 && dist <= radius + 0.2;
            const isBaseFloor = y === 2 && dist <= radius - 1;
            const isTopFloor = y === topY && dist <= radius - 1.2;
            return { isShell, isBaseFloor, isTopFloor };
        }

        function addTowerCell(x, y, z, tower) {
            const dist = Math.hypot(x - tower.cx, z - tower.cz);
            const { isShell, isBaseFloor, isTopFloor } = getTowerCellType(dist, y, tower.topY, tower.radius);

            if (!isShell && !isBaseFloor && !isTopFloor) return;
            if (isShell && isTowerSlit(x, y, z, tower.cx, tower.cz, tower.radius)) return;

            if (isShell) {
                addStone(x, y, z, tower.bias);
                return;
            }

            builder.add("1x1", y === tower.topY ? palette.floorStone : palette.shadow, 0, x, y, z);
        }

        function addTowerLayer(cx, cz, radius, y, topY, bias) {
            const tower = { cx, cz, radius, topY, bias };
            const minX = cx - radius;
            const maxX = cx + radius;
            const minZ = cz - radius;
            const maxZ = cz + radius;

            for (let x = minX; x <= maxX; x++) {
                for (let z = minZ; z <= maxZ; z++) {
                    addTowerCell(x, y, z, tower);
                }
            }
        }

        function addTowerMerlons(cx, cz, radius, topY, bias) {
            const merlons = getEllipsePoints(
                { x: cx + 1, z: cz + 1 },
                { x: radius, z: radius },
                { count: radius >= 5 ? 24 : 20, offset: 0.25 },
            );

            merlons.forEach((point, index) => {
                if (index % 2 !== 0) return;
                addStone(point.lx, topY + 1, point.lz, bias + 1);
                if (radius >= 5 && index % 4 === 0) {
                    addStone(point.lx, topY + 2, point.lz, bias + 2);
                }
            });
        }

        function addTowerFlag(cx, cz, topY, flagColors) {
            addPillarStackSafe(builder, cx, topY + 1, cz, 3, palette.timber);
            builder.add("1x1", flagColors[0], 0, cx + 1, topY + 3, cz);
            builder.add("1x1", flagColors[0], 0, cx + 2, topY + 3, cz);
            builder.add("1x1", flagColors[1], 0, cx + 1, topY + 2, cz);
        }

        function addRoundTower(cx, cz, radius, topY, flagColors, bias = 0) {
            for (let y = 2; y <= topY; y++) {
                addTowerLayer(cx, cz, radius, y, topY, bias);
            }

            addTowerMerlons(cx, cz, radius, topY, bias);
            addTowerFlag(cx, cz, topY, flagColors);
        }

        function addBase() {
            addFilledRectSafe(builder, 0, 0, 0, 48, 4, palette.moat);
            addFilledRectSafe(builder, 0, 0, 40, 48, 4, palette.moat);
            addFilledRectSafe(builder, 0, 0, 4, 4, 36, palette.moat);
            addFilledRectSafe(builder, 44, 0, 4, 4, 36, palette.moat);
            addFilledRectSafe(builder, 4, 0, 4, 40, 36, palette.grass);

            addFilledRectSafe(builder, 4, 1, 4, 38, 36, palette.grass);
            addFilledRectSafe(builder, 42, 1, 4, 2, 16, palette.grass);
            addFilledRectSafe(builder, 42, 1, 24, 2, 16, palette.grass);
            addFilledRectSafe(builder, 42, 1, 20, 6, 4, palette.patio);

            addFilledRectSafe(builder, 12, 2, 18, 4, 6, palette.patio);
            addFilledRectSafe(builder, 20, 2, 10, 8, 4, palette.patio);
            addFilledRectSafe(builder, 20, 2, 30, 8, 4, palette.patio);

            [
                [13, 2, 17], [14, 2, 17], [15, 2, 18], [27, 2, 12], [28, 2, 13],
                [29, 2, 31], [30, 2, 31], [31, 2, 30], [36, 2, 23], [37, 2, 23],
            ].forEach(([x, y, z]) => builder.add("1x1", palette.floorStone, 0, x, y, z));
        }

        function addKeep() {
            const keepWindowRows = new Set([8, 9, 14, 15, 19, 20]);

            [8, 14, 19].forEach((y) => {
                builder.add("Window", palette.glass, 0, 23, y, 15);
                builder.add("Window", palette.glass, 0, 24, y, 27);
                builder.add("Window", palette.glass, 1, 17, y, 21);
                builder.add("Window", palette.glass, 1, 29, y, 22);
            });

            addFilledRectSafe(builder, 20, 2, 18, 8, 8, palette.floorStone);
            addFilledRectSafe(builder, 20, 10, 18, 8, 8, palette.floorStone);
            addFilledRectSafe(builder, 20, 18, 18, 8, 8, palette.floorStone);
            addFilledRectSafe(builder, 20, 29, 18, 8, 8, palette.floorStone);

            [
                [19, 18],
                [19, 25],
                [28, 18],
                [28, 25],
            ].forEach(([x, z]) => {
                addPillarStackSafe(builder, x, 3, z, 27, palette.timber);
            });

            for (let y = 2; y <= 22; y++) {
                if (keepWindowRows.has(y)) {
                    addStoneSegmentsX([[17, 22], [24, 30]], 15, 16, y, 1);
                    addStoneSegmentsX([[17, 23], [25, 30]], 27, 28, y, 2);
                    addStoneSegmentsZ([[17, 20], [22, 26]], 17, 18, y, 3);
                    addStoneSegmentsZ([[17, 21], [23, 26]], 29, 30, y, 4);
                    continue;
                }

                addStoneBand(17, 30, 15, 16, y, 1);
                addStoneBand(17, 30, 27, 28, y, 2);
                addStoneBand(17, 18, 17, 26, y, 3);
                addStoneBand(29, 30, 17, 26, y, 4);
            }

            for (let y = 23; y <= 25; y++) {
                addStoneBand(18, 29, 16, 17, y, 1);
                addStoneBand(18, 29, 26, 27, y, 2);
                addStoneBand(18, 19, 18, 25, y, 3);
                addStoneBand(28, 29, 18, 25, y, 4);
            }

            for (let y = 26; y <= 28; y++) {
                addStoneBand(19, 28, 17, 18, y, 1);
                addStoneBand(19, 28, 25, 26, y, 2);
                addStoneBand(19, 20, 19, 24, y, 3);
                addStoneBand(27, 28, 19, 24, y, 4);
            }

            addRectBattlementsX(19, 28, 17, 17, 29);
            addRectBattlementsX(19, 28, 26, 26, 29);
            addRectBattlementsZ(18, 25, 19, 19, 29);
            addRectBattlementsZ(18, 25, 28, 28, 29);

            [19, 23, 28].forEach((x) => {
                addStone(x, 30, 17, 6);
                addStone(x, 30, 26, 6);
            });
            [18, 22, 25].forEach((z) => {
                addStone(19, 30, z, 6);
                addStone(28, 30, z, 6);
            });

            addPillarStackSafe(builder, 24, 30, 22, 4, palette.timber);
            builder.add("1x1", palette.flagRed, 0, 25, 33, 22);
            builder.add("1x1", palette.flagRed, 0, 26, 33, 22);
            builder.add("1x1", palette.flagYellow, 0, 25, 32, 22);
            builder.add("1x1", palette.flagYellow, 0, 26, 31, 22);
        }

        function addCurtainWalls() {
            for (let y = 2; y <= 15; y++) {
                addStoneBand(10, 39, 5, 6, y, 1);
                addStoneBand(10, 39, 38, 39, y, 2);
                addStoneBand(5, 6, 10, 35, y, 3);
            }

            for (let y = 2; y <= 14; y++) {
                addStoneBand(41, 43, 13, 18, y, 4);
                addStoneBand(41, 43, 25, 30, y, 5);
            }

            addFilledRectSafe(builder, 10, 16, 5, 30, 2, palette.floorStone);
            addFilledRectSafe(builder, 10, 16, 38, 30, 2, palette.floorStone);
            addFilledRectSafe(builder, 5, 16, 10, 2, 26, palette.floorStone);

            addRectBattlementsX(10, 39, 5, 6, 17);
            addRectBattlementsX(10, 39, 38, 39, 17);
            addRectBattlementsZ(10, 35, 5, 6, 17);
            addRectBattlementsZ(13, 18, 41, 43, 15);
            addRectBattlementsZ(25, 30, 41, 43, 15);
        }

        function addGatehouse() {
            const gateWindowRows = new Set([8, 9]);

            builder.add("Window", palette.glass, 0, 35, 8, 18);
            builder.add("Window", palette.glass, 0, 38, 8, 24);

            for (let y = 2; y <= 11; y++) {
                if (gateWindowRows.has(y)) {
                    addStoneSegmentsX([[31, 34], [36, 43]], 18, 19, y, 5);
                    addStoneSegmentsX([[31, 37], [39, 43]], 24, 25, y, 6);
                } else {
                    addStoneBand(31, 43, 18, 19, y, 5);
                    addStoneBand(31, 43, 24, 25, y, 6);
                }

                addStoneBand(31, 32, 20, 23, y, 7);
                addStoneBand(42, 43, 20, 23, y, 8);

                if (y >= 8) {
                    addStoneBand(33, 41, 20, 23, y, 9);
                }
            }

            for (let x = 33; x <= 41; x++) {
                builder.add("Roof 1x2", palette.roofTile, 0, x, 12, 18);
                builder.add("Roof 1x2", palette.roofTile, 2, x, 12, 24);
                builder.add("Roof 1x2", palette.roofTile, 0, x, 13, 20);
                builder.add("Roof 1x2", palette.roofTile, 2, x, 13, 22);
                builder.add("1x1", palette.roofRidge, 0, x, 14, 21);
            }

            for (let x = 33; x <= 41; x++) {
                builder.add("1x1", palette.timber, 0, x, 11, 18);
                builder.add("1x1", palette.timber, 0, x, 11, 25);
            }

            for (let y = 2; y <= 7; y++) {
                [20, 21, 22, 23].forEach((z) => {
                    if ((y + z) % 2 !== 0) return;
                    builder.add("1x1", palette.iron, 0, 41, y, z);
                });
            }

            [
                [40, 8, 20], [39, 9, 20], [38, 10, 20],
                [40, 8, 23], [39, 9, 23], [38, 10, 23],
            ].forEach(([x, y, z]) => builder.add("1x1", palette.iron, 0, x, y, z));
        }

        function addBarbican() {
            addRoundTower(44, 22, 3, 14, [palette.flagRed, palette.flagYellow], 7);

            for (let y = 2; y <= 8; y++) {
                addStoneBand(43, 47, 20, 20, y, 7);
                addStoneBand(43, 47, 23, 23, y, 8);
                addStoneBand(43, 43, 21, 22, y, 9);
                addStoneBand(47, 47, 21, 22, y, 10);

                if (y >= 6) {
                    addStoneBand(44, 46, 21, 22, y, 11);
                }
            }
        }

        function addInteriorDetails() {
            addFilledRectSafe(builder, 12, 2, 28, 4, 4, palette.floorStone);

            [
                [13, 3, 29], [13, 4, 29], [14, 3, 30], [15, 3, 29],
            ].forEach(([x, y, z]) => builder.add("1x1", palette.barrel, 0, x, y, z));

            [
                [5, 2, 14], [5, 3, 14], [5, 4, 15], [6, 3, 16],
                [17, 2, 18], [17, 3, 18], [17, 4, 19], [41, 2, 28],
                [41, 3, 28], [42, 4, 29], [43, 3, 15], [43, 4, 15],
            ].forEach(([x, y, z]) => builder.add("1x1", palette.vine, 0, x, y, z));

            [
                [7, 1, 7], [8, 1, 8], [9, 1, 36], [10, 1, 35],
                [36, 1, 8], [37, 1, 9], [38, 1, 34], [39, 1, 33],
            ].forEach(([x, y, z], index) => {
                builder.add("1x1", index % 2 === 0 ? palette.flagYellow : palette.flagRed, 0, x, y, z);
            });
        }

        function addBannersAndFlags() {
            [
                [22, 9, 5, palette.flagRed], [22, 10, 5, palette.flagYellow], [22, 11, 5, palette.flagRed],
                [22, 9, 39, palette.flagYellow], [22, 10, 39, palette.flagRed], [22, 11, 39, palette.flagYellow],
                [43, 9, 19, palette.flagRed], [43, 10, 19, palette.flagYellow], [43, 11, 19, palette.flagRed],
                [43, 9, 24, palette.flagYellow], [43, 10, 24, palette.flagRed], [43, 11, 24, palette.flagYellow],
                [30, 17, 21, palette.flagRed], [30, 18, 21, palette.flagYellow], [30, 19, 21, palette.flagRed],
            ].forEach(([x, y, z, color]) => builder.add("1x1", color, 0, x, y, z));
        }

        addBase();
        addRoundTower(9, 9, 5, 21, [palette.flagRed, palette.flagYellow], 1);
        addRoundTower(9, 35, 5, 21, [palette.flagYellow, palette.flagRed], 2);
        addRoundTower(39, 9, 4, 18, [palette.flagRed, palette.flagYellow], 3);
        addRoundTower(39, 35, 4, 18, [palette.flagYellow, palette.flagRed], 4);
        addCurtainWalls();
        addKeep();
        addGatehouse();
        addBarbican();
        addInteriorDetails();
        addBannersAndFlags();

        return builder.blocks;
    })(),
};

export default CasteloNormando;