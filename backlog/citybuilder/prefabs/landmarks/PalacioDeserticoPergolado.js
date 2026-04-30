import {
    addFilledRectSafe,
    addPillarStackSafe,
    createPrefabBuilder,
} from "../shared/core.js";

const PalacioDeserticoPergolado = {
    dx: 36,
    dy: 17,
    dz: 26,
    blocks: (function () {
        const builder = createPrefabBuilder();

        const palette = {
            stone: "#d8c39a",
            sandBase: "#d7c08a",
            sandLight: "#e6d8ab",
            sandShadow: "#bea56d",
            trim: "#f1e2bc",
            accent: "#8f7a4f",
            dark: "#1d1a17",
            wood: "#8b5a2b",
            leaf: "#4e7c40",
            leafLight: "#6b9f5c",
        };

        function place(type, color, rot, lx, ly, lz, options = {}) {
            const added = builder.add(type, color, rot, lx, ly, lz, options);
            if (!added) {
                throw new Error(`PalacioDeserticoPergolado overlap near ${type} @ ${lx},${ly},${lz}`);
            }
        }

        function fillLine1x1(x0, y, z0, width, depth, color) {
            for (let x = x0; x < x0 + width; x++) {
                for (let z = z0; z < z0 + depth; z++) {
                    place("1x1", color, 0, x, y, z);
                }
            }
        }

        function addOptimizedRect(x0, y, z0, width, depth, color) {
            if (width <= 0 || depth <= 0) return;

            if (width === 1 || depth === 1) {
                fillLine1x1(x0, y, z0, width, depth, color);
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
                    throw new Error(`PalacioDeserticoPergolado overlap in filled rect @ ${x0},${y},${z0}`);
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

        function addPillarStackChecked(lx, y0, lz, height, color) {
            if (height <= 0) return;

            const before = builder.blocks.length;
            addPillarStackSafe(builder, lx, y0, lz, height, color);
            const expected = Math.floor(height / 3) + (height % 3);
            if (builder.blocks.length - before !== expected) {
                throw new Error(`PalacioDeserticoPergolado overlap in pillar @ ${lx},${y0},${lz}`);
            }
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

        function addPergola(x0, y, z0, width, depth) {
            const x1 = x0 + width - 1;
            const z1 = z0 + depth - 1;

            addPillarStackChecked(x0, y, z0, 4, palette.wood);
            addPillarStackChecked(x1, y, z0, 4, palette.wood);
            addPillarStackChecked(x0, y, z1, 4, palette.wood);
            addPillarStackChecked(x1, y, z1, 4, palette.wood);

            for (let x = x0; x <= x1; x += 2) {
                place("Roof 1x2", palette.dark, 1, x, y + 4, z0);
                place("Roof 1x2", palette.dark, 1, x, y + 4, z1);
            }

            for (let z = z0 + 1; z < z1 - 1; z += 2) {
                place("Roof 1x2", palette.dark, 0, x0, y + 4, z);
                place("Roof 1x2", palette.dark, 0, x1, y + 4, z);
            }

            [
                [x0 + 1, y + 4, z0 + 1, palette.leaf],
                [x0 + 2, y + 3, z0 + 1, palette.leafLight],
                [x0 + 3, y + 4, z0 + 3, palette.leaf],
                [x0 + 2, y + 3, z0 + 5, palette.leafLight],
                [x1 - 1, y + 4, z0 + 2, palette.leaf],
                [x1 - 2, y + 3, z0 + 4, palette.leafLight],
            ].forEach(([lx, ly, lz, color]) => {
                place("1x1", color, 0, lx, ly, lz);
            });
        }

        function addFrontExtensionParapet(x0, z0, width, depth, y, color = palette.trim) {
            const x1 = x0 + width - 1;
            const z1 = z0 + depth - 1;

            for (let x = x0; x <= x1; x++) {
                place("1x1", color, 0, x, y, z0);
            }
            for (let z = z0 + 1; z <= z1; z++) {
                place("1x1", color, 0, x0, y, z);
                place("1x1", color, 0, x1, y, z);
            }
        }

        addOptimizedRect(2, 0, 3, 32, 20, palette.stone);
        addOptimizedRect(4, 1, 5, 28, 16, palette.sandLight);

        addOptimizedRect(12, 1, 3, 12, 2, palette.stone);
        addOptimizedRect(13, 2, 5, 10, 2, palette.sandLight);
        addOptimizedRect(14, 2, 7, 8, 1, palette.sandBase);

        for (let y = 2; y <= 5; y++) {
            for (let x = 5; x <= 30; x++) {
                const isPorticoGap = x >= 14 && x <= 21;
                const isDoor = x >= 27 && x <= 28 && y <= 4;
                const isSlit = y === 4 && (x === 7 || x === 9 || x === 24 || x === 26);

                if (isPorticoGap || isDoor || isSlit) continue;

                const color = y === 5 && x % 2 === 1 ? palette.accent : palette.sandBase;
                place("1x1", color, 0, x, y, 10);
            }

            for (let x = 5; x <= 30; x++) {
                const color = y === 5 && x % 2 === 0 ? palette.accent : palette.sandBase;
                place("1x1", color, 0, x, y, 19);
            }

            for (let z = 11; z <= 18; z++) {
                const leftColor = y === 5 && z % 2 === 0 ? palette.accent : palette.sandBase;
                const rightColor = y === 5 && z % 2 === 1 ? palette.accent : palette.sandBase;
                place("1x1", leftColor, 0, 5, y, z);
                place("1x1", rightColor, 0, 30, y, z);
            }
        }

        [7, 9, 24, 26].forEach((x) => {
            place("1x1", palette.dark, 0, x, 4, 10);
        });
        for (let y = 2; y <= 4; y++) {
            place("1x1", palette.dark, 0, 27, y, 10);
            place("1x1", palette.dark, 0, 28, y, 10);
        }

        for (let y = 2; y <= 5; y++) {
            for (let z = 8; z <= 12; z++) {
                if (z === 10) continue;
                const edgeColor = y === 5 ? palette.accent : palette.sandBase;
                place("1x1", edgeColor, 0, 13, y, z);
                place("1x1", edgeColor, 0, 22, y, z);
            }

            for (let x = 15; x <= 20; x++) {
                place("1x1", palette.dark, 0, x, y, 13);
            }
        }

        [14, 16, 18, 20].forEach((x) => {
            addPillarStackChecked(x, 2, 10, 4, palette.dark);
        });

        addOptimizedRect(5, 6, 10, 26, 10, palette.sandBase);
        addOptimizedRect(13, 6, 8, 10, 2, palette.sandBase);
        addParapet(5, 10, 26, 10, 7, palette.trim);
        addFrontExtensionParapet(13, 8, 10, 2, 7, palette.trim);

        for (let y = 7; y <= 10; y++) {
            for (let x = 9; x <= 16; x++) {
                const isSlit = y === 9 && (x === 11 || x === 14);
                if (isSlit) continue;
                const color = y === 10 && x % 2 === 0 ? palette.accent : palette.sandBase;
                place("1x1", color, 0, x, y, 11);
                place("1x1", color, 0, x, y, 17);
            }

            for (let z = 12; z <= 16; z++) {
                const leftColor = y === 10 && z % 2 === 0 ? palette.accent : palette.sandBase;
                const rightColor = y === 10 && z % 2 === 1 ? palette.accent : palette.sandBase;
                place("1x1", leftColor, 0, 9, y, z);
                place("1x1", rightColor, 0, 16, y, z);
            }
        }
        place("1x1", palette.dark, 0, 11, 9, 11);
        place("1x1", palette.dark, 0, 14, 9, 11);
        addOptimizedRect(9, 11, 11, 8, 7, palette.sandLight);
        addParapet(9, 11, 8, 7, 12, palette.trim);
        addOptimizedRect(10, 13, 12, 6, 4, palette.sandLight);
        addParapet(10, 12, 6, 4, 14, palette.trim);

        for (let y = 7; y <= 9; y++) {
            for (let x = 18; x <= 23; x++) {
                const isSlit = y === 8 && (x === 20 || x === 21);
                if (isSlit) continue;
                const color = y === 9 && x % 2 === 0 ? palette.accent : palette.sandBase;
                place("1x1", color, 0, x, y, 11);
                place("1x1", color, 0, x, y, 16);
            }

            for (let z = 12; z <= 15; z++) {
                const leftColor = y === 9 && z % 2 === 0 ? palette.accent : palette.sandBase;
                const rightColor = y === 9 && z % 2 === 1 ? palette.accent : palette.sandBase;
                place("1x1", leftColor, 0, 18, y, z);
                place("1x1", rightColor, 0, 23, y, z);
            }
        }
        place("1x1", palette.dark, 0, 20, 8, 11);
        place("1x1", palette.dark, 0, 21, 8, 11);
        addOptimizedRect(18, 10, 11, 6, 6, palette.sandLight);
        addParapet(18, 11, 6, 6, 11, palette.trim);

        addPergola(25, 7, 11, 5, 7);

        [
            [8, 2, 8],
            [10, 2, 7],
            [25, 2, 7],
            [27, 2, 8],
            [7, 2, 20],
            [28, 2, 20],
        ].forEach(([lx, ly, lz], index) => {
            place("1x1", index % 2 === 0 ? palette.sandShadow : palette.stone, 0, lx, ly, lz);
        });

        return builder.blocks;
    })(),
};

export default PalacioDeserticoPergolado;