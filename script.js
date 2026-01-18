import { HIRAGANA, KATAKANA } from "./data.js";
import { levels } from "./levels.js";
import { showNumberIncreasing, sleep } from "./utils.js";

const ALL_CHARS = { ...HIRAGANA, ...KATAKANA };
const CHAR_KEYS = Object.keys(ALL_CHARS);

let gameState = {
  currentRound: [],
  currentIndex: 0,
  pointsPerChar: {},
  lastWrong: false,
};

const maxCharsRound = 2;
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
const btnProgress = document.getElementById("toggle-progress");
const btnCategories = document.getElementById("toggle-progress");
const btnNext = document.getElementById("btn-next");

function init() {
  loadProgress();
  updateTotalScoreDisplay(true);
  startNewRound();

  userInput.addEventListener("keypress", (e) => {
    if (
      feedback.classList !== "feedback-overlay" ||
      e.key !== "Enter" ||
      document.activeElement !== userInput
    ) {
      return;
    }

    checkAnswer();
    setTimeout(() => userInput.blur(), 100);
  });

  document.addEventListener("keypress", (e) => {
    console.log(
      feedback.classList !== "feedback-overlay",
      e.key === "Enter",
      document.activeElement !== userInput,
      gameState.currentRound.length === 0,
    );

    if (
      feedback.classList !== "feedback-overlay" &&
      e.key === "Enter" &&
      document.activeElement !== userInput
    ) {
      nextQuestion();
      return;
    } else if (
      e.key === "Enter" &&
      document.activeElement !== userInput &&
      gameState.currentRound.length === 0
    ) {
      startNewRound();
      return;
    }
  });

  btnNext.addEventListener("click", nextQuestion);
}

function showScreen(screen) {
  btnLearn.classList.toggle("active");
  btnProgress.classList.toggle("active");
  if (screen === "game") {
    gameScreen.classList.remove("hidden");
    dashboardScreen.classList.add("hidden");
    categoriesScreen.classList.add('hidden');
  } else if ("dashboard") {
      dashboardScreen.classList.remove("hidden");
    gameScreen.classList.add("hidden");
    categoriesScreen.classList.add('hidden');
    renderDashboard();
  } else if ("categories") {
      categoriesScreen.classList.remove('hidden');
 dashboardScreen.classList.add("hidden");
    gameScreen.classList.add("hidden");
  }
}

function startNewRound() {
  gameState.currentRound = [];
  gameState.currentIndex = 0;

  const completed = Object.keys(gameState);
  let shuffled = [...CHAR_KEYS];
  if (completed.length !== CHAR_KEYS.length) {
    shuffled = shuffled.filter((e) => !completed.includes(e));
  }

  shuffled = shuffled.sort(() => 0.5 - Math.random());
  gameState.currentRound = selectNextChars();

  gameContent.classList.remove("hidden");
  finishContent.classList.add("hidden");
  updateUI();
}

function selectNextChars() {
  const grouped = {};
  CHAR_KEYS.forEach((char) => {
    const score = gameState.pointsPerChar[char] || 0;
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

function checkAnswer() {
  const currentJP = gameState.currentRound[gameState.currentIndex];
  const correctRomaji = ALL_CHARS[currentJP];
  const userValue = userInput.value.trim().toLowerCase();

  if (userValue === correctRomaji) {
    showFeedback(
      statusRef.correct,
      "Continuar",
      "Excelente",
      "Correto!",
      correctRomaji,
    );
    updatePoints(currentJP, 100);
    gameState.lastWrong = null;
  } else {
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
  console.log("foi");
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
  gameState.currentRound = [];
}

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

  const sorted = Object.entries(gameState.pointsPerChar).sort(
    (a, b) => b[1] - a[1],
  );

  sorted.forEach(([char, pts]) => {
    if (pts === 0 && sorted.length > 20) return; // Oculta os zerados se tiver muitos dados

    const card = document.createElement("div");
    card.classList = "char-card";

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

    const points = document.createElement("div");
    points.classList = "card-value";
    points.textContent = pts;
    card.append(points);

    if (level.end) {
        card.classList.add("card-finished");
        points.classList.add("golden-color3");
    }



    container.append(card);
  });
}

function getLevel(pts) {
  if (pts < levels[0].points) {
    return { color: "transparent", progress: 0 };
  }

  if (pts >= levels.at(-1).points) {
    const level = levels.at(-1);
    return { color: level.color, progress: 100, end: true }; // tratativa especial
  }

  const level = levels.find(x => pts <= x.points);
  const lastCategory = levels.findLast((x) => x.category === level.category);
  console.log(level, lastCategory)
  const progress = Math.min(((pts / lastCategory.points) * 100) + 5, 100);
  return { color: level.color, progress };
}

window.onload = init;
btnStartRound.onclick = startNewRound;
btnLearn.onclick = () => showScreen("game");
btnProgress.onclick = () => showScreen("dashboard");
