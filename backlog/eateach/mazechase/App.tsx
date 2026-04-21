import React, { useState } from 'react';
import { generateQuestions } from './services/geminiService';
import GameCanvas from './components/GameCanvas';
import { GameStatus, Question } from './types';
import { Gamepad2, Heart, Trophy, Skull, Loader2, BrainCircuit } from 'lucide-react';

export default function App() {
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU);
  const [topic, setTopic] = useState('Math');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [finalScore, setFinalScore] = useState(0);
  const [hudData, setHudData] = useState({
    score: 0,
    lives: 3,
    questionText: '',
    currentQuestion: 0,
    totalQuestions: 0
  });

  const startGame = async () => {
    setStatus(GameStatus.LOADING);
    const generatedQuestions = await generateQuestions(topic);
    setQuestions(generatedQuestions);
    setStatus(GameStatus.PLAYING);
  };

  const handleGameOver = (score: number, won: boolean) => {
    setFinalScore(score);
    setStatus(won ? GameStatus.VICTORY : GameStatus.GAME_OVER);
  };

  const handleHudUpdate = (data: any) => {
    setHudData(prev => ({ ...prev, ...data }));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      {/* Header */}
      <header className="mb-6 text-center">
        <h1 className="text-4xl md:text-5xl font-black text-yellow-400 tracking-tight flex items-center justify-center gap-3 pixel-font mb-2">
          <Gamepad2 className="w-10 h-10" />
          MAZE CHASE
        </h1>
        <p className="text-gray-400 text-sm">Powered by Gemini AI</p>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-4xl flex flex-col items-center relative">
        
        {/* MENU STATE */}
        {status === GameStatus.MENU && (
          <div className="bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-700 w-full max-w-md text-center space-y-6">
            <div className="space-y-2">
              <label htmlFor="topic" className="block text-sm font-medium text-gray-300">
                What do you want to learn today?
              </label>
              <input
                id="topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Solar System, French Words, Algebra"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-yellow-500 focus:outline-none transition-all"
              />
            </div>
            
            <button
              onClick={startGame}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold py-4 px-6 rounded-lg transition-transform transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 pixel-font"
            >
              <BrainCircuit className="w-5 h-5" />
              START GAME
            </button>

            <div className="text-xs text-gray-500 mt-4">
              <p>Controls: Arrow Keys to Move.</p>
              <p>Objective: Find the correct answer zone!</p>
            </div>
          </div>
        )}

        {/* LOADING STATE */}
        {status === GameStatus.LOADING && (
          <div className="flex flex-col items-center justify-center space-y-4 animate-pulse">
            <Loader2 className="w-16 h-16 text-yellow-500 animate-spin" />
            <p className="text-xl font-bold text-yellow-500 pixel-font">GENERATING MAZE...</p>
          </div>
        )}

        {/* PLAYING STATE */}
        {status === GameStatus.PLAYING && (
          <div className="w-full flex flex-col items-center gap-4">
            {/* HUD Bar */}
            <div className="w-full max-w-2xl bg-gray-800 rounded-xl p-3 flex justify-between items-center border border-gray-700 shadow-lg">
              <div className="flex items-center gap-2 text-red-400 font-bold text-xl">
                <Heart className="fill-current w-6 h-6" />
                <span>x {hudData.lives}</span>
              </div>
              
              <div className="bg-gray-900 px-4 py-1 rounded-md border border-gray-700">
                 <span className="text-gray-400 text-xs uppercase tracking-wider">Score</span>
                 <div className="text-yellow-400 font-bold pixel-font">{hudData.score}</div>
              </div>

              <div className="text-right">
                <span className="text-xs text-gray-400">Question</span>
                <div className="font-bold text-white">{hudData.currentQuestion} / {hudData.totalQuestions}</div>
              </div>
            </div>

            {/* Phaser Game Container */}
            <div className="relative w-[600px] h-[440px] max-w-full aspect-[600/440]">
                <GameCanvas 
                  questions={questions}
                  onGameOver={handleGameOver}
                  onUpdateHud={handleHudUpdate}
                />
            </div>

            {/* Question Display */}
            <div className="w-full max-w-2xl bg-blue-900/50 border border-blue-500/30 p-4 rounded-xl text-center shadow-lg backdrop-blur-sm">
                <h2 className="text-xl md:text-2xl font-bold text-white animate-fade-in">
                  {hudData.questionText || "Get Ready..."}
                </h2>
            </div>
          </div>
        )}

        {/* GAME OVER / VICTORY STATE */}
        {(status === GameStatus.GAME_OVER || status === GameStatus.VICTORY) && (
          <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl border-2 border-gray-700 text-center space-y-6 max-w-md w-full">
            <div className="flex justify-center mb-4">
              {status === GameStatus.VICTORY ? (
                <div className="bg-yellow-500/20 p-4 rounded-full">
                  <Trophy className="w-16 h-16 text-yellow-400" />
                </div>
              ) : (
                <div className="bg-red-500/20 p-4 rounded-full">
                  <Skull className="w-16 h-16 text-red-500" />
                </div>
              )}
            </div>
            
            <h2 className={`text-3xl pixel-font ${status === GameStatus.VICTORY ? 'text-yellow-400' : 'text-red-500'}`}>
              {status === GameStatus.VICTORY ? 'YOU WIN!' : 'GAME OVER'}
            </h2>
            
            <div className="bg-gray-900 p-4 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">FINAL SCORE</p>
              <p className="text-3xl font-bold text-white pixel-font">{finalScore}</p>
            </div>

            <button
              onClick={() => setStatus(GameStatus.MENU)}
              className="w-full bg-white hover:bg-gray-200 text-gray-900 font-bold py-3 px-6 rounded-lg transition-colors pixel-font"
            >
              PLAY AGAIN
            </button>
          </div>
        )}

      </main>
      
      {/* Footer */}
      <footer className="mt-8 text-gray-600 text-xs">
         &copy; {new Date().getFullYear()} Maze Chase Remix. Built with Phaser & React.
      </footer>
    </div>
  );
}