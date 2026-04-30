import { createPrefabBuilder, addFilledRectSafe } from "../shared/core.js";

const CasaBrasileiraTijoloVista = {
    dx: 26,
    dy: 15,
    dz: 22,
    blocks: (function () {
        const builder = createPrefabBuilder();

        const palette = {
            grass: "#4e7c40",
            shrub: "#2f6734",
            shrubLight: "#5b8d4e",
            sidewalk: "#9f9a92",
            curb: "#6e6a63",
            wallConcrete: "#d8d0c2",
            porchFloor: "#b8b09a",
            gate: "#3d3a36",
            brick: "#8b4a32",
            brickDark: "#6f3926",
            brickLight: "#a55d41",
            roof: "#b45e37",
            roofDark: "#7a3d24",
            window: "#89b0c5",
            door: "#6b3b1f",
            trim: "#c9b7a0",
        };

        const house = {
            x0: 7,
            z0: 10,
            width: 12,
            depth: 7,
            wallY: 2,
            wallHeight: 4,
            roofY: 7,
        };

        function place(type, color, rot, lx, ly, lz, options = {}) {
            const added = builder.add(type, color, rot, lx, ly, lz, options);
            if (!added) {
                throw new Error(`CasaBrasileiraTijoloVista overlap near ${type} @ ${lx},${ly},${lz}`);
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

        function addPillarStackStrict(lx, y0, lz, height, color) {
            let y = y0;
            for (; y + 3 <= y0 + height; y += 3) {
                place("Pillar", color, 0, lx, y, lz);
            }
            for (; y < y0 + height; y++) {
                place("1x1", color, 0, lx, y, lz);
            }
        }

        function brickColor(x, y, z) {
            const mod = (x + y * 2 + z) % 6;
            if (mod === 0) return palette.brickLight;
            if (mod === 1) return palette.brickDark;
            return palette.brick;
        }

        fillRect(0, 0, 0, 26, 22, palette.grass);
        fillRect(0, 1, 0, 26, 2, palette.sidewalk);
        fillRect(0, 1, 2, 26, 1, palette.curb);

        for (let y = 1; y <= 2; y++) {
            for (let x = 3; x <= 9; x++) place("1x1", palette.wallConcrete, 0, x, y, 3);
            for (let x = 16; x <= 22; x++) place("1x1", palette.wallConcrete, 0, x, y, 3);
            for (let z = 4; z <= 17; z++) {
                place("1x1", palette.wallConcrete, 0, 2, y, z);
                place("1x1", palette.wallConcrete, 0, 23, y, z);
            }
            for (let x = 3; x <= 22; x++) place("1x1", palette.wallConcrete, 0, x, y, 18);
        }

        addPillarStackStrict(10, 1, 3, 3, palette.wallConcrete);
        addPillarStackStrict(15, 1, 3, 3, palette.wallConcrete);
        for (let x = 11; x <= 14; x++) {
            place("1x1", palette.gate, 0, x, 1, 3);
            place("1x1", palette.gate, 0, x, 2, 3);
        }

        fillRect(11, 1, 4, 4, 2, palette.sidewalk);
        fillRect(6, 1, 9, 14, 9, palette.trim);
        fillRect(8, 1, 6, 10, 3, palette.porchFloor);

        place("Window", palette.window, 0, 8, 3, house.z0);
        place("Window", palette.window, 0, 16, 3, house.z0);
        place("Window", palette.window, 2, 9, 3, house.z0 + house.depth - 2);
        place("Window", palette.window, 2, 15, 3, house.z0 + house.depth - 2);
        place("Window", palette.window, 1, house.x0, 3, 13);
        place("Window", palette.window, 1, house.x0 + house.width - 2, 3, 13);

        for (let y = house.wallY; y < house.wallY + house.wallHeight; y++) {
            for (let x = house.x0; x < house.x0 + house.width; x++) {
                if ((x === 12 || x === 13) && y <= 4) continue;
                if ((x === 8 || x === 16) && (y === 3 || y === 4)) continue;
                place("1x1", y === 5 ? palette.trim : brickColor(x, y, house.z0), 0, x, y, house.z0);
            }

            for (let x = house.x0; x < house.x0 + house.width; x++) {
                if ((x === 9 || x === 15) && (y === 3 || y === 4)) continue;
                place("1x1", y === 5 ? palette.trim : brickColor(x, y, house.z0 + house.depth - 1), 0, x, y, house.z0 + house.depth - 1);
            }

            for (let z = house.z0 + 1; z < house.z0 + house.depth - 1; z++) {
                if (z !== 13 || (y !== 3 && y !== 4)) {
                    place("1x1", y === 5 ? palette.trim : brickColor(house.x0, y, z), 0, house.x0, y, z);
                    place("1x1", y === 5 ? palette.trim : brickColor(house.x0 + house.width - 1, y, z), 0, house.x0 + house.width - 1, y, z);
                }
            }
        }

        for (let x = 12; x <= 13; x++) {
            place("1x1", palette.door, 0, x, 2, house.z0);
            place("1x1", palette.door, 0, x, 3, house.z0);
            place("1x1", palette.door, 0, x, 4, house.z0);
        }

        addPillarStackStrict(9, 2, 6, 4, palette.wallConcrete);
        addPillarStackStrict(16, 2, 6, 4, palette.wallConcrete);
        fillRect(8, 6, 5, 10, 3, palette.wallConcrete);
        fillRect(8, 6, 11, 10, 5, palette.trim);

        for (let step = 0; step < 3; step++) {
            const y = house.roofY + step;
            const frontZ = 9 + step;
            const backZ = 15 - step;

            for (let x = 6; x <= 19; x++) {
                place("Roof 1x2", (x + step) % 3 === 0 ? palette.roofDark : palette.roof, 0, x, y, frontZ);
                place("Roof 1x2", (x + step + 1) % 3 === 0 ? palette.roofDark : palette.roof, 2, x, y, backZ);
            }

            const sideStart = frontZ + 2;
            const sideEnd = backZ - 1;
            if (sideStart <= sideEnd) {
                for (let z = sideStart; z <= sideEnd; z++) {
                    place("1x1", brickColor(house.x0, y, z), 0, house.x0, y, z);
                    place("1x1", brickColor(house.x0 + house.width - 1, y, z), 0, house.x0 + house.width - 1, y, z);
                }
            }
        }

        [
            [4, 6], [5, 7], [4, 8], [20, 7], [21, 8], [20, 10],
            [4, 15], [5, 16], [20, 15], [21, 16], [9, 19], [16, 19],
        ].forEach(([lx, lz], index) => {
            place("1x1", index % 2 === 0 ? palette.shrub : palette.shrubLight, 0, lx, 1, lz);
        });

        [
            [3, 5], [4, 5], [5, 5], [19, 5], [20, 5], [21, 5],
            [21, 20], [22, 20], [23, 20],
        ].forEach(([lx, lz], index) => {
            place("1x1", index % 2 === 0 ? palette.shrubLight : palette.shrub, 0, lx, 1, lz);
        });

        return builder.blocks;
    })(),
};

export default CasaBrasileiraTijoloVista;