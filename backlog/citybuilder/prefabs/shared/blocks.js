const BLOCKS = {
    "1x1": { sx: 1, sy: 1, sz: 1, topStuds: true },
    "2x2": { sx: 2, sy: 1, sz: 2, topStuds: true },
    "2x4": { sx: 2, sy: 1, sz: 4, topStuds: true },
    "Tile 2x2": { sx: 2, sy: 1, sz: 2, topStuds: false, customGeo: "tile" },
    "Roof 1x2": { sx: 1, sy: 1, sz: 2, topStuds: false, customGeo: "roof" },
    Window: { sx: 1, sy: 2, sz: 2, topStuds: true, customGeo: "window" },
    Pillar: { sx: 1, sy: 3, sz: 1, topStuds: true },
    Rotor: { sx: 1, sy: 1, sz: 1, topStuds: false, customGeo: "rotor", animated: true },
};

const COLORS = {
    "#c74e24": 0xc74e24,
    "#8b5a2b": 0x8b5a2b,
    "#e3000b": 0xe3000b,
    "#0055bf": 0x0055bf,
    "#f2cd37": 0xf2cd37,
    "#237841": 0x237841,
    "#f4f4f4": 0xf4f4f4,
    "#111111": 0x222222,
};

export { BLOCKS, COLORS };
