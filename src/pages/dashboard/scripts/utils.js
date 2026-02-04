import { kanas } from "../../../database/letters.js";
import { showNumberIncreasing } from "../../../scripts/utils.js";

export const gameState = Object.seal({
  currentRound: [],
  currentIndex: 0,
  scorePerChar: {},
  lastWrong: false,
});

const totalScoreDisplay = document.getElementById("total-score");

export const maxCharsRound = 5;
export const statusRef = Object.freeze({
  correct: "correct",
  wrong: "wrong",
});

export function updateScore(char, amount) {
  if (gameState.lastWrong === char) return;
  gameState.scorePerChar[char] = (gameState.scorePerChar[char] || 0) + amount;
  localStorage.setItem(
    "kanalingo_data",
    JSON.stringify(gameState.scorePerChar),
  );
  updateTotalScoreDisplay();
}

export async function updateTotalScoreDisplay(isFirstLoad) {
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

export function loadProgress() {
  const saved = localStorage.getItem("kanalingo_data");
  if (saved) {
    gameState.scorePerChar = JSON.parse(saved);
  } else {
    kanas.forEach((k) => (gameState.scorePerChar[k] = 0));
  }
}