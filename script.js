import { HIRAGANA, KATAKANA } from "./data.js";
import { showNumberIncreasing, sleep } from "./utils.js";

const ALL_CHARS = { ...HIRAGANA, ...KATAKANA };
const CHAR_KEYS = Object.keys(ALL_CHARS);

// Estado do Jogo
let gameState = {
  currentRound: [],
  currentIndex: 0,
  pointsPerChar: {},
  lastWrong: false,
};

const maxCharsRound = 5;
const statusRef = Object.freeze({
  correct: "correct",
  wrong: "wrong",
});

const gameScreen = document.getElementById("game-screen");
const dashboardScreen = document.getElementById("dashboard-screen");
const gameContent = document.getElementById("game-content");
const finishContent = document.getElementById("finish-content");
const charDisplay = document.getElementById("current-char");
const userInput = document.getElementById("user-input");
const progressBar = document.getElementById("game-progress");
const feedback = document.getElementById("feedback");
const totalScoreDisplay = document.getElementById("total-score");
const btnStartRound = document.getElementById("start-round");
const btnLearn = document.getElementById("toggle-learn");
const btnProgress = document.getElementById("toggle-progress");
const btnNext = document.getElementById("btn-next");

function init() {
  loadProgress();
  updateTotalScoreDisplay(true);
  startNewRound();

  userInput.addEventListener("keypress", (e) => {
    if (
      feedback.className !== "feedback-overlay" ||
      e.key !== "Enter" ||
      document.activeElement !== userInput
    ) {
      return;
    }

    checkAnswer();
    setTimeout(() => userInput.blur(), 100);
  });

  document.addEventListener("keypress", (e) => {
    if (
      feedback.className === "feedback-overlay" ||
      e.key !== "Enter" ||
      document.activeElement === userInput
    ) {
      return;
    }

    nextQuestion();
  });

  btnNext.addEventListener("click", nextQuestion);
}

function showScreen(screen) {
  btnLearn.classList.toggle("active");
  btnProgress.classList.toggle("active");
  if (screen === "game") {
    gameScreen.classList.remove("hidden");
    dashboardScreen.classList.add("hidden");
  } else {
    gameScreen.classList.add("hidden");
    dashboardScreen.classList.remove("hidden");
    renderDashboard();
  }
}

function startNewRound() {
  gameState.currentRound = [];
  gameState.currentIndex = 0;

  const completed = Object.keys(gameState);
  let shuffled = [...CHAR_KEYS];
  if (completed.length !== CHAR_KEYS.length) {
    shuffled = shuffled.filter(e => !completed.includes(e));
  }

  shuffled = shuffled.sort(() => 0.5 - Math.random())
  gameState.currentRound = shuffled.slice(0, maxCharsRound);

  gameContent.classList.remove("hidden");
  finishContent.classList.add("hidden");
  updateUI();
}

function updateUI() {
  const char = gameState.currentRound[gameState.currentIndex];
  charDisplay.textContent = char;
  userInput.value = "";
  userInput.focus();

  const progress = (gameState.currentIndex / maxCharsRound) * 100;
  progressBar.style.width = `${progress}%`;
}

// Verificação
function checkAnswer() {
  const currentJP = gameState.currentRound[gameState.currentIndex];
  const correctRomaji = ALL_CHARS[currentJP];
  const userValue = userInput.value.trim().toLowerCase();

  if (userValue === correctRomaji) {
    showFeedback(statusRef.correct, "Excelente", "Correto!", correctRomaji);
    updatePoints(currentJP, 100);
    gameState.lastWrong = null;
  } else {
    showFeedback(statusRef.wrong, "Poxa...", "Quase lá!", correctRomaji);
    gameState.lastWrong = currentJP;
  }
}

async function showFeedback(status, title, message, char) {
  feedback.className = `feedback-overlay ${status}`;
  feedback.dataset.status = status;
  btnNext.className = `btn-next-${status}`;
  document.getElementById("feedback-title").textContent = title;
  document.getElementById("feedback-msg").innerHTML =
    `${message} é <span class="letter-msg">${char}</span>`;
  charDisplay.className =
    status === statusRef.wrong ? "wrong-color" : "primary-color";
}

function nextQuestion() {
  feedback.className = "feedback-overlay";
  charDisplay.className = "";
  if (feedback.dataset.status === statusRef.wrong) {
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
}

// Persistência de Dados
function loadProgress() {
  const saved = localStorage.getItem("kanalingo_data");
  if (saved) {
    gameState.pointsPerChar = JSON.parse(saved);
  } else {
    CHAR_KEYS.forEach((k) => (gameState.pointsPerChar[k] = 0));
  }
}

function updatePoints(char, amount) {
  if (gameState.lastWrong === char) return;
  gameState.pointsPerChar[char] = (gameState.pointsPerChar[char] || 0) + amount;
  localStorage.setItem(
    "kanalingo_data",
    JSON.stringify(gameState.pointsPerChar),
  );
  updateTotalScoreDisplay();
}

async function updateTotalScoreDisplay(isFirstLoad) {
  const total = Object.values(gameState.pointsPerChar).reduce(
    (a, b) => a + b,
    0,
  );

  if (isFirstLoad) {
    totalScoreDisplay.className = "golden-color";
    await showNumberIncreasing(total, 0, totalScoreDisplay, 1, 56);
    totalScoreDisplay.className = "";
    return;
  }

  totalScoreDisplay.className = "golden-color";
  await showNumberIncreasing(total, total - 100, totalScoreDisplay, 1);
  totalScoreDisplay.className = "";
}

function renderDashboard() {
  const container = document.getElementById("dashboard-container");
  container.innerHTML = "";

  const sorted = Object.entries(gameState.pointsPerChar).sort(
    (a, b) => b[1] - a[1],
  );

  sorted.forEach(([char, pts]) => {
    if (pts === 0 && sorted.length > 20) return; // Oculta os zerados se tiver muitos dados

    const card = document.createElement("div");
    card.className = "char-card";
    card.innerHTML = `
                    <span class="jp">${char}</span>
                    <span class="pts">Pontos</span>
                    <div class="value">${pts}</div>
                `;
    container.appendChild(card);
  });
}

window.onload = init;
btnStartRound.onclick = startNewRound;
btnLearn.onclick = () => showScreen("game");
btnProgress.onclick = () => showScreen("dashboard");
