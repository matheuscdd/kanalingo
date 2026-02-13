import Phaser from 'phaser';

// Singleton event bus for cross-component communication
export const EventBus = new Phaser.Events.EventEmitter();

export enum GameEvents {
  WORD_UPDATE = 'word-update',
  CORRECT_ANSWER = 'correct-answer',
  GAME_OVER = 'game-over',
  GAME_WON = 'game-won',
  PLAYER_MOVED = 'player-moved',
  RESTART = 'restart',
  START_GAME = 'start-game'
}