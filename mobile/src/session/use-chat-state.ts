import {useState,type Dispatch,type SetStateAction} from 'react';
/** Native keeps its existing component-local state. */
export function useChatState<T>(_conversation:string|null,_field:string,initial:T):[T,Dispatch<SetStateAction<T>>]{return useState(initial);}
