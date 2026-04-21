import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

const ThreeTierPagodaRoofs = {
  dx: 18,
  dy: 18,
  dz: 18,
  blocks: (function () {
    const builder = createPrefabBuilder();
    const roof = "#5b3a2a";
    const trim = "#8b5a2b";
    const pillar = "#684a2f";

    // Base eave (largest)
    addFilledRectSafe(builder, 0, 8, 0, 18, 18, roof);

    // Second eave (inset)
    addFilledRectSafe(builder, 2, 10, 2, 14, 14, roof);

    // Third eave (top)
    addFilledRectSafe(builder, 4, 12, 4, 10, 10, roof);

    // Central ridge
    addFilledRectSafe(builder, 6, 14, 6, 6, 6, roof);
    builder.add("Tile 2x2", roof, 0, 8, 15, 8);

    // Pillars for base eave (top at y=7) to anchor the largest eave
    const basePillars = [1, 5, 9, 13];
    for (const x of basePillars) {
      for (const z of basePillars) {
        addPillarStackSafe(builder, x, 1, z, 7, pillar);
      }
    }

    // Pillars for second eave (top at y=9)
    const secondPillars = [3, 7, 11, 15];
    for (const x of secondPillars) {
      for (const z of secondPillars) {
        addPillarStackSafe(builder, x, 1, z, 9, pillar);
      }
    }

    // Pillars for top eave (top at y=11)
    const topPillars = [5, 9, 13];
    for (const x of topPillars) {
      for (const z of topPillars) {
        addPillarStackSafe(builder, x, 1, z, 11, trim);
      }
    }

    // Extra corner supports
    addPillarStackSafe(builder, 0, 1, 0, 11, trim);
    addPillarStackSafe(builder, 16, 1, 0, 11, trim);
    addPillarStackSafe(builder, 0, 1, 16, 11, trim);
    addPillarStackSafe(builder, 16, 1, 16, 11, trim);

    return builder.blocks;
  })(),
};

export default ThreeTierPagodaRoofs;
