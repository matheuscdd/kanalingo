import { describe, expect, it } from "vitest";
import {
    buildPrefabExport,
    parsePrefabJson,
    resolveRuntimePrefabName,
    serializePrefabJson,
    SUPPORTED_PREFAB_JSON_RECIPE_OPS,
} from "../prefabs/shared/prefabCodec.js";
import { createShapeRecipe } from "../prefabs/shared/builderTools.js";

describe("prefabCodec", () => {
    it("serializes and parses a block-based prefab round-trip", () => {
        const prefab = {
            dx: 4,
            dy: 4,
            dz: 4,
            blocks: [
                { type: "2x2", color: "#e3000b", rot: 0, lx: 0, ly: 0, lz: 0 },
                { type: "Pillar", color: "#f4f4f4", rot: 0, lx: 2, ly: 1, lz: 2 },
            ],
            meta: { rotations: [] },
        };

        const serialized = serializePrefabJson("MiniCasa", prefab);
        const parsed = parsePrefabJson(serialized);

        expect(parsed.name).toBe("MiniCasa");
        expect(parsed.prefab.dx).toBe(4);
        expect(parsed.prefab.dy).toBe(4);
        expect(parsed.prefab.dz).toBe(4);
        expect(parsed.prefab.blocks).toEqual([
            { type: "2x2", color: "#e3000b", rot: 0, lx: 0, ly: 0, lz: 0 },
            { type: "Pillar", color: "#f4f4f4", rot: 0, lx: 2, ly: 1, lz: 2 },
        ]);
        expect(parsed.prefab.meta.rotations).toHaveLength(4);
    });

    it("serializes detected floors and columns as optimized recipe ops", () => {
        const prefab = {
            dx: 4,
            dy: 5,
            dz: 4,
            blocks: [
                { type: "2x4", color: "#f4f4f4", rot: 0, lx: 0, ly: 0, lz: 0 },
                { type: "2x4", color: "#f4f4f4", rot: 0, lx: 2, ly: 0, lz: 0 },
                { type: "Pillar", color: "#111111", rot: 0, lx: 0, ly: 1, lz: 0 },
                { type: "1x1", color: "#111111", rot: 0, lx: 0, ly: 4, lz: 0 },
            ],
            meta: { rotations: [] },
        };

        const payload = JSON.parse(serializePrefabJson("CasaOtimizada", prefab));

        expect(payload.recipe).toEqual([
            { op: "filledRect", x0: 0, y: 0, z0: 0, width: 4, depth: 4, color: "#f4f4f4" },
            { op: "pillarStack", lx: 0, y0: 1, lz: 0, height: 4, color: "#111111" },
        ]);
    });

    it("serializes dense 1x1 floors as optimized filledRect steps", () => {
        const exported = buildPrefabExport(
            "BaseManual",
            Array.from({ length: 16 }, (_, index) => ({
                type: "1x1",
                color: "#f4f4f4",
                rot: 0,
                lx: index % 4,
                ly: 0,
                lz: Math.floor(index / 4),
            })),
            { dx: 4, dy: 1, dz: 4 },
        );

        expect(JSON.parse(exported.json).recipe).toEqual([
            { op: "filledRect", x0: 0, y: 0, z0: 0, width: 4, depth: 4, color: "#f4f4f4" },
        ]);
    });

    it("builds an exportable prefab from local blocks", () => {
        const exported = buildPrefabExport("Estrutura Livre", [
            { type: "1x1", color: "#e3000b", rot: 0, lx: 0, ly: 0, lz: 0 },
            { type: "1x1", color: "#0055bf", rot: 0, lx: 1, ly: 0, lz: 0 },
            { type: "1x1", color: "#0055bf", rot: 0, lx: 1, ly: 1, lz: 0 },
        ]);

        expect(exported.prefab.dx).toBe(2);
        expect(exported.prefab.dy).toBe(2);
        expect(exported.prefab.dz).toBe(1);
        expect(JSON.parse(exported.json)).toMatchObject({
            name: "Estrutura Livre",
            dx: 2,
            dy: 2,
            dz: 1,
        });
    });

    it("round-trips dynamic shape block types", () => {
        const shapeRecipe = createShapeRecipe("triangular_prism", { color: "#f2cd37", width: 6, depth: 4, height: 3, direction: "pos-x" });
        const exported = buildPrefabExport("PrismaTriangular", shapeRecipe.blocks, shapeRecipe.bounds);
        const parsed = parsePrefabJson(exported.json);

        expect(parsed.prefab.blocks).toHaveLength(1);
        expect(parsed.prefab.blocks[0].type).toBe(shapeRecipe.blocks[0].type);
        expect(parsed.prefab.blocks[0].direction).toBe("pos-x");
        expect(parsed.prefab.dx).toBe(3);
        expect(parsed.prefab.dy).toBe(6);
        expect(parsed.prefab.dz).toBe(4);
    });

    it("rotates shape directions inside prefab metadata", () => {
        const shapeRecipe = createShapeRecipe("triangular_prism", { color: "#f2cd37", width: 6, depth: 4, height: 3, direction: "pos-x" });
        const exported = buildPrefabExport("PrismaTriangularRot", shapeRecipe.blocks, shapeRecipe.bounds);

        expect(exported.prefab.meta.rotations[1].blocks[0].direction).toBe("pos-z");
    });

    it("parses recipe-based prefabs using optimized core helpers", () => {
        const parsed = parsePrefabJson({
            name: "RecipeHouse",
            recipe: [
                { op: "filledRect", x0: 0, y: 0, z0: 0, width: 4, depth: 4, color: "#f4f4f4" },
                { op: "pillarStack", lx: 0, y0: 1, lz: 0, height: 4, color: "#111111" },
            ],
        });

        expect(parsed.prefab.dx).toBe(4);
        expect(parsed.prefab.dy).toBe(5);
        expect(parsed.prefab.dz).toBe(4);
        expect(parsed.prefab.blocks).toEqual([
            { type: "2x4", color: "#f4f4f4", rot: 0, lx: 0, ly: 0, lz: 0 },
            { type: "2x4", color: "#f4f4f4", rot: 0, lx: 2, ly: 0, lz: 0 },
            { type: "Pillar", color: "#111111", rot: 0, lx: 0, ly: 1, lz: 0 },
            { type: "1x1", color: "#111111", rot: 0, lx: 0, ly: 4, lz: 0 },
        ]);
        expect(parsed.source.recipe).toHaveLength(2);
        expect(parsed.prefab.meta.rotations[0].componentCount).toBeGreaterThan(0);
    });

    it("rejects overlapping recipe output", () => {
        expect(() =>
            parsePrefabJson({
                name: "Overlap",
                recipe: [
                    { op: "block", type: "1x1", color: "#e3000b", rot: 0, lx: 0, ly: 0, lz: 0 },
                    { op: "block", type: "1x1", color: "#0055bf", rot: 0, lx: 0, ly: 0, lz: 0 },
                ],
            }),
        ).toThrow(/overlapping or invalid recipe output/i);
    });

    it("resolves builtin name collisions to a reusable JSON slot", () => {
        const builtinNames = new Set(["Casa"]);
        const runtimeNames = new Set(["Casa JSON"]);
        const existingNames = new Set(["Casa", "Casa JSON"]);

        const resolved = resolveRuntimePrefabName("Casa", builtinNames, runtimeNames, (name) => existingNames.has(name));
        expect(resolved).toBe("Casa JSON");
    });

    it("exports the supported optimized recipe ops", () => {
        expect(SUPPORTED_PREFAB_JSON_RECIPE_OPS).toEqual([
            "block",
            "blocks",
            "filledRect",
            "pillarStack",
            "solid",
            "ellipseBand",
            "ellipseBlocks",
        ]);
    });
});