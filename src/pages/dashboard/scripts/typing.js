import { alphabet, methodsKeys, scores } from "../../../database/letters.js";
import { sleep } from "../../../scripts/utils.js";
import {
    gameState,
    getCurrentCharJP,
    playSoundEffect,
    screens,
    selectNextChars,
    statusRef,
    updateScoreDatabase,
    updateScoreLocal,
} from "./utils.js";

const gameContent = document.getElementById("typing-content");
const finishContent = document.getElementById("finish-content-typing");
const charDisplay = document.getElementById("current-char");
const userInput = document.getElementById("user-input");
const progressBar = document.getElementById("typing-progress");
const feedback = document.getElementById("feedback-typing");
const btnStartRound = document.getElementById("start-round-typing");
const btnNext = document.getElementById("btn-next-typing");
const btnVerify = document.getElementById("btn-verify-typing");
const instructions = document.querySelector(".question-text");
const maxCharsRound = 5;

export function initEventsTyping() {
    userInput.onfocus = async () => {
        if (window.innerWidth > 1000) return;
        await sleep(300);
        window.scrollTo({
            top: 120,
            behavior: "smooth",
        });
    };

    handlePhoneKeyboard();
    handleEnterPress();
}

export function renderTyping() {
    startNewRound();
    btnVerify.onclick = checkAnswer;
    btnStartRound.onclick = startNewRound;
    btnNext.onclick = nextQuestion;
}

function handleEnterPress() {
    userInput.addEventListener("keypress", async (e) => {
        if (
            gameState.currentScreen !== screens.typing ||
            e.key !== "Enter" ||
            document.activeElement !== userInput
        ) {
            return;
        }

        checkAnswer();
        await sleep(100);
        userInput.blur();
    });

    document.addEventListener("keypress", (e) => {
        if (gameState.currentScreen !== screens.typing) return;
        else if (
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
    if (!window.visualViewport) return;
    window.visualViewport.addEventListener("resize", () => {
        if (
            gameState.currentScreen !== screens.typing ||
            window.innerWidth > 1000
        )
            return;
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;

        const keyboardOpen = viewportHeight + 100 < windowHeight;
        if (keyboardOpen) {
            instructions.classList.add("question-text-mobal");
        } else {
            window.scrollTo(0, 0);
            instructions.classList.remove("question-text-mobal");
        }
    });
}

function startNewRound() {
    gameState.rightRound = [];
    gameState.currentIndex = 0;
    gameState.currentRound = selectNextChars(methodsKeys.typing, maxCharsRound);
    gameState.currentSystem = null;
    gameContent.classList.remove("hidden");
    finishContent.classList.add("hidden");
    updateUI();
}

function updateUI() {
    const char = getCurrentCharJP();
    charDisplay.textContent = char;
    userInput.value = "";
    userInput.focus();
    const progress = (gameState.currentIndex / maxCharsRound) * 100;
    progressBar.style.width = `${progress}%`;
}

async function checkAnswer() {
    const charJP = getCurrentCharJP();
    const charRO = alphabet.find((x) => x.term === charJP).definition;
    const userValue = userInput.value.trim().toLowerCase();

    if (userValue === charRO) {
        playSoundEffect(statusRef.correct);
        await sleep(200);
        showFeedback(
            statusRef.correct,
            "Continuar",
            gameState.lastWrong === null ? "Perfeito" : "Excelente",
            "Correto!",
            charRO,
        );
        updateScoreLocal(methodsKeys.typing, charJP, scores.typing.max);
        gameState.lastWrong = null;
        gameState.rightRound.push(charJP);
    } else {
        playSoundEffect(statusRef.wrong);
        await sleep(200);
        showFeedback(
            statusRef.wrong,
            "Tentar novamente",
            "Poxa...",
            "Quase lá!",
            charRO,
        );
        gameState.lastWrong = charJP;
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
    playSoundEffect(statusRef.completed);
    await sleep(100);
    gameContent.classList.add("hidden");
    finishContent.classList.remove("hidden");
    gameState.currentRound = null;
    updateScoreDatabase();
}
