# CHECKPOINT BANUCHAT — OE1-D5.4G

Fecha: 28 de octubre de 2026, America/Bogota.  
Estado: **COVERAGE_SUPPLEMENT_PREPARED**.

## Preflight e identidad

- Rama `main`; HEAD inicial `74580ab81e61b64df74b85180a0e44d39defb547`; estado Git inicial limpio.
- Se leyeron `AGENTS.md`, D5.4F y la matriz privada de cobertura de 107 unidades.
- Se verificaron **41 aprobaciones válidas y distintas** en cinco ledgers privados: 29 + 4 + 4 + 3 + 1. Las cabeceras siguen vinculadas a los SHA-256 de los cinco bancos; IDs, motivos, responsables y fechas son válidos. Todos esos bancos y ledgers están ignorados por Git. No se reconstruyó ni creó una decisión humana.
- PostgreSQL Unified confirmó en transacción `READ ONLY` la release current `10af4ffd-effb-41fc-bbfe-4dc48cb3398f`, estado `ready`, contrato `ccd-1.4.0` y manifest SHA-256 `fde23cabe95c83f5bd632d129312ad68c90624e6ebd489e79e98c6a3d0d96852`.
- Los cinco bancos aprobados conservan los hashes de D5.4F. El benchmark histórico CCD 1.2.0 conserva SHA-256 `1e007142c2a573d9f2e4403e28b8eaae7dfe03cd31d1a514ee97423a7617609e`.

## Selección documental

Se examinaron **4 familias** y las cuatro produjeron una candidata defendible, máximo una por familia:

| Familia | Cobertura anterior y aporte del caso nuevo | Límite que deberá comprobar el autor |
| --- | --- | --- |
| Herramientas básicas | No tenía unidades gold; se propone contenido de un temario histórico. | Atribuirlo a la edición documentada, sin inferir oferta actual. |
| Evaluación de experiencia | No tenía unidades gold; se propone la estructura de un instrumento entregado. | La fecha y vigencia del procedimiento no quedan probadas solo por el instructivo. |
| Horas y créditos | No tenía unidades gold; se distingue carga horaria y créditos operativos del plan profesional. | Aplicar cifras solo a la edición del syllabus y a la población documentada. |
| Modalidades o procedimientos | Se propone una regla general de modalidad distinta de la oferta fechada ya evaluada. | La modalidad real depende de cada oferta; no garantizar las tres para cada curso. |

Cada caso tiene al menos un soporte `DOCUMENT_SOURCE`. En evaluación de experiencia y horas/créditos aparece además `DOMAIN_CONFIRMATION`, identificada por separado; no se convirtió en ratificación institucional. Se cotejaron los contenidos de las unidades antes de redactar. La comparación de conceptos y preguntas con las 41 aprobadas no mostró duplicación evidente: los cuatro casos tratan hechos nuevos, aunque el autor debe volver a revisar fuentes alternativas y completitud del gold.

## Artefactos privados y validaciones

Ambos archivos están exclusivamente en `data/ccd/local/oe1-evaluation/` e ignorados por Git:

| Artefacto | SHA-256 |
| --- | --- |
| `supplement-new-coverage-ccd-1.4.0-d5-4g-v1.json` | `34058c7e2d5ac8951b8f5fb23c142940a3d4ab5c314d8dc7a38768554f031096` |
| `review-packet-new-coverage-ccd-1.4.0-d5-4g-v1.md` | `632c505b9b6bb26ab694b80e3d21b3d78f2e5ec24c6c1a1aefc4ebc2414c99f7` |

El suplemento contiene **4 candidatas nuevas** con IDs estables de serie `OE1-CCD-14-N`, origen `new_coverage_case`, familia, pregunta y respuesta privadas, cinco contextos gold en cinco unidades previamente no referenciadas, versión/chunk/localizador/hashes, procedencia, periodo, población, condiciones, excepciones y motivo de cobertura. Las cuatro están `draft_pending_author_review` con decisión humana nula. No representan los nueve históricos no evaluables.

Las cinco identidades de contexto se resolvieron en la release current con versión `ready`, ordinal y localizador exactos y embedding presente. Cada artefacto local coincidió con `source_sha256` publicado y el contenido del chunk. Preguntas y respuestas no están vacías; los cuatro IDs son únicos y no colisionan con las 41 aprobadas. Los dos archivos nuevos están ignorados por Git. Las 41 aprobaciones y los nueve históricos sin candidata siguen intactos.

## Decisión siguiente y límites

El autor debe cotejar individualmente las cuatro preguntas, respuestas, **todos** los contextos y fuentes originales, comprobar periodo/población, procedencia, restricciones y alternativas de gold, y registrar decisiones humanas en un mecanismo nuevo ligado al SHA-256 de este suplemento. La CLI actual no integra estas preguntas; no se trasladarán decisiones de ledgers anteriores.

**No consolidar inmediatamente**: hay 41 casos históricos remapeados y aprobados más cuatro candidatos nuevos aún sin revisión. Añadir cuatro unidades al gold propuesto no demuestra cobertura representativa de 107 unidades ni completitud del banco. Después de la revisión del autor corresponde decidir el tamaño de muestra, comprobar duplicaciones y gold, consolidar bancos y ledgers con trazabilidad y resolver la adecuación del evaluador al camino documental actual. Persisten la ausencia de ratificación institucional y revisión humana independiente, MRR@5 pendiente de aceptación y la limitación conocida de `AnswerRelevancy`.

No se modificaron bancos, suplementos ni ledgers anteriores, ni CLI, evaluador, PostgreSQL, releases, producto, RAG, modelos, embeddings, prompts o `top_k`. No se ejecutaron retrieval, generación, baseline ni RAGAS. `git diff --check` se ejecutó sin errores. No hubo commit ni push.
