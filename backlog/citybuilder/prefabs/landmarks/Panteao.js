import { createPrefabBuilder, addFilledRectSafe } from "../shared/core.js";

const Panteao = {
    dx: 28,
    dy: 21,
    dz: 28,
    blocks: (function () {
        const builder = createPrefabBuilder();
        const seen = new Set();
        const green = "#237841";
        const dark = "#111111";
        const ivory = "#f4f4f4";
        const gold = "#f2cd37";
        const centerX = 14;
        const centerZ = 18;

        function pushBlock(block) {
            const key = `${block.type}|${block.lx}|${block.ly}|${block.lz}|${block.rot}`;
            if (seen.has(key)) return;
            seen.add(key);
            builder.add(block.type, block.color, block.rot, block.lx, block.ly, block.lz);
        }

        function addDisk(y, outerRadius, color, innerRadius = -1, minZ = 8, type = "2x2") {
            for (let x = 2; x < 26; x += 2) {
                for (let z = minZ; z < 28; z += 2) {
                    const dx = x + 1 - centerX;
                    const dz = z + 1 - centerZ;
                    const distSq = dx * dx + dz * dz;
                    if (distSq > outerRadius * outerRadius) continue;
                    if (innerRadius >= 0 && distSq < innerRadius * innerRadius) continue;
                    pushBlock({ type, color, rot: 0, lx: x, ly: y, lz: z });
                }
            }
        }

        function addColumn(lx, lz, color = ivory) {
            pushBlock({ type: "Pillar", color, rot: 0, lx, ly: 4, lz });
            pushBlock({ type: "Pillar", color, rot: 0, lx, ly: 7, lz });
            pushBlock({ type: "1x1", color: dark, rot: 0, lx, ly: 10, lz });
        }

        function addDrumColonnade() {
            const used = new Set();
            for (let i = 0; i < 24; i++) {
                const angle = (i / 24) * Math.PI * 2;
                let lx = Math.round(centerX + Math.cos(angle) * 9);
                let lz = Math.round(centerZ + Math.sin(angle) * 9);
                if (lz < 12) continue;

                if (lx === 6 && lz === 14) lx = 5;
                if (lx === 8 && lz === 12) lx = 7;

                const key = `${lx}|${lz}`;
                if (used.has(key)) continue;
                used.add(key);

                addColumn(lx, lz);
                if (i % 2 === 0) {
                    pushBlock({ type: "1x1", color: gold, rot: 0, lx, ly: 11, lz });
                }
            }
        }

        addFilledRectSafe(builder, 0, 0, 0, 28, 28, green);
        addFilledRectSafe(builder, 2, 1, 4, 24, 22, dark);
        addFilledRectSafe(builder, 4, 2, 2, 20, 8, dark);
        addFilledRectSafe(builder, 6, 3, 0, 16, 10, ivory);

        addDisk(3, 8.6, dark, -1, 10);
        addDisk(3, 10.2, dark, 8.7, 10, "Tile 2x2");

        for (let y = 4; y < 9; y++) {
            addDisk(y, 8.4, ivory, 6.2, 8);
        }

        addDisk(9, 8.1, ivory, -1, 10);
        addDisk(10, 7.4, dark, -1, 10);

        addDrumColonnade();

        [
            [6, 3],
            [8, 3],
            [10, 3],
            [12, 3],
            [15, 3],
            [17, 3],
            [19, 3],
            [21, 3],
            [9, 6],
            [12, 6],
            [15, 6],
            [18, 6],
            [12, 9],
            [15, 9],
        ].forEach(([lx, lz]) => addColumn(lx, lz));

        addFilledRectSafe(builder, 4, 11, 2, 20, 8, ivory);
        addFilledRectSafe(builder, 6, 12, 3, 16, 6, ivory);
        addFilledRectSafe(builder, 8, 13, 4, 12, 4, ivory);
        addFilledRectSafe(builder, 10, 14, 5, 8, 2, ivory);
        addFilledRectSafe(builder, 12, 15, 5, 4, 2, gold);

        [8, 10, 12, 14, 16, 18].forEach((lx) => {
            pushBlock({ type: "1x1", color: gold, rot: 0, lx, ly: 12, lz: 2 });
        });
        pushBlock({ type: "1x1", color: gold, rot: 0, lx: 13, ly: 16, lz: 5 });
        pushBlock({ type: "1x1", color: gold, rot: 0, lx: 14, ly: 16, lz: 5 });

        addDisk(11, 7.2, ivory, -1, 10);
        addDisk(12, 6.4, ivory, -1, 12);
        addDisk(13, 5.6, ivory, -1, 12);
        addDisk(14, 4.8, ivory, -1, 12);
        addDisk(15, 4, ivory, -1, 14);
        addDisk(16, 3.2, dark, -1, 14);

        [
            [13, 17],
            [14, 17],
            [13, 18],
            [14, 18],
        ].forEach(([lx, lz]) => {
            pushBlock({ type: "1x1", color: gold, rot: 0, lx, ly: 17, lz });
        });

        return builder.blocks;
    })(),
};

export default Panteao;
