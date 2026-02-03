import { HIRAGANA, KATAKANA } from "../../data.js";
import { leagues, levels } from "../../levels.js";
import { showNumberIncreasing, sleep } from "../../utils.js";

const ALL_CHARS = { ...HIRAGANA, ...KATAKANA };
const CHAR_KEYS = Object.keys(ALL_CHARS);

let gameState = {
  currentRound: [],
  currentIndex: 0,
  scorePerChar: {},
  lastWrong: false,
};

const maxCharsRound = 5;
const statusRef = Object.freeze({
  correct: "correct",
  wrong: "wrong",
});

const gameScreen = document.getElementById("game-screen");
const dashboardScreen = document.getElementById("dashboard-screen");
const categoriesScreen = document.getElementById("categories-screen");
const gameContent = document.getElementById("game-content");
const finishContent = document.getElementById("finish-content");
const charDisplay = document.getElementById("current-char");
const userInput = document.getElementById("user-input");
const progressBar = document.getElementById("game-progress");
const feedback = document.getElementById("feedback");
const totalScoreDisplay = document.getElementById("total-score");
const btnStartRound = document.getElementById("start-round");
const btnLearn = document.getElementById("toggle-learn");
const btnDash = document.getElementById("toggle-progress");
const btnCategories = document.getElementById("toggle-categories");
const btnNext = document.getElementById("btn-next");
const instructions = document.querySelector('.question-text');

function init() {
  loadProgress();
  updateTotalScoreDisplay(true);
  startNewRound();

  userInput.addEventListener("keypress", (e) => {
    if (e.key !== "Enter" || document.activeElement !== userInput) {
      return;
    }

    checkAnswer();
    setTimeout(() => userInput.blur(), 100);
  });

  document.addEventListener("keypress", (e) => {
    if (
      feedback.classList !== "feedback-overlay" &&
      e.key === "Enter" &&
      document.activeElement !== userInput &&
      gameState.currentRound !== null
    ) {
      nextQuestion();
      return;
    } else if (
      e.key === "Enter" &&
      document.activeElement !== userInput &&
      gameState.currentRound === null
    ) {
      startNewRound();
      return;
    }
  });

  btnNext.addEventListener("click", nextQuestion);
}

function showScreen(screen) {
  btnLearn.classList.remove("active");
  btnDash.classList.remove("active");
  btnCategories.classList.remove("active");

  if (screen === "game") {
    btnLearn.classList.add("active");
    gameScreen.classList.remove("hidden");
    dashboardScreen.classList.add("hidden");
    categoriesScreen.classList.add("hidden");
  } else if (screen === "dashboard") {
    btnDash.classList.add("active");
    dashboardScreen.classList.remove("hidden");
    gameScreen.classList.add("hidden");
    categoriesScreen.classList.add("hidden");
    renderDashboard();
  } else if (screen === "categories") {
    btnCategories.classList.add("active");
    categoriesScreen.classList.remove("hidden");
    dashboardScreen.classList.add("hidden");
    gameScreen.classList.add("hidden");
    renderCategories();
  }
}

function startNewRound() {
  gameState.currentRound = [];
  gameState.currentIndex = 0;

  gameState.currentRound = selectNextChars();
  gameContent.classList.remove("hidden");
  finishContent.classList.add("hidden");
  updateUI();
}

function selectNextChars() {
  const grouped = {};
  CHAR_KEYS.forEach((char) => {
    const score = gameState.scorePerChar[char] || 0;
    if (!grouped[score]) grouped[score] = [];
    grouped[score].push(char);
  });

  const sortedScores = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b);

  let selected = [];
  for (let score of sortedScores) {
    const group = grouped[score];
    const shuffledGroup = group.sort(() => Math.random() - 0.5);

    for (let char of shuffledGroup) {
      selected.push(char);
      if (selected.length === maxCharsRound) return selected;
    }
  }
  return selected.slice(0, maxCharsRound);
}

function updateUI() {
  const char = gameState.currentRound[gameState.currentIndex];
  charDisplay.textContent = char;
  userInput.value = "";
  userInput.focus();
  const progress = (gameState.currentIndex / maxCharsRound) * 100;
  progressBar.style.width = `${progress}%`;
}

async function checkAnswer() {
  const currentJP = gameState.currentRound[gameState.currentIndex];
  const correctRomaji = ALL_CHARS[currentJP];
  const userValue = userInput.value.trim().toLowerCase();

  if (userValue === correctRomaji) {
    playActionSound(statusRef.correct);
    await sleep(200);
    showFeedback(
      statusRef.correct,
      "Continuar",
      "Excelente",
      "Correto!",
      correctRomaji,
    );
    updateScore(currentJP, 100);
    gameState.lastWrong = null;
  } else {
    playActionSound(statusRef.wrong);
    await sleep(200);
    showFeedback(
      statusRef.wrong,
      "Tente novamente",
      "Poxa...",
      "Quase lá!",
      correctRomaji,
    );
    gameState.lastWrong = currentJP;
  }
}

function playActionSound(sound) {
  const audio = new Audio(`./assets/${sound}.mp3`);
  audio.play();
}

function playLetterSound(currentJP) {
  const currentRO = Object.entries(ALL_CHARS).find(
    (x) => x[0] === currentJP,
  )[1];
  const audio = new Audio(`./letters/${currentRO}.mp3`);
  audio.play();
}

async function showFeedback(status, next, title, message, char) {
  btnNext.textContent = next;
  feedback.classList = `feedback-overlay ${status}`;
  feedback.dataset.status = status;
  btnNext.classList = `btn-next-${status}`;
  document.getElementById("feedback-title").textContent = title;
  document.getElementById("feedback-msg").innerHTML =
    `${message} é <span class="letter-msg">${char}</span>`;
  charDisplay.classList =
    status === statusRef.wrong ? "wrong-color" : "primary-color";
}

function nextQuestion() {
  feedback.classList = "feedback-overlay";
  charDisplay.classList = "";
  if (feedback.dataset.status === statusRef.wrong) {
    userInput.value = "";
    userInput.focus();
    return;
  }

  gameState.currentIndex++;
  if (gameState.currentIndex >= maxCharsRound) {
    progressBar.style.width = `100%`;
    setTimeout(showFinishScreen, 300);
  } else {
    updateUI();
  }
}

function showFinishScreen() {
  gameContent.classList.add("hidden");
  finishContent.classList.remove("hidden");
  gameState.currentRound = null;
  playActionSound("completed");
}

function loadProgress() {
  const saved = localStorage.getItem("kanalingo_data");
  if (saved) {
    gameState.scorePerChar = JSON.parse(saved);
  } else {
    CHAR_KEYS.forEach((k) => (gameState.scorePerChar[k] = 0));
  }
}

function updateScore(char, amount) {
  if (gameState.lastWrong === char) return;
  gameState.scorePerChar[char] = (gameState.scorePerChar[char] || 0) + amount;
  localStorage.setItem(
    "kanalingo_data",
    JSON.stringify(gameState.scorePerChar),
  );
  updateTotalScoreDisplay();
}

async function updateTotalScoreDisplay(isFirstLoad) {
  const total = Object.values(gameState.scorePerChar).reduce(
    (a, b) => a + b,
    0,
  );

  if (isFirstLoad) {
    totalScoreDisplay.classList = "golden-color2";
    await showNumberIncreasing(total, 0, totalScoreDisplay, 1, total * 0.01);
    totalScoreDisplay.classList = "";
    return;
  }

  totalScoreDisplay.classList = "golden-color2";
  await showNumberIncreasing(total, total - 100, totalScoreDisplay, 1);
  totalScoreDisplay.classList = "";
}

function renderDashboard() {
  const container = document.getElementById("dashboard-container");
  container.innerHTML = "";

  const sorted = Object.entries(gameState.scorePerChar).sort(
    (a, b) => b[1] - a[1],
  );

  sorted.forEach(([char, pts]) => {
    if (pts === 0 && sorted.length > 20) return; // Oculta os zerados se tiver muitos dados

    const card = document.createElement("div");
    card.classList = "char-card";
    card.onclick = () => playLetterSound(char);

    const title = document.createElement("div");
    title.textContent = char;
    title.classList = "jp";
    card.append(title);

    const wrapperBar = document.createElement("div");
    wrapperBar.classList = "progress-card-wrapper";
    card.append(wrapperBar);

    const containerBar = document.createElement("div");
    containerBar.classList = "progress-card-container";
    wrapperBar.append(containerBar);

    const bar = document.createElement("div");
    bar.classList = "progress-card-bar";
    const level = getLevel(pts);
    bar.style.width = `${level.progress}%`;
    bar.style.backgroundColor = level.color;
    containerBar.append(bar);

    const score = document.createElement("div");
    score.classList = "card-value";
    score.textContent = pts;
    card.append(score);

    if (level.end) {
      card.classList.add("card-finished");
      score.classList.add("golden-color3");
    }

    container.append(card);
  });
}

function getLevel(pts) {
  if (pts < levels[0].score) {
    return { color: "transparent", progress: 0 };
  }

  if (pts >= levels.at(-1).score) {
    const level = levels.at(-1);
    return { color: level.color, progress: 100, end: true }; // tratativa especial
  }

  const level = levels.find((x) => pts <= x.score);
  const lastCategory = levels.findLast((x) => x.category === level.category);
  const progress = Math.min((pts / lastCategory.score) * 100 + 5, 100);
  return { color: level.color, progress };
}

function createShield(color) {
  return `
            <svg class="shield-svg" width="40" height="46" viewBox="0 0 40 46" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 0L3 7V20C3 31.05 10.25 41.3 20 44C29.75 41.3 37 31.05 37 20V7L20 0Z" fill="${color}"/>
                <path opacity="0.3" d="M20 5L7 10.35V20C7 28.18 12.54 35.77 20 38.82V5Z" fill="white"/>
            </svg>
        `;
}

function renderCategories() {
  const grid = document.getElementById("levelsGrid");
  grid.innerHTML = "";

  leagues.forEach((league, index) => {
    const card = document.createElement("div");
    card.className = `level-card ${index === 9 ? "active" : ""}`; // Diamante como exemplo ativo

    card.innerHTML = `
            <div class="level-icon">
                ${createShield(league.color)}
            </div>
            <div class="level-info">
                <span class="level-name">${league.name}</span>
                <span class="level-score">${league.score}</span>
            </div>
            <div class="rank-number">${index + 1}</div>
        `;

    grid.appendChild(card);
  });
}

window.onload = init;
btnStartRound.onclick = startNewRound;
btnLearn.onclick = () => showScreen("game");
btnDash.onclick = () => showScreen("dashboard");
btnCategories.onclick = () => showScreen("categories");

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    if (window.innerWidth > 1000) return;
    const viewportHeight = window.visualViewport.height;
    const windowHeight = window.innerHeight;

    const keyboardOpen = (viewportHeight + 100) < windowHeight;
    if (keyboardOpen) {
      instructions.classList.add('question-text-mobal');
    } else {
      window.scrollTo(0, 0);
      instructions.classList.remove('question-text-mobal');
    }
  });
}