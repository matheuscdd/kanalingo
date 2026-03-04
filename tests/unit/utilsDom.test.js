import {
    showNumberIncreasing
} from "../../src/scripts/utilsDom.js";
import { describe, it, expect, vi } from "vitest";

describe("showNumberIncreasing", () => {
    it("increments innerText from initial to destination", async () => {
        const el = { innerText: "" };
        const start = 1;
        const end = 5;
        const interval = 30;
        const increaser = 1;
        const updates = [];

        // Spy on el.innerText changes
        Object.defineProperty(el, "innerText", {
            set(value) {
                updates.push(Number(value));
            },
            get() {
                return updates.length ? updates.at(-1) : "";
            },
            configurable: true,
        });

        const t0 = performance.now();
        await showNumberIncreasing(end, start, el, interval, increaser);
        const t1 = performance.now();

        expect(updates[0]).toBe(start);
        expect(updates.at(-1)).toBe(end);
        expect(updates).toContain(end);
        expect(updates.length).toBe(end - start + 1);
        expect(t1 - t0).toBeGreaterThanOrEqual((end - start) * interval);
    });

    it("works with custom increaser", async () => {
        const el = { innerText: "" };
        const start = 2;
        const end = 10;
        const interval = 10;
        const increaser = 2;
        const updates = [];

        Object.defineProperty(el, "innerText", {
            set(value) {
                updates.push(Number(value));
            },
            get() {
                return updates.length ? updates.at(-1) : "";
            },
            configurable: true,
        });

        await showNumberIncreasing(end, start, el, interval, increaser);

        expect(updates[0]).toBe(start);
        expect(updates.at(-1)).toBe(end);
        expect(updates).toEqual([2, 4, 6, 8, 10]);
    });

    it("sets innerText to destination if initial equals destination", async () => {
        const el = { innerText: "" };
        const updates = [];

        Object.defineProperty(el, "innerText", {
            set(value) {
                updates.push(Number(value));
            },
            get() {
                return updates.length ? updates.at(-1) : "";
            },
            configurable: true,
        });

        await showNumberIncreasing(7, 7, el, 10, 1);

        expect(updates).toEqual([7]);
        expect(el.innerText).toBe(7);
    });

    it("handles negative increaser", async () => {
        const el = { innerText: "" };
        const updates = [];

        Object.defineProperty(el, "innerText", {
            set(value) {
                updates.push(Number(value));
            },
            get() {
                return updates.length ? updates.at(-1) : "";
            },
            configurable: true,
        });

        await showNumberIncreasing(-2, -5, el, 5, 1);

        expect(updates[0]).toBe(-5);
        expect(updates.at(-1)).toBe(-2);
        expect(updates).toEqual([-5, -4, -3, -2]);
    });

    it("handles interval zero (runs instantly)", async () => {
        const el = { innerText: "" };
        const updates = [];

        Object.defineProperty(el, "innerText", {
            set(value) {
                updates.push(Number(value));
            },
            get() {
                return updates.length ? updates.at(-1) : "";
            },
            configurable: true,
        });

        const t0 = performance.now();
        await showNumberIncreasing(3, 1, el, 0, 1);
        const t1 = performance.now();

        expect(updates).toEqual([1, 2, 3]);
        expect(t1 - t0).toBeLessThan(10); // Should be very fast
    });

    // adicionar teste para verificar se ficou o foFixed
    // adicionar teste com números quebrados
    // adicionar teste quando o valor passa e depois volta pro original
        it("garante que innerText é sempre inteiro (toFixed)", async () => {
            const el = { innerText: "" };
            const updates = [];
            Object.defineProperty(el, "innerText", {
                set(value) {
                    updates.push(value);
                },
                get() {
                    return updates.length ? updates.at(-1) : "";
                },
                configurable: true,
            });
            await showNumberIncreasing(5, 1, el, 1, 1);
            for (const val of updates) {
                expect(val).toMatch(/^\d+$/);
            }
        });

        it("funciona com números quebrados (decimais)", async () => {
            const el = { innerText: "" };
            const updates = [];
            Object.defineProperty(el, "innerText", {
                set(value) {
                    updates.push(value);
                },
                get() {
                    return updates.length ? updates.at(-1) : "";
                },
                configurable: true,
            });
            await showNumberIncreasing(2.7, 1.2, el, 1, 0.7);

            expect(updates.map(Number)).toEqual([1, 2, 2.7]);
        });

        it("nunca ultrapassa o destination", async () => {
            const el = { innerText: "" };
            const updates = [];
            Object.defineProperty(el, "innerText", {
                set(value) {
                    updates.push(Number(value));
                },
                get() {
                    return updates.length ? updates.at(-1) : "";
                },
                configurable: true,
            });
            await showNumberIncreasing(7, 1, el, 1, 3);

            expect(updates.at(-1)).toBeLessThanOrEqual(7);
            expect(updates).not.toContain(10);
        });
});