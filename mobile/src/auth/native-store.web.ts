import {createMemoryRefreshStore} from './memory-store';

// Keep AuthSession's interface; SecureStore is never imported by this web adapter.
export const nativeRefreshStore = createMemoryRefreshStore();
