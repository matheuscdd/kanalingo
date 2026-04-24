import { enemyConfig } from '../data/enemy-config.js';
import { hexToNumber } from '../utils/math.js';

const speedByType = {
    chaser: 84,
    melee: 102,
    ranged: 72
};

export class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, { x, y, text, isCorrect, type = 'chaser', speedMultiplier = 1 }) {
        super(scene, x, y, 'enemy-core');

        this.scene = scene;
        this.answerText = text;
        this.isCorrect = isCorrect;
        this.type = type;
        this.speedMultiplier = speedMultiplier;
        this.hp = 100;
        this.baseColor = enemyConfig[type]?.color || '#ff007f';
        this.speed = (speedByType[type] || 80) * speedMultiplier;
        this.nextShotAt = 0;
        this.wanderUntil = 0;
        this.wanderAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);

        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);
        this.setDepth(6);
        this.setTint(hexToNumber(this.baseColor));
        this.body.setCircle(18, 14, 14);
        this.body.allowGravity = false;

        this.answerLabel = this.scene.add.text(this.x, this.y - 42, this.answerText, {
            fontFamily: 'Rajdhani',
            fontSize: '22px',
            fontStyle: '700',
            color: this.isCorrect ? '#d7ffe7' : '#ffffff',
            align: 'center',
            stroke: '#09131d',
            strokeThickness: 6,
            wordWrap: { width: 160 }
        }).setOrigin(0.5, 1).setDepth(7);
    }

    update(time, delta, player, canSeePlayer) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.hypot(dx, dy) || 1;
        const angleToPlayer = Math.atan2(dy, dx);

        let velocityX = 0;
        let velocityY = 0;

        if (canSeePlayer) {
            if (this.type === 'ranged') {
                if (distance > 380) {
                    velocityX = Math.cos(angleToPlayer) * this.speed;
                    velocityY = Math.sin(angleToPlayer) * this.speed;
                } else if (distance < 240) {
                    velocityX = -Math.cos(angleToPlayer) * this.speed;
                    velocityY = -Math.sin(angleToPlayer) * this.speed;
                }

                if (time >= this.nextShotAt && distance < 680) {
                    this.nextShotAt = time + Phaser.Math.Between(900, 1250);
                    this.scene.spawnEnemyBullet(this.x, this.y, angleToPlayer, this.baseColor);
                }
            } else {
                velocityX = Math.cos(angleToPlayer) * this.speed;
                velocityY = Math.sin(angleToPlayer) * this.speed;

                if (this.type === 'melee' && distance < 150) {
                    velocityX *= 0.4;
                    velocityY *= 0.4;
                }
            }

            this.setRotation(angleToPlayer);
        } else {
            if (time >= this.wanderUntil) {
                this.wanderUntil = time + Phaser.Math.Between(800, 1600);
                this.wanderAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            }

            velocityX = Math.cos(this.wanderAngle) * this.speed * 0.55;
            velocityY = Math.sin(this.wanderAngle) * this.speed * 0.55;
        }

        this.setVelocity(velocityX, velocityY);
        this.answerLabel.setPosition(this.x, this.y - 42);
        this.answerLabel.setAlpha(this.alpha);
    }

    setHiddenState(hidden) {
        const alpha = hidden ? 0.28 : 1;
        this.setAlpha(alpha);
        this.answerLabel.setAlpha(alpha);
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.setTintFill(0xffffff);
        this.scene.time.delayedCall(60, () => {
            if (this.active) {
                this.clearTint();
                this.setTint(hexToNumber(this.baseColor));
            }
        });

        if (this.hp <= 0) {
            this.scene.handleEnemyDefeated(this);
        }
    }

    destroy(fromScene) {
        if (this.answerLabel) {
            this.answerLabel.destroy();
            this.answerLabel = null;
        }

        super.destroy(fromScene);
    }
}