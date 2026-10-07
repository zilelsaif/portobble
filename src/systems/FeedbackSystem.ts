import type { VehicleType } from '../models/game';
import { Sfx } from '../utils/Sfx';

type FeedbackEvent = 'pickup' | 'invalid' | 'success' | 'failure' | 'undo' | 'reset';

export class FeedbackSystem {
  static event(event: FeedbackEvent): void {
    Sfx.play(event);
    const patterns: Record<FeedbackEvent, number | number[]> = {
      pickup: 0,
      invalid: 35,
      success: [25, 45, 35],
      failure: [45, 35, 45],
      undo: 12,
      reset: 18,
    };
    this.vibrate(patterns[event]);
  }

  static placement(type: VehicleType): void {
    const sounds = {
      motorcycle: 'light',
      car: 'medium',
      van: 'medium',
      ambulance: 'ambulance',
      truck: 'heavy',
    } as const;
    Sfx.play(sounds[type]);
    this.vibrate(type === 'truck' ? 35 : type === 'motorcycle' ? 8 : 18);
  }

  private static vibrate(pattern: number | number[]): void {
    if (!pattern || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // Haptics are optional and never affect gameplay.
    }
  }
}
