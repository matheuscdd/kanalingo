import { addFilledRectSafe, addPillarStackSafe, createPrefabBuilder } from "../shared/core.js";

const CRISTO_DX = 20;
const CRISTO_DY = 30;
const CRISTO_DZ = 16;

function buildCristoRedentor() {
    const builder = createPrefabBuilder();
    const palette = {
        plazaDark: "#5c6670",
        plazaLight: "#7c8790",
        pedestalDark: "#46515b",
        pedestalMid: "#6a7680",
        pedestalLight: "#8a949c",
        stone: "#d6dbd8",
        stoneLight: "#e3e7e4",
        stoneShadow: "#aeb7b2",
        stoneDeep: "#89928d",
        shadow: "#2d3338",
    };

    function addRect(x0, y, z0, width, depth, color) {
        addFilledRectSafe(builder, x0, y, z0, width, depth, color);
    }

    function addBlock(type, color, lx, ly, lz, rot = 0) {
        builder.add(type, color, rot, lx, ly, lz);
    }

    function addBlocks(entries) {
        entries.forEach(([type, color, lx, ly, lz, rot = 0]) => addBlock(type, color, lx, ly, lz, rot));
    }

    function addMirroredArmSegments(y, z0, leftXs, color) {
        leftXs.forEach((leftX) => {
            addBlock("2x4", color, leftX, y, z0, 1);
            addBlock("2x4", color, CRISTO_DX - leftX - 4, y, z0, 1);
        });
    }

    addRect(0, 0, 0, CRISTO_DX, CRISTO_DZ, palette.plazaDark);
    addRect(2, 1, 2, 16, 12, palette.plazaLight);
    addRect(4, 2, 3, 12, 10, palette.pedestalDark);
    addRect(5, 3, 4, 10, 8, palette.pedestalMid);
    addRect(6, 4, 5, 8, 6, palette.pedestalLight);
    addRect(6, 5, 5, 8, 6, palette.pedestalLight);
    addRect(7, 6, 5, 6, 6, palette.stoneShadow);
    addRect(7, 7, 5, 6, 6, palette.stoneShadow);

    [
        [4, 1, 0, 12, 4, palette.pedestalDark],
        [6, 2, 0, 8, 4, palette.pedestalMid],
        [8, 3, 0, 4, 4, palette.pedestalLight],
    ].forEach(([x0, y, z0, width, depth, color]) => addRect(x0, y, z0, width, depth, color));

    addPillarStackSafe(builder, 7, 8, 4, 7, palette.stoneShadow);
    addPillarStackSafe(builder, 12, 8, 4, 7, palette.stoneShadow);

    [
        [6, 8, 5, 8, 6, palette.stoneShadow],
        [6, 9, 5, 8, 6, palette.stone],
        [6, 10, 5, 8, 6, palette.stone],
        [7, 11, 5, 6, 6, palette.stone],
        [7, 12, 5, 6, 6, palette.stone],
        [7, 13, 5, 6, 6, palette.stoneLight],
        [7, 14, 5, 6, 6, palette.stoneLight],
        [7, 15, 5, 6, 6, palette.stoneLight],
        [6, 16, 5, 8, 6, palette.stone],
        [8, 17, 6, 4, 4, palette.stoneLight],
        [8, 18, 6, 4, 4, palette.stoneLight],
        [8, 19, 6, 4, 4, palette.stone],
        [8, 20, 6, 4, 4, palette.stone],
        [8, 21, 6, 4, 4, palette.stoneLight],
        [7, 22, 5, 6, 6, palette.stoneLight],
        [7, 23, 5, 6, 6, palette.stone],
        [7, 24, 5, 6, 6, palette.stoneShadow],
        [8, 25, 6, 4, 4, palette.stoneLight],
        [8, 26, 6, 4, 4, palette.stoneLight],
    ].forEach(([x0, y, z0, width, depth, color]) => addRect(x0, y, z0, width, depth, color));

    addMirroredArmSegments(17, 6, [0, 4], palette.stoneLight);
    addMirroredArmSegments(18, 7, [0, 4], palette.stoneLight);
    addMirroredArmSegments(19, 7, [4], palette.stoneShadow);

    addBlocks([
        ["1x1", palette.stoneDeep, 8, 10, 4],
        ["1x1", palette.stoneDeep, 11, 10, 4],
        ["1x1", palette.stoneDeep, 8, 11, 4],
        ["1x1", palette.stoneDeep, 11, 11, 4],
        ["1x1", palette.stoneDeep, 9, 12, 4],
        ["1x1", palette.stoneDeep, 10, 12, 4],
        ["1x1", palette.stoneDeep, 9, 13, 4],
        ["1x1", palette.stoneDeep, 10, 13, 4],
        ["1x1", palette.stoneShadow, 6, 14, 6],
        ["1x1", palette.stoneShadow, 13, 14, 6],
        ["1x1", palette.stoneShadow, 6, 15, 7],
        ["1x1", palette.stoneShadow, 13, 15, 7],
        ["1x1", palette.stoneShadow, 0, 18, 7],
        ["1x1", palette.stoneShadow, 19, 18, 7],
        ["1x1", palette.stoneShadow, 0, 18, 8],
        ["1x1", palette.stoneShadow, 19, 18, 8],
        ["1x1", palette.shadow, 9, 4, 2],
        ["1x1", palette.shadow, 10, 4, 2],
        ["1x1", palette.shadow, 9, 5, 2],
        ["1x1", palette.shadow, 10, 5, 2],
        ["1x1", palette.stoneDeep, 9, 24, 4],
        ["1x1", palette.stoneDeep, 10, 24, 4],
        ["1x1", palette.stoneDeep, 8, 25, 5],
        ["1x1", palette.stoneDeep, 11, 25, 5],
        ["2x2", palette.stoneLight, 9, 27, 7],
        ["1x1", palette.stoneLight, 9, 28, 7],
        ["1x1", palette.stoneLight, 10, 28, 7],
        ["1x1", palette.stoneLight, 9, 29, 7],
        ["1x1", palette.stoneLight, 10, 29, 7],
    ]);

    return builder.blocks;
}

const CristoRedentor = {
    dx: CRISTO_DX,
    dy: CRISTO_DY,
    dz: CRISTO_DZ,
    blocks: buildCristoRedentor(),
};

export default CristoRedentor;
