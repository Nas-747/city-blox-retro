"use client";

class RetroSynth {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  setMute(mute: boolean) {
    this.muted = mute;
    if (!mute && this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  isMuted() {
    return this.muted;
  }

  // Dropping wind swoosh sound
  playDrop() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(450, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.4);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(900, this.ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(250, this.ctx.currentTime + 0.35);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  // 1. A short high-pitched crisp beep for perfect drops
  playPerfect(combo: number) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    // Pitch rises with combo level
    const baseFreq = 880; // A5
    const freq = baseFreq * (1 + (combo - 1) * 0.12);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    // Instant drop off for a nice digital beep click
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.12);

    // Filter to make it sound premium retro
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(freq, this.ctx.currentTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  // 2. A dull lower-pitched thud for off-center/great/good drops
  playLand() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Soft triangle wave for heavy bass thud
    osc.type = "triangle";
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.22);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.24);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  // 3. A dramatic descending frequency sweep for missed blocks / lost lives
  playReset() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Sawtooth creates that buzzer sliding alarm sound
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(580, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(60, this.ctx.currentTime + 0.45);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.5);

    // Apply lowpass to smooth the sweep
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.45);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  // Comically descending sad chord arpeggio for Game Over
  playGameOver() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [293.66, 277.18, 261.63, 196.00]; // D4, C#4, C4, G3
    const step = 0.16;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * step);

      gain.gain.setValueAtTime(0, this.ctx!.currentTime + idx * step);
      gain.gain.linearRampToValueAtTime(0.06, this.ctx!.currentTime + idx * step + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx!.currentTime + idx * step + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(this.ctx!.currentTime + idx * step);
      osc.stop(this.ctx!.currentTime + idx * step + 0.25);
    });
  }
}

export const synth = new RetroSynth();
