import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

const MerchantHouse = {
  dx: 14,
  dy: 11,
  dz: 10,
  blocks: (function () {
    const builder = createPrefabBuilder();
    const pavement = "#7f7f7f";
    const floor = "#d6b07a";
    const walls = "#dcd1c0";
    const roof = "#4f3020";
    const trim = "#8b5a2b";
    const glass = "#9ac1d5";

    // Pavement / base
    addFilledRectSafe(builder, 0, 0, 0, 14, 10, pavement);

    // Ground floor interior
    addFilledRectSafe(builder, 2, 1, 2, 10, 6, floor);

    // Reserve windows
    builder.add("Window", glass, 0, 5, 2, 3);
    builder.add("Window", glass, 0, 7, 2, 3);

    // Continuous walls per level (y=2..5)
    for (let y = 2; y <= 5; y++) {
      addFilledRectSafe(builder, 2, y, 2, 10, 6, walls);
    }

    // Small balcony with supports
    addFilledRectSafe(builder, 0, 5, 4, 4, 4, trim);
    addPillarStackSafe(builder, 1, 1, 4, 4, trim);
    addPillarStackSafe(builder, 3, 1, 4, 4, trim);

    // Compact gabled roof
    addFilledRectSafe(builder, 2, 6, 2, 10, 6, roof);
    addFilledRectSafe(builder, 3, 7, 3, 8, 4, roof);
    builder.add("Roof 1x2", roof, 0, 6, 8, 4);

    return builder.blocks;
  })(),
};

export default MerchantHouse;
