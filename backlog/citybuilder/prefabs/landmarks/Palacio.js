const Palacio = {
    dx: 18,
        dy: 12,
    dz: 11,
        blocks: (function () {
            const b = [];
            const sandstone = "#d3b08a";
            const stoneShadow = "#9d8166";
            const gold = "#d4af37";
            for (let x = 2; x < 14; x += 2) b.push({ type: "2x4", color: stoneShadow, rot: 1, lx: x, ly: 0, lz: 1 });
            for (let x = 2; x < 14; x += 2) b.push({ type: "2x4", color: stoneShadow, rot: 1, lx: x, ly: 1, lz: 3 });
            for (let x = 0; x < 16; x += 2) {
                for (let z = 5; z < 11; z += 2) {
                    b.push({ type: "2x2", color: sandstone, rot: 0, lx: x, ly: 2, lz: z });
                }
            }
            for (let x = 1; x < 15; x += 2) {
                b.push({ type: "Pillar", color: sandstone, rot: 0, lx: x, ly: 3, lz: 5 });
                b.push({ type: "Pillar", color: sandstone, rot: 0, lx: x, ly: 6, lz: 5 });
            }
            for (let y = 3; y < 9; y++) {
                for (let x = 0; x < 16; x += 2) {
                    b.push({ type: "2x2", color: sandstone, rot: 0, lx: x, ly: y, lz: 9 });
                }
            }
            for (let x = 0; x < 16; x += 2) {
                b.push({ type: "2x4", color: stoneShadow, rot: 1, lx: x, ly: 9, lz: 4 });
                b.push({ type: "2x4", color: stoneShadow, rot: 1, lx: x, ly: 9, lz: 6 });
                b.push({ type: "2x4", color: stoneShadow, rot: 1, lx: x, ly: 9, lz: 8 });
            }
            b.push({ type: "2x4", color: gold, rot: 1, lx: 6, ly: 10, lz: 6 });
            b.push({ type: "2x4", color: gold, rot: 1, lx: 8, ly: 10, lz: 6 });
            b.push({ type: "2x2", color: gold, rot: 0, lx: 7, ly: 11, lz: 7 });
            return b;
        })(),
    };

export default Palacio;
