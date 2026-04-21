(() => {
const app = globalThis.TiroApp || (globalThis.TiroApp = {});
const { experienceRegistry, getExperienceById, createFairScene, createEduBlockScene } = app;

const sceneFactories = {
    fair: createFairScene,
    edublock: createEduBlockScene
};

const canvas = document.getElementById("render-canvas");
const homeButton = document.getElementById("home-button");
const pauseButton = document.getElementById("pause-button");
const selectionScreen = document.getElementById("selection-screen");
const selectionCards = document.getElementById("selection-cards");
const pauseScreen = document.getElementById("pause-screen");
const resumeButton = document.getElementById("resume-button");
const changeModeButton = document.getElementById("change-mode-button");
const resultScreen = document.getElementById("result-screen");
const resultTitle = document.getElementById("result-title");
const resultSummary = document.getElementById("result-summary");
const replayButton = document.getElementById("replay-button");
const resultModeButton = document.getElementById("result-mode-button");
const hud = document.getElementById("hud");
const flashOverlay = document.getElementById("flash-overlay");
const zoomOverlay = document.getElementById("zoom-overlay");
const crosshair = document.getElementById("crosshair");
const hudMode = document.getElementById("hud-mode");
const hudRule = document.getElementById("hud-rule");
const hudScore = document.getElementById("hud-score");
const hudTimer = document.getElementById("hud-timer");
const feedbackPill = document.getElementById("feedback-pill");

const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

const appState = {
    activeExperienceId: null,
    activeHandle: null,
    paused: false,
    feedbackTimeout: null,
    flashTimeout: null
};

function syncRoute(experienceId) {
    const url = new URL(globalThis.location.href);

    if (experienceId) {
        url.searchParams.set("experience", experienceId);
    } else {
        url.searchParams.delete("experience");
    }

    globalThis.history.replaceState({}, "", url);
}

function createUiApi() {
    return {
        setModeLabel(modeLabel) {
            hudMode.textContent = modeLabel;
        },
        setRule(ruleText) {
            hudRule.textContent = ruleText;
        },
        setScore(nextScore) {
            hudScore.textContent = String(nextScore);
        },
        setTimer(nextTimer) {
            hudTimer.textContent = String(nextTimer);
        },
        showFeedback(text, tone) {
            feedbackPill.textContent = text;
            feedbackPill.classList.remove("hidden", "feedback-pill--positive", "feedback-pill--negative");
            feedbackPill.classList.add(tone === "positive" ? "feedback-pill--positive" : "feedback-pill--negative");
            clearTimeout(appState.feedbackTimeout);
            appState.feedbackTimeout = globalThis.setTimeout(() => {
                feedbackPill.classList.add("hidden");
            }, 800);
        },
        flashScreen(tone) {
            flashOverlay.classList.remove("hidden", "flash-overlay--positive", "flash-overlay--negative");
            flashOverlay.classList.add(tone === "positive" ? "flash-overlay--positive" : "flash-overlay--negative");
            flashOverlay.style.opacity = "1";
            clearTimeout(appState.flashTimeout);
            appState.flashTimeout = globalThis.setTimeout(() => {
                flashOverlay.style.opacity = "0";
                globalThis.setTimeout(() => {
                    flashOverlay.classList.add("hidden");
                }, 140);
            }, 90);
        },
        setZoomOverlay(enabled) {
            zoomOverlay.classList.toggle("hidden", !enabled);
            crosshair.classList.toggle("hidden", enabled);
        }
    };
}

const ui = createUiApi();

function renderSelectionCards() {
    selectionCards.innerHTML = experienceRegistry.map((experience) => {
        return `
            <button class="mode-card" type="button" data-experience-id="${experience.id}">
                <span class="mode-card__chip"><i class="${experience.icon}"></i>${experience.eyebrow}</span>
                <h2 class="mode-card__title">${experience.title}</h2>
                <p class="mode-card__text">${experience.description}</p>
                <span class="mode-card__footer">
                    <span>Mesmo tiro</span>
                    <i class="fa-solid fa-arrow-right"></i>
                </span>
            </button>
        `;
    }).join("");
}

function setSelectionVisible(isVisible) {
    selectionScreen.classList.toggle("hidden", !isVisible);
    selectionScreen.classList.toggle("screen-panel--visible", isVisible);
}

function setPauseVisible(isVisible) {
    pauseScreen.classList.toggle("hidden", !isVisible);
    pauseScreen.classList.toggle("screen-panel--visible", isVisible);
}

function setResultVisible(isVisible) {
    resultScreen.classList.toggle("hidden", !isVisible);
    resultScreen.classList.toggle("screen-panel--visible", isVisible);
}

function setPlayingUiVisible(isVisible) {
    hud.classList.toggle("hidden", !isVisible);
    crosshair.classList.toggle("hidden", !isVisible);
    homeButton.classList.toggle("hidden", !isVisible);
    pauseButton.classList.toggle("hidden", !isVisible);
    feedbackPill.classList.add("hidden");
    flashOverlay.classList.add("hidden");
    flashOverlay.style.opacity = "0";
    zoomOverlay.classList.add("hidden");
}

function disposeActiveScene() {
    if (!appState.activeHandle) {
        return;
    }

    appState.activeHandle.dispose();
    appState.activeHandle = null;
    appState.activeExperienceId = null;
}

function returnToSelection() {
    appState.paused = false;
    disposeActiveScene();
    setPauseVisible(false);
    setResultVisible(false);
    setPlayingUiVisible(false);
    setSelectionVisible(true);
    syncRoute(null);
    ui.setModeLabel("-");
    ui.setRule("Escolha uma experiência para iniciar.");
    ui.setScore(0);
    ui.setTimer(60);
}

function pauseCurrentExperience() {
    if (!appState.activeHandle || appState.paused) {
        return;
    }

    appState.paused = true;
    appState.activeHandle.pause();
    setSelectionVisible(false);
    setResultVisible(false);
    setPauseVisible(true);
    setPlayingUiVisible(false);
}

function resumeCurrentExperience() {
    if (!appState.activeHandle) {
        return;
    }

    appState.paused = false;
    appState.activeHandle.resume();
    setSelectionVisible(false);
    setResultVisible(false);
    setPauseVisible(false);
    setPlayingUiVisible(true);
}

function showRoundResult(summary) {
    appState.paused = false;
    setSelectionVisible(false);
    setPauseVisible(false);
    setResultVisible(true);
    setPlayingUiVisible(false);

    resultTitle.textContent = `${summary.title} concluída`;
    resultSummary.innerHTML = [
        `Pontuação final: <strong>${summary.score}</strong>`,
        `Acertos: <strong>${summary.hits}</strong>`,
        `Tiros disparados: <strong>${summary.shots}</strong>`,
        `Duração da rodada: <strong>${summary.duration}s</strong>`
    ].join("<br>");
}

function startExperience(experienceId) {
    const experience = getExperienceById(experienceId);
    const factory = sceneFactories[experienceId];

    if (!experience || !factory) {
        return;
    }

    disposeActiveScene();
    appState.activeExperienceId = experienceId;
    appState.activeHandle = factory({
        engine,
        canvas,
        ui,
        appState,
        onPauseRequested: pauseCurrentExperience,
        onRoundComplete: showRoundResult
    });
    appState.paused = false;
    ui.setModeLabel(experience.title);
    ui.setScore(0);
    ui.setTimer(60);
    syncRoute(experienceId);
    setSelectionVisible(false);
    setPauseVisible(false);
    setResultVisible(false);
    setPlayingUiVisible(true);
    appState.activeHandle.focus();
}

renderSelectionCards();
setSelectionVisible(true);
setPauseVisible(false);
setResultVisible(false);
setPlayingUiVisible(false);
ui.setRule("Escolha uma experiência para iniciar.");

const requestedExperienceId = new URL(globalThis.location.href).searchParams.get("experience");
if (getExperienceById(requestedExperienceId)) {
    startExperience(requestedExperienceId);
}

selectionCards.addEventListener("click", (event) => {
    const button = event.target.closest("[data-experience-id]");
    if (!button) {
        return;
    }

    startExperience(button.dataset.experienceId);
});

homeButton.addEventListener("click", returnToSelection);
pauseButton.addEventListener("click", pauseCurrentExperience);
resumeButton.addEventListener("click", resumeCurrentExperience);
changeModeButton.addEventListener("click", returnToSelection);
replayButton.addEventListener("click", () => {
    if (appState.activeExperienceId) {
        startExperience(appState.activeExperienceId);
    }
});
resultModeButton.addEventListener("click", returnToSelection);

engine.runRenderLoop(() => {
    if (!appState.activeHandle) {
        return;
    }

    appState.activeHandle.scene.render();
});

globalThis.addEventListener("resize", () => {
    engine.resize();
});
})();