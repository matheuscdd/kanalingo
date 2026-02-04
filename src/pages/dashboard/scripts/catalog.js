import { levels } from "../../../database/levels.js";
import { getSumFromValues } from "../../../scripts/utils.js";
import { gameState, getTotalScore, playLetterSound } from "./utils.js";

const container = document.getElementById("catalog-container");
const progressBar = document.querySelector('.progress-catalog-bar');
const progressPercentage = document.querySelector('.progress-catalog-percentage');
const placeholder = document.querySelector(".catalog-placeholder");

export function renderCatalog() {
  container.innerHTML = "";
  if (getTotalScore(gameState.scorePerChar) === 0) {
    placeholder.classList.remove('hidden');
    return;
  }

  updateProgressBar();
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
    return { color: level.color, progress: 100, end: true }; // tratativa especial
  }

  const level = levels.find((x) => pts <= x.score);
  const lastCategory = levels.findLast((x) => x.category === level.category);
  const progress = Math.min((pts / lastCategory.score) * 100 + 5, 100);
  return { color: level.color, progress };
}

function updateProgressBar() {
  const total = Object.keys(gameState.scorePerChar).length;
  const totals = Object.values(gameState.scorePerChar).map(getSumFromValues);
  const max = Math.max(...totals);
  const completed = totals.filter(x => x === max).length;
  let progress = 0;
  if (total !== completed) {
    progress = ((completed * 100) / total).toFixed(1);
  }
  progressBar.style.width = `${progress}%`;
  progressPercentage.innerText = `${progress}%`;
}