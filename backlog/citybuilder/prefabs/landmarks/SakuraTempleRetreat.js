import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

const SakuraTempleRetreat = {
    dx: 40,
    dy: 18,
    dz: 30,
    blocks: (function () {
        const builder = createPrefabBuilder();

        const palette = {
            grass: "#2f8f46",
            moss: "#237841",
            water: "#2f5f93",
            path: "#b8b1a2",
            stoneDark: "#4f5761",
            stone: "#6a737c",
            stoneLight: "#bfc5cb",
            wall: "#f0eadc",
            wallShadow: "#d9cfbb",
            wood: "#8b5a2b",
            woodDark: "#684a2f",
            roof: "#111111",
            roofDark: "#241916",
            gold: "#f2cd37",
            red: "#c52323",
            lantern: "#d7bb6a",
            glass: "#9eb6c4",
            blossom: "#efc5d8",
            blossomLight: "#f6dbe6",
            blossomDark: "#dba0ba",
        };

        const terraceLayers = [
            { x0: 18, z0: 10, width: 20, depth: 18, y: 1, color: palette.stoneDark },
            { x0: 20, z0: 11, width: 18, depth: 16, y: 2, color: palette.stoneDark },
            { x0: 22, z0: 12, width: 16, depth: 14, y: 3, color: palette.stone },
            { x0: 24, z0: 13, width: 12, depth: 12, y: 4, color: palette.stoneLight },
        ];

        const house = {
            box: { x0: 24, z0: 14, width: 12, depth: 8 },
            roofBox: { x0: 21, z0: 11, width: 18, depth: 14 },
            floorY: 5,
            ridge: "x",
            roofLevels: 3,
            windowXs: [26, 31],
            windowZs: [16, 18],
            extraPosts: [
                [27, 14], [32, 14],
                [27, 21], [32, 21],
            ],
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
            const seen = new Set();
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

        function addRoofStage(box, y, ridgeAxis = "x", levels = 2) {
            let topY = y;
            let topBox = null;

            for (let level = 0; level < levels; level++) {
                const roofBox = {
                    x0: box.x0 + level,
                    z0: box.z0 + level,
                    width: box.width - level * 2,
                    depth: box.depth - level * 2,
                };

                if (roofBox.width < 2 || roofBox.depth < 2) break;

                topY = y + level;
                topBox = roofBox;

                if (roofBox.width > 2 && roofBox.depth > 2) {
                    addFilledRectSafe(builder, roofBox.x0 + 1, topY - 1, roofBox.z0 + 1, roofBox.width - 2, roofBox.depth - 2, palette.roofDark);
                }

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

                if (level === 0 && roofBox.width > 8 && roofBox.depth > 8) {
                    if (ridgeAxis === "x") {
                        const frontBandZ = roofBox.z0 + 3;
                        const backBandZ = z1 - 4;
                        for (let x = roofBox.x0 + 2; x <= x1 - 3; x += 4) {
                            builder.add("Tile 2x2", palette.roofDark, 0, x, topY, frontBandZ);
                            builder.add("Tile 2x2", palette.roofDark, 0, x, topY, backBandZ);
                        }
                    } else {
                        const leftBandX = roofBox.x0 + 3;
                        const rightBandX = x1 - 4;
                        for (let z = roofBox.z0 + 2; z <= z1 - 3; z += 4) {
                            builder.add("Tile 2x2", palette.roofDark, 0, leftBandX, topY, z);
                            builder.add("Tile 2x2", palette.roofDark, 0, rightBandX, topY, z);
                        }
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
                builder.add("1x1", palette.roofDark, 0, topBox.x0 + 1, topY + 1, topBox.z0 + 1);
                builder.add("1x1", palette.roofDark, 0, topX1 - 1, topY + 1, topBox.z0 + 1);
                builder.add("1x1", palette.roofDark, 0, topBox.x0 + 1, topY + 1, topZ1 - 1);
                builder.add("1x1", palette.roofDark, 0, topX1 - 1, topY + 1, topZ1 - 1);
            } else {
                const ridgeX = topBox.x0 + Math.floor((topBox.width - 2) / 2);
                for (let z = topBox.z0 + 1; z <= topBox.z0 + topBox.depth - 3; z += 4) {
                    builder.add("Tile 2x2", palette.stoneLight, 0, ridgeX, topY, z);
                }
                builder.add("1x1", palette.gold, 0, ridgeX, topY + 1, topBox.z0 + 1);
                builder.add("1x1", palette.gold, 0, ridgeX, topY + 1, topBox.z0 + topBox.depth - 2);
                builder.add("1x1", palette.roofDark, 0, topBox.x0 + 1, topY + 1, topBox.z0 + 1);
                builder.add("1x1", palette.roofDark, 0, topX1 - 1, topY + 1, topBox.z0 + 1);
                builder.add("1x1", palette.roofDark, 0, topBox.x0 + 1, topY + 1, topZ1 - 1);
                builder.add("1x1", palette.roofDark, 0, topX1 - 1, topY + 1, topZ1 - 1);
            }
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

        function addTerraces() {
            terraceLayers.forEach((layer) => {
                addFilledRectSafe(builder, layer.x0, layer.y, layer.z0, layer.width, layer.depth, layer.color);

                const x1 = layer.x0 + layer.width - 1;
                const z1 = layer.z0 + layer.depth - 1;

                for (let x = layer.x0 + 1; x < x1; x += 4) {
                    builder.add("1x1", palette.stoneLight, 0, x, layer.y + 1, layer.z0);
                }

                for (let z = layer.z0 + 1; z < z1; z += 4) {
                    builder.add("1x1", palette.stone, 0, layer.x0, layer.y + 1, z);
                    builder.add("1x1", palette.stone, 0, x1, layer.y + 1, z);
                }
            });
        }

        function addStoneLantern(lx, lz, y0 = 1) {
            addPillarStackSafe(builder, lx, y0, lz, 2, palette.stone);
            builder.add("1x1", palette.stoneLight, 0, lx, y0 + 2, lz);
            builder.add("1x1", palette.lantern, 0, lx, y0 + 3, lz);
        }

        function addPebblePath(points, color = palette.path) {
            points.forEach(([lx, lz, tile = false]) => {
                builder.add(tile ? "Tile 2x2" : "1x1", color, 0, lx, 1, lz);
            });
        }

        function addTorii(x0, z0, y0 = 1) {
            addPillarStackSafe(builder, x0, y0, z0, 5, palette.red);
            addPillarStackSafe(builder, x0 + 3, y0, z0, 5, palette.red);
            builder.add("2x4", palette.red, 1, x0, y0 + 5, z0);
            builder.add("2x2", palette.red, 0, x0 + 1, y0 + 6, z0);
            builder.add("1x1", palette.woodDark, 0, x0 + 1, y0 + 4, z0);
            builder.add("1x1", palette.woodDark, 0, x0 + 2, y0 + 4, z0);
        }

        function addBridge(x0, z0) {
            addFilledRectSafe(builder, x0, 1, z0 + 1, 2, 4, palette.red);
            addFilledRectSafe(builder, x0 + 2, 2, z0, 4, 6, palette.red);
            addFilledRectSafe(builder, x0 + 6, 1, z0 + 1, 2, 4, palette.red);

            [
                [x0 + 1, z0 - 1, 2], [x0 + 1, z0 + 6, 2],
                [x0 + 3, z0 - 1, 3], [x0 + 3, z0 + 6, 3],
                [x0 + 5, z0 - 1, 3], [x0 + 5, z0 + 6, 3],
                [x0 + 7, z0 - 1, 2], [x0 + 7, z0 + 6, 2],
            ].forEach(([lx, lz, height]) => {
                addPillarStackSafe(builder, lx, 2, lz, height, palette.red);
            });

            builder.add("Tile 2x2", palette.red, 0, x0 + 3, 3, z0 + 2);
        }

        function addSakuraTree(x0, z0) {
            addPillarStackSafe(builder, x0, 1, z0, 7, palette.woodDark);
            addPillarStackSafe(builder, x0 + 1, 1, z0, 5, palette.wood);

            [
                [x0 - 1, 1, z0],
                [x0 + 2, 1, z0 + 1],
                [x0 - 1, 4, z0 - 1],
                [x0 + 1, 5, z0 - 2],
                [x0 + 2, 6, z0 - 1],
                [x0 - 2, 6, z0 + 1],
                [x0 + 1, 6, z0 + 2],
            ].forEach(([lx, ly, lz]) => {
                builder.add("1x1", palette.woodDark, 0, lx, ly, lz);
            });

            const canopyLayers = [
                {
                    y: 6,
                    points: [
                        [x0 - 4, z0 - 2], [x0 - 2, z0 - 4], [x0, z0 - 4], [x0 + 2, z0 - 2],
                        [x0 - 4, z0], [x0 - 2, z0], [x0, z0], [x0 + 2, z0], [x0 + 4, z0],
                        [x0 - 2, z0 + 2], [x0, z0 + 2], [x0 + 2, z0 + 2],
                    ],
                },
                {
                    y: 7,
                    points: [
                        [x0 - 4, z0 - 2], [x0 - 2, z0 - 2], [x0, z0 - 2], [x0 + 2, z0 - 2], [x0 + 4, z0 - 2],
                        [x0 - 4, z0], [x0 - 2, z0], [x0, z0], [x0 + 2, z0], [x0 + 4, z0],
                        [x0 - 2, z0 + 2], [x0, z0 + 2], [x0 + 2, z0 + 2],
                    ],
                },
                {
                    y: 8,
                    points: [
                        [x0 - 2, z0 - 2], [x0, z0 - 2], [x0 + 2, z0 - 2],
                        [x0 - 2, z0], [x0, z0], [x0 + 2, z0],
                        [x0, z0 + 2],
                    ],
                },
            ];

            canopyLayers.forEach((layer, layerIndex) => {
                layer.points.forEach(([lx, lz], pointIndex) => {
                    const color = (layerIndex + pointIndex) % 3 === 0 ? palette.blossomDark : ((layerIndex + pointIndex) % 2 === 0 ? palette.blossom : palette.blossomLight);
                    builder.add("2x2", color, 0, lx, layer.y, lz);
                });
            });

            [
                [x0 - 3, 6, z0 + 3], [x0 - 1, 7, z0 + 4], [x0 + 1, 7, z0 + 4],
                [x0 + 4, 6, z0 + 2], [x0 - 5, 6, z0 + 1],
            ].forEach(([lx, ly, lz], index) => {
                builder.add("1x1", index % 2 === 0 ? palette.blossom : palette.blossomLight, 0, lx, ly, lz);
            });

            addPebblePath([
                [x0 - 4, z0 + 5], [x0 - 2, z0 + 4], [x0, z0 + 5], [x0 + 2, z0 + 4],
                [x0 + 4, z0 + 5], [x0 - 3, z0 + 2], [x0 + 3, z0 + 2],
            ], palette.blossomLight);
        }

        function addHouseStructure(config) {
            addWindowRing(config.box, config.floorY + 1, config.windowXs, config.windowZs);
            addFilledRectSafe(builder, config.box.x0, config.floorY, config.box.z0, config.box.width, config.box.depth, palette.woodDark);
            addFilledRectSafe(builder, config.box.x0 - 1, config.floorY, config.box.z0 - 1, config.box.width + 2, 2, palette.wood);

            for (let offset = 1; offset <= 2; offset++) {
                addFilledRectSafe(
                    builder,
                    config.box.x0 + 1,
                    config.floorY + offset,
                    config.box.z0 + 1,
                    config.box.width - 2,
                    config.box.depth - 2,
                    offset === 1 ? palette.wall : palette.wallShadow,
                );
            }

            addFacadePosts(config.box, config.floorY + 1, 3, config.extraPosts);
            addTrimLine(config.box, config.floorY + 1);
            addTrimLine(config.box, config.floorY + 2);
            addRoofStage(config.roofBox, config.floorY + 3, config.ridge, config.roofLevels ?? 2);
            addGable(config.roofBox, config.floorY + 3, 3, "front");
            addGable(config.roofBox, config.floorY + 3, 3, "back");

            [23, 36].forEach((lx) => {
                addPillarStackSafe(builder, lx, 3, 13, 3, palette.woodDark);
            });

            [25, 29, 33].forEach((lx) => {
                builder.add("1x1", palette.woodDark, 0, lx, 6, 13);
            });

            [
                [27, 2, 10, 6],
                [28, 3, 11, 4],
                [29, 4, 12, 2],
            ].forEach(([x0, y, z0, width]) => {
                addFilledRectSafe(builder, x0, y, z0, width, 2, y === 4 ? palette.stoneLight : palette.stone);
            });

            builder.add("2x2", palette.woodDark, 0, 29, 6, 14);
            builder.add("1x1", palette.roofDark, 0, 29, 7, 14);
            builder.add("1x1", palette.roofDark, 0, 30, 7, 14);
        }

        addFilledRectSafe(builder, 0, 0, 0, 40, 30, palette.grass);
        addFilledRectSafe(builder, 14, 1, 8, 4, 4, palette.water);

        addTerraces();

        [
            [18, 1, 9], [19, 1, 11], [21, 2, 10], [21, 2, 24], [23, 3, 11], [23, 3, 23],
            [37, 1, 12], [36, 2, 10], [35, 4, 24], [24, 4, 25], [26, 5, 24], [34, 5, 13],
        ].forEach(([lx, ly, lz]) => {
            builder.add("1x1", ly >= 4 ? palette.stoneLight : palette.stone, 0, lx, ly, lz);
        });

        addBridge(12, 7);
        addTorii(31, 5);
        addSakuraTree(7, 18);
        addHouseStructure(house);

        addStoneLantern(21, 14, 5);
        addStoneLantern(37, 14, 5);
        addStoneLantern(5, 10, 1);
        addStoneLantern(10, 12, 1);

        addPebblePath([
            [28, 2, true], [30, 3, true], [31, 4], [32, 5, true], [33, 6], [33, 8, true],
            [31, 8], [29, 8], [27, 8, true], [25, 9], [23, 9], [21, 9, true],
            [20, 8], [18, 8], [16, 8, true], [15, 10], [17, 12], [19, 13], [21, 13, true],
            [24, 11], [26, 10, true], [28, 9], [30, 9], [32, 9, true], [34, 8],
        ]);

        addPebblePath([
            [12, 13], [13, 15], [11, 16], [9, 17], [5, 20], [7, 22], [10, 21], [12, 20],
        ], palette.moss);

        addPebblePath([
            [13, 6], [14, 6], [17, 6], [18, 6], [12, 12], [19, 12], [18, 13], [19, 14],
        ], palette.stoneLight);

        builder.add("1x1", palette.moss, 0, 20, 2, 12);
        builder.add("1x1", palette.moss, 0, 22, 3, 15);
        builder.add("1x1", palette.moss, 0, 35, 4, 18);
        builder.add("1x1", palette.moss, 0, 33, 2, 24);

        return builder.blocks;
    })(),
};

export default SakuraTempleRetreat;