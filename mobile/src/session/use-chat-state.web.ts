import {useCallback,useSyncExternalStore,type Dispatch,type SetStateAction} from 'react';
import {useAuth} from '../auth/auth-provider';
import type {AuthSession} from '../auth/auth-session';
import {WebChatCache} from './web-chat-cache';

const sessions=new WeakMap<AuthSession,WebChatCache>();
function cacheFor(client:AuthSession){
  let cache=sessions.get(client);
  if(!cache){cache=new WebChatCache();sessions.set(client,cache);const current=cache;
    const sync=()=>{const state=client.getSnapshot();current.reset(state.phase==='authenticated'?state.epoch:null);};
    // AuthSession lives for this tab. Clear even when no chat screen is mounted.
    client.subscribe(sync);sync();
  }
  return cache;
}
export function useChatState<T>(conversation:string|null,field:string,initial:T):[T,Dispatch<SetStateAction<T>>]{
  const {client,snapshot}=useAuth(),cache=cacheFor(client);
  // slot() returns the existing object by key; initial is used only on creation,
  // just like useState. No memo dependency on freshly created initial objects.
  const slot=cache.slot(snapshot.epoch,conversation??'invalid',field,initial);
  const subscribe=useCallback((listener:()=>void)=>{slot.listeners.add(listener);return()=>{slot.listeners.delete(listener);};},[slot]);
  const read=useCallback(()=>slot.value,[slot]);
  const value=useSyncExternalStore(subscribe,read,read);
  const set=useCallback<Dispatch<SetStateAction<T>>>(next=>cache.update(slot,next),[cache,slot]);
  return [value,set];
}
