import {
    alphabet,
    defaults,
    hiragana,
    hiraganaTerms,
    japanese,
    kanas,
    katakana,
} from "../../../database/letters.js";
import { authFirebase, dbFirebase } from "../../../scripts/config.js";
import {
    getSumFromValues,
    orderArray,
    showNumberIncreasing,
    shuffleArray,
} from "../../../scripts/utils.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import {
    getDoc,
    setDoc,
    doc,
    updateDoc,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const totalScoreDisplay = document.getElementById("total-score");
export const gameState = Object.seal({
    currentRound: [],
    rightRound: [],
    currentIndex: 0,
    currentSystem: null,
    scorePerChar: structuredClone(defaults),
    lastWrong: false,
    currentScreen: null,
});

export const screens = Object.freeze({
    methods: "methods",
    listening: "listening",
    typing: "typing",
    drawing: "drawing",
    catalog: "catalog",
    categories: "categories",
});

export const statusRef = Object.freeze({
    hit: "hit",
    correct: "correct",
    wrong: "wrong",
    completed: "completed",
});

const audioCache = Object.seal({
    letters: {},
    effects: {},
});

export function preloadAudios() {
    alphabet.forEach(({ definition }) => {
        const audio = new Audio(
            `../../assets/audios/letters/${definition}.mp3`,
        );
        audio.preload = "auto";
        audio.load();
        audioCache.letters[definition] = audio;
    });

    Object.values(statusRef).forEach((key) => {
        const audio = new Audio(`../../assets/audios/effects/${key}.mp3`);
        audio.preload = "auto";
        audio.load();
        audioCache.effects[key] = audio;
    });
}

export async function updateScoreLocal(key, char, amount) {
    if (gameState.lastWrong === char) return;
    if (!gameState.scorePerChar[char]) {
        gameState.scorePerChar[char] = { [key]: 0 };
    }
    gameState.scorePerChar[char][key] =
        (gameState.scorePerChar[char][key] || 0) + amount;
    localStorage.setItem(japanese, JSON.stringify(gameState.scorePerChar));
    updateTotalScoreDisplay();
}

export async function updateScoreDatabase() {
    try {
        const user = authFirebase.currentUser;
        const ref = doc(dbFirebase, "users", user.uid);
        await updateDoc(ref, { [japanese]: gameState.scorePerChar });
    } catch (error) {
        console.error(error);
    }
}

export function getTotalScore(ref) {
    return Object.values(ref).reduce((x, y) => getSumFromValues(y) + x, 0);
}

export async function updateTotalScoreDisplay(isFirstLoad) {
    const total = getTotalScore(gameState.scorePerChar);
    if (isFirstLoad) {
        totalScoreDisplay.classList = "golden-color2";
        await showNumberIncreasing(
            total,
            0,
            totalScoreDisplay,
            1,
            total * 0.01,
        );
        totalScoreDisplay.classList = "";
        return;
    }

    totalScoreDisplay.classList = "golden-color2";
    await showNumberIncreasing(total, total - 100, totalScoreDisplay, 1);
    totalScoreDisplay.classList = "";
}

export function getValueToScorePerChar(char, key) {
    if (!gameState.scorePerChar[char]) {
        return 0;
    }
    return gameState.scorePerChar[char][key] || 0;
}

export async function loadProgress() {
    const local = JSON.parse(
        localStorage.getItem(japanese) ?? JSON.stringify({}),
    );
    if (Object.keys(local).length) {
        gameState.scorePerChar = local;
    }

    onAuthStateChanged(authFirebase, async (user) => {
        if (!user) return console.error("null user");
        const ref = doc(dbFirebase, "users", user.uid);
        try {
            let currentProgress = null;
            const response = await getDoc(ref);
            if (response.exists()) {
                currentProgress = response.data().ja;
            } else {
                await setDoc(ref, { ja: defaults }, { merge: true });
                currentProgress = defaults;
            }

            if (
                Object.keys(local).length &&
                getTotalScore(local) > getTotalScore(currentProgress)
            ) {
                return;
            }
            localStorage.setItem("ja", JSON.stringify(currentProgress));
            gameState.scorePerChar = currentProgress;
        } catch (error) {
            console.error(error);
        }
    });
}

export function playSoundEffect(sound) {
    const audio = audioCache.effects[sound];
    audio.currentTime = 0;
    audio.play();
}

export function playLetterSound(currentJA) {
    const currentRO = alphabet.find((x) => x.term === currentJA).definition;
    const audio = audioCache.letters[currentRO];
    audio.currentTime = 0;
    audio.play();
}

export function selectNextChars(key, maxCharsRound) {
    const grouped = {};
    kanas.forEach((char) => {
        const score = getValueToScorePerChar(char, key);
        if (!grouped[score]) grouped[score] = [];
        grouped[score].push(char);
    });

    const sortedScores = orderArray(Object.keys(grouped).map(Number));

    let selected = [];
    for (let score of sortedScores) {
        const group = grouped[score];
        const shuffledGroup = shuffleArray(group);
        for (let char of shuffledGroup) {
            selected.push(char);
            if (selected.length === maxCharsRound) return selected;
        }
    }
    return selected.slice(0, maxCharsRound);
}

export function selectNextCharsBySystem(key, maxCharsRound) {
    const structure = Math.random() > 0.5 ? hiragana : katakana;
    const terms = new Set(structure.map((x) => x.term));
    const rawChars = selectNextChars(key, kanas.length);
    const handleChars = rawChars.filter((x) => terms.has(x));
    return handleChars.slice(0, maxCharsRound);
}

export function selectNextCharsBySyllableGroups(key) {
    const structure = Math.random() > 0.5 ? hiragana : katakana;
    const rawChars = selectNextChars(key, kanas.length);
    const terms = structure.map((x) => x.term);
    const example = rawChars.find((x) => terms.includes(x));

    const syllableGroup = structure.find(
        (x) => x.term === example,
    ).syllableGroup;
    const handleChars = structure.filter(
        (x) => x.syllableGroup === syllableGroup,
    );
    return shuffleArray(handleChars.map((x) => x.term));
}

export function getCurrentSystem() {
    return hiraganaTerms.includes(gameState.currentRound[0])
        ? "Hiragana"
        : "Katakana";
}

export function getCurrentCharJA() {
    return gameState.currentRound[gameState.currentIndex];
}
