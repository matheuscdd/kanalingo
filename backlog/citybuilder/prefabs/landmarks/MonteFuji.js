import { createPrefabBuilder, addFilledRectSafe } from "../shared/core.js";

const MonteFuji = {
    dx: 40,
    dy: 40,
    dz: 40,
    blocks: (function () {
        const builder = createPrefabBuilder();
        const green = "#237841";
        const dark = "#111111";
        const ivory = "#f4f4f4";
        const red = "#e3000b";
        const gold = "#f2cd37";
        const centerX = 20;
        const centerZ = 25;
        const mountainLayers = [
                { y0: 1, y1: 4, size: 30, color: dark },
                { y0: 5, y1: 8, size: 28, color: dark },
                { y0: 9, y1: 12, size: 26, color: dark },
                { y0: 13, y1: 16, size: 24, color: dark },
                { y0: 17, y1: 20, size: 22, color: dark },
                { y0: 21, y1: 24, size: 20, color: dark },
                { y0: 25, y1: 26, size: 18, color: dark },
                { y0: 27, y1: 29, size: 16, color: ivory },
                { y0: 30, y1: 32, size: 14, color: ivory },
                { y0: 33, y1: 34, size: 12, color: ivory },
                { y0: 35, y1: 36, size: 10, color: ivory },
                { y0: 37, y1: 37, size: 8, color: ivory },
                { y0: 38, y1: 38, size: 6, color: ivory },
                { y0: 39, y1: 39, size: 2, color: ivory },
            ];
            const trees = [
                { x: 15, z: 5, trunk: 5, canopy: 2 },
                { x: 27, z: 4, trunk: 4, canopy: 1 },
                { x: 33, z: 7, trunk: 4, canopy: 1 },
            ];


        const addColumn = (lx, y0, lz, height, color) => {
            for (let y = y0; y < y0 + height; y++) {
                builder.add("1x1", color, 0, lx, y, lz);
            }
        };

        const addMountainLayer = (y, size, color) => {
            const x0 = centerX - size / 2;
            const z0 = centerZ - size / 2;
            addFilledRectSafe(builder, x0, y, z0, size, size, color);
        };

        const addTree = (cx, cz, trunkHeight, canopyRadius) => {
            addColumn(cx, 1, cz, trunkHeight, dark);
            builder.add("1x1", dark, 0, cx - 1, 1, cz);
            builder.add("1x1", dark, 0, cx + 1, 1, cz);
            builder.add("1x1", dark, 0, cx, 1, cz - 1);
            builder.add("1x1", dark, 0, cx, 1, cz + 1);
            for (let x = cx - canopyRadius; x <= cx + canopyRadius; x++) {
                for (let y = trunkHeight - 1; y <= trunkHeight + 1; y++) {
                    for (let z = cz - canopyRadius; z <= cz + canopyRadius; z++) {
                        if (x < 0 || x >= 40 || z < 0 || z >= 40) continue;
                        if (x === cx && z === cz && y <= trunkHeight) continue;
                        const dist = Math.sqrt(Math.pow(x - cx, 2) + Math.pow((y - trunkHeight) * 1.25, 2) + Math.pow(z - cz, 2));
                        if (dist <= canopyRadius + 0.4) {
                            builder.add("1x1", green, 0, x, y, z);
                        }
                    }
                }
            }
        };

        const addPagoda = (x0, z0) => {
            const width = 10;
            const depth = 8;
            const x1 = x0 + width - 1;
            const z1 = z0 + depth - 1;
            addFilledRectSafe(builder, x0, 1, z0, width, depth, red);
            addFilledRectSafe(builder, x0 + 2, 2, z0 + 2, width - 4, depth - 4, ivory);
            addFilledRectSafe(builder, x0 + 2, 3, z0 + 2, width - 4, depth - 4, ivory);
            [ [x0 + 1, z0 + 1], [x1 - 1, z0 + 1], [x0 + 1, z1 - 1], [x1 - 1, z1 - 1] ].forEach(([lx, lz]) => addColumn(lx, 2, lz, 2, dark));
            addFilledRectSafe(builder, x0 + 1, 4, z0 + 1, width - 2, depth - 2, dark);
            for (let x = x0; x < x0 + width; x += 2) {
                builder.add("Roof 1x2", dark, 0, x, 5, z0);
                builder.add("Roof 1x2", dark, 2, x, 5, z1 - 1);
            }
            for (let z = z0 + 2; z <= z1 - 3; z += 2) {
                builder.add("Roof 1x2", dark, 1, x0, 5, z);
                builder.add("Roof 1x2", dark, 3, x1 - 1, 5, z);
            }
            addFilledRectSafe(builder, x0 + 3, 6, z0 + 2, 4, 4, red);
            addFilledRectSafe(builder, x0 + 4, 7, z0 + 3, 2, 2, ivory);
            addFilledRectSafe(builder, x0 + 3, 8, z0 + 2, 4, 4, dark);
            for (let x = x0 + 2; x <= x0 + 6; x += 2) {
                builder.add("Roof 1x2", dark, 0, x, 9, z0 + 1);
                builder.add("Roof 1x2", dark, 2, x, 9, z0 + 5);
            }
            builder.add("Tile 2x2", gold, 0, x0 + 4, 10, z0 + 3);
            builder.add("1x1", gold, 0, x0 + 4, 11, z0 + 3);
        };

        addFilledRectSafe(builder, 0, 0, 0, 40, 40, green);
        mountainLayers.forEach((layer) => {
            for (let y = layer.y0; y <= layer.y1; y++) {
                addMountainLayer(y, layer.size, layer.color);
            }
        });
        for (let x = 16; x <= 30; x += 4) {
            builder.add("1x1", green, 0, x, 1, 9);
        }
        addPagoda(3, 2);
        trees.forEach((tree) => addTree(tree.x, tree.z, tree.trunk, tree.canopy));
        return builder.blocks;
    })(),
};

export default MonteFuji;
