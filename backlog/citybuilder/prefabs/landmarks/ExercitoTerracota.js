import { createPrefabBuilder, addFilledRectSafe } from "../shared/core.js";
const ExercitoTerracota = {
    dx: 28,
    dy: 9,
    dz: 20,
    blocks: (function () {
        const builder = createPrefabBuilder();
        const terracotta = "#ad6a47";
        const shadow = "#6b4d3b";
        const ivory = "#d7c39d";
        const red = "#8b4338";
        const rowZs = [3, 6, 9, 12, 15];
        const formations = [
            { side: "left", xs: [1, 3, 5, 7, 9] },
            { side: "right", xs: [18, 20, 22, 24, 26] },
        ];
        const detailOffsets = {
            left: [ [1, 0], [0, 1], [0, -1], [-1, 0] ],
            right: [ [-1, 0], [0, 1], [0, -1], [1, 0] ],
        };
        function addSoldier(lx, lz, rowIndex, colIndex, side) {
            const [offsetX, offsetZ] = detailOffsets[side][(rowIndex + colIndex) % detailOffsets[side].length];
            builder.add("2x2", shadow, 0, lx, 2, lz);
            builder.add("Pillar", terracotta, 0, lx, 3, lz);
            builder.add("1x1", terracotta, 0, lx, 6, lz);
            builder.add("1x1", shadow, 0, lx, 7, lz);
            builder.add("1x1", shadow, 0, lx + offsetX, 5, lz + offsetZ);
        }
        // Bases
        addFilledRectSafe(builder, 0, 0, 0, 28, 20, shadow);
        addFilledRectSafe(builder, 0, 1, 0, 28, 2, shadow);
        addFilledRectSafe(builder, 0, 1, 18, 28, 2, shadow);
        addFilledRectSafe(builder, 0, 1, 2, 12, 16, shadow);
        addFilledRectSafe(builder, 16, 1, 2, 12, 16, shadow);
        // Passarelas
        for (let z = 2; z <= 16; z += 2) {
            builder.add("Tile 2x2", ivory, 0, 12, 1, z);
            builder.add("Tile 2x2", ivory, 0, 14, 1, z);
        }
        [0, 18].forEach((z) => {
            builder.add("Tile 2x2", ivory, 0, 12, 1, z);
            builder.add("Tile 2x2", ivory, 0, 14, 1, z);
        });
        [1, 17].forEach((lz) => {
            builder.add("Pillar", ivory, 0, 11, 2, lz);
            builder.add("Pillar", ivory, 0, 16, 2, lz);
            builder.add("1x1", red, 0, 11, 5, lz);
            builder.add("1x1", red, 0, 16, 5, lz);
        });
        [4, 10, 16].forEach((lz) => {
            builder.add("1x1", ivory, 0, 11, 2, lz);
            builder.add("1x1", ivory, 0, 16, 2, lz);
            builder.add("1x1", red, 0, 11, 3, lz);
            builder.add("1x1", red, 0, 16, 3, lz);
        });
        // Soldados
        formations.forEach((formation) => {
            rowZs.forEach((lz, rowIndex) => {
                formation.xs.forEach((lx, colIndex) => {
                    addSoldier(lx, lz, rowIndex, colIndex, formation.side);
                });
            });
        });
        return builder.blocks;
    })(),
};

export default ExercitoTerracota;

