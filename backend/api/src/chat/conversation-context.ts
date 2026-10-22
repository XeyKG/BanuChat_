/** Conversation text identifies the topic; it is never institutional evidence. */
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export const CONTEXT_MESSAGE_LIMIT = 8;
export const CONTEXT_MESSAGE_CHAR_LIMIT = 1200;
export const CONTEXT_CHAR_LIMIT = 6000;

export function boundConversationContext(
  messages: readonly ConversationMessage[],
): ConversationMessage[] {
  let remaining = CONTEXT_CHAR_LIMIT;
  const result: ConversationMessage[] = [];
  for (const message of messages.slice(-CONTEXT_MESSAGE_LIMIT).reverse()) {
    if (remaining === 0) break;
    const content = Array.from(message.content)
      .slice(0, Math.min(CONTEXT_MESSAGE_CHAR_LIMIT, remaining)).join("");
    remaining -= Array.from(content).length;
    result.unshift({ role: message.role, content });
  }
  return result;
}

function normalize(query: string): string {
  return query.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[¿?¡!.,;:]/gu, " ").replace(/\s+/gu, " ").trim();
}

export function isContextualFollowUp(query: string): boolean {
  const text = normalize(query);
  // A declared subject starts a new topic even if prefixed with “y”.
  if (/^(?:cambiando de tema|otro tema|ahora (?:quiero|hablemos|sobre))/u.test(text)) return false;
  return /^(?:y\b|pero\b|entonces\b|hablame del de\b|(?:me refiero|quise decir|corrijo|correccion|perdon)\b)/u.test(text)
    || /\b(?:ese|esa|eso|esos|esas|anterior|el primero|el segundo|el tercero)\b/u.test(text)
    || /^(?:que temas (?:tiene|incluye)|cuanto duran?|cuanto cuesta)$/u.test(text)
    || /^(?:como (?:lo|la|los|las)\b|que pasa si no (?:la|lo|las|los)\b)/u.test(text);
}

export function resolveConversationQuery(query: string, messages: readonly ConversationMessage[]): {
  retrieval_query: string;
  history: ConversationMessage[];
  needs_clarification: boolean;
} {
  if (!isContextualFollowUp(query)) {
    return { retrieval_query: query, history: [], needs_clarification: false };
  }
  const history = boundConversationContext(messages);
  // Keep the latest subject and subsequent refinements. Explicit topic changes
  // and self-contained questions cut off earlier topics, including personal data.
  let start = history.length;
  let hasSubject = false;
  for (let index = history.length - 1; index >= 0; index--) {
    const message = history[index]!;
    if (message.role !== "user") continue;
    start = index;
    if (!isContextualFollowUp(message.content)) {
      if (/^(?:hola|gracias|muchas gracias|adios|que puedes hacer|ayuda)$/u.test(normalize(message.content))) continue;
      hasSubject = true;
      break;
    }
  }
  const active = history.slice(start);
  const antecedents = active.filter(message => message.role === "user");
  if (!hasSubject || antecedents.length === 0) {
    return { retrieval_query: query, history: [], needs_clarification: true };
  }
  // Only student text goes to the embedding. Previous generated answers cannot
  // seed a rule or replace the freshly retrieved evidence.
  const topic = antecedents.map(message => message.content).join("\n");
  const budget = Math.max(0, 3900 - Array.from(query).length);
  const prefix = budget === 0 ? "" : Array.from(topic).slice(-budget).join("");
  return {
    retrieval_query: prefix.length > 0 ? `${prefix}\nConsulta actual: ${query}` : query,
    history: active,
    needs_clarification: false,
  };
}
