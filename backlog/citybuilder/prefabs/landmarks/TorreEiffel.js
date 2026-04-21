import { addFilledRectSafe, addPillarStackSafe, createPrefabBuilder } from "../shared/core.js";

const EIFFEL_DX = 64;
const EIFFEL_DY = 84;
const EIFFEL_DZ = 64;

function buildTorreEiffel() {
    const builder = createPrefabBuilder();
    const palette = {
        footingShadow: "#4e3f30",
        footingMid: "#675441",
        footingLight: "#826c55",
        walkway: "#6f5d49",
        walkwayTrim: "#8a745b",
        ironDark: "#5b4a37",
        ironMid: "#745f49",
        ironLight: "#8f775d",
        platformShadow: "#5f4c38",
        platformMid: "#77614a",
        platformLight: "#92785d",
        brass: "#d7a548",
        beacon: "#f4f0da",
    };

    function addBlock(type, color, lx, ly, lz, rot = 0) {
        builder.add(type, color, rot, lx, ly, lz);
    }

    function addRect(x0, y, z0, width, depth, color) {
        addFilledRectSafe(builder, x0, y, z0, width, depth, color);
    }

    function addStud(lx, ly, lz, color) {
        addBlock("1x1", color, lx, ly, lz);
    }

    function addPlate(lx, ly, lz, color) {
        addBlock("2x2", color, lx, ly, lz);
    }

    function addPillar(lx, y0, lz, height, color) {
        addPillarStackSafe(builder, lx, y0, lz, height, color);
    }

    function addLineX(x0, x1, y, z, color, step = 1) {
        for (let x = x0; x <= x1; x += step) {
            addStud(x, y, z, color);
        }
    }

    function addLineZ(x, y, z0, z1, color, step = 1) {
        for (let z = z0; z <= z1; z += step) {
            addStud(x, y, z, color);
        }
    }

    function addPerimeter(x0, z0, width, depth, y, color, step = 1) {
        const x1 = x0 + width - 1;
        const z1 = z0 + depth - 1;

        addLineX(x0, x1, y, z0, color, step);
        addLineX(x0, x1, y, z1, color, step);
        addLineZ(x0, y, z0, z1, color, step);
        addLineZ(x1, y, z0, z1, color, step);
    }

    function addDiagonalChain(from, to, color) {
        const steps = Math.max(
            Math.abs(to.lx - from.lx),
            Math.abs(to.ly - from.ly),
            Math.abs(to.lz - from.lz),
        );

        if (steps === 0) {
            addStud(from.lx, from.ly, from.lz, color);
            return;
        }

        for (let step = 0; step <= steps; step++) {
            const t = step / steps;
            addStud(
                Math.round(from.lx + (to.lx - from.lx) * t),
                Math.round(from.ly + (to.ly - from.ly) * t),
                Math.round(from.lz + (to.lz - from.lz) * t),
                color,
            );
        }
    }

    function addFootingsAndWalkways() {
        const footings = [
            { x0: 0, z0: 0 },
            { x0: 50, z0: 0 },
            { x0: 0, z0: 50 },
            { x0: 50, z0: 50 },
        ];

        footings.forEach(({ x0, z0 }) => {
            addRect(x0, 0, z0, 14, 14, palette.footingShadow);
            addRect(x0 + 1, 1, z0 + 1, 12, 12, palette.footingMid);
            addRect(x0 + 2, 2, z0 + 2, 10, 10, palette.footingLight);
            addRect(x0 + 4, 3, z0 + 4, 6, 6, palette.walkway);
            addPerimeter(x0 + 4, z0 + 4, 6, 6, 4, palette.walkwayTrim, 2);
        });

        addRect(12, 3, 12, 40, 4, palette.walkway);
        addRect(12, 3, 48, 40, 4, palette.walkway);
        addRect(12, 3, 16, 4, 32, palette.walkway);
        addRect(48, 3, 16, 4, 32, palette.walkway);

        addRect(30, 4, 12, 4, 40, palette.walkwayTrim);
        addRect(12, 4, 30, 40, 4, palette.walkwayTrim);
        addPerimeter(14, 14, 36, 36, 4, palette.ironDark, 4);

        [
            [31, 5, 12],
            [31, 5, 51],
            [12, 5, 31],
            [51, 5, 31],
        ].forEach(([lx, ly, lz]) => addStud(lx, ly, lz, palette.brass));
    }

    function addLegBox(x0, z0, size, y, phase) {
        if (size <= 2) {
            addPlate(x0, y, z0, (y + phase) % 2 === 0 ? palette.ironLight : palette.ironMid);
            return;
        }

        const x1 = x0 + size - 1;
        const z1 = z0 + size - 1;
        const midX = Math.floor((x0 + x1) / 2);
        const midZ = Math.floor((z0 + z1) / 2);
        const primary = phase === 0 ? palette.ironMid : palette.ironDark;
        const secondary = phase === 0 ? palette.ironLight : palette.ironMid;
        const centerColor = (y + phase) % 5 === 0 ? palette.brass : secondary;

        if ((y + phase) % 2 === 0) {
            addPerimeter(x0, z0, size, size, y, primary, 1);

            for (let offset = 1; offset < size - 1; offset++) {
                addStud(x0 + offset, y, z0 + offset, secondary);
                addStud(x0 + offset, y, z1 - offset, secondary);
            }
        } else {
            addLineX(x0, x1, y, midZ, secondary, 1);
            addLineZ(midX, y, z0, z1, secondary, 1);

            if (size >= 4) {
                addPerimeter(x0 + 1, z0 + 1, size - 2, size - 2, y, primary, 1);
            }
        }

        addStud(midX, y, midZ, centerColor);
    }

    function addCrossBraces(profile, y, color) {
        const innerLeft = profile.left + profile.size - 1;
        const innerRight = profile.right;
        const innerFront = profile.front + profile.size - 1;
        const innerBack = profile.back;

        addDiagonalChain({ lx: innerLeft, ly: y, lz: innerFront }, { lx: innerRight, ly: y, lz: innerBack }, color);
        addDiagonalChain({ lx: innerRight, ly: y, lz: innerFront }, { lx: innerLeft, ly: y, lz: innerBack }, color);
    }

    function addLegCluster(profile, y) {
        [
            [profile.left, profile.front, 0],
            [profile.right, profile.front, 1],
            [profile.left, profile.back, 1],
            [profile.right, profile.back, 0],
        ].forEach(([x0, z0, phase]) => addLegBox(x0, z0, profile.size, y, phase));
    }

    function addTowerStage(yStart, yEnd, profileForY, options = {}) {
        const { crossBraceEvery = 0, crossBraceOffset = 0, crossBraceColor = palette.ironDark } = options;

        for (let y = yStart; y <= yEnd; y++) {
            const profile = profileForY(y);
            addLegCluster(profile, y);

            if (crossBraceEvery && (y - yStart) % crossBraceEvery === crossBraceOffset) {
                addCrossBraces(profile, y, crossBraceColor);
            }
        }
    }

    function addDeck(x0, z0, width, depth, floorY, options = {}) {
        const floorColor = options.floorColor || palette.platformShadow;
        const topColor = options.topColor || palette.platformMid;
        const capColor = options.capColor || palette.platformLight;
        const trimColor = options.trimColor || palette.ironLight;
        const railColor = options.railColor || palette.ironDark;
        const beaconColor = options.beaconColor || palette.brass;
        const x1 = x0 + width - 1;
        const z1 = z0 + depth - 1;

        addRect(x0, floorY, z0, width, depth, floorColor);
        addRect(x0 + 2, floorY + 1, z0 + 2, width - 4, depth - 4, topColor);
        addRect(x0 + 2, floorY + 2, z0 + 2, width - 4, depth - 4, capColor);

        [
            [x0 + 1, z0 + 1],
            [x1 - 1, z0 + 1],
            [x0 + 1, z1 - 1],
            [x1 - 1, z1 - 1],
        ].forEach(([lx, lz]) => addPillar(lx, floorY + 1, lz, 3, trimColor));

        addPerimeter(x0 + 2, z0 + 2, width - 4, depth - 4, floorY + 3, railColor, 2);

        for (let x = x0 + 6; x <= x1 - 5; x += 4) {
            addStud(x, floorY + 4, z0 + 2, beaconColor);
            addStud(x, floorY + 4, z1 - 2, beaconColor);
        }

        for (let z = z0 + 6; z <= z1 - 5; z += 4) {
            addStud(x0 + 2, floorY + 4, z, beaconColor);
            addStud(x1 - 2, floorY + 4, z, beaconColor);
        }
    }

    const getStageOneProfile = (y) => {
        const t = (y - 4) / 20;
        const size = 10 - Math.floor(t * 6);
        const left = 4 + Math.floor(t * 14);

        return {
            left,
            right: EIFFEL_DX - left - size,
            front: left,
            back: EIFFEL_DZ - left - size,
            size,
        };
    };

    const getStageTwoProfile = (y) => {
        const t = (y - 28) / 18;
        const size = 6 - Math.floor(t * 4);
        const left = 22 + Math.floor(t * 6);

        return {
            left,
            right: EIFFEL_DX - left - size,
            front: left,
            back: EIFFEL_DZ - left - size,
            size,
        };
    };

    const getStageThreeProfile = (y) => {
        const t = (y - 50) / 10;
        const size = 4 - Math.floor(t * 2);
        const left = 27 + Math.floor(t * 2);

        return {
            left,
            right: EIFFEL_DX - left - size,
            front: left,
            back: EIFFEL_DZ - left - size,
            size,
        };
    };

    function addPrimaryArches() {
        const braces = [
            [{ lx: 9, ly: 4, lz: 9 }, { lx: 23, ly: 25, lz: 23 }],
            [{ lx: 12, ly: 4, lz: 12 }, { lx: 25, ly: 25, lz: 23 }],
            [{ lx: 54, ly: 4, lz: 9 }, { lx: 40, ly: 25, lz: 23 }],
            [{ lx: 51, ly: 4, lz: 12 }, { lx: 38, ly: 25, lz: 23 }],
            [{ lx: 9, ly: 4, lz: 54 }, { lx: 23, ly: 25, lz: 40 }],
            [{ lx: 12, ly: 4, lz: 51 }, { lx: 23, ly: 25, lz: 38 }],
            [{ lx: 54, ly: 4, lz: 54 }, { lx: 40, ly: 25, lz: 40 }],
            [{ lx: 51, ly: 4, lz: 51 }, { lx: 38, ly: 25, lz: 40 }],
        ];

        braces.forEach(([from, to], index) => {
            addDiagonalChain(from, to, index % 2 === 0 ? palette.ironDark : palette.ironLight);
        });
    }

    function addUpperTransitionBraces() {
        const firstToSecond = [
            [{ lx: 23, ly: 28, lz: 23 }, { lx: 29, ly: 47, lz: 29 }],
            [{ lx: 26, ly: 28, lz: 23 }, { lx: 31, ly: 47, lz: 29 }],
            [{ lx: 40, ly: 28, lz: 23 }, { lx: 34, ly: 47, lz: 29 }],
            [{ lx: 37, ly: 28, lz: 23 }, { lx: 32, ly: 47, lz: 29 }],
            [{ lx: 23, ly: 28, lz: 40 }, { lx: 29, ly: 47, lz: 34 }],
            [{ lx: 23, ly: 28, lz: 37 }, { lx: 29, ly: 47, lz: 32 }],
            [{ lx: 40, ly: 28, lz: 40 }, { lx: 34, ly: 47, lz: 34 }],
            [{ lx: 40, ly: 28, lz: 37 }, { lx: 34, ly: 47, lz: 32 }],
        ];
        const secondToThird = [
            [{ lx: 29, ly: 50, lz: 29 }, { lx: 31, ly: 61, lz: 31 }],
            [{ lx: 34, ly: 50, lz: 29 }, { lx: 32, ly: 61, lz: 31 }],
            [{ lx: 29, ly: 50, lz: 34 }, { lx: 31, ly: 61, lz: 32 }],
            [{ lx: 34, ly: 50, lz: 34 }, { lx: 32, ly: 61, lz: 32 }],
        ];

        firstToSecond.forEach(([from, to], index) => {
            addDiagonalChain(from, to, index % 2 === 0 ? palette.ironMid : palette.ironLight);
        });

        secondToThird.forEach(([from, to], index) => {
            addDiagonalChain(from, to, index % 2 === 0 ? palette.ironLight : palette.brass);
        });
    }

    function addCentralShaft() {
        for (let y = 50; y <= 60; y++) {
            addPlate(31, y, 31, y < 56 ? palette.ironDark : palette.ironMid);

            if (y % 2 === 0) {
                addPerimeter(30, 30, 4, 4, y, palette.ironLight, 1);
            } else {
                addStud(30, y, 30, palette.ironLight);
                addStud(33, y, 30, palette.ironLight);
                addStud(30, y, 33, palette.ironLight);
                addStud(33, y, 33, palette.ironLight);
            }
        }
    }

    function addLanternAndSpire() {
        addRect(28, 64, 28, 8, 8, palette.platformShadow);
        addRect(29, 65, 29, 6, 6, palette.platformMid);

        [
            [29, 29],
            [34, 29],
            [29, 34],
            [34, 34],
        ].forEach(([lx, lz]) => addPillar(lx, 66, lz, 4, palette.ironLight));

        [30, 32].forEach((x) => {
            addBlock("Window", palette.beacon, x, 66, 28, 1);
            addBlock("Window", palette.beacon, x, 66, 35, 1);
        });

        [30, 32].forEach((z) => {
            addBlock("Window", palette.beacon, 28, 66, z, 0);
            addBlock("Window", palette.beacon, 35, 66, z, 0);
        });

        addRect(29, 68, 29, 6, 6, palette.ironLight);
        addRect(30, 69, 30, 4, 4, palette.brass);
        addPerimeter(30, 30, 4, 4, 70, palette.beacon, 1);

        addPillar(31, 71, 31, 12, palette.ironLight);

        [74, 77, 80].forEach((y) => {
            addStud(30, y, 31, palette.brass);
            addStud(32, y, 31, palette.brass);
            addStud(31, y, 30, palette.brass);
            addStud(31, y, 32, palette.brass);
        });

        addStud(31, 82, 31, palette.beacon);
        addStud(31, 83, 31, palette.brass);
    }

    addFootingsAndWalkways();
    addTowerStage(4, 24, getStageOneProfile);
    addPrimaryArches();

    addDeck(18, 18, 28, 28, 25, {
        floorColor: palette.platformShadow,
        topColor: palette.platformMid,
        capColor: palette.platformLight,
    });

    addTowerStage(28, 46, getStageTwoProfile, {
        crossBraceEvery: 4,
        crossBraceOffset: 1,
        crossBraceColor: palette.ironDark,
    });

    addDeck(22, 22, 20, 20, 47, {
        floorColor: palette.ironDark,
        topColor: palette.platformShadow,
        capColor: palette.platformMid,
        beaconColor: palette.beacon,
    });

    addTowerStage(50, 60, getStageThreeProfile, {
        crossBraceEvery: 2,
        crossBraceColor: palette.ironLight,
    });

    addUpperTransitionBraces();
    addCentralShaft();

    addDeck(26, 26, 12, 12, 61, {
        floorColor: palette.ironDark,
        topColor: palette.platformShadow,
        capColor: palette.platformMid,
        beaconColor: palette.brass,
    });

    addLanternAndSpire();

    return builder.blocks;
}

const TorreEiffel = {
    dx: EIFFEL_DX,
    dy: EIFFEL_DY,
    dz: EIFFEL_DZ,
    blocks: buildTorreEiffel(),
};

export default TorreEiffel;
