import { emit } from '../core/events.js';
import { DEFAULT_SELECTED_BOTS, IMPLEMENTATION_NOTE } from '../core/constants.js';
import { enemyCatalog } from '../data/enemy-config.js';
import { getState, setState, subscribe } from '../core/store.js';

function detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        || 'ontouchstart' in globalThis
        || navigator.maxTouchPoints > 0;
}

function getNextSelectedBots(currentBots, type) {
    const hasType = currentBots.includes(type);

    if (hasType && currentBots.length <= 1) {
        return currentBots;
    }

    return hasType
        ? currentBots.filter(item => item !== type)
        : [...currentBots, type];
}

function resolveHeatColor(hudState) {
    if (hudState.overheated) {
        return '#ff4b5f';
    }

    if (hudState.heatPct > 70) {
        return '#ff9600';
    }

    return '#ffc84d';
}

export function createDomController() {
    const elements = {
        menuOverlay: document.getElementById('menu-overlay'),
        overlayTitle: document.getElementById('overlay-title'),
        overlayDesc: document.getElementById('overlay-desc'),
        controlsInfo: document.getElementById('controls-info'),
        uiLayer: document.getElementById('ui-layer'),
        healthBar: document.getElementById('health-bar'),
        healthValue: document.getElementById('health-value'),
        heatBar: document.getElementById('heat-bar'),
        heatValue: document.getElementById('heat-value'),
        heatBarContainer: document.getElementById('heat-bar-container'),
        waveCounter: document.getElementById('wave-counter'),
        questionBanner: document.getElementById('question-banner'),
        questionText: document.getElementById('question-text'),
        objectiveText: document.getElementById('objective-text'),
        celebrationOverlay: document.getElementById('celebration-overlay'),
        celebrationTitle: document.getElementById('celebration-title'),
        celebrationDesc: document.getElementById('celebration-desc'),
        tankButtons: [...document.querySelectorAll('[data-tank]')],
        modeButtons: [...document.querySelectorAll('[data-mode]')],
        botGrid: document.getElementById('bot-grid'),
        botSupportNote: document.getElementById('bot-support-note')
    };

    const isMobile = detectMobile();
    const teardownHandlers = [];

    function buildBotCards() {
        elements.botGrid.innerHTML = enemyCatalog.map(entry => `
            <button
                class="bot-card${entry.supported ? '' : ' is-planned'}"
                data-bot="${entry.type}"
                type="button"
                ${entry.supported ? '' : 'disabled'}
            >
                <span class="bot-card-icon" style="color:${entry.supported ? 'var(--accent)' : 'var(--accent-warm)'}">
                    <i class="${entry.icon}"></i>
                </span>
                <span class="bot-card-copy">
                    <strong>${entry.label}</strong>
                    <small>${entry.detail}</small>
                </span>
                ${entry.supported ? '' : '<span class="bot-card-badge">Planejado</span>'}
            </button>
        `).join('');
    }

    function bindEvents() {
        for (const button of elements.tankButtons) {
            const handler = () => {
                setState({ selectedTank: button.dataset.tank });
            };
            button.addEventListener('click', handler);
            teardownHandlers.push(() => button.removeEventListener('click', handler));
        }

        for (const button of elements.modeButtons) {
            const handler = () => {
                emit('game:start-requested', { mode: button.dataset.mode });
            };
            button.addEventListener('click', handler);
            teardownHandlers.push(() => button.removeEventListener('click', handler));
        }

        const botHandler = event => {
            const button = event.target.closest('[data-bot]');
            if (!button || button.disabled) {
                return;
            }

            const nextBots = getNextSelectedBots(getState().selectedBots, button.dataset.bot);
            setState({ selectedBots: nextBots.length ? nextBots : [...DEFAULT_SELECTED_BOTS] });
        };

        elements.botGrid.addEventListener('click', botHandler);
        teardownHandlers.push(() => elements.botGrid.removeEventListener('click', botHandler));
    }

    function render(state) {
        const isRunning = state.status === 'playing' || state.status === 'transition';
        const showQuestion = state.status === 'playing';

        elements.menuOverlay.classList.toggle('is-hidden', isRunning);
        elements.uiLayer.classList.toggle('ui-layer-hidden', !isRunning);
        elements.questionBanner.classList.toggle('is-hidden', !showQuestion);
        elements.celebrationOverlay.classList.toggle('is-hidden', !state.celebration.visible);

        elements.overlayTitle.textContent = state.overlay.title;
        elements.overlayDesc.textContent = state.overlay.description;
        elements.waveCounter.textContent = state.waveLabel;
        elements.questionText.textContent = state.questionText;
        elements.objectiveText.textContent = state.objectiveText;
        elements.celebrationTitle.textContent = state.celebration.title;
        elements.celebrationDesc.textContent = state.celebration.description;

        elements.healthBar.style.width = `${state.hud.healthPct}%`;
        elements.healthValue.textContent = state.hud.healthText;

        elements.heatBar.style.width = `${state.hud.heatPct}%`;
        elements.heatValue.textContent = state.hud.heatText;
        elements.heatBar.style.backgroundColor = resolveHeatColor(state.hud);
        elements.heatBarContainer.classList.toggle('is-overheated', state.hud.overheated);

        elements.controlsInfo.innerHTML = isMobile
            ? '<i class="fa-solid fa-mobile-screen-button"></i><span>Mobile entra nas próximas fases com joysticks multitouch. Esta slice inicial está calibrada para desktop.</span>'
            : '<i class="fa-solid fa-keyboard"></i><span><strong>WASD</strong> move, <strong>mouse</strong> mira e dispara. Mobile entra nas próximas fases com joysticks dedicados.</span>';

        elements.botSupportNote.textContent = state.sliceNote || IMPLEMENTATION_NOTE;

        for (const button of elements.tankButtons) {
            button.classList.toggle('is-active', button.dataset.tank === state.selectedTank);
        }

        for (const button of elements.modeButtons) {
            button.classList.toggle('is-active', button.dataset.mode === state.gameMode);
        }

        for (const button of elements.botGrid.querySelectorAll('[data-bot]')) {
            button.classList.toggle('is-active', state.selectedBots.includes(button.dataset.bot));
        }
    }

    buildBotCards();
    bindEvents();
    const unsubscribe = subscribe(render);

    return {
        destroy() {
            unsubscribe();
            for (const dispose of teardownHandlers) {
                dispose();
            }
        }
    };
}