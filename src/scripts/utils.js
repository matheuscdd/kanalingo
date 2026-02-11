import { authFirebase } from "./config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

export const isPWA = globalThis.matchMedia(
    "(display-mode: standalone)",
).matches;
const publicRoutes = Object.freeze([
    "login.html",
    "register.html",
    "landing.html",
]);
const privateRoutes = Object.freeze(["dashboard.html"]);
const isInPublicRoutes = publicRoutes.find((x) =>
    globalThis.location.href.includes(x),
);
const isInPrivateRoutes = privateRoutes.find((x) =>
    globalThis.location.href.includes(x),
);

const loadingStatus = Object.seal({
    id: null,
    current: null,
});
const loadingLanguages = Object.freeze([
    "carregando",
    "loading",
    "cargando",
    "chargement",
    "laden",
    "caricamento",
    "laden",
    "よみこみちゅう",
    "ローディング",
    "読み込み中",
    "加载中",
    "載入中",
    "로딩 중",
    "جارٍ التحميل",
    "लोड हो रहा है",
    "загрузка",
    "завантаження",
    "зареждане",
    "φόρτωση",
    "טוען",
    "กำลังโหลด",
    "đang tải",
    "memuat",
    "yükleniyor",
    "ładowanie",
    "laddar",
    "ladataan",
]);

export async function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

export function getSumFromValues(x) {
    if (Object.values(x).length === 0) return 0;
    return Object.values(x).reduce((a, b) => a + b, 0);
}

export async function showNumberIncreasing(
    destination,
    initial,
    el,
    interval,
    increaser = 1,
) {
    for (let i = initial; i <= destination; i += increaser) {
        el.innerText = `${i.toFixed(0)} XP`;
        await sleep(interval);
        if (i >= destination) break;
    }
    el.innerText = `${destination} XP`;
}

export function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

export function shuffleArray(arr) {
    return arr.toSorted(() => Math.random() - 0.5);
}

export function orderArray(arr) {
    return arr.toSorted((a, b) => a - b);
}

export function redirectIfLogged() {
    insertLoadingScreen();

    onAuthStateChanged(authFirebase, (user) => {
        removeLoadingScreen();

        if (user && isInPublicRoutes) {
            globalThis.location.href = "/src/pages/dashboard/dashboard.html";
        } else if (!user && isInPrivateRoutes) {
            globalThis.location.href = "/src/pages/landing/landing.html";
        }
    });
}

export async function removeLoadingScreen() {
    const hasUser = !!localStorage.getItem("user");
    if ((hasUser && isInPublicRoutes) || (!hasUser && isInPrivateRoutes)) {
        await sleep(3000);
        document.body.classList.remove("onloading");
    }
    document.querySelector(".general-loading-screen")?.remove();
}

export async function insertLoadingScreen() {
    if (document.querySelector(".general-loading-screen")) return;
    const loadingScreen = document.createElement("div");
    loadingScreen.classList.add("general-loading-screen");
    loadingScreen.innerHTML = `
        <div>
            <div class="loading-general-container-img">
                <img class="loading-general-img" src="${"/src/assets/images/loading.png"}"/>
            </div>
            <div class="general-loading-title kana-font"><span>${shuffleArray(loadingLanguages)[0]}</span>...</div>
        </div>
    `;
    document.body.append(loadingScreen);
    loadingStatus.id = setInterval(updateLoadingName, 500);
    await sleep(100);
    document.body.classList.remove("onloading");
}

function updateLoadingName() {
    const display = document.querySelector(".general-loading-title span");
    if (!display) {
        clearInterval(loadingStatus.id);
        return;
    }
    let newest = shuffleArray(loadingLanguages)[0];
    while (newest === loadingStatus.current) {
        newest = shuffleArray(loadingLanguages)[0];
    }

    loadingStatus.current = newest;
    display && (display.innerText = loadingStatus.current);
}

export function defaultObj(defaultValue) {
    const map = {};
    return new Proxy(map, {
        get(target, prop) {
            if (!target.hasOwnProperty(prop)) {
                target[prop] =
                    typeof defaultValue === "function"
                        ? new defaultValue()
                        : defaultValue;
            }
            return Reflect.get(...arguments);
        },
    });
}
