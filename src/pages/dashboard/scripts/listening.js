import { methodsKeys, scores } from "../../../database/letters.js";
import { shuffleArray, sleep } from "../../../scripts/utils.js";
import {
    gameState,
    getCurrentSystem,
    playSoundEffect,
    playLetterSound,
    selectNextCharsBySyllableGroups,
    statusRef,
    updateScoreDatabase,
    updateScoreLocal,
    getCurrentCharJP,
} from "./utils.js";

const gameContent = document.getElementById("listening-content");
const finishContent = document.getElementById("finish-content-listening");
const progressBar = document.getElementById("listening-progress");
const btnPlay = document.getElementById("play-sound-listening");
const container = document.querySelector(".listening-grid");
const btnStartRound = document.getElementById("start-round-listening");
let maxCharsRound = 6;
let currentShuffle = [];

export function renderListening() {
    startNewRound();
    btnStartRound.onclick = startNewRound;
    btnPlay.onclick = () => playLetterSound(getCurrentCharJP());
}

function startNewRound() {
    gameState.rightRound = [];
    gameState.currentIndex = 0;
    gameState.currentRound = selectNextCharsBySyllableGroups(
        methodsKeys.listening,
    );
    gameState.currentSystem = getCurrentSystem();
    maxCharsRound = gameState.currentRound.length;
    currentShuffle = shuffleArray(gameState.currentRound);
    gameContent.classList.remove("hidden");
    finishContent.classList.add("hidden");
    updateUI();
}

function updateUI() {
    const progress = (gameState.currentIndex / maxCharsRound) * 100;
    progressBar.style.width = `${progress}%`;
    renderCards();
}

function renderCards() {
    container.innerHTML = "";
    currentShuffle.forEach((x) => {
        const card = document.createElement("div");
        card.classList =
            "listening-card " +
            (gameState.rightRound.includes(x) ? "listening-disabled" : "");
        const char = document.createElement("span");
        char.classList = "listening-char";
        char.innerText = x;
        card.append(char);
        card.onclick = () => selectCard(x, card);
        container.append(card);
    });
}

async function selectCard(cardJP, card) {
    const currentJP = getCurrentCharJP();
    if (cardJP === currentJP) {
        gameState.rightRound.push(cardJP);
        playSoundEffect(statusRef.correct);
        await sleep(200);
        card.classList.add("listening-correct");
        await sleep(600);
        card.classList.add("listening-disabled");
        nextQuestion();
        if (gameState.lastWrong !== currentJP) {
            updateScoreLocal(
                methodsKeys.listening,
                currentJP,
                scores.listening.max,
            );
        }
    } else {
        gameState.lastWrong = currentJP;
        playSoundEffect(statusRef.wrong);
        await sleep(200);
        card.classList.add("listening-wrong");
        await sleep(600);
        renderCards();
    }
}

async function nextQuestion() {
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
