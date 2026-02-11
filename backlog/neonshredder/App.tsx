import React, { useState, useEffect } from 'react';
import { GameState, SongData, GameStats, getLaneConfig } from './types';
import { analyzeAudio } from './utils/audioProcessor';
import { Fretboard } from './components/Fretboard';
import { Button } from './components/Button';
import { Music, Upload, Trophy, RotateCcw } from 'lucide-react';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [songData, setSongData] = useState<SongData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastStats, setLastStats] = useState<GameStats | null>(null);
  const [laneCount, setLaneCount] = useState<number>(5);
  
  // Persistent AudioContext
  const [audioContext] = useState(() => new (window.AudioContext || (window as any).webkitAudioContext)());

  useEffect(() => {
    // Resume context on user interaction if needed
    const unlockAudio = () => {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    return () => {
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
    };
  }, [audioContext]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }

    setIsLoading(true);
    setGameState(GameState.LOADING);

    try {
      const data = await analyzeAudio(file, audioContext, laneCount);
      
      setSongData({
        buffer: data.buffer,
        name: file.name.replace(/\.[^/.]+$/, ""),
        notes: data.notes,
        duration: data.buffer.duration,
        laneCount: laneCount
      });
      setGameState(GameState.PLAYING);
    } catch (error) {
      console.error("Error processing audio:", error);
      alert("Failed to process audio file. Please try a different file (MP3/WAV).");
      setGameState(GameState.MENU);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGameFinish = (stats: GameStats) => {
    setLastStats(stats);
    setGameState(GameState.FINISHED);
  };

  const getControlString = (count: number) => {
    return getLaneConfig(count).map(l => l.label).join(' ');
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-sans selection:bg-cyan-500 selection:text-black">
      
      {/* MENU SCREEN */}
      {gameState === GameState.MENU && (
        <div className="text-center space-y-10 animate-fade-in p-6 max-w-md w-full">
          <div className="space-y-4">
             <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-cyan-600 neon-text" style={{ textShadow: '0 0 30px rgba(6,182,212,0.5)' }}>
              NEON<br/>SHREDDER
            </h1>
            <p className="text-cyan-200/70 text-lg uppercase tracking-widest">Rhythm Game Clone</p>
          </div>

          <div className="space-y-4">
             <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">Select Mode</div>
             <div className="flex justify-center gap-4">
                {[3, 4, 5].map(count => (
                  <button
                    key={count}
                    onClick={() => setLaneCount(count)}
                    className={`w-16 h-16 rounded-xl font-black text-2xl border-2 transition-all duration-200
                      ${laneCount === count 
                        ? 'bg-cyan-500 border-cyan-300 text-black shadow-[0_0_20px_#0ff] scale-110' 
                        : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-gray-500 hover:text-white'
                      }`}
                  >
                    {count}K
                  </button>
                ))}
             </div>
             <p className="text-xs text-cyan-400 h-4">
                Controls: {getControlString(laneCount)}
             </p>
          </div>

          <div className="p-8 border border-gray-800 bg-gray-900/50 rounded-2xl backdrop-blur-sm shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <label className="relative z-10 flex flex-col items-center cursor-pointer space-y-4">
              <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center border-2 border-dashed border-gray-600 group-hover:border-cyan-400 group-hover:bg-gray-700 transition-all duration-300">
                <Upload className="w-8 h-8 text-gray-400 group-hover:text-cyan-400" />
              </div>
              <div>
                <span className="block text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">Upload Song</span>
                <span className="text-sm text-gray-500">MP3 or WAV supported</span>
              </div>
              <input 
                type="file" 
                accept="audio/*" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </label>
          </div>
          
          <div className="text-xs text-gray-600 mt-8">
            <p>Pure Algorithmic Beat Generation</p>
          </div>
        </div>
      )}

      {/* LOADING SCREEN */}
      {gameState === GameState.LOADING && (
        <div className="flex flex-col items-center justify-center space-y-6">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-2xl font-bold animate-pulse text-cyan-400">ANALYZING AUDIO SPECTRUM...</div>
          <p className="text-gray-500">Generating {laneCount}-key pattern</p>
        </div>
      )}

      {/* GAMEPLAY SCREEN */}
      {gameState === GameState.PLAYING && songData && (
        <Fretboard 
          songData={songData} 
          audioContext={audioContext}
          onFinish={handleGameFinish} 
          onExit={() => setGameState(GameState.MENU)}
        />
      )}

      {/* RESULTS SCREEN */}
      {gameState === GameState.FINISHED && lastStats && (
        <div className="text-center space-y-8 p-8 max-w-2xl w-full animate-in fade-in zoom-in duration-300">
           <div className="flex justify-center mb-6">
             <Trophy className="w-24 h-24 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
           </div>
           
           <h2 className="text-5xl font-bold text-white uppercase tracking-wider">{songData?.name} FINISHED</h2>
           
           <div className="grid grid-cols-2 gap-4 mt-8">
             <div className="bg-gray-900/80 p-6 rounded-xl border border-gray-800">
                <div className="text-gray-400 text-sm uppercase">Score</div>
                <div className="text-4xl font-bold text-cyan-400">{lastStats.score.toLocaleString()}</div>
             </div>
             <div className="bg-gray-900/80 p-6 rounded-xl border border-gray-800">
                <div className="text-gray-400 text-sm uppercase">Max Combo</div>
                <div className="text-4xl font-bold text-yellow-400">{lastStats.maxCombo}</div>
             </div>
             <div className="bg-gray-900/80 p-6 rounded-xl border border-gray-800">
                <div className="text-gray-400 text-sm uppercase">Perfect/Great</div>
                <div className="text-2xl font-bold text-green-400">{lastStats.hits}</div>
             </div>
             <div className="bg-gray-900/80 p-6 rounded-xl border border-gray-800">
                <div className="text-gray-400 text-sm uppercase">Misses</div>
                <div className="text-2xl font-bold text-red-400">{lastStats.misses}</div>
             </div>
           </div>

           <div className="flex gap-4 justify-center mt-12">
             <Button onClick={() => setGameState(GameState.MENU)} variant="secondary" className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5" /> Play Another
             </Button>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;