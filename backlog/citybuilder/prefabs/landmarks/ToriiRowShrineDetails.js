import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

const ToriiRowShrineDetails = {
  dx: 20,
  dy: 12,
  dz: 10,
  blocks: (function () {
    const builder = createPrefabBuilder();
    const path = "#8f8f8f";
    const wood = "#8b5a2b";
    const torii = "#e3000b";
    const grass = "#2f6034";
    const shrine = "#d4c9b8";
    const roofColor = "#5b3a2a";
    const stone = "#9a9a9a";
    const lantern = "#f2cd37";

    // Surrounding grass
    addFilledRectSafe(builder, 0, 0, 0, 20, 10, grass);

    // Central stone path (slightly raised)
    addFilledRectSafe(builder, 2, 1, 3, 16, 4, path);

    // Row of three torii gates (thicker pillars + crossbeam)
    const toriiXs = [4, 9, 14];
    const lz = 4;
    for (const lx of toriiXs) {
      // two tall pillars per gate
      addPillarStackSafe(builder, lx, 1, lz, 6, torii);
      addPillarStackSafe(builder, lx + 1, 1, lz, 6, torii);

      // horizontal crossbeam placed above pillars (no overlap)
      builder.add("2x4", torii, 0, lx, 7, lz - 1);
      // decorative top tiles
      builder.add("Tile 2x2", torii, 0, lx, 8, lz);
    }

    // Detailed shrine at path end
    addFilledRectSafe(builder, 16, 1, 3, 3, 4, shrine); // base
    // small entrance steps
    builder.add("1x1", stone, 0, 15, 1, 4);
    builder.add("1x1", stone, 0, 15, 2, 4);

    // shrine walls per level
    for (let y = 2; y <= 4; y++) addFilledRectSafe(builder, 16, y, 3, 3, 4, shrine);

    // compact roof anchored on shrine walls
    addFilledRectSafe(builder, 14, 5, 2, 5, 6, roofColor);
    builder.add("Tile 2x2", roofColor, 0, 16, 6, 4);

    // Lanterns along the path (pillars + small top)
    addPillarStackSafe(builder, 6, 1, 2, 6, lantern);
    addPillarStackSafe(builder, 6, 1, 7, 6, lantern);
    addPillarStackSafe(builder, 12, 1, 2, 6, lantern);
    addPillarStackSafe(builder, 12, 1, 7, 6, lantern);

    // Extra vertical connectors under crossbeams to ensure grounding
    addPillarStackSafe(builder, 4, 1, lz - 1, 7, torii);
    addPillarStackSafe(builder, 9, 1, lz - 1, 7, torii);
    addPillarStackSafe(builder, 14, 1, lz - 1, 7, torii);

    // Small wooden connector from path to shrine base
    builder.add("1x1", wood, 0, 15, 3, 4);

    return builder.blocks;
  })(),
};

export default ToriiRowShrineDetails;
