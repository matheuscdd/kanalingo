export const COLORS = {
  background: 0x2C1A32, // Dark cave purple
  lava: 0xFF4B4B, // Bright red/orange
  lavaTop: 0xFFC800, // Yellow froth
  player: 0x1CB0F6, // Duo Blue
  platform: 0x555555, // Grey rock
  blockInactive: 0xCE82FF, // Purple puzzle block
  blockActive: 0x58CC02, // Duo Green
  spike: 0x999999, // Sharp Grey
  text: '#FFFFFF'
};

export interface WordPair {
  id: number;
  en: string;
  pt: string;
}

export const WORD_LIST: WordPair[] = [
  { id: 1, en: 'CAT', pt: 'GATO' },
  { id: 2, en: 'DOG', pt: 'CACHORRO' },
  { id: 3, en: 'RED', pt: 'VERMELHO' },
  { id: 4, en: 'WATER', pt: 'AGUA' },
  { id: 5, en: 'BOOK', pt: 'LIVRO' },
  { id: 6, en: 'HOUSE', pt: 'CASA' },
  { id: 7, en: 'LOVE', pt: 'AMOR' },
  { id: 8, en: 'MOON', pt: 'LUA' },
  { id: 9, en: 'SUN', pt: 'SOL' },
  { id: 10, en: 'TREE', pt: 'ARVORE' },
];

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;