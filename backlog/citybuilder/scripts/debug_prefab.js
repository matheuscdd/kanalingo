import ToriiRowShrineDetails from '../prefabs/landmarks/ToriiRowShrineDetails.js';

console.log('blocks.length', ToriiRowShrineDetails.blocks.length);
console.log('blocks[61]=', JSON.stringify(ToriiRowShrineDetails.blocks[61], null, 2));

// Also print any block that is out of bounds according to validatePrefab logic
import { BLOCKS } from '../prefabs/shared/blocks.js';
const prefab = ToriiRowShrineDetails;
for (let i = 0; i < prefab.blocks.length; i++) {
  const block = prefab.blocks[i];
  const def = BLOCKS[block.type];
  const rot = block.rot || 0;
  const isRotated = rot % 2 === 1;
  const dx = isRotated ? def.sz : def.sx;
  const dz = isRotated ? def.sx : def.sz;
  if (block.lx < 0 || block.ly < 0 || block.lz < 0) {
    console.log('negative coords at', i, block);
  }
  if (block.lx + dx > prefab.dx || block.ly + def.sy > prefab.dy || block.lz + dz > prefab.dz) {
    console.log('out of bounds at index', i, JSON.stringify(block));
  }
}
