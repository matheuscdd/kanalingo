import { on } from '../core/events.js';
import { DEFAULT_OVERLAY, GAME_MODES } from '../core/constants.js';
import { getState, setState } from '../core/store.js';

export class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        this.cameras.main.setBackgroundColor('#060a10');
        this.drawBackdrop();

        const state = getState();
        if (!['gameover', 'win'].includes(state.status)) {
            setState({
                status: 'menu',
                overlay: { ...DEFAULT_OVERLAY },
                celebration: { visible: false, title: 'ÁREA LIMPA!', description: 'Sincronizando a próxima região...' }
            });
        }

        const unsubscribe = on('game:start-requested', ({ mode }) => {
            setState({
                status: 'loading',
                gameMode: mode || GAME_MODES.CORRECT,
                currentQuestionIndex: 0,
                overlay: {
                    title: 'Preparando arena',
                    description: 'Inicializando cenas, HUD e entidades da nova arquitetura em Phaser.'
                },
                celebration: { visible: false, title: 'ÁREA LIMPA!', description: 'Sincronizando a próxima região...' }
            });
            this.scene.start('GameScene', { mode });
        });

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            unsubscribe();
        });
    }

    drawBackdrop() {
        const width = this.scale.width;
        const height = this.scale.height;

        const graphics = this.add.graphics();
        graphics.lineStyle(1, 0x163246, 0.85);
        for (let x = 0; x < width; x += 60) {
            graphics.lineBetween(x, 0, x, height);
        }
        for (let y = 0; y < height; y += 60) {
            graphics.lineBetween(0, y, width, y);
        }

        graphics.lineStyle(3, 0x00ff88, 0.45);
        graphics.strokeRoundedRect(width * 0.15, height * 0.16, width * 0.7, height * 0.68, 24);

        const beacon = this.add.circle(width * 0.78, height * 0.28, 34).setStrokeStyle(3, 0x00ff88, 0.8);
        this.tweens.add({
            targets: beacon,
            scale: { from: 0.92, to: 1.08 },
            alpha: { from: 0.45, to: 1 },
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.add.text(width * 0.08, height - 44, 'Phaser slice: shell, cenas, HUD e primeira onda jogável.', {
            fontFamily: 'Rajdhani',
            fontSize: '24px',
            fontStyle: '700',
            color: '#89f8bf'
        }).setAlpha(0.75);
    }
}