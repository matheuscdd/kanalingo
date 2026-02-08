import React, { useState, useEffect } from 'react';
import { fetchVocabularyRound } from './services/geminiService';
import GameCanvas from './components/GameCanvas';
import { GameState, WordChallenge } from './types';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [challenges, setChallenges] = useState<WordChallenge[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [currentWord, setCurrentWord] = useState<string>("");
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const startGame = async () => {
    setGameState(GameState.LOADING);
    setLoadingError(null);
    try {
      const data = await fetchVocabularyRound(5);
      setChallenges(data);
      setScore(0);
      setLives(3);
      setCurrentWord("");
      setGameState(GameState.PLAYING);
    } catch (err) {
      console.error(err);
      setLoadingError("Failed to load vocabulary. Please try again.");
      setGameState(GameState.MENU);
    }
  };

  const handleGameOver = (finalScore: number, won: boolean) => {
    setScore(finalScore);
    setGameState(won ? GameState.VICTORY : GameState.GAME_OVER);
  };

  return (
    <div className="relative w-full h-full bg-gray-950 font-sans text-white overflow-hidden flex flex-col">
      {/* HUD - Always visible during gameplay */}
      {gameState === GameState.PLAYING && (
        <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 pointer-events-none">
          <div className="flex flex-col gap-2">
            <div className="bg-gray-800/80 px-4 py-2 rounded-lg border border-gray-600 backdrop-blur-md">
              <span className="text-gray-400 text-xs uppercase tracking-wider block">Score</span>
              <span className="text-2xl font-bold text-yellow-400">{score}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {[...Array(3)].map((_, i) => (
              <svg 
                key={i} 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill={i < lives ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={2}
                className={`w-8 h-8 ${i < lives ? "text-red-500" : "text-gray-700"}`}
              >
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
            ))}
          </div>
        </div>
      )}

      {/* Main Game Area */}
      <div className="flex-grow relative">
        {gameState === GameState.PLAYING && (
          <GameCanvas
            challenges={challenges}
            onGameOver={handleGameOver}
            onScoreUpdate={setScore}
            onLivesUpdate={setLives}
            onWordChange={setCurrentWord}
          />
        )}
        
        {/* Menu Screen */}
        {gameState === GameState.MENU && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-[url('https://picsum.photos/1920/1080?blur=5')] bg-cover">
            <div className="bg-black/80 p-8 rounded-2xl border border-gray-700 backdrop-blur-lg max-w-md w-full text-center shadow-2xl">
              <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-2">
                AstroVocab
              </h1>
              <p className="text-gray-300 mb-8">Shoot the correct translations to survive!</p>
              
              {loadingError && (
                <div className="bg-red-900/50 text-red-200 p-3 rounded mb-4 text-sm border border-red-700">
                  {loadingError}
                </div>
              )}

              <button
                onClick={startGame}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl font-bold text-lg hover:from-blue-500 hover:to-indigo-500 transition-all transform hover:scale-105 shadow-lg"
              >
                Start Mission
              </button>
              
              <div className="mt-6 text-sm text-gray-500">
                <p>Controls:</p>
                <div className="flex justify-center gap-4 mt-2">
                  <span className="bg-gray-800 px-2 py-1 rounded">← → Move</span>
                  <span className="bg-gray-800 px-2 py-1 rounded">Space Shoot</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading Screen */}
        {gameState === GameState.LOADING && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-blue-400 animate-pulse">Initializing Systems...</p>
              <p className="text-xs text-gray-500 mt-2">Generating vocabulary via Gemini</p>
            </div>
          </div>
        )}

        {/* Game Over / Victory Screen */}
        {(gameState === GameState.GAME_OVER || gameState === GameState.VICTORY) && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/90 backdrop-blur-sm">
             <div className="text-center bg-gray-900 p-8 rounded-2xl border border-gray-700 shadow-2xl max-w-sm w-full">
                {gameState === GameState.VICTORY ? (
                  <div className="text-6xl mb-4">🏆</div>
                ) : (
                  <div className="text-6xl mb-4">💥</div>
                )}
                
                <h2 className={`text-3xl font-black mb-2 ${gameState === GameState.VICTORY ? 'text-green-400' : 'text-red-500'}`}>
                  {gameState === GameState.VICTORY ? 'MISSION COMPLETE' : 'MISSION FAILED'}
                </h2>
                
                <div className="my-6">
                  <p className="text-gray-400 text-sm uppercase">Final Score</p>
                  <p className="text-4xl font-bold text-white">{score}</p>
                </div>

                <button
                  onClick={startGame}
                  className="w-full py-3 bg-white text-black rounded-xl font-bold text-lg hover:bg-gray-200 transition-colors"
                >
                  Play Again
                </button>
             </div>
          </div>
        )}
      </div>

      {/* Footer Word Display - The core UI element requested */}
      <div className="bg-gray-900 border-t-4 border-gray-700 p-6 z-10">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-gray-500 uppercase text-xs font-bold tracking-[0.2em] mb-2">Translate this:</p>
          {currentWord ? (
             <h2 className="text-4xl md:text-5xl font-black text-white tracking-wide animate-in fade-in slide-in-from-bottom-4 duration-500">
              {currentWord}
            </h2>
          ) : (
            <div className="h-12 bg-gray-800 rounded animate-pulse w-64 mx-auto"></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;