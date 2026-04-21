import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

const ToriiRowShrineBase = {
  dx: 20,
  dy: 9,
  dz: 10,
  blocks: (function () {
    const builder = createPrefabBuilder();
    const path = "#8f8f8f";
    const wood = "#8b5a2b";
    const torii = "#e3000b";
    const grass = "#2f6034";

    // Surrounding grass
    addFilledRectSafe(builder, 0, 0, 0, 20, 10, grass);

    // Central stone path
    addFilledRectSafe(builder, 2, 1, 3, 16, 4, path);

    // Row of three simplified torii gates (pillars + small crossbeam)
    const toriiXs = [4, 9, 14];
    const lz = 4;
    for (const lx of toriiXs) {
      // two adjacent pillars
      addPillarStackSafe(builder, lx, 1, lz, 5, torii);
      addPillarStackSafe(builder, lx + 1, 1, lz, 5, torii);
      // small 2x2 crossbeam sitting above pillars
      builder.add("2x2", torii, 0, lx, 6, lz);
    }

    // Small shrine base (reserved for Step 2 detailing)
    addFilledRectSafe(builder, 16, 1, 3, 3, 4, wood);

    // Simple connector steps from path to shrine base
    builder.add("1x1", wood, 0, 15, 1, 4);
    builder.add("1x1", wood, 0, 15, 2, 4);

    return builder.blocks;
  })(),
};

export default ToriiRowShrineBase;
