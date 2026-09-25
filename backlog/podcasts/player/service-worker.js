const CACHE_NAME = 'podcast-player-v1';
const ALLOWED_REMOTE_HOSTS = new Set([
    self.location.hostname,
    'raw.githubusercontent.com',
    'cdn.jsdelivr.net',
    'cdnjs.cloudflare.com',
]);

const episodeResourceMap = new Map();

function isHttpRequest(url) {
    return url.protocol === 'http:' || url.protocol === 'https:';
}

function isCacheableRequest(request) {
    if (request.method !== 'GET') {
        return false;
    }

    const url = new URL(request.url);

    if (!isHttpRequest(url)) {
        return false;
    }

    return ALLOWED_REMOTE_HOSTS.has(url.hostname);
}

function shouldStoreResponse(request, response) {
    if (request.headers.has('range')) {
        return false;
    }

    return response.status === 200;
}

function parseRangeHeader(rangeHeader, totalLength) {
    const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader || '');

    if (!match) {
        return null;
    }

    const rawStart = match[1];
    const rawEnd = match[2];
    let start = rawStart ? Number(rawStart) : 0;
    let end = rawEnd ? Number(rawEnd) : totalLength - 1;

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
        return null;
    }

    if (!rawStart && rawEnd) {
        const suffixLength = Number(rawEnd);

        if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
            return null;
        }

        start = Math.max(totalLength - suffixLength, 0);
        end = totalLength - 1;
    }

    start = Math.max(0, start);
    end = Math.min(totalLength - 1, end);

    if (start > end || start >= totalLength) {
        return null;
    }

    return { start, end };
}

async function buildRangeResponse(request, cachedResponse) {
    const rangeHeader = request.headers.get('range');

    if (!rangeHeader) {
        return cachedResponse;
    }

    const buffer = await cachedResponse.arrayBuffer();
    const contentType = cachedResponse.headers.get('content-type') || 'application/octet-stream';
    const { byteLength } = buffer;
    const range = parseRangeHeader(rangeHeader, byteLength);

    if (!range) {
        return new Response(null, {
            status: 416,
            statusText: 'Range Not Satisfiable',
            headers: {
                'Content-Range': `bytes */${byteLength}`,
            },
        });
    }

    const slicedBuffer = buffer.slice(range.start, range.end + 1);

    return new Response(slicedBuffer, {
        status: 206,
        statusText: 'Partial Content',
        headers: {
            'Accept-Ranges': 'bytes',
            'Content-Length': String(range.end - range.start + 1),
            'Content-Range': `bytes ${range.start}-${range.end}/${byteLength}`,
            'Content-Type': contentType,
        },
    });
}

function isRangeRequest(request) {
    return request.headers.has('range');
}

async function putInCache(cache, url) {
    const response = await fetch(url, { cache: 'no-store' });

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    await cache.put(url, response.clone());
}

async function notifyClients(message) {
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });

    clients.forEach((client) => {
        client.postMessage(message);
    });
}

async function warmEpisodeResources(episodeId, urls) {
    const uniqueUrls = [...new Set((Array.isArray(urls) ? urls : []).filter(Boolean))];

    if (!episodeId || uniqueUrls.length === 0) {
        return;
    }

    episodeResourceMap.set(episodeId, uniqueUrls);

    const cache = await caches.open(CACHE_NAME);
    const failures = [];

    await Promise.all(uniqueUrls.map(async (url) => {
        try {
            await putInCache(cache, url);
        } catch (error) {
            failures.push({
                url,
                message: error instanceof Error ? error.message : 'Unknown cache failure',
            });
        }
    }));

    await notifyClients({
        type: 'offline-cache-result',
        episodeId,
        success: failures.length === 0,
        failures,
    });
}

async function pruneEpisodeResources(episodeIdToKeep = '') {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    const keepUrls = new Set();

    if (episodeIdToKeep && episodeResourceMap.has(episodeIdToKeep)) {
        episodeResourceMap.get(episodeIdToKeep).forEach((url) => keepUrls.add(url));
    }

    await Promise.all(requests.map(async (request) => {
        if (keepUrls.has(request.url)) {
            return;
        }

        const requestUrl = new URL(request.url);

        if (
            requestUrl.origin === self.location.origin
            && !requestUrl.pathname.endsWith('/episodes.json')
            && !requestUrl.pathname.endsWith('/sections.json')
            && !requestUrl.pathname.endsWith('/player.css')
            && !requestUrl.pathname.endsWith('/player.js')
            && !requestUrl.pathname.endsWith('/service-worker.js')
        ) {
            return;
        }

        await cache.delete(request);
    }));

    [...episodeResourceMap.keys()].forEach((episodeId) => {
        if (episodeId !== episodeIdToKeep) {
            episodeResourceMap.delete(episodeId);
        }
    });
}

self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
    if (event.origin && event.origin !== self.location.origin) {
        return;
    }

    const sourceUrl = event.source && 'url' in event.source ? event.source.url : '';

    if (sourceUrl) {
        const parsedSourceUrl = new URL(sourceUrl);

        if (parsedSourceUrl.origin !== self.location.origin) {
            return;
        }
    }

    const data = event.data;

    if (!data || typeof data !== 'object') {
        return;
    }

    if (data.type === 'warm-episode-cache') {
        event.waitUntil(warmEpisodeResources(data.episodeId, data.urls));
        return;
    }

    if (data.type === 'prune-episode-cache') {
        event.waitUntil(pruneEpisodeResources(data.episodeIdToKeep));
    }
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (!isCacheableRequest(request)) {
        return;
    }

    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request.url);

        if (isRangeRequest(request)) {
            if (cachedResponse) {
                try {
                    return await buildRangeResponse(request, cachedResponse);
                } catch (error) {
                    console.error('Failed to build cached range response', error);
                }
            }

            try {
                return await fetch(request);
            } catch (error) {
                console.error('Network range request failed', error);
                return Response.error();
            }
        }

        if (cachedResponse) {
            return cachedResponse;
        }

        try {
            const response = await fetch(request);

            if (shouldStoreResponse(request, response)) {
                await cache.put(request, response.clone());
            }

            return response;
        } catch (error) {
            const fallbackResponse = await cache.match(request.url);

            if (fallbackResponse) {
                return fallbackResponse;
            }

            console.error('Service worker fetch failed', error);
            return Response.error();
        }
    })());
});