/* =======================================================================
       DADOS EDUCACIONAIS (CATEGORIAS E ITENS)
       Fácil de editar para adicionar mais conteúdo.
    ======================================================================== */
const gameData = [
    {
        category: "Animais da Amazônia",
        correct: ["Onça", "Tucano", "Macaco", "Boto", "Capivara", "Arara", "Preguiça", "Jacaré"],
        wrong: ["Cadeira", "Avião", "Geladeira", "Computador", "Prédio", "Celular", "Carro", "Relógio"]
    },
    {
        category: "Frutas",
        correct: ["Açaí", "Cupuaçu", "Banana", "Guaraná", "Cacau", "Maracujá", "Caju"],
        wrong: ["Pedra", "Livro", "Sapato", "Cachorro", "Caneta", "Mesa", "Gato"]
    },
    {
        category: "Natureza (Sem objetos)",
        correct: ["Árvore", "Rio", "Folha", "Flor", "Cachoeira", "Terra", "Raiz"],
        wrong: ["Plástico", "Vidro", "Motor", "Pneu", "Asfalto", "Bateria", "Garrafa"]
    }
];

/* =======================================================================
   SISTEMA DE SOM (Web Audio API puro, sem arquivos externos)
======================================================================== */
const AudioSys = {
    ctx: null,
    init() {
        if (!this.ctx) {
            const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
    },
    playTone(freq, type, duration, vol = 0.1, slideFreq = null) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if (slideFreq) {
            osc.frequency.exponentialRampToValueAtTime(slideFreq, this.ctx.currentTime + duration);
        }

        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },
    playCorrect() {
        this.playTone(600, 'sine', 0.1, 0.2, 800);
        setTimeout(() => this.playTone(800, 'sine', 0.15, 0.2, 1200), 100);
    },
    playWrong() {
        this.playTone(300, 'sawtooth', 0.3, 0.2, 100);
    },
    playWin() {
        [400, 500, 600, 800].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'square', 0.2, 0.1), i * 150);
        });
    },
    playPop() {
        this.playTone(400, 'sine', 0.1, 0.1);
    }
};

/* =======================================================================
   ESTADO GLOBAL DO JOGO
======================================================================== */
const GameState = {
    score: 0,
    lives: 3,
    currentLevel: 0,
    currentStep: 0,
    totalSteps: 0,
    preparedLevel: -1,
    levelSteps: [],
    cardsToCollect: 0,
    joystick: { x: 0, y: 0, active: false }
};

const MAX_CAVE_TEXT_LENGTH = 500;
const MAX_CORRECTS_PER_STEP = 3;
const MAX_SEED_STEP_WIDTH_TILES = 40;
const MAP_SIDE_MARGIN_TILES = 4;
const CAVE_GAP_TILES = 4;

function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function createFilledGrid(width, height, fillValue) {
    return Array.from({ length: height }, () => new Array(width).fill(fillValue));
}

function wrapTextByCharacters(text, maxCharsPerLine) {
    const normalizedText = `${text ?? ''}`.replaceAll(/\s+/g, ' ').trim();
    if (!normalizedText) return '';

    const words = normalizedText.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach((word) => {
        if (!word) return;

        if (word.length > maxCharsPerLine) {
            if (currentLine) {
                lines.push(currentLine);
                currentLine = '';
            }

            for (let index = 0; index < word.length; index += maxCharsPerLine) {
                lines.push(word.slice(index, index + maxCharsPerLine));
            }
            return;
        }

        const candidate = currentLine ? `${currentLine} ${word}` : word;
        if (candidate.length <= maxCharsPerLine) {
            currentLine = candidate;
            return;
        }

        if (currentLine) lines.push(currentLine);
        currentLine = word;
    });

    if (currentLine) lines.push(currentLine);

    return lines.join('\n');
}

function measureTextLayout(rawText) {
    const displayText = `${rawText ?? ''}`.trim().slice(0, MAX_CAVE_TEXT_LENGTH);
    const length = Math.max(displayText.length, 1);

    let fontSize = 26;
    if (length > 40) fontSize = 24;
    if (length > 80) fontSize = 20;
    if (length > 140) fontSize = 18;
    if (length > 220) fontSize = 16;
    if (length > 320) fontSize = 14;
    if (length > 420) fontSize = 12;

    const averageCharWidth = fontSize * 0.6;
    const targetLineWidth = clampNumber(220 + Math.sqrt(length) * 14, 220, 520);
    const maxCharsPerLine = Math.max(8, Math.floor(targetLineWidth / averageCharWidth));
    const wrappedText = wrapTextByCharacters(displayText, maxCharsPerLine);
    const lines = wrappedText.split('\n').filter(Boolean);
    const longestLineLength = lines.reduce((max, line) => Math.max(max, line.length), 0);
    const lineHeight = Math.round(fontSize * 1.35);
    const textWidthPx = Math.max(fontSize * 4, longestLineLength * averageCharWidth);
    const textHeightPx = Math.max(lineHeight, lines.length * lineHeight);
    const roomWidth = clampNumber(Math.ceil((textWidthPx + 72) / 60), 4, 14);
    const roomHeight = clampNumber(Math.ceil((textHeightPx + 72) / 60), 4, 10);

    return {
        displayText,
        wrappedText,
        fontSize,
        roomWidth,
        roomHeight,
        lineCount: Math.max(lines.length, 1)
    };
}

function createItemDescriptor(text, isCorrect, index) {
    return {
        id: `${isCorrect ? 'correct' : 'wrong'}-${index}`,
        text,
        isCorrect,
        ...measureTextLayout(text)
    };
}

function estimateStepSpan(item) {
    return item.roomWidth + CAVE_GAP_TILES;
}

function createStepShell() {
    return {
        items: [],
        correctCount: 0,
        estimatedWidth: MAP_SIDE_MARGIN_TILES * 2 + 6
    };
}

function buildLevelSteps(levelData) {
    const correctItems = Phaser.Utils.Array.Shuffle(
        levelData.correct.map((text, index) => createItemDescriptor(text, true, index))
    );
    const wrongItems = Phaser.Utils.Array.Shuffle(
        levelData.wrong.map((text, index) => createItemDescriptor(text, false, index))
    );

    const steps = [];
    let currentStep = createStepShell();

    correctItems.forEach((item) => {
        const span = estimateStepSpan(item);
        const shouldStartNewStep = currentStep.items.length > 0 && (
            currentStep.correctCount >= MAX_CORRECTS_PER_STEP ||
            currentStep.estimatedWidth + span > MAX_SEED_STEP_WIDTH_TILES
        );

        if (shouldStartNewStep) {
            steps.push(currentStep);
            currentStep = createStepShell();
        }

        currentStep.items.push(item);
        currentStep.correctCount += 1;
        currentStep.estimatedWidth += span;
    });

    if (currentStep.items.length > 0) {
        steps.push(currentStep);
    }

    wrongItems.forEach((item, index) => {
        const targetStep = steps[index % steps.length];
        targetStep.items.push(item);
        targetStep.estimatedWidth += estimateStepSpan(item);
    });

    steps.forEach((step, stepIndex) => {
        step.index = stepIndex;
        step.items = Phaser.Utils.Array.Shuffle(step.items);
        step.correctCount = step.items.filter((item) => item.isCorrect).length;
    });

    return steps.filter((step) => step.items.length > 0 && step.correctCount > 0);
}

function prepareLevelSteps(levelIndex) {
    if (GameState.preparedLevel === levelIndex && GameState.levelSteps.length > 0) {
        return GameState.levelSteps;
    }

    GameState.levelSteps = buildLevelSteps(gameData[levelIndex]);
    GameState.totalSteps = GameState.levelSteps.length;
    GameState.preparedLevel = levelIndex;
    GameState.currentStep = 0;
    return GameState.levelSteps;
}

function resetJoystickState() {
    GameState.joystick.x = 0;
    GameState.joystick.y = 0;
    GameState.joystick.active = false;
}

function restartGameplayScenes() {
    resetJoystickState();

    if (!game) {
        initPhaser();
        return;
    }

    game.scene.stop('UIScene');
    game.scene.stop('GameScene');
    game.scene.start('GameScene');
    game.scene.start('UIScene');
    game.scene.bringToTop('UIScene');
}

/* =======================================================================
   PHASER SCENES
======================================================================== */

// 1. Scene de Inicialização e Geração de Gráficos (Sem Assets Externos)
class BootScene extends Phaser.Scene {
    constructor() { super('BootScene'); }

    create() {
        this.generateTextures();
        this.scene.start('GameScene');
        this.scene.start('UIScene');
        this.scene.bringToTop('UIScene');
    }

    generateTextures() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        const tileSize = 60;

        // Chão (Terra da floresta)
        g.clear();
        g.fillStyle(0xE1BE8B, 1);
        g.fillRect(0, 0, tileSize, tileSize);
        // Pontinhos de terra
        g.fillStyle(0xCDA56D, 1);
        g.fillCircle(15, 15, 3);
        g.fillCircle(45, 40, 4);
        g.fillCircle(20, 50, 2);
        g.generateTexture('tex_floor', tileSize, tileSize);

        // Chão da Caverna (Terra um pouco mais escura para as salas seguras)
        g.clear();
        g.fillStyle(0xC29D70, 1);
        g.fillRect(0, 0, tileSize, tileSize);
        g.fillStyle(0xAE8D64, 1);
        g.fillCircle(15, 15, 3);
        g.fillCircle(45, 40, 4);
        g.fillCircle(20, 50, 2);
        g.generateTexture('tex_cave_floor', tileSize, tileSize);

        // Parede (Árvores/Arbustos - Flat Design)
        g.clear();
        g.fillStyle(0x58CC02, 1); // Verde primário
        g.fillRoundedRect(0, 0, tileSize, tileSize, 12);
        g.fillStyle(0x58A700, 1); // Sombra interna inferior
        g.fillRoundedRect(0, tileSize - 10, tileSize, 10, { bl: 12, br: 12, tl: 0, tr: 0 });
        // Folhas decorativas
        g.fillStyle(0x79D72F, 1);
        g.fillCircle(15, 20, 8);
        g.fillCircle(40, 25, 12);
        g.generateTexture('tex_wall', tileSize, tileSize);

        // Jogador (Mascote explorador)
        g.clear();
        // Sombra
        g.fillStyle(0x000000, 0.2);
        g.fillEllipse(24, 42, 30, 10);
        // Corpo/Cabeça
        g.fillStyle(0x1CB0F6, 1); // Azul amigável
        g.fillRoundedRect(8, 8, 32, 32, 16);
        g.fillStyle(0x1899D6, 1);
        g.fillRoundedRect(8, 30, 32, 10, { bl: 16, br: 16, tl: 0, tr: 0 });
        // Olhos
        g.fillStyle(0xFFFFFF, 1);
        g.fillCircle(18, 20, 6);
        g.fillCircle(30, 20, 6);
        g.fillStyle(0x3C3C3C, 1);
        g.fillCircle(18, 20, 3);
        g.fillCircle(30, 20, 3);
        g.generateTexture('tex_player', 48, 48);

        // Inimigo (Sapo/Aranha venenosa simplificada)
        g.clear();
        g.fillStyle(0xFF4B4B, 1); // Vermelho
        g.fillRoundedRect(8, 12, 32, 28, 10);
        g.fillStyle(0xEA2B2B, 1);
        g.fillRoundedRect(8, 30, 32, 10, { bl: 10, br: 10, tl: 0, tr: 0 });
        g.fillStyle(0xFFFFFF, 1);
        g.fillCircle(16, 22, 4);
        g.fillCircle(32, 22, 4);
        g.fillStyle(0x3C3C3C, 1);
        g.fillRect(14, 21, 4, 2);
        g.fillRect(30, 21, 4, 2); // Olhos bravos
        g.generateTexture('tex_enemy', 48, 48);

        // Partículas
        g.clear();
        g.fillStyle(0xFFC800, 1);
        g.fillCircle(4, 4, 4);
        g.generateTexture('tex_particle_star', 8, 8);

        g.clear();
        g.fillStyle(0x58CC02, 1);
        g.fillCircle(4, 4, 4);
        g.generateTexture('tex_particle_leaf', 8, 8);
    }
}

// 2. Cena Principal do Jogo
class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }

    create() {
        this.tileSize = 60;
        this.playerSpeed = 220;
        this.enemySpeed = 80;
        this.isGameOver = false;

        this.levelData = gameData[GameState.currentLevel];
        const levelSteps = prepareLevelSteps(GameState.currentLevel);
        this.stepData = levelSteps[GameState.currentStep] || levelSteps[0];
        GameState.cardsToCollect = this.stepData.correctCount;

        this.buildWorldLayout();

        // Ajustar câmera e mundo
        this.physics.world.setBounds(0, 0, this.mapW, this.mapH);
        this.cameras.main.setBounds(0, 0, this.mapW, this.mapH);
        this.cameras.main.setBackgroundColor('#8D6E63'); // Fundo marrom escuro atrás do mapa

        // Grupos Físicos
        this.walls = this.physics.add.staticGroup();
        this.enemyBlocks = this.physics.add.staticGroup();
        this.cardsGroup = this.physics.add.group();
        this.enemiesGroup = this.physics.add.group();

        // Gerar Mapa
        this.validPositions = [];
        this.generateMap();

        this.player = this.physics.add.sprite(this.spawnPoint.x, this.spawnPoint.y, 'tex_player');
        this.player.setCollideWorldBounds(true);

        // Atendendo ao pedido: Hitbox da exata largura do caminho (60).
        // Usamos 56 para dar apenas 2 pixels minúsculos de "respiro" contra as paredes.
        // O assistente magnético no update() fará o resto para deslizar como um trilho!
        this.player.body.setSize(56, 56);
        this.player.setDepth(10);

        // Animação de "respiração" do jogador
        this.tweens.add({
            targets: this.player,
            scaleY: 0.95,
            scaleX: 1.05,
            duration: 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.1);

        // Gerar Cartas e Inimigos
        this.spawnCards();
        this.spawnEnemies();

        // Colisões
        this.physics.add.collider(this.player, this.walls);
        this.physics.add.collider(this.enemiesGroup, this.walls);
        this.physics.add.collider(this.enemiesGroup, this.enemyBlocks);
        this.physics.add.overlap(this.player, this.enemiesGroup, this.hitEnemy, null, this);

        // Controles de Teclado
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,S,A,D');

        // Partículas
        this.createEmitters();

        // Atualizar UI inicial
        this.events.emit('updateHUD');
    }

    buildWorldLayout() {
        this.caves = this.createCaveDescriptors();
        this.widthTiles = this.caves.reduce(
            (max, cave) => Math.max(max, cave.roomX + cave.roomWidth + MAP_SIDE_MARGIN_TILES),
            24
        );
        this.topMaxHeight = this.caves
            .filter((cave) => cave.side === 'top')
            .reduce((max, cave) => Math.max(max, cave.roomHeight), 4);
        this.bottomMaxHeight = this.caves
            .filter((cave) => cave.side === 'bottom')
            .reduce((max, cave) => Math.max(max, cave.roomHeight), 4);

        this.corridorRows = {
            top: MAP_SIDE_MARGIN_TILES + this.topMaxHeight + 1,
            middle: MAP_SIDE_MARGIN_TILES + this.topMaxHeight + 3,
            bottom: MAP_SIDE_MARGIN_TILES + this.topMaxHeight + 5
        };
        this.heightTiles = this.corridorRows.bottom + this.bottomMaxHeight + MAP_SIDE_MARGIN_TILES + 3;
        this.mapLayout = createFilledGrid(this.widthTiles, this.heightTiles, 1);

        this.carveHorizontal(this.corridorRows.top, 1, this.widthTiles - 2, 0);
        this.carveHorizontal(this.corridorRows.middle, 1, this.widthTiles - 2, 0);
        this.carveHorizontal(this.corridorRows.bottom, 1, this.widthTiles - 2, 0);
        this.createMazeConnectors();
        this.placeCaves();

        this.mapW = this.widthTiles * this.tileSize;
        this.mapH = this.heightTiles * this.tileSize;
        this.spawnPoint = {
            x: (MAP_SIDE_MARGIN_TILES + 1.5) * this.tileSize,
            y: (this.corridorRows.middle + 0.5) * this.tileSize
        };
    }

    createCaveDescriptors() {
        let cursorX = MAP_SIDE_MARGIN_TILES + 2;

        return this.stepData.items.map((item, index) => {
            const cave = {
                ...item,
                side: index % 2 === 0 ? 'top' : 'bottom',
                roomX: cursorX,
                roomY: 0,
                doorX: cursorX,
                cardX: 0,
                cardY: 0,
                cardContainer: null,
                bounds: null
            };

            cursorX += item.roomWidth + CAVE_GAP_TILES;
            return cave;
        });
    }

    createMazeConnectors() {
        const connectorXs = new Set([2, this.widthTiles - 3]);
        this.caves.forEach((cave) => {
            connectorXs.add(cave.roomX + Math.floor(cave.roomWidth / 2));
        });

        for (let x = MAP_SIDE_MARGIN_TILES + 4; x < this.widthTiles - MAP_SIDE_MARGIN_TILES - 4; x += 10) {
            connectorXs.add(x);
        }

        [...connectorXs]
            .sort((left, right) => left - right)
            .forEach((x) => {
                this.carveVertical(x, this.corridorRows.top, this.corridorRows.bottom, 0);
            });
    }

    placeCaves() {
        this.caves.forEach((cave) => {
            cave.roomY = cave.side === 'top'
                ? MAP_SIDE_MARGIN_TILES + (this.topMaxHeight - cave.roomHeight)
                : this.corridorRows.bottom + 2;
            cave.doorX = clampNumber(
                cave.roomX + Math.floor(cave.roomWidth / 2),
                cave.roomX + 1,
                cave.roomX + cave.roomWidth - 2
            );

            this.carveRect(cave.roomX, cave.roomY, cave.roomWidth, cave.roomHeight, 3);

            if (cave.side === 'top') {
                this.carveVertical(cave.doorX, cave.roomY + cave.roomHeight, this.corridorRows.top, 0);
            } else {
                this.carveVertical(cave.doorX, this.corridorRows.bottom, cave.roomY - 1, 0);
            }

            cave.cardX = (cave.roomX + cave.roomWidth / 2) * this.tileSize;
            cave.cardY = (cave.roomY + cave.roomHeight / 2) * this.tileSize;
            cave.bounds = new Phaser.Geom.Rectangle(
                cave.roomX * this.tileSize,
                cave.roomY * this.tileSize,
                cave.roomWidth * this.tileSize,
                cave.roomHeight * this.tileSize
            );
        });
    }

    carveRect(startX, startY, width, height, tileType) {
        for (let y = startY; y < startY + height; y++) {
            if (!this.mapLayout[y]) continue;
            for (let x = startX; x < startX + width; x++) {
                if (this.mapLayout[y][x] === undefined) continue;
                this.mapLayout[y][x] = tileType;
            }
        }
    }

    carveHorizontal(y, startX, endX, tileType) {
        if (!this.mapLayout[y]) return;
        const from = Math.max(0, Math.min(startX, endX));
        const to = Math.min(this.mapLayout[y].length - 1, Math.max(startX, endX));
        for (let x = from; x <= to; x++) {
            this.mapLayout[y][x] = tileType;
        }
    }

    carveVertical(x, startY, endY, tileType) {
        const from = Math.max(0, Math.min(startY, endY));
        const to = Math.min(this.mapLayout.length - 1, Math.max(startY, endY));
        for (let y = from; y <= to; y++) {
            if (this.mapLayout[y]?.[x] !== undefined) {
                this.mapLayout[y][x] = tileType;
            }
        }
    }

    generateMap() {
        for (let y = 0; y < this.mapLayout.length; y++) {
            for (let x = 0; x < this.mapLayout[y].length; x++) {
                this.drawMapTile(x, y, this.mapLayout[y][x]);
            }
        }
    }

    drawMapTile(gridX, gridY, tileType) {
        const posX = gridX * this.tileSize + this.tileSize / 2;
        const posY = gridY * this.tileSize + this.tileSize / 2;

        if (tileType === 1) {
            this.walls.create(posX, posY, 'tex_wall');
            return;
        }

        if (tileType === 3) {
            this.add.image(posX, posY, 'tex_cave_floor').setDepth(0);
            this.enemyBlocks.create(posX, posY, 'tex_cave_floor').setVisible(false);
        } else {
            this.add.image(posX, posY, 'tex_floor').setDepth(0);
        }

        if (tileType !== 0) return;

        const spawnTileX = Math.floor(this.spawnPoint.x / this.tileSize);
        const spawnTileY = Math.floor(this.spawnPoint.y / this.tileSize);
        const isNearPlayer = Math.abs(gridX - spawnTileX) <= 3 && Math.abs(gridY - spawnTileY) <= 2;

        if (!isNearPlayer) {
            this.validPositions.push({ x: posX, y: posY });
        }
    }

    spawnCards() {
        this.caves.forEach((cave) => {
            const container = this.add.container(cave.cardX, cave.cardY);
            const txt = this.add.text(0, 0, cave.wrappedText, {
                fontFamily: 'Nunito',
                fontSize: `${cave.fontSize}px`,
                fontWeight: '900',
                color: '#FFFFFF',
                align: 'center',
                lineSpacing: Math.max(2, Math.round(cave.fontSize * 0.2)),
                stroke: '#5A3E26',
                strokeThickness: Math.max(3, Math.round(cave.fontSize * 0.28)),
                shadow: { offsetX: 0, offsetY: 4, color: '#000000', blur: 4, stroke: false, fill: true }
            }).setOrigin(0.5);

            container.add(txt);

            this.physics.world.enable(container);
            container.body.setImmovable(true);
            container.body.setAllowGravity(false);
            container.body.setSize(
                Math.max(this.tileSize, cave.roomWidth * this.tileSize * 0.7),
                Math.max(this.tileSize * 0.7, cave.roomHeight * this.tileSize * 0.6)
            );
            container.isCorrect = cave.isCorrect;
            container.collected = false;
            container.caveId = cave.id;
            container.setDepth(5);

            cave.cardContainer = container;
            this.cardsGroup.add(container);
        });
    }

    spawnEnemies() {
        const enemyCount = Math.min(8, Math.max(3, Math.ceil(this.stepData.items.length / 2)));
        const stepSize = Math.max(1, Math.floor(this.validPositions.length / (enemyCount + 1)));

        for (let i = 0; i < enemyCount; i++) {
            let pos = this.validPositions[this.validPositions.length - 1 - (i * stepSize)];
            if (!pos) pos = this.validPositions[0];

            const enemy = this.physics.add.sprite(pos.x, pos.y, 'tex_enemy');
            enemy.setBounce(0); // Controle manual nas quinas pela IA
            enemy.setCollideWorldBounds(true);
            enemy.body.setSize(40, 40); // Hitbox menor que o caminho (60)
            enemy.setDepth(6);

            const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
            const dir = Phaser.Utils.Array.GetRandom(dirs);
            enemy.setVelocity(dir.x * this.enemySpeed, dir.y * this.enemySpeed);

            this.enemiesGroup.add(enemy);

            // Animação pulsar inimigo
            this.tweens.add({
                targets: enemy,
                scaleX: 1.1,
                scaleY: 0.9,
                duration: 300,
                yoyo: true,
                repeat: -1
            });
        }
    }

    createEmitters() {
        this.emitterWin = this.add.particles(0, 0, 'tex_particle_star', {
            speed: { min: 50, max: 150 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            lifespan: 800,
            gravityY: 100,
            emitting: false,
            quantity: 20
        });
        this.emitterWin.setDepth(20);

        this.emitterError = this.add.particles(0, 0, 'tex_particle_leaf', {
            speed: { min: 50, max: 100 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            tint: 0xFF4B4B, // Pinta a folha de vermelho no erro
            lifespan: 600,
            emitting: false,
            quantity: 10
        });
        this.emitterError.setDepth(20);
    }

    update() {
        if (this.isGameOver) return;

        const movement = this.getMovementVector();
        this.player.setVelocity(movement.x, movement.y);
        this.updatePlayerFlip(movement.x);
        this.updateEnemies();
        this.checkCaveCollection();
    }

    getMovementVector() {
        let vx = 0;
        let vy = 0;

        if (this.cursors.left.isDown || this.wasd.A.isDown) vx = -this.playerSpeed;
        else if (this.cursors.right.isDown || this.wasd.D.isDown) vx = this.playerSpeed;

        if (this.cursors.up.isDown || this.wasd.W.isDown) vy = -this.playerSpeed;
        else if (this.cursors.down.isDown || this.wasd.S.isDown) vy = this.playerSpeed;

        if (GameState.joystick.active) {
            vx = GameState.joystick.x * this.playerSpeed;
            vy = GameState.joystick.y * this.playerSpeed;
        }

        if (vx !== 0 && vy !== 0) {
            const length = Math.hypot(vx, vy);
            vx = (vx / length) * this.playerSpeed;
            vy = (vy / length) * this.playerSpeed;
        } else {
            this.applyTrackAssist(vx, vy);
        }

        return { x: vx, y: vy };
    }

    applyTrackAssist(vx, vy) {
        if (this.getTileAtWorld(this.player.x, this.player.y) !== 0) return;

        if (vx !== 0 && vy === 0) {
            const centerY = Math.floor(this.player.y / this.tileSize) * this.tileSize + this.tileSize / 2;
            if (Math.abs(this.player.y - centerY) < 25) {
                this.player.y = Phaser.Math.Linear(this.player.y, centerY, 0.4);
            }
        }

        if (vy !== 0 && vx === 0) {
            const centerX = Math.floor(this.player.x / this.tileSize) * this.tileSize + this.tileSize / 2;
            if (Math.abs(this.player.x - centerX) < 25) {
                this.player.x = Phaser.Math.Linear(this.player.x, centerX, 0.4);
            }
        }
    }

    updatePlayerFlip(vx) {
        if (vx > 0) this.player.setFlipX(false);
        else if (vx < 0) this.player.setFlipX(true);
    }

    updateEnemies() {
        this.enemiesGroup.getChildren().forEach((enemy) => {
            this.redirectEnemy(enemy);
        });
    }

    redirectEnemy(enemy) {
        const body = enemy.body;
        if (!body) return;

        const isBlocked = body.blocked.up || body.blocked.down || body.blocked.left || body.blocked.right;
        const isStopped = body.velocity.x === 0 && body.velocity.y === 0;
        if (!isBlocked && !isStopped) return;

        enemy.x = Math.floor(enemy.x / this.tileSize) * this.tileSize + this.tileSize / 2;
        enemy.y = Math.floor(enemy.y / this.tileSize) * this.tileSize + this.tileSize / 2;

        const px = Math.floor(enemy.x / this.tileSize);
        const py = Math.floor(enemy.y / this.tileSize);
        const possibleDirs = this.getWalkableDirections(px, py);
        const cameFrom = {
            x: Math.sign(body.velocity.x) * -1,
            y: Math.sign(body.velocity.y) * -1
        };
        const forwardDirs = possibleDirs.filter((dir) => dir.x !== cameFrom.x || dir.y !== cameFrom.y);
        const nextDir = Phaser.Utils.Array.GetRandom(forwardDirs.length > 0 ? forwardDirs : possibleDirs);

        if (!nextDir) return;
        enemy.setVelocity(nextDir.x * this.enemySpeed, nextDir.y * this.enemySpeed);
    }

    getWalkableDirections(px, py) {
        const possibleDirs = [];
        if (this.mapLayout[py - 1]?.[px] === 0) possibleDirs.push({ x: 0, y: -1 });
        if (this.mapLayout[py + 1]?.[px] === 0) possibleDirs.push({ x: 0, y: 1 });
        if (this.mapLayout[py]?.[px - 1] === 0) possibleDirs.push({ x: -1, y: 0 });
        if (this.mapLayout[py]?.[px + 1] === 0) possibleDirs.push({ x: 1, y: 0 });
        return possibleDirs;
    }

    checkCaveCollection() {
        if (this.getTileAtWorld(this.player.x, this.player.y) !== 3) return;

        const cave = this.findCaveByWorldPosition(this.player.x, this.player.y);
        if (!cave?.cardContainer || cave.cardContainer.collected) return;
        this.collectCard(this.player, cave.cardContainer);
    }

    getTileAtWorld(worldX, worldY) {
        const px = Math.floor(worldX / this.tileSize);
        const py = Math.floor(worldY / this.tileSize);
        return this.mapLayout[py]?.[px] ?? 1;
    }

    findCaveByWorldPosition(worldX, worldY) {
        return this.caves.find((cave) => Phaser.Geom.Rectangle.Contains(cave.bounds, worldX, worldY));
    }

    updateWinScreenCopy() {
        const advanceButton = document.querySelector('#screen-win .btn');
        const subtitle = document.querySelector('#screen-win h2');
        const hasMoreSteps = GameState.currentStep < GameState.totalSteps - 1;

        if (advanceButton) {
            advanceButton.innerHTML = hasMoreSteps
                ? '<i class="fa-solid fa-shoe-prints"></i> Próximo Step'
                : '<i class="fa-solid fa-arrow-right"></i> Próxima Fase';
        }

        if (subtitle) {
            subtitle.innerText = hasMoreSteps ? 'Step Concluído' : 'Fase Concluída';
        }
    }

    collectCard(player, cardContainer) {
        if (cardContainer.collected) return;
        cardContainer.collected = true;

        // Desabilitar corpo para não coletar duas vezes
        if (cardContainer.body) cardContainer.body.enable = false;

        if (cardContainer.isCorrect) {
            // Acerto
            AudioSys.playCorrect();
            this.emitterWin.emitParticleAt(cardContainer.x, cardContainer.y);
            this.showFloatingText('+10', cardContainer.x, cardContainer.y, '#58CC02');

            GameState.score += 10;
            GameState.cardsToCollect--;

            // Efeito de crescer e sumir
            this.tweens.add({
                targets: cardContainer,
                scaleX: 1.5, scaleY: 1.5, alpha: 0,
                duration: 300,
                onComplete: () => cardContainer.destroy()
            });

            this.events.emit('updateHUD');

            if (GameState.cardsToCollect <= 0) {
                this.levelComplete();
            }
        } else {
            // Erro
            AudioSys.playWrong();
            this.cameras.main.shake(200, 0.01);
            this.cameras.main.flash(200, 255, 75, 75);
            this.emitterError.emitParticleAt(cardContainer.x, cardContainer.y);
            this.showFloatingText('ERRO!', cardContainer.x, cardContainer.y, '#FF4B4B');

            GameState.lives--;
            this.events.emit('updateHUD');

            // Sumir carta errada também
            this.tweens.add({
                targets: cardContainer,
                scaleX: 0, scaleY: 0,
                duration: 200,
                onComplete: () => cardContainer.destroy()
            });

            if (GameState.lives <= 0) {
                this.gameOver();
            }
        }
    }

    hitEnemy(player, enemy) {
        if (player.alpha < 1) return; // Invulnerável

        AudioSys.playWrong();
        this.cameras.main.shake(200, 0.02);
        GameState.lives--;
        this.events.emit('updateHUD');

        if (GameState.lives <= 0) {
            this.gameOver();
        } else {
            // Efeito de dano e invulnerabilidade temporária
            player.setAlpha(0.5);

            // Reposicionar um pouco pra trás (knockback simples)
            player.x -= player.body.velocity.x * 0.1;
            player.y -= player.body.velocity.y * 0.1;

            this.time.delayedCall(1500, () => {
                player.setAlpha(1);
            });
        }
    }

    showFloatingText(text, x, y, color) {
        let ft = this.add.text(x, y, text, {
            fontFamily: 'Nunito', fontSize: '20px', fontWeight: '900',
            color: color, stroke: '#FFFFFF', strokeThickness: 4
        }).setOrigin(0.5).setDepth(30);

        this.tweens.add({
            targets: ft,
            y: y - 40,
            alpha: 0,
            duration: 1000,
            ease: 'Cubic.easeOut',
            onComplete: () => ft.destroy()
        });
    }

    levelComplete() {
        this.isGameOver = true;
        this.player.setVelocity(0, 0);
        AudioSys.playWin();
        this.updateWinScreenCopy();

        // Pausa a física e mostra tela HTML
        this.physics.pause();
        setTimeout(() => {
            showScreen('screen-win');
            document.getElementById('win-score').innerText = GameState.score;
            document.getElementById('win-lives').innerText = GameState.lives;
        }, 500);
    }

    gameOver() {
        this.isGameOver = true;
        this.player.setVelocity(0, 0);
        this.player.setTint(0xFF0000);
        this.physics.pause();
        setTimeout(() => {
            showScreen('screen-lose');
        }, 500);
    }
}

// 3. Cena de Interface de Usuário (HUD e Joystick overlay)
class UIScene extends Phaser.Scene {
    constructor() { super({ key: 'UIScene', active: false }); }

    create() {
        const gameScene = this.scene.get('GameScene');
        this.topBarHeight = 72;
        this.gameScene = gameScene;

        // Fundo da HUD superior
        this.topBar = this.add.graphics();
        this.drawTopBar(this.scale.width);

        const textStyle = { fontFamily: 'Nunito', fontSize: '18px', fontWeight: 'bold', color: '#3C3C3C' };
        const metaStyle = { fontFamily: 'Nunito', fontSize: '14px', fontWeight: '700', color: '#777777' };

        this.scoreText = this.add.text(20, 12, '', textStyle);
        this.stepText = this.add.text(20, 38, '', metaStyle);
        this.livesText = this.add.text(this.scale.width - 20, 12, '', { ...textStyle, color: '#FF4B4B' }).setOrigin(1, 0);

        this.categoryTitle = this.add.text(this.scale.width / 2, 8, 'Categoria', { fontFamily: 'Nunito', fontSize: '14px', color: '#777' }).setOrigin(0.5, 0);
        this.categoryText = this.add.text(this.scale.width / 2, 30, '', { fontFamily: 'Nunito', fontSize: '20px', fontWeight: '900', color: '#1CB0F6' }).setOrigin(0.5, 0);

        // Escutar eventos
        gameScene.events.on('updateHUD', this.updateHUD, this);
        this.updateHUD();

        // Configuração do Virtual Joystick
        this.setupJoystick();

        // Responsividade da HUD
        this.scale.on('resize', this.resize, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    }

    drawTopBar(width) {
        this.topBar.clear();
        this.topBar.fillStyle(0xFFFFFF, 0.95);
        this.topBar.fillRect(0, 0, width, this.topBarHeight);
        this.topBar.fillStyle(0xE5E5E5, 1);
        this.topBar.fillRect(0, this.topBarHeight, width, 4);
    }

    updateHUD() {
        this.scoreText.setText('Pontos: ' + GameState.score);
        this.livesText.setText('Vidas: ' + GameState.lives);
        this.stepText.setText(`Step ${GameState.currentStep + 1}/${Math.max(GameState.totalSteps, 1)}`);
        this.categoryText.setText(gameData[GameState.currentLevel].category);
    }

    setupJoystick() {
        this.joyBase = this.add.graphics();
        this.joyBase.fillStyle(0xFFFFFF, 0.3);
        this.joyBase.fillCircle(0, 0, 50);
        this.joyBase.lineStyle(4, 0xFFFFFF, 0.5);
        this.joyBase.strokeCircle(0, 0, 50);
        this.joyBase.setVisible(false);

        this.joyThumb = this.add.graphics();
        this.joyThumb.fillStyle(0x1CB0F6, 0.8); // Azul
        this.joyThumb.fillCircle(0, 0, 25);
        this.joyThumb.setVisible(false);

        this.onPointerDown = (pointer) => {
            if (pointer.y < this.topBarHeight + 8) return;
            this.joyBase.setPosition(pointer.x, pointer.y).setVisible(true);
            this.joyThumb.setPosition(pointer.x, pointer.y).setVisible(true);
            GameState.joystick.active = true;
            this.updateJoystick(pointer);
        };

        this.onPointerMove = (pointer) => {
            if (GameState.joystick.active) {
                this.updateJoystick(pointer);
            }
        };

        this.stopJoystick = () => {
            this.joyBase.setVisible(false);
            this.joyThumb.setVisible(false);
            resetJoystickState();
        };

        this.input.on('pointerdown', this.onPointerDown);
        this.input.on('pointermove', this.onPointerMove);
        this.input.on('pointerup', this.stopJoystick);
        this.input.on('pointerout', this.stopJoystick);
    }

    updateJoystick(pointer) {
        let angle = Phaser.Math.Angle.Between(this.joyBase.x, this.joyBase.y, pointer.x, pointer.y);
        let distance = Phaser.Math.Distance.Between(this.joyBase.x, this.joyBase.y, pointer.x, pointer.y);

        const maxDist = 50;
        if (distance > maxDist) distance = maxDist;

        this.joyThumb.x = this.joyBase.x + Math.cos(angle) * distance;
        this.joyThumb.y = this.joyBase.y + Math.sin(angle) * distance;

        // Normalizar valores entre -1 e 1
        GameState.joystick.x = Math.cos(angle) * (distance / maxDist);
        GameState.joystick.y = Math.sin(angle) * (distance / maxDist);
    }

    resize(gameSize) {
        let width = gameSize.width;
        this.livesText.setX(width - 20);
        this.categoryTitle.setX(width / 2);
        this.categoryText.setX(width / 2);
        this.drawTopBar(width);
    }

    handleShutdown() {
        this.gameScene?.events.off('updateHUD', this.updateHUD, this);
        this.scale.off('resize', this.resize, this);
        this.input.off('pointerdown', this.onPointerDown);
        this.input.off('pointermove', this.onPointerMove);
        this.input.off('pointerup', this.stopJoystick);
        this.input.off('pointerout', this.stopJoystick);
        this.stopJoystick?.();
    }
}

/* =======================================================================
   CONFIGURAÇÃO E CONTROLE DOM HTML
======================================================================== */
let game;

function initPhaser() {
    const config = {
        type: Phaser.AUTO,
        scale: {
            mode: Phaser.Scale.RESIZE,
            parent: 'game-container',
            width: '100%',
            height: '100%'
        },
        backgroundColor: '#E6F4EA',
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 0 },
                debug: false
            }
        },
        scene: [BootScene, GameScene, UIScene]
    };
    game = new Phaser.Game(config);
}

// Controle de Telas HTML
function hideAllScreens() {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.classList.remove('active'));
    document.getElementById('ui-layer').style.pointerEvents = 'none';
}

function showScreen(id) {
    hideAllScreens();
    document.getElementById(id).classList.add('active');
    document.getElementById('ui-layer').style.pointerEvents = 'auto';
}

// Ações dos Botões
globalThis.startGame = function () {
    AudioSys.init();
    AudioSys.playPop();
    hideAllScreens();
    GameState.score = 0;
    GameState.lives = 3;
    GameState.currentLevel = 0;
    GameState.currentStep = 0;
    GameState.totalSteps = 0;
    GameState.preparedLevel = -1;
    GameState.levelSteps = [];
    restartGameplayScenes();
};

globalThis.nextLevel = function () {
    AudioSys.playPop();
    const hasMoreSteps = GameState.currentStep < GameState.totalSteps - 1;

    if (hasMoreSteps) {
        GameState.currentStep++;
        hideAllScreens();
        restartGameplayScenes();
        return;
    }

    GameState.currentLevel++;
    GameState.currentStep = 0;
    GameState.totalSteps = 0;
    GameState.preparedLevel = -1;
    GameState.levelSteps = [];

    if (GameState.currentLevel >= gameData.length) {
        // Fim de jogo - Vitória total
        showScreen('screen-end');
        document.getElementById('end-score').innerText = GameState.score;
        if (game) {
            game.scene.stop('GameScene');
            game.scene.stop('UIScene');
        }
    } else {
        // Próxima fase
        hideAllScreens();
        restartGameplayScenes();
    }
};

globalThis.restartGame = function () {
    AudioSys.playPop();
    hideAllScreens();
    GameState.score = 0;
    GameState.lives = 3;
    GameState.currentLevel = 0;
    GameState.currentStep = 0;
    GameState.totalSteps = 0;
    GameState.preparedLevel = -1;
    GameState.levelSteps = [];
    restartGameplayScenes();
};

// Prevenir comportamentos padrão indesejados no mobile
document.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
document.addEventListener('contextmenu', event => event.preventDefault());
