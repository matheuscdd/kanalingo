export const enemyConfig = {
    ranged: { color: '#1cb0f6', desc: 'Orbita' },
    melee: { color: '#ff4b4b', desc: 'Bate e corre' },
    shield: { color: '#ffc800', desc: 'Zig-zag' },
    builder: { color: '#ff9600', desc: 'Foge e ergue barreiras' },
    aoe: { color: '#ce82ff', desc: 'Explosão em área' },
    laser: { color: '#2b70c9', desc: 'Patrulha e risca o mapa' },
    chaser: { color: '#ff007f', desc: 'Persegue sem parar' },
    acid: { color: '#8aff00', desc: 'Rastro tóxico' },
    mimic: { color: '#ffffff', desc: 'Replica trilha do jogador' },
    electric: { color: '#00ffff', desc: 'Prevê e pune' },
    turreteer: { color: '#ff00aa', desc: 'Planta torres' },
    ice: { color: '#0088ff', desc: 'Cone congelante' },
    bouncer: { color: '#ff00ff', desc: 'Ricocheteia projéteis' }
};

export const enemyCatalog = [
    { type: 'melee', label: 'Bate-e-Corre', detail: 'Investida curta', icon: 'fa-solid fa-person-running', supported: true },
    { type: 'chaser', label: 'Perseguidor', detail: 'Pressão constante', icon: 'fa-solid fa-location-crosshairs', supported: true },
    { type: 'laser', label: 'Laser', detail: 'Patrulha', icon: 'fa-solid fa-wave-square', supported: false },
    { type: 'aoe', label: 'Explosão em Área', detail: 'Cast radial', icon: 'fa-solid fa-burst', supported: false },
    { type: 'builder', label: 'Construtor', detail: 'Foge e fecha rota', icon: 'fa-solid fa-hammer', supported: false },
    { type: 'ranged', label: 'Atirador', detail: 'Mantém distância', icon: 'fa-solid fa-crosshairs', supported: true },
    { type: 'acid', label: 'Ácido', detail: 'Rastro persistente', icon: 'fa-solid fa-flask-vial', supported: false },
    { type: 'mimic', label: 'Mímico', detail: 'Replica movimentação', icon: 'fa-solid fa-clone', supported: false },
    { type: 'electric', label: 'Elétrico', detail: 'Antecipação', icon: 'fa-solid fa-bolt', supported: false },
    { type: 'turreteer', label: 'Engenheiro', detail: 'Planta torres', icon: 'fa-solid fa-screwdriver-wrench', supported: false },
    { type: 'ice', label: 'Gelado', detail: 'Controle de área', icon: 'fa-solid fa-snowflake', supported: false },
    { type: 'bouncer', label: 'Quicador', detail: 'Ricochete', icon: 'fa-solid fa-arrows-turn-right', supported: false },
    { type: 'shield', label: 'Escudo', detail: 'Janela defensiva', icon: 'fa-solid fa-shield-halved', supported: false }
];

export function isEnemyTypeSupported(type) {
    return enemyCatalog.some(entry => entry.type === type && entry.supported);
}