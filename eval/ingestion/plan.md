# Plan de pruebas de ingesta reproducible

Estado: plan general con ejecución parcial documentada. Las filas I01–I24 son
expectativas, no resultados PASS/FAIL por sí solas. N3 aporta evidencia operacional
del camino manual local además de R1–R6 de recovery/retry de Implementación 4; véanse
las evidencias separadas abajo. No convierte I01–I24 completos en PASS.
Especificación: [ingesta reproducible](../../docs/ingesta-reproducible.md).
Este plan no modifica ni reemplaza la suite SQL A–K existente.

## Preparación futura, con autorización separada

Usar entorno desechable con SQL vigente, roles mínimos y READ COMMITTED, revisión
sintética aprobada identificable, manifest 18 files/76 items y receta fijada.
Conservar una release anterior current para pruebas de fallo/cambio. Las variantes
inválidas se prepararán en copias aisladas de prueba, nunca sobre el corpus congelado.
Habrá pruebas unitarias de adaptadores y E2E con PostgreSQL/Ollama/N8N reales; no
confundir dobles de prueba con evidencia de generación real o rendimiento.

Captura común: SHA fuente/código/workflow, hashes canónicos y brutos distinguidos,
configuración/digest/runtime efectivos, IDs release/run y attempt_no, conteos por
kind/estado, current antes/después, tiempos y códigos seguros. No secretos, stacks,
payloads completos ni supuestos resultados. Conservar salida de catálogo y consultas
de verificación; no basta que el workflow aparezca verde.

## Escenarios críticos

| ID | Precondición | Acción futura | Resultado esperado | Evidencia a capturar | Tabla / función relevante |
| --- | --- | --- | --- | --- | --- |
| I01 | Base migrada vacía, aprobación/receta válidas | Ejecutar manual v1 | Dataset/config reales; una release ready/current; run succeeded y 76 processed; 12 versiones, 60 chunks con vectores | Catálogo, manifest↔registros, digest, conteos y puntero | datasets, embedding_configs, dataset_releases, ingestion_runs/items, release_records, publish_release |
| I02 | Misma identidad ready/current | Repetir ejecución | already_current; ningún run/release/embedding nuevo | Conteos antes/después y cero llamadas de generación | dataset_releases, datasets, ingestion_runs |
| I03 | Bytes de fuente no coinciden con SHA | Solicitar ingesta de copia alterada | SOURCE_REJECTED en preflight, sin tocar candidata/current | Hash declarado/real y ausencia de DML | manifest y controles TS; dataset_releases/datasets sin cambios |
| I04 | Catálogo inválido; variante aislada con hashes coherentes | Validar schema | VALIDATION_FAILED antes de candidata | Error de propiedad seguro y ausencia de escrituras | Preflight TS, validate_manifest complementario |
| I05 | Working tree funcional dirty, manifest postcommit, SHA distinto o imposible de resolver | Probar cada variante | Rechazo aun si README dice approved | HEAD declarado/observado, comparación de blobs y estado intacto | Preflight Git; dataset_releases.git_revision |
| I06 | Run abierto con parte ya persistida | Interrumpir Ollama durante generación | Pending cerrados failed, run failed, candidata failed; current anterior intacto | Llamadas fallidas, tiempos, estados y puntero | ingestion_items/runs, document_chunks, datasets |
| I07 | Candidata staging parcialmente procesada | Inyectar fallo tras commit de un item | Parciales conservados, sin publicación; no borrar evidencia | Filas parciales e intento fallido conservados | guard_corpus_write, validate_ingestion, dataset_releases |
| I08 | I07 fallida, misma identidad y dependencias restauradas | Retry explícito | Nueva attempt_no; estructurados exactos skipped, faltantes processed; documentos/vectores de run fallido reprocesados; 76 resultados del nuevo run succeeded | Lista completa de 76, result_code, origen/tiempos de versiones y vectores; ningún relabel ficticio | ingestion_items/runs, document_versions/chunks, assert_release_complete |
| I09 | Doc-011/doc-012 full_document | Ingerir y tratar de producir chunk en prueba negativa | Dos versiones ready, hash de archivo, cero chunks/embeddings; inserción prohibida | Consulta por modo y error esperado | documents, document_versions, validate_chunk |
| I10 | Diez documentos chunked congelados | Procesar receta H2 | Seis ordinales 0–5 por documento, 60 vectores finitos no cero de 1024; hashes/localizadores/textos exactos | Conteos, hashes de extracción/chunks y dimensiones; fuente intacta | document_chunks, validate_chunk, text_sha256 |
| I11 | Falta item, registro, vector o existe extra | Intentar cierre/publicación | Rechazo; rollback de succeeded; run luego failed; current intacto | Estado antes/después y error de completitud | assert_release_complete, guard_release, publish_release |
| I12 | Candidata completa y current anterior | Publicar mientras otra sesión observa | Un cambio atómico; lectores ven anterior o nueva completa, nunca mezcla | Dos sesiones, secuencia de lecturas y límites commit | datasets, guard_dataset_pointer, publish_release |
| I13 | Current publicada y otra candidata | Fallar antes y durante transacción final | Current anterior conservada, histórica inmutable | Puntero/hashes antes/después y rollback | datasets, dataset_releases, guard_corpus_write |
| I14 | Ready histórica con receta idéntica, otra current | Solicitar su ingesta normal | already_ready_not_current; cero calls publish_release/embeddings, sin nuevo run | Resumen y puntero sin cambio | Política TS, datasets, publish_release (permite rollback administrativo, no impone esta política) |
| I15 | Dos triggers para mismo dataset | Ejecutarlos concurrentemente | Uno procesa; otro ocupado, sin runs simultáneos o attempt_no duplicada | Locks, responses y orden de intentos | Lock cooperativo TS/PG, ingestion_runs, validate_ingestion |
| I16 | Proceso cae dejando pending/run running | Invocar recoverOrphanedAttempt explícitamente bajo WriterLease; luego retry separado | Cierre fallido anterior con ORPHANED_ATTEMPT; sin criterio de edad ni takeover; nunca alterar run terminal | Exclusión adquirida, estados y attempt_no | ingestion_items/runs, validate_ingestion |
| I17 | Respuesta HTTP perdida alrededor de COMMIT | Consultar status antes de retry | Reconocer publicación si confirmó; no marcar ready como failed; incertidumbre detiene retry | Estado durable y current, respuesta de reconciliación | datasets, dataset_releases, ingestion_runs |
| I18 | Config con distinto digest/runtime/opciones o vector inválido | Retry con cambio / generar cero, NaN o dimensión distinta | No continuar identidad anterior; vector inválido rechazado, current intacto | Config observada/autorizada, errores seguros | embedding_configs, validate_embedding_config, document_chunks |
| I19 | Pointer/FK/path inválido, symlink/junction o fecha imposible | Preflight de variantes aisladas | Rechazo sin reparación ni DML; comprobar también offset America/Bogota | Diagnóstico seguro, bytes fuente sin cambio | Preflight TS; FK y dominios SQL complementarios |
| I20 | Derivados con origen failed pero contenido correcto | Intentar skipped documental y publicar; luego reprocesar realmente | Negativa de completitud en primer caso; procedencia válida solo tras reprocesar/generar en nuevo run | FK de origen, timestamps y llamadas reales de generación | assert_release_complete, document_versions, document_chunks |
| I21 | Representación estructurada exacta y documentos existentes en candidata failed | Retry validando todos los campos | Solo structured exactos skipped/REUSED_EXACT; los 12 documentos se reprocesan, nunca skipped; discrepancia falla | Comparación de fuente/contenido, nuevos tiempos/run de documentos y 76 resultados propios | release_records, ingestion_items, assert_release_complete |
| I22 | Credencial de ingesta mínima y adaptador privado | Intentar TRUNCATE/DDL, entrada de ruta/SQL libre y acceso no autorizado | Rechazo; ninguna fuente o tabla destruida | Privilegios efectivos, respuestas saneadas | Roles futuros; tablas/funciones existentes sin modificar DDL |
| I23 | Runtime verificado en implementation_revision=A y source checkout separado read-only en source_git_revision=B, con A distinto de B y aprobación de B | Ingerir desde runtime A, con raíz fuente B configurada por servidor, no por HTTP | Se usan bytes/manifest/schemas de B; dataset_releases.git_revision=B y pipeline_config.implementation_revision=A; no se exige que A tenga aprobación de contenido | HEAD de ambas raíces o procedencia del build A, hashes de blobs B y bytes leídos, approval_ref y valores persistidos | Preflight TS, dataset_releases.git_revision/pipeline_config/pipeline_sha256 |
| I24 | Runtime válido A; approval_ref autoriza B, pero HEAD del source checkout es C distinto de B, incluso si sus archivos sintéticos coinciden | Solicitar ingesta declarando B | SOURCE_REJECTED antes de cualquier DML; no crear config, candidata ni run y current intacto | HEAD fuente C, SHA aprobado/declarado B, ausencia de escrituras; limpieza de A no habilita la fuente | Preflight de raíz fuente; embedding_configs, dataset_releases, ingestion_runs, datasets sin cambios |

I21 refleja la corrección aprobada para Implementación 4: no se conserva la regla
preliminar de skipped documental. Los errores deliberados se validan por resultado y estado,
no por depender de un texto de excepción PostgreSQL no contractual.

## Criterio y medición

Todos estos escenarios críticos deben cumplir el resultado esperado, incluidas
negativas. Eso no significa que todas las ingestas deliberadamente inválidas deban
publicarse. OE4 comprueba atomicidad, trazabilidad, ausencia de pérdida/mezcla y
preservación de current; registrar duración observada, sin umbral nuevo ni 30 minutos.

OE2: medir aparte tiempo humano previo, disponibilidad→trigger, trigger→publicación,
total desde disponibilidad aprobada y retries. Reportar tasa de documentos correctos
y cobertura de 76 items por intento, con denominadores explícitos y no-op separado.
Objetivos heredados >90% y <24h todavía sin medición; publicación exige 100% de unidades.
Las métricas RAG/RAGAS/usabilidad no se derivan de estas pruebas. La actualización
académica de OE4 queda pendiente; los resultados ejecutados se registran por separado.

## Orquestación N8N manual — N3

N3 ejercitó el camino exitoso manual relacionado con I01: base aislada vacía,
publicación `ready/current`, 76 items procesados, 12 versiones y 60 embeddings.
También ejercitó el comportamiento no-op relacionado con I02: la misma identidad
ready/current devolvió `already_current` sin nueva release, run ni chunks. Esta
evidencia no recaptura por sí sola toda la evidencia exhaustiva exigida por I01 y no
marca I03–I24 como ejecutados. Véase [N3 — E2E N8N manual](results/n3-n8n-e2e-2026-10-02.md).

## Recovery/retry ejecutable — Implementación 4

Entrada: `npm run test:db` en `backend/rag`, base PostgreSQL nueva/desechable
sin tablas ni schema banuchat. Se conserva la migración original y una current de
fixture para verificar fallos sin mover el puntero. EmbeddingClient y vectores
TEST_ONLY; no Ollama real, HTTP ni N8N. Las variantes solo afectan candidatas de prueba.

| ID | Escenario ejecutable | Comprobación |
| --- | --- | --- |
| R1 / I06–I07 | Fallo fixture después de un documento completo y 4/6 de otro | 67 processed conservados, 9 pending→failed, run/release failed, current intacta |
| R2 / I08 | Retry explícito con misma identidad | attempt 2/retry, 76 items nuevos; 64 skipped REUSED_EXACT y 12 processed; 60 vectores nuevos; publicación por finalizeAndPublish |
| R3 | Auditabilidad de ambos intentos | run1 failed/run2 succeeded; 152 items; identidad de release y resultados históricos intactos |
| R4 / I18 | Cambiar source, manifest, implementation_revision, digest, runtime u opciones | Rechazo antes de reabrir; no nuevo run de la candidata |
| R5 / I16 | Terminar conexión dedicada, luego recovery explícito | Sin cierre ficticio tras desconexión; ORPHANED_ATTEMPT bajo lease nuevo; se rechaza dueño activo/run terminal y pertenencia errónea, sin edad |
| R6 / I20–I21 | Documento con 4/6 vectores del intento fallido | Reconstrucción completa: seis nuevos vectores del run2 por chunked, cero del run1; full_document ready sin chunks |

Adicionales: fallo durante staging (retry con 4 skipped/72 processed), rechazo
de diferencias en cada kind estructurado, procedencia y metadata documental,
y fallo de publicación con rollback antes del cierre failed, sin ocultar error original.

Resultados efectivamente ejecutados:
[Implementación 4 — recovery/retry, 2026-09-29](results/implementation-4-recovery-retry-2026-09-29.md).
No extienden PASS a todo I01–I24 ni acreditan métricas OE2/OE4, rendimiento o RAGAS.
