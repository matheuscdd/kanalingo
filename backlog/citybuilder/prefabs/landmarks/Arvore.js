import { createPrefabBuilder, addFilledRectSafe } from "../shared/core.js";

const Arvore = {
    dx: 10,
    dy: 14,
    dz: 10,
    blocks: (function () {
        const builder = createPrefabBuilder();
        const trunk = "#6b4b34";
        const foliage = "#3f7f46";
        // Tronco (substitui addSolid por laço local)
        for (let y = 0; y < 8; y++) {
            addFilledRectSafe(builder, 4, y, 4, 2, 2, trunk);
        }
        builder.add("1x1", trunk, 0, 3, 0, 4);
        builder.add("1x1", trunk, 0, 6, 0, 5);
        builder.add("1x1", trunk, 0, 4, 0, 3);
        builder.add("1x1", trunk, 0, 5, 0, 6);
        // Copa
        const cx = 5, cy = 9, cz = 5;
        for (let x = 0; x < 10; x += 2) {
            for (let y = 4; y < 13; y++) {
                for (let z = 0; z < 10; z += 2) {
                    const dist = Math.sqrt(Math.pow(x - cx, 2) + Math.pow((y - cy) * 1.5, 2) + Math.pow(z - cz, 2));
                    if (dist < 4.8) builder.add("2x2", foliage, 0, x, y, z);
                }
            }
        }
        return builder.blocks;
    })(),
};

export default Arvore;
