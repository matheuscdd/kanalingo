import { addFilledRectSafe, getBoxBounds } from "./core.js";

function createHogwartsPalette() {
    return {
        rockShadow: "#1d2329",
        rock: "#4f5761",
        stoneDark: "#6a737c",
        stone: "#8d97a1",
        stoneLight: "#c1c9d0",
        roofDark: "#2a1e1b",
        roof: "#5b3d34",
        glass: "#8fb6ff",
        grass: "#237841",
        gold: "#f2cd37",
        path: "#6f5843",
    };
}

function addHogwartsColumn(builder, lx, y0, lz, height, color) {
    for (let y = y0; y < y0 + height; y++) {
        builder.add("1x1", color, 0, lx, y, lz);
    }
}

function addHogwartsPerimeter(builder, box, y0, height, color) {
    const { x0, z0 } = box;
    const { x1, z1 } = getBoxBounds(box);

    for (let y = y0; y < y0 + height; y++) {
        for (let x = x0; x <= x1; x++) {
            builder.add("1x1", color, 0, x, y, z0);
            builder.add("1x1", color, 0, x, y, z1);
        }
        for (let z = z0 + 1; z <= z1 - 1; z++) {
            builder.add("1x1", color, 0, x0, y, z);
            builder.add("1x1", color, 0, x1, y, z);
        }
    }
}

function addHogwartsWindowRing(builder, box, y, color, spacing = 4) {
    const { x0, z0 } = box;
    const { x1, z1 } = getBoxBounds(box);

    for (let x = x0 + 1; x <= x1 - 2; x += spacing) {
        builder.add("Window", color, 1, x, y, z0);
        builder.add("Window", color, 1, x, y, z1);
    }

    for (let z = z0 + 1; z <= z1 - 2; z += spacing) {
        builder.add("Window", color, 0, x0, y, z);
        builder.add("Window", color, 0, x1, y, z);
    }
}

function addHogwartsButtresses(builder, box, y0, height, color, spacing = 4) {
    const { x0, z0 } = box;
    const { x1, z1 } = getBoxBounds(box);
    const points = new Set([
        `${x0},${z0}`,
        `${x1},${z0}`,
        `${x0},${z1}`,
        `${x1},${z1}`,
    ]);

    for (let x = x0 + spacing; x <= x1 - spacing; x += spacing) {
        points.add(`${x},${z0}`);
        points.add(`${x},${z1}`);
    }

    for (let z = z0 + spacing; z <= z1 - spacing; z += spacing) {
        points.add(`${x0},${z}`);
        points.add(`${x1},${z}`);
    }

    points.forEach((point) => {
        const [lx, lz] = point.split(",").map(Number);
        addHogwartsColumn(builder, lx, y0, lz, height, color);
    });
}

function addHogwartsBattlements(builder, box, y, color) {
    const { x0, z0 } = box;
    const { x1, z1 } = getBoxBounds(box);

    for (let x = x0; x <= x1; x += 2) {
        builder.add("1x1", color, 0, x, y, z0);
        builder.add("1x1", color, 0, x, y, z1);
    }

    for (let z = z0 + 2; z <= z1 - 2; z += 2) {
        builder.add("1x1", color, 0, x0, y, z);
        builder.add("1x1", color, 0, x1, y, z);
    }
}

function addHogwartsRoofLayer(builder, box, y, palette, ridge, addRidge) {
    const { x0, z0, width, depth } = box;
    const { x1, z1 } = getBoxBounds(box);

    if (width > 2 && depth > 2) {
        addFilledRectSafe(builder, x0 + 1, y - 1, z0 + 1, width - 2, depth - 2, palette.roofDark);
    }

    for (let x = x0; x <= x1 - 1; x += 2) {
        builder.add("Roof 1x2", palette.roof, 0, x, y, z0);
        builder.add("Roof 1x2", palette.roof, 2, x, y, z1 - 1);
    }

    for (let z = z0 + 2; z <= z1 - 2; z += 2) {
        builder.add("Roof 1x2", palette.roof, 1, x0, y, z);
        builder.add("Roof 1x2", palette.roof, 3, x1 - 1, y, z);
    }

    if (!addRidge) return;

    if (ridge === "x" && depth > 2) {
        const ridgeZ = z0 + Math.floor((depth - 2) / 2);
        for (let x = x0; x <= x1 - 1; x += 2) {
            builder.add("Tile 2x2", palette.stoneLight, 0, x, y, ridgeZ);
        }
        return;
    }

    if (width > 2) {
        const ridgeX = x0 + Math.floor((width - 2) / 2);
        for (let z = z0; z <= z1 - 1; z += 2) {
            builder.add("Tile 2x2", palette.stoneLight, 0, ridgeX, y, z);
        }
    }
}

function addHogwartsRoof(builder, box, y, palette, options = {}) {
    const ridge = options.ridge || "x";
    const levels = options.levels || 2;

    for (let layer = 0; layer < levels; layer++) {
        const roofBox = {
            x0: box.x0 + layer,
            z0: box.z0 + layer,
            width: box.width - layer * 2,
            depth: box.depth - layer * 2,
        };

        if (roofBox.width < 2 || roofBox.depth < 2) break;
        addHogwartsRoofLayer(builder, roofBox, y + layer, palette, ridge, layer === levels - 1);
    }
}

function addHogwartsSpire(builder, lx, lz, baseY, palette) {
    builder.add("Pillar", palette.roofDark, 0, lx, baseY, lz);
    builder.add("1x1", palette.gold, 0, lx, baseY + 3, lz);
}

function addHogwartsTower(builder, config, palette) {
    const box = { x0: config.x0, z0: config.z0, width: config.size, depth: config.size };
    const size = config.size;
    const baseY = config.baseY;
    const height = config.height;

    addFilledRectSafe(builder, config.x0, baseY, config.z0, size, size, palette.rockShadow);
    if (size > 2) {
        addFilledRectSafe(builder, config.x0 + 1, baseY + 1, config.z0 + 1, size - 2, size - 2, palette.stoneDark);
    }

    for (let y = baseY + 2; y < baseY + height - 1; y += 4) {
        addHogwartsWindowRing(builder, box, y, palette.glass, Math.max(2, size - 2));
    }

    addHogwartsPerimeter(builder, box, baseY + 1, height, config.stoneColor || palette.stone);
    addHogwartsButtresses(builder, box, baseY + 1, height, palette.roofDark, Math.max(4, size - 2));

    const topY = baseY + height;

    if (config.battlements) {
        if (size > 2) {
            addFilledRectSafe(builder, config.x0 + 1, topY, config.z0 + 1, size - 2, size - 2, palette.stoneLight);
        }
        addHogwartsBattlements(builder, box, topY + 1, palette.stoneLight);
        return;
    }

    addHogwartsRoof(builder, box, topY, palette, { ridge: config.ridge || "z", levels: config.roofLevels || 2 });

    if (config.spire !== false) {
        addHogwartsSpire(
            builder,
            config.x0 + Math.floor(size / 2),
            config.z0 + Math.floor(size / 2),
            topY + (config.roofLevels || 2),
            palette,
        );
    }
}

function addHogwartsHall(builder, config, palette) {
    const box = { x0: config.x0, z0: config.z0, width: config.width, depth: config.depth };

    addFilledRectSafe(builder, config.x0, config.baseY, config.z0, config.width, config.depth, palette.rockShadow);

    if (config.width > 4 && config.depth > 4) {
        addFilledRectSafe(
            builder,
            config.x0 + 2,
            config.baseY + 1,
            config.z0 + 2,
            config.width - 4,
            config.depth - 4,
            palette.stoneDark,
        );
    }

    const windowRows = config.windowRows || [config.baseY + 2, config.baseY + 6];
    windowRows.forEach((rowY) => {
        if (rowY < config.baseY + config.bodyHeight) {
            addHogwartsWindowRing(builder, box, rowY, palette.glass);
        }
    });

    addHogwartsPerimeter(builder, box, config.baseY + 1, config.bodyHeight, config.stoneColor || palette.stone);
    addHogwartsButtresses(builder, box, config.baseY + 1, config.bodyHeight, palette.roofDark, config.buttressSpacing || 4);
    addHogwartsBattlements(builder, box, config.baseY + config.bodyHeight, palette.stoneLight);
    addHogwartsRoof(builder, box, config.baseY + config.bodyHeight + 1, palette, {
        ridge: config.ridge || "x",
        levels: config.roofLevels || 2,
    });
}

function getHogwartsCliffLayer(area, y) {
    const insetX = Math.floor(y / 2);
    const insetZ = Math.floor(y / 3);
    const startX = area.x0 + insetX + (y % 2);
    const startZ = area.z0 + insetZ + (y % 3 === 0 ? 1 : 0);
    let spanX = area.width - insetX * 2 - (y % 2 ? 2 : 0);
    let spanZ = area.depth - insetZ * 2 - (y % 3 === 0 ? 2 : 0);

    if (spanX % 2 !== 0) spanX -= 1;
    if (spanZ % 2 !== 0) spanZ -= 1;
    if (spanX < 2 || spanZ < 2) return null;

    return { x0: startX, z0: startZ, width: spanX, depth: spanZ };
}

function getHogwartsCliffColor(y, height, palette, topColor) {
    if (y === height - 1) return topColor;
    if (y >= height - 2) return palette.rock;
    return palette.rockShadow;
}

function addHogwartsCliff(builder, area, palette, topColor = palette.grass) {
    for (let y = 0; y < area.height; y++) {
        const layer = getHogwartsCliffLayer(area, y);
        if (!layer) continue;
        addFilledRectSafe(builder, layer.x0, y, layer.z0, layer.width, layer.depth, getHogwartsCliffColor(y, area.height, palette, topColor));
    }

    for (let x = area.x0 + 2; x < area.x0 + area.width - 2; x += 6) {
        const cliffOffset = Math.floor(x / 2) % 2;
        addHogwartsColumn(builder, x, 0, area.z0 + 1 + cliffOffset, 2 + (x % 3), palette.rockShadow);
        addHogwartsColumn(builder, x, 0, area.z0 + area.depth - 3 - cliffOffset, 2 + ((x + 1) % 3), palette.rockShadow);
    }
}

function addHogwartsBridge(builder, box, deckY, palette) {
    const { x0, z0, width, depth } = box;

    addFilledRectSafe(builder, x0, deckY, z0, width, depth, palette.path);
    if (box.width > 4) {
        addFilledRectSafe(builder, x0 + 2, deckY + 1, z0, width - 4, depth, palette.stoneLight);
    }

    for (let z = z0; z < z0 + depth; z += 4) {
        addHogwartsColumn(builder, x0, deckY + 1, z, 3, palette.roofDark);
        addHogwartsColumn(builder, x0 + width - 1, deckY + 1, z, 3, palette.roofDark);
    }

    for (let z = z0 + 1; z < z0 + depth - 1; z += 2) {
        builder.add("1x1", palette.stoneLight, 0, x0, deckY + 3, z);
        builder.add("1x1", palette.stoneLight, 0, x0 + width - 1, deckY + 3, z);
    }

    for (let z = z0 + 2; z < z0 + depth; z += 6) {
        addHogwartsColumn(builder, x0 + 1, 0, z, deckY, palette.rockShadow);
        addHogwartsColumn(builder, x0 + width - 2, 0, z, deckY, palette.rockShadow);
    }
}

export {
    addHogwartsBattlements,
    addHogwartsBridge,
    addHogwartsButtresses,
    addHogwartsCliff,
    addHogwartsColumn,
    addHogwartsHall,
    addHogwartsPerimeter,
    addHogwartsRoof,
    addHogwartsRoofLayer,
    addHogwartsSpire,
    addHogwartsTower,
    addHogwartsWindowRing,
    createHogwartsPalette,
    getHogwartsCliffColor,
    getHogwartsCliffLayer,
};
