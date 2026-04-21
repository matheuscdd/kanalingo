import { describe, expect, it } from "vitest";
import { attachPrefabMeta } from "../prefabs/shared/prefabCodec.js";
import { buildCityExport, buildCitySnapshot, parseCityJson, validateCityPlacements } from "../prefabs/shared/cityCodec.js";

function createTestPrefabs() {
    const casa = attachPrefabMeta({
        dx: 2,
        dy: 1,
        dz: 2,
        blocks: [{ type: "2x2", color: "#f4f4f4", rot: 0, lx: 0, ly: 0, lz: 0 }],
    });
    const torre = attachPrefabMeta({
        dx: 1,
        dy: 1,
        dz: 1,
        blocks: [{ type: "1x1", color: "#e3000b", rot: 0, lx: 0, ly: 0, lz: 0 }],
    });

    return {
        Casa: casa,
        Torre: torre,
    };
}

describe("cityCodec", () => {
    it("serializes and parses a city round-trip", () => {
        const prefabs = createTestPrefabs();
        const exported = buildCityExport(
            "Minha Cidade",
            [
                { type: "Torre", x: 6, z: 4, rot: 3 },
                { type: "Casa", x: 0, z: 0, rot: 1 },
            ],
            prefabs,
            { gridSize: 200 },
        );

        const parsed = parseCityJson(exported.json);

        expect(parsed.name).toBe("Minha Cidade");
        expect(parsed.placements).toEqual([
            { type: "Casa", x: 0, z: 0, rot: 1 },
            { type: "Torre", x: 6, z: 4, rot: 3 },
        ]);
    });

    it("rejects unknown structure types during validation", () => {
        expect(() =>
            validateCityPlacements([{ type: "Inexistente", x: 0, z: 0, rot: 0 }], createTestPrefabs(), {
                gridSize: 200,
                cityName: "CidadeTeste",
            }),
        ).toThrow(/unknown structure type/i);
    });

    it("builds a city snapshot from prefab groups", () => {
        const prefabs = createTestPrefabs();
        const snapshot = buildCitySnapshot(
            "Centro",
            [
                {
                    groupId: "g1",
                    placement: { type: "Casa", x: 0, y: 0, z: 0, rot: 0 },
                    blocks: [{ type: "2x2", color: "#f4f4f4", rot: 0, cx: 0, cy: 0, cz: 0 }],
                },
                {
                    groupId: "g2",
                    placement: { type: "Torre", x: 4, y: 0, z: 0, rot: 0 },
                    blocks: [{ type: "1x1", color: "#e3000b", rot: 0, cx: 4, cy: 0, cz: 0 }],
                },
            ],
            prefabs,
            { gridSize: 200 },
        );

        expect(JSON.parse(snapshot.json)).toEqual({
            version: 1,
            kind: "city",
            name: "Centro",
            placements: [
                { type: "Casa", x: 0, z: 0, rot: 0 },
                { type: "Torre", x: 4, z: 0, rot: 0 },
            ],
        });
    });

    it("derives the real city placement from group blocks even if stored x z drifted", () => {
        const prefabs = createTestPrefabs();
        const snapshot = buildCitySnapshot(
            "Centro",
            [
                {
                    groupId: "g1",
                    placement: { type: "Casa", x: 99, y: 0, z: 99, rot: 0 },
                    blocks: [{ type: "2x2", color: "#f4f4f4", rot: 0, cx: 6, cy: 0, cz: 8 }],
                },
            ],
            prefabs,
            { gridSize: 200 },
        );

        expect(JSON.parse(snapshot.json).placements).toEqual([{ type: "Casa", x: 6, z: 8, rot: 0 }]);
    });

    it("rejects loose blocks when exporting a city snapshot", () => {
        expect(() =>
            buildCitySnapshot(
                "Centro",
                [
                    {
                        groupId: "loose",
                        placement: null,
                        blocks: [{ type: "1x1", color: "#e3000b", rot: 0, cx: 0, cy: 0, cz: 0 }],
                    },
                ],
                createTestPrefabs(),
                { gridSize: 200 },
            ),
        ).toThrow(/blocos soltos|sem estrutura registrada/i);
    });

    it("rejects prefab groups that were edited manually", () => {
        expect(() =>
            buildCitySnapshot(
                "Centro",
                [
                    {
                        groupId: "g1",
                        placement: { type: "Casa", x: 0, y: 0, z: 0, rot: 0 },
                        blocks: [{ type: "1x1", color: "#e3000b", rot: 0, cx: 0, cy: 0, cz: 0 }],
                    },
                ],
                createTestPrefabs(),
                { gridSize: 200 },
            ),
        ).toThrow(/alterada manualmente/i);
    });
});