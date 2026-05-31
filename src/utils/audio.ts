"use client";

class RetroSynth {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  // Panic continuous rumble nodes
  private rumbleOsc: OscillatorNode | null = null;
  private rumbleGain: GainNode | null = null;
  private rumbleLFO: OscillatorNode | null = null;

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
    if (mute) {
      this.stopRumble();
    } else if (this.ctx && this.ctx.state === "suspended") {
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

  // A short high-pitched crisp beep for perfect drops
  playPerfect(combo: number) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const baseFreq = 880; 
    const freq = baseFreq * (1 + (combo - 1) * 0.12);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.12);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(freq, this.ctx.currentTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  // A dull lower-pitched thud for off-center/great/good drops
  playLand() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

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

  // A dramatic descending frequency sweep for missed blocks / lost lives
  playReset() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(580, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(60, this.ctx.currentTime + 0.45);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.5);

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

  // Bright, rapid 8-bit arpeggio sound sequence when power-ups are grabbed
  playPowerUp() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C5, E5, G5, C6, E6, G6
    const step = 0.05; // extremely rapid

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      // Sharp bright square waves
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * step);

      gain.gain.setValueAtTime(0, this.ctx!.currentTime + idx * step);
      gain.gain.linearRampToValueAtTime(0.04, this.ctx!.currentTime + idx * step + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx!.currentTime + idx * step + 0.15);

      // Connect
      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(this.ctx!.currentTime + idx * step);
      osc.stop(this.ctx!.currentTime + idx * step + 0.2);
    });
  }

  // 2. Continuous low-frequency pulsating rumble oscillation sound during Panic
  startRumble() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    if (this.rumbleOsc) return; // already active

    // Pulsating deep rumble using triangle waves
    this.rumbleOsc = this.ctx.createOscillator();
    this.rumbleGain = this.ctx.createGain();
    
    // Deep wobbly structural rumble (50Hz)
    this.rumbleOsc.type = "triangle";
    this.rumbleOsc.frequency.setValueAtTime(48, this.ctx.currentTime);

    this.rumbleGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

    // Create a Low Frequency Oscillator (LFO) to modulate amplitude (volume pulse wobbly effect)
    this.rumbleLFO = this.ctx.createOscillator();
    this.rumbleLFO.type = "sine";
    this.rumbleLFO.frequency.setValueAtTime(5.5, this.ctx.currentTime); // LFO at 5.5Hz (pulsates 5.5 times a second!)

    // Connect LFO modulator to rumble gain node amplitude to create pulsation
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    
    this.rumbleLFO.connect(lfoGain);
    lfoGain.connect(this.rumbleGain.gain);

    // Filter to suppress high frequencies and make it deep bass
    const lpFilter = this.ctx.createBiquadFilter();
    lpFilter.type = "lowpass";
    lpFilter.frequency.setValueAtTime(100, this.ctx.currentTime);

    this.rumbleOsc.connect(lpFilter);
    lpFilter.connect(this.rumbleGain);
    this.rumbleGain.connect(this.ctx.destination);

    // Start oscillators
    this.rumbleOsc.start();
    this.rumbleLFO.start();
  }

  // Stop the continuous wobbly rumble oscillator alarm immediately
  stopRumble() {
    try {
      if (this.rumbleOsc) {
        this.rumbleOsc.stop();
        this.rumbleOsc.disconnect();
        this.rumbleOsc = null;
      }
      if (this.rumbleLFO) {
        this.rumbleLFO.stop();
        this.rumbleLFO.disconnect();
        this.rumbleLFO = null;
      }
      if (this.rumbleGain) {
        this.rumbleGain.disconnect();
        this.rumbleGain = null;
      }
    } catch (e) {
      // safe bypass
    }
  }

  // Comically descending sad chord arpeggio for Game Over
  playGameOver() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    this.stopRumble(); // Force stop any rumble loops immediately!

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
