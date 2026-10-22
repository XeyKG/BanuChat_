import type { RetrievedDocumentChunk } from "../application/document-retrieval.js";
import type { ConversationMessage } from "./conversation-context.js";

function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/** A conversational antecedent, not eligibility or institutional evidence. */
export function ccdGuidanceTopic(query: string, history: readonly ConversationMessage[]): 'U03' | 'U04' | undefined {
  const subjects = [query, ...history.filter(m => m.role === 'user').map(m => m.content).reverse()];
  let unsupported = false;
  for (const subject of subjects) {
    const text = normalize(subject);
    unsupported ||= asksUnsupportedTestRule(subject);
    if (/\b(?:contacto|correo|email)\b/u.test(text) || /\b(?:duracion|cuanto duran?|estructura|proposito|resultados?|inmediata|plataforma)\b/u.test(text)) return undefined;
    if (/\b(?:informatica|transicion|antigu\p{L}*|homolog\p{L}*|equivalen\p{L}*|reconoc\p{L}*|word|powerpoint|excel|tec|dual|continuos|cohorte)\b/u.test(text)) return 'U04';
    if (/\b(?:corrijo|correccion|fue)\b.*\bcurso\b/u.test(text)) return 'U03';
    if (/\b(?:reprob\p{L}*|reprueb\p{L}*|pierdo|pierda|perdi|perder|perdido|perdida)\b|\bno (?:\p{L}+ ){0,3}(?:aprob\p{L}*|valid\p{L}*|super\p{L}*)\b/u.test(text)) return 'U03';
    // A fresh, named syllabus must not inherit an earlier test consequence.
    if (/\b(?:ia generativa|marca personal|interaccion digital|analitica digital|contenidos digitales|marco legal|bienestar digital)\b/u.test(text)
      && !/\b(?:eso|equivale|significa|quiere decir)\b/u.test(text)) return undefined;
    if (/\bpruebas?\b/u.test(text) && !asksUnsupportedTestRule(subject)) return undefined;
  }
  return unsupported ? 'U04' : undefined;
}

/** Latest explicit user antecedent distinguishes course recovery from a failed new test. */
export function isCourseFailureContext(query: string, history: readonly ConversationMessage[]): boolean {
  for (const subject of [query, ...history.filter(m => m.role === 'user').map(m => m.content).reverse()]) {
    const text = normalize(subject);
    if (/\bcurso\b/u.test(text) && /\b(?:corrijo|correccion|fue|reprob\p{L}*|reprueb\p{L}*)\b|\bno aprob\p{L}*/u.test(text)) return true;
    if (/\bpruebas?\b/u.test(text) && /\b(?:reprob\p{L}*|reprueb\p{L}*)\b|\bno aprob\p{L}*/u.test(text)) return false;
  }
  return false;
}

/** Scope by the latest explicit student subject, never by vector rank or old assistant claims. */
export function selectCcdEvidence(
  chunks: readonly RetrievedDocumentChunk[], query: string, history: readonly ConversationMessage[],
): RetrievedDocumentChunk[] {
  const subjects = [query, ...history.filter(message => message.role === "user").map(message => message.content).reverse()];
  if (/\b(?:puntos|puntaje|umbral|porcentaje)\b/u.test(normalize(query))) {
    return chunks.filter(chunk => chunk.chunk_locator === 'unit:TEST_ORIENTATION');
  }
  const guidance = ccdGuidanceTopic(query, history);
  if (guidance && chunks.some(chunk => chunk.chunk_locator === `unit:${guidance}`)) {
    return chunks.filter(chunk => chunk.chunk_locator === `unit:${guidance}` || chunk.chunk_locator === 'unit:M12');
  }
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

/** Reject positive authorizations; mentioning a blocked situation or its uncertainty is allowed. */
export function hasUnbackedGuidanceClaim(content: string): boolean {
  const text = normalize(content);
  if (/\b(?:dame|envia|enviame|comparte|indicame|necesito tu|cual es tu) (?:tu )?(?:uid|expediente|notas|calificaciones|documento de identidad)\b/u.test(text)) return true;
  // Money and private identifiers never belong to these two admitted units.
  if (/\$\s*\d|\bU\d{7,}\b/u.test(content)) return true;
  if (/\bno (?:necesitas|tienes que|debes) pagar\b/u.test(text)) return true;
  if (/\b(?:nunca existio|nunca existieron|no existe|no existen|no se otorga|no se permite)\b.*\b(?:procedimiento|convocatorias?|oportunidad|repet\p{L}*|pruebas?)\b/u.test(text)) return true;
  const sentences = content.split(/[.!?;\n]+|\bpero\b|\bsin embargo\b|,\s*(?=(?:puedes|podras|tienes|te corresponde|la prueba es|la primera es)\b)/iu).map(normalize);
  return sentences.some(sentence => {
    const denial = /\b(?:no|sin|tampoco|falta|desconoc|pendiente|no confirmad)\b|\b(?:debe comprobar|comprobar si|verificar si|confirmar si|por comprobar)\b/u.test(sentence);
    if (!denial && /\b(?:puedes|podras|tienes derecho|te corresponde|se permite|esta permitido|pueden|tienen derecho|tendras|tendran)\b.*\b(?:repet\p{L}*|gratis|gratuit\p{L}*|sin costo|oportunidad)\b/u.test(sentence)) return true;
    if (!denial && /\b(?:es|son|sera|seran|presentacion|oportunidad)\b.*\b(?:gratis|gratuit\p{L}*|sin costo)\b/u.test(sentence)) return true;
    if (!denial && /\b(?:queda\p{L}*|esta\p{L}*|tienes|tiene|obtienes|obtiene)\b.*\b(?:homologad\p{L}*|reconocid\p{L}*|pilar|gratuit\p{L}*)\b/u.test(sentence)) return true;
    if (!denial && /\b(?:se valida|se homologa|equivale|cubres|cubre)\b.*\b(?:pilar|curso)\b/u.test(sentence)) return true;
    if (!denial && /\b(?:tienes|tiene|esta|queda)\b.*\b(?:ia generativa|marca personal|interaccion digital)\b.*\baprobad\p{L}*\b/u.test(sentence)) return true;
    if (!denial && /\b(?:matricula|inscri\p{L}*)\b.*\bautomatic\p{L}*\b|\bautomatic\p{L}*\b.*\b(?:matricula|inscri\p{L}*)\b/u.test(sentence)) return true;
    if (!denial && /\b(?:puedes|debes|podras|deberan|deben)\b.*\b(?:hoy|actualmente|vigente)\b/u.test(sentence)) return true;
    return false;
  });
}

export const CCD_GUIDANCE_INSTRUCTION = `Se admiten dos recortes, no políticas generales:
U03: explica la consecuencia descrita para 202660 de no validar un pilar en una prueba nueva: cursar la asignatura correspondiente y gestionar matrícula. Empieza situando ese dato en 202660. No extiendas esa consecuencia a un curso reprobado: para ese caso solo conoces la distinción y la necesidad de verificar el procedimiento específico.
U04: explica la transición de Informática, avance aprobado y necesidad de comprobar reconocimientos. No decidas correspondencias por nombre, AND/OR, códigos ni experiencias relatadas.
Ante gratuidad, continuos o repetición, explica lo que el recorte sí respalda y qué no permite confirmar; no concedas autorizaciones ni niegues que hayan existido casos particulares. Primera presentación nueva, repetición, ausencia, prueba antigua pendiente y curso aprobado son estados distintos. Dos casos relatados refuerzan una hipótesis de procedimiento, no una política ni prueba de gratuidad.
El procedimiento, condiciones, periodos, cohortes, correspondencias y posible beneficio económico de esos casos sigue siendo consulta institucional prioritaria.
Una pregunta que pide un derecho no documentado puede responderse explicando el límite y el contexto conocido; no uses una abstención vacía para evitar esa explicación. Si el usuario añade solo una condición (como no haber aprobado otro curso), conserva el caso y explica la necesidad de comprobar los reconocimientos. No afirmes que no se otorgan oportunidades: solo que no están acreditadas por el recorte. Cita M12 únicamente si realmente das el canal, no por mencionar al CCD.
Cuando uses U03 para una prueba nueva no validada, explica la consecuencia histórica de 202660 incluso si no puedes determinar la regla del periodo consultado; no digas que esa consecuencia histórica no está documentada. Para U04, reconocer el relato de un curso antiguo aprobado no autoriza a reconocer un pilar ni un curso nuevo: explica esa diferencia y qué debe comprobarse. Si el mensaje es solo una afirmación del estudiante, puedes orientar sobre esa distinción sin inventar una decisión personal. No menciones los identificadores U03/U04 en el cuerpo.
No solicites UID, notas, expedientes o credenciales. Pide solo aclaraciones que cambien la orientación, sin repetir un formulario. No atribuyas a las fuentes datos aportados por el usuario. Explica primero lo conocido antes de remitir al CCD; da correo solo si citas M12. Si solo puedes explicar límites útiles, puedes responder con esas fuentes; no hace falta una abstención vacía.
No se han admitido el cronograma/requisitos de pruebas, plataformas/resultados, excepción 202660 de continuos, gratuidad de ingreso, umbrales, tarifas ni equivalencias concretas. No los importes del conocimiento del modelo ni de referencias bibliográficas. Responde esas partes como no demostradas por el recorte disponible.`;

/** TEST_ORIENTATION admits description only, never effects, fees or individual eligibility. */
export function asksUnsupportedTestRule(query: string): boolean {
  return /\b(?:gratuit\p{L}*|gratis|repet\p{L}*|homolog\p{L}*|exen\p{L}*|reconoc\p{L}*|equivalen\p{L}*|elegib\p{L}*|obligatori\p{L}*|oportunidades|puntos|puntaje|pierda\p{L}*|reprueb\p{L}*)\b|\bsin costo\b|\bno asisti\b|\bno (?:l[oa]s? )?presente\b|\bno (?:l[oa]s? )?aprueb\p{L}*/u.test(normalize(query));
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
