import { getSavedQuiz, insertHistoryPractice } from "../../../src/scripts/quizzes.js";
import { shuffleArray } from "../../../src/scripts/utils.js";

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Identifica se é dispositivo móvel (Touch)
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.matchMedia('(pointer: coarse)').matches;

let questions = [];

// Atualiza info de comandos
globalThis.addEventListener('DOMContentLoaded', async () => {
    const data = await getSavedQuiz();
    if (!data) return;
    questions = data.questions;
    console.log(questions)


    if (isMobile) {
        controlsInfo.innerHTML = "👆 <strong>Use os analógicos fixos</strong>: Esquerdo para mover, Direito para mirar e atirar";
    }
    initializeStudentModal();
});

// UI Elements
const healthBar = document.getElementById('health-bar');
const heatBar = document.getElementById('heat-bar');
const heatBarContainer = document.getElementById('heat-bar-container');
const waveCounter = document.getElementById('wave-counter');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayDesc = document.getElementById('overlay-desc');
const controlsInfo = document.getElementById('controls-info');
const questionBanner = document.getElementById('question-banner');
const questionText = document.getElementById('question-text');
const objectiveText = document.getElementById('objective-text');
const studentModal = document.getElementById('student-modal');
const studentNameInput = document.getElementById('student-name-input');
const studentNameSubmit = document.getElementById('student-name-submit');
const studentNameError = document.getElementById('student-name-error');

const celebOverlay = document.getElementById('celebration-overlay');
const celebTitle = document.getElementById('celebration-title');
const celebDesc = document.getElementById('celebration-desc');

const PLAYER_NAME_STORAGE_KEY = 'player_name';
let studentName = '';

function randomNum() {
    return Math.random() - 0.5;
}

function getStudentNameValidationError(name) {
    const trimmed = name.trim();
    if (!trimmed) return 'Digite seu nome para continuar.';
    if (trimmed.length < 3 || trimmed.length > 20) return 'Use entre 3 e 20 letras.';
    if (!/^[\p{L}]+$/u.test(trimmed)) return 'Use apenas letras, sem numeros, espacos ou simbolos.';
    return '';
}

function isStudentNameValid(name) {
    return getStudentNameValidationError(name) === '';
}

function setStudentNameError(message) {
    if (!message) {
        studentNameError.textContent = '';
        studentNameError.classList.add('hidden');
        studentNameInput.classList.remove('invalid');
        return;
    }

    studentNameError.textContent = message;
    studentNameError.classList.remove('hidden');
    studentNameInput.classList.add('invalid');
}

function lockGamePreview() {
    document.body.classList.add('name-lock');
}

function unlockGamePreview() {
    document.body.classList.remove('name-lock');
}

function showStudentModal(prefill = '') {
    lockGamePreview();
    if (typeof studentModal.showModal === 'function') {
        if (!studentModal.open) studentModal.showModal();
    }
    studentModal.classList.remove('hidden');
    studentNameInput.value = prefill;
    setStudentNameError('');
    studentNameInput.focus();
    studentNameInput.select();
}

function hideStudentModal() {
    if (typeof studentModal.close === 'function' && studentModal.open) {
        studentModal.close();
    }
    studentModal.classList.add('hidden');
    unlockGamePreview();
}

function readStoredStudentName() {
    try {
        const storedValue = localStorage.getItem(PLAYER_NAME_STORAGE_KEY) || '';
        const normalized = storedValue.trim();
        return isStudentNameValid(normalized) ? normalized : '';
    } catch (error) {
        console.warn('Nao foi possivel ler o nome salvo no localStorage.', error);
        return '';
    }
}

function storeStudentName(name) {
    try {
        localStorage.setItem(PLAYER_NAME_STORAGE_KEY, name);
    } catch (error) {
        console.warn('Nao foi possivel salvar o nome no localStorage.', error);
    }
}

function submitStudentName() {
    const normalized = studentNameInput.value.trim();
    const validationError = getStudentNameValidationError(normalized);

    if (validationError) {
        setStudentNameError(validationError);
        studentNameInput.focus();
        return false;
    }

    studentName = normalized;
    storeStudentName(normalized);
    setStudentNameError('');
    hideStudentModal();
    return true;
}

function initializeStudentModal() {
    studentName = readStoredStudentName();
    showStudentModal(studentName);

    studentModal.addEventListener('cancel', (event) => {
        event.preventDefault();
    });
    studentModal.addEventListener('close', () => {
        if (!isStudentNameValid(studentName)) {
            showStudentModal(readStoredStudentName() || studentNameInput.value.trim());
            setStudentNameError('Confirme um nome valido para continuar.');
        }
    });
    studentNameSubmit.addEventListener('click', submitStudentName);
    studentNameInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            submitStudentName();
        }
    });
    studentNameInput.addEventListener('input', () => {
        const maybeError = getStudentNameValidationError(studentNameInput.value);
        if (!maybeError) {
            setStudentNameError('');
        }
    });
}

const enemyConfig = {
    'ranged': { color: '#1cb0f6', desc: 'Orbita' },
    'melee': { color: '#ff4b4b', desc: 'Bate Corre' },
    'shield': { color: '#ffc800', desc: 'ZigZag' },
    'builder': { color: '#ff9600', desc: 'Foge Caixas' },
    'aoe': { color: '#ce82ff', desc: 'Aleatório' },
    'laser': { color: '#2b70c9', desc: 'Patrulha' },
    'chaser': { color: '#ff007f', desc: 'Persegue' },
    'acid': { color: '#8aff00', desc: 'Rastro Tóxico' },
    'mimic': { color: '#ffffff', desc: 'Segue Rastro e Bombas' },
    'electric': { color: '#00ffff', desc: 'Raios e Previsão' },
    'turreteer': { color: '#ff00aa', desc: 'Planta Torres' },
    'ice': { color: '#0088ff', desc: 'Cone Congelante' },
    'bouncer': { color: '#ff00ff', desc: 'Esferas Ricochete' }
};

let currentTankSelection = 'normal';
function selectTank(type) {
    currentTankSelection = type;
    document.getElementById('tank-normal').classList.remove('active');
    document.getElementById('tank-lobber').classList.remove('active');
    document.getElementById('tank-' + type).classList.add('active');
}

let selectedBots = ['ranged', 'melee', 'shield', 'builder', 'aoe', 'laser', 'chaser', 'acid', 'mimic', 'electric', 'turreteer', 'ice', 'bouncer'];

function toggleBot(element, type) {
    let index = selectedBots.indexOf(type);
    if (index > -1) {
        if (selectedBots.length <= 1) return; // Não permite deixar 0 bots
        selectedBots.splice(index, 1);
        element.classList.add('bot-inactive');
    } else {
        selectedBots.push(type);
        element.classList.remove('bot-inactive');
    }
}

// Game Objects, Arena & State
let width, height;
const arenaWidth = 3200;
const arenaHeight = 3200;
let camera = { x: 0, y: 0 };

let obstacles = [];
let breakableBlocks = [];
let bushes = [];
let mines = [];
let spikes = [];
let lavas = [];
let acidTrails = [];
let crossBombs = [];
let lightningSpheres = [];
let bouncingSpheres = [];
let lobbedBullets = [];
let powerUps = [];
let miniTurrets = [];
let player = null;
let enemies = [];
let bullets = [];
let particles = [];
let shrapnels = [];
let floatingTexts = [];

let currentQuestionIndex = 0;
let gameState = 'MENU';
let gameMode = 'MODE_CORRECT';
let results = [];
let questionStartTime = 0;
let questionDecided = false;
let lastTime = 0;
let cameraShake = 0;

// Sistema de Água Subindo
let waterY = arenaHeight;
let waterActive = false;
let waveTimer = 0;
let waterWarningShown = false;

const gameContainer = document.getElementById('game-container');

// --- CONTROLES VIRTUAIS (TOUCH E ORIENTACAO FAKE) ---
let touchLeft = { id: null, baseX: 0, baseY: 0, stickX: 0, stickY: 0, active: false };
let touchRight = { id: null, baseX: 0, baseY: 0, stickX: 0, stickY: 0, active: false };

if (isMobile) {
    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    canvas.addEventListener('touchmove', handleTouch, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });
}

function handleTouch(e) {
    if (gameState !== 'PLAYING' && gameState !== 'TRANSITION') return;
    e.preventDefault();

    let isFakeLandscape = isMobile && window.innerWidth < window.innerHeight;
    const bannerEl = document.getElementById('question-banner');
    const canvasOffsetY = (!isFakeLandscape && bannerEl && !bannerEl.classList.contains('hidden'))
        ? bannerEl.offsetHeight : 0;

    for (let i = 0; i < e.changedTouches.length; i++) {
        let t = e.changedTouches[i];
        let tx = t.clientX;
        let ty = t.clientY;

        let gameTx = tx;
        let gameTy = ty - canvasOffsetY;

        if (isFakeLandscape) {
            gameTx = ty;
            gameTy = window.innerWidth - tx;
        }

        if (e.type === 'touchstart') {
            if (gameTx < width / 2 && !touchLeft.active) {
                touchLeft.id = t.identifier;
                touchLeft.stickX = gameTx; touchLeft.stickY = gameTy;
                touchLeft.active = true;
            } else if (gameTx >= width / 2 && !touchRight.active) {
                touchRight.id = t.identifier;
                touchRight.stickX = gameTx; touchRight.stickY = gameTy;
                touchRight.active = true;
            }
        } else if (e.type === 'touchmove') {
            if (touchLeft.active && t.identifier === touchLeft.id) {
                touchLeft.stickX = gameTx; touchLeft.stickY = gameTy;
            }
            if (touchRight.active && t.identifier === touchRight.id) {
                touchRight.stickX = gameTx; touchRight.stickY = gameTy;
            }
        }
    }
}

function handleTouchEnd(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
        let t = e.changedTouches[i];
        if (touchLeft.active && t.identifier === touchLeft.id) {
            touchLeft.active = false; touchLeft.id = null;
        }
        if (touchRight.active && t.identifier === touchRight.id) {
            touchRight.active = false; touchRight.id = null;
        }
    }
}

function getJoystickVector(touch) {
    if (!touch.active) return { x: 0, y: 0, distance: 0, rawDx: 0, rawDy: 0 };
    const maxDist = 50;
    let dx = touch.stickX - touch.baseX;
    let dy = touch.stickY - touch.baseY;
    let distance = Math.hypot(dx, dy);

    if (distance > maxDist) {
        dx = (dx / distance) * maxDist;
        dy = (dy / distance) * maxDist;
        distance = maxDist;
    }
    return { x: dx / maxDist, y: dy / maxDist, distance: distance, rawDx: dx, rawDy: dy };
}

function drawJoysticks(ctx) {
    if (!isMobile) return;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;

    ctx.beginPath(); ctx.arc(touchLeft.baseX, touchLeft.baseY, 60, 0, Math.PI * 2);
    ctx.fillStyle = '#888'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke();

    let vL = getJoystickVector(touchLeft);
    ctx.beginPath(); ctx.arc(touchLeft.baseX + vL.rawDx, touchLeft.baseY + vL.rawDy, 25, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();

    ctx.beginPath(); ctx.arc(touchRight.baseX, touchRight.baseY, 60, 0, Math.PI * 2);
    ctx.fillStyle = '#ff0055'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke();

    let vR = getJoystickVector(touchRight);
    ctx.beginPath(); ctx.arc(touchRight.baseX + vR.rawDx, touchRight.baseY + vR.rawDy, 25, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();

    ctx.restore();
}

// --- FUNÇÕES DE GERAÇÃO E COLISÃO ---

function rect(x, y, w, h) {
    return { x, y, w, h };
}

function point(x, y, extra = {}) {
    return { x, y, ...extra };
}

function cloneRectList(items) {
    return items.map(item => ({ ...item }));
}

function cloneBreakableList(items) {
    return items.map(item => {
        const maxHp = item.maxHp ?? 100;
        return { x: item.x, y: item.y, w: item.w, h: item.h, hp: maxHp, maxHp };
    });
}

const fixedWaveMaps = [
    {
        bushes: [
            rect(180, 180, 360, 220), rect(2660, 180, 360, 220),
            rect(180, 2800, 360, 220), rect(2660, 2800, 360, 220),
            rect(760, 620, 240, 180), rect(2200, 620, 240, 180),
            rect(760, 2400, 240, 180), rect(2200, 2400, 240, 180),
            rect(1360, 320, 480, 160), rect(1360, 2720, 480, 160)
        ],
        obstacles: [
            rect(1320, 1040, 560, 120), rect(1320, 2040, 560, 120),
            rect(1040, 1320, 120, 560), rect(2040, 1320, 120, 560),
            rect(780, 980, 180, 180), rect(2240, 980, 180, 180),
            rect(780, 2040, 180, 180), rect(2240, 2040, 180, 180)
        ],
        breakableBlocks: [
            rect(1450, 860, 100, 100), rect(1650, 860, 100, 100),
            rect(1450, 2240, 100, 100), rect(1650, 2240, 100, 100),
            rect(860, 1450, 100, 100), rect(860, 1650, 100, 100),
            rect(2240, 1450, 100, 100), rect(2240, 1650, 100, 100),
            rect(520, 880, 90, 90), rect(2590, 880, 90, 90),
            rect(520, 2230, 90, 90), rect(2590, 2230, 90, 90)
        ],
        mines: [
            point(1100, 1100), point(2100, 1100), point(1100, 2100), point(2100, 2100),
            point(1600, 760), point(1600, 2440)
        ],
        spikes: [
            point(1600, 1000), point(1600, 2200), point(1000, 1600), point(2200, 1600),
            point(1280, 1280), point(1920, 1280), point(1280, 1920), point(1920, 1920)
        ],
        lavas: [
            point(700, 1600, { radius: 60 }), point(2500, 1600, { radius: 60 }),
            point(1600, 700, { radius: 70 }), point(1600, 2500, { radius: 70 })
        ]
    },
    {
        bushes: [
            rect(180, 560, 300, 200), rect(2720, 560, 300, 200),
            rect(180, 2440, 300, 200), rect(2720, 2440, 300, 200),
            rect(620, 1400, 260, 260), rect(2320, 1400, 260, 260),
            rect(1400, 620, 260, 260), rect(1400, 2320, 260, 260),
            rect(980, 280, 320, 180), rect(1900, 2740, 320, 180)
        ],
        obstacles: [
            rect(780, 780, 180, 900), rect(2240, 1520, 180, 900),
            rect(780, 2240, 900, 180), rect(1520, 780, 900, 180),
            rect(1260, 1260, 120, 120), rect(1820, 1260, 120, 120),
            rect(1260, 1820, 120, 120), rect(1820, 1820, 120, 120)
        ],
        breakableBlocks: [
            rect(1040, 1040, 90, 90), rect(1180, 1180, 90, 90), rect(1320, 1320, 90, 90),
            rect(1790, 1790, 90, 90), rect(1930, 1930, 90, 90), rect(2070, 2070, 90, 90),
            rect(2070, 1040, 90, 90), rect(1930, 1180, 90, 90), rect(1790, 1320, 90, 90),
            rect(1040, 2070, 90, 90), rect(1180, 1930, 90, 90), rect(1320, 1790, 90, 90)
        ],
        mines: [
            point(900, 1600), point(2300, 1600), point(1600, 900), point(1600, 2300),
            point(1180, 2500), point(2020, 700)
        ],
        spikes: [
            point(1280, 1600), point(1920, 1600), point(1600, 1280), point(1600, 1920),
            point(700, 1200), point(2500, 2000), point(700, 2000), point(2500, 1200)
        ],
        lavas: [
            point(540, 540, { radius: 70 }), point(2660, 540, { radius: 70 }),
            point(540, 2660, { radius: 70 }), point(2660, 2660, { radius: 70 })
        ]
    },
    {
        bushes: [
            rect(260, 1180, 300, 220), rect(2640, 1180, 300, 220),
            rect(520, 420, 260, 180), rect(2420, 420, 260, 180),
            rect(520, 2600, 260, 180), rect(2420, 2600, 260, 180),
            rect(1260, 300, 280, 160), rect(1660, 2740, 280, 160),
            rect(1260, 2740, 280, 160), rect(1660, 300, 280, 160)
        ],
        obstacles: [
            rect(680, 760, 140, 760), rect(1320, 760, 140, 560),
            rect(1960, 760, 140, 760), rect(2380, 1400, 140, 780),
            rect(1100, 1940, 560, 140), rect(1660, 1180, 560, 140),
            rect(820, 2480, 760, 140), rect(1780, 520, 760, 140)
        ],
        breakableBlocks: [
            rect(900, 1640, 90, 90), rect(1040, 1640, 90, 90), rect(1180, 1640, 90, 90),
            rect(1930, 1460, 90, 90), rect(2070, 1460, 90, 90), rect(2210, 1460, 90, 90),
            rect(1460, 1040, 90, 90), rect(1600, 1040, 90, 90), rect(1740, 1040, 90, 90),
            rect(1460, 2140, 90, 90), rect(1600, 2140, 90, 90), rect(1740, 2140, 90, 90)
        ],
        mines: [
            point(940, 940), point(2260, 940), point(940, 2260), point(2260, 2260),
            point(1380, 2440), point(1820, 760)
        ],
        spikes: [
            point(1600, 860), point(1600, 2340), point(860, 1600), point(2340, 1600),
            point(1180, 1460), point(2020, 1740), point(1320, 2300), point(1880, 900)
        ],
        lavas: [
            point(760, 1760, { radius: 80 }), point(2440, 1440, { radius: 80 }),
            point(1260, 2520, { radius: 60 }), point(1940, 680, { radius: 60 })
        ]
    },
    {
        bushes: [
            rect(220, 860, 280, 180), rect(2700, 860, 280, 180),
            rect(220, 2160, 280, 180), rect(2700, 2160, 280, 180),
            rect(860, 220, 180, 280), rect(2160, 220, 180, 280),
            rect(860, 2700, 180, 280), rect(2160, 2700, 180, 280),
            rect(1360, 1360, 200, 120), rect(1640, 1720, 200, 120)
        ],
        obstacles: [
            rect(360, 960, 980, 140), rect(1860, 960, 980, 140),
            rect(360, 2100, 980, 140), rect(1860, 2100, 980, 140),
            rect(960, 360, 140, 980), rect(2100, 360, 140, 980),
            rect(960, 1860, 140, 980), rect(2100, 1860, 140, 980)
        ],
        breakableBlocks: [
            rect(1420, 940, 90, 90), rect(1690, 940, 90, 90),
            rect(1420, 2170, 90, 90), rect(1690, 2170, 90, 90),
            rect(940, 1420, 90, 90), rect(940, 1690, 90, 90),
            rect(2170, 1420, 90, 90), rect(2170, 1690, 90, 90),
            rect(700, 700, 90, 90), rect(2410, 700, 90, 90),
            rect(700, 2410, 90, 90), rect(2410, 2410, 90, 90)
        ],
        mines: [
            point(1460, 720), point(1740, 720), point(1460, 2480), point(1740, 2480),
            point(720, 1460), point(2480, 1740)
        ],
        spikes: [
            point(1600, 1180), point(1600, 2020), point(1180, 1600), point(2020, 1600),
            point(640, 1600), point(2560, 1600), point(1600, 640), point(1600, 2560)
        ],
        lavas: [
            point(1240, 1240, { radius: 65 }), point(1960, 1240, { radius: 65 }),
            point(1240, 1960, { radius: 65 }), point(1960, 1960, { radius: 65 })
        ]
    },
    {
        bushes: [
            rect(320, 320, 260, 180), rect(2620, 320, 260, 180),
            rect(320, 2700, 260, 180), rect(2620, 2700, 260, 180),
            rect(840, 1380, 180, 260), rect(2180, 1380, 180, 260),
            rect(1380, 840, 260, 180), rect(1380, 2180, 260, 180),
            rect(760, 760, 220, 160), rect(2220, 2220, 220, 160)
        ],
        obstacles: [
            rect(1240, 920, 720, 120), rect(1240, 2160, 720, 120),
            rect(920, 1240, 120, 720), rect(2160, 1240, 120, 720),
            rect(1180, 1180, 140, 140), rect(1880, 1180, 140, 140),
            rect(1180, 1880, 140, 140), rect(1880, 1880, 140, 140),
            rect(520, 520, 220, 220), rect(2460, 520, 220, 220),
            rect(520, 2460, 220, 220), rect(2460, 2460, 220, 220)
        ],
        breakableBlocks: [
            rect(1450, 760, 90, 90), rect(1650, 760, 90, 90),
            rect(1450, 2350, 90, 90), rect(1650, 2350, 90, 90),
            rect(760, 1450, 90, 90), rect(760, 1650, 90, 90),
            rect(2350, 1450, 90, 90), rect(2350, 1650, 90, 90),
            rect(980, 980, 90, 90), rect(2130, 980, 90, 90),
            rect(980, 2130, 90, 90), rect(2130, 2130, 90, 90)
        ],
        mines: [
            point(1100, 1100), point(2100, 1100), point(1100, 2100), point(2100, 2100),
            point(1600, 560), point(1600, 2640), point(560, 1600), point(2640, 1600)
        ],
        spikes: [
            point(1320, 1600), point(1880, 1600), point(1600, 1320), point(1600, 1880),
            point(900, 900), point(2300, 900), point(900, 2300), point(2300, 2300)
        ],
        lavas: [
            point(820, 1600, { radius: 75 }), point(2380, 1600, { radius: 75 }),
            point(1600, 820, { radius: 75 }), point(1600, 2380, { radius: 75 })
        ]
    }
];

function loadFixedMapLayout(waveIndex) {
    const layout = fixedWaveMaps[Math.max(0, Math.min(waveIndex, fixedWaveMaps.length - 1))];
    bushes = cloneRectList(layout.bushes);
    obstacles = cloneRectList(layout.obstacles);
    breakableBlocks = cloneBreakableList(layout.breakableBlocks);
    mines = layout.mines.map(mine => new Mine(mine.x, mine.y));
    spikes = layout.spikes.map(spike => new Spike(spike.x, spike.y));
    lavas = layout.lavas.map(lava => new Lava(lava.x, lava.y, lava.radius));
}

function isCircleTouchingRect(x, y, radius, rectObj, pad = 0) {
    const closestX = Math.max(rectObj.x - pad, Math.min(x, rectObj.x + rectObj.w + pad));
    const closestY = Math.max(rectObj.y - pad, Math.min(y, rectObj.y + rectObj.h + pad));
    return Math.hypot(x - closestX, y - closestY) < radius;
}

function isSpawnPositionBlocked(x, y, radius = 35) {
    return obstacles.some(obs => isCircleTouchingRect(x, y, radius, obs, 12)) ||
        breakableBlocks.some(block => isCircleTouchingRect(x, y, radius, block, 12)) ||
        mines.some(mine => Math.hypot(x - mine.x, y - mine.y) < radius + mine.radius + 20) ||
        spikes.some(spike => Math.hypot(x - spike.x, y - spike.y) < radius + spike.radius + 18) ||
        lavas.some(lava => Math.hypot(x - lava.x, y - lava.y) < radius + lava.radius + 12);
}

function findFreeEnemySpawnPoint(minDistanceFromPlayer, radius = 35) {
    for (let attempt = 0; attempt < 140; attempt++) {
        const candidate = {
            x: Math.random() * (arenaWidth - 200) + 100,
            y: Math.random() * (waterY - 200) + 100
        };
        if (player && Math.hypot(candidate.x - player.x, candidate.y - player.y) < minDistanceFromPlayer) continue;
        if (isSpawnPositionBlocked(candidate.x, candidate.y, radius)) continue;
        return candidate;
    }

    const fallbackPoints = [
        { x: 220, y: 220 },
        { x: arenaWidth - 220, y: 220 },
        { x: 220, y: Math.max(220, waterY - 220) },
        { x: arenaWidth - 220, y: Math.max(220, waterY - 220) },
        { x: arenaWidth / 2, y: 220 }
    ];

    return fallbackPoints.find(candidate => {
        const farEnough = !player || Math.hypot(candidate.x - player.x, candidate.y - player.y) >= minDistanceFromPlayer;
        return farEnough && !isSpawnPositionBlocked(candidate.x, candidate.y, radius);
    }) || { x: 220, y: 220 };
}

function checkHidden(entity) {
    entity.isHidden = false;
    entity.currentBush = null;
    if (entity.revealTimer && entity.revealTimer > 0) return;
    for (let b of bushes) {
        if (entity.x > b.x && entity.x < b.x + b.w && entity.y > b.y && entity.y < b.y + b.h) {
            entity.isHidden = true; entity.currentBush = b; break;
        }
    }
}

function resolveCollision(entity) {
    let colliders = [...obstacles, ...breakableBlocks];
    for (let obs of colliders) {
        let closestX = Math.max(obs.x, Math.min(entity.x, obs.x + obs.w));
        let closestY = Math.max(obs.y, Math.min(entity.y, obs.y + obs.h));
        let distanceX = entity.x - closestX;
        let distanceY = entity.y - closestY;
        let distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

        if (distanceSquared < (entity.radius * entity.radius)) {
            let distance = Math.sqrt(distanceSquared);
            let overlap = entity.radius - distance;
            if (distance === 0) entity.y -= overlap;
            else {
                entity.x += (distanceX / distance) * overlap;
                entity.y += (distanceY / distance) * overlap;
            }
        }
    }
}

function adjustCanvasSize() {
    let isFakeLandscape = isMobile && window.innerWidth < window.innerHeight;

    if (isFakeLandscape) {
        width = window.innerHeight;
        height = window.innerWidth;
        gameContainer.style.width = width + 'px';
        gameContainer.style.height = height + 'px';
        gameContainer.style.position = 'absolute';
        gameContainer.style.top = '0px';
        gameContainer.style.left = window.innerWidth + 'px';
        gameContainer.style.transformOrigin = 'top left';
        gameContainer.style.transform = 'rotate(90deg)';
    } else {
        const bannerEl = document.getElementById('question-banner');
        const bannerH = (bannerEl && !bannerEl.classList.contains('hidden')) ? bannerEl.offsetHeight : 0;
        width = window.innerWidth;
        height = window.innerHeight - bannerH;
        gameContainer.style.width = '100%';
        gameContainer.style.height = '100%';
        gameContainer.style.position = 'relative';
        gameContainer.style.top = '0px';
        gameContainer.style.left = '0px';
        gameContainer.style.transformOrigin = 'center center';
        gameContainer.style.transform = 'none';
    }

    canvas.width = width;
    canvas.height = height;

    if (isMobile) {
        touchLeft.baseX = 90;
        touchLeft.baseY = height - 90;
        touchRight.baseX = width - 90;
        touchRight.baseY = height - 90;
    }

    if (gameState === 'MENU') {
        loadFixedMapLayout(0);
    }
}



const keys = { w: false, a: false, s: false, d: false };
const mouse = { screenX: window.innerWidth / 2, screenY: window.innerHeight / 2, worldX: 0, worldY: 0, down: false };

window.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key)) keys[key] = true;
});
window.addEventListener('keyup', e => {
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key)) keys[key] = false;
});
window.addEventListener('mousemove', e => {
    let tx = e.clientX;
    let ty = e.clientY;
    let isFakeLandscape = isMobile && window.innerWidth < window.innerHeight;

    if (isFakeLandscape) {
        mouse.screenX = ty;
        mouse.screenY = window.innerWidth - tx;
    } else {
        const rect = canvas.getBoundingClientRect();
        mouse.screenX = tx - rect.left;
        mouse.screenY = ty - rect.top;
    }
});

window.addEventListener('mousedown', e => {
    if (e.button === 0) mouse.down = true;
});
window.addEventListener('mouseup', e => {
    if (e.button === 0) mouse.down = false;
});

// --- CLASSES DO JOGO ---

class Player {
    constructor() {
        this.x = arenaWidth / 2;
        this.y = arenaHeight / 2;
        this.radius = 20;
        this.speed = 350;
        this.maxHp = 100;
        this.hp = 100;
        this.color = '#00aaff';

        this.tankType = currentTankSelection;
        this.fireRate = this.tankType === 'lobber' ? 0.6 : 0.2;

        this.heat = 0;
        this.maxHeat = 100;
        this.heatPerShot = this.tankType === 'lobber' ? 34 : 22;
        this.cooldownRate = 45;
        this.isOverheated = false;

        this.isHidden = false;
        this.currentBush = null;
        this.revealTimer = 0;
        this.flashTimer = 0;
        this.hullAngle = 0;
        this.aimAngle = 0;
        this.aimDist = 0;
        this.trackOffset = 0;
        this.damageTimer = 0;

        this.pathHistory = [];
        this.pathTimer = 0;

        this.isAiming = false;
        this.wasAiming = false;
        this.burstShotsRemaining = 0;
        this.burstTimer = 0;
        this.lastShot = 0;
        this.lastAimSource = 'mouse';

        this.invisibilityTimer = 0;
        this.isInvisible = false;

        this.isFrozen = false;
        this.freezeWiggleCount = 0;
        this.lastWiggleDir = null;

        this.vx = 0;
        this.vy = 0;
    }

    update(dt) {
        this.pathTimer -= dt;
        if (this.pathTimer <= 0) {
            this.pathHistory.push({ x: this.x, y: this.y });
            this.pathTimer = 0.1;
        }

        let dx = 0; let dy = 0;
        let currentSpeed = this.speed;
        let maxRange = 600;

        if (keys.w) dy -= 1;
        if (keys.s) dy += 1;
        if (keys.a) dx -= 1;
        if (keys.d) dx += 1;

        mouse.worldX = mouse.screenX + camera.x;
        mouse.worldY = mouse.screenY + camera.y;

        let isAimingWithMouse = mouse.down;
        let isAimingWithStick = touchRight.active;

        if (isAimingWithStick) {
            let rightJoy = getJoystickVector(touchRight);
            const aimDeadzone = this.tankType === 'lobber' ? 0.5 : 0.1;
            if (rightJoy.distance > aimDeadzone) {
                this.aimAngle = Math.atan2(rightJoy.y, rightJoy.x);
                this.aimDist = (rightJoy.distance / 50) * maxRange;
                this.isAiming = true;
                this.lastAimSource = 'stick';
            } else {
                this.isAiming = false;
            }
        } else {
            if (!isMobile || this.lastAimSource === 'mouse') {
                if (this.burstShotsRemaining === 0 && !(this.wasAiming && this.lastAimSource === 'stick')) {
                    this.aimAngle = Math.atan2(mouse.worldY - this.y, mouse.worldX - this.x);
                    this.aimDist = Math.min(Math.hypot(mouse.worldX - this.x, mouse.worldY - this.y), maxRange);
                }
            }
            this.isAiming = isAimingWithMouse;
            if (isAimingWithMouse) this.lastAimSource = 'mouse';
        }

        if (this.wasAiming && !this.isAiming) {
            if (!this.isOverheated && !this.isFrozen) {
                if (this.tankType === 'lobber') {
                    this.burstShotsRemaining = 1;
                } else if (this.lastAimSource === 'stick') {
                    this.burstShotsRemaining = 3;
                }
                this.burstTimer = 0;
            }
        }
        this.wasAiming = this.isAiming;

        if (touchLeft.active) {
            let leftJoy = getJoystickVector(touchLeft);
            let normalizedDist = leftJoy.distance / 50;
            currentSpeed = this.speed * normalizedDist * 0.7;
            dx = leftJoy.x;
            dy = leftJoy.y;
        }

        // --- Lógica de Gelo (Wiggle out) ---
        if (this.isFrozen) {
            this.isShooting = false;
            this.burstShotsRemaining = 0;

            if (Math.hypot(dx, dy) > 0.1) {
                let currentInputAngle = Math.atan2(dy, dx);
                if (this.lastWiggleDir === null) {
                    this.lastWiggleDir = currentInputAngle;
                } else {
                    let angleDiff = Math.abs(currentInputAngle - this.lastWiggleDir);
                    while (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

                    // Necessário mover o controle em direções bem diferentes (~60 graus)
                    if (angleDiff > 1.0) {
                        this.freezeWiggleCount++;
                        this.lastWiggleDir = currentInputAngle;

                        // Faíscas de gelo quebrando
                        for (let i = 0; i < 3; i++) particles.push(new Particle(this.x + (randomNum()) * 30, this.y + (randomNum()) * 30, (randomNum()) * 50, (randomNum()) * 50, '#ffffff', 2));

                        if (this.freezeWiggleCount >= 6) { // 6 movimentos para quebrar o gelo
                            this.isFrozen = false;
                            floatingTexts.push(new FloatingText("LIBERTO!", this.x, this.y - 30, '#55ccff'));
                            for (let i = 0; i < 15; i++) particles.push(new Particle(this.x, this.y, (randomNum()) * 200, (randomNum()) * 200, '#55ccff', 4 + Math.random() * 4));
                        }
                    }
                }
            }

            // Impedir movimento
            dx = 0;
            dy = 0;
        } else {
            this.lastWiggleDir = null;
        }
        // ------------------------------------

        if (dx !== 0 || dy !== 0) {
            this.hullAngle = Math.atan2(dy, dx);
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length; dy /= length;

            let moveMagnitude = touchLeft.active ? (getJoystickVector(touchLeft).distance / 50) * 0.7 : 1;
            this.trackOffset -= this.speed * dt * 0.15 * moveMagnitude;
            if (this.trackOffset <= -8) this.trackOffset += 8;
        }

        this.vx = dx * currentSpeed;
        this.vy = dy * currentSpeed;

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        this.x = Math.max(this.radius, Math.min(arenaWidth - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(waterY - this.radius, this.y));

        resolveCollision(this);

        if (this.y > waterY - this.radius) {
            this.y = waterY - this.radius;
        }

        if (this.revealTimer > 0) this.revealTimer -= dt;
        checkHidden(this);

        if (this.flashTimer > 0) this.flashTimer -= dt;
        if (this.damageTimer > 0) this.damageTimer -= dt;

        if (this.invisibilityTimer > 0) {
            this.invisibilityTimer -= dt;
            if (this.invisibilityTimer <= 0) {
                this.isInvisible = false;
                floatingTexts.push(new FloatingText("VISÍVEL", this.x, this.y - 20, '#fff'));
            }
        }

        if (this.heat > 0) {
            this.heat -= this.cooldownRate * dt;
            if (this.heat <= 0) {
                this.heat = 0;
                if (this.isOverheated) {
                    this.isOverheated = false;
                    floatingTexts.push(new FloatingText("RESFRIADA!", this.x, this.y - 30, '#00ff88'));
                }
            }
        }

        if (gameState === 'PLAYING') {
            if (this.tankType === 'normal' && isAimingWithMouse && !isAimingWithStick && !this.isFrozen) {
                const now = performance.now() / 1000;
                if (now - this.lastShot >= this.fireRate && !this.isOverheated) {
                    this.shoot();
                    this.lastShot = now;
                }
            }

            if (this.burstShotsRemaining > 0) {
                if (this.isOverheated || this.isFrozen) {
                    this.burstShotsRemaining = 0;
                } else {
                    this.burstTimer -= dt;
                    if (this.burstTimer <= 0) {
                        this.shoot();
                        this.burstShotsRemaining--;
                        this.burstTimer = 0.15;
                    }
                }
            }
        }
    }

    makeInvisible(duration) {
        this.invisibilityTimer = duration;
        this.isInvisible = true;
    }

    makeFrozen() {
        if (this.isInvisible) return;
        this.isFrozen = true;
        this.freezeWiggleCount = 0;
        this.lastWiggleDir = null;
        floatingTexts.push(new FloatingText("CONGELADO!", this.x, this.y - 40, '#55ccff'));
        for (let i = 0; i < 20; i++) particles.push(new Particle(this.x, this.y, (randomNum()) * 150, (randomNum()) * 150, '#e6ffff', 5));
    }

    shoot() {
        this.heat += this.heatPerShot;
        if (this.heat >= this.maxHeat) {
            this.heat = this.maxHeat;
            this.isOverheated = true;
            floatingTexts.push(new FloatingText("SUPERAQUECEU!", this.x, this.y - 30, '#ff0000'));
        }

        this.revealTimer = 0.5;

        if (this.tankType === 'lobber') {
            const lx = this.x + Math.cos(this.aimAngle) * this.aimDist;
            const ly = this.y + Math.sin(this.aimAngle) * this.aimDist;
            lobbedBullets.push(new LobbedBullet(this.x, this.y, lx, ly, true));
        } else {
            const speed = 800;
            const vx = Math.cos(this.aimAngle) * speed;
            const vy = Math.sin(this.aimAngle) * speed;

            this.x -= Math.cos(this.aimAngle) * 3;
            this.y -= Math.sin(this.aimAngle) * 3;

            bullets.push(new Bullet(this.x, this.y, vx, vy, true));

            for (let i = 0; i < 3; i++) {
                particles.push(new Particle(
                    this.x + Math.cos(this.aimAngle) * 35,
                    this.y + Math.sin(this.aimAngle) * 35,
                    (randomNum()) * 100 + vx * 0.2,
                    (randomNum()) * 100 + vy * 0.2,
                    '#fff', 3
                ));
            }
        }
    }

    draw(ctx) {
        ctx.save();
        if (this.isHidden) ctx.globalAlpha = 0.5;

        if (this.isInvisible) {
            ctx.globalAlpha = 0.3;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#cc00ff';
        }

        ctx.translate(this.x, this.y);

        ctx.save();
        ctx.rotate(this.hullAngle);

        ctx.fillStyle = '#666';
        ctx.fillRect(-20, -24, 40, 12);
        ctx.fillRect(-20, 12, 40, 12);

        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        for (let i = -24; i <= 24; i += 8) {
            let lineX = i + this.trackOffset;
            if (lineX >= -19 && lineX <= 19) {
                ctx.beginPath(); ctx.moveTo(lineX, -24); ctx.lineTo(lineX, -12); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(lineX, 12); ctx.lineTo(lineX, 24); ctx.stroke();
            }
        }

        let hullColor = this.tankType === 'lobber' ? '#005599' : '#0077cc';
        ctx.fillStyle = this.flashTimer > 0 ? '#ff0000' : hullColor;
        ctx.fillRect(-16, -14, 32, 28);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(-16, -14, 32, 28);
        ctx.restore();

        ctx.rotate(this.aimAngle);

        if (this.isOverheated) ctx.fillStyle = '#ff0000';
        else if (this.heat > this.maxHeat * 0.7) ctx.fillStyle = '#ff9600';
        else ctx.fillStyle = '#555';

        if (this.tankType === 'lobber') {
            ctx.beginPath();
            ctx.moveTo(10, -10);
            ctx.lineTo(25, -14);
            ctx.lineTo(25, 14);
            ctx.lineTo(10, 10);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = this.isOverheated ? '#ffaa00' : '#111';
            ctx.fillRect(25, -16, 8, 32);
            ctx.strokeRect(25, -16, 8, 32);

            ctx.fillStyle = this.flashTimer > 0 ? '#ff0000' : '#004488';
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(-16, -16, 32, 32, 8);
            } else {
                ctx.rect(-16, -16, 32, 32);
            }
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffaa00';
            ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();

        } else {
            ctx.fillRect(10, -6, 25, 12);
            ctx.strokeRect(10, -6, 25, 12);

            ctx.fillStyle = this.flashTimer > 0 ? '#ff0000' : this.color;
            ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
            ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();

            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(-4, 0, 6, 0, Math.PI * 2); ctx.fill();
        }

        ctx.restore();

        let showLobberAim = this.tankType === 'lobber' && this.isAiming && !this.isOverheated && !this.isFrozen;
        let showLaserAim = this.tankType === 'normal' && touchRight.active && this.isAiming && !this.isOverheated && !this.isFrozen;

        if (showLobberAim) {
            let startX = this.x;
            let startY = this.y;
            let endX = this.x + Math.cos(this.aimAngle) * this.aimDist;
            let endY = this.y + Math.sin(this.aimAngle) * this.aimDist;
            let maxHeight = Math.min(this.aimDist / 2, 150);

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            for (let i = 1; i <= 20; i++) {
                let t = i / 20;
                let gx = startX + (endX - startX) * t;
                let gy = startY + (endY - startY) * t;
                let gz = 4 * maxHeight * t * (1 - t);
                ctx.lineTo(gx, gy - gz);
            }
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 4;
            ctx.setLineDash([15, 10]);
            ctx.lineDashOffset = -(performance.now() / 30);
            ctx.stroke();

            ctx.beginPath();
            if (ctx.ellipse) {
                ctx.ellipse(endX, endY, 60, 40, 0, 0, Math.PI * 2);
            } else {
                ctx.arc(endX, endY, 60, 0, Math.PI * 2);
            }
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            ctx.stroke();
            ctx.restore();

        } else if (showLaserAim) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.aimAngle);
            ctx.beginPath();
            ctx.moveTo(35, 0);
            ctx.lineTo(1200, 0);
            ctx.strokeStyle = 'rgba(255, 0, 85, 0.6)';
            ctx.lineWidth = 10;
            ctx.setLineDash([25, 20]);
            ctx.lineDashOffset = -(performance.now() / 20);
            ctx.stroke();
            ctx.restore();
        }

        // Bloco visual de congelamento
        if (this.isFrozen) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.fillStyle = 'rgba(85, 204, 255, 0.5)';
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(-24, -28, 48, 56, 4);
            else ctx.rect(-24, -28, 48, 56);
            ctx.fill();
            ctx.stroke();

            const progress = this.freezeWiggleCount / 6;
            ctx.fillStyle = '#000';
            ctx.fillRect(-20, 35, 40, 10);
            ctx.fillStyle = '#55ccff';
            ctx.fillRect(-19, 36, 38 * progress, 8);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText("MEXA-SE!", 0, 40);
            ctx.restore();
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        cameraShake = 15;
        updateHealthBar();
        this.revealTimer = 0.5;
        this.flashTimer = 0.2;

        for (let i = 0; i < 10; i++) particles.push(new Particle(this.x, this.y, (randomNum()) * 300, (randomNum()) * 300, '#ff0055', 5));
        if (this.hp <= 0) {
            this.hp = 0;
            updateHealthBar();
            if (!questionDecided) {
                questionDecided = true;
                const elapsed = (performance.now() - questionStartTime) / 1000;
                results.push({ 
                    id: questions[currentQuestionIndex]?.id, 
                    options: questions[currentQuestionIndex]?.options, 
                    text: questions[currentQuestionIndex]?.text, 
                    correct: false, 
                    duration: Number.parseFloat(elapsed.toFixed(2)) 
                });
                setTimeout(() => triggerTransition(false), 0);
            }
        }
    }
}

class MiniTurret {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.hp = 25;
        this.maxHp = 25;
        this.shootTimer = 2.0;
        this.active = true;
        this.color = '#ff00aa';
        this.angle = 0;
    }
    update(dt, player) {
        if (!this.active) return;
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.hypot(dx, dy);
        this.angle = Math.atan2(dy, dx);

        let canSeePlayer = (!player.isHidden && dist < 800) || (player.isHidden && player.currentBush === this.currentBush && dist < 200);
        if (player.isInvisible) canSeePlayer = false;

        if (canSeePlayer) {
            this.shootTimer -= dt;
            if (this.shootTimer <= 0) {
                this.shoot(dx, dy, dist);
                this.shootTimer = 1.5 + Math.random();
            }
        }
    }
    shoot(dx, dy, dist) {
        const speed = 350;
        const vx = (dx / dist) * speed;
        const vy = (dy / dist) * speed;
        bullets.push(new Bullet(this.x, this.y, vx, vy, false, this.color));
        for (let i = 0; i < 3; i++) particles.push(new Particle(this.x + Math.cos(this.angle) * this.radius, this.y + Math.sin(this.angle) * this.radius, (randomNum()) * 50 + vx * 0.2, (randomNum()) * 50 + vy * 0.2, this.color, 2));
    }
    draw(ctx) {
        if (this.x < camera.x - 100 || this.x > camera.x + width + 100 || this.y < camera.y - 100 || this.y > camera.y + height + 100) return;
        ctx.save();
        ctx.translate(this.x, this.y);

        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = this.color; ctx.lineWidth = 2; ctx.stroke();

        if (this.hp < this.maxHp) {
            ctx.fillStyle = 'red'; ctx.fillRect(-15, -this.radius - 10, 30, 4);
            ctx.fillStyle = '#00ff88'; ctx.fillRect(-15, -this.radius - 10, 30 * (this.hp / this.maxHp), 4);
        }

        ctx.rotate(this.angle);
        ctx.fillStyle = '#555';
        ctx.fillRect(0, -6, 25, 12);
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    }
    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.active = false;
            for (let i = 0; i < 15; i++) particles.push(new Particle(this.x, this.y, (randomNum()) * 200, (randomNum()) * 200, this.color, 4));
        }
    }
}

class Enemy {
    constructor(x, y, text, isCorrect, type = 'chaser') {
        this.x = x;
        this.y = y;
        this.radius = 35;
        this.type = type;

        const config = enemyConfig[type];
        this.baseColor = config.color;
        this.color = this.baseColor;

        if (type === 'builder') this.speed = 65 + Math.random() * 10;
        else if (type === 'chaser') this.speed = 70 + Math.random() * 10;
        else if (type === 'melee') this.speed = 85 + Math.random() * 10;
        else if (type === 'shield' || type === 'laser' || type === 'ranged') this.speed = 50 + Math.random() * 10;
        else if (type === 'aoe') this.speed = 60 + Math.random() * 10;
        else if (type === 'acid') this.speed = 65 + Math.random() * 15;
        else if (type === 'electric') {
            this.speed = 80 + Math.random() * 10;
            this.lightningTimer = 5.0 + Math.random() * 2.0;
        }
        else if (type === 'turreteer') {
            this.speed = 50 + Math.random() * 15;
            this.turretTimer = 10.0;
        }
        else if (type === 'bouncer') {
            this.speed = 55 + Math.random() * 15;
            this.bounceTimer = 3.0 + Math.random() * 2.0;
        }
        else if (type === 'mimic') {
            this.speed = 175;
            this.isSpawned = false;
            this.spawnTimer = 5.0;
            this.pathIndex = 0;
            this.bombTimer = 4.0;
            this.stuckTimer = 0;
            this.lastX = x;
            this.lastY = y;
        }
        else if (type === 'ice') {
            this.speed = 45 + Math.random() * 10;
            this.iceState = 'idle';
            this.iceTimer = 0;
            this.iceAngle = 0;
            this.iceRadius = 350;
            this.iceSpread = Math.PI / 3;
        }

        this.maxHp = 100;
        this.hp = 100;
        this.text = text;
        this.isCorrect = isCorrect;

        this.damageTimer = 0;
        this.shootTimer = 1.0 + Math.random();
        this.angle = 0;

        this.isHidden = false;
        this.currentBush = null;
        this.wanderTimer = 0;
        this.revealTimer = 0;

        this.isAoECharging = false;
        this.aoeChargeTimer = 0;
        this.maxAoeTime = 1.5;
        this.aoeRadius = 140;

        this.isShieldActive = false;
        this.shieldTimer = 2.0 + Math.random() * 2.0;

        this.laserState = 'idle';
        this.laserTimer = 0;
        this.laserAngle = 0;
        this.hasHitPlayer = false;

        this.patrolTarget = null;
        this.patrolTimeout = 0;

        this.buildTimer = 2.0 + Math.random() * 3.0;
        this.trailTimer = 0;
        this.lastAcidX = x;
        this.lastAcidY = y;
    }

    executeAoE(player) {
        this.isAoECharging = false;
        this.shootTimer = 3.0 + Math.random();
        this.revealTimer = 0.5;

        const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
        if (distToPlayer < this.aoeRadius + player.radius) {
            player.takeDamage(20);
        }

        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * this.aoeRadius;
            particles.push(new Particle(
                this.x + Math.cos(angle) * r, this.y + Math.sin(angle) * r,
                (randomNum()) * 80, (randomNum()) * 80,
                this.baseColor, 3 + Math.random() * 3
            ));
        }
        for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 / 30) * i;
            particles.push(new Particle(
                this.x + Math.cos(angle) * this.aoeRadius, this.y + Math.sin(angle) * this.aoeRadius,
                Math.cos(angle) * 150, Math.sin(angle) * 150,
                this.baseColor, 5
            ));
        }
    }

    update(dt, player) {
        if (gameState === 'TRANSITION') return;

        if (this.type === 'mimic' && !this.isSpawned) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                this.isSpawned = true;
                if (player.pathHistory.length > 0) {
                    this.x = player.pathHistory[0].x;
                    this.y = player.pathHistory[0].y;
                } else {
                    this.x = player.x;
                    this.y = player.y;
                }
                floatingTexts.push(new FloatingText("MÍMICO SURGIU!", this.x, this.y, '#ffffff'));
            }
            return;
        }

        if (this.revealTimer > 0) this.revealTimer -= dt;
        checkHidden(this);

        if (this.type === 'shield') {
            this.shieldTimer -= dt;
            if (this.shieldTimer <= 0) {
                this.isShieldActive = !this.isShieldActive;
                this.shieldTimer = 3.0;
            }
        }

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.hypot(dx, dy);
        let canSeePlayer = (!player.isHidden && dist < 1200) ||
            (player.isHidden && player.currentBush === this.currentBush && dist < 300);

        if (player.isInvisible && this.type !== 'mimic') {
            canSeePlayer = false;
        }

        let moveX = 0, moveY = 0;

        if (this.isAoECharging) {
            this.aoeChargeTimer -= dt;
            if (this.aoeChargeTimer <= 0) this.executeAoE(player);
        } else if (this.type === 'mimic') {

            const movedDist = Math.hypot(this.x - (this.lastX || this.x), this.y - (this.lastY || this.y));
            if (movedDist < this.speed * dt * 0.1) {
                this.stuckTimer = (this.stuckTimer || 0) + dt;
            } else {
                this.stuckTimer = 0;
            }
            this.lastX = this.x;
            this.lastY = this.y;

            if (this.pathIndex < player.pathHistory.length) {
                let target = player.pathHistory[this.pathIndex];
                let mdx = target.x - this.x;
                let mdy = target.y - this.y;
                let mdist = Math.hypot(mdx, mdy);

                if (mdist < 20) {
                    this.pathIndex++;
                    this.stuckTimer = 0;
                } else if (this.stuckTimer > 0.5) {
                    this.pathIndex = Math.min(this.pathIndex + 10, player.pathHistory.length - 1);
                    this.stuckTimer = 0;
                }

                if (this.pathIndex < player.pathHistory.length) {
                    target = player.pathHistory[this.pathIndex];
                    mdx = target.x - this.x;
                    mdy = target.y - this.y;
                    mdist = Math.hypot(mdx, mdy);

                    if (mdist > 0) {
                        this.angle = Math.atan2(mdy, mdx);
                        moveX = mdx / mdist;
                        moveY = mdy / mdist;
                    }
                }
            } else {
                this.angle = Math.atan2(dy, dx);
                if (dist > 0) {
                    moveX = dx / dist;
                    moveY = dy / dist;
                }
            }

            this.bombTimer -= dt;
            if (this.bombTimer <= 0 && this.y < waterY - 40) {
                crossBombs.push(new CrossBomb(this.x, this.y));
                this.bombTimer = 4.0;
            }
        } else if (this.type === 'laser' || this.type === 'acid' || this.type === 'ice') {
            if ((this.type !== 'laser' && this.type !== 'ice') ||
                (this.type === 'laser' && this.laserState === 'idle') ||
                (this.type === 'ice' && this.iceState === 'idle')) {

                if (!this.patrolTarget || this.patrolTimeout <= 0) {
                    this.patrolTarget = {
                        x: 100 + Math.random() * (arenaWidth - 200),
                        y: 100 + Math.random() * (waterY - 200)
                    };
                    this.patrolTimeout = 6.0;
                }
                this.patrolTimeout -= dt;

                let pdx = this.patrolTarget.x - this.x;
                let pdy = this.patrolTarget.y - this.y;
                let pDist = Math.hypot(pdx, pdy);

                if (pDist < 50) this.patrolTarget = null;
                else {
                    moveX = pdx / pDist;
                    moveY = pdy / pDist;
                    this.angle = Math.atan2(pdy, pdx);
                }

                if (this.type === 'laser') {
                    this.shootTimer -= dt;
                    if (this.shootTimer <= 0 && canSeePlayer && dist < 800 && dist > 100) {
                        this.laserState = 'charging';
                        this.laserTimer = 1.2;
                        this.laserAngle = Math.atan2(dy, dx);
                        this.revealTimer = 1.0;
                    }
                } else if (this.type === 'acid') {
                    this.trailTimer -= dt;
                    if (this.trailTimer <= 0 && this.y < waterY - 40) {
                        acidTrails.push(new AcidTrail(this.x, this.y, this.lastAcidX, this.lastAcidY));
                        this.lastAcidX = this.x;
                        this.lastAcidY = this.y;
                        this.trailTimer = 0.15;
                    }
                } else if (this.type === 'ice') {
                    this.shootTimer -= dt;
                    if (this.shootTimer <= 0 && canSeePlayer && dist < this.iceRadius && dist > 50) {
                        this.iceState = 'charging';
                        this.iceTimer = 1.0;
                        this.iceAngle = Math.atan2(dy, dx);
                        this.revealTimer = 1.0;
                        this.patrolTarget = null;
                    }
                }
            } else if (this.type === 'laser') {
                if (this.laserState === 'charging') {
                    this.laserTimer -= dt;
                    if (this.laserTimer <= 0) {
                        this.laserState = 'firing';
                        this.laserTimer = 0.5;
                        this.hasHitPlayer = false;
                        if (dist < Math.max(width, height)) cameraShake = 5;
                    }
                } else if (this.laserState === 'firing') {
                    this.laserTimer -= dt;
                    if (!this.hasHitPlayer) {
                        const ldx = player.x - this.x;
                        const ldy = player.y - this.y;
                        const cosA = Math.cos(-this.laserAngle);
                        const sinA = Math.sin(-this.laserAngle);
                        const rx = ldx * cosA - ldy * sinA;
                        const ry = ldx * sinA + ldy * cosA;

                        if (rx > 0 && rx < 4000 && Math.abs(ry) < player.radius + 15) {
                            player.takeDamage(20);
                            this.hasHitPlayer = true;
                        }
                    }
                    if (this.laserTimer <= 0) {
                        this.laserState = 'idle';
                        this.shootTimer = 3.0 + Math.random() * 2.0;
                    }
                }
            } else if (this.type === 'ice') {
                if (this.iceState === 'charging') {
                    this.iceTimer -= dt;

                    let targetAngle = Math.atan2(dy, dx);
                    let angleDiff = targetAngle - this.iceAngle;
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    this.iceAngle += angleDiff * dt * 2.0;

                    if (this.iceTimer <= 0) {
                        this.iceState = 'firing';
                        this.iceTimer = 1.5;
                    }
                } else if (this.iceState === 'firing') {
                    this.iceTimer -= dt;

                    for (let i = 0; i < 3; i++) {
                        let randomSpread = (randomNum()) * this.iceSpread;
                        let pAngle = this.iceAngle + randomSpread;
                        let pSpeed = 200 + Math.random() * 150;
                        particles.push(new Particle(this.x, this.y, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, '#e6ffff', 3 + Math.random() * 3));
                    }

                    let angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);
                    let aDiff = Math.abs(angleToPlayer - this.iceAngle);
                    while (aDiff > Math.PI) aDiff = Math.PI * 2 - aDiff;

                    if (dist < this.iceRadius && aDiff < this.iceSpread / 2) {
                        if (!player.isFrozen) {
                            player.makeFrozen();
                        }
                    }

                    if (this.iceTimer <= 0) {
                        this.iceState = 'idle';
                        this.shootTimer = 4.0 + Math.random() * 2.0;
                    }
                }
            }
        } else if (this.type === 'turreteer' || this.type === 'bouncer') {
            if (this.wanderTimer <= 0) {
                this.angle = Math.random() * Math.PI * 2;
                this.wanderTimer = 1.5 + Math.random() * 2.0;
            }
            this.wanderTimer -= dt;
            moveX = Math.cos(this.angle) * 0.8;
            moveY = Math.sin(this.angle) * 0.8;

            if (this.type === 'turreteer') {
                this.turretTimer -= dt;
                if (this.turretTimer <= 0 && this.y < waterY - 40) {
                    miniTurrets.push(new MiniTurret(this.x, this.y));
                    this.turretTimer = 10.0;
                    for (let p = 0; p < 10; p++) particles.push(new Particle(this.x, this.y, (randomNum()) * 100, (randomNum()) * 100, '#fff', 4));
                }
            } else if (this.type === 'bouncer') {
                if (canSeePlayer) {
                    this.bounceTimer -= dt;
                    if (this.bounceTimer <= 0) {
                        let bx = player.x - this.x;
                        let by = player.y - this.y;
                        let bDist = Math.hypot(bx, by);
                        if (bDist > 0) {
                            bouncingSpheres.push(new BouncingSphere(this.x, this.y, bx / bDist, by / bDist));
                        }
                        this.bounceTimer = 6.0 + Math.random() * 2.0;
                        for (let p = 0; p < 5; p++) particles.push(new Particle(this.x, this.y, (randomNum()) * 100, (randomNum()) * 100, this.color, 4));
                    }
                }
            }
        } else if (canSeePlayer) {
            if (this.type === 'electric') {
                let predX = player.x + (player.vx || 0) * 1.5;
                let predY = player.y + (player.vy || 0) * 1.5;

                predX = Math.max(player.radius, Math.min(arenaWidth - player.radius, predX));
                predY = Math.max(player.radius, Math.min(waterY - player.radius, predY));

                let edx = predX - this.x;
                let edy = predY - this.y;
                let edist = Math.hypot(edx, edy);

                if (edist > 0) {
                    this.angle = Math.atan2(edy, edx);
                    moveX = edx / edist;
                    moveY = edy / edist;
                }

                this.lightningTimer -= dt;
                if (this.lightningTimer <= 0) {
                    lightningSpheres.push(new LightningSphere(this.x, this.y, player));
                    this.lightningTimer = 6.0 + Math.random() * 2.0;
                }
            } else if (this.type === 'builder') {
                this.angle = Math.atan2(-dy, -dx);
                moveX = -(dx / dist);
                moveY = -(dy / dist);

                this.buildTimer -= dt;
                if (this.buildTimer <= 0 && this.y < waterY - 40) {
                    breakableBlocks.push({ x: this.x - 30, y: this.y - 30, w: 60, h: 60, hp: 100, maxHp: 100 });
                    this.buildTimer = 2.5 + Math.random() * 2.0;
                    for (let p = 0; p < 10; p++) particles.push(new Particle(this.x, this.y, (randomNum()) * 150, (randomNum()) * 150, '#8b5a2b', 5));
                }
            } else if (this.type === 'chaser') {
                this.angle = Math.atan2(dy, dx);
                moveX = dx / dist;
                moveY = dy / dist;
            } else if (this.type === 'melee') {
                this.angle = Math.atan2(dy, dx);
                if (dist > 150) {
                    moveX = dx / dist; moveY = dy / dist;
                } else {
                    moveX = -(dx / dist); moveY = -(dy / dist);
                }
            } else if (this.type === 'shield') {
                this.angle = Math.atan2(dy, dx);
                const perpX = -dy / dist;
                const perpY = dx / dist;
                const wave = Math.sin(performance.now() / 200) * 1.5;

                moveX = (dx / dist) + perpX * wave;
                moveY = (dy / dist) + perpY * wave;

                const mLen = Math.hypot(moveX, moveY);
                if (mLen > 0) { moveX /= mLen; moveY /= mLen; }

            } else if (this.type === 'ranged') {
                this.angle = Math.atan2(dy, dx);
                if (dist > 350) {
                    moveX = dx / dist; moveY = dy / dist;
                } else if (dist < 250) {
                    moveX = -(dx / dist); moveY = -(dy / dist);
                } else {
                    moveX = -dy / dist; moveY = dx / dist;
                }

                this.shootTimer -= dt;
                if (this.shootTimer <= 0 && dist < 700) {
                    this.shoot(dx, dy, dist);
                    this.shootTimer = 2.0 + Math.random();
                }
            }
        } else {
            if (this.wanderTimer <= 0) {
                this.angle = Math.random() * Math.PI * 2;
                this.wanderTimer = 1.5 + Math.random() * 2;
            }
            this.wanderTimer -= dt;
            moveX = Math.cos(this.angle) * 0.6;
            moveY = Math.sin(this.angle) * 0.6;
        }

        if (!this.isAoECharging && !(this.type === 'laser' && this.laserState !== 'idle') && !(this.type === 'ice' && this.iceState !== 'idle')) {
            this.x += moveX * this.speed * dt;
            this.y += moveY * this.speed * dt;
        }

        if (this.x <= this.radius || this.x >= arenaWidth - this.radius) {
            this.angle = Math.PI - this.angle;
            if (this.type === 'laser' || this.type === 'acid' || this.type === 'ice') this.patrolTimeout = 0;
        }
        if (this.y <= this.radius || this.y >= waterY - this.radius) {
            this.angle = -this.angle;
            if (this.type === 'laser' || this.type === 'acid' || this.type === 'ice') this.patrolTimeout = 0;
        }

        for (let other of enemies) {
            if (other !== this) {
                if (other.type === 'mimic' && !other.isSpawned) continue;
                const ex = other.x - this.x;
                const ey = other.y - this.y;
                const eDist = Math.hypot(ex, ey);
                if (eDist < this.radius + other.radius && eDist > 0) {
                    const eOverlap = (this.radius + other.radius) - eDist;
                    this.x -= (ex / eDist) * eOverlap * 0.5;
                    this.y -= (ey / eDist) * eOverlap * 0.5;
                }
            }
        }

        if (dist < this.radius + player.radius && dist > 0) {
            const overlap = (this.radius + player.radius) - dist;
            const nx = dx / dist; const ny = dy / dist;
            this.x -= nx * overlap * 0.5; this.y -= ny * overlap * 0.5;
            player.x += nx * overlap * 0.5; player.y += ny * overlap * 0.5;

            if (this.damageTimer <= 0) {
                player.takeDamage(10);
                this.damageTimer = 1.0;
                this.x -= nx * 40; this.y -= ny * 40;
            }
        }

        if (this.damageTimer > 0) this.damageTimer -= dt;

        this.x = Math.max(this.radius, Math.min(arenaWidth - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(waterY - this.radius, this.y));
        resolveCollision(this);

        if (this.y > waterY - this.radius) {
            this.y = waterY - this.radius;
        }
    }

    shoot(dx, dy, dist) {
        if (dist <= 0) return;
        const speed = 400;
        const vx = (dx / dist) * speed;
        const vy = (dy / dist) * speed;
        this.revealTimer = 0.5;

        bullets.push(new Bullet(this.x, this.y, vx, vy, false, this.baseColor));

        this.x -= (dx / dist) * 15;
        this.y -= (dy / dist) * 15;

        for (let i = 0; i < 3; i++) {
            particles.push(new Particle(
                this.x + Math.cos(this.angle) * this.radius, this.y + Math.sin(this.angle) * this.radius,
                (randomNum()) * 100 + vx * 0.2, (randomNum()) * 100 + vy * 0.2,
                this.baseColor, 3
            ));
        }
    }

    draw(ctx) {
        if (this.type === 'mimic' && !this.isSpawned) return;

        if (this.type === 'aoe' && this.isAoECharging) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.aoeRadius, 0, Math.PI * 2);
            ctx.fillStyle = this.baseColor; ctx.globalAlpha = 0.15; ctx.fill();
            ctx.lineWidth = 2; ctx.strokeStyle = this.baseColor; ctx.globalAlpha = 0.5; ctx.stroke();

            const progress = 1 - (this.aoeChargeTimer / this.maxAoeTime);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.aoeRadius * progress, 0, Math.PI * 2);
            ctx.fillStyle = this.baseColor; ctx.globalAlpha = 0.35; ctx.fill();
            ctx.restore();
        }

        if (this.x < camera.x - 200 || this.x > camera.x + width + 200 ||
            this.y < camera.y - 200 || this.y > camera.y + height + 200) {
            return;
        }

        const distToPlayer = player ? Math.hypot(player.x - this.x, player.y - this.y) : Infinity;

        if (this.isHidden) {
            if (!player || player.currentBush !== this.currentBush || distToPlayer > 300) {
                return;
            }
        }

        ctx.save();
        if (this.isHidden) ctx.globalAlpha = 0.6;
        ctx.translate(this.x, this.y);

        const wobble = Math.sin(performance.now() / 200) * 5;

        if (this.type === 'laser' && this.laserState !== 'idle') {
            ctx.save();
            ctx.rotate(this.laserAngle);

            if (this.laserState === 'charging') {
                ctx.beginPath(); ctx.moveTo(0, wobble); ctx.lineTo(4000, wobble);
                ctx.strokeStyle = this.baseColor; ctx.lineWidth = 2;
                ctx.setLineDash([15, 15]);
                ctx.globalAlpha = 0.5 + (Math.sin(performance.now() / 50) * 0.3);
                ctx.stroke(); ctx.setLineDash([]);
            } else if (this.laserState === 'firing') {
                ctx.beginPath(); ctx.moveTo(0, wobble); ctx.lineTo(4000, wobble);
                ctx.strokeStyle = this.baseColor; ctx.lineWidth = 30;
                ctx.globalAlpha = 0.8; ctx.shadowBlur = 20; ctx.shadowColor = this.baseColor;
                ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, wobble); ctx.lineTo(4000, wobble);
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 10; ctx.shadowBlur = 0;
                ctx.stroke();
            }
            ctx.restore();
        }

        if (this.type === 'builder') {
            ctx.save(); ctx.rotate(this.angle);
            ctx.fillStyle = '#8b5a2b'; ctx.fillRect(-30, -15 + wobble, 20, 30);
            ctx.strokeStyle = '#5c3a18'; ctx.lineWidth = 2; ctx.strokeRect(-30, -15 + wobble, 20, 30);
            ctx.beginPath(); ctx.moveTo(-28, -13 + wobble); ctx.lineTo(-12, 13 + wobble);
            ctx.moveTo(-12, -13 + wobble); ctx.lineTo(-28, 13 + wobble); ctx.stroke();
            ctx.restore();
        }

        if (this.type === 'acid') {
            ctx.save(); ctx.rotate(this.angle);
            ctx.fillStyle = '#111'; ctx.fillRect(-30, -12 + wobble, 15, 24);
            ctx.fillStyle = '#8aff00'; ctx.fillRect(-27, -9 + wobble, 9, 18);
            ctx.restore();
        }

        if (this.type === 'electric') {
            ctx.save(); ctx.rotate(this.angle);
            ctx.fillStyle = '#111'; ctx.fillRect(-15, -15 + wobble, 30, 30);
            ctx.fillStyle = '#00ffff';
            ctx.beginPath(); ctx.arc(-20, wobble, 6, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(20, wobble, 6, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

        if (this.type === 'turreteer') {
            ctx.save(); ctx.rotate(this.angle);
            ctx.fillStyle = '#555'; ctx.fillRect(-25, -20 + wobble, 30, 40);
            ctx.fillStyle = this.baseColor; ctx.fillRect(-15, -10 + wobble, 10, 20);
            ctx.restore();
        }

        if (this.type === 'ice') {
            let drawAngle = (this.iceState && this.iceState !== 'idle') ? this.iceAngle : this.angle;
            ctx.save(); ctx.rotate(drawAngle);
            ctx.fillStyle = '#113344'; ctx.fillRect(this.radius - 15, -12 + wobble, 35, 24);
            ctx.fillStyle = this.baseColor; ctx.fillRect(this.radius + 10, -10 + wobble, 15, 20);

            if (this.iceState === 'charging' || this.iceState === 'firing') {
                ctx.beginPath();
                ctx.moveTo(0, wobble);
                ctx.arc(0, wobble, this.iceRadius, -this.iceSpread / 2, this.iceSpread / 2);
                ctx.lineTo(0, wobble);
                if (this.iceState === 'charging') {
                    ctx.fillStyle = 'rgba(85, 204, 255, 0.2)';
                    ctx.fill();
                    ctx.strokeStyle = `rgba(85, 204, 255, ${0.5 + Math.sin(performance.now() / 50) * 0.3})`;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                } else {
                    ctx.fillStyle = 'rgba(230, 255, 255, 0.4)';
                    ctx.fill();
                }
            }
            ctx.restore();
        }

        if (this.type === 'ranged') {
            ctx.save(); ctx.rotate(this.angle);
            ctx.fillStyle = '#444'; ctx.fillRect(this.radius - 10, -8 + wobble, 35, 16);
            ctx.fillStyle = this.baseColor; ctx.fillRect(this.radius + 15, -10 + wobble, 10, 20);
            ctx.restore();
        }

        if (this.type === 'laser') {
            ctx.save(); ctx.rotate(this.laserState !== 'idle' ? this.laserAngle : this.angle);
            ctx.fillStyle = '#222'; ctx.fillRect(this.radius - 15, -12 + wobble, 45, 24);
            ctx.fillStyle = this.baseColor; ctx.fillRect(this.radius + 20, -10 + wobble, 15, 20);
            if (this.laserState === 'charging') {
                ctx.fillStyle = '#fff'; ctx.globalAlpha = 1 - (this.laserTimer / 1.2);
                ctx.beginPath(); ctx.arc(this.radius + 25, wobble, 8, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        if (this.type === 'aoe') {
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -this.radius - 10 + wobble, 8, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = this.baseColor; ctx.lineWidth = 2; ctx.stroke();
            if (this.isAoECharging) {
                ctx.beginPath(); ctx.arc(0, -this.radius - 10 + wobble, 15 - (this.aoeChargeTimer * 5), 0, Math.PI * 2);
                ctx.strokeStyle = this.baseColor; ctx.stroke();
            }
        }

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath(); ctx.arc(0, this.radius + 10, this.radius * 0.8, 0, Math.PI * 2); ctx.fill();

        if (this.type === 'shield' && this.isShieldActive) {
            ctx.beginPath(); ctx.arc(0, wobble, this.radius + 10, 0, Math.PI * 2);
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 4 + Math.sin(performance.now() / 150) * 2;
            ctx.globalAlpha = 0.6 + Math.sin(performance.now() / 150) * 0.4;
            ctx.stroke();
            ctx.fillStyle = 'rgba(0, 255, 255, 0.2)'; ctx.fill();
            ctx.globalAlpha = 1.0;
        }

        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(0, wobble, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = '#000'; ctx.stroke();

        ctx.fillStyle = this.type === 'mimic' ? '#000' : '#fff';
        ctx.beginPath();
        if (this.type === 'builder' || this.type === 'acid') {
            ctx.arc(-8, -5 + wobble, 5, 0, Math.PI * 2); ctx.arc(8, -5 + wobble, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#111'; ctx.beginPath();
            ctx.arc(-8, -5 + wobble, 2, 0, Math.PI * 2); ctx.arc(8, -5 + wobble, 2, 0, Math.PI * 2); ctx.fill();
        } else if (this.type === 'ice') {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(-10, -5 + wobble); ctx.lineTo(-20, -10 + wobble); ctx.lineTo(-15, 0 + wobble); ctx.fill();
            ctx.moveTo(10, -5 + wobble); ctx.lineTo(20, -10 + wobble); ctx.lineTo(15, 0 + wobble); ctx.fill();
        } else if (this.type === 'bouncer') {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, wobble, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#222';
            ctx.stroke();
        } else {
            ctx.moveTo(-15, -10 + wobble); ctx.lineTo(-5, -5 + wobble); ctx.lineTo(-15, 0 + wobble); ctx.fill();
            ctx.moveTo(15, -10 + wobble); ctx.lineTo(5, -5 + wobble); ctx.lineTo(15, 0 + wobble); ctx.fill();
        }

        const hpPct = this.hp / this.maxHp;
        ctx.fillStyle = 'red'; ctx.fillRect(-20, -this.radius - 15 + wobble, 40, 5);
        ctx.fillStyle = '#00ff88'; ctx.fillRect(-20, -this.radius - 15 + wobble, 40 * hpPct, 5);

        ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const _labelPad = 16;
        const _labelW = Math.max(ctx.measureText(this.text).width + _labelPad * 2, 40);
        const _labelH = 30;
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.beginPath(); ctx.roundRect(-_labelW / 2, -this.radius - 55 + wobble, _labelW, _labelH, 5);
        ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.fillText(this.text, 0, -this.radius - 40 + wobble);

        ctx.restore();
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.revealTimer = 0.5;
        this.color = '#fff';
        setTimeout(() => { this.color = this.baseColor; }, 50);
        if (this.hp <= 0) this.die();
    }

    die() {
        for (let i = 0; i < 30; i++) particles.push(new Particle(this.x, this.y, (randomNum()) * 400, (randomNum()) * 400, this.isCorrect ? '#00ff88' : '#ff0000', 6));

        if (gameMode === 'MODE_CORRECT') {
            if (this.isCorrect) {
                floatingTexts.push(new FloatingText("CORRETO!", this.x, this.y, '#00ff88'));
                player.hp = Math.min(player.maxHp, player.hp + 20);
                updateHealthBar();
                if (!questionDecided) {
                    questionDecided = true;
                    const elapsed = (performance.now() - questionStartTime) / 1000;
                    results.push({ 
                        id: questions[currentQuestionIndex]?.id, 
                        options: questions[currentQuestionIndex]?.options, 
                        text: questions[currentQuestionIndex]?.text, 
                        correct: true, 
                        duration: Number.parseFloat(elapsed.toFixed(2)) 
                    });
                    triggerTransition(true);
                }
            } else {
                floatingTexts.push(new FloatingText("ERRADO!", this.x, this.y, '#ff0000'));
                for (let i = 0; i < 5; i++) shrapnels.push(new Shrapnel(this.x, this.y, player));
                setTimeout(() => {
                    if ((gameState === 'PLAYING' || gameState === 'TRANSITION') && player.hp > 0 && !questionDecided) {
                        const spawnPoint = findFreeEnemySpawnPoint(500, 35);
                        const enemy = new Enemy(spawnPoint.x, spawnPoint.y, this.text, false, this.type);
                        if (this.type !== 'builder' && this.type !== 'mimic') enemy.speed *= 1.5;
                        enemies.push(enemy);
                    }
                }, 1000);
            }
        } else if (gameMode === 'MODE_WRONG') {
            if (this.isCorrect) {
                floatingTexts.push(new FloatingText("ERA A CORRETA!", this.x, this.y, '#ff0000'));
                if (!questionDecided) {
                    questionDecided = true;
                    const elapsed = (performance.now() - questionStartTime) / 1000;
                    results.push({ 
                        id: questions[currentQuestionIndex]?.id, 
                        options: questions[currentQuestionIndex]?.options, 
                        text: questions[currentQuestionIndex]?.text, 
                        correct: false, 
                        duration: Number.parseFloat(elapsed.toFixed(2)) 
                    });
                    triggerTransition(false);
                }
            } else {
                floatingTexts.push(new FloatingText("ELIMINADA!", this.x, this.y, '#00ff88'));
                player.hp = Math.min(player.maxHp, player.hp + 10);
                updateHealthBar();

                const index = enemies.indexOf(this);
                if (index > -1) enemies.splice(index, 1);

                const wrongLeft = enemies.filter(e => !e.isCorrect && e.isSpawned !== false).length;
                if (wrongLeft === 0 && !questionDecided) {
                    questionDecided = true;
                    const elapsed = (performance.now() - questionStartTime) / 1000;
                    results.push({ 
                        id: questions[currentQuestionIndex]?.id, 
                        options: questions[currentQuestionIndex]?.options, 
                        text: questions[currentQuestionIndex]?.text, 
                        correct: true, 
                        duration: Number.parseFloat(elapsed.toFixed(2)) 
                    });
                    triggerTransition(true);
                }
                return;
            }
        }

        const index = enemies.indexOf(this);
        if (index > -1) enemies.splice(index, 1);
    }
}

class LobbedBullet {
    constructor(startX, startY, targetX, targetY, isPlayer) {
        this.x = startX;
        this.y = startY;
        this.startX = startX;
        this.startY = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.isPlayer = isPlayer;
        this.active = true;

        this.flightTime = 0.8;
        this.timer = 0;
        this.blastRadius = 60;
        this.maxHeight = Math.min(Math.hypot(targetX - startX, targetY - startY) / 2, 150);
        this.z = 0;
    }
    update(dt) {
        this.timer += dt;
        let t = this.timer / this.flightTime;
        if (t >= 1) {
            this.explode();
            return;
        }
        this.x = this.startX + (this.targetX - this.startX) * t;
        this.y = this.startY + (this.targetY - this.startY) * t;
        this.z = 4 * this.maxHeight * t * (1 - t);
    }
    explode() {
        this.active = false;
        if (Math.hypot(player.x - this.x, player.y - this.y) < Math.max(width, height)) cameraShake = 5;

        for (let i = 0; i < 20; i++) {
            particles.push(new Particle(
                this.x + (randomNum()) * this.blastRadius,
                this.y + (randomNum()) * this.blastRadius,
                (randomNum()) * 150, (randomNum()) * 150,
                '#ff5500', 4 + Math.random() * 4
            ));
        }

        // Inimigos
        for (let e of enemies) {
            if (e.type === 'mimic' && !e.isSpawned) continue;
            if (Math.hypot(e.x - this.x, e.y - this.y) < this.blastRadius + e.radius) {
                e.takeDamage(40);
            }
        }

        for (let t of miniTurrets) {
            if (Math.hypot(t.x - this.x, t.y - this.y) < this.blastRadius + t.radius) {
                t.takeDamage(50);
            }
        }

        // Caixas
        for (let i = breakableBlocks.length - 1; i >= 0; i--) {
            let b = breakableBlocks[i];
            let bCX = b.x + b.w / 2;
            let bCY = b.y + b.h / 2;
            if (Math.hypot(bCX - this.x, bCY - this.y) < this.blastRadius + 30) {
                b.hp -= 40;
                if (b.hp <= 0) {
                    for (let p = 0; p < 10; p++) particles.push(new Particle(bCX, bCY, (randomNum()) * 200, (randomNum()) * 200, '#8b5a2b', 5));
                    if (Math.random() < 0.15) powerUps.push(new PowerUp(bCX, bCY, 'invisibility'));
                    breakableBlocks.splice(i, 1);
                } else {
                    for (let p = 0; p < 3; p++) particles.push(new Particle(bCX, bCY, (randomNum()) * 100, (randomNum()) * 100, '#8b5a2b', 3));
                }
            }
        }
    }
    draw(ctx) {
        // Sombra
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        if (ctx.ellipse) ctx.ellipse(this.x, this.y, 12, 8, 0, 0, Math.PI * 2);
        else ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
        ctx.fill();

        // Projétil
        ctx.fillStyle = '#ff3300';
        ctx.beginPath(); ctx.arc(this.x, this.y - this.z, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath(); ctx.arc(this.x - 3, this.y - this.z - 3, 4, 0, Math.PI * 2); ctx.fill();
    }
}

class LightningSphere {
    constructor(x, y, target) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.radius = 8;
        this.speed = 180;
        this.life = 15.0;
        this.active = true;
        this.sparkTimer = 0;
    }
    update(dt) {
        this.life -= dt;
        if (this.life <= 0 || this.y > waterY) {
            this.active = false;
            return;
        }

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist < this.radius + this.target.radius) {
            this.target.takeDamage(15);
            this.active = false;
            for (let i = 0; i < 15; i++) particles.push(new Particle(this.x, this.y, (randomNum()) * 150, (randomNum()) * 150, '#00ffff', 4));
            return;
        }

        if (dist > 0) {
            this.x += (dx / dist) * this.speed * dt;
            this.y += (dy / dist) * this.speed * dt;
        }

        if (Math.random() < 0.2) {
            particles.push(new Particle(this.x + (randomNum()) * 10, this.y + (randomNum()) * 10, 0, 0, '#00ffff', 3));
        }

        this.sparkTimer -= dt;
        if (this.sparkTimer <= 0) {
            this.sparkTimer = 0.02;
            const angle = Math.random() * Math.PI * 2;
            particles.push(new Particle(this.x, this.y, Math.cos(angle) * 250, Math.sin(angle) * 250, '#e6ffff', 1.5));
        }
    }
    draw(ctx) {
        if (this.x < camera.x - 100 || this.x > camera.x + width + 100 ||
            this.y < camera.y - 100 || this.y > camera.y + height + 100) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        ctx.strokeStyle = 'rgba(0, 200, 255, 0.9)';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();

        const numSparks = 8 + Math.floor(Math.random() * 4);
        for (let i = 0; i < numSparks; i++) {
            let currentAngle = Math.random() * Math.PI * 2;
            let maxDist = this.radius * (1 + Math.random() * 1.75);

            let curX = 0;
            let curY = 0;
            ctx.moveTo(curX, curY);

            let segments = 3 + Math.floor(Math.random() * 3);
            let distPerSegment = maxDist / segments;

            for (let j = 0; j < segments; j++) {
                currentAngle += (randomNum()) * 1.8;
                curX += Math.cos(currentAngle) * distPerSegment;
                curY += Math.sin(currentAngle) * distPerSegment;
                ctx.lineTo(curX, curY);
            }
        }
        ctx.stroke();

        ctx.shadowBlur = 20;
        ctx.shadowColor = '#0055ff';
        ctx.fillStyle = 'rgba(0, 150, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffffff';
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

class BouncingSphere {
    constructor(x, y, dirX, dirY) {
        this.x = x;
        this.y = y;
        this.radius = 14;
        this.speed = 300;
        this.vx = dirX * this.speed;
        this.vy = dirY * this.speed;
        this.life = 10.0;
        this.active = true;
        this.color = '#ff00ff';
    }
    update(dt, player) {
        this.life -= dt;
        if (this.life <= 0 || this.y > waterY) {
            this.active = false;
            for (let i = 0; i < 10; i++) particles.push(new Particle(this.x, this.y, (randomNum()) * 100, (randomNum()) * 100, this.color, 3));
            return;
        }

        let nextX = this.x + this.vx * dt;
        let nextY = this.y + this.vy * dt;
        let bounced = false;

        // Limites da Arena
        if (nextX < this.radius || nextX > arenaWidth - this.radius) {
            this.vx *= -1; nextX = this.x + this.vx * dt; bounced = true;
        }
        if (nextY < this.radius || nextY > waterY - this.radius) {
            this.vy *= -1; nextY = this.y + this.vy * dt; bounced = true;
        }

        // Colisão com Obstáculos e Caixas
        let colliders = [...obstacles, ...breakableBlocks];
        for (let obs of colliders) {
            if (nextX + this.radius > obs.x && nextX - this.radius < obs.x + obs.w &&
                nextY + this.radius > obs.y && nextY - this.radius < obs.y + obs.h) {

                let overlapLeft = (nextX + this.radius) - obs.x;
                let overlapRight = (obs.x + obs.w) - (nextX - this.radius);
                let overlapTop = (nextY + this.radius) - obs.y;
                let overlapBottom = (obs.y + obs.h) - (nextY - this.radius);

                let minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

                if (minOverlap === overlapLeft || minOverlap === overlapRight) {
                    this.vx *= -1;
                } else {
                    this.vy *= -1;
                }
                nextX = this.x; // Prevenir ficar preso
                nextY = this.y;
                bounced = true;

                // Danifica a caixa
                if (obs.hp !== undefined) {
                    obs.hp -= 20;
                    if (obs.hp <= 0) {
                        for (let p = 0; p < 10; p++) particles.push(new Particle(obs.x + obs.w / 2, obs.y + obs.h / 2, (randomNum()) * 200, (randomNum()) * 200, '#8b5a2b', 5));
                        let index = breakableBlocks.indexOf(obs);
                        if (index > -1) breakableBlocks.splice(index, 1);
                    } else {
                        for (let p = 0; p < 3; p++) particles.push(new Particle(obs.x + obs.w / 2, obs.y + obs.h / 2, (randomNum()) * 100, (randomNum()) * 100, '#8b5a2b', 3));
                    }
                }
                break;
            }
        }

        this.x = nextX;
        this.y = nextY;

        if (bounced) {
            for (let i = 0; i < 5; i++) particles.push(new Particle(this.x, this.y, (randomNum()) * 100, (randomNum()) * 100, '#fff', 2));
        }

        // Colisão com o Jogador
        if (!player.isInvisible && Math.hypot(player.x - this.x, player.y - this.y) < this.radius + player.radius) {
            player.takeDamage(15);
            this.active = false;
            for (let i = 0; i < 15; i++) particles.push(new Particle(this.x, this.y, (randomNum()) * 150, (randomNum()) * 150, this.color, 4));
        }

        if (Math.random() < 0.3) {
            particles.push(new Particle(this.x + (randomNum()) * 10, this.y + (randomNum()) * 10, 0, 0, this.color, 3));
        }
    }
    draw(ctx) {
        if (this.x < camera.x - 100 || this.x > camera.x + width + 100 ||
            this.y < camera.y - 100 || this.y > camera.y + height + 100) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.7, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

class Bullet {
    constructor(x, y, vx, vy, isPlayer, color = '#fff') {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy;
        this.radius = 6; this.isPlayer = isPlayer; this.color = color; this.active = true;
    }

    update(dt) {
        this.x += this.vx * dt; this.y += this.vy * dt;

        if (this.x < 0 || this.x > arenaWidth || this.y < 0 || this.y > waterY) {
            this.active = false;
            if (this.y > waterY) {
                for (let p = 0; p < 3; p++) particles.push(new Particle(this.x, this.y, (randomNum()) * 100, (randomNum()) * 100, '#00ffff', 3));
            }
            return;
        }

        for (let obs of obstacles) {
            if (this.x > obs.x && this.x < obs.x + obs.w && this.y > obs.y && this.y < obs.y + obs.h) {
                this.active = false;
                for (let p = 0; p < 3; p++) particles.push(new Particle(this.x, this.y, (randomNum()) * 100, (randomNum()) * 100, '#00aaff', 3));
                return;
            }
        }

        for (let i = breakableBlocks.length - 1; i >= 0; i--) {
            let block = breakableBlocks[i];
            if (this.x > block.x && this.x < block.x + block.w && this.y > block.y && this.y < block.y + block.h) {
                this.active = false;
                block.hp -= 25;
                for (let p = 0; p < 4; p++) particles.push(new Particle(this.x, this.y, (randomNum()) * 150, (randomNum()) * 150, '#a66e38', 4));
                if (block.hp <= 0) {
                    for (let p = 0; p < 15; p++) particles.push(new Particle(block.x + block.w / 2, block.y + block.h / 2, (randomNum()) * 300, (randomNum()) * 300, '#8b5a2b', 6));
                    if (Math.random() < 0.15) powerUps.push(new PowerUp(block.x + block.w / 2, block.y + block.h / 2, 'invisibility'));
                    breakableBlocks.splice(i, 1);
                }
                return;
            }
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color; ctx.shadowBlur = 10; ctx.shadowColor = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    }
}

class Particle {
    constructor(x, y, vx, vy, color, size) {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.color = color; this.size = size; this.life = 1.0;
    }
    update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.life -= dt * 2; this.size *= 0.95; }
    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life); ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

class Shrapnel {
    constructor(x, y, target) {
        this.x = x; this.y = y; this.target = target;
        this.speed = 450 + Math.random() * 200; this.active = true;
        const randomAngle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(randomAngle) * 300; this.vy = Math.sin(randomAngle) * 300;
        this.color = '#ff0000';
    }
    update(dt) {
        const dx = this.target.x - this.x; const dy = this.target.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < this.target.radius + 5) { this.active = false; this.target.takeDamage(5); return; }

        const ax = (dx / dist) * 1500 * dt; const ay = (dy / dist) * 1500 * dt;
        this.vx += ax; this.vy += ay;
        const currentSpeed = Math.hypot(this.vx, this.vy);
        if (currentSpeed > this.speed) { this.vx = (this.vx / currentSpeed) * this.speed; this.vy = (this.vy / currentSpeed) * this.speed; }
        this.x += this.vx * dt; this.y += this.vy * dt;
        if (Math.random() < 0.3) particles.push(new Particle(this.x, this.y, 0, 0, '#ff5555', 2));
    }
    draw(ctx) {
        ctx.save(); ctx.fillStyle = this.color; ctx.shadowBlur = 10; ctx.shadowColor = this.color;
        ctx.translate(this.x, this.y); ctx.rotate(Math.atan2(this.vy, this.vx));
        ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, 5); ctx.lineTo(-6, -5); ctx.fill(); ctx.restore();
    }
}

// --- CLASSES DAS ARMADILHAS E BOMBAS ---

class Mine {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 15;
        this.state = 'idle';
        this.timer = 1.5;
        this.blastRadius = 120;
    }
    update(dt, player) {
        if (this.state === 'idle') {
            const dist = Math.hypot(player.x - this.x, player.y - this.y);
            if (dist < this.radius + player.radius) {
                this.state = 'ticking';
                floatingTexts.push(new FloatingText("MINA ATIVADA!", this.x, this.y - 20, '#ff0000'));
            }
        } else if (this.state === 'ticking') {
            this.timer -= dt;
            if (this.timer <= 0) {
                this.explode(player);
            }
        }
    }
    explode(player) {
        this.state = 'exploded';
        if (Math.hypot(player.x - this.x, player.y - this.y) < Math.max(width, height)) cameraShake = 20;

        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * this.blastRadius;
            particles.push(new Particle(
                this.x + Math.cos(angle) * r,
                this.y + Math.sin(angle) * r,
                (randomNum()) * 200,
                (randomNum()) * 200,
                Math.random() > 0.5 ? '#ff0000' : '#ff9600',
                4 + Math.random() * 4
            ));
        }

        if (Math.hypot(player.x - this.x, player.y - this.y) < this.blastRadius + player.radius) {
            player.takeDamage(30);
        }

        for (let e of enemies) {
            if (e.type === 'mimic' && !e.isSpawned) continue;
            if (Math.hypot(e.x - this.x, e.y - this.y) < this.blastRadius + e.radius) {
                e.takeDamage(40);
            }
        }

        for (let t of miniTurrets) {
            if (Math.hypot(t.x - this.x, t.y - this.y) < this.blastRadius + t.radius) {
                t.takeDamage(50);
            }
        }

        for (let i = breakableBlocks.length - 1; i >= 0; i--) {
            let block = breakableBlocks[i];
            let blockCX = block.x + block.w / 2;
            let blockCY = block.y + block.h / 2;
            if (Math.hypot(blockCX - this.x, blockCY - this.y) < this.blastRadius + 30) {
                block.hp = 0;
                for (let p = 0; p < 15; p++) particles.push(new Particle(blockCX, blockCY, (randomNum()) * 300, (randomNum()) * 300, '#8b5a2b', 6));
                if (Math.random() < 0.15) powerUps.push(new PowerUp(blockCX, blockCY, 'invisibility'));
                breakableBlocks.splice(i, 1);
            }
        }
    }
    draw(ctx) {
        if (this.x < camera.x - 150 || this.x > camera.x + width + 150 ||
            this.y < camera.y - 150 || this.y > camera.y + height + 150) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 10); ctx.stroke();

        let buttonColor = '#550000';
        if (this.state === 'ticking') {
            const blinkRate = Math.max(0.05, (this.timer / 5.0) * 0.4);
            const isBlinking = (performance.now() / 1000) % (blinkRate * 2) < blinkRate;
            if (isBlinking) {
                buttonColor = '#ff0000';
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#ff0000';
            }
        }

        ctx.fillStyle = buttonColor;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();

        if (this.state === 'ticking') {
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(0, 0, this.blastRadius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 0, 0, 0.05)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
        }

        ctx.restore();
    }
}

class Spike {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.state = 'down';
        this.timer = 1.0 + Math.random() * 3.0;
    }

    update(dt, player, enemies) {
        this.timer -= dt;
        if (this.state === 'down' && this.timer <= 0) {
            this.state = 'warning';
            this.timer = 1.0;
        } else if (this.state === 'warning' && this.timer <= 0) {
            this.state = 'up';
            this.timer = 2.0;
        } else if (this.state === 'up' && this.timer <= 0) {
            this.state = 'down';
            this.timer = 2.0 + Math.random() * 3.0;
        }

        if (this.state === 'up') {
            if (player) {
                let distP = Math.hypot(player.x - this.x, player.y - this.y);
                if (distP < this.radius + player.radius && player.damageTimer <= 0) {
                    player.takeDamage(15);
                    player.damageTimer = 0.5;
                }
            }
        }
    }

    draw(ctx) {
        if (this.x < camera.x - 100 || this.x > camera.x + width + 100 ||
            this.y < camera.y - 100 || this.y > camera.y + height + 100) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 3; ctx.stroke();

        const holePositions = [[-8, -8], [8, -8], [-8, 8], [8, 8], [0, 0]];

        if (this.state === 'down') {
            ctx.fillStyle = '#000';
            holePositions.forEach(pos => {
                ctx.beginPath(); ctx.arc(pos[0], pos[1], 4, 0, Math.PI * 2); ctx.fill();
            });
        } else if (this.state === 'warning') {
            const blink = Math.sin(performance.now() / 50) > 0;
            ctx.fillStyle = blink ? '#ff0000' : '#660000';
            holePositions.forEach(pos => {
                ctx.beginPath(); ctx.arc(pos[0], pos[1], 4, 0, Math.PI * 2); ctx.fill();
            });
        } else if (this.state === 'up') {
            ctx.fillStyle = '#ccc';
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 1;

            holePositions.forEach(pos => {
                ctx.save();
                ctx.translate(pos[0], pos[1]);
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.beginPath(); ctx.arc(2, 2, 4, 0, Math.PI * 2); ctx.fill();

                ctx.fillStyle = '#ddd';
                ctx.beginPath();
                ctx.moveTo(-4, 4);
                ctx.lineTo(4, 4);
                ctx.lineTo(0, -18);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            });
        }

        ctx.restore();
    }
}

class Lava {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius ?? (40 + Math.random() * 20);
        this.damageTimer = 0;
    }
    update(dt, player) {
        if (this.damageTimer > 0) this.damageTimer -= dt;
        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        if (dist < this.radius + player.radius - 5) {
            if (this.damageTimer <= 0) {
                player.takeDamage(5);
                this.damageTimer = 0.5;
            }
        }
    }
    draw(ctx) {
        if (this.x < camera.x - 200 || this.x > camera.x + width + 200 ||
            this.y < camera.y - 200 || this.y > camera.y + height + 200) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 68, 0, 0.8)';
        ctx.fill();

        const wobble = Math.sin(performance.now() / 300 + this.x) * 3;
        ctx.beginPath();
        ctx.arc(0, wobble, this.radius * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 136, 0, 0.9)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(-this.radius * 0.2, -wobble, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffaa00';
        ctx.fill();

        const bubbleScale = (performance.now() / 500 + this.y) % 1;
        ctx.beginPath();
        ctx.arc(this.radius * 0.3, this.radius * 0.3 - (bubbleScale * 15), 4 * (1 - bubbleScale), 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 1 - bubbleScale;
        ctx.fill();

        ctx.restore();
    }
}

class AcidTrail {
    constructor(x, y, px, py) {
        this.x = x;
        this.y = y;
        this.px = px;
        this.py = py;
        this.radius = 25;
        this.life = 4.0;
        this.damageTimer = 0;
    }
    update(dt, player) {
        this.life -= dt;
        if (this.damageTimer > 0) this.damageTimer -= dt;

        const l2 = (this.x - this.px) ** 2 + (this.y - this.py) ** 2;
        let t = 0;
        if (l2 !== 0) {
            t = Math.max(0, Math.min(1, ((player.x - this.px) * (this.x - this.px) + (player.y - this.py) * (this.y - this.py)) / l2));
        }
        const projX = this.px + t * (this.x - this.px);
        const projY = this.py + t * (this.y - this.py);
        const dist = Math.hypot(player.x - projX, player.y - projY);

        if (dist < this.radius + player.radius && this.damageTimer <= 0) {
            player.takeDamage(5);
            this.damageTimer = 0.5;
        }
    }
    draw(ctx) {
        if (Math.max(this.x, this.px) < camera.x - 100 || Math.min(this.x, this.px) > camera.x + width + 100 ||
            Math.max(this.y, this.py) < camera.y - 100 || Math.min(this.y, this.py) > camera.y + height + 100) return;

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, this.life));

        ctx.strokeStyle = 'rgba(138, 255, 0, 0.6)';
        ctx.lineWidth = this.radius * 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(this.px, this.py);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();

        ctx.fillStyle = '#ccff66';
        ctx.beginPath();
        const midX = (this.x + this.px) / 2;
        const midY = (this.y + this.py) / 2;
        ctx.arc(midX + 8, midY - 6, 4, 0, Math.PI * 2);
        ctx.arc(this.x - 5, this.y + 8, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

class CrossBomb {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.timer = 3.0;
        this.state = 'ticking';
        this.blastRadius = 250;
        this.thickness = 40;
        this.explosionTimer = 0.3;
    }
    update(dt, player) {
        if (this.state === 'ticking') {
            this.timer -= dt;
            if (this.timer <= 0) {
                this.explode(player);
            }
        }
    }
    explode(player) {
        this.state = 'exploded';
        if (Math.hypot(player.x - this.x, player.y - this.y) < Math.max(width, height)) cameraShake = 20;

        for (let i = 0; i < 80; i++) {
            let isHoriz = Math.random() > 0.5;
            let distP = (Math.random() * 2 - 1) * this.blastRadius;
            let spread = (Math.random() * 2 - 1) * (this.thickness / 2);
            let px = this.x + (isHoriz ? distP : spread);
            let py = this.y + (isHoriz ? spread : distP);

            const colors = ['#ffcc00', '#ff6600', '#ff0000', '#ff3300'];
            const color = colors[Math.floor(Math.random() * colors.length)];

            particles.push(new Particle(
                px, py,
                (randomNum()) * 50 + (isHoriz ? 0 : (randomNum()) * 100),
                (randomNum()) * 50 + (isHoriz ? (randomNum()) * 100 : 0),
                color,
                5 + Math.random() * 15
            ));
        }

        let hitH = Math.abs(player.y - this.y) < this.thickness / 2 + player.radius && Math.abs(player.x - this.x) < this.blastRadius + player.radius;
        let hitV = Math.abs(player.x - this.x) < this.thickness / 2 + player.radius && Math.abs(player.y - this.y) < this.blastRadius + player.radius;

        if ((hitH || hitV) && player.damageTimer <= 0) {
            player.takeDamage(25);
            player.damageTimer = 0.5;
        }

        for (let t of miniTurrets) {
            if (Math.hypot(t.x - this.x, t.y - this.y) < this.blastRadius + t.radius) {
                t.takeDamage(50);
            }
        }

        for (let i = breakableBlocks.length - 1; i >= 0; i--) {
            let b = breakableBlocks[i];
            let bCX = b.x + b.w / 2;
            let bCY = b.y + b.h / 2;
            let bHitH = Math.abs(bCY - this.y) < this.thickness / 2 + 30 && Math.abs(bCX - this.x) < this.blastRadius + 30;
            let bHitV = Math.abs(bCX - this.x) < this.thickness / 2 + 30 && Math.abs(bCY - this.y) < this.blastRadius + 30;

            if (bHitH || bHitV) {
                b.hp = 0;
                for (let p = 0; p < 10; p++) particles.push(new Particle(bCX, bCY, (randomNum()) * 200, (randomNum()) * 200, '#8b5a2b', 5));
                if (Math.random() < 0.15) powerUps.push(new PowerUp(bCX, bCY, 'invisibility'));
                breakableBlocks.splice(i, 1);
            }
        }
    }
    draw(ctx) {
        if (this.x < camera.x - 300 || this.x > camera.x + width + 300 ||
            this.y < camera.y - 300 || this.y > camera.y + height + 300) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.state === 'ticking') {
            const pulse = Math.sin(this.timer * 10) * 2;
            ctx.fillStyle = '#111';
            ctx.beginPath(); ctx.arc(0, 0, 15 + pulse, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#ff0000';
            ctx.beginPath(); ctx.arc(0, 0, 6 + pulse, 0, Math.PI * 2); ctx.fill();

            ctx.fillStyle = 'rgba(255, 0, 0, 0.05)';
            ctx.beginPath(); ctx.roundRect(-this.blastRadius, -this.thickness / 2, this.blastRadius * 2, this.thickness, 15); ctx.fill();
            ctx.beginPath(); ctx.roundRect(-this.thickness / 2, -this.blastRadius, this.thickness, this.blastRadius * 2, 15); ctx.fill();
        } else if (this.state === 'exploded') {
            const flicker = 0.7 + Math.random() * 0.3;
            ctx.fillStyle = `rgba(255, ${Math.floor(80 + Math.random() * 50)}, 0, ${flicker})`;
            ctx.shadowBlur = 20; ctx.shadowColor = '#ff0000';

            ctx.beginPath(); ctx.roundRect(-this.blastRadius, -this.thickness / 2, this.blastRadius * 2, this.thickness, 15); ctx.fill();
            ctx.beginPath(); ctx.roundRect(-this.thickness / 2, -this.blastRadius, this.thickness, this.blastRadius * 2, 15); ctx.fill();

            ctx.fillStyle = `rgba(255, 255, 200, ${flicker})`;
            ctx.beginPath(); ctx.roundRect(-this.blastRadius * 0.8, -this.thickness / 4, this.blastRadius * 1.6, this.thickness / 2, 8); ctx.fill();
            ctx.beginPath(); ctx.roundRect(-this.thickness / 4, -this.blastRadius * 0.8, this.thickness / 2, this.blastRadius * 1.6, 8); ctx.fill();
        }
        ctx.restore();
    }
}

class FloatingText {
    constructor(text, x, y, color) { this.text = text; this.x = x; this.y = y; this.color = color; this.life = 1.5; this.vy = -50; }
    update(dt) { this.y += this.vy * dt; this.life -= dt; }
    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life); ctx.fillStyle = this.color;
        ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center'; ctx.strokeStyle = '#000'; ctx.lineWidth = 4;
        ctx.strokeText(this.text, this.x, this.y); ctx.fillText(this.text, this.x, this.y); ctx.globalAlpha = 1.0;
    }
}

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.radius = 18;
        this.life = 20.0;
        this.active = true;
        this.bobTimer = Math.random() * Math.PI * 2;
    }
    update(dt, player) {
        this.life -= dt;
        if (this.life <= 0) this.active = false;
        if (!this.active) return;

        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        if (dist < this.radius + player.radius) {
            this.active = false;
            if (this.type === 'invisibility') {
                player.makeInvisible(10);
                floatingTexts.push(new FloatingText("INVISÍVEL!", this.x, this.y - 20, '#cc00ff'));
            }
        }
    }
    draw(ctx) {
        if (!this.active || this.x < camera.x - 100 || this.x > camera.x + width + 100 ||
            this.y < camera.y - 100 || this.y > camera.y + height + 100) return;

        this.bobTimer += 0.05;
        const bob = Math.sin(this.bobTimer) * 5;

        ctx.save();
        ctx.translate(this.x, this.y + bob);
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#cc00ff';
        ctx.fillStyle = 'rgba(204, 0, 255, 0.8)';

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👻', 0, 2);

        ctx.restore();
    }
}

// --- FUNÇÕES DE CONTROLE DE FLUXO ---

async function forceLandscape() {
    try {
        if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
        }
        if (screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock('landscape');
        }
    } catch (e) {
        console.log("Bloqueio de tela cheia / orientação falhou ou não é suportado.", e);
    }
}

function startGame(selectedMode) {
    if (!isStudentNameValid(studentName)) {
        showStudentModal(readStoredStudentName() || studentNameInput.value.trim());
        setStudentNameError('Confirme um nome valido antes de iniciar.');
        return;
    }

    if (isMobile) forceLandscape();

    if (selectedMode) gameMode = selectedMode;

    player = new Player();
    currentQuestionIndex = 0;
    results = [];

    waterY = arenaHeight;
    waveTimer = 0;
    waterActive = false;
    waterWarningShown = false;

    gameState = 'PLAYING';
    overlay.classList.add('hidden');
    celebOverlay.classList.add('hidden');
    celebOverlay.classList.remove('visible');
    updateHealthBar();
    updateHeatBar();
    loadWave();
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function updateHealthBar() {
    if (!player) return;
    const hpPct = Math.max(0, player.hp / player.maxHp) * 100;
    healthBar.style.width = hpPct + '%';
    if (hpPct > 50) healthBar.style.backgroundColor = '#00ff88';
    else if (hpPct > 25) healthBar.style.backgroundColor = 'orange';
    else healthBar.style.backgroundColor = 'red';
}

function updateHeatBar() {
    if (!player) return;
    const heatPct = Math.max(0, player.heat / player.maxHeat) * 100;
    heatBar.style.width = heatPct + '%';
    if (player.isOverheated) {
        heatBar.style.backgroundColor = '#ff0000';
        heatBarContainer.classList.add('overheated');
    } else {
        heatBarContainer.classList.remove('overheated');
        if (heatPct > 75) heatBar.style.backgroundColor = '#ff9600';
        else heatBar.style.backgroundColor = '#ffc800';
    }
}

function loadWave() {
    gameState = 'PLAYING';
    questionStartTime = performance.now();
    questionDecided = false;

    if (player) {
        player.hp = player.maxHp;
        player.heat = 0;
        player.isOverheated = false;
        updateHealthBar();
        updateHeatBar();
    }

    waterY = arenaHeight;
    waveTimer = 0;
    waterActive = false;
    waterWarningShown = false;

    enemies = []; bullets = []; lobbedBullets = []; particles = []; shrapnels = []; mines = []; spikes = []; lavas = []; acidTrails = []; crossBombs = []; lightningSpheres = []; bouncingSpheres = []; powerUps = []; miniTurrets = [];
    const q = questions[currentQuestionIndex];
    waveCounter.innerText = `Nível ${currentQuestionIndex + 1} / ${questions.length}`;

    questionText.innerText = q.text;
    objectiveText.innerText = gameMode === 'MODE_CORRECT' ? "OBJETIVO: Destrua apenas a correta!" : "OBJETIVO: Destrua todas as falsas!";
    objectiveText.style.color = gameMode === 'MODE_CORRECT' ? "#00ff88" : "#ffc800";

    questionBanner.classList.remove('hidden');
    questionBanner.style.transform = 'translateY(0)';
    adjustCanvasSize();

    loadFixedMapLayout(currentQuestionIndex);

    let options = shuffleArray([...q.options]);

    let enemyTypes = [];
    let botPool = shuffleArray([...selectedBots]);

    for (let i = 0; i < 13; i++) {
        enemyTypes.push(botPool[i % botPool.length]);
    }
    enemyTypes = shuffleArray(enemyTypes);

    const safeDist = 800;
    for (let i = 0; i < 13; i++) {
        if (!options[i]) return;
        const typeToSpawn = enemyTypes[i];
        const spawnPoint = findFreeEnemySpawnPoint(safeDist, 35);
        const sx = spawnPoint.x;
        const sy = spawnPoint.y;

        enemies.push(new Enemy(sx, sy, options[i].text, options[i].isCorrect, typeToSpawn));
    }
}

function triggerTransition(isWin) {
    gameState = 'TRANSITION';
    currentQuestionIndex++;

    questionBanner.style.transform = 'translateY(-100%)';

    if (currentQuestionIndex >= questions.length) {
        celebTitle.innerText = "DESAFIO CONCLUÍDO!";
        celebTitle.style.color = "#00ff88";
        celebTitle.style.textShadow = "0 0 30px #00ff88, 3px 3px 0px #000";
        celebDesc.innerText = "Preparando resultado final...";
    } else {
        celebTitle.innerText = isWin ? "ÁREA LIMPA!" : "ERRADO!";
        celebTitle.style.color = isWin ? "#00ff88" : "#ff4b4b";
        celebTitle.style.textShadow = isWin ? "0 0 30px #00ff88, 3px 3px 0px #000" : "0 0 30px #ff4b4b, 3px 3px 0px #000";
        celebDesc.innerText = isWin ? "Avançando para a próxima área..." : "Próxima questão...";
    }

    celebOverlay.classList.remove('hidden');
    void celebOverlay.offsetWidth;
    celebOverlay.classList.add('visible');

    bullets = [];
    lobbedBullets = [];
    shrapnels = [];
    mines = [];
    spikes = [];
    lavas = [];
    acidTrails = [];
    crossBombs = [];
    lightningSpheres = [];
    bouncingSpheres = [];
    powerUps = [];
    miniTurrets = [];

    const oldEnemies = [...enemies];
    enemies = [];

    oldEnemies.forEach((e, index) => {
        setTimeout(() => {
            for (let i = 0; i < 15; i++) particles.push(new Particle(e.x, e.y, (randomNum()) * 200, (randomNum()) * 200, '#aaa', 5));
        }, index * 150);
    });

    setTimeout(() => {
        celebOverlay.classList.remove('visible');
        setTimeout(() => {
            celebOverlay.classList.add('hidden');
            if (currentQuestionIndex >= questions.length) {
                gameWin();
            } else {
                loadWave();
            }
        }, 500);
    }, 2500);
}

function gameOver(reasonMsg = "Você foi derrotado pelas alternativas incorretas.") {
    gameState = 'GAMEOVER';
    if (document.fullscreenElement) document.exitFullscreen().catch(err => console.log(err));
    overlay.classList.remove('hidden'); questionBanner.classList.add('hidden'); adjustCanvasSize();
    overlayTitle.innerText = "GAME OVER"; overlayTitle.style.color = "#ff0000";
    overlayDesc.innerHTML = reasonMsg;
    controlsInfo.classList.add('hidden');
    overlay.scrollTop = 0;
}

function gameWin() {
    gameState = 'WIN';
    if (document.fullscreenElement) document.exitFullscreen().catch(err => console.log(err));
    overlay.classList.remove('hidden'); questionBanner.classList.add('hidden'); adjustCanvasSize();
    overlay.scrollTop = 0;
    overlayTitle.innerText = "VITÓRIA!"; overlayTitle.style.color = "#00ff88";
    const correct = results.filter(r => r.correct).length;
    const total = results.length;
    const avgTime = total > 0 ? (results.reduce((s, r) => s + r.duration, 0) / total).toFixed(1) : 0;
    const resultRows = results.map((r, i) =>
        `<span style="color:${r.correct ? '#00ff88' : '#ff4b4b'}">${r.correct ? '✔' : '✘'}</span> Q${i + 1}: ${r.duration}s`
    ).join(' &nbsp;|&nbsp; ');
    overlayDesc.innerHTML = `Parabéns! <b>${correct}/${total}</b> corretas &middot; Média: <b>${avgTime}s</b><br><small style="opacity:0.75;font-size:12px">${resultRows}</small>`;
    console.log("=== RESULTADOS ===", results);
    controlsInfo.classList.add('hidden');
    insertHistoryPractice(results);
}

function drawWater(ctx) {
    if (waterY >= arenaHeight) return;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 150, 255, 0.4)';

    ctx.beginPath();
    let startX = camera.x;
    let endX = camera.x + width;

    ctx.moveTo(startX, waterY);

    let waveOffset = performance.now() / 200;
    for (let x = startX; x <= endX; x += 20) {
        ctx.lineTo(x, waterY + Math.sin((x / 60) + waveOffset) * 12);
    }

    ctx.lineTo(endX, arenaHeight);
    ctx.lineTo(startX, arenaHeight);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let x = startX; x <= endX; x += 20) {
        let curY = waterY + Math.sin((x / 60) + waveOffset) * 12;
        if (x === startX) ctx.moveTo(x, curY);
        else ctx.lineTo(x, curY);
    }
    ctx.stroke();

    ctx.restore();
}

function drawBackground(ctx) {
    ctx.fillStyle = '#111'; ctx.fillRect(camera.x, camera.y, width, height);

    ctx.lineWidth = 15;
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.5)';
    ctx.strokeRect(0, 0, arenaWidth, arenaHeight);

    ctx.strokeStyle = '#222'; ctx.lineWidth = 2; const gridSize = 100;

    const startX = Math.max(0, Math.floor(camera.x / gridSize) * gridSize);
    const startY = Math.max(0, Math.floor(camera.y / gridSize) * gridSize);
    const endX = Math.min(arenaWidth, startX + width + gridSize * 2);
    const endY = Math.min(arenaHeight, startY + height + gridSize * 2);

    for (let x = startX; x <= endX; x += gridSize) { ctx.beginPath(); ctx.moveTo(x, startY); ctx.lineTo(x, endY); ctx.stroke(); }
    for (let y = startY; y <= endY; y += gridSize) { ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(endX, y); ctx.stroke(); }

    function isVisible(obj) {
        return (obj.x + (obj.w || 0) > camera.x - 300 && obj.x < camera.x + width + 300 &&
            obj.y + (obj.h || 0) > camera.y - 300 && obj.y < camera.y + height + 300);
    }

    ctx.fillStyle = '#1a1a1a'; ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 3;
    for (let obs of obstacles) {
        if (isVisible(obs)) {
            ctx.beginPath(); ctx.roundRect(obs.x, obs.y, obs.w, obs.h, 15); ctx.fill(); ctx.stroke();
            ctx.shadowBlur = 15; ctx.shadowColor = 'rgba(0, 255, 136, 0.3)'; ctx.stroke(); ctx.shadowBlur = 0;
        }
    }

    ctx.fillStyle = '#8b5a2b'; ctx.strokeStyle = '#5c3a18'; ctx.lineWidth = 3;
    for (let block of breakableBlocks) {
        if (isVisible(block)) {
            ctx.beginPath(); ctx.roundRect(block.x, block.y, block.w, block.h, 5); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(block.x + 5, block.y + 5); ctx.lineTo(block.x + block.w - 5, block.y + block.h - 5);
            ctx.moveTo(block.x + block.w - 5, block.y + 5); ctx.lineTo(block.x + 5, block.y + block.h - 5); ctx.stroke();
            if (block.hp < block.maxHp) {
                const hpPct = block.hp / block.maxHp;
                ctx.fillStyle = 'red'; ctx.fillRect(block.x, block.y - 12, block.w, 6);
                ctx.fillStyle = '#00ff88'; ctx.fillRect(block.x, block.y - 12, block.w * hpPct, 6);
            }
        }
    }

    crossBombs.forEach(cb => cb.draw(ctx));
    acidTrails.forEach(a => a.draw(ctx));
    lavas.forEach(l => l.draw(ctx));
    mines.forEach(m => m.draw(ctx));
    spikes.forEach(s => s.draw(ctx));

    ctx.fillStyle = '#115922'; ctx.strokeStyle = '#1b8032'; ctx.lineWidth = 4;
    for (let b of bushes) {
        if (isVisible(b)) { ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 20); ctx.fill(); ctx.stroke(); }
    }

    drawWater(ctx);
}

function gameLoop(time) {
    if (gameState !== 'PLAYING' && gameState !== 'TRANSITION') return;
    const dt = (time - lastTime) / 1000; lastTime = time;

    if (gameState === 'PLAYING') {
        waveTimer += dt;
        if (waveTimer >= 20 && !waterWarningShown) {
            waterWarningShown = true;
            floatingTexts.push(new FloatingText("A ÁGUA ESTÁ SUBINDO!", player.x, player.y - 100, '#00ffff'));
        }
        if (waveTimer >= 20) {
            waterActive = true;
            waterY -= 30 * dt;
            if (waterY < 600) waterY = 600;
        }
    }

    player.update(dt); updateHeatBar();

    camera.x = Math.max(0, Math.min(player.x - width / 2, arenaWidth - width));
    camera.y = Math.max(0, Math.min(player.y - height / 2, arenaHeight - height));

    for (let i = lightningSpheres.length - 1; i >= 0; i--) {
        let ls = lightningSpheres[i];
        ls.update(dt);
        if (!ls.active || ls.y > waterY) {
            lightningSpheres.splice(i, 1);
        }
    }

    for (let i = bouncingSpheres.length - 1; i >= 0; i--) {
        let bs = bouncingSpheres[i];
        bs.update(dt, player);
        if (!bs.active || bs.y > waterY) {
            bouncingSpheres.splice(i, 1);
        }
    }

    for (let i = lobbedBullets.length - 1; i >= 0; i--) {
        let b = lobbedBullets[i];
        b.update(dt);
        if (!b.active) lobbedBullets.splice(i, 1);
    }

    for (let i = powerUps.length - 1; i >= 0; i--) {
        let pu = powerUps[i];
        pu.update(dt, player);
        if (!pu.active || pu.y > waterY) {
            powerUps.splice(i, 1);
        }
    }

    for (let i = miniTurrets.length - 1; i >= 0; i--) {
        let mt = miniTurrets[i];
        mt.update(dt, player);
        if (!mt.active || mt.y > waterY) {
            if (mt.y > waterY) {
                for (let p = 0; p < 5; p++) particles.push(new Particle(mt.x, mt.y, (randomNum()) * 50, (randomNum()) * 50 - 50, '#cccccc', 8));
            }
            miniTurrets.splice(i, 1);
            continue;
        }
        // Colisão física com o player
        const mtDx = player.x - mt.x;
        const mtDy = player.y - mt.y;
        const mtDist = Math.hypot(mtDx, mtDy);
        const mtMinDist = mt.radius + player.radius;
        if (mtDist < mtMinDist && mtDist > 0) {
            const overlap = mtMinDist - mtDist;
            const nx = mtDx / mtDist;
            const ny = mtDy / mtDist;
            player.x += nx * overlap;
            player.y += ny * overlap;
        }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i]; 
        if (!b) break;
        b.update(dt);
        if (b.active && gameState === 'PLAYING') {
            if (b.isPlayer) {
                for (let e of enemies) {
                    if (e.type === 'mimic' && !e.isSpawned) continue;
                    let hitRadius = e.isShieldActive ? e.radius + 10 : e.radius;
                    const dist = Math.hypot(b.x - e.x, b.y - e.y);
                    if (dist < b.radius + hitRadius) {
                        b.active = false;
                        if (e.isShieldActive) {
                            for (let p = 0; p < 5; p++) particles.push(new Particle(b.x, b.y, (randomNum()) * 200, (randomNum()) * 200, '#00ffff', 4));
                        } else {
                            e.takeDamage(25);
                            for (let p = 0; p < 5; p++) particles.push(new Particle(b.x, b.y, (randomNum()) * 150, (randomNum()) * 150, '#ffcc00', 3));
                        }
                        break;
                    }
                }

                if (b.active) {
                    for (let t of miniTurrets) {
                        if (t.active && Math.hypot(b.x - t.x, b.y - t.y) < b.radius + t.radius) {
                            b.active = false;
                            t.takeDamage(25);
                            for (let p = 0; p < 5; p++) particles.push(new Particle(b.x, b.y, (randomNum()) * 100, (randomNum()) * 100, t.color, 3));
                            break;
                        }
                    }
                }

            } else {
                const dist = Math.hypot(b.x - player.x, b.y - player.y);
                if (dist < b.radius + player.radius) {
                    player.takeDamage(15); b.active = false;
                    for (let p = 0; p < 5; p++) particles.push(new Particle(b.x, b.y, (randomNum()) * 150, (randomNum()) * 150, '#ff0055', 3));
                }
            }
        }
        if (!b.active) bullets.splice(i, 1);
    }

    if (gameState === 'PLAYING') {
        enemies.forEach(e => e.update(dt, player));
        for (let i = mines.length - 1; i >= 0; i--) {
            let m = mines[i];
            m.update(dt, player);
            if (m.state === 'exploded' || m.y > waterY) {
                mines.splice(i, 1);
            }
        }
        for (let i = spikes.length - 1; i >= 0; i--) {
            let s = spikes[i];
            s.update(dt, player, enemies);
            if (s.y > waterY) {
                spikes.splice(i, 1);
            }
        }
        for (let i = lavas.length - 1; i >= 0; i--) {
            let l = lavas[i];
            l.update(dt, player);
            if (l.y > waterY) {
                lavas.splice(i, 1);
                for (let p = 0; p < 5; p++) particles.push(new Particle(l.x, l.y, (randomNum()) * 50, (randomNum()) * 50 - 50, '#cccccc', 8));
            }
        }
        for (let i = acidTrails.length - 1; i >= 0; i--) {
            let a = acidTrails[i];
            a.update(dt, player);
            if (a.life <= 0 || a.y > waterY) {
                acidTrails.splice(i, 1);
            }
        }
        for (let i = crossBombs.length - 1; i >= 0; i--) {
            let cb = crossBombs[i];
            cb.update(dt, player);
            if (cb.state === 'exploded') {
                cb.explosionTimer -= dt;
                if (cb.explosionTimer <= 0) crossBombs.splice(i, 1);
            } else if (cb.y > waterY) {
                crossBombs.splice(i, 1);
            }
        }
    }

    for (let i = particles.length - 1; i >= 0; i--) { particles[i].update(dt); if (particles[i].life <= 0) particles.splice(i, 1); }
    for (let i = shrapnels.length - 1; i >= 0; i--) { shrapnels[i].update(dt); if (!shrapnels[i].active) shrapnels.splice(i, 1); }
    for (let i = floatingTexts.length - 1; i >= 0; i--) { floatingTexts[i].update(dt); if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1); }

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    if (cameraShake > 0) {
        ctx.translate((randomNum()) * cameraShake, (randomNum()) * cameraShake);
        cameraShake *= 0.9; if (cameraShake < 0.5) cameraShake = 0;
    }

    drawBackground(ctx);
    particles.forEach(p => p.draw(ctx));
    shrapnels.forEach(s => s.draw(ctx));
    lobbedBullets.forEach(lb => lb.draw(ctx));
    miniTurrets.forEach(mt => mt.draw(ctx));
    bullets.forEach(b => b.draw(ctx));
    lightningSpheres.forEach(ls => ls.draw(ctx));
    bouncingSpheres.forEach(bs => bs.draw(ctx));
    powerUps.forEach(pu => pu.draw(ctx));
    enemies.forEach(e => e.draw(ctx));
    player.draw(ctx);
    floatingTexts.forEach(ft => ft.draw(ctx));

    ctx.restore();

    drawJoysticks(ctx);

    requestAnimationFrame(gameLoop);
}

// Inicialização segura
window.addEventListener('resize', adjustCanvasSize);
adjustCanvasSize();

globalThis.startGame = startGame;
globalThis.toggleBot = toggleBot;
globalThis.selectTank = selectTank;