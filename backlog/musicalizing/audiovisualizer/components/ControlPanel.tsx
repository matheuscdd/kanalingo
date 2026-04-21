import React from 'react';
import { AudioConfig } from '../types';
import { Activity, Zap, Move, RefreshCcw, Waves } from 'lucide-react';

interface ControlPanelProps {
  config: AudioConfig;
  setConfig: React.Dispatch<React.SetStateAction<AudioConfig>>;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ config, setConfig }) => {
  
  const handleChange = (key: keyof AudioConfig, value: number) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const ControlSlider = ({ 
    label, 
    value, 
    min, 
    max, 
    step, 
    icon: Icon,
    onChange 
  }: { 
    label: string, 
    value: number, 
    min: number, 
    max: number, 
    step: number, 
    icon: React.ElementType,
    onChange: (val: number) => void 
  }) => (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-zinc-400 text-xs uppercase tracking-wider font-semibold">
        <div className="flex items-center gap-2">
          <Icon size={14} />
          <span>{label}</span>
        </div>
        <span className="text-white">{value.toFixed(1)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white hover:accent-zinc-200 transition-all"
      />
    </div>
  );

  return (
    <>
      <ControlSlider
        label="Bass Sensitivity"
        icon={Activity}
        value={config.sensitivity}
        min={0.5}
        max={5.0}
        step={0.1}
        onChange={(v) => handleChange('sensitivity', v)}
      />
      <ControlSlider
        label="Zoom Impact"
        icon={Zap}
        value={config.zoomAmount}
        min={0}
        max={1.0}
        step={0.05}
        onChange={(v) => handleChange('zoomAmount', v)}
      />
      <ControlSlider
        label="Shake Intensity"
        icon={Move}
        value={config.shakeAmount}
        min={0}
        max={2.0}
        step={0.1}
        onChange={(v) => handleChange('shakeAmount', v)}
      />
      <ControlSlider
        label="Rotation"
        icon={RefreshCcw}
        value={config.rotationAmount}
        min={0}
        max={10.0}
        step={0.5}
        onChange={(v) => handleChange('rotationAmount', v)}
      />
      <ControlSlider
        label="Smoothness"
        icon={Waves}
        value={config.smoothness}
        min={0.1}
        max={0.95}
        step={0.05}
        onChange={(v) => handleChange('smoothness', v)}
      />
    </>
  );
};
