import { alphabet, kanas, methodsKeys } from "../../../database/letters.js";
import { sleep } from "../../../scripts/utils.js";
import { gameState, getValueToScorePerChar, maxCharsRound, statusRef, updateScore } from "./utils.js";

const gameContent = document.getElementById("game-content");
const finishContent = document.getElementById("finish-content");
const charDisplay = document.getElementById("current-char");
const userInput = document.getElementById("user-input");
const progressBar = document.getElementById("game-progress");
const feedback = document.getElementById("feedback");
const btnStartRound = document.getElementById("start-round");
const btnNext = document.getElementById("btn-next");
const instructions = document.querySelector('.question-text');

export function initEventsTyping() {
  startNewRound();
  handlePhoneKeyboard();
  handleEnterPress();
  
  btnStartRound.onclick = startNewRound;
  btnNext.addEventListener("click", nextQuestion);
}

function handleEnterPress() {
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
}

function handlePhoneKeyboard() {
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
  kanas.forEach((char) => {
    const score = getValueToScorePerChar(char, methodsKeys.typing);
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
  const correctRomaji = alphabet.find(x => x.term === currentJP).definition;
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
    updateScore(methodsKeys.typing, currentJP, 100);
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
  const audio = new Audio(`../../assets/audios/soundEffects/${sound}.mp3`);
  audio.play();
}

function playLetterSound(currentJP) {
  const currentRO = alphabet.find((x) => x.term === currentJP).definition;
  const audio = new Audio(`../../assets/audios/letters/${currentRO}.mp3`);
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

async function showFinishScreen() {
  playActionSound("completed");
  await sleep(100);
  gameContent.classList.add("hidden");
  finishContent.classList.remove("hidden");
  gameState.currentRound = null;
}
