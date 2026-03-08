import { selectNextChars } from '@/pages/dashboard/scripts/utils.js';

describe('selectNextChars', () => {
	let originalGetCurrentDatabase;
	let originalGetValueToScorePerChar;
	let originalOrderArray;
	let originalShuffleArray;

	beforeAll(() => {
		// Salvar originais para restaurar depois
		originalGetCurrentDatabase = globalThis.getCurrentDatabase;
		originalGetValueToScorePerChar = globalThis.getValueToScorePerChar;
		originalOrderArray = globalThis.orderArray;
		originalShuffleArray = globalThis.shuffleArray;
	});

	afterAll(() => {
		// Restaurar originais
		globalThis.getCurrentDatabase = originalGetCurrentDatabase;
		globalThis.getValueToScorePerChar = originalGetValueToScorePerChar;
		globalThis.orderArray = originalOrderArray;
		globalThis.shuffleArray = originalShuffleArray;
	});

	beforeEach(() => {
		// Mock básico para dependências
		globalThis.getCurrentDatabase = () => [
			{ term: 'A' },
			{ term: 'B' },
			{ term: 'C' },
			{ term: 'D' }
		];
		globalThis.getValueToScorePerChar = (char, key) => {
			const scores = { A: 2, B: 1, C: 1, D: 3 };
			return scores[char] || 0;
		};
		globalThis.orderArray = arr => arr.sort((a, b) => a - b);
		globalThis.shuffleArray = arr => arr; // Sem embaralhamento para teste determinístico
	});

	it('seleciona até maxCharsRound respeitando ordem dos scores', () => {
		const result = selectNextChars('score', 3);
		expect(result.length).toBe(3);
		// Espera-se que selecione B, C (score 1), A (score 2)
		expect(result).toEqual(['B', 'C', 'A']);
	});

	it('retorna todos se maxCharsRound maior que banco', () => {
		const result = selectNextChars('score', 10);
		expect(result.length).toBe(4);
		expect(result).toEqual(['B', 'C', 'A', 'D']);
	});

	it('retorna vazio se banco vazio', () => {
		globalThis.getCurrentDatabase = () => [];
		const result = selectNextChars('score', 5);
		expect(result).toEqual([]);
	});
});
