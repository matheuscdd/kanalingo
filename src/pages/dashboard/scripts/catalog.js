import { alphabet, hiragana, katakana } from "../../../database/letters.js";
import { levels } from "../../../database/levels.js";
import { getSumFromValues, orderArray, sleep } from "../../../scripts/utils.js";
import { gameState, getTotalScore, playLetterSound } from "./utils.js";

const container = document.getElementById("catalog-container");
const progressTypingBar = document.querySelector('.progress-typing-catalog-bar');
const progressTypingPercentage = document.querySelector('.progress-typing-catalog-percentage');
const progressListeningBar = document.querySelector('.progress-listening-catalog-bar');
const progressListeningPercentage = document.querySelector('.progress-listening-catalog-percentage');
const placeholder = document.querySelector(".catalog-placeholder");
const overlay = document.querySelector('.modal-catalog-overlay');
const btnCloseModal = document.getElementById('close-modal-catalog');
const displayRomaji = document.querySelector('.catalog-display-romaji');
const btnRepeat = document.getElementById('modal-catalog-repeat');
const btnPlay = document.getElementById('modal-catalog-play');

const writers = Object.seal({
  main: null,
  aux: null
});

export function initEventsCatalog() {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  });
}

export function renderCatalog() {
  container.innerHTML = "";
  if (getTotalScore(gameState.scorePerChar) === 0) {
    placeholder.classList.remove('hidden');
    return;
  }

  updateProgressBars();
  btnCloseModal.onclick = closeModal;
  placeholder.classList.add('hidden');
  const sorted = Object.keys(gameState.scorePerChar).sort(
    (a, b) => getSumFromValues(gameState.scorePerChar[b]) - getSumFromValues(gameState.scorePerChar[a]),
  );

  sorted.forEach(term => {
    const pts = getSumFromValues(gameState.scorePerChar[term]);
    if (pts === 0 && sorted.length > 20) return; // Oculta os zerados se tiver muitos dados

    const card = document.createElement("div");
    card.classList = "char-card";
    card.onclick = () => selectChar(term);

    const title = document.createElement("div");
    title.textContent = term;
    title.classList = "jp";
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
}

function updateProgressTypingBar() {
  const total = Object.keys(gameState.scorePerChar).length;
  const totals = Object.values(gameState.scorePerChar).map(x => x.typing ?? 0);
  const max = Math.max(...totals);
  const completed = totals.filter(x => x === max).length;
  let progress = 0;
  if (total !== completed) {
    progress = ((completed * 100) / total).toFixed(1);
  }
  progressTypingBar.style.width = `${progress}%`;
  progressTypingPercentage.innerText = `${progress}%`;
}

function updateProgressListeningBar() {
  const totalAlphabets = 2;
  const progress = ((calcListeningProgress(hiragana) + calcListeningProgress(katakana)) / totalAlphabets).toFixed(1);
  progressListeningBar.style.width = `${progress}%`;
  progressListeningPercentage.innerText = `${progress}%`;
}

function calcListeningProgress(characters) {
  const scorePerChar = 50;
  const charactersWithHits = characters.map(x => ({
    ...x,
    hit: (gameState.scorePerChar[x.term].listening ?? 0) / scorePerChar
  }));

  const syllableGroupsWithHits = Object.groupBy(charactersWithHits, x => x.syllableGroup);
  const syllableGroupsCompletedValues = Object.keys(syllableGroupsWithHits).reduce((x, y) => ({
    ...x,
    [y]: Math.min(...syllableGroupsWithHits[y].map(y => y.hit))
  }), {});

  const total = Object.keys(syllableGroupsCompletedValues).length;
  const totalOrdered = orderArray(Object.values(syllableGroupsCompletedValues));
  const penultimateValue = totalOrdered.find(x => x > totalOrdered[0]);
  if (!penultimateValue) {
    return 0;
  }

  const completed = totalOrdered.filter(x => x >= penultimateValue).length;
  let progress = 0;
  if (total !== completed) {
    progress = (completed * 100) / total;
  }
  return progress;
}

async function selectChar(currentJP) {
  await sleep(200);
  playLetterSound(currentJP);
  openModal();
  displayRomaji.innerText = alphabet.find(x => x.term === currentJP).definition;
  showDrawPath(currentJP);
  btnPlay.onclick = () => playLetterSound(currentJP);
  btnRepeat.onclick = () => showDrawPath(currentJP);
}

async function showDrawPath(currentJP) {
  handleYoon(currentJP);
  if (currentJP.length === 1) {
    await drawMain(currentJP[0]);
  } else {
    await drawMain(currentJP[0]);
    await drawAux(currentJP[1]);
  }
}

function setWriterAux(currentJP) {
  writers.aux = HanziWriter.create('drawing-target-catalog-aux', currentJP, {
    ...getDefaultsHanziWriter(),
    width: 150,
    height: 150,

  });
}

function setWriterMain(currentJP) {
  writers.main = HanziWriter.create('drawing-target-catalog-main', currentJP, {
    ...getDefaultsHanziWriter(),
    width: 200,
    height: 200,
  });
}

function handleYoon(currentJP) {
  const aux = document.getElementById('drawing-target-catalog-aux');
  if (currentJP.length === 1) {
    aux.style.minWidth = 0;
    aux.style.marginLeft = 0;
    aux.style.width = 0;
    writers.aux?.hideCharacter();
    return;
  }

  aux.style.minWidth = '150px';
  const smallKanasIds = Object.freeze([22, 27, 32, 63, 68]);
  const largeKanasIds = Object.freeze([40, 144])
  const char = alphabet.find(x => x.term === currentJP[0]);
  if (largeKanasIds.includes(char.id)) {
    aux.style.marginLeft = '-100px';
    return;
  } else if (smallKanasIds.includes(char.id)) {
    aux.style.marginLeft = '-50px';
    return;
  }
  aux.style.marginLeft = '-70px';
}

async function drawMain(currentJP) {
  writers.main?.hideCharacter();
  writers.aux?.hideCharacter();
  if (!writers.main) {
    setWriterMain(currentJP);
  }
  writers.main.setCharacter(currentJP);
  await writers.main.animateCharacter();
}

async function drawAux(currentJP) {
  if (!writers.aux) {
    setWriterAux(currentJP);
  }
  writers.aux.setCharacter(currentJP);
  await writers.aux.animateCharacter();
}

function getDefaultsHanziWriter() {
  return {
    showOutline: false,
    strokeColor: '#1cb0f6',
    strokeAnimationSpeed: 1.5,
    delayBetweenStrokes: 200,
    showCharacter: false,
    strokeFadeDuration: 0,
    charDataLoader: (char, onLoad, onError) => {
      fetch(`https://raw.githubusercontent.com/szklsrz/kana-json/refs/heads/main/data/${char}.json`)
        .then(res => res.json())
        .then(onLoad)
        .catch(onError);
    }
  }
}

async function openModal() {
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  overlay.classList.remove('active');
  document.body.style.overflow = 'auto';
  writers.main?.hideCharacter();
  writers.aux?.hideCharacter();
}

