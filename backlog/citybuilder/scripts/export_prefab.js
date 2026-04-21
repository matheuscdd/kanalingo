import fs from 'fs/promises';
import { PREFABS, getPrefabJson } from '../prefabs/index.js';

const prefabName = process.argv[2] || 'ModernHouseWithPool';
const prefab = PREFABS[prefabName];

if (!prefab) {
  throw new Error(`Unknown prefab: ${prefabName}`);
}

(async () => {
  const json = getPrefabJson(prefabName);

  const outDir = './prefabs/exports';
  await fs.mkdir(outDir, { recursive: true });
  const outPath = `${outDir}/${prefabName}.json`;
  await fs.writeFile(outPath, json, 'utf8');

  const payload = JSON.parse(json);

  console.log(outPath);
  console.log(JSON.stringify({
    name: prefabName,
    dx: prefab.dx,
    dy: prefab.dy,
    dz: prefab.dz,
    recipeSteps: Array.isArray(payload.recipe) ? payload.recipe.length : 0,
  }, null, 2));
})();
