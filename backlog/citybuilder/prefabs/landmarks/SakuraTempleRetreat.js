import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

const SakuraTempleRetreat = {
    dx: 56,
    dy: 24,
    dz: 40,
    blocks: (function () {
        const builder = createPrefabBuilder();

        const palette = {
            base: "#151515",
            baseShadow: "#232323",
            grass: "#5a8a47",
            moss: "#476f39",
            water: "#45739a",
            waterDark: "#2d5375",
            path: "#c7baa1",
            stoneDark: "#555c66",
            stone: "#727b84",
            stoneLight: "#bcc3c9",
            wall: "#efe6d4",
            wallShadow: "#d7cab3",
            wood: "#8b5a2b",
            woodDark: "#5d3d28",
            roof: "#111111",
            roofDark: "#2a211d",
            gold: "#c89d35",
            lantern: "#e0c870",
            glass: "#9fb5c5",
            reed: "#6d8742",
            blossom: "#edc3d6",
            blossomLight: "#f5dbe7",
            blossomDark: "#d99fb9",
        };

        const pond = { x0: 14, z0: 11, width: 14, depth: 12 };
        const annex = {
            pad: { x0: 3, z0: 21, width: 15, depth: 13 },
            deck: { x0: 4, z0: 22, width: 12, depth: 3 },
            box: { x0: 5, z0: 24, width: 10, depth: 7 },
            roofBox: { x0: 3, z0: 21, width: 14, depth: 12 },
            floorY: 3,
            wallHeight: 2,
            ridge: "x",
            roofLevels: 2,
            windowXs: [7, 11],
            windowZs: [26, 28],
            extraPosts: [
                [8, 24], [11, 24],
                [8, 30], [11, 30],
            ],
            deckPosts: [5, 9, 13],
        };
        const main = {
            pad: { x0: 33, z0: 13, width: 20, depth: 19 },
            deck: { x0: 34, z0: 14, width: 18, depth: 4 },
            lower: { x0: 36, z0: 18, width: 14, depth: 12 },
            upper: { x0: 39, z0: 20, width: 8, depth: 8 },
            entryRoof: { x0: 34, z0: 13, width: 18, depth: 8 },
            mainRoof: { x0: 36, z0: 17, width: 16, depth: 16 },
            lowerFloorY: 3,
            upperFloorY: 7,
            lowerWallHeight: 3,
            upperWallHeight: 3,
            lowerWindowXs: [39, 43, 47],
            lowerWindowZs: [21, 24, 27],
            upperWindowXs: [41, 44],
            upperWindowZs: [22, 25],
            lowerExtraPosts: [
                [39, 18], [46, 18],
                [39, 29], [46, 29],
            ],
            upperExtraPosts: [
                [41, 20], [44, 20],
                [41, 27], [44, 27],
            ],
            deckPosts: [35, 40, 45, 50],
        };

        function addWindowRing(box, y, windowXs = [], windowZs = []) {
            const x1 = box.x0 + box.width - 1;
            const z1 = box.z0 + box.depth - 1;

            windowXs.forEach((lx) => {
                builder.add("Window", palette.glass, 1, lx, y, box.z0);
                builder.add("Window", palette.glass, 1, lx, y, z1);
            });

            windowZs.forEach((lz) => {
                builder.add("Window", palette.glass, 0, box.x0, y, lz);
                builder.add("Window", palette.glass, 0, x1, y, lz);
            });
        }

        function addFacadePosts(box, y0, height, extraPoints = []) {
            const x1 = box.x0 + box.width - 1;
            const z1 = box.z0 + box.depth - 1;
            const midX = Math.floor((box.x0 + x1) / 2);
            const midZ = Math.floor((box.z0 + z1) / 2);
            const points = [
                [box.x0, box.z0],
                [x1, box.z0],
                [box.x0, z1],
                [x1, z1],
                [midX, box.z0],
                [midX, z1],
                [box.x0, midZ],
                [x1, midZ],
                ...extraPoints,
            ];
            const seen = new Set();

            points.forEach(([lx, lz]) => {
                const key = `${lx},${lz}`;
                if (seen.has(key)) return;
                seen.add(key);
                addPillarStackSafe(builder, lx, y0, lz, height, palette.woodDark);
            });
        }

        function addTrimLine(box, y, color = palette.wood) {
            const x1 = box.x0 + box.width - 1;
            const z1 = box.z0 + box.depth - 1;

            for (let x = box.x0 + 1; x < x1; x += 2) {
                builder.add("1x1", color, 0, x, y, box.z0);
                builder.add("1x1", color, 0, x, y, z1);
            }

            for (let z = box.z0 + 1; z < z1; z += 2) {
                builder.add("1x1", color, 0, box.x0, y, z);
                builder.add("1x1", color, 0, x1, y, z);
            }
        }

        function addWallLayer(box, y, color) {
            addFilledRectSafe(builder, box.x0 + 1, y, box.z0, box.width - 2, 1, color);
            addFilledRectSafe(builder, box.x0 + 1, y, box.z0 + box.depth - 1, box.width - 2, 1, color);
            addFilledRectSafe(builder, box.x0, y, box.z0 + 1, 1, box.depth - 2, color);
            addFilledRectSafe(builder, box.x0 + box.width - 1, y, box.z0 + 1, 1, box.depth - 2, color);
            addFilledRectSafe(builder, box.x0 + 1, y, box.z0 + 1, box.width - 2, box.depth - 2, color);
        }

        function addRaisedPad(x0, z0, width, depth, y = 2, color = palette.stoneDark) {
            addFilledRectSafe(builder, x0, y, z0, width, depth, color);

            const x1 = x0 + width - 1;
            const z1 = z0 + depth - 1;

            for (let x = x0 + 1; x < x1; x += 4) {
                builder.add("1x1", palette.stoneLight, 0, x, y + 1, z0);
                builder.add("1x1", palette.stoneLight, 0, x, y + 1, z1);
            }

            for (let z = z0 + 1; z < z1; z += 4) {
                builder.add("1x1", palette.stone, 0, x0, y + 1, z);
                builder.add("1x1", palette.stone, 0, x1, y + 1, z);
            }
        }

        function addPebblePath(points, color = palette.path, y = 2) {
            points.forEach(([lx, lz, tile = false]) => {
                builder.add(tile ? "Tile 2x2" : "1x1", color, 0, lx, y, lz);
            });
        }

        function addStoneLantern(lx, lz, y0 = 2) {
            addPillarStackSafe(builder, lx, y0, lz, 2, palette.stone);
            builder.add("1x1", palette.stoneLight, 0, lx, y0 + 2, lz);
            builder.add("1x1", palette.lantern, 0, lx, y0 + 3, lz);
        }

        function addDeckRails(box, y) {
            const x1 = box.x0 + box.width - 1;
            const z1 = box.z0 + box.depth - 1;

            for (let x = box.x0 + 1; x < x1; x += 2) {
                builder.add("1x1", palette.woodDark, 0, x, y, box.z0);
            }

            for (let z = box.z0 + 1; z < z1; z += 2) {
                builder.add("1x1", palette.woodDark, 0, box.x0, y, z);
                builder.add("1x1", palette.woodDark, 0, x1, y, z);
            }
        }

        function addRoofStage(box, y, ridgeAxis = "x", levels = 2) {
            let topBox = null;
            let topY = y;

            for (let level = 0; level < levels; level++) {
                const roofBox = {
                    x0: box.x0 + level,
                    z0: box.z0 + level,
                    width: box.width - level * 2,
                    depth: box.depth - level * 2,
                };

                if (roofBox.width < 4 || roofBox.depth < 4) break;

                topBox = roofBox;
                topY = y + level;

                addFilledRectSafe(builder, roofBox.x0 + 1, topY - 1, roofBox.z0 + 1, roofBox.width - 2, roofBox.depth - 2, palette.roofDark);

                const x1 = roofBox.x0 + roofBox.width - 1;
                const z1 = roofBox.z0 + roofBox.depth - 1;
                const eaveY = topY - 1;

                for (let x = roofBox.x0 + 1; x <= x1 - 2; x += 2) {
                    builder.add("1x1", palette.woodDark, 0, x, eaveY, roofBox.z0 + 1);
                    builder.add("1x1", palette.woodDark, 0, x, eaveY, z1 - 1);
                }

                for (let z = roofBox.z0 + 2; z <= z1 - 2; z += 2) {
                    builder.add("1x1", palette.woodDark, 0, roofBox.x0 + 1, eaveY, z);
                    builder.add("1x1", palette.woodDark, 0, x1 - 1, eaveY, z);
                }

                for (let x = roofBox.x0; x <= x1 - 1; x += 2) {
                    builder.add("Roof 1x2", palette.roof, 0, x, topY, roofBox.z0);
                    builder.add("Roof 1x2", palette.roof, 2, x, topY, z1 - 1);
                }

                for (let z = roofBox.z0 + 2; z <= z1 - 2; z += 2) {
                    builder.add("Roof 1x2", palette.roof, 1, roofBox.x0, topY, z);
                    builder.add("Roof 1x2", palette.roof, 3, x1 - 1, topY, z);
                }

                if (level === 0 && roofBox.width > 10 && roofBox.depth > 8) {
                    const frontBandZ = roofBox.z0 + 2;
                    const backBandZ = z1 - 3;
                    for (let x = roofBox.x0 + 2; x <= x1 - 3; x += 4) {
                        builder.add("Tile 2x2", palette.roofDark, 0, x, topY, frontBandZ);
                        builder.add("Tile 2x2", palette.roofDark, 0, x, topY, backBandZ);
                    }

                    const leftBandX = roofBox.x0 + 2;
                    const rightBandX = x1 - 3;
                    for (let z = roofBox.z0 + 3; z <= z1 - 3; z += 4) {
                        builder.add("Tile 2x2", palette.roofDark, 0, leftBandX, topY, z);
                        builder.add("Tile 2x2", palette.roofDark, 0, rightBandX, topY, z);
                    }
                }
            }

            if (!topBox) return;

            const topX1 = topBox.x0 + topBox.width - 1;
            const topZ1 = topBox.z0 + topBox.depth - 1;

            if (ridgeAxis === "x") {
                const ridgeZ = topBox.z0 + Math.floor((topBox.depth - 2) / 2);
                for (let x = topBox.x0 + 1; x <= topBox.x0 + topBox.width - 3; x += 4) {
                    builder.add("Tile 2x2", palette.stoneLight, 0, x, topY, ridgeZ);
                }
                builder.add("1x1", palette.gold, 0, topBox.x0 + 1, topY + 1, ridgeZ);
                builder.add("1x1", palette.gold, 0, topBox.x0 + topBox.width - 2, topY + 1, ridgeZ);
            } else {
                const ridgeX = topBox.x0 + Math.floor((topBox.width - 2) / 2);
                for (let z = topBox.z0 + 1; z <= topBox.z0 + topBox.depth - 3; z += 4) {
                    builder.add("Tile 2x2", palette.stoneLight, 0, ridgeX, topY, z);
                }
                builder.add("1x1", palette.gold, 0, ridgeX, topY + 1, topBox.z0 + 1);
                builder.add("1x1", palette.gold, 0, ridgeX, topY + 1, topBox.z0 + topBox.depth - 2);
            }

            builder.add("1x1", palette.roofDark, 0, topBox.x0 + 1, topY + 1, topBox.z0 + 1);
            builder.add("1x1", palette.roofDark, 0, topX1 - 1, topY + 1, topBox.z0 + 1);
            builder.add("1x1", palette.roofDark, 0, topBox.x0 + 1, topY + 1, topZ1 - 1);
            builder.add("1x1", palette.roofDark, 0, topX1 - 1, topY + 1, topZ1 - 1);
        }

        function addGable(box, baseY, height, face = "front") {
            const z = face === "front" ? box.z0 + 2 : box.z0 + box.depth - 3;

            for (let step = 0; step < height; step++) {
                const startX = box.x0 + 2 + step;
                const endX = box.x0 + box.width - 3 - step;
                if (startX > endX) break;

                for (let x = startX; x <= endX; x++) {
                    const color = x === startX || x === endX || step === height - 1 ? palette.woodDark : palette.wall;
                    builder.add("1x1", color, 0, x, baseY + step, z);
                }
            }

            builder.add("1x1", palette.stoneLight, 0, box.x0 + Math.floor(box.width / 2), baseY + height, z);
        }

        function addBuildingShell(config) {
            addWindowRing(config.box, config.floorY + 1, config.windowXs, config.windowZs);
            addFilledRectSafe(builder, config.box.x0, config.floorY, config.box.z0, config.box.width, config.box.depth, palette.woodDark);
            addFacadePosts(config.box, config.floorY, config.wallHeight + 1, config.extraPosts);
            addTrimLine(config.box, config.floorY + 1);
            addTrimLine(config.box, config.floorY + config.wallHeight, palette.woodDark);

            for (let offset = 1; offset <= config.wallHeight; offset++) {
                addWallLayer(config.box, config.floorY + offset, offset === config.wallHeight ? palette.wallShadow : palette.wall);
            }
        }

        function addPond() {
            addFilledRectSafe(builder, pond.x0, 2, pond.z0, pond.width, pond.depth, palette.water);
            addFilledRectSafe(builder, pond.x0 + 2, 3, pond.z0 + 2, pond.width - 4, pond.depth - 4, palette.waterDark);

            addPebblePath([
                [12, 10, true], [14, 9, true], [18, 9], [22, 9, true], [26, 10, true], [28, 12],
                [29, 16, true], [29, 20], [27, 23, true], [23, 24], [18, 24, true], [14, 23],
                [12, 21, true], [11, 17], [11, 13, true],
            ], palette.stone, 2);

            [
                [18, 14], [22, 15], [20, 19],
            ].forEach(([lx, lz]) => {
                builder.add("Tile 2x2", palette.grass, 0, lx, 3, lz);
            });

            [
                [14, 13], [14, 20], [16, 11], [25, 11], [27, 14], [27, 20], [20, 22], [24, 22],
            ].forEach(([lx, lz], index) => {
                builder.add("1x1", index % 2 === 0 ? palette.reed : palette.moss, 0, lx, 3, lz);
                builder.add("1x1", palette.reed, 0, lx, 4, lz);
            });
        }

        function addSakuraTree(x0, z0) {
            addPillarStackSafe(builder, x0, 2, z0, 8, palette.woodDark);
            addPillarStackSafe(builder, x0 + 1, 2, z0, 6, palette.wood);

            [
                [x0 - 1, 4, z0],
                [x0 + 2, 5, z0 + 1],
                [x0 - 1, 6, z0 - 1],
                [x0 + 1, 7, z0 - 2],
                [x0 + 2, 8, z0 - 1],
                [x0 - 2, 8, z0 + 1],
                [x0 + 1, 8, z0 + 2],
            ].forEach(([lx, ly, lz]) => {
                builder.add("1x1", palette.woodDark, 0, lx, ly, lz);
            });

            const canopyLayers = [
                {
                    y: 8,
                    points: [
                        [x0 - 4, z0 - 2], [x0 - 2, z0 - 4], [x0, z0 - 4], [x0 + 2, z0 - 2],
                        [x0 - 4, z0], [x0 - 2, z0], [x0, z0], [x0 + 2, z0], [x0 + 4, z0],
                        [x0 - 2, z0 + 2], [x0, z0 + 2], [x0 + 2, z0 + 2],
                    ],
                },
                {
                    y: 9,
                    points: [
                        [x0 - 4, z0 - 2], [x0 - 2, z0 - 2], [x0, z0 - 2], [x0 + 2, z0 - 2], [x0 + 4, z0 - 2],
                        [x0 - 4, z0], [x0 - 2, z0], [x0, z0], [x0 + 2, z0], [x0 + 4, z0],
                        [x0 - 2, z0 + 2], [x0, z0 + 2], [x0 + 2, z0 + 2],
                    ],
                },
                {
                    y: 10,
                    points: [
                        [x0 - 2, z0 - 2], [x0, z0 - 2], [x0 + 2, z0 - 2],
                        [x0 - 2, z0], [x0, z0], [x0 + 2, z0],
                        [x0, z0 + 2],
                    ],
                },
            ];

            canopyLayers.forEach((layer, layerIndex) => {
                layer.points.forEach(([lx, lz], pointIndex) => {
                    const color = (layerIndex + pointIndex) % 3 === 0
                        ? palette.blossomDark
                        : ((layerIndex + pointIndex) % 2 === 0 ? palette.blossom : palette.blossomLight);
                    builder.add("2x2", color, 0, lx, layer.y, lz);
                });
            });

            [
                [x0 - 3, 2, z0 + 4], [x0 - 1, 2, z0 + 5], [x0 + 1, 2, z0 + 5],
                [x0 + 4, 2, z0 + 2], [x0 - 5, 3, z0 + 1],
            ].forEach(([lx, ly, lz], index) => {
                builder.add("1x1", index % 2 === 0 ? palette.blossom : palette.blossomLight, 0, lx, ly, lz);
            });
        }

        addFilledRectSafe(builder, 0, 0, 0, 56, 40, palette.base);

        addFilledRectSafe(builder, 0, 1, 0, 56, 2, palette.baseShadow);
        addFilledRectSafe(builder, 0, 1, 38, 56, 2, palette.baseShadow);
        addFilledRectSafe(builder, 0, 1, 2, 2, 36, palette.baseShadow);
        addFilledRectSafe(builder, 54, 1, 2, 2, 36, palette.baseShadow);

        addFilledRectSafe(builder, 2, 1, 2, 20, 12, palette.moss);
        addFilledRectSafe(builder, 22, 1, 2, 32, 12, palette.grass);
        addFilledRectSafe(builder, 2, 1, 14, 18, 24, palette.grass);
        addFilledRectSafe(builder, 20, 1, 14, 34, 24, palette.moss);

        addPond();

        addRaisedPad(annex.pad.x0, annex.pad.z0, annex.pad.width, annex.pad.depth, 2, palette.stoneDark);
        addFilledRectSafe(builder, annex.deck.x0, 3, annex.deck.z0, annex.deck.width, annex.deck.depth, palette.woodDark);
        annex.deckPosts.forEach((lx) => {
            addPillarStackSafe(builder, lx, 3, 23, 3, palette.woodDark);
        });
        addDeckRails(annex.deck, 5);
        addBuildingShell({
            box: annex.box,
            floorY: annex.floorY,
            wallHeight: annex.wallHeight,
            windowXs: annex.windowXs,
            windowZs: annex.windowZs,
            extraPosts: annex.extraPosts,
        });
        addRoofStage(annex.roofBox, 6, annex.ridge, annex.roofLevels);
        addGable(annex.roofBox, 6, 2, "front");
        addGable(annex.roofBox, 6, 2, "back");

        addRaisedPad(main.pad.x0, main.pad.z0, main.pad.width, main.pad.depth, 2, palette.stoneDark);
        addFilledRectSafe(builder, main.deck.x0, 3, main.deck.z0, main.deck.width, main.deck.depth, palette.woodDark);
        main.deckPosts.forEach((lx) => {
            addPillarStackSafe(builder, lx, 3, 16, 4, palette.woodDark);
        });
        addDeckRails(main.deck, 5);
        addBuildingShell({
            box: main.lower,
            floorY: main.lowerFloorY,
            wallHeight: main.lowerWallHeight,
            windowXs: main.lowerWindowXs,
            windowZs: main.lowerWindowZs,
            extraPosts: main.lowerExtraPosts,
        });
        addBuildingShell({
            box: main.upper,
            floorY: main.upperFloorY,
            wallHeight: main.upperWallHeight,
            windowXs: main.upperWindowXs,
            windowZs: main.upperWindowZs,
            extraPosts: main.upperExtraPosts,
        });
        addRoofStage(main.entryRoof, 7, "x", 2);
        addGable(main.entryRoof, 7, 2, "front");
        addGable(main.entryRoof, 7, 2, "back");
        addRoofStage(main.mainRoof, 11, "x", 3);
        addGable(main.mainRoof, 11, 3, "front");
        addGable(main.mainRoof, 11, 3, "back");

        [
            [38, 6, 17], [41, 6, 17], [44, 6, 17], [47, 6, 17],
            [40, 10, 19], [45, 10, 19], [40, 10, 30], [45, 10, 30],
        ].forEach(([lx, ly, lz]) => {
            builder.add("1x1", palette.woodDark, 0, lx, ly, lz);
        });

        addSakuraTree(23, 29);

        addStoneLantern(18, 25, 2);
        addStoneLantern(29, 22, 2);
        addStoneLantern(34, 26, 2);
        addStoneLantern(11, 28, 2);

        addPebblePath([
            [11, 27, true], [13, 26], [15, 25, true], [17, 24], [19, 23, true], [21, 22],
            [24, 21, true], [28, 21], [31, 21, true], [35, 20], [38, 19, true], [42, 19],
            [45, 19, true],
        ]);

        addPebblePath([
            [24, 32, true], [25, 30], [24, 28], [22, 26, true], [20, 24], [18, 22, true],
            [16, 20], [14, 18, true],
        ], palette.path, 2);

        addPebblePath([
            [30, 28], [32, 29], [34, 30], [36, 31], [38, 32], [40, 33],
        ], palette.blossomLight, 2);

        [
            [9, 24], [12, 31], [17, 27], [31, 17], [33, 19], [37, 23], [44, 24], [48, 28],
        ].forEach(([lx, lz], index) => {
            builder.add("1x1", index % 2 === 0 ? palette.stone : palette.stoneLight, 0, lx, 2, lz);
        });

        return builder.blocks;
    })(),
};

export default SakuraTempleRetreat;