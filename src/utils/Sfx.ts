import { SaveSystem } from '../systems/SaveSystem';

export type SoundName =
  | 'button'
  | 'pickup'
  | 'light'
  | 'medium'
  | 'heavy'
  | 'ambulance'
  | 'invalid'
  | 'warning'
  | 'ramp'
  | 'horn'
  | 'wake'
  | 'success'
  | 'failure'
  | 'undo'
  | 'reset';

const tones: Record<SoundName, [number, number, OscillatorType]> = {
  button: [420, 0.045, 'sine'],
  pickup: [680, 0.045, 'sine'],
  light: [620, 0.055, 'sine'],
  medium: [310, 0.085, 'triangle'],
  heavy: [105, 0.16, 'triangle'],
  ambulance: [440, 0.095, 'square'],
  invalid: [145, 0.12, 'sawtooth'],
  warning: [205, 0.16, 'triangle'],
  ramp: [92, 0.13, 'triangle'],
  horn: [175, 0.32, 'triangle'],
  wake: [250, 0.22, 'sine'],
  success: [660, 0.22, 'sine'],
  failure: [130, 0.2, 'sawtooth'],
  undo: [380, 0.065, 'sine'],
  reset: [230, 0.09, 'triangle'],
};

export class Sfx {
  private static context: AudioContext | null = null;

  static play(name: SoundName): void {
    if (SaveSystem.load().muted) return;
    try {
      this.context ??= new AudioContext();
      const [frequency, duration, type] = tones[name];
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, this.context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, this.context.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);
      oscillator.connect(gain).connect(this.context.destination);
      oscillator.start();
      oscillator.stop(this.context.currentTime + duration + 0.02);
    } catch {
      // Audio is an enhancement; browsers may deny it without affecting play.
    }
  }
}
