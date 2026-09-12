import { describe, expect, it, vi } from 'vitest';
import { createShutdown } from '../src/lifecycle.js';

describe('shutdown lifecycle', () => {
  it('closes server and transport once when called repeatedly', async () => {
    const closeServer = vi.fn(async () => undefined);
    const closeTransport = vi.fn(async () => undefined);
    const shutdown = createShutdown({ closeServer, closeTransport });
    await Promise.all([shutdown(), shutdown(), shutdown()]);
    expect(closeServer).toHaveBeenCalledOnce();
    expect(closeTransport).toHaveBeenCalledOnce();
  });
});
