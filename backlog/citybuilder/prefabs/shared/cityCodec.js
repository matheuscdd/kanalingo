const CITY_JSON_VERSION = 1;
const CITY_JSON_KIND = "city";

function normalizeCityName(name, fallbackName = "Cidade") {
    if (typeof name !== "string") return fallbackName;
    const normalized = name.trim().replace(/\s+/g, " ");
    return normalized || fallbackName;
}

function normalizeCityInteger(value, label, { allowNegative = false, min = 0 } = {}) {
    const normalized = Number(value);
    if (!Number.isInteger(normalized)) {
        throw new TypeError(`${label} must be an integer.`);
    }
    if (!allowNegative && normalized < min) {
        throw new RangeError(`${label} must be greater than or equal to ${min}.`);
    }
    if (!allowNegative && normalized < 0) {
        throw new RangeError(`${label} must be greater than or equal to 0.`);
    }
    return normalized;
}

function normalizeCityPlacement(placement, index, cityName = "Cidade") {
    if (!placement || typeof placement !== "object" || Array.isArray(placement)) {
        throw new TypeError(`City ${cityName} has an invalid placement at index ${index}.`);
    }

    const type = typeof placement.type === "string" ? placement.type.trim() : "";
    if (!type) {
        throw new Error(`City ${cityName} is missing placement[${index}].type.`);
    }

    const rot = placement.rot == null ? 0 : normalizeCityInteger(placement.rot, `City ${cityName} placement[${index}].rot`, {
        allowNegative: true,
        min: -Infinity,
    });

    return {
        type,
        x: normalizeCityInteger(placement.x, `City ${cityName} placement[${index}].x`, { allowNegative: true, min: -Infinity }),
        z: normalizeCityInteger(placement.z, `City ${cityName} placement[${index}].z`, { allowNegative: true, min: -Infinity }),
        rot: ((rot % 4) + 4) % 4,
    };
}

function sortCityPlacements(placements) {
    return [...placements].sort(
        (left, right) => left.z - right.z || left.x - right.x || left.type.localeCompare(right.type) || left.rot - right.rot,
    );
}

function buildSerializableCitySource(name, placements) {
    const normalizedName = normalizeCityName(name, "Cidade");
    if (!Array.isArray(placements) || placements.length === 0) {
        throw new Error(`City ${normalizedName} must provide at least one placement.`);
    }

    const normalizedPlacements = sortCityPlacements(
        placements.map((placement, index) => normalizeCityPlacement(placement, index, normalizedName)),
    );

    return {
        version: CITY_JSON_VERSION,
        kind: CITY_JSON_KIND,
        name: normalizedName,
        placements: normalizedPlacements,
    };
}

function serializeCityJson(name, placements) {
    return JSON.stringify(buildSerializableCitySource(name, placements), null, 2);
}

function parseCityJson(input, { fallbackName = "Cidade" } = {}) {
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
        throw new TypeError("City JSON must be an object.");
    }

    const name = normalizeCityName(raw.name, fallbackName);
    const kind = raw.kind == null ? CITY_JSON_KIND : String(raw.kind);
    if (kind !== CITY_JSON_KIND) {
        throw new Error(`City ${name} uses unsupported kind: ${kind}.`);
    }

    const version =
        raw.version == null ? CITY_JSON_VERSION : normalizeCityInteger(raw.version, `City ${name} version`, { min: 1 });
    if (version !== CITY_JSON_VERSION) {
        throw new Error(`City ${name} uses unsupported version ${version}.`);
    }

    if (!Array.isArray(raw.placements) || raw.placements.length === 0) {
        throw new Error(`City ${name} must provide a non-empty placements array.`);
    }

    const placements = sortCityPlacements(
        raw.placements.map((placement, index) => normalizeCityPlacement(placement, index, name)),
    );

    return {
        name,
        placements,
        source: {
            version: CITY_JSON_VERSION,
            kind: CITY_JSON_KIND,
            name,
            placements,
        },
    };
}

function getCityVoxelKey(x, y, z) {
    return `${x},${y},${z}`;
}

function getCityBlockKey(block) {
    return `${block.type}|${block.color}|${block.rot || 0}|${block.cx}|${block.cy}|${block.cz}`;
}

function getCityBlockSignature(block) {
    return `${block.type}|${block.color}|${block.rot || 0}`;
}

function getPlacementExpectedBlocks(placement, prefabs, cityName = "Cidade") {
    const prefab = prefabs?.[placement.type];
    if (!prefab) {
        throw new Error(`City ${cityName} references unknown structure type: ${placement.type}.`);
    }

    const rotation = prefab.meta?.rotations?.[placement.rot];
    if (!rotation) {
        throw new Error(`City ${cityName} cannot resolve rotation ${placement.rot} for structure ${placement.type}.`);
    }

    return rotation.blocks.map((block) => ({
        type: block.type,
        color: block.color,
        rot: block.rot || 0,
        cx: placement.x + block.lx,
        cy: block.ly,
        cz: placement.z + block.lz,
    }));
}

function getRotationBlocksForPlacement(type, rot, prefabs, cityName = "Cidade") {
    const prefab = prefabs?.[type];
    if (!prefab) {
        throw new Error(`City ${cityName} references unknown structure type: ${type}.`);
    }

    const rotation = prefab.meta?.rotations?.[rot];
    if (!rotation) {
        throw new Error(`City ${cityName} cannot resolve rotation ${rot} for structure ${type}.`);
    }

    return rotation.blocks;
}

function resolveSnapshotPlacementFromBlocks(type, rot, actualBlocks, prefabs, cityName = "Cidade") {
    const rotationBlocks = getRotationBlocksForPlacement(type, rot, prefabs, cityName);
    if (actualBlocks.length !== rotationBlocks.length) {
        throw new Error(`A estrutura ${type} foi alterada manualmente e nao corresponde mais ao prefab original.`);
    }

    const actualByKey = new Set(actualBlocks.map((block) => getCityBlockKey(block)));
    const signatureCounts = new Map();
    rotationBlocks.forEach((block) => {
        const signature = getCityBlockSignature(block);
        signatureCounts.set(signature, (signatureCounts.get(signature) ?? 0) + 1);
    });

    const anchorActual = [...actualBlocks].sort((left, right) => {
        const signatureDelta = (signatureCounts.get(getCityBlockSignature(left)) ?? Infinity) - (signatureCounts.get(getCityBlockSignature(right)) ?? Infinity);
        if (signatureDelta !== 0) return signatureDelta;
        return left.cy - right.cy || left.cz - right.cz || left.cx - right.cx;
    })[0];

    const matchingExpectedBlocks = rotationBlocks.filter(
        (block) =>
            block.type === anchorActual.type &&
            block.color === anchorActual.color &&
            (block.rot || 0) === (anchorActual.rot || 0),
    );

    for (const expectedBlock of matchingExpectedBlocks) {
        const offsetX = anchorActual.cx - expectedBlock.lx;
        const offsetY = anchorActual.cy - expectedBlock.ly;
        const offsetZ = anchorActual.cz - expectedBlock.lz;
        if (offsetY !== 0) continue;

        const matchesExpected = rotationBlocks.every((block) =>
            actualByKey.has(
                getCityBlockKey({
                    type: block.type,
                    color: block.color,
                    rot: block.rot || 0,
                    cx: offsetX + block.lx,
                    cy: offsetY + block.ly,
                    cz: offsetZ + block.lz,
                }),
            ),
        );

        if (matchesExpected) {
            return { type, x: offsetX, z: offsetZ, rot };
        }
    }

    throw new Error(`A estrutura ${type} foi alterada manualmente e nao corresponde mais ao prefab original.`);
}

function validateCityPlacements(placements, prefabs, { gridSize = null, cityName = "Cidade" } = {}) {
    const normalizedPlacements = sortCityPlacements(
        placements.map((placement, index) => normalizeCityPlacement(placement, index, cityName)),
    );
    const occupiedCells = new Set();
    const half = Number.isFinite(gridSize) ? gridSize / 2 : null;

    normalizedPlacements.forEach((placement, index) => {
        const prefab = prefabs?.[placement.type];
        if (!prefab) {
            throw new Error(`City ${cityName} references unknown structure type at placement ${index}: ${placement.type}.`);
        }

        const rotation = prefab.meta?.rotations?.[placement.rot];
        if (!rotation) {
            throw new Error(`City ${cityName} uses invalid rotation for structure ${placement.type} at placement ${index}.`);
        }

        if (half != null) {
            if (
                placement.x < -half ||
                placement.z < -half ||
                placement.x + rotation.dx > half ||
                placement.z + rotation.dz > half
            ) {
                throw new Error(`City ${cityName} places ${placement.type} outside the world bounds at placement ${index}.`);
            }
        }

        for (const cell of rotation.occupiedSorted || rotation.occupied) {
            const key = getCityVoxelKey(placement.x + cell.x, cell.y, placement.z + cell.z);
            if (occupiedCells.has(key)) {
                throw new Error(`City ${cityName} has overlapping structures near placement ${index} (${placement.type}).`);
            }
            occupiedCells.add(key);
        }
    });

    return normalizedPlacements;
}

function validateCitySnapshotGroup(group, prefabs, cityName = "Cidade") {
    const groupLabel = group?.placement?.type || group?.groupId || "grupo";
    const placementSource = group?.placement;
    if (!placementSource) {
        throw new Error(
            `A cidade contem blocos soltos ou um grupo sem estrutura registrada (${groupLabel}). Salve apenas estruturas para exportar a cidade.`,
        );
    }
    if (placementSource.y != null && placementSource.y !== 0) {
        throw new Error(`A estrutura ${groupLabel} nao esta colada na plataforma e nao pode entrar no JSON da cidade.`);
    }

    const type = typeof placementSource.type === "string" ? placementSource.type.trim() : "";
    if (!type) {
        throw new Error(`A estrutura ${groupLabel} nao possui um tipo valido para exportar a cidade.`);
    }

    const rawRot = placementSource.rot == null ? 0 : normalizeCityInteger(placementSource.rot, `City ${cityName} placement.rot`, {
        allowNegative: true,
        min: -Infinity,
    });
    const rot = ((rawRot % 4) + 4) % 4;
    const actualBlocks = Array.isArray(group?.blocks) ? group.blocks : [];
    if (actualBlocks.length === 0) {
        throw new Error(`A estrutura ${groupLabel} nao possui blocos e nao pode ser exportada.`);
    }

    return resolveSnapshotPlacementFromBlocks(type, rot, actualBlocks, prefabs, cityName);
}

function buildCityExport(name, placements, prefabs, options = {}) {
    const source = buildSerializableCitySource(name, validateCityPlacements(placements, prefabs, options));
    return {
        name: source.name,
        placements: source.placements,
        source,
        json: JSON.stringify(source, null, 2),
    };
}

function buildCitySnapshot(name, groups, prefabs, options = {}) {
    if (!Array.isArray(groups) || groups.length === 0) {
        throw new Error("Nao ha estruturas suficientes para salvar a cidade.");
    }

    const cityName = normalizeCityName(name, "Cidade");
    const placements = groups.map((group) => validateCitySnapshotGroup(group, prefabs, cityName));
    return buildCityExport(cityName, placements, prefabs, { ...options, cityName });
}

export {
    CITY_JSON_KIND,
    CITY_JSON_VERSION,
    buildCityExport,
    buildCitySnapshot,
    buildSerializableCitySource,
    normalizeCityName,
    parseCityJson,
    serializeCityJson,
    validateCityPlacements,
};