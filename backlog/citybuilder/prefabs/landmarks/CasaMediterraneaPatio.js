import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

const CasaMediterraneaPatio = {
    dx: 40,
    dy: 19,
    dz: 28,
    blocks: (function () {
        const builder = createPrefabBuilder();

        const palette = {
            baseEdge: "#a68d63",
            ground: "#c7b48c",
            groundShade: "#a89167",
            path: "#b7a889",
            stonePatch: "#d9d0a7",
            wallLight: "#f0ece1",
            wallWarm: "#e2d9b4",
            plasterRose: "#d89a8c",
            ochre: "#c9954d",
            ochreDark: "#a77439",
            turquoise: "#2a8f89",
            trim: "#6d4a31",
            trimDark: "#4c311d",
            window: "#6e5848",
            doorShadow: "#24312f",
            roof: "#9d725f",
            roofDark: "#6d4a39",
            roofLight: "#b98a75",
            rockDark: "#6d7178",
            rock: "#838892",
            rockLight: "#a1a7af",
            vine: "#3a8a4d",
            vineDark: "#2f6b3d",
            leaf: "#63924b",
            leafLight: "#86ab61",
            blossom: "#e3afc8",
            blossomLight: "#efc7db",
            blossomDark: "#cf7fa8",
            bark: "#6d4731",
            barkDark: "#543624",
            water: "#4a7fb2",
            flowerA: "#cf8b4f",
            flowerB: "#f3d6c7",
        };

        const leftHouse = { x0: 4, z0: 9, width: 12, depth: 11, wallY: 3, wallHeight: 5, roofY: 8 };
        const rightHouse = { x0: 16, z0: 13, width: 14, depth: 10, wallY: 3, wallHeight: 7, roofY: 10 };
        const patio = { x0: 18, z0: 9, width: 8, depth: 4 };

        function place(type, color, rot, lx, ly, lz, options = {}) {
            const added = builder.add(type, color, rot, lx, ly, lz, options);
            if (!added) {
                throw new Error(`CasaMediterraneaPatio overlap near ${type} @ ${lx},${ly},${lz}`);
            }
        }

        function fillRect(x0, y, z0, width, depth, color) {
            if (width <= 0 || depth <= 0) return;

            const evenWidth = width - (width % 2);
            const evenDepth = depth - (depth % 2);

            if (evenWidth >= 2 && evenDepth >= 2) {
                addFilledRectSafe(builder, x0, y, z0, evenWidth, evenDepth, color);
            }

            for (let x = x0 + evenWidth; x < x0 + width; x++) {
                for (let z = z0; z < z0 + depth; z++) {
                    place("1x1", color, 0, x, y, z);
                }
            }

            for (let x = x0; x < x0 + evenWidth; x++) {
                for (let z = z0 + evenDepth; z < z0 + depth; z++) {
                    place("1x1", color, 0, x, y, z);
                }
            }
        }

        function addSolid(x0, y0, z0, width, depth, height, color) {
            for (let y = y0; y < y0 + height; y++) {
                fillRect(x0, y, z0, width, depth, color);
            }
        }

        function addFrontWall(box, skipFn, colorFn) {
            const z = box.z0;
            for (let y = box.wallY; y < box.wallY + box.wallHeight; y++) {
                for (let x = box.x0; x < box.x0 + box.width; x++) {
                    if (skipFn?.(x, y)) continue;
                    place("1x1", colorFn(x, y, z), 0, x, y, z);
                }
            }
        }

        function addBackWall(box, skipFn, colorFn) {
            const z = box.z0 + box.depth - 1;
            for (let y = box.wallY; y < box.wallY + box.wallHeight; y++) {
                for (let x = box.x0; x < box.x0 + box.width; x++) {
                    if (skipFn?.(x, y)) continue;
                    place("1x1", colorFn(x, y, z), 0, x, y, z);
                }
            }
        }

        function addLeftWall(box, skipFn, colorFn) {
            const x = box.x0;
            for (let y = box.wallY; y < box.wallY + box.wallHeight; y++) {
                for (let z = box.z0 + 1; z < box.z0 + box.depth - 1; z++) {
                    if (skipFn?.(z, y)) continue;
                    place("1x1", colorFn(x, y, z), 0, x, y, z);
                }
            }
        }

        function addRightWall(box, skipFn, colorFn) {
            const x = box.x0 + box.width - 1;
            for (let y = box.wallY; y < box.wallY + box.wallHeight; y++) {
                for (let z = box.z0 + 1; z < box.z0 + box.depth - 1; z++) {
                    if (skipFn?.(z, y)) continue;
                    place("1x1", colorFn(x, y, z), 0, x, y, z);
                }
            }
        }

        function addRoof(box, wallColor, steps = 4) {
            const x1 = box.x0 + box.width - 1;
            const z1 = box.z0 + box.depth - 1;

            for (let step = 0; step < steps; step++) {
                const y = box.roofY + step;
                const frontZ = box.z0 + step;
                const backZ = z1 - 1 - step;

                for (let x = box.x0; x <= x1; x++) {
                    place("Roof 1x2", (x + step) % 3 === 0 ? palette.roofLight : palette.roof, 0, x, y, frontZ);
                    place("Roof 1x2", (x + step + 1) % 3 === 0 ? palette.roofLight : palette.roof, 2, x, y, backZ);
                }

                for (let z = box.z0 + 2 + step; z <= z1 - 2 - step; z++) {
                    place("1x1", wallColor, 0, box.x0, y, z);
                    place("1x1", wallColor, 0, x1, y, z);
                }
            }

            const ridgeZ = box.z0 + Math.floor((box.depth - 2) / 2);
            for (let x = box.x0; x <= x1 - 1; x += 2) {
                place("Tile 2x2", palette.roofDark, 0, x, box.roofY + steps, ridgeZ);
            }
            for (let x = box.x0 + 1; x <= x1; x += 2) {
                place("1x1", palette.trimDark, 0, x, box.roofY + steps + 1, ridgeZ);
            }
        }

        function addScatter(points, color) {
            points.forEach(([lx, ly, lz]) => place("1x1", color, 0, lx, ly, lz));
        }

        fillRect(0, 0, 0, 40, 28, palette.baseEdge);
        fillRect(1, 1, 1, 38, 26, palette.ground);
        fillRect(2, 1, 3, 36, 22, palette.ground);

        fillRect(leftHouse.x0, 2, leftHouse.z0, leftHouse.width, leftHouse.depth, palette.path);
        fillRect(rightHouse.x0, 2, rightHouse.z0, rightHouse.width, rightHouse.depth, palette.path);
        fillRect(patio.x0, 2, patio.z0, patio.width, patio.depth, palette.path);
        fillRect(18, 2, 23, 6, 2, palette.path);

        fillRect(5, 2, 6, 3, 2, palette.path);
        fillRect(7, 2, 7, 3, 2, palette.path);
        addScatter([
            [10, 2, 7], [11, 2, 7], [12, 2, 8], [13, 2, 8], [14, 2, 8],
            [26, 2, 12], [27, 2, 12], [28, 2, 12],
        ], palette.groundShade);

        place("Window", palette.window, 0, 5, 4, leftHouse.z0);
        place("Window", palette.window, 0, 12, 4, leftHouse.z0);
        place("Window", palette.window, 2, 6, 4, leftHouse.z0 + leftHouse.depth - 2);
        place("Window", palette.window, 2, 11, 4, leftHouse.z0 + leftHouse.depth - 2);
        place("Window", palette.window, 1, leftHouse.x0, 4, 13);
        place("Window", palette.window, 1, rightHouse.x0 + rightHouse.width - 2, 6, 17);
        place("Window", palette.window, 2, 21, 6, rightHouse.z0 + rightHouse.depth - 2);

        addFrontWall(
            leftHouse,
            (x, y) =>
                ((x === 8 || x === 9) && y <= 5) ||
                (x === 5 && (y === 4 || y === 5)) ||
                (x === 12 && (y === 4 || y === 5)) ||
                ((x === 7 || x === 10) && y >= 3 && y <= 5) ||
                ((x === 4 || x === 6 || x === 8 || x === 9 || x === 11 || x === 13) && y === 6),
            (x, y) => {
                if (y === 7) return palette.trim;
                if ((x <= 6 && y <= 5) || (x >= 10 && x <= 11 && y <= 5)) return palette.plasterRose;
                if ((x === 4 || x === 5 || x === 13 || (x === 12 && y === 6)) && y >= 4) return palette.stonePatch;
                if (x === 7 || x === 10) return palette.wallWarm;
                return palette.wallLight;
            },
        );

        addBackWall(
            leftHouse,
            (x, y) => (x === 6 && (y === 4 || y === 5)) || (x === 11 && (y === 4 || y === 5)),
            (x, y) => {
                if (y === 7) return palette.trim;
                if ((x === 5 || x === 12) && y >= 4) return palette.stonePatch;
                return y === 3 ? palette.wallWarm : palette.wallLight;
            },
        );

        addLeftWall(
            leftHouse,
            (z, y) => z === 13 && (y === 4 || y === 5),
            (_x, y, z) => {
                if (y === 7) return palette.trim;
                if ((z === 11 || z === 16) && y >= 4) return palette.stonePatch;
                return z >= 17 && y <= 5 ? palette.plasterRose : palette.wallLight;
            },
        );

        addRightWall(
            leftHouse,
            null,
            (_x, y, z) => {
                if (y === 7) return palette.trim;
                if ((z === 12 || z === 15) && y >= 4) return palette.wallWarm;
                return palette.wallLight;
            },
        );

        addFrontWall(
            rightHouse,
            (x, y) =>
                ((x === 20 || x === 23) && y === 4) ||
                ((x === 21 || x === 24) && y === 5),
            (x, y) => {
                if (y === 9) return palette.trim;
                if (x >= 19 && x <= 25 && y <= 7) return palette.wallLight;
                if ((x === 18 || x === 19) && y >= 5 && y <= 7) return palette.turquoise;
                if (x === 27 && y >= 6) return palette.turquoise;
                return y <= 4 ? palette.ochreDark : palette.ochre;
            },
        );

        addBackWall(
            rightHouse,
            (x, y) => x === 21 && (y === 6 || y === 7),
            (x, y) => {
                if (y === 9) return palette.trim;
                if (x === 20 || x === 24) return palette.turquoise;
                return y <= 4 ? palette.ochreDark : palette.ochre;
            },
        );

        addLeftWall(
            rightHouse,
            null,
            (_x, y, z) => {
                if (y === 9) return palette.trim;
                if ((z === 15 || z === 16) && y >= 5) return palette.turquoise;
                return palette.ochre;
            },
        );

        addRightWall(
            rightHouse,
            (z, y) => z === 17 && (y === 6 || y === 7),
            (_x, y, z) => {
                if (y === 9) return palette.trim;
                if ((z === 15 || z === 16 || z === 17) && y >= 5) return palette.turquoise;
                if (z >= 20 && y === 4) return palette.stonePatch;
                return y <= 4 ? palette.ochreDark : palette.ochre;
            },
        );

        for (let y = 3; y <= 5; y++) {
            place("1x1", palette.trimDark, 0, 7, y, leftHouse.z0);
            place("1x1", palette.trimDark, 0, 10, y, leftHouse.z0);
        }
        for (let x = 8; x <= 9; x++) {
            place("1x1", palette.trimDark, 0, x, 6, leftHouse.z0);
            place("1x1", palette.doorShadow, 0, x, 3, leftHouse.z0 + 1);
            place("1x1", palette.doorShadow, 0, x, 4, leftHouse.z0 + 1);
            place("1x1", palette.doorShadow, 0, x, 5, leftHouse.z0 + 1);
        }
        place("1x1", palette.trimDark, 0, 4, 6, leftHouse.z0);
        place("1x1", palette.trimDark, 0, 6, 6, leftHouse.z0);
        place("1x1", palette.trimDark, 0, 11, 6, leftHouse.z0);
        place("1x1", palette.trimDark, 0, 13, 6, leftHouse.z0);

        addRoof(leftHouse, palette.wallWarm, 4);
        addRoof(rightHouse, palette.ochre, 4);

        [
            [19, 10], [24, 10], [19, 12], [24, 12],
        ].forEach(([lx, lz]) => addPillarStackSafe(builder, lx, 3, lz, 4, palette.trimDark));

        for (let x = 19; x <= 24; x++) {
            place("1x1", palette.trim, 0, x, 7, 10);
            place("1x1", palette.trim, 0, x, 7, 12);
        }
        for (let z = 11; z <= 11; z++) {
            place("1x1", palette.trim, 0, 19, 7, z);
            place("1x1", palette.trim, 0, 24, 7, z);
        }
        [20, 21, 22, 23].forEach((x) => place("1x1", palette.trim, 0, x, 7, 11));
        [
            [19, 6, 11], [20, 6, 10], [21, 5, 10], [24, 6, 11],
            [23, 6, 12], [23, 5, 12], [20, 5, 12], [22, 6, 12],
            [20, 4, 13], [21, 5, 13], [23, 4, 13], [24, 5, 13],
            [19, 5, 11], [24, 5, 11],
        ].forEach(([lx, ly, lz], index) => {
            place("1x1", index % 3 === 0 ? palette.vineDark : palette.vine, 0, lx, ly, lz);
        });

        addSolid(30, 2, 14, 7, 7, 1, palette.rockDark);
        addSolid(33, 2, 18, 5, 4, 1, palette.rockDark);
        addSolid(31, 3, 15, 6, 6, 1, palette.rock);
        addSolid(32, 4, 16, 5, 5, 1, palette.rockLight);
        addSolid(33, 5, 17, 3, 3, 1, palette.rockLight);
        addScatter([
            [30, 3, 14], [30, 3, 16], [30, 4, 17], [30, 4, 14], [30, 5, 15],
            [31, 5, 14], [38, 2, 18], [38, 2, 19], [38, 3, 20], [37, 4, 21],
            [32, 6, 15], [33, 6, 16], [36, 5, 21], [37, 5, 20], [35, 6, 22],
            [33, 6, 15], [31, 4, 21], [30, 3, 22],
        ], palette.rock);
        addScatter([
            [30, 3, 15], [31, 4, 15], [32, 5, 15], [37, 4, 18], [37, 5, 19], [36, 6, 20],
        ], palette.rockLight);
        addScatter([
            [36, 5, 18], [37, 5, 18], [38, 5, 19], [38, 4, 18],
        ], palette.rockDark);

        addPillarStackSafe(builder, 34, 6, 18, 8, palette.barkDark);
        addPillarStackSafe(builder, 35, 6, 18, 6, palette.bark);
        addScatter([
            [33, 7, 18], [35, 8, 17], [36, 9, 17], [33, 10, 17], [35, 10, 19],
            [32, 10, 18], [36, 11, 19], [33, 11, 20], [34, 12, 16],
        ], palette.barkDark);

        [
            { y: 12, points: [[30, 16], [32, 14], [34, 14], [36, 14], [38, 16], [30, 18], [32, 18], [36, 18]] },
            { y: 13, points: [[30, 14], [32, 14], [34, 14], [36, 14], [38, 14], [30, 16], [32, 16], [34, 16], [36, 16], [38, 16], [32, 18], [36, 18]] },
            { y: 14, points: [[32, 12], [34, 12], [36, 12], [30, 14], [32, 14], [34, 14], [36, 14], [38, 14], [32, 16], [34, 16], [36, 16]] },
            { y: 15, points: [[32, 12], [34, 12], [36, 12], [32, 14], [34, 14], [36, 14], [34, 16]] },
        ].forEach((layer, layerIndex) => {
            layer.points.forEach(([lx, lz], pointIndex) => {
                const color = (layerIndex + pointIndex) % 3 === 0
                    ? palette.blossomDark
                    : ((layerIndex + pointIndex) % 2 === 0 ? palette.blossom : palette.blossomLight);
                place("2x2", color, 0, lx, layer.y, lz);
            });
        });

        addScatter([
            [31, 11, 14], [32, 10, 16], [36, 11, 14], [37, 11, 16], [38, 11, 17], [31, 9, 19],
            [34, 11, 21], [35, 11, 20], [37, 10, 19],
        ], palette.blossom);

        addScatter([
            [3, 2, 11], [3, 2, 12], [2, 2, 12], [31, 2, 23], [32, 2, 23], [33, 2, 22],
            [36, 2, 23], [37, 2, 24], [35, 2, 24],
        ], palette.leaf);
        addScatter([
            [2, 2, 10], [3, 2, 10], [4, 2, 8], [30, 2, 22], [31, 2, 22], [34, 2, 23],
            [36, 2, 22], [38, 2, 24],
        ], palette.leafLight);

        fillRect(21, 3, 11, 2, 2, palette.trim);
        addScatter([
            [21, 4, 11], [22, 4, 12], [22, 4, 11],
        ], palette.flowerA);
        addScatter([
            [21, 4, 12], [21, 5, 11],
        ], palette.flowerB);

        addScatter([
            [7, 3, 8], [8, 3, 8], [9, 3, 8], [10, 3, 8], [12, 3, 8],
            [27, 2, 24], [28, 2, 24], [29, 2, 24], [30, 2, 24],
        ], palette.groundShade);
        addScatter([
            [37, 2, 25], [38, 2, 25], [38, 2, 26],
        ], palette.water);

        return builder.blocks;
    })(),
};

export default CasaMediterraneaPatio;