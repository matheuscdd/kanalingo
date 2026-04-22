import { ARENA, GAME_MODES, PLAYER_START, SUPPORTED_ENEMY_TYPES } from '../core/constants.js';
import { questions } from '../data/questions.js';
import { fixedWaveMaps } from '../data/wave-maps.js';
import { Enemy } from '../entities/Enemy.js';
import { Bullet } from '../entities/Bullet.js';
import { LobbedProjectile } from '../entities/LobbedProjectile.js';
import { Player } from '../entities/Player.js';
import { getState, setState } from '../core/store.js';
import { clamp, hexToNumber, shuffle } from '../utils/math.js';
import { findFreeEnemySpawnPoint } from '../utils/spawn.js';
import { WaveBuilder } from '../world/WaveBuilder.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    init(data) {
        this.startMode = data.mode || getState().gameMode;
    }

    create() {
        this.cameras.main.setBackgroundColor('#060b12');
        this.drawArenaBackdrop();

        this.physics.world.setBounds(0, 0, ARENA.width, ARENA.height);
        this.waveBuilder = new WaveBuilder(this);
        this.enemyGroup = this.physics.add.group({ runChildUpdate: false });
        this.playerBullets = this.physics.add.group({ runChildUpdate: true });
        this.enemyBullets = this.physics.add.group({ runChildUpdate: true });
        this.lobbedProjectiles = this.add.group({ runChildUpdate: true });
        this.enemies = [];
        this.contactCooldowns = new Map();
        this.lastHudSnapshot = '';
        this.isTransitioning = false;
        this.ended = false;

        this.pointer = this.input.activePointer;
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys('W,A,S,D');
        this.lobAimGraphics = this.add.graphics().setDepth(11);

        this.player = new Player(this, PLAYER_START.x, PLAYER_START.y, getState().selectedTank);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setBounds(0, 0, ARENA.width, ARENA.height);

        this.physics.add.collider(this.player, this.waveBuilder.solidGroup);
        this.physics.add.collider(this.player, this.waveBuilder.breakableGroup);
        this.physics.add.collider(this.enemyGroup, this.waveBuilder.solidGroup);
        this.physics.add.collider(this.enemyGroup, this.waveBuilder.breakableGroup);
        this.physics.add.collider(this.enemyGroup, this.enemyGroup);

        this.physics.add.collider(this.playerBullets, this.waveBuilder.solidGroup, bullet => bullet.destroy());
        this.physics.add.collider(this.enemyBullets, this.waveBuilder.solidGroup, bullet => bullet.destroy());
        this.physics.add.collider(this.playerBullets, this.waveBuilder.breakableGroup, this.handleBulletHitsBreakable, undefined, this);
        this.physics.add.collider(this.enemyBullets, this.waveBuilder.breakableGroup, this.handleBulletHitsBreakable, undefined, this);
        this.physics.add.overlap(this.playerBullets, this.enemyGroup, this.handlePlayerBulletHitsEnemy, undefined, this);
        this.physics.add.overlap(this.enemyBullets, this.player, this.handleEnemyBulletHitsPlayer, undefined, this);
        this.physics.add.overlap(this.player, this.enemyGroup, this.handlePlayerTouchesEnemy, undefined, this);

        this.gameMode = this.startMode;
        this.selectedBots = getState().selectedBots.filter(type => SUPPORTED_ENEMY_TYPES.includes(type));
        if (!this.selectedBots.length) {
            this.selectedBots = [...SUPPORTED_ENEMY_TYPES];
        }

        this.loadWave(0);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.clearWaveObjects();
            this.waveBuilder.reset();
        });
    }

    update(time, delta) {
        if (this.ended || this.isTransitioning) {
            return;
        }

        const controls = {
            up: this.keys.W.isDown ? this.keys.W : this.cursors.up,
            down: this.keys.S.isDown ? this.keys.S : this.cursors.down,
            left: this.keys.A.isDown ? this.keys.A : this.cursors.left,
            right: this.keys.D.isDown ? this.keys.D : this.cursors.right,
            pointer: this.pointer
        };

        this.player.update(time, delta, controls);
        this.updateLobberAimGuide();

        const playerHidden = this.waveBuilder.isInsideBush(this.player.x, this.player.y);
        this.player.setAlpha(playerHidden ? 0.6 : 1);
        this.waveBuilder.tintBushes(playerHidden);

        for (const enemy of this.enemies) {
            if (!enemy.active) {
                continue;
            }

            const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
            const canSeePlayer = !playerHidden || distance < 260;
            enemy.setHiddenState(this.waveBuilder.isInsideBush(enemy.x, enemy.y) && distance > 240);
            enemy.update(time, delta, this.player, canSeePlayer);
        }

        if (this.player.hp <= 0) {
            this.endGame(false, 'Sua blindagem cedeu antes da limpeza da arena.');
            return;
        }

        this.syncHud();
    }

    drawArenaBackdrop() {
        const graphics = this.add.graphics();
        graphics.fillStyle(0x09131d, 1);
        graphics.fillRect(0, 0, ARENA.width, ARENA.height);
        graphics.lineStyle(2, 0x122533, 0.9);
        for (let x = 0; x <= ARENA.width; x += 100) {
            graphics.lineBetween(x, 0, x, ARENA.height);
        }
        for (let y = 0; y <= ARENA.height; y += 100) {
            graphics.lineBetween(0, y, ARENA.width, y);
        }
        graphics.lineStyle(14, 0x00ff88, 0.18);
        graphics.strokeRect(0, 0, ARENA.width, ARENA.height);
    }

    loadWave(index) {
        this.clearWaveObjects();
        this.currentQuestionIndex = index;
        this.gameMode = getState().gameMode;

        const question = questions[index];
        const layout = fixedWaveMaps[Math.min(index, fixedWaveMaps.length - 1)];

        this.waveBuilder.build(layout);
        this.player.resetForWave(PLAYER_START.x, PLAYER_START.y);
        this.spawnEnemies(question);

        setState({
            status: 'playing',
            currentQuestionIndex: index,
            questionText: question.q,
            objectiveText: this.gameMode === GAME_MODES.CORRECT ? 'OBJETIVO: Destrua apenas a correta.' : 'OBJETIVO: Elimine todas as falsas.',
            waveLabel: `Nível ${index + 1} / ${questions.length}`,
            celebration: {
                visible: false,
                title: 'ÁREA LIMPA!',
                description: 'Sincronizando a próxima região...'
            }
        });

        this.syncHud(true);
    }

    clearWaveObjects() {
        for (const enemy of this.enemies) {
            enemy.destroy();
        }
        this.enemies = [];
        this.enemyGroup.clear(true, true);
        this.playerBullets.clear(true, true);
        this.enemyBullets.clear(true, true);
        this.lobbedProjectiles.clear(true, true);
        this.contactCooldowns.clear();
    }

    spawnEnemies(question) {
        const options = shuffle(question.options);
        const enemyTypes = [];

        while (enemyTypes.length < options.length) {
            enemyTypes.push(...shuffle(this.selectedBots));
        }

        for (let index = 0; index < options.length; index += 1) {
            const option = options[index];
            const type = enemyTypes[index];
            const spawnPoint = findFreeEnemySpawnPoint({
                player: this.player,
                solidRects: this.waveBuilder.getSolidRects(),
                minDistanceFromPlayer: 820,
                radius: 38
            });

            const enemy = new Enemy(this, {
                x: spawnPoint.x,
                y: spawnPoint.y,
                text: option,
                isCorrect: option === question.correct,
                type
            });

            this.enemies.push(enemy);
            this.enemyGroup.add(enemy);
        }
    }

    spawnPlayerProjectile(x, y, angle, tank, targetPoint) {
        if (tank.key === 'lobber') {
            const projectile = new LobbedProjectile(this, x, y, targetPoint.x, targetPoint.y, tank);
            this.lobbedProjectiles.add(projectile);
            this.cameras.main.shake(90, 0.0022);
            return;
        }

        const bullet = new Bullet(this, x, y, {
            angle,
            speed: tank.bulletSpeed,
            damage: tank.bulletDamage,
            isPlayer: true,
            tint: 0xffffff,
            scale: tank.bulletScale
        });
        this.playerBullets.add(bullet);
        bullet.launch();
        this.cameras.main.shake(60, 0.0015);
    }

    spawnEnemyBullet(x, y, angle, color) {
        const bullet = new Bullet(this, x, y, {
            angle,
            speed: 420,
            damage: 12,
            isPlayer: false,
            tint: hexToNumber(color),
            scale: 0.9
        });
        this.enemyBullets.add(bullet);
        bullet.launch();
    }

    handleBulletHitsBreakable(bullet, block) {
        if (!bullet.active || !block.active) {
            return;
        }

        bullet.destroy();
        const destroyed = this.waveBuilder.damageBreakable(block, bullet.damage || 20);
        if (destroyed) {
            this.spawnFloatingText('CAIXA QUEBRADA', block.x, block.y - 24, '#ffc84d');
        }
    }

    handlePlayerBulletHitsEnemy(bullet, enemy) {
        if (!bullet.active || !enemy.active) {
            return;
        }

        bullet.destroy();
        enemy.takeDamage(bullet.damage || 20);
    }

    handleEnemyBulletHitsPlayer(player, bullet) {
        if (!bullet.active) {
            return;
        }

        bullet.destroy();
        player.takeDamage(bullet.damage || 10);
        this.spawnFloatingText('-12', player.x, player.y - 24, '#ff7d89');
        this.cameras.main.shake(120, 0.004);
    }

    handlePlayerTouchesEnemy(player, enemy) {
        const cooldown = this.contactCooldowns.get(enemy) || 0;
        if (this.time.now < cooldown) {
            return;
        }

        this.contactCooldowns.set(enemy, this.time.now + 620);
        const damage = enemy.type === 'melee' ? 14 : 8;
        player.takeDamage(damage);
        this.spawnFloatingText(`-${damage}`, player.x, player.y - 28, '#ff7d89');
        this.cameras.main.shake(90, 0.003);
    }

    handleLobbedImpact({ x, y, damage, breakableDamage, blastRadius }) {
        if (this.ended) {
            return;
        }

        const breakables = this.waveBuilder.breakables.slice();
        const enemies = this.enemies.slice();

        this.spawnExplosionEffect(x, y, blastRadius);
        this.cameras.main.shake(150, 0.005);

        for (const block of breakables) {
            if (!block.active) {
                continue;
            }

            const distance = Phaser.Math.Distance.Between(block.x, block.y, x, y);
            const reach = blastRadius + Math.max(block.width, block.height) * 0.35;
            if (distance > reach) {
                continue;
            }

            const destroyed = this.waveBuilder.damageBreakable(block, breakableDamage);
            this.spawnFloatingText(destroyed ? 'CAIXA QUEBRADA' : 'IMPACTO', block.x, block.y - 24, '#ffc84d');
        }

        for (const enemy of enemies) {
            if (!enemy.active) {
                continue;
            }

            const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, x, y);
            const reach = blastRadius + 24;
            if (distance > reach) {
                continue;
            }

            enemy.takeDamage(damage);
            if (this.ended) {
                return;
            }
        }
    }

    handleEnemyDefeated(enemy) {
        if (!enemy.active || this.ended) {
            return;
        }

        const defeatedState = {
            answerText: enemy.answerText,
            type: enemy.type,
            isCorrect: enemy.isCorrect
        };

        this.contactCooldowns.delete(enemy);
        this.enemies = this.enemies.filter(item => item !== enemy);
        this.enemyGroup.remove(enemy, true, true);

        if (this.gameMode === GAME_MODES.CORRECT) {
            if (defeatedState.isCorrect) {
                this.player.heal(20);
                this.spawnFloatingText('CORRETO!', enemy.x, enemy.y - 14, '#72ffbb');
                this.triggerTransition('ÁREA LIMPA!', 'Avançando para a próxima pergunta...');
                return;
            }

            this.spawnFloatingText('ERRADO!', enemy.x, enemy.y - 14, '#ff7d89');
            this.time.delayedCall(1000, () => {
                if (this.isTransitioning || this.ended) {
                    return;
                }

                const respawnPoint = findFreeEnemySpawnPoint({
                    player: this.player,
                    solidRects: this.waveBuilder.getSolidRects(),
                    minDistanceFromPlayer: 560,
                    radius: 38
                });

                const respawned = new Enemy(this, {
                    x: respawnPoint.x,
                    y: respawnPoint.y,
                    text: defeatedState.answerText,
                    isCorrect: false,
                    type: defeatedState.type,
                    speedMultiplier: 1.2
                });

                this.enemies.push(respawned);
                this.enemyGroup.add(respawned);
                this.spawnFloatingText('RETORNOU', respawned.x, respawned.y - 18, '#ffc84d');
            });
            return;
        }

        if (defeatedState.isCorrect) {
            this.endGame(false, 'Você destruiu a resposta correta no modo Eliminação.');
            return;
        }

        this.player.heal(10);
        this.spawnFloatingText('ELIMINADA!', enemy.x, enemy.y - 14, '#72ffbb');
        const wrongLeft = this.enemies.filter(item => item.active && !item.isCorrect).length;
        if (wrongLeft === 0) {
            this.triggerTransition('ÁREA LIMPA!', 'Todas as falsas foram removidas.');
        }
    }

    triggerTransition(title, description) {
        if (this.isTransitioning || this.ended) {
            return;
        }

        this.isTransitioning = true;
        this.playerBullets.clear(true, true);
        this.enemyBullets.clear(true, true);
        for (const enemy of this.enemies) {
            enemy.destroy();
        }
        this.enemies = [];
        this.enemyGroup.clear(true, true);

        setState({
            status: 'transition',
            celebration: {
                visible: true,
                title,
                description
            },
            questionText: '',
            objectiveText: ''
        });

        this.time.delayedCall(1800, () => {
            const nextIndex = this.currentQuestionIndex + 1;
            if (nextIndex >= questions.length) {
                this.endGame(true, 'Vitória: as 5 áreas da primeira slice Phaser foram concluídas.');
                return;
            }

            this.isTransitioning = false;
            this.loadWave(nextIndex);
        });
    }

    endGame(isWin, description) {
        if (this.ended) {
            return;
        }

        this.ended = true;
        setState({
            status: isWin ? 'win' : 'gameover',
            overlay: {
                title: isWin ? 'Vitória Tática' : 'Falha Tática',
                description
            },
            celebration: {
                visible: false,
                title: 'ÁREA LIMPA!',
                description: 'Sincronizando a próxima região...'
            },
            questionText: '',
            objectiveText: '',
            waveLabel: `Nível ${clamp(this.currentQuestionIndex + 1, 1, questions.length)} / ${questions.length}`
        });

        this.scene.start('MenuScene');
    }

    syncHud(force = false) {
        const hud = this.player.getHudState();
        const snapshot = `${Math.round(hud.healthPct)}|${Math.round(hud.heatPct)}|${hud.overheated}|${this.currentQuestionIndex}|${this.gameMode}|${getState().status}`;
        if (!force && snapshot === this.lastHudSnapshot) {
            return;
        }

        this.lastHudSnapshot = snapshot;
        setState({
            hud,
            waveLabel: `Nível ${this.currentQuestionIndex + 1} / ${questions.length}`
        });
    }

    updateLobberAimGuide() {
        this.lobAimGraphics.clear();

        if (this.player.tank.key !== 'lobber' || !this.pointer.isDown || this.isTransitioning || this.ended || this.player.isOverheated) {
            return;
        }

        const startX = this.player.x;
        const startY = this.player.y;
        const targetX = this.player.aimTarget.x;
        const targetY = this.player.aimTarget.y;
        const maxArcHeight = Math.min(
            Phaser.Math.Distance.Between(startX, startY, targetX, targetY) * 0.5,
            this.player.tank.maxArcHeight ?? 150
        );

        this.lobAimGraphics.lineStyle(4, 0xffffff, 0.78);
        this.lobAimGraphics.beginPath();
        this.lobAimGraphics.moveTo(startX, startY);
        for (let step = 1; step <= 20; step += 1) {
            const t = step / 20;
            const x = Phaser.Math.Linear(startX, targetX, t);
            const y = Phaser.Math.Linear(startY, targetY, t) - (4 * maxArcHeight * t * (1 - t));
            this.lobAimGraphics.lineTo(x, y);
        }
        this.lobAimGraphics.strokePath();

        this.lobAimGraphics.lineStyle(2, 0xffffff, 0.8);
        this.lobAimGraphics.strokeEllipse(targetX, targetY, this.player.tank.blastRadius * 2, this.player.tank.blastRadius * 1.4);
        this.lobAimGraphics.fillStyle(0xffffff, 0.18);
        this.lobAimGraphics.fillEllipse(targetX, targetY, this.player.tank.blastRadius * 2, this.player.tank.blastRadius * 1.4);
    }

    spawnExplosionEffect(x, y, blastRadius) {
        const flash = this.add.circle(x, y, blastRadius * 0.7, 0xff7a1a, 0.55).setDepth(18);
        const ring = this.add.circle(x, y, blastRadius * 0.35, 0xffd28a, 0.25).setStrokeStyle(4, 0xfff1c2, 0.9).setDepth(19);

        this.tweens.add({
            targets: flash,
            scale: { from: 0.4, to: 1.55 },
            alpha: { from: 0.55, to: 0 },
            duration: 260,
            ease: 'Quad.easeOut',
            onComplete: () => flash.destroy()
        });

        this.tweens.add({
            targets: ring,
            scale: { from: 0.6, to: 1.8 },
            alpha: { from: 0.95, to: 0 },
            duration: 320,
            ease: 'Quad.easeOut',
            onComplete: () => ring.destroy()
        });
    }

    spawnFloatingText(text, x, y, color) {
        const label = this.add.text(x, y, text, {
            fontFamily: 'Orbitron',
            fontSize: '18px',
            fontStyle: '700',
            color,
            stroke: '#071019',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(20);

        this.tweens.add({
            targets: label,
            y: y - 34,
            alpha: 0,
            duration: 650,
            ease: 'Cubic.easeOut',
            onComplete: () => label.destroy()
        });
    }
}