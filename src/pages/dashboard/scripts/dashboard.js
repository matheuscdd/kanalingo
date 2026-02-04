import { renderCatalog } from "./catalog.js";
import { renderCategories } from "./categories.js";
import { initEventsTyping } from "./typing.js";
import { loadProgress, updateTotalScoreDisplay } from "./utils.js";

const btnsMethods = Array.from(document.querySelectorAll('.method-card'));
const typingScreen = document.getElementById("typing-screen");
const catalogScreen = document.getElementById("catalog-screen");
const categoriesScreen = document.getElementById("categories-screen");
const methodsScreen = document.getElementById("methods-screen");
const btnLearn = document.getElementById("toggle-learn");
const btnDash = document.getElementById("toggle-progress");
const btnCategories = document.getElementById("toggle-categories");
const allScreens = Array.from(document.querySelectorAll('.screen'));
const allNavBtns = Array.from(document.querySelectorAll('.btn-nav'));

function init() {
  loadProgress();
  updateTotalScoreDisplay(true);
  initEventsTyping();
  
  btnLearn.onclick = () => showScreen("methods");
  btnDash.onclick = () => showScreen("dashboard");
  btnCategories.onclick = () => showScreen("categories");
  btnsMethods.forEach(btn => btn.onclick = () => showScreen(btn.dataset.screen));
}

function showScreen(screen) {
  allNavBtns.forEach(el => el.classList.remove('active'));
  allScreens.forEach(el => el.classList.add('hidden'));

  if (screen === "methods") {
    btnLearn.classList.add("active");
    methodsScreen.classList.remove('hidden');
    // gameScreen.classList.remove("hidden");
    // dashboardScreen.classList.add("hidden");
    // categoriesScreen.classList.add("hidden");
  } else if (screen === "typing") {
    btnLearn.classList.add("active");
    typingScreen.classList.remove('hidden');
  }
  else if (screen === "dashboard") {
    btnDash.classList.add("active");
    catalogScreen.classList.remove("hidden");
    renderCatalog();
  } else if (screen === "categories") {
    btnCategories.classList.add("active");
    categoriesScreen.classList.remove("hidden");
    renderCategories();
  }
}


window.onload = init;

