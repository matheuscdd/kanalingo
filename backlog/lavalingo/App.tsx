import React from 'react';
import PhaserGame from './game/PhaserGame';
import GameUI from './components/GameUI';

const App: React.FC = () => {
  return (
    <div className="relative w-full h-screen bg-[#111] overflow-hidden flex justify-center items-center">
      {/* Game Layer */}
      <div className="w-full max-w-4xl aspect-[4/3] relative rounded-2xl overflow-hidden shadow-2xl border-8 border-[#333]">
        <PhaserGame />
        {/* UI Overlay Layer */}
        <GameUI />
      </div>
      
      {/* Background Decor */}
      <div className="absolute -z-10 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-[#58CC02] rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-[#FF4B4B] rounded-full blur-3xl"></div>
      </div>
    </div>
  );
};

export default App;