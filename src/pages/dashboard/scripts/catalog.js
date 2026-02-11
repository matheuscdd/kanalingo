import {
    alphabet,
    hiragana,
    katakana,
    scores,
} from "../../../database/letters.js";
import { levels } from "../../../database/levels.js";
import { getSumFromValues, orderArray, sleep } from "../../../scripts/utils.js";
import { gameState, getTotalScore, playLetterSound, screens } from "./utils.js";

const container = document.getElementById("catalog-container");
const progressTypingBar = document.querySelector(
    ".progress-typing-catalog-bar",
);
const progressTypingPercentage = document.querySelector(
    ".progress-typing-catalog-percentage",
);
const progressListeningBar = document.querySelector(
    ".progress-listening-catalog-bar",
);
const progressListeningPercentage = document.querySelector(
    ".progress-listening-catalog-percentage",
);
const progressDrawingBar = document.querySelector(
    ".progress-drawing-catalog-bar",
);
const progressDrawingPercentage = document.querySelector(
    ".progress-drawing-catalog-percentage",
);
const placeholder = document.querySelector(".catalog-placeholder");
const overlay = document.querySelector(".modal-catalog-overlay");
const btnCloseModal = document.getElementById("close-modal-catalog");
const displayRomaji = document.querySelector(".catalog-display-romaji");
const btnRepeat = document.getElementById("modal-catalog-repeat");
const btnPlay = document.getElementById("modal-catalog-play");

const writers = Object.seal({
    main: null,
    aux: null,
});

export function initEventsCatalog() {
    overlay.addEventListener("click", (e) => {
        if (gameState.currentScreen !== screens.catalog || e.target !== overlay)
            return;
        closeModal();
    });

    document.addEventListener("keydown", (e) => {
        if (gameState.currentScreen !== screens.catalog || e.key !== "Escape")
            return;
        closeModal();
    });
}

export function renderCatalog() {
    container.innerHTML = "";
    if (getTotalScore(gameState.scorePerChar) === 0) {
        placeholder.classList.remove("hidden");
        return;
    }

    updateProgressBars();
    btnCloseModal.onclick = closeModal;
    placeholder.classList.add("hidden");
    const sorted = Object.keys(gameState.scorePerChar).sort(
        (a, b) =>
            getSumFromValues(gameState.scorePerChar[b]) -
            getSumFromValues(gameState.scorePerChar[a]),
    );

    sorted.forEach((term) => {
        const pts = getSumFromValues(gameState.scorePerChar[term]);
        if (pts === 0 && sorted.length > 20) return; // Oculta os zerados se tiver muitos dados

        const card = document.createElement("div");
        card.classList = "char-card";
        card.onclick = () => selectChar(term);

        const title = document.createElement("div");
        title.textContent = term;
        title.classList = "ja kana-font";
        card.append(title);

        const wrapperBar = document.createElement("div");
        wrapperBar.classList = "progress-card-wrapper";
        card.append(wrapperBar);

        const containerBar = document.createElement("div");
        containerBar.classList = "progress-card-container";
        wrapperBar.append(containerBar);

        const bar = document.createElement("div");
        bar.classList = "progress-card-bar";
        const level = getLevel(pts);
        bar.style.width = `${level.progress}%`;
        bar.style.backgroundColor = level.color;
        containerBar.append(bar);

        const score = document.createElement("div");
        score.classList = "card-value";
        score.textContent = pts;
        card.append(score);

        if (level.end) {
            card.classList.add("card-finished");
            score.classList.add("golden-color3");
        }

        container.append(card);
    });
}

function getLevel(pts) {
    if (pts < levels[0].score) {
        return { color: "transparent", progress: 0 };
    }

    if (pts >= levels.at(-1).score) {
        const level = levels.at(-1);
        return { color: level.color, progress: 100, end: true };
    }

    const level = levels.find((x) => pts <= x.score);
    const lastCategory = levels.findLast((x) => x.category === level.category);
    const progress = Math.min((pts / lastCategory.score) * 100 + 5, 100);
    return { color: level.color, progress };
}

function updateProgressBars() {
    updateProgressTypingBar();
    updateProgressListeningBar();
    updateProgressDrawingBar();
}

function updateProgressDrawingBar() {
    const total = Object.keys(gameState.scorePerChar).length;
    const totals = Object.values(gameState.scorePerChar).map(
        (x) => x.drawing ?? 0,
    );
    const max = Math.max(...totals.filter((x) => x % scores.drawing.max === 0));
    const completed = totals.filter((x) => x >= max).length;
    let progress = 0;
    if (total !== completed) {
        progress = (completed * 100) / total;
    }
    progress = progress.toFixed(1);
    progressDrawingBar.style.width = `${progress}%`;
    progressDrawingPercentage.innerText = `${progress}%`;
}

function updateProgressTypingBar() {
    const total = Object.keys(gameState.scorePerChar).length;
    const totals = Object.values(gameState.scorePerChar).map(
        (x) => x.typing ?? 0,
    );
    const max = Math.max(...totals);
    const completed = totals.filter((x) => x === max).length;
    let progress = 0;
    if (total !== completed) {
        progress = (completed * 100) / total;
    }
    progress = progress.toFixed(1);
    progressTypingBar.style.width = `${progress}%`;
    progressTypingPercentage.innerText = `${progress}%`;
}

function updateProgressListeningBar() {
    const totalAlphabets = 2;
    let progress =
        (calcListeningProgress(hiragana) + calcListeningProgress(katakana)) /
        totalAlphabets;
    if (progress === 100) {
        progress = 0;
    }
    progress = progress.toFixed(1);
    progressListeningBar.style.width = `${progress}%`;
    progressListeningPercentage.innerText = `${progress}%`;
}

function calcListeningProgress(characters) {
    const charactersWithHits = characters.map((x) => ({
        ...x,
        hit:
            (gameState.scorePerChar[x.term].listening ?? 0) /
            scores.listening.max,
    }));

    const rimeGroupsWithHits = Object.groupBy(
        charactersWithHits,
        (x) => x.rimeGroup,
    );
    const rimeGroupsCompletedValues = Object.keys(rimeGroupsWithHits).reduce(
        (x, y) => ({
            ...x,
            [y]: Math.min(...rimeGroupsWithHits[y].map((y) => y.hit)),
        }),
        {},
    );

    const total = Object.keys(rimeGroupsCompletedValues).length;
    const totalOrdered = orderArray(Object.values(rimeGroupsCompletedValues));
    const penultimateValue = totalOrdered.find((x) => x > totalOrdered[0]);
    if (!penultimateValue) {
        return 0;
    }

    const completed = totalOrdered.filter((x) => x >= penultimateValue).length;
    let progress = 0;
    if (total !== completed) {
        progress = (completed * 100) / total;
    }
    return progress;
}

async function selectChar(currentJA) {
    await sleep(200);
    playLetterSound(currentJA);
    openModal();
    displayRomaji.innerText = alphabet.find(
        (x) => x.term === currentJA,
    ).definition;
    showDrawPath(currentJA);
    btnPlay.onclick = () => playLetterSound(currentJA);
    btnRepeat.onclick = () => showDrawPath(currentJA);
}

async function showDrawPath(currentJA) {
    handleYoon(currentJA);
    if (currentJA.length === 1) {
        await drawMain(currentJA[0]);
    } else {
        await drawMain(currentJA[0]);
        await drawAux(currentJA[1]);
    }
}

function setWriterAux(currentJA) {
    writers.aux = HanziWriter.create(
        "visualizer-target-catalog-aux",
        currentJA,
        {
            ...getDefaultsHanziWriter(),
            width: 150,
            height: 150,
        },
    );
}

function setWriterMain(currentJA) {
    writers.main = HanziWriter.create(
        "visualizer-target-catalog-main",
        currentJA,
        {
            ...getDefaultsHanziWriter(),
            width: 200,
            height: 200,
        },
    );
}

function handleYoon(currentJA) {
    const aux = document.getElementById("visualizer-target-catalog-aux");
    if (currentJA.length === 1) {
        aux.style.minWidth = 0;
        aux.style.marginLeft = 0;
        aux.style.width = 0;
        writers.aux?.hideCharacter();
        return;
    }

    aux.style.minWidth = "150px";
    const smallKanasIds = Object.freeze([22, 27, 32, 63, 68]);
    const largeKanasIds = Object.freeze([40, 144]);
    const char = alphabet.find((x) => x.term === currentJA[0]);
    if (largeKanasIds.includes(char.id)) {
        aux.style.marginLeft = "-100px";
        return;
    } else if (smallKanasIds.includes(char.id)) {
        aux.style.marginLeft = "-50px";
        return;
    }
    aux.style.marginLeft = "-70px";
}

async function drawMain(currentJA) {
    writers.main?.hideCharacter();
    writers.aux?.hideCharacter();
    if (!writers.main) {
        setWriterMain(currentJA);
    }
    writers.main.setCharacter(currentJA);
    await writers.main.animateCharacter();
}

async function drawAux(currentJA) {
    if (!writers.aux) {
        setWriterAux(currentJA);
    }
    writers.aux.setCharacter(currentJA);
    await writers.aux.animateCharacter();
}

function getDefaultsHanziWriter() {
    return {
        showOutline: false,
        strokeColor: "#1cb0f6",
        strokeAnimationSpeed: 1.5,
        delayBetweenStrokes: 200,
        showCharacter: false,
        strokeFadeDuration: 0,
        charDataLoader: (char, onLoad, onError) => {
            fetch(`/src/libs/js/hanzi-writer/data/${char}.json`)
                .then((res) => res.json())
                .then(onLoad)
                .catch(onError);
        },
    };
}

async function openModal() {
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeModal() {
    overlay.classList.remove("active");
    document.body.style.overflow = "auto";
    writers.main?.hideCharacter();
    writers.aux?.hideCharacter();
}
