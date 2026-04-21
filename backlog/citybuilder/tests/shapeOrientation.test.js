import { describe, expect, it } from "vitest";

import { rotateShapeOrientationAroundY } from "../prefabs/shared/shapeOrientation.js";

describe("shape orientation", () => {
    it("rotates a vertical shape around world Y by changing only local rot", () => {
        expect(rotateShapeOrientationAroundY("pos-y", 0, 1)).toEqual({ direction: "pos-y", rot: 1 });
        expect(rotateShapeOrientationAroundY("pos-y", 1, -1)).toEqual({ direction: "pos-y", rot: 0 });
    });

    it("rotates a neg-z triangular prism around world Y like prefab base rotation", () => {
        expect(rotateShapeOrientationAroundY("neg-z", 0, 1)).toEqual({ direction: "pos-x", rot: 1 });
        expect(rotateShapeOrientationAroundY("neg-z", 0, -1)).toEqual({ direction: "neg-x", rot: 3 });
    });
});
