import { createPrefabBuilder, addFilledRectSafe } from "../shared/core.js";

const Casa = {
    dx: 12,
    dy: 10,
    dz: 12,
    blocks: (function () {
        const builder = createPrefabBuilder();
        const plaster = "#e7d7bd";
        const windowBlue = "#8ea9ba";
        const terracotta = "#b86340";
        // Base
        addFilledRectSafe(builder, 1, 0, 1, 10, 10, plaster);
        // Paredes
        for (let y = 1; y <= 3; y++) {
            for (let x = 1; x < 11; x++) {
                if (y === 2 && x > 4 && x < 7) continue;
                builder.add("1x1", plaster, 0, x, y, 1);
                builder.add("1x1", plaster, 0, x, y, 10);
            }
            for (let z = 2; z < 10; z++) {
                builder.add("1x1", plaster, 0, 1, y, z);
                builder.add("1x1", plaster, 0, 10, y, z);
            }
        }
        // Janela
        builder.add("Window", windowBlue, 1, 5, 1, 1);
        // Telhado
        for (let step = 0; step < 4; step++) {
            let y = 4 + step;
            for (let x = 1; x < 11; x += 2) {
                builder.add("Roof 1x2", terracotta, 0, x, y, 1 + step);
                builder.add("Roof 1x2", terracotta, 2, x, y, 9 - step);
            }
            for (let z = 2 + step; z <= 8 - step; z++) {
                builder.add("1x1", plaster, 0, 1, y, z);
                builder.add("1x1", plaster, 0, 10, y, z);
            }
        }
        // Detalhes do topo
        for (let x = 1; x < 11; x += 2) builder.add("Tile 2x2", terracotta, 0, x, 8, 4);
        builder.add("Pillar", terracotta, 0, 8, 4, 3);
        builder.add("1x1", terracotta, 0, 8, 7, 3);
        return builder.blocks;
    })(),
};

export default Casa;
