# CHECKPOINT BANUCHAT — OE1-D5.4C

Fecha: 28 de octubre de 2026, America/Bogota.  
Estado: **SUPPLEMENT_PREPARED**.

## Preflight y decisiones

- Rama `main`; HEAD inicial `2ca4436c1f4a9723979d104d1daa1c4ae40326c1`; estado Git inicial limpio.
- Se leyeron `AGENTS.md` y los checkpoints D5.3, D5.4A y D5.4B.
- `node eval/rag-quality/review-ccd-1.4.mjs summary`: 29 candidatas, **29 aprobadas**, 0 pendientes, 0 rechazadas, 0 solicitudes de corrección, 29 eventos. El banco conserva SHA-256 `0f7c22993956c3e6ec1ea11c50071eb41c86e6141a45dc43787467d878fba3bf` y el ledger principal sigue vinculado a ese hash.
- El ledger auxiliar privado `data/ccd/local/oe1-evaluation/review-ledger-supplement-ccd-1.4.0-d5-4b-v1.jsonl` existe y está ignorado por Git. Su cabecera enlaza el suplemento D5.4B mediante SHA-256 `96658a679e582fad88f0968213647eeb298911be705650c77c8b48fa44b552e7`. Tiene exactamente cuatro eventos `approved`, para los IDs nuevos correspondientes a los históricos 002, 003, 004 y 006, sin duplicados. Todos los IDs existen en ese suplemento; cada evento registra responsable, motivo específico y fecha UTC válida. El identificador del revisor coincide con el usado en el ledger principal. La identidad civil no es verificable solo a partir de estos archivos.
- Hay así **33 registros de aprobación atribuidos al autor**, distribuidos en dos ledgers. La comprobación acredita integridad estructural y vinculación por hash, no revisión humana independiente.

El ledger principal usa cabecera `oe1-ccd-1.4-review-ledger-v1` con `bank_sha256` y eventos con `reviewed_at`. El auxiliar usa cabecera `banuchat-oe1-supplement-review-v1` con `decision_source` y `supplement_sha256`, y eventos con `recorded_at_utc`. La CLI principal no interpreta directamente este esquema auxiliar. Su futura integración requiere preservar ambas procedencias y no trasladar decisiones de forma silenciosa.

## Casos restantes y suplemento nuevo

La matriz privada identificó exactamente los cuatro `REQUIERE_REFORMULACION` restantes, excluyendo las 29 candidatas originales, el suplemento D5.4B y el caso 009 sin respaldo suficiente: `OE1-CCD-C-010`, `OE1-CCD-C-012`, `OE1-CCD-C-013` y `OE1-CCD-C-015`.

Se prepararon **4 propuestas nuevas** y **0 casos sin resolver dentro de este bloque**. El 009 sigue sin resolver en D5.4B. Las propuestas delimitan, respectivamente, programación de jornadas diagnósticas, alternativas para un pilar pendiente, responsabilidades de orientación y matrícula, y alcance de una convocatoria histórica. La última no afirma gratuidad ni derecho actual a repetir.

Archivo nuevo y privado: `data/ccd/local/oe1-evaluation/supplement-ccd-1.4.0-d5-4c-v1.json`, SHA-256 `093f895f10e2e6bfe498b491796359a765b617e34a03c1688d713f91d7fa071e`, ignorado por Git. Sus cuatro casos contienen ID histórico y nuevo, pregunta y respuesta propuestas, cinco contextos gold en cinco unidades actuales, periodo, población, procedencia, condiciones, excepciones, justificación y `draft_pending_author_review`. No incluyen aprobaciones importadas ni decisiones nuevas.

## Validación y límites

- La release current y el manifest CCD 1.4.0 coincidieron con las identidades esperadas. Mediante transacción PostgreSQL `READ ONLY` se resolvieron versión, chunk, ordinal y localizador de los cinco contextos; todos estaban `ready` y con embedding. Los hashes locales coincidieron con `source_sha256` y con el texto del chunk publicado. No se ejecutó retrieval.
- Los cuatro IDs son únicos y no colisionan con las 29 candidatas ni con las cuatro del suplemento D5.4B. Preguntas y respuestas no están vacías; una comparación temática y de redacción no identificó equivalentes en los 33 casos anteriores.
- Se comprobaron de nuevo los hashes del banco de 29, su ledger, el suplemento D5.4B y su ledger auxiliar; todos permanecen intactos. El benchmark histórico CCD 1.2.0 conserva SHA-256 `1e007142c2a573d9f2e4403e28b8eaae7dfe03cd31d1a514ee97423a7617609e`.
- Parte de la orientación actual combina `DOCUMENT_SOURCE` con `DOMAIN_CONFIRMATION`; la convocatoria del caso 015 es histórica y de población limitada. Ninguna propuesta acredita elegibilidad, matrícula o derecho individual. El autor debe cotejar las cuatro con las fuentes autorizadas y decidir cada una manualmente. El corpus sigue sin ratificación institucional formal ni revisión humana independiente; permanecen los límites metodológicos de D5.3.

Siguiente paso recomendado: revisión individual del suplemento D5.4C por el autor y definición posterior de una integración trazable de los tres bancos y sus ledgers. No se modificaron producto, evaluador, PostgreSQL, releases, Docker, bancos o ledgers previos. No se ejecutaron baseline, generación, retrieval ni RAGAS. `git diff --check` se ejecutó sin errores. No hubo commit ni push.
