import type {RefreshStore} from './auth-session';

/** A fresh module instance belongs to one page. No browser persistence or cross-tab channel. */
export function createMemoryRefreshStore(): RefreshStore {
  let refresh: string | null = null;
  return {
    available: async () => true,
    get: async () => refresh,
    set: async value => { refresh = value; },
    clear: async () => { refresh = null; },
  };
}
