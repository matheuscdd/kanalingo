import { createPrefabBuilder, addPillarStackSafe } from "../shared/core.js";

const baseSteel = "#4f5962";
const panelSteel = "#aeb7bf";
const rotorColor = "#2a3138";

const FabricaMega = {
    dx: 12,
    dy: 16,
    dz: 8,
    blocks: (function () {
        const builder = createPrefabBuilder();
        // Base: grade de 2x4
        for (let x of [0, 2, 4, 6, 8, 10]) {
            for (let z of [0, 4]) {
                builder.add("2x4", baseSteel, 0, x, 0, z);
            }
        }
        // Painéis elevados
        for (let x of [6, 8, 10]) {
            for (let z of [0, 4]) {
                builder.add("2x4", panelSteel, 0, x, 3, z);
            }
        }
        // Rotores
        builder.add("Rotor", rotorColor, 0, 1, 1, 0);
        builder.add("Rotor", rotorColor, 0, 4, 1, 0);
        // Conectores verticais: liga a base (y=0) aos painéis elevados (y=3)
        builder.add("1x1", baseSteel, 0, 7, 1, 0);
        builder.add("1x1", baseSteel, 0, 7, 2, 0);
        // Torre de suporte: coluna contínua do y=1 até y=9 para conectar aos pilares altos
        addPillarStackSafe(builder, 1, 1, 2, 9, baseSteel);
        // Pilares altos no topo da torre
        for (let ly of [10, 13]) {
            builder.add("Pillar", baseSteel, 0, 1, ly, 2);
        }
        return builder.blocks;
    })(),
};

export default FabricaMega;
