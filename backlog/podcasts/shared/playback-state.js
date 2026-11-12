const PROGRESS_KEY_PREFIX = 'podcast-progress:';
const PLAY_COUNT_KEY_PREFIX = 'podcast-play-count:';

function normalizeEpisodeId(episodeId) {
    return String(episodeId ?? '').trim();
}

function toFiniteNumber(value, fallback = 0) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : fallback;
}

export function getPlaybackProgressStorageKey(episodeId) {
    const episodeIdText = normalizeEpisodeId(episodeId);
    return episodeIdText ? `${PROGRESS_KEY_PREFIX}${episodeIdText}` : '';
}

export function getPlaybackPlayCountStorageKey(episodeId) {
    const episodeIdText = normalizeEpisodeId(episodeId);
    return episodeIdText ? `${PLAY_COUNT_KEY_PREFIX}${episodeIdText}` : '';
}

function readLegacyProgressRecord(rawValue) {
    if (!rawValue) {
        return null;
    }

    try {
        const parsedValue = JSON.parse(rawValue);

        if (Array.isArray(parsedValue)) {
            return parsedValue[0] ?? null;
        }

        if (parsedValue && typeof parsedValue === 'object') {
            return parsedValue;
        }
    } catch {
        // Ignora conteúdo inválido em storage e recomeça em segurança.
    }

    return null;
}

export function readPlaybackProgress(episodeId) {
    const episodeIdText = normalizeEpisodeId(episodeId);
    if (!episodeIdText) {
        return null;
    }

    const storageKey = getPlaybackProgressStorageKey(episodeIdText);

    try {
        const rawValue = localStorage.getItem(storageKey);
        const parsedRecord = readLegacyProgressRecord(rawValue);

        if (!parsedRecord) {
            return null;
        }

        const storedId = normalizeEpisodeId(parsedRecord.id ?? episodeIdText);

        if (storedId !== episodeIdText) {
            localStorage.removeItem(storageKey);
            return null;
        }

        const time = Math.max(0, toFiniteNumber(parsedRecord.time, 0));
        const plays = Math.max(0, Math.floor(toFiniteNumber(parsedRecord.plays ?? parsedRecord.count, 0)));

        return {
            id: storedId,
            time,
            plays,
        };
    } catch {
        localStorage.removeItem(storageKey);
        return null;
    }
}

export function getPlaybackPlayCount(episodeId) {
    const episodeIdText = normalizeEpisodeId(episodeId);
    if (!episodeIdText) {
        return 0;
    }

    const progressState = readPlaybackProgress(episodeIdText);
    if (progressState && Number.isFinite(progressState.plays)) {
        return Math.max(0, progressState.plays);
    }

    const storageKey = getPlaybackPlayCountStorageKey(episodeIdText);

    try {
        const rawValue = localStorage.getItem(storageKey);
        if (!rawValue) {
            return 0;
        }

        return Math.max(0, Math.floor(toFiniteNumber(rawValue, 0)));
    } catch {
        return 0;
    }
}

export function savePlaybackProgress(episodeId, currentTime, options = {}) {
    const episodeIdText = normalizeEpisodeId(episodeId);
    if (!episodeIdText) {
        return;
    }

    const {
        incrementPlayCount = false,
        resetPosition = false,
    } = options;

    const storageKey = getPlaybackProgressStorageKey(episodeIdText);
    const playCountKey = getPlaybackPlayCountStorageKey(episodeIdText);

    const previousState = readPlaybackProgress(episodeIdText) ?? {
        id: episodeIdText,
        time: 0,
        plays: 0,
    };

    const nextState = {
        id: episodeIdText,
        time: previousState.time,
        plays: Math.max(0, Math.floor(toFiniteNumber(previousState.plays, 0))),
    };

    if (incrementPlayCount) {
        nextState.plays += 1;
    }

    if (resetPosition) {
        nextState.time = 0;
    } else if (Number.isFinite(currentTime)) {
        nextState.time = Math.max(0, Number(currentTime));
    }

    try {
        localStorage.setItem(storageKey, JSON.stringify(nextState));
        localStorage.setItem(playCountKey, String(nextState.plays));
    } catch {
        // Ignora falhas de storage sem bloquear a reprodução.
    }
}

export function clearPlaybackProgress(episodeId) {
    const episodeIdText = normalizeEpisodeId(episodeId);
    if (!episodeIdText) {
        return;
    }

    try {
        localStorage.removeItem(getPlaybackProgressStorageKey(episodeIdText));
        localStorage.removeItem(getPlaybackPlayCountStorageKey(episodeIdText));
    } catch {
        // Ignora falhas de storage sem bloquear a reprodução.
    }
}

export function hasEpisodeBeenHeard(episodeId, totalDuration = 0) {
    const episodeIdText = normalizeEpisodeId(episodeId);
    if (!episodeIdText) {
        return false;
    }

    const progressState = readPlaybackProgress(episodeIdText);
    const playCount = progressState ? progressState.plays : getPlaybackPlayCount(episodeIdText);

    if (playCount > 0) {
        return true;
    }

    const duration = Number(totalDuration);
    if (!Number.isFinite(duration) || duration <= 0) {
        return false;
    }

    const progressTime = progressState ? progressState.time : 0;
    return progressTime >= duration * 0.95;
}

export function getPlaybackProgressTime(episodeId) {
    const progressState = readPlaybackProgress(episodeId);
    return progressState ? progressState.time : 0;
}
