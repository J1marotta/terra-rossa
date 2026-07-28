import { describe, expect, it } from 'vitest';

import { sanitizeDisplayName } from '../server/rooms/displayName';

describe('display name sanitation', () => {
  it('keeps compact readable names', () => {
    expect(sanitizeDisplayName("  Luna   O'Neil  ")).toBe("Luna O'Neil");
    expect(sanitizeDisplayName('犬 Night-Paw')).toBe('犬 Night-Paw');
  });

  it('removes markup and control characters and limits length', () => {
    expect(sanitizeDisplayName('<script>Bad</script>\nDog')).toBe(
      'scriptBadscriptDog',
    );
    expect(sanitizeDisplayName('A'.repeat(40))).toHaveLength(20);
  });

  it('provides a safe fallback', () => {
    expect(sanitizeDisplayName(undefined)).toBe('Dog');
    expect(sanitizeDisplayName('🌙')).toBe('Dog');
  });
});
