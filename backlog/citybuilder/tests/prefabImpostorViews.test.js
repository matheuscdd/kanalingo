import { describe, expect, it } from 'vitest';
import {
    PREFAB_IMPOSTOR_BASE_PATH,
    PREFAB_IMPOSTOR_MANIFEST_PATH,
    PREFAB_IMPOSTOR_TOP_VIEW,
    PREFAB_IMPOSTOR_VIEW_KEYS,
    createPrefabImpostorManifestEntry,
    getPrefabImpostorArchivePath,
    getPrefabImpostorSpriteCenter,
    getPrefabImpostorSpriteScale,
    getPrefabImpostorViewKey,
    resolvePrefabImpostorViewConfig,
} from '../prefabs/shared/prefabImpostorViews.js';

describe('prefab impostor views', () => {
    it('returns top for top-down view regardless of placement rotation', () => {
        expect(getPrefabImpostorViewKey({ isTopDownView: true, cameraAngleIndex: 3, placementRot: 2 })).toBe(PREFAB_IMPOSTOR_TOP_VIEW);
    });

    it('maps side views relative to prefab placement rotation', () => {
        expect(getPrefabImpostorViewKey({ isTopDownView: false, cameraAngleIndex: 1, placementRot: 0 })).toBe('side-1');
        expect(getPrefabImpostorViewKey({ isTopDownView: false, cameraAngleIndex: 1, placementRot: 1 })).toBe('side-0');
        expect(getPrefabImpostorViewKey({ isTopDownView: false, cameraAngleIndex: 0, placementRot: 1 })).toBe('side-3');
    });

    it('uses expected sprite sizing and anchor for top vs side views', () => {
        expect(getPrefabImpostorSpriteScale({ dx: 10, dy: 7, dz: 4 }, 'top')).toEqual({ width: 10, height: 4 });
        expect(getPrefabImpostorSpriteScale({ dx: 10, dy: 7, dz: 4 }, 'side-2')).toEqual({ width: 10.8, height: 8.2 });
        expect(getPrefabImpostorSpriteCenter('top')).toEqual({ x: 0.5, y: 0.5 });
        expect(getPrefabImpostorSpriteCenter('side-2')).toEqual({ x: 0.5, y: 0 });
    });

    it('creates stable archive paths and manifest entries', () => {
        expect(PREFAB_IMPOSTOR_BASE_PATH).toBe('prefab-impostors');
        expect(PREFAB_IMPOSTOR_MANIFEST_PATH).toBe('prefab-impostors/manifest.json');
        expect(PREFAB_IMPOSTOR_VIEW_KEYS).toEqual(['side-0', 'side-1', 'side-2', 'side-3', 'top']);
        expect(getPrefabImpostorArchivePath('BigBen', 'side-2', 'png')).toBe('BigBen/side-2.png');

        expect(createPrefabImpostorManifestEntry({
            prefabId: 'BigBen',
            bounds: { dx: 12, dy: 30, dz: 12 },
            extension: 'png',
            basePath: 'prefab-impostors',
        })).toEqual({
            prefabId: 'BigBen',
            bounds: { dx: 12, dy: 30, dz: 12 },
            views: {
                'side-0': {
                    file: 'prefab-impostors/BigBen/side-0.png',
                    spriteScale: { width: 12.8, height: 31.2 },
                    spriteCenter: { x: 0.5, y: 0 },
                },
                'side-1': {
                    file: 'prefab-impostors/BigBen/side-1.png',
                    spriteScale: { width: 12.8, height: 31.2 },
                    spriteCenter: { x: 0.5, y: 0 },
                },
                'side-2': {
                    file: 'prefab-impostors/BigBen/side-2.png',
                    spriteScale: { width: 12.8, height: 31.2 },
                    spriteCenter: { x: 0.5, y: 0 },
                },
                'side-3': {
                    file: 'prefab-impostors/BigBen/side-3.png',
                    spriteScale: { width: 12.8, height: 31.2 },
                    spriteCenter: { x: 0.5, y: 0 },
                },
                top: {
                    file: 'prefab-impostors/BigBen/top.png',
                    spriteScale: { width: 12, height: 12 },
                    spriteCenter: { x: 0.5, y: 0.5 },
                },
            },
        });

        expect(createPrefabImpostorManifestEntry({
            prefabId: 'BigBen',
            bounds: { dx: 12, dy: 30, dz: 12 },
            extension: 'png',
            basePath: 'prefab-impostors',
            viewOverrides: {
                'side-0': {
                    spriteCenter: { x: 0.62, y: 0.14 },
                    spriteScale: { width: 13.4, height: 32.1 },
                },
            },
        }).views['side-0']).toEqual({
            file: 'prefab-impostors/BigBen/side-0.png',
            spriteScale: { width: 13.4, height: 32.1 },
            spriteCenter: { x: 0.62, y: 0.14 },
        });
    });

    it('resolves manifest view config with fallback bounds and overrides', () => {
        const manifest = {
            prefabs: {
                Eolica: {
                    bounds: { dx: 4, dy: 19, dz: 4 },
                    views: {
                        'side-0': {
                            file: 'prefab-impostors/Eolica/side-0.png',
                            spriteScale: { width: 8, height: 20 },
                            spriteCenter: { x: 0.5, y: 0.1 },
                        },
                    },
                },
            },
        };

        expect(resolvePrefabImpostorViewConfig(manifest, 'Eolica', 'side-0')).toEqual({
            file: 'prefab-impostors/Eolica/side-0.png',
            bounds: { dx: 4, dy: 19, dz: 4 },
            spriteScale: { width: 8, height: 20 },
            spriteCenter: { x: 0.5, y: 0.1 },
        });

        expect(resolvePrefabImpostorViewConfig(manifest, 'Eolica', 'top')).toEqual({
            file: null,
            bounds: { dx: 4, dy: 19, dz: 4 },
            spriteScale: { width: 4, height: 4 },
            spriteCenter: { x: 0.5, y: 0.5 },
        });

        expect(resolvePrefabImpostorViewConfig(null, 'Missing', 'side-2', { dx: 6, dy: 10, dz: 4 })).toEqual({
            file: null,
            bounds: { dx: 6, dy: 10, dz: 4 },
            spriteScale: { width: 6.8, height: 11.2 },
            spriteCenter: { x: 0.5, y: 0 },
        });
    });
});