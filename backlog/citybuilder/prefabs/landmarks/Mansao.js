const Mansao = {
        dx: 24,
    dy: 6,
    dz: 19,
        blocks: (function () {
            const b = [];
            const lawn = "#2f6034";
            const pool = "#7e9fb3";
            const facade = "#efe2c8";
            const roof = "#6d513b";
            for (let x = 0; x < 24; x += 2) {
                for (let z = 0; z < 16; z += 4) {
                    b.push({ type: "2x4", color: lawn, rot: 0, lx: x, ly: 0, lz: z });
                }
            }
            for (let x = 8; x < 16; x += 2) {
                for (let z = 1; z < 5; z += 2) {
                    b.push({ type: "Tile 2x2", color: pool, rot: 0, lx: x, ly: 1, lz: z });
                }
            }
            for (let y = 1; y <= 4; y++) {
                for (let x = 4; x < 20; x++) {
                    if (x > 9 && x < 14 && y < 3) continue;
                    b.push({ type: "1x1", color: facade, rot: 0, lx: x, ly: y, lz: 8 });
                    b.push({ type: "1x1", color: facade, rot: 0, lx: x, ly: y, lz: 14 });
                }
                for (let z = 9; z < 14; z++) {
                    b.push({ type: "1x1", color: facade, rot: 0, lx: 4, ly: y, lz: z });
                    b.push({ type: "1x1", color: facade, rot: 0, lx: 19, ly: y, lz: z });
                }
            }
            b.push({ type: "Pillar", color: facade, rot: 0, lx: 9, ly: 1, lz: 6 });
            b.push({ type: "Pillar", color: facade, rot: 0, lx: 14, ly: 1, lz: 6 });
            for (let x = 2; x < 22; x += 2) {
                for (let z = 7; z < 16; z += 4) {
                    b.push({ type: "2x4", color: roof, rot: 0, lx: x, ly: 5, lz: z });
                }
            }
            b.push({ type: "2x4", color: roof, rot: 1, lx: 9, ly: 4, lz: 5 });
            b.push({ type: "2x4", color: roof, rot: 1, lx: 13, ly: 4, lz: 5 });
            return b;
        })(),
    };

export default Mansao;
