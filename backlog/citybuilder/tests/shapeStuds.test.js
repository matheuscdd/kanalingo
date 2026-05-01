import { describe, expect, it } from "vitest";

import { getUpwardSurfaceStudPlacements } from "../prefabs/shared/shapeStuds.js";
import { getShapeOrientationMatrix } from "../prefabs/shared/shapeOrientation.js";

function transformPoint(matrix, x, y, z) {
    return {
        x: matrix[0] * x + matrix[1] * y + matrix[2] * z,
        y: matrix[3] * x + matrix[4] * y + matrix[5] * z,
        z: matrix[6] * x + matrix[7] * y + matrix[8] * z,
    };
}

function createRadialPoints(radius, y, segments) {
    return Array.from({ length: segments }, (_, index) => {
        const angle = (index / segments) * Math.PI * 2;
        return {
            x: Math.cos(angle) * radius,
            y,
            z: Math.sin(angle) * radius,
        };
    });
}

describe("shape studs", () => {
    it("places studs on both sloped triangular prism faces in neg-z", () => {
        const matrix = getShapeOrientationMatrix("neg-z", 0);
        const axisHint = transformPoint(matrix, 0, 1, 0);
        const apex = { x: 0, z: 0.6 };
        const left = { x: -0.52, z: -0.3 };
        const right = { x: 0.52, z: -0.3 };
        const startY = 0;
        const endY = 4;

        const localTriangles = [
            [
                { x: apex.x, y: startY, z: apex.z },
                { x: left.x, y: endY, z: left.z },
                { x: left.x, y: startY, z: left.z },
            ],
            [
                { x: apex.x, y: startY, z: apex.z },
                { x: apex.x, y: endY, z: apex.z },
                { x: left.x, y: endY, z: left.z },
            ],
            [
                { x: apex.x, y: startY, z: apex.z },
                { x: right.x, y: startY, z: right.z },
                { x: right.x, y: endY, z: right.z },
            ],
            [
                { x: apex.x, y: startY, z: apex.z },
                { x: right.x, y: endY, z: right.z },
                { x: apex.x, y: endY, z: apex.z },
            ],
        ];

        const triangles = localTriangles.map((triangle) => triangle.map((point) => transformPoint(matrix, point.x, point.y, point.z)));
        const placements = getUpwardSurfaceStudPlacements(triangles, axisHint, {
            studRadius: 0.25,
            minNormalY: 0.15,
            maxNormalY: 0.94,
        });
        const normalGroups = new Set(
            placements.map((placement) => `${Math.round(placement.nx * 100)}:${Math.round(placement.ny * 100)}:${Math.round(placement.nz * 100)}`),
        );

        expect(placements.length).toBeGreaterThanOrEqual(6);
        expect(normalGroups.size).toBe(2);
        expect(placements.every((placement) => placement.ny > 0.15)).toBe(true);
    });

    it("places studs on the four sloped faces of a square pyramid", () => {
        const matrix = getShapeOrientationMatrix("pos-y", 0);
        const axisHint = transformPoint(matrix, 1, 0, 0);
        const apex = { x: 0, y: 4, z: 0 };
        const corners = [
            { x: -3, y: 0, z: -3 },
            { x: 3, y: 0, z: -3 },
            { x: 3, y: 0, z: 3 },
            { x: -3, y: 0, z: 3 },
        ];

        const localTriangles = [
            [apex, corners[1], corners[0]],
            [apex, corners[2], corners[1]],
            [apex, corners[3], corners[2]],
            [apex, corners[0], corners[3]],
        ];

        const triangles = localTriangles.map((triangle) => triangle.map((point) => transformPoint(matrix, point.x, point.y, point.z)));
        const placements = getUpwardSurfaceStudPlacements(triangles, axisHint, {
            studRadius: 0.25,
            minNormalY: 0.15,
            maxNormalY: 0.94,
        });
        const normalGroups = placements.reduce((groups, placement) => {
            const key = `${Math.round(placement.nx * 100)}:${Math.round(placement.ny * 100)}:${Math.round(placement.nz * 100)}`;
            groups.set(key, (groups.get(key) || 0) + 1);
            return groups;
        }, new Map());

        expect(placements).toHaveLength(48);
        expect(normalGroups.size).toBe(4);
        expect([...normalGroups.values()].every((count) => count === 12)).toBe(true);
        expect(placements.every((placement) => placement.ny > 0.15)).toBe(true);
        expect(Math.min(...placements.map((placement) => placement.y))).toBeGreaterThan(0.3);
    });

    it("places studs on the sloped faces of a cone", () => {
        const matrix = getShapeOrientationMatrix("pos-y", 0);
        const axisHint = transformPoint(matrix, 1, 0, 0);
        const apex = { x: 0, y: 5, z: 0 };
        const base = createRadialPoints(4, 0, 6);

        const triangles = base.map((point, index) => {
            const nextPoint = base[(index + 1) % base.length];
            return [apex, nextPoint, point].map((vertex) => transformPoint(matrix, vertex.x, vertex.y, vertex.z));
        });
        const placements = getUpwardSurfaceStudPlacements(triangles, axisHint, {
            studRadius: 0.25,
            minNormalY: 0.15,
            maxNormalY: 0.94,
        });
        const normalGroups = new Set(
            placements.map((placement) => `${Math.round(placement.nx * 100)}:${Math.round(placement.ny * 100)}:${Math.round(placement.nz * 100)}`),
        );

        expect(placements.length).toBeGreaterThan(0);
        expect(normalGroups.size).toBe(6);
        expect(placements.every((placement) => placement.ny > 0.15)).toBe(true);
    });

    it("places studs on the sloped faces of a truncated cone", () => {
        const matrix = getShapeOrientationMatrix("pos-y", 0);
        const axisHint = transformPoint(matrix, 1, 0, 0);
        const top = createRadialPoints(2, 4, 6);
        const base = createRadialPoints(4, 0, 6);
        const triangles = [];

        for (let index = 0; index < 6; index++) {
            const nextIndex = (index + 1) % 6;
            triangles.push(
                [top[index], top[nextIndex], base[nextIndex]].map((vertex) => transformPoint(matrix, vertex.x, vertex.y, vertex.z)),
                [top[index], base[nextIndex], base[index]].map((vertex) => transformPoint(matrix, vertex.x, vertex.y, vertex.z)),
            );
        }

        const placements = getUpwardSurfaceStudPlacements(triangles, axisHint, {
            studRadius: 0.25,
            minNormalY: 0.15,
            maxNormalY: 0.94,
        });
        const normalGroups = new Set(
            placements.map((placement) => `${Math.round(placement.nx * 100)}:${Math.round(placement.ny * 100)}:${Math.round(placement.nz * 100)}`),
        );

        expect(placements.length).toBeGreaterThan(0);
        expect(normalGroups.size).toBe(6);
        expect(placements.every((placement) => placement.ny > 0.15)).toBe(true);
    });
});