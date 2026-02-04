import { alphabet, hiragana, katakana, syllableGroups } from "../../../database/letters.js";
import { levels } from "../../../database/levels.js";
import { defaultObj, getSumFromValues, orderArray } from "../../../scripts/utils.js";
import { gameState, getTotalScore, playLetterSound } from "./utils.js";

const container = document.getElementById("catalog-container");
const progressTypingBar = document.querySelector('.progress-typing-catalog-bar');
const progressTypingPercentage = document.querySelector('.progress-typing-catalog-percentage');
const progressListeningBar = document.querySelector('.progress-listening-catalog-bar');
const progressListeningPercentage = document.querySelector('.progress-listening-catalog-percentage');
const placeholder = document.querySelector(".catalog-placeholder");
const visualizer = document.getElementById('drawing-target-catalog');

export function renderCatalog() {
  container.innerHTML = "";
  if (getTotalScore(gameState.scorePerChar) === 0) {
    placeholder.classList.remove('hidden');
    return;
  }

  updateProgressBars();
  placeholder.classList.add('hidden');
  const sorted = Object.keys(gameState.scorePerChar).sort(
    (a, b) => getSumFromValues(gameState.scorePerChar[b]) - getSumFromValues(gameState.scorePerChar[a]),
  );

  sorted.forEach(term => {
    const pts = getSumFromValues(gameState.scorePerChar[term]);
    if (pts === 0 && sorted.length > 20) return; // Oculta os zerados se tiver muitos dados

    const card = document.createElement("div");
    card.classList = "char-card";
    card.onclick = () => playLetterSound(term);

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