import { createDomController } from '../ui/dom-controller.js';

export class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
    }

    create() {
        this.domController = createDomController();
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.domController?.destroy();
        });
    }
}