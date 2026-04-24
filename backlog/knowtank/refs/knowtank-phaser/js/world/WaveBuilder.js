import { hexToNumber } from '../utils/math.js';

const palette = {
    obstacleFill: 0x152432,
    obstacleStroke: 0x00ff88,
    breakableFill: 0x8b5a2b,
    breakableStroke: 0x5c3a18,
    bushFill: 0x17452a,
    bushStroke: 0x2d9951
};

export class WaveBuilder {
    constructor(scene) {
        this.scene = scene;
        this.solidGroup = scene.physics.add.staticGroup();
        this.breakableGroup = scene.physics.add.staticGroup();
        this.obstacles = [];
        this.breakables = [];
        this.bushes = [];
    }

    reset() {
        for (const obstacle of this.obstacles) {
            this.solidGroup.remove(obstacle, true, true);
        }

        for (const block of this.breakables) {
            this.breakableGroup.remove(block, true, true);
        }

        for (const bush of this.bushes) {
            bush.destroy();
        }

        this.obstacles = [];
        this.breakables = [];
        this.bushes = [];
    }

    build(layout) {
        this.reset();

        for (const bushRect of layout.bushes) {
            this.bushes.push(this.createBush(bushRect));
        }

        for (const obstacleRect of layout.obstacles) {
            this.obstacles.push(this.createSolid(obstacleRect));
        }

        for (const blockRect of layout.breakableBlocks) {
            this.breakables.push(this.createBreakable(blockRect));
        }
    }

    createBush(rect) {
        return this.scene.add.rectangle(
            rect.x + rect.w / 2,
            rect.y + rect.h / 2,
            rect.w,
            rect.h,
            palette.bushFill,
            0.9
        ).setStrokeStyle(3, palette.bushStroke, 1);
    }

    createSolid(rect) {
        const obstacle = this.scene.add.rectangle(
            rect.x + rect.w / 2,
            rect.y + rect.h / 2,
            rect.w,
            rect.h,
            palette.obstacleFill,
            1
        ).setStrokeStyle(3, palette.obstacleStroke, 1);

        this.scene.physics.add.existing(obstacle, true);
        obstacle.setDataEnabled();
        obstacle.setData('rect', { ...rect });
        this.solidGroup.add(obstacle);
        obstacle.body.updateFromGameObject();
        return obstacle;
    }

    createBreakable(rect) {
        const block = this.scene.add.rectangle(
            rect.x + rect.w / 2,
            rect.y + rect.h / 2,
            rect.w,
            rect.h,
            palette.breakableFill,
            1
        ).setStrokeStyle(3, palette.breakableStroke, 1);

        this.scene.physics.add.existing(block, true);
        block.setDataEnabled();
        block.setData('rect', { ...rect });
        block.setData('hp', 100);
        block.setData('maxHp', 100);
        this.breakableGroup.add(block);
        block.body.updateFromGameObject();
        return block;
    }

    damageBreakable(block, amount) {
        const nextHp = Math.max(0, block.getData('hp') - amount);
        block.setData('hp', nextHp);
        block.setAlpha(0.55 + (nextHp / block.getData('maxHp')) * 0.45);

        if (nextHp > 0) {
            return false;
        }

        this.breakables = this.breakables.filter(item => item !== block);
        this.breakableGroup.remove(block, true, true);
        return true;
    }

    getSolidRects() {
        const obstacleRects = this.obstacles
            .filter(item => item.active)
            .map(item => item.getData('rect'));

        const breakableRects = this.breakables
            .filter(item => item.active)
            .map(item => item.getData('rect'));

        return [...obstacleRects, ...breakableRects];
    }

    isInsideBush(x, y) {
        return this.bushes.some(bush => {
            const left = bush.x - bush.width / 2;
            const right = bush.x + bush.width / 2;
            const top = bush.y - bush.height / 2;
            const bottom = bush.y + bush.height / 2;
            return x >= left && x <= right && y >= top && y <= bottom;
        });
    }

    tintBushes(hidden) {
        const alpha = hidden ? 0.96 : 0.9;
        const stroke = hidden ? hexToNumber('#6cffb8') : palette.bushStroke;

        for (const bush of this.bushes) {
            bush.setAlpha(alpha);
            bush.setStrokeStyle(3, stroke, 1);
        }
    }
}