import { databasesTypes, defaults } from "@/database/letters.js";

export const audioCache = Object.seal({
    letters: {},
    effects: {},
});

export const gameState = Object.seal({
    currentRound: [],
    rightRound: [],
    currentIndex: 0,
    currentSystem: null,
    scorePerChar: structuredClone(defaults),
    lastWrong: false,
    currentScreen: null,
    lastTotalScore: 0,
    currentDatabase:
        localStorage.getItem("currentDatabase") ?? databasesTypes.hiragana,
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
