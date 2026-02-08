export interface WordChallenge {
  english: string;
  correctPortuguese: string;
  distractors: string[];
}

export enum GameState {
  MENU = 'MENU',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export interface GameStats {
  score: number;
  lives: number;
  currentRound: number;
  totalRounds: number;
}