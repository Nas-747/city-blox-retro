"use client";

import React from "react";
import { Heart, Trophy, ArrowUp, Zap } from "lucide-react";

interface RetroHUDProps {
  score: number;
  combo: number;
  lives: number;
  height: number;
  blocksCount: number;
  maxCombo: number;
}

export default function RetroHUD({
  score = 0,
  combo = 0,
  lives = 3,
  height = 0,
  blocksCount = 0,
  maxCombo = 0,
}: RetroHUDProps) {
  // Pad score with zeros for retro look (e.g., 001,240)
  const formatScore = (num: number) => {
    return num.toString().padStart(6, "0");
  };

  return (
    <div className="absolute top-0 left-0 w-full p-4 md:p-6 pointer-events-none z-10 flex flex-col gap-3 font-mono">
      {/* Top HUD Row */}
      <div className="flex justify-between items-start w-full">
        {/* Left Side: Score & High Combos */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          <div className="bg-[#080b09]/90 border-2 border-retro-green rounded-xl p-3 glow-box-green flex flex-col">
            <span className="text-[10px] uppercase text-retro-green/70 tracking-widest font-bold">Score</span>
            <span className="text-xl md:text-2xl font-black text-retro-green glow-green tracking-wider font-mono">
              {formatScore(score)}
            </span>
          </div>

          {combo > 1 && (
            <div className="bg-retro-green text-[#080b09] px-3 py-1.5 rounded-lg border-2 border-[#080b09] font-black text-xs flex items-center gap-1 animate-bounce self-start">
              <Zap className="w-3.5 h-3.5 fill-[#080b09]" />
              <span>COMBO X{combo}</span>
            </div>
          )}
        </div>

        {/* Center: Height / Block Count Info */}
        <div className="flex flex-col items-center bg-[#080b09]/90 border-2 border-retro-green rounded-xl p-3 glow-box-green pointer-events-auto">
          <div className="flex items-center gap-1.5 text-retro-green">
            <ArrowUp className="w-4 h-4 animate-pulse" />
            <span className="text-base md:text-lg font-black tracking-wider">
              {height.toFixed(1)}m
            </span>
          </div>
          <div className="text-[9px] uppercase text-retro-green/60 font-bold tracking-widest mt-1">
            Blocks: {blocksCount}
          </div>
        </div>

        {/* Right Side: Lives and Vital Stats */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          <div className="bg-[#080b09]/90 border-2 border-retro-green rounded-xl p-3 glow-box-green flex flex-col items-end">
            <span className="text-[10px] uppercase text-retro-green/70 tracking-widest font-bold mb-1">
              CHANCES
            </span>
            <div className="flex gap-1.5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="transition-all duration-300">
                  <Heart
                    className={`w-5 h-5 ${
                      i < lives
                        ? "text-retro-green fill-retro-green filter drop-shadow-[0_0_2px_rgba(51,255,51,0.8)]"
                        : "text-retro-green/20 fill-transparent"
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
          
          {maxCombo > 1 && (
            <div className="text-[9px] text-retro-green/60 font-bold bg-[#080b09]/75 border border-retro-green/30 px-2 py-0.5 rounded-md">
              BEST COMBO: x{maxCombo}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
