import { vi } from "vitest";
import {
    resetRoundTestDeps,
    selectNextChars,
    setRoundTestDeps,
} from "@/pages/dashboard/scripts/common/round.js";

vi.mock("@/scripts/utilsPure.js", () => ({
    orderArray: vi.fn((arr) => arr.sort((a, b) => a - b)),
    shuffleArray: vi.fn((arr) => arr), // determinístico
}));

describe("selectNextChars", () => {
    beforeEach(() => {
        resetRoundTestDeps();
    });

    afterEach(() => {
        resetRoundTestDeps();
    });

    it("retorna vazio se banco vazio", () => {
		vi.mock("@/pages/dashboard/scripts/common/score.js", () => ({
			getValueToScorePerChar: vi.fn((char, key) => 0)
		}));

        setRoundTestDeps({ getCurrentDatabase: () => [] });
        const result = selectNextChars("score", 5);
        expect(result).toEqual([]);
    });

    it("seleciona ate maxCharsRound respeitando ordem dos scores", () => {
		vi.mock("@/pages/dashboard/scripts/common/score.js", () => ({
			getValueToScorePerChar: vi.fn((char, key) => {
				const scores = { A: 2, B: 1, C: 1, D: 3 };
				return scores[char] || 0;
			}),
		}));
        setRoundTestDeps({
            getCurrentDatabase: () => [
                { term: "A" },
                { term: "B" },
                { term: "C" },
                { term: "D" },
            ],
        });
        const result = selectNextChars("score", 3);
        expect(result.length).toBe(3);
        expect(result).toEqual(["B", "C", "A"]);
    });

	it("retorna todos se maxCharsRound maior que banco", () => {
		vi.mock("@/pages/dashboard/scripts/common/score.js", () => ({
			getValueToScorePerChar: vi.fn((char, key) => {
				const scores = { W: 2, X: 1, Y: 1, Z: 3 };
				return scores[char] || 0;
			}),
		}));
		setRoundTestDeps({
			getCurrentDatabase: () => [
				{ term: "W" },
				{ term: "X" },
				{ term: "Y" },
				{ term: "Z" },
			],
		});
		const result = selectNextChars("score", 10);
		expect(result.length).toBe(4);
		expect(result).toEqual(["X", "Y", "W", "Z"]);
	});

	it("seleciona corretamente quando há mais de um grupo com mesmo score", () => {
		setRoundTestDeps({
			getCurrentDatabase: () => [
				{ term: "R" }, 
				{ term: "S" }, 
				{ term: "T" },
				{ term: "U" }, 
			],
		});
			vi.mock("@/pages/dashboard/scripts/common/score.js", () => ({
				getValueToScorePerChar: vi.fn((char, key) => {
					const scores = { R: 1, S: 1, T: 2, U: 2 };
					return scores[char] || 0;
				}),
			}));

		const result = selectNextChars("score", 3);
		expect(result).toEqual(["R", "S", "T"]);
	});
	
	it("inclui letra com score 0 se necessário", () => {
		setRoundTestDeps({
			getCurrentDatabase: () => [
				{ term: "M" },
				{ term: "N" },
				{ term: "O" },
			],
		});
		vi.mock("@/pages/dashboard/scripts/common/score.js", () => ({
			getValueToScorePerChar: vi.fn((char, key) => {
				const scores = { M: 0, N: 1, O: 2 };
            	return scores[char] || 0;
			}),
		}));

		const result = selectNextChars("score", 2);
		expect(result).toEqual(["M", "N"]);
	});
});
