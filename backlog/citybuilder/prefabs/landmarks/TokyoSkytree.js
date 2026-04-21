import { addFilledRect } from "../shared/core.js";

const TokyoSkytree = {
        dx: 16,
        dy: 60,
        dz: 16,
        blocks: (function () {
            const b = [];
            const ivory = "#f4f4f4";
            const dark = "#111111";
            const blue = "#0055bf";
            const gold = "#f2cd37";
            const center = 7;

            function addCoreColumn(yStart, yEnd, color) {
                for (let y = yStart; y <= yEnd; y++) {
                    b.push({ type: "2x2", color, rot: 0, lx: center, ly: y, lz: center });
                }
            }

            function addBraceRing(low, high, y, color) {
                if (high - low < 4) return;
                addFilledRect(b, low + 2, y, low, high - low - 2, 2, color);
                addFilledRect(b, low + 2, y, high, high - low - 2, 2, color);
                addFilledRect(b, low, y, low + 2, 2, high - low - 2, color);
                addFilledRect(b, high, y, low + 2, 2, high - low - 2, color);
            }

            function addTaperSection(yStart, yEnd, lowBase, stepEvery, color) {
                for (let y = yStart; y <= yEnd; y++) {
                    const offset = Math.floor((y - yStart) / stepEvery);
                    const low = Math.min(6, lowBase + offset);
                    const high = 14 - low;

                    [
                        [low, low],
                        [high, low],
                        [low, high],
                        [high, high],
                    ].forEach(([lx, lz]) => {
                        b.push({ type: "2x2", color, rot: 0, lx, ly: y, lz });
                    });

                    if ((y - yStart) % 4 === 0) {
                        addBraceRing(low, high, y, dark);
                    }
                }
            }

            function addDeck(x0, z0, size, floorY, accentColor) {
                const x1 = x0 + size - 1;
                const z1 = z0 + size - 1;

                addFilledRect(b, x0, floorY, z0, size, size, ivory);
                addFilledRect(b, x0 + 2, floorY + 2, z0 + 2, size - 4, size - 4, dark);
                addFilledRect(b, x0 + 2, floorY + 3, z0 + 2, size - 4, size - 4, dark);

                for (let x = x0; x <= x1 - 1; x += 2) {
                    b.push({ type: "Window", color: accentColor, rot: 1, lx: x, ly: floorY + 1, lz: z0 });
                    b.push({ type: "Window", color: accentColor, rot: 1, lx: x, ly: floorY + 1, lz: z1 });
                }

                for (let z = z0 + 2; z <= z1 - 2; z += 2) {
                    b.push({ type: "Window", color: accentColor, rot: 0, lx: x0, ly: floorY + 1, lz: z });
                    b.push({ type: "Window", color: accentColor, rot: 0, lx: x1, ly: floorY + 1, lz: z });
                }

                for (let x = x0 + 1; x <= x1 - 1; x += 2) {
                    b.push({ type: "Tile 2x2", color: accentColor, rot: 0, lx: x, ly: floorY + 4, lz: z0 + 1 });
                    b.push({ type: "Tile 2x2", color: accentColor, rot: 0, lx: x, ly: floorY + 4, lz: z1 - 1 });
                }

                for (let z = z0 + 1; z <= z1 - 1; z += 2) {
                    b.push({ type: "Tile 2x2", color: accentColor, rot: 0, lx: x0 + 1, ly: floorY + 4, lz: z });
                    b.push({ type: "Tile 2x2", color: accentColor, rot: 0, lx: x1 - 1, ly: floorY + 4, lz: z });
                }

                [
                    [center, z0],
                    [center, z1 - 1],
                    [x0, center],
                    [x1 - 1, center],
                ].forEach(([lx, lz]) => {
                    b.push({ type: "2x2", color: accentColor, rot: 0, lx, ly: floorY + 3, lz });
                });

                [
                    [x0 + 1, z0 + 1],
                    [x1, z0 + 1],
                    [x0 + 1, z1],
                    [x1, z1],
                ].forEach(([lx, lz]) => {
                    b.push({ type: "1x1", color: gold, rot: 0, lx, ly: floorY + 4, lz });
                });
            }

            addFilledRect(b, 1, 0, 1, 14, 14, dark);
            addTaperSection(1, 20, 1, 7, ivory);
            addCoreColumn(1, 20, dark);

            addDeck(2, 2, 12, 21, blue);

            addTaperSection(25, 40, 4, 8, ivory);
            addCoreColumn(25, 40, dark);

            addDeck(3, 3, 10, 41, blue);

            addTaperSection(45, 53, 5, 5, ivory);
            addCoreColumn(45, 53, dark);

            [
                [6, 7],
                [8, 7],
                [7, 6],
                [7, 8],
            ].forEach(([lx, lz]) => {
                b.push({ type: "1x1", color: blue, rot: 0, lx, ly: 52, lz });
            });

            b.push({ type: "Pillar", color: ivory, rot: 0, lx: center, ly: 54, lz: center });
            b.push({ type: "1x1", color: blue, rot: 0, lx: center, ly: 57, lz: center });
            b.push({ type: "1x1", color: gold, rot: 0, lx: center, ly: 58, lz: center });
            b.push({ type: "1x1", color: gold, rot: 0, lx: center, ly: 59, lz: center });

            return b;
        })(),
    };

export default TokyoSkytree;
