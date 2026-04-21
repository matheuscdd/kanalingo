import { createPrefabBuilder, addPillarStackSafe } from "../shared/core.js";

const Eolica = {
    dx: 8,
    dy: 19,
    dz: 5,
    blocks: (function () {
        const builder = createPrefabBuilder();
        const tower = "#d6dde3";
        const nacelle = "#eef2f5";
        const rotor = "#39444d";
        // Base: duas placas 2x4 rotacionadas
        builder.add("2x4", tower, 1, 2, 0, 1);
        builder.add("2x4", tower, 1, 4, 0, 1);
        // Torre: pilar central de 1x3, repetido até o topo
        addPillarStackSafe(builder, 3, 1, 3, 17, tower);
        // Nacelle no topo
        builder.add("2x2", nacelle, 0, 3, 18, 2);
        // Rotor
        builder.add("Rotor", rotor, 0, 3, 18, 4);
        return builder.blocks;
    })(),
};

export default Eolica;
