"use client";

import React, { useRef, useEffect, useState } from "react";
import RetroHUD from "./RetroHUD";
import { synth } from "@/utils/audio";
import { Play, Pause, RotateCcw, Volume2, VolumeX, ShieldAlert } from "lucide-react";

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
    ropeLength: 90,
    blockX: 200,
    blockY: 150,
    blockW: 56,
    blockH: 34,
    isFalling: false,
    isTumbling: false,
    tumbleVx: 0,
    tumbleRotation: 0,
    vy: 0,
    gravity: 0.5,
    swingSpeed: 0.038,
    swingAmplitude: 115,
    canvasW: 400,
    canvasH: 600,
    
    // Stacking physics parameters
    blocks: [] as Array<{
      x: number; // Resting Center X (no sway component)
      y: number; // Resting Center Y (vertical height)
      w: number;
      h: number;
      color: string;
      label: string;
    }>,
    towerSwayAmplitude: 0, // Maximum swing width multiplier
    swaySpeed: 0.022,       // Speed of wave oscillation
    cameraY: 0,             // Current scroll position
    targetCameraY: 0,       // Destination scroll position for smooth lerp
    
    // Interactive feedback overlays
    particles: [] as Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      alpha: number;
      size: number;
      color: string;
    }>,
    floatingTexts: [] as Array<{
      x: number;
      y: number;
      text: string;
      alpha: number;
      color: string;
    }>,

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

  // Compute organic snake-like sway shift for any stack level
  const getBlockSway = (index: number, time: number) => {
    const p = physicsRef.current;
    if (p.blocks.length === 0) return 0;
    
    // Multiplier increases as we ascend the skyscraper (base remains rigid)
    const ratio = (index + 1) / (p.blocks.length + 1);
    const maxSway = p.towerSwayAmplitude * ratio;
    
    // Wave phase shift with index creates flexible fluid motion
    const wavePhase = time * p.swaySpeed - index * 0.22;
    return maxSway * Math.sin(wavePhase);
  };

  // Game Loop Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const p = physicsRef.current;

    const resizeVirtualScreen = () => {
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
      p.time += 1;
      const w = p.canvasW;
      const h = p.canvasH;
      const centerX = w / 2;
      const baseY = h - 80;

      // 1. Crane swing calculation
      p.hookX = centerX + p.swingAmplitude * Math.sin(p.time * p.swingSpeed);

      // Dampen sway over time (natural friction dampening)
      p.towerSwayAmplitude *= 0.996;

      // 2. Camera vertical scroll tracking (smooth camera interpolation)
      p.cameraY += (p.targetCameraY - p.cameraY) * 0.08;

      // 3. Update particle dynamics
      p.particles.forEach((part, idx) => {
        part.x += part.vx;
        part.y += part.vy;
        part.alpha -= 0.025;
      });
      p.particles = p.particles.filter(part => part.alpha > 0);

      // 4. Update floating texts
      p.floatingTexts.forEach(txt => {
        txt.y -= 1.0;
        txt.alpha -= 0.02;
      });
      p.floatingTexts = p.floatingTexts.filter(txt => txt.alpha > 0);

      // 5. Update drop physics
      if (p.isFalling) {
        p.vy += p.gravity;
        p.blockY += p.vy;

        // Collision check boundaries
        const targetY = p.blocks.length === 0 
          ? baseY 
          : p.blocks[p.blocks.length - 1].y - p.blockH / 2;

        const targetSway = p.blocks.length === 0 
          ? 0 
          : getBlockSway(p.blocks.length - 1, p.time);

        const targetX = p.blocks.length === 0 
          ? w / 2 
          : p.blocks[p.blocks.length - 1].x + targetSway;

        const targetW = p.blocks.length === 0 ? 100 : p.blockW;

        // Check if block has touched target plane
        if (p.blockY + p.blockH / 2 >= targetY) {
          const dx = p.blockX - targetX;
          const tolerance = targetW * 0.8; // Alignment target buffer

          if (Math.abs(dx) <= tolerance) {
            // SUCCESSFUL LANDING! Lock into rest grid
            p.isFalling = false;
            p.vy = 0;

            const targetRestX = p.blocks.length === 0 ? w / 2 : p.blocks[p.blocks.length - 1].x;
            const restX = targetRestX + dx;
            const restY = baseY - p.blocks.length * p.blockH - p.blockH / 2;

            // Generate block color variations (retro green scaling)
            const blockColors = ["#0e2b0e", "#133b13", "#1c4e1c", "#246424"];
            const color = blockColors[p.blocks.length % blockColors.length];

            p.blocks.push({
              x: restX,
              y: restY,
              w: p.blockW,
              h: p.blockH,
              color,
              label: `F${p.blocks.length + 1}`
            });

            // Alignment metrics feedback
            const offsetDist = Math.abs(dx);
            if (offsetDist <= 5) {
              // PERFECT DROP!
              synth.playPerfect(p.comboCount);
              const comboBonus = p.comboCount;
              setScore(prev => prev + 500 * comboBonus);
              setCombo(prev => {
                const next = prev + 1;
                if (next > p.maxComboCount) {
                  p.maxComboCount = next;
                  setMaxCombo(next);
                }
                return next;
              });

              // Calm the skyscraper wobbling as reward
              p.towerSwayAmplitude = Math.max(0, p.towerSwayAmplitude - 5);

              // Trigger Floating text banner
              p.floatingTexts.push({
                x: p.blockX,
                y: p.blockY - 20,
                text: "★ PERFECT ★",
                alpha: 1.0,
                color: "#33ff33",
              });

              // Explode green glow stars particles
              for (let i = 0; i < 18; i++) {
                p.particles.push({
                  x: p.blockX,
                  y: p.blockY + p.blockH / 2,
                  vx: (Math.random() - 0.5) * 5,
                  vy: -Math.random() * 3 - 1,
                  alpha: 1.0,
                  size: Math.random() * 3.5 + 1.5,
                  color: "#33ff33",
                });
              }
            } else if (offsetDist <= 13) {
              // GREAT DROP!
              synth.playLand();
              setScore(prev => prev + 250);
              setCombo(1);

              p.floatingTexts.push({
                x: p.blockX,
                y: p.blockY - 20,
                text: "GREAT!",
                alpha: 1.0,
                color: "#33ff33",
              });
            } else {
              // GOOD (Wobbly) Drop
              synth.playLand();
              setScore(prev => prev + 100);
              setCombo(1);

              // Accumulate tower offset sway energy
              p.towerSwayAmplitude = Math.min(75, p.towerSwayAmplitude + offsetDist * 0.55);

              p.floatingTexts.push({
                x: p.blockX,
                y: p.blockY - 20,
                text: "WOBBLE!",
                alpha: 1.0,
                color: "#1e3a24",
              });
            }

            // Push camera target upwards once we stacked over 2 levels
            if (p.blocks.length >= 2) {
              p.targetCameraY = (p.blocks.length - 1.5) * p.blockH;
            }

            // Sync stats
            setBlocksCount(p.blocks.length);
            setHeight(p.blocks.length * 4.2);

          } else {
            // MISSED ENTIRELY! Trigger gravity tumble
            p.isFalling = false;
            p.isTumbling = true;
            p.tumbleVx = dx * 0.12; // drift away in direction of error
            p.vy = 2;              // initial fall speed
            p.tumbleRotation = 0;
            synth.playReset();

            p.floatingTexts.push({
              x: p.blockX,
              y: p.blockY - 20,
              text: "MISS!",
              alpha: 1.0,
              color: "#ff3333",
            });
          }
        }
      } else if (p.isTumbling) {
        // Tumble dynamics (sliding rotational falling)
        p.vy += p.gravity;
        p.blockY += p.vy;
        p.blockX += p.tumbleVx;
        p.tumbleRotation += 0.08;

        // Reset once offscreen bottom
        if (p.blockY > p.canvasH + 60) {
          p.isTumbling = false;
          p.vy = 0;

          const nextLives = p.livesCount - 1;
          setLives(nextLives);
          setCombo(1);

          if (nextLives <= 0) {
            synth.playGameOver();
            onGameOver(p.scoreCount, p.heightCount, p.blocksPlacedCount);
          }
        }
      } else {
        // Tied to hook
        p.blockX = p.hookX;
        p.blockY = p.hookY + p.ropeLength;
      }
    };

    const renderScene = (c: CanvasRenderingContext2D) => {
      const w = p.canvasW;
      const h = p.canvasH;
      const baseY = h - 80;

      c.fillStyle = "#080b09";
      c.fillRect(0, 0, w, h);

      // 1. Draw grid backdrop (shifting with camera view for vertical movement feel!)
      c.strokeStyle = "rgba(51, 255, 51, 0.06)";
      c.lineWidth = 1;
      const gridW = 32;
      
      // Calculate layout shift offset based on camera position
      const scrollShift = p.cameraY % gridW;
      for (let x = 0; x < w; x += gridW) {
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x, h);
        c.stroke();
      }
      for (let y = scrollShift; y < h; y += gridW) {
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(w, y);
        c.stroke();
      }

      // 2. Draw static ground base (scrolling downwards out of view)
      const baseDrawY = baseY - p.cameraY;
      c.fillStyle = "#041404";
      c.strokeStyle = "#33ff33";
      c.lineWidth = 4;
      c.beginPath();
      c.rect(w / 2 - 50, baseDrawY, 100, 40);
      c.fill();
      c.stroke();

      c.fillStyle = "#33ff33";
      c.font = 'bold 9px "Geist Mono", monospace';
      c.textAlign = "center";
      c.fillText("RETRO BASE", w / 2, baseDrawY + 24);

      // 3. Draw active stacked skyscraper blocks
      p.blocks.forEach((block, idx) => {
        const swayX = getBlockSway(idx, p.time);
        const drawX = block.x + swayX;
        const drawY = block.y - p.cameraY;

        // Skip drawing if completely off-screen bottom to save cycles
        if (drawY > h + p.blockH) return;

        c.save();
        c.translate(drawX, drawY);

        c.fillStyle = block.color;
        c.strokeStyle = "#33ff33";
        c.lineWidth = 3.5;
        c.beginPath();
        c.rect(-block.w / 2, -block.h / 2, block.w, block.h);
        c.fill();
        c.stroke();

        // Glowing Windows
        c.fillStyle = "#33ff33";
        c.fillRect(-16, -9, 8, 18);
        c.fillRect(8, -9, 8, 18);

        // Window frames
        c.fillStyle = block.color;
        c.fillRect(-13, -9, 2, 18);
        c.fillRect(11, -9, 2, 18);

        // Block digital details
        c.fillStyle = "#33ff33";
        c.font = 'bold 7px "Geist Mono", monospace';
        c.textAlign = "center";
        c.fillText(block.label, 0, 3);

        c.restore();
      });

      // 4. Draw confetti glowing star particles
      p.particles.forEach(part => {
        c.save();
        c.globalAlpha = part.alpha;
        c.fillStyle = part.color;
        c.fillRect(part.x - part.size / 2, part.y - p.cameraY - part.size / 2, part.size, part.size);
        c.restore();
      });

      // 5. Draw active falling/tumbling/carrying block
      if (p.isFalling || (!p.isFalling && !p.isTumbling)) {
        c.save();
        // Dynamic camera adjustment does NOT apply to crane elements!
        c.translate(p.blockX, p.blockY);

        c.fillStyle = "#0e2b0e";
        c.strokeStyle = "#33ff33";
        c.lineWidth = 3.5;
        c.beginPath();
        c.rect(-p.blockW / 2, -p.blockH / 2, p.blockW, p.blockH);
        c.fill();
        c.stroke();

        c.fillStyle = "#33ff33";
        c.fillRect(-16, -9, 8, 18);
        c.fillRect(8, -9, 8, 18);
        c.fillStyle = "#0e2b0e";
        c.fillRect(-13, -9, 2, 18);
        c.fillRect(11, -9, 2, 18);

        if (!p.isFalling) {
          c.fillStyle = "rgba(51, 255, 51, 0.4)";
          c.font = '8px "Geist Mono", monospace';
          c.textAlign = "center";
          c.fillText("▼ DROP ▼", 0, 24);
        }

        c.restore();
      } else if (p.isTumbling) {
        c.save();
        c.translate(p.blockX, p.blockY - p.cameraY);
        c.rotate(p.tumbleRotation);

        c.fillStyle = "#220000";
        c.strokeStyle = "#ff3333";
        c.lineWidth = 3.5;
        c.beginPath();
        c.rect(-p.blockW / 2, -p.blockH / 2, p.blockW, p.blockH);
        c.fill();
        c.stroke();

        c.fillStyle = "#ff3333";
        c.fillRect(-16, -9, 8, 18);
        c.fillRect(8, -9, 8, 18);

        c.restore();
      }

      // 6. Draw floating score metrics
      p.floatingTexts.forEach(txt => {
        c.save();
        c.fillStyle = txt.color;
        c.globalAlpha = txt.alpha;
        c.font = 'bold 12px "Geist Mono", monospace';
        c.textAlign = "center";
        c.fillText(txt.text, txt.x, txt.y - p.cameraY);
        c.restore();
      });

      // 7. Draw Crane Anchor and cables (drawn at top static boundary)
      c.strokeStyle = "#1e3a24";
      c.lineWidth = 6;
      c.beginPath();
      c.moveTo(0, p.hookY - 30);
      c.lineTo(w, p.hookY - 30);
      c.stroke();

      c.fillStyle = "#33ff33";
      c.beginPath();
      c.arc(w / 2, p.hookY - 30, 8, 0, Math.PI * 2);
      c.fill();

      // Cable to hook
      c.strokeStyle = "#33ff33";
      c.lineWidth = 2.5;
      c.beginPath();
      c.moveTo(p.hookX, p.hookY - 30);
      c.lineTo(p.hookX, p.hookY);
      c.stroke();

      // Hook anchor
      c.strokeStyle = "#33ff33";
      c.lineWidth = 4;
      c.beginPath();
      c.arc(p.hookX, p.hookY + 5, 8, -Math.PI / 4, Math.PI * 1.25);
      c.stroke();

      if (!p.isFalling && !p.isTumbling) {
        c.strokeStyle = "#33ff33";
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(p.hookX, p.hookY + 12);
        c.lineTo(p.blockX, p.blockY - p.blockH / 2);
        c.stroke();
      }

      // Render sway warning if sway amplitude is high
      if (p.towerSwayAmplitude > 25) {
        c.fillStyle = "rgba(255, 51, 51, 0.45)";
        c.font = 'bold 9px "Geist Mono", monospace';
        c.textAlign = "center";
        c.fillText("⚠️ DANGER: HIGH SWAY ⚠️", w / 2, 90);
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
    
    if (!p.isFalling && !p.isTumbling) {
      p.isFalling = true;
      p.vy = 2.5; // Initial impulse
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
    p.isTumbling = false;
    p.vy = 0;
    p.time = 0;
    p.scoreCount = 0;
    p.heightCount = 0;
    p.blocksPlacedCount = 0;
    p.comboCount = 1;
    p.maxComboCount = 1;
    p.livesCount = 3;
    p.blocks = [];
    p.towerSwayAmplitude = 0;
    p.cameraY = 0;
    p.targetCameraY = 0;
    p.particles = [];
    p.floatingTexts = [];
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
      <div className="w-full max-w-md h-[80vh] relative border-4 border-retro-green bg-[#080b09] rounded-3xl overflow-hidden glow-box-green flex items-center justify-center shadow-[0_0_25px_rgba(51,255,51,0.25)]">
        
        {/* Playable Canvas */}
        <canvas
          ref={canvasRef}
          onClick={triggerBlockRelease}
          className="w-full h-full block cursor-crosshair"
        />

        {/* Dynamic Watermark Grid Title */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 -z-10 text-[60px] font-black text-retro-green/[0.02] select-none tracking-widest text-center">
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
            className="flex items-center gap-1 bg-retro-dark border border-retro-green/40 hover:border-retro-green p-1.5 rounded-lg text-retro-green transition-all cursor-pointer font-bold"
            title="Mute [M]"
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span>{muted ? "MUTED" : "SOUNDS"}</span>
          </button>
          
          <button
            onClick={onTogglePause}
            className="bg-retro-dark border border-retro-green/40 hover:border-retro-green px-2 py-1.5 rounded-lg text-retro-green transition-all cursor-pointer font-bold"
          >
            {isPaused ? "RESUME" : "PAUSE"}
          </button>
          
          <button
            onClick={handleReset}
            className="bg-retro-dark border border-retro-green/40 hover:border-retro-green px-2 py-1.5 rounded-lg text-retro-green transition-all cursor-pointer font-bold"
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
