import { addFilledRectSafe, createPrefabBuilder } from "../shared/core.js";
import { addHogwartsBattlements, addHogwartsCliff, addHogwartsPerimeter, addHogwartsTower, createHogwartsPalette } from "../shared/hogwarts.js";

function buildHogwartsBaseCliff() {
    const builder = createPrefabBuilder();
    const palette = createHogwartsPalette();

    addHogwartsCliff(builder, { x0: 0, z0: 0, width: 48, depth: 34, height: 7 }, palette, palette.grass);
    addFilledRectSafe(builder, 6, 7, 4, 36, 26, palette.stoneDark);
    addFilledRectSafe(builder, 10, 8, 8, 28, 18, palette.stone);
    addHogwartsPerimeter(builder, { x0: 8, z0: 7, width: 32, depth: 20 }, 9, 2, palette.stoneLight);
    addHogwartsBattlements(builder, { x0: 8, z0: 7, width: 32, depth: 20 }, 11, palette.stoneLight);

    for (let step = 0; step < 4; step++) {
        addFilledRectSafe(builder, 18 - step * 2, 7 + step, step * 2, 12 + step * 4, 2, palette.stoneLight);
    }

    addFilledRectSafe(builder, 9, 10, 8, 30, 18, palette.stoneLight);

    addFilledRectSafe(builder, 4, 6, 20, 10, 8, palette.grass);
    addFilledRectSafe(builder, 34, 6, 18, 10, 10, palette.grass);
    addHogwartsTower(builder, { x0: 4, z0: 24, size: 6, baseY: 7, height: 4, battlements: true, spire: false }, palette);
    addHogwartsTower(builder, { x0: 38, z0: 4, size: 6, baseY: 7, height: 5, battlements: true, spire: false }, palette);

    return builder.blocks;
}

const HogwartsBaseCliff = {
    dx: 48,
    dy: 14,
    dz: 34,
    blocks: buildHogwartsBaseCliff(),
};

export default HogwartsBaseCliff;
