import {
    defaultObj,
    orderArray,
    shuffleArray,
    isValidEmail,
    getSumFromValues,
    getTotalScore,
    sleep,
} from "@/scripts/utilsPure.js";
import { describe, it, expect, vi } from "vitest";

describe("defaultObj", () => {
    it("returns default value for missing property", () => {
        const obj = defaultObj(5);
        expect(obj.foo).toBe(5);
        expect(obj.bar).toBe(5);
    });

    it("returns new instance for function constructor", () => {
        function MyClass() {
            this.x = 42;
        }
        const obj = defaultObj(MyClass);
        expect(obj.a.x).toBe(42);
        expect(obj.b.x).toBe(42);
        expect(obj.a).not.toBe(obj.b);
    });

    it("returns new instance Array", () => {
        const obj = defaultObj(Array);
        expect(JSON.stringify(obj.a)).toBe(JSON.stringify([]));
        obj.a.push(5);
        expect(obj.b.length).toBe(0);
        expect(obj.c).not.toBe(obj.b);
    });

    it("returns same value for existing property", () => {
        const obj = defaultObj(7);
        obj.foo = 10;
        expect(obj.foo).toBe(10);
    });
});

describe("orderArray", () => {
    it("sorts numeric array", () => {
        expect(orderArray([3, 1, 2])).toEqual([1, 2, 3]);
    });
    it("sorts empty array", () => {
        expect(orderArray([])).toEqual([]);
    });
    it("sorts negative numbers", () => {
        expect(orderArray([-2, -1, -3])).toEqual([-3, -2, -1]);
    });
    it("sorts repeated numbers", () => {
        expect(orderArray([2, 2, 1])).toEqual([1, 2, 2]);
    });
});

describe("shuffleArray", () => {
    it("shuffles array (same elements, different order)", () => {
        const arr = [
            1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19, 20,
        ];
        const shuffled = shuffleArray(arr);
        expect(shuffled).not.toEqual(arr); // possible rare fail
    });
    it("returns empty array for empty input", () => {
        expect(shuffleArray([])).toEqual([]);
    });
    it("returns same array for single element", () => {
        expect(shuffleArray([42])).toEqual([42]);
    });
});

describe("isValidEmail", () => {
    it("validates correct emails", () => {
        expect(isValidEmail("test@example.com")).toBe(true);
        expect(isValidEmail("foo.bar@baz.co")).toBe(true);
    });
    it("invalidates incorrect emails", () => {
        expect(isValidEmail("test@")).toBe(false);
        expect(isValidEmail("test@.com")).toBe(false);
        expect(isValidEmail("test.com")).toBe(false);
        expect(isValidEmail("")).toBe(false);
    });
});

describe("getSumFromValues", () => {
    it("sums values of object", () => {
        expect(getSumFromValues({ a: 1, b: 2, c: 3 })).toBe(6);
    });
    it("returns 0 for empty object", () => {
        expect(getSumFromValues({})).toBe(0);
    });
    it("sums negative values", () => {
        expect(getSumFromValues({ a: -1, b: -2 })).toBe(-3);
    });
    it("sums mixed values", () => {
        expect(getSumFromValues({ a: 1, b: -2, c: 3 })).toBe(2);
    });
});

describe("sleep", () => {
    it("returns a Promise", () => {
        expect(sleep(10)).toBeInstanceOf(Promise);
    });
    it("waits for the specified time", async () => {
        vi.useFakeTimers();
        const spy = vi.fn();
        sleep(100).then(spy);
        vi.advanceTimersByTime(99);
        expect(spy).not.toHaveBeenCalled();
        await vi.runAllTimersAsync();
        expect(spy).toHaveBeenCalled();
        vi.useRealTimers();
    });
});

describe("getTotalScore", () => {
    it("soma valores mistos", () => {
        const ref = {
            れ: { typing: 0, drawing: 0, listening: 0 },
            の: { drawing: 0, listening: 0, typing: 100 },
        };
        expect(getTotalScore(ref)).toBe(100);
    });
    it("retorna 0 para objeto vazio", () => {
        expect(getTotalScore({})).toBe(0);
    });
    it("retorna 0 para subobjetos vazios", () => {
        const ref = { a: {}, b: {} };
        expect(getTotalScore(ref)).toBe(0);
    });
    it("soma valores decimais", () => {
        const ref = { a: { x: 1.5, y: 2.5 }, b: { z: 3 } };
        expect(getTotalScore(ref)).toBe(7);
    });
    it("soma subobjetos com propriedades diferentes", () => {
        const ref = { a: { x: 1 }, b: { y: 2, z: 3 } };
        expect(getTotalScore(ref)).toBe(6);
    });
    it("todos os valores zero", () => {
        const ref = { a: { x: 0, y: 0 }, b: { z: 0 } };
        expect(getTotalScore(ref)).toBe(0);
    });
});

describe("edge cases", () => {
    it("defaultObj with undefined", () => {
        const obj = defaultObj(undefined);
        expect(obj.x).toBe(undefined);
    });
    it("orderArray with non-array", () => {
        expect(() => orderArray(null)).toThrow();
        expect(() => orderArray(undefined)).toThrow();
    });
    it("shuffleArray with non-array", () => {
        expect(() => shuffleArray(null)).toThrow();
        expect(() => shuffleArray(undefined)).toThrow();
    });
    it("isValidEmail with non-string", () => {
        expect(isValidEmail(null)).toBe(false);
        expect(isValidEmail(undefined)).toBe(false);
        expect(isValidEmail(123)).toBe(false);
    });
    it("getSumFromValues with non-object", () => {
        expect(getSumFromValues({})).toBe(0);
        expect(getSumFromValues([])).toBe(0);
    });
    it("sleep with non-number", async () => {
        await expect(sleep("abc")).resolves.toBeUndefined();
        await expect(sleep(undefined)).resolves.toBeUndefined();
    });
});
