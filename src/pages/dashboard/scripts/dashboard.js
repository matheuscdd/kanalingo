import { authFirebase } from "../../../scripts/config.js";
import { renderCatalog } from "./catalog.js";
import { renderCategories } from "./categories.js";
import { initEventsListening } from "./listening.js";
import { initEventsTyping } from "./typing.js";
import { loadProgress, preloadAudios, updateTotalScoreDisplay } from "./utils.js";
import { signOut } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const btnLogout = document.getElementById("out-button");
const btnsMethods = Array.from(document.querySelectorAll('.method-card'));
const typingScreen = document.getElementById("typing-screen");
const listeningScreen = document.getElementById("listening-screen");
const catalogScreen = document.getElementById("catalog-screen");
const categoriesScreen = document.getElementById("categories-screen");
const methodsScreen = document.getElementById("methods-screen");
const btnLearn = document.getElementById("toggle-learn");
const btnDash = document.getElementById("toggle-progress");
const btnCategories = document.getElementById("toggle-categories");
const allScreens = Array.from(document.querySelectorAll('.screen'));
const allNavBtns = Array.from(document.querySelectorAll('.btn-nav'));

function init() {
  preloadAudios();
  loadProgress();
  updateTotalScoreDisplay(true);
  initEventsTyping();

  showScreen("typing");

  btnLogout.onclick = logout;
  btnLearn.onclick = () => showScreen("methods");
  btnDash.onclick = () => showScreen("catalog");
  btnCategories.onclick = () => showScreen("categories");
  btnsMethods.forEach(btn => btn.onclick = () => showScreen(btn.dataset.screen));
}

function showScreen(screen) {
  document.querySelector('#feedback-typing').classList.add('hidden');
  allNavBtns.forEach(el => el.classList.remove('active'));
  allScreens.forEach(el => el.classList.add('hidden'));

  if (screen === "methods") {
    btnLearn.classList.add("active");
    methodsScreen.classList.remove('hidden');
  } else if (screen === "listening") {
    btnLearn.classList.add("active");
    listeningScreen.classList.remove('hidden');
    initEventsListening();
  } else if (screen === "typing") {
    btnLearn.classList.add("active");
    typingScreen.classList.remove('hidden');
    // TODO: fazer o typing também ter um init que funcione aqui
  }
  else if (screen === "catalog") {
    btnDash.classList.add("active");
    catalogScreen.classList.remove("hidden");
    renderCatalog();
  } else if (screen === "categories") {
    btnCategories.classList.add("active");
    categoriesScreen.classList.remove("hidden");
    renderCategories();
  }
}

async function logout() {
  try {
    await signOut(authFirebase);
    const isProduction = globalThis.location.href.includes('github');
    globalThis.location.href = (isProduction ? '/kanalingo' : '') + '/src/pages/landing/landing.html';
  } catch (error) {
    console.error(error);
  }
}


window.onload = init;

