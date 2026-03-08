import { sleep } from "./utilsPure.js";

export const isPWA = () =>
    globalThis.matchMedia("(display-mode: standalone)").matches;

export async function showNumberIncreasing(
    destination,
    initial,
    el,
    interval,
    increaser = 1,
) {
    let i = 0;
    for (i = initial; i <= destination; i += increaser) {
        if (Number(i.toFixed(0)) > destination) break; 
        el.innerText = i.toFixed(0);
        if (interval > 0) {
            await sleep(interval);
        }
        if (i === destination) return;
    }
    el.innerText = destination;
}