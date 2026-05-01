import { describe, expect, it } from "vitest";

import {
    DIRECT_GEOMETRY_SHAPES,
    FORMAS_3D,
    createAreaRecipe,
    createFloorRecipe,
    createShapeRecipe,
    createWallRecipe,
    ensureDynamicShapeBlockType,
    getRecipeBounds,
    isDynamicShapeBlockType,
    parseDynamicShapeBlockType,
} from "../prefabs/shared/builderTools.js";

describe("builderTools", () => {
    it("exports all requested 3D shapes", () => {
        expect(FORMAS_3D).toEqual([
            "hexagonal_pyramid",
            "cuboid",
            "cylinder",
            "ring",
            "hexagonal_prism",
            "sphere",
            "truncated_cone",
            "dodecahedron",
            "square_pyramid",
            "octahedron",
            "cone",
            "pentagrammic_prism",
            "buckyball",
            "cube",
            "triangular_prism",
            "torus",
            "icosahedron",
            "half_sphere",
        ]);
    });

    it("builds a tiled area recipe", () => {
        const recipe = createAreaRecipe({ type: "2x2", color: "#e3000b", width: 4, depth: 4, height: 2 });

        expect(recipe.blocks).toHaveLength(8);
        expect(recipe.bounds.dx).toBe(4);
        expect(recipe.bounds.dy).toBe(2);
        expect(recipe.bounds.dz).toBe(4);
    });

    it("builds a floor recipe with one layer", () => {
        const recipe = createFloorRecipe({ type: "1x1", color: "#0055bf", width: 3, depth: 2 });
        expect(recipe.blocks).toHaveLength(6);
        expect(recipe.bounds.dy).toBe(1);
    });

    it("builds a wall recipe along the current rotation axis", () => {
        const recipe = createWallRecipe({ type: "1x1", color: "#237841", width: 4, height: 3, rot: 1 });
        const bounds = getRecipeBounds(recipe.blocks);

        expect(recipe.blocks).toHaveLength(12);
        expect(bounds.dy).toBe(3);
        expect(bounds.dx).toBe(1);
        expect(bounds.dz).toBe(4);
    });

    it("builds a cuboid shape", () => {
        const recipe = createShapeRecipe("cuboid", { color: "#f2cd37", width: 4, depth: 3, height: 2 });

        expect(recipe.blocks).toHaveLength(1);
        expect(isDynamicShapeBlockType(recipe.blocks[0].type)).toBe(true);
        expect(parseDynamicShapeBlockType(recipe.blocks[0].type)).toMatchObject({ shape: "cuboid", width: 4, height: 2, depth: 3 });
        expect(recipe.bounds.dx).toBe(4);
        expect(recipe.bounds.dy).toBe(2);
        expect(recipe.bounds.dz).toBe(3);
    });

    it("marks polygonal shapes as direct geometry", () => {
        expect(DIRECT_GEOMETRY_SHAPES.has("triangular_prism")).toBe(true);
        expect(DIRECT_GEOMETRY_SHAPES.has("cone")).toBe(true);
        expect(DIRECT_GEOMETRY_SHAPES.has("truncated_cone")).toBe(true);
        expect(DIRECT_GEOMETRY_SHAPES.has("sphere")).toBe(false);
    });

    it("builds cone shapes as real geometry", () => {
        const coneRecipe = createShapeRecipe("cone", { color: "#f2cd37", width: 6, depth: 6, height: 5 });
        const truncatedConeRecipe = createShapeRecipe("truncated_cone", { color: "#111111", width: 8, depth: 8, height: 4 });

        expect(coneRecipe.blocks).toHaveLength(1);
        expect(parseDynamicShapeBlockType(coneRecipe.blocks[0].type)).toMatchObject({ shape: "cone", width: 6, height: 5, depth: 6 });
        expect(coneRecipe.bounds.dx).toBe(6);
        expect(coneRecipe.bounds.dy).toBe(5);
        expect(coneRecipe.bounds.dz).toBe(6);

        expect(truncatedConeRecipe.blocks).toHaveLength(1);
        expect(parseDynamicShapeBlockType(truncatedConeRecipe.blocks[0].type)).toMatchObject({ shape: "truncated_cone", width: 8, height: 4, depth: 8 });
        expect(truncatedConeRecipe.bounds.dx).toBe(8);
        expect(truncatedConeRecipe.bounds.dy).toBe(4);
        expect(truncatedConeRecipe.bounds.dz).toBe(8);
    });

    it("builds a triangular prism as real geometry", () => {
        const recipe = createShapeRecipe("triangular_prism", { color: "#f2cd37", width: 8, depth: 5, height: 4 });

        expect(recipe.blocks).toHaveLength(1);
        expect(parseDynamicShapeBlockType(recipe.blocks[0].type)).toMatchObject({ shape: "triangular_prism", width: 8, height: 4, depth: 5 });
        expect(recipe.bounds.dx).toBe(8);
        expect(recipe.bounds.dy).toBe(4);
        expect(recipe.bounds.dz).toBe(5);
    });

    it("registers direct geometry shapes with visual top studs only", () => {
        const recipe = createShapeRecipe("cuboid", { color: "#f2cd37", width: 4, depth: 3, height: 2 });
        const def = ensureDynamicShapeBlockType(recipe.blocks[0].type);

        expect(def).toMatchObject({
            sx: 4,
            sy: 2,
            sz: 3,
            topStuds: false,
            visualTopStuds: true,
            customGeo: "shape:cuboid",
        });
    });

    it("rotates direct geometry shapes across the six directions", () => {
        const recipe = createShapeRecipe("triangular_prism", {
            color: "#f2cd37",
            width: 8,
            depth: 5,
            height: 4,
            direction: "pos-x",
        });

        expect(recipe.blocks).toHaveLength(1);
        expect(recipe.blocks[0].direction).toBe("pos-x");
        expect(recipe.bounds.dx).toBe(4);
        expect(recipe.bounds.dy).toBe(8);
        expect(recipe.bounds.dz).toBe(5);
    });

    it("preserves local quarter-turn rotation for triangular_prism", () => {
        const recipe = createShapeRecipe("triangular_prism", {
            color: "#f2cd37",
            width: 8,
            depth: 5,
            height: 4,
            direction: "pos-y",
            rot: 1,
        });

        expect(recipe.blocks).toHaveLength(1);
        expect(recipe.blocks[0].rot).toBe(1);
        expect(recipe.bounds.dx).toBe(5);
        expect(recipe.bounds.dy).toBe(4);
        expect(recipe.bounds.dz).toBe(8);
    });

    it("keeps square_pyramid with the base on the platform", () => {
        const recipe = createShapeRecipe("square_pyramid", {
            color: "#f2cd37",
            width: 6,
            depth: 6,
            height: 4,
            direction: "pos-x",
            rot: 1,
        });

        expect(recipe.blocks).toHaveLength(1);
        expect(recipe.blocks[0].direction).toBe("pos-y");
        expect(recipe.blocks[0].rot).toBe(1);
        expect(recipe.bounds.dx).toBe(6);
        expect(recipe.bounds.dy).toBe(4);
        expect(recipe.bounds.dz).toBe(6);
    });

    it("builds a non-empty sphere and keeps bounds", () => {
        const recipe = createShapeRecipe("sphere", { color: "#f4f4f4", width: 7, depth: 7, height: 7 });

        expect(recipe.blocks.length).toBeGreaterThan(0);
        expect(recipe.blocks.length).toBeLessThan(343);
        expect(recipe.bounds.dx).toBe(7);
        expect(recipe.bounds.dy).toBe(7);
        expect(recipe.bounds.dz).toBe(7);
    });

    it("builds a torus shell", () => {
        const recipe = createShapeRecipe("torus", { color: "#111111", width: 9, depth: 9, height: 5 });

        expect(recipe.blocks.length).toBeGreaterThan(0);
        expect(recipe.bounds.dx).toBe(9);
        expect(recipe.bounds.dz).toBe(9);
    });

    it("rotates voxelized shapes without losing their occupied bounds", () => {
        const recipe = createShapeRecipe("cylinder", {
            color: "#111111",
            width: 8,
            depth: 5,
            height: 4,
            direction: "pos-z",
        });

        expect(recipe.blocks.length).toBeGreaterThan(0);
        expect(recipe.bounds.dx).toBe(8);
        expect(recipe.bounds.dy).toBe(5);
        expect(recipe.bounds.dz).toBe(4);
    });
});