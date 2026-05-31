"use client";

import React, { useRef, useEffect, useState } from "react";
import RetroHUD from "./RetroHUD";
import { Play, Pause, RotateCcw, AlertTriangle } from "lucide-react";

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
  
  // Game states we will pass to HUD
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [lives, setLives] = useState(3);
  const [height, setHeight] = useState(0);
  const [blocksCount, setBlocksCount] = useState(0);
  const [maxCombo, setMaxCombo] = useState(1);

  // Keyboard and click listener placeholders
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        triggerMockAction("drop");
      }
      if (e.code === "KeyP" || e.code === "Escape") {
        e.preventDefault();
        onTogglePause();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onTogglePause]);

  // Handle canvas sizing and background grid render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        renderMockScene(ctx, canvas.width, canvas.height);
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Initial render interval for standard animation loop skeleton
    let animationFrameId: number;
    let angle = 0;

    const tick = () => {
      angle += 0.05;
      
      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Render Grid background
      renderMockScene(ctx, canvas.width, canvas.height, angle);

      animationFrameId = requestAnimationFrame(tick);
    };

    if (!isPaused) {
      animationFrameId = requestAnimationFrame(tick);
    } else {
      renderMockScene(ctx, canvas.width, canvas.height, 0);
    }

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPaused]);

  // Procedural retro grid scene render
  const renderMockScene = (
    ctx: CanvasRenderingContext2D,
    width: number,
    heightCanvas: number,
    angleOffset: number = 0
  ) => {
    // Background clear
    ctx.fillStyle = "#080b09";
    ctx.fillRect(0, 0, width, heightCanvas);

    // Vertical line grid for perspective
    ctx.strokeStyle = "rgba(51, 255, 51, 0.15)";
    ctx.lineWidth = 2;
    const gridSpacing = 40;
    
    // Draw matrix code rain/grid pattern
    for (let x = 0; x < width; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, heightCanvas);
      ctx.stroke();
    }

    for (let y = 0; y < heightCanvas; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Pendulum Crane line
    const craneAnchorX = width / 2;
    const craneAnchorY = 60;
    const ropeLength = 140;
    const currentAngle = Math.sin(angleOffset) * 0.6; // Oscillating swing
    const blockX = craneAnchorX + Math.sin(currentAngle) * ropeLength;
    const blockY = craneAnchorY + Math.cos(currentAngle) * ropeLength;

    // Draw Anchor point
    ctx.fillStyle = "#33ff33";
    ctx.beginPath();
    ctx.arc(craneAnchorX, craneAnchorY, 8, 0, Math.PI * 2);
    ctx.fill();

    // Draw Rope
    ctx.strokeStyle = "#33ff33";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(craneAnchorX, craneAnchorY);
    ctx.lineTo(blockX, blockY);
    ctx.stroke();

    // Draw Swinging Block
    ctx.fillStyle = "#0e2b0e";
    ctx.strokeStyle = "#33ff33";
    ctx.lineWidth = 4;
    
    ctx.save();
    ctx.translate(blockX, blockY);
    // Draw rectangular outline box
    ctx.beginPath();
    ctx.rect(-30, -20, 60, 40);
    ctx.fill();
    ctx.stroke();
    
    // Glowing windows on the swinging block
    ctx.fillStyle = "#33ff33";
    ctx.fillRect(-20, -10, 12, 20);
    ctx.fillRect(8, -10, 12, 20);
    ctx.restore();

    // Base Block at center bottom
    const baseX = width / 2;
    const baseY = heightCanvas - 80;
    ctx.fillStyle = "#0e2b0e";
    ctx.strokeStyle = "#33ff33";
    ctx.lineWidth = 4;
    
    ctx.beginPath();
    ctx.rect(baseX - 40, baseY, 80, 50);
    ctx.fill();
    ctx.stroke();

    // Draw tower stack base connection
    ctx.fillStyle = "#33ff33";
    ctx.font = 'bold 12px "Geist Mono", monospace';
    ctx.textAlign = "center";
    ctx.fillText("CITY FOUNDATION", baseX, baseY + 30);
  };

  // Mock Game Actions
  const triggerMockAction = (type: "drop" | "miss" | "hit" | "gameover") => {
    if (isPaused) return;

    if (type === "drop") {
      // Simulate drop success or fail randomly for test
      const isSuccess = Math.random() > 0.3;
      if (isSuccess) {
        setScore((prev) => prev + 150 * combo);
        setHeight((prev) => prev + 4.2);
        setBlocksCount((prev) => prev + 1);
        setCombo((prev) => {
          const next = prev + 1;
          if (next > maxCombo) setMaxCombo(next);
          return next;
        });
      } else {
        setCombo(1);
        setLives((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            onGameOver(score, height, blocksCount);
          }
          return next;
        });
      }
    }
  };

  const handleReset = () => {
    setScore(0);
    setCombo(1);
    setLives(3);
    setHeight(0);
    setBlocksCount(0);
    setMaxCombo(1);
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

      {/* Primary HTML5 Game Canvas */}
      <canvas
        ref={canvasRef}
        onClick={() => triggerMockAction("drop")}
        className="w-full h-full block cursor-pointer glow-box-green"
      />

      {/* Screen Instructions / Bottom Control Console */}
      <div className="absolute bottom-4 left-0 w-full flex flex-col md:flex-row justify-between items-center px-6 py-2 gap-4 pointer-events-none z-10 font-mono text-[10px] uppercase text-retro-green/70">
        <div>
          [CLICK CANVAS] OR [SPACE] TO DROP BLOCK
        </div>

        {/* Console Action Panel (Clickable elements) */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={onTogglePause}
            className="flex items-center gap-1 bg-retro-dark border border-retro-green/40 hover:border-retro-green px-2.5 py-1.5 rounded-lg text-retro-green transition-all"
            title="Pause [P]"
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? "RESUME" : "PAUSE"}</span>
          </button>
          
          <button
            onClick={handleReset}
            className="flex items-center gap-1 bg-retro-dark border border-retro-green/40 hover:border-retro-green px-2.5 py-1.5 rounded-lg text-retro-green transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET</span>
          </button>

          <button
            onClick={() => onGameOver(score, height, blocksCount)}
            className="flex items-center gap-1 bg-red-950/60 border border-red-500/40 hover:border-red-500 px-2.5 py-1.5 rounded-lg text-red-400 transition-all font-bold"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>DIE (TEST GO)</span>
          </button>
        </div>
      </div>

      {/* Pause Overlay Screen */}
      {isPaused && (
        <div className="absolute inset-0 bg-[#080b09]/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center font-mono">
          <div className="retro-border bg-[#080b09] p-8 max-w-sm w-[90%] text-center flex flex-col gap-6 rounded-2xl glow-box-green">
            <h2 className="text-3xl font-black text-retro-green tracking-widest glow-green animate-pulse">
              GAME PAUSED
            </h2>
            <p className="text-xs text-retro-green/80 leading-relaxed uppercase">
              The skyscraper is on hold. Press Resume below or hit P / Escape to get back to the action!
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={onTogglePause}
                className="retro-btn text-sm w-full py-3"
              >
                RESUME PLAY
              </button>
              <button
                onClick={handleReset}
                className="text-xs border border-retro-green/40 hover:border-retro-green text-retro-green bg-transparent hover:bg-retro-green/10 py-2 rounded-xl transition-all font-bold"
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
