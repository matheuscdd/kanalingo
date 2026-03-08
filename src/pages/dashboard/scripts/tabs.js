import { gameState } from "./common/state";

export const tabs = Array.from(document.querySelectorAll(".tab-btn"));
export const tabContents = document.querySelectorAll(".tab-content");
const root = document.documentElement;
export const methods = Array.from(
    document.querySelectorAll(".practice-methods .method-card"),
);

export function initTabEvents() {
    tabs.forEach((tab) => (tab.onclick = () => updateTab(tab)));
    tabs.find((x) => x.dataset.target === gameState.currentDatabase).click();
}

function updateTab(tab) {
    tabContents.forEach((c) => c.classList.remove("active"));

    tab.classList.add("active");
    methods.forEach((x) => x.classList.add("hidden"));
    methods
        .filter((x) => x.dataset[tab.dataset.target])
        .forEach((x) => x.classList.remove("hidden"));
    gameState.currentDatabase = tab.dataset.target;
    localStorage.setItem("currentDatabase", gameState.currentDatabase);

    const colors = Object.freeze({
        green: "var(--duo-green)",
        purple: "var(--beetle)",
        yellow: "var(--duo-yellow)",
        red: "var(--duo-red)",
    });
    root.style.setProperty("--active-theme", colors[tab.dataset.color]);
}
