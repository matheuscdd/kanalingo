import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";
import { addPoolSafe, addBalconySafe, addPalm, addLounger } from "../shared/modern.js";

const ModernHouseWithPool = {
    dx: 36,
    dy: 14,
    dz: 28,
    blocks: (function () {
        const builder = createPrefabBuilder();

        const floorColor = "#f4f4f4";
        const wallColor = "#111111";
        const trim = "#8b5a2b";
        const poolWater = "#0055bf";

        // base slab
        addFilledRectSafe(builder, 0, 0, 0, 36, 28, floorColor);

        // pool (near front-left)
        const px = 6, pz = 2, pw = 16, pd = 6;
        addPoolSafe(builder, px, 0, pz, pw, pd, trim, poolWater);

        // front facade: pillars and windows
        const glassColor = "#0055bf";

        // frame pillars along front and back (between corner pillars)
        for (let x = 8; x <= 28; x += 4) {
            addPillarStackSafe(builder, x, 1, 6, 4, wallColor);
            addPillarStackSafe(builder, x, 1, 20, 4, wallColor);
        }

        // corner pillars (keep originals)
        addPillarStackSafe(builder, 4, 1, 6, 4, wallColor);
        addPillarStackSafe(builder, 31, 1, 6, 4, wallColor);
        addPillarStackSafe(builder, 4, 1, 20, 4, wallColor);
        addPillarStackSafe(builder, 31, 1, 20, 4, wallColor);

        // ground-floor windows (between pillars)
        for (let x = 6; x < 30; x += 4) {
            builder.add("Window", glassColor, 0, x, 1, 6);
        }

        // a main door at center
        builder.add("2x2", trim, 0, 16, 1, 6);

        // small awning above windows and short supports to connect them to ground
        for (let x = 6; x < 30; x += 4) {
            builder.add("Roof 1x2", "#111111", 0, x, 3, 5);
            // short support posts (height 2) so awnings are part of grounded component
            addPillarStackSafe(builder, x, 1, 5, 2, wallColor);
        }

        // interior partition wall (thin) to suggest rooms
        for (let y = 1; y < 4; y++) {
            addFilledRectSafe(builder, 12, y, 10, 12, 2, wallColor);
        }

        // second floor slab (y=5)
        addFilledRectSafe(builder, 4, 5, 6, 28, 16, floorColor);

        // second-floor windows (full-height groups)
        for (let x = 8; x <= 28; x += 4) {
            builder.add("Window", glassColor, 0, x, 6, 6);
        }

        // balcony on second floor
        addBalconySafe(builder, 20, 5, 10, 10, 6, floorColor);

        // loungers near pool
        addLounger(builder, px + 2, 1, pz + pd + 1, 0);
        addLounger(builder, px + 10, 1, pz + pd + 1, 0);

        // decorative planters
        addFilledRectSafe(builder, 2, 0, 22, 4, 4, "#237841");

        // palms
        addPalm(builder, 2, 1, 8);
        addPalm(builder, 30, 1, 22);

        return builder.blocks;
    })(),
};

export default ModernHouseWithPool;
