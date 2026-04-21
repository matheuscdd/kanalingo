import { addFilledRect } from "../shared/core.js";

const VilasHistoricasShirakawago = {
        dx: 34,
        dy: 18,
        dz: 28,
        blocks: (function () {
            const b = [];
            const green = "#237841";
            const dark = "#111111";
            const ivory = "#f4f4f4";
            const gold = "#f2cd37";
            const red = "#e3000b";
            const houses = [
                { x: 2, z: 0, width: 8, depth: 12, roofLevels: 5, chimneyX: 7 },
                { x: 12, z: 0, width: 10, depth: 12, roofLevels: 5, chimneyX: 18 },
                { x: 24, z: 0, width: 8, depth: 12, roofLevels: 5, chimneyX: 29 },
                { x: 4, z: 18, width: 8, depth: 10, roofLevels: 4, chimneyX: 9 },
                { x: 20, z: 18, width: 10, depth: 10, roofLevels: 4, chimneyX: 26 },
            ];
            const trees = [
                { x: 1, z: 24, trunk: 4, canopy: 1 },
                { x: 32, z: 24, trunk: 4, canopy: 1 },
                { x: 14, z: 21, trunk: 4, canopy: 1 },
                { x: 18, z: 23, trunk: 5, canopy: 2 },
            ];

            function addColumn(lx, y0, lz, height, color) {
                for (let y = y0; y < y0 + height; y++) {
                    b.push({ type: "1x1", color, rot: 0, lx, ly: y, lz });
                }
            }

            function addTileRect(x0, y, z0, width, depth, color) {
                for (let x = x0; x < x0 + width; x += 2) {
                    for (let z = z0; z < z0 + depth; z += 2) {
                        b.push({ type: "Tile 2x2", color, rot: 0, lx: x, ly: y, lz: z });
                    }
                }
            }

            function addTree(cx, cz, trunkHeight, canopyRadius) {
                addColumn(cx, 1, cz, trunkHeight, dark);
                b.push({ type: "1x1", color: dark, rot: 0, lx: cx - 1, ly: 1, lz: cz });
                b.push({ type: "1x1", color: dark, rot: 0, lx: cx + 1, ly: 1, lz: cz });
                b.push({ type: "1x1", color: dark, rot: 0, lx: cx, ly: 1, lz: cz - 1 });
                b.push({ type: "1x1", color: dark, rot: 0, lx: cx, ly: 1, lz: cz + 1 });

                for (let x = cx - canopyRadius; x <= cx + canopyRadius; x++) {
                    for (let y = trunkHeight - 1; y <= trunkHeight + 1; y++) {
                        for (let z = cz - canopyRadius; z <= cz + canopyRadius; z++) {
                            if (x < 0 || x >= 34 || z < 0 || z >= 28) continue;
                            if (x === cx && z === cz && y <= trunkHeight) continue;
                            const dist = Math.sqrt(Math.pow(x - cx, 2) + Math.pow((y - trunkHeight) * 1.3, 2) + Math.pow(z - cz, 2));
                            if (dist <= canopyRadius + 0.35) {
                                b.push({ type: "1x1", color: green, rot: 0, lx: x, ly: y, lz: z });
                            }
                        }
                    }
                }
            }

            function addHouse(spec) {
                const x1 = spec.x + spec.width - 1;
                const z1 = spec.z + spec.depth - 1;
                const roofBaseY = 6;
                const ridgeZ = spec.z + Math.floor(spec.depth / 2) - 1;

                addFilledRect(b, spec.x, 1, spec.z, spec.width, spec.depth, dark);
                addFilledRect(b, spec.x + 1, 2, spec.z + 1, spec.width - 2, spec.depth - 2, ivory);
                addFilledRect(b, spec.x + 1, 3, spec.z + 1, spec.width - 2, spec.depth - 2, ivory);
                addFilledRect(b, spec.x + 2, 4, spec.z + 2, spec.width - 4, spec.depth - 4, dark);
                addFilledRect(b, spec.x + 2, 5, spec.z + 2, spec.width - 4, spec.depth - 4, dark);

                [
                    [spec.x, spec.z],
                    [x1, spec.z],
                    [spec.x, z1],
                    [x1, z1],
                    [spec.x + Math.floor(spec.width / 2), spec.z],
                    [spec.x + Math.floor(spec.width / 2), z1],
                ].forEach(([lx, lz]) => addColumn(lx, 2, lz, 4, dark));

                for (let x = spec.x + 1; x < x1; x++) {
                    b.push({ type: "1x1", color: ivory, rot: 0, lx: x, ly: 4, lz: spec.z + 1 });
                    b.push({ type: "1x1", color: ivory, rot: 0, lx: x, ly: 4, lz: z1 - 1 });
                }

                for (let step = 0; step < spec.roofLevels; step++) {
                    const y = roofBaseY + step;
                    const frontZ = spec.z + step;
                    const backZ = z1 - 1 - step;

                    for (let x = spec.x; x < spec.x + spec.width; x += 2) {
                        b.push({ type: "Roof 1x2", color: dark, rot: 0, lx: x, ly: y, lz: frontZ });
                        b.push({ type: "Roof 1x2", color: dark, rot: 2, lx: x, ly: y, lz: backZ });
                    }
                }

                for (let x = spec.x; x < spec.x + spec.width; x += 2) {
                    b.push({ type: "Tile 2x2", color: gold, rot: 0, lx: x, ly: roofBaseY + spec.roofLevels, lz: ridgeZ });
                }

                b.push({ type: "1x1", color: dark, rot: 0, lx: spec.chimneyX, ly: roofBaseY, lz: ridgeZ });
                b.push({ type: "1x1", color: red, rot: 0, lx: spec.chimneyX, ly: roofBaseY + 1, lz: ridgeZ });
            }

            addFilledRect(b, 0, 0, 0, 34, 28, green);
            addTileRect(2, 1, 12, 30, 6, ivory);

            for (let x = 4; x <= 28; x += 4) {
                b.push({ type: "1x1", color: dark, rot: 0, lx: x, ly: 2, lz: 12 });
                b.push({ type: "1x1", color: dark, rot: 0, lx: x, ly: 2, lz: 17 });
                b.push({ type: "1x1", color: ivory, rot: 0, lx: x, ly: 3, lz: 12 });
                b.push({ type: "1x1", color: ivory, rot: 0, lx: x, ly: 3, lz: 17 });
            }

            houses.forEach((house) => addHouse(house));
            trees.forEach((tree) => addTree(tree.x, tree.z, tree.trunk, tree.canopy));

            return b;
        })(),
    };

export default VilasHistoricasShirakawago;
