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

const NEIGHBOR_OFFSETS = [];
for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) if (dx!==0||dy!==0||dz!==0) NEIGHBOR_OFFSETS.push([dx,dy,dz]);

function buildRotationMetaDetailed(prefab, pRot) {
    const occupied = [];
    const occupiedSet = new Set();
    const blocksRot = [];
    prefab.blocks.forEach((block, index) => {
        const rb = rotatePrefabBlock(prefab, block, pRot);
        blocksRot.push(rb);
        if (!rb) return;
        for (let x = 0; x < rb.dx; x++) for (let y = 0; y < rb.dy; y++) for (let z = 0; z < rb.dz; z++) {
            const cell = { x: rb.lx + x, y: rb.ly + y, z: rb.lz + z };
            occupied.push(cell);
            occupiedSet.add(`${cell.x},${cell.y},${cell.z}`);
        }
    });
    const componentByKey = new Map();
    let componentCount = 0;
    for (const cell of occupied) {
        const key = `${cell.x},${cell.y},${cell.z}`;
        if (componentByKey.has(key)) continue;
        const queue = [cell];
        componentByKey.set(key, componentCount);
        while (queue.length) {
            const cur = queue.pop();
            for (const [dx,dy,dz] of NEIGHBOR_OFFSETS) {
                const nk = `${cur.x+dx},${cur.y+dy},${cur.z+dz}`;
                if (occupiedSet.has(nk) && !componentByKey.has(nk)) {
                    componentByKey.set(nk, componentCount);
                    queue.push({x:cur.x+dx,y:cur.y+dy,z:cur.z+dz});
                }
            }
        }
        componentCount++;
    }
    // map blocks to components
    const blockMap = prefab.blocks.map((b, i) => {
        const rb = blocksRot[i];
        if (!rb) return { i, type: b.type, comps: [] };
        const set = new Set();
        for (let x=0;x<rb.dx;x++) for (let y=0;y<rb.dy;y++) for (let z=0;z<rb.dz;z++) {
            const key = `${rb.lx+x},${rb.ly+y},${rb.lz+z}`;
            const comp = componentByKey.get(key);
            if (comp !== undefined) set.add(comp);
        }
        return { i, type: b.type, comps: Array.from(set).sort() };
    });
    return { componentCount, componentByKey, blockMap };
}

const res = buildRotationMetaDetailed(VilaDeLuxo, 0);
console.log('componentCount', res.componentCount);
console.log('Blocks belonging to non-grounded components (component id > 0):');
res.blockMap.filter(b => b.comps.some(c => c !== 0)).forEach(b => console.log(b));
