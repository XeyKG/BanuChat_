# CHECKPOINT BANUCHAT — OE1-D5.4B

Fecha: 28 de octubre de 2026, America/Bogota.  
Estado: **SUPPLEMENT_PREPARED**.

## Preflight

- Rama `main`; HEAD inicial `7c5789d837fa597305fc8e461fc1ea2a0aa488c4`; estado Git inicial limpio.
- Se leyeron `AGENTS.md`, los checkpoints D5.3 y D5.4A, la matriz privada de remapeo y los metadatos de procedencia actuales.
- `node eval/rag-quality/review-ccd-1.4.mjs summary`: **29 total, 29 approved, 0 pending, 0 rejected, 0 correction_requested, 29 eventos**.
- Verificación adicional de solo lectura: 29 IDs distintos y cubiertos, todos con evento `approved`, motivo, responsable y fecha válidos; cabecera del ledger vinculada al SHA-256 del banco `0f7c22993956c3e6ec1ea11c50071eb41c86e6141a45dc43787467d878fba3bf`. No se crearon ni alteraron decisiones.

## Selección y resultado

De las nueve preguntas `REQUIERE_REFORMULACION` sin candidata, se seleccionaron las primeras cinco por ID histórico: `OE1-CCD-C-002`, `OE1-CCD-C-003`, `OE1-CCD-C-004`, `OE1-CCD-C-006` y `OE1-CCD-C-009`. Se excluyeron las dos reformuladas que ya están en el banco aprobado de 29.

Se prepararon **4 propuestas** (002, 003, 004 y 006) y **1 caso no resuelto** (009). La propuesta 002 delimita la distinción entre ruta, pilar, opción diagnóstica, curso y oferta; la 003 delimita temporalmente un anuncio de oferta; la 004 trata el correo de contacto; la 006 trata los otros medios de contacto. Las propuestas 004 y 006 usan una misma unidad de procedencia mixta, pero preguntan por datos distintos. No se detectó duplicación semántica con las 29 preguntas aprobadas. La 009 se dejó sin candidata porque las opciones diagnósticas actuales relevantes se apoyan solo en `DOMAIN_CONFIRMATION` y la información del Pilar 1 no está suficientemente sustentada; volver a los tres instrumentos históricos duplicaría una pregunta ya aprobada.

Archivo complementario privado: `data/ccd/local/oe1-evaluation/supplement-ccd-1.4.0-d5-4b-v1.json`. SHA-256: `96658a679e582fad88f0968213647eeb298911be705650c77c8b48fa44b552e7`. Está ignorado por Git. Contiene IDs históricos y nuevos, preguntas y respuestas propuestas, cuatro contextos gold sobre tres unidades actuales, versión documental, chunk, localizador, hashes, periodo, población, procedencia, restricciones y motivo. Las cuatro propuestas tienen `draft_pending_author_review` y decisión humana nula. No se trasladaron aprobaciones del ledger.

## Validación y límites

- Las cuatro identidades de contexto se resolvieron en la release `10af4ffd-effb-41fc-bbfe-4dc48cb3398f` mediante consulta `READ ONLY`; versiones `ready`, ordinal 0 y embedding presente. Los hashes de los cuatro artefactos locales coinciden con `source_sha256` publicado, y su texto con el chunk correspondiente. No se ejecutó búsqueda ni se generaron respuestas.
- Los cuatro IDs nuevos son únicos y no colisionan con los 29. Preguntas y respuestas no están vacías. La comparación temática y de redacción no encontró preguntas equivalentes en el banco aprobado.
- El banco de 29 y su ledger conservan sus hashes originales; el benchmark histórico CCD 1.2.0 conserva SHA-256 `1e007142c2a573d9f2e4403e28b8eaae7dfe03cd31d1a514ee97423a7617609e`.
- Las propuestas de contacto mezclan `DOCUMENT_SOURCE` y `DOMAIN_CONFIRMATION`. Su validez temporal, exactitud por canal y alcance operativo requieren cotejo del autor con las fuentes autorizadas. La propuesta sobre oferta está limitada a un periodo documentado y no representa disponibilidad actual. Ninguna confirmación de dominio se presentó como ratificación institucional.
- La revisión de las 29 fue realizada por el autor, sin revisión humana independiente. El corpus no tiene ratificación institucional formal. Las 15 `reserve_candidate` no son una reserva ciega; persisten la limitación de `AnswerRelevancy` (7/12 coincidencias técnicas), la aceptación pendiente de MRR@5 y la divergencia del evaluador respecto del camino documental actual.

Siguiente paso recomendado: el autor revisa individualmente las cuatro propuestas y decide el tratamiento del caso 009; la integración a un banco ampliado y un mecanismo de aprobación trazable quedan para otra tarea. No se modificaron la CLI, los bancos, el ledger, PostgreSQL, Docker ni la configuración productiva. No se ejecutaron retrieval, generación, RAGAS ni baseline. `git diff --check` se ejecutó sin errores. No hubo commit ni push.
