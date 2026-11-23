const VIBRATION_KEY = 'skyline_stride_vibration_v1';

class HapticsEngine {
  private enabled: boolean = true;

  constructor() {
    try {
      const saved = localStorage.getItem(VIBRATION_KEY);
      if (saved === 'false') this.enabled = false;
    } catch {
      // Ignore storage errors
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(next: boolean): boolean {
    this.enabled = next;
    try {
      localStorage.setItem(VIBRATION_KEY, String(next));
    } catch {
      // Ignore storage errors
    }
    if (next) this.pulse(18);
    return this.enabled;
  }

  public toggle(): boolean {
    return this.setEnabled(!this.enabled);
  }

  public pulse(pattern: number | number[]) {
    if (!this.enabled) return;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore unsupported environments
    }
  }
}

export const haptics = new HapticsEngine();
