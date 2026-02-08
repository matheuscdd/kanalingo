import React, { useEffect, useRef, useState } from 'react';
import { AudioConfig } from '../types';

interface AudioVisualizerProps {
  imageSrc: string;
  audioRef: React.RefObject<HTMLAudioElement>;
  config: AudioConfig;
  isPlaying: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ 
  imageSrc, 
  audioRef, 
  config,
  isPlaying 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageElementRef = useRef<HTMLImageElement>(null);
  
  // Audio Context Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number>();

  // Helper function to initialize audio context
  const initAudio = () => {
    if (!audioRef.current) return;

    if (!audioContextRef.current) {
      // Create Context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      // Create Analyser
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256; // 128 frequency bins
      analyser.smoothingTimeConstant = config.smoothness;
      analyserRef.current = analyser;

      // Create Source
      try {
        const source = ctx.createMediaElementSource(audioRef.current);
        source.connect(analyser);
        analyser.connect(ctx.destination);
        sourceRef.current = source;
      } catch (e) {
        // Source might already be connected if re-initializing, ignore
        console.warn("MediaElementSource might already be connected", e);
      }
    } else if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    // Update smoothing dynamically
    if (analyserRef.current) {
      analyserRef.current.smoothingTimeConstant = config.smoothness;
    }
  };

  useEffect(() => {
    if (isPlaying) {
      initAudio();
      startAnimation();
    } else {
      stopAnimation();
    }
    return () => stopAnimation();
  }, [isPlaying, config.smoothness]); // Re-init if smoothness changes

  const startAnimation = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const stopAnimation = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    // Reset transform on stop
    if (imageElementRef.current) {
      imageElementRef.current.style.transform = `scale(1) rotate(0deg) translate(0px, 0px)`;
      imageElementRef.current.style.filter = `brightness(100%)`;
    }
  };

  const animate = () => {
    if (!analyserRef.current || !imageElementRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // --- Frequency Band Analysis ---
    
    // Bass: roughly bins 0-4 (0-350Hz approx depending on sample rate)
    const bassAvg = getAverageVolume(dataArray, 0, 4);
    
    // Mids/Snare: roughly bins 10-25
    const midAvg = getAverageVolume(dataArray, 10, 25);
    
    // Highs: roughly bins 40-80
    // const highAvg = getAverageVolume(dataArray, 40, 80);

    // --- Physics Calculation ---

    // Normalize bass (0-1) and apply sensitivity curve (cubic for punchiness)
    const normalizedBass = Math.min(bassAvg / 255 * config.sensitivity, 1.2);
    const bassPunch = Math.pow(normalizedBass, 3); // Exponential curve for punch

    // Scale Logic (Zoom)
    // Base scale 1.0 + config.zoomAmount * bassPunch
    const scale = 1 + (bassPunch * config.zoomAmount);

    // Shake Logic (Translation)
    // Trigger shake only if mids are strong (snare/clap) or super heavy bass
    const shakeTrigger = (midAvg / 255 * config.sensitivity) > 0.6 ? 1 : 0;
    const shakeX = (Math.random() - 0.5) * 20 * config.shakeAmount * shakeTrigger * bassPunch;
    const shakeY = (Math.random() - 0.5) * 20 * config.shakeAmount * shakeTrigger * bassPunch;

    // Rotation Logic
    // Subtle rotation based on overall energy
    const rotation = (Math.sin(Date.now() / 200) * config.rotationAmount * bassPunch);

    // Brightness pulse
    const brightness = 100 + (bassPunch * 20); // Flash a bit on beats

    // Apply Styles
    imageElementRef.current.style.transform = `
      scale(${scale.toFixed(3)}) 
      rotate(${rotation.toFixed(2)}deg) 
      translate(${shakeX.toFixed(1)}px, ${shakeY.toFixed(1)}px)
    `;
    
    imageElementRef.current.style.filter = `brightness(${brightness.toFixed(0)}%) saturate(${100 + bassPunch * 20}%)`;

    // Visualizer Bars (Optional: Render to a canvas overlay if we wanted to, but simple CSS effects are requested)
    
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const getAverageVolume = (array: Uint8Array, start: number, end: number) => {
    let values = 0;
    for (let i = start; i < end; i++) {
      values += array[i];
    }
    return values / (end - start);
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full flex items-center justify-center overflow-hidden bg-black relative shadow-2xl"
    >
      {/* Container for the image ensuring it fits but allows overflow for zoom */}
      <div className="relative flex items-center justify-center w-full h-full p-10 md:p-20">
         <img
          ref={imageElementRef}
          src={imageSrc}
          alt="Visualizer Target"
          className="max-h-full max-w-full object-contain transition-transform duration-75 ease-out shadow-2xl rounded-md"
          style={{ 
            willChange: 'transform, filter',
            transformOrigin: 'center center' 
          }}
        />
      </div>

      {/* Optional: Simple frequency bars overlay at the bottom */}
      {isPlaying && (
         <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-50 blur-sm" 
              style={{ transform: 'scaleX(0.8)', borderRadius: '100%' }} />
      )}
    </div>
  );
};
