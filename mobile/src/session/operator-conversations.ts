import { isCcdLocal } from '@/config/demo-mode';

// Volatile UI scope, not ownership or authentication. Never enumerate the shared profile history.
const opened = new Set<string>();
export function rememberConversation(id: string): void {
  if (isCcdLocal()) opened.add(id);
}
export function operatorConversationIds(): string[] { return [...opened]; }
export function clearOperatorConversations(): void { opened.clear(); }
export function assertConversationAllowed(id: string): void {
  if (isCcdLocal() && !opened.has(id)) throw new Error('CONVERSATION_OUTSIDE_LOCAL_OPENING');
}
