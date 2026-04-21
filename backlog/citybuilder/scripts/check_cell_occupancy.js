import VilaDeLuxo from '../prefabs/landmarks/VilaDeLuxo.js';
import { BLOCKS } from '../prefabs/shared/blocks.js';

function getBlockFootprint(def, rot) { if (rot % 2 === 0) return { dx: def.sx, dz: def.sz }; return { dx: def.sz, dz: def.sx }; }
function rotatePrefabBlock(prefab, block, pRot) {
    const def = BLOCKS[block.type]; if (!def) return null;
    const baseRot = block.rot || 0; const { dx: baseDx, dz: baseDz } = getBlockFootprint(def, baseRot);
    const relX = block.lx + baseDx / 2 - prefab.dx / 2;
    const relZ = block.lz + baseDz / 2 - prefab.dz / 2;
    let rotX = relX, rotZ = relZ;
    if (pRot === 1) { rotX = -relZ; rotZ = rotX; }
    if (pRot === 2) { rotX = -relX; rotZ = -relZ; }
    if (pRot === 3) { rotX = relZ; rotZ = -relX; }
    const rotatedDx = pRot % 2 === 1 ? prefab.dz : prefab.dx;
    const rotatedDz = pRot % 2 === 1 ? prefab.dx : prefab.dz;
    const finalRot = (baseRot + pRot) % 4; const { dx: finalDx, dz: finalDz } = getBlockFootprint(def, finalRot);
    return { lx: Math.round(rotatedDx / 2 + rotX - finalDx / 2), ly: block.ly, lz: Math.round(rotatedDz / 2 + rotZ - finalDz / 2), dx: finalDx, dy: def.sy, dz: finalDz };
}

const coords = [ [4,11,6], [4,12,6], [4,10,6], [4,9,6], [4,8,6] ];
for (const [x,y,z] of coords) {
    const matches = [];
    VilaDeLuxo.blocks.forEach((b,i) => {
        const rb = rotatePrefabBlock(VilaDeLuxo,b,0);
        if (!rb) return;
        for (let xx=0; xx<rb.dx; xx++) for (let yy=0; yy<rb.dy; yy++) for (let zz=0; zz<rb.dz; zz++) {
            const cx = rb.lx+xx, cy = rb.ly+yy, cz = rb.lz+zz;
            if (cx===x && cy===y && cz===z) matches.push({i, type:b.type});
        }
    });
    console.log(`Cell ${x},${y},${z} occupied by:`, matches);
}
