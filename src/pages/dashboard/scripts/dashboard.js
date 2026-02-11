import { authFirebase } from "../../../scripts/config.js";
import { sleep } from "../../../scripts/utils.js";
import { initEventsCatalog, renderCatalog } from "./catalog.js";
import { renderCategories } from "./categories.js";
import { initEventsDrawing, renderDrawing } from "./drawing.js";
import { renderListening } from "./listening.js";
import { initEventsTyping, renderTyping } from "./typing.js";
import {
    gameState,
    loadProgress,
    preloadAudios,
    screens,
    updateTotalScoreDisplay,
} from "./utils.js";
import { signOut } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const btnLogout = document.getElementById("out-button");
const btnsMethods = Array.from(document.querySelectorAll(".method-card"));
const typingScreen = document.getElementById("typing-screen");
const listeningScreen = document.getElementById("listening-screen");
const drawingScreen = document.getElementById("drawing-screen");
const catalogScreen = document.getElementById("catalog-screen");
const categoriesScreen = document.getElementById("categories-screen");
const methodsScreen = document.getElementById("methods-screen");
const btnLearn = document.getElementById("toggle-learn");
const btnAlphabet = document.getElementById("toggle-alphabet");
const btnCategories = document.getElementById("toggle-categories");
const allScreens = Array.from(document.querySelectorAll(".screen"));
const allNavBtns = Array.from(document.querySelectorAll(".btn-nav"));
const btnsBack = Array.from(document.querySelectorAll(".btn-back"));

function init() {
    preloadAudios();
    loadProgress();
    updateTotalScoreDisplay(true);
    initEventsTyping();
    initEventsCatalog();
    initEventsDrawing();

    showScreen(screens.methods);

    btnLogout.onclick = logout;
    btnLearn.onclick = () => showScreen("methods");
    btnAlphabet.onclick = () => showScreen("catalog");
    btnCategories.onclick = () => showScreen("categories");
    btnsMethods.forEach(
        (btn) => (btn.onclick = () => showScreen(btn.dataset.screen)),
    );
    btnsBack.forEach(
        (btn) => (btn.onclick = () => showScreen(screens.methods)),
    );
}

async function showScreen(currentScreen) {
    await sleep(300);
    gameState.currentScreen = currentScreen;
    document.querySelector("#feedback-drawing").classList.add("hidden");
    document.querySelector("#feedback-typing").classList.add("hidden");
    allNavBtns.forEach((el) => el.classList.remove("active"));
    allScreens.forEach((el) => el.classList.add("hidden"));

    if (currentScreen === screens.methods) {
        btnLearn.classList.add("active");
        methodsScreen.classList.remove("hidden");
    } else if (currentScreen === screens.listening) {
        btnLearn.classList.add("active");
        listeningScreen.classList.remove("hidden");
        renderListening();
    } else if (currentScreen === screens.drawing) {
        btnLearn.classList.add("active");
        drawingScreen.classList.remove("hidden");
        renderDrawing();
    } else if (currentScreen === screens.typing) {
        btnLearn.classList.add("active");
        typingScreen.classList.remove("hidden");
        renderTyping();
    } else if (currentScreen === screens.catalog) {
        btnAlphabet.classList.add("active");
        catalogScreen.classList.remove("hidden");
        renderCatalog();
    } else if (currentScreen === screens.categories) {
        btnCategories.classList.add("active");
        categoriesScreen.classList.remove("hidden");
        renderCategories();
    }
}

async function logout() {
    try {
        await signOut(authFirebase);
        localStorage.clear();
        globalThis.location.href = "/src/pages/landing/landing.html";
    } catch (error) {
        console.error(error);
    }
}

window.onload = init;
