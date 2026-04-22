export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function shuffle(items) {
    const array = [...items];

    for (let index = array.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
    }

    return array;
}

export function hexToNumber(hexColor) {
    return Number.parseInt(hexColor.replace('#', ''), 16);
}