import { createPrefabBuilder, addFilledRectSafe } from "../shared/core.js";

const Predio = {
    dx: 12,
    dy: 33,
    dz: 12,
    blocks: (function () {
        const builder = createPrefabBuilder();
        const concrete = "#aeb6bf";
        const glass = "#6f90a8";
        const steel = "#46505a";
        for (let f = 0; f < 9; f++) {
            let w = 12, offset = 0;
            if (f > 3) { w = 10; offset = 1; }
            if (f > 6) { w = 8; offset = 2; }
            let ySlab = f * 3;
            let yWin = f * 3 + 1;
            addFilledRectSafe(builder, offset, ySlab, offset, w, w, concrete);
            for (let i = 0; i < w; i += 2) {
                builder.add("Window", glass, 1, offset + i, yWin, offset);
                builder.add("Window", glass, 1, offset + i, yWin, offset + w - 1);
                if (i > 0 && i < w - 2) {
                    builder.add("Window", glass, 0, offset, yWin, offset + i);
                    builder.add("Window", glass, 0, offset + w - 1, yWin, offset + i);
                }
            }
        }
        builder.add("1x1", steel, 0, 5, 25, 5);
        builder.add("1x1", steel, 0, 5, 26, 5);
        builder.add("Pillar", steel, 0, 5, 27, 5);
        builder.add("Pillar", steel, 0, 5, 30, 5);
        return builder.blocks;
    })(),
};

export default Predio;
