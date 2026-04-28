import { BLOCKS } from "./prefabs/shared/blocks.js";
import { PREFABS, getPrefabJson, registerRuntimePrefabFromJson, isRuntimePrefab } from "./prefabs/index.js";
import { buildPrefabExport } from "./prefabs/shared/prefabCodec.js";
import { CITY_JSON_KIND, buildCitySnapshot, parseCityJson, validateCityPlacements } from "./prefabs/shared/cityCodec.js";
import { buildAreaStructureExport, buildLocalPrefabFromWorldBlocks, collectConnectedWorldBlocks } from "./prefabs/shared/structureCapture.js";
import { getBlockMetrics } from "./prefabs/shared/core.js";
import {
    FORMAS_3D,
    clampPositiveInt,
    createAreaRecipe,
    createFloorRecipe,
    createShapeRecipe,
    createWallRecipe,
    ensureDynamicShapeBlockType,
    getEffectiveShapeDirection,
    isShapeDirectionLocked,
} from "./prefabs/shared/builderTools.js";
import {
    SHAPE_DIRECTION_DEFAULT,
    SHAPE_DIRECTIONS,
    getBoundsAfterShapeOrientation,
    getShapeDirectionLabel,
    getShapeOrientationMatrix,
    normalizeShapeDirection,
    rotateShapeOrientationAroundY,
} from "./prefabs/shared/shapeOrientation.js";
import { getFakeShadeForNormal } from "./prefabs/shared/fakeShading.js";
import { getUpwardSurfaceStudPlacements } from "./prefabs/shared/shapeStuds.js";

const THREE = globalThis.THREE;
if (!THREE) {
    throw new Error("Three.js failed to load before script.js.");
}

// --- FUNÇÃO DE DICA (UI) ---
function showHint(msg) {
    const hint = document.getElementById("hint-msg");
    if (hint) {
        hint.innerText = msg;
        hint.classList.add("visible");
        setTimeout(() => hint.classList.remove("visible"), 3000);
    }
}

// --- UTILITÁRIOS DE MINIMIZAR PAINÉIS E RESTAURAÇÃO ---
function getPanelMinKey(panelId) {
    return `ui-panel-min:${panelId}`;
}

function togglePanelById(panelId) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    panel.classList.toggle("minimized");
    const minimized = panel.classList.contains("minimized");
    try {
        localStorage.setItem(getPanelMinKey(panelId), minimized ? "1" : "0");
    } catch (e) {
        // ignore storage errors
    }
}

function applySavedPanelStates() {
    document.querySelectorAll(".ui-panel[id]").forEach((panel) => {
        try {
            const v = localStorage.getItem(getPanelMinKey(panel.id));
            if (v === "1") panel.classList.add("minimized");
        } catch (e) {}
    });
}

function initPanelToggles() {
    document.querySelectorAll('.panel-toggle').forEach((btn) => {
        const panelId = btn.dataset.panelId;
        if (!panelId) return;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            togglePanelById(panelId);
            btn.blur();
        });
    });
    applySavedPanelStates();
}

// --- CONFIGURAÇÕES MEGA MAPA ---
const GRID_SIZE_LARGE = 200;
let CURRENT_GRID_SIZE = GRID_SIZE_LARGE;
const MAX_HEIGHT = 100;
const MAX_BLOCKS = 60000;
const STUD_RADIUS = 0.25;
const STUD_HEIGHT = 0.2;
const PERF_SAMPLE_LIMIT = 180;
const PERF_UPDATE_MS = 250;
const MEMORY_POLL_MS = 2500;
const TARGET_FRAME_MS = 1000 / 60;
const BENCHMARK_BATCH_SIZE = 300;
const BENCHMARK_PREFAB_SPACING = 4;
const BENCHMARK_PREFAB_LAYER_GAP = 24;
const BENCHMARK_COLORS = ["#e3000b", "#0055bf", "#f2cd37", "#237841", "#f4f4f4", "#c74e24"];
const AUTO_BENCHMARK_WARMUP_MS = 750;
const AUTO_BENCHMARK_MOVE_TOLERANCE = 0.35;
const AUTO_BENCHMARK_FRAME_LIMIT = 900;
const AUTO_BENCHMARK_DENSE_ROW_CANDIDATES = [-90, -86, -82, -78];
const AUTO_BENCHMARK_PREFAB_LANE_CANDIDATES = [78, 68, 58, 48, 38, 28, 18, 8, -2];
const BUILD_PLATE_SIZE = 48;
const BUILD_PLATE_DIVISIONS = 24;
const PICK_EPSILON = 1e-6;
const WORLD_CHUNK_SIZE = 32;
const WORLD_CHUNK_AREA = WORLD_CHUNK_SIZE * WORLD_CHUNK_SIZE;
const MOBILE_PHONE_VIEWPORT_MAX = 820;
const MOBILE_TABLET_VIEWPORT_MAX = 1366;
const MOBILE_MAX_PIXEL_RATIO_PHONE = 1;
const MOBILE_MAX_PIXEL_RATIO_TABLET = 1.25;
const MOBILE_DYNAMIC_SCALE_MIN_PHONE = 0.65;
const MOBILE_DYNAMIC_SCALE_MIN_TABLET = 0.8;
const MOBILE_DYNAMIC_SCALE_STEP_DOWN = 0.1;
const MOBILE_DYNAMIC_SCALE_STEP_UP = 0.05;
const MOBILE_DYNAMIC_SCALE_HIGH_STREAK = 3;
const MOBILE_DYNAMIC_SCALE_LOW_STREAK = 6;
const MOBILE_DYNAMIC_SCALE_HIGH_MS = TARGET_FRAME_MS * 1.18;
const MOBILE_DYNAMIC_SCALE_LOW_MS = TARGET_FRAME_MS * 0.92;
const MOBILE_MEMORY_POLL_INTERVAL_MULTIPLIER = 2;
const DESKTOP_SHADOW_MAP_SIZE = 2048;
const MOBILE_SHADOW_MAP_SIZE = 1024;
const TOOL_PREVIEW_VALID = 0x31a86f;
const TOOL_PREVIEW_INVALID = 0xe74c3c;
const SELECTION_HIGHLIGHT_COLOR = 0x00b7ff;
const TOOL_PLACE = "place";
const TOOL_AREA = "area";
const TOOL_FLOOR = "floor";
const TOOL_WALL = "wall";
const TOOL_SELECT = "select";
const TOOL_SHAPE = "shape";
const TOOL_PASTE = "paste";
const TOOL_DELETE_BLOCK = "delete-block";
const TOOL_DELETE_GROUP = "delete-group";

// --- ESTADO GERAL ---
let currentType = "1x1";
let currentColor = "#e3000b";
let currentRot = 0;
let currentShapeDirection = SHAPE_DIRECTION_DEFAULT;
let currentShapeRot = 0;
let isDeleteMode = false;
let isDeleteGroupMode = false;

let hoveredGroupId = null;
let hoveredBlockId = null;
let pointedWorldBlockId = null;

const keys = {};
let lastTime = performance.now();

const voxelChunks = new Map();
let activeVoxelCount = 0;
let hitboxes = [];
let blockHitboxes = [];
let blocksCount = 0;
let animatedBlocks = [];
let nextUniqueId = 1;
function getNextUniqueId() { return nextUniqueId++; }
const blockById = new Map();
const groupToBlockIds = new Map();
const groupToSourcePrefabId = new Map();
const groupToPrefabPlacement = new Map();
const blockToInstanceGroupKeys = new Map();
let exportedStructureSerial = 1;

// --- ESTADO: MODO CONSTRUÇÃO ---
let isTopDownView = false;
let cameraAngleIndex = 1;
const CAM_RADIUS = 110;
const CAM_HEIGHT = 110;
let targetCamOffset = new THREE.Vector3();
let visualCamOffset = new THREE.Vector3();
let cameraTarget = new THREE.Vector3(0, 0, 0);
let visualTarget = new THREE.Vector3(0, 0, 0);
let currentCX = 0,
    currentCY = 0,
    currentCZ = 0;
let rollOver;

const LEGACY_PREFAB_TYPE_PREFIX = "Prefab_";
const PREFAB_TYPE_PREFIX = "Prefab:";
const catalogBottomBar = document.getElementById("bottom-bar");
const jsonTextarea = document.getElementById("json-structure-input");
const btnSaveCity = document.getElementById("btn-save-city");
const btnJsonImport = document.getElementById("btn-json-import");
const btnJsonCreateStructure = document.getElementById("btn-json-create-structure");
const btnJsonOpenFile = document.getElementById("btn-json-open-file");
const btnJsonDownload = document.getElementById("btn-json-download");
const btnJsonClear = document.getElementById("btn-json-clear");
const jsonFileInput = document.getElementById("json-file-input");
const catalogButtonByType = new Map();
const catalogItemByType = new Map();
const builderToolsPanel = document.getElementById("builder-tools-panel");
const builderToolsStatus = document.getElementById("builder-tools-status");
const builderToolWidthInput = document.getElementById("tool-width");
const builderToolDepthInput = document.getElementById("tool-depth");
const builderToolHeightInput = document.getElementById("tool-height");
const builderToolShapeSelect = document.getElementById("tool-shape-select");
const builderToolShapeDirectionButton = document.getElementById("btn-tool-shape-direction");
const builderToolUndoButton = document.getElementById("btn-tool-undo");
const builderToolRedoButton = document.getElementById("btn-tool-redo");
const builderToolCopyButton = document.getElementById("btn-tool-copy");
const builderToolPasteButton = document.getElementById("btn-tool-paste");
const builderToolClearSelectionButton = document.getElementById("btn-tool-clear-selection");
const builderToolButtons = [...document.querySelectorAll("[data-build-tool]")];
let activeBuildTool = TOOL_PLACE;
let toolPreview = null;
let lastToolPreviewKey = "";
let selectionAnchor = null;
let selectionBounds = null;
let clipboardRecipe = null;
const selectedBlockIds = new Set();
const undoStack = [];
const redoStack = [];

function isPrefabType(type) {
    return typeof type === "string" && (type.startsWith(PREFAB_TYPE_PREFIX) || type.startsWith(LEGACY_PREFAB_TYPE_PREFIX));
}

function getPrefabIdFromType(type) {
    if (!isPrefabType(type)) return null;
    if (type.startsWith(PREFAB_TYPE_PREFIX)) return type.slice(PREFAB_TYPE_PREFIX.length);
    return type.slice(LEGACY_PREFAB_TYPE_PREFIX.length);
}

function makePrefabType(prefabId) {
    return `${PREFAB_TYPE_PREFIX}${prefabId}`;
}

function getPrefabByType(type) {
    const prefabId = getPrefabIdFromType(type);
    return prefabId ? PREFABS[prefabId] : null;
}

function getRegisteredBlockDef(type) {
    return BLOCKS[type] || ensureDynamicShapeBlockType(type);
}

const missingBlockTypeWarnings = new Set();

function warnMissingBlockType(type) {
    if (!type || missingBlockTypeWarnings.has(type)) return;
    missingBlockTypeWarnings.add(type);
    console.warn(`[citybuilder] Unknown block type ignored by renderer: ${type}`);
}

function getShapeDirectionCycleIndex(direction) {
    const index = SHAPE_DIRECTIONS.indexOf(normalizeShapeDirection(direction));
    return index >= 0 ? index : 0;
}

function getSelectedBuilderShape() {
    return builderToolShapeSelect?.value || "cuboid";
}

function getActiveShapeDirection() {
    return getEffectiveShapeDirection(getSelectedBuilderShape(), currentShapeDirection);
}

function getActiveShapeRot() {
    return ((Number(currentShapeRot) || 0) % 4 + 4) % 4;
}

function getShapeRotationLabel(rot = 0) {
    return `${(((Number(rot) || 0) % 4 + 4) % 4) * 90}deg`;
}

function updateShapeDirectionButton() {
    if (!builderToolShapeDirectionButton) return;
    const shape = getSelectedBuilderShape();
    const label = getShapeDirectionLabel(getActiveShapeDirection());
    const locked = isShapeDirectionLocked(shape);
    const rotationLabel = getShapeRotationLabel(getActiveShapeRot());
    builderToolShapeDirectionButton.textContent = locked
        ? `Base: ${label} | Giro: ${rotationLabel}`
        : `Direção: ${label} | Giro: ${rotationLabel}`;
    builderToolShapeDirectionButton.title = locked
        ? `Base fixa em ${label}; clique esquerdo ou direito para girar a forma em torno da base`
        : `Orientação da forma: ${label}; use Rotacionar/R para girar a base como prefab e clique direito para inverter o sentido`;
}

function rotateShapeToolLocal(step = 1) {
    currentShapeRot = (currentShapeRot + step + 4) % 4;
    updateShapeDirectionButton();
    return "rotation";
}

function rotateShapeToolAroundWorldY(step = 1) {
    const shape = getSelectedBuilderShape();
    if (isShapeDirectionLocked(shape)) return rotateShapeToolLocal(step);

    const nextOrientation = rotateShapeOrientationAroundY(getActiveShapeDirection(), getActiveShapeRot(), step);
    currentShapeDirection = nextOrientation.direction;
    currentShapeRot = nextOrientation.rot;
    updateShapeDirectionButton();
    return "rotation";
}

function rotateShapeToolOrientation(step = 1) {
    if (isShapeDirectionLocked(getSelectedBuilderShape())) {
        return rotateShapeToolLocal(step);
    }
    const index = getShapeDirectionCycleIndex(currentShapeDirection);
    currentShapeDirection = SHAPE_DIRECTIONS[(index + step + SHAPE_DIRECTIONS.length) % SHAPE_DIRECTIONS.length];
    updateShapeDirectionButton();
    return "direction";
}

function rotateActivePlacement(step = 1) {
    if (activeBuildTool === TOOL_SHAPE) {
        rotateShapeToolAroundWorldY(step);
        updateBuildPreview();
        updateBuilderToolsStatus(`Rotação da base da forma atualizada (${step > 0 ? "+90" : "-90"}deg)`);
        return;
    }

    currentRot = (currentRot + step + 4) % 4;
    if (activeBuildTool === TOOL_PLACE) updateRollOver();
    else updateBuildPreview();
}

function getPlacementMetrics(type, rot = 0, direction = SHAPE_DIRECTION_DEFAULT) {
    if (isPrefabType(type)) {
        const prefab = getPrefabByType(type);
        if (!prefab) return { dx: 1, dy: 1, dz: 1 };
        const isRotated = rot % 2 !== 0;
        return {
            dx: isRotated ? prefab.dz : prefab.dx,
            dy: prefab.dy,
            dz: isRotated ? prefab.dx : prefab.dz,
        };
    }

    const def = getRegisteredBlockDef(type);
    if (!def) return { dx: 1, dy: 1, dz: 1 };
    return getBlockMetrics(def, rot, direction);
}

function getTrimmedErrorMessage(error, fallbackMessage) {
    const message = error?.message || fallbackMessage;
    return message.length > 96 ? `${message.slice(0, 93)}...` : message;
}

function updateBuilderToolButtons() {
    builderToolButtons.forEach((button) => {
        button.classList.toggle("active", button.dataset.buildTool === activeBuildTool);
    });
}

function updateHistoryButtons() {
    if (builderToolUndoButton) builderToolUndoButton.disabled = undoStack.length === 0;
    if (builderToolRedoButton) builderToolRedoButton.disabled = redoStack.length === 0;
}

function updateBuilderToolsStatus(extraMessage = "") {
    if (!builderToolsStatus) return;

    updateShapeDirectionButton();

    const toolNames = {
        [TOOL_PLACE]: "bloco",
        [TOOL_AREA]: "área",
        [TOOL_FLOOR]: "chão",
        [TOOL_WALL]: "parede",
        [TOOL_SELECT]: "seleção",
        [TOOL_SHAPE]: `forma 3D (${builderToolShapeSelect?.value || "cuboid"})`,
        [TOOL_PASTE]: "colar",
        [TOOL_DELETE_BLOCK]: "apagar bloco",
        [TOOL_DELETE_GROUP]: "apagar estrutura",
    };

    const selectionLabel = selectedBlockIds.size > 0 ? ` | Seleção: ${selectedBlockIds.size} bloco(s)` : "";
    const clipboardLabel = clipboardRecipe?.blocks?.length ? ` | Clipboard: ${clipboardRecipe.blocks.length} bloco(s)` : "";
    const directionLabel = activeBuildTool === TOOL_SHAPE ? ` | Direção: ${getShapeDirectionLabel(getActiveShapeDirection())}` : "";
    const shapeRotationLabel = activeBuildTool === TOOL_SHAPE
        ? ` | Giro: ${getShapeRotationLabel(getActiveShapeRot())}`
        : "";
    const historyLabel = ` | Histórico: ${undoStack.length}/${redoStack.length}`;
    builderToolsStatus.textContent = `Ferramenta: ${toolNames[activeBuildTool] || activeBuildTool}${directionLabel}${shapeRotationLabel}${selectionLabel}${clipboardLabel}${historyLabel}${extraMessage ? ` | ${extraMessage}` : ""}`;
    updateHistoryButtons();
}

function syncShapeSelectOptions() {
    if (!builderToolShapeSelect) return;
    const currentValue = builderToolShapeSelect.value;
    builderToolShapeSelect.innerHTML = FORMAS_3D.map((shape) => `<option value="${shape}">${shape}</option>`).join("");
    builderToolShapeSelect.value = FORMAS_3D.includes(currentValue) ? currentValue : "cuboid";
}

function clearToolPreview() {
    if (!toolPreview) return;
    if (toolPreview.parent) toolPreview.parent.remove(toolPreview);
    if (toolPreview.userData?.disposeOnClear) {
        toolPreview.traverse?.((node) => {
            if (node.userData?.disposeGeometry && node.geometry?.dispose) node.geometry.dispose();
            if (node.userData?.disposeMaterial && node.material?.dispose) node.material.dispose();
        });
    }
    toolPreview = null;
    lastToolPreviewKey = "";
}

function applyToolPreviewValidity(preview, isValid) {
    if (!preview) return;
    const ghostMaterial = isValid ? matGhostValid : matGhostInvalid;
    preview.traverse?.((node) => {
        if (node.isMesh && !node.userData?.isHitbox) node.material = ghostMaterial;
    });
    preview.userData.isValid = isValid;
}

function setToolPreviewBounds(bounds, isValid, key) {
    if (!bounds || bounds.dx <= 0 || bounds.dy <= 0 || bounds.dz <= 0 || isFirstPerson) {
        clearToolPreview();
        return;
    }

    if (key && key === lastToolPreviewKey && toolPreview) {
        if (toolPreview.userData?.isValid !== isValid) applyToolPreviewValidity(toolPreview, isValid);
        return;
    }

    clearToolPreview();
    const geometry = new THREE.BoxGeometry(bounds.dx, bounds.dy, bounds.dz);
    const material = new THREE.MeshBasicMaterial({
        color: isValid ? TOOL_PREVIEW_VALID : TOOL_PREVIEW_INVALID,
        wireframe: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
    });
    const preview = new THREE.Mesh(geometry, material);
    preview.position.set(bounds.minX + bounds.dx / 2, bounds.minY + bounds.dy / 2, bounds.minZ + bounds.dz / 2);
    preview.renderOrder = 999;
    preview.userData.disposeOnClear = true;
    preview.userData.disposeGeometry = true;
    preview.userData.disposeMaterial = true;
    preview.userData.isValid = isValid;
    toolPreview = preview;
    lastToolPreviewKey = key || "";
    scene.add(preview);
}

function setToolPreviewBundle(bundle, isValid, key) {
    if (!bundle?.blocks?.length || isFirstPerson) {
        clearToolPreview();
        return;
    }

    if (key && key === lastToolPreviewKey && toolPreview) {
        if (toolPreview.userData?.isValid !== isValid) applyToolPreviewValidity(toolPreview, isValid);
        return;
    }

    clearToolPreview();
    const preview = new THREE.Group();
    preview.renderOrder = 998;

    bundle.blocks.forEach((block) => {
        const { dx, dz } = getPlacementMetrics(block.type, block.rot, block.direction);
        const blockPreview = createBlockGroup(block.type, block.color, block.rot, true, block.direction);
        blockPreview.position.set(block.cx + dx / 2, block.cy, block.cz + dz / 2);
        preview.add(blockPreview);
    });

    applyToolPreviewValidity(preview, isValid);
    toolPreview = preview;
    lastToolPreviewKey = key || "";
    scene.add(preview);
}

function setActiveBuildTool(tool, hint = "") {
    activeBuildTool = tool;
    isDeleteMode = tool === TOOL_DELETE_BLOCK;
    isDeleteGroupMode = tool === TOOL_DELETE_GROUP;
    clearHighlights();
    selectionAnchor = null;
    updateBuilderToolButtons();
    const deleteButton = document.getElementById("btn-delete");
    const deleteGroupButton = document.getElementById("btn-delete-group");
    if (deleteButton) deleteButton.classList.toggle("active", isDeleteMode);
    if (deleteGroupButton) deleteGroupButton.classList.toggle("active", isDeleteGroupMode);
    if (tool !== TOOL_SELECT) clearToolPreview();
    if (tool === TOOL_PLACE) updateRollOver();
    else if (rollOver) rollOver.visible = false;
    updateBuilderToolsStatus(hint);
}

function getToolDimensions() {
    return {
        width: clampPositiveInt(builderToolWidthInput?.value, 6),
        depth: clampPositiveInt(builderToolDepthInput?.value, 6),
        height: clampPositiveInt(builderToolHeightInput?.value, 4),
    };
}

function getBrushBlockType({ forceVoxel = false } = {}) {
    if (forceVoxel || isPrefabType(currentType) || currentType === "Rotor") return "1x1";
    const def = getRegisteredBlockDef(currentType);
    return def && !def.animated ? currentType : "1x1";
}

function getSelectionBoundsFromPoints(anchor, point) {
    const dims = getToolDimensions();
    const minX = Math.min(anchor.cx, point.cx);
    const minZ = Math.min(anchor.cz, point.cz);
    const minY = Math.min(anchor.cy, point.cy);
    const maxX = Math.max(anchor.cx, point.cx) + 1;
    const maxZ = Math.max(anchor.cz, point.cz) + 1;
    const maxY = minY + dims.height;

    return {
        minX,
        minY,
        minZ,
        maxX,
        maxY,
        maxZ,
        dx: maxX - minX,
        dy: maxY - minY,
        dz: maxZ - minZ,
    };
}

function blockIntersectsBounds(block, bounds) {
    const maxBlockX = block.cx + block.dx;
    const maxBlockY = block.cy + block.dy;
    const maxBlockZ = block.cz + block.dz;
    return block.cx < bounds.maxX && maxBlockX > bounds.minX && block.cy < bounds.maxY && maxBlockY > bounds.minY && block.cz < bounds.maxZ && maxBlockZ > bounds.minZ;
}

function clearSelection() {
    selectedBlockIds.forEach((blockId) => applyBlockColor(blockId, blockById.get(blockId)?.colorHex || 0xffffff));
    selectedBlockIds.clear();
    selectionBounds = null;
    selectionAnchor = null;
    updateBuilderToolsStatus();
}

function applySelectionBounds(bounds) {
    clearSelection();
    selectionBounds = bounds;
    for (const block of blockById.values()) {
        if (!blockIntersectsBounds(block, bounds)) continue;
        selectedBlockIds.add(block.id);
        applyBlockColor(block.id, SELECTION_HIGHLIGHT_COLOR);
    }
    updateBuilderToolsStatus(selectedBlockIds.size > 0 ? "Seleção atualizada" : "Nenhum bloco na área");
}

function getSelectedBlocks() {
    [...selectedBlockIds].forEach((blockId) => {
        if (!blockById.has(blockId)) selectedBlockIds.delete(blockId);
    });
    return [...selectedBlockIds].map((blockId) => blockById.get(blockId)).filter(Boolean);
}

function copySelectionToClipboard() {
    const selectedBlocks = getSelectedBlocks();
    if (selectedBlocks.length === 0) {
        showHint("Faça uma seleção antes de copiar.");
        return false;
    }

    const recipe = buildLocalPrefabFromWorldBlocks(selectedBlocks);
    clipboardRecipe = {
        ...recipe,
        bounds: {
            minX: 0,
            minY: 0,
            minZ: 0,
            maxX: recipe.dx,
            maxY: recipe.dy,
            maxZ: recipe.dz,
            dx: recipe.dx,
            dy: recipe.dy,
            dz: recipe.dz,
        },
    };
    updateBuilderToolsStatus("Seleção copiada");
    showHint(`${selectedBlocks.length} bloco(s) copiados.`);
    return true;
}

function getBundleBounds(bundle) {
    if (!bundle?.blocks?.length) return null;

    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;

    bundle.blocks.forEach((block) => {
        const { dx, dy, dz } = getPlacementMetrics(block.type, block.rot, block.direction);
        minX = Math.min(minX, block.cx);
        minY = Math.min(minY, block.cy);
        minZ = Math.min(minZ, block.cz);
        maxX = Math.max(maxX, block.cx + dx);
        maxY = Math.max(maxY, block.cy + dy);
        maxZ = Math.max(maxZ, block.cz + dz);
    });

    return { minX, minY, minZ, maxX, maxY, maxZ, dx: maxX - minX, dy: maxY - minY, dz: maxZ - minZ };
}

function snapshotBlocks(blocks, { singleGroupKey = null } = {}) {
    const snapshots = [];
    const groups = [];
    const seenGroups = new Set();

    blocks.forEach((block, index) => {
        const groupKey = singleGroupKey || `group-${block.groupId}`;
        snapshots.push({
            cx: block.cx,
            cy: block.cy,
            cz: block.cz,
            type: block.type,
            color: block.color,
            rot: block.rot,
            ...(block.direction != null ? { direction: block.direction } : {}),
            groupKey,
        });

        if (singleGroupKey || seenGroups.has(groupKey)) return;
        seenGroups.add(groupKey);
        groups.push({
            groupKey,
            sourcePrefabId: groupToSourcePrefabId.get(block.groupId) || null,
            prefabPlacement: groupToPrefabPlacement.get(block.groupId) ? { ...groupToPrefabPlacement.get(block.groupId) } : null,
        });
    });

    if (singleGroupKey) groups.push({ groupKey: singleGroupKey, sourcePrefabId: null, prefabPlacement: null });
    return { blocks: snapshots, groups };
}

function createBundleFromRecipe(recipe, origin, { groupKey = "batch", groupMeta = null } = {}) {
    if (!recipe?.blocks?.length) return { blocks: [], groups: [] };

    return {
        blocks: recipe.blocks.map((block) => ({
            cx: origin.cx + block.lx,
            cy: origin.cy + block.ly,
            cz: origin.cz + block.lz,
            type: block.type,
            color: block.color,
            rot: block.rot,
            ...(block.direction != null ? { direction: block.direction } : {}),
            groupKey,
        })),
        groups: [{ groupKey, sourcePrefabId: groupMeta?.sourcePrefabId || null, prefabPlacement: groupMeta?.prefabPlacement || null }],
    };
}

function createPrefabBundle(cx, cy, cz, prefabId, rot) {
    const prefab = PREFABS[prefabId];
    const normalizedRot = ((rot % 4) + 4) % 4;
    const rotation = prefab?.meta?.rotations[normalizedRot];
    if (!prefab || !rotation) return { blocks: [], groups: [] };

    return {
        blocks: rotation.blocks.map((block) => ({
            cx: cx + block.lx,
            cy: cy + block.ly,
            cz: cz + block.lz,
            type: block.type,
            color: block.color,
            rot: block.rot,
            ...(block.direction != null ? { direction: block.direction } : {}),
            groupKey: `prefab-${prefabId}`,
        })),
        groups: [{
            groupKey: `prefab-${prefabId}`,
            sourcePrefabId: prefabId,
            prefabPlacement: { type: prefabId, x: cx, y: cy, z: cz, rot: normalizedRot },
        }],
    };
}

function placeBundle(bundle, skipStats = false) {
    const groupIds = new Map();
    const createdBlockIds = [];

    bundle.groups?.forEach((group) => {
        const groupId = getNextUniqueId();
        groupIds.set(group.groupKey, groupId);
        if (group.sourcePrefabId) groupToSourcePrefabId.set(groupId, group.sourcePrefabId);
        if (group.prefabPlacement) groupToPrefabPlacement.set(groupId, { ...group.prefabPlacement });
    });

    bundle.blocks.forEach((block) => {
        if (!groupIds.has(block.groupKey)) groupIds.set(block.groupKey, getNextUniqueId());
        const placed = placeBlock(block.cx, block.cy, block.cz, block.type, block.color, block.rot, true, groupIds.get(block.groupKey), block.direction);
        if (placed) createdBlockIds.push(placed.id);
    });

    if (!skipStats) updateStats();
    return createdBlockIds;
}

function removeBlocksByIds(blockIds, skipStats = false) {
    [...new Set(blockIds)]
        .map((blockId) => blockById.get(blockId))
        .filter(Boolean)
        .forEach((block) => removeBlock(block, true));

    if (!skipStats) updateStats();
}

function createPlacementCommand(bundle, label) {
    let activeBlockIds = [];
    return {
        label,
        execute() {
            activeBlockIds = placeBundle(bundle);
        },
        undo() {
            removeBlocksByIds(activeBlockIds);
        },
    };
}

function createDeleteCommand(blocks, label) {
    const bundle = snapshotBlocks(blocks);
    let activeBlockIds = blocks.map((block) => block.id);
    return {
        label,
        execute() {
            removeBlocksByIds(activeBlockIds);
        },
        undo() {
            activeBlockIds = placeBundle(bundle);
        },
    };
}

function executeBuilderCommand(command) {
    command.execute();
    undoStack.push(command);
    redoStack.length = 0;
    getSelectedBlocks();
    updateBuilderToolsStatus(command.label);
    updateBuildPreview();
}

function undoBuilderCommand() {
    const command = undoStack.pop();
    if (!command) return false;
    command.undo();
    redoStack.push(command);
    getSelectedBlocks();
    updateBuilderToolsStatus(`Desfeito: ${command.label}`);
    updateBuildPreview();
    return true;
}

function redoBuilderCommand() {
    const command = redoStack.pop();
    if (!command) return false;
    command.execute();
    undoStack.push(command);
    getSelectedBlocks();
    updateBuilderToolsStatus(`Refeito: ${command.label}`);
    updateBuildPreview();
    return true;
}

function hasBundleWorldSupport(occupiedCells, cellByKey, supportQuery) {
    if (!occupiedCells.length) return false;

    let componentCount = 0;
    const stack = [];
    const neighborOffsets = [
        [1, 0, 0],
        [-1, 0, 0],
        [0, 1, 0],
        [0, -1, 0],
        [0, 0, 1],
        [0, 0, -1],
    ];

    for (const cell of occupiedCells) {
        if (cell.component >= 0) continue;
        cell.component = componentCount;
        stack.push(cell);

        while (stack.length) {
            const current = stack.pop();
            for (const [offsetX, offsetY, offsetZ] of neighborOffsets) {
                const neighbor = cellByKey.get(`${current.x + offsetX},${current.y + offsetY},${current.z + offsetZ}`);
                if (!neighbor || neighbor.component >= 0) continue;
                neighbor.component = componentCount;
                stack.push(neighbor);
            }
        }

        componentCount += 1;
    }

    if (componentCount === 0) return false;

    const supportedComponents = new Set();
    for (const cell of occupiedCells) {
        if (cellByKey.has(`${cell.x},${cell.y - 1},${cell.z}`)) continue;

        if (cell.y === 0) {
            supportedComponents.add(cell.component);
        } else {
            const below = getVoxelWithContext(cell.x, cell.y - 1, cell.z, supportQuery);
            if (hasStudSupport(below)) supportedComponents.add(cell.component);
        }

        if (supportedComponents.size === componentCount) return true;
    }

    return supportedComponents.size === componentCount;
}

function canPlaceBundle(bundle) {
    if (!bundle?.blocks?.length) return false;
    if (blocksCount + bundle.blocks.length > MAX_BLOCKS) return false;

    const half = CURRENT_GRID_SIZE / 2;
    const occupancyQuery = createVoxelQueryContext();
    const supportQuery = createVoxelQueryContext();
    const plannedCells = new Set();
    const occupiedCells = [];
    const cellByKey = new Map();

    for (const block of bundle.blocks) {
        const { dx, dy, dz } = getPlacementMetrics(block.type, block.rot, block.direction);
        for (let x = 0; x < dx; x++) {
            for (let y = 0; y < dy; y++) {
                for (let z = 0; z < dz; z++) {
                    const wx = block.cx + x;
                    const wy = block.cy + y;
                    const wz = block.cz + z;
                    const key = `${wx},${wy},${wz}`;
                    if (wy < 0 || wy >= MAX_HEIGHT) return false;
                    if (wx < -half || wx >= half || wz < -half || wz >= half) return false;
                    if (plannedCells.has(key)) return false;
                    if (hasVoxelWithContext(wx, wy, wz, occupancyQuery)) return false;
                    plannedCells.add(key);
                    const cell = { x: wx, y: wy, z: wz, key, component: -1 };
                    occupiedCells.push(cell);
                    cellByKey.set(key, cell);
                }
            }
        }
    }

    return hasBundleWorldSupport(occupiedCells, cellByKey, supportQuery);
}

function buildActiveToolRecipe() {
    const dims = getToolDimensions();
    switch (activeBuildTool) {
        case TOOL_AREA:
            return createAreaRecipe({ type: getBrushBlockType(), color: currentColor, rot: currentRot, width: dims.width, depth: dims.depth, height: dims.height });
        case TOOL_FLOOR:
            return createFloorRecipe({ type: getBrushBlockType(), color: currentColor, rot: currentRot, width: dims.width, depth: dims.depth });
        case TOOL_WALL:
            return createWallRecipe({ type: getBrushBlockType(), color: currentColor, rot: currentRot, width: dims.width, height: dims.height });
        case TOOL_SHAPE:
            return createShapeRecipe(getSelectedBuilderShape(), {
                color: currentColor,
                width: dims.width,
                depth: dims.depth,
                height: dims.height,
                direction: getActiveShapeDirection(),
                rot: getActiveShapeRot(),
            });
        case TOOL_PASTE:
            return clipboardRecipe || { blocks: [], bounds: { dx: 0, dy: 0, dz: 0 } };
        default:
            return null;
    }
}

function buildSingleBlockRecipe() {
    return {
        blocks: [{ type: currentType, color: currentColor, rot: currentRot, lx: 0, ly: 0, lz: 0 }],
        bounds: { minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: 1, dx: 1, dy: 1, dz: 1 },
    };
}

function buildPlacementBundleAt(origin) {
    if (activeBuildTool === TOOL_PLACE) {
        const prefabId = getPrefabIdFromType(currentType);
        if (prefabId) return createPrefabBundle(origin.cx, origin.cy, origin.cz, prefabId, currentRot);
        return createBundleFromRecipe(buildSingleBlockRecipe(), origin, { groupKey: "manual-block" });
    }

    const recipe = buildActiveToolRecipe();
    if (!recipe?.blocks?.length) return { blocks: [], groups: [] };
    return createBundleFromRecipe(recipe, origin, { groupKey: `${activeBuildTool}-batch` });
}

function getPlacementCommandLabel() {
    if (activeBuildTool === TOOL_PLACE) {
        const prefabId = getPrefabIdFromType(currentType);
        return prefabId ? `Colar prefab ${prefabId}` : `Colocar ${currentType}`;
    }
    if (activeBuildTool === TOOL_AREA) return "Construir área";
    if (activeBuildTool === TOOL_FLOOR) return "Construir chão";
    if (activeBuildTool === TOOL_WALL) return "Construir parede";
    if (activeBuildTool === TOOL_SHAPE) {
        const rotationSuffix = getActiveShapeRot() !== 0 ? ` ${getShapeRotationLabel(getActiveShapeRot())}` : "";
        return `Construir ${getSelectedBuilderShape()} ${getShapeDirectionLabel(getActiveShapeDirection())}${rotationSuffix}`;
    }
    if (activeBuildTool === TOOL_PASTE) return "Colar seleção";
    return "Construir";
}

function getActivePlacementFootprint() {
    if (activeBuildTool === TOOL_PLACE) return getPlacementFootprint(currentType, currentRot);
    if (activeBuildTool === TOOL_SELECT) return { dx: 1, dz: 1 };
    const recipe = buildActiveToolRecipe();
    if (!recipe?.bounds) return { dx: 1, dz: 1 };
    return { dx: Math.max(1, recipe.bounds.dx), dz: Math.max(1, recipe.bounds.dz) };
}

function updateBuildPreview() {
    if (isFirstPerson) {
        clearToolPreview();
        return;
    }

    if (activeBuildTool === TOOL_PLACE) {
        clearToolPreview();
        updateRollOverVisual();
        return;
    }

    if (activeBuildTool === TOOL_SELECT) {
        if (rollOver) rollOver.visible = false;
        if (!selectionAnchor) {
            clearToolPreview();
            return;
        }

        const bounds = getSelectionBoundsFromPoints(selectionAnchor, { cx: currentCX, cy: currentCY, cz: currentCZ });
        setToolPreviewBounds(bounds, true, `select:${bounds.minX}:${bounds.minY}:${bounds.minZ}:${bounds.maxX}:${bounds.maxY}:${bounds.maxZ}`);
        return;
    }

    const recipe = buildActiveToolRecipe();
    if (!recipe?.blocks?.length) {
        clearToolPreview();
        return;
    }

    const bundle = createBundleFromRecipe(recipe, { cx: currentCX, cy: currentCY, cz: currentCZ }, { groupKey: `preview-${activeBuildTool}` });
    const bounds = getBundleBounds(bundle);
    const isValid = canPlaceBundle(bundle);
    const previewKey = `${activeBuildTool}:${currentCX}:${currentCY}:${currentCZ}:${recipe.bounds.dx}:${recipe.bounds.dy}:${recipe.bounds.dz}:${getSelectedBuilderShape()}:${getActiveShapeDirection()}:${getActiveShapeRot()}:${currentColor}`;
    if (activeBuildTool === TOOL_SHAPE) setToolPreviewBundle(bundle, isValid, previewKey);
    else setToolPreviewBounds(bounds, isValid, previewKey);
    if (rollOver) rollOver.visible = false;
}

function inferWorldExportName(seedBlock, connectedBlocks) {
    const groupBlocks = groupToBlockIds.get(seedBlock.groupId);
    const matchesSeedGroupOnly =
        groupBlocks && groupBlocks.size === connectedBlocks.length && connectedBlocks.every((block) => block.groupId === seedBlock.groupId);

    if (matchesSeedGroupOnly) {
        const placement = groupToPrefabPlacement.get(seedBlock.groupId);
        if (placement?.type) return placement.type;
        const sourcePrefabId = groupToSourcePrefabId.get(seedBlock.groupId);
        if (sourcePrefabId) return sourcePrefabId;
    }

    return `EstruturaCustom ${exportedStructureSerial++}`;
}

function buildWorldStructureExportPayload(seedBlockId) {
    const seedBlock = blockById.get(seedBlockId);
    if (!seedBlock) return null;

    const connectedBlocks = collectConnectedWorldBlocks([...blockById.values()], seedBlockId);
    if (connectedBlocks.length === 0) return null;

    const localPrefab = buildLocalPrefabFromWorldBlocks(connectedBlocks);
    const exported = buildPrefabExport(inferWorldExportName(seedBlock, connectedBlocks), localPrefab.blocks, localPrefab);
    return { ...exported, sourceType: "world" };
}

async function exportWorldStructureToTextarea(seedBlockId) {
    const exported = buildWorldStructureExportPayload(seedBlockId);
    if (!exported) return false;

    if (jsonTextarea) {
        jsonTextarea.value = exported.json;
        jsonTextarea.focus();
        jsonTextarea.setSelectionRange(0, exported.json.length);
    }

    const copied = await copyTextToClipboard(exported.json);
    showHint(copied ? `JSON salvo da estrutura: ${exported.name}` : `JSON gerado: ${exported.name}`);
    return true;
}

async function createPrefabsZip() {
    const JSZipLib = globalThis.JSZip;
    if (!JSZipLib) {
        showHint("JSZip não está carregado.");
        return;
    }

    const btn = document.getElementById("btn-export-prefabs-zip");
    if (btn) {
        btn.disabled = true;
        btn.dataset.origText = btn.innerText;
        btn.innerText = "Gerando ZIP...";
    }

    const zip = new JSZipLib();
    const prefabFolder = zip.folder("prefabs");
    const prefabNames = Object.keys(PREFABS).filter((n) => !(isRuntimePrefab && isRuntimePrefab(n)));
    const errors = [];

    for (const name of prefabNames) {
        try {
            const json = getPrefabJson(name);
            prefabFolder.file(`${name}.json`, json);
        } catch (err) {
            errors.push(`${name}: ${getTrimmedErrorMessage(err, String(err))}`);
        }
    }

    const metadata = { generatedAt: new Date().toISOString(), count: prefabNames.length, names: prefabNames };
    zip.file("metadata.json", JSON.stringify(metadata, null, 2));
    if (errors.length) zip.file("errors.log", errors.join("\n"));

    try {
        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "prefabs-defaults.zip";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showHint(`ZIP criado: ${prefabNames.length} prefabs`);
    } catch (err) {
        showHint(`Erro ao gerar ZIP: ${getTrimmedErrorMessage(err, String(err))}`);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = btn.dataset.origText || "Exportar Prefabs (ZIP)";
        }
    }
}

// --- ESTADO: MODO 1ª PESSOA ---
let isFirstPerson = false;
let fpYaw = 0;
let fpPitch = 0;
let playerPos = new THREE.Vector3(0, 5, 0);
let playerVel = new THREE.Vector3(0, 0, 0);
let isGrounded = false;
let isDraggingView = false;
let lastTouch = { x: 0, y: 0 };
const tempForward = new THREE.Vector3();
const tempRight = new THREE.Vector3();
const tempDir = new THREE.Vector3();
const tempPlacementPoint = new THREE.Vector3();
const tempPlacementNormal = new THREE.Vector3();
const tempMatrix = new THREE.Matrix4();
const tempPlacementMatrix = new THREE.Matrix4();
const tempInstanceWorldMatrix = new THREE.Matrix4();
const tempColor = new THREE.Color();
const tempEuler = new THREE.Euler(0, 0, 0, "YXZ");
const tempPickNormal = new THREE.Vector3();
const tempGroundPoint = new THREE.Vector3();
const tempRayEntryPoint = new THREE.Vector3();
const tempRayHitPoint = new THREE.Vector3();
const tempLookTarget = new THREE.Vector3();
const tempWaypoint = new THREE.Vector3();
const tempStudNormal = new THREE.Vector3();
const tempStudQuaternion = new THREE.Quaternion();
const pendingPointerMove = { active: false, clientX: 0, clientY: 0 };
const rayInterval = { enter: 0, exit: 0, normal: new THREE.Vector3() };
const groundNormal = new THREE.Vector3(0, 1, 0);
const pickResult = {
    kind: "none",
    block: null,
    distance: Infinity,
    point: new THREE.Vector3(),
    face: { normal: new THREE.Vector3() },
    voxelX: 0,
    voxelY: 0,
    voxelZ: 0,
};

function getDevicePixelRatio() {
    return Math.max(1, globalThis.devicePixelRatio || 1);
}

function detectMobileQualityTier() {
    const userAgent = navigator.userAgent || "";
    const shortestViewport = Math.min(globalThis.innerWidth || GRID_SIZE_LARGE, globalThis.innerHeight || GRID_SIZE_LARGE);
    const longestViewport = Math.max(globalThis.innerWidth || GRID_SIZE_LARGE, globalThis.innerHeight || GRID_SIZE_LARGE);
    const coarsePointer = globalThis.matchMedia?.("(pointer: coarse)")?.matches ?? false;
    const hoverNone = globalThis.matchMedia?.("(hover: none)")?.matches ?? false;
    const touchPoints = navigator.maxTouchPoints || 0;
    const isPhoneAgent = /Android.+Mobile|iPhone|iPod|Windows Phone|IEMobile|Opera Mini/i.test(userAgent);
    const isTabletAgent = /iPad|Tablet|Android(?!.*Mobile)/i.test(userAgent);
    const looksTouchDriven = coarsePointer || hoverNone || touchPoints > 0;
    const looksMobile = isPhoneAgent || isTabletAgent || (looksTouchDriven && longestViewport <= MOBILE_TABLET_VIEWPORT_MAX);

    if (!looksMobile) return "desktop";
    if (isPhoneAgent || shortestViewport <= MOBILE_PHONE_VIEWPORT_MAX) return "phone";
    return "tablet";
}

function createMobileQualityProfile() {
    const tier = detectMobileQualityTier();
    const devicePixelRatio = getDevicePixelRatio();
    const aggressive = tier !== "desktop";
    let pixelRatioCap = 2;
    let minDynamicScale = 1;

    if (tier === "phone") {
        pixelRatioCap = MOBILE_MAX_PIXEL_RATIO_PHONE;
        minDynamicScale = MOBILE_DYNAMIC_SCALE_MIN_PHONE;
    } else if (tier === "tablet") {
        pixelRatioCap = MOBILE_MAX_PIXEL_RATIO_TABLET;
        minDynamicScale = MOBILE_DYNAMIC_SCALE_MIN_TABLET;
    }

    const basePixelRatio = Math.min(devicePixelRatio, pixelRatioCap);

    return {
        tier,
        aggressive,
        basePixelRatio,
        dynamicScale: 1,
        effectivePixelRatio: basePixelRatio,
        minDynamicScale,
        highFrameStreak: 0,
        lowFrameStreak: 0,
        viewportWidth: 0,
        viewportHeight: 0,
        memoryPollMs: aggressive ? MEMORY_POLL_MS * MOBILE_MEMORY_POLL_INTERVAL_MULTIPLIER : MEMORY_POLL_MS,
        shadowMapSize: aggressive ? MOBILE_SHADOW_MAP_SIZE : DESKTOP_SHADOW_MAP_SIZE,
    };
}

const mobileQualityProfile = createMobileQualityProfile();

function refreshMobileQualityProfile() {
    const previousTier = mobileQualityProfile.tier;
    const preservedScale = mobileQualityProfile.aggressive ? mobileQualityProfile.dynamicScale : 1;
    const nextProfile = createMobileQualityProfile();

    nextProfile.dynamicScale = nextProfile.aggressive ? Math.min(1, Math.max(nextProfile.minDynamicScale, preservedScale)) : 1;
    nextProfile.effectivePixelRatio = nextProfile.basePixelRatio * nextProfile.dynamicScale;
    nextProfile.viewportWidth = mobileQualityProfile.viewportWidth;
    nextProfile.viewportHeight = mobileQualityProfile.viewportHeight;

    Object.assign(mobileQualityProfile, nextProfile);
    return previousTier !== nextProfile.tier;
}

function getQualityLabel() {
    const pixelRatioLabel = mobileQualityProfile.effectivePixelRatio.toFixed(2);
    if (!mobileQualityProfile.aggressive) return `desktop | dpr ${pixelRatioLabel}`;
    return `${mobileQualityProfile.tier} | ${mobileQualityProfile.dynamicScale.toFixed(2)}x | dpr ${pixelRatioLabel}`;
}

// --- SETUP THREE.JS ---
const container = document.getElementById("canvas-container");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe8ecf1);

const aspect = globalThis.innerWidth / globalThis.innerHeight;
const viewSize = 120;

const orthoCamera = new THREE.OrthographicCamera(-viewSize * aspect, viewSize * aspect, viewSize, -viewSize, 1, 2500);
updateCameraTarget();
visualCamOffset.copy(targetCamOffset);
orthoCamera.position.copy(cameraTarget).add(visualCamOffset);
orthoCamera.lookAt(cameraTarget);

const fpCamera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
fpCamera.rotation.order = "YXZ";

let activeCamera = orthoCamera;

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.domElement.style.display = "block";
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false; // Desligado por default para manter performance

function applyRendererResolution(force = false) {
    const viewportWidth = Math.max(1, globalThis.innerWidth || container.clientWidth || 1);
    const viewportHeight = Math.max(1, globalThis.innerHeight || container.clientHeight || 1);
    const effectivePixelRatio = Number((mobileQualityProfile.basePixelRatio * mobileQualityProfile.dynamicScale).toFixed(2));
    const needsUpdate =
        force ||
        viewportWidth !== mobileQualityProfile.viewportWidth ||
        viewportHeight !== mobileQualityProfile.viewportHeight ||
        Math.abs(effectivePixelRatio - mobileQualityProfile.effectivePixelRatio) >= 0.01;

    if (!needsUpdate) return false;

    mobileQualityProfile.viewportWidth = viewportWidth;
    mobileQualityProfile.viewportHeight = viewportHeight;
    mobileQualityProfile.effectivePixelRatio = effectivePixelRatio;
    renderer.setPixelRatio(effectivePixelRatio);
    renderer.setSize(viewportWidth, viewportHeight, false);
    renderer.domElement.style.width = `${viewportWidth}px`;
    renderer.domElement.style.height = `${viewportHeight}px`;
    return true;
}

container.appendChild(renderer.domElement);
applyRendererResolution(true);

function createSampler(limit = PERF_SAMPLE_LIMIT) {
    return { values: new Array(limit), limit, count: 0, index: 0 };
}

function pushSamplerSample(sampler, value) {
    if (!sampler || !Number.isFinite(value)) return;
    sampler.values[sampler.index] = value;
    sampler.index = (sampler.index + 1) % sampler.limit;
    sampler.count = Math.min(sampler.count + 1, sampler.limit);
}

function resetSampler(sampler) {
    if (!sampler) return;
    sampler.count = 0;
    sampler.index = 0;
}

function summarizeSampler(sampler) {
    if (!sampler || sampler.count === 0) return null;
    const values = sampler.values.slice(0, sampler.count).sort((a, b) => a - b);
    const sum = values.reduce((acc, value) => acc + value, 0);
    const p95Index = Math.min(values.length - 1, Math.floor((values.length - 1) * 0.95));
    return {
        avg: sum / values.length,
        p95: values[p95Index],
        max: values[values.length - 1],
    };
}

function formatMsStats(stats, digits = 1) {
    if (!stats) return "--";
    return `${stats.avg.toFixed(digits)} avg | ${stats.p95.toFixed(digits)} p95`;
}

function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "--";
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }
    const digits = value >= 100 || unitIndex === 0 ? 0 : 1;
    return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

const GEOMETRY_BYTES_CACHE = new WeakMap();

function getAttributeBytes(attribute) {
    if (!attribute || !attribute.array) return 0;
    return attribute.array.byteLength || 0;
}

function getGeometryBytes(geometry) {
    if (!geometry) return 0;
    if (GEOMETRY_BYTES_CACHE.has(geometry)) return GEOMETRY_BYTES_CACHE.get(geometry);

    let total = 0;
    for (const name in geometry.attributes) {
        total += getAttributeBytes(geometry.attributes[name]);
    }
    if (geometry.index) total += getAttributeBytes(geometry.index);
    GEOMETRY_BYTES_CACHE.set(geometry, total);
    return total;
}

const HITBOX_GEOMETRY_BYTES = getGeometryBytes(new THREE.BoxGeometry(1, 1, 1));
const VOXEL_ENTRY_ESTIMATE_BYTES = 56;
const CHUNK_ENTRY_ESTIMATE_BYTES = 320;
const BLOCK_DATA_ESTIMATE_BYTES = 192;
const GROUP_ENTRY_ESTIMATE_BYTES = 96;
const HITBOX_MESH_ESTIMATE_BYTES = 320;

function estimateAppMemoryUsage() {
    let geometryBytes = 0;
    let instancingBytes = 0;
    const seenGeometries = new WeakSet();

    for (const key in GEO_CACHE) {
        const geometry = GEO_CACHE[key];
        if (!geometry || seenGeometries.has(geometry)) continue;
        seenGeometries.add(geometry);
        geometryBytes += getGeometryBytes(geometry);
    }

    for (const key in imGroups) {
        const grp = imGroups[key];
        if (!grp) continue;
        if (grp.mesh.geometry && !seenGeometries.has(grp.mesh.geometry)) {
            seenGeometries.add(grp.mesh.geometry);
            geometryBytes += getGeometryBytes(grp.mesh.geometry);
        }
        if (grp.mesh.instanceMatrix) instancingBytes += getAttributeBytes(grp.mesh.instanceMatrix);
        if (grp.mesh.instanceColor) instancingBytes += getAttributeBytes(grp.mesh.instanceColor);
    }

    const hitboxBytes = blockHitboxes.length * (HITBOX_GEOMETRY_BYTES + HITBOX_MESH_ESTIMATE_BYTES);
    const voxelBytes = activeVoxelCount * VOXEL_ENTRY_ESTIMATE_BYTES;
    const chunkBytes = voxelChunks.size * CHUNK_ENTRY_ESTIMATE_BYTES;
    const blockBytes = blockById.size * BLOCK_DATA_ESTIMATE_BYTES;
    const groupBytes = groupToBlockIds.size * GROUP_ENTRY_ESTIMATE_BYTES;

    return {
        totalBytes: geometryBytes + instancingBytes + hitboxBytes + voxelBytes + chunkBytes + blockBytes + groupBytes,
        geometryBytes,
        instancingBytes,
        hitboxBytes,
        voxelBytes,
        chunkBytes,
        blockBytes,
        groupBytes,
    };
}

const perfDom = {
    panel: document.getElementById("perf-panel"),
    toggle: document.getElementById("btn-perf-toggle"),
    fps: document.getElementById("perf-fps"),
    frame: document.getElementById("perf-frame"),
    cpu: document.getElementById("perf-cpu"),
    raycast: document.getElementById("perf-raycast"),
    canPlace: document.getElementById("perf-can-place"),
    canPlacePrefab: document.getElementById("perf-can-prefab"),
    hover: document.getElementById("perf-hover"),
    highlight: document.getElementById("perf-highlight"),
    hitboxes: document.getElementById("perf-hitboxes"),
    chunks: document.getElementById("perf-chunks"),
    quality: document.getElementById("perf-quality"),
    memory: document.getElementById("perf-memory"),
    longTasks: document.getElementById("perf-longtasks"),
    status: document.getElementById("perf-status"),
    report: document.getElementById("perf-report"),
    scenario: document.getElementById("benchmark-scenario"),
    autoTarget: document.getElementById("benchmark-auto-target"),
    autoStart: document.getElementById("btn-benchmark-auto"),
    cancel: document.getElementById("btn-benchmark-cancel"),
};

const perfState = {
    overlayLastUpdate: 0,
    fps: 0,
    frameCount: 0,
    fpsWindowStart: performance.now(),
    memory: {
        label: "--",
        source: "",
        estimateLabel: "--",
        estimateBytes: 0,
        jsBytes: 0,
        deviceLabel: navigator.deviceMemory ? `${navigator.deviceMemory} GB disp.` : "",
    },
    longTasks: [],
    longTaskWorst: 0,
    benchmark: {
        running: false,
        token: 0,
        target: 0,
        scenario: perfDom.scenario ? perfDom.scenario.value : "dense",
    },
    autobenchmark: {
        running: false,
        token: 0,
        phase: "idle",
        scenario: perfDom.scenario ? perfDom.scenario.value : "dense",
        target: perfDom.autoTarget ? Number(perfDom.autoTarget.value) : 20000,
        routeLabel: "",
        route: [],
        lookAt: new THREE.Vector3(),
        fixedLookAt: false,
        speed: 0,
        tolerance: AUTO_BENCHMARK_MOVE_TOLERANCE,
        buildPlaced: 0,
        buildMs: 0,
        runStartedAt: 0,
        moveStartedAt: 0,
        warmupUntil: 0,
        distance: 0,
        plannedDistance: 0,
        currentWaypoint: 0,
        lastProgressAt: 0,
        previousCameraTarget: new THREE.Vector3(),
        frameSampler: createSampler(AUTO_BENCHMARK_FRAME_LIMIT),
    },
    samplers: {
        frame: createSampler(),
        raycast: createSampler(),
        canPlace: createSampler(),
        canPlacePrefab: createSampler(),
        hover: createSampler(),
        highlight: createSampler(),
    },
};

function recordPerfSample(name, value) {
    pushSamplerSample(perfState.samplers[name], value);
}

function setPerfStatus(message, tone = "info") {
    if (!perfDom.status) return;
    perfDom.status.textContent = message;
    perfDom.status.dataset.tone = tone;
}

function setPerfReport(lines = "", tone = "info") {
    if (!perfDom.report) return;
    const content = Array.isArray(lines) ? lines.join("\n") : lines;
    perfDom.report.textContent = content || "Relatório Auto FP aguardando execução.";
    perfDom.report.dataset.tone = tone;
    perfDom.report.classList.toggle("empty", !content);
}

function getBenchmarkScenarioLabel(scenario) {
    return scenario === "prefab" ? "Prefabs Mistos" : "Denso 1x1";
}

function isAnyBenchmarkRunning() {
    return perfState.benchmark.running || perfState.autobenchmark.running;
}

function clearPressedKeys() {
    for (const code in keys) delete keys[code];
}

function syncFpCamera(lookAtPoint = null) {
    fpCamera.position.copy(playerPos);
    fpCamera.position.y += 1.6;
    if (lookAtPoint) {
        fpCamera.lookAt(lookAtPoint);
        fpYaw = fpCamera.rotation.y;
        fpPitch = fpCamera.rotation.x;
    } else {
        fpCamera.rotation.set(fpPitch, fpYaw, 0);
    }
}

function pruneLongTasks(now = performance.now()) {
    perfState.longTasks = perfState.longTasks.filter((entry) => now - entry.at <= 60000);
    perfState.longTaskWorst = perfState.longTasks.reduce((worst, entry) => Math.max(worst, entry.duration), 0);
}

let longTaskObserver = null;
if ("PerformanceObserver" in window) {
    try {
        longTaskObserver = new PerformanceObserver((list) => {
            const now = performance.now();
            list.getEntries().forEach((entry) => {
                perfState.longTasks.push({ at: now, duration: entry.duration });
            });
            pruneLongTasks(now);
        });
        longTaskObserver.observe({ entryTypes: ["longtask"] });
    } catch (error) {
        longTaskObserver = null;
    }
}

let isPollingMemory = false;
async function pollMemoryUsage() {
    if (isPollingMemory) return;
    isPollingMemory = true;
    try {
        const estimate = estimateAppMemoryUsage();
        perfState.memory.estimateLabel = `app~${formatBytes(estimate.totalBytes)}`;
        perfState.memory.estimateBytes = estimate.totalBytes;

        if (typeof performance.measureUserAgentSpecificMemory === "function") {
            const result = await performance.measureUserAgentSpecificMemory();
            perfState.memory.label = `${formatBytes(result.bytes)} JS`;
            perfState.memory.source = "ua";
            perfState.memory.jsBytes = result.bytes;
        } else if (performance.memory) {
            const used = performance.memory.usedJSHeapSize;
            const limit = performance.memory.jsHeapSizeLimit || performance.memory.totalJSHeapSize;
            perfState.memory.label = limit ? `${formatBytes(used)} / ${formatBytes(limit)} JS` : `${formatBytes(used)} JS`;
            perfState.memory.source = "heap";
            perfState.memory.jsBytes = used;
        } else {
            perfState.memory.label = perfState.memory.estimateLabel;
            perfState.memory.source = "estimate";
            perfState.memory.jsBytes = 0;
        }
    } catch (error) {
        perfState.memory.label = perfState.memory.estimateLabel;
        perfState.memory.source = "estimate";
        perfState.memory.jsBytes = 0;
    } finally {
        isPollingMemory = false;
    }
}

let memoryPollTimeoutId = 0;
function scheduleMemoryPolling() {
    if (memoryPollTimeoutId) globalThis.clearTimeout(memoryPollTimeoutId);
    memoryPollTimeoutId = globalThis.setTimeout(async () => {
        await pollMemoryUsage();
        scheduleMemoryPolling();
    }, mobileQualityProfile.memoryPollMs);
}

function updateMobileResolutionScale(frameStats) {
    if (!mobileQualityProfile.aggressive || !frameStats) return false;

    const frameMs = frameStats.avg;
    if (!Number.isFinite(frameMs)) return false;

    if (frameMs > MOBILE_DYNAMIC_SCALE_HIGH_MS) {
        mobileQualityProfile.highFrameStreak += 1;
        mobileQualityProfile.lowFrameStreak = 0;
    } else if (frameMs < MOBILE_DYNAMIC_SCALE_LOW_MS && mobileQualityProfile.dynamicScale < 1) {
        mobileQualityProfile.lowFrameStreak += 1;
        mobileQualityProfile.highFrameStreak = 0;
    } else {
        mobileQualityProfile.highFrameStreak = 0;
        mobileQualityProfile.lowFrameStreak = 0;
        return false;
    }

    if (
        mobileQualityProfile.highFrameStreak >= MOBILE_DYNAMIC_SCALE_HIGH_STREAK &&
        mobileQualityProfile.dynamicScale > mobileQualityProfile.minDynamicScale
    ) {
        mobileQualityProfile.dynamicScale = Math.max(
            mobileQualityProfile.minDynamicScale,
            Number((mobileQualityProfile.dynamicScale - MOBILE_DYNAMIC_SCALE_STEP_DOWN).toFixed(2)),
        );
        mobileQualityProfile.highFrameStreak = 0;
        mobileQualityProfile.lowFrameStreak = 0;
        resetSampler(perfState.samplers.frame);
        resetSampler(perfState.autobenchmark.frameSampler);
        return applyRendererResolution(true);
    }

    if (mobileQualityProfile.lowFrameStreak >= MOBILE_DYNAMIC_SCALE_LOW_STREAK && mobileQualityProfile.dynamicScale < 1) {
        mobileQualityProfile.dynamicScale = Math.min(
            1,
            Number((mobileQualityProfile.dynamicScale + MOBILE_DYNAMIC_SCALE_STEP_UP).toFixed(2)),
        );
        mobileQualityProfile.highFrameStreak = 0;
        mobileQualityProfile.lowFrameStreak = 0;
        resetSampler(perfState.samplers.frame);
        resetSampler(perfState.autobenchmark.frameSampler);
        return applyRendererResolution(true);
    }

    return false;
}

function updatePerfOverlay(force = false) {
    const now = performance.now();
    if (!force && now - perfState.overlayLastUpdate < PERF_UPDATE_MS) return;
    perfState.overlayLastUpdate = now;
    pruneLongTasks(now);

    const frameStats = summarizeSampler(perfState.samplers.frame);
    const raycastStats = summarizeSampler(perfState.samplers.raycast);
    const canPlaceStats = summarizeSampler(perfState.samplers.canPlace);
    const canPlacePrefabStats = summarizeSampler(perfState.samplers.canPlacePrefab);
    const hoverStats = summarizeSampler(perfState.samplers.hover);
    const highlightStats = summarizeSampler(perfState.samplers.highlight);
    updateMobileResolutionScale(frameStats);
    const cpuBudget = frameStats ? `${Math.min(999, (frameStats.avg / TARGET_FRAME_MS) * 100).toFixed(0)}% budget` : "--";
    const longTaskCount = perfState.longTasks.length;
    const memorySuffix = perfState.memory.deviceLabel ? ` | ${perfState.memory.deviceLabel}` : "";
    const memoryPrefix =
        perfState.memory.source === "estimate" || !perfState.memory.source ? perfState.memory.label : `${perfState.memory.label} | ${perfState.memory.estimateLabel}`;

    if (perfDom.fps) perfDom.fps.textContent = perfState.fps ? perfState.fps.toFixed(0) : "--";
    if (perfDom.frame) perfDom.frame.textContent = `${formatMsStats(frameStats)} ms`;
    if (perfDom.cpu) perfDom.cpu.textContent = cpuBudget;
    if (perfDom.raycast) perfDom.raycast.textContent = `${formatMsStats(raycastStats, 2)} ms`;
    if (perfDom.canPlace) perfDom.canPlace.textContent = `${formatMsStats(canPlaceStats, 2)} ms`;
    if (perfDom.canPlacePrefab) perfDom.canPlacePrefab.textContent = `${formatMsStats(canPlacePrefabStats, 2)} ms`;
    if (perfDom.hover) perfDom.hover.textContent = `${formatMsStats(hoverStats, 2)} ms`;
    if (perfDom.highlight) perfDom.highlight.textContent = `${formatMsStats(highlightStats, 2)} ms`;
    if (perfDom.hitboxes) perfDom.hitboxes.textContent = blockHitboxes.length.toLocaleString("pt-BR");
    if (perfDom.chunks) perfDom.chunks.textContent = voxelChunks.size.toLocaleString("pt-BR");
    if (perfDom.quality) perfDom.quality.textContent = getQualityLabel();
    if (perfDom.memory) perfDom.memory.textContent = `${memoryPrefix}${memorySuffix}`;
    if (perfDom.longTasks) {
        perfDom.longTasks.textContent = longTaskCount
            ? `${longTaskCount}/min | ${perfState.longTaskWorst.toFixed(0)} ms`
            : "0/min";
    }
}

function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(resolve));
}

function setPickResult(kind, block, distance, point, normal, voxelX = 0, voxelY = 0, voxelZ = 0) {
    pickResult.kind = kind;
    pickResult.block = block;
    pickResult.distance = distance;
    pickResult.point.copy(point);
    pickResult.face.normal.copy(normal);
    pickResult.voxelX = voxelX;
    pickResult.voxelY = voxelY;
    pickResult.voxelZ = voxelZ;
    return pickResult;
}

function getRayWorldInterval(origin, direction, half) {
    let tEnter = -Infinity;
    let tExit = Infinity;
    let normalX = 0;
    let normalY = 0;
    let normalZ = 0;

    const axisData = [
        { min: -half, max: half, origin: origin.x, dir: direction.x, normal: [1, 0, 0] },
        { min: 0, max: MAX_HEIGHT, origin: origin.y, dir: direction.y, normal: [0, 1, 0] },
        { min: -half, max: half, origin: origin.z, dir: direction.z, normal: [0, 0, 1] },
    ];

    for (const axis of axisData) {
        if (Math.abs(axis.dir) < PICK_EPSILON) {
            if (axis.origin < axis.min || axis.origin > axis.max) return null;
            continue;
        }

        const tMinPlane = (axis.min - axis.origin) / axis.dir;
        const tMaxPlane = (axis.max - axis.origin) / axis.dir;
        const minPlaneNormal = -1;
        const maxPlaneNormal = 1;

        const t1 = Math.min(tMinPlane, tMaxPlane);
        const t2 = Math.max(tMinPlane, tMaxPlane);
        const entryNormal = tMinPlane < tMaxPlane ? minPlaneNormal : maxPlaneNormal;

        if (t1 > tEnter) {
            tEnter = t1;
            normalX = axis.normal[0] * entryNormal;
            normalY = axis.normal[1] * entryNormal;
            normalZ = axis.normal[2] * entryNormal;
        }
        tExit = Math.min(tExit, t2);
        if (tEnter > tExit || tExit < 0) return null;
    }

    rayInterval.enter = Math.max(tEnter, 0);
    rayInterval.exit = tExit;
    rayInterval.normal.set(normalX, normalY, normalZ);
    return rayInterval;
}

function getGroundPick(origin, direction, half) {
    if (Math.abs(direction.y) < PICK_EPSILON) return null;
    const distance = -origin.y / direction.y;
    if (distance < 0) return null;

    tempGroundPoint.copy(direction).multiplyScalar(distance).add(origin);
    if (tempGroundPoint.x < -half || tempGroundPoint.x >= half || tempGroundPoint.z < -half || tempGroundPoint.z >= half) {
        return null;
    }

    return setPickResult("ground", null, distance, tempGroundPoint, groundNormal);
}

function getVoxelPick(origin, direction, half, maxDistance = Infinity) {
    const interval = getRayWorldInterval(origin, direction, half);
    if (!interval) return null;

    const entryDistance = interval.enter;
    if (entryDistance > maxDistance) return null;

    tempRayEntryPoint.copy(direction).multiplyScalar(entryDistance + PICK_EPSILON).add(origin);
    let cellX = Math.floor(tempRayEntryPoint.x);
    let cellY = Math.floor(tempRayEntryPoint.y);
    let cellZ = Math.floor(tempRayEntryPoint.z);

    if (entryDistance > PICK_EPSILON) {
        const startingBlock = getVoxel(cellX, cellY, cellZ);
        if (startingBlock) {
            tempRayHitPoint.copy(direction).multiplyScalar(entryDistance).add(origin);
            return setPickResult(
                "voxel",
                startingBlock,
                entryDistance,
                tempRayHitPoint,
                interval.normal,
                cellX,
                cellY,
                cellZ,
            );
        }
    }

    const stepX = direction.x > 0 ? 1 : direction.x < 0 ? -1 : 0;
    const stepY = direction.y > 0 ? 1 : direction.y < 0 ? -1 : 0;
    const stepZ = direction.z > 0 ? 1 : direction.z < 0 ? -1 : 0;

    let tMaxX = Infinity;
    let tMaxY = Infinity;
    let tMaxZ = Infinity;
    const tDeltaX = stepX === 0 ? Infinity : Math.abs(1 / direction.x);
    const tDeltaY = stepY === 0 ? Infinity : Math.abs(1 / direction.y);
    const tDeltaZ = stepZ === 0 ? Infinity : Math.abs(1 / direction.z);

    if (stepX !== 0) {
        const nextBoundaryX = stepX > 0 ? cellX + 1 : cellX;
        tMaxX = entryDistance + (nextBoundaryX - tempRayEntryPoint.x) / direction.x;
    }
    if (stepY !== 0) {
        const nextBoundaryY = stepY > 0 ? cellY + 1 : cellY;
        tMaxY = entryDistance + (nextBoundaryY - tempRayEntryPoint.y) / direction.y;
    }
    if (stepZ !== 0) {
        const nextBoundaryZ = stepZ > 0 ? cellZ + 1 : cellZ;
        tMaxZ = entryDistance + (nextBoundaryZ - tempRayEntryPoint.z) / direction.z;
    }

    while (true) {
        let distance = tMaxX;
        tempPickNormal.set(-stepX, 0, 0);

        if (tMaxY < distance) {
            distance = tMaxY;
            tempPickNormal.set(0, -stepY, 0);
        }
        if (tMaxZ < distance) {
            distance = tMaxZ;
            tempPickNormal.set(0, 0, -stepZ);
        }

        if (!Number.isFinite(distance) || distance > interval.exit || distance > maxDistance) return null;

        if (distance === tMaxX) {
            cellX += stepX;
            tMaxX += tDeltaX;
        } else if (distance === tMaxY) {
            cellY += stepY;
            tMaxY += tDeltaY;
        } else {
            cellZ += stepZ;
            tMaxZ += tDeltaZ;
        }

        if (cellX < -half || cellX >= half || cellZ < -half || cellZ >= half || cellY < 0 || cellY >= MAX_HEIGHT) {
            return null;
        }

        const block = getVoxel(cellX, cellY, cellZ);
        if (block) {
            tempRayHitPoint.copy(direction).multiplyScalar(distance).add(origin);
            return setPickResult("voxel", block, distance, tempRayHitPoint, tempPickNormal, cellX, cellY, cellZ);
        }
    }
}

function pickFromSceneRay() {
    const start = performance.now();
    const origin = raycaster.ray.origin;
    const direction = raycaster.ray.direction;
    const half = CURRENT_GRID_SIZE / 2;
    const groundPick = getGroundPick(origin, direction, half);
    const maxDistance = groundPick ? groundPick.distance : Infinity;
    const voxelPick = getVoxelPick(origin, direction, half, maxDistance);
    const result = voxelPick || groundPick;
    recordPerfSample("raycast", performance.now() - start);
    return result;
}

function cancelBenchmark(message = "Benchmark cancelado.") {
    const hadBuildBenchmark = perfState.benchmark.running;
    if (hadBuildBenchmark) {
        perfState.benchmark.token += 1;
        perfState.benchmark.running = false;
    }
    if (perfState.autobenchmark.running) cancelAutoBenchmark(message);
    else if (hadBuildBenchmark) setPerfStatus(message, "warn");
}

function updateBenchmarkProgress(placed, target) {
    setPerfStatus(
        `${perfState.benchmark.scenario === "dense" ? "Denso" : "Prefabs"}: ${placed.toLocaleString("pt-BR")} / ${target.toLocaleString("pt-BR")} blocos`,
    );
    updatePerfOverlay(true);
}

async function buildDenseBenchmark(token, count, baseY = 0, progressOffset = 0) {
    const width = CURRENT_GRID_SIZE;
    const half = width / 2;
    const layerSize = width * width;
    let placed = 0;

    for (let i = 0; i < count; i++) {
        if (token !== perfState.benchmark.token) return placed;
        const layer = Math.floor(i / layerSize);
        const withinLayer = i % layerSize;
        const x = withinLayer % width - half;
        const z = Math.floor(withinLayer / width) - half;
        const y = baseY + layer;
        if (y >= MAX_HEIGHT) break;

        placeBlock(x, y, z, "1x1", BENCHMARK_COLORS[(progressOffset + i) % BENCHMARK_COLORS.length], 0, true);
        placed += 1;

        if (placed % BENCHMARK_BATCH_SIZE === 0) {
            updateBenchmarkProgress(progressOffset + placed, perfState.benchmark.target);
            await nextFrame();
        }
    }

    return placed;
}

async function buildPrefabBenchmark(token, target) {
    const names = ["Casa", "Predio", "Mansao", "Arvore", "Muralha"].filter((name) => PREFABS[name]);
    const prefabNames = names.length ? names : Object.keys(PREFABS);
    const half = CURRENT_GRID_SIZE / 2;
    let cursorX = -half;
    let cursorZ = -half;
    let rowDepth = 0;
    let layer = 0;
    let placed = 0;
    let placedPrefabs = 0;

    for (let index = 0; placed < target; index++) {
        if (token !== perfState.benchmark.token) return placed;
        const name = prefabNames[index % prefabNames.length];
        const prefab = PREFABS[name];
        if (!prefab) continue;
        if (placed + prefab.blocks.length > target) break;

        if (cursorX + prefab.dx >= half) {
            cursorX = -half;
            cursorZ += rowDepth + BENCHMARK_PREFAB_SPACING;
            rowDepth = 0;
        }

        if (cursorZ + prefab.dz >= half) {
            cursorX = -half;
            cursorZ = -half;
            rowDepth = 0;
            layer += 1;
        }

        const cy = layer * BENCHMARK_PREFAB_LAYER_GAP;
        if (cy + prefab.dy >= MAX_HEIGHT) break;

        placePrefab(cursorX, cy, cursorZ, name, placedPrefabs % 4, true);
        placed += prefab.blocks.length;
        placedPrefabs += 1;
        cursorX += prefab.dx + BENCHMARK_PREFAB_SPACING;
        rowDepth = Math.max(rowDepth, prefab.dz);

        if (placedPrefabs % 4 === 0) {
            updateBenchmarkProgress(placed, target);
            await nextFrame();
        }
    }

    if (placed < target) {
        const fillY = Math.min(MAX_HEIGHT - 2, Math.max(0, layer * BENCHMARK_PREFAB_LAYER_GAP + 2));
        placed += await buildDenseBenchmark(token, target - placed, fillY, placed);
    }

    return placed;
}

async function buildBenchmarkScene(token, target, scenario) {
    clearAll();
    updateRollOverVisual();
    await nextFrame();

    const start = performance.now();
    setPerfStatus(`Montando benchmark ${scenario === "dense" ? "denso" : "de prefabs"} com ${target.toLocaleString("pt-BR")} blocos...`);

    let placed = 0;
    if (scenario === "prefab") placed = await buildPrefabBenchmark(token, target);
    else placed = await buildDenseBenchmark(token, target);

    return { placed, elapsed: performance.now() - start };
}

function getSceneBounds() {
    if (!blockById.size) {
        return { minX: -20, maxX: 20, minZ: -20, maxZ: 20, maxY: 0, centerX: 0, centerZ: 0 };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    let maxY = 0;

    for (const block of blockById.values()) {
        minX = Math.min(minX, block.cx);
        maxX = Math.max(maxX, block.cx + block.dx);
        minZ = Math.min(minZ, block.cz);
        maxZ = Math.max(maxZ, block.cz + block.dz);
        maxY = Math.max(maxY, block.cy + block.dy);
    }

    return {
        minX,
        maxX,
        minZ,
        maxZ,
        maxY,
        centerX: (minX + maxX) / 2,
        centerZ: (minZ + maxZ) / 2,
    };
}

function countOccupiedSamplesAtRow(z) {
    let occupied = 0;
    for (let x = -80; x <= 80; x += 10) {
        if (getTopOccupiedYAt(x, z) >= 0) occupied += 1;
    }
    return occupied;
}

function getPathDistance(waypoints) {
    let total = 0;
    for (let index = 1; index < waypoints.length; index++) {
        total += waypoints[index - 1].distanceTo(waypoints[index]);
    }
    return total;
}

function createAutoBenchmarkRoute(scenario) {
    const bounds = getSceneBounds();
    const lookAtY = Math.min(MAX_HEIGHT - 4, Math.max(6, bounds.maxY * 0.5 + 4));

    if (scenario === "prefab") {
        let bestLane = AUTO_BENCHMARK_PREFAB_LANE_CANDIDATES[0];
        let bestScore = Infinity;
        for (const candidate of AUTO_BENCHMARK_PREFAB_LANE_CANDIDATES) {
            const score = countOccupiedSamplesAtRow(candidate);
            if (score < bestScore) {
                bestScore = score;
                bestLane = candidate;
            }
        }

        const startX = Math.max(-92, bounds.minX - 8);
        const endX = Math.min(92, bounds.maxX + 8);
        return {
            label: `Corredor lateral z=${bestLane}`,
            speed: 10,
            warmupMs: AUTO_BENCHMARK_WARMUP_MS + 250,
            tolerance: AUTO_BENCHMARK_MOVE_TOLERANCE,
            fixedLookAt: true,
            lookAt: new THREE.Vector3(bounds.centerX, lookAtY, bounds.centerZ),
            waypoints: [new THREE.Vector3(startX, 0, bestLane), new THREE.Vector3(endX, 0, bestLane)],
        };
    }

    let bestLane = AUTO_BENCHMARK_DENSE_ROW_CANDIDATES[0];
    let bestScore = -1;
    for (const candidate of AUTO_BENCHMARK_DENSE_ROW_CANDIDATES) {
        const score = countOccupiedSamplesAtRow(candidate);
        if (score > bestScore) {
            bestScore = score;
            bestLane = candidate;
        }
    }

    const startY = Math.max(0, getTopOccupiedYAt(-82, bestLane) + 1);
    const endY = Math.max(0, getTopOccupiedYAt(82, bestLane) + 1);
    return {
        label: `Travessia densa z=${bestLane}`,
        speed: 8,
        warmupMs: AUTO_BENCHMARK_WARMUP_MS,
        tolerance: AUTO_BENCHMARK_MOVE_TOLERANCE,
        fixedLookAt: false,
        lookAt: null,
        waypoints: [new THREE.Vector3(-82, startY, bestLane), new THREE.Vector3(82, endY, bestLane)],
    };
}

function formatAutoBenchmarkReport() {
    const state = perfState.autobenchmark;
    const now = performance.now();
    const totalMs = now - state.runStartedAt;
    const moveMs = state.moveStartedAt ? now - state.moveStartedAt : 0;
    const frameStats = summarizeSampler(state.frameSampler);
    const memoryLabel =
        perfState.memory.source === "estimate" || !perfState.memory.source
            ? perfState.memory.label
            : `${perfState.memory.label} | ${perfState.memory.estimateLabel}`;
    const longTasks = perfState.longTasks.filter((entry) => entry.at >= state.runStartedAt);
    const worstLongTask = longTasks.reduce((worst, entry) => Math.max(worst, entry.duration), 0);
    const avgFps = frameStats ? 1000 / frameStats.avg : 0;
    const p95Fps = frameStats ? 1000 / frameStats.p95 : 0;
    const minFps = frameStats ? 1000 / frameStats.max : 0;
    const avgSpeed = moveMs > 0 ? state.distance / (moveMs / 1000) : 0;
    const frameLabel = frameStats ? `${formatMsStats(frameStats)} ms` : "--";
    const fpsLabel = frameStats ? `${avgFps.toFixed(0)} médio | ${p95Fps.toFixed(0)} p95 | ${minFps.toFixed(0)} mín.` : "--";
    const longTaskLabel = longTasks.length ? ` | pior ${worstLongTask.toFixed(0)} ms` : "";

    return [
        `Auto FP concluído`,
        `${getBenchmarkScenarioLabel(state.scenario)} | ${state.buildPlaced.toLocaleString("pt-BR")} blocos`,
        `Montagem: ${(state.buildMs / 1000).toFixed(1)} s | Rota: ${(moveMs / 1000).toFixed(1)} s | Total: ${(totalMs / 1000).toFixed(1)} s`,
        `Trajeto: ${state.routeLabel} | ${state.distance.toFixed(1)} u | ${avgSpeed.toFixed(1)} u/s`,
        `Frame: ${frameLabel} | FPS est.: ${fpsLabel}`,
        `Memória: ${memoryLabel} | Long tasks: ${longTasks.length}${longTaskLabel}`,
    ];
}

function getAutoBenchmarkWarmupTarget(state) {
    return state.fixedLookAt ? state.lookAt : state.route[Math.min(state.currentWaypoint, state.route.length - 1)] || null;
}

function updateAutoBenchmarkWarmup(state, time) {
    if (state.phase !== "warmup") return false;

    syncFpCamera(getAutoBenchmarkWarmupTarget(state));
    if (time < state.warmupUntil) return true;

    state.phase = "walking";
    state.moveStartedAt = time;
    state.lastProgressAt = 0;
    setPerfStatus(`Auto FP: percorrendo ${state.routeLabel}...`);
    return true;
}

function reachAutoBenchmarkWaypoint(state, targetPoint) {
    playerPos.copy(targetPoint);
    if (state.currentWaypoint < state.route.length - 1) {
        state.currentWaypoint += 1;
        return true;
    }

    syncFpCamera(state.fixedLookAt ? state.lookAt : targetPoint);
    finishAutoBenchmark();
    return true;
}

function updateAutoBenchmarkProgressStatus(state, time) {
    if (time - state.lastProgressAt < 300) return;
    const progress = state.plannedDistance > 0 ? Math.min(100, (state.distance / state.plannedDistance) * 100) : 100;
    setPerfStatus(`Auto FP: ${progress.toFixed(0)}% | ${state.distance.toFixed(1)} / ${state.plannedDistance.toFixed(1)} u`);
    state.lastProgressAt = time;
}

function cancelAutoBenchmark(message = "Auto FP cancelado.") {
    const state = perfState.autobenchmark;
    if (!state.running) return;

    state.token += 1;
    state.running = false;
    state.phase = "idle";
    state.route = [];
    clearPressedKeys();

    if (isFirstPerson) {
        exitFirstPerson({ cameraTargetOverride: state.previousCameraTarget, hint: null });
    }

    setPerfStatus(message, "warn");
    setPerfReport(
        [
            `Execução interrompida`,
            `${getBenchmarkScenarioLabel(state.scenario)} | alvo ${state.target.toLocaleString("pt-BR")} blocos`,
            state.buildPlaced ? `Montado até aqui: ${state.buildPlaced.toLocaleString("pt-BR")} blocos` : "Montagem interrompida antes do trajeto.",
        ],
        "warn",
    );
}

function finishAutoBenchmark() {
    const state = perfState.autobenchmark;
    if (!state.running) return;

    state.running = false;
    state.phase = "idle";
    clearPressedKeys();
    updatePerfOverlay(true);

    const finalCameraTarget = new THREE.Vector3(playerPos.x, 0, playerPos.z);
    if (isFirstPerson) {
        exitFirstPerson({ cameraTargetOverride: finalCameraTarget, hint: null });
    }

    setPerfReport(formatAutoBenchmarkReport(), "success");
    setPerfStatus(
        `Auto FP concluído: ${state.buildPlaced.toLocaleString("pt-BR")} blocos e ${state.distance.toFixed(1)} unidades percorridas.`,
    );
    state.route = [];
}

function updateAutoBenchmark(time, delta) {
    const state = perfState.autobenchmark;
    if (!state.running) return;

    if (updateAutoBenchmarkWarmup(state, time)) return;

    if (state.phase !== "walking") return;

    const targetPoint = state.route[state.currentWaypoint];
    if (!targetPoint) {
        finishAutoBenchmark();
        return;
    }

    tempWaypoint.copy(targetPoint).sub(playerPos);
    const remaining = tempWaypoint.length();
    if (remaining <= state.tolerance) return reachAutoBenchmarkWaypoint(state, targetPoint);

    tempWaypoint.normalize();
    const step = Math.min(state.speed * delta, remaining);
    playerPos.addScaledVector(tempWaypoint, step);
    playerPos.x = Math.max(-100, Math.min(100, playerPos.x));
    playerPos.z = Math.max(-100, Math.min(100, playerPos.z));
    playerPos.y = Math.max(0, playerPos.y);
    playerVel.set(0, 0, 0);
    state.distance += step;

    const lookTarget = state.fixedLookAt ? state.lookAt : tempLookTarget.copy(playerPos).addScaledVector(tempWaypoint, 6);
    syncFpCamera(lookTarget);
    updateAutoBenchmarkProgressStatus(state, time);
}

function recordAutoBenchmarkFrame(frameDuration) {
    const state = perfState.autobenchmark;
    if (!state.running || state.phase !== "walking") return;
    pushSamplerSample(state.frameSampler, frameDuration);
}

async function runAutoFpBenchmark(target) {
    cancelBenchmark("Benchmark anterior interrompido.");

    const state = perfState.autobenchmark;
    const scenario = perfDom.scenario ? perfDom.scenario.value : "dense";
    state.token += 1;
    const autoToken = state.token;
    state.running = true;
    state.phase = "building";
    state.scenario = scenario;
    state.target = target;
    state.routeLabel = "";
    state.route = [];
    state.distance = 0;
    state.plannedDistance = 0;
    state.currentWaypoint = 1;
    state.buildPlaced = 0;
    state.buildMs = 0;
    state.speed = 0;
    state.lastProgressAt = 0;
    state.fixedLookAt = false;
    state.frameSampler = createSampler(AUTO_BENCHMARK_FRAME_LIMIT);
    state.previousCameraTarget.copy(cameraTarget);
    state.runStartedAt = performance.now();
    state.moveStartedAt = 0;
    clearPressedKeys();
    setPerfReport(`Preparando Auto FP para ${getBenchmarkScenarioLabel(scenario)}...`, "info");

    if (isFirstPerson) {
        exitFirstPerson({ cameraTargetOverride: state.previousCameraTarget, hint: null });
    }

    perfState.benchmark.running = true;
    perfState.benchmark.target = target;
    perfState.benchmark.token += 1;
    perfState.benchmark.scenario = scenario;
    const buildToken = perfState.benchmark.token;

    const { placed, elapsed } = await buildBenchmarkScene(buildToken, target, scenario);
    if (autoToken !== state.token || buildToken !== perfState.benchmark.token) return;

    perfState.benchmark.running = false;
    state.buildPlaced = placed;
    state.buildMs = elapsed;
    updateStats();
    updatePerfOverlay(true);
    await pollMemoryUsage();
    updatePerfOverlay(true);

    const route = createAutoBenchmarkRoute(scenario);
    if (!route.waypoints || route.waypoints.length < 2) {
        throw new Error("Rota do Auto FP inválida.");
    }

    state.route = route.waypoints.map((point) => point.clone());
    state.routeLabel = route.label;
    state.speed = route.speed;
    state.tolerance = route.tolerance;
    state.fixedLookAt = route.fixedLookAt;
    state.lookAt.copy(route.lookAt || state.route.at(-1));
    state.currentWaypoint = 1;
    state.plannedDistance = getPathDistance(state.route);
    state.phase = "warmup";
    state.warmupUntil = performance.now() + route.warmupMs;

    enterFirstPerson({
        spawnPosition: state.route[0],
        lookAt: state.fixedLookAt ? state.lookAt : state.route[1],
        requestPointerLock: false,
        hint: "Auto FP iniciado. O trajeto vai rodar sozinho.",
    });

    setPerfStatus(`Auto FP: aquecendo câmera por ${(route.warmupMs / 1000).toFixed(1)} s antes do trajeto.`);
    setPerfReport(
        [
            `Execução pronta`,
            `${getBenchmarkScenarioLabel(scenario)} | ${placed.toLocaleString("pt-BR")} blocos`,
            `Montagem: ${(elapsed / 1000).toFixed(1)} s`,
            `Trajeto: ${route.label} | ${state.plannedDistance.toFixed(1)} u | ${route.speed.toFixed(1)} u/s`,
        ],
        "info",
    );
}

async function runBenchmark(target) {
    cancelBenchmark("Benchmark anterior interrompido.");
    perfState.benchmark.running = true;
    perfState.benchmark.target = target;
    perfState.benchmark.token += 1;
    perfState.benchmark.scenario = perfDom.scenario ? perfDom.scenario.value : "dense";
    const token = perfState.benchmark.token;

    const { placed, elapsed } = await buildBenchmarkScene(token, target, perfState.benchmark.scenario);

    if (token !== perfState.benchmark.token) return;

    perfState.benchmark.running = false;
    updateStats();
    updatePerfOverlay(true);
    await pollMemoryUsage();
    updatePerfOverlay(true);
    setPerfStatus(
        `Benchmark concluído: ${placed.toLocaleString("pt-BR")} blocos em ${(elapsed / 1000).toFixed(1)} s (${perfState.benchmark.scenario === "dense" ? "denso" : "prefabs"}).`,
    );
}

if (perfDom.toggle) {
    perfDom.toggle.onclick = () => {
        perfDom.panel.classList.toggle("collapsed");
        perfDom.toggle.textContent = perfDom.panel.classList.contains("collapsed") ? "Mostrar" : "Ocultar";
    };
}

if (perfDom.scenario) {
    perfDom.scenario.onchange = (event) => {
        if (isAnyBenchmarkRunning()) return;
        perfState.benchmark.scenario = event.target.value;
        setPerfStatus(`Cenário selecionado: ${event.target.value === "dense" ? "Denso 1x1" : "Prefabs Mistos"}.`);
    };
}

document.querySelectorAll("[data-benchmark-target]").forEach((button) => {
    button.addEventListener("click", () => {
        if (isAnyBenchmarkRunning()) return;
        const target = Number(button.dataset.benchmarkTarget);
        if (!target) return;
        runBenchmark(target).catch((error) => {
            perfState.benchmark.running = false;
            setPerfStatus(`Falha no benchmark: ${error.message}`, "error");
            console.error(error);
        });
    });
});

if (perfDom.autoStart) {
    perfDom.autoStart.onclick = () => {
        if (isAnyBenchmarkRunning()) return;
        const target = Number(perfDom.autoTarget ? perfDom.autoTarget.value : 20000);
        if (!target) return;
        runAutoFpBenchmark(target).catch((error) => {
            perfState.benchmark.running = false;
            cancelAutoBenchmark(`Falha no Auto FP: ${error.message}`);
            setPerfReport(`Falha no Auto FP\n${error.message}`, "error");
            console.error(error);
        });
    };
}

if (perfDom.cancel) {
    perfDom.cancel.onclick = () => cancelBenchmark("Benchmark cancelado pelo usuário.");
}

pollMemoryUsage();
scheduleMemoryPolling();
setPerfStatus(
    mobileQualityProfile.aggressive
        ? `Perfil mobile ativo: ${getQualityLabel()} | sombras desativadas por padrão.`
        : "Pronto para medir. Escolha um cenário e rode 5k, 20k ou 60k.",
);
setPerfReport("");

// --- GRID E CHÃO ---
const mainGrid = new THREE.GridHelper(GRID_SIZE_LARGE, 20, 0x8a959e, 0xadb5bd);
mainGrid.position.y = 0.01;
scene.add(mainGrid);

const subGrid = new THREE.GridHelper(GRID_SIZE_LARGE, GRID_SIZE_LARGE, 0xd0d8e0, 0xdfe4ea);
subGrid.position.y = 0.005;
scene.add(subGrid);

const buildPlate = new THREE.Mesh(
    new THREE.PlaneGeometry(BUILD_PLATE_SIZE, BUILD_PLATE_SIZE).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xdbe4ea, transparent: true, opacity: 0.92 }),
);
buildPlate.position.y = 0.001;
scene.add(buildPlate);

const buildPlateGrid = new THREE.GridHelper(BUILD_PLATE_SIZE, BUILD_PLATE_DIVISIONS, 0x6f7f8c, 0xa7b5bf);
buildPlateGrid.position.y = 0.015;
if (!Array.isArray(buildPlateGrid.material)) {
    buildPlateGrid.material.transparent = true;
    buildPlateGrid.material.opacity = 0.9;
}
scene.add(buildPlateGrid);

const buildPlateBorderPoints = [
    new THREE.Vector3(-BUILD_PLATE_SIZE / 2, 0, -BUILD_PLATE_SIZE / 2),
    new THREE.Vector3(BUILD_PLATE_SIZE / 2, 0, -BUILD_PLATE_SIZE / 2),
    new THREE.Vector3(BUILD_PLATE_SIZE / 2, 0, BUILD_PLATE_SIZE / 2),
    new THREE.Vector3(-BUILD_PLATE_SIZE / 2, 0, BUILD_PLATE_SIZE / 2),
];
const buildPlateBorder = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(buildPlateBorderPoints),
    new THREE.LineBasicMaterial({ color: 0x5d6b76, transparent: true, opacity: 0.95 }),
);
buildPlateBorder.position.y = 0.03;
scene.add(buildPlateBorder);

// --- MATERIAIS E LUZES ---
const groundMats = {
    basic: new THREE.MeshBasicMaterial({ color: 0xe8ecf1 }),
    standard: new THREE.MeshStandardMaterial({ color: 0xe8ecf1, roughness: 1.0, metalness: 0.0 }),
    physical: new THREE.MeshPhysicalMaterial({ color: 0xe8ecf1, roughness: 1.0 }),
    phong: new THREE.MeshPhongMaterial({ color: 0xe8ecf1 }),
    toon: new THREE.MeshToonMaterial({ color: 0xe8ecf1 }),
};

const materials = {
    basic: {
        solid: new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true }),
        glass: new THREE.MeshBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.6, vertexColors: true }),
    },
    standard: {
        solid: new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.7, metalness: 0.1 }),
        glass: new THREE.MeshStandardMaterial({
            color: 0xaaddff,
            transparent: true,
            opacity: 0.6,
            vertexColors: true,
            roughness: 0.1,
            metalness: 0.2,
        }),
    },
    physical: {
        solid: new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            vertexColors: true,
            roughness: 0.4,
            metalness: 0.1,
            clearcoat: 0.2,
        }),
        glass: new THREE.MeshPhysicalMaterial({
            color: 0xaaddff,
            transparent: true,
            opacity: 0.6,
            vertexColors: true,
            transmission: 0.8,
            roughness: 0.1,
            ior: 1.5,
        }),
    },
    phong: {
        solid: new THREE.MeshPhongMaterial({ color: 0xffffff, vertexColors: true, shininess: 60 }),
        glass: new THREE.MeshPhongMaterial({
            color: 0xaaddff,
            transparent: true,
            opacity: 0.6,
            vertexColors: true,
            shininess: 90,
        }),
    },
    toon: {
        solid: new THREE.MeshToonMaterial({ color: 0xffffff, vertexColors: true }),
        glass: new THREE.MeshToonMaterial({ color: 0xaaddff, transparent: true, opacity: 0.6, vertexColors: true }),
    },
};

let currentRenderMode = "basic";
let matSolid = materials[currentRenderMode].solid;
let matGlass = materials[currentRenderMode].glass;

const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(GRID_SIZE_LARGE, GRID_SIZE_LARGE).rotateX(-Math.PI / 2),
    groundMats[currentRenderMode],
);
ground.receiveShadow = true;
scene.add(ground);
hitboxes.push(ground);

const matGhostValid = new THREE.MeshBasicMaterial({
    color: 0x2ecc71,
    opacity: 0.6,
    transparent: true,
    vertexColors: true,
});
const matGhostInvalid = new THREE.MeshBasicMaterial({
    color: 0xe74c3c,
    opacity: 0.6,
    transparent: true,
    vertexColors: true,
});

// Luzes
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
ambientLight.visible = false;
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(100, 200, 100);
dirLight.castShadow = false;
dirLight.shadow.mapSize.width = mobileQualityProfile.shadowMapSize;
dirLight.shadow.mapSize.height = mobileQualityProfile.shadowMapSize;
const d = 120;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 500;
dirLight.shadow.bias = -0.0005;
dirLight.visible = false;
scene.add(dirLight);

const renderModeSelect = document.getElementById("render-mode");

function updateShadowMapSize() {
    const targetShadowMapSize = mobileQualityProfile.shadowMapSize;
    if (dirLight.shadow.mapSize.width === targetShadowMapSize && dirLight.shadow.mapSize.height === targetShadowMapSize) return;

    dirLight.shadow.mapSize.width = targetShadowMapSize;
    dirLight.shadow.mapSize.height = targetShadowMapSize;
    dirLight.shadow.map?.dispose();
    dirLight.shadow.map = null;
}

function shouldUseShadows(mode) {
    return mode !== "basic" && !mobileQualityProfile.aggressive;
}

function applyRenderMode(mode) {
    currentRenderMode = mode;
    const isLit = mode !== "basic";
    const useShadows = shouldUseShadows(mode);

    updateShadowMapSize();
    ambientLight.visible = isLit;
    dirLight.visible = isLit;
    dirLight.castShadow = useShadows;
    ground.receiveShadow = useShadows;
    renderer.shadowMap.autoUpdate = useShadows;
    renderer.shadowMap.needsUpdate = useShadows;

    ground.material = groundMats[mode];
    matSolid = materials[mode].solid;
    matGlass = materials[mode].glass;

    for (const key in imGroups) {
        const grp = imGroups[key];
        grp.mesh.material = grp.isGlass ? matGlass : matSolid;
        grp.mesh.material.needsUpdate = true;
    }

    animatedBlocks.forEach((ab) => {
        const block = blockById.get(ab.id);
        if (block && block.live) {
            block.live.traverse((c) => {
                if (c.isMesh && !c.userData.isHitbox) {
                    const newMat = c.userData.isGlass ? matGlass.clone() : matSolid.clone();
                    newMat.color.setHex(block.colorHex);
                    c.material = newMat;
                }
            });
        }
    });
}

// Controlador de Mudança de Modo
if (renderModeSelect) {
    renderModeSelect.addEventListener("change", (e) => {
        applyRenderMode(e.target.value);
    });
}

// --- DESTAQUE VISUAL (APAGAR) ---
function setBlockHighlight(blockId, isHighlight) {
    if (!blockId) return;
    const block = blockById.get(blockId);
    if (!block) return;

    const start = performance.now();
    try {
        applyBlockColor(blockId, isHighlight ? 0xff0000 : block.colorHex);
    } finally {
        recordPerfSample("highlight", performance.now() - start);
    }
}

function setGroupHighlight(gId, isHighlight) {
    if (!gId) return;
    const blockIds = groupToBlockIds.get(gId);
    if (!blockIds || blockIds.size === 0) return;

    const start = performance.now();
    try {
        blockIds.forEach((blockId) => {
            const block = blockById.get(blockId);
            if (!block) return;

            applyBlockColor(blockId, isHighlight ? 0xff0000 : block.colorHex);
        });
    } finally {
        recordPerfSample("highlight", performance.now() - start);
    }
}

function clearHighlights() {
    if (hoveredGroupId) {
        setGroupHighlight(hoveredGroupId, false);
        hoveredGroupId = null;
    }
    if (hoveredBlockId) {
        setBlockHighlight(hoveredBlockId, false);
        hoveredBlockId = null;
    }
}

function applyFakeShading(geo, shadingMatrix = null) {
    let nGeo = geo.index ? geo.toNonIndexed() : geo;
    nGeo.computeVertexNormals();
    const count = nGeo.attributes.position.count;
    const colors = new Float32Array(count * 3);
    const normals = nGeo.attributes.normal.array;
    for (let i = 0; i < count; i++) {
        let nx = normals[i * 3];
        let ny = normals[i * 3 + 1];
        let nz = normals[i * 3 + 2];
        if (shadingMatrix) {
            const tx = shadingMatrix[0] * nx + shadingMatrix[1] * ny + shadingMatrix[2] * nz;
            const ty = shadingMatrix[3] * nx + shadingMatrix[4] * ny + shadingMatrix[5] * nz;
            const tz = shadingMatrix[6] * nx + shadingMatrix[7] * ny + shadingMatrix[8] * nz;
            nx = tx;
            ny = ty;
            nz = tz;
        }
        const shade = getFakeShadeForNormal(nx, ny, nz);
        colors[i * 3] = shade;
        colors[i * 3 + 1] = shade;
        colors[i * 3 + 2] = shade;
    }
    nGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return nGeo;
}

const GEO_CACHE = {};
const STATIC_PARTS_CACHE = new Map();
function getGeo(key, creatorFn, shadingMatrix = null) {
    if (!GEO_CACHE[key]) GEO_CACHE[key] = applyFakeShading(creatorFn(), shadingMatrix);
    return GEO_CACHE[key];
}

const imGroups = {};
const dirtyInstanceGroups = new Set();
applyRenderMode(currentRenderMode);

function markInstancedGroupDirty(grp, matrixDirty = false, colorDirty = false) {
    if (!grp) return;
    grp.matrixDirty = grp.matrixDirty || matrixDirty;
    grp.colorDirty = grp.colorDirty || colorDirty;
    dirtyInstanceGroups.add(grp);
}

function flushInstancedMeshUpdates() {
    if (dirtyInstanceGroups.size === 0) return;

    dirtyInstanceGroups.forEach((grp) => {
        if (grp.matrixDirty) grp.mesh.instanceMatrix.needsUpdate = true;
        if (grp.colorDirty && grp.mesh.instanceColor) grp.mesh.instanceColor.needsUpdate = true;
        grp.matrixDirty = false;
        grp.colorDirty = false;
    });

    dirtyInstanceGroups.clear();
}

function ensureBlockInstanceGroupKeys(blockId) {
    let groupKeys = blockToInstanceGroupKeys.get(blockId);
    if (!groupKeys) {
        groupKeys = new Set();
        blockToInstanceGroupKeys.set(blockId, groupKeys);
    }
    return groupKeys;
}

function applyBlockColor(blockId, colorHex) {
    if (!blockId) return;
    const block = blockById.get(blockId);
    if (!block) return;

    if (block.def.animated && block.live) {
        block.live.traverse((c) => {
            if (c.isMesh && !c.userData.isHitbox) c.material.color.setHex(colorHex);
        });
        return;
    }

    const groupKeys = blockToInstanceGroupKeys.get(blockId);
    if (!groupKeys || groupKeys.size === 0) return;

    tempColor.setHex(colorHex);
    groupKeys.forEach((key) => {
        const grp = imGroups[key];
        if (!grp || !grp.blockMap.has(blockId)) return;
        const indices = grp.blockMap.get(blockId);
        for (const idx of indices) {
            grp.mesh.setColorAt(idx, tempColor);
        }
        markInstancedGroupDirty(grp, false, true);
    });
}

function addInstance(geoKey, geometry, material, blockId, matrixWorld, colorHex, isGlass = false) {
    if (!imGroups[geoKey]) {
        const max = 120000;
        const mesh = new THREE.InstancedMesh(geometry, material, max);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
        mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
        mesh.count = 0;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        imGroups[geoKey] = { mesh, blockMap: new Map(), indexToBlock: new Map(), isGlass, matrixDirty: false, colorDirty: false };
    }
    const grp = imGroups[geoKey];
    const idx = grp.mesh.count;
    grp.mesh.setMatrixAt(idx, matrixWorld);
    tempColor.setHex(colorHex);
    grp.mesh.setColorAt(idx, tempColor);
    if (!grp.blockMap.has(blockId)) grp.blockMap.set(blockId, []);
    grp.blockMap.get(blockId).push(idx);
    grp.indexToBlock.set(idx, blockId);
    ensureBlockInstanceGroupKeys(blockId).add(geoKey);
    grp.mesh.count++;
    markInstancedGroupDirty(grp, true, true);
}

function removeInstances(blockId) {
    const groupKeys = blockToInstanceGroupKeys.get(blockId);
    if (!groupKeys || groupKeys.size === 0) return;

    groupKeys.forEach((key) => {
        const grp = imGroups[key];
        if (!grp || !grp.blockMap.has(blockId)) return;
        const indices = grp.blockMap.get(blockId).sort((a, b) => b - a);
        for (let idx of indices) {
            const lastIdx = grp.mesh.count - 1;
            if (idx !== lastIdx) {
                grp.mesh.getMatrixAt(lastIdx, tempMatrix);
                grp.mesh.setMatrixAt(idx, tempMatrix);
                grp.mesh.getColorAt(lastIdx, tempColor);
                grp.mesh.setColorAt(idx, tempColor);
                const lastBlockId = grp.indexToBlock.get(lastIdx);
                grp.indexToBlock.set(idx, lastBlockId);
                const lastBlockIndices = grp.blockMap.get(lastBlockId);
                lastBlockIndices[lastBlockIndices.indexOf(lastIdx)] = idx;
            }
            grp.indexToBlock.delete(lastIdx);
            grp.mesh.count--;
        }
        grp.blockMap.delete(blockId);
        markInstancedGroupDirty(grp, true, true);
    });

    blockToInstanceGroupKeys.delete(blockId);
}

function applyShapeOrientationTransform(target, sx, sy, sz, direction, rot) {
    const transform = getShapeOrientationTransform(sx, sy, sz, direction, rot);
    target.setRotationFromMatrix(transform.orientation);
    target.position.set(transform.offsetX, transform.offsetY, transform.offsetZ);
}

function createDirectShapeGeometry(shapeName, sx, sy, sz) {
    let geometry;

    if (shapeName === "cuboid" || shapeName === "cube") {
        geometry = new THREE.BoxGeometry(1, 1, 1);
    } else if (shapeName === "hexagonal_prism") {
        geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 6);
    } else if (shapeName === "triangular_prism") {
        geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 3);
    } else if (shapeName === "square_pyramid") {
        geometry = new THREE.ConeGeometry(0.5, 1, 4);
        geometry.rotateY(Math.PI / 4);
    } else if (shapeName === "hexagonal_pyramid") {
        geometry = new THREE.ConeGeometry(0.5, 1, 6);
    } else if (shapeName === "octahedron") {
        geometry = new THREE.OctahedronGeometry(0.5, 0);
    } else if (shapeName === "dodecahedron") {
        geometry = new THREE.DodecahedronGeometry(0.5, 0);
    } else if (shapeName === "icosahedron") {
        geometry = new THREE.IcosahedronGeometry(0.5, 0);
    } else if (shapeName === "buckyball") {
        geometry = new THREE.IcosahedronGeometry(0.5, 1);
    } else if (shapeName === "pentagrammic_prism") {
        const starShape = new THREE.Shape();
        const outerRadius = 0.5;
        const innerRadius = 0.22;
        for (let index = 0; index < 10; index++) {
            const angle = -Math.PI / 2 + (index / 10) * Math.PI * 2;
            const radius = index % 2 === 0 ? outerRadius : innerRadius;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            if (index === 0) starShape.moveTo(x, z);
            else starShape.lineTo(x, z);
        }
        starShape.closePath();
        geometry = new THREE.ExtrudeGeometry(starShape, { depth: 1, bevelEnabled: false });
        geometry.rotateX(Math.PI / 2);
        geometry.translate(0, -0.5, -0.5);
    } else {
        geometry = new THREE.BoxGeometry(1, 1, 1);
    }

    geometry.computeBoundingBox();
    const center = geometry.boundingBox.getCenter(new THREE.Vector3());
    geometry.translate(-center.x, -center.y, -center.z);
    geometry.scale(sx, sy, sz);
    geometry.translate(0, sy / 2, 0);
    return geometry;
}

function getShapeOrientationTransform(sx, sy, sz, direction, rot) {
    const matrix = getShapeOrientationMatrix(direction, rot);
    const bounds = getBoundsAfterShapeOrientation(
        { minX: -sx / 2, maxX: sx / 2, minY: 0, maxY: sy, minZ: -sz / 2, maxZ: sz / 2 },
        direction,
        rot,
    );

    return {
        matrix,
        bounds,
        offsetX: -(bounds.minX + bounds.maxX) / 2,
        offsetY: -bounds.minY,
        offsetZ: -(bounds.minZ + bounds.maxZ) / 2,
        orientation: new THREE.Matrix4().set(
            matrix[0], matrix[1], matrix[2], 0,
            matrix[3], matrix[4], matrix[5], 0,
            matrix[6], matrix[7], matrix[8], 0,
            0, 0, 0, 1,
        ),
    };
}

function transformShapePoint(matrix, offsetX, offsetY, offsetZ, x, y, z) {
    return {
        x: matrix[0] * x + matrix[1] * y + matrix[2] * z + offsetX,
        y: matrix[3] * x + matrix[4] * y + matrix[5] * z + offsetY,
        z: matrix[6] * x + matrix[7] * y + matrix[8] * z + offsetZ,
    };
}

function pointInTriangleXZ(px, pz, a, b, c, epsilon = 1e-5) {
    const d1 = (px - b.x) * (a.z - b.z) - (a.x - b.x) * (pz - b.z);
    const d2 = (px - c.x) * (b.z - c.z) - (b.x - c.x) * (pz - c.z);
    const d3 = (px - a.x) * (c.z - a.z) - (c.x - a.x) * (pz - a.z);
    const hasNeg = d1 < -epsilon || d2 < -epsilon || d3 < -epsilon;
    const hasPos = d1 > epsilon || d2 > epsilon || d3 > epsilon;
    return !(hasNeg && hasPos);
}

function isPointInsideTopTriangles(px, pz, triangles) {
    return triangles.some(([a, b, c]) => pointInTriangleXZ(px, pz, a, b, c));
}

function doesStudFitTopTriangles(px, pz, triangles) {
    const diagonalOffset = STUD_RADIUS / Math.SQRT2;
    const sampleOffsets = [
        [0, 0],
        [STUD_RADIUS, 0],
        [-STUD_RADIUS, 0],
        [0, STUD_RADIUS],
        [0, -STUD_RADIUS],
        [diagonalOffset, diagonalOffset],
        [diagonalOffset, -diagonalOffset],
        [-diagonalOffset, diagonalOffset],
        [-diagonalOffset, -diagonalOffset],
    ];
    return sampleOffsets.every(([offsetX, offsetZ]) => isPointInsideTopTriangles(px + offsetX, pz + offsetZ, triangles));
}

const VISUAL_TOP_STUD_LAYOUT_CACHE = new Map();

function isTriangularPrismSlopeStudDirection(direction) {
    const normalizedDirection = normalizeShapeDirection(direction);
    return normalizedDirection === "pos-x" || normalizedDirection === "neg-x" || normalizedDirection === "pos-z" || normalizedDirection === "neg-z";
}

function getSlopedShapeStudPlacements(shapeName, transform, transformedTriangles, direction) {
    if (shapeName === "triangular_prism" && isTriangularPrismSlopeStudDirection(direction)) {
        return getUpwardSurfaceStudPlacements(
            transformedTriangles,
            {
                x: transform.matrix[1],
                y: transform.matrix[4],
                z: transform.matrix[7],
            },
            {
                studRadius: STUD_RADIUS,
                minNormalY: 0.15,
                maxNormalY: 0.94,
            },
        );
    }

    if (shapeName === "square_pyramid") {
        return getUpwardSurfaceStudPlacements(
            transformedTriangles,
            {
                x: transform.matrix[0],
                y: transform.matrix[3],
                z: transform.matrix[6],
            },
            {
                studRadius: STUD_RADIUS,
                minNormalY: 0.15,
                maxNormalY: 0.94,
            },
        );
    }

    return null;
}

function getShapeTopStudLayout(shapeGeo, shapeName, sx, sy, sz, direction, rot) {
    const cacheKey = `${shapeName}:${sx}:${sy}:${sz}:${direction}:${rot}`;
    if (VISUAL_TOP_STUD_LAYOUT_CACHE.has(cacheKey)) return VISUAL_TOP_STUD_LAYOUT_CACHE.get(cacheKey);

    const transform = getShapeOrientationTransform(sx, sy, sz, direction, rot);
    const width = transform.bounds.dx;
    const depth = transform.bounds.dz;
    const placements = [];
    const transformedTriangles = [];
    const triangles = [];
    const vertexData = shapeGeo.attributes.position.array;
    const epsilon = 1e-4;
    let topY = -Infinity;

    for (let index = 0; index < vertexData.length; index += 9) {
        const a = transformShapePoint(transform.matrix, transform.offsetX, transform.offsetY, transform.offsetZ, vertexData[index], vertexData[index + 1], vertexData[index + 2]);
        const b = transformShapePoint(transform.matrix, transform.offsetX, transform.offsetY, transform.offsetZ, vertexData[index + 3], vertexData[index + 4], vertexData[index + 5]);
        const c = transformShapePoint(transform.matrix, transform.offsetX, transform.offsetY, transform.offsetZ, vertexData[index + 6], vertexData[index + 7], vertexData[index + 8]);
        transformedTriangles.push([a, b, c]);
        topY = Math.max(topY, a.y, b.y, c.y);
    }

    if (!Number.isFinite(topY)) topY = transform.bounds.dy;

    const slopePlacements = getSlopedShapeStudPlacements(shapeName, transform, transformedTriangles, direction);
    if (slopePlacements?.length > 0) {
        const layout = { topY, placements: slopePlacements };
        VISUAL_TOP_STUD_LAYOUT_CACHE.set(cacheKey, layout);
        return layout;
    }

    transformedTriangles.forEach(([a, b, c]) => {

        const abx = b.x - a.x;
        const aby = b.y - a.y;
        const abz = b.z - a.z;
        const acx = c.x - a.x;
        const acy = c.y - a.y;
        const acz = c.z - a.z;
        const normalY = abz * acx - abx * acz;
        const normalLength = Math.hypot(aby * acz - abz * acy, normalY, abx * acy - aby * acx);
        if (normalLength <= epsilon || normalY / normalLength < 0.95) return;
        if (Math.abs(a.y - topY) > epsilon || Math.abs(b.y - topY) > epsilon || Math.abs(c.y - topY) > epsilon) return;
        triangles.push([a, b, c]);
    });

    const layout = { topY, placements };
    if (triangles.length === 0) {
        VISUAL_TOP_STUD_LAYOUT_CACHE.set(cacheKey, layout);
        return layout;
    }

    for (let x = 0; x < width; x++) {
        for (let z = 0; z < depth; z++) {
            const studX = x - width / 2 + 0.5;
            const studZ = z - depth / 2 + 0.5;
            if (!doesStudFitTopTriangles(studX, studZ, triangles)) continue;
            placements.push({ x: studX, y: topY, z: studZ, nx: 0, ny: 1, nz: 0 });
        }
    }

    VISUAL_TOP_STUD_LAYOUT_CACHE.set(cacheKey, layout);
    return layout;
}

function getVisualTopStudSurface(def, rot = 0, direction = SHAPE_DIRECTION_DEFAULT, shapeGeo = null) {
    if (!def) {
        return {
            width: 1,
            topY: 1,
            depth: 1,
            useGroupSpace: false,
        };
    }

    if (def?.customGeo?.startsWith("shape:")) {
        const { dx, dy, dz } = getBlockMetrics(def, rot, direction);
        const shapeName = def.customGeo.slice("shape:".length);
        const shapeStudLayout = shapeGeo ? getShapeTopStudLayout(shapeGeo, shapeName, def.sx, def.sy, def.sz, direction, rot) : null;
        return {
            width: dx,
            topY: shapeStudLayout?.topY ?? dy,
            depth: dz,
            useGroupSpace: true,
            placements: shapeStudLayout?.placements ?? null,
        };
    }

    return {
        width: def.sx,
        topY: def.customGeo === "tile" ? 0.3 : def.sy,
        depth: def.sz,
        useGroupSpace: false,
    };
}

function createBlockGroup(type, colorHex, rot, isGhost = false, direction = SHAPE_DIRECTION_DEFAULT) {
    const normalizedRot = ((Number(rot) || 0) % 4 + 4) % 4;
    const prefabId = getPrefabIdFromType(type);
    if (prefabId) {
        const p = PREFABS[prefabId];
        if (!p) return new THREE.Group();
        const group = new THREE.Group();
        p.blocks.forEach((b) => {
            const g = createBlockGroup(b.type, b.color, b.rot, isGhost, b.direction);
            const { dx: bDx, dz: bDz } = getPlacementMetrics(b.type, b.rot, b.direction);
            g.position.set(b.lx + bDx / 2 - p.dx / 2, b.ly, b.lz + bDz / 2 - p.dz / 2);
            group.add(g);
        });
        const hbGeo = new THREE.BoxGeometry(p.dx, p.dy, p.dz).translate(0, p.dy / 2, 0);
        const hitbox = new THREE.Mesh(hbGeo, new THREE.MeshBasicMaterial({ visible: false }));
        hitbox.userData.isHitbox = true;
        group.add(hitbox);
        group.userData.hitbox = hitbox;
        group.rotation.y = -normalizedRot * (Math.PI / 2);
        return group;
    }

    const group = new THREE.Group();
    const def = getRegisteredBlockDef(type);
    if (!def) {
        warnMissingBlockType(type);
        return group;
    }

    const partRoot = def.customGeo?.startsWith("shape:") ? new THREE.Group() : group;
    const baseMat = isGhost ? matGhostValid : matSolid;
    const sx = def.sx,
        sy = def.sy,
        sz = def.sz;
    const normalizedDirection = normalizeShapeDirection(direction);
    let shapeGeo = null;

    if (partRoot !== group) group.add(partRoot);

    function addPart(geoKey, geo, mat, isGlassPart = false) {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.userData = { geoKey, geo, isGlass: isGlassPart };
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        partRoot.add(mesh);
    }

    if (def.customGeo?.startsWith("shape:")) {
        const shapeName = def.customGeo.slice("shape:".length);
        const shadingMatrix = getShapeOrientationMatrix(normalizedDirection, normalizedRot);
        const key = `shape_${shapeName}_${sx}_${sy}_${sz}_${normalizedDirection}_${normalizedRot}`;
        shapeGeo = getGeo(key, () => createDirectShapeGeometry(shapeName, sx, sy, sz), shadingMatrix);
        addPart(key, shapeGeo, baseMat);
    } else if (def.customGeo === "roof") {
        const rGeo = getGeo("roof_1_1_2", () => {
            const shape = new THREE.Shape();
            shape.moveTo(0, 0);
            shape.lineTo(0, sy);
            shape.lineTo(sz, 0);
            shape.lineTo(0, 0);
            const g = new THREE.ExtrudeGeometry(shape, { depth: sx, bevelEnabled: false });
            g.rotateY(-Math.PI / 2);
            g.computeBoundingBox();
            const center = g.boundingBox.getCenter(new THREE.Vector3());
            g.translate(-center.x, -g.boundingBox.min.y, -center.z);
            return g;
        });
        addPart("roof_1_1_2", rGeo, baseMat);
    } else if (def.customGeo === "window") {
        const key = `win_${sx}_${sy}_${sz}`;
        const fGeo = getGeo(key, () => new THREE.BoxGeometry(sx, sy, sz).translate(0, sy / 2, 0));
        addPart(key, fGeo, isGhost ? baseMat : matGlass, true);
    } else if (def.customGeo === "rotor") {
        const hubGeo = getGeo("hub", () => new THREE.CylinderGeometry(0.2, 0.2, 0.4, 8).rotateX(Math.PI / 2));
        const hub = new THREE.Mesh(hubGeo, baseMat);
        hub.position.y = 0.5;
        partRoot.add(hub);
        const pivot = new THREE.Group();
        pivot.position.y = 0.5;
        pivot.userData.isRotor = true;
        partRoot.add(pivot);
        const bladeGeo = getGeo("blade", () => new THREE.BoxGeometry(0.6, 2.8, 0.15).translate(0, 1.8, 0));
        for (let i = 0; i < 3; i++) {
            const b = new THREE.Mesh(bladeGeo, baseMat);
            b.rotation.z = (i * Math.PI * 2) / 3;
            pivot.add(b);
        }
    } else {
        const visualY = def.customGeo === "tile" ? 0.3 : sy;
        const bKey = `box_${sx}_${visualY}_${sz}`;
        const bGeo = getGeo(bKey, () => new THREE.BoxGeometry(sx, visualY, sz).translate(0, visualY / 2, 0));
        addPart(bKey, bGeo, baseMat);
    }

    const hasVisualTopStuds = def.visualTopStuds ?? def.topStuds;
    if (hasVisualTopStuds) {
        const studSurface = getVisualTopStudSurface(def, normalizedRot, normalizedDirection, shapeGeo);
        const studGeoKey = "stud_base";
        const studGeo = getGeo(studGeoKey, () =>
            new THREE.CylinderGeometry(STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 8).translate(
                0,
                STUD_HEIGHT / 2,
                0,
            ),
        );
        const studParent = studSurface.useGroupSpace ? group : partRoot;
        const studPlacements = studSurface.placements;
        if (studPlacements != null) {
            studPlacements.forEach((placement) => {
                const stud = new THREE.Mesh(studGeo, baseMat);
                stud.position.set(placement.x, placement.y, placement.z);
                if (placement.nx != null && placement.ny != null && placement.nz != null && (placement.nx !== 0 || placement.ny !== 1 || placement.nz !== 0)) {
                    tempStudNormal.set(placement.nx, placement.ny, placement.nz).normalize();
                    tempStudQuaternion.setFromUnitVectors(groundNormal, tempStudNormal);
                    stud.quaternion.copy(tempStudQuaternion);
                }
                stud.userData = { geoKey: studGeoKey, geo: studGeo };
                studParent.add(stud);
            });
        } else {
            for (let x = 0; x < studSurface.width; x++) {
                for (let z = 0; z < studSurface.depth; z++) {
                    const stud = new THREE.Mesh(studGeo, baseMat);
                    stud.position.set(
                        x - studSurface.width / 2 + 0.5,
                        studSurface.topY,
                        z - studSurface.depth / 2 + 0.5,
                    );
                    stud.userData = { geoKey: studGeoKey, geo: studGeo };
                    studParent.add(stud);
                }
            }
        }
    }

    const hbGeo = new THREE.BoxGeometry(sx, sy, sz).translate(0, sy / 2, 0);
    const hitbox = new THREE.Mesh(hbGeo, new THREE.MeshBasicMaterial({ visible: false }));
    hitbox.userData.isHitbox = true;
    partRoot.add(hitbox);
    group.userData.hitbox = hitbox;
    if (def.customGeo?.startsWith("shape:")) applyShapeOrientationTransform(partRoot, sx, sy, sz, normalizedDirection, normalizedRot);
    else group.rotation.y = -normalizedRot * (Math.PI / 2);
    return group;
}

function getStaticPlacementParts(type, rot, direction = SHAPE_DIRECTION_DEFAULT) {
    const cacheKey = `${type}:${rot}:${direction || ""}`;
    if (STATIC_PARTS_CACHE.has(cacheKey)) return STATIC_PARTS_CACHE.get(cacheKey);

    const group = createBlockGroup(type, "#ffffff", rot, false, direction);
    group.updateMatrixWorld(true);

    const parts = [];
    group.traverse((node) => {
        if (!node.isMesh || node.userData?.isHitbox) return;
        parts.push({
            geoKey: node.userData.geoKey,
            geo: node.userData.geo,
            isGlass: !!node.userData.isGlass,
            matrix: node.matrixWorld.clone(),
        });
    });

    STATIC_PARTS_CACHE.set(cacheKey, parts);
    return parts;
}

function addStaticBlockInstances(blockId, type, rot, colorHex, cx, cy, cz, dx, dz, direction = SHAPE_DIRECTION_DEFAULT) {
    const parts = getStaticPlacementParts(type, rot, direction);
    tempPlacementMatrix.makeTranslation(cx + dx / 2, cy, cz + dz / 2);

    parts.forEach((part) => {
        tempInstanceWorldMatrix.multiplyMatrices(tempPlacementMatrix, part.matrix);
        addInstance(
            part.geoKey,
            part.geo,
            part.isGlass ? matGlass : matSolid,
            blockId,
            tempInstanceWorldMatrix,
            colorHex,
            part.isGlass,
        );
    });
}

// --- LÓGICA DE GRID ---
function getChunkKeysForBounds(cx, cz, dx, dz) {
    const chunkKeys = [];
    const minChunkX = getChunkCoord(cx);
    const maxChunkX = getChunkCoord(cx + dx - 1);
    const minChunkZ = getChunkCoord(cz);
    const maxChunkZ = getChunkCoord(cz + dz - 1);

    for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
        for (let chunkZ = minChunkZ; chunkZ <= maxChunkZ; chunkZ++) {
            chunkKeys.push(getChunkKey(chunkX, chunkZ));
        }
    }

    return chunkKeys;
}

function getChunkCoord(value) {
    return Math.floor(value / WORLD_CHUNK_SIZE);
}

function getChunkKey(chunkX, chunkZ) {
    return `${chunkX},${chunkZ}`;
}

function getLocalChunkCoord(value) {
    const mod = value % WORLD_CHUNK_SIZE;
    return mod < 0 ? mod + WORLD_CHUNK_SIZE : mod;
}

function getLocalVoxelKey(localX, y, localZ) {
    return localX + localZ * WORLD_CHUNK_SIZE + y * WORLD_CHUNK_AREA;
}

function createVoxelQueryContext() {
    return {
        chunkX: Number.NaN,
        chunkZ: Number.NaN,
        chunk: null,
    };
}

function getChunkFromQueryContext(x, z, context) {
    const chunkX = getChunkCoord(x);
    const chunkZ = getChunkCoord(z);
    if (context.chunkX !== chunkX || context.chunkZ !== chunkZ) {
        context.chunkX = chunkX;
        context.chunkZ = chunkZ;
        context.chunk = voxelChunks.get(getChunkKey(chunkX, chunkZ)) ?? null;
    }
    return context.chunk;
}

function hasVoxelWithContext(x, y, z, context) {
    const chunk = getChunkFromQueryContext(x, z, context);
    if (!chunk) return false;

    return chunk.voxels.has(getLocalVoxelKey(getLocalChunkCoord(x), y, getLocalChunkCoord(z)));
}

function getVoxelWithContext(x, y, z, context) {
    const chunk = getChunkFromQueryContext(x, z, context);
    if (!chunk) return undefined;

    return chunk.voxels.get(getLocalVoxelKey(getLocalChunkCoord(x), y, getLocalChunkCoord(z)));
}

function inspectChunkRange(cx, cz, dx, dz, minY, maxY) {
    const minChunkX = getChunkCoord(cx);
    const maxChunkX = getChunkCoord(cx + dx - 1);
    const minChunkZ = getChunkCoord(cz);
    const maxChunkZ = getChunkCoord(cz + dz - 1);
    let hasAnyChunk = false;
    let hasOverlappingChunk = false;

    for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
        for (let chunkZ = minChunkZ; chunkZ <= maxChunkZ; chunkZ++) {
            const chunk = voxelChunks.get(getChunkKey(chunkX, chunkZ));
            if (!chunk) continue;

            hasAnyChunk = true;
            if (chunk.aabb.maxY >= minY && chunk.aabb.minY <= maxY) {
                hasOverlappingChunk = true;
                return { hasAnyChunk, hasOverlappingChunk };
            }
        }
    }

    return { hasAnyChunk, hasOverlappingChunk };
}

function markChunkMutation(chunk) {
    if (!chunk) return;
    chunk.version += 1;
    chunk.lastTouchedFrame = perfState.frameCount;
}

function updateChunkYBoundsOnAdd(chunk, y) {
    chunk.yCounts.set(y, (chunk.yCounts.get(y) ?? 0) + 1);
    if (y < chunk.aabb.minY) chunk.aabb.minY = y;
    if (y > chunk.aabb.maxY) chunk.aabb.maxY = y;
}

function updateChunkYBoundsOnDelete(chunk, y) {
    const count = chunk.yCounts.get(y);
    if (!count) return;

    if (count === 1) {
        chunk.yCounts.delete(y);
        if (chunk.yCounts.size === 0) {
            chunk.aabb.minY = Infinity;
            chunk.aabb.maxY = -Infinity;
            return;
        }

        if (y === chunk.aabb.minY || y === chunk.aabb.maxY) {
            let minY = Infinity;
            let maxY = -Infinity;
            chunk.yCounts.forEach((_, levelY) => {
                if (levelY < minY) minY = levelY;
                if (levelY > maxY) maxY = levelY;
            });
            chunk.aabb.minY = minY;
            chunk.aabb.maxY = maxY;
        }
        return;
    }

    chunk.yCounts.set(y, count - 1);
}

function ensureBlockChunkKeys(blockData) {
    if (!blockData.chunkKeys) {
        blockData.chunkKeys = getChunkKeysForBounds(blockData.cx, blockData.cz, blockData.dx, blockData.dz);
    }
    return blockData.chunkKeys;
}

function registerBlockInChunks(blockData) {
    ensureBlockChunkKeys(blockData).forEach((chunkKey) => {
        const chunk = voxelChunks.get(chunkKey);
        if (!chunk) return;

        chunk.blockIds.add(blockData.id);
        chunk.groupRefs.set(blockData.groupId, (chunk.groupRefs.get(blockData.groupId) ?? 0) + 1);
        markChunkMutation(chunk);
    });
}

function unregisterBlockFromChunks(blockData) {
    ensureBlockChunkKeys(blockData).forEach((chunkKey) => {
        const chunk = voxelChunks.get(chunkKey);
        if (!chunk) return;

        chunk.blockIds.delete(blockData.id);
        const groupRefCount = chunk.groupRefs.get(blockData.groupId) ?? 0;
        if (groupRefCount <= 1) chunk.groupRefs.delete(blockData.groupId);
        else chunk.groupRefs.set(blockData.groupId, groupRefCount - 1);
        markChunkMutation(chunk);
    });
}

function getVoxelChunk(x, z) {
    return voxelChunks.get(getChunkKey(getChunkCoord(x), getChunkCoord(z)));
}

function ensureVoxelChunk(x, z) {
    const chunkX = getChunkCoord(x);
    const chunkZ = getChunkCoord(z);
    const chunkKey = getChunkKey(chunkX, chunkZ);
    let chunk = voxelChunks.get(chunkKey);
    if (!chunk) {
        const minX = chunkX * WORLD_CHUNK_SIZE;
        const minZ = chunkZ * WORLD_CHUNK_SIZE;
        chunk = {
            key: chunkKey,
            chunkX,
            chunkZ,
            aabb: {
                minX,
                maxX: minX + WORLD_CHUNK_SIZE - 1,
                minY: Infinity,
                maxY: -Infinity,
                minZ,
                maxZ: minZ + WORLD_CHUNK_SIZE - 1,
            },
            voxels: new Map(),
            yCounts: new Map(),
            blockIds: new Set(),
            groupRefs: new Map(),
            count: 0,
            version: 0,
            lastTouchedFrame: -1,
        };
        voxelChunks.set(chunkKey, chunk);
    }
    return chunk;
}

function getVoxel(x, y, z) {
    const chunk = getVoxelChunk(x, z);
    if (!chunk) return undefined;
    return chunk.voxels.get(getLocalVoxelKey(getLocalChunkCoord(x), y, getLocalChunkCoord(z)));
}

function hasVoxel(x, y, z) {
    const chunk = getVoxelChunk(x, z);
    if (!chunk) return false;
    return chunk.voxels.has(getLocalVoxelKey(getLocalChunkCoord(x), y, getLocalChunkCoord(z)));
}

function setVoxel(x, y, z, value) {
    const chunk = ensureVoxelChunk(x, z);
    const key = getLocalVoxelKey(getLocalChunkCoord(x), y, getLocalChunkCoord(z));
    if (!chunk.voxels.has(key)) {
        chunk.count += 1;
        activeVoxelCount += 1;
        updateChunkYBoundsOnAdd(chunk, y);
    }
    chunk.voxels.set(key, value);
    markChunkMutation(chunk);
}

function deleteVoxel(x, y, z) {
    const chunk = getVoxelChunk(x, z);
    if (!chunk) return false;

    const key = getLocalVoxelKey(getLocalChunkCoord(x), y, getLocalChunkCoord(z));
    const deleted = chunk.voxels.delete(key);
    if (!deleted) return false;

    chunk.count -= 1;
    activeVoxelCount -= 1;
    updateChunkYBoundsOnDelete(chunk, y);
    markChunkMutation(chunk);
    if (chunk.count === 0) voxelChunks.delete(chunk.key);
    return true;
}

function getTopOccupiedYAt(x, z) {
    const chunk = getVoxelChunk(x, z);
    if (!chunk) return -1;
    if (!Number.isFinite(chunk.aabb.minY) || !Number.isFinite(chunk.aabb.maxY)) return -1;

    const localX = getLocalChunkCoord(x);
    const localZ = getLocalChunkCoord(z);
    for (let y = chunk.aabb.maxY; y >= chunk.aabb.minY; y--) {
        if (chunk.voxels.has(getLocalVoxelKey(localX, y, localZ))) return y;
    }

    return -1;
}

function hasStudSupport(block) {
    if (!block?.def?.topStuds) return false;
    if (!block.def.customGeo?.startsWith("shape:")) return true;
    return normalizeShapeDirection(block.direction) === SHAPE_DIRECTION_DEFAULT;
}

function getPrefabFastPlacementResult(cy, rotation, collisionRange, supportRange) {
    if (!collisionRange.hasAnyChunk) {
        return {
            resolved: true,
            result: cy === 0 && rotation.groundComponentCount === rotation.componentCount,
        };
    }

    if (!collisionRange.hasOverlappingChunk) {
        if (cy === 0 && rotation.groundComponentCount === rotation.componentCount) {
            return { resolved: true, result: true };
        }

        if (!supportRange.hasOverlappingChunk) {
            return { resolved: true, result: false };
        }
    }

    return { resolved: false, result: false };
}

function collidesWithPrefabWorld(cx, cy, cz, rotation) {
    const occupancyQuery = createVoxelQueryContext();

    for (const cell of rotation.occupiedSorted || rotation.occupied) {
        if (hasVoxelWithContext(cx + cell.x, cy + cell.y, cz + cell.z, occupancyQuery)) return true;
    }

    return false;
}

function hasPrefabWorldSupport(cx, cy, cz, rotation) {
    const supportQuery = createVoxelQueryContext();
    const supportedComponents = new Set();

    for (const cell of rotation.supportOffsetsSorted || rotation.supportOffsets) {
        const wy = cy + cell.y;
        if (wy === 0) {
            supportedComponents.add(cell.component);
        } else {
            const below = getVoxelWithContext(cx + cell.x, wy - 1, cz + cell.z, supportQuery);
            if (hasStudSupport(below)) supportedComponents.add(cell.component);
        }

        if (supportedComponents.size === rotation.componentCount) return true;
    }

    return false;
}

function canPlace(cx, cy, cz, type, rot, direction = SHAPE_DIRECTION_DEFAULT) {
    const prefabId = getPrefabIdFromType(type);
    if (prefabId) return canPlacePrefab(cx, cy, cz, prefabId, rot);
    const start = performance.now();
    try {
        if (cy < 0 || cy >= MAX_HEIGHT) return false;
        const { dx, dy, dz } = getPlacementMetrics(type, rot, direction);
        if (cy + dy > MAX_HEIGHT) return false;
        const half = CURRENT_GRID_SIZE / 2;
        const occupancyQuery = createVoxelQueryContext();
        const supportQuery = createVoxelQueryContext();
        let supported = false;
        for (let x = 0; x < dx; x++) {
            for (let y = 0; y < dy; y++) {
                for (let z = 0; z < dz; z++) {
                    const wx = cx + x;
                    const wy = cy + y;
                    const wz = cz + z;
                    if (wx < -half || wx >= half || wz < -half || wz >= half) return false;
                    if (hasVoxelWithContext(wx, wy, wz, occupancyQuery)) return false;
                    if (y === 0) {
                        if (wy === 0) supported = true;
                        else {
                            const below = getVoxelWithContext(wx, wy - 1, wz, supportQuery);
                            if (hasStudSupport(below)) supported = true;
                        }
                    }
                }
            }
        }
        return supported;
    } finally {
        recordPerfSample("canPlace", performance.now() - start);
    }
}

function canPlacePrefab(cx, cy, cz, pid, pRot) {
    const start = performance.now();
    try {
        const prefab = PREFABS[pid];
        const rotation = prefab?.meta?.rotations[((pRot % 4) + 4) % 4];
        if (!prefab || !rotation) return false;
        if (cy !== 0) return false;
        if (rotation.componentCount === 0 || rotation.supportOffsets.length === 0) return false;
        const half = CURRENT_GRID_SIZE / 2;
        if (cy < 0 || cy + prefab.dy > MAX_HEIGHT) return false;
        if (cx < -half || cz < -half || cx + rotation.dx > half || cz + rotation.dz > half) return false;

        const collisionRange = inspectChunkRange(cx, cz, rotation.dx, rotation.dz, cy, cy + prefab.dy - 1);
        if (!collisionRange.hasAnyChunk) {
            return cy === 0 && rotation.groundComponentCount === rotation.componentCount;
        }

        const supportRange =
            rotation.supportBelowMaxY >= rotation.supportBelowMinY
                ? inspectChunkRange(
                      cx,
                      cz,
                      rotation.dx,
                      rotation.dz,
                      cy + rotation.supportBelowMinY,
                      cy + rotation.supportBelowMaxY,
                  )
                : { hasAnyChunk: false, hasOverlappingChunk: false };

        const fastResult = getPrefabFastPlacementResult(cy, rotation, collisionRange, supportRange);
        if (fastResult.resolved) return fastResult.result;
        if (collidesWithPrefabWorld(cx, cy, cz, rotation)) return false;
        return hasPrefabWorldSupport(cx, cy, cz, rotation);
    } finally {
        recordPerfSample("canPlacePrefab", performance.now() - start);
    }
}

function calculatePlacementOrigin(intersect, dx, dz) {
    tempPlacementNormal.copy(intersect.face.normal).multiplyScalar(0.1);
    tempPlacementPoint.copy(intersect.point).add(tempPlacementNormal);
    let cx = Math.floor(tempPlacementPoint.x);
    let cy = Math.floor(tempPlacementPoint.y);
    let cz = Math.floor(tempPlacementPoint.z);
    if (Math.abs(intersect.face.normal.y) > 0.5) {
        cx -= Math.floor(dx / 2);
        cz -= Math.floor(dz / 2);
    } else if (Math.abs(intersect.face.normal.x) > 0.5) {
        cz -= Math.floor(dz / 2);
        if (intersect.face.normal.x < -0.5) cx -= dx - 1;
    } else if (Math.abs(intersect.face.normal.z) > 0.5) {
        cx -= Math.floor(dx / 2);
        if (intersect.face.normal.z < -0.5) cz -= dz - 1;
    }
    return { cx, cy, cz };
}

function getPlacementFootprint(type, rot, direction = SHAPE_DIRECTION_DEFAULT) {
    const { dx, dz } = getPlacementMetrics(type, rot, direction);
    return { dx, dz };
}

function clampPlacementToWorld(cx, cz, dx, dz) {
    const half = CURRENT_GRID_SIZE / 2;
    const minX = -half;
    const maxX = half - dx;
    const minZ = -half;
    const maxZ = half - dz;

    return {
        cx: maxX >= minX ? Math.max(minX, Math.min(cx, maxX)) : cx,
        cz: maxZ >= minZ ? Math.max(minZ, Math.min(cz, maxZ)) : cz,
    };
}

// --- GESTÃO DE BLOCOS ---
function updateStats() {
    const counter = document.getElementById("block-counter");
    counter.innerText = `${blocksCount.toLocaleString("pt-BR")} / 60.000`;
    if (blocksCount >= MAX_BLOCKS) counter.classList.add("full");
    else counter.classList.remove("full");
    updatePerfOverlay(true);
}

function placeBlock(cx, cy, cz, type, color, rot, skipStats = false, groupId = null, direction = SHAPE_DIRECTION_DEFAULT) {
    if (blocksCount >= MAX_BLOCKS) return;
    const def = getRegisteredBlockDef(type);
    if (!def) return;
    const normalizedDirection = def.customGeo?.startsWith("shape:") ? normalizeShapeDirection(direction) : undefined;
    const { dx, dy, dz } = getPlacementMetrics(type, rot, normalizedDirection);
    const blockId = getNextUniqueId();
    const actualGroupId = groupId || blockId;
    const colorHex = tempColor.set(color).getHex();
    const blockData = { id: blockId, groupId: actualGroupId, def, cx, cy, cz, dx, dy, dz, type, color, colorHex, rot };
    if (normalizedDirection != null) blockData.direction = normalizedDirection;
    let hitboxMesh = null;
    if (def.animated) {
        const temp = createBlockGroup(type, color, rot, false, normalizedDirection);
        temp.position.set(cx + dx / 2, cy, cz + dz / 2);
        temp.updateMatrixWorld(true);
        const live = temp.clone();
        const hitboxesToRemove = [];
        live.traverse((c) => {
            if (c.userData && c.userData.isHitbox) {
                hitboxesToRemove.push(c);
            } else if (c.isMesh) {
                const newMat = c.userData.isGlass ? matGlass.clone() : matSolid.clone();
                newMat.color.setHex(colorHex);
                c.material = newMat;
                c.castShadow = true;
                c.receiveShadow = true;
            }
        });
        hitboxesToRemove.forEach((node) => {
            if (node.parent) node.parent.remove(node);
        });
        scene.add(live);
        blockData.live = live;
        let piv = null;
        live.traverse((c) => {
            if (c.userData.isRotor) piv = c;
        });
        if (piv) animatedBlocks.push({ id: blockId, pivot: piv });
    } else {
        addStaticBlockInstances(blockId, type, rot, colorHex, cx, cy, cz, dx, dz, normalizedDirection);
    }
    for (let x = 0; x < dx; x++) {
        for (let y = 0; y < dy; y++) {
            for (let z = 0; z < dz; z++) setVoxel(cx + x, cy + y, cz + z, blockData);
        }
    }
    blockData.chunkKeys = getChunkKeysForBounds(cx, cz, dx, dz);
    registerBlockInChunks(blockData);
    blockData.hitbox = hitboxMesh;
    blockById.set(blockId, blockData);
    if (!groupToBlockIds.has(actualGroupId)) groupToBlockIds.set(actualGroupId, new Set());
    groupToBlockIds.get(actualGroupId).add(blockId);
    blocksCount++;
    if (!skipStats) updateStats();
    return blockData;
}

function placePrefab(cx, cy, cz, pid, pRot, skipStats = false) {
    const prefab = PREFABS[pid];
    const rotation = prefab?.meta?.rotations[((pRot % 4) + 4) % 4];
    if (!prefab || !rotation) return;

    const groupId = getNextUniqueId();
    groupToSourcePrefabId.set(groupId, pid);
    groupToPrefabPlacement.set(groupId, { type: pid, x: cx, y: cy, z: cz, rot: ((pRot % 4) + 4) % 4 });

    rotation.blocks.forEach((block) => {
        placeBlock(cx + block.lx, cy + block.ly, cz + block.lz, block.type, block.color, block.rot, true, groupId, block.direction);
    });

    if (!skipStats) updateStats();
    return groupId;
}

function removeGroupById(groupId) {
    const blockIds = groupToBlockIds.get(groupId);
    if (!blockIds || blockIds.size === 0) return;
    [...blockIds]
        .map((blockId) => blockById.get(blockId))
        .filter(Boolean)
        .forEach((block) => removeBlock(block, true));
    groupToSourcePrefabId.delete(groupId);
    groupToPrefabPlacement.delete(groupId);
    updateStats();
}

function removeBlock(data, skipStats = false) {
    if (!data) return;
    if (data.def.animated) {
        scene.remove(data.live);
        animatedBlocks = animatedBlocks.filter((a) => a.id !== data.id);
    } else removeInstances(data.id);
    if (data.hitbox) {
        scene.remove(data.hitbox);
        const hitboxIndex = hitboxes.indexOf(data.hitbox);
        if (hitboxIndex !== -1) hitboxes.splice(hitboxIndex, 1);
        const blockHitboxIndex = blockHitboxes.indexOf(data.hitbox);
        if (blockHitboxIndex !== -1) blockHitboxes.splice(blockHitboxIndex, 1);
    }
    unregisterBlockFromChunks(data);
    for (let x = 0; x < data.dx; x++) {
        for (let y = 0; y < data.dy; y++) {
            for (let z = 0; z < data.dz; z++) deleteVoxel(data.cx + x, data.cy + y, data.cz + z);
        }
    }
    blockById.delete(data.id);
    const groupBlocks = groupToBlockIds.get(data.groupId);
    if (groupBlocks) {
        groupBlocks.delete(data.id);
        if (groupBlocks.size === 0) {
            groupToBlockIds.delete(data.groupId);
            groupToSourcePrefabId.delete(data.groupId);
            groupToPrefabPlacement.delete(data.groupId);
        }
    }
    blocksCount--;
    if (!skipStats) updateStats();
}

function clearAll() {
    clearHighlights();
    const blocks = [...blockById.values()];
    blocks.forEach((block) => removeBlock(block, true));
    groupToSourcePrefabId.clear();
    groupToPrefabPlacement.clear();
    updateStats();
}

// --- SISTEMA DE FÍSICA PARA 1ª PESSOA ---
function hasChunkCollisionAtColumn(chunk, localX, localZ, minY, maxY) {
    if (!chunk) return false;

    const startY = Math.max(minY, chunk.aabb.minY);
    const endY = Math.min(maxY, chunk.aabb.maxY);
    if (!Number.isFinite(startY) || !Number.isFinite(endY) || startY > endY) return false;

    for (let y = startY; y <= endY; y++) {
        if (chunk.voxels.has(getLocalVoxelKey(localX, y, localZ))) return true;
    }

    return false;
}

function checkFPCollision(pos) {
    pointedWorldBlockId = null;
    const r = 0.25;
    const h = 1.8;
    const minX = Math.floor(pos.x - r);
    const maxX = Math.floor(pos.x + r);
    const minY = Math.floor(pos.y);
    const maxY = Math.floor(pos.y + h);
    const minZ = Math.floor(pos.z - r);
    const maxZ = Math.floor(pos.z + r);

    if (minY < 0) return true;

    for (let x = minX; x <= maxX; x++) {
        const localX = getLocalChunkCoord(x);
        for (let z = minZ; z <= maxZ; z++) {
            const localZ = getLocalChunkCoord(z);
            if (hasChunkCollisionAtColumn(getVoxelChunk(x, z), localX, localZ, minY, maxY)) return true;
        }
    }
    return false;
}

// --- INPUTS & VISUAL DO GRID ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function processPointerMove(clientX, clientY) {
    if (isFirstPerson) return;
    const hoverStart = performance.now();

    mouse.x = (clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, orthoCamera);
    const hit = pickFromSceneRay();
    pointedWorldBlockId = hit && hit.kind === "voxel" && hit.block ? hit.block.id : null;

    if (isDeleteMode || isDeleteGroupMode) {
        if (hit && hit.kind === "voxel" && hit.block) {
            const targetBlock = hit.block;
            if (isDeleteGroupMode) {
                if (hoveredBlockId) {
                    setBlockHighlight(hoveredBlockId, false);
                    hoveredBlockId = null;
                }
                if (hoveredGroupId !== targetBlock.groupId) {
                    setGroupHighlight(hoveredGroupId, false);
                    hoveredGroupId = targetBlock.groupId;
                    setGroupHighlight(hoveredGroupId, true);
                }
            } else {
                if (hoveredGroupId) {
                    setGroupHighlight(hoveredGroupId, false);
                    hoveredGroupId = null;
                }
                if (hoveredBlockId !== targetBlock.id) {
                    setBlockHighlight(hoveredBlockId, false);
                    hoveredBlockId = targetBlock.id;
                    setBlockHighlight(hoveredBlockId, true);
                }
            }
        } else {
            clearHighlights();
        }
        recordPerfSample("hover", performance.now() - hoverStart);
        return;
    }

    clearHighlights();

    if (hit) {
        const { dx, dz } = getActivePlacementFootprint();
        const origin = calculatePlacementOrigin(hit, dx, dz);
        const clampedOrigin = clampPlacementToWorld(origin.cx, origin.cz, dx, dz);
        currentCX = clampedOrigin.cx;
        currentCY = origin.cy;
        currentCZ = clampedOrigin.cz;
        updateBuildPreview();
    } else {
        if (rollOver) rollOver.visible = false;
        clearToolPreview();
    }

    recordPerfSample("hover", performance.now() - hoverStart);
}

function queuePointerMove(e) {
    if (isFirstPerson || e.target !== renderer.domElement) return;
    const pos = e.changedTouches ? e.changedTouches[0] : e;
    pendingPointerMove.clientX = pos.clientX;
    pendingPointerMove.clientY = pos.clientY;
    pendingPointerMove.active = true;
}

function flushPendingPointerMove() {
    if (!pendingPointerMove.active) return;
    pendingPointerMove.active = false;
    processPointerMove(pendingPointerMove.clientX, pendingPointerMove.clientY);
}

function updateRollOver() {
    if (isFirstPerson) return;
    if (rollOver) scene.remove(rollOver);
    rollOver = createBlockGroup(currentType, currentColor, currentRot, true);
    rollOver.userData.isValid = null;
    scene.add(rollOver);
    updateRollOverVisual();
}
updateRollOver();

function updateRollOverVisual() {
    if (!rollOver || isFirstPerson) return;
    if (activeBuildTool !== TOOL_PLACE) {
        rollOver.visible = false;
        updateBuildPreview();
        return;
    }
    const { dx, dz } = getPlacementFootprint(currentType, currentRot);
    const clampedOrigin = clampPlacementToWorld(currentCX, currentCZ, dx, dz);
    currentCX = clampedOrigin.cx;
    currentCZ = clampedOrigin.cz;
    rollOver.position.set(currentCX + dx / 2, currentCY, currentCZ + dz / 2);

    const isValid = canPlace(currentCX, currentCY, currentCZ, currentType, currentRot);
    if (rollOver.userData.isValid !== isValid) {
        const ghostMaterial = isValid ? matGhostValid : matGhostInvalid;
        rollOver.traverse((c) => {
            if (c.isMesh && !c.userData.isHitbox) c.material = ghostMaterial;
        });
        rollOver.userData.isValid = isValid;
    }
    rollOver.visible = !isDeleteMode && !isDeleteGroupMode;
}

function handleMove(e) {
    queuePointerMove(e);
}

function executePlacement() {
    if (isFirstPerson) return;
    if (isDeleteMode || isDeleteGroupMode) {
        const targetGroupId = hoveredGroupId;
        const targetBlockId = hoveredBlockId;
        const targetBlocks = isDeleteGroupMode
            ? [...(groupToBlockIds.get(targetGroupId) || [])].map((blockId) => blockById.get(blockId)).filter(Boolean)
            : [blockById.get(targetBlockId)].filter(Boolean);
        clearHighlights();
        if (targetBlocks.length > 0) {
            executeBuilderCommand(createDeleteCommand(targetBlocks, isDeleteGroupMode ? "Apagar estrutura" : "Apagar bloco"));
        }
        return;
    }

    if (activeBuildTool === TOOL_SELECT) {
        if (!selectionAnchor) {
            selectionAnchor = { cx: currentCX, cy: currentCY, cz: currentCZ };
            updateBuildPreview();
            updateBuilderToolsStatus("Seleção iniciada");
            showHint("Primeiro ponto da seleção definido.");
            return;
        }

        const bounds = getSelectionBoundsFromPoints(selectionAnchor, { cx: currentCX, cy: currentCY, cz: currentCZ });
        selectionAnchor = null;
        applySelectionBounds(bounds);
        setToolPreviewBounds(bounds, true, `selected:${bounds.minX}:${bounds.minY}:${bounds.minZ}:${bounds.maxX}:${bounds.maxY}:${bounds.maxZ}`);
        showHint(`${selectedBlockIds.size} bloco(s) selecionado(s).`);
        return;
    }

    if (activeBuildTool === TOOL_PLACE) {
        const prefabId = getPrefabIdFromType(currentType);
        const isValid = prefabId ? canPlacePrefab(currentCX, currentCY, currentCZ, prefabId, currentRot) : canPlace(currentCX, currentCY, currentCZ, currentType, currentRot);
        if (!isValid) {
            showHint("Posição inválida para a ferramenta atual.");
            updateBuildPreview();
            return;
        }
    }

    const bundle = buildPlacementBundleAt({ cx: currentCX, cy: currentCY, cz: currentCZ });
    if (!bundle.blocks.length) {
        showHint(activeBuildTool === TOOL_PASTE ? "Copie uma seleção antes de colar." : "Nada para construir com a ferramenta atual.");
        return;
    }

    if (activeBuildTool !== TOOL_PLACE && !canPlaceBundle(bundle)) {
        showHint("Posição inválida para a ferramenta atual.");
        updateBuildPreview();
        return;
    }

    executeBuilderCommand(createPlacementCommand(bundle, getPlacementCommandLabel()));
    if (activeBuildTool === TOOL_PASTE) showHint("Seleção colada.");
}

function handleTap(e) {
    if (isFirstPerson || e.target !== renderer.domElement) return;
    queuePointerMove(e);
    flushPendingPointerMove();
    executePlacement();
}

// --- CONTROLOS (TECLADO E RATO) ---
window.addEventListener("keydown", (e) => {
    const isFormTarget = ["INPUT", "TEXTAREA", "SELECT"].includes(e.target?.tagName);
    if (isFormTarget && !(e.ctrlKey || e.metaKey)) return;

    if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ") {
        e.preventDefault();
        if (e.shiftKey) redoBuilderCommand();
        else undoBuilderCommand();
        return;
    }

    if ((e.ctrlKey || e.metaKey) && e.code === "KeyY") {
        e.preventDefault();
        redoBuilderCommand();
        return;
    }

    if ((e.ctrlKey || e.metaKey) && e.code === "KeyC") {
        if (selectedBlockIds.size > 0) {
            e.preventDefault();
            copySelectionToClipboard();
        }
        return;
    }

    if ((e.ctrlKey || e.metaKey) && e.code === "KeyV") {
        if (clipboardRecipe?.blocks?.length) {
            e.preventDefault();
            setActiveBuildTool(TOOL_PASTE, "Modo colar ativado");
            updateBuildPreview();
        }
        return;
    }

    keys[e.code] = true;
    if (isFirstPerson) return;

    if (e.code === "Escape") {
        e.preventDefault();
        selectionAnchor = null;
        clearToolPreview();
        setActiveBuildTool(TOOL_PLACE, "Modo de bloco");
        return;
    }

    if (!e.ctrlKey && !e.metaKey && !e.altKey && e.code === "KeyR") {
        e.preventDefault();
        rotateActivePlacement(e.shiftKey ? -1 : 1);
        return;
    }

    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
        orthoCamera.getWorldDirection(tempForward);
        tempForward.y = 0;
        tempForward.normalize();
        tempRight.crossVectors(tempForward, orthoCamera.up).normalize();

        tempDir.set(0, 0, 0);
        if (e.code === "ArrowUp") tempDir.copy(tempForward);
        if (e.code === "ArrowDown") tempDir.copy(tempForward).negate();
        if (e.code === "ArrowLeft") tempDir.copy(tempRight).negate();
        if (e.code === "ArrowRight") tempDir.copy(tempRight);

        if (Math.abs(tempDir.x) > Math.abs(tempDir.z)) currentCX += Math.sign(tempDir.x);
        else currentCZ += Math.sign(tempDir.z);

        // Se estiver no modo de apagar, force o update do raycast via rato, ou não faça nada com as setas
        if (!isDeleteMode && !isDeleteGroupMode) {
            updateBuildPreview();
        }
    }
    if (e.code === "Enter") {
        e.preventDefault();
        executePlacement();
    }
});

window.addEventListener("keyup", (e) => (keys[e.code] = false));

window.addEventListener(
    "wheel",
    (e) => {
        if (isFirstPerson) return;
        const zoomAmount = orthoCamera.zoom * 0.1;
        if (e.deltaY > 0) orthoCamera.zoom = Math.max(0.1, orthoCamera.zoom - zoomAmount);
        else orthoCamera.zoom = Math.min(50, orthoCamera.zoom + zoomAmount);
        orthoCamera.updateProjectionMatrix();
    },
    { passive: false },
);

window.addEventListener("pointermove", handleMove);
window.addEventListener("pointerdown", handleTap);

// --- POINTER LOCK (Olhar em 1ª Pessoa) ---
container.addEventListener("click", () => {
    if (isFirstPerson && !perfState.autobenchmark.running) document.body.requestPointerLock();
});

document.addEventListener("mousemove", (e) => {
    if (!isFirstPerson || document.pointerLockElement !== document.body) return;
    fpYaw -= e.movementX * 0.002;
    fpPitch -= e.movementY * 0.002;
    fpPitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, fpPitch));
    fpCamera.rotation.set(fpPitch, fpYaw, 0);
});

// Sair do Modo de 1ª Pessoa ao pressionar ESC (O browser tira o pointer lock)
document.addEventListener("pointerlockchange", () => {
    if (perfState.autobenchmark.running) return;
    if (document.pointerLockElement !== document.body && isFirstPerson) {
        exitFirstPerson({ hint: "Modo de Construção" });
    }
});

// --- TOUCH (Olhar em 1ª Pessoa no Mobile) ---
container.addEventListener("touchstart", (e) => {
    if (!isFirstPerson) return;
    isDraggingView = true;
    lastTouch.x = e.touches[0].clientX;
    lastTouch.y = e.touches[0].clientY;
});

container.addEventListener("touchmove", (e) => {
    if (!isFirstPerson || !isDraggingView) return;
    const touch = e.touches[0];
    const touchLookSensitivity = mobileQualityProfile.aggressive ? 0.004 : 0.005;
    fpYaw -= (touch.clientX - lastTouch.x) * touchLookSensitivity;
    fpPitch -= (touch.clientY - lastTouch.y) * touchLookSensitivity;
    fpPitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, fpPitch));
    fpCamera.rotation.set(fpPitch, fpYaw, 0);
    lastTouch.x = touch.clientX;
    lastTouch.y = touch.clientY;
});

container.addEventListener("touchend", () => (isDraggingView = false));

// --- SISTEMA DE CÂMARAS E BOTÕES ---
function updateCameraTarget() {
    if (isTopDownView) {
        targetCamOffset.set(0, CAM_HEIGHT * 1.5, 0.1);
    } else {
        const angle = (cameraAngleIndex * Math.PI) / 2 + Math.PI / 4;
        targetCamOffset.set(Math.cos(angle) * CAM_RADIUS, CAM_HEIGHT, Math.sin(angle) * CAM_RADIUS);
    }
}

function setBuilderUiVisible(visible) {
    ["bottom-bar", "left-bar", "json-panel", "builder-tools-panel", "btn-iso", "btn-top", "btn-cam", "btn-rotate", "btn-delete", "btn-delete-group", "btn-expand"].forEach((id) => {
        const element = document.getElementById(id);
        if (element) element.style.display = visible ? "flex" : "none";
    });
    const crosshair = document.getElementById("crosshair");
    if (crosshair) crosshair.style.display = visible ? "none" : "block";
}

function getDefaultFirstPersonSpawn() {
    const cx = Math.floor(cameraTarget.x);
    const cz = Math.floor(cameraTarget.z);
    const topY = getTopOccupiedYAt(cx, cz);
    const startY = topY >= 0 ? topY + 1 : 0;
    return new THREE.Vector3(cameraTarget.x, startY, cameraTarget.z);
}

function enterFirstPerson({ spawnPosition = null, lookAt = null, yaw = fpYaw, pitch = fpPitch, requestPointerLock = true, hint = null } = {}) {
    clearHighlights();
    isFirstPerson = true;
    activeCamera = fpCamera;
    setBuilderUiVisible(false);

    const startPosition = spawnPosition || getDefaultFirstPersonSpawn();
    playerPos.copy(startPosition);
    playerVel.set(0, 0, 0);
    isGrounded = false;
    if (rollOver) rollOver.visible = false;

    if (lookAt) syncFpCamera(lookAt);
    else {
        fpYaw = yaw;
        fpPitch = pitch;
        syncFpCamera();
    }

    const button = document.getElementById("btn-fp");
    if (button) button.classList.add("active");

    if (requestPointerLock) document.body.requestPointerLock();
    if (hint) showHint(hint);
    onResize();
}

function exitFirstPerson({ cameraTargetOverride = null, hint = null } = {}) {
    if (!isFirstPerson) return;

    isFirstPerson = false;
    activeCamera = orthoCamera;
    setBuilderUiVisible(true);

    if (cameraTargetOverride) cameraTarget.copy(cameraTargetOverride);
    else cameraTarget.set(playerPos.x, 0, playerPos.z);

    visualTarget.copy(cameraTarget);
    visualCamOffset.copy(targetCamOffset);
    orthoCamera.position.copy(cameraTarget).add(targetCamOffset);
    orthoCamera.lookAt(cameraTarget);
    updateRollOverVisual();

    const button = document.getElementById("btn-fp");
    if (button) button.classList.remove("active");

    if (document.pointerLockElement) document.exitPointerLock();
    if (hint) showHint(hint);
    onResize();
}

function registerCatalogButton(button) {
    const type = button.dataset.type;
    if (!type) return;
    catalogButtonByType.set(type, button);
    const wrapper = button.closest(".catalog-item");
    if (wrapper) catalogItemByType.set(type, wrapper);
}

function createPrefabCopyButton(prefabId, label) {
    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "copy-json-btn";
    copyButton.dataset.prefabId = prefabId;
    copyButton.textContent = "JSON";
    copyButton.title = `Copiar JSON de ${label}`;
    return copyButton;
}

function wrapCatalogButton(button) {
    const rawType = button.dataset.type;
    const normalizedType = isPrefabType(rawType) ? makePrefabType(getPrefabIdFromType(rawType)) : rawType;
    const label = button.textContent.trim();
    const prefabId = getPrefabIdFromType(normalizedType);
    const wrapper = document.createElement("div");

    wrapper.className = prefabId ? "catalog-item catalog-item-prefab" : "catalog-item catalog-item-basic";
    wrapper.dataset.catalogType = normalizedType;
    button.dataset.type = normalizedType;

    const parent = button.parentNode;
    parent.replaceChild(wrapper, button);
    wrapper.appendChild(button);
    if (prefabId) wrapper.appendChild(createPrefabCopyButton(prefabId, label));

    registerCatalogButton(button);
}

function initializeCatalog() {
    catalogButtonByType.clear();
    catalogItemByType.clear();
    [...catalogBottomBar.querySelectorAll(".block-btn")].forEach((button) => wrapCatalogButton(button));

    const activeButton = [...catalogButtonByType.values()].find((button) => button.classList.contains("active"));
    if (activeButton) currentType = activeButton.dataset.type;
}

function selectCatalogType(type) {
    catalogButtonByType.forEach((button) => button.classList.remove("active"));

    const targetButton = catalogButtonByType.get(type);
    if (targetButton) targetButton.classList.add("active");

    currentType = type;
    updateRollOver();
    if (isPrefabType(type)) document.getElementById("btn-top").click();
}

function upsertRuntimePrefabCatalogItem(prefabId, label) {
    const type = makePrefabType(prefabId);
    const existingButton = catalogButtonByType.get(type);
    if (existingButton) {
        existingButton.textContent = label;
        const existingItem = catalogItemByType.get(type);
        const existingCopyButton = existingItem?.querySelector(".copy-json-btn");
        if (existingCopyButton) {
            existingCopyButton.dataset.prefabId = prefabId;
            existingCopyButton.title = `Copiar JSON de ${label}`;
        }
        return existingButton;
    }
    const wrapper = document.createElement("div");
    wrapper.className = "catalog-item catalog-item-prefab";
    wrapper.dataset.catalogType = type;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "block-btn";
    button.dataset.type = type;
    button.textContent = label;

    wrapper.appendChild(button);
    wrapper.appendChild(createPrefabCopyButton(prefabId, label));

    const firstBasicItem = [...catalogBottomBar.children].find((child) => child.classList?.contains("catalog-item-basic"));
    catalogBottomBar.insertBefore(wrapper, firstBasicItem || null);
    registerCatalogButton(button);
    return button;
}

async function copyTextToClipboard(text) {
    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Fallback below.
        }
    }

    const fallback = document.createElement("textarea");
    fallback.value = text;
    fallback.setAttribute("readonly", "true");
    fallback.style.position = "fixed";
    fallback.style.opacity = "0";
    fallback.style.pointerEvents = "none";
    fallback.style.left = "-9999px";
    fallback.style.top = "-9999px";
    document.body.appendChild(fallback);
    fallback.focus();
    fallback.select();

    let copied = false;
    try {
        copied = document.execCommand("copy");
    } finally {
        document.body.removeChild(fallback);
    }

    return copied;
}

function getActiveJsonPayload() {
    if (pointedWorldBlockId && blockById.has(pointedWorldBlockId)) {
        const worldPayload = buildWorldStructureExportPayload(pointedWorldBlockId);
        if (worldPayload) return worldPayload;
    }

    return getCurrentPrefabJsonPayload();
}

function getJsonNameFromText(text) {
    try {
        const parsed = JSON.parse(text);
        return typeof parsed?.name === "string" && parsed.name.trim() ? parsed.name.trim() : null;
    } catch {
        return null;
    }
}

function getJsonKindFromText(text) {
    try {
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
        return typeof parsed.kind === "string" && parsed.kind.trim() ? parsed.kind.trim() : "prefab";
    } catch {
        return null;
    }
}

function sanitizeJsonFilename(name) {
    const sanitized = String(name || "estrutura")
        .trim()
        .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-")
        .replace(/\s+/g, " ")
        .replace(/[. ]+$/g, "");

    return sanitized || "estrutura";
}

function ensureJsonTextareaPayload() {
    const currentText = jsonTextarea?.value.trim();
    if (currentText) {
        return {
            name: getJsonNameFromText(currentText) || "estrutura",
            json: currentText,
            sourceType: "textarea",
        };
    }

    const activePayload = getActiveJsonPayload();
    if (!activePayload) return null;
    writeJsonToTextarea(activePayload.json, { focus: false, select: false });
    return activePayload;
}

function downloadJsonPayload(payload) {
    const fileName = `${sanitizeJsonFilename(payload.name)}.json`;
    const blob = new Blob([payload.json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function loadCurrentPrefabJsonIntoTextarea() {
    const payload = getCurrentPrefabJsonPayload();
    if (!payload) {
        showHint("Selecione uma estrutura para abrir o JSON.");
        return;
    }

    try {
        writeJsonToTextarea(payload.json);
        showHint(`JSON pronto: ${payload.name}`);
    } catch (error) {
        console.error(error);
        showHint(getTrimmedErrorMessage(error, "Nao foi possivel abrir o JSON."));
    }
}

async function downloadJsonFromTextarea() {
    const payload = ensureJsonTextareaPayload();
    if (!payload) {
        showHint("Aponte uma estrutura no mapa ou selecione um prefab para baixar o JSON.");
        return;
    }

    downloadJsonPayload(payload);
    showHint(`Arquivo JSON pronto: ${payload.name}`);
}

async function importPrefabFromJsonText(rawJson) {
    if (!rawJson.trim()) {
        showHint("Cole um JSON de estrutura na textarea.");
        return;
    }

    try {
        const result = registerRuntimePrefabFromJson(rawJson);
        upsertRuntimePrefabCatalogItem(result.name, result.name);
        writeJsonToTextarea(result.json, { focus: false, select: false });
        selectCatalogType(makePrefabType(result.name));
        showHint(result.didOverwriteRuntime ? `Estrutura atualizada: ${result.name}` : `Estrutura carregada: ${result.name}`);
    } catch (error) {
        console.error(error);
        showHint(getTrimmedErrorMessage(error, "JSON invalido."));
    }
}

function showBlockingAlert(message) {
    if (typeof globalThis.alert === "function") {
        globalThis.alert(message);
        return;
    }

    showHint(message.replace(/\s+/g, " ").trim());
}

function getCitySnapshotGroups() {
    return [...groupToBlockIds.entries()]
        .map(([groupId, blockIds]) => ({
            groupId,
            placement: groupToPrefabPlacement.get(groupId) || null,
            blocks: [...blockIds].map((blockId) => blockById.get(blockId)).filter(Boolean),
        }))
        .filter((group) => group.blocks.length > 0);
}

function getPreferredCityName() {
    const currentText = jsonTextarea?.value.trim() || "";
    const currentKind = getJsonKindFromText(currentText);
    if (currentKind === CITY_JSON_KIND) {
        return getJsonNameFromText(currentText) || "Cidade";
    }
    return "Cidade";
}

async function exportCityToTextarea() {
    if (blockById.size === 0) {
        showHint("Nao ha estruturas no mapa para salvar a cidade.");
        return;
    }

    try {
        const exported = buildCitySnapshot(getPreferredCityName(), getCitySnapshotGroups(), PREFABS, { gridSize: CURRENT_GRID_SIZE });
        writeJsonToTextarea(exported.json);
        const copied = await copyTextToClipboard(exported.json);
        showHint(copied ? `JSON salvo da cidade: ${exported.name}` : `JSON pronto da cidade: ${exported.name}`);
    } catch (error) {
        console.error(error);
        showBlockingAlert(error?.message || "Nao foi possivel salvar a cidade.");
    }
}

async function importCityFromJsonText(rawJson) {
    if (!rawJson.trim()) {
        showHint("Cole um JSON de cidade na textarea.");
        return;
    }

    try {
        const parsed = parseCityJson(rawJson);
        const placements = validateCityPlacements(parsed.placements, PREFABS, {
            gridSize: CURRENT_GRID_SIZE,
            cityName: parsed.name,
        });

        clearAll();
        placements.forEach((placement) => {
            placePrefab(placement.x, 0, placement.z, placement.type, placement.rot, true);
        });
        updateStats();
        updateRollOverVisual();
        writeJsonToTextarea(JSON.stringify(parsed.source, null, 2), { focus: false, select: false });
        showHint(`Cidade carregada: ${parsed.name}`);
    } catch (error) {
        console.error(error);
        showBlockingAlert(error?.message || "Nao foi possivel carregar a cidade.");
    }
}

async function importJsonFromText(rawJson) {
    if (!rawJson.trim()) {
        showHint("Cole um JSON de estrutura ou cidade na textarea.");
        return;
    }

    const kind = getJsonKindFromText(rawJson);
    if (kind == null) {
        showHint("JSON invalido.");
        return;
    }

    if (kind === CITY_JSON_KIND) {
        await importCityFromJsonText(rawJson);
        return;
    }

    await importPrefabFromJsonText(rawJson);
}

async function createStructureFromBuildArea() {
    const capture = buildAreaStructureExport(`Estrutura Area ${exportedStructureSerial}`, [...blockById.values()], BUILD_PLATE_SIZE);

    if (capture.status === "empty") {
        showHint("Nao ha blocos dentro do quadrado interno da plataforma para criar uma estrutura.");
        return;
    }

    if (capture.status === "outside") {
        showBlockingAlert(
            "Nao foi possivel criar a estrutura.\n\nTodos os blocos da estrutura precisam caber completamente dentro do quadrado interno da plataforma.\nMova ou remova as pecas que ultrapassam a area e tente novamente.",
        );
        return;
    }

    if (capture.status === "disconnected") {
        showBlockingAlert(
            "Nao foi possivel criar a estrutura.\n\nUma estrutura nao pode ser criada com blocos desconectados dentro do quadrado interno da plataforma.\nConecte todos os blocos soltos e tente novamente.",
        );
        return;
    }

    exportedStructureSerial += 1;

    try {
        const result = registerRuntimePrefabFromJson(capture.exported.json);
        upsertRuntimePrefabCatalogItem(result.name, result.name);
        writeJsonToTextarea(result.json);
        selectCatalogType(makePrefabType(result.name));
        const copied = await copyTextToClipboard(result.json);
        showHint(copied ? `Estrutura criada: ${result.name}` : `Estrutura criada: ${result.name}. JSON pronto na textarea.`);
    } catch (error) {
        console.error(error);
        showHint(getTrimmedErrorMessage(error, "Nao foi possivel criar a estrutura."));
    }
}

function importPrefabFromTextarea() {
    const rawJson = jsonTextarea?.value.trim() || "";
    void importJsonFromText(rawJson);
}

function openJsonFilePicker() {
    jsonFileInput?.click();
}

async function handleJsonFileSelection(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
        const text = await file.text();
        writeJsonToTextarea(text, { focus: false, select: false });
        await importJsonFromText(text);
    } catch (error) {
        console.error(error);
        showHint(getTrimmedErrorMessage(error, "Nao foi possivel abrir o arquivo JSON."));
    }
}

initializeCatalog();
initPanelToggles();
syncShapeSelectOptions();
updateShapeDirectionButton();
updateBuilderToolButtons();
updateBuilderToolsStatus();

builderToolButtons.forEach((button) => {
    button.onclick = () => {
        const tool = button.dataset.buildTool;
        if (!tool) return;
        setActiveBuildTool(tool, `Modo ${button.textContent.trim().toLowerCase()} ativado`);
        updateBuildPreview();
    };
});

if (builderToolUndoButton) builderToolUndoButton.onclick = () => void undoBuilderCommand();
if (builderToolRedoButton) builderToolRedoButton.onclick = () => void redoBuilderCommand();
if (builderToolCopyButton) builderToolCopyButton.onclick = () => void copySelectionToClipboard();
if (builderToolPasteButton)
    builderToolPasteButton.onclick = () => {
        if (!clipboardRecipe?.blocks?.length) {
            showHint("Faça uma cópia antes de colar.");
            return;
        }
        setActiveBuildTool(TOOL_PASTE, "Modo colar ativado");
        updateBuildPreview();
    };
if (builderToolClearSelectionButton)
    builderToolClearSelectionButton.onclick = () => {
        clearSelection();
        clearToolPreview();
        updateBuildPreview();
    };

if (builderToolShapeDirectionButton)
    builderToolShapeDirectionButton.onclick = () => {
        const mode = rotateShapeToolOrientation(1);
        if (activeBuildTool === TOOL_SHAPE) updateBuildPreview();
        updateBuilderToolsStatus(mode === "rotation" ? "Giro da forma atualizado" : "Direção da forma atualizada");
    };
if (builderToolShapeDirectionButton)
    builderToolShapeDirectionButton.oncontextmenu = (event) => {
        event.preventDefault();
        const mode = rotateShapeToolOrientation(-1);
        if (activeBuildTool === TOOL_SHAPE) updateBuildPreview();
        updateBuilderToolsStatus(mode === "rotation" ? "Giro da forma atualizado (-90deg)" : "Direção da forma atualizada (sentido inverso)");
    };

[builderToolWidthInput, builderToolDepthInput, builderToolHeightInput].forEach((input) => {
    if (!input) return;
    input.addEventListener("input", () => {
        input.value = String(clampPositiveInt(input.value, Number(input.defaultValue || 1)));
        updateBuildPreview();
        updateBuilderToolsStatus();
    });
});

if (builderToolShapeSelect)
    builderToolShapeSelect.addEventListener("change", () => {
        if (activeBuildTool === TOOL_SHAPE) updateBuildPreview();
        updateBuilderToolsStatus();
    });

document.getElementById("btn-fp").onclick = (e) => {
    const btn = e.currentTarget;
    btn.blur();
    if (perfState.autobenchmark.running) {
        cancelBenchmark("Auto FP interrompido ao sair do modo 1ª pessoa.");
        return;
    }
    if (isFirstPerson) exitFirstPerson({ hint: "Modo de Construção" });
    else enterFirstPerson({ requestPointerLock: true, hint: "Exploração: WASD | Shift (Voar) | Espaço (Subir)" });
};

document.getElementById("btn-iso").onclick = () => {
    isTopDownView = false;
    document.getElementById("btn-iso").classList.add("active");
    document.getElementById("btn-top").classList.remove("active");
    updateCameraTarget();
};

document.getElementById("btn-top").onclick = () => {
    isTopDownView = true;
    document.getElementById("btn-top").classList.add("active");
    document.getElementById("btn-iso").classList.remove("active");
    updateCameraTarget();
};

document.getElementById("btn-cam").onclick = () => {
    if (!isTopDownView) {
        cameraAngleIndex++;
        updateCameraTarget();
    }
};

document.getElementById("btn-rotate").onclick = () => rotateActivePlacement(1);
document.getElementById("btn-rotate").oncontextmenu = (event) => {
    event.preventDefault();
    rotateActivePlacement(-1);
};

document.getElementById("btn-delete").onclick = () => {
    const nextTool = activeBuildTool === TOOL_DELETE_BLOCK ? TOOL_PLACE : TOOL_DELETE_BLOCK;
    setActiveBuildTool(nextTool, nextTool === TOOL_DELETE_BLOCK ? "Modo apagar bloco" : "Modo de bloco");
    updateBuildPreview();
};

document.getElementById("btn-delete-group").onclick = () => {
    const nextTool = activeBuildTool === TOOL_DELETE_GROUP ? TOOL_PLACE : TOOL_DELETE_GROUP;
    setActiveBuildTool(nextTool, nextTool === TOOL_DELETE_GROUP ? "Modo apagar estrutura" : "Modo de bloco");
    updateBuildPreview();
    showHint(nextTool === TOOL_DELETE_GROUP ? "Modo Ativo: Apagar Estrutura Completa" : "Modo de Construção");
};

document.getElementById("btn-expand").onclick = () => cameraTarget.set(0, 0, 0);
document.getElementById("btn-save").onclick = async () => {
    const payload = getActiveJsonPayload();
    if (!payload) {
        showHint("Aponte uma estrutura no mapa ou selecione um prefab para salvar o JSON.");
        return;
    }

    writeJsonToTextarea(payload.json);
    const copied = await copyTextToClipboard(payload.json);
    const actionLabel = payload.sourceType === "world" ? "estrutura" : "prefab";
    showHint(copied ? `JSON salvo do ${actionLabel}: ${payload.name}` : `JSON pronto: ${payload.name}`);
};
if (btnSaveCity) btnSaveCity.onclick = () => void exportCityToTextarea();
document.getElementById("btn-clear").onclick = () => {
    cancelBenchmark("Benchmark interrompido ao limpar o mapa.");
    const blocks = [...blockById.values()];
    if (blocks.length === 0) return;
    executeBuilderCommand(createDeleteCommand(blocks, "Limpar mapa"));
    clearSelection();
    updateBuildPreview();
};

document.querySelectorAll(".color-btn").forEach(
    (b) =>
        (b.onclick = (e) => {
            document.querySelectorAll(".color-btn").forEach((x) => x.classList.remove("active"));
            e.target.classList.add("active");
            currentColor = e.target.dataset.color;
            if (activeBuildTool === TOOL_PLACE) updateRollOver();
            else updateBuildPreview();
        }),
);

catalogBottomBar.addEventListener("click", async (event) => {
    const copyButton = event.target.closest(".copy-json-btn");
    if (copyButton && catalogBottomBar.contains(copyButton)) {
        await copyPrefabJsonToClipboard(copyButton.dataset.prefabId);
        return;
    }

    const blockButton = event.target.closest(".block-btn");
    if (!blockButton || !catalogBottomBar.contains(blockButton)) return;
    selectCatalogType(blockButton.dataset.type);
});

if (btnJsonImport) btnJsonImport.onclick = () => importPrefabFromTextarea();
if (btnJsonCreateStructure) btnJsonCreateStructure.onclick = () => void createStructureFromBuildArea();
if (btnJsonOpenFile) btnJsonOpenFile.onclick = () => openJsonFilePicker();
if (btnJsonDownload) btnJsonDownload.onclick = () => void downloadJsonFromTextarea();
if (btnJsonClear)
    btnJsonClear.onclick = () => {
        if (!jsonTextarea) return;
        jsonTextarea.value = "";
        jsonTextarea.focus();
    };

const btnExportZip = document.getElementById("btn-export-prefabs-zip");
if (btnExportZip) btnExportZip.onclick = () => void createPrefabsZip();

if (jsonFileInput) jsonFileInput.addEventListener("change", (event) => void handleJsonFileSelection(event));

if (jsonTextarea) {
    jsonTextarea.addEventListener("keydown", (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            event.preventDefault();
            importPrefabFromTextarea();
        }
    });
}

globalThis.addEventListener("resize", onResize);
function onResize() {
    const qualityTierChanged = refreshMobileQualityProfile();
    const aspect = globalThis.innerWidth / globalThis.innerHeight;
    orthoCamera.left = -viewSize * aspect;
    orthoCamera.right = viewSize * aspect;
    orthoCamera.top = viewSize;
    orthoCamera.bottom = -viewSize;
    orthoCamera.updateProjectionMatrix();

    fpCamera.aspect = aspect;
    fpCamera.updateProjectionMatrix();

    applyRendererResolution(true);
    scheduleMemoryPolling();
    if (qualityTierChanged) applyRenderMode(currentRenderMode);
    updatePerfOverlay(true);
}

// --- MOTOR DE ANIMAÇÃO E FÍSICAS ---
function animate() {
    requestAnimationFrame(animate);
    const frameStart = performance.now();
    const time = performance.now();
    const delta = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    perfState.frameCount += 1;
    if (time - perfState.fpsWindowStart >= 1000) {
        perfState.fps = (perfState.frameCount * 1000) / (time - perfState.fpsWindowStart);
        perfState.frameCount = 0;
        perfState.fpsWindowStart = time;
    }

    if (perfState.autobenchmark.running) {
        updateAutoBenchmark(time, delta);
    } else if (isFirstPerson) {
        const isFlying = keys["ShiftLeft"] || keys["ShiftRight"];
        const moveSpeed = isFlying ? 20 : 6;
        tempDir.set(0, 0, 0);

        if (keys["KeyW"]) tempDir.z -= 1;
        if (keys["KeyS"]) tempDir.z += 1;
        if (keys["KeyA"]) tempDir.x -= 1;
        if (keys["KeyD"]) tempDir.x += 1;
        if (tempDir.lengthSq() > 0) tempDir.normalize();

        tempEuler.set(0, fpYaw, 0);
        tempDir.applyEuler(tempEuler);
        const vel = tempDir.multiplyScalar(moveSpeed * delta);

        playerPos.x += vel.x;
        if (checkFPCollision(playerPos)) playerPos.x -= vel.x;

        playerPos.z += vel.z;
        if (checkFPCollision(playerPos)) playerPos.z -= vel.z;

        if (isFlying) {
            playerVel.y = 0;
            if (keys["Space"]) playerVel.y = 12;
        } else {
            playerVel.y -= 25 * delta;
            if (isGrounded && keys["Space"]) {
                playerVel.y = 10;
            }
        }

        playerPos.y += playerVel.y * delta;
        if (checkFPCollision(playerPos)) {
            playerPos.y -= playerVel.y * delta;
            if (playerVel.y < 0 && !isFlying) isGrounded = true;
            playerVel.y = 0;
        } else {
            if (!isFlying) isGrounded = false;
        }

        playerPos.x = Math.max(-100, Math.min(100, playerPos.x));
        playerPos.z = Math.max(-100, Math.min(100, playerPos.z));
        playerPos.y = Math.max(0, playerPos.y);

        syncFpCamera();
    } else {
        flushPendingPointerMove();
        orthoCamera.getWorldDirection(tempForward);
        tempForward.y = 0;
        tempForward.normalize();
        tempRight.crossVectors(tempForward, orthoCamera.up).normalize();

        const moveSpeed = 1.5 / orthoCamera.zoom;
        if (keys["KeyW"]) cameraTarget.addScaledVector(tempForward, moveSpeed);
        if (keys["KeyS"]) cameraTarget.addScaledVector(tempForward, -moveSpeed);
        if (keys["KeyA"]) cameraTarget.addScaledVector(tempRight, -moveSpeed);
        if (keys["KeyD"]) cameraTarget.addScaledVector(tempRight, moveSpeed);

        cameraTarget.x = Math.max(-100, Math.min(100, cameraTarget.x));
        cameraTarget.z = Math.max(-100, Math.min(100, cameraTarget.z));

        visualTarget.lerp(cameraTarget, 0.15);
        visualCamOffset.lerp(targetCamOffset, 0.1);
        orthoCamera.position.copy(visualTarget).add(visualCamOffset);
        orthoCamera.lookAt(visualTarget);
    }

    if (rollOver && rollOver.visible) {
        rollOver.traverse((c) => {
            if (c.userData.isRotor) c.rotation.z -= 0.1;
        });
    }
    animatedBlocks.forEach((a) => (a.pivot.rotation.z -= 0.1));
    flushInstancedMeshUpdates();
    renderer.render(scene, activeCamera);
    const frameDuration = performance.now() - frameStart;
    recordPerfSample("frame", frameDuration);
    recordAutoBenchmarkFrame(frameDuration);
    updatePerfOverlay();
}
animate();
updateStats();
