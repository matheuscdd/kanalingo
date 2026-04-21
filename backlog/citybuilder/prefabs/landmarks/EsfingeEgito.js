import { addFilledRectSafe, createPrefabBuilder } from "../shared/core.js";

function buildEsfingeEgito() {
    const builder = createPrefabBuilder();
    const sand = "#c9a76d";
    const sandShadow = "#ae8e57";
    const limestone = "#d8c39a";
    const shadow = "#8b6840";
    const dark = "#4f3b25";

    function addRect(x0, y, z0, width, depth, color) {
        addFilledRectSafe(builder, x0, y, z0, width, depth, color);
    }

    function addBlock(type, color, lx, ly, lz, rot = 0) {
        builder.add(type, color, rot, lx, ly, lz);
    }

    addRect(0, 0, 0, 24, 18, sand);
    addRect(2, 1, 2, 20, 14, sandShadow);

    addRect(3, 2, 4, 18, 12, shadow);
    addRect(5, 2, 0, 14, 4, limestone);

    addRect(4, 3, 6, 16, 10, limestone);
    addRect(8, 3, 4, 8, 2, limestone);
    addRect(6, 3, 0, 4, 4, limestone);
    addRect(14, 3, 0, 4, 4, limestone);

    addRect(5, 4, 8, 14, 8, limestone);
    addRect(7, 4, 6, 10, 2, limestone);
    addRect(8, 4, 0, 8, 6, limestone);

    addRect(7, 5, 10, 10, 6, shadow);
    addRect(8, 5, 4, 8, 2, limestone);
    addRect(9, 5, 0, 6, 4, limestone);

    addRect(8, 6, 12, 8, 4, shadow);
    addRect(9, 6, 4, 6, 2, shadow);
    addRect(10, 6, 0, 4, 4, limestone);

    [
        [10, 6, 1],
        [13, 6, 1],
        [11, 5, 0],
        [12, 5, 0],
        [8, 5, 2],
        [15, 5, 2],
        [9, 6, 2],
        [14, 6, 2],
        [11, 6, 3],
        [12, 6, 3],
        [11, 7, 1],
        [12, 7, 1],
        [11, 3, 1],
        [12, 3, 1],
        [10, 6, 15],
        [13, 6, 15],
    ].forEach(([lx, ly, lz]) => addBlock("1x1", dark, lx, ly, lz));

    [
        [9, 7, 0],
        [14, 7, 0],
        [10, 7, 2],
        [13, 7, 2],
    ].forEach(([lx, ly, lz]) => addBlock("1x1", shadow, lx, ly, lz));

    return builder.blocks;
}

const EsfingeEgito = {
    dx: 24,
    dy: 8,
    dz: 18,
    blocks: buildEsfingeEgito(),
};

export default EsfingeEgito;