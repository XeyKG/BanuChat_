export const RESPECT_REPLY =
  "Por favor, mantengamos el respeto. Reformula tu pregunta sin insultos y con gusto te ayudo.";
export const FILTERED_MESSAGE = "[Mensaje omitido por lenguaje ofensivo]";

// Match whole words and phrases to avoid blocking unrelated academic terms.
const STRONG_PROFANITY =
  /\b(?:hij[oa]s? de (?:la |una |su )?puta|malparid[oa]s?|gonorreas?|pendej[oa]s?|imbecil(?:es)?|idiotas?|put[oa]s?|mierda|carajo|jodete|cabron(?:a|es|as)?|maric(?:a|as|on|ona|ones|onas)|estupid[oa]s?)\b/u;

export function containsOffensiveLanguage(content: string): boolean {
  const words = content
    .normalize("NFKD")
    .replace(/[\p{M}\p{Cf}]/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ");
  return STRONG_PROFANITY.test(words);
}
