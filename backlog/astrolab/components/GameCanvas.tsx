import React, { useEffect, useRef, useState, useCallback } from 'react';
import { WordChallenge, GameState } from '../types';

interface GameCanvasProps {
  challenges: WordChallenge[];
  onGameOver: (score: number, won: boolean) => void;
  onScoreUpdate: (score: number) => void;
  onLivesUpdate: (lives: number) => void;
  onWordChange: (englishWord: string) => void;
}

// Game Constants
const SHIP_WIDTH = 40;
const SHIP_HEIGHT = 50;
const BULLET_SPEED = 7;
const METEOR_SPEED = 1.5; // Base speed
const SPAWN_RATE = 120; // Frames between spawns

interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  markedForDeletion: boolean;
}

interface Ship extends GameObject {
  speed: number;
}

interface Bullet extends GameObject {}

interface Meteor extends GameObject {
  text: string;
  isCorrect: boolean;
  speed: number;
  radius: number;
}

const GameCanvas: React.FC<GameCanvasProps> = ({
  challenges,
  onGameOver,
  onScoreUpdate,
  onLivesUpdate,
  onWordChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Mutable Game State (Refs for performance in game loop)
  const gameStateRef = useRef({
    score: 0,
    lives: 3,
    currentChallengeIndex: 0,
    frames: 0,
    isPlaying: true,
    challenges: challenges,
  });

  const shipRef = useRef<Ship>({
    x: 0,
    y: 0,
    width: SHIP_WIDTH,
    height: SHIP_HEIGHT,
    speed: 0,
    markedForDeletion: false,
  });

  const bulletsRef = useRef<Bullet[]>([]);
  const meteorsRef = useRef<Meteor[]>([]);
  
  // Keys state
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const touchControlsRef = useRef({ left: false, right: false, shoot: false });

  // Update logic to react state to trigger re-renders of UI if needed (rarely used for core loop)
  const [_dummyTick, setDummyTick] = useState(0);

  // Initialize Game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
      
      // Reset ship position to bottom center
      shipRef.current.x = canvas.width / 2 - SHIP_WIDTH / 2;
      shipRef.current.y = canvas.height - SHIP_HEIGHT - 20;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initial Word
    if (gameStateRef.current.challenges.length > 0) {
      onWordChange(gameStateRef.current.challenges[0].english);
    }

    return () => window.removeEventListener('resize', resizeCanvas);
  }, [challenges, onWordChange]);

  // Input Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.code === 'Space') {
        shootBullet();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const shootBullet = () => {
    const ship = shipRef.current;
    bulletsRef.current.push({
      x: ship.x + ship.width / 2 - 2,
      y: ship.y,
      width: 4,
      height: 10,
      markedForDeletion: false,
    });
  };

  // Helper to spawn meteor
  const spawnMeteor = (canvasWidth: number) => {
    const state = gameStateRef.current;
    if (state.currentChallengeIndex >= state.challenges.length) return;

    const currentChallenge = state.challenges[state.currentChallengeIndex];
    const radius = 35 + Math.random() * 10;
    const x = Math.random() * (canvasWidth - radius * 2) + radius;
    
    // Determine if we spawn the correct word or a distractor
    // Force correct word if it's been a while (simple random logic here)
    const isCorrect = Math.random() > 0.6; 
    
    let text = "";
    if (isCorrect) {
      text = currentChallenge.correctPortuguese;
    } else {
      const distractorIndex = Math.floor(Math.random() * currentChallenge.distractors.length);
      text = currentChallenge.distractors[distractorIndex];
    }

    // Ensure we don't spam the same word overlapping too much, but for MVP simple spawn is fine
    meteorsRef.current.push({
      x,
      y: -50,
      width: radius * 2,
      height: radius * 2,
      radius,
      text,
      isCorrect,
      speed: METEOR_SPEED + (state.currentChallengeIndex * 0.2), // Get faster each word
      markedForDeletion: false,
    });
  };

  // Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const loop = () => {
      if (!gameStateRef.current.isPlaying) return;

      const state = gameStateRef.current;
      const ship = shipRef.current;
      
      // 1. Update State
      state.frames++;

      // Ship Movement (Keyboard + Touch)
      if (keysRef.current['ArrowLeft'] || touchControlsRef.current.left) {
        ship.x -= 5;
      }
      if (keysRef.current['ArrowRight'] || touchControlsRef.current.right) {
        ship.x += 5;
      }
      
      // Touch Shoot (Auto-repeat or single press handled by UI, but here we check 'held' state logic if needed)
      // Actually, touch shoot is better handled as a direct event, but let's support rapid fire if held
      if (touchControlsRef.current.shoot && state.frames % 15 === 0) {
        shootBullet();
      }

      // Boundaries
      if (ship.x < 0) ship.x = 0;
      if (ship.x > canvas.width - ship.width) ship.x = canvas.width - ship.width;

      // Spawning
      if (state.frames % SPAWN_RATE === 0) {
        spawnMeteor(canvas.width);
      }

      // Update Bullets
      bulletsRef.current.forEach(b => {
        b.y -= BULLET_SPEED;
        if (b.y < 0) b.markedForDeletion = true;
      });

      // Update Meteors & Collision
      meteorsRef.current.forEach(m => {
        m.y += m.speed;

        // Collision with Ship (Game Over condition or just hurt?) - Let's just hurt
        /* 
           Simple rect/circle collision:
           Closest point on rect to circle center
        */
        const clampX = Math.max(ship.x, Math.min(m.x, ship.x + ship.width));
        const clampY = Math.max(ship.y, Math.min(m.y, ship.y + ship.height));
        const distanceX = m.x - clampX;
        const distanceY = m.y - clampY;
        const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

        if (distance < m.radius) {
          m.markedForDeletion = true;
          state.lives--;
          onLivesUpdate(state.lives);
          // Shake effect?
        }

        // Collision with Bullets
        bulletsRef.current.forEach(b => {
          if (b.markedForDeletion) return;
          
          // Simple point in circle check for bullet tip
          const dx = m.x - (b.x + b.width / 2);
          const dy = m.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < m.radius) {
            b.markedForDeletion = true;
            m.markedForDeletion = true;

            if (m.isCorrect) {
              state.score += 10;
              onScoreUpdate(state.score);
              
              // Move to next word
              state.currentChallengeIndex++;
              // Clear existing meteors to reset field for new word? 
              // Better gameplay: explode all current meteors when correct one is hit
              meteorsRef.current.forEach(other => other.markedForDeletion = true);

              if (state.currentChallengeIndex >= state.challenges.length) {
                state.isPlaying = false;
                onGameOver(state.score, true);
              } else {
                onWordChange(state.challenges[state.currentChallengeIndex].english);
              }
            } else {
              state.lives--;
              onLivesUpdate(state.lives);
            }
          }
        });

        // Remove if off screen
        if (m.y > canvas.height + m.radius) {
           m.markedForDeletion = true;
           // Penalize missing the correct one? Maybe not for now, just keep spawning.
        }
      });

      // Check Game Over
      if (state.lives <= 0) {
        state.isPlaying = false;
        onGameOver(state.score, false);
      }

      // Cleanup
      bulletsRef.current = bulletsRef.current.filter(b => !b.markedForDeletion);
      meteorsRef.current = meteorsRef.current.filter(m => !m.markedForDeletion);

      // 2. Render
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background stars (simple)
      ctx.fillStyle = 'white';
      for(let i=0; i<10; i++) {
        const sx = Math.random() * canvas.width;
        const sy = Math.random() * canvas.height;
        ctx.fillRect(sx, sy, 2, 2);
      }

      // Draw Ship
      ctx.fillStyle = '#facc15'; // Yellow-400
      ctx.beginPath();
      ctx.moveTo(ship.x + ship.width / 2, ship.y);
      ctx.lineTo(ship.x + ship.width, ship.y + ship.height);
      ctx.lineTo(ship.x + ship.width / 2, ship.y + ship.height - 10);
      ctx.lineTo(ship.x, ship.y + ship.height);
      ctx.closePath();
      ctx.fill();

      // Draw Bullets
      ctx.fillStyle = '#ef4444'; // Red-500
      bulletsRef.current.forEach(b => {
        ctx.fillRect(b.x, b.y, b.width, b.height);
      });

      // Draw Meteors
      meteorsRef.current.forEach(m => {
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b'; // Slate-800
        ctx.fill();
        ctx.strokeStyle = '#94a3b8'; // Slate-400
        ctx.lineWidth = 2;
        ctx.stroke();

        // Text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Word wrapping simple logic if needed, but usually single words
        ctx.fillText(m.text, m.x, m.y);
      });

      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => cancelAnimationFrame(animationFrameId);
  }, [challenges, onGameOver, onLivesUpdate, onScoreUpdate, onWordChange]);

  // Handle touch interactions for controls
  const handleTouchStart = (action: 'left' | 'right' | 'shoot') => {
    if (action === 'shoot') {
      shootBullet(); // Immediate shot
      touchControlsRef.current.shoot = true;
    } else {
      touchControlsRef.current[action] = true;
    }
  };

  const handleTouchEnd = (action: 'left' | 'right' | 'shoot') => {
    touchControlsRef.current[action] = false;
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        className="block w-full h-full bg-black touch-none"
      />
      
      {/* Mobile Controls Overlay */}
      <div className="absolute bottom-32 left-0 w-full px-4 flex justify-between items-end pointer-events-none md:hidden">
        <div className="flex gap-4 pointer-events-auto">
          <button
            className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/50 flex items-center justify-center active:bg-white/40 backdrop-blur-sm"
            onTouchStart={() => handleTouchStart('left')}
            onTouchEnd={() => handleTouchEnd('left')}
            onMouseDown={() => handleTouchStart('left')}
            onMouseUp={() => handleTouchEnd('left')}
            onMouseLeave={() => handleTouchEnd('left')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <button
            className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/50 flex items-center justify-center active:bg-white/40 backdrop-blur-sm"
            onTouchStart={() => handleTouchStart('right')}
            onTouchEnd={() => handleTouchEnd('right')}
            onMouseDown={() => handleTouchStart('right')}
            onMouseUp={() => handleTouchEnd('right')}
            onMouseLeave={() => handleTouchEnd('right')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>

        <button
          className="w-20 h-20 rounded-full bg-red-500/30 border-2 border-red-500/70 flex items-center justify-center active:bg-red-500/60 backdrop-blur-sm pointer-events-auto mb-4"
          onTouchStart={() => handleTouchStart('shoot')}
          onTouchEnd={() => handleTouchEnd('shoot')}
          onMouseDown={() => handleTouchStart('shoot')}
          onMouseUp={() => handleTouchEnd('shoot')}
          onMouseLeave={() => handleTouchEnd('shoot')}
        >
          <span className="text-sm font-bold uppercase tracking-wider">Fire</span>
        </button>
      </div>
    </>
  );
};

export default GameCanvas;