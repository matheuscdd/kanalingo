import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BLOCKS } from "../prefabs/shared/blocks.js";
import { parsePrefabJson } from "../prefabs/shared/prefabCodec.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const htmlPath = resolve(rootDir, "citybuilder.html");
const MAX_HEIGHT = 100;
const MAX_BLOCKS = 60000;

function getJsonCatalogItems() {
    const html = readFileSync(htmlPath, "utf8");
    const matches = [...html.matchAll(/<button\b(?=[^>]*\bdata-json-src="([^"]+)")[^>]*>([^<]+)<\/button>/g)];

    return matches.map((match) => ({
        src: match[1],
        label: match[2].trim(),
        filePath: resolve(rootDir, match[1]),
    }));
}

function getBlockFootprint(block) {
    const def = BLOCKS[block.type];
    const rot = block.rot || 0;
    const rotated = rot % 2 !== 0;

    return {
        dx: rotated ? def.sz : def.sx,
        dy: def.sy,
        dz: rotated ? def.sx : def.sz,
    };
}

function buildOccupiedCells(prefab) {
    const cells = [];

    prefab.blocks.forEach((block, blockIndex) => {
        const { dx, dy, dz } = getBlockFootprint(block);

        for (let x = 0; x < dx; x += 1) {
            for (let y = 0; y < dy; y += 1) {
                for (let z = 0; z < dz; z += 1) {
                    const cell = {
                        x: block.lx + x,
                        y: block.ly + y,
                        z: block.lz + z,
                        blockIndex,
                        component: -1,
                    };
                    cell.key = `${cell.x},${cell.y},${cell.z}`;
                    cells.push(cell);
                }
            }
        }
    });

    return { cells };
}

function getUnsupportedComponents(prefab) {
    const { cells } = buildOccupiedCells(prefab);
    const cellByKey = new Map(cells.map((cell) => [cell.key, cell]));
    const neighborOffsets = [
        [1, 0, 0],
        [-1, 0, 0],
        [0, 1, 0],
        [0, -1, 0],
        [0, 0, 1],
        [0, 0, -1],
    ];

    let componentCount = 0;
    for (const cell of cells) {
        if (cell.component >= 0) continue;

        const stack = [cell];
        cell.component = componentCount;

        while (stack.length) {
            const current = stack.pop();
            for (const [dx, dy, dz] of neighborOffsets) {
                const neighbor = cellByKey.get(`${current.x + dx},${current.y + dy},${current.z + dz}`);
                if (!neighbor || neighbor.component >= 0) continue;
                neighbor.component = componentCount;
                stack.push(neighbor);
            }
        }

        componentCount += 1;
    }

    const groundedComponents = new Set(cells.filter((cell) => cell.y === 0).map((cell) => cell.component));
    const unsupported = [];

    for (let component = 0; component < componentCount; component += 1) {
        if (groundedComponents.has(component)) continue;
        const sample = cells.find((cell) => cell.component === component);
        unsupported.push({ component, sample });
    }

    return { componentCount, groundedComponentCount: groundedComponents.size, unsupported };
}

const jsonCatalogItems = getJsonCatalogItems();

describe("runtime JSON prefab catalog", () => {
    it("has at least one JSON-only catalog item", () => {
        expect(jsonCatalogItems.length).toBeGreaterThan(0);
    });

    it.each(jsonCatalogItems)("$label points to an existing, parseable JSON prefab", ({ filePath }) => {
        const text = readFileSync(filePath, "utf8");
        const parsed = parsePrefabJson(text);

        expect(parsed.prefab.blocks.length).toBeGreaterThan(0);
        expect(parsed.prefab.blocks.length).toBeLessThanOrEqual(MAX_BLOCKS);
        expect(parsed.prefab.dy).toBeLessThanOrEqual(MAX_HEIGHT);
    });

    it.each(jsonCatalogItems)("$label can be placed on an empty ground plane", ({ filePath, label }) => {
        const text = readFileSync(filePath, "utf8");
        const { prefab } = parsePrefabJson(text);
        const { componentCount, groundedComponentCount, unsupported } = getUnsupportedComponents(prefab);
        const firstUnsupported = unsupported[0]?.sample;

        expect(
            unsupported,
            `${label}: ${groundedComponentCount}/${componentCount} face-connected components touch y=0. ` +
                (firstUnsupported
                    ? `First unsupported component sample at ${firstUnsupported.x},${firstUnsupported.y},${firstUnsupported.z} (block ${firstUnsupported.blockIndex}).`
                    : ""),
        ).toHaveLength(0);
    });
});
