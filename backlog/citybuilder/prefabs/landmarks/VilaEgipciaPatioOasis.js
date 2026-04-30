import {
    addFilledRectSafe,
    addPillarStackSafe,
    createPrefabBuilder,
} from "../shared/core.js";
import { addPoolSafe } from "../shared/modern.js";

const VilaEgipciaPatioOasis = {
    dx: 44,
    dy: 18,
    dz: 36,
    blocks: (function () {
        const builder = createPrefabBuilder();

        const palette = {
            sandBase: "#d7c08a",
            sandLight: "#e6d8ab",
            sandShadow: "#bea56d",
            stone: "#d8c39a",
            trim: "#f0e1b8",
            dark: "#1f1b16",
            wood: "#8b5a2b",
            fabric: "#f0e1c2",
            fabricStripe: "#c74e24",
            accentGreen: "#2f8f5f",
            accentRed: "#c74e24",
            accentGold: "#f2cd37",
            trunk: "#6b4b34",
            trunkDark: "#553823",
            palm: "#237841",
            palmLight: "#3aad4f",
            water: "#58b8e4",
            flowerPink: "#d77aa8",
            flowerRose: "#f0a3b7",
            jar: "#b99552",
            jarCap: "#8f7a4f",
        };

        function place(type, color, rot, lx, ly, lz, options = {}) {
            const added = builder.add(type, color, rot, lx, ly, lz, options);
            if (!added) {
                throw new Error(`VilaEgipciaPatioOasis overlap near ${type} @ ${lx},${ly},${lz}`);
            }
        }

        function fill1x1(x0, y, z0, width, depth, color) {
            for (let x = x0; x < x0 + width; x++) {
                for (let z = z0; z < z0 + depth; z++) {
                    place("1x1", color, 0, x, y, z);
                }
            }
        }

        function addOptimizedRect(x0, y, z0, width, depth, color) {
            if (width <= 0 || depth <= 0) return;

            if (width === 1 || depth === 1) {
                fill1x1(x0, y, z0, width, depth, color);
                return;
            }

            const evenWidth = width - (width % 2);
            const evenDepth = depth - (depth % 2);
            const maxX = x0 + width - 1;
            const maxZ = z0 + depth - 1;

            if (evenWidth >= 2 && evenDepth >= 2) {
                const before = builder.blocks.length;
                addFilledRectSafe(builder, x0, y, z0, evenWidth, evenDepth, color);
                const columns = evenWidth / 2;
                const blocksPerColumn = Math.floor(evenDepth / 4) + ((evenDepth % 4) >= 2 ? 1 : 0);
                const expected = columns * blocksPerColumn;
                if (builder.blocks.length - before !== expected) {
                    throw new Error(`VilaEgipciaPatioOasis overlap in filled rect @ ${x0},${y},${z0}`);
                }
            }

            if (width % 2 !== 0) {
                for (let z = z0; z < z0 + evenDepth; z++) {
                    place("1x1", color, 0, maxX, y, z);
                }
            }

            if (depth % 2 !== 0) {
                for (let x = x0; x < x0 + evenWidth; x++) {
                    place("1x1", color, 0, x, y, maxZ);
                }
            }

            if (width % 2 !== 0 && depth % 2 !== 0) {
                place("1x1", color, 0, maxX, y, maxZ);
            }
        }

        function addPillarChecked(lx, y0, lz, height, color) {
            if (height <= 0) return;

            const before = builder.blocks.length;
            addPillarStackSafe(builder, lx, y0, lz, height, color);
            const expected = Math.floor(height / 3) + (height % 3);
            if (builder.blocks.length - before !== expected) {
                throw new Error(`VilaEgipciaPatioOasis overlap in pillar @ ${lx},${y0},${lz}`);
            }
        }

        function addPoolChecked(x0, y, z0, width, depth, rimColor = palette.stone, waterColor = palette.water) {
            const before = builder.blocks.length;
            addPoolSafe(builder, x0, y, z0, width, depth, rimColor, waterColor);
            const waterColumns = Math.ceil(width / 2) * Math.ceil(depth / 2);
            const rimBlocks = width * 2 + depth * 2 - 4;
            const expected = waterColumns + rimBlocks;
            if (builder.blocks.length - before !== expected) {
                throw new Error(`VilaEgipciaPatioOasis overlap in pool @ ${x0},${y},${z0}`);
            }
        }

        function pickWallColor(x, y, z, bandY, bandColor) {
            if (y === bandY) return bandColor;
            if ((x * 3 + z + y) % 17 === 0) return palette.sandShadow;
            return palette.sandLight;
        }

        function addParapet(x0, z0, width, depth, y, color = palette.trim) {
            const x1 = x0 + width - 1;
            const z1 = z0 + depth - 1;

            for (let x = x0; x <= x1; x++) {
                place("1x1", color, 0, x, y, z0);
                place("1x1", color, 0, x, y, z1);
            }

            for (let z = z0 + 1; z < z1; z++) {
                place("1x1", color, 0, x0, y, z);
                place("1x1", color, 0, x1, y, z);
            }
        }

        function addRectShell(spec) {
            const {
                x0, z0, width, depth, y0, height,
                bandY, bandColor,
                frontOpen = () => false,
                backOpen = () => false,
                leftOpen = () => false,
                rightOpen = () => false,
            } = spec;
            const x1 = x0 + width - 1;
            const z1 = z0 + depth - 1;

            for (let y = y0; y < y0 + height; y++) {
                for (let x = x0; x <= x1; x++) {
                    if (!frontOpen(x, y)) {
                        place("1x1", pickWallColor(x, y, z0, bandY, bandColor), 0, x, y, z0);
                    }
                    if (!backOpen(x, y)) {
                        place("1x1", pickWallColor(x, y, z1, bandY, bandColor), 0, x, y, z1);
                    }
                }

                for (let z = z0 + 1; z < z1; z++) {
                    if (!leftOpen(z, y)) {
                        place("1x1", pickWallColor(x0, y, z, bandY, bandColor), 0, x0, y, z);
                    }
                    if (!rightOpen(z, y)) {
                        place("1x1", pickWallColor(x1, y, z, bandY, bandColor), 0, x1, y, z);
                    }
                }
            }
        }

        function addCompactPalm(lx, y0, lz, options = {}) {
            const { height = 5, leanX = 0, leanZ = 0 } = options;
            let topX = lx;
            let topZ = lz;

            for (let index = 0; index < height; index++) {
                topX = lx + Math.round((index / Math.max(1, height - 1)) * leanX);
                topZ = lz + Math.round((index / Math.max(1, height - 1)) * leanZ);
                place("1x1", index % 2 === 0 ? palette.trunkDark : palette.trunk, 0, topX, y0 + index, topZ);
            }

            const topY = y0 + height - 1;
            [
                [-1, 0, 0, palette.palm],
                [1, 0, 0, palette.palm],
                [0, -1, 0, palette.palmLight],
                [0, 1, 0, palette.palmLight],
                [-1, -1, 1, palette.palmLight],
                [1, -1, 1, palette.palmLight],
                [-1, 1, 1, palette.palm],
                [1, 1, 1, palette.palm],
            ].forEach(([ox, oz, oy, color]) => {
                place("1x1", color, 0, topX + ox, topY + oy, topZ + oz);
            });
        }

        function addFlowerPatch(x0, z0, colorA, colorB) {
            [
                [x0, z0], [x0 + 1, z0 + 1], [x0 + 2, z0], [x0 + 1, z0 + 2],
            ].forEach(([lx, lz], index) => {
                place("1x1", index % 2 === 0 ? palette.palm : palette.palmLight, 0, lx, 2, lz);
                place("1x1", index % 2 === 0 ? colorA : colorB, 0, lx, 3, lz);
            });
        }

        function addReedPatch(x, z, height = 3) {
            for (let y = 2; y < 2 + height; y++) {
                place("1x1", y % 2 === 0 ? palette.palm : palette.palmLight, 0, x, y, z);
            }
        }

        function addJar(x0, z0, height = 3) {
            for (let y = 3; y < 3 + height; y++) {
                addOptimizedRect(x0, y, z0, 2, 2, palette.jar);
            }
            addOptimizedRect(x0, 3 + height, z0, 2, 2, palette.jarCap);
        }

        function addAwning(x0, z0, width) {
            const frontY = 10;
            const backY = 11;
            const backZ = z0 + 2;

            addPillarChecked(x0, 7, z0, 3, palette.wood);
            addPillarChecked(x0 + width - 1, 7, z0, 3, palette.wood);

            for (let x = x0; x < x0 + width; x += 2) {
                place("Roof 1x2", (x / 2) % 2 === 0 ? palette.fabric : palette.fabricStripe, 1, x, backY, backZ);
                place("Roof 1x2", (x / 2) % 2 === 0 ? palette.fabricStripe : palette.fabric, 1, x, frontY, z0);
            }
        }

        addOptimizedRect(0, 0, 0, 44, 36, palette.sandBase);
        addOptimizedRect(1, 1, 1, 42, 34, palette.sandLight);
        addOptimizedRect(19, 2, 9, 4, 4, palette.stone);
        addOptimizedRect(3, 2, 18, 6, 1, palette.stone);
        addOptimizedRect(3, 2, 23, 6, 2, palette.stone);
        addOptimizedRect(3, 2, 19, 1, 4, palette.stone);
        addOptimizedRect(8, 2, 19, 2, 4, palette.stone);
        addOptimizedRect(32, 2, 12, 8, 12, palette.stone);

        for (let y = 2; y <= 4; y++) {
            for (let x = 2; x <= 15; x++) {
                place("1x1", y === 4 ? palette.sandShadow : palette.sandBase, 0, x, y, 1);
            }
            for (let x = 27; x <= 41; x++) {
                place("1x1", y === 4 ? palette.sandShadow : palette.sandBase, 0, x, y, 1);
            }
            for (let z = 1; z <= 34; z++) {
                place("1x1", y === 4 ? palette.sandShadow : palette.sandBase, 0, 1, y, z);
                place("1x1", y === 4 ? palette.sandShadow : palette.sandBase, 0, 42, y, z);
            }
            for (let x = 2; x <= 41; x++) {
                place("1x1", y === 4 ? palette.sandShadow : palette.sandBase, 0, x, y, 34);
            }
        }

        addRectShell({
            x0: 17,
            z0: 1,
            width: 10,
            depth: 8,
            y0: 2,
            height: 4,
            bandY: 5,
            bandColor: palette.sandShadow,
            frontOpen: (x, y) => ((x >= 20 && x <= 23) && y <= 4) || ((x === 18 || x === 25) && (y === 3 || y === 4)) || (x >= 18 && x <= 25 && y === 5),
            backOpen: (x, y) => x >= 20 && x <= 23 && y <= 4,
        });
        addOptimizedRect(17, 6, 1, 10, 8, palette.sandLight);
        addParapet(17, 1, 10, 8, 7, palette.trim);
        [18, 25].forEach((x) => {
            place("1x1", palette.accentGreen, 0, x, 3, 1);
            place("1x1", palette.accentGold, 0, x, 4, 1);
        });
        for (let x = 18; x <= 25; x++) {
            const color = x % 3 === 0 ? palette.accentGreen : (x % 2 === 0 ? palette.accentRed : palette.accentGold);
            place("1x1", color, 0, x, 5, 1);
        }
        for (let y = 2; y <= 4; y++) {
            place("1x1", palette.dark, 0, 19, y, 2);
            place("1x1", palette.dark, 0, 24, y, 2);
        }

        addOptimizedRect(12, 6, 13, 19, 13, palette.sandLight);
        addRectShell({
            x0: 12,
            z0: 13,
            width: 19,
            depth: 13,
            y0: 2,
            height: 4,
            bandY: 5,
            bandColor: palette.accentRed,
            frontOpen: (x, y) => (((x === 20 || x === 21) && y <= 4) || ((x === 14 || x === 15 || x === 26 || x === 27) && y === 4) || (x >= 17 && x <= 24 && y === 5)),
            backOpen: (x, y) => ((x === 17 || x === 18 || x === 24 || x === 25) && y === 4),
            leftOpen: (z, y) => (z === 18 || z === 22) && y === 4,
            rightOpen: (z, y) => (z === 17 || z === 21) && y === 4,
        });
        addParapet(12, 13, 19, 13, 7, palette.trim);
        for (let y = 2; y <= 4; y++) {
            place("1x1", palette.dark, 0, 20, y, 14);
            place("1x1", palette.dark, 0, 21, y, 14);
        }
        for (let x = 17; x <= 24; x++) {
            const color = x % 3 === 0 ? palette.accentGreen : (x % 2 === 0 ? palette.accentRed : palette.accentGold);
            place("1x1", color, 0, x, 5, 13);
        }

        addRectShell({
            x0: 16,
            z0: 17,
            width: 10,
            depth: 8,
            y0: 7,
            height: 4,
            bandY: 10,
            bandColor: palette.accentRed,
            frontOpen: (x, y) => ((x === 18 || x === 19 || x === 22 || x === 23) && y === 9) || (x === 24 && y === 8),
            backOpen: (x, y) => ((x === 19 || x === 20 || x === 22) && y === 9),
            leftOpen: (z, y) => z === 21 && y === 9,
            rightOpen: (z, y) => z === 22 && y === 9,
        });
        addOptimizedRect(16, 11, 17, 10, 8, palette.sandLight);
        addParapet(16, 17, 10, 8, 12, palette.trim);
        addAwning(20, 14, 8);

        addRectShell({
            x0: 33,
            z0: 24,
            width: 7,
            depth: 7,
            y0: 2,
            height: 4,
            bandY: 5,
            bandColor: palette.sandShadow,
            frontOpen: (x, y) => x >= 35 && x <= 36 && y <= 4,
            leftOpen: (z, y) => z === 27 && y === 4,
        });
        addOptimizedRect(33, 6, 24, 7, 7, palette.sandLight);
        addParapet(33, 24, 7, 7, 7, palette.trim);
        for (let y = 3; y <= 4; y++) {
            for (let z = 13; z <= 22; z++) {
                if (z === 18 || z === 19) continue;
                place("1x1", palette.sandBase, 0, 32, y, z);
            }
        }

        addPoolChecked(4, 2, 19, 4, 4, palette.stone, palette.water);
        addCompactPalm(5, 2, 12, { height: 6, leanX: 1, leanZ: 1 });
        addCompactPalm(11, 2, 21, { height: 5, leanX: -1, leanZ: 1 });
        addCompactPalm(8, 2, 16, { height: 5, leanX: 0, leanZ: -1 });

        addFlowerPatch(7, 27, palette.flowerPink, palette.flowerRose);
        addFlowerPatch(9, 25, palette.flowerRose, palette.flowerPink);
        addFlowerPatch(14, 26, palette.flowerPink, palette.flowerRose);
        [8, 9, 10, 11, 12].forEach((z) => addReedPatch(9, z, 3));
        [20, 21, 22, 23].forEach((z) => addReedPatch(31, z, 3));
        [14, 15, 16, 17].forEach((z) => addReedPatch(31, z, 2));

        addJar(34, 16, 3);
        addJar(37, 19, 2);
        addJar(35, 22, 4);

        addOptimizedRect(3, 2, 28, 4, 3, palette.wood);
        addPillarChecked(3, 3, 28, 2, palette.wood);
        addPillarChecked(6, 3, 28, 2, palette.wood);
        addPillarChecked(3, 3, 30, 2, palette.wood);
        addPillarChecked(6, 3, 30, 2, palette.wood);
        place("Roof 1x2", palette.wood, 1, 3, 5, 28);
        place("Roof 1x2", palette.wood, 1, 5, 5, 28);
        place("Roof 1x2", palette.wood, 1, 3, 5, 30);
        place("Roof 1x2", palette.wood, 1, 5, 5, 30);

        return builder.blocks;
    })(),
};

export default VilaEgipciaPatioOasis;