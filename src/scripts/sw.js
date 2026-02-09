const CACHE_NAME = "app-cache-v1";

const STATIC_ASSETS = ["/"];

// self.addEventListener("install", (event) => {
//     event.waitUntil(
//         (async () => {
//             try {
//                 const cache = await caches.open(CACHE_NAME);
//                 console.log("Abrindo cache e adicionando arquivos...");
//                 await cache.addAll(STATIC_ASSETS);
//                 console.log("Arquivos cacheados com sucesso!");
//             } catch (error) {
//                 console.error("Falha ao instalar o Service Worker:", error);
//                 // IMPORTANTE: Se falhar, lance o erro novamente para cancelar a instalação
//                 throw error;
//             }
//         })()
//     );
// });

// self.addEventListener("activate", (event) => {
//     event.waitUntil(
//         caches.keys().then((keys) =>
//             Promise.all(
//                 keys.map((key) => {
//                     if (key !== CACHE_NAME) {
//                         return caches.delete(key);
//                     }
//                 }),
//             ),
//         ),
//     );
// });

// self.addEventListener("fetch", (event) => {
//     const url = new URL(event.request.url);

//     // ❌ Nunca interceptar Firebase / Google
//     if (
//         url.hostname.includes("firebase") ||
//         url.hostname.includes("googleapis") ||
//         url.hostname.includes("gstatic")
//     ) {
//         return;
//     }

//     // ❌ Nunca cachear POST
//     if (event.request.method !== "GET") {
//         return;
//     }

//     event.respondWith(
//         caches.match(event.request).then((cached) => {
//             return (
//                 cached ||
//                 fetch(event.request).then((response) => {
//                     return caches.open(CACHE_NAME).then((cache) => {
//                         cache.put(event.request, response.clone());
//                         return response;
//                     });
//                 })
//             );
//         }),
//     );
// });
