export async function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

export function getTotalScore(ref) {
    return Object.values(ref).reduce((x, y) => getSumFromValues(y) + x, 0);
}

export function getSumFromValues(x) {
    if (Object.values(x).length === 0) return 0;
    return Object.values(x).reduce((a, b) => a + b, 0);
}

export function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

export function shuffleArray(arr) {
    return arr.toSorted(() => Math.random() - 0.5);
}

export function orderArray(arr) {
    return arr.toSorted((a, b) => a - b);
}

export function defaultObj(defaultValue) {
    const map = {};
    return new Proxy(map, {
        get(target, prop) {
            if (!target.hasOwnProperty(prop)) {
                target[prop] =
                    typeof defaultValue === "function"
                        ? new defaultValue()
                        : defaultValue;
            }
            return Reflect.get(...arguments);
        },
    });
}
