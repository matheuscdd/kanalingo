import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

const OliveSuburbanHouse = {
    dx: 20,
    dy: 12,
    dz: 16,
    blocks: (function () {
        const builder = createPrefabBuilder();

        const lawn       = "#2f6034";  // green lawn
        const facade     = "#6b8e23";  // olive green
        const roofCol    = "#5d3f2f";  // dark terracotta
        const trim       = "#e9dfcf";  // ivory (porch / columns)
        const win        = "#90aabd";  // window glass
        const chimneyCol = "#a89c8e";  // stone chimney

        // ── Lot / Lawn (y=0) ──────────────────────────────────────────────
        addFilledRectSafe(builder, 0, 0, 0, 20, 16, lawn);

        // ── Porch slab (x:6-13, z:1-2, y=1) ─────────────────────────────
        addFilledRectSafe(builder, 6, 1, 1, 8, 2, trim);

        // ── Windows (placed BEFORE walls so cells are reserved) ───────────
        // Ground floor – front face (z=3, rot:1, sy=2 → occupies y=2-3)
        builder.add("Window", win, 1, 4, 2, 3);
        builder.add("Window", win, 1, 14, 2, 3);
        // Ground floor – back face (z=12)
        builder.add("Window", win, 1, 4, 2, 12);
        builder.add("Window", win, 1, 8, 2, 12);
        builder.add("Window", win, 1, 14, 2, 12);
        // 2nd floor – front face (z=3, y=5)
        builder.add("Window", win, 1, 4, 5, 3);
        builder.add("Window", win, 1, 10, 5, 3);
        builder.add("Window", win, 1, 14, 5, 3);
        // 2nd floor – back face (z=12, y=5)
        builder.add("Window", win, 1, 4, 5, 12);
        builder.add("Window", win, 1, 14, 5, 12);

        // ── Main body (x:2-17, z:3-12, y:1-7) ────────────────────────────
        for (let y = 1; y <= 7; y++) {
            addFilledRectSafe(builder, 2, y, 3, 16, 10, facade);
        }

        // ── Porch columns (Pillar at y:2-4, z=1) ─────────────────────────
        addPillarStackSafe(builder, 6, 2, 1, 3, trim);
        addPillarStackSafe(builder, 13, 2, 1, 3, trim);

        // Entablature: beam above columns spanning the porch width (y=5, z=1)
        for (let x = 6; x <= 13; x++) {
            builder.add("1x1", trim, 0, x, 5, 1);
        }

        // ── Chimney (x=15, z=8, from y=8, height=4) ──────────────────────
        // Pillar at y=8 (covers y=8-10) + 1x1 at y=11
        addPillarStackSafe(builder, 15, 8, 8, 4, chimneyCol);

        // ── Roof: 4-step symmetrical pitched roof ────────────────────────
        // Body front face at z=3, body back face at z=12.
        // Roof starts: front_z0=3, back_z0=11  (11-3 = 8 = 2*4 steps → closes exactly at step 3)
        // At each step s: front lz = 3+s, back lz = 11-s (Roof 1x2 sz=2, so covers lz..lz+1)
        // Gable end: lateral 1x1 at x=2 and x=17 for z=(5+s)..(10-s) at each step
        for (let step = 0; step < 4; step++) {
            const y = 8 + step;
            for (let x = 2; x < 18; x += 2) {
                builder.add("Roof 1x2", roofCol, 0, x, y, 3 + step);
                builder.add("Roof 1x2", roofCol, 2, x, y, 11 - step);
            }
            for (let z = 5 + step; z <= 10 - step; z++) {
                builder.add("1x1", facade, 0, 2, y, z);
                builder.add("1x1", facade, 0, 17, y, z);
            }
        }

        return builder.blocks;
    })(),
};

export default OliveSuburbanHouse;
