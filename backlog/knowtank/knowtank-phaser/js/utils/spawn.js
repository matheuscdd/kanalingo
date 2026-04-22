import { ARENA } from '../core/constants.js';

export function isCircleTouchingRect(x, y, radius, rect, pad = 0) {
    const closestX = Math.max(rect.x - pad, Math.min(x, rect.x + rect.w + pad));
    const closestY = Math.max(rect.y - pad, Math.min(y, rect.y + rect.h + pad));
    return Math.hypot(x - closestX, y - closestY) < radius;
}

export function isSpawnPositionBlocked(x, y, radius, rects) {
    return rects.some(rect => isCircleTouchingRect(x, y, radius, rect, 12));
}

export function findFreeEnemySpawnPoint({ player, solidRects, minDistanceFromPlayer = 800, radius = 35 }) {
    for (let attempt = 0; attempt < 140; attempt += 1) {
        const candidate = {
            x: Math.random() * (ARENA.width - 200) + 100,
            y: Math.random() * (ARENA.height - 200) + 100
        };

        if (player && Math.hypot(candidate.x - player.x, candidate.y - player.y) < minDistanceFromPlayer) {
            continue;
        }

        if (isSpawnPositionBlocked(candidate.x, candidate.y, radius, solidRects)) {
            continue;
        }

        return candidate;
    }

    const fallbackPoints = [
        { x: 220, y: 220 },
        { x: ARENA.width - 220, y: 220 },
        { x: 220, y: ARENA.height - 220 },
        { x: ARENA.width - 220, y: ARENA.height - 220 },
        { x: ARENA.width / 2, y: 220 }
    ];

    return fallbackPoints.find(candidate => {
        const farEnough = !player || Math.hypot(candidate.x - player.x, candidate.y - player.y) >= minDistanceFromPlayer;
        return farEnough && !isSpawnPositionBlocked(candidate.x, candidate.y, radius, solidRects);
    }) || { x: 220, y: 220 };
}