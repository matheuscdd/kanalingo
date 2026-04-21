import { BLOCKS } from "./blocks.js";
import { getBlockMetrics } from "./core.js";
import { buildPrefabExport } from "./prefabCodec.js";
import { ensureDynamicShapeBlockType } from "./builderTools.js";

const WORLD_STRUCTURE_NEIGHBOR_OFFSETS = [];
for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
            if (dx === 0 && dy === 0 && dz === 0) continue;
            WORLD_STRUCTURE_NEIGHBOR_OFFSETS.push({ dx, dy, dz });
        }
    }
}

function getWorldCellKey(x, y, z) {
    return `${x},${y},${z}`;
}

function sortWorldBlocks(blocks) {
    return [...blocks].sort(
        (left, right) => left.cy - right.cy || left.cz - right.cz || left.cx - right.cx || left.type.localeCompare(right.type),
    );
}

function getWorldBlockMetrics(block) {
    const def = block?.def || BLOCKS[block?.type] || ensureDynamicShapeBlockType(block?.type);
    if (!def) {
        throw new Error(`Unknown world block type: ${block?.type}`);
    }

    if (Number.isInteger(block?.dx) && Number.isInteger(block?.dz)) {
        return {
            def,
            dx: block.dx,
            dy: def.sy,
            dz: block.dz,
        };
    }

    return {
        def,
        ...getBlockMetrics(def, block?.rot || 0, block?.direction),
    };
}

function getBuildAreaBounds(size) {
    const normalizedSize = Number(size);
    if (!Number.isFinite(normalizedSize) || normalizedSize <= 0) {
        throw new RangeError(`Build area size must be a positive number. Received: ${size}`);
    }

    const half = normalizedSize / 2;
    return {
        minX: -half,
        maxX: half,
        minZ: -half,
        maxZ: half,
    };
}

function doesBlockOverlapBuildArea(block, area) {
    const { dx, dz } = getWorldBlockMetrics(block);
    return block.cx < area.maxX && block.cx + dx > area.minX && block.cz < area.maxZ && block.cz + dz > area.minZ;
}

function isBlockInsideBuildArea(block, area) {
    const { dx, dz } = getWorldBlockMetrics(block);
    return block.cx >= area.minX && block.cz >= area.minZ && block.cx + dx <= area.maxX && block.cz + dz <= area.maxZ;
}

function enqueueWorldBlockCells(block, queue, visitedCells) {
    const { dx, dy, dz } = getWorldBlockMetrics(block);

    for (let x = 0; x < dx; x++) {
        for (let y = 0; y < dy; y++) {
            for (let z = 0; z < dz; z++) {
                const wx = block.cx + x;
                const wy = block.cy + y;
                const wz = block.cz + z;
                const cellKey = getWorldCellKey(wx, wy, wz);
                if (visitedCells.has(cellKey)) continue;
                visitedCells.add(cellKey);
                queue.push({ x: wx, y: wy, z: wz });
            }
        }
    }
}

function createWorldBlockState(worldBlocks) {
    const blockById = new Map();
    const voxelToBlockId = new Map();

    worldBlocks.forEach((block) => {
        blockById.set(block.id, block);

        const { dx, dy, dz } = getWorldBlockMetrics(block);
        for (let x = 0; x < dx; x++) {
            for (let y = 0; y < dy; y++) {
                for (let z = 0; z < dz; z++) {
                    voxelToBlockId.set(getWorldCellKey(block.cx + x, block.cy + y, block.cz + z), block.id);
                }
            }
        }
    });

    return { blockById, voxelToBlockId };
}

function collectConnectedWorldBlocksFromState(state, seedBlockId) {
    const seedBlock = state.blockById.get(seedBlockId);
    if (!seedBlock) return [];

    const connectedBlocks = new Map([[seedBlock.id, seedBlock]]);
    const visitedCells = new Set();
    const queue = [];
    enqueueWorldBlockCells(seedBlock, queue, visitedCells);

    while (queue.length) {
        const cell = queue.pop();
        for (const offset of WORLD_STRUCTURE_NEIGHBOR_OFFSETS) {
            const neighborBlockId = state.voxelToBlockId.get(getWorldCellKey(cell.x + offset.dx, cell.y + offset.dy, cell.z + offset.dz));
            if (!neighborBlockId || connectedBlocks.has(neighborBlockId)) continue;

            const neighborBlock = state.blockById.get(neighborBlockId);
            if (!neighborBlock) continue;

            connectedBlocks.set(neighborBlock.id, neighborBlock);
            enqueueWorldBlockCells(neighborBlock, queue, visitedCells);
        }
    }

    return sortWorldBlocks([...connectedBlocks.values()]);
}

function collectConnectedWorldBlocks(worldBlocks, seedBlockId) {
    return collectConnectedWorldBlocksFromState(createWorldBlockState(worldBlocks), seedBlockId);
}

function buildLocalPrefabFromWorldBlocks(worldBlocks) {
    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;

    worldBlocks.forEach((block) => {
        const { dx, dy, dz } = getWorldBlockMetrics(block);
        minX = Math.min(minX, block.cx);
        minY = Math.min(minY, block.cy);
        minZ = Math.min(minZ, block.cz);
        maxX = Math.max(maxX, block.cx + dx);
        maxY = Math.max(maxY, block.cy + dy);
        maxZ = Math.max(maxZ, block.cz + dz);
    });

    const sortedBlocks = sortWorldBlocks(worldBlocks);
    return {
        dx: maxX - minX,
        dy: maxY - minY,
        dz: maxZ - minZ,
        blocks: sortedBlocks.map((block) => ({
            type: block.type,
            color: block.color,
            rot: block.rot,
            lx: block.cx - minX,
            ly: block.cy - minY,
            lz: block.cz - minZ,
            ...(block.direction != null ? { direction: block.direction } : {}),
        })),
    };
}

function analyzeBuildAreaStructure(worldBlocks, buildAreaSize) {
    const area = typeof buildAreaSize === "number" ? getBuildAreaBounds(buildAreaSize) : buildAreaSize;
    const areaBlocks = sortWorldBlocks(worldBlocks.filter((block) => doesBlockOverlapBuildArea(block, area)));

    if (areaBlocks.length === 0) {
        return {
            status: "empty",
            area,
            areaBlocks,
        };
    }

    const boundaryBlocks = areaBlocks.filter((block) => !isBlockInsideBuildArea(block, area));
    if (boundaryBlocks.length > 0) {
        return {
            status: "outside",
            area,
            areaBlocks,
            boundaryBlocks: sortWorldBlocks(boundaryBlocks),
        };
    }

    const state = createWorldBlockState(worldBlocks);
    const areaBlockIds = new Set(areaBlocks.map((block) => block.id));
    const pendingAreaIds = new Set(areaBlockIds);
    const components = [];

    while (pendingAreaIds.size > 0) {
        const seedBlockId = pendingAreaIds.values().next().value;
        const connectedBlocks = collectConnectedWorldBlocksFromState(state, seedBlockId);
        const componentAreaBlocks = connectedBlocks.filter((block) => areaBlockIds.has(block.id));
        componentAreaBlocks.forEach((block) => pendingAreaIds.delete(block.id));

        components.push({
            blocks: connectedBlocks,
            areaBlocks: sortWorldBlocks(componentAreaBlocks),
            crossesBoundary: connectedBlocks.some((block) => !isBlockInsideBuildArea(block, area)),
        });
    }

    const crossingComponent = components.find((component) => component.crossesBoundary);
    if (crossingComponent) {
        return {
            status: "outside",
            area,
            areaBlocks,
            connectedBlocks: crossingComponent.blocks,
            boundaryBlocks: sortWorldBlocks(crossingComponent.blocks.filter((block) => !isBlockInsideBuildArea(block, area))),
        };
    }

    if (components.length !== 1) {
        return {
            status: "disconnected",
            area,
            areaBlocks,
            components: components.map((component) => component.areaBlocks),
        };
    }

    const connectedBlocks = components[0].blocks;
    return {
        status: "ok",
        area,
        areaBlocks,
        connectedBlocks,
        localPrefab: buildLocalPrefabFromWorldBlocks(connectedBlocks),
    };
}

function buildAreaStructureExport(name, worldBlocks, buildAreaSize) {
    const analysis = analyzeBuildAreaStructure(worldBlocks, buildAreaSize);
    if (analysis.status !== "ok") {
        return analysis;
    }

    return {
        ...analysis,
        exported: buildPrefabExport(name, analysis.localPrefab.blocks, analysis.localPrefab),
    };
}

export {
    analyzeBuildAreaStructure,
    buildAreaStructureExport,
    buildLocalPrefabFromWorldBlocks,
    collectConnectedWorldBlocks,
    doesBlockOverlapBuildArea,
    getBuildAreaBounds,
    isBlockInsideBuildArea,
};