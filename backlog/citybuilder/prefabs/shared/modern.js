import { addFilledRectSafe, addPillarStackSafe } from "./core.js";

function addPoolSafe(builder, x0, y, z0, width, depth, rimColor = "#8b5a2b", waterColor = "#0055bf") {
    if (width < 2 || depth < 2) return;

    // water surface (tiles) one stud above base
    for (let x = x0; x < x0 + width; x += 2) {
        for (let z = z0; z < z0 + depth; z += 2) {
            builder.add("Tile 2x2", waterColor, 0, x, y + 1, z);
        }
    }

    // simple rim using 1x1 bricks at base level
    for (let x = x0; x < x0 + width; x++) {
        builder.add("1x1", rimColor, 0, x, y, z0);
        builder.add("1x1", rimColor, 0, x, y, z0 + depth - 1);
    }
    for (let z = z0; z < z0 + depth; z++) {
        builder.add("1x1", rimColor, 0, x0, y, z);
        builder.add("1x1", rimColor, 0, x0 + width - 1, y, z);
    }
}

function addBalconySafe(builder, x0, y, z0, width, depth, color = "#f4f4f4") {
    if (width < 2 || depth < 2) return;
    addFilledRectSafe(builder, x0, y, z0, width, depth, color);

    // guardrail (1x1) one stud above floor
    const railColor = "#111111";
    for (let x = x0; x < x0 + width; x++) {
        builder.add("1x1", railColor, 0, x, y + 1, z0);
        builder.add("1x1", railColor, 0, x, y + 1, z0 + depth - 1);
    }
    for (let z = z0; z < z0 + depth; z++) {
        builder.add("1x1", railColor, 0, x0, y + 1, z);
        builder.add("1x1", railColor, 0, x0 + width - 1, y + 1, z);
    }
}

function addPalm(builder, lx, ly, lz) {
    const trunk = "#6b4b34";
    const foliage = "#3f7f46";

    // simple trunk
    for (let i = 0; i < 4; i++) {
        builder.add("1x1", trunk, 0, lx, ly + i, lz);
    }

    // leaves (2x2 blocks arranged around the top)
    const topY = ly + 3;
    const offsets = [
        [-2, 0],
        [2, 0],
        [0, -2],
        [0, 2],
        [-2, -2],
        [2, 2],
        [-2, 2],
        [2, -2],
    ];

    offsets.forEach(([ox, oz]) => {
        builder.add("2x2", foliage, 0, lx + ox, topY, lz + oz);
    });
}

function addLounger(builder, lx, ly, lz, dir = 0) {
    const seat = "#c74e24";
    // simple lounger built from a tile and a small back support
    builder.add("Tile 2x2", seat, dir, lx, ly, lz);
    // small backrest
    builder.add("1x1", "#111111", dir, lx + 1, ly + 1, lz);
}

export { addPoolSafe, addBalconySafe, addPalm, addLounger };
