import { createPrefabBuilder } from "../shared/core.js";

const Muralha = {
    dx: 18,
    dy: 10,
    dz: 6,
    blocks: (function () {
        const builder = createPrefabBuilder();
        const wallStone = "#c3a77f";
        const crenellationStone = "#dfcaa5";
        const walkwayStone = "#6f6250";
        // Corpo da muralha
        for (let x = 0; x < 16; x += 2) {
            for (let y = 0; y < 4; y++) {
                builder.add("2x4", wallStone, 1, x, y, 1);
            }
        }
        // Caminho superior e ameias
        for (let x = 0; x < 16; x += 2) {
            builder.add("Tile 2x2", walkwayStone, 0, x, 4, 2);
            if (x % 4 === 0) {
                builder.add("1x1", crenellationStone, 0, x, 4, 1);
                builder.add("1x1", crenellationStone, 0, x, 4, 4);
            }
        }
        // Segunda camada
        for (let y = 4; y < 8; y++) {
            builder.add("2x4", wallStone, 1, 6, y, 1);
            builder.add("2x4", wallStone, 1, 8, y, 1);
        }
        // Caminho superior e ameias finais
        for (let x = 6; x <= 8; x += 2) {
            builder.add("Tile 2x2", walkwayStone, 0, x, 8, 2);
            builder.add("1x1", crenellationStone, 0, x, 8, 1);
            builder.add("1x1", crenellationStone, 0, x, 8, 4);
        }
        return builder.blocks;
    })(),
};

export default Muralha;
