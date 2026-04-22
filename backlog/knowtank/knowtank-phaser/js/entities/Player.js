import { TANKS } from '../core/constants.js';
import { clamp } from '../utils/math.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, tankKey = 'normal') {
        const tank = TANKS[tankKey] || TANKS.normal;
        super(scene, x, y, tank.texture);

        this.scene = scene;
        this.tank = tank;
        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);

        this.setDepth(7);
        this.setDrag(1600, 1600);
        this.setMaxVelocity(420, 420);
        this.setCollideWorldBounds(true);
        this.body.setCircle(19, 13, 13);

        this.speed = 330;
        this.maxHp = 100;
        this.hp = 100;
        this.maxHeat = 100;
        this.heat = 0;
        this.isOverheated = false;
        this.nextShotAt = 0;
        this.invulnerableUntil = 0;
        this.wasPointerDown = false;
        this.aimTarget = new Phaser.Math.Vector2(x, y);
    }

    resetForWave(x, y) {
        this.setPosition(x, y);
        this.setVelocity(0, 0);
        this.aimTarget.set(x, y);
        this.wasPointerDown = false;
    }

    update(time, delta, controls) {
        const moveX = Number(controls.right.isDown) - Number(controls.left.isDown);
        const moveY = Number(controls.down.isDown) - Number(controls.up.isDown);

        const direction = new Phaser.Math.Vector2(moveX, moveY);
        if (direction.lengthSq() > 0) {
            direction.normalize();
        }

        this.setVelocity(direction.x * this.speed, direction.y * this.speed);

        const pointerWorld = this.scene.cameras.main.getWorldPoint(controls.pointer.x, controls.pointer.y);
        const aimPoint = this.getAimPoint(pointerWorld);
        const aimAngle = Phaser.Math.Angle.Between(this.x, this.y, aimPoint.x, aimPoint.y);
        this.aimTarget.copy(aimPoint);
        this.setRotation(aimAngle);

        this.coolHeat(delta);

        if (this.tank.key === 'lobber') {
            if (!controls.pointer.isDown && this.wasPointerDown) {
                this.tryShoot(time, aimAngle, this.aimTarget.clone());
            }
        } else if (controls.pointer.isDown) {
            this.tryShoot(time, aimAngle, aimPoint);
        }

        this.wasPointerDown = controls.pointer.isDown;
    }

    getAimPoint(pointerWorld) {
        if (this.tank.key !== 'lobber') {
            return new Phaser.Math.Vector2(pointerWorld.x, pointerWorld.y);
        }

        const aimVector = new Phaser.Math.Vector2(pointerWorld.x - this.x, pointerWorld.y - this.y);
        if (aimVector.lengthSq() === 0) {
            return new Phaser.Math.Vector2(this.x, this.y);
        }

        const maxRange = this.tank.maxRange ?? 600;
        if (aimVector.length() > maxRange) {
            aimVector.setLength(maxRange);
        }

        return aimVector.add(new Phaser.Math.Vector2(this.x, this.y));
    }

    tryShoot(time, angle, targetPoint) {
        if (time < this.nextShotAt || this.isOverheated) {
            return;
        }

        this.nextShotAt = time + this.tank.fireRate;
        this.heat = clamp(this.heat + this.tank.heatPerShot, 0, this.maxHeat);

        if (this.heat >= this.maxHeat) {
            this.isOverheated = true;
        }

        const muzzleX = this.x + Math.cos(angle) * this.tank.muzzleOffset;
        const muzzleY = this.y + Math.sin(angle) * this.tank.muzzleOffset;
        this.scene.spawnPlayerProjectile(muzzleX, muzzleY, angle, this.tank, targetPoint);

        this.x -= Math.cos(angle) * (this.tank.recoil * 0.35);
        this.y -= Math.sin(angle) * (this.tank.recoil * 0.35);
    }

    coolHeat(delta) {
        this.heat = clamp(this.heat - delta * 0.048, 0, this.maxHeat);
        if (this.heat <= this.maxHeat * 0.6) {
            this.isOverheated = false;
        }
    }

    takeDamage(amount) {
        if (this.scene.time.now < this.invulnerableUntil) {
            return;
        }

        this.invulnerableUntil = this.scene.time.now + 380;
        this.hp = clamp(this.hp - amount, 0, this.maxHp);
        this.setTintFill(0xffffff);
        this.scene.time.delayedCall(70, () => {
            if (this.active) {
                this.clearTint();
            }
        });
    }

    heal(amount) {
        this.hp = clamp(this.hp + amount, 0, this.maxHp);
    }

    getHudState() {
        const healthPct = clamp((this.hp / this.maxHp) * 100, 0, 100);
        const heatPct = clamp((this.heat / this.maxHeat) * 100, 0, 100);

        return {
            healthPct,
            healthText: `${Math.round(healthPct)}%`,
            heatPct,
            heatText: `${Math.round(heatPct)}%`,
            overheated: this.isOverheated
        };
    }
}