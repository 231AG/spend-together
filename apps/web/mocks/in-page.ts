import { getResponse } from 'msw';
import { handlers } from './handlers';

// The mock API answered in the page, not by a service worker (D-93). A page can be
// controlled by one service worker only, and that slot belongs to the app's own (Serwist,
// F12), in mock mode as in live mode, so offline behaviour is the same in both.
//
// It behaves like the network it replaces: with the device offline every call fails as
// fetch does (a TypeError), and a handler's network error (`HttpResponse.error()`) does
// too. Anything the handlers don't know goes to the real network.

export async function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = input instanceof Request ? input.url : input instanceof URL ? input.href : input;
  const request = new Request(new URL(url, window.location.href), init);
  if (!navigator.onLine) throw new TypeError('Failed to fetch (offline)');
  const response = await getResponse(handlers, request);
  if (response === undefined) return globalThis.fetch(input, init);
  if (response.type === 'error') throw new TypeError('Failed to fetch');
  return response;
}
