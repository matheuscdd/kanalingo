export interface AudioConfig {
  sensitivity: number;
  zoomAmount: number;
  shakeAmount: number;
  rotationAmount: number;
  smoothness: number;
}

export enum FileType {
  IMAGE = 'IMAGE',
  AUDIO = 'AUDIO'
}
