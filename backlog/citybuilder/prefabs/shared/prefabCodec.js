import { BLOCKS } from "./blocks.js";
import { ensureDynamicShapeBlockType } from "./builderTools.js";
import {
    addEllipseBandSafe,
    addEllipseOfBlocksSafe,
    addFilledRectSafe,
    addPillarStackSafe,
    addSolid,
    createPrefabBuilder,
    getBlockMetrics,
} from "./core.js";
import { normalizeShapeDirection, rotateShapeOrientationAroundY } from "./shapeOrientation.js";

const PREFAB_JSON_VERSION = 1;
const PREFAB_JSON_KIND = "prefab";
const SUPPORTED_PREFAB_JSON_RECIPE_OPS = ["block", "blocks", "filledRect", "pillarStack", "solid", "ellipseBand", "ellipseBlocks"];

const PREFAB_NEIGHBOR_OFFSETS = [];
for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
            if (dx === 0 && dy === 0 && dz === 0) continue;
            PREFAB_NEIGHBOR_OFFSETS.push([dx, dy, dz]);
        }
    }
}

function getPrefabOffsetKey(x, y, z) {
    return `${x},${y},${z}`;
}

function getRegisteredBlockDef(type) {
    return BLOCKS[type] || ensureDynamicShapeBlockType(type);
}

function normalizePrefabName(name, fallbackName = "ImportedPrefab") {
    if (typeof name !== "string") return fallbackName;
    const normalized = name.trim().replace(/\s+/g, " ");
    return normalized || fallbackName;
}

function normalizeFiniteNumber(value, label, { positive = false } = {}) {
    const normalized = Number(value);
    if (!Number.isFinite(normalized)) {
        throw new TypeError(`${label} must be a finite number.`);
    }
    if (positive && normalized <= 0) {
        throw new RangeError(`${label} must be greater than zero.`);
    }
    return normalized;
}

function normalizeInteger(value, label, { min = 0, allowNegative = false } = {}) {
    const normalized = Number(value);
    if (!Number.isInteger(normalized)) {
        throw new TypeError(`${label} must be an integer.`);
    }
    if (!allowNegative && normalized < 0) {
        throw new RangeError(`${label} must be greater than or equal to ${min}.`);
    }
    if (normalized < min) {
        throw new RangeError(`${label} must be greater than or equal to ${min}.`);
    }
    return normalized;
}

function normalizeColor(color, label) {
    if (typeof color !== "string" || !color.trim()) {
        throw new TypeError(`${label} must be a non-empty string.`);
    }
    return color.trim();
}

function normalizeEllipseValue(value, label, { positive = false } = {}) {
    if (typeof value === "number") {
        return normalizeFiniteNumber(value, label, { positive });
    }

    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new TypeError(`${label} must be a number or an object with x/z.`);
    }

    return {
        x: normalizeFiniteNumber(value.x, `${label}.x`, { positive }),
        z: normalizeFiniteNumber(value.z, `${label}.z`, { positive }),
    };
}

function normalizeBlock(block, index, prefabName = "Prefab") {
    if (!block || typeof block !== "object" || Array.isArray(block)) {
        throw new TypeError(`Prefab ${prefabName} has an invalid block at index ${index}.`);
    }

    const type = typeof block.type === "string" ? block.type.trim() : "";
    if (!getRegisteredBlockDef(type)) {
        throw new Error(`Prefab ${prefabName} uses unknown block type at index ${index}: ${block.type}`);
    }

    const def = getRegisteredBlockDef(type);
    const rot = block.rot == null ? 0 : normalizeInteger(block.rot, `Prefab ${prefabName} block[${index}].rot`, { allowNegative: true, min: -Infinity });

    const normalized = {
        type,
        color: normalizeColor(block.color, `Prefab ${prefabName} block[${index}].color`),
        rot: ((rot % 4) + 4) % 4,
        lx: normalizeInteger(block.lx, `Prefab ${prefabName} block[${index}].lx`),
        ly: normalizeInteger(block.ly, `Prefab ${prefabName} block[${index}].ly`),
        lz: normalizeInteger(block.lz, `Prefab ${prefabName} block[${index}].lz`),
    };

    if (def?.customGeo?.startsWith("shape:")) {
        normalized.direction = normalizeShapeDirection(block.direction);
    }

    return normalized;
}

function cloneBlock(block) {
    const cloned = {
        type: block.type,
        color: block.color,
        rot: block.rot || 0,
        lx: block.lx,
        ly: block.ly,
        lz: block.lz,
    };
    if (block.direction != null) cloned.direction = normalizeShapeDirection(block.direction);
    return cloned;
}

function getBlockKey(block) {
    return `${block.type}|${block.color}|${block.rot || 0}|${block.direction || ""}|${block.lx}|${block.ly}|${block.lz}`;
}

function sortBlocks(blocks) {
    return [...blocks].sort(
        (left, right) =>
            left.ly - right.ly ||
            left.lz - right.lz ||
            left.lx - right.lx ||
            left.type.localeCompare(right.type) ||
            (left.direction || "").localeCompare(right.direction || "") ||
            (left.rot || 0) - (right.rot || 0) ||
            left.color.localeCompare(right.color),
    );
}

function inferPrefabEnvelope(blocks) {
    let dx = 0;
    let dy = 0;
    let dz = 0;

    blocks.forEach((block) => {
        const def = getRegisteredBlockDef(block.type);
        const metrics = getBlockMetrics(def, block.rot || 0, block.direction);
        dx = Math.max(dx, block.lx + metrics.dx);
        dy = Math.max(dy, block.ly + metrics.dy);
        dz = Math.max(dz, block.lz + metrics.dz);
    });

    return { dx, dy, dz };
}

function getRecipeStepOrigin(step) {
    if (step.op === "filledRect") return { x: step.x0, y: step.y, z: step.z0 };
    if (step.op === "solid") return { x: step.x0, y: step.y0, z: step.z0 };
    if (step.op === "pillarStack") return { x: step.lx, y: step.y0, z: step.lz };
    if (step.op === "block") return { x: step.lx, y: step.ly, z: step.lz };
    if (step.op === "blocks") {
        const firstBlock = step.blocks[0];
        return firstBlock ? { x: firstBlock.lx, y: firstBlock.ly, z: firstBlock.lz } : { x: 0, y: 0, z: 0 };
    }
    return { x: 0, y: 0, z: 0 };
}

function compareRecipeSteps(left, right) {
    const leftOrigin = getRecipeStepOrigin(left);
    const rightOrigin = getRecipeStepOrigin(right);
    return (
        leftOrigin.y - rightOrigin.y ||
        leftOrigin.z - rightOrigin.z ||
        leftOrigin.x - rightOrigin.x ||
        left.op.localeCompare(right.op)
    );
}

function buildOptimizableBlockLookup(blocks, usedBlockKeys) {
    const lookup = new Map();

    blocks.forEach((block) => {
        const key = getBlockKey(block);
        if (usedBlockKeys.has(key)) return;
        lookup.set(key, block);
    });

    return lookup;
}

function getLookupBlock(lookup, type, color, rot, lx, ly, lz) {
    return lookup.get(getBlockKey({ type, color, rot, lx, ly, lz }));
}

function extractPillarStackRecipeSteps(blocks, usedBlockKeys) {
    const columns = new Map();

    blocks.forEach((block) => {
        if (usedBlockKeys.has(getBlockKey(block))) return;
        if (block.rot !== 0) return;
        if (block.type !== "Pillar" && block.type !== "1x1") return;

        const columnKey = `${block.color}|${block.lx}|${block.lz}`;
        if (!columns.has(columnKey)) columns.set(columnKey, []);
        columns.get(columnKey).push(block);
    });

    const steps = [];
    columns.forEach((columnBlocks) => {
        const sortedColumn = [...columnBlocks].sort((left, right) => left.ly - right.ly);
        const byY = new Map(sortedColumn.map((block) => [block.ly, block]));

        sortedColumn.forEach((block) => {
            const startKey = getBlockKey(block);
            if (usedBlockKeys.has(startKey)) return;

            let cursorY = block.ly;
            let pillarCount = 0;
            let studCount = 0;
            const consumed = [];

            while (true) {
                const pillar = byY.get(cursorY);
                const pillarKey = pillar ? getBlockKey(pillar) : null;
                if (!pillar || pillar.type !== "Pillar" || usedBlockKeys.has(pillarKey)) break;
                consumed.push(pillar);
                pillarCount += 1;
                cursorY += 3;
            }

            while (true) {
                const stud = byY.get(cursorY);
                const studKey = stud ? getBlockKey(stud) : null;
                if (!stud || stud.type !== "1x1" || usedBlockKeys.has(studKey)) break;
                consumed.push(stud);
                studCount += 1;
                cursorY += 1;
            }

            if (consumed.length === 0) return;
            if (pillarCount === 0 && studCount < 2) return;

            consumed.forEach((entry) => usedBlockKeys.add(getBlockKey(entry)));
            steps.push({
                op: "pillarStack",
                lx: block.lx,
                y0: block.ly,
                lz: block.lz,
                height: cursorY - block.ly,
                color: block.color,
            });
        });
    });

    return steps;
}

function getFilledRectColumnPattern(lookup, usedBlockKeys, x, y, z0, color) {
    const patternBlocks = [];
    let cursorZ = z0;

    while (true) {
        const brick24 = getLookupBlock(lookup, "2x4", color, 0, x, y, cursorZ);
        const brick24Key = brick24 ? getBlockKey(brick24) : null;
        if (brick24 && !usedBlockKeys.has(brick24Key)) {
            patternBlocks.push(brick24);
            cursorZ += 4;
            continue;
        }

        const brick22 = getLookupBlock(lookup, "2x2", color, 0, x, y, cursorZ);
        const brick22Key = brick22 ? getBlockKey(brick22) : null;
        if (brick22 && !usedBlockKeys.has(brick22Key)) {
            patternBlocks.push(brick22);
            cursorZ += 2;
        }
        break;
    }

    if (patternBlocks.length === 0) return null;

    return {
        blocks: patternBlocks,
        depth: cursorZ - z0,
        signature: patternBlocks.map((block) => `${block.type}:${block.lz - z0}`).join("|"),
    };
}

function extractFilledRectRecipeSteps(blocks, usedBlockKeys) {
    const candidates = sortBlocks(
        blocks.filter(
            (block) =>
                !usedBlockKeys.has(getBlockKey(block)) &&
                block.rot === 0 &&
                (block.type === "2x2" || block.type === "2x4"),
        ),
    );
    const lookup = buildOptimizableBlockLookup(candidates, usedBlockKeys);
    const steps = [];

    candidates.forEach((anchor) => {
        const anchorKey = getBlockKey(anchor);
        if (usedBlockKeys.has(anchorKey)) return;

        const basePattern = getFilledRectColumnPattern(lookup, usedBlockKeys, anchor.lx, anchor.ly, anchor.lz, anchor.color);
        if (!basePattern || basePattern.depth < 2) return;

        let width = 0;
        const consumed = [];
        for (let x = anchor.lx; ; x += 2) {
            const pattern = getFilledRectColumnPattern(lookup, usedBlockKeys, x, anchor.ly, anchor.lz, anchor.color);
            if (!pattern) break;
            if (pattern.depth !== basePattern.depth || pattern.signature !== basePattern.signature) break;
            consumed.push(...pattern.blocks);
            width += 2;
        }

        if (width < 2) return;

        consumed.forEach((block) => usedBlockKeys.add(getBlockKey(block)));
        steps.push({
            op: "filledRect",
            x0: anchor.lx,
            y: anchor.ly,
            z0: anchor.lz,
            width,
            depth: basePattern.depth,
            color: anchor.color,
        });
    });

    return steps;
}

function getAvailableStudRectBlocks(availableByCell, x0, z0, width, depth) {
    const blocks = [];

    for (let x = x0; x < x0 + width; x++) {
        for (let z = z0; z < z0 + depth; z++) {
            const block = availableByCell.get(`${x},${z}`);
            if (!block) return null;
            blocks.push(block);
        }
    }

    return blocks;
}

function findLargestStudRect(anchor, availableByCell) {
    let maxWidth = 0;
    while (availableByCell.has(`${anchor.lx + maxWidth},${anchor.lz}`)) {
        maxWidth += 1;
    }

    let maxDepth = 0;
    while (availableByCell.has(`${anchor.lx},${anchor.lz + maxDepth}`)) {
        maxDepth += 1;
    }

    let bestRect = null;
    for (let width = 2; width <= maxWidth; width += 2) {
        for (let depth = 2; depth <= maxDepth; depth += 2) {
            const blocks = getAvailableStudRectBlocks(availableByCell, anchor.lx, anchor.lz, width, depth);
            if (!blocks) continue;

            const area = width * depth;
            const bestArea = bestRect ? bestRect.width * bestRect.depth : 0;
            if (area < bestArea) continue;
            if (area === bestArea && bestRect && depth <= bestRect.depth && width <= bestRect.width) continue;

            bestRect = { width, depth, blocks };
        }
    }

    return bestRect;
}

function extractStudFilledRectRecipeSteps(blocks, usedBlockKeys) {
    const groups = new Map();

    blocks.forEach((block) => {
        if (usedBlockKeys.has(getBlockKey(block))) return;
        if (block.type !== "1x1" || block.rot !== 0) return;

        const groupKey = `${block.color}|${block.ly}`;
        if (!groups.has(groupKey)) groups.set(groupKey, []);
        groups.get(groupKey).push(block);
    });

    const steps = [];
    groups.forEach((groupBlocks) => {
        const sortedBlocks = sortBlocks(groupBlocks);
        const availableByCell = new Map(sortedBlocks.map((block) => [`${block.lx},${block.lz}`, block]));

        sortedBlocks.forEach((anchor) => {
            const anchorKey = `${anchor.lx},${anchor.lz}`;
            if (!availableByCell.has(anchorKey)) return;

            const bestRect = findLargestStudRect(anchor, availableByCell);
            if (!bestRect) return;

            bestRect.blocks.forEach((block) => {
                availableByCell.delete(`${block.lx},${block.lz}`);
                usedBlockKeys.add(getBlockKey(block));
            });

            steps.push({
                op: "filledRect",
                x0: anchor.lx,
                y: anchor.ly,
                z0: anchor.lz,
                width: bestRect.width,
                depth: bestRect.depth,
                color: anchor.color,
            });
        });
    });

    return steps;
}

function collapseFilledRectsIntoSolids(steps) {
    const sortedSteps = [...steps].sort(
        (left, right) =>
            left.color.localeCompare(right.color) ||
            left.x0 - right.x0 ||
            left.z0 - right.z0 ||
            left.width - right.width ||
            left.depth - right.depth ||
            left.y - right.y,
    );
    const consumed = new Set();
    const collapsed = [];

    sortedSteps.forEach((step, index) => {
        if (consumed.has(index)) return;

        let height = 1;
        for (let nextIndex = index + 1; nextIndex < sortedSteps.length; nextIndex++) {
            const nextStep = sortedSteps[nextIndex];
            if (consumed.has(nextIndex)) continue;

            const isSameShape =
                nextStep.color === step.color &&
                nextStep.x0 === step.x0 &&
                nextStep.z0 === step.z0 &&
                nextStep.width === step.width &&
                nextStep.depth === step.depth &&
                nextStep.y === step.y + height;

            if (!isSameShape) continue;

            consumed.add(nextIndex);
            height += 1;
        }

        if (height > 1) {
            collapsed.push({
                op: "solid",
                x0: step.x0,
                y0: step.y,
                z0: step.z0,
                width: step.width,
                depth: step.depth,
                height,
                color: step.color,
            });
            return;
        }

        collapsed.push(step);
    });

    return collapsed;
}

function buildOptimizedRecipeFromBlocks(prefabName, blocks) {
    const normalizedBlocks = sortBlocks(blocks.map((block, index) => normalizeBlock(block, index, prefabName)));
    const usedBlockKeys = new Set();
    const recipeSteps = [];

    const filledRectSteps = collapseFilledRectsIntoSolids([
        ...extractFilledRectRecipeSteps(normalizedBlocks, usedBlockKeys),
        ...extractStudFilledRectRecipeSteps(normalizedBlocks, usedBlockKeys),
    ]);
    const pillarSteps = extractPillarStackRecipeSteps(normalizedBlocks, usedBlockKeys);

    recipeSteps.push(...filledRectSteps, ...pillarSteps);

    const leftoverBlocks = normalizedBlocks
        .filter((block) => !usedBlockKeys.has(getBlockKey(block)))
        .map((block) => cloneBlock(block));

    if (leftoverBlocks.length) {
        recipeSteps.push({ op: "blocks", blocks: leftoverBlocks });
    }

    return recipeSteps.sort(compareRecipeSteps);
}

function createStrictPrefabBuilder(prefabName) {
    const builder = createPrefabBuilder();

    return {
        blocks: builder.blocks,
        add(type, color, rot, lx, ly, lz, options = {}) {
            const added = builder.add(type, color, rot, lx, ly, lz, options);
            if (!added) {
                throw new Error(`Prefab ${prefabName} has overlapping or invalid recipe output near ${lx},${ly},${lz}.`);
            }
            return true;
        },
    };
}

function appendBlocksToBuilder(builder, blocks, prefabName) {
    blocks.forEach((block, index) => {
        const normalizedBlock = normalizeBlock(block, index, prefabName);
        builder.add(
            normalizedBlock.type,
            normalizedBlock.color,
            normalizedBlock.rot,
            normalizedBlock.lx,
            normalizedBlock.ly,
            normalizedBlock.lz,
            { direction: normalizedBlock.direction },
        );
    });
}

function normalizeRecipeStep(step, index, prefabName) {
    if (!step || typeof step !== "object" || Array.isArray(step)) {
        throw new TypeError(`Prefab ${prefabName} has an invalid recipe step at index ${index}.`);
    }

    const op = typeof step.op === "string" ? step.op.trim() : "";
    if (!SUPPORTED_PREFAB_JSON_RECIPE_OPS.includes(op)) {
        throw new Error(
            `Prefab ${prefabName} uses unsupported recipe op at index ${index}: ${step.op}. Supported ops: ${SUPPORTED_PREFAB_JSON_RECIPE_OPS.join(", ")}.`,
        );
    }

    if (op === "block") {
        return { op, ...normalizeBlock(step, index, prefabName) };
    }

    if (op === "blocks") {
        if (!Array.isArray(step.blocks) || step.blocks.length === 0) {
            throw new Error(`Prefab ${prefabName} has an empty blocks recipe step at index ${index}.`);
        }
        return {
            op,
            blocks: sortBlocks(step.blocks.map((block, blockIndex) => normalizeBlock(block, blockIndex, prefabName))),
        };
    }

    if (op === "filledRect") {
        return {
            op,
            x0: normalizeInteger(step.x0, `Prefab ${prefabName} recipe[${index}].x0`),
            y: normalizeInteger(step.y, `Prefab ${prefabName} recipe[${index}].y`),
            z0: normalizeInteger(step.z0, `Prefab ${prefabName} recipe[${index}].z0`),
            width: normalizeInteger(step.width, `Prefab ${prefabName} recipe[${index}].width`, { min: 2 }),
            depth: normalizeInteger(step.depth, `Prefab ${prefabName} recipe[${index}].depth`, { min: 2 }),
            color: normalizeColor(step.color, `Prefab ${prefabName} recipe[${index}].color`),
        };
    }

    if (op === "pillarStack") {
        return {
            op,
            lx: normalizeInteger(step.lx, `Prefab ${prefabName} recipe[${index}].lx`),
            y0: normalizeInteger(step.y0, `Prefab ${prefabName} recipe[${index}].y0`),
            lz: normalizeInteger(step.lz, `Prefab ${prefabName} recipe[${index}].lz`),
            height: normalizeInteger(step.height, `Prefab ${prefabName} recipe[${index}].height`, { min: 1 }),
            color: normalizeColor(step.color, `Prefab ${prefabName} recipe[${index}].color`),
        };
    }

    if (op === "solid") {
        return {
            op,
            x0: normalizeInteger(step.x0, `Prefab ${prefabName} recipe[${index}].x0`),
            y0: normalizeInteger(step.y0, `Prefab ${prefabName} recipe[${index}].y0`),
            z0: normalizeInteger(step.z0, `Prefab ${prefabName} recipe[${index}].z0`),
            width: normalizeInteger(step.width, `Prefab ${prefabName} recipe[${index}].width`, { min: 2 }),
            depth: normalizeInteger(step.depth, `Prefab ${prefabName} recipe[${index}].depth`, { min: 2 }),
            height: normalizeInteger(step.height, `Prefab ${prefabName} recipe[${index}].height`, { min: 1 }),
            color: normalizeColor(step.color, `Prefab ${prefabName} recipe[${index}].color`),
        };
    }

    if (op === "ellipseBand") {
        return {
            op,
            center: normalizeEllipseValue(step.center, `Prefab ${prefabName} recipe[${index}].center`),
            outerRadii: normalizeEllipseValue(step.outerRadii, `Prefab ${prefabName} recipe[${index}].outerRadii`, {
                positive: true,
            }),
            inner:
                step.inner == null ? undefined : normalizeEllipseValue(step.inner, `Prefab ${prefabName} recipe[${index}].inner`, { positive: true }),
            y: normalizeInteger(step.y ?? 0, `Prefab ${prefabName} recipe[${index}].y`),
            color: normalizeColor(step.color, `Prefab ${prefabName} recipe[${index}].color`),
            type: step.type == null ? "2x2" : String(step.type),
            rot: ((normalizeInteger(step.rot ?? 0, `Prefab ${prefabName} recipe[${index}].rot`, { allowNegative: true, min: -Infinity }) % 4) + 4) % 4,
            stepX:
                step.stepX == null
                    ? undefined
                    : normalizeInteger(step.stepX, `Prefab ${prefabName} recipe[${index}].stepX`, { min: 1 }),
            stepZ:
                step.stepZ == null
                    ? undefined
                    : normalizeInteger(step.stepZ, `Prefab ${prefabName} recipe[${index}].stepZ`, { min: 1 }),
        };
    }

    return {
        op,
        type: String(step.type),
        color: normalizeColor(step.color, `Prefab ${prefabName} recipe[${index}].color`),
        center: normalizeEllipseValue(step.center, `Prefab ${prefabName} recipe[${index}].center`),
        radii: normalizeEllipseValue(step.radii, `Prefab ${prefabName} recipe[${index}].radii`, { positive: true }),
        y: normalizeInteger(step.y ?? 0, `Prefab ${prefabName} recipe[${index}].y`),
        count: normalizeInteger(step.count, `Prefab ${prefabName} recipe[${index}].count`, { min: 1 }),
        offset: normalizeFiniteNumber(step.offset ?? 0, `Prefab ${prefabName} recipe[${index}].offset`),
        rot: ((normalizeInteger(step.rot ?? 0, `Prefab ${prefabName} recipe[${index}].rot`, { allowNegative: true, min: -Infinity }) % 4) + 4) % 4,
        dedupe: step.dedupe == null ? true : Boolean(step.dedupe),
    };
}

function applyRecipeStep(builder, step, prefabName) {
    if (step.op === "block") {
        builder.add(step.type, step.color, step.rot, step.lx, step.ly, step.lz, { direction: step.direction });
        return;
    }

    if (step.op === "blocks") {
        appendBlocksToBuilder(builder, step.blocks, prefabName);
        return;
    }

    if (step.op === "filledRect") {
        addFilledRectSafe(builder, step.x0, step.y, step.z0, step.width, step.depth, step.color);
        return;
    }

    if (step.op === "pillarStack") {
        addPillarStackSafe(builder, step.lx, step.y0, step.lz, step.height, step.color);
        return;
    }

    if (step.op === "solid") {
        const blocks = [];
        addSolid(blocks, step.x0, step.y0, step.z0, step.width, step.depth, [step.height, step.color]);
        appendBlocksToBuilder(builder, blocks, prefabName);
        return;
    }

    if (step.op === "ellipseBand") {
        addEllipseBandSafe(builder, step.center, step.outerRadii, {
            inner: step.inner,
            y: step.y,
            color: step.color,
            type: step.type,
            rot: step.rot,
            stepX: step.stepX,
            stepZ: step.stepZ,
        });
        return;
    }

    addEllipseOfBlocksSafe(builder, step.type, step.color, step.center, step.radii, {
        y: step.y,
        count: step.count,
        offset: step.offset,
        rotFn: step.rot,
        dedupe: step.dedupe,
    });
}

function buildBlocksFromRecipe(recipe, prefabName) {
    if (!Array.isArray(recipe) || recipe.length === 0) {
        throw new Error(`Prefab ${prefabName} must provide a non-empty recipe.`);
    }

    const builder = createStrictPrefabBuilder(prefabName);
    const normalizedRecipe = recipe.map((step, index) => normalizeRecipeStep(step, index, prefabName));

    normalizedRecipe.forEach((step, index) => {
        const beforeCount = builder.blocks.length;
        applyRecipeStep(builder, step, prefabName);
        if (builder.blocks.length === beforeCount) {
            throw new Error(`Prefab ${prefabName} recipe step ${index} produced no blocks.`);
        }
    });

    return {
        blocks: sortBlocks(builder.blocks.map((block) => cloneBlock(block))),
        recipe: normalizedRecipe,
    };
}

function buildBlocksFromList(blocks, prefabName) {
    if (!Array.isArray(blocks) || blocks.length === 0) {
        throw new Error(`Prefab ${prefabName} must provide a non-empty blocks array.`);
    }

    return {
        blocks: sortBlocks(blocks.map((block, index) => normalizeBlock(block, index, prefabName))),
    };
}

function rotatePrefabBlock(prefab, block, pRot) {
    const def = getRegisteredBlockDef(block.type);
    if (!def) return null;

    const baseRot = block.rot || 0;
    const isShapeBlock = def.customGeo?.startsWith("shape:");
    const baseMetrics = getBlockMetrics(def, baseRot, block.direction);
    const baseDx = baseMetrics.dx;
    const baseDz = baseMetrics.dz;
    const relX = block.lx + baseDx / 2 - prefab.dx / 2;
    const relZ = block.lz + baseDz / 2 - prefab.dz / 2;

    let rotX = relX;
    let rotZ = relZ;
    if (pRot === 1) {
        rotX = -relZ;
        rotZ = relX;
    } else if (pRot === 2) {
        rotX = -relX;
        rotZ = -relZ;
    } else if (pRot === 3) {
        rotX = relZ;
        rotZ = -relX;
    }

    const rotatedPrefabDx = pRot % 2 === 1 ? prefab.dz : prefab.dx;
    const rotatedPrefabDz = pRot % 2 === 1 ? prefab.dx : prefab.dz;
    const finalOrientation = isShapeBlock
        ? rotateShapeOrientationAroundY(block.direction, baseRot, pRot)
        : { direction: undefined, rot: (baseRot + pRot) % 4 };
    const finalRot = finalOrientation.rot;
    const finalMetrics = getBlockMetrics(def, finalRot, finalOrientation.direction);
    const finalDx = finalMetrics.dx;
    const finalDy = finalMetrics.dy;
    const finalDz = finalMetrics.dz;

    const rotatedBlock = {
        type: block.type,
        color: block.color,
        rot: finalRot,
        lx: Math.round(rotatedPrefabDx / 2 + rotX - finalDx / 2),
        ly: block.ly,
        lz: Math.round(rotatedPrefabDz / 2 + rotZ - finalDz / 2),
        dx: finalDx,
        dy: finalDy,
        dz: finalDz,
    };

    if (finalOrientation.direction != null) {
        rotatedBlock.direction = finalOrientation.direction;
    }

    return rotatedBlock;
}

function markPrefabComponent(startCell, componentId, occupiedSet, componentByKey) {
    const queue = [startCell];
    componentByKey.set(getPrefabOffsetKey(startCell.x, startCell.y, startCell.z), componentId);

    while (queue.length) {
        const current = queue.pop();
        for (const [dx, dy, dz] of PREFAB_NEIGHBOR_OFFSETS) {
            const nextX = current.x + dx;
            const nextY = current.y + dy;
            const nextZ = current.z + dz;
            const nextKey = getPrefabOffsetKey(nextX, nextY, nextZ);
            if (!occupiedSet.has(nextKey) || componentByKey.has(nextKey)) continue;
            componentByKey.set(nextKey, componentId);
            queue.push({ x: nextX, y: nextY, z: nextZ });
        }
    }
}

function collectSupportOffsets(occupied, occupiedSet, componentByKey) {
    return occupied
        .filter((cell) => cell.y === 0 || !occupiedSet.has(getPrefabOffsetKey(cell.x, cell.y - 1, cell.z)))
        .map((cell) => ({
            x: cell.x,
            y: cell.y,
            z: cell.z,
            component: componentByKey.get(getPrefabOffsetKey(cell.x, cell.y, cell.z)),
        }));
}

function sortPrefabOffsets(offsets) {
    return [...offsets].sort((left, right) => left.z - right.z || left.x - right.x || left.y - right.y);
}

function getGroundComponentCount(supportOffsets) {
    const groundedComponents = new Set();

    supportOffsets.forEach((cell) => {
        if (cell.y === 0) groundedComponents.add(cell.component);
    });

    return groundedComponents.size;
}

function getSupportBelowRange(supportOffsets) {
    if (supportOffsets.length === 0) {
        return { min: 0, max: -1 };
    }

    let min = Infinity;
    let max = -Infinity;
    supportOffsets.forEach((cell) => {
        const belowY = cell.y - 1;
        if (belowY < min) min = belowY;
        if (belowY > max) max = belowY;
    });

    return { min, max };
}

function buildPrefabRotationMeta(prefab, pRot) {
    const rotatedDx = pRot % 2 === 1 ? prefab.dz : prefab.dx;
    const rotatedDz = pRot % 2 === 1 ? prefab.dx : prefab.dz;
    const blocks = [];
    const occupied = [];
    const occupiedSet = new Set();

    prefab.blocks.forEach((block) => {
        const rotatedBlock = rotatePrefabBlock(prefab, block, pRot);
        if (!rotatedBlock) return;

        blocks.push(rotatedBlock);
        for (let x = 0; x < rotatedBlock.dx; x++) {
            for (let y = 0; y < rotatedBlock.dy; y++) {
                for (let z = 0; z < rotatedBlock.dz; z++) {
                    const offset = {
                        x: rotatedBlock.lx + x,
                        y: rotatedBlock.ly + y,
                        z: rotatedBlock.lz + z,
                    };
                    occupied.push(offset);
                    occupiedSet.add(getPrefabOffsetKey(offset.x, offset.y, offset.z));
                }
            }
        }
    });

    const componentByKey = new Map();
    let componentCount = 0;

    occupied.forEach((cell) => {
        const startKey = getPrefabOffsetKey(cell.x, cell.y, cell.z);
        if (componentByKey.has(startKey)) return;

        markPrefabComponent(cell, componentCount, occupiedSet, componentByKey);
        componentCount += 1;
    });

    const supportOffsets = collectSupportOffsets(occupied, occupiedSet, componentByKey);
    const supportBelowRange = getSupportBelowRange(supportOffsets);

    return {
        dx: rotatedDx,
        dy: prefab.dy,
        dz: rotatedDz,
        blocks,
        occupied,
        occupiedSorted: sortPrefabOffsets(occupied),
        supportOffsets,
        supportOffsetsSorted: sortPrefabOffsets(supportOffsets),
        groundComponentCount: getGroundComponentCount(supportOffsets),
        supportBelowMinY: supportBelowRange.min,
        supportBelowMaxY: supportBelowRange.max,
        componentCount,
    };
}

function attachPrefabMeta(prefab) {
    prefab.meta = {
        rotations: [0, 1, 2, 3].map((pRot) => buildPrefabRotationMeta(prefab, pRot)),
    };
    return prefab;
}

function validatePrefab(name, prefab) {
    if (!prefab || typeof prefab !== "object") {
        throw new TypeError(`Prefab ${name} is not an object.`);
    }

    if (!Number.isInteger(prefab.dx) || !Number.isInteger(prefab.dy) || !Number.isInteger(prefab.dz)) {
        throw new TypeError(`Prefab ${name} has invalid dimensions.`);
    }

    if (prefab.dx <= 0 || prefab.dy <= 0 || prefab.dz <= 0) {
        throw new RangeError(`Prefab ${name} must have positive dimensions.`);
    }

    if (!Array.isArray(prefab.blocks) || prefab.blocks.length === 0) {
        throw new TypeError(`Prefab ${name} must expose a non-empty blocks array.`);
    }

    prefab.blocks.forEach((rawBlock, index) => {
        const block = normalizeBlock(rawBlock, index, name);
        const def = getRegisteredBlockDef(block.type);
        const { dx, dy, dz } = getBlockMetrics(def, block.rot, block.direction);

        if (block.lx + dx > prefab.dx || block.ly + dy > prefab.dy || block.lz + dz > prefab.dz) {
            throw new Error(`Prefab ${name} has a block outside declared bounds at index ${index}.`);
        }
    });
}

function parsePrefabJson(input, { fallbackName = "ImportedPrefab" } = {}) {
    let raw;

    if (typeof input === "string") {
        try {
            raw = JSON.parse(input);
        } catch (error) {
            throw new Error(`Invalid JSON: ${error.message}`);
        }
    } else {
        raw = input;
    }

    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        throw new TypeError("Prefab JSON must be an object.");
    }

    const name = normalizePrefabName(raw.name, fallbackName);
    const kind = raw.kind == null ? PREFAB_JSON_KIND : String(raw.kind);
    if (kind !== PREFAB_JSON_KIND) {
        throw new Error(`Prefab ${name} uses unsupported kind: ${kind}.`);
    }

    const version = raw.version == null ? PREFAB_JSON_VERSION : normalizeInteger(raw.version, `Prefab ${name} version`, { min: 1 });
    if (version !== PREFAB_JSON_VERSION) {
        throw new Error(`Prefab ${name} uses unsupported version ${version}.`);
    }

    const rawRecipe = Array.isArray(raw.recipe) ? raw.recipe : Array.isArray(raw.instructions) ? raw.instructions : null;
    const compiled = rawRecipe?.length ? buildBlocksFromRecipe(rawRecipe, name) : buildBlocksFromList(raw.blocks, name);
    const inferredEnvelope = inferPrefabEnvelope(compiled.blocks);

    const prefab = {
        dx: normalizeInteger(raw.dx ?? inferredEnvelope.dx, `Prefab ${name} dx`, { min: 1 }),
        dy: normalizeInteger(raw.dy ?? inferredEnvelope.dy, `Prefab ${name} dy`, { min: 1 }),
        dz: normalizeInteger(raw.dz ?? inferredEnvelope.dz, `Prefab ${name} dz`, { min: 1 }),
        blocks: compiled.blocks.map((block) => cloneBlock(block)),
    };

    validatePrefab(name, prefab);
    attachPrefabMeta(prefab);

    const source = compiled.recipe
        ? {
              version: PREFAB_JSON_VERSION,
              kind: PREFAB_JSON_KIND,
              name,
              dx: prefab.dx,
              dy: prefab.dy,
              dz: prefab.dz,
              recipe: compiled.recipe,
          }
        : {
              version: PREFAB_JSON_VERSION,
              kind: PREFAB_JSON_KIND,
              name,
              dx: prefab.dx,
              dy: prefab.dy,
              dz: prefab.dz,
              blocks: prefab.blocks.map((block) => cloneBlock(block)),
          };

    return { name, prefab, source };
}

function buildSerializablePrefabSource(name, prefab, source = null) {
    validatePrefab(name, prefab);

    const base = {
        version: PREFAB_JSON_VERSION,
        kind: PREFAB_JSON_KIND,
        name: normalizePrefabName(name, "Prefab"),
        dx: prefab.dx,
        dy: prefab.dy,
        dz: prefab.dz,
    };

    if (source?.recipe?.length) {
        return {
            ...base,
            recipe: source.recipe.map((step, index) => normalizeRecipeStep(step, index, base.name)),
        };
    }

    const sourceBlocks = source?.blocks?.length
        ? source.blocks.map((block, index) => normalizeBlock(block, index, base.name))
        : prefab.blocks.map((block, index) => normalizeBlock(block, index, base.name));
    const optimizedRecipe = buildOptimizedRecipeFromBlocks(base.name, sourceBlocks);

    if (optimizedRecipe.length > 0 && !(optimizedRecipe.length === 1 && optimizedRecipe[0].op === "blocks")) {
        return {
            ...base,
            recipe: optimizedRecipe.map((step, index) => normalizeRecipeStep(step, index, base.name)),
        };
    }

    return {
        ...base,
        blocks: sortBlocks(sourceBlocks).map((block) => cloneBlock(block)),
    };
}

function buildPrefabExport(name, blocks, dimensions = {}) {
    const normalizedName = normalizePrefabName(name, "EstruturaCustom");
    const normalizedBlocks = sortBlocks(blocks.map((block, index) => normalizeBlock(block, index, normalizedName)));
    const inferredEnvelope = inferPrefabEnvelope(normalizedBlocks);
    const prefab = {
        dx: normalizeInteger(dimensions.dx ?? inferredEnvelope.dx, `Prefab ${normalizedName} dx`, { min: 1 }),
        dy: normalizeInteger(dimensions.dy ?? inferredEnvelope.dy, `Prefab ${normalizedName} dy`, { min: 1 }),
        dz: normalizeInteger(dimensions.dz ?? inferredEnvelope.dz, `Prefab ${normalizedName} dz`, { min: 1 }),
        blocks: normalizedBlocks.map((block) => cloneBlock(block)),
    };

    validatePrefab(normalizedName, prefab);
    attachPrefabMeta(prefab);

    const source = buildSerializablePrefabSource(normalizedName, prefab);

    return {
        name: normalizedName,
        prefab,
        source,
        json: JSON.stringify(source, null, 2),
    };
}

function serializePrefabJson(name, prefab, source = null) {
    return JSON.stringify(buildSerializablePrefabSource(name, prefab, source), null, 2);
}

function resolveRuntimePrefabName(preferredName, builtinNames, runtimeNames, hasPrefabName) {
    const normalizedPreferredName = normalizePrefabName(preferredName, "ImportedPrefab");

    if (!hasPrefabName(normalizedPreferredName)) {
        return normalizedPreferredName;
    }

    if (runtimeNames.has(normalizedPreferredName)) {
        return normalizedPreferredName;
    }

    const builtinAlias = builtinNames.has(normalizedPreferredName) ? `${normalizedPreferredName} JSON` : normalizedPreferredName;
    if (!hasPrefabName(builtinAlias) || runtimeNames.has(builtinAlias)) {
        return builtinAlias;
    }

    let suffix = 2;
    let candidate = `${builtinAlias} ${suffix}`;
    while (hasPrefabName(candidate) && !runtimeNames.has(candidate)) {
        suffix += 1;
        candidate = `${builtinAlias} ${suffix}`;
    }

    return candidate;
}

export {
    PREFAB_JSON_KIND,
    PREFAB_JSON_VERSION,
    SUPPORTED_PREFAB_JSON_RECIPE_OPS,
    attachPrefabMeta,
    buildPrefabExport,
    buildPrefabRotationMeta,
    buildSerializablePrefabSource,
    normalizePrefabName,
    parsePrefabJson,
    resolveRuntimePrefabName,
    rotatePrefabBlock,
    serializePrefabJson,
    validatePrefab,
};