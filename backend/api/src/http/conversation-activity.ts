interface ConversationActivityState {
  messageActive: boolean;
  activeDeletes: number;
}

export class ConversationActivityConflictError extends Error {
  constructor() {
    super("conversation_activity_conflict");
    this.name = "ConversationActivityConflictError";
  }
}

export class ConversationActivityCoordinator {
  private readonly states = new Map<string, ConversationActivityState>();

  tryBeginMessage(conversationId: string): boolean {
    const key = conversationId.toLowerCase();
    const state = this.states.get(key);
    if (state?.messageActive === true || (state?.activeDeletes ?? 0) > 0) {
      return false;
    }
    this.states.set(key, {
      messageActive: true,
      activeDeletes: 0,
    });
    return true;
  }

  endMessage(conversationId: string): void {
    const key = conversationId.toLowerCase();
    const state = this.states.get(key);
    if (state === undefined) return;
    state.messageActive = false;
    this.cleanup(key, state);
  }

  tryBeginDelete(conversationId: string): boolean {
    const key = conversationId.toLowerCase();
    const state = this.states.get(key);
    if (state?.messageActive === true) return false;

    if (state === undefined) {
      this.states.set(key, {
        messageActive: false,
        activeDeletes: 1,
      });
    } else {
      state.activeDeletes += 1;
    }
    return true;
  }

  endDelete(conversationId: string): void {
    const key = conversationId.toLowerCase();
    const state = this.states.get(key);
    if (state === undefined) return;
    state.activeDeletes = Math.max(0, state.activeDeletes - 1);
    this.cleanup(key, state);
  }

  private cleanup(
    conversationId: string,
    state: ConversationActivityState,
  ): void {
    if (!state.messageActive && state.activeDeletes === 0) {
      this.states.delete(conversationId);
    }
  }
}
