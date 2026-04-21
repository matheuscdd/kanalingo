import { createPrefabBuilder } from "../shared/core.js";
import { addHogwartsBattlements, addHogwartsCliff, addHogwartsHall, addHogwartsPerimeter, addHogwartsTower, createHogwartsPalette } from "../shared/hogwarts.js";

function buildHogwartsTowerClusterCourtyard() {
    const builder = createPrefabBuilder();
    const palette = createHogwartsPalette();

    addHogwartsCliff(builder, { x0: 2, z0: 2, width: 34, depth: 26, height: 4 }, palette, palette.stoneDark);
    addHogwartsPerimeter(builder, { x0: 4, z0: 4, width: 30, depth: 22 }, 4, 4, palette.stone);
    addHogwartsBattlements(builder, { x0: 4, z0: 4, width: 30, depth: 22 }, 8, palette.stoneLight);
    addHogwartsHall(
        builder,
        { x0: 12, z0: 9, width: 14, depth: 10, baseY: 5, bodyHeight: 10, ridge: "z", roofLevels: 3, buttressSpacing: 4 },
        palette,
    );
    addHogwartsHall(
        builder,
        { x0: 10, z0: 20, width: 18, depth: 6, baseY: 5, bodyHeight: 5, ridge: "x", roofLevels: 2, buttressSpacing: 4 },
        palette,
    );
    addHogwartsTower(builder, { x0: 5, z0: 5, size: 8, baseY: 5, height: 15, roofLevels: 2 }, palette);
    addHogwartsTower(builder, { x0: 25, z0: 5, size: 8, baseY: 5, height: 14, roofLevels: 2 }, palette);
    addHogwartsTower(builder, { x0: 5, z0: 17, size: 8, baseY: 5, height: 17, roofLevels: 2 }, palette);
    addHogwartsTower(builder, { x0: 25, z0: 17, size: 8, baseY: 5, height: 16, roofLevels: 2 }, palette);
    addHogwartsTower(builder, { x0: 15, z0: 2, size: 8, baseY: 5, height: 20, roofLevels: 2 }, palette);

    return builder.blocks;
}

const HogwartsTowerClusterCourtyard = {
    dx: 38,
    dy: 34,
    dz: 30,
    blocks: buildHogwartsTowerClusterCourtyard(),
};

export default HogwartsTowerClusterCourtyard;
