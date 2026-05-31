"use client";

import React from "react";
import { Heart, Trophy, ArrowUp, Zap, Wind, ShieldAlert, Sparkles } from "lucide-react";

interface RetroHUDProps {
  score: number;
  combo: number;
  lives: number;
  height: number;
  blocksCount: number;
  maxCombo: number;
  wind: number;
  laserCharges: number;
  swayLockCharges: number;
  isPanic: boolean;
  showWind: boolean; // Flag to hide wind indicator on EASY mode
  difficultyName: string; // The active difficulty tier name
}

export default function RetroHUD({
  score = 0,
  combo = 0,
  lives = 3,
  height = 0,
  blocksCount = 0,
  maxCombo = 0,
  wind = 0,
  laserCharges = 0,
  swayLockCharges = 0,
  isPanic = false,
  showWind = true,
  difficultyName = "MID",
}: RetroHUDProps) {
  // Pad score with zeros for retro look (e.g., 001,240)
  const formatScore = (num: number) => {
    return num.toString().padStart(6, "0");
  };

  // Determine wind severity color styles
  const getWindColor = (val: number) => {
    const abs = Math.abs(val);
    if (abs >= 1.0) return "text-red-500 border-red-500 bg-red-950/40 animate-pulse"; // Severe
    if (abs >= 0.5) return "text-yellow-400 border-yellow-500/60 bg-yellow-950/20"; // Moderate
    return "text-retro-green border-retro-green/40 bg-retro-dark/40"; // Calm
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full p-3 md:p-5 pointer-events-none z-10 flex flex-col gap-3 font-mono">
      {/* Top HUD Row */}
      <div className="flex justify-between items-start w-full">
        {/* Left Side: Score & Streak Combo Alerts */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          <div className="bg-[#080b09]/95 border-2 border-retro-green rounded-xl p-2.5 glow-box-green flex flex-col">
            <div className="flex justify-between items-center gap-4 mb-0.5">
              <span className="text-[9px] uppercase text-retro-green/70 tracking-widest font-black">Score</span>
              <span className={`text-[7px] border px-1 rounded font-black tracking-widest leading-none py-0.5 ${
                difficultyName === "EASY" 
                  ? "border-green-500 text-green-400 bg-green-950/20" 
                  : difficultyName === "CHALLENGING"
                  ? "border-red-500 text-red-400 bg-red-950/20 animate-pulse"
                  : "border-yellow-500 text-yellow-400 bg-yellow-950/20"
              }`}>
                {difficultyName}
              </span>
            </div>
            <span className="text-lg md:text-xl font-black text-retro-green glow-green tracking-wider font-mono">
              {formatScore(score)}
            </span>
          </div>

          {combo > 1 && (
            <div className="bg-retro-green text-[#080b09] px-2.5 py-1 rounded-lg border-2 border-[#080b09] font-black text-[10px] flex items-center gap-1 animate-bounce self-start">
              <Zap className="w-3 h-3 fill-[#080b09]" />
              <span>STREAK X{combo}</span>
            </div>
          )}
        </div>

        {/* Center: Height & Flashing PANIC! Banner */}
        <div className="flex flex-col items-center gap-1.5 pointer-events-auto">
          <div className="flex flex-col items-center bg-[#080b09]/95 border-2 border-retro-green rounded-xl p-2.5 glow-box-green">
            <div className="flex items-center gap-1 text-retro-green">
              <ArrowUp className="w-3.5 h-3.5 animate-pulse" />
              <span className="text-sm md:text-base font-black tracking-wider">
                {height.toFixed(1)}m
              </span>
            </div>
            <div className="text-[8px] uppercase text-retro-green/60 font-bold tracking-widest mt-0.5">
              FLOORS: {blocksCount}
            </div>
          </div>
        </div>

        {/* Right Side: Hearts Remaining Chances */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          <div className="bg-[#080b09]/95 border-2 border-retro-green rounded-xl p-2.5 glow-box-green flex flex-col items-end">
            <span className="text-[8px] uppercase text-retro-green/70 tracking-widest font-black mb-1">
              CHANCES
            </span>
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="transition-all duration-300">
                  <Heart
                    className={`w-4 h-4 ${
                      i < lives
                        ? "text-retro-green fill-retro-green filter drop-shadow-[0_0_2px_rgba(51,255,51,0.8)]"
                        : "text-retro-green/15 fill-transparent"
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Middle HUD Row: Wind Indicator and Power-up Buff Monitors */}
      <div className="flex justify-between items-center w-full px-1">
        {/* Left Indicator: Real-time Color-Coded Crosswind (hidden on EASY mode) */}
        {showWind ? (
          <div className={`flex items-center gap-1.5 border px-2.5 py-1 rounded-lg font-bold text-[9px] uppercase pointer-events-auto ${getWindColor(wind)}`}>
            <Wind className="w-3 h-3 animate-pulse" />
            <span>
              {wind === 0 
                ? "WIND: CALM" 
                : `WIND: ${wind > 0 ? "RIGHT" : "LEFT"} ${(Math.abs(wind) * 10).toFixed(0)} KT`}
            </span>
          </div>
        ) : (
          <div /> // empty placeholder to keep alignments of powerup indicators
        )}

        {/* Right Indicators: Active Helper Power-ups Charge Buffs */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {laserCharges > 0 && (
            <div className="flex items-center gap-1 bg-[#041414] border border-cyan-400 text-cyan-400 px-2 py-0.5 rounded-md font-bold text-[8px] uppercase animate-pulse shadow-[0_0_5px_rgba(51,255,255,0.3)]">
              <span>⚡ LASER: x{laserCharges}</span>
            </div>
          )}

          {swayLockCharges > 0 && (
            <div className="flex items-center gap-1 bg-[#041404] border border-retro-green text-retro-green px-2 py-0.5 rounded-md font-bold text-[8px] uppercase animate-pulse shadow-[0_0_5px_rgba(51,255,51,0.3)]">
              <span>🔒 LOCK: x{swayLockCharges}</span>
            </div>
          )}
        </div>
      </div>

      {/* FLASHING "PANIC!" ALERT CARD WARNING */}
      {isPanic && (
        <div className="w-full flex justify-center mt-1 pointer-events-auto animate-pulse">
          <div className="bg-red-950/85 border-2 border-red-500 rounded-xl px-4 py-1.5 flex items-center gap-1.5 shadow-[0_0_10px_rgba(239,68,68,0.4)] animate-bounce">
            <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">
              ⚠️ TOUPLE PANIC! BUILDINGS INSTABILITY EXTREME ⚠️
            </span>
          </div>
        </div>
      )}

      {/* FULL SCREEN RED WARNING PANIC OVERLAY VIGNETTE */}
      {isPanic && (
        <div className="absolute inset-0 pointer-events-none border-6 border-red-600 animate-pulse shadow-[inset_0_0_80px_rgba(239,68,68,0.65)] z-0 rounded-3xl overflow-hidden">
          {/* Subtle warning diagonal stripes scrolling along the edges */}
          <div className="absolute inset-0 opacity-[0.07] bg-[repeating-linear-gradient(45deg,#ef4444,#ef4444_12px,#000_12px,#000_24px)] pointer-events-none" />
        </div>
      )}
    </div>
  );
}
