import React, { useState, useEffect, useRef } from 'react';
import { EventBus, GameEvents } from '../game/EventBus';
import { WordPair, COLORS } from '../constants';

const GameUI: React.FC = () => {
  const [currentWord, setCurrentWord] = useState<WordPair | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'won'>('start');
  const [feedback, setFeedback] = useState<'neutral' | 'correct' | 'wrong'>('neutral');
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Event Listeners
    const onWordUpdate = (word: WordPair | null) => {
      setCurrentWord(word);
      if (word) {
        setTimeout(() => inputRef.current?.focus(), 50);
        setInputValue('');
        setFeedback('neutral');
      }
    };

    const onGameOver = () => setGameState('gameover');
    const onGameWon = () => setGameState('won');

    EventBus.on(GameEvents.WORD_UPDATE, onWordUpdate);
    EventBus.on(GameEvents.GAME_OVER, onGameOver);
    EventBus.on(GameEvents.GAME_WON, onGameWon);

    return () => {
      EventBus.off(GameEvents.WORD_UPDATE, onWordUpdate);
      EventBus.off(GameEvents.GAME_OVER, onGameOver);
      EventBus.off(GameEvents.GAME_WON, onGameWon);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord) return;

    const normalizedInput = inputValue.trim().toUpperCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove accents for lenient checking
    const normalizedTarget = currentWord.pt.toUpperCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (normalizedInput === normalizedTarget) {
      setFeedback('correct');
      // Trigger Phaser event
      EventBus.emit(GameEvents.CORRECT_ANSWER, currentWord.id);
      setInputValue('');
      setCurrentWord(null);
    } else {
      setFeedback('wrong');
      // Shake effect or sound could go here
      setTimeout(() => setFeedback('neutral'), 1000);
    }
  };

  const handleStartGame = () => {
      setGameState('playing');
      EventBus.emit(GameEvents.START_GAME);
  }

  const handleRestart = () => {
    setGameState('playing');
    setFeedback('neutral');
    setInputValue('');
    setCurrentWord(null);
    
    // Restart logic: Tell Phaser to reset, then wait a tick to tell it to start running
    EventBus.emit(GameEvents.RESTART);
    setTimeout(() => {
        EventBus.emit(GameEvents.START_GAME);
    }, 100);
  };

  if (gameState === 'start') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
        <div className="bg-white p-8 rounded-2xl shadow-[0_8px_0_0_rgba(0,0,0,0.2)] text-center max-w-sm w-full">
          <h1 className="text-3xl font-extrabold text-[#58CC02] mb-2">Lava Lingo Climb</h1>
          <p className="text-gray-500 mb-6">Escape the rising lava by translating words!</p>
          <div className="flex justify-center mb-6">
             <div className="w-16 h-16 bg-[#1CB0F6] rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-md transform -rotate-6">A</div>
             <div className="w-16 h-16 bg-[#CE82FF] rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-md -ml-4 z-10 transform rotate-6">文</div>
          </div>
          <button 
            onClick={handleStartGame}
            className="w-full bg-[#58CC02] hover:bg-[#46A302] text-white font-bold py-3 px-6 rounded-xl border-b-4 border-[#46A302] active:border-b-0 active:translate-y-1 transition-all"
          >
            START GAME
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'gameover') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
        <div className="bg-white p-8 rounded-2xl shadow-[0_8px_0_0_rgba(0,0,0,0.2)] text-center max-w-sm w-full">
          <h2 className="text-3xl font-bold text-red-500 mb-4">Game Over!</h2>
          <p className="text-gray-600 mb-6">The lava got you. Try to type faster!</p>
          <button 
            onClick={handleRestart}
            className="w-full bg-[#58CC02] hover:bg-[#46A302] text-white font-bold py-3 px-6 rounded-xl border-b-4 border-[#46A302] active:border-b-0 active:translate-y-1 transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'won') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
        <div className="bg-white p-8 rounded-2xl shadow-[0_8px_0_0_rgba(0,0,0,0.2)] text-center max-w-sm w-full">
          <h2 className="text-3xl font-bold text-[#FFC800] mb-4">You Escaped!</h2>
          <p className="text-gray-600 mb-6">Excellent translation skills.</p>
          <button 
            onClick={handleRestart}
            className="w-full bg-[#1CB0F6] hover:bg-[#1899D6] text-white font-bold py-3 px-6 rounded-xl border-b-4 border-[#1899D6] active:border-b-0 active:translate-y-1 transition-all"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-end pb-8 items-center">
      {/* HUD Info */}
      <div className="absolute top-4 left-4 pointer-events-auto">
        <div className="bg-white/90 backdrop-blur border-b-4 border-gray-200 px-4 py-2 rounded-xl text-gray-700 font-bold flex items-center gap-2">
            <span>Arrow Keys to Move/Jump</span>
        </div>
      </div>

      {/* Typing Interface */}
      {currentWord && (
        <div className="pointer-events-auto mb-10 w-full max-w-md px-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className={`bg-white p-6 rounded-2xl shadow-[0_8px_0_0_rgba(0,0,0,0.2)] transition-colors duration-300 border-2 ${
            feedback === 'wrong' ? 'border-red-500 bg-red-50' : 
            feedback === 'correct' ? 'border-[#58CC02]' : 'border-gray-200'
          }`}>
            
            <div className="flex items-center justify-between mb-4">
               <span className="text-gray-400 font-bold text-sm uppercase tracking-wider">Translate this</span>
               <div className="bg-purple-100 text-purple-600 px-3 py-1 rounded-lg font-bold text-xs">
                 BLOCK #{currentWord.id}
               </div>
            </div>

            <div className="text-center mb-6">
                <h1 className="text-4xl font-extrabold text-gray-700">{currentWord.en}</h1>
            </div>

            <form onSubmit={handleSubmit} className="relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type in Portuguese..."
                className={`w-full bg-gray-100 text-gray-800 text-lg font-bold p-4 rounded-xl border-2 border-gray-300 focus:outline-none focus:border-[#1CB0F6] focus:bg-white transition-all ${
                    feedback === 'wrong' ? 'animate-pulse border-red-400' : ''
                }`}
                autoFocus
              />
              <button 
                type="submit"
                className="absolute right-2 top-2 bottom-2 bg-[#58CC02] hover:bg-[#46A302] text-white font-bold px-4 rounded-lg transition-colors uppercase text-sm"
              >
                CHECK
              </button>
            </form>

            {feedback === 'wrong' && (
                <div className="text-red-500 font-bold text-center mt-2 text-sm animate-bounce">
                    Incorrect! Try again.
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GameUI;