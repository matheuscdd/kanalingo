import { addFilledRect, addPillarStack } from "../shared/core.js";

const SCALE = 2;
const BASE_DX = 18;
const BASE_DY = 40;
const BASE_DZ = 18;

const BigBen = {
    dx: BASE_DX * SCALE,
    dy: BASE_DY * SCALE,
    dz: BASE_DZ * SCALE,
        blocks: (function () {
            const b = [];
            const stone = "#b89b5c";
            const shadow = "#8c7340";
            const trim = "#f4f4f4";
            const clock = "#fff1c7";
            const dark = "#111111";
            const gold = "#f2cd37";
            const roof = "#4a4a4a";

            function key(x, z) {
                return `${x},${z}`;
            }

            function addColumn(lx, y0, lz, height, color) {
                addPillarStack(b, lx, y0, lz, height, color);
            }

            function addWallLevel(x0, z0, width, depth, y, color, skip = new Set()) {
                const x1 = x0 + width - 1;
                const z1 = z0 + depth - 1;

                for (let x = x0 + 1; x < x1; x++) {
                    if (!skip.has(key(x, z0))) b.push({ type: "1x1", color, rot: 0, lx: x, ly: y, lz: z0 });
                    if (!skip.has(key(x, z1))) b.push({ type: "1x1", color, rot: 0, lx: x, ly: y, lz: z1 });
                }

                for (let z = z0 + 1; z < z1; z++) {
                    if (!skip.has(key(x0, z))) b.push({ type: "1x1", color, rot: 0, lx: x0, ly: y, lz: z });
                    if (!skip.has(key(x1, z))) b.push({ type: "1x1", color, rot: 0, lx: x1, ly: y, lz: z });
                }
            }

            function addTrimLevel(x0, z0, width, depth, y, color) {
                const x1 = x0 + width - 1;
                const z1 = z0 + depth - 1;

                for (let x = x0 + 1; x < x1; x += 2) {
                    b.push({ type: "1x1", color, rot: 0, lx: x, ly: y, lz: z0 });
                    b.push({ type: "1x1", color, rot: 0, lx: x, ly: y, lz: z1 });
                }

                for (let z = z0 + 1; z < z1; z += 2) {
                    b.push({ type: "1x1", color, rot: 0, lx: x0, ly: y, lz: z });
                    b.push({ type: "1x1", color, rot: 0, lx: x1, ly: y, lz: z });
                }
            }

            function addSkipCells(skip, cells) {
                cells.forEach(([x, z]) => skip.add(key(x, z)));
            }

            function addClockStud(target, axis, fixedCoord, u, y, color) {
                if (axis === "z") {
                    target.push({ type: "1x1", color, rot: 0, lx: u, ly: y, lz: fixedCoord });
                    return;
                }

                target.push({ type: "1x1", color, rot: 0, lx: fixedCoord, ly: y, lz: u });
            }

            function addClockStuds(target, axis, fixedCoord, studs, color) {
                studs.forEach(([u, y]) => addClockStud(target, axis, fixedCoord, u, y, color));
            }

            function addClockFace(target, axis, fixedCoord) {
                addClockStuds(
                    target,
                    axis,
                    fixedCoord,
                    [
                        [17, 35],
                        [18, 35],
                        [20, 36],
                        [21, 37],
                        [22, 39],
                        [22, 40],
                        [21, 42],
                        [20, 43],
                        [18, 44],
                        [17, 44],
                        [15, 43],
                        [14, 42],
                        [13, 40],
                        [13, 39],
                        [14, 37],
                        [15, 36],
                    ],
                    gold,
                );

                addClockStuds(
                    target,
                    axis,
                    fixedCoord,
                    [
                        [18, 40],
                        [18, 39],
                        [18, 38],
                        [18, 37],
                        [19, 40],
                        [20, 40],
                    ],
                    dark,
                );
            }

            function addRoofLayer(x0, z0, width, depth, y, color) {
                const x1 = x0 + width - 1;
                const z1 = z0 + depth - 1;

                for (let x = x0; x <= x1; x++) {
                    b.push({ type: "Roof 1x2", color, rot: 0, lx: x, ly: y, lz: z0 - 1 });
                    b.push({ type: "Roof 1x2", color, rot: 2, lx: x, ly: y, lz: z1 });
                }

                for (let z = z0; z <= z1 - 1; z++) {
                    b.push({ type: "Roof 1x2", color, rot: 1, lx: x0 - 1, ly: y, lz: z });
                    b.push({ type: "Roof 1x2", color, rot: 3, lx: x1, ly: y, lz: z });
                }
            }

            function addScaledCopies(target, block, type, rot, xOffsets, yOffsets, zOffsets) {
                const baseX = block.lx * SCALE;
                const baseY = block.ly * SCALE;
                const baseZ = block.lz * SCALE;

                yOffsets.forEach((offsetY) => {
                    xOffsets.forEach((offsetX) => {
                        zOffsets.forEach((offsetZ) => {
                            target.push({
                                type,
                                color: block.color,
                                rot,
                                lx: baseX + offsetX,
                                ly: baseY + offsetY,
                                lz: baseZ + offsetZ,
                            });
                        });
                    });
                });
            }

            function scaleBlock1x1(target, block) {
                addScaledCopies(target, block, "2x2", 0, [0], [0, 1], [0]);
            }

            function scaleBlock2x2(target, block) {
                addScaledCopies(target, block, "2x2", 0, [0, 2], [0, 1], [0, 2]);
            }

            function scaleBlock2x4(target, block) {
                const xOffsets = block.rot % 2 === 0 ? [0, 2] : [0, 4];
                const zOffsets = block.rot % 2 === 0 ? [0, 4] : [0, 2];
                addScaledCopies(target, block, "2x4", block.rot, xOffsets, [0, 1], zOffsets);
            }

            function scaleBlockWindow(target, block) {
                const xOffsets = block.rot % 2 === 0 ? [0, 1] : [0, 2];
                const zOffsets = block.rot % 2 === 0 ? [0, 2] : [0, 1];
                addScaledCopies(target, block, "Window", block.rot, xOffsets, [0, 2], zOffsets);
            }

            function scaleBlockPillar(target, block) {
                addScaledCopies(target, block, "Pillar", 0, [0, 1], [0, 3], [0, 1]);
            }

            function scaleBlockRoof(target, block) {
                const xOffsets = block.rot % 2 === 0 ? [0, 1] : [0, 2];
                const zOffsets = block.rot % 2 === 0 ? [0, 2] : [0, 1];
                addScaledCopies(target, block, "Roof 1x2", block.rot, xOffsets, [0, 1], zOffsets);
            }

            function scaleBlocks(blocks) {
                const scaled = [];
                const scaleHandlers = {
                    "1x1": scaleBlock1x1,
                    "2x2": scaleBlock2x2,
                    "2x4": scaleBlock2x4,
                    Window: scaleBlockWindow,
                    Pillar: scaleBlockPillar,
                    "Roof 1x2": scaleBlockRoof,
                };

                blocks.forEach((block) => {
                    scaleHandlers[block.type]?.(scaled, block);
                });

                return scaled;
            }

            addFilledRect(b, 1, 0, 1, 16, 16, dark);
            addFilledRect(b, 2, 1, 2, 14, 14, shadow);
            addFilledRect(b, 3, 2, 3, 12, 12, stone);
            addTrimLevel(3, 3, 12, 12, 3, trim);

            [
                [4, 4],
                [13, 4],
                [4, 13],
                [13, 13],
            ].forEach(([lx, lz]) => addColumn(lx, 3, lz, 13, shadow));

            addFilledRect(b, 5, 3, 5, 8, 8, shadow);
            [
                [5, 5],
                [12, 5],
                [5, 12],
                [12, 12],
            ].forEach(([lx, lz]) => addColumn(lx, 4, lz, 12, stone));

            for (let y = 4; y < 16; y++) {
                const skip = new Set();

                if (y >= 4 && y <= 5) {
                    addSkipCells(skip, [
                        [7, 5],
                        [8, 5],
                    ]);
                }

                if ((y >= 7 && y <= 8) || (y >= 11 && y <= 12)) {
                    addSkipCells(skip, [
                        [7, 5],
                        [8, 5],
                        [7, 12],
                        [8, 12],
                        [5, 7],
                        [5, 8],
                        [12, 7],
                        [12, 8],
                    ]);
                }

                addWallLevel(5, 5, 8, 8, y, stone, skip);

                if (y === 6 || y === 10 || y === 14) {
                    addTrimLevel(5, 5, 8, 8, y, trim);
                }
            }

            b.push({ type: "Window", color: dark, rot: 1, lx: 7, ly: 4, lz: 5 });

            [7, 11].forEach((y) => {
                b.push({ type: "Window", color: trim, rot: 1, lx: 7, ly: y, lz: 5 });
                b.push({ type: "Window", color: trim, rot: 1, lx: 7, ly: y, lz: 12 });
                b.push({ type: "Window", color: trim, rot: 0, lx: 5, ly: y, lz: 7 });
                b.push({ type: "Window", color: trim, rot: 0, lx: 12, ly: y, lz: 7 });
            });

            addFilledRect(b, 4, 16, 4, 10, 10, shadow);
            [
                [4, 4],
                [13, 4],
                [4, 13],
                [13, 13],
            ].forEach(([lx, lz]) => addColumn(lx, 17, lz, 8, stone));

            for (let y = 17; y < 25; y++) {
                const skip = new Set();

                if (y >= 18 && y <= 21) {
                    addSkipCells(skip, [
                        [7, 4],
                        [8, 4],
                        [9, 4],
                        [10, 4],
                        [7, 13],
                        [8, 13],
                        [9, 13],
                        [10, 13],
                        [4, 7],
                        [4, 8],
                        [4, 9],
                        [4, 10],
                        [13, 7],
                        [13, 8],
                        [13, 9],
                        [13, 10],
                    ]);
                }

                addWallLevel(4, 4, 10, 10, y, stone, skip);

                if (y === 17 || y === 22 || y === 24) {
                    addTrimLevel(4, 4, 10, 10, y, trim);
                }
            }

            [18, 20].forEach((y) => {
                [7, 9].forEach((lx) => {
                    b.push({ type: "Window", color: clock, rot: 1, lx, ly: y, lz: 4 });
                    b.push({ type: "Window", color: clock, rot: 1, lx, ly: y, lz: 13 });
                });

                [7, 9].forEach((lz) => {
                    b.push({ type: "Window", color: clock, rot: 0, lx: 4, ly: y, lz });
                    b.push({ type: "Window", color: clock, rot: 0, lx: 13, ly: y, lz });
                });
            });

            [
                [5, 5],
                [12, 5],
                [5, 12],
                [12, 12],
            ].forEach(([lx, lz]) => {
                b.push({ type: "1x1", color: gold, rot: 0, lx, ly: 24, lz });
                b.push({ type: "1x1", color: trim, rot: 0, lx, ly: 25, lz });
            });

            addFilledRect(b, 6, 25, 6, 6, 6, shadow);
            [
                [6, 6],
                [11, 6],
                [6, 11],
                [11, 11],
            ].forEach(([lx, lz]) => addColumn(lx, 26, lz, 6, stone));

            for (let y = 26; y < 32; y++) {
                const skip = new Set();

                if (y >= 27 && y <= 28) {
                    addSkipCells(skip, [
                        [8, 6],
                        [9, 6],
                        [8, 11],
                        [9, 11],
                        [6, 8],
                        [6, 9],
                        [11, 8],
                        [11, 9],
                    ]);
                }

                addWallLevel(6, 6, 6, 6, y, stone, skip);

                if (y === 29 || y === 31) {
                    addTrimLevel(6, 6, 6, 6, y, trim);
                }
            }

            b.push({ type: "Window", color: trim, rot: 1, lx: 8, ly: 27, lz: 6 });
            b.push({ type: "Window", color: trim, rot: 1, lx: 8, ly: 27, lz: 11 });
            b.push({ type: "Window", color: trim, rot: 0, lx: 6, ly: 27, lz: 8 });
            b.push({ type: "Window", color: trim, rot: 0, lx: 11, ly: 27, lz: 8 });

            [
                [6, 6],
                [11, 6],
                [6, 11],
                [11, 11],
            ].forEach(([lx, lz]) => b.push({ type: "1x1", color: gold, rot: 0, lx, ly: 32, lz }));

            addRoofLayer(6, 6, 6, 6, 32, roof);
            addRoofLayer(7, 7, 4, 4, 33, roof);

            b.push({ type: "2x2", color: roof, rot: 0, lx: 8, ly: 34, lz: 8 });
            b.push({ type: "Pillar", color: stone, rot: 0, lx: 8, ly: 35, lz: 8 });
            b.push({ type: "1x1", color: gold, rot: 0, lx: 8, ly: 38, lz: 8 });
            b.push({ type: "1x1", color: gold, rot: 0, lx: 8, ly: 39, lz: 8 });

            const scaled = scaleBlocks(b);

            addClockFace(scaled, "z", 7);
            addClockFace(scaled, "z", 28);
            addClockFace(scaled, "x", 7);
            addClockFace(scaled, "x", 28);

            return scaled;
        })(),
    };

export default BigBen;
