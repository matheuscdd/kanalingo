import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Music, Image as ImageIcon, Play, Pause, AlertCircle, Settings2, Volume2 } from 'lucide-react';
import { AudioConfig } from './types';
import { AudioVisualizer } from './components/AudioVisualizer';
import { ControlPanel } from './components/ControlPanel';

const DEFAULT_CONFIG: AudioConfig = {
  sensitivity: 1.5,
  zoomAmount: 0.3,
  shakeAmount: 0.5,
  rotationAmount: 2.0,
  smoothness: 0.8
};

const App: React.FC = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [config, setConfig] = useState<AudioConfig>(DEFAULT_CONFIG);
  const [showControls, setShowControls] = useState(true);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'audio') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    if (type === 'image') {
      setImageSrc(url);
    } else {
      setAudioSrc(url);
      // Reset play state when new audio is loaded
      setIsPlaying(false);
    }
  };

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !audioSrc) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      // Need to handle the promise to catch autoplay policies
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error("Playback failed:", error);
        });
      }
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, audioSrc]);

  // Sync play state with actual audio events (e.g. if audio ends)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPause = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('pause', onPause);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioSrc]);

  return (
    <div className="h-screen w-full flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden relative">
      {/* Background/Visualizer Area */}
      <div className="flex-1 relative w-full h-full overflow-hidden flex items-center justify-center bg-black">
        {!imageSrc ? (
          <div className="text-zinc-500 flex flex-col items-center gap-4 animate-pulse">
            <ImageIcon size={64} className="opacity-50" />
            <p className="text-lg font-medium">Upload an image to get started</p>
          </div>
        ) : (
          <AudioVisualizer
            imageSrc={imageSrc}
            audioRef={audioRef}
            config={config}
            isPlaying={isPlaying}
          />
        )}
        
        {/* Toggle Controls Button (Floating) */}
        {imageSrc && audioSrc && (
          <button 
            onClick={() => setShowControls(prev => !prev)}
            className="absolute top-4 right-4 z-50 p-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-full hover:bg-white/10 transition-colors"
          >
            <Settings2 size={20} className={showControls ? "text-primary-400" : "text-white"} />
          </button>
        )}
      </div>

      {/* Hidden Audio Element */}
      {audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          crossOrigin="anonymous"
          loop
          preload="auto"
        />
      )}

      {/* Controls Overlay */}
      <div className={`
        absolute bottom-0 left-0 right-0 
        bg-gradient-to-t from-black via-black/90 to-transparent 
        p-6 z-40 transition-transform duration-500 ease-in-out
        ${showControls ? 'translate-y-0' : 'translate-y-[calc(100%-80px)]'}
      `}>
        <div className="max-w-5xl mx-auto w-full">
          
          {/* Main Playback & Upload Controls */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <button
                onClick={togglePlay}
                disabled={!audioSrc}
                className={`
                  h-14 w-14 rounded-full flex items-center justify-center transition-all shadow-lg
                  ${!audioSrc 
                    ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' 
                    : 'bg-white text-black hover:scale-105 active:scale-95 hover:bg-zinc-200'
                  }
                `}
              >
                {isPlaying ? <Pause fill="currentColor" /> : <Play fill="currentColor" className="ml-1" />}
              </button>
              
              <div className="flex flex-col">
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                  Rhythm Pulse
                </h1>
                <p className="text-xs text-zinc-400">
                  {!audioSrc ? 'Upload a track to begin' : isPlaying ? 'Playing...' : 'Paused'}
                </p>
              </div>
            </div>

            {/* File Inputs */}
            <div className="flex gap-3 w-full md:w-auto">
              <label className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 cursor-pointer transition-colors group">
                <ImageIcon size={18} className="group-hover:text-blue-400 transition-colors" />
                <span className="text-sm font-medium">Image</span>
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'image')} className="hidden" />
              </label>
              
              <label className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 cursor-pointer transition-colors group">
                <Music size={18} className="group-hover:text-pink-400 transition-colors" />
                <span className="text-sm font-medium">Audio</span>
                <input type="file" accept="audio/*" onChange={(e) => handleFileChange(e, 'audio')} className="hidden" />
              </label>
            </div>
          </div>

          {/* Advanced Controls (Collapsible) */}
          <div className={`
            grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 
            border-t border-white/5 pt-6 transition-opacity duration-300
            ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}
          `}>
            <ControlPanel config={config} setConfig={setConfig} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
