import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

const TempleHallStructure = {
  dx: 20,
  dy: 14,
  dz: 16,
  blocks: (function () {
    const builder = createPrefabBuilder();
    const ground = "#7f7f7f";
    const floor = "#d6b07a";
    const walls = "#e6d4b8";
    const roof = "#5b3a2a";
    const pillar = "#684a2f";
    const trim = "#8b5a2b";
    const glass = "#9ac1d5";
    const lantern = "#f2cd37";

    // Ground pad
    addFilledRectSafe(builder, 0, 0, 0, 20, 16, ground);

    // Main hall floor (raised one)
    addFilledRectSafe(builder, 2, 1, 2, 16, 12, floor);

    // Reserve windows before walls so safe-fill leaves gaps
    builder.add("Window", glass, 0, 6, 2, 2);
    builder.add("Window", glass, 0, 10, 2, 2);
    builder.add("Window", glass, 0, 14, 2, 2);
    builder.add("Window", glass, 0, 6, 2, 11);
    builder.add("Window", glass, 0, 10, 2, 11);
    builder.add("Window", glass, 0, 14, 2, 11);

    // Continuous walls per level (y=2..5)
    for (let y = 2; y <= 5; y++) {
      addFilledRectSafe(builder, 2, y, 2, 16, 12, walls);
    }

    // Interior supporting pillar grid (connect floor -> roof)
    const px = [5, 9, 13];
    const pz = [5, 8, 11];
    for (const x of px) {
      for (const z of pz) {
        addPillarStackSafe(builder, x, 1, z, 8, pillar);
      }
    }

    // Entrance steps
    builder.add("1x1", trim, 0, 10, 1, 1);
    builder.add("1x1", trim, 0, 10, 2, 1);

    // Raised platform / altar at rear
    addFilledRectSafe(builder, 12, 4, 8, 4, 4, floor);
    addPillarStackSafe(builder, 13, 1, 9, 6, trim);

    // Roof anchored to the outer walls
    addFilledRectSafe(builder, 1, 6, 1, 18, 14, roof);
    addFilledRectSafe(builder, 2, 7, 2, 16, 12, roof);
    builder.add("Tile 2x2", roof, 0, 9, 8, 7);

    // Decorative lantern posts near entrance (connectors ensure grounding)
    addPillarStackSafe(builder, 4, 1, 2, 7, lantern);
    addPillarStackSafe(builder, 16, 1, 2, 7, lantern);

    return builder.blocks;
  })(),
};

export default TempleHallStructure;
