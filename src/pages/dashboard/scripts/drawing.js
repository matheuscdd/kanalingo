import { alphabet, methodsKeys, scores } from "../../../database/letters.js";
import { sleep, getInternalPath } from "../../../scripts/utils.js";
import { gameState, getCurrentSystem, playSoundEffect, playLetterSound, selectNextCharsBySystem, statusRef, updateScoreDatabase, updateScoreLocal, screens, getCurrentCharJP } from "./utils.js";

const displayRomaji = document.querySelector('.drawing-romaji');
const displaySystem = document.querySelector('.drawing-system');
const btnPlay = document.getElementById('play-sound-drawing');
const progressBar = document.getElementById("drawing-progress");
const gameContent = document.getElementById("drawing-content");
const finishContent = document.getElementById("finish-content-drawing");
const feedback = document.getElementById("feedback-drawing");
const btnStartRound = document.getElementById("start-round-drawing");
const btnNext = document.getElementById("btn-next-drawing");
const maxCharsRound = 3;
const aux = document.getElementById('visualizer-target-drawing-aux');
const main = document.getElementById('visualizer-target-drawing-main');
const checkboxStroke = document.getElementById('drawing-stroke-handler');
const header = document.querySelector('.drawing-content-header');
const maxAllowedErrors = 2;
const writers = Object.seal({
  main: null,
  aux: null
});

const results = {
  validations: [],
  isUsingModel: false
};

let headerWidth = 0;
const updateHeaderWidth = () => headerWidth = header.offsetWidth;

export function initEventsDrawing() {
  updateViewport();
}

export function renderDrawing() {
  startNewRound();
  btnPlay.onclick = () => {
    const charJP = getCurrentCharJP();
    playLetterSound(charJP);
  }

  btnStartRound.onclick = startNewRound;
  btnNext.onclick = nextQuestion;
  checkboxStroke.onchange = showModel;
}

function startNewRound() {
  gameState.rightRound = [];
  gameState.currentIndex = 0;
  gameState.currentRound = selectNextCharsBySystem(methodsKeys.drawing, maxCharsRound);
  gameState.currentSystem = getCurrentSystem();
  gameContent.classList.remove("hidden");
  finishContent.classList.add("hidden");
  updateUI();
}

function updateUI() {
  updateHeaderWidth();
  checkboxStroke.checked = false;
  results.isUsingModel = false;
  displaySystem.innerText = gameState.currentSystem;
  const charJP = getCurrentCharJP();
  const charRO = alphabet.find(x => x.term === charJP).definition;
  displayRomaji.innerText = charRO;
  startEventsDraw(charJP);
  const progress = (gameState.currentIndex / maxCharsRound) * 100;
  progressBar.style.width = `${progress}%`;
}

async function checkAnswer() {
  const charJP = getCurrentCharJP();
  playSoundEffect(statusRef.correct);
  await sleep(200);
  showFeedback(
    statusRef.correct,
    "Continuar",
    results.validations.every(Boolean) ? "Perfeito" : "Excelente",
    "O correto",
    charJP,
  );
  if (results.validations.every(Boolean)) {
    updateScoreLocal(methodsKeys.drawing, charJP, results.isUsingModel ? scores.drawing.min : scores.drawing.max);
    gameState.lastWrong = null;
    gameState.rightRound.push(charJP);
  }
  else {
    gameState.lastWrong = charJP;
  }
}

async function startEventsDraw(currentJP) {
  results.validations = new Array(currentJP.length).fill(false);
  main.innerHTML = '';
  aux.innerHTML = '';
  handleYoon(currentJP);
  await drawMain(currentJP[0]);
  if (currentJP.length === 1) return;
  await drawAux(currentJP[1]);
}

function showModel() {
  results.isUsingModel = true;
  const charJP = getCurrentCharJP()
  results.validations = new Array(charJP.length).fill(false);
  startEventsDraw(charJP);
}

function setWriterAux(currentJP) {
  writers.aux = HanziWriter.create(aux, currentJP, {
    ...getDefaultsHanziWriter(),
    width: 150,
    height: 150,
  });
}

function setWriterMain(currentJP) {
  writers.main = HanziWriter.create(main, currentJP, {
    ...getDefaultsHanziWriter(),
    width: getDimensions().main,
    height: getDimensions().main,
  });
}

function handleYoon(currentJP) {
  if (currentJP.length === 1) {
    aux.style.minWidth = 0;
    aux.style.width = 0;
    writers.aux?.hideCharacter();
    return;
  }
  aux.style.minWidth = `${getDimensions().aux}px`;
}

function playSoundEffectOnMistake() {
  playSoundEffect(statusRef.wrong);
}

function playSoundEffectOnCorrect(strokeData) {
  const charJP = getCurrentCharJP();
  const isEndOfMainInCombo = charJP.length === 2 && charJP[0] === strokeData.character;
  if (!isEndOfMainInCombo && !strokeData.strokesRemaining) return;
  playSoundEffect(statusRef.hit)
}

function writerMainValidation() {
  writers.main.quiz({
    onMistake: playSoundEffectOnMistake,
    onCorrectStroke: playSoundEffectOnCorrect,
    onComplete: (summaryData) => {
      results.validations[0] = summaryData.totalMistakes <= maxAllowedErrors;
      if (getCurrentCharJP().length === 1) {
        return checkAnswer();
      };
      writerAuxValidation();
    }
  });
}

function writerAuxValidation() {
  writers.aux.quiz({
    onMistake: playSoundEffectOnMistake,
    onCorrectStroke: playSoundEffectOnCorrect,
    onComplete: (summaryData) => {
      results.validations[1] = summaryData.totalMistakes <= maxAllowedErrors;
      checkAnswer();
    }
  });
}

async function drawMain(currentJP) {
  writers.main?.hideCharacter();
  writers.aux?.hideCharacter();
  setWriterMain(currentJP);
  if (checkboxStroke.checked) {
    await writers.main.animateCharacter();
  }
  writerMainValidation();
}

async function drawAux(currentJP) {
  setWriterAux(currentJP);
  if (checkboxStroke.checked) {
    await writers.aux.animateCharacter({
      onComplete: () => {
        writers.aux.hideCharacter();
      }
    });
  }
}

function getDefaultsHanziWriter() {
  return {
    showHintAfterMisses: 1,
    highlightOnComplete: true,
    highlightColor: '#f5a4a4',
    drawingColor: '#4b4b4b',
    strokeColor: '#1cb0f6',
    drawingWidth: 30,
    strokeTolerance: 20,
    showCharacter: checkboxStroke.checked,
    showOutline: checkboxStroke.checked,
    strokeAnimationSpeed: 1,
    delayBetweenStrokes: 200,
    strokeFadeDuration: 0,
    charDataLoader: (char, onLoad, onError) => {
      fetch(getInternalPath(`/src/libs/js/hanzi-writer/data/${char}.json`))
        .then(res => res.json())
        .then(onLoad)
        .catch(onError);
    }
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
}

async function nextQuestion() {
  feedback.classList = "feedback-overlay";
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
  playSoundEffect(statusRef.completed);
  await sleep(100);
  gameContent.classList.add("hidden");
  finishContent.classList.remove("hidden");
  gameState.currentRound = null;
  updateScoreDatabase();
}

function getDimensions() {
  const isComboChar = getCurrentCharJP().length === 2;
  const max = Math.min(window.innerWidth, headerWidth);
  const result = { main: max, aux: null };
  if (isComboChar) {
    result.main = max * 0.66;
    result.aux = max - result.main;
  }

  return result;
}

let ticking = false

function updateViewport() {
  window.visualViewport.addEventListener('resize', () => {
    if (gameState.currentScreen !== screens.drawing) return;
    if (!ticking) {
      globalThis.requestAnimationFrame(() => {
        updateHeaderWidth();
        ticking = false
      });
      ticking = true
    }

    if (!gameState.currentRound || feedback.dataset.status === statusRef.correct) return;
    startEventsDraw(getCurrentCharJP());
  });
}
