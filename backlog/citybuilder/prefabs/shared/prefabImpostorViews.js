export const PREFAB_IMPOSTOR_BASE_PATH = "prefab-impostors";
export const PREFAB_IMPOSTOR_MANIFEST_PATH = `${PREFAB_IMPOSTOR_BASE_PATH}/manifest.json`;
export const PREFAB_IMPOSTOR_TOP_VIEW = "top";
export const PREFAB_IMPOSTOR_SIDE_VIEW_KEYS = Object.freeze(["side-0", "side-1", "side-2", "side-3"]);
export const PREFAB_IMPOSTOR_VIEW_KEYS = Object.freeze([...PREFAB_IMPOSTOR_SIDE_VIEW_KEYS, PREFAB_IMPOSTOR_TOP_VIEW]);

export function normalizePrefabImpostorRotation(rot) {
    return ((Number(rot) || 0) % 4 + 4) % 4;
}

export function isPrefabImpostorTopView(viewKey) {
    return viewKey === PREFAB_IMPOSTOR_TOP_VIEW;
}

export function getPrefabImpostorSideViewIndex(viewKey) {
    const match = /^side-(\d+)$/.exec(String(viewKey || ""));
    if (!match) return null;
    return normalizePrefabImpostorRotation(Number(match[1]));
}

export function getPrefabImpostorViewKey({ isTopDownView = false, cameraAngleIndex = 0, placementRot = 0 } = {}) {
    if (isTopDownView) return PREFAB_IMPOSTOR_TOP_VIEW;
    const relativeRotation = normalizePrefabImpostorRotation(cameraAngleIndex - placementRot);
    return PREFAB_IMPOSTOR_SIDE_VIEW_KEYS[relativeRotation];
}

function normalizeBounds(bounds = {}) {
    return {
        dx: Math.max(1, Number(bounds.dx) || 1),
        dy: Math.max(1, Number(bounds.dy) || 1),
        dz: Math.max(1, Number(bounds.dz) || 1),
    };
}

function normalizeSpriteScale(scale, fallbackScale) {
    return {
        width: Math.max(0.01, Number(scale?.width) || fallbackScale.width),
        height: Math.max(0.01, Number(scale?.height) || fallbackScale.height),
    };
}

function normalizeSpriteCenter(center, fallbackCenter) {
    return {
        x: Math.min(1, Math.max(0, Number(center?.x) || fallbackCenter.x)),
        y: Math.min(1, Math.max(0, Number(center?.y) || fallbackCenter.y)),
    };
}

export function getPrefabImpostorSpriteScale(bounds, viewKey) {
    const normalizedBounds = normalizeBounds(bounds);
    if (isPrefabImpostorTopView(viewKey)) {
        return {
            width: normalizedBounds.dx + 0.4,
            height: normalizedBounds.dz + 0.4,
        };
    }

    return {
        width: Math.max(normalizedBounds.dx, normalizedBounds.dz) + 0.8,
        height: normalizedBounds.dy + 1.2,
    };
}

export function getPrefabImpostorSpriteCenter(viewKey) {
    return isPrefabImpostorTopView(viewKey)
        ? { x: 0.5, y: 0.5 }
        : { x: 0.5, y: 0 };
}

export function getPrefabImpostorArchivePath(prefabId, viewKey, extension = "png") {
    const safeExtension = String(extension || "png").replace(/^\.+/, "") || "png";
    return `${prefabId}/${viewKey}.${safeExtension}`;
}

export function resolvePrefabImpostorViewConfig(manifest, prefabId, viewKey, fallbackBounds = null) {
    const prefabEntry = manifest?.prefabs?.[prefabId] || null;
    const normalizedBounds = normalizeBounds(prefabEntry?.bounds || fallbackBounds || {});
    const fallbackScale = getPrefabImpostorSpriteScale(normalizedBounds, viewKey);
    const fallbackCenter = getPrefabImpostorSpriteCenter(viewKey);
    const rawView = prefabEntry?.views?.[viewKey] || null;
    const file = typeof rawView?.file === "string" && rawView.file.trim() ? rawView.file.trim() : null;

    return {
        file,
        bounds: normalizedBounds,
        spriteScale: normalizeSpriteScale(rawView?.spriteScale, fallbackScale),
        spriteCenter: normalizeSpriteCenter(rawView?.spriteCenter, fallbackCenter),
    };
}

export function createPrefabImpostorManifestEntry({ prefabId, bounds, extension = "png", basePath = PREFAB_IMPOSTOR_BASE_PATH }) {
    const normalizedBasePath = basePath ? `${String(basePath).replace(/[\\/]+$/, "")}/` : "";
    const normalizedBounds = normalizeBounds(bounds);

    return {
        prefabId,
        bounds: normalizedBounds,
        views: Object.fromEntries(
            PREFAB_IMPOSTOR_VIEW_KEYS.map((viewKey) => [
                viewKey,
                {
                    file: `${normalizedBasePath}${getPrefabImpostorArchivePath(prefabId, viewKey, extension)}`,
                    spriteScale: getPrefabImpostorSpriteScale(normalizedBounds, viewKey),
                    spriteCenter: getPrefabImpostorSpriteCenter(viewKey),
                },
            ]),
        ),
    };
}