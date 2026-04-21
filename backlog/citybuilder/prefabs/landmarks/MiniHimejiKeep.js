import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

const MiniHimejiKeep = {
  dx: 16,
  dy: 16,
  dz: 16,
  blocks: (function () {
    const builder = createPrefabBuilder();
    const ground = "#7f7f7f";
    const foundation = "#d6b07a";
    const walls = "#f4f4f4"; // white keep
    const roof = "#4f3020";
    const trim = "#8b5a2b";
    const pillar = "#684a2f";
    const glass = "#9ac1d5";

    // Ground pad and foundation
    addFilledRectSafe(builder, 0, 0, 0, 16, 16, ground);
    addFilledRectSafe(builder, 1, 1, 1, 14, 14, foundation);

    // Reserve a few windows before walls (safe-fill will respect)
    builder.add("Window", glass, 0, 4, 2, 1);
    builder.add("Window", glass, 0, 11, 2, 1);
    builder.add("Window", glass, 0, 4, 2, 14);
    builder.add("Window", glass, 0, 11, 2, 14);

    // Outer walls (wrap) built per level for vertical continuity
    for (let y = 2; y <= 4; y++) {
      addFilledRectSafe(builder, 1, y, 1, 14, 14, walls);
    }

    // Corner turrets (pillared stacks to guarantee connection)
    addPillarStackSafe(builder, 2, 1, 2, 12, pillar);
    addPillarStackSafe(builder, 12, 1, 2, 12, pillar);
    addPillarStackSafe(builder, 2, 1, 12, 12, pillar);
    addPillarStackSafe(builder, 12, 1, 12, 12, pillar);

    // Central keep core (tighter footprint, stacked)
    addFilledRectSafe(builder, 4, 5, 4, 8, 8, foundation);
    for (let y = 6; y <= 9; y++) {
      addFilledRectSafe(builder, 4, y, 4, 8, 8, walls);
    }

    // Small internal balcony / walkway
    addFilledRectSafe(builder, 3, 6, 7, 10, 2, trim);

    // Central roof layers (stepped)
    addFilledRectSafe(builder, 3, 10, 3, 10, 10, roof);
    addFilledRectSafe(builder, 4, 11, 4, 8, 8, roof);
    addFilledRectSafe(builder, 5, 12, 5, 6, 6, roof);
    builder.add("Tile 2x2", roof, 0, 7, 13, 7);

    // Additional decorative tiles around the summit
    builder.add("Tile 2x2", roof, 0, 6, 13, 7);
    builder.add("Tile 2x2", roof, 0, 8, 13, 7);
    builder.add("Tile 2x2", roof, 0, 7, 13, 6);
    builder.add("Tile 2x2", roof, 0, 7, 13, 8);

    // Pillars under eaves and between tiers for connectivity
    const px = [4, 7, 10];
    const pz = [4, 7, 10];
    for (const x of px) {
      for (const z of pz) {
        addPillarStackSafe(builder, x, 1, z, 13, pillar);
      }
    }

    // Small entrance steps/connectors
    builder.add("1x1", trim, 0, 7, 1, 1);
    builder.add("1x1", trim, 0, 8, 1, 1);

    return builder.blocks;
  })(),
};

export default MiniHimejiKeep;
