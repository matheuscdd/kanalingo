import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

const TempleHallRoof = {
  dx: 20,
  dy: 18,
  dz: 16,
  blocks: (function () {
    const builder = createPrefabBuilder();
    const roof = "#5b3a2a";
    const trim = "#8b5a2b";
    const pillar = "#684a2f";

    // Broad eaves (layered)
    addFilledRectSafe(builder, 0, 8, 0, 20, 16, roof);
    addFilledRectSafe(builder, 1, 9, 1, 18, 14, roof);
    addFilledRectSafe(builder, 2, 10, 2, 16, 12, roof);

    // Inner ridge layer
    addFilledRectSafe(builder, 5, 11, 5, 10, 6, roof);
    builder.add("Tile 2x2", roof, 0, 9, 12, 7);

    // Additional ridge tiles for visual symmetry
    builder.add("Tile 2x2", roof, 0, 7, 12, 7);
    builder.add("Tile 2x2", roof, 0, 11, 12, 7);
    builder.add("Tile 2x2", roof, 0, 9, 12, 5);

    // Pillars/connectors under eaves to ensure grounding
    const xs = [1, 5, 9, 13, 17];
    const zs = [1, 6, 10, 14];
    for (const x of xs) {
      for (const z of zs) {
        addPillarStackSafe(builder, x, 1, z, 13, pillar);
      }
    }

    // Additional trim supports at corners
    addPillarStackSafe(builder, 0, 1, 0, 13, trim);
    addPillarStackSafe(builder, 18, 1, 0, 13, trim);
    addPillarStackSafe(builder, 0, 1, 14, 13, trim);
    addPillarStackSafe(builder, 18, 1, 14, 13, trim);

    return builder.blocks;
  })(),
};

export default TempleHallRoof;
