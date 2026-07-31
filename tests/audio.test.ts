import { describe, expect, it } from 'vitest';

import {
  GameAudio,
  MAX_AUDIO_VOICES,
  readAudioSettings,
} from '../client/src/audio/GameAudio';

describe('bounded browser audio', () => {
  it('uses safe defaults without browser storage', () => {
    expect(readAudioSettings()).toEqual({
      masterVolume: 0.8,
      effectsVolume: 0.8,
      muted: false,
    });
  });

  it('has a hard voice cap and ignores cues before activation', () => {
    expect(MAX_AUDIO_VOICES).toBe(12);
    const audio = new GameAudio();
    expect(() => audio.cue('shooter-hit')).not.toThrow();
    audio.dispose();
  });
});
