import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Note, GameStats, getLaneConfig } from '../types';

interface FretboardProps {
  songData: { buffer: AudioBuffer; notes: Note[]; duration: number; laneCount: number };
  audioContext: AudioContext;
  onFinish: (stats: GameStats) => void;
  onExit: () => void;
}

const NOTE_SPEED = 700;
const HIT_WINDOW = 0.15;
const HIT_Y = 520;
const CANVAS_HEIGHT = 600;

export const Fretboard: React.FC<FretboardProps> = ({ songData, audioContext, onFinish, onExit }) => {
  const [stats, setStats] = useState<GameStats>({ score: 0, combo: 0, maxCombo: 0, hits: 0, misses: 0 });
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const lanes = useMemo(() => getLaneConfig(songData.laneCount), [songData.laneCount]);
  const laneKeys = useMemo(() => lanes.map(l => l.key), [lanes]);

  // Refs for performance
  const notesRef = useRef<Note[]>(JSON.parse(JSON.stringify(songData.notes)));
  const activeKeys = useRef<boolean[]>(new Array(songData.laneCount).fill(false));
  const animationFrameRef = useRef<number>(0);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const statsRef = useRef(stats); 

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  const playSound = useCallback(() => {
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const source = audioContext.createBufferSource();
    source.buffer = songData.buffer;
    source.connect(audioContext.destination);
    
    const now = audioContext.currentTime;
    source.start(now);
    sourceNodeRef.current = source;
    setStartTime(now);
    setIsPlaying(true);
  }, [audioContext, songData.buffer]);

  const stopGame = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
          sourceNodeRef.current.stop();
      } catch (e) {
          // Ignore
      }
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsPlaying(false);
  }, []);

  // Handle Input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyIndex = laneKeys.indexOf(e.key.toLowerCase());
      if (keyIndex !== -1 && !activeKeys.current[keyIndex]) {
        activeKeys.current[keyIndex] = true;
        if (isPlaying && startTime) {
            checkHit(keyIndex);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const keyIndex = laneKeys.indexOf(e.key.toLowerCase());
      if (keyIndex !== -1) {
        activeKeys.current[keyIndex] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPlaying, startTime, laneKeys]);

  const checkHit = (laneIndex: number) => {
    const currentTime = audioContext.currentTime - (startTime || 0);
    
    const noteIndex = notesRef.current.findIndex(n => 
      n.lane === laneIndex && 
      !n.hit && 
      !n.missed && 
      Math.abs(n.time - currentTime) <= HIT_WINDOW
    );

    if (noteIndex !== -1) {
      const note = notesRef.current[noteIndex];
      note.hit = true;
      
      const diff = Math.abs(note.time - currentTime);
      let points = 100;
      if (diff < 0.05) { points = 300; }
      else if (diff < 0.1) { points = 200; }

      setStats(prev => ({
        ...prev,
        score: prev.score + points * (1 + Math.min(prev.combo, 50) * 0.1), 
        combo: prev.combo + 1,
        maxCombo: Math.max(prev.maxCombo, prev.combo + 1),
        hits: prev.hits + 1
      }));
    } else {
      setStats(prev => ({ ...prev, combo: 0 }));
    }
  };

  // Game Loop
  const loop = useCallback(() => {
    if (!isPlaying || !startTime || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentTime = audioContext.currentTime - startTime;

    if (currentTime > songData.duration + 2) {
      onFinish(statsRef.current);
      stopGame();
      return;
    }

    // --- DRAWING ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const laneCount = songData.laneCount;
    const laneWidth = canvas.width / laneCount;

    // Draw Lanes & Receptors
    for (let i = 0; i < laneCount; i++) {
      const x = i * laneWidth;
      
      // Lane BG
      ctx.fillStyle = activeKeys.current[i] ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(x, 0, laneWidth, canvas.height);
      
      // Divider
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();

      // Receptor
      const centerX = x + laneWidth / 2;
      const laneDef = lanes[i];
      const colorHex = laneDef.colorHex;
      
      ctx.lineWidth = 3;
      ctx.strokeStyle = activeKeys.current[i] ? '#fff' : 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(centerX, HIT_Y, 22, 0, Math.PI * 2);
      ctx.stroke();

      if (activeKeys.current[i]) {
        ctx.fillStyle = colorHex;
        ctx.beginPath();
        ctx.arc(centerX, HIT_Y, 18, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowColor = colorHex;
        ctx.shadowBlur = 20;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    // Right border
    ctx.strokeStyle = '#222';
    ctx.beginPath();
    ctx.moveTo(canvas.width, 0);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.stroke();

    // Draw Notes
    notesRef.current.forEach(note => {
      if (note.hit) return;

      const timeDiff = note.time - currentTime;
      const y = HIT_Y - (timeDiff * NOTE_SPEED);

      if (y > CANVAS_HEIGHT + 40 && !note.missed) {
         note.missed = true;
         setStats(prev => ({ ...prev, combo: 0, misses: prev.misses + 1 }));
      }

      if (y > -50 && y < CANVAS_HEIGHT + 50 && !note.missed) {
         const laneX = note.lane * laneWidth + laneWidth / 2;
         const laneDef = lanes[note.lane];
         
         if (!laneDef) return; // Safety check

         const color = laneDef.colorHex;

         ctx.fillStyle = color;
         ctx.beginPath();
         ctx.arc(laneX, y, 18, 0, Math.PI * 2);
         ctx.fill();

         const grad = ctx.createRadialGradient(laneX - 5, y - 5, 2, laneX, y, 18);
         grad.addColorStop(0, '#fff');
         grad.addColorStop(0.3, color);
         grad.addColorStop(1, color);
         ctx.fillStyle = grad;
         ctx.fill();
         
         ctx.shadowColor = color;
         ctx.shadowBlur = 10;
         ctx.beginPath();
         ctx.arc(laneX, y, 18, 0, Math.PI * 2);
         ctx.stroke(); 
         ctx.shadowBlur = 0;
      }
    });

    animationFrameRef.current = requestAnimationFrame(loop);
  }, [isPlaying, startTime, songData, audioContext, onFinish, stopGame, lanes]);

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(loop);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, loop]);

  useEffect(() => {
    const timer = setTimeout(() => {
       playSound();
    }, 500);
    return () => {
        clearTimeout(timer);
        stopGame();
    };
  }, [playSound, stopGame]);

  return (
    <div className="relative w-full h-screen flex flex-col items-center justify-center bg-black overflow-hidden">
      
      <div className="absolute top-8 left-8 z-30 pointer-events-none">
        <div className="text-5xl font-black italic text-white neon-text">{stats.score.toLocaleString()}</div>
        <div className="text-xl font-bold text-gray-400 tracking-widest mt-1">SCORE</div>
      </div>

      <div className="absolute top-8 right-8 z-30 pointer-events-none text-right">
        <div className={`text-6xl font-black italic transition-all duration-100 ${stats.combo > 0 ? 'scale-110 text-yellow-400 neon-text' : 'text-gray-700'}`}>
          {stats.combo}
        </div>
        <div className="text-xl font-bold text-gray-400 tracking-widest mt-1">COMBO</div>
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex gap-4">
         <div className="text-xs text-green-400 font-bold">HIT: {stats.hits}</div>
         <div className="text-xs text-red-400 font-bold">MISS: {stats.misses}</div>
      </div>

      <button 
        onClick={onExit}
        className="absolute bottom-8 right-8 z-50 px-6 py-2 bg-red-900/50 hover:bg-red-800 text-red-200 rounded border border-red-700/50 uppercase font-bold text-sm tracking-widest transition-colors backdrop-blur-sm"
      >
        Abort Track
      </button>

      <div className="perspective-container w-full max-w-3xl h-[650px] relative flex items-end justify-center mb-10">
        <div 
          className="w-full h-full relative origin-bottom transform-3d bg-gradient-to-t from-gray-900 via-black to-black border-x-4 border-gray-800 shadow-[0_0_50px_rgba(0,0,0,0.8)]"
          style={{ transform: 'rotateX(50deg) scaleY(1.2)' }}
        >
          <canvas 
            ref={canvasRef}
            width={600}
            height={600}
            className="w-full h-full block opacity-90"
          />
          <div className="absolute bottom-[13%] left-0 w-full h-1 bg-cyan-500/50 blur-md"></div>
        </div>
      </div>
      
      {/* Input Feedback / Controls Overlay */}
      <div className="absolute bottom-12 flex gap-6 z-20 pointer-events-none justify-center w-full">
        {lanes.map((lane, i) => (
           <div key={i} className="flex flex-col items-center gap-2">
             <div className={`w-14 h-14 rounded-lg border-2 flex items-center justify-center font-black text-xl transition-all duration-75 
                ${activeKeys.current[i] 
                  ? `${lane.colorClass} border-white text-white shadow-[0_0_20px_currentColor] scale-95` 
                  : 'bg-gray-900/80 border-gray-700 text-gray-500'
                }`}>
               {lane.label}
             </div>
           </div>
        ))}
      </div>
    </div>
  );
};