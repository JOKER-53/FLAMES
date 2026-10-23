import { afterEach, expect, it, vi } from 'vitest';
import { acceptAcademyMessage, academyAuthorization, notifyAcademy, setIntegration } from '../src/integration/academy';
import { apiFetch } from '../src/api/http';
const parent = { postMessage: vi.fn() };
const config = { mode: 'academy' as const, parentOrigin: 'https://academy.example', parentUrl: 'https://academy.example/' };
function setup() {
  vi.stubGlobal('window', { parent, dispatchEvent: vi.fn(), location: { origin: 'https://lab.example' } });
  setIntegration(config); parent.postMessage.mockClear();
}
function event(origin = config.parentOrigin, source = parent, token: string | null = 'valid-token') {
  return { origin, source: source as unknown as Window, data: { type: 'FORTISIM_AUTH', version: 1, token } };
}
afterEach(() => { setIntegration({ mode: 'standalone', parentOrigin: null, parentUrl: null }); vi.unstubAllGlobals(); });
it('rejects wrong origins, unrelated windows, malformed tokens, and query-like credentials', () => {
  setup();
  expect(acceptAcademyMessage(event('https://attacker.example'), parent as unknown as Window)).toBe(false);
  expect(acceptAcademyMessage(event(config.parentOrigin, { postMessage: vi.fn() }), parent as unknown as Window)).toBe(false);
  expect(acceptAcademyMessage(event(config.parentOrigin, parent, 'bad token'), parent as unknown as Window)).toBe(false);
  expect(academyAuthorization()).toBe('');
});
it('keeps credentials in memory, ignores duplicate messages, and clears them on parent logout', () => {
  setup();
  expect(acceptAcademyMessage(event(), parent as unknown as Window)).toBe(true);
  expect(academyAuthorization()).toBe('Bearer valid-token');
  expect(acceptAcademyMessage(event(), parent as unknown as Window)).toBe(false);
  expect(acceptAcademyMessage(event(config.parentOrigin, parent, null), parent as unknown as Window)).toBe(true);
  expect(academyAuthorization()).toBe('');
});
it('sends ready and saved messages only to the configured parent origin', () => {
  setup(); notifyAcademy('FORTISIM_READY');
  expect(parent.postMessage).toHaveBeenCalledWith({ type: 'FORTISIM_READY', version: 1 }, 'https://academy.example');
});
it('attaches the parent credential only to same-origin API requests', async () => {
  setup(); acceptAcademyMessage(event(), parent as unknown as Window);
  const fetch = vi.fn(async () => new Response('{}')); vi.stubGlobal('fetch', fetch);
  await apiFetch('/api/scenarios');
  expect((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].headers).toBeInstanceOf(Headers);
  expect(((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].headers as Headers).get('Authorization')).toBe('Bearer valid-token');
  await apiFetch('https://unrelated.example/api');
  expect(((fetch.mock.calls[1] as unknown as [string, RequestInit])[1].headers as Headers).has('Authorization')).toBe(false);
});

it('expires the in-memory credential and informs the parent when its API session is rejected', async () => {
  setup(); acceptAcademyMessage(event(), parent as unknown as Window);
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));
  await apiFetch('/api/scenarios');
  expect(academyAuthorization()).toBe('');
  expect(parent.postMessage).toHaveBeenCalledWith({ type: 'FORTISIM_AUTH_REQUIRED', version: 1 }, 'https://academy.example');
  expect(window.dispatchEvent).toHaveBeenCalled();
});
