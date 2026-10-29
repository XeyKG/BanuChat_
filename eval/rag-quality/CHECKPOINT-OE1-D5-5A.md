# CHECKPOINT BANUCHAT — OE1-D5.5A

Fecha: 29 de octubre de 2026, America/Bogota.
Estado: **ASSEMBLED_PENDING_GOLD_AUDIT**.

## Preflight y fuentes

- Rama inicial `main`; HEAD `7a501b91338f9ce4052cdfdc8d90585471443dcf`; árbol de trabajo inicial limpio. Se leyeron `AGENTS.md`, los checkpoints OE1-D5.3 a D5.4G y el protocolo académico OE1.
- PostgreSQL Unified se consultó en transacción `READ ONLY`: release current `10af4ffd-effb-41fc-bbfe-4dc48cb3398f`, estado `ready`, contrato `ccd-1.4.0`, manifest SHA-256 `fde23cabe95c83f5bd632d129312ad68c90624e6ebd489e79e98c6a3d0d96852`; 107 versiones documentales, 107 chunks y 107 embeddings.
- Se verificaron las seis cabeceras de ledger y su vínculo SHA-256 al banco correspondiente. Cada decisión tiene ID existente y único, `approved`, motivo, identificador de responsable y fecha válida. Hay **45 decisiones distintas**: 29 + 4 + 4 + 3 + 1 + 4. El ledger D5.4G contiene exactamente los cuatro IDs `OE1-CCD-14-N-001` a `N-004` y está vinculado al SHA-256 esperado. La coincidencia de identificador entre ledgers no autentica identidad civil ni constituye revisión independiente.

| Origen | Casos | SHA-256 banco | SHA-256 ledger |
| --- | ---: | --- | --- |
| Principal | 29 | `0f7c22993956c3e6ec1ea11c50071eb41c86e6141a45dc43787467d878fba3bf` | `a55839aabacdb1342e318788ebd20422c33ae5783db045bc6ec91a0b62cde27a` |
| D5.4B | 4 | `96658a679e582fad88f0968213647eeb298911be705650c77c8b48fa44b552e7` | `77ee1ceba310b23cc5ea820c290cf15e7f8c06506f255516024766ace6b6e24b` |
| D5.4C | 4 | `093f895f10e2e6bfe498b491796359a765b617e34a03c1688d713f91d7fa071e` | `2c8c2aacf85d80d14adb24c792ba9f23b25a2328a1ee76d797ffaa07993fe069` |
| D5.4D | 3 | `dff70bef2c687d6b5665ad00f944f628f43014e329a581ef1e75687f9037319e` | `67edf121e0e1524c05d1d2a83bc41830e63f6dc770a3e5461800a1a0c08faf14` |
| D5.4E | 1 | `40a3bc7d623209b6a83d90919022af4295d232ef25ef46287363d8767b0f03ab` | `74845df2668f023a671542a0995bb69eee0f8ce77d49aad61e0f540412b888fb` |
| D5.4G | 4 | `34058c7e2d5ac8951b8f5fb23c142940a3d4ab5c314d8dc7a38768554f031096` | `3b538a53a2c17bda4818b840facfe366f7bcdc142bfafe311c53552701116001` |

Todos los bancos y ledgers siguen ignorados por Git. El benchmark histórico CCD 1.2.0 conserva SHA-256 `1e007142c2a573d9f2e4403e28b8eaae7dfe03cd31d1a514ee97423a7617609e`.

## Ensamblaje e integridad

- Se creó `data/ccd/local/oe1-evaluation/approved-benchmark-ccd-1.4.0-v1.json`, ignorado por Git, con ID `banuchat-oe1-ccd-1.4.0-assembled-v1`, esquema `oe1-ccd-1.4.0-assembled-v1` y estado `assembled_pending_gold_audit`. **SHA-256: `810794a83b40eb95a064532283cb9f7f59a6137b984f730952ed60f662ee2324`.** El nombre del archivo refleja las decisiones del autor; no declara el gold congelado.
- El ensamblador `eval/rag-quality/assemble-ccd-1.4.mjs` incorpora 45 casos con 45 IDs únicos: **41** `historical_remap` y **4** `new_coverage_case`. Registra fecha real, identidad de release y manifest, hashes de las 12 fuentes, índice y hash del caso original, línea y hash del evento de aprobación. Normaliza `reviewed_at` y `recorded_at_utc` a `approval.recorded_at` y conserva el nombre del campo de origen. El estado `draft_pending_author_review` del banco se preserva como `source_candidate_status`; el estado del caso consolidado expresa aprobación del autor con auditoría de gold pendiente. No se transfirió el campo de revisión borrador como si fuera una aprobación.
- Una comprobación independiente releyó los 45 casos y sus eventos: pregunta, respuesta, contextos, periodo, población y restricciones coinciden exactamente con el banco de origen; IDs, hashes de caso, hashes de evento, líneas, decisiones, responsables y motivos coinciden con los ledgers. **Cero diferencias.** No se reconstruyeron aprobaciones.
- Las 65 referencias gold, correspondientes a 40 unidades distintas, resolvieron en la publicación current por `document_key`, versión, chunk, ordinal, localizador, ruta y SHA-256. Los artefactos privados locales coinciden por hash y contenido con el chunk publicado; todos los chunks tienen embedding. No se detectó un defecto estructural demostrado. Esta resolución no demuestra que estén **todos y solo** los contextos pertinentes.
- El cribado detallado quedó en `data/ccd/local/oe1-evaluation/gold-audit-ccd-1.4.0-v1.json`, también ignorado por Git; SHA-256 `58fe455aec04d4423274d11c7d50ee6fbeef319e4ed5bb43125a56c5a4d0eee1`.

## Auditoría de gold: riesgos, no dictámenes

El cribado encuentra 26 casos con un solo contexto, 18 con dos y uno con tres. Trece respuestas de 150 caracteres o más tienen un solo contexto: requieren cotejar cada afirmación y buscar soportes adicionales, pero su longitud por sí sola no prueba insuficiencia. Se marcaron 14 casos con `DOMAIN_CONFIRMATION` y dos con `INFERENCE`; en particular debe distinguirse la fuente documental de la confirmación del autor y evitar atribuir a cualquiera ratificación institucional. Hay seis casos cuyos contextos expresan periodos distintos y cuatro con poblaciones distintas; el autor debe comprobar que pregunta y respuesta delimitan las condiciones y excepciones aplicables.

Las 45 preguntas son distintas tras normalización textual. Un cribado de tokens identificó siete pares con solapamiento Jaccard de al menos 0,30; la mayor coincidencia fue 0,42. Esto señala posibles redundancias, no duplicación semántica demostrada. También falta comprobar si otras unidades de las 107 publicadas añaden evidencia pertinente o contradicen el gold: las 40 unidades referenciadas no equivalen a cobertura representativa del corpus. La revisión de suficiencia y completitud semántica queda **pendiente del autor**. Cualquier corrección de pregunta, respuesta o contextos deberá producir nueva versión trazable y revisión correspondiente; no se alteró el gold actual.

El protocolo contempla 50 casos respondibles o una aceptación académica expresa de una muestra menor. El banco ensamblado contiene 45; no se agregaron preguntas de relleno. Persisten nueve históricos sin candidata, la ausencia de reserva verdaderamente no vista, revisión únicamente por el autor, falta de ratificación institucional del corpus, aceptación pendiente de MRR@5 como operacionalización del criterio original y la limitación conocida del juez `AnswerRelevancy` de 7/12 coincidencias técnicas.

## Compatibilidad técnica pendiente

El validador histórico `oe1-core.mjs` exige esquema `1.0.0`, ID y estado del benchmark CCD 1.2.0, objeto `corpus` con 12 documentos/chunks y `ccd-1.2.0`, exactamente 50 IDs con patrón antiguo y un campo `review` por caso. El nuevo artefacto usa 45 IDs CCD 1.4.0, `sources` y `approval` trazable, además de `release_id`, `manifest_sha256` y contrato en el nivel superior. Se requiere un validador específico para este esquema que compruebe fuentes, aprobaciones y release sin relajar el validador histórico.

El runner actual accede a `benchmark.corpus`, por lo que tampoco puede leer directamente el nuevo esquema. Habría que adaptar su preflight de solo lectura y su resolución de gold, además de definir el mapeo de campos y el control de configuración, antes de usarlo. El retrieval evaluativo actual llama `retrieveDocumentChunksForQuery` con `top_k=5`; el flujo productivo `ccd-knowledge` usa filtros de tema/curso y claves de documento, una recuperación inicial `top_k=20` y selección posterior de evidencia. Se debe decidir si medir el ranking vectorial directo o el camino documental real del producto y declarar la diferencia antes de interpretar MRR@5, Precision@5 y Recall@5. No se cambió ningún validador, runner ni configuración.

## Verificación y siguiente paso

`node --check eval/rag-quality/assemble-ccd-1.4.mjs` pasó. `node --test eval/rag-quality/assemble-ccd-1.4.test.mjs` pasó **2/2**, usando únicamente fixtures sintéticos: ensamblaje y trazabilidad, rechazo de hash cambiado, aprobación ausente, ID duplicado y contexto incompleto. La consulta PostgreSQL fue de solo lectura. `git diff --check` pasó.

Siguiente tarea técnica recomendada: revisión final por el autor, caso por caso, de suficiencia y exclusividad de gold, límites temporales/poblacionales y redundancias señaladas; acordar académicamente el tamaño de muestra y las métricas. Después, preparar un validador y preflight CCD 1.4.0 que preserven las guardas históricas y expliciten el camino medido. Hasta entonces el benchmark permanece `assembled_pending_gold_audit`; no está listo para congelación ni evaluación.

No se modificaron los seis bancos, seis ledgers, benchmark histórico, PostgreSQL, Docker, releases, producto, RAG, modelos, embeddings, prompts ni `top_k`. No se ejecutaron retrieval, generación, baseline ni RAGAS. No hubo commit ni push.
