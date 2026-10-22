import type { RetrievedDocumentChunk } from "../application/document-retrieval.js";
import type { ConversationMessage } from "./conversation-context.js";

function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/** Scope by the latest explicit student subject, never by vector rank or old assistant claims. */
export function selectCcdEvidence(
  chunks: readonly RetrievedDocumentChunk[], query: string, history: readonly ConversationMessage[],
): RetrievedDocumentChunk[] {
  const subjects = [query, ...history.filter(message => message.role === "user").map(message => message.content).reverse()];
  for (const subject of subjects) {
    const text = ` ${normalize(subject)} `;
    if (/\b(?:contacto|correo|email)\b/u.test(text)) return chunks.filter(chunk => chunk.chunk_locator === "unit:M12");
    if (/\bpruebas?\b/u.test(text)) return chunks.filter(chunk => chunk.chunk_locator === "unit:TEST_ORIENTATION");
    const courses = chunks.filter(chunk => {
      if (!chunk.chunk_locator.startsWith("unit:M02:")) return false;
      const title = normalize(chunk.title);
      const shortTitle = title.replace(/ digital(?:es)?$/u, "");
      return text.includes(` ${title} `) || (shortTitle.split(" ").length >= 2 && text.includes(` ${shortTitle} `));
    });
    if (courses.length > 0) return courses;
  }
  return [...chunks];
}

/** TEST_ORIENTATION admits description only, never effects, fees or individual eligibility. */
export function asksUnsupportedTestRule(query: string): boolean {
  return /\b(?:gratuit\p{L}*|gratis|repet\p{L}*|homolog\p{L}*|exen\p{L}*|reconoc\p{L}*|equivalen\p{L}*|elegib\p{L}*|obligatori\p{L}*|oportunidades|puntos|puntaje|pierda\p{L}*|reprueb\p{L}*)\b|\bno (?:l[oa]s? )?aprueb\p{L}*/u.test(normalize(query));
}

/** A private generation protocol, not a REST field. Invalid references fail closed. */
export function parseGroundedAnswer(output: string, chunkCount: number): {
  content: string; source_indexes: number[];
} | undefined {
  const match = /\nFUENTES: (\[[1-9]\d*\](?:, \[[1-9]\d*\])*)\s*$/u.exec(output);
  if (!match || match.index === 0) return undefined;
  const content = output.slice(0, match.index).trim();
  if (!content || /FUENTES:|\[\s*\d+(?:\s*[,.-]\s*\d+)*\s*\]/u.test(content)) return undefined;
  const indexes = [...match[1]!.matchAll(/\[(\d+)\]/gu)].map(item => Number(item[1]) - 1);
  if (new Set(indexes).size !== indexes.length || indexes.some(index => !Number.isSafeInteger(index) || index < 0 || index >= chunkCount)) return undefined;
  return { content, source_indexes: indexes };
}

export const GROUNDED_ANSWER_INSTRUCTION = `Si puedes responder, termina con una sola línea en este formato exacto:
FUENTES: [1], [2]
Incluye únicamente los números de los fragmentos que sustentan lo que afirmas, no todos los disponibles.
No interpretes que una fuente no determina efectos académicos como que no hay consecuencias: esos efectos no están documentados.
Expresa los límites en lenguaje cotidiano, sin identificadores internos de auditoría ni códigos de bloqueos.
No incluyas referencias numéricas en el cuerpo ni inventes números. La línea de fuentes no cuenta en las 80 palabras.
Si no puedes responder, devuelve solo EVIDENCIA_INSUFICIENTE, sin línea de fuentes.`;
