import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

const MiniTeaHouse = {
  dx: 12,
  dy: 9,
  dz: 12,
  blocks: (function () {
    const builder = createPrefabBuilder();
    const lawn = "#2f6034";
    const tatami = "#c9b77b";
    const facade = "#e8d7c0";
    const roof = "#5b3a2a";
    const trim = "#d4c9b8";
    const glass = "#9ac1d5";

    // Base plate (ground)
    addFilledRectSafe(builder, 0, 0, 0, 12, 12, lawn);

    // Interior floor (tatami)
    addFilledRectSafe(builder, 2, 1, 2, 8, 8, tatami);

    // Reserve simple window slots (place before walls so safe-fill respects them)
    builder.add("Window", glass, 0, 5, 2, 2);
    builder.add("Window", glass, 0, 6, 2, 2);

    // Continuous walls per level (y=2..4)
    for (let y = 2; y <= 4; y++) {
      addFilledRectSafe(builder, 2, y, 2, 8, 8, facade);
    }

    // Small veranda overhang and supporting pillars
    addFilledRectSafe(builder, 1, 5, 1, 10, 3, roof);
    addPillarStackSafe(builder, 3, 1, 1, 4, trim);
    addPillarStackSafe(builder, 9, 1, 1, 4, trim);

    // Compact roof anchored to walls
    addFilledRectSafe(builder, 0, 5, 0, 12, 12, roof);
    addFilledRectSafe(builder, 1, 6, 1, 10, 10, roof);

    // Roof ridge / finial
    builder.add("Tile 2x2", roof, 0, 5, 7, 5);

    // Decorative ridge tiles for symmetry
    builder.add("Tile 2x2", roof, 0, 3, 7, 3);
    builder.add("Tile 2x2", roof, 0, 7, 7, 3);
    builder.add("Tile 2x2", roof, 0, 3, 7, 7);
    builder.add("Tile 2x2", roof, 0, 7, 7, 7);

    return builder.blocks;
  })(),
};

export default MiniTeaHouse;
