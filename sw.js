const CACHE_NAME = "kanalingo_v177074394729448888888";

const STATIC_ASSETS = [
    "./src/pages/landing/landing.html",
    "./src/pages/landing/scripts/landing.js",
    "./src/pages/landing/styles/landing.css",
];

const VERSION_URL = "/version.json";

self.addEventListener("install", (event) => {
    event.waitUntil(event.waitUntil(checkAndUpdateCache()));
});

self.addEventListener("activate", (event) => {
    event.waitUntil(event.waitUntil(self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);

    // ❌ Nunca interceptar Firebase / Google
    if (
        url.hostname.includes("firebase") ||
        url.hostname.includes("googleapis") ||
        url.hostname.includes("gstatic")
    ) {
        return;
    }

    // ❌ Nunca cachear POST
    if (event.request.method !== "GET") {
        return;
    }

     event.respondWith(
        caches.match(event.request).then((cached) => {
            return (
                cached ||
                fetch(event.request).then((res) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, res.clone());
                        return res;
                    });
                })
            );
        })
    );
});

async function checkAndUpdateCache() {
    console.log("[SW] checando versão");

    const cache = await caches.open(CACHE_NAME);

    try {
        const cachedVersionRes = await cache.match(VERSION_URL);
        const networkVersionRes = await fetch(VERSION_URL, {
            cache: "no-store",
        });

        // ✅ CLONE ANTES DE CONSUMIR
        const networkVersionClone = networkVersionRes.clone();
        const networkVersion = await networkVersionRes.json();

        console.log(
            "[SW] versão da rede:",
            networkVersion.version
        );

        if (!cachedVersionRes) {
            console.log("[SW] nenhuma versão em cache, salvando");
            await cache.put(
                VERSION_URL,
                networkVersionClone
            );
            return;
        }

        const cachedVersion = await cachedVersionRes.json();
        console.log(
            "[SW] versão em cache:",
            cachedVersion.version
        );

        if (cachedVersion.version !== networkVersion.version) {
            console.log(
                "[SW] 🔁 versão mudou, limpando cache"
            );

            const keys = await cache.keys();
            await Promise.all(
                keys.map((req) => {
                    console.log(
                        "[SW] deletando:",
                        req.url
                    );
                    return cache.delete(req);
                })
            );

            await cache.put(
                VERSION_URL,
                networkVersionClone
            );

            console.log(
                "[SW] cache atualizado para nova versão"
            );

            self.skipWaiting();
        } else {
            console.log("[SW] versão igual, mantendo cache");
        }
    } catch (err) {
        console.log(
            "[SW] erro ao checar versão",
            err
        );
    }
}
