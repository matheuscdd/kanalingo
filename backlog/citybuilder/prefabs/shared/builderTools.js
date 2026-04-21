import { BLOCKS } from "./blocks.js";
import { createPrefabBuilder, getBlockFootprint, getBlockMetrics } from "./core.js";
import {
    SHAPE_DIRECTION_DEFAULT,
    getBoundsAfterShapeOrientation,
    normalizeShapeDirection,
} from "./shapeOrientation.js";

const FORMAS_3D = [
    "hexagonal_pyramid",
    "cuboid",
    "cylinder",
    "ring",
    "hexagonal_prism",
    "sphere",
    "truncated_cone",
    "dodecahedron",
    "square_pyramid",
    "octahedron",
    "cone",
    "pentagrammic_prism",
    "buckyball",
    "cube",
    "triangular_prism",
    "torus",
    "icosahedron",
    "half_sphere",
];

const SHAPE_BLOCK_PREFIX = "ShapeMesh:";
const DIRECT_GEOMETRY_SHAPES = new Set([
    "hexagonal_pyramid",
    "cuboid",
    "hexagonal_prism",
    "dodecahedron",
    "square_pyramid",
    "octahedron",
    "pentagrammic_prism",
    "buckyball",
    "cube",
    "triangular_prism",
    "icosahedron",
]);

const PLATFORM_BASE_LOCKED_SHAPES = new Set(["square_pyramid"]);

function clampPositiveInt(value, fallback = 1, max = 64) {
    const normalized = Math.max(1, Math.min(max, Math.round(Number(value) || fallback)));
    return Number.isFinite(normalized) ? normalized : fallback;
}

function isDynamicShapeBlockType(type) {
    return typeof type === "string" && type.startsWith(SHAPE_BLOCK_PREFIX);
}

function isShapeDirectionLocked(shape) {
    return PLATFORM_BASE_LOCKED_SHAPES.has(shape);
}

function getEffectiveShapeDirection(shape, direction = SHAPE_DIRECTION_DEFAULT) {
    if (isShapeDirectionLocked(shape)) return SHAPE_DIRECTION_DEFAULT;
    return normalizeShapeDirection(direction);
}

function parseDynamicShapeBlockType(type) {
    const match = /^ShapeMesh:([^:]+):(\d+):(\d+):(\d+)$/.exec(String(type || ""));
    if (!match) return null;

    return {
        shape: match[1],
        width: clampPositiveInt(match[2], 1),
        height: clampPositiveInt(match[3], 1),
        depth: clampPositiveInt(match[4], 1),
    };
}

function ensureDynamicShapeBlockType(type) {
    const parsed = parseDynamicShapeBlockType(type);
    if (!parsed) return null;
    if (!BLOCKS[type]) {
        BLOCKS[type] = {
            sx: parsed.width,
            sy: parsed.height,
            sz: parsed.depth,
            topStuds: false,
            visualTopStuds: true,
            customGeo: `shape:${parsed.shape}`,
        };
    } else if (BLOCKS[type].customGeo?.startsWith("shape:")) {
        BLOCKS[type].topStuds = false;
        if (BLOCKS[type].visualTopStuds == null) BLOCKS[type].visualTopStuds = true;
    }
    return BLOCKS[type];
}

function getRegisteredBlockDef(type) {
    return BLOCKS[type] || ensureDynamicShapeBlockType(type);
}

function getRecipeBounds(blocks) {
    if (!Array.isArray(blocks) || blocks.length === 0) {
        return { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0, dx: 0, dy: 0, dz: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;

    blocks.forEach((block) => {
        const def = getRegisteredBlockDef(block.type);
        if (!def) return;
        const { dx, dy, dz } = getBlockMetrics(def, block.rot || 0, block.direction);

        minX = Math.min(minX, block.lx);
        minY = Math.min(minY, block.ly);
        minZ = Math.min(minZ, block.lz);
        maxX = Math.max(maxX, block.lx + dx);
        maxY = Math.max(maxY, block.ly + dy);
        maxZ = Math.max(maxZ, block.lz + dz);
    });

    return {
        minX,
        minY,
        minZ,
        maxX,
        maxY,
        maxZ,
        dx: maxX - minX,
        dy: maxY - minY,
        dz: maxZ - minZ,
    };
}

function finalizeRecipe(blocks) {
    return {
        blocks,
        bounds: getRecipeBounds(blocks),
    };
}

function resolveBuilderType(type) {
    const def = getRegisteredBlockDef(type);
    if (def && !def.animated) return type;
    return "1x1";
}

function createVoxelRecipe(width, height, depth, testFn, color) {
    const blocks = [];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            for (let z = 0; z < depth; z++) {
                const nx = ((x + 0.5) / width) * 2 - 1;
                const ny = ((y + 0.5) / height) * 2 - 1;
                const nz = ((z + 0.5) / depth) * 2 - 1;

                if (!testFn(nx, ny, nz, { x, y, z, width, height, depth })) continue;
                blocks.push({ type: "1x1", color, rot: 0, lx: x, ly: y, lz: z });
            }
        }
    }

    return blocks;
}

function transformShapeRecipeBlocks(blocks, bounds, direction = SHAPE_DIRECTION_DEFAULT, rot = 0) {
    const normalizedDirection = normalizeShapeDirection(direction);
    const normalizedRot = ((Number(rot) || 0) % 4 + 4) % 4;

    if (normalizedDirection === SHAPE_DIRECTION_DEFAULT && normalizedRot === 0) {
        return blocks;
    }

    const recipeBounds = getBoundsAfterShapeOrientation(
        { minX: 0, maxX: bounds.width, minY: 0, maxY: bounds.height, minZ: 0, maxZ: bounds.depth },
        normalizedDirection,
        normalizedRot,
    );

    return blocks.map((block) => {
        const def = getRegisteredBlockDef(block.type);
        const { dx, dy, dz } = getBlockMetrics(def, block.rot || 0, block.direction);
        const transformed = getBoundsAfterShapeOrientation(
            {
                minX: block.lx,
                maxX: block.lx + dx,
                minY: block.ly,
                maxY: block.ly + dy,
                minZ: block.lz,
                maxZ: block.lz + dz,
            },
            normalizedDirection,
            normalizedRot,
        );

        return {
            ...block,
            lx: transformed.minX - recipeBounds.minX,
            ly: transformed.minY - recipeBounds.minY,
            lz: transformed.minZ - recipeBounds.minZ,
        };
    });
}

function createAreaRecipe({ type = "1x1", color = "#e3000b", rot = 0, width = 2, depth = 2, height = 1 } = {}) {
    const builderType = resolveBuilderType(type);
    const builder = createPrefabBuilder();
    const def = getRegisteredBlockDef(builderType);
    const { dx, dz } = getBlockFootprint(def, rot);
    const normalizedWidth = clampPositiveInt(width, 2);
    const normalizedDepth = clampPositiveInt(depth, 2);
    const normalizedHeight = clampPositiveInt(height, 1);

    for (let ly = 0; ly + def.sy <= normalizedHeight; ly += def.sy) {
        for (let lx = 0; lx + dx <= normalizedWidth; lx += dx) {
            for (let lz = 0; lz + dz <= normalizedDepth; lz += dz) {
                builder.add(builderType, color, rot, lx, ly, lz);
            }
        }
    }

    return finalizeRecipe(builder.blocks);
}

function createFloorRecipe({ type = "1x1", color = "#e3000b", rot = 0, width = 2, depth = 2 } = {}) {
    return createAreaRecipe({ type, color, rot, width, depth, height: 1 });
}

function createWallRecipe({ type = "1x1", color = "#e3000b", rot = 0, width = 4, height = 4 } = {}) {
    const builderType = resolveBuilderType(type);
    const builder = createPrefabBuilder();
    const def = getRegisteredBlockDef(builderType);
    const { dx, dz } = getBlockFootprint(def, rot);
    const normalizedWidth = clampPositiveInt(width, 2);
    const normalizedHeight = clampPositiveInt(height, 2);
    const alongX = rot % 2 === 0;

    for (let ly = 0; ly + def.sy <= normalizedHeight; ly += def.sy) {
        for (let cursor = 0; alongX ? cursor + dx <= normalizedWidth : cursor + dz <= normalizedWidth; cursor += alongX ? dx : dz) {
            builder.add(builderType, color, rot, alongX ? cursor : 0, ly, alongX ? 0 : cursor);
        }
    }

    return finalizeRecipe(builder.blocks);
}

function getNormalizedShapeDimensions(shape, width, depth, height) {
    const normalizedWidth = clampPositiveInt(width, 4);
    const normalizedDepth = clampPositiveInt(depth, 4);
    const normalizedHeight = clampPositiveInt(height, 4);

    if (shape === "cube") {
        const size = Math.max(1, Math.min(normalizedWidth, normalizedDepth, normalizedHeight));
        return { width: size, depth: size, height: size };
    }

    return {
        width: normalizedWidth,
        depth: normalizedDepth,
        height: normalizedHeight,
    };
}

function makeDynamicShapeBlockType(shape, width, height, depth) {
    return `${SHAPE_BLOCK_PREFIX}${shape}:${width}:${height}:${depth}`;
}

function createDirectGeometryRecipe(shape, { color, width, depth, height, direction = SHAPE_DIRECTION_DEFAULT, rot = 0 }) {
    const dims = getNormalizedShapeDimensions(shape, width, depth, height);
    const type = makeDynamicShapeBlockType(shape, dims.width, dims.height, dims.depth);
    const resolvedDirection = getEffectiveShapeDirection(shape, direction);
    ensureDynamicShapeBlockType(type);
    return finalizeRecipe([{ type, color, rot, direction: resolvedDirection, lx: 0, ly: 0, lz: 0 }]);
}

function createShapeRecipe(shape, { color = "#e3000b", width = 6, depth = 6, height = 6, direction = SHAPE_DIRECTION_DEFAULT, rot = 0 } = {}) {
    const resolvedDirection = getEffectiveShapeDirection(shape, direction);
    if (DIRECT_GEOMETRY_SHAPES.has(shape)) {
        return createDirectGeometryRecipe(shape, { color, width, depth, height, direction: resolvedDirection, rot });
    }

    const dims = getNormalizedShapeDimensions(shape, width, depth, height);
    const blocks = (() => {
        switch (shape) {
            case "cylinder":
                return createVoxelRecipe(dims.width, dims.height, dims.depth, (nx, _ny, nz) => nx * nx + nz * nz <= 1, color);
            case "ring":
                return createVoxelRecipe(dims.width, dims.height, dims.depth, (nx, _ny, nz) => {
                    const distance = nx * nx + nz * nz;
                    return distance <= 1 && distance >= 0.35;
                }, color);
            case "sphere":
                return createVoxelRecipe(dims.width, dims.height, dims.depth, (nx, ny, nz) => nx * nx + ny * ny + nz * nz <= 1, color);
            case "half_sphere":
                return createVoxelRecipe(dims.width, dims.height, dims.depth, (nx, _ny, nz, ctx) => {
                    const y01 = (ctx.y + 0.5) / ctx.height;
                    return nx * nx + nz * nz + y01 * y01 <= 1;
                }, color);
            case "truncated_cone":
                return createVoxelRecipe(dims.width, dims.height, dims.depth, (nx, _ny, nz, ctx) => {
                    const y01 = ctx.height <= 1 ? 1 : ctx.y / (ctx.height - 1);
                    const radius = 1 - y01 * 0.55;
                    return nx * nx + nz * nz <= radius * radius;
                }, color);
            case "cone":
                return createVoxelRecipe(dims.width, dims.height, dims.depth, (nx, _ny, nz, ctx) => {
                    const y01 = ctx.height <= 1 ? 1 : ctx.y / (ctx.height - 1);
                    const radius = Math.max(0.12, 1 - y01);
                    return nx * nx + nz * nz <= radius * radius;
                }, color);
            case "torus":
                return createVoxelRecipe(dims.width, dims.height, dims.depth, (nx, ny, nz) => {
                    const majorRadius = 0.62;
                    const minorRadius = 0.28;
                    const radial = Math.sqrt(nx * nx + nz * nz);
                    return (radial - majorRadius) * (radial - majorRadius) + ny * ny <= minorRadius * minorRadius;
                }, color);
            default:
                return createVoxelRecipe(dims.width, dims.height, dims.depth, () => true, color);
        }
    })();

    return finalizeRecipe(transformShapeRecipeBlocks(blocks, dims, resolvedDirection, rot));
}

export {
    DIRECT_GEOMETRY_SHAPES,
    FORMAS_3D,
    SHAPE_BLOCK_PREFIX,
    clampPositiveInt,
    createAreaRecipe,
    createFloorRecipe,
    createShapeRecipe,
    createWallRecipe,
    ensureDynamicShapeBlockType,
    getEffectiveShapeDirection,
    getRecipeBounds,
    isShapeDirectionLocked,
    isDynamicShapeBlockType,
    makeDynamicShapeBlockType,
    parseDynamicShapeBlockType,
};