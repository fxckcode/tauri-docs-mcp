import { RESOURCE_LIMITS } from './resource-limits.js';

type ShutdownDependencies = {
  closeServer: () => Promise<void>;
  closeTransport: () => Promise<void>;
  timeoutMs?: number;
};

export function createShutdown({
  closeServer,
  closeTransport,
  timeoutMs = RESOURCE_LIMITS.shutdownTimeoutMs,
}: ShutdownDependencies): () => Promise<void> {
  let closing: Promise<void> | undefined;
  return () => {
    if (closing) return closing;
    closing = (async () => {
      const close = Promise.allSettled([closeServer(), closeTransport()]).then(
        () => undefined,
      );
      await Promise.race([
        close,
        new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
      ]);
    })();
    return closing;
  };
}
