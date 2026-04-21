import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

const Chale = {
    dx: 10,
    dy: 10,
    dz: 10,
    blocks: (function () {
        const builder = createPrefabBuilder();
        // Paleta local
        const base = "#e7d7bd"; // base/plaster
        const roof = "#b86340"; // terracotta
        const window = "#8ea9ba";
        const door = "#7a5230";
        const chimney = "#a89c8e";
        // Base
        addFilledRectSafe(builder, 1, 0, 1, 8, 8, base);
        // Paredes (mais baixas)
        for (let y = 1; y <= 3; y++) {
            for (let x = 0; x < 8; x++) {
                // Porta central
                if (y < 3 && x === 4) continue;
                // Janelas frontais
                if (y === 2 && (x === 2 || x === 6)) continue;
                builder.add("1x1", base, 0, x, y, 1);
                builder.add("1x1", base, 0, x, y, 8);
            }
            for (let z = 1; z < 7; z++) {
                builder.add("1x1", base, 0, 1, y, z);
                builder.add("1x1", base, 0, 8, y, z);
            }
        }
        // Porta
        builder.add("1x1", door, 0, 4, 1, 1);
        builder.add("1x1", door, 0, 4, 2, 1);
        // Janelas
        builder.add("Window", window, 1, 2, 2, 1);
        builder.add("Window", window, 1, 6, 2, 1);
        // Telhado piramidal fechado (sem vão)
        // Layer 1: base do telhado
        for (let x = 1; x <= 8; x += 2) {
            for (let z = 1; z <= 8; z += 2) {
                builder.add("Tile 2x2", roof, 0, x, 4, z);
            }
        }
        // Layer 2: piramide encolhendo
        for (let x = 2; x <= 7; x += 2) {
            for (let z = 2; z <= 7; z += 2) {
                builder.add("Tile 2x2", roof, 0, x, 5, z);
            }
        }
        // Layer 3: piramide continua
        for (let x = 3; x <= 6; x += 2) {
            for (let z = 3; z <= 6; z += 2) {
                builder.add("Tile 2x2", roof, 0, x, 6, z);
            }
        }
        // Layer 4: pico
        builder.add("Tile 2x2", roof, 0, 4, 7, 4);
        // Chaminé discreta
        addPillarStackSafe(builder, 3, 5, 3, 2, chimney);
        return builder.blocks;
    })(),
};

export default Chale;
