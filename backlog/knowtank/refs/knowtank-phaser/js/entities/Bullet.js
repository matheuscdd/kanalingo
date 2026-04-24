export class Bullet extends Phaser.Physics.Arcade.Image {
    constructor(scene, x, y, { angle, speed, damage, isPlayer, tint, scale = 1 }) {
        super(scene, x, y, 'bullet');
        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);

        this.damage = damage;
        this.isPlayer = isPlayer;
        this.lifeRemaining = 1400;
        this.launchAngle = angle;
        this.launchSpeed = speed;

        this.setScale(scale);
        this.setTint(tint);
        this.setDepth(6);
        this.body.setCircle(6 * scale);
        this.body.allowGravity = false;
        this.launch();
    }

    launch() {
        this.setAngle(Phaser.Math.RadToDeg(this.launchAngle));
        this.setVelocity(
            Math.cos(this.launchAngle) * this.launchSpeed,
            Math.sin(this.launchAngle) * this.launchSpeed
        );
        return this;
    }

    update(_time, delta) {
        this.lifeRemaining -= delta;

        if (this.lifeRemaining <= 0) {
            this.destroy();
        }
    }
}