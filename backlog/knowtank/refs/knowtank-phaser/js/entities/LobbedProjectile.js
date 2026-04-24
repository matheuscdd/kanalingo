export class LobbedProjectile extends Phaser.GameObjects.Container {
    constructor(scene, startX, startY, targetX, targetY, tank) {
        super(scene, startX, startY);

        this.scene = scene;
        this.startX = startX;
        this.startY = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.damage = tank.bulletDamage;
        this.breakableDamage = tank.breakableDamage ?? tank.bulletDamage;
        this.blastRadius = tank.blastRadius ?? 60;
        this.flightTime = tank.flightTime ?? 800;
        this.maxArcHeight = Math.min(
            Phaser.Math.Distance.Between(startX, startY, targetX, targetY) * 0.5,
            tank.maxArcHeight ?? 150
        );
        this.elapsed = 0;

        this.shadow = scene.add.ellipse(0, 0, 26, 16, 0x000000, 0.3);
        this.core = scene.add.circle(0, 0, 10, 0xff5500, 1);
        this.core.setStrokeStyle(2, 0xffddb0, 0.95);
        this.highlight = scene.add.circle(-3, -3, 4, 0xffcc66, 0.95);
        this.trail = scene.add.circle(0, 0, 6, 0xffa44d, 0.45);

        this.add([this.shadow, this.trail, this.core, this.highlight]);

        scene.add.existing(this);
        this.setDepth(12);
    }

    update(_time, delta) {
        this.elapsed += delta;
        const t = Phaser.Math.Clamp(this.elapsed / this.flightTime, 0, 1);
        const arcHeight = 4 * this.maxArcHeight * t * (1 - t);

        this.x = Phaser.Math.Linear(this.startX, this.targetX, t);
        this.y = Phaser.Math.Linear(this.startY, this.targetY, t);

        this.shadow.setScale(1 - t * 0.14, 1 - t * 0.14);
        this.shadow.setAlpha(0.18 + t * 0.18);
        this.core.y = -arcHeight;
        this.highlight.y = -arcHeight - 3;
        this.trail.y = -Math.max(arcHeight * 0.45, 6);
        this.trail.setAlpha(0.15 + (1 - t) * 0.25);

        if (t >= 1) {
            this.scene.handleLobbedImpact({
                x: this.targetX,
                y: this.targetY,
                damage: this.damage,
                breakableDamage: this.breakableDamage,
                blastRadius: this.blastRadius
            });
            this.destroy();
        }
    }
}