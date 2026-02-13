import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import MainScene from './scenes/MainScene';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../constants';

const PhaserGame: React.FC = () => {
  const gameContainer = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!gameContainer.current) return;

    // Phaser Config
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      parent: gameContainer.current,
      backgroundColor: COLORS.background, // Match constants
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 1000 },
          debug: false // Set true to see physics boxes if needed
        }
      },
      scene: [MainScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    };

    // Initialize Game
    gameRef.current = new Phaser.Game(config);

    // Cleanup
    return () => {
      gameRef.current?.destroy(true);
    };
  }, []);

  return <div ref={gameContainer} className="w-full h-full" />;
};

export default PhaserGame;