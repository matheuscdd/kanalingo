const SHAPE_DIRECTION_DEFAULT = "pos-y";
const SHAPE_DIRECTIONS = ["pos-y", "neg-y", "pos-x", "neg-x", "pos-z", "neg-z"];

const SHAPE_DIRECTION_LABELS = {
    "pos-y": "+Y",
    "neg-y": "-Y",
    "pos-x": "+X",
    "neg-x": "-X",
    "pos-z": "+Z",
    "neg-z": "-Z",
};

const LOCAL_Y_ROTATION_MATRICES = [
    [1, 0, 0, 0, 1, 0, 0, 0, 1],
    [0, 0, -1, 0, 1, 0, 1, 0, 0],
    [-1, 0, 0, 0, 1, 0, 0, 0, -1],
    [0, 0, 1, 0, 1, 0, -1, 0, 0],
];

const DIRECTION_MATRICES = {
    "pos-y": [1, 0, 0, 0, 1, 0, 0, 0, 1],
    "neg-y": [1, 0, 0, 0, -1, 0, 0, 0, -1],
    "pos-x": [0, 1, 0, -1, 0, 0, 0, 0, 1],
    "neg-x": [0, -1, 0, 1, 0, 0, 0, 0, 1],
    "pos-z": [1, 0, 0, 0, 0, -1, 0, 1, 0],
    "neg-z": [1, 0, 0, 0, 0, 1, 0, -1, 0],
};

function normalizeQuarterTurns(rot) {
    return ((Number(rot) || 0) % 4 + 4) % 4;
}

function normalizeShapeDirection(direction) {
    return SHAPE_DIRECTIONS.includes(direction) ? direction : SHAPE_DIRECTION_DEFAULT;
}

function getShapeDirectionLabel(direction) {
    return SHAPE_DIRECTION_LABELS[normalizeShapeDirection(direction)];
}

function multiplyMatrices(left, right) {
    return [
        left[0] * right[0] + left[1] * right[3] + left[2] * right[6],
        left[0] * right[1] + left[1] * right[4] + left[2] * right[7],
        left[0] * right[2] + left[1] * right[5] + left[2] * right[8],
        left[3] * right[0] + left[4] * right[3] + left[5] * right[6],
        left[3] * right[1] + left[4] * right[4] + left[5] * right[7],
        left[3] * right[2] + left[4] * right[5] + left[5] * right[8],
        left[6] * right[0] + left[7] * right[3] + left[8] * right[6],
        left[6] * right[1] + left[7] * right[4] + left[8] * right[7],
        left[6] * right[2] + left[7] * right[5] + left[8] * right[8],
    ];
}

function applyMatrixToPoint(matrix, x, y, z) {
    return {
        x: matrix[0] * x + matrix[1] * y + matrix[2] * z,
        y: matrix[3] * x + matrix[4] * y + matrix[5] * z,
        z: matrix[6] * x + matrix[7] * y + matrix[8] * z,
    };
}

function getShapeOrientationMatrix(direction = SHAPE_DIRECTION_DEFAULT, rot = 0) {
    return multiplyMatrices(
        DIRECTION_MATRICES[normalizeShapeDirection(direction)],
        LOCAL_Y_ROTATION_MATRICES[normalizeQuarterTurns(rot)],
    );
}

function getBoundsAfterShapeOrientation(bounds, direction = SHAPE_DIRECTION_DEFAULT, rot = 0) {
    const matrix = getShapeOrientationMatrix(direction, rot);
    const xs = [bounds.minX, bounds.maxX];
    const ys = [bounds.minY, bounds.maxY];
    const zs = [bounds.minZ, bounds.maxZ];

    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;

    xs.forEach((x) => {
        ys.forEach((y) => {
            zs.forEach((z) => {
                const point = applyMatrixToPoint(matrix, x, y, z);
                if (point.x < minX) minX = point.x;
                if (point.y < minY) minY = point.y;
                if (point.z < minZ) minZ = point.z;
                if (point.x > maxX) maxX = point.x;
                if (point.y > maxY) maxY = point.y;
                if (point.z > maxZ) maxZ = point.z;
            });
        });
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

function getShapePlacementMetrics(width, height, depth, direction = SHAPE_DIRECTION_DEFAULT, rot = 0) {
    return getBoundsAfterShapeOrientation(
        { minX: 0, maxX: width, minY: 0, maxY: height, minZ: 0, maxZ: depth },
        direction,
        rot,
    );
}

function getOrientationLookupKey(matrix) {
    return matrix.join(",");
}

const ORIENTATION_LOOKUP = new Map();
SHAPE_DIRECTIONS.forEach((direction) => {
    for (let rot = 0; rot < 4; rot++) {
        ORIENTATION_LOOKUP.set(getOrientationLookupKey(getShapeOrientationMatrix(direction, rot)), { direction, rot });
    }
});

function rotateShapeOrientationAroundY(direction = SHAPE_DIRECTION_DEFAULT, rot = 0, yRot = 0) {
    const finalMatrix = multiplyMatrices(
        LOCAL_Y_ROTATION_MATRICES[normalizeQuarterTurns(yRot)],
        getShapeOrientationMatrix(direction, rot),
    );

    return ORIENTATION_LOOKUP.get(getOrientationLookupKey(finalMatrix)) || {
        direction: normalizeShapeDirection(direction),
        rot: normalizeQuarterTurns(rot),
    };
}

export {
    SHAPE_DIRECTION_DEFAULT,
    SHAPE_DIRECTION_LABELS,
    SHAPE_DIRECTIONS,
    getBoundsAfterShapeOrientation,
    getShapeDirectionLabel,
    getShapeOrientationMatrix,
    getShapePlacementMetrics,
    normalizeShapeDirection,
    rotateShapeOrientationAroundY,
};