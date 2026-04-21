export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
}

export enum GameStatus {
  MENU = 'MENU',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export interface GameConfig {
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

// Phaser specific event types
export const EVENTS = {
  PLAYER_HIT: 'player-hit',
  ANSWER_COLLECTED: 'answer-collected',
  GAME_WON: 'game-won',
  GAME_LOST: 'game-lost',
  UPDATE_HUD: 'update-hud'
};