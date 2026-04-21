function clampShade(value, min = 0.45, max = 1) {
    return Math.min(max, Math.max(min, value));
}

function normalizeNormal(nx, ny, nz) {
    const length = Math.hypot(nx, ny, nz) || 1;
    return {
        nx: nx / length,
        ny: ny / length,
        nz: nz / length,
    };
}

const FAKE_LIGHT_DIRECTION = normalizeNormal(-0.67, 0.56, 0.49);

function getFakeShadeForNormal(nx, ny, nz) {
    const normal = normalizeNormal(nx, ny, nz);
    const x = normal.nx;
    const y = normal.ny;
    const z = normal.nz;

    if (y >= 0.92) return 1;
    if (y <= -0.92) return 0.45;

    const directionalLight =
        x * FAKE_LIGHT_DIRECTION.nx +
        y * FAKE_LIGHT_DIRECTION.ny +
        z * FAKE_LIGHT_DIRECTION.nz;
    const undersidePenalty = Math.max(0, -y) * 0.08;
    const shade = 0.69 + directionalLight * 0.25 - undersidePenalty;
    return clampShade(shade, 0.5, 0.94);
}

export {
    getFakeShadeForNormal,
};