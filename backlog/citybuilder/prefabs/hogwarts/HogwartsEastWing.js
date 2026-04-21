import { createPrefabBuilder } from "../shared/core.js";
import { addHogwartsCliff, addHogwartsHall, addHogwartsTower, createHogwartsPalette } from "../shared/hogwarts.js";

function buildHogwartsEastWing() {
    const builder = createPrefabBuilder();
    const palette = createHogwartsPalette();

    addHogwartsCliff(builder, { x0: 2, z0: 2, width: 30, depth: 18, height: 4 }, palette, palette.stoneDark);
    addHogwartsHall(
        builder,
        { x0: 6, z0: 5, width: 20, depth: 12, baseY: 4, bodyHeight: 8, ridge: "x", roofLevels: 3, buttressSpacing: 4 },
        palette,
    );
    addHogwartsHall(
        builder,
        { x0: 14, z0: 17, width: 10, depth: 6, baseY: 4, bodyHeight: 5, ridge: "z", roofLevels: 2, buttressSpacing: 4 },
        palette,
    );
    addHogwartsTower(builder, { x0: 24, z0: 2, size: 6, baseY: 4, height: 15, roofLevels: 2 }, palette);
    addHogwartsTower(builder, { x0: 2, z0: 8, size: 6, baseY: 4, height: 11, roofLevels: 2 }, palette);
    addHogwartsTower(builder, { x0: 24, z0: 14, size: 8, baseY: 4, height: 13, roofLevels: 2 }, palette);

    return builder.blocks;
}

const HogwartsEastWing = {
    dx: 32,
    dy: 26,
    dz: 24,
    blocks: buildHogwartsEastWing(),
};

export default HogwartsEastWing;
