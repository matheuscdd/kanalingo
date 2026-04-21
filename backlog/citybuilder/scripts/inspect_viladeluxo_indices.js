import VilaDeLuxo from '../prefabs/landmarks/VilaDeLuxo.js';
import { BLOCKS } from '../prefabs/shared/blocks.js';

function getBlockFootprint(def, rot) {
    if (rot % 2 === 0) return { dx: def.sx, dz: def.sz };
    return { dx: def.sz, dz: def.sx };
}
function rotatePrefabBlock(prefab, block, pRot) {
    const def = BLOCKS[block.type];
    if (!def) return null;
    const baseRot = block.rot || 0;
    const { dx: baseDx, dz: baseDz } = getBlockFootprint(def, baseRot);
    const relX = block.lx + baseDx / 2 - prefab.dx / 2;
    const relZ = block.lz + baseDz / 2 - prefab.dz / 2;
    let rotX = relX, rotZ = relZ;
    if (pRot === 1) { rotX = -relZ; rotZ = relX; }
    else if (pRot === 2) { rotX = -relX; rotZ = -relZ; }
    else if (pRot === 3) { rotX = relZ; rotZ = -relX; }
    const rotatedDx = pRot % 2 === 1 ? prefab.dz : prefab.dx;
    const rotatedDz = pRot % 2 === 1 ? prefab.dx : prefab.dz;
    const finalRot = (baseRot + pRot) % 4;
    const { dx: finalDx, dz: finalDz } = getBlockFootprint(def, finalRot);
    return {
        lx: Math.round(rotatedDx / 2 + rotX - finalDx / 2),
        ly: block.ly,
        lz: Math.round(rotatedDz / 2 + rotZ - finalDz / 2),
        dx: finalDx,
        dy: def.sy,
        dz: finalDz,
    };
}

for (let i = 620; i <= 705; i++) {
    const b = VilaDeLuxo.blocks[i];
    if (!b) continue;
    const rb = rotatePrefabBlock(VilaDeLuxo, b, 0);
    console.log(i, b.type, b.lx, b.ly, b.lz, '->', rb);
}
