import {
    addEllipseBandSafe,
    addEllipseOfBlocksSafe,
    addFilledRectSafe,
    addPillarStackSafe,
    createPrefabBuilder,
    getEllipsePoints,
} from "../shared/core.js";

function getRoofRotation(point) {
    const angle = (point.angle + Math.PI * 2) % (Math.PI * 2);

    if (angle >= Math.PI / 4 && angle < (3 * Math.PI) / 4) return 1;
    if (angle >= (3 * Math.PI) / 4 && angle < (5 * Math.PI) / 4) return 2;
    if (angle >= (5 * Math.PI) / 4 && angle < (7 * Math.PI) / 4) return 3;
    return 0;
}

function buildColosseuReal() {
    const builder = createPrefabBuilder();
    const center = { x: 17, z: 14 };
    const palette = {
        travertine: "#f4f4f4",
        limestone: "#d8c39a",
        sand: "#c9a76d",
        sandShadow: "#ae8e57",
        shadow: "#8b6840",
        dark: "#111111",
    };

    function addBlock(type, color, lx, ly, lz, rot = 0) {
        builder.add(type, color, rot, lx, ly, lz);
    }

    function addEntryStairs(isNorth) {
        for (let step = 0; step < 3; step++) {
            const width = 10 + step * 4;
            const x0 = Math.floor((34 - width) / 2);
            const z0 = isNorth ? step * 2 : 26 - step * 2;
            const color = step === 1 ? palette.travertine : palette.limestone;
            addFilledRectSafe(builder, x0, 1 + step, z0, width, 2, color);
        }
    }

    function addArenaAndSeating() {
        addEllipseBandSafe(builder, center, { x: 15, z: 12 }, { y: 0, color: palette.dark, type: "2x2" });
        addEllipseBandSafe(builder, center, { x: 15, z: 11.8 }, { y: 1, inner: { x: 13.4, z: 10.2 }, color: palette.limestone, type: "2x2" });
        addEllipseBandSafe(builder, center, { x: 5.8, z: 4.2 }, { y: 1, color: palette.sand, type: "Tile 2x2" });
        addEllipseBandSafe(builder, center, { x: 6.8, z: 5 }, { y: 1, inner: { x: 5.8, z: 4.2 }, color: palette.sandShadow, type: "2x2" });

        [
            { y: 2, outer: { x: 11.2, z: 8.4 }, inner: { x: 8.8, z: 6.6 }, color: palette.limestone },
            { y: 3, outer: { x: 10.4, z: 7.8 }, inner: { x: 8, z: 6 }, color: palette.travertine },
            { y: 4, outer: { x: 9.6, z: 7.2 }, inner: { x: 7.2, z: 5.4 }, color: palette.limestone },
            { y: 5, outer: { x: 8.8, z: 6.6 }, inner: { x: 6.4, z: 4.8 }, color: palette.travertine },
        ].forEach((tier) => {
            addEllipseBandSafe(builder, center, tier.outer, {
                y: tier.y,
                inner: tier.inner,
                color: tier.color,
                type: "2x2",
            });
        });

        addEllipseOfBlocksSafe(builder, "1x1", palette.shadow, center, { x: 6.8, z: 5 }, {
            y: 2,
            count: 24,
            offset: 0.25,
        });
        addEllipseBandSafe(builder, center, { x: 10.8, z: 7.8 }, {
            y: 8,
            inner: { x: 8.8, z: 6.2 },
            color: palette.limestone,
            type: "Tile 2x2",
        });
        addEllipseBandSafe(builder, center, { x: 10, z: 7 }, {
            y: 12,
            inner: { x: 8, z: 5.4 },
            color: palette.travertine,
            type: "Tile 2x2",
        });
    }

    function addArcadeLevel(baseY, config) {
        const supports = getEllipsePoints(center, config.supportRadii, {
            count: config.supportCount,
            offset: config.supportOffset ?? 0.5,
        });

        for (let y = baseY; y < baseY + 3; y++) {
            addEllipseBandSafe(builder, center, config.wallOuter, {
                y,
                inner: config.wallInner,
                color: y === baseY ? config.baseColor : config.wallColor,
                type: "2x2",
            });
        }

        supports.forEach((point) => {
            addPillarStackSafe(builder, point.lx, baseY, point.lz, 4, config.columnColor);
        });

        addEllipseOfBlocksSafe(builder, "1x1", config.trimColor, center, config.trimRadii, {
            y: baseY + 3,
            count: config.trimCount,
            offset: config.trimOffset ?? 0.25,
        });
        addEllipseOfBlocksSafe(builder, "Roof 1x2", config.trimColor, center, config.roofRadii, {
            y: baseY + 3,
            count: config.roofCount,
            offset: 0.5,
            rotFn: getRoofRotation,
        });
    }

    function addAtticLevel() {
        for (let y = 13; y < 16; y++) {
            addEllipseBandSafe(builder, center, { x: 14.6, z: 11.2 }, {
                y,
                inner: { x: 12.2, z: 9.2 },
                color: y === 13 ? palette.limestone : palette.travertine,
                type: "2x2",
            });
        }

        const pilasters = getEllipsePoints(center, { x: 14, z: 10.6 }, {
            count: 24,
            offset: 0.25,
        });

        pilasters.forEach((point) => {
            addPillarStackSafe(builder, point.lx, 13, point.lz, 3, palette.limestone);
        });

        addEllipseOfBlocksSafe(builder, "1x1", palette.shadow, center, { x: 13.2, z: 9.8 }, {
            y: 16,
            count: 36,
            offset: 0.1,
        });
        addEllipseOfBlocksSafe(builder, "Roof 1x2", palette.limestone, center, { x: 14.8, z: 11.4 }, {
            y: 16,
            count: 30,
            offset: 0.5,
            rotFn: getRoofRotation,
        });
        addEllipseOfBlocksSafe(builder, "1x1", palette.limestone, center, { x: 13.8, z: 10.4 }, {
            y: 17,
            count: 40,
            offset: 0.35,
        });
    }

    addEntryStairs(true);
    addEntryStairs(false);
    addArenaAndSeating();

    addArcadeLevel(1, {
        wallOuter: { x: 13.6, z: 10.2 },
        wallInner: { x: 12, z: 8.8 },
        supportRadii: { x: 14.4, z: 11 },
        supportCount: 34,
        supportOffset: 0,
        baseColor: palette.limestone,
        wallColor: palette.shadow,
        columnColor: palette.travertine,
        trimColor: palette.limestone,
        trimRadii: { x: 13.8, z: 10.4 },
        trimCount: 42,
        roofRadii: { x: 13, z: 9.6 },
        roofCount: 26,
    });
    addArcadeLevel(5, {
        wallOuter: { x: 13, z: 9.6 },
        wallInner: { x: 11.6, z: 8.2 },
        supportRadii: { x: 13.8, z: 10.4 },
        supportCount: 30,
        supportOffset: 0.5,
        baseColor: palette.travertine,
        wallColor: palette.shadow,
        columnColor: palette.limestone,
        trimColor: palette.travertine,
        trimRadii: { x: 13.2, z: 9.8 },
        trimCount: 36,
        roofRadii: { x: 12.4, z: 9 },
        roofCount: 24,
    });
    addArcadeLevel(9, {
        wallOuter: { x: 12.4, z: 9 },
        wallInner: { x: 11, z: 7.6 },
        supportRadii: { x: 13.2, z: 9.8 },
        supportCount: 26,
        supportOffset: 0.25,
        baseColor: palette.limestone,
        wallColor: palette.shadow,
        columnColor: palette.travertine,
        trimColor: palette.limestone,
        trimRadii: { x: 12.6, z: 9.2 },
        trimCount: 32,
        roofRadii: { x: 11.8, z: 8.4 },
        roofCount: 22,
    });

    addAtticLevel();

    [
        [16, 2, 1],
        [17, 2, 1],
        [16, 2, 26],
        [17, 2, 26],
        [1, 2, 13],
        [1, 2, 14],
        [32, 2, 13],
        [32, 2, 14],
    ].forEach(([lx, ly, lz]) => addBlock("1x1", palette.dark, lx, ly, lz));

    return builder.blocks;
}

const ColosseuReal = {
    dx: 34,
    dy: 18,
    dz: 28,
    blocks: buildColosseuReal(),
};

export default ColosseuReal;
