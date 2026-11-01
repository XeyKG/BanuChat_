export interface ChatSlot<T> {epoch:number;value:T;initial:T;listeners:Set<()=>void>}
/** One tab/session only. Invalidation also clears slots retained by an old async
 * callback, so a late operation cannot restore another account's state. */
export class WebChatCache {
  private epoch:number|null=null;
  private conversations=new Map<string,Map<string,ChatSlot<unknown>>>();
  reset(epoch:number|null){
    if(epoch===this.epoch)return;
    this.epoch=epoch;
    const previous=[...this.conversations.values()].flatMap(fields=>[...fields.values()]);
    this.conversations.clear();
    for(const slot of previous){slot.value=slot.initial;slot.listeners.forEach(listener=>listener());}
  }
  slot<T>(epoch:number,conversation:string,field:string,initial:T):ChatSlot<T>{
    const fields=this.conversations.get(conversation)??new Map<string,ChatSlot<unknown>>();
    if(!this.conversations.has(conversation))this.conversations.set(conversation,fields);
    if(!fields.has(field))fields.set(field,{epoch,value:initial,initial,listeners:new Set()});
    return fields.get(field)! as ChatSlot<T>;
  }
  update<T>(slot:ChatSlot<T>,next:T|((current:T)=>T)){
    if(slot.epoch!==this.epoch)return;
    const value=typeof next==='function'?(next as (current:T)=>T)(slot.value):next;
    if(Object.is(slot.value,value))return;
    slot.value=value;slot.listeners.forEach(listener=>listener());
  }
}
