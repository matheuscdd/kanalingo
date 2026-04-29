import HogwartsBaseCliff from "./hogwarts/HogwartsBaseCliff.js";
import HogwartsBridgeGate from "./hogwarts/HogwartsBridgeGate.js";
import HogwartsGreatHall from "./hogwarts/HogwartsGreatHall.js";
import HogwartsWestWing from "./hogwarts/HogwartsWestWing.js";
import HogwartsEastWing from "./hogwarts/HogwartsEastWing.js";
import HogwartsTowerClusterCourtyard from "./hogwarts/HogwartsTowerClusterCourtyard.js";
import ColosseuReal from "./landmarks/ColosseuReal.js";
import Muralha from "./landmarks/Muralha.js";
import FabricaMega from "./landmarks/FabricaMega.js";
import Predio from "./landmarks/Predio.js";
import Palacio from "./landmarks/Palacio.js";
import Mansao from "./landmarks/Mansao.js";
import MansaoClassica from "./landmarks/MansaoClassica.js";
import Casa from "./landmarks/Casa.js";
import Chale from "./landmarks/Chale.js";
import Arvore from "./landmarks/Arvore.js";
import CasaDeCampo from "./landmarks/CasaDeCampo.js";
import SobradoCompacto from "./landmarks/SobradoCompacto.js";
import TorreEiffel from "./landmarks/TorreEiffel.js";
import SobradoComGaragem from "./landmarks/SobradoComGaragem.js";
import CristoRedentor from "./landmarks/CristoRedentor.js";
import CasaComVaranda from "./landmarks/CasaComVaranda.js";
import CasaEmL from "./landmarks/CasaEmL.js";
import CasaGeminada from "./landmarks/CasaGeminada.js";
import TemploJapones from "./landmarks/TemploJapones.js";
import VilaComPatio from "./landmarks/VilaComPatio.js";
import TemploHoryuji from "./landmarks/TemploHoryuji.js";
import EstatuaLiberdade from "./landmarks/EstatuaLiberdade.js";
import CasaBranca from "./landmarks/CasaBranca.js";
import BasilicaSaoPedro from "./landmarks/BasilicaSaoPedro.js";
import SagradaFamilia from "./landmarks/SagradaFamilia.js";
import ParthenonGrego from "./landmarks/ParthenonGrego.js";
import BigBen from "./landmarks/BigBen.js";
import PalacioWestminster from "./landmarks/PalacioWestminster.js";
import Panteao from "./landmarks/Panteao.js";
import TorreDeLondres from "./landmarks/TorreDeLondres.js";
import FushimiInariTaisha from "./landmarks/FushimiInariTaisha.js";
import CasteloHimeji from "./landmarks/CasteloHimeji.js";
import ExercitoTerracota from "./landmarks/ExercitoTerracota.js";
import VilasHistoricasShirakawago from "./landmarks/VilasHistoricasShirakawago.js";
import MonteFuji from "./landmarks/MonteFuji.js";
import EsfingeEgito from "./landmarks/EsfingeEgito.js";
import TokyoSkytree from "./landmarks/TokyoSkytree.js";
import Eolica from "./landmarks/Eolica.js";
import VilaDeLuxo from "./landmarks/VilaDeLuxo.js";
import ModernHouseWithPool from "./landmarks/ModernHouseWithPool.js";
import ModernBeachVilla from "./landmarks/ModernBeachVilla.js";
import ModernTownhouse from "./landmarks/ModernTownhouse.js";
import OliveSuburbanHouse from "./landmarks/OliveSuburbanHouse.js";
import ImperialJapaneseCastle from "./landmarks/ImperialJapaneseCastle.js";
import SamuraiGatehouse from "./landmarks/SamuraiGatehouse.js";
import MiniTeaHouse from "./landmarks/MiniTeaHouse.js";
import RiversideMinka from "./landmarks/RiversideMinka.js";
import SakuraTempleRetreat from "./landmarks/SakuraTempleRetreat.js";
import SakuraTemple2 from "./landmarks/SakuraTempla2.js";
import MerchantHouse from "./landmarks/MerchantHouse.js";
import ToriiRowShrineBase from "./landmarks/ToriiRowShrineBase.js";
import ToriiRowShrineDetails from "./landmarks/ToriiRowShrineDetails.js";
import TempleHallStructure from "./landmarks/TempleHallStructure.js";
import TempleHallRoof from "./landmarks/TempleHallRoof.js";
import ThreeTierPagodaStructure from "./landmarks/ThreeTierPagodaStructure.js";
import ThreeTierPagodaRoofs from "./landmarks/ThreeTierPagodaRoofs.js";
import MiniHimejiKeep from "./landmarks/MiniHimejiKeep.js";
import CasaMedieval1 from "./landmarks/CasaMedieval1.js";
import TavernaMedieval from "./landmarks/TavernaMedieval.js";
import ManorMedieval from "./landmarks/ManorMedieval.js";
import InnMedieval from "./landmarks/InnMedieval.js";
import FazendaMedieval from "./landmarks/FazendaMedieval.js";
import TorreMedieval from "./landmarks/TorreMedieval.js";
import ForteMedieval from "./landmarks/ForteMedieval.js";
import GuaritaMedieval from "./landmarks/GuaritaMedieval.js";
import CasaTorreEnxaimel from "./landmarks/CasaTorreEnxaimel.js";
import {
    attachPrefabMeta,
    buildSerializablePrefabSource,
    parsePrefabJson,
    resolveRuntimePrefabName,
    serializePrefabJson,
    validatePrefab,
} from "./shared/prefabCodec.js";

const PREFABS = {
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
    CasaDeCampo,
    Chale,
    SobradoComGaragem,
    SobradoCompacto,
    CasaEmL,
    CasaComVaranda,
    CasaGeminada,
    VilaComPatio,
    Arvore,
    TorreEiffel,
    CristoRedentor,
    TemploJapones,
    TemploHoryuji,
    MiniTeaHouse,
    RiversideMinka,
    SakuraTempleRetreat,
    SakuraTemple2,
    MerchantHouse,
    ToriiRowShrineBase,
    ToriiRowShrineDetails,
    TempleHallStructure,
    TempleHallRoof,
    ThreeTierPagodaStructure,
    ThreeTierPagodaRoofs,
    MiniHimejiKeep,
    CasaMedieval1,
    TavernaMedieval,
    ManorMedieval,
    InnMedieval,
    FazendaMedieval,
    TorreMedieval,
    ForteMedieval,
    GuaritaMedieval,
    CasaTorreEnxaimel,
    EstatuaLiberdade,
    CasaBranca,
    BasilicaSaoPedro,
    SagradaFamilia,
    ParthenonGrego,
    BigBen,
    PalacioWestminster,
    Panteao,
    VilaDeLuxo,
    ModernHouseWithPool,
    ModernBeachVilla,
    ModernTownhouse,
    OliveSuburbanHouse,
    ImperialJapaneseCastle,
    SamuraiGatehouse,
    TorreDeLondres,
    FushimiInariTaisha,
    CasteloHimeji,
    ExercitoTerracota,
    VilasHistoricasShirakawago,
    MonteFuji,
    EsfingeEgito,
    TokyoSkytree,
    Eolica,
};

const BUILTIN_PREFAB_NAMES = new Set(Object.keys(PREFABS));
const RUNTIME_PREFAB_NAMES = new Set();
const PREFAB_SOURCES = new Map();

function hasPrefabName(name) {
    return Object.prototype.hasOwnProperty.call(PREFABS, name);
}

function registerRuntimePrefabFromJson(input) {
    const parsed = parsePrefabJson(input);
    const resolvedName = resolveRuntimePrefabName(parsed.name, BUILTIN_PREFAB_NAMES, RUNTIME_PREFAB_NAMES, hasPrefabName);
    const didOverwriteRuntime = RUNTIME_PREFAB_NAMES.has(resolvedName);
    const source = buildSerializablePrefabSource(resolvedName, parsed.prefab, { ...parsed.source, name: resolvedName });

    PREFABS[resolvedName] = parsed.prefab;
    PREFAB_SOURCES.set(resolvedName, source);
    RUNTIME_PREFAB_NAMES.add(resolvedName);

    return {
        name: resolvedName,
        prefab: parsed.prefab,
        didOverwriteRuntime,
        json: JSON.stringify(source, null, 2),
    };
}

function getPrefabJson(name) {
    const prefab = PREFABS[name];
    if (!prefab) {
        throw new Error(`Unknown prefab: ${name}`);
    }

    return serializePrefabJson(name, prefab, PREFAB_SOURCES.get(name));
}

function isRuntimePrefab(name) {
    return RUNTIME_PREFAB_NAMES.has(name);
}

Object.entries(PREFABS).forEach(([name, prefab]) => {
    validatePrefab(name, prefab);
    attachPrefabMeta(prefab);
});

export { PREFABS, getPrefabJson, isRuntimePrefab, registerRuntimePrefabFromJson };
