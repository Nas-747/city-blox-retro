"use client";

class RetroSynth {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  // Panic continuous rumble nodes
  private rumbleOsc: OscillatorNode | null = null;
  private rumbleOsc2: OscillatorNode | null = null;
  private rumbleGain: GainNode | null = null;
  private rumbleLFO: OscillatorNode | null = null; // Amplitude Modulation LFO
  private rumbleFMOsc: OscillatorNode | null = null; // Frequency Modulation LFO
  private rumbleFMGain: GainNode | null = null;
  private rumbleAMGain: GainNode | null = null;

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

  // Play a distinct, high-pitched ascending chord sequence on difficulty select
  playDifficultySelect() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    // Ascending retro major triad chords
    const chords = [
      [523.25, 659.25, 783.99],   // C5 Triad
      [698.46, 880.00, 1046.50],  // F5 Triad
      [1046.50, 1318.51, 1567.98] // C6 Triad
    ];
    const chordDelay = 0.12;

    chords.forEach((frequencies, chordIdx) => {
      const startTime = this.ctx!.currentTime + chordIdx * chordDelay;
      frequencies.forEach((freq, noteIdx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        // Blend square and triangle waves for rich harmonic retro timbre
        osc.type = noteIdx === 1 ? "triangle" : "square";
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.04, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.25);
      });
    });
  }

  // Continuous low-frequency modulating drone exclusively during the panic state
  startRumble() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    if (this.rumbleOsc) return; // already active

    // Create detuned dual oscillators for massive wobbly weight
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    this.rumbleGain = this.ctx.createGain();

    osc1.type = "sawtooth";
    osc2.type = "triangle";
    
    osc1.frequency.setValueAtTime(45.0, this.ctx.currentTime);
    osc2.frequency.setValueAtTime(46.2, this.ctx.currentTime);

    this.rumbleGain.gain.setValueAtTime(0.14, this.ctx.currentTime);

    // LFO 1: Pitch/Frequency Modulation (slow warning oscillation)
    const fmOsc = this.ctx.createOscillator();
    fmOsc.type = "sine";
    fmOsc.frequency.setValueAtTime(2.0, this.ctx.currentTime); // 2Hz modulation rate

    const fmGain = this.ctx.createGain();
    fmGain.gain.setValueAtTime(5.0, this.ctx.currentTime); // sweep pitch by +/- 5Hz

    fmOsc.connect(fmGain);
    fmGain.connect(osc1.frequency);
    fmGain.connect(osc2.frequency);

    // LFO 2: Amplitude Modulation (Volume Pulse)
    const amOsc = this.ctx.createOscillator();
    amOsc.type = "sine";
    amOsc.frequency.setValueAtTime(4.0, this.ctx.currentTime); // 4Hz pulse rate

    const amGain = this.ctx.createGain();
    amGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    amOsc.connect(amGain);
    amGain.connect(this.rumbleGain.gain);

    // Filter to suppress high frequencies and make it deep bass
    const lpFilter = this.ctx.createBiquadFilter();
    lpFilter.type = "lowpass";
    lpFilter.frequency.setValueAtTime(120, this.ctx.currentTime);

    osc1.connect(lpFilter);
    osc2.connect(lpFilter);
    lpFilter.connect(this.rumbleGain);
    this.rumbleGain.connect(this.ctx.destination);

    // Keep references for clean stopping and unmount unlinking
    this.rumbleOsc = osc1;
    this.rumbleOsc2 = osc2;
    this.rumbleLFO = amOsc;
    this.rumbleFMOsc = fmOsc;
    this.rumbleFMGain = fmGain;
    this.rumbleAMGain = amGain;

    // Start all nodes
    osc1.start();
    osc2.start();
    fmOsc.start();
    amOsc.start();
  }

  // Stop the continuous wobbly rumble oscillator alarm immediately
  stopRumble() {
    try {
      if (this.rumbleOsc) {
        this.rumbleOsc.stop();
        this.rumbleOsc.disconnect();
        this.rumbleOsc = null;
      }
      if (this.rumbleOsc2) {
        this.rumbleOsc2.stop();
        this.rumbleOsc2.disconnect();
        this.rumbleOsc2 = null;
      }
      if (this.rumbleLFO) {
        this.rumbleLFO.stop();
        this.rumbleLFO.disconnect();
        this.rumbleLFO = null;
      }
      if (this.rumbleFMOsc) {
        this.rumbleFMOsc.stop();
        this.rumbleFMOsc.disconnect();
        this.rumbleFMOsc = null;
      }
      if (this.rumbleFMGain) {
        this.rumbleFMGain.disconnect();
        this.rumbleFMGain = null;
      }
      if (this.rumbleAMGain) {
        this.rumbleAMGain.disconnect();
        this.rumbleAMGain = null;
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

  // Full clean up of all nodes and context on component unmount to prevent resource memory leaks
  cleanup() {
    this.stopRumble();
    if (this.ctx) {
      const context = this.ctx;
      this.ctx = null;
      try {
        context.close();
      } catch (e) {
        // safe bypass
      }
    }
  }
}

export const synth = new RetroSynth();
