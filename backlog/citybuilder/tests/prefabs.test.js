import { describe, it, expect } from 'vitest';
import { BLOCKS } from '../prefabs/shared/blocks.js';

// ── Importações individuais (bypass do index.js para isolar falhas) ───────
import HogwartsBaseCliff             from '../prefabs/hogwarts/HogwartsBaseCliff.js';
import HogwartsBridgeGate            from '../prefabs/hogwarts/HogwartsBridgeGate.js';
import HogwartsGreatHall             from '../prefabs/hogwarts/HogwartsGreatHall.js';
import HogwartsWestWing              from '../prefabs/hogwarts/HogwartsWestWing.js';
import HogwartsEastWing              from '../prefabs/hogwarts/HogwartsEastWing.js';
import HogwartsTowerClusterCourtyard from '../prefabs/hogwarts/HogwartsTowerClusterCourtyard.js';
import ColosseuReal                  from '../prefabs/landmarks/ColosseuReal.js';
import Muralha                       from '../prefabs/landmarks/Muralha.js';
import FabricaMega                   from '../prefabs/landmarks/FabricaMega.js';
import Predio                        from '../prefabs/landmarks/Predio.js';
import Palacio                       from '../prefabs/landmarks/Palacio.js';
import Mansao                        from '../prefabs/landmarks/Mansao.js';
import MansaoClassica                from '../prefabs/landmarks/MansaoClassica.js';
import Casa                          from '../prefabs/landmarks/Casa.js';
import Chale                         from '../prefabs/landmarks/Chale.js';
import CasaDeCampo                   from '../prefabs/landmarks/CasaDeCampo.js';
import SobradoCompacto               from '../prefabs/landmarks/SobradoCompacto.js';
import SobradoComGaragem             from '../prefabs/landmarks/SobradoComGaragem.js';
import CasaComVaranda                from '../prefabs/landmarks/CasaComVaranda.js';
import CasaEmL                       from '../prefabs/landmarks/CasaEmL.js';
import CasaGeminada                  from '../prefabs/landmarks/CasaGeminada.js';
import VilaComPatio                  from '../prefabs/landmarks/VilaComPatio.js';
import VilaDeLuxo                    from '../prefabs/landmarks/VilaDeLuxo.js';
import ModernHouseWithPool           from '../prefabs/landmarks/ModernHouseWithPool.js';
import ModernBeachVilla              from '../prefabs/landmarks/ModernBeachVilla.js';
import ModernTownhouse               from '../prefabs/landmarks/ModernTownhouse.js';
import OliveSuburbanHouse            from '../prefabs/landmarks/OliveSuburbanHouse.js';
import ImperialJapaneseCastle        from '../prefabs/landmarks/ImperialJapaneseCastle.js';
import SamuraiGatehouse              from '../prefabs/landmarks/SamuraiGatehouse.js';
import SakuraTempleRetreat           from '../prefabs/landmarks/SakuraTempleRetreat.js';
import SakuraTemple2                 from '../prefabs/landmarks/SakuraTempla2.js';
import Arvore                        from '../prefabs/landmarks/Arvore.js';
import TorreEiffel                   from '../prefabs/landmarks/TorreEiffel.js';
import CristoRedentor                from '../prefabs/landmarks/CristoRedentor.js';
import TemploJapones                 from '../prefabs/landmarks/TemploJapones.js';
import TemploHoryuji                 from '../prefabs/landmarks/TemploHoryuji.js';
import EstatuaLiberdade              from '../prefabs/landmarks/EstatuaLiberdade.js';
import CasaBranca                    from '../prefabs/landmarks/CasaBranca.js';
import BasilicaSaoPedro              from '../prefabs/landmarks/BasilicaSaoPedro.js';
import ParthenonGrego                from '../prefabs/landmarks/ParthenonGrego.js';
import BigBen                        from '../prefabs/landmarks/BigBen.js';
import PalacioWestminster            from '../prefabs/landmarks/PalacioWestminster.js';
import Panteao                       from '../prefabs/landmarks/Panteao.js';
import TorreDeLondres                from '../prefabs/landmarks/TorreDeLondres.js';
import FushimiInariTaisha            from '../prefabs/landmarks/FushimiInariTaisha.js';
import CasteloHimeji                 from '../prefabs/landmarks/CasteloHimeji.js';
import ExercitoTerracota             from '../prefabs/landmarks/ExercitoTerracota.js';
import VilasHistoricasShirakawago    from '../prefabs/landmarks/VilasHistoricasShirakawago.js';
import MonteFuji                     from '../prefabs/landmarks/MonteFuji.js';
import EsfingeEgito                  from '../prefabs/landmarks/EsfingeEgito.js';
import TokyoSkytree                  from '../prefabs/landmarks/TokyoSkytree.js';
import Eolica                        from '../prefabs/landmarks/Eolica.js';
import CasaMedieval1                 from '../prefabs/landmarks/CasaMedieval1.js';
import TavernaMedieval               from '../prefabs/landmarks/TavernaMedieval.js';
import ManorMedieval                 from '../prefabs/landmarks/ManorMedieval.js';
import InnMedieval                   from '../prefabs/landmarks/InnMedieval.js';
import FazendaMedieval               from '../prefabs/landmarks/FazendaMedieval.js';
import TorreMedieval                 from '../prefabs/landmarks/TorreMedieval.js';

// ── Validação local: espelho de prefabs/index.js ─────────────────────────
function getBlockFootprint(def, rot) {
    if (rot % 2 === 0) return { dx: def.sx, dz: def.sz };
    return { dx: def.sz, dz: def.sx };
}

function collectErrors(name, prefab) {
    const errors = [];

    if (!prefab || typeof prefab !== 'object') {
        errors.push('not an object');
        return errors;
    }
    if (!Number.isInteger(prefab.dx) || !Number.isInteger(prefab.dy) || !Number.isInteger(prefab.dz)) {
        errors.push(`invalid dimensions: dx=${prefab.dx} dy=${prefab.dy} dz=${prefab.dz}`);
    }
    if (!Array.isArray(prefab.blocks)) {
        errors.push('blocks is not an array');
        return errors;
    }

    prefab.blocks.forEach((block, index) => {
        const def = BLOCKS[block.type];
        if (!def) {
            errors.push(`[${index}] unknown block type: "${block.type}"`);
            return;
        }
        const rot = block.rot || 0;
        const { dx, dz } = getBlockFootprint(def, rot);

        if (!Number.isInteger(block.lx) || !Number.isInteger(block.ly) || !Number.isInteger(block.lz)) {
            errors.push(`[${index}] coords nao inteiras: lx=${block.lx} ly=${block.ly} lz=${block.lz}`);
        }
        if (block.lx < 0 || block.ly < 0 || block.lz < 0) {
            errors.push(`[${index}] coords negativas: lx=${block.lx} ly=${block.ly} lz=${block.lz}`);
        }
        if (block.lx + dx > prefab.dx) {
            errors.push(`[${index}] lx+dx (${block.lx}+${dx}=${block.lx + dx}) > prefab.dx (${prefab.dx})`);
        }
        if (block.ly + def.sy > prefab.dy) {
            errors.push(`[${index}] ly+sy (${block.ly}+${def.sy}=${block.ly + def.sy}) > prefab.dy (${prefab.dy})`);
        }
        if (block.lz + dz > prefab.dz) {
            errors.push(`[${index}] lz+dz (${block.lz}+${dz}=${block.lz + dz}) > prefab.dz (${prefab.dz})`);
        }
    });

    return errors;
}

// ── Replicação de rotatePrefabBlock + buildPrefabRotationMeta ─────────────
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
        rotatedEnvDx: rotatedDx,
        rotatedEnvDz: rotatedDz,
    };
}

const NEIGHBOR_OFFSETS = [];
for (let dx = -1; dx <= 1; dx++)
    for (let dy = -1; dy <= 1; dy++)
        for (let dz = -1; dz <= 1; dz++)
            if (dx !== 0 || dy !== 0 || dz !== 0)
                NEIGHBOR_OFFSETS.push([dx, dy, dz]);

function buildRotationMeta(prefab, pRot) {
    const rotatedDx = pRot % 2 === 1 ? prefab.dz : prefab.dx;
    const rotatedDz = pRot % 2 === 1 ? prefab.dx : prefab.dz;

    const occupied = [];
    const occupiedSet = new Set();
    const rotErrors = [];

    prefab.blocks.forEach((block, index) => {
        const rb = rotatePrefabBlock(prefab, block, pRot);
        if (!rb) return;

        if (rb.lx < 0 || rb.lz < 0) {
            rotErrors.push(`[pRot=${pRot}][${index}] coords negativas após rotação: lx=${rb.lx} lz=${rb.lz}`);
        }
        if (rb.lx + rb.dx > rotatedDx) {
            rotErrors.push(`[pRot=${pRot}][${index}] lx+dx (${rb.lx}+${rb.dx}=${rb.lx + rb.dx}) > rotatedDx (${rotatedDx})`);
        }
        if (rb.lz + rb.dz > rotatedDz) {
            rotErrors.push(`[pRot=${pRot}][${index}] lz+dz (${rb.lz}+${rb.dz}=${rb.lz + rb.dz}) > rotatedDz (${rotatedDz})`);
        }

        for (let x = 0; x < rb.dx; x++) {
            for (let y = 0; y < rb.dy; y++) {
                for (let z = 0; z < rb.dz; z++) {
                    const cell = { x: rb.lx + x, y: rb.ly + y, z: rb.lz + z };
                    occupied.push(cell);
                    occupiedSet.add(`${cell.x},${cell.y},${cell.z}`);
                }
            }
        }
    });

    // Connected components (26-neighborhood)
    const componentByKey = new Map();
    let componentCount = 0;
    for (const cell of occupied) {
        const key = `${cell.x},${cell.y},${cell.z}`;
        if (componentByKey.has(key)) continue;
        const queue = [cell];
        componentByKey.set(key, componentCount);
        while (queue.length) {
            const cur = queue.pop();
            for (const [dx, dy, dz] of NEIGHBOR_OFFSETS) {
                const nk = `${cur.x + dx},${cur.y + dy},${cur.z + dz}`;
                if (occupiedSet.has(nk) && !componentByKey.has(nk)) {
                    componentByKey.set(nk, componentCount);
                    queue.push({ x: cur.x + dx, y: cur.y + dy, z: cur.z + dz });
                }
            }
        }
        componentCount++;
    }

    // Support offsets: cells at y=0 OR with no block below
    const supportOffsets = occupied.filter(c =>
        c.y === 0 || !occupiedSet.has(`${c.x},${c.y - 1},${c.z}`)
    ).map(c => ({ ...c, component: componentByKey.get(`${c.x},${c.y},${c.z}`) }));

    const groundedComponents = new Set(
        supportOffsets.filter(c => c.y === 0).map(c => c.component)
    );

    return {
        componentCount,
        groundComponentCount: groundedComponents.size,
        supportOffsets,
        rotErrors,
    };
}

// ── Mapa de todos os prefabs ──────────────────────────────────────────────
const ALL = {
    HogwartsBaseCliff,
    HogwartsBridgeGate,
    HogwartsGreatHall,
    HogwartsWestWing,
    HogwartsEastWing,
    HogwartsTowerClusterCourtyard,
    ColosseuReal,
    Muralha,
    FabricaMega,
    Predio,
    Palacio,
    Mansao,
    MansaoClassica,
    Casa,
    Chale,
    CasaDeCampo,
    SobradoCompacto,
    SobradoComGaragem,
    CasaComVaranda,
    CasaEmL,
    CasaGeminada,
    VilaComPatio,
    VilaDeLuxo,
    ModernHouseWithPool,
    ModernBeachVilla,
    ModernTownhouse,
    OliveSuburbanHouse,
    ImperialJapaneseCastle,
    SamuraiGatehouse,
    SakuraTempleRetreat,
    SakuraTemple2,
    Arvore,
    TorreEiffel,
    CristoRedentor,
    TemploJapones,
    TemploHoryuji,
    EstatuaLiberdade,
    CasaBranca,
    BasilicaSaoPedro,
    ParthenonGrego,
    BigBen,
    PalacioWestminster,
    Panteao,
    TorreDeLondres,
    FushimiInariTaisha,
    CasteloHimeji,
    ExercitoTerracota,
    VilasHistoricasShirakawago,
    MonteFuji,
    EsfingeEgito,
    TokyoSkytree,
    Eolica,
    CasaMedieval1,
    TavernaMedieval,
    ManorMedieval,
    InnMedieval,
    FazendaMedieval,
    TorreMedieval,
};

// ── Um describe por prefab, 5 asserções independentes ────────────────────
Object.entries(ALL).forEach(([name, prefab]) => {
    describe(`Prefab: ${name}`, () => {
        it('é um objeto com dimensões inteiras positivas (dx, dy, dz)', () => {
            expect(prefab).toBeTypeOf('object');
            expect(Number.isInteger(prefab.dx) && prefab.dx > 0).toBe(true);
            expect(Number.isInteger(prefab.dy) && prefab.dy > 0).toBe(true);
            expect(Number.isInteger(prefab.dz) && prefab.dz > 0).toBe(true);
        });

        it('blocks é um array não-vazio', () => {
            expect(Array.isArray(prefab.blocks)).toBe(true);
            expect(prefab.blocks.length).toBeGreaterThan(0);
        });

        it('todos os blocos usam tipos válidos (presentes em BLOCKS)', () => {
            const bad = prefab.blocks
                .map((b, i) => ({ i, type: b.type }))
                .filter(({ type }) => !BLOCKS[type])
                .map(({ i, type }) => `[${i}] "${type}"`);
            expect(bad, `Tipos desconhecidos:\n${bad.join('\n')}`).toHaveLength(0);
        });

        it('todos os blocos usam coordenadas inteiras no grid local', () => {
            const integerErrors = collectErrors(name, prefab).filter(e => e.includes('coords nao inteiras'));
            expect(integerErrors, `Coords nao inteiras:\n${integerErrors.join('\n')}`).toHaveLength(0);
        });

        it('nenhum bloco tem coordenadas negativas', () => {
            const neg = prefab.blocks
                .map((b, i) => ({ i, b }))
                .filter(({ b }) => b.lx < 0 || b.ly < 0 || b.lz < 0)
                .map(({ i, b }) => `[${i}] lx=${b.lx} ly=${b.ly} lz=${b.lz}`);
            expect(neg, `Coords negativas:\n${neg.join('\n')}`).toHaveLength(0);
        });

        it('nenhum bloco ultrapassa os limites declarados (dx/dy/dz)', () => {
            const errors = collectErrors(name, prefab).filter(e => e.includes('>'));
            expect(errors, `Blocos fora dos limites:\n${errors.join('\n')}`).toHaveLength(0);
        });

        it('blocos válidos em todas as 4 rotações (sem coords negativas nem fora dos limites)', () => {
            const errors = [0, 1, 2, 3].flatMap(pRot => buildRotationMeta(prefab, pRot).rotErrors);
            expect(errors, `Erros de rotação:\n${errors.join('\n')}`).toHaveLength(0);
        });

        it('pode ser colocado em mapa vazio (groundComponentCount === componentCount em rot=0)', () => {
            const meta = buildRotationMeta(prefab, 0);
            expect(
                meta.groundComponentCount,
                `groundComponentCount=${meta.groundComponentCount} !== componentCount=${meta.componentCount}. ` +
                `Algum componente está flutuando (não toca y=0).`
            ).toBe(meta.componentCount);
        });
    });
});
