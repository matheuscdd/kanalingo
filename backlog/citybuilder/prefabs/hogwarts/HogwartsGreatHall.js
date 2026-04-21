import { addFilledRectSafe, createPrefabBuilder } from "../shared/core.js";
import { addHogwartsCliff, addHogwartsHall, addHogwartsTower, createHogwartsPalette } from "../shared/hogwarts.js";

function buildHogwartsGreatHall() {
    const builder = createPrefabBuilder();
    const palette = createHogwartsPalette();

    addHogwartsCliff(builder, { x0: 2, z0: 3, width: 30, depth: 18, height: 3 }, palette, palette.stoneDark);
    addHogwartsHall(
        builder,
        { x0: 5, z0: 6, width: 24, depth: 12, baseY: 3, bodyHeight: 9, ridge: "x", roofLevels: 3, buttressSpacing: 4 },
        palette,
    );
    addHogwartsHall(
        builder,
        { x0: 13, z0: 0, width: 8, depth: 6, baseY: 3, bodyHeight: 5, ridge: "z", roofLevels: 2, buttressSpacing: 4 },
        palette,
    );
    addHogwartsTower(builder, { x0: 2, z0: 5, size: 6, baseY: 3, height: 12, roofLevels: 2 }, palette);
    addHogwartsTower(builder, { x0: 26, z0: 5, size: 6, baseY: 3, height: 12, roofLevels: 2 }, palette);
    addHogwartsTower(builder, { x0: 2, z0: 13, size: 6, baseY: 3, height: 10, roofLevels: 2 }, palette);
    addHogwartsTower(builder, { x0: 26, z0: 13, size: 6, baseY: 3, height: 10, roofLevels: 2 }, palette);

    for (let step = 0; step < 3; step++) {
        addFilledRectSafe(builder, 11 - step * 2, 3 + step, step * 2, 12 + step * 4, 2, palette.stoneLight);
    }

    return builder.blocks;
}

const HogwartsGreatHall = {
    dx: 34,
    dy: 24,
    dz: 22,
    blocks: buildHogwartsGreatHall(),
};

export default HogwartsGreatHall;
