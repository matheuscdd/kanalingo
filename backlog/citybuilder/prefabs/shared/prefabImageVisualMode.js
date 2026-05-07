import {
    PREFAB_IMPOSTOR_MANIFEST_PATH,
    getPrefabImpostorViewKey,
    resolvePrefabImpostorViewConfig,
} from "./prefabImpostorViews.js";

function normalizePrefabImageVisualModeRotation(rot) {
    return ((Number(rot) || 0) % 4 + 4) % 4;
}

function hashPrefabImageVisualModeString(value) {
    let hash = 0;
    const text = String(value || "prefab");
    for (let index = 0; index < text.length; index += 1) {
        hash = Math.trunc((hash << 5) - hash + (text.codePointAt(index) || 0));
    }
    return Math.abs(hash);
}

function normalizePrefabImagePlacementRecord(record) {
    const groupId = record?.groupId;
    const prefabId = record?.prefabId;
    const placement = record?.placement;
    if (groupId == null || !prefabId || !placement) return null;

    return {
        groupId,
        prefabId,
        placement: {
            x: Number(placement.x) || 0,
            y: Number(placement.y) || 0,
            z: Number(placement.z) || 0,
            rot: normalizePrefabImageVisualModeRotation(placement.rot),
        },
        bounds: record?.bounds
            ? {
                  dx: Number(record.bounds.dx) || 0,
                  dy: Number(record.bounds.dy) || 0,
                  dz: Number(record.bounds.dz) || 0,
              }
            : null,
    };
}

function setPrefabImageTextureMetadata(texture, metadata = {}) {
    if (!texture) return;
    texture.userData = texture.userData
        ? { ...texture.userData, ...metadata }
        : { ...metadata };
}

export function createPrefabImageVisualMode({ THREE, scene }) {
    const root = new THREE.Group();
    root.name = "prefab-image-visual-mode-root";
    root.visible = false;

    const placementRecords = new Map();
    const placementNodes = new Map();
    const textureCache = new Map();
    const materialCache = new Map();
    const textureLoadPromises = new Map();
    const cameraView = {
        isTopDownView: false,
        cameraAngleIndex: 0,
    };
    const assetManifestState = {
        status: "idle",
        data: null,
        promise: null,
        error: null,
    };
    const textureLoader = globalThis.document ? new THREE.TextureLoader() : null;

    let attached = false;
    let enabled = false;

    root.userData.prefabImageAssetManifestPath = PREFAB_IMPOSTOR_MANIFEST_PATH;
    root.userData.prefabImageAssetManifestStatus = assetManifestState.status;

    function ensureAttached() {
        if (attached) return;
        scene.add(root);
        attached = true;
    }

    function getViewKey(record) {
        return getPrefabImpostorViewKey({
            isTopDownView: cameraView.isTopDownView,
            cameraAngleIndex: cameraView.cameraAngleIndex,
            placementRot: record?.placement?.rot,
        });
    }

    function applyTextureColorSpace(texture) {
        if (!texture) return;
        texture.needsUpdate = true;
        texture.anisotropy = 1;
        if ("SRGBColorSpace" in THREE) texture.colorSpace = THREE.SRGBColorSpace;
        else if ("sRGBEncoding" in THREE) texture.encoding = THREE.sRGBEncoding;
    }

    function setAssetManifestStatus(status, error = null) {
        assetManifestState.status = status;
        assetManifestState.error = error;
        root.userData.prefabImageAssetManifestStatus = status;
        root.userData.prefabImageAssetManifestError = error;
    }

    function ensureAssetManifestLoaded(force = false) {
        if (typeof globalThis.fetch !== "function") {
            setAssetManifestStatus("unavailable", "fetch indisponível");
            return Promise.resolve(null);
        }

        if (!force && assetManifestState.status === "loaded") {
            return Promise.resolve(assetManifestState.data);
        }

        if (!force && assetManifestState.promise) {
            return assetManifestState.promise;
        }

        setAssetManifestStatus("loading");
        assetManifestState.promise = globalThis.fetch(PREFAB_IMPOSTOR_MANIFEST_PATH, { cache: "no-store" })
            .then((response) => {
                if (!response.ok) throw new Error(`manifest ${response.status}`);
                return response.json();
            })
            .then((manifest) => {
                assetManifestState.data = manifest;
                setAssetManifestStatus("loaded");
                refreshAllPlacementNodes();
                return manifest;
            })
            .catch((error) => {
                assetManifestState.data = null;
                setAssetManifestStatus("failed", error?.message || String(error));
                return null;
            })
            .finally(() => {
                assetManifestState.promise = null;
            });

        return assetManifestState.promise;
    }

    function getResolvedViewConfig(record, viewKey) {
        return resolvePrefabImpostorViewConfig(assetManifestState.data, record?.prefabId, viewKey, record?.bounds);
    }

    function createPlaceholderTexture(prefabId, viewKey) {
        const canvas = globalThis.document?.createElement("canvas");
        if (!canvas) return null;

        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext("2d");
        if (!context) return null;

        const hue = hashPrefabImageVisualModeString(`${prefabId}:${viewKey}`) % 360;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = `hsl(${hue} 52% 78% / 0.96)`;
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.strokeStyle = `hsl(${hue} 38% 34% / 0.95)`;
        context.lineWidth = 8;
        context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

        context.fillStyle = `hsl(${hue} 28% 22% / 0.98)`;
        context.textAlign = "center";
        context.font = "700 28px Segoe UI, Arial, sans-serif";
        context.fillText(prefabId, canvas.width / 2, 108, canvas.width - 40);

        context.font = "600 24px Segoe UI, Arial, sans-serif";
        context.fillText(viewKey.toUpperCase(), canvas.width / 2, 154, canvas.width - 40);

        context.font = "500 18px Segoe UI, Arial, sans-serif";
        context.fillText("image-mode placeholder", canvas.width / 2, 196, canvas.width - 40);

        const texture = new THREE.CanvasTexture(canvas);
        setPrefabImageTextureMetadata(texture, { prefabImpostorPlaceholder: true });
        applyTextureColorSpace(texture);
        return texture;
    }

    function ensureRealTextureLoaded(prefabId, viewKey, filePath) {
        const textureKey = `${prefabId}:${viewKey}`;
        if (!textureLoader || !filePath || textureLoadPromises.has(textureKey)) {
            return textureLoadPromises.get(textureKey) || null;
        }

        const cachedTexture = textureCache.get(textureKey);
        if (cachedTexture?.userData?.prefabImpostorSource === filePath) return null;

        const loadPromise = new Promise((resolve) => {
            textureLoader.load(
                filePath,
                (texture) => {
                    setPrefabImageTextureMetadata(texture, { prefabImpostorSource: filePath });
                    applyTextureColorSpace(texture);

                    const previousTexture = textureCache.get(textureKey);
                    if (previousTexture && previousTexture !== texture) previousTexture.dispose?.();
                    textureCache.set(textureKey, texture);

                    const material = materialCache.get(textureKey);
                    if (material) {
                        material.map = texture;
                        material.needsUpdate = true;
                    }

                    resolve(texture);
                },
                undefined,
                () => resolve(null),
            );
        }).finally(() => {
            textureLoadPromises.delete(textureKey);
        });

        textureLoadPromises.set(textureKey, loadPromise);
        return loadPromise;
    }

    function getViewTexture(record, prefabId, viewKey) {
        const textureKey = `${prefabId}:${viewKey}`;
        if (!textureCache.has(textureKey)) {
            const texture = createPlaceholderTexture(prefabId, viewKey);
            if (texture) textureCache.set(textureKey, texture);
        }

        const viewConfig = getResolvedViewConfig(record, viewKey);
        if (viewConfig.file) ensureRealTextureLoaded(prefabId, viewKey, viewConfig.file);

        return textureCache.get(textureKey) || null;
    }

    function getViewMaterial(record, prefabId, viewKey) {
        const materialKey = `${prefabId}:${viewKey}`;
        const viewTexture = getViewTexture(record, prefabId, viewKey);
        if (!materialCache.has(materialKey)) {
            const material = new THREE.SpriteMaterial({
                map: viewTexture,
                transparent: true,
                depthWrite: false,
            });
            materialCache.set(materialKey, material);
        }

        const material = materialCache.get(materialKey) || null;
        if (material && viewTexture && material.map !== viewTexture) {
            material.map = viewTexture;
            material.needsUpdate = true;
        }
        return material;
    }

    function updatePlacementNodeVisual(node, record) {
        if (!node) return;

        const viewKey = getViewKey(record);
        const sprite = node.userData.prefabImageSprite;
        if (!sprite) return;
        const viewConfig = getResolvedViewConfig(record, viewKey);

        sprite.material = getViewMaterial(record, record.prefabId, viewKey);
        const spriteCenter = viewConfig.spriteCenter;
        sprite.center.set(spriteCenter.x, spriteCenter.y);

        const scale = viewConfig.spriteScale;
        sprite.scale.set(scale.width, scale.height, 1);

        const centerX = record.placement.x + ((Number(record?.bounds?.dx) || 0) / 2 || 0.5);
        const centerZ = record.placement.z + ((Number(record?.bounds?.dz) || 0) / 2 || 0.5);
        const centerY = viewKey === "top"
            ? record.placement.y + Math.max(0.75, (Number(record?.bounds?.dy) || 1) + 0.35)
            : record.placement.y;

        node.position.set(centerX, centerY, centerZ);
        node.visible = true;
    }

    function refreshAllPlacementNodes() {
        placementNodes.forEach((node, groupId) => {
            const record = placementRecords.get(groupId);
            if (!record) return;
            updatePlacementNodeVisual(node, record);
        });
    }

    function removePlacementNode(groupId) {
        const node = placementNodes.get(groupId);
        if (!node) return;
        if (node.parent) node.parent.remove(node);
        placementNodes.delete(groupId);
    }

    function createPlacementNode(record) {
        const anchor = new THREE.Group();
        anchor.name = `prefab-image-anchor:${record.prefabId}:${record.groupId}`;
        anchor.userData.prefabImagePlacement = record;
        if (record.bounds) {
            anchor.userData.prefabImageBounds = { ...record.bounds };
        }
        const sprite = new THREE.Sprite(getViewMaterial(record, record.prefabId, getViewKey(record)));
        sprite.name = `prefab-image-sprite:${record.prefabId}:${record.groupId}`;
        sprite.renderOrder = 6;
        anchor.userData.prefabImageSprite = sprite;
        anchor.add(sprite);
        updatePlacementNodeVisual(anchor, record);
        return anchor;
    }

    function upsertPlacement(record) {
        const normalizedRecord = normalizePrefabImagePlacementRecord(record);
        if (!normalizedRecord) return false;

        placementRecords.set(normalizedRecord.groupId, normalizedRecord);
        removePlacementNode(normalizedRecord.groupId);

        const anchor = createPlacementNode(normalizedRecord);
        placementNodes.set(normalizedRecord.groupId, anchor);
        root.add(anchor);
        return true;
    }

    function rebuildFromPlacements(records = []) {
        placementRecords.clear();
        placementNodes.forEach((_, groupId) => removePlacementNode(groupId));

        records.forEach((record) => {
            upsertPlacement(record);
        });

        root.userData.prefabImageCount = placementRecords.size;
        return placementRecords.size;
    }

    function removePlacement(groupId) {
        placementRecords.delete(groupId);
        removePlacementNode(groupId);
        root.userData.prefabImageCount = placementRecords.size;
    }

    function clear() {
        rebuildFromPlacements([]);
    }

    function enable() {
        ensureAttached();
        enabled = true;
        root.visible = true;
        ensureAssetManifestLoaded(assetManifestState.status === "failed");
        refreshAllPlacementNodes();
    }

    function disable() {
        enabled = false;
        root.visible = false;
    }

    function setCameraView({ isTopDownView = false, cameraAngleIndex = 0 } = {}) {
        cameraView.isTopDownView = !!isTopDownView;
        cameraView.cameraAngleIndex = normalizePrefabImageVisualModeRotation(cameraAngleIndex);
        root.userData.prefabImageCameraView = { ...cameraView };
        refreshAllPlacementNodes();
    }

    function renderFrame() {
        if (!enabled) return;
        root.userData.prefabImageCameraView = { ...cameraView };
    }

    function getSnapshot() {
        return {
            enabled,
            placementCount: placementRecords.size,
            cameraView: { ...cameraView },
            assetManifestStatus: assetManifestState.status,
            assetManifestError: assetManifestState.error,
        };
    }

    function dispose() {
        clear();
        disable();
        materialCache.forEach((material) => material?.dispose?.());
        materialCache.clear();
        textureCache.forEach((texture) => texture?.dispose?.());
        textureCache.clear();
        if (root.parent) root.parent.remove(root);
        attached = false;
    }

    return {
        root,
        enable,
        disable,
        clear,
        dispose,
        rebuildFromPlacements,
        upsertPlacement,
        removePlacement,
        setCameraView,
        renderFrame,
        getSnapshot,
    };
}