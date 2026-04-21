import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

const ThreeTierPagodaStructure = {
  dx: 18,
  dy: 18,
  dz: 18,
  blocks: (function () {
    const builder = createPrefabBuilder();
    const ground = "#7f7f7f";
    const floor = "#d6b07a";
    const walls = "#e6d4b8";
    const pillar = "#684a2f";
    const trim = "#8b5a2b";
    const roof = "#5b3a2a";

    // Ground pad
    addFilledRectSafe(builder, 0, 0, 0, 18, 18, ground);

    // Base tier (largest)
    addFilledRectSafe(builder, 1, 1, 1, 16, 16, floor);
    for (let y = 2; y <= 3; y++) addFilledRectSafe(builder, 1, y, 1, 16, 16, walls);

    // Pillar grid for base tier to ensure connectivity
    const basePillars = [2, 6, 10, 14];
    for (const x of basePillars) {
      for (const z of basePillars) {
        addPillarStackSafe(builder, x, 1, z, 14, pillar);
      }
    }

    // Second tier (inset)
    addFilledRectSafe(builder, 3, 5, 3, 12, 12, floor);
    for (let y = 6; y <= 7; y++) addFilledRectSafe(builder, 3, y, 3, 12, 12, walls);

    // Connectors under second tier
    const secondPillars = [4, 8, 12];
    for (const x of secondPillars) {
      for (const z of secondPillars) {
        addPillarStackSafe(builder, x, 3, z, 11, pillar);
      }
    }

    // Third (top) tier
    addFilledRectSafe(builder, 5, 9, 5, 8, 8, floor);
    for (let y = 10; y <= 11; y++) addFilledRectSafe(builder, 5, y, 5, 8, 8, walls);

    // Top-tier connectors
    const topPillars = [6, 10];
    for (const x of topPillars) {
      for (const z of topPillars) {
        addPillarStackSafe(builder, x, 5, z, 9, trim);
      }
    }

    // Small ridge tile to mark center
    builder.add("Tile 2x2", roof, 0, 8, 12, 8);

    return builder.blocks;
  })(),
};

export default ThreeTierPagodaStructure;
