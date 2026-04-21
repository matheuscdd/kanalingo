import { addFilledRectSafe, createPrefabBuilder } from "../shared/core.js";
import { addHogwartsBridge, addHogwartsCliff, addHogwartsHall, addHogwartsTower, createHogwartsPalette } from "../shared/hogwarts.js";

function buildHogwartsBridgeGate() {
    const builder = createPrefabBuilder();
    const palette = createHogwartsPalette();

    addHogwartsCliff(builder, { x0: 6, z0: 10, width: 18, depth: 10, height: 4 }, palette, palette.stoneDark);
    addHogwartsBridge(builder, { x0: 10, z0: 0, width: 10, depth: 14 }, 3, palette);
    addHogwartsHall(
        builder,
        { x0: 7, z0: 12, width: 16, depth: 8, baseY: 4, bodyHeight: 6, ridge: "x", roofLevels: 2, buttressSpacing: 4 },
        palette,
    );
    addHogwartsTower(builder, { x0: 2, z0: 10, size: 6, baseY: 4, height: 10, roofLevels: 2 }, palette);
    addHogwartsTower(builder, { x0: 22, z0: 10, size: 6, baseY: 4, height: 10, roofLevels: 2 }, palette);

    for (let step = 0; step < 3; step++) {
        addFilledRectSafe(builder, 12 - step * 2, 2 + step, 8 - step * 2, 6 + step * 4, 2, palette.stoneLight);
    }

    return builder.blocks;
}

const HogwartsBridgeGate = {
    dx: 30,
    dy: 20,
    dz: 20,
    blocks: buildHogwartsBridgeGate(),
};

export default HogwartsBridgeGate;
