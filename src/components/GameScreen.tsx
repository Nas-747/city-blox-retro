"use client";

import React, { useRef, useEffect, useState } from "react";
import RetroHUD from "./RetroHUD";
import { synth } from "@/utils/audio";
import { Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react";

interface GameScreenProps {
  onGameOver: (finalScore: number, finalHeight: number, finalBlocks: number) => void;
  isPaused: boolean;
  onTogglePause: () => void;
}

export default function GameScreen({
  onGameOver,
  isPaused,
  onTogglePause,
}: GameScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game states managed in React for the HUD overlay
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [lives, setLives] = useState(3);
  const [height, setHeight] = useState(0);
  const [blocksCount, setBlocksCount] = useState(0);
  const [maxCombo, setMaxCombo] = useState(1);
  const [muted, setMuted] = useState(false);

  // High performance game variables kept in refs to bypass React state latency in physics loops
  const physicsRef = useRef({
    time: 0,
    hookX: 200,
    hookY: 60,
    ropeLength: 100,
    blockX: 200,
    blockY: 160,
    blockW: 60,
    blockH: 40,
    isFalling: false,
    vy: 0,
    gravity: 0.5,
    swingSpeed: 0.04,
    swingAmplitude: 120,
    canvasW: 400,
    canvasH: 600,
    livesCount: 3,
    scoreCount: 0,
    heightCount: 0,
    blocksPlacedCount: 0,
    comboCount: 1,
    maxComboCount: 1,
  });

  // Track state changes in ref so loops always read fresh state values
  useEffect(() => {
    physicsRef.current.livesCount = lives;
    physicsRef.current.scoreCount = score;
    physicsRef.current.heightCount = height;
    physicsRef.current.blocksPlacedCount = blocksCount;
    physicsRef.current.comboCount = combo;
  }, [lives, score, height, blocksCount, combo]);

  // Synchronize mute setting with sound synthesizer instance
  const handleToggleMute = () => {
    const nextMute = !muted;
    setMuted(nextMute);
    synth.setMute(nextMute);
  };

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        triggerBlockRelease();
      }
      if (e.code === "KeyP" || e.code === "Escape") {
        e.preventDefault();
        onTogglePause();
      }
      if (e.code === "KeyM") {
        e.preventDefault();
        handleToggleMute();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPaused, onTogglePause, muted]);

  // Game Loop Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const p = physicsRef.current;

    // Rigid dimensions for retro virtual viewport (400 width x 600 height)
    const resizeVirtualScreen = () => {
      // Let's draw sharp pixel double buffers by sizing canvas to physical size
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      
      p.canvasW = rect.width;
      p.canvasH = rect.height;
    };

    resizeVirtualScreen();
    window.addEventListener("resize", resizeVirtualScreen);

    // Primary Game Loop Tick (60 FPS)
    const tick = () => {
      if (!isPaused) {
        updatePhysics();
      }
      renderScene(ctx);
      animId = requestAnimationFrame(tick);
    };

    const updatePhysics = () => {
      // 1. Swing calculation
      p.time += 1;
      const centerX = p.canvasW / 2;
      
      // Swing center position using sin wave
      p.hookX = centerX + p.swingAmplitude * Math.sin(p.time * p.swingSpeed);

      // 2. Drop physics
      if (p.isFalling) {
        p.vy += p.gravity;
        p.blockY += p.vy;

        // Reset if it drops below canvas viewport bottom boundary
        if (p.blockY > p.canvasH + 50) {
          p.isFalling = false;
          p.vy = 0;
          
          // Sound trigger
          synth.playReset();

          // Deduct life
          const nextLives = p.livesCount - 1;
          setLives(nextLives);
          setCombo(1);

          if (nextLives <= 0) {
            synth.playGameOver();
            onGameOver(p.scoreCount, p.heightCount, p.blocksPlacedCount);
          }
        }
      } else {
        // Carry block under crane hook if not detached yet
        p.blockX = p.hookX;
        p.blockY = p.hookY + p.ropeLength;
      }
    };

    const renderScene = (c: CanvasRenderingContext2D) => {
      const w = p.canvasW;
      const h = p.canvasH;

      // Clear viewport
      c.fillStyle = "#080b09";
      c.fillRect(0, 0, w, h);

      // Draw Retro Grid Layout
      c.strokeStyle = "rgba(51, 255, 51, 0.08)";
      c.lineWidth = 1;
      const gridW = 32;
      for (let x = 0; x < w; x += gridW) {
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x, h);
        c.stroke();
      }
      for (let y = 0; y < h; y += gridW) {
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(w, y);
        c.stroke();
      }

      // Draw Top Anchor Rod
      c.strokeStyle = "#1e3a24";
      c.lineWidth = 6;
      c.beginPath();
      c.moveTo(0, p.hookY - 30);
      c.lineTo(w, p.hookY - 30);
      c.stroke();

      // Top center anchor node
      c.fillStyle = "#33ff33";
      c.beginPath();
      c.arc(w / 2, p.hookY - 30, 8, 0, Math.PI * 2);
      c.fill();

      // Draw Rope to hook
      c.strokeStyle = "#33ff33";
      c.lineWidth = 2.5;
      c.beginPath();
      c.moveTo(p.hookX, p.hookY - 30);
      c.lineTo(p.hookX, p.hookY);
      c.stroke();

      // Draw Metal Hook
      c.strokeStyle = "#33ff33";
      c.lineWidth = 4;
      c.beginPath();
      c.arc(p.hookX, p.hookY + 5, 8, -Math.PI / 4, Math.PI * 1.25);
      c.stroke();

      // Draw Suspended Rope while block is attached
      if (!p.isFalling) {
        c.strokeStyle = "#33ff33";
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(p.hookX, p.hookY + 12);
        c.lineTo(p.blockX, p.blockY - p.blockH / 2);
        c.stroke();
      }

      // Draw falling or swinging block
      c.fillStyle = "#0e2b0e";
      c.strokeStyle = "#33ff33";
      c.lineWidth = 4;
      
      c.save();
      c.translate(p.blockX, p.blockY);
      
      // Outer border box
      c.beginPath();
      c.rect(-p.blockW / 2, -p.blockH / 2, p.blockW, p.blockH);
      c.fill();
      c.stroke();

      // Draw block retro pattern / grid window
      c.fillStyle = "#33ff33";
      c.fillRect(-18, -10, 10, 20);
      c.fillRect(8, -10, 10, 20);

      // Smiley digital windows
      c.fillStyle = "#080b09";
      c.fillRect(-14, -4, 2, 2);
      c.fillRect(-8, -4, 2, 2);
      c.fillRect(12, -4, 2, 2);
      c.fillRect(18, -4, 2, 2);

      c.restore();

      // Draw static floor/mock block base
      const baseX = w / 2;
      const baseY = h - 60;

      c.fillStyle = "#0e2b0e";
      c.strokeStyle = "#33ff33";
      c.lineWidth = 4;
      c.beginPath();
      c.rect(baseX - 50, baseY, 100, 40);
      c.fill();
      c.stroke();

      c.fillStyle = "#33ff33";
      c.font = 'bold 11px "Geist Mono", monospace';
      c.textAlign = "center";
      c.fillText("RETRO BASE", baseX, baseY + 24);

      // Render overlay indicator if dropping is allowed
      if (!p.isFalling) {
        c.fillStyle = "rgba(51, 255, 51, 0.4)";
        c.font = '9px "Geist Mono", monospace';
        c.fillText("▼ READY ▼", p.blockX, p.blockY + 35);
      }
    };

    animId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resizeVirtualScreen);
      cancelAnimationFrame(animId);
    };
  }, [isPaused]);

  // Release the active block
  const triggerBlockRelease = () => {
    if (isPaused) return;
    const p = physicsRef.current;
    
    if (!p.isFalling) {
      p.isFalling = true;
      p.vy = 2; // Initial push downward speed
      synth.playDrop();
    }
  };

  const handleReset = () => {
    setScore(0);
    setCombo(1);
    setLives(3);
    setHeight(0);
    setBlocksCount(0);
    setMaxCombo(1);

    const p = physicsRef.current;
    p.isFalling = false;
    p.vy = 0;
    p.time = 0;
    p.scoreCount = 0;
    p.heightCount = 0;
    p.blocksPlacedCount = 0;
    p.comboCount = 1;
    p.maxComboCount = 1;
    p.livesCount = 3;
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#080b09]">
      
      {/* Retro HUD overlay */}
      <RetroHUD
        score={score}
        combo={combo}
        lives={lives}
        height={height}
        blocksCount={blocksCount}
        maxCombo={maxCombo}
      />

      {/* Main retro cabinet/screen body wrapper */}
      <div className="w-full max-w-md h-[85vh] relative border-4 border-retro-green bg-[#080b09] rounded-3xl overflow-hidden glow-box-green flex items-center justify-center shadow-[0_0_20px_rgba(51,255,51,0.2)]">
        
        {/* Playable Canvas */}
        <canvas
          ref={canvasRef}
          onClick={triggerBlockRelease}
          className="w-full h-full block cursor-crosshair"
        />

        {/* Dynamic Watermark Grid Title */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 -z-10 text-[60px] font-black text-retro-green/[0.03] select-none tracking-widest text-center">
          BL0XX
        </div>
      </div>

      {/* Bottom control panel */}
      <div className="w-full max-w-md mt-4 flex justify-between items-center px-4 font-mono text-[10px] uppercase text-retro-green/70">
        <div>
          [CLICK CANVAS] OR [SPACE] TO DROP
        </div>

        <div className="flex items-center gap-3">
          {/* Mute button */}
          <button
            onClick={handleToggleMute}
            className="flex items-center gap-1 bg-retro-dark border border-retro-green/40 hover:border-retro-green p-1.5 rounded-lg text-retro-green transition-all cursor-pointer"
            title="Mute [M]"
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span>{muted ? "MUTED" : "SOUNDS"}</span>
          </button>
          
          <button
            onClick={onTogglePause}
            className="bg-retro-dark border border-retro-green/40 hover:border-retro-green px-2 py-1.5 rounded-lg text-retro-green transition-all cursor-pointer"
          >
            {isPaused ? "RESUME" : "PAUSE"}
          </button>
          
          <button
            onClick={handleReset}
            className="bg-retro-dark border border-retro-green/40 hover:border-retro-green px-2 py-1.5 rounded-lg text-retro-green transition-all cursor-pointer"
          >
            RESET
          </button>
        </div>
      </div>

      {/* Pause Screen Overlay */}
      {isPaused && (
        <div className="absolute inset-0 bg-[#080b09]/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center font-mono">
          <div className="retro-border bg-[#080b09] p-8 max-w-xs w-[90%] text-center flex flex-col gap-6 rounded-2xl glow-box-green">
            <h2 className="text-2xl font-black text-retro-green tracking-widest glow-green animate-pulse">
              GAME PAUSED
            </h2>
            <p className="text-[10px] text-retro-green/80 leading-relaxed uppercase">
              The skyscraper is on hold. Press Resume below or hit P / Escape to get back to the action!
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={onTogglePause}
                className="retro-btn text-xs w-full py-2.5"
              >
                RESUME PLAY
              </button>
              <button
                onClick={handleReset}
                className="text-[10px] border border-retro-green/40 hover:border-retro-green text-retro-green bg-transparent hover:bg-retro-green/10 py-1.5 rounded-lg transition-all font-bold cursor-pointer"
              >
                RESTART FROM SCRATCH
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
