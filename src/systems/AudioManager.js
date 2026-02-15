export default class AudioManager {
  constructor() {
    try {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
    } catch (_) {
      // Audio not available — all methods will no-op
      this.context = null;
      this.unlocked = false;
      this.musicPlaying = false;
      this._musicTimer = null;
      this._musicNodes = [];
      return;
    }

    this.unlocked = false;
    this.musicPlaying = false;

    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.context.destination);
    this.masterGain.gain.value = 0.3; // Gentle volume for a kid

    this.sfxGain = this.context.createGain();
    this.sfxGain.connect(this.masterGain);
    this.sfxGain.gain.value = 0.6;

    this.musicGain = this.context.createGain();
    this.musicGain.connect(this.masterGain);
    this.musicGain.gain.value = 0.25; // Music quieter than SFX

    this._musicTimer = null;
    this._musicNodes = []; // { osc, gain } pairs for cleanup
  }

  unlock() {
    if (!this.context || this.unlocked) return;
    // Play a silent buffer to fully unlock audio on iOS Safari
    const buffer = this.context.createBuffer(1, 1, 22050);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.context.destination);
    source.start(0);
    this.context.resume().then(() => {
      this.unlocked = true;
    });
  }

  // ─── Helper: play a single tone ───

  _tone(freq, duration, type = 'sine', volume = 0.3, dest) {
    if (!this.unlocked) return;
    const t = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(dest || this.sfxGain);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t);
    osc.stop(t + duration);
  }

  // Helper: play a tone at a specific offset from now
  _toneAt(freq, duration, type, volume, delay, dest) {
    if (!this.unlocked) return;
    const t = this.context.currentTime + delay;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(dest || this.sfxGain);
    gain.gain.setValueAtTime(0.001, this.context.currentTime);
    gain.gain.linearRampToValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  // ─── Sound Effects ───

  // Quick cheerful chirp for picking up items
  playPickup() {
    if (!this.unlocked) return;
    const t = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.linearRampToValueAtTime(900, t + 0.06);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  // Warm, gentle note for feeding an animal
  playFeed() {
    if (!this.unlocked) return;
    this._tone(440, 0.15, 'sine', 0.25);
    this._toneAt(554, 0.2, 'sine', 0.2, 0.08);
  }

  // Ascending arpeggio celebration for taming success
  playTameSuccess() {
    if (!this.unlocked) return;
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    for (let i = 0; i < notes.length; i++) {
      this._toneAt(notes[i], 0.18, 'triangle', 0.25, i * 0.1);
    }
  }

  // Satisfying thunk for building
  playBuild() {
    if (!this.unlocked) return;
    const t = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.start(t);
    osc.stop(t + 0.15);

    // A lighter "tap" on top
    this._toneAt(400, 0.08, 'triangle', 0.15, 0.02);
  }

  // Fanfare for completing the house!
  playBuildComplete() {
    if (!this.unlocked) return;
    // C4 → E4 → G4 → C5 chord ascending
    const notes = [262, 330, 392, 523];
    for (let i = 0; i < notes.length; i++) {
      this._toneAt(notes[i], 0.25, 'triangle', 0.3, i * 0.12);
    }
    // Sparkle on top
    this._toneAt(1047, 0.4, 'sine', 0.15, 0.5);
    this._toneAt(1319, 0.3, 'sine', 0.1, 0.6);
  }

  // Soft click for selecting inventory slot
  playSelect() {
    if (!this.unlocked) return;
    this._tone(800, 0.04, 'square', 0.1);
  }

  // Gentle low "nope" for wrong item / can't do that
  playError() {
    if (!this.unlocked) return;
    const t = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.linearRampToValueAtTime(120, t + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  // ─── Background Music ───
  // Simple looping pentatonic melody in C major — cheerful, gentle, cozy

  startMusic() {
    if (!this.unlocked || this.musicPlaying) return;
    this.musicPlaying = true;

    // Pentatonic melody: C D E G A (no dissonance, always sounds nice)
    const melody = [
      // Phrase 1: ascending, cheerful
      { note: 523, dur: 0.3 },  // C5
      { note: 587, dur: 0.3 },  // D5
      { note: 659, dur: 0.45 }, // E5
      { note: 587, dur: 0.3 },  // D5
      { note: 523, dur: 0.45 }, // C5
      { note: 0,   dur: 0.15 }, // rest
      // Phrase 2: playful
      { note: 659, dur: 0.3 },  // E5
      { note: 784, dur: 0.3 },  // G5
      { note: 880, dur: 0.45 }, // A5
      { note: 784, dur: 0.3 },  // G5
      { note: 659, dur: 0.3 },  // E5
      { note: 523, dur: 0.6 },  // C5 (longer, resolving)
      { note: 0,   dur: 0.3 },  // rest
      // Phrase 3: gentle descent
      { note: 880, dur: 0.3 },  // A5
      { note: 784, dur: 0.3 },  // G5
      { note: 659, dur: 0.3 },  // E5
      { note: 587, dur: 0.45 }, // D5
      { note: 523, dur: 0.6 },  // C5 (resolving home)
      { note: 0,   dur: 0.45 }, // rest before loop
    ];

    // Total duration of one loop
    const loopDur = melody.reduce((sum, n) => sum + n.dur, 0);

    const scheduleLoop = () => {
      if (!this.musicPlaying) return;

      // Disconnect old nodes to free audio graph memory
      for (const { osc, gain } of this._musicNodes) {
        try { osc.disconnect(); } catch (_) {}
        try { gain.disconnect(); } catch (_) {}
      }
      this._musicNodes = [];

      const now = this.context.currentTime;
      let offset = 0;

      for (const { note, dur } of melody) {
        if (note > 0) {
          const osc = this.context.createOscillator();
          const gain = this.context.createGain();
          osc.type = 'sine';
          osc.frequency.value = note;
          osc.connect(gain);
          gain.connect(this.musicGain);

          const start = now + offset;
          // Gentle attack + sustain + release envelope
          gain.gain.setValueAtTime(0.001, start);
          gain.gain.linearRampToValueAtTime(0.3, start + 0.04);
          gain.gain.setValueAtTime(0.3, start + dur * 0.6);
          gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

          osc.start(start);
          osc.stop(start + dur + 0.02);

          this._musicNodes.push({ osc, gain });
        }
        offset += dur;
      }

      // Schedule next loop
      this._musicTimer = setTimeout(() => {
        scheduleLoop();
      }, loopDur * 1000 - 100); // slight overlap for seamless looping
    };

    scheduleLoop();
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this._musicTimer) {
      clearTimeout(this._musicTimer);
      this._musicTimer = null;
    }
    // Stop and disconnect all playing nodes
    const now = this.context.currentTime;
    for (const { osc, gain } of this._musicNodes) {
      try { osc.stop(now + 0.1); } catch (_) {}
      try { osc.disconnect(); } catch (_) {}
      try { gain.disconnect(); } catch (_) {}
    }
    this._musicNodes = [];
  }
}
