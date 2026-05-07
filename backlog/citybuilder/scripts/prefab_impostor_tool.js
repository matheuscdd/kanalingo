import { PREFABS, isRuntimePrefab } from "../prefabs/index.js";
import {
    PREFAB_IMPOSTOR_BASE_PATH,
    PREFAB_IMPOSTOR_VIEW_KEYS,
    getPrefabImpostorArchivePath,
} from "../prefabs/shared/prefabImpostorViews.js";

const captureFrame = document.getElementById("capture-frame");
const frameStatus = document.getElementById("frame-status");
const prefabList = document.getElementById("prefab-list");
const previewGrid = document.getElementById("preview-grid");
const toolLog = document.getElementById("tool-log");
const selectionSummary = document.getElementById("selection-summary");
const filterInput = document.getElementById("prefab-filter");
const widthInput = document.getElementById("capture-width");
const heightInput = document.getElementById("capture-height");
const renderModeSelect = document.getElementById("capture-render-mode");
const marginInput = document.getElementById("capture-margin");
const formatSelect = document.getElementById("capture-format");
const transparentCheckbox = document.getElementById("capture-transparent");
const backgroundInput = document.getElementById("capture-background");
const btnSelectVisible = document.getElementById("btn-select-visible");
const btnClearSelection = document.getElementById("btn-clear-selection");
const btnGenerateSelected = document.getElementById("btn-generate-selected");
const btnGenerateAll = document.getElementById("btn-generate-all");

const builtinPrefabNames = Object.keys(PREFABS)
    .filter((prefabId) => !isRuntimePrefab(prefabId))
    .sort((left, right) => left.localeCompare(right));

const selectedPrefabIds = new Set();
let currentFilter = "";
let captureApiPromise = null;
let activePreviewUrls = [];
let generationRunning = false;

function appendLog(message) {
    const stamp = new Date().toLocaleTimeString("pt-BR", { hour12: false });
    toolLog.textContent = `[${stamp}] ${message}\n${toolLog.textContent}`.trim();
}

function setFrameStatus(message) {
    frameStatus.textContent = message;
}

function syncBackgroundControls() {
    backgroundInput.disabled = transparentCheckbox.checked;
}

function getCaptureOptions() {
    const width = Math.max(128, Number(widthInput.value) || 1024);
    const height = Math.max(128, Number(heightInput.value) || 1024);
    const margin = Math.max(1.01, Number(marginInput.value) || 1.15);
    const imageType = formatSelect.value || "image/png";
    const extension = imageType === "image/webp" ? "webp" : "png";
    const background = transparentCheckbox.checked ? null : backgroundInput.value;

    return {
        width,
        height,
        margin,
        imageType,
        extension,
        background,
        renderMode: renderModeSelect.value || "basic",
    };
}

function updateFrameAspect() {
    const { width, height } = getCaptureOptions();
    captureFrame.style.aspectRatio = `${width} / ${height}`;
}

function updateSelectionSummary() {
    const visiblePrefabIds = builtinPrefabNames.filter((prefabId) => prefabId.toLowerCase().includes(currentFilter));
    selectionSummary.textContent = `${selectedPrefabIds.size} selecionado(s) | ${visiblePrefabIds.length} visível(is) | ${builtinPrefabNames.length} prefab(s) nativo(s)`;
}

function renderPrefabList() {
    prefabList.innerHTML = "";

    builtinPrefabNames
        .filter((prefabId) => prefabId.toLowerCase().includes(currentFilter))
        .forEach((prefabId) => {
            const prefab = PREFABS[prefabId];
            const item = document.createElement("label");
            item.className = "prefab-item";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = selectedPrefabIds.has(prefabId);
            checkbox.addEventListener("change", () => {
                if (checkbox.checked) selectedPrefabIds.add(prefabId);
                else selectedPrefabIds.delete(prefabId);
                updateSelectionSummary();
            });

            const title = document.createElement("div");
            title.innerHTML = `<strong>${prefabId}</strong><br><small>${prefab.dx} × ${prefab.dy} × ${prefab.dz}</small>`;

            const count = document.createElement("small");
            count.textContent = `${prefab.blocks.length} blocos`;

            item.append(checkbox, title, count);
            prefabList.appendChild(item);
        });

    updateSelectionSummary();
}

function clearPreviewGrid() {
    activePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    activePreviewUrls = [];
    previewGrid.innerHTML = "";
}

function addPreviewCard(prefabId, blob, extension) {
    const url = URL.createObjectURL(blob);
    activePreviewUrls.push(url);

    const figure = document.createElement("figure");
    figure.className = "preview-card";

    const image = document.createElement("img");
    image.alt = `Preview ${prefabId}`;
    image.src = url;

    const caption = document.createElement("figcaption");
    caption.textContent = `${prefabId} · side-0 · ${extension.toUpperCase()}`;

    figure.append(image, caption);
    previewGrid.appendChild(figure);
}

function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildArchiveFileName() {
    const timestamp = new Date().toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
    return `prefab-impostors-${timestamp}.zip`;
}

function setGenerationState(running) {
    generationRunning = running;
    [
        btnSelectVisible,
        btnClearSelection,
        btnGenerateSelected,
        btnGenerateAll,
        filterInput,
        widthInput,
        heightInput,
        renderModeSelect,
        marginInput,
        formatSelect,
        transparentCheckbox,
        backgroundInput,
    ].forEach((element) => {
        if (element) element.disabled = running || (element === backgroundInput && transparentCheckbox.checked);
    });
}

async function waitForCaptureApi() {
    if (captureApiPromise) return captureApiPromise;

    captureApiPromise = new Promise((resolve, reject) => {
        const startedAt = performance.now();

        function poll() {
            const api = captureFrame.contentWindow?.__citybuilderPrefabImpostorApi;
            if (api?.ready) {
                resolve(api);
                return;
            }

            if (performance.now() - startedAt > 30000) {
                reject(new Error("O iframe de captura não expôs o API esperado."));
                return;
            }

            setTimeout(poll, 100);
        }

        if (captureFrame.contentWindow?.document?.readyState === "complete") poll();
        else captureFrame.addEventListener("load", poll, { once: true });
    });

    return captureApiPromise;
}

async function generateZip(prefabIds) {
    if (!prefabIds.length) {
        appendLog("Nenhum prefab selecionado para gerar.");
        return;
    }

    const api = await waitForCaptureApi();
    const zip = new globalThis.JSZip();
    const options = getCaptureOptions();

    setGenerationState(true);
    clearPreviewGrid();
    updateFrameAspect();

    try {
        api.setViewport(options.width, options.height, 1);
        setFrameStatus(`Gerando ${prefabIds.length} prefab(s)…`);
        appendLog(`Iniciando geração de ${prefabIds.length} prefab(s) em ${options.width}×${options.height}, modo ${options.renderMode}.`);

        const manifest = {
            version: 1,
            generatedAt: new Date().toISOString(),
            generator: "prefab-impostor-tool",
            imageType: options.imageType,
            renderMode: options.renderMode,
            viewport: { width: options.width, height: options.height, pixelRatio: 1 },
            background: options.background,
            prefabs: {},
        };

        for (const prefabId of prefabIds) {
            appendLog(`Capturando ${prefabId}...`);
            const result = await api.capturePrefab({
                prefabId,
                viewKeys: PREFAB_IMPOSTOR_VIEW_KEYS,
                renderMode: options.renderMode,
                margin: options.margin,
                background: options.background,
                imageType: options.imageType,
            });

            result.captures.forEach((capture) => {
                const archivePath = `${PREFAB_IMPOSTOR_BASE_PATH}/${getPrefabImpostorArchivePath(prefabId, capture.viewKey, options.extension)}`;
                zip.file(archivePath, capture.blob);
                if (capture.viewKey === "side-0") addPreviewCard(prefabId, capture.blob, options.extension);
            });

            manifest.prefabs[prefabId] = result.manifestEntry;
        }

        zip.file(`${PREFAB_IMPOSTOR_BASE_PATH}/manifest.json`, JSON.stringify(manifest, null, 2));
        const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
        downloadBlob(blob, buildArchiveFileName());
        appendLog("ZIP gerado com sucesso.");
        appendLog(`Extraia a pasta ${PREFAB_IMPOSTOR_BASE_PATH}/ na raiz do projeto para o modo Imagens usar os assets reais.`);
        setFrameStatus(`Concluído: ${prefabIds.length} prefab(s)`);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        appendLog(`Falha: ${message}`);
        setFrameStatus("Falha na geração");
        throw error;
    } finally {
        setGenerationState(false);
    }
}

filterInput.addEventListener("input", () => {
    currentFilter = filterInput.value.trim().toLowerCase();
    renderPrefabList();
});

transparentCheckbox.addEventListener("change", syncBackgroundControls);
[widthInput, heightInput].forEach((input) => input.addEventListener("input", updateFrameAspect));

btnSelectVisible.addEventListener("click", () => {
    builtinPrefabNames
        .filter((prefabId) => prefabId.toLowerCase().includes(currentFilter))
        .forEach((prefabId) => selectedPrefabIds.add(prefabId));
    renderPrefabList();
});

btnClearSelection.addEventListener("click", () => {
    selectedPrefabIds.clear();
    renderPrefabList();
});

btnGenerateSelected.addEventListener("click", async () => {
    try {
        await generateZip([...selectedPrefabIds]);
    } catch (error) {
        console.error(error);
    }
});

btnGenerateAll.addEventListener("click", async () => {
    try {
        await generateZip([...builtinPrefabNames]);
    } catch (error) {
        console.error(error);
    }
});

syncBackgroundControls();
updateFrameAspect();
renderPrefabList();

try {
    const api = await waitForCaptureApi();
    setFrameStatus(api.isCaptureSession ? "Renderer pronto" : "Renderer carregado sem modo de captura");
    appendLog("Renderer de captura conectado com sucesso.");
    api.setViewport(getCaptureOptions().width, getCaptureOptions().height, 1);
} catch (error) {
    setFrameStatus("Falha ao conectar renderer");
    appendLog(error instanceof Error ? error.message : String(error));
    console.error(error);
}