import { describe, expect, it } from "vitest";

import { getFakeShadeForNormal } from "../prefabs/shared/fakeShading.js";
import { getShapeOrientationMatrix } from "../prefabs/shared/shapeOrientation.js";

function transformNormal(matrix, x, y, z) {
    return {
        x: matrix[0] * x + matrix[1] * y + matrix[2] * z,
        y: matrix[3] * x + matrix[4] * y + matrix[5] * z,
        z: matrix[6] * x + matrix[7] * y + matrix[8] * z,
    };
}

describe("fake shading", () => {
    it("keeps top and bottom faces at the expected extremes", () => {
        expect(getFakeShadeForNormal(0, 1, 0)).toBe(1);
        expect(getFakeShadeForNormal(0, -1, 0)).toBe(0.45);
    });

    it("gives square pyramid side faces distinct shades", () => {
        const slope = 0.5;
        const faces = [
            getFakeShadeForNormal(0, slope, 1),
            getFakeShadeForNormal(1, slope, 0),
            getFakeShadeForNormal(0, slope, -1),
            getFakeShadeForNormal(-1, slope, 0),
        ];

        expect(new Set(faces).size).toBe(4);
        expect(Math.max(...faces) - Math.min(...faces)).toBeGreaterThan(0.15);
    });

    it("keeps triangular prism neg-z faces visually separated", () => {
        const matrix = getShapeOrientationMatrix("neg-z", 0);
        const localNormals = [
            [Math.sqrt(3) / 2, 0, 0.5],
            [0, 0, -1],
            [-Math.sqrt(3) / 2, 0, 0.5],
        ];

        const shades = localNormals.map(([x, y, z]) => {
            const normal = transformNormal(matrix, x, y, z);
            return getFakeShadeForNormal(normal.x, normal.y, normal.z);
        });

        expect(new Set(shades).size).toBe(3);
        expect(Math.max(...shades) - Math.min(...shades)).toBeGreaterThan(0.28);
    });
});