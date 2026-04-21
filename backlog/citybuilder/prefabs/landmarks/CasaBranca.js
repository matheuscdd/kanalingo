import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";


const CasaBranca = {
    dx: 34,
    dy: 10,
    dz: 24,
    blocks: (function () {
        const builder = createPrefabBuilder();
        const green = "#2d6a3c";
        const ivory = "#f2eee5";
        const dark = "#67717c";
        const blue = "#90aabd";

        const main = { x0: 10, z0: 8, width: 14, depth: 10 };
        const leftWing = { x0: 2, z0: 10, width: 8, depth: 8 };
        const rightWing = { x0: 24, z0: 10, width: 8, depth: 8 };
        const portico = { x0: 11, z0: 4, width: 12, depth: 4 };

        const addColumn = (lx, y0, lz, height, color = ivory) => {
            addPillarStackSafe(builder, lx, y0, lz, height, color);
        };
        const addWindowRowFront = (xs, z, y) => {
            xs.forEach((x) => builder.add("Window", blue, 1, x, y, z));
        };
        const addWindowRowSide = (x, zs, y) => {
            zs.forEach((z) => builder.add("Window", blue, 0, x, y, z));
        };
        const addParapet = (x0, z0, width, depth, y, color = ivory) => {
            const x1 = x0 + width - 1;
            const z1 = z0 + depth - 1;
            for (let x = x0; x <= x1; x++) {
                builder.add("1x1", color, 0, x, y, z0);
                builder.add("1x1", color, 0, x, y, z1);
            }
            for (let z = z0 + 1; z < z1; z++) {
                builder.add("1x1", color, 0, x0, y, z);
                builder.add("1x1", color, 0, x1, y, z);
            }
        };
        const addTrimLine = (x0, z0, width, depth, y, color = ivory) => {
            const x1 = x0 + width - 1;
            const z1 = z0 + depth - 1;
            for (let x = x0; x <= x1; x += 2) {
                builder.add("1x1", color, 0, x, y, z0);
                builder.add("1x1", color, 0, x, y, z1);
            }
            for (let z = z0 + 1; z < z1; z += 2) {
                builder.add("1x1", color, 0, x0, y, z);
                builder.add("1x1", color, 0, x1, y, z);
            }
        };
        const addBody = (body, config) => {
            const x1 = body.x0 + body.width - 1;
            const z1 = body.z0 + body.depth - 1;
            addFilledRectSafe(builder, body.x0, 1, body.z0, body.width, body.depth, dark);
            config.frontRows.forEach(({ y, xs }) => addWindowRowFront(xs, body.z0, y));
            config.backRows.forEach(({ y, xs }) => addWindowRowFront(xs, z1, y));
            config.leftRows.forEach(({ y, zs }) => addWindowRowSide(body.x0, zs, y));
            config.rightRows.forEach(({ y, zs }) => addWindowRowSide(x1, zs, y));
            [ [body.x0, body.z0], [x1, body.z0], [body.x0, z1], [x1, z1] ].forEach(([lx, lz]) => addColumn(lx, 2, lz, 4));
            (config.extraPosts || []).forEach((post) => {
                addColumn(post[0], 2, post[1], post[2] || 4);
            });
            addTrimLine(body.x0, body.z0, body.width, body.depth, 6);
            addFilledRectSafe(builder, body.x0, 6, body.z0, body.width, body.depth, dark);
            addParapet(body.x0, body.z0, body.width, body.depth, 7);
        };

        addFilledRectSafe(builder, 0, 0, 0, 34, 24, green);
        addFilledRectSafe(builder, 14, 1, 0, 6, 2, ivory);
        addFilledRectSafe(builder, 13, 2, 2, 8, 2, ivory);

        addBody(leftWing, {
            frontRows: [ { y: 2, xs: [4, 6] }, { y: 4, xs: [4, 6] } ],
            backRows: [ { y: 2, xs: [4, 6] }, { y: 4, xs: [4, 6] } ],
            leftRows: [ { y: 2, zs: [12, 14] }, { y: 4, zs: [12, 14] } ],
            rightRows: [ { y: 2, zs: [12, 14] }, { y: 4, zs: [12, 14] } ],
        });

        addBody(rightWing, {
            frontRows: [ { y: 2, xs: [26, 28] }, { y: 4, xs: [26, 28] } ],
            backRows: [ { y: 2, xs: [26, 28] }, { y: 4, xs: [26, 28] } ],
            leftRows: [ { y: 2, zs: [12, 14] }, { y: 4, zs: [12, 14] } ],
            rightRows: [ { y: 2, zs: [12, 14] }, { y: 4, zs: [12, 14] } ],
        });

        addBody(main, {
            frontRows: [ { y: 2, xs: [12, 20] }, { y: 4, xs: [12, 14, 18, 20] } ],
            backRows: [ { y: 2, xs: [12, 14, 16, 18, 20] }, { y: 4, xs: [12, 14, 16, 18, 20] } ],
            leftRows: [ { y: 2, zs: [10, 12, 14] }, { y: 4, zs: [10, 12, 14] } ],
            rightRows: [ { y: 2, zs: [10, 12, 14] }, { y: 4, zs: [10, 12, 14] } ],
        });

        for (let y = 2; y < 4; y++) {
            builder.add("1x1", dark, 0, 16, y, main.z0);
            builder.add("1x1", dark, 0, 17, y, main.z0);
        }

        addFilledRectSafe(builder, portico.x0, 2, portico.z0, portico.width, portico.depth, ivory);
        for (let x = portico.x0; x <= portico.x0 + portico.width - 2; x += 2) {
            addColumn(x, 3, 5, 3);
        }
        addFilledRectSafe(builder, portico.x0, 6, portico.z0, portico.width, portico.depth, dark);
        addParapet(portico.x0, portico.z0, portico.width, portico.depth, 7);

        addFilledRectSafe(builder, 12, 2, 18, 10, 2, ivory);
        for (let x = 12; x <= 20; x += 4) {
            addColumn(x, 3, 19, 2);
        }

        [ [11, 10], [22, 10], [11, 15], [22, 15] ].forEach(([lx, lz]) => addColumn(lx, 7, lz, 2));

        return builder.blocks;
    })(),
};

export default CasaBranca;
