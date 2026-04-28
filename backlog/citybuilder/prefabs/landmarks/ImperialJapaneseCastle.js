import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

const ImperialJapaneseCastle = {
    dx: 72,
    dy: 42,
    dz: 52,
    blocks: (function () {
        const builder = createPrefabBuilder();

        const palette = {
            ground: "#6c7c56",
            path: "#d6b07a",
            stoneDark: "#4f5761",
            stone: "#6a737c",
            stoneLight: "#c1c9d0",
            wall: "#f4f4f4",
            wallShadow: "#efe6d8",
            wood: "#8b5a2b",
            woodDark: "#684a2f",
            roof: "#101010",
            roofDark: "#241916",
            gold: "#f2cd37",
            glass: "#90aabd",
            plant: "#237841",
            bamboo: "#9bb980",
        };

        const terraceLayers = [
            { x0: 4, z0: 8, width: 64, depth: 40, y: 1, color: palette.stoneDark },
            { x0: 6, z0: 10, width: 60, depth: 38, y: 2, color: palette.stoneDark },
            { x0: 8, z0: 12, width: 56, depth: 36, y: 3, color: palette.stone },
            { x0: 10, z0: 14, width: 52, depth: 34, y: 4, color: palette.stone },
            { x0: 14, z0: 16, width: 44, depth: 28, y: 5, color: palette.stoneLight },
        ];

        const outerBuildings = [
            {
                box: { x0: 26, z0: 14, width: 20, depth: 8 },
                roofBox: { x0: 24, z0: 12, width: 24, depth: 12 },
                floorY: 6,
                ridge: "x",
                windowXs: [30, 34, 38, 42],
                windowZs: [16, 19],
                roofLevels: 2,
                gables: true,
            },
            {
                box: { x0: 12, z0: 24, width: 12, depth: 8 },
                roofBox: { x0: 10, z0: 22, width: 14, depth: 12 },
                floorY: 6,
                ridge: "z",
                windowXs: [15, 19],
                windowZs: [26, 29],
                roofLevels: 2,
                gables: true,
            },
            {
                box: { x0: 48, z0: 24, width: 12, depth: 8 },
                roofBox: { x0: 48, z0: 22, width: 14, depth: 12 },
                floorY: 6,
                ridge: "z",
                windowXs: [51, 55],
                windowZs: [26, 29],
                roofLevels: 2,
                gables: true,
            },
            {
                box: { x0: 24, z0: 38, width: 24, depth: 6 },
                roofBox: { x0: 22, z0: 36, width: 28, depth: 10 },
                floorY: 6,
                ridge: "x",
                windowXs: [28, 32, 36, 40, 44],
                windowZs: [40],
                roofLevels: 2,
                gables: true,
            },
        ];

        const turretBuildings = [
            {
                box: { x0: 12, z0: 12, width: 8, depth: 8 },
                roofBox: { x0: 10, z0: 10, width: 12, depth: 12 },
                floorY: 5,
                ridge: "z",
                windowXs: [14, 17],
                windowZs: [14, 17],
                roofLevels: 2,
                gables: false,
            },
            {
                box: { x0: 52, z0: 12, width: 8, depth: 8 },
                roofBox: { x0: 50, z0: 10, width: 12, depth: 12 },
                floorY: 5,
                ridge: "z",
                windowXs: [54, 57],
                windowZs: [14, 17],
                roofLevels: 2,
                gables: false,
            },
            {
                box: { x0: 12, z0: 34, width: 8, depth: 8 },
                roofBox: { x0: 10, z0: 32, width: 12, depth: 12 },
                floorY: 5,
                ridge: "z",
                windowXs: [14, 17],
                windowZs: [36, 39],
                roofLevels: 2,
                gables: false,
            },
            {
                box: { x0: 52, z0: 34, width: 8, depth: 8 },
                roofBox: { x0: 50, z0: 32, width: 12, depth: 12 },
                floorY: 5,
                ridge: "z",
                windowXs: [54, 57],
                windowZs: [36, 39],
                roofLevels: 2,
                gables: false,
            },
        ];

        const keepStages = [
            {
                box: { x0: 24, z0: 22, width: 24, depth: 16 },
                roofBox: { x0: 22, z0: 20, width: 28, depth: 20 },
                floorY: 8,
                ridge: "x",
                windowXs: [28, 32, 38, 42],
                windowZs: [25, 29, 33],
                roofLevels: 2,
                gables: true,
                extraPosts: [
                    [30, 22], [42, 22],
                    [30, 37], [42, 37],
                    [24, 26], [24, 32],
                    [47, 26], [47, 32],
                ],
            },
            {
                box: { x0: 27, z0: 24, width: 18, depth: 12 },
                roofBox: { x0: 25, z0: 22, width: 22, depth: 16 },
                floorY: 12,
                ridge: "z",
                windowXs: [31, 39],
                windowZs: [27, 32],
                roofLevels: 2,
                gables: true,
                extraPosts: [
                    [30, 24], [42, 24],
                    [30, 35], [42, 35],
                ],
            },
            {
                box: { x0: 29, z0: 25, width: 14, depth: 10 },
                roofBox: { x0: 27, z0: 23, width: 18, depth: 14 },
                floorY: 16,
                ridge: "x",
                windowXs: [32, 38],
                windowZs: [27, 31],
                roofLevels: 2,
                gables: true,
                extraPosts: [],
            },
            {
                box: { x0: 31, z0: 26, width: 10, depth: 8 },
                roofBox: { x0: 29, z0: 24, width: 14, depth: 12 },
                floorY: 20,
                ridge: "z",
                windowXs: [34, 37],
                windowZs: [28, 31],
                roofLevels: 2,
                gables: false,
                extraPosts: [],
            },
            {
                box: { x0: 32, z0: 27, width: 8, depth: 6 },
                roofBox: { x0: 30, z0: 25, width: 12, depth: 10 },
                floorY: 24,
                ridge: "x",
                windowXs: [34, 37],
                windowZs: [29],
                roofLevels: 2,
                gables: false,
                extraPosts: [],
            },
            {
                box: { x0: 33, z0: 28, width: 6, depth: 4 },
                roofBox: { x0: 31, z0: 26, width: 10, depth: 8 },
                floorY: 28,
                ridge: "z",
                windowXs: [],
                windowZs: [],
                roofLevels: 2,
                gables: false,
                extraPosts: [],
            },
        ];

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

                for (let x = roofBox.x0; x <= x1 - 1; x += 2) {
                    builder.add("Roof 1x2", palette.roof, 0, x, topY, roofBox.z0);
                    builder.add("Roof 1x2", palette.roof, 2, x, topY, z1 - 1);
                }

                for (let z = roofBox.z0 + 2; z <= z1 - 2; z += 2) {
                    builder.add("Roof 1x2", palette.roof, 1, roofBox.x0, topY, z);
                    builder.add("Roof 1x2", palette.roof, 3, x1 - 1, topY, z);
                }
            }

            if (!topBox) return;

            if (ridgeAxis === "x") {
                const ridgeZ = topBox.z0 + Math.floor((topBox.depth - 2) / 2);
                for (let x = topBox.x0 + 1; x <= topBox.x0 + topBox.width - 3; x += 4) {
                    builder.add("Tile 2x2", palette.stoneLight, 0, x, topY, ridgeZ);
                }
            } else {
                const ridgeX = topBox.x0 + Math.floor((topBox.width - 2) / 2);
                for (let z = topBox.z0 + 1; z <= topBox.z0 + topBox.depth - 3; z += 4) {
                    builder.add("Tile 2x2", palette.stoneLight, 0, ridgeX, topY, z);
                }
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

        function addBuilding(config) {
            const wallLayers = config.wallLayers ?? 2;

            addWindowRing(config.box, config.floorY + 1, config.windowXs, config.windowZs);
            addFilledRectSafe(builder, config.box.x0, config.floorY, config.box.z0, config.box.width, config.box.depth, palette.woodDark);

            for (let offset = 1; offset <= wallLayers; offset++) {
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

            addFacadePosts(config.box, config.floorY + 1, wallLayers + 1, config.extraPosts ?? []);
            addTrimLine(config.box, config.floorY + 1);
            addTrimLine(config.box, config.floorY + wallLayers);
            addRoofStage(config.roofBox, config.floorY + wallLayers + 1, config.ridge, config.roofLevels ?? 2);

            if (config.gables) {
                addGable(config.roofBox, config.floorY + wallLayers + 1, 3, "front");
                addGable(config.roofBox, config.floorY + wallLayers + 1, 3, "back");
            }
        }

        function addTerraces() {
            terraceLayers.forEach((layer, index) => {
                addFilledRectSafe(builder, layer.x0, layer.y, layer.z0, layer.width, layer.depth, layer.color);

                const x1 = layer.x0 + layer.width - 1;
                const z1 = layer.z0 + layer.depth - 1;
                const accentY = layer.y + 1;

                for (let x = layer.x0 + 1; x < x1; x += 4) {
                    builder.add("1x1", palette.stoneLight, 0, x, accentY, layer.z0);
                    if (index > 0) {
                        builder.add("1x1", palette.stoneLight, 0, x, accentY, z1);
                    }
                }

                for (let z = layer.z0 + 1; z < z1; z += 4) {
                    builder.add("1x1", palette.stoneLight, 0, layer.x0, accentY, z);
                    builder.add("1x1", palette.stoneLight, 0, x1, accentY, z);
                }
            });
        }

        function addStoneLantern(lx, lz, y0 = 1) {
            addPillarStackSafe(builder, lx, y0, lz, 2, palette.stone);
            builder.add("1x1", palette.stoneLight, 0, lx, y0 + 2, lz);
        }

        function addBanner(lx, y0, lz, height) {
            for (let offset = 0; offset < height; offset++) {
                builder.add("1x1", offset % 2 === 0 ? palette.gold : palette.wallShadow, 0, lx, y0 + offset, lz);
            }
        }

        function addBambooCluster(x0, z0) {
            const stalks = [
                [x0, 1, z0, 5],
                [x0 + 1, 1, z0 + 1, 4],
                [x0 + 2, 1, z0, 6],
            ];

            stalks.forEach(([lx, y0, lz, height]) => {
                addPillarStackSafe(builder, lx, y0, lz, height, palette.bamboo);
                builder.add("1x1", palette.plant, 0, lx - 1, y0 + height - 1, lz);
                builder.add("1x1", palette.plant, 0, lx + 1, y0 + height - 1, lz + 1);
            });
        }

        addFilledRectSafe(builder, 0, 0, 0, 72, 52, palette.ground);

        addFilledRectSafe(builder, 28, 1, 0, 16, 10, palette.path);
        addFilledRectSafe(builder, 30, 2, 6, 12, 6, palette.path);
        addFilledRectSafe(builder, 32, 3, 10, 8, 4, palette.path);
        addFilledRectSafe(builder, 34, 4, 12, 4, 4, palette.path);
        addFilledRectSafe(builder, 30, 1, 44, 12, 6, palette.path);

        addTerraces();

        addFilledRectSafe(builder, 12, 4, 12, 8, 2, palette.stoneLight);
        addFilledRectSafe(builder, 52, 4, 12, 8, 2, palette.stoneLight);
        addFilledRectSafe(builder, 26, 5, 14, 20, 2, palette.path);
        addFilledRectSafe(builder, 12, 5, 24, 2, 8, palette.stoneLight);
        addFilledRectSafe(builder, 58, 5, 24, 2, 8, palette.stoneLight);

        turretBuildings.forEach((turret) => addBuilding(turret));
        outerBuildings.forEach((building) => addBuilding(building));
        keepStages.forEach((stage) => addBuilding(stage));

        addPillarStackSafe(builder, 35, 33, 29, 3, palette.woodDark);
        builder.add("1x1", palette.gold, 0, 35, 36, 29);

        addBanner(28, 7, 14, 4);
        addBanner(43, 7, 14, 4);

        addStoneLantern(24, 9, 1);
        addStoneLantern(47, 9, 1);
        addStoneLantern(22, 43, 1);
        addStoneLantern(49, 43, 1);

        addBambooCluster(5, 43);
        addBambooCluster(62, 43);
        addBambooCluster(6, 8);
        addBambooCluster(61, 8);

        builder.add("1x1", palette.plant, 0, 20, 1, 45);
        builder.add("1x1", palette.plant, 0, 21, 1, 45);
        builder.add("1x1", palette.plant, 0, 50, 1, 45);
        builder.add("1x1", palette.plant, 0, 51, 1, 45);

        return builder.blocks;
    })(),
};

export default ImperialJapaneseCastle;