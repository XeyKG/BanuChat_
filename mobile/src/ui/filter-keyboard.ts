import type {KeyboardEvent} from 'react';

/** Keyboard behavior stays inside one mutually exclusive filter group. */
export function onFilterKeyDown(event:KeyboardEvent<HTMLElement>) {
  const direction=event.key==='ArrowRight'||event.key==='ArrowDown'?1:event.key==='ArrowLeft'||event.key==='ArrowUp'?-1:0;
  if(!direction&&event.key!=='Home'&&event.key!=='End')return;
  const group=event.currentTarget.closest('[role="radiogroup"]');
  if(!group)return;
  const options=[...group.querySelectorAll<HTMLElement>('[role="radio"]')].filter(element=>element.getAttribute('aria-disabled')!=='true'&&element.checkVisibility({checkVisibilityCSS:true}));
  const index=options.indexOf(event.currentTarget);
  if(index<0||!options.length)return;
  event.preventDefault();
  event.stopPropagation();
  const next=options[event.key==='Home'?0:event.key==='End'?options.length-1:(index+direction+options.length)%options.length];
  next.focus();
  if(next.getAttribute('aria-checked')!=='true')next.click();
}
