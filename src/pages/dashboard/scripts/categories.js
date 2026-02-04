import { leagues } from "../../../database/levels.js";

function createShield(color) {
  return `
            <svg class="shield-svg" width="40" height="46" viewBox="0 0 40 46" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 0L3 7V20C3 31.05 10.25 41.3 20 44C29.75 41.3 37 31.05 37 20V7L20 0Z" fill="${color}"/>
                <path opacity="0.3" d="M20 5L7 10.35V20C7 28.18 12.54 35.77 20 38.82V5Z" fill="white"/>
            </svg>
        `;
}

export function renderCategories() {
  const grid = document.getElementById("levelsGrid");
  grid.innerHTML = "";

  leagues.forEach((league, index) => {
    const card = document.createElement("div");
    card.className = `level-card ${index === 9 ? "active" : ""}`; // Diamante como exemplo ativo

    card.innerHTML = `
            <div class="level-icon">
                ${createShield(league.color)}
            </div>
            <div class="level-info">
                <span class="level-name">${league.name}</span>
                <span class="level-score">${league.score}</span>
            </div>
            <div class="rank-number">${index + 1}</div>
        `;

    grid.appendChild(card);
  });
}
