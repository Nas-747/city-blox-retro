"use client";

import React, { useRef, useEffect, useState } from "react";
import RetroHUD from "./RetroHUD";
import { synth } from "@/utils/audio";
import { Play, Pause, RotateCcw, Volume2, VolumeX, Shield, Lock, Wind } from "lucide-react";

interface GameScreenProps {
  onGameOver: (finalScore: number, finalHeight: number, finalBlocks: number) => void;
  isPaused: boolean;
  onTogglePause: () => void;
}

type BlockType = "NORMAL" | "GOLD" | "GLASS";

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
  const [activeWind, setActiveWind] = useState(0); // Wind state variable in React for general HUD awareness

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
    canvasW: 400, // Rigid Virtual Width
    canvasH: 600, // Rigid Virtual Height
    
    // Stacking physics parameters
    blocks: [] as Array<{
      x: number; // Resting Center X (no sway component)
      y: number; // Resting Center Y (vertical height)
      w: number;
      h: number;
      color: string;
      label: string;
      type: BlockType;
    }>,
    towerSwayAmplitude: 0, // Maximum swing width multiplier
    swaySpeed: 0.022,       // Speed of wave oscillation
    cameraY: 0,             // Current scroll position
    targetCameraY: 0,       // Destination scroll position for smooth lerp
    swayFreezeCount: 0,     // Sway Freeze combo block count

    // Crosswinds & Block Types parameters
    wind: 0,                // Floating number from -1.5 to 1.5
    currentBlockType: "NORMAL" as BlockType,

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

  // Keyboard controls listener with clean unmounting to prevent memory leaks
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
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPaused, onTogglePause, muted]);

  // Generate a random block variant and crosswind environment
  const spawnNewBlock = () => {
    const p = physicsRef.current;
    
    // 1. Spawning Types logic (80% Normal, 10% Gold, 10% Glass)
    const r = Math.random();
    if (r < 0.8) {
      p.currentBlockType = "NORMAL";
    } else if (r < 0.9) {
      p.currentBlockType = "GOLD";
    } else {
      p.currentBlockType = "GLASS";
    }

    // 2. Generate wind speed (-1.5 to 1.5)
    p.wind = (Math.random() * 3) - 1.5;
    setActiveWind(p.wind);
  };

  // Compute organic snake-like sway shift for any stack level
  const getBlockSway = (index: number, time: number) => {
    const p = physicsRef.current;
    if (p.blocks.length === 0) return 0;
    
    // IF SWAY IS FROZEN via combo, return 0 (sway is locked solid!)
    if (p.swayFreezeCount > 0) return 0;
    
    const ratio = (index + 1) / (p.blocks.length + 1);
    const maxSway = p.towerSwayAmplitude * ratio;
    
    const wavePhase = time * p.swaySpeed - index * 0.22;
    return maxSway * Math.sin(wavePhase);
  };

  // Check and save local high score
  const saveHighScoreIfNeeded = (finalScore: number) => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("city_blox_highscore");
      const currentHigh = saved ? parseInt(saved, 10) : 0;
      if (finalScore > currentHigh) {
        localStorage.setItem("city_blox_highscore", finalScore.toString());
      }
    }
  };

  // Initial block spawn on startup
  useEffect(() => {
    spawnNewBlock();
  }, []);

  // Game Loop Animation & Resizing Edge Case Management
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
      
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      
      const scaleX = (rect.width * dpr) / 400;
      const scaleY = (rect.height * dpr) / 600;
      ctx.scale(scaleX, scaleY);
      
      p.canvasW = 400;
      p.canvasH = 600;
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

      // Dampen sway over time
      p.towerSwayAmplitude *= 0.996;

      // 2. Camera vertical scroll tracking
      p.cameraY += (p.targetCameraY - p.cameraY) * 0.08;

      // 3. Update particle dynamics
      p.particles.forEach((part) => {
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

        // DRIFT PHYSICS: Apply uniform horizontal wind force every frame as it falls
        p.blockX += p.wind;

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
            
            // Reconstruct resting restX subtracting the horizontal wind displacement offset
            const restX = targetRestX + dx;
            const restY = baseY - p.blocks.length * p.blockH - p.blockH / 2;

            // Generate block color variations based on block type
            let color = "#0e2b0e";
            if (p.currentBlockType === "GOLD") {
              color = "#ffd700"; // Metallic golden yellow
            } else if (p.currentBlockType === "GLASS") {
              color = "rgba(51, 255, 255, 0.4)"; // Translucent cyan/green glass
            } else {
              const blockColors = ["#0e2b0e", "#133b13", "#1c4e1c", "#246424"];
              color = blockColors[p.blocks.length % blockColors.length];
            }

            p.blocks.push({
              x: restX,
              y: restY,
              w: p.blockW,
              h: p.blockH,
              color,
              label: p.currentBlockType === "GOLD" ? "GOLD" : p.currentBlockType === "GLASS" ? "GLAS" : `F${p.blocks.length + 1}`,
              type: p.currentBlockType,
            });

            // Alignment metrics perfect drop windows check
            // GLASS block has a significantly tighter "Perfect Drop" window (under 2px instead of 4px)
            const perfectThreshold = p.currentBlockType === "GLASS" ? 2.0 : 4.0;
            const offsetDist = Math.abs(dx);
            
            if (p.swayFreezeCount > 0) {
              p.swayFreezeCount -= 1;
            }

            // Score modifier based on Gold block multiplier (2x score landed cleanly)
            const goldMultiplier = p.currentBlockType === "GOLD" ? 2 : 1;

            if (offsetDist <= perfectThreshold) {
              // PERFECT DROP!
              p.swayFreezeCount = 2;
              
              const currentCombo = p.comboCount;
              setScore(prev => {
                const nextScore = prev + (500 * currentCombo) * goldMultiplier;
                p.scoreCount = nextScore;
                return nextScore;
              });

              setCombo(prev => {
                const next = prev + 1;
                p.comboCount = next;
                if (next > p.maxComboCount) {
                  p.maxComboCount = next;
                  setMaxCombo(next);
                }
                return next;
              });

              synth.playPerfect(p.comboCount);
              p.towerSwayAmplitude = 0;

              // Star explosion particle colors based on block type
              const particleColor = p.currentBlockType === "GOLD" ? "#ffd700" : p.currentBlockType === "GLASS" ? "#33ffff" : "#33ff33";

              p.floatingTexts.push({
                x: p.blockX,
                y: p.blockY - 20,
                text: `${p.currentBlockType === "GOLD" ? "★ GOLD PERFECT ★" : p.currentBlockType === "GLASS" ? "✧ GLASS PERFECT ✧" : `★ PERFECT x${currentCombo} ★`}`,
                alpha: 1.0,
                color: particleColor,
              });

              for (let i = 0; i < 18; i++) {
                p.particles.push({
                  x: p.blockX,
                  y: p.blockY + p.blockH / 2,
                  vx: (Math.random() - 0.5) * 5,
                  vy: -Math.random() * 3 - 1,
                  alpha: 1.0,
                  size: Math.random() * 3.5 + 1.5,
                  color: particleColor,
                });
              }
            } else if (offsetDist <= 13) {
              // GREAT DROP!
              synth.playLand();
              setScore(prev => {
                const nextScore = prev + 250 * goldMultiplier;
                p.scoreCount = nextScore;
                return nextScore;
              });
              setCombo(1);

              p.floatingTexts.push({
                x: p.blockX,
                y: p.blockY - 20,
                text: p.currentBlockType === "GOLD" ? "GOLD GREAT!" : "GREAT!",
                alpha: 1.0,
                color: p.currentBlockType === "GOLD" ? "#ffd700" : "#33ff33",
              });
            } else {
              // GOOD Drop
              synth.playLand();
              setScore(prev => {
                const nextScore = prev + 100 * goldMultiplier;
                p.scoreCount = nextScore;
                return nextScore;
              });
              setCombo(1);

              if (p.swayFreezeCount === 0) {
                p.towerSwayAmplitude = Math.min(75, p.towerSwayAmplitude + offsetDist * 0.55);
              }

              p.floatingTexts.push({
                x: p.blockX,
                y: p.blockY - 20,
                text: "WOBBLE!",
                alpha: 1.0,
                color: "#1e3a24",
              });
            }

            if (p.blocks.length >= 2) {
              p.targetCameraY = (p.blocks.length - 1.5) * p.blockH;
            }

            setBlocksCount(p.blocks.length);
            setHeight(p.blocks.length * 4.2);

            // Spawn next block & change crosswind
            spawnNewBlock();

          } else {
            // MISSED ENTIRELY! Trigger gravity tumble
            p.isFalling = false;
            p.isTumbling = true;
            p.tumbleVx = dx * 0.12; 
            p.vy = 2;              
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
        // Tumble dynamics
        p.vy += p.gravity;
        p.blockY += p.vy;
        p.blockX += p.tumbleVx;
        p.tumbleRotation += 0.08;

        if (p.blockY > p.canvasH + 60) {
          p.isTumbling = false;
          p.vy = 0;

          const nextLives = p.livesCount - 1;
          p.livesCount = nextLives;
          setLives(nextLives);
          setCombo(1);

          if (nextLives <= 0) {
            cancelAnimationFrame(animId);
            synth.playGameOver();
            saveHighScoreIfNeeded(p.scoreCount);
            onGameOver(p.scoreCount, p.heightCount, p.blocksPlacedCount);
            return;
          }

          // Spawn next block on life loss
          spawnNewBlock();
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

      // 1. Draw grid backdrop
      c.strokeStyle = "rgba(51, 255, 51, 0.06)";
      c.lineWidth = 1;
      const gridW = 32;
      
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

      // 2. Draw static ground base
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

        if (drawY > h + p.blockH) return;

        c.save();
        c.translate(drawX, drawY);

        c.fillStyle = block.color;
        
        // Custom retro border colors based on block type
        if (block.type === "GOLD") {
          c.strokeStyle = "#ffd700";
        } else if (block.type === "GLASS") {
          c.strokeStyle = "#33ffff";
        } else {
          c.strokeStyle = "#33ff33";
        }
        
        c.lineWidth = 3.5;
        c.beginPath();
        c.rect(-block.w / 2, -block.h / 2, block.w, block.h);
        c.fill();
        c.stroke();

        // Glowing Windows
        if (block.type === "GOLD") {
          // Flashing glowing golden windows
          c.fillStyle = p.time % 20 < 10 ? "#ffffff" : "#ffd700";
        } else if (block.type === "GLASS") {
          c.fillStyle = "rgba(51, 255, 255, 0.7)";
        } else {
          c.fillStyle = "#33ff33";
        }
        c.fillRect(-16, -9, 8, 18);
        c.fillRect(8, -9, 8, 18);

        c.fillStyle = block.color;
        c.fillRect(-13, -9, 2, 18);
        c.fillRect(11, -9, 2, 18);

        // Block digital details
        c.fillStyle = block.type === "GOLD" ? "#ffd700" : block.type === "GLASS" ? "#33ffff" : "#33ff33";
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
      const borderFlashColor = p.currentBlockType === "GOLD" ? "#ffd700" : p.currentBlockType === "GLASS" ? "#33ffff" : "#33ff33";
      
      if (p.isFalling || (!p.isFalling && !p.isTumbling)) {
        c.save();
        c.translate(p.blockX, p.blockY);

        if (p.currentBlockType === "GOLD") {
          c.fillStyle = "#2b2200";
        } else if (p.currentBlockType === "GLASS") {
          c.fillStyle = "rgba(51, 255, 255, 0.15)";
        } else {
          c.fillStyle = "#0e2b0e";
        }
        
        c.strokeStyle = borderFlashColor;
        c.lineWidth = 3.5;
        c.beginPath();
        c.rect(-p.blockW / 2, -p.blockH / 2, p.blockW, p.blockH);
        c.fill();
        c.stroke();

        // Windows drawing
        c.fillStyle = borderFlashColor;
        c.fillRect(-16, -9, 8, 18);
        c.fillRect(8, -9, 8, 18);
        
        c.fillStyle = p.currentBlockType === "GOLD" ? "#2b2200" : p.currentBlockType === "GLASS" ? "rgba(51, 255, 255, 0.05)" : "#0e2b0e";
        c.fillRect(-13, -9, 2, 18);
        c.fillRect(11, -9, 2, 18);

        if (!p.isFalling) {
          c.fillStyle = borderFlashColor;
          c.font = 'bold 8px "Geist Mono", monospace';
          c.textAlign = "center";
          c.fillText(p.currentBlockType, 0, 3);
          
          c.fillStyle = "rgba(51, 255, 51, 0.4)";
          c.font = '8px "Geist Mono", monospace';
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
        c.font = 'bold 11px "Geist Mono", monospace';
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
        c.strokeStyle = borderFlashColor;
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(p.hookX, p.hookY + 12);
        c.lineTo(p.blockX, p.blockY - p.blockH / 2);
        c.stroke();
      }

      // 8. Render sway warning
      if (p.towerSwayAmplitude > 25 && p.swayFreezeCount === 0) {
        c.fillStyle = "rgba(255, 51, 51, 0.45)";
        c.font = 'bold 9px "Geist Mono", monospace';
        c.textAlign = "center";
        c.fillText("⚠️ DANGER: TOWER SWAYING ⚠️", w / 2, 90);
      }

      // 9. DRAW SWAY LOCK COMBO INDICATOR
      if (p.swayFreezeCount > 0) {
        c.save();
        c.fillStyle = "rgba(51, 255, 51, 0.9)";
        c.strokeStyle = "#33ff33";
        c.lineWidth = 1.5;
        c.font = 'bold 8px "Geist Mono", monospace';
        
        c.beginPath();
        c.rect(w - 95, 85, 85, 20);
        c.fillStyle = "#041404";
        c.fill();
        c.stroke();
        
        c.fillStyle = "#33ff33";
        c.fillText(`🔒 SWAY LOCK: ${p.swayFreezeCount}`, w - 52, 98);
        c.restore();
      }

      // 10. DRAW CROSSWIND RETRO GAUGE INDICATOR (vector layout arrow)
      c.save();
      c.strokeStyle = "#33ff33";
      c.lineWidth = 1.5;
      c.font = 'bold 8px "Geist Mono", monospace';
      
      c.beginPath();
      c.rect(10, 85, 105, 20);
      c.fillStyle = "#041404";
      c.fill();
      c.stroke();

      c.fillStyle = "#33ff33";
      c.textAlign = "left";
      
      const windLabel = p.wind === 0 
        ? "WIND: CALM" 
        : `WIND: ${p.wind > 0 ? ">>>" : "<<<"} ${Math.abs(p.wind * 10).toFixed(0)} KT`;
      
      c.fillText(windLabel, 16, 98);
      c.restore();
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
      p.vy = 2.5; 
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
    p.swayFreezeCount = 0;
    p.particles = [];
    p.floatingTexts = [];
    
    spawnNewBlock();
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
