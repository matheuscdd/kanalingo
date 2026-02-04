import { levels } from "../../../database/levels.js";
import { gameState } from "./utils.js";

export function renderCatalog() {
  const container = document.getElementById("catalog-container");
  container.innerHTML = "";

  const sorted = Object.entries(gameState.scorePerChar).sort(
    (a, b) => b[1] - a[1],
  );

  sorted.forEach(([char, pts]) => {
    if (pts === 0 && sorted.length > 20) return; // Oculta os zerados se tiver muitos dados

    const card = document.createElement("div");
    card.classList = "char-card";
    card.onclick = () => playLetterSound(char);

    const title = document.createElement("div");
    title.textContent = char;
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