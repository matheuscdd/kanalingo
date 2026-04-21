import { describe, expect, it } from "vitest";
import {
    analyzeBuildAreaStructure,
    buildAreaStructureExport,
    buildLocalPrefabFromWorldBlocks,
    collectConnectedWorldBlocks,
} from "../prefabs/shared/structureCapture.js";
import { createShapeRecipe } from "../prefabs/shared/builderTools.js";

function createWorldBlock(id, type, cx, cy, cz, color = "#e3000b", rot = 0) {
    return { id, type, color, rot, cx, cy, cz };
}

describe("structureCapture", () => {
    it("collects connected world blocks using 26-neighbor adjacency", () => {
        const worldBlocks = [
            createWorldBlock("a", "1x1", 0, 0, 0),
            createWorldBlock("b", "1x1", 1, 1, 1),
            createWorldBlock("c", "1x1", 5, 0, 0),
        ];

        const connected = collectConnectedWorldBlocks(worldBlocks, "a");
        expect(connected.map((block) => block.id)).toEqual(["a", "b"]);
    });

    it("blocks capture when the area contains disconnected structures", () => {
        const worldBlocks = [
            createWorldBlock("a", "1x1", -1, 0, -1),
            createWorldBlock("b", "1x1", 3, 0, 3),
        ];

        const analysis = analyzeBuildAreaStructure(worldBlocks, 8);
        expect(analysis.status).toBe("disconnected");
        expect(analysis.components).toHaveLength(2);
    });

    it("blocks capture when a structure connected to the area extends outside it", () => {
        const worldBlocks = [
            createWorldBlock("a", "1x1", 3, 0, 0),
            createWorldBlock("b", "1x1", 4, 0, 0),
        ];

        const analysis = analyzeBuildAreaStructure(worldBlocks, 8);
        expect(analysis.status).toBe("outside");
        expect(analysis.boundaryBlocks.map((block) => block.id)).toContain("b");
    });

    it("builds optimized JSON from a connected area structure", () => {
        const worldBlocks = [];
        let serial = 0;

        for (let x = -2; x < 2; x++) {
            for (let z = -2; z < 2; z++) {
                serial += 1;
                worldBlocks.push(createWorldBlock(`b${serial}`, "1x1", x, 0, z, "#f4f4f4"));
            }
        }

        const result = buildAreaStructureExport("Praca", worldBlocks, 8);

        expect(result.status).toBe("ok");
        expect(result.exported.prefab.dx).toBe(4);
        expect(result.exported.prefab.dy).toBe(1);
        expect(result.exported.prefab.dz).toBe(4);
        expect(JSON.parse(result.exported.json).recipe).toEqual([
            { op: "filledRect", x0: 0, y: 0, z0: 0, width: 4, depth: 4, color: "#f4f4f4" },
        ]);
    });

    it("preserves shape direction when capturing local prefabs", () => {
        const shapeRecipe = createShapeRecipe("triangular_prism", {
            color: "#f2cd37",
            width: 6,
            depth: 4,
            height: 3,
            direction: "pos-x",
        });
        const shapeBlock = shapeRecipe.blocks[0];

        const localPrefab = buildLocalPrefabFromWorldBlocks([
            {
                id: "shape-1",
                type: shapeBlock.type,
                color: shapeBlock.color,
                rot: shapeBlock.rot,
                direction: shapeBlock.direction,
                cx: 2,
                cy: 1,
                cz: 3,
            },
        ]);

        expect(localPrefab.dx).toBe(shapeRecipe.bounds.dx);
        expect(localPrefab.dy).toBe(shapeRecipe.bounds.dy);
        expect(localPrefab.dz).toBe(shapeRecipe.bounds.dz);
        expect(localPrefab.blocks[0]).toMatchObject({
            type: shapeBlock.type,
            direction: "pos-x",
            lx: 0,
            ly: 0,
            lz: 0,
        });
    });
});