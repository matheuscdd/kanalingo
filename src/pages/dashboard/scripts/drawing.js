import { alphabet, methodsKeys, scores } from "../../../database/letters.js";
import { sleep } from "../../../scripts/utils.js";
import {
    gameState,
    getCurrentSystem,
    playSoundEffect,
    playLetterSound,
    selectNextCharsBySystem,
    statusRef,
    updateScoreDatabase,
    updateScoreLocal,
    screens,
    getCurrentCharJA,
} from "./utils.js";

const displayRomaji = document.querySelector(".drawing-romaji");
const displaySystem = document.querySelector(".drawing-system");
const btnPlay = document.getElementById("play-sound-drawing");
const progressBar = document.getElementById("drawing-progress");
const gameContent = document.getElementById("drawing-content");
const finishContent = document.getElementById("finish-content-drawing");
const feedback = document.getElementById("feedback-drawing");
const btnStartRound = document.getElementById("start-round-drawing");
const btnNext = document.getElementById("btn-next-drawing");
const maxCharsRound = 3;
const aux = document.getElementById("visualizer-target-drawing-aux");
const main = document.getElementById("visualizer-target-drawing-main");
const checkboxStroke = document.getElementById("drawing-stroke-handler");
const header = document.querySelector(".drawing-content-header");
const maxAllowedErrors = 2;
const writers = Object.seal({
    main: null,
    aux: null,
});

const results = {
    validations: [],
    isUsingModel: false,
};

let headerWidth = 0;
const updateHeaderWidth = () => (headerWidth = header.offsetWidth);

export function initEventsDrawing() {
    updateViewport();
}

export function renderDrawing() {
    startNewRound();
    btnPlay.onclick = () => {
        const charJA = getCurrentCharJA();
        playLetterSound(charJA);
    };

    btnStartRound.onclick = startNewRound;
    btnNext.onclick = nextQuestion;
    checkboxStroke.onchange = showModel;
}

function startNewRound() {
    gameState.rightRound = [];
    gameState.currentIndex = 0;
    gameState.currentRound = selectNextCharsBySystem(
        methodsKeys.drawing,
        maxCharsRound,
    );
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
    const charJA = getCurrentCharJA();
    const charRO = alphabet.find((x) => x.term === charJA).definition;
    displayRomaji.innerText = charRO;
    startEventsDraw(charJA);
    const progress = (gameState.currentIndex / maxCharsRound) * 100;
    progressBar.style.width = `${progress}%`;
}

async function checkAnswer() {
    const charJA = getCurrentCharJA();
    playSoundEffect(statusRef.correct);
    await sleep(200);
    showFeedback(
        statusRef.correct,
        "Continuar",
        results.validations.every(Boolean) ? "Perfeito" : "Excelente",
        "O correto",
        charJA,
    );
    if (results.validations.every(Boolean)) {
        updateScoreLocal(
            methodsKeys.drawing,
            charJA,
            results.isUsingModel ? scores.drawing.min : scores.drawing.max,
        );
        gameState.lastWrong = null;
        gameState.rightRound.push(charJA);
    } else {
        gameState.lastWrong = charJA;
    }
}

async function startEventsDraw(currentJA) {
    results.validations = new Array(currentJA.length).fill(false);
    handleYoon(currentJA);
    await drawMain(currentJA[0]);
    if (currentJA.length === 1) return;
    await drawAux(currentJA[1]);
}

function showModel() {
    results.isUsingModel = true;
    const charJA = getCurrentCharJA();
    results.validations = new Array(charJA.length).fill(false);
    startEventsDraw(charJA);
}

function setWriterAux(currentJA) {
    writers.aux = HanziWriter.create(aux, currentJA, {
        ...getDefaultsHanziWriter(),
        width: getDimensions().aux,
        height: getDimensions().aux,
    });
}

function setWriterMain(currentJA) {
    writers.main = HanziWriter.create(main, currentJA, {
        ...getDefaultsHanziWriter(),
        width: getDimensions().main,
        height: getDimensions().main,
    });
}

function handleYoon(currentJA) {
    if (currentJA.length === 1) {
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
    const charJA = getCurrentCharJA();
    const isEndOfMainInCombo =
        charJA.length === 2 && charJA[0] === strokeData.character;
    if (!isEndOfMainInCombo && !strokeData.strokesRemaining) return;
    playSoundEffect(statusRef.hit);
}

function writerMainValidation() {
    writers.main.quiz({
        onMistake: playSoundEffectOnMistake,
        onCorrectStroke: playSoundEffectOnCorrect,
        onComplete: (summaryData) => {
            results.validations[0] =
                summaryData.totalMistakes <= maxAllowedErrors;
            if (getCurrentCharJA().length === 1) {
                return checkAnswer();
            }
            writerAuxValidation();
        },
    });
}

function writerAuxValidation() {
    writers.aux.quiz({
        onMistake: playSoundEffectOnMistake,
        onCorrectStroke: playSoundEffectOnCorrect,
        onComplete: (summaryData) => {
            results.validations[1] =
                summaryData.totalMistakes <= maxAllowedErrors;
            checkAnswer();
        },
    });
}

async function drawMain(currentJA) {
    main.innerHTML = "";
    writers.main?.hideCharacter();
    writers.aux?.hideCharacter();
    setWriterMain(currentJA);
    if (checkboxStroke.checked) {
        await writers.main.animateCharacter();
    }
    writerMainValidation();
}

async function drawAux(currentJA) {
    aux.innerHTML = "";
    setWriterAux(currentJA);
    if (checkboxStroke.checked) {
        await writers.aux.animateCharacter({
            onComplete: () => {
                writers.aux.hideCharacter();
            },
        });
    }
}

function getDefaultsHanziWriter() {
    return {
        showHintAfterMisses: 1,
        highlightOnComplete: true,
        highlightColor: "#f5a4a4",
        drawingColor: "#4b4b4b",
        strokeColor: "#1cb0f6",
        drawingWidth: 30,
        strokeTolerance: 25,
        showCharacter: checkboxStroke.checked,
        showOutline: checkboxStroke.checked,
        strokeAnimationSpeed: 1,
        delayBetweenStrokes: 200,
        strokeFadeDuration: 0,
        charDataLoader: (char, onLoad, onError) => {
            fetch(`/src/libs/js/hanzi-writer/data/${char}.json`)
                .then((res) => res.json())
                .then(onLoad)
                .catch(onError);
        },
    };
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
    const isComboChar = getCurrentCharJA().length === 2;
    let max = Math.min(window.innerWidth, headerWidth);
    if (max >= 600 && !isComboChar) {
        max -= 200;
    }
    const dimensions = { main: max, aux: null };
    if (isComboChar) {
        dimensions.main = max * 0.66;
        dimensions.aux = max - dimensions.main;
    }

    return dimensions;
}

let ticking = false;

function updateViewport() {
    window.visualViewport.addEventListener("resize", () => {
        if (gameState.currentScreen !== screens.drawing) return;
        if (!ticking) {
            globalThis.requestAnimationFrame(() => {
                updateHeaderWidth();
                ticking = false;
            });
            ticking = true;
        }

        if (
            !gameState.currentRound ||
            feedback.dataset.status === statusRef.correct
        )
            return;
        startEventsDraw(getCurrentCharJA());
    });
}
