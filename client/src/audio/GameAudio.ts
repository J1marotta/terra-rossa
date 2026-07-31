export interface AudioSettings {
  readonly masterVolume: number;
  readonly effectsVolume: number;
  readonly muted: boolean;
}

interface Tone {
  readonly frequency: number;
  readonly duration: number;
  readonly gain: number;
  readonly type: OscillatorType;
  readonly priority: number;
}

const STORAGE_KEY = 'terra-rossa.audio.v1';
export const MAX_AUDIO_VOICES = 12;

const TONES: Record<string, Tone> = {
  'shooter-hit': {
    frequency: 150,
    duration: 0.09,
    gain: 0.2,
    type: 'square',
    priority: 2,
  },
  'shooter-miss': {
    frequency: 210,
    duration: 0.06,
    gain: 0.14,
    type: 'sawtooth',
    priority: 1,
  },
  'remote-shot': {
    frequency: 180,
    duration: 0.06,
    gain: 0.1,
    type: 'square',
    priority: 1,
  },
  'dry-fire': {
    frequency: 80,
    duration: 0.04,
    gain: 0.1,
    type: 'square',
    priority: 1,
  },
  'melee-hit': {
    frequency: 95,
    duration: 0.12,
    gain: 0.18,
    type: 'triangle',
    priority: 2,
  },
  'melee-miss': {
    frequency: 240,
    duration: 0.05,
    gain: 0.08,
    type: 'sine',
    priority: 1,
  },
  'victim-hit': {
    frequency: 65,
    duration: 0.18,
    gain: 0.22,
    type: 'sawtooth',
    priority: 3,
  },
  'victim-death': {
    frequency: 45,
    duration: 0.55,
    gain: 0.25,
    type: 'sawtooth',
    priority: 4,
  },
  'reload-start': {
    frequency: 260,
    duration: 0.08,
    gain: 0.09,
    type: 'square',
    priority: 1,
  },
  'reload-normal': {
    frequency: 330,
    duration: 0.1,
    gain: 0.1,
    type: 'triangle',
    priority: 1,
  },
  'reload-good': {
    frequency: 520,
    duration: 0.14,
    gain: 0.12,
    type: 'triangle',
    priority: 2,
  },
  'reload-perfect': {
    frequency: 760,
    duration: 0.18,
    gain: 0.13,
    type: 'sine',
    priority: 2,
  },
  'reload-failed': {
    frequency: 70,
    duration: 0.3,
    gain: 0.16,
    type: 'square',
    priority: 3,
  },
  pickup: {
    frequency: 620,
    duration: 0.12,
    gain: 0.11,
    type: 'sine',
    priority: 2,
  },
  'creature-warning': {
    frequency: 105,
    duration: 0.25,
    gain: 0.13,
    type: 'triangle',
    priority: 3,
  },
  'darkness-warning': {
    frequency: 55,
    duration: 0.5,
    gain: 0.18,
    type: 'sine',
    priority: 4,
  },
  countdown: {
    frequency: 420,
    duration: 0.09,
    gain: 0.1,
    type: 'square',
    priority: 2,
  },
  victory: {
    frequency: 700,
    duration: 0.4,
    gain: 0.16,
    type: 'triangle',
    priority: 4,
  },
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function readAudioSettings(): AudioSettings {
  try {
    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '{}',
    ) as Partial<AudioSettings>;
    return {
      masterVolume: clamp(stored.masterVolume ?? 0.8),
      effectsVolume: clamp(stored.effectsVolume ?? 0.8),
      muted: stored.muted ?? false,
    };
  } catch {
    return { masterVolume: 0.8, effectsVolume: 0.8, muted: false };
  }
}

export class GameAudio {
  #context: AudioContext | null = null;
  #settings = readAudioSettings();
  #voices: Array<{ oscillator: OscillatorNode; priority: number }> = [];

  get settings() {
    return this.#settings;
  }

  async unlock() {
    this.#context ??= new AudioContext();
    if (this.#context.state === 'suspended') await this.#context.resume();
  }

  update(settings: Partial<AudioSettings>) {
    this.#settings = {
      masterVolume: clamp(settings.masterVolume ?? this.#settings.masterVolume),
      effectsVolume: clamp(
        settings.effectsVolume ?? this.#settings.effectsVolume,
      ),
      muted: settings.muted ?? this.#settings.muted,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.#settings));
  }

  cue(kind: string) {
    const tone = TONES[kind];
    const context = this.#context;
    if (
      tone === undefined ||
      context === null ||
      context.state !== 'running' ||
      this.#settings.muted
    )
      return;
    if (this.#voices.length >= MAX_AUDIO_VOICES) {
      const leastImportant = [...this.#voices].sort(
        (left, right) => left.priority - right.priority,
      )[0];
      if (
        leastImportant === undefined ||
        leastImportant.priority > tone.priority
      )
        return;
      leastImportant.oscillator.stop();
    }
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = tone.type;
    oscillator.frequency.setValueAtTime(tone.frequency, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, tone.frequency * 0.72),
      context.currentTime + tone.duration,
    );
    const volume =
      tone.gain * this.#settings.masterVolume * this.#settings.effectsVolume;
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + tone.duration,
    );
    oscillator.connect(gain).connect(context.destination);
    const voice = { oscillator, priority: tone.priority };
    this.#voices.push(voice);
    oscillator.addEventListener('ended', () => {
      this.#voices = this.#voices.filter((candidate) => candidate !== voice);
      oscillator.disconnect();
      gain.disconnect();
    });
    oscillator.start();
    oscillator.stop(context.currentTime + tone.duration);
  }

  dispose() {
    this.#voices.forEach(({ oscillator }) => oscillator.stop());
    this.#voices = [];
    void this.#context?.close();
    this.#context = null;
  }
}
