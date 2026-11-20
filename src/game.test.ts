import { afterEach, describe, expect, it, vi } from 'vitest';
import { getGame } from './game';

describe('getGame', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('never turns an invalid contest number into the latest draw', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined });

    for (const invalid of [0, -3, 2.5]) {
      expect(await getGame(invalid)).toBeNull();
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetches the requested contest by number', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ numero: 42, listaDezenas: ['01', '02'], dataApuracao: 'x', listaRateioPremio: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined });

    const game = await getGame(42);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/lotofacil\/42$/));
    expect(game?.listaDezenas).toEqual([1, 2]);
  });
});
