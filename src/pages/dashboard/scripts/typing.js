import { alphabet, methodsKeys } from "../../../database/letters.js";
import { sleep } from "../../../scripts/utils.js";
import { gameState, playActionSound, selectNextChars, statusRef, updateScoreDatabase, updateScoreLocal } from "./utils.js";

const gameContent = document.getElementById("typing-content");
const finishContent = document.getElementById("finish-content-typing");
const charDisplay = document.getElementById("current-char");
const userInput = document.getElementById("user-input");
const progressBar = document.getElementById("typing-progress");
const feedback = document.getElementById("feedback-typing");
const btnStartRound = document.getElementById("start-round-typing");
const btnNext = document.getElementById("btn-next-typing");
const instructions = document.querySelector('.question-text');
const maxCharsRound = 5;

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
  gameState.rightRound = [];
  gameState.currentIndex = 0;
  gameState.currentRound = selectNextChars(methodsKeys.typing, maxCharsRound);
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
    updateScoreLocal(methodsKeys.typing, currentJP, 100);
    gameState.lastWrong = null;
    gameState.rightRound.push(currentJP);
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

async function showFeedback(status, next, title, message, char) {
  btnNext.textContent = next;
  feedback.classList = `feedback-overlay ${status}`;
  feedback.dataset.status = status;
  btnNext.classList = `btn-next-${status}`;
  feedback.querySelector(".feedback-title").textContent = title;
  feedback.querySelector(".feedback-msg").innerHTML =
    `${message} é <span class="letter-msg">${char}</span>`;
  charDisplay.classList =
    status === statusRef.wrong ? "wrong-color" : "primary-color";
}

async function nextQuestion() {
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
    await sleep(300);
    showFinishScreen();
  } else {
    updateUI();
  }
}

async function showFinishScreen() {
  playActionSound(statusRef.completed);
  await sleep(100);
  gameContent.classList.add("hidden");
  finishContent.classList.remove("hidden");
  gameState.currentRound = null;
  updateScoreDatabase();
}
