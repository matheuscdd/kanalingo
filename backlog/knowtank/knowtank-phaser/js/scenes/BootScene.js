export class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    create() {
        this.createTextures();
        this.scene.launch('UIScene');
        this.scene.start('MenuScene');
    }

    createTextures() {
        if (!this.textures.exists('player-normal')) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });

            graphics.clear();
            graphics.fillStyle(0x4c6273, 1);
            graphics.fillRoundedRect(6, 14, 18, 12, 4);
            graphics.fillRoundedRect(6, 38, 18, 12, 4);
            graphics.fillRoundedRect(40, 14, 18, 12, 4);
            graphics.fillRoundedRect(40, 38, 18, 12, 4);
            graphics.fillStyle(0x0077cc, 1);
            graphics.fillRoundedRect(14, 18, 36, 28, 10);
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(30, 32, 8);
            graphics.fillStyle(0x4c6273, 1);
            graphics.fillRoundedRect(30, 28, 24, 8, 4);
            graphics.generateTexture('player-normal', 64, 64);

            graphics.clear();
            graphics.fillStyle(0x3c5364, 1);
            graphics.fillRoundedRect(7, 14, 16, 12, 4);
            graphics.fillRoundedRect(7, 38, 16, 12, 4);
            graphics.fillRoundedRect(41, 14, 16, 12, 4);
            graphics.fillRoundedRect(41, 38, 16, 12, 4);
            graphics.fillStyle(0x004c88, 1);
            graphics.fillRoundedRect(14, 16, 34, 32, 10);
            graphics.fillStyle(0xffaa44, 1);
            graphics.fillCircle(30, 32, 9);
            graphics.fillStyle(0x2a2a2a, 1);
            graphics.fillRoundedRect(28, 24, 28, 16, 5);
            graphics.generateTexture('player-lobber', 64, 64);

            graphics.clear();
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(20, 20, 18);
            graphics.fillStyle(0x0d1117, 0.22);
            graphics.fillCircle(13, 14, 5);
            graphics.generateTexture('enemy-core', 40, 40);

            graphics.clear();
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(8, 8, 6);
            graphics.generateTexture('bullet', 16, 16);
            graphics.destroy();
        }
    }
}