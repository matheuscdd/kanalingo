import { DEFAULT_SELECTED_BOTS, DEFAULT_OVERLAY, GAME_MODES, IMPLEMENTATION_NOTE } from './constants.js';
import { questions } from '../data/questions.js';

const subscribers = new Set();

const initialState = {
    status: 'menu',
    gameMode: GAME_MODES.CORRECT,
    selectedTank: 'normal',
    selectedBots: [...DEFAULT_SELECTED_BOTS],
    currentQuestionIndex: 0,
    totalQuestions: questions.length,
    questionText: '',
    objectiveText: '',
    waveLabel: `Nível 1 / ${questions.length}`,
    overlay: { ...DEFAULT_OVERLAY },
    celebration: {
        visible: false,
        title: 'ÁREA LIMPA!',
        description: 'Sincronizando a próxima região...'
    },
    hud: {
        healthPct: 100,
        healthText: '100%',
        heatPct: 0,
        heatText: '0%',
        overheated: false
    },
    sliceNote: IMPLEMENTATION_NOTE
};

let state = clone(initialState);

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mergeState(target, patch) {
    if (!isObject(target) || !isObject(patch)) {
        return clone(patch);
    }

    const result = { ...target };

    for (const [key, value] of Object.entries(patch)) {
        if (Array.isArray(value)) {
            result[key] = [...value];
            continue;
        }

        if (isObject(value) && isObject(target[key])) {
            result[key] = mergeState(target[key], value);
            continue;
        }

        result[key] = value;
    }

    return result;
}

function notify() {
    for (const listener of subscribers) {
        listener(state);
    }
}

export function getState() {
    return state;
}

export function subscribe(listener) {
    subscribers.add(listener);
    listener(state);

    return () => {
        subscribers.delete(listener);
    };
}

export function setState(patch) {
    state = mergeState(state, patch);
    notify();
    return state;
}

export function resetState(overrides = {}) {
    state = mergeState(clone(initialState), overrides);
    notify();
    return state;
}

export function getInitialState() {
    return clone(initialState);
}