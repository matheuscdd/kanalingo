import { createPrefabBuilder } from "../shared/core.js";
import { addHogwartsCliff, addHogwartsHall, addHogwartsTower, createHogwartsPalette } from "../shared/hogwarts.js";

function buildHogwartsWestWing() {
    const builder = createPrefabBuilder();
    const palette = createHogwartsPalette();

    addHogwartsCliff(builder, { x0: 1, z0: 2, width: 28, depth: 18, height: 3 }, palette, palette.stoneDark);
    addHogwartsHall(
        builder,
        { x0: 8, z0: 6, width: 16, depth: 10, baseY: 3, bodyHeight: 7, ridge: "x", roofLevels: 2, buttressSpacing: 4 },
        palette,
    );
    addHogwartsHall(
        builder,
        { x0: 12, z0: 16, width: 10, depth: 6, baseY: 3, bodyHeight: 5, ridge: "z", roofLevels: 2, buttressSpacing: 4 },
        palette,
    );
    addHogwartsTower(builder, { x0: 2, z0: 2, size: 8, baseY: 3, height: 14, roofLevels: 2 }, palette);
    addHogwartsTower(builder, { x0: 2, z0: 14, size: 6, baseY: 3, height: 10, roofLevels: 2 }, palette);
    addHogwartsTower(builder, { x0: 22, z0: 10, size: 6, baseY: 3, height: 12, roofLevels: 2 }, palette);

    return builder.blocks;
}

const HogwartsWestWing = {
    dx: 30,
    dy: 24,
    dz: 24,
    blocks: buildHogwartsWestWing(),
};

export default HogwartsWestWing;
