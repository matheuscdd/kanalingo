import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

const CasteloHimeji = {
    dx: 30,
    dy: 28,
    dz: 30,
    blocks: (function () {
        const builder = createPrefabBuilder();
        const green = "#237841";
        const red = "#e3000b";
        const ivory = "#f4f4f4";
        const dark = "#111111";
        const gold = "#f2cd37";
        const blue = "#0055bf";
        const keepStages = [
                {
                    x0: 8,
                    z0: 8,
                    width: 14,
                    depth: 14,
                    floorY: 3,
                    roofMinX: 6,
                    roofMaxX: 22,
                    roofMinZ: 6,
                    roofMaxZ: 22,
                    windowXs: [10, 14, 18],
                    windowZs: [10, 14, 18],
                    ridge: "z",
                },
                {
                    x0: 9,
                    z0: 9,
                    width: 12,
                    depth: 12,
                    floorY: 7,
                    roofMinX: 7,
                    roofMaxX: 21,
                    roofMinZ: 7,
                    roofMaxZ: 21,
                    windowXs: [11, 15],
                    windowZs: [11, 15],
                    ridge: "x",
                },
                {
                    x0: 10,
                    z0: 10,
                    width: 10,
                    depth: 10,
                    floorY: 11,
                    roofMinX: 8,
                    roofMaxX: 20,
                    roofMinZ: 8,
                    roofMaxZ: 20,
                    windowXs: [12, 16],
                    windowZs: [12, 16],
                    ridge: "z",
                },
                {
                    x0: 11,
                    z0: 11,
                    width: 8,
                    depth: 8,
                    floorY: 15,
                    roofMinX: 9,
                    roofMaxX: 19,
                    roofMinZ: 9,
                    roofMaxZ: 19,
                    windowXs: [13],
                    windowZs: [13],
                    ridge: "x",
                },
                {
                    x0: 12,
                    z0: 12,
                    width: 6,
                    depth: 6,
                    floorY: 19,
                    roofMinX: 10,
                    roofMaxX: 18,
                    roofMinZ: 10,
                    roofMaxZ: 18,
                    windowXs: [],
                    windowZs: [],
                    ridge: "z",
                },
            ];
            const wings = [
                {
                    x0: 2,
                    z0: 10,
                    width: 6,
                    depth: 10,
                    floorY: 3,
                    roofMinX: 1,
                    roofMaxX: 7,
                    roofMinZ: 8,
                    roofMaxZ: 20,
                    windowXs: [3, 5],
                    windowZs: [12, 16],
                    ridge: "z",
                },
                {
                    x0: 22,
                    z0: 10,
                    width: 6,
                    depth: 10,
                    floorY: 3,
                    roofMinX: 21,
                    roofMaxX: 27,
                    roofMinZ: 8,
                    roofMaxZ: 20,
                    windowXs: [23, 25],
                    windowZs: [12, 16],
                    ridge: "z",
                },
                {
                    x0: 10,
                    z0: 2,
                    width: 10,
                    depth: 6,
                    floorY: 2,
                    roofMinX: 8,
                    roofMaxX: 20,
                    roofMinZ: 1,
                    roofMaxZ: 7,
                    windowXs: [12, 16],
                    windowZs: [3, 5],
                    ridge: "x",
                },
                {
                    x0: 10,
                    z0: 22,
                    width: 10,
                    depth: 6,
                    floorY: 2,
                    roofMinX: 8,
                    roofMaxX: 20,
                    roofMinZ: 21,
                    roofMaxZ: 27,
                    windowXs: [12, 16],
                    windowZs: [23, 25],
                    ridge: "x",
                },
            ];

        const addColumn = (lx, y0, lz, height, color) => {
            addPillarStackSafe(builder, lx, y0, lz, height, color);
        };

        const addRoofFrame = (roofMinX, roofMaxX, roofMinZ, roofMaxZ, y, ridge) => {
            const roofWidth = roofMaxX - roofMinX;
            const roofDepth = roofMaxZ - roofMinZ;
            const ridgeX = Math.floor((roofMinX + roofMaxX) / 2) - 1;
            const ridgeZ = Math.floor((roofMinZ + roofMaxZ) / 2) - 1;
            addFilledRectSafe(builder, roofMinX + 1, y - 1, roofMinZ + 1, roofWidth, roofDepth, dark);
            for (let x = roofMinX; x <= roofMaxX; x += 2) {
                builder.add("Roof 1x2", dark, 0, x, y, roofMinZ);
                builder.add("Roof 1x2", dark, 2, x, y, roofMaxZ);
            }
            for (let z = roofMinZ + 2; z <= roofMaxZ - 2; z += 2) {
                builder.add("Roof 1x2", dark, 1, roofMinX, y, z);
                builder.add("Roof 1x2", dark, 3, roofMaxX, y, z);
            }
            if (ridge === "z") {
                for (let z = roofMinZ + 2; z <= roofMaxZ - 2; z += 4) {
                    builder.add("Tile 2x2", ivory, 0, ridgeX, y, z);
                }
            } else {
                for (let x = roofMinX + 2; x <= roofMaxX - 2; x += 4) {
                    builder.add("Tile 2x2", ivory, 0, x, y, ridgeZ);
                }
            }
            [ [roofMinX + 1, roofMinZ + 1], [roofMaxX, roofMinZ + 1], [roofMinX + 1, roofMaxZ], [roofMaxX, roofMaxZ] ].forEach(([lx, lz]) => {
                builder.add("1x1", gold, 0, lx, y - 1, lz);
            });
        };

        const addWindowRing = (x0, z0, width, depth, y, windowXs, windowZs) => {
            const x1 = x0 + width - 1;
            const z1 = z0 + depth - 1;
            windowXs.forEach((lx) => {
                builder.add("Window", blue, 1, lx, y, z0);
                builder.add("Window", blue, 1, lx, y, z1);
            });
            windowZs.forEach((lz) => {
                builder.add("Window", blue, 0, x0, y, lz);
                builder.add("Window", blue, 0, x1, y, lz);
            });
        };

    const addFacadePosts = (x0, z0, width, depth, y0, height, extraOffsets = []) => {
      const x1 = x0 + width - 1;
      const z1 = z0 + depth - 1;
      const midX = Math.floor((x0 + x1) / 2);
      const midZ = Math.floor((z0 + z1) / 2);
      const points = [ [x0, z0], [x1, z0], [x0, z1], [x1, z1], [midX, z0], [midX, z1], [x0, midZ], [x1, midZ] ];
      extraOffsets.forEach(([lx, lz]) => points.push([lx, lz]));
      points.forEach(([lx, lz]) => addPillarStackSafe(builder, lx, y0, lz, height, red));
    };

        const addTerraceDetails = () => {
            for (let x = 4; x <= 24; x += 2) {
                builder.add("1x1", ivory, 0, x, 3, 4);
                builder.add("1x1", ivory, 0, x, 3, 25);
            }
            for (let z = 6; z <= 22; z += 2) {
                builder.add("1x1", ivory, 0, 4, 3, z);
                builder.add("1x1", ivory, 0, 25, 3, z);
            }
            [ [4, 4], [24, 4], [4, 24], [24, 24] ].forEach(([lx, lz]) => {
                builder.add("2x2", dark, 0, lx, 3, lz);
                builder.add("2x2", dark, 0, lx, 4, lz);
                builder.add("Tile 2x2", ivory, 0, lx, 5, lz);
            });
            for (let x = 12; x <= 16; x += 2) {
                builder.add("Tile 2x2", ivory, 0, x, 2, 4);
                builder.add("1x1", red, 0, x, 3, 4);
            }
        };

        const addWing = (wing) => {
            const innerWidth = wing.width - 2;
            const innerDepth = wing.depth - 2;
            const centerX = wing.x0 + Math.floor(wing.width / 2) - 1;
            const centerZ = wing.z0 + Math.floor(wing.depth / 2) - 1;
            if (wing.floorY > 2) {
                addFilledRectSafe(builder, wing.x0, wing.floorY - 1, wing.z0, wing.width, wing.depth, dark);
            }
            addFilledRectSafe(builder, wing.x0, wing.floorY, wing.z0, wing.width, wing.depth, red);
            addFilledRectSafe(builder, wing.x0 + 1, wing.floorY + 1, wing.z0 + 1, innerWidth, innerDepth, ivory);
            addFacadePosts(wing.x0, wing.z0, wing.width, wing.depth, wing.floorY + 1, 2);
            addWindowRing(wing.x0, wing.z0, wing.width, wing.depth, wing.floorY + 1, wing.windowXs, wing.windowZs);
            for (let x = wing.x0 + 1; x <= wing.x0 + wing.width - 3; x += 2) {
                builder.add("1x1", ivory, 0, x, wing.floorY + 2, wing.z0 + 1);
                builder.add("1x1", ivory, 0, x, wing.floorY + 2, wing.z0 + wing.depth - 2);
            }
            addRoofFrame(wing.roofMinX, wing.roofMaxX, wing.roofMinZ, wing.roofMaxZ, wing.floorY + 3, wing.ridge);
            builder.add("Tile 2x2", ivory, 0, centerX, wing.floorY + 3, centerZ);
        };

        const addKeepStage = (stage, index) => {
            const x1 = stage.x0 + stage.width - 1;
            const z1 = stage.z0 + stage.depth - 1;
            const innerWidth = stage.width - 4;
            const innerDepth = stage.depth - 4;
            const centerX = Math.floor((stage.x0 + x1) / 2);
            const centerZ = Math.floor((stage.z0 + z1) / 2);
            const extraPosts = [];
            if (index === 0) {
                extraPosts.push(
                    [stage.x0 + 3, stage.z0], [x1 - 3, stage.z0], [stage.x0 + 3, z1], [x1 - 3, z1],
                    [stage.x0, stage.z0 + 3], [stage.x0, z1 - 3], [x1, stage.z0 + 3], [x1, z1 - 3],
                );
            }
            addFilledRectSafe(builder, stage.x0, stage.floorY, stage.z0, stage.width, stage.depth, red);
            addFilledRectSafe(builder, stage.x0 + 2, stage.floorY + 1, stage.z0 + 2, innerWidth, innerDepth, ivory);
            addFacadePosts(stage.x0, stage.z0, stage.width, stage.depth, stage.floorY + 1, 2, extraPosts);
            addWindowRing(stage.x0, stage.z0, stage.width, stage.depth, stage.floorY + 1, stage.windowXs, stage.windowZs);
            for (let x = stage.x0 + 1; x <= x1 - 1; x += 2) {
                builder.add("Tile 2x2", ivory, 0, x, stage.floorY + 2, stage.z0 + 1);
                builder.add("Tile 2x2", ivory, 0, x, stage.floorY + 2, z1 - 1);
            }
            for (let z = stage.z0 + 1; z <= z1 - 1; z += 2) {
                builder.add("1x1", ivory, 0, stage.x0 + 1, stage.floorY + 2, z);
                builder.add("1x1", ivory, 0, x1 - 1, stage.floorY + 2, z);
            }
            addRoofFrame(stage.roofMinX, stage.roofMaxX, stage.roofMinZ, stage.roofMaxZ, stage.floorY + 3, stage.ridge);
            builder.add("2x2", dark, 0, centerX, stage.floorY + 3, centerZ);
        };

        addFilledRectSafe(builder, 0, 0, 0, 30, 30, green);
        addFilledRectSafe(builder, 1, 1, 1, 28, 28, dark);
        addFilledRectSafe(builder, 4, 2, 4, 22, 22, dark);
        addTerraceDetails();
        wings.forEach((wing) => addWing(wing));
        keepStages.forEach((stage, index) => addKeepStage(stage, index));
        for (let y = 23; y <= 25; y++) {
            builder.add("2x2", gold, 0, 14, y, 14);
        }
        builder.add("1x1", gold, 0, 14, 26, 14);
        builder.add("1x1", gold, 0, 15, 26, 14);
        builder.add("1x1", gold, 0, 14, 27, 14);
        return builder.blocks;
    })(),
};

export default CasteloHimeji;
