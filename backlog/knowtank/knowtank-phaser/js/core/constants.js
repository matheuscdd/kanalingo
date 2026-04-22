export const GAME_MODES = Object.freeze({
    CORRECT: 'MODE_CORRECT',
    WRONG: 'MODE_WRONG'
});

export const ARENA = Object.freeze({
    width: 3200,
    height: 3200
});

export const PLAYER_START = Object.freeze({
    x: ARENA.width / 2,
    y: ARENA.height / 2
});

export const TANKS = Object.freeze({
    normal: {
        key: 'normal',
        name: 'Tiro Direto',
        texture: 'player-normal',
        fireRate: 180,
        bulletSpeed: 820,
        heatPerShot: 18,
        bulletDamage: 25,
        bulletScale: 1,
        muzzleOffset: 34,
        recoil: 8,
        color: '#00aaff'
    },
    lobber: {
        key: 'lobber',
        name: 'Lançador',
        texture: 'player-lobber',
        fireRate: 600,
        bulletSpeed: 700,
        heatPerShot: 28,
        bulletDamage: 40,
        bulletScale: 1.25,
        muzzleOffset: 38,
        recoil: 12,
        color: '#ffaa44',
        maxRange: 600,
        flightTime: 800,
        blastRadius: 60,
        maxArcHeight: 150,
        breakableDamage: 40
    }
});

export const SUPPORTED_ENEMY_TYPES = ['chaser', 'melee', 'ranged'];

export const DEFAULT_SELECTED_BOTS = ['chaser', 'melee', 'ranged'];

export const IMPLEMENTATION_NOTE = 'Slice atual: chaser, melee e ranged já usam Phaser com IA própria. O lobber agora usa arco parabólico real e pousa por cima de obstáculos; os demais bots avançados continuam como próximas fases.';

export const DEFAULT_OVERLAY = Object.freeze({
    title: 'Knowtank Arena',
    description: 'Base nova em Phaser.js, arquitetura modular e CSS externo. Esta primeira slice já substitui o loop manual por cenas, física Arcade e um fluxo inicial de ondas.'
});