import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { MainScene } from '../game/scenes/MainScene';
import { Question, EVENTS } from '../types';

interface GameCanvasProps {
  questions: Question[];
  onGameOver: (score: number, won: boolean) => void;
  onUpdateHud: (data: any) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ questions, onGameOver, onUpdateHud }) => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!parentRef.current) return;
    if (gameRef.current) return; // Prevent double init

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 600,
      height: 440,
      parent: parentRef.current,
      backgroundColor: '#111827',
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
      scene: [MainScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    // Wait for scene to be ready before passing data
    game.events.once('ready', () => {
      const scene = game.scene.getScene('MainScene') as MainScene;
      
      // Pass initial data
      scene.events.on(EVENTS.GAME_WON, ({ score }: { score: number }) => {
        onGameOver(score, true);
      });
      scene.events.on(EVENTS.GAME_LOST, ({ score }: { score: number }) => {
        onGameOver(score, false);
      });
      scene.events.on(EVENTS.UPDATE_HUD, (data: any) => {
        onUpdateHud(data);
      });

      scene.scene.start('MainScene', { questions });
    });

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, []); // Run once on mount

  return <div ref={parentRef} className="w-full h-full rounded-lg overflow-hidden shadow-2xl border-4 border-gray-800" />;
};

export default GameCanvas;