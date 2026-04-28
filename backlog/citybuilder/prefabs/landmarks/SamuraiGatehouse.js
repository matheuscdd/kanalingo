import { createPrefabBuilder, addFilledRectSafe, addPillarStackSafe } from "../shared/core.js";

const SamuraiGatehouse = {
    dx: 48,
    dy: 28,
    dz: 30,
    blocks: (function () {
        const builder = createPrefabBuilder();

        const palette = {
            ground: "#788d61",
            stoneDark: "#4f5761",
            stone: "#6a737c",
            stoneLight: "#c1c9d0",
            wall: "#f4f4f4",
            wood: "#8b5a2b",
            woodDark: "#684a2f",
            roof: "#111111",
            roofDark: "#2a1e1b",
            balcony: "#e3000b",
            gold: "#f2cd37",
            glass: "#90aabd",
            banner: "#748799",
            path: "#6f5843",
            bamboo: "#9bb980",
            bambooLeaf: "#237841",
            cart: "#7b5234",
        };

        const boxes = {
            site: { x0: 0, z0: 0, width: 48, depth: 30 },
            leftPlinth: { x0: 2, z0: 8, width: 22, depth: 18 },
            gatePlinth: { x0: 22, z0: 12, width: 10, depth: 10 },
            rightPlinth: { x0: 32, z0: 10, width: 14, depth: 16 },
            leftHall: { x0: 4, z0: 12, width: 18, depth: 10 },
            leftRoof: { x0: 2, z0: 10, width: 20, depth: 14 },
            balconyDeck: { x0: 7, z0: 9, width: 14, depth: 10 },
            upperPavilion: { x0: 9, z0: 10, width: 10, depth: 8 },
            topRoof: { x0: 7, z0: 8, width: 14, depth: 12 },
            gateCore: { x0: 23, z0: 13, width: 8, depth: 8 },
            coveredWalkway: { x0: 22, z0: 15, width: 12, depth: 4 },
            walkwayRoof: { x0: 22, z0: 14, width: 12, depth: 6 },
            rightHall: { x0: 34, z0: 12, width: 10, depth: 10 },
            rightRoof: { x0: 34, z0: 10, width: 12, depth: 14 },
        };

        function addWindowRing(x0, z0, width, depth, y, windowXs, windowZs) {
            const x1 = x0 + width - 1;
            const z1 = z0 + depth - 1;

            windowXs.forEach((lx) => {
                builder.add("Window", palette.glass, 1, lx, y, z0);
                builder.add("Window", palette.glass, 1, lx, y, z1);
            });

            windowZs.forEach((lz) => {
                builder.add("Window", palette.glass, 0, x0, y, lz);
                builder.add("Window", palette.glass, 0, x1, y, lz);
            });
        }

        function addFacadePosts(box, y0, height, color = palette.woodDark, extraPoints = []) {
            const x1 = box.x0 + box.width - 1;
            const z1 = box.z0 + box.depth - 1;
            const points = [
                [box.x0, box.z0],
                [x1, box.z0],
                [box.x0, z1],
                [x1, z1],
                ...extraPoints,
            ];

            points.forEach(([lx, lz]) => addPillarStackSafe(builder, lx, y0, lz, height, color));
        }

        function addTrimLine(box, y, color = palette.wood) {
            const x1 = box.x0 + box.width - 1;
            const z1 = box.z0 + box.depth - 1;

            for (let x = box.x0 + 1; x < x1; x += 2) {
                builder.add("1x1", color, 0, x, y, box.z0);
                builder.add("1x1", color, 0, x, y, z1);
            }

            for (let z = box.z0 + 1; z < z1; z += 2) {
                builder.add("1x1", color, 0, box.x0, y, z);
                builder.add("1x1", color, 0, x1, y, z);
            }
        }

        function addStonePlinth(box, height) {
            const insetPlan = [
                { side: 0, front: 0, back: 0, color: palette.stoneDark },
                { side: 2, front: 2, back: 0, color: palette.stone },
                { side: 2, front: 4, back: 2, color: palette.stone },
                { side: 4, front: 6, back: 2, color: palette.stoneLight },
            ];

            for (let layer = 0; layer < height; layer++) {
                const plan = insetPlan[Math.min(layer, insetPlan.length - 1)];
                const width = box.width - plan.side * 2;
                const depth = box.depth - plan.front - plan.back;

                if (width < 2 || depth < 2) continue;

                addFilledRectSafe(
                    builder,
                    box.x0 + plan.side,
                    layer + 1,
                    box.z0 + plan.front,
                    width,
                    depth,
                    plan.color,
                );
            }
        }

        function addHall(box, floorY, bodyHeight, options = {}) {
            const windowRows = options.windowRows || [];
            const windowXs = options.windowXs || [];
            const windowZs = options.windowZs || [];
            const extraPosts = options.extraPosts || [];
            const floorColor = options.floorColor || palette.wood;
            const wallColor = options.wallColor || palette.wall;

            windowRows.forEach((rowY) => addWindowRing(box.x0, box.z0, box.width, box.depth, rowY, windowXs, windowZs));

            addFilledRectSafe(builder, box.x0, floorY, box.z0, box.width, box.depth, floorColor);

            for (let y = floorY + 1; y < floorY + bodyHeight; y++) {
                addFilledRectSafe(builder, box.x0 + 1, y, box.z0 + 1, box.width - 2, box.depth - 2, wallColor);
            }

            addFacadePosts(box, floorY + 1, bodyHeight - 1, palette.woodDark, extraPosts);
            addTrimLine(box, floorY + 1, palette.wood);
            addTrimLine(box, floorY + bodyHeight - 1, palette.wood);
        }

        function addRoofStage(box, y, ridgeAxis = "x", levels = 2) {
            let topBox = null;

            for (let layer = 0; layer < levels; layer++) {
                const roofBox = {
                    x0: box.x0 + layer,
                    z0: box.z0 + layer,
                    width: box.width - layer * 2,
                    depth: box.depth - layer * 2,
                };

                if (roofBox.width < 2 || roofBox.depth < 2) break;
                topBox = roofBox;

                if (roofBox.width > 2 && roofBox.depth > 2) {
                    addFilledRectSafe(builder, roofBox.x0 + 1, y + layer, roofBox.z0 + 1, roofBox.width - 2, roofBox.depth - 2, palette.roofDark);
                }

                const x1 = roofBox.x0 + roofBox.width - 1;
                const z1 = roofBox.z0 + roofBox.depth - 1;

                for (let x = roofBox.x0; x <= x1 - 1; x += 2) {
                    builder.add("Roof 1x2", palette.roof, 0, x, y + layer, roofBox.z0);
                    builder.add("Roof 1x2", palette.roof, 2, x, y + layer, z1 - 1);
                }

                for (let z = roofBox.z0 + 2; z <= z1 - 2; z += 2) {
                    builder.add("Roof 1x2", palette.roof, 1, roofBox.x0, y + layer, z);
                    builder.add("Roof 1x2", palette.roof, 3, x1 - 1, y + layer, z);
                }
            }

            if (!topBox) return;

            if (ridgeAxis === "x") {
                const ridgeZ = topBox.z0 + Math.floor((topBox.depth - 2) / 2);
                for (let x = topBox.x0 + 1; x <= topBox.x0 + topBox.width - 3; x += 4) {
                    builder.add("Tile 2x2", palette.stoneLight, 0, x, y + levels - 1, ridgeZ);
                }
                builder.add("1x1", palette.gold, 0, topBox.x0 + 1, y + levels - 1, ridgeZ);
                builder.add("1x1", palette.gold, 0, topBox.x0 + topBox.width - 2, y + levels - 1, ridgeZ);
                return;
            }

            const ridgeX = topBox.x0 + Math.floor((topBox.width - 2) / 2);
            for (let z = topBox.z0 + 1; z <= topBox.z0 + topBox.depth - 3; z += 4) {
                builder.add("Tile 2x2", palette.stoneLight, 0, ridgeX, y + levels - 1, z);
            }
            builder.add("1x1", palette.gold, 0, ridgeX, y + levels - 1, topBox.z0 + 1);
            builder.add("1x1", palette.gold, 0, ridgeX, y + levels - 1, topBox.z0 + topBox.depth - 2);
        }

        function addGable(box, baseY, height, face) {
            const z = face === "front" ? box.z0 + 2 : box.z0 + box.depth - 3;

            for (let step = 0; step < height; step++) {
                const startX = box.x0 + 2 + step * 2;
                const span = box.width - 4 - step * 4;
                const y = baseY + step;

                if (span < 1) break;

                for (let x = startX; x < startX + span; x++) {
                    builder.add("1x1", palette.wall, 0, x, y, z);
                }

                builder.add("1x1", palette.woodDark, 0, startX, y, z);
                builder.add("1x1", palette.woodDark, 0, startX + span - 1, y, z);
            }

            const midX = box.x0 + Math.floor(box.width / 2);
            builder.add("1x1", palette.woodDark, 0, midX, baseY + 1, z);
            builder.add("1x1", palette.woodDark, 0, midX, baseY + 2, z);
        }

        function addBalconyRail(box, y) {
            const x1 = box.x0 + box.width - 1;
            const z1 = box.z0 + box.depth - 1;

            for (const [lx, lz] of [[box.x0, box.z0], [x1, box.z0], [box.x0, z1], [x1, z1]]) {
                addPillarStackSafe(builder, lx, y, lz, 2, palette.balcony);
            }

            for (let x = box.x0 + 1; x < x1; x++) {
                builder.add("1x1", palette.balcony, 0, x, y + 1, box.z0);
                builder.add("1x1", palette.balcony, 0, x, y + 1, z1);
            }

            for (let z = box.z0 + 1; z < z1; z++) {
                builder.add("1x1", palette.balcony, 0, box.x0, y + 1, z);
                builder.add("1x1", palette.balcony, 0, x1, y + 1, z);
            }
        }

        function addBanner(lx, y0, lz, height) {
            addPillarStackSafe(builder, lx, y0, lz, height, palette.woodDark);

            for (let y = y0 + 2; y < y0 + height; y++) {
                builder.add("1x1", palette.banner, 0, lx + 1, y, lz);
            }

            builder.add("1x1", palette.wall, 0, lx + 1, y0 + Math.floor(height / 2), lz);
        }

        function addBambooCluster(x0, z0) {
            const stems = [
                { dx: 0, dz: 0, height: 5 },
                { dx: 1, dz: 1, height: 4 },
                { dx: 2, dz: 0, height: 6 },
            ];

            stems.forEach((stem) => {
                addPillarStackSafe(builder, x0 + stem.dx, 1, z0 + stem.dz, stem.height, palette.bamboo);
                builder.add("1x1", palette.bambooLeaf, 0, x0 + stem.dx - 1, stem.height, z0 + stem.dz);
                builder.add("1x1", palette.bambooLeaf, 0, x0 + stem.dx + 1, stem.height, z0 + stem.dz + 1);
            });
        }

        addFilledRectSafe(builder, boxes.site.x0, 0, boxes.site.z0, boxes.site.width, boxes.site.depth, palette.ground);
        addFilledRectSafe(builder, 18, 1, 24, 12, 4, palette.path);
        addFilledRectSafe(builder, 16, 1, 26, 16, 2, palette.path);

        addStonePlinth(boxes.leftPlinth, 4);
        addStonePlinth(boxes.gatePlinth, 3);
        addStonePlinth(boxes.rightPlinth, 4);

        addFilledRectSafe(builder, 20, 2, 24, 8, 2, palette.stoneLight);
        addFilledRectSafe(builder, 22, 3, 22, 4, 2, palette.stoneLight);

        addHall(boxes.leftHall, 5, 4, {
            windowRows: [6],
            windowXs: [7, 12, 17],
            windowZs: [14, 17],
            extraPosts: [[4, 16], [21, 16]],
        });

        addHall(boxes.rightHall, 5, 4, {
            windowRows: [6],
            windowXs: [36, 40],
            windowZs: [14, 17],
            extraPosts: [[34, 16], [43, 16]],
        });

        for (let y = 4; y <= 8; y++) {
            addFilledRectSafe(builder, 23, y, 13, 2, 8, palette.wall);
            addFilledRectSafe(builder, 29, y, 13, 2, 8, palette.wall);
        }

        for (let y = 4; y <= 7; y++) {
            addFilledRectSafe(builder, 25, y, 19, 4, 2, palette.wall);
        }

        addPillarStackSafe(builder, 23, 4, 13, 5, palette.woodDark);
        addPillarStackSafe(builder, 30, 4, 13, 5, palette.woodDark);
        addPillarStackSafe(builder, 23, 4, 20, 5, palette.woodDark);
        addPillarStackSafe(builder, 30, 4, 20, 5, palette.woodDark);
        addFilledRectSafe(builder, 23, 9, 13, 8, 2, palette.woodDark);
        addBanner(22, 4, 16, 6);
        addBanner(42, 4, 18, 6);

        addPillarStackSafe(builder, 22, 1, 15, 9, palette.woodDark);
        addPillarStackSafe(builder, 22, 1, 18, 9, palette.woodDark);
        addPillarStackSafe(builder, 33, 1, 15, 9, palette.woodDark);
        addPillarStackSafe(builder, 33, 1, 18, 9, palette.woodDark);
        addPillarStackSafe(builder, 27, 4, 15, 6, palette.woodDark);
        addPillarStackSafe(builder, 27, 4, 18, 6, palette.woodDark);
        addFilledRectSafe(builder, boxes.coveredWalkway.x0, 10, boxes.coveredWalkway.z0, boxes.coveredWalkway.width, boxes.coveredWalkway.depth, palette.wood);

        for (let z = boxes.coveredWalkway.z0; z < boxes.coveredWalkway.z0 + boxes.coveredWalkway.depth; z += 3) {
            addPillarStackSafe(builder, 22, 11, z, 2, palette.wall);
            addPillarStackSafe(builder, 33, 11, z, 2, palette.wall);
        }

        addFilledRectSafe(builder, boxes.balconyDeck.x0, 11, boxes.balconyDeck.z0, boxes.balconyDeck.width, boxes.balconyDeck.depth, palette.woodDark);
        addBalconyRail(boxes.balconyDeck, 12);

        addHall(boxes.upperPavilion, 12, 5, {
            windowRows: [13, 15],
            windowXs: [11, 15],
            windowZs: [12, 15],
            extraPosts: [[9, 14], [18, 14]],
            floorColor: palette.woodDark,
        });

        addRoofStage(boxes.leftRoof, 9, "x", 2);
        addGable(boxes.leftRoof, 11, 3, "front");
        addGable(boxes.leftRoof, 11, 3, "back");

        addRoofStage(boxes.topRoof, 17, "x", 2);
        addGable(boxes.topRoof, 19, 3, "front");
        addGable(boxes.topRoof, 19, 3, "back");

        addRoofStage(boxes.rightRoof, 9, "x", 2);
        addGable(boxes.rightRoof, 11, 3, "front");
        addGable(boxes.rightRoof, 11, 3, "back");

        addRoofStage(boxes.walkwayRoof, 12, "z", 1);

        addPillarStackSafe(builder, 13, 19, 13, 2, palette.roofDark);
        addPillarStackSafe(builder, 17, 19, 13, 2, palette.roofDark);
        addPillarStackSafe(builder, 38, 11, 14, 2, palette.roofDark);
        addPillarStackSafe(builder, 42, 11, 14, 2, palette.roofDark);
        builder.add("1x1", palette.gold, 0, 13, 21, 13);
        builder.add("1x1", palette.gold, 0, 17, 21, 13);
        builder.add("1x1", palette.gold, 0, 38, 13, 14);
        builder.add("1x1", palette.gold, 0, 42, 13, 14);

        addBambooCluster(4, 25);
        addBambooCluster(42, 24);
        addFilledRectSafe(builder, 36, 1, 22, 4, 2, palette.cart);
        builder.add("1x1", palette.cart, 0, 35, 1, 23);
        builder.add("1x1", palette.cart, 0, 40, 1, 24);
        builder.add("1x1", palette.stoneDark, 0, 35, 0, 23);
        builder.add("1x1", palette.stoneDark, 0, 39, 0, 24);
        builder.add("1x1", palette.bambooLeaf, 0, 9, 1, 25);
        builder.add("1x1", palette.bambooLeaf, 0, 10, 1, 25);
        builder.add("1x1", palette.bambooLeaf, 0, 38, 1, 23);
        builder.add("1x1", palette.bambooLeaf, 0, 39, 1, 23);

        return builder.blocks;
    })(),
};

export default SamuraiGatehouse;