"use client";

import React, { useState } from "react";
import GameScreen from "@/components/GameScreen";
import { Play, Volume2, VolumeX, Shield, Award, RotateCcw, Home, Sparkles, Building2 } from "lucide-react";

type GameState = "START" | "PLAYING" | "GAMEOVER";

export default function Page() {
  const [gameState, setGameState] = useState<GameState>("START");
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // Game stats for Game Over modal
  const [stats, setStats] = useState({
    score: 0,
    height: 0,
    blocks: 0,
  });

  // Mock leaderboard
  const leaderboard = [
    { rank: 1, name: "BL0XX_K1NG", score: 28400, height: 184.5 },
    { rank: 2, name: "N0K1A_8810", score: 19550, height: 132.8 },
    { rank: 3, name: "BRIGHT_ICT", score: 14200, height: 96.6 },
    { rank: 4, name: "CANVAS_DEV", score: 9800, height: 64.2 },
  ];

  const handleStartGame = () => {
    setGameState("PLAYING");
    setIsPaused(false);
  };

  const handleGameOver = (finalScore: number, finalHeight: number, finalBlocks: number) => {
    setStats({
      score: finalScore,
      height: finalHeight,
      blocks: finalBlocks,
    });
    setGameState("GAMEOVER");
  };

  const handleRestart = () => {
    setGameState("PLAYING");
    setIsPaused(false);
  };

  const handleBackToTitle = () => {
    setGameState("START");
  };

  const togglePause = () => {
    setIsPaused((prev) => !prev);
  };

  return (
    <main className="w-full h-full flex flex-col items-center justify-center bg-[#080b09] relative select-none">
      
      {/* 1. START / TITLE SCREEN */}
      {gameState === "START" && (
        <div className="flex flex-col items-center justify-center gap-8 w-full max-w-lg px-6 text-center animate-fade-in font-mono z-10">
          {/* Neon Header Container */}
          <div className="retro-border bg-[#080b09] p-8 w-full flex flex-col items-center gap-4 rounded-3xl glow-box-green relative overflow-hidden">
            
            {/* Retro pulsing grid highlights */}
            <div className="absolute top-0 left-0 w-full h-1 bg-retro-green animate-pulse" />

            <div className="flex items-center justify-center gap-2 mb-2">
              <Building2 className="w-8 h-8 text-retro-green animate-bounce" />
              <div className="text-[10px] text-retro-green bg-retro-dark border border-retro-green px-2 py-0.5 rounded uppercase tracking-wider font-bold">
                System Active
              </div>
            </div>

            {/* Giant Title */}
            <h1 className="text-4xl md:text-5xl font-black text-retro-green tracking-tighter leading-none glow-green uppercase">
              CITY BLOX
              <span className="block text-2xl tracking-widest mt-1 text-[#f8f9fa] opacity-90">
                RETRO
              </span>
            </h1>

            <p className="text-xs uppercase text-retro-green/75 tracking-wider mt-2 font-bold">
              THE NOSTALGIC TOWER BUILDER
            </p>

            {/* Sound Toggle HUD */}
            <div className="flex gap-4 mt-2">
              <button 
                onClick={() => setIsMuted(!isMuted)} 
                className="flex items-center gap-1.5 text-[10px] border border-retro-green/30 hover:border-retro-green/80 text-retro-green px-3 py-1.5 rounded-lg transition-all"
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span>SOUND: {isMuted ? "MUTED" : "ON"}</span>
              </button>
            </div>
          </div>

          {/* Action Panel */}
          <div className="w-full flex flex-col gap-3">
            <button
              onClick={handleStartGame}
              className="retro-btn text-lg py-4 w-full flex items-center justify-center gap-2 tracking-widest uppercase font-black"
            >
              <Play className="w-5 h-5 fill-current" />
              INSERT COIN & START
            </button>
          </div>

          {/* Retro Leaderboard High Scores */}
          <div className="w-full bg-[#080b09]/80 border-2 border-retro-green/40 p-5 rounded-2xl glow-box-green flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-retro-green/20 pb-2">
              <span className="text-xs text-retro-green font-bold flex items-center gap-1">
                <Award className="w-4 h-4" /> LEADERBOARD (ALL-TIME)
              </span>
              <span className="text-[9px] text-retro-green/50">V1.0</span>
            </div>
            
            <div className="flex flex-col gap-2 text-xs text-left">
              {leaderboard.map((item) => (
                <div key={item.rank} className="flex justify-between items-center text-retro-green/80 font-bold uppercase">
                  <span>
                    {item.rank}. {item.name}
                  </span>
                  <div className="flex gap-4">
                    <span>{item.height}m</span>
                    <span className="text-retro-green glow-green font-mono">{item.score.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Controls Instruction */}
          <div className="text-[10px] text-retro-green/50 uppercase tracking-widest leading-relaxed">
            CRANE SWINGS AUTOMATICALLY.<br />
            PRESS SPACE OR TAP SCREEN TO RELEASE AND STACK BLOCKS.
          </div>
        </div>
      )}

      {/* 2. ACTIVE GAMEPLAY SCREEN */}
      {gameState === "PLAYING" && (
        <div className="w-full h-full relative">
          <GameScreen
            onGameOver={handleGameOver}
            isPaused={isPaused}
            onTogglePause={togglePause}
          />
        </div>
      )}

      {/* 3. GAME OVER MODAL SCREEN */}
      {gameState === "GAMEOVER" && (
        <div className="absolute inset-0 bg-[#080b09]/90 backdrop-blur-md z-50 flex items-center justify-center font-mono">
          <div className="retro-border bg-[#080b09] p-8 max-w-md w-[90%] flex flex-col gap-6 rounded-3xl glow-box-green text-center">
            
            <div className="flex flex-col items-center gap-2">
              <div className="bg-red-950 text-red-500 border border-red-500 px-3 py-1 rounded text-xs font-black uppercase tracking-widest animate-pulse">
                Game Over
              </div>
              <h2 className="text-4xl font-black text-retro-green tracking-tight leading-none glow-green mt-2">
                TOWER CRASHED
              </h2>
            </div>

            {/* Score Grid & Performance Stats */}
            <div className="border-2 border-retro-green/45 bg-retro-dark/30 rounded-2xl p-4 flex flex-col gap-3.5">
              <div className="flex justify-between items-center text-sm font-bold border-b border-retro-green/20 pb-2">
                <span className="text-retro-green/70 uppercase">FINAL SCORE</span>
                <span className="text-xl text-retro-green glow-green">{stats.score.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-retro-green/70 uppercase">PEAK HEIGHT</span>
                <span className="text-retro-green font-mono">{stats.height.toFixed(1)}m</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-retro-green/70 uppercase">BLOCKS PLACED</span>
                <span className="text-retro-green font-mono">{stats.blocks}</span>
              </div>
            </div>

            {/* Fun Retro Evaluation Comments */}
            <div className="text-xs uppercase text-retro-green/80 border border-retro-green/20 p-3 rounded-lg leading-relaxed bg-[#080b09]">
              {stats.height > 100 
                ? "🏆 INCREDIBLE ARCHITECTURE! A sky-scraping masterpiece!"
                : stats.height > 40
                ? "⭐ GREAT JOB! You built a respectable city apartment!"
                : "🧱 Gravity wins this round! Try aligning your drops more center!"}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <button
                onClick={handleRestart}
                className="retro-btn flex-1 flex items-center justify-center gap-2 text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                PLAY AGAIN
              </button>
              <button
                onClick={handleBackToTitle}
                className="border-2 border-retro-green/60 hover:bg-retro-green hover:text-[#080b09] text-retro-green py-3 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 font-bold"
              >
                <Home className="w-4 h-4" />
                MAIN TITLE
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
