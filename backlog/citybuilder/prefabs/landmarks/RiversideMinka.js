import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

const RiversideMinka = {
  dx: 16,
  dy: 10,
  dz: 12,
  blocks: (function () {
    const builder = createPrefabBuilder();
    const water = "#3b6fb3";
    const deck = "#8b5a2b";
    const walls = "#e6d4b8";
    const roof = "#5b3a2a";
    const pillar = "#684a2f";
    const tatami = "#c9b77b";
    const glass = "#9ac1d5";

    // Water and deck
    addFilledRectSafe(builder, 0, 0, 0, 16, 12, water);
    addFilledRectSafe(builder, 0, 1, 0, 6, 12, deck);

    // House footprint (slightly inset)
    addFilledRectSafe(builder, 6, 1, 2, 8, 8, tatami);

    // Reserve windows (place before walls so safe-fill respects them)
    builder.add("Window", glass, 0, 8, 2, 4);
    builder.add("Window", glass, 0, 10, 2, 4);

    // Continuous walls per level (y=2..4)
    for (let y = 2; y <= 4; y++) {
      addFilledRectSafe(builder, 6, y, 2, 8, 8, walls);
    }

    // Internal second-floor landing
    addFilledRectSafe(builder, 7, 4, 3, 6, 6, tatami);

    // Support pillars connecting deck/house to ground
    addPillarStackSafe(builder, 7, 0, 1, 5, pillar);
    addPillarStackSafe(builder, 13, 0, 1, 5, pillar);
    addPillarStackSafe(builder, 7, 0, 9, 5, pillar);
    addPillarStackSafe(builder, 13, 0, 9, 5, pillar);

    // Compact roof anchored to walls
    addFilledRectSafe(builder, 6, 5, 2, 8, 8, roof);
    addFilledRectSafe(builder, 7, 6, 3, 6, 6, roof);
    builder.add("Tile 2x2", roof, 0, 9, 7, 5);

    return builder.blocks;
  })(),
};

export default RiversideMinka;
