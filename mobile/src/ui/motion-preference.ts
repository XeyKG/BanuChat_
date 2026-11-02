/** One native preference listener shared by the existing animation primitives. */
export function createMotionPreferenceSource(adapter: {
  read: () => Promise<boolean>;
  listen: (listener: (reduced: boolean) => void) => {remove: () => void} | undefined;
}) {
  let value: boolean | undefined;
  let epoch = 0;
  let revision = 0;
  let subscription: {remove: () => void} | undefined;
  const listeners = new Set<() => void>();
  const update = (next: boolean) => {
    if (value === next) return;
    value = next;
    listeners.forEach(listener => listener());
  };
  return {
    getSnapshot: () => value,
    getServerSnapshot: () => undefined,
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (listeners.size === 1) {
        const currentEpoch = ++epoch;
        const currentRevision = revision;
        subscription = adapter.listen(next => {
          if(epoch!==currentEpoch||listeners.size===0)return;
          revision++;update(next);
        });
        void adapter.read().then(next => {
          // A live change wins over an older asynchronous initial query.
          if (epoch === currentEpoch && revision === currentRevision && listeners.size > 0) update(next);
        }, () => { /* Keep the hook's synchronous system fallback. */ });
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          epoch++;
          subscription?.remove();
          subscription = undefined;
          value = undefined;
        }
      };
    },
  };
}
