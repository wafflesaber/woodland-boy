export default class AudioManager {
  constructor() {
    this.context = new (window.AudioContext || window.webkitAudioContext)();
    this.unlocked = false;
    this.musicPlaying = false;
    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.context.destination);
    this.masterGain.gain.value = 0.3;
  }

  unlock() {
    if (this.unlocked) return;
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

  // Stubs — implemented in Phase 7
  playPickup() {}
  playFeed() {}
  playTameSuccess() {}
  playBuild() {}
  playBuildComplete() {}
  playSelect() {}
  playError() {}
  startMusic() {}
  stopMusic() {}
}
