"use client";

import React, { useState, useEffect } from "react";
import GameScreen from "@/components/GameScreen";
import { Play, Volume2, VolumeX, Shield, Award, RotateCcw, Home, Building2, Flame, Activity } from "lucide-react";

export type GameState = "START" | "DIFFICULTY" | "PLAYING" | "GAMEOVER";

export interface DifficultyConfig {
  name: "EASY" | "MID" | "CHALLENGING";
  gravitySpeed: number;
  maxWind: number;
  panicThreshold: number;
  powerUpSpawnInterval: number;
}

export default function Page() {
  const [gameState, setGameState] = useState<GameState>("START");
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [personalBest, setPersonalBest] = useState(0);
  
  // Dynamic difficulty configuration state
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyConfig>({
    name: "MID",
    gravitySpeed: 6,
    maxWind: 0.5,
    panicThreshold: 20,
    powerUpSpawnInterval: 6,
  });

  // Game stats for Game Over modal
  const [stats, setStats] = useState({
    score: 0,
    height: 0,
    blocks: 0,
  });

  // Load high score on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("city_blox_highscore");
      if (saved) {
        setPersonalBest(parseInt(saved, 10));
      }
    }
  }, [gameState]);

  // Leaders list including active user score
  const getLeaderboard = () => {
    const list = [
      { rank: 1, name: "BL0XX_K1NG", score: 28400, height: 184.5 },
      { rank: 2, name: "N0K1A_8810", score: 19550, height: 132.8 },
      { rank: 3, name: "YOU (BEST)", score: personalBest, height: (personalBest / 100) * 1.5 },
      { rank: 4, name: "BRIGHT_ICT", score: 14200, height: 96.6 },
    ];
    return list.sort((a, b) => b.score - a.score).map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  };

  const handleInsertCoin = () => {
    setGameState("DIFFICULTY");
  };

  const handleSelectDifficulty = (diff: "EASY" | "MID" | "CHALLENGING") => {
    let config: DifficultyConfig;
    if (diff === "EASY") {
      config = {
        name: "EASY",
        gravitySpeed: 4,
        maxWind: 0,
        panicThreshold: 999,
        powerUpSpawnInterval: 4,
      };
    } else if (diff === "CHALLENGING") {
      config = {
        name: "CHALLENGING",
        gravitySpeed: 9,
        maxWind: 1.5,
        panicThreshold: 12,
        powerUpSpawnInterval: 10,
      };
    } else {
      config = {
        name: "MID",
        gravitySpeed: 6,
        maxWind: 0.5,
        panicThreshold: 20,
        powerUpSpawnInterval: 6,
      };
    }
    
    setSelectedDifficulty(config);
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
        <div className="flex flex-col items-center justify-center gap-6 w-full max-w-lg px-6 text-center animate-fade-in font-mono z-10">
          
          {/* Neon Header Box */}
          <div className="retro-border bg-[#080b09] p-6 w-full flex flex-col items-center gap-3 rounded-3xl glow-box-green relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-retro-green animate-pulse" />

            <div className="flex items-center justify-center gap-2">
              <Building2 className="w-8 h-8 text-retro-green animate-bounce" />
              <div className="text-[9px] text-retro-green bg-retro-dark border border-retro-green px-2 py-0.5 rounded uppercase tracking-wider font-bold">
                Cabinet Online
              </div>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-black text-retro-green tracking-tighter leading-none glow-green uppercase">
              CITY BLOX
              <span className="block text-2xl tracking-widest mt-1 text-[#f8f9fa] opacity-90">
                RETRO
              </span>
            </h1>

            <p className="text-[10px] uppercase text-retro-green/75 tracking-wider font-bold">
              THE NOSTALGIC TOWER BUILDER
            </p>

            {/* Audio Toggle button */}
            <div className="flex gap-4">
              <button 
                onClick={() => setIsMuted(!isMuted)} 
                className="flex items-center gap-1.5 text-[9px] border border-retro-green/30 hover:border-retro-green/80 text-retro-green px-3 py-1 rounded-lg transition-all cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                <span>SOUNDS: {isMuted ? "MUTED" : "ON"}</span>
              </button>
            </div>
          </div>

          {/* Start button */}
          <div className="w-full">
            <button
              onClick={handleInsertCoin}
              className="retro-btn text-base py-3 w-full flex items-center justify-center gap-2 tracking-widest uppercase font-black"
            >
              <Play className="w-4 h-4 fill-current" />
              INSERT COIN & START
            </button>
          </div>

          {/* High Score Leaderboard */}
          <div className="w-full bg-[#080b09]/80 border-2 border-retro-green/40 p-4 rounded-2xl glow-box-green flex flex-col gap-2.5">
            <div className="flex justify-between items-center border-b border-retro-green/20 pb-1.5">
              <span className="text-[10px] text-retro-green font-bold flex items-center gap-1">
                <Award className="w-3.5 h-3.5" /> LEADERBOARD (ARCADE HIGH)
              </span>
              {personalBest > 0 && (
                <span className="text-[8px] text-retro-green/60 uppercase">
                  PB: {personalBest.toLocaleString()}
                </span>
              )}
            </div>
            
            <div className="flex flex-col gap-1.5 text-xs text-left">
              {getLeaderboard().map((item) => (
                <div 
                  key={item.name} 
                  className={`flex justify-between items-center font-bold uppercase ${
                    item.name.includes("YOU") ? "text-retro-green glow-green" : "text-retro-green/60"
                  }`}
                >
                  <span>
                    {item.rank}. {item.name}
                  </span>
                  <div className="flex gap-4">
                    <span>{item.height > 0 ? `${item.height.toFixed(1)}m` : "---"}</span>
                    <span className="font-mono">{item.score.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Instruction Footnote */}
          <div className="text-[9px] text-retro-green/40 uppercase tracking-widest leading-relaxed">
            CRANE SWINGS AUTOMATICALLY.<br />
            PRESS SPACE OR CLICK CANVAS TO STACK ROOM BLOCKS.<br />
            PERFECT PLACEMENT LOCKS THE SWAY FOR EXTREME HEIGHT COMBOS!
          </div>
        </div>
      )}

      {/* 2. DIFFICULTY SELECTION SCREEN */}
      {gameState === "DIFFICULTY" && (
        <div className="flex flex-col items-center justify-center gap-5 w-full max-w-lg px-6 font-mono z-10 text-center animate-fade-in">
          
          <div className="retro-border bg-[#080b09] p-5 w-full flex flex-col items-center gap-3.5 rounded-3xl glow-box-green">
            <div className="flex items-center justify-center gap-1.5">
              <Activity className="w-5 h-5 text-retro-green animate-pulse" />
              <h2 className="text-xl font-black text-retro-green tracking-widest uppercase glow-green">
                SELECT DIFFICULTY
              </h2>
            </div>
            <p className="text-[9px] text-retro-green/75 uppercase tracking-wide leading-relaxed max-w-xs">
              Configure arcade hardware parameters. Choose your physics complexity before insertion.
            </p>
          </div>

          {/* Difficulty options */}
          <div className="w-full flex flex-col gap-3.5">
            {/* EASY */}
            <button
              onClick={() => handleSelectDifficulty("EASY")}
              className="retro-btn border-green-500 text-green-400 bg-green-950/20 hover:bg-green-500 hover:text-[#080b09] flex flex-col items-start gap-1 p-3.5 rounded-2xl w-full text-left"
            >
              <div className="flex justify-between items-center w-full">
                <span className="text-sm font-black tracking-widest">1. EASY MODE</span>
                <span className="text-[9px] border border-green-500 px-1.5 py-0.5 rounded font-bold">STABLE</span>
              </div>
              <p className="text-[9px] uppercase leading-relaxed text-green-400/80">
                Calm skies (0 KT winds), frequent power-ups (4 blocks), zero structure panics. Ideal for apprentice builders.
              </p>
            </button>

            {/* MID */}
            <button
              onClick={() => handleSelectDifficulty("MID")}
              className="retro-btn border-yellow-500 text-yellow-400 bg-yellow-950/20 hover:bg-yellow-500 hover:text-[#080b09] flex flex-col items-start gap-1 p-3.5 rounded-2xl w-full text-left"
            >
              <div className="flex justify-between items-center w-full">
                <span className="text-sm font-black tracking-widest">2. REGULAR ARCADE</span>
                <span className="text-[9px] border border-yellow-500 px-1.5 py-0.5 rounded font-bold">BALANCED</span>
              </div>
              <p className="text-[9px] uppercase leading-relaxed text-yellow-400/80">
                Light crosswinds (5 KT), normal helpers (6 blocks), moderate structure swaying. The classic Nokia feel.
              </p>
            </button>

            {/* CHALLENGING */}
            <button
              onClick={() => handleSelectDifficulty("CHALLENGING")}
              className="retro-btn border-red-500 text-red-400 bg-red-950/20 hover:bg-red-500 hover:text-[#080b09] flex flex-col items-start gap-1 p-3.5 rounded-2xl w-full text-left"
            >
              <div className="flex justify-between items-center w-full">
                <span className="text-sm font-black tracking-widest">3. CHAOS CRISIS</span>
                <span className="text-[9px] border border-red-500 px-1.5 py-0.5 rounded font-bold uppercase animate-pulse">Dangerous</span>
              </div>
              <p className="text-[9px] uppercase leading-relaxed text-red-400/80 font-bold">
                Severe crosswinds (15 KT), rare power-ups (10 blocks), hyper-sensitive structural sway panics.
              </p>
            </button>
          </div>

          <button
            onClick={handleBackToTitle}
            className="text-[10px] border border-retro-green/40 hover:border-retro-green text-retro-green bg-transparent hover:bg-retro-green/10 py-2 px-6 rounded-xl transition-all font-bold cursor-pointer uppercase"
          >
            ← BACK TO TITLE
          </button>
        </div>
      )}

      {/* 3. ACTIVE GAMEPLAY SCREEN */}
      {gameState === "PLAYING" && (
        <div className="w-full h-full relative">
          <GameScreen
            onGameOver={handleGameOver}
            isPaused={isPaused}
            onTogglePause={togglePause}
            difficulty={selectedDifficulty}
          />
        </div>
      )}

      {/* 4. GAME OVER MODAL SCREEN */}
      {gameState === "GAMEOVER" && (
        <div className="absolute inset-0 bg-[#080b09]/90 backdrop-blur-md z-50 flex items-center justify-center font-mono">
          <div className="retro-border bg-[#080b09] p-8 max-w-sm w-[90%] flex flex-col gap-5 rounded-3xl glow-box-green text-center">
            
            <div className="flex flex-col items-center gap-1.5">
              <div className="bg-red-950 text-red-500 border border-red-500 px-3 py-0.5 rounded text-[10px] font-black uppercase tracking-widest animate-pulse">
                Skyscraper Collapsed
              </div>
              <h2 className="text-3xl font-black text-retro-green tracking-tight leading-none glow-green mt-1">
                TOWER CRASH
              </h2>
            </div>

            {/* Score Grid & Performance Stats */}
            <div className="border-2 border-retro-green/45 bg-retro-dark/30 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs font-bold border-b border-retro-green/20 pb-2">
                <span className="text-retro-green/70 uppercase font-bold">MODE ({selectedDifficulty.name})</span>
                <span className="text-xs text-retro-green font-mono">{selectedDifficulty.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold border-b border-retro-green/20 pb-2">
                <span className="text-retro-green/70 uppercase">SCORE</span>
                <span className="text-lg text-retro-green glow-green">{stats.score.toLocaleString()}</span>
              </div>
              
              {stats.score >= personalBest && stats.score > 0 && (
                <div className="text-[9px] text-[#080b09] bg-retro-green px-2 py-0.5 rounded-md font-bold text-center uppercase tracking-widest">
                  ★ NEW PERSONAL RECORD ★
                </div>
              )}

              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-retro-green/70 uppercase">HEIGHT</span>
                <span className="text-retro-green font-mono">{stats.height.toFixed(1)}m</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-retro-green/70 uppercase">BLOCKS</span>
                <span className="text-retro-green font-mono">{stats.blocks}</span>
              </div>
            </div>

            {/* Comical Feedback Dialogue */}
            <div className="text-[10px] uppercase text-retro-green/80 border border-retro-green/20 p-2.5 rounded-lg leading-relaxed bg-[#080b09]">
              {stats.height > 120 
                ? "🏆 MASSIVE ARCHITECTURE! City planning officials are stunned!"
                : stats.height > 50
                ? "⭐ FINE WORK! You stacked up a cozy residential block!"
                : "🧱 Gravity claims the bricks. Align your timing to stabilize!"}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 mt-1">
              <button
                onClick={handleRestart}
                className="retro-btn text-xs w-full py-2.5 flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                PLAY AGAIN
              </button>
              
              <button
                onClick={handleBackToTitle}
                className="border-2 border-retro-green/50 hover:bg-retro-green hover:text-[#080b09] text-retro-green py-2 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 font-bold cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                MAIN TITLE
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
