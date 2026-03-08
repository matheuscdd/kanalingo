import {
    databasesData,
    databasesTypes,
    hiragana,
    hiraganaTerms,
    katakana,
} from "@/database/letters";
import {
    orderArray,
    shuffleArray,
} from "@/scripts/utilsPure.js";
import { gameState } from "./state.js";
import { getValueToScorePerChar } from "./score.js";

const original = Object.freeze({
    getCurrentDatabase: _getCurrentDatabase,
    getCurrentStructure: _getCurrentStructure,
    selectNextChars: _selectNextChars
});

const internal = Object.seal({...original});

export function setRoundTestDeps(deps = {}) {
    Object.assign(internal, deps);
}

export function resetRoundTestDeps() {
    Object.assign(internal, original);
}

function _selectNextChars(key, maxCharsRound) {
    const grouped = {};
    internal.getCurrentDatabase()
        .map((x) => x.term)
        .forEach((char) => {
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
        }
    }
    return selected.slice(0, maxCharsRound);
}

export function selectNextChars(key, maxCharsRound) {
    return internal.selectNextChars(key, maxCharsRound);
}

export function selectNextCharsWithSameSystem(key, maxCharsRound) {
    const structure = getCurrentStructure();
    const terms = new Set(structure.map((x) => x.term));
    const rawChars = selectNextChars(key, getCurrentDatabase().length);
    const handleChars = rawChars.filter((x) => terms.has(x));
    return handleChars.slice(0, maxCharsRound);
}

export function selectNextCharsByRimeGroups(key) {
    const structure = getCurrentStructure();
    const rawChars = selectNextChars(key, getCurrentDatabase().length);
    const terms = new Set(structure.map((x) => x.term));
    const example = rawChars.find((x) => terms.has(x));

    const rimeGroup = structure.find((x) => x.term === example).rimeGroup;
    const handleChars = structure.filter((x) => x.rimeGroup === rimeGroup);
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

function _getCurrentStructure() {
    if (gameState.currentDatabase === databasesTypes.kanas) {
        return Math.random() > 0.5 ? hiragana : katakana;
    }
    return databasesData[gameState.currentDatabase];
}

export function getCurrentStructure() {
    return internal.getCurrentStructure();
}

function _getCurrentDatabase() {
    return databasesData[gameState.currentDatabase];
}

export function getCurrentDatabase() {
    return internal.getCurrentDatabase();
}
