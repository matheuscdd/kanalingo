function subtractPoints(left, right) {
    return {
        x: left.x - right.x,
        y: left.y - right.y,
        z: left.z - right.z,
    };
}

function dotVectors(left, right) {
    return left.x * right.x + left.y * right.y + left.z * right.z;
}

function crossVectors(left, right) {
    return {
        x: left.y * right.z - left.z * right.y,
        y: left.z * right.x - left.x * right.z,
        z: left.x * right.y - left.y * right.x,
    };
}

function normalizeVector(vector) {
    const length = Math.hypot(vector.x, vector.y, vector.z);
    if (length <= 1e-6) return null;
    return {
        x: vector.x / length,
        y: vector.y / length,
        z: vector.z / length,
    };
}

function pointInTriangle2D(px, py, a, b, c, epsilon = 1e-5) {
    const d1 = (px - b.u) * (a.v - b.v) - (a.u - b.u) * (py - b.v);
    const d2 = (px - c.u) * (b.v - c.v) - (b.u - c.u) * (py - c.v);
    const d3 = (px - a.u) * (c.v - a.v) - (c.u - a.u) * (py - a.v);
    const hasNeg = d1 < -epsilon || d2 < -epsilon || d3 < -epsilon;
    const hasPos = d1 > epsilon || d2 > epsilon || d3 > epsilon;
    return !(hasNeg && hasPos);
}

function isPointInsideProjectedTriangles(pu, pv, triangles) {
    return triangles.some(([a, b, c]) => pointInTriangle2D(pu, pv, a, b, c));
}

function doesStudFitProjectedTriangles(pu, pv, triangles, studRadius) {
    const diagonalOffset = studRadius / Math.SQRT2;
    const sampleOffsets = [
        [0, 0],
        [studRadius, 0],
        [-studRadius, 0],
        [0, studRadius],
        [0, -studRadius],
        [diagonalOffset, diagonalOffset],
        [diagonalOffset, -diagonalOffset],
        [-diagonalOffset, diagonalOffset],
        [-diagonalOffset, -diagonalOffset],
    ];
    return sampleOffsets.every(([offsetU, offsetV]) => isPointInsideProjectedTriangles(pu + offsetU, pv + offsetV, triangles));
}

function roundForSurfaceKey(value, precision = 1e-4) {
    return Math.round(value / precision) * precision;
}

function getTriangleNormal(a, b, c) {
    const ab = subtractPoints(b, a);
    const ac = subtractPoints(c, a);
    return normalizeVector(crossVectors(ab, ac));
}

function getProjectedPlaneAxis(normal, axisHint) {
    const axis = normalizeVector(axisHint);
    if (!axis) return null;

    const axisDotNormal = dotVectors(axis, normal);
    return normalizeVector({
        x: axis.x - normal.x * axisDotNormal,
        y: axis.y - normal.y * axisDotNormal,
        z: axis.z - normal.z * axisDotNormal,
    });
}

function groupTrianglesByPlane(triangles, minNormalY, maxNormalY) {
    const surfaceGroups = new Map();

    triangles.forEach(([a, b, c]) => {
        const normal = getTriangleNormal(a, b, c);
        if (!normal) return;
        if (normal.y < minNormalY || normal.y > maxNormalY) return;

        const planeOffset = dotVectors(normal, a);
        const key = [
            roundForSurfaceKey(normal.x),
            roundForSurfaceKey(normal.y),
            roundForSurfaceKey(normal.z),
            roundForSurfaceKey(planeOffset),
        ].join(":");

        if (!surfaceGroups.has(key)) surfaceGroups.set(key, { normal, triangles: [] });
        surfaceGroups.get(key).triangles.push([a, b, c]);
    });

    return [...surfaceGroups.values()];
}

function projectPointToSurface(point, origin, uAxis, vAxis) {
    const relative = subtractPoints(point, origin);
    return {
        u: dotVectors(relative, uAxis),
        v: dotVectors(relative, vAxis),
    };
}

function getPointKey(point) {
    return `${roundForSurfaceKey(point.u)}:${roundForSurfaceKey(point.v)}`;
}

function getEdgeKey(start, end) {
    const startKey = getPointKey(start);
    const endKey = getPointKey(end);
    return startKey < endKey ? `${startKey}|${endKey}` : `${endKey}|${startKey}`;
}

function getBoundaryEdges(projectedTriangles) {
    const edgeCounts = new Map();
    const edgeSegments = new Map();

    projectedTriangles.forEach(([a, b, c]) => {
        [
            [a, b],
            [b, c],
            [c, a],
        ].forEach(([start, end]) => {
            const key = getEdgeKey(start, end);
            edgeCounts.set(key, (edgeCounts.get(key) || 0) + 1);
            if (!edgeSegments.has(key)) edgeSegments.set(key, { start, end });
        });
    });

    return [...edgeCounts.entries()]
        .filter(([, count]) => count === 1)
        .map(([key]) => edgeSegments.get(key));
}

function getProjectedSurfaceCentroid(projectedTriangles) {
    const uniquePoints = new Map();

    projectedTriangles.forEach((triangle) => {
        triangle.forEach((point) => {
            const key = getPointKey(point);
            if (!uniquePoints.has(key)) uniquePoints.set(key, point);
        });
    });

    const points = [...uniquePoints.values()];
    if (points.length === 0) return { u: 0, v: 0 };

    const totals = points.reduce(
        (sum, point) => ({ u: sum.u + point.u, v: sum.v + point.v }),
        { u: 0, v: 0 },
    );

    return {
        u: totals.u / points.length,
        v: totals.v / points.length,
    };
}

function getPointToSegmentDistance(point, start, end) {
    const dx = end.u - start.u;
    const dy = end.v - start.v;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared <= 1e-8) return Math.hypot(point.u - start.u, point.v - start.v);

    const projection = ((point.u - start.u) * dx + (point.v - start.v) * dy) / lengthSquared;
    const clampedProjection = Math.max(0, Math.min(1, projection));
    const closestU = start.u + dx * clampedProjection;
    const closestV = start.v + dy * clampedProjection;
    return Math.hypot(point.u - closestU, point.v - closestV);
}

function getBoundaryClearance(point, boundaryEdges) {
    if (boundaryEdges.length === 0) return 0;
    let minDistance = Infinity;

    boundaryEdges.forEach((edge) => {
        const distance = getPointToSegmentDistance(point, edge.start, edge.end);
        if (distance < minDistance) minDistance = distance;
    });

    return minDistance;
}

function keepMostCentralPlacements(placements, centroid, maxPlacementsPerSurface, selectionStrategy = "clearance-center") {
    if (!Number.isFinite(maxPlacementsPerSurface)) return placements;
    if (maxPlacementsPerSurface <= 0) return [];
    if (placements.length <= maxPlacementsPerSurface) return placements;

    return placements
        .slice()
        .sort((left, right) => {
            if (selectionStrategy === "highest-y-clearance") {
                const yDelta = right.y - left.y;
                if (Math.abs(yDelta) > 1e-6) return yDelta;
            }

            const clearanceDelta = (right.clearance || 0) - (left.clearance || 0);
            if (Math.abs(clearanceDelta) > 1e-6) return clearanceDelta;

            const leftDistance = (left.u - centroid.u) ** 2 + (left.v - centroid.v) ** 2;
            const rightDistance = (right.u - centroid.u) ** 2 + (right.v - centroid.v) ** 2;
            return leftDistance - rightDistance;
        })
        .slice(0, maxPlacementsPerSurface);
}

function getUpwardSurfaceStudPlacements(
    triangles,
    axisHint,
    {
        studRadius = 0.25,
        minNormalY = 0.15,
        maxNormalY = 0.95,
        maxPlacementsPerSurface = Infinity,
        selectionStrategy = "clearance-center",
    } = {},
) {
    const placements = [];

    groupTrianglesByPlane(triangles, minNormalY, maxNormalY).forEach((surface) => {
        const uAxis = getProjectedPlaneAxis(surface.normal, axisHint);
        if (!uAxis) return;

        const vAxis = normalizeVector(crossVectors(surface.normal, uAxis));
        if (!vAxis) return;

        const origin = surface.triangles[0][0];
        const projectedTriangles = surface.triangles.map(([a, b, c]) => [
            projectPointToSurface(a, origin, uAxis, vAxis),
            projectPointToSurface(b, origin, uAxis, vAxis),
            projectPointToSurface(c, origin, uAxis, vAxis),
        ]);
        const boundaryEdges = getBoundaryEdges(projectedTriangles);
        const centroid = getProjectedSurfaceCentroid(projectedTriangles);

        let minU = Infinity;
        let minV = Infinity;
        let maxU = -Infinity;
        let maxV = -Infinity;

        projectedTriangles.forEach((triangle) => {
            triangle.forEach((point) => {
                if (point.u < minU) minU = point.u;
                if (point.v < minV) minV = point.v;
                if (point.u > maxU) maxU = point.u;
                if (point.v > maxV) maxV = point.v;
            });
        });

        const startU = Math.ceil(minU - 0.5) + 0.5;
        const startV = Math.ceil(minV - 0.5) + 0.5;

        const surfacePlacements = [];

        for (let u = startU; u < maxU; u += 1) {
            for (let v = startV; v < maxV; v += 1) {
                if (!doesStudFitProjectedTriangles(u, v, projectedTriangles, studRadius)) continue;
                surfacePlacements.push({
                    x: origin.x + uAxis.x * u + vAxis.x * v,
                    y: origin.y + uAxis.y * u + vAxis.y * v,
                    z: origin.z + uAxis.z * u + vAxis.z * v,
                    u,
                    v,
                    clearance: getBoundaryClearance({ u, v }, boundaryEdges),
                    nx: surface.normal.x,
                    ny: surface.normal.y,
                    nz: surface.normal.z,
                });
            }
        }

        keepMostCentralPlacements(surfacePlacements, centroid, maxPlacementsPerSurface, selectionStrategy).forEach((placement) => {
            placements.push({
                x: placement.x,
                y: placement.y,
                z: placement.z,
                nx: placement.nx,
                ny: placement.ny,
                nz: placement.nz,
            });
        });
    });

    return placements;
}

export {
    getUpwardSurfaceStudPlacements,
};