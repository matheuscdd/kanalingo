import { BLOCKS } from "./blocks.js";
import {
    SHAPE_DIRECTION_DEFAULT,
    getShapePlacementMetrics,
    normalizeShapeDirection,
} from "./shapeOrientation.js";

function getBlockMetrics(def, rot = 0, direction = SHAPE_DIRECTION_DEFAULT) {
    if (def?.customGeo?.startsWith("shape:")) {
        const metrics = getShapePlacementMetrics(def.sx, def.sy, def.sz, direction, rot);
        return { dx: metrics.dx, dy: metrics.dy, dz: metrics.dz };
    }

    if (rot % 2 === 0) return { dx: def.sx, dy: def.sy, dz: def.sz };
    return { dx: def.sz, dy: def.sy, dz: def.sx };
}

function getBlockFootprint(def, rot, direction = SHAPE_DIRECTION_DEFAULT) {
    const { dx, dz } = getBlockMetrics(def, rot, direction);
    return { dx, dz };
}

function getPrefabCells(def, rot, lx, ly, lz, direction = SHAPE_DIRECTION_DEFAULT) {
    const { dx, dy, dz } = getBlockMetrics(def, rot, direction);
    const keys = [];

    for (let x = 0; x < dx; x++) {
        for (let y = 0; y < dy; y++) {
            for (let z = 0; z < dz; z++) {
                keys.push(`${lx + x},${ly + y},${lz + z}`);
            }
        }
    }

    return keys;
}

function getBoxBounds(box) {
    return {
        x1: box.x0 + box.width - 1,
        z1: box.z0 + box.depth - 1,
    };
}

function createPrefabBuilder() {
    const blocks = [];
    const occupied = new Set();

    function add(type, color, rot, lx, ly, lz, options = {}) {
        const def = BLOCKS[type];
        if (!def) return false;

        const direction = options.direction == null ? SHAPE_DIRECTION_DEFAULT : normalizeShapeDirection(options.direction);
        const keys = getPrefabCells(def, rot, lx, ly, lz, direction);
        if (keys.some((key) => occupied.has(key))) return false;
        keys.forEach((key) => occupied.add(key));

        const block = { type, color, rot, lx, ly, lz };
        if (options.direction != null) block.direction = direction;
        blocks.push(block);
        return true;
    }

    return { blocks, add };
}

function addFilledRectSafe(builder, x0, y, z0, width, depth, color) {
    if (width < 2 || depth < 2) return;

    for (let x = x0; x < x0 + width; x += 2) {
        let cursorZ = z0;
        for (; cursorZ + 4 <= z0 + depth; cursorZ += 4) {
            builder.add("2x4", color, 0, x, y, cursorZ);
        }
        if (cursorZ + 2 <= z0 + depth) {
            builder.add("2x2", color, 0, x, y, cursorZ);
        }
    }
}

function addFilledRect(blocks, x0, y, z0, width, depth, color) {
    for (let x = x0; x < x0 + width; x += 2) {
        let cursorZ = z0;
        for (; cursorZ + 4 <= z0 + depth; cursorZ += 4) {
            blocks.push({ type: "2x4", color, rot: 0, lx: x, ly: y, lz: cursorZ });
        }
        if (cursorZ + 2 <= z0 + depth) {
            blocks.push({ type: "2x2", color, rot: 0, lx: x, ly: y, lz: cursorZ });
        }
    }
}

function addPillarStack(blocks, lx, y0, lz, height, color) {
    let y = y0;
    for (; y + 3 <= y0 + height; y += 3) {
        blocks.push({ type: "Pillar", color, rot: 0, lx, ly: y, lz });
    }
    for (; y < y0 + height; y++) {
        blocks.push({ type: "1x1", color, rot: 0, lx, ly: y, lz });
    }
}

function addPillarStackSafe(builder, lx, y0, lz, height, color) {
    let y = y0;
    for (; y + 3 <= y0 + height; y += 3) {
        builder.add("Pillar", color, 0, lx, y, lz);
    }
    for (; y < y0 + height; y++) {
        builder.add("1x1", color, 0, lx, y, lz);
    }
}

function addSolid(blocks, x0, y0, z0, width, depth, heightColor) {
    const [height, color] = heightColor;
    for (let y = y0; y < y0 + height; y++) {
        addFilledRect(blocks, x0, y, z0, width, depth, color);
    }
}

function normalizeEllipseValue(value) {
    if (typeof value === "number") return { x: value, z: value };
    return value;
}

function getEllipsePoints(center, radii, options = {}) {
    const ellipseCenter = normalizeEllipseValue(center);
    const ellipseRadii = normalizeEllipseValue(radii);
    const { count = 1, offset = 0, dedupe = true } = options;

    if (count < 1 || ellipseRadii.x <= 0 || ellipseRadii.z <= 0) return [];

    const points = [];
    const seen = dedupe ? new Set() : null;

    for (let i = 0; i < count; i++) {
        const angle = ((i + offset) / count) * Math.PI * 2;
        const lx = Math.round(ellipseCenter.x + Math.cos(angle) * ellipseRadii.x - 1);
        const lz = Math.round(ellipseCenter.z + Math.sin(angle) * ellipseRadii.z - 1);
        const key = `${lx},${lz}`;

        if (seen?.has(key)) continue;
        if (seen) seen.add(key);

        points.push({ index: i, angle, lx, lz });
    }

    return points;
}

function getEllipseCoverage(cx, cz, center, radii) {
    return ((cx - center.x) ** 2) / (radii.x ** 2) + ((cz - center.z) ** 2) / (radii.z ** 2);
}

function addEllipseBandSafe(builder, center, outerRadii, options = {}) {
    const ellipseCenter = normalizeEllipseValue(center);
    const outer = normalizeEllipseValue(outerRadii);
    const inner = options.inner ? normalizeEllipseValue(options.inner) : null;
    const { y = 0, color, type = "2x2", rot = 0, stepX, stepZ } = options;
    const def = BLOCKS[type];

    if (!def || !color || outer.x <= 0 || outer.z <= 0) return;

    const xStep = stepX || def.sx;
    const zStep = stepZ || def.sz;
    const minX = Math.floor((ellipseCenter.x - outer.x - def.sx) / xStep) * xStep;
    const maxX = Math.ceil((ellipseCenter.x + outer.x) / xStep) * xStep;
    const minZ = Math.floor((ellipseCenter.z - outer.z - def.sz) / zStep) * zStep;
    const maxZ = Math.ceil((ellipseCenter.z + outer.z) / zStep) * zStep;
    const hasInner = Boolean(inner && inner.x > 0 && inner.z > 0);

    for (let lx = minX; lx <= maxX; lx += xStep) {
        for (let lz = minZ; lz <= maxZ; lz += zStep) {
            const cx = lx + def.sx / 2;
            const cz = lz + def.sz / 2;
            const outerValue = getEllipseCoverage(cx, cz, ellipseCenter, outer);

            if (outerValue > 1) continue;
            if (hasInner && getEllipseCoverage(cx, cz, ellipseCenter, inner) < 1) continue;

            builder.add(type, color, rot, lx, y, lz);
        }
    }
}

function addEllipseOfBlocksSafe(builder, type, color, center, radii, options = {}) {
    const { y = 0, count = 1, offset = 0, rotFn = 0, dedupe = true } = options;
    if (!BLOCKS[type]) return [];

    const points = getEllipsePoints(center, radii, { count, offset, dedupe });

    points.forEach((point, index) => {
        const rot = typeof rotFn === "function" ? rotFn(point, index) : (rotFn || 0);
        builder.add(type, color, rot, point.lx, y, point.lz);
    });

    return points;
}

// Função utilitária para círculos de blocos
// options: { extra: {}, offset: 0 }
function addCircleOfBlocks(blocks, type, color, rotFn, center, radius, options = {}) {
    const { y = 0, count = 1, extra = {}, offset = 0 } = options;
    for (let i = 0; i < count; i++) {
        const angle = ((i + offset) / count) * Math.PI * 2;
        const lx = Math.round(center + Math.cos(angle) * radius - 1);
        const lz = Math.round(center + Math.sin(angle) * radius - 1);
        const rot = typeof rotFn === "function" ? rotFn(i) : (rotFn || 0);
        blocks.push({ type, color, rot, lx, ly: y, lz, ...extra });
    }
}

export {
    addFilledRect,
    addFilledRectSafe,
    addPillarStack,
    addPillarStackSafe,
    addSolid,
    createPrefabBuilder,
    getBlockMetrics,
    getBlockFootprint,
    getBoxBounds,
    getPrefabCells,
    getEllipsePoints,
    addEllipseBandSafe,
    addEllipseOfBlocksSafe,
    addCircleOfBlocks,
};
