import { afterEach, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { contentId } from '../src/utils/id';
afterEach(() => vi.unstubAllGlobals());
it('generates valid unique lesson IDs on HTTP origins without randomUUID', () => {
  vi.stubGlobal('crypto', { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) });
  const ids = Array.from({ length: 50 }, contentId);
  expect(new Set(ids).size).toBe(50);
  expect(ids.every(id => /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id))).toBe(true);
});
