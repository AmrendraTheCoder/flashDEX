// Sound effects using Web Audio API
class SoundManager {
  private audioContext: AudioContext | null = null
  private enabled = true

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
    }
    return this.audioContext
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.1) {
    if (!this.enabled) return
    
    try {
      const ctx = this.getContext()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      oscillator.frequency.value = frequency
      oscillator.type = type
      
      gainNode.gain.setValueAtTime(volume, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)
      
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + duration)
    } catch (e) {
      // Audio not supported
    }
  }

  playBuy() {
    this.playTone(880, 0.1, 'sine', 0.08)
    setTimeout(() => this.playTone(1100, 0.1, 'sine', 0.08), 50)
  }

  playSell() {
    this.playTone(440, 0.1, 'sine', 0.08)
    setTimeout(() => this.playTone(330, 0.1, 'sine', 0.08), 50)
  }

  playOrderFilled() {
    this.playTone(523, 0.08, 'sine', 0.1)
    setTimeout(() => this.playTone(659, 0.08, 'sine', 0.1), 80)
    setTimeout(() => this.playTone(784, 0.12, 'sine', 0.1), 160)
  }

  playAlert() {
    this.playTone(800, 0.15, 'square', 0.06)
    setTimeout(() => this.playTone(800, 0.15, 'square', 0.06), 200)
  }

  playAchievement() {
    const notes = [523, 659, 784, 1047]
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.15, 'sine', 0.08), i * 100)
    })
  }

  playError() {
    this.playTone(200, 0.2, 'sawtooth', 0.05)
  }

  playClick() {
    this.playTone(1000, 0.03, 'sine', 0.03)
  }
}

export const soundManager = new SoundManager()
