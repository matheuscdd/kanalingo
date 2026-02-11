export enum GameState {
  MENU = 'MENU',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED'
}

export interface Note {
  time: number; // Time in seconds when the note hits the target
  lane: number; // 0 based index
  id: string;
  hit: boolean;
  missed: boolean;
}

export interface SongData {
  buffer: AudioBuffer;
  name: string;
  notes: Note[];
  duration: number;
  laneCount: number;
}

export interface GameStats {
  score: number;
  combo: number;
  maxCombo: number;
  hits: number;
  misses: number;
}

export interface LaneDef {
  colorClass: string; // Tailwind class for DOM elements
  colorHex: string;   // Hex code for Canvas
  key: string;        // Keyboard event key
  label: string;      // Display label
}

export const getLaneConfig = (count: number): LaneDef[] => {
  switch (count) {
    case 3:
      return [
        { colorClass: 'bg-green-500', colorHex: '#22c55e', key: 'a', label: 'A' },
        { colorClass: 'bg-yellow-500', colorHex: '#eab308', key: 's', label: 'S' },
        { colorClass: 'bg-red-500', colorHex: '#ef4444', key: 'd', label: 'D' },
      ];
    case 4:
      return [
        { colorClass: 'bg-green-500', colorHex: '#22c55e', key: 'd', label: 'D' },
        { colorClass: 'bg-red-500', colorHex: '#ef4444', key: 'f', label: 'F' },
        { colorClass: 'bg-blue-500', colorHex: '#3b82f6', key: 'j', label: 'J' },
        { colorClass: 'bg-orange-500', colorHex: '#f97316', key: 'k', label: 'K' },
      ];
    case 5:
    default:
      return [
        { colorClass: 'bg-green-500', colorHex: '#22c55e', key: 'a', label: 'A' },
        { colorClass: 'bg-red-500', colorHex: '#ef4444', key: 's', label: 'S' },
        { colorClass: 'bg-yellow-400', colorHex: '#eab308', key: 'j', label: 'J' },
        { colorClass: 'bg-blue-500', colorHex: '#3b82f6', key: 'k', label: 'K' },
        { colorClass: 'bg-orange-500', colorHex: '#f97316', key: 'l', label: 'L' },
      ];
  }
};