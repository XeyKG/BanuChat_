# Implementación 4 — recovery/retry, 2026-09-29

Validación ejecutada sobre PostgreSQL real desechable; EmbeddingClient y vectores
**TEST_ONLY**, no salida de Qwen. No se ejecutó Ollama real ni se modificó la
E2E acreditada de Implementación 3. Referencia: [plan de ingesta](../plan.md).

## Entorno y ejecución

- Docker Engine 29.7.2 Linux; imagen local `pgvector/pgvector:pg16`, sin pull.
- PostgreSQL 16.15; pgvector 0.8.6.
- Node 24.19.0; npm 12.1.0, dependencias del lockfile existente, sin nuevas dependencias.
- Base final nueva: `banuchat_rag_test_impl4_final`; comprobación de base vacía,
  sin schema banuchat, antes de aplicar la migración original.
- Contenedor exclusivo con puerto loopback y PGDATA tmpfs, sin volumen persistente.
- `npm ci`, typecheck, build y validate:dataset: PASS. Preflight: 18 files,
  76 items, 12 documentos (10 chunked/2 full_document), 60 chunks.
- npm informó cero vulnerabilidades y bloqueo del postinstall de esbuild;
  las validaciones ejecutadas pasaron sin habilitar scripts adicionales.

## Resultados del runner

| Suite final | PASS | FAIL | SKIP |
| --- | ---: | ---: | ---: |
| Unitarias (`npm test`) | 96 | 0 | 0 |
| PostgreSQL (`npm run test:db`) | 37 | 0 | 0 |
| Total observado | 133 | 0 | 0 |

Los 37 incluyen el test contenedor. No se suman las pruebas históricas E2E de
Implementación 3 como si se hubieran ejecutado de nuevo.

## Escenarios R1–R6

| Escenario | Resultado | Evidencia |
| --- | --- | --- |
| R1: fallo controlado de embeddings | PASS | run/release failed; 67 processed intactos y 9 failed; current anterior intacta; 10 vectores parciales, distribuidos 6+4 |
| R2: retry explícito | PASS | run nuevo, attempt 2, trigger retry; 64 structured skipped/REUSED_EXACT y 12 documentos processed; 60 vectores nuevos; assert_release_complete PASS y ready/current |
| R3: auditabilidad | PASS | run1 failed y run2 succeeded; 152 items; snapshot íntegro de run1/items terminales; identidad/imported_at de release preservados |
| R4: identidad distinta | PASS | source, manifest, implementation_revision, digest, runtime y opciones distintos rechazados sin reabrir ni crear run de retry |
| R5: huérfano explícito | PASS | Conexión dedicada terminada en prueba; cierre con lease perdido rechazado, run sigue running; recovery explícito cierra ORPHANED_ATTEMPT, sin edad; terminal/dueño activo/pertenencia errónea rechazados |
| R6: 4/6 embeddings | PASS | Chunks candidatos reemplazados, IDs de document_versions preservados; seis vectores nuevos por chunked, todos de run2; cero chunks finales de run1; dos full_document ready/processed sin chunks |

## Intentos canónicos observados

IDs efímeros de esta ejecución, no identidades estables del proyecto:

- Release R1–R3/R6: `c768a0e0-0165-42aa-aff6-78e44dbe3d7d`.
- Run1: `6e8dfdd1-2fb7-4144-8dca-047272b7bfc7`.
- Run2: `2b0b9e2f-3190-462e-8218-50728edefa24`.

| Campo | Run1 | Run2 |
| --- | --- | --- |
| attempt_no | 1 | 2 |
| trigger_type | manual | retry |
| status | failed | succeeded |
| error_code | OLLAMA_UNAVAILABLE | null |
| processed | 67 | 12 |
| skipped | 0 | 64 |
| failed | 9 | 0 |
| pending | 0 | 0 |
| total items propios | 76 | 76 |

Tras R2: 12 versiones ready, 60 chunks y 60 embeddings TEST_ONLY de run2;
release ready/current y assert_release_complete PASS. Los 64 skipped son el
resultado de este escenario, no una constante impuesta por el código.

## Otros escenarios y estado final de la suite

- Fallo al insertar el quinto curso: run1 con 4 processed/72 failed; retry
  succeeded con 4 skipped/72 processed. Se insertaron las representaciones faltantes.
- Diferencias en courses, announcements, profiles, calendar_events, profile_courses,
  source_locator y metadata documental: DATABASE_INVARIANT; el nuevo intento volvió
  a failed, sin reparaciones silenciosas ni cambios de current.
- Fallo inyectado en publicación: rollback de succeeded; luego failed/failed,
  conservando los 76 items processed, error original y current anterior.
- La prueba adicional de staging incompleto publicó posteriormente otra candidata:
  `645d806a-2124-4490-a7a6-cf28fd0a32cf`, que quedó ready/current al final de la suite.
  Su run2 `a64e92aa-c9aa-4f0c-a2e5-98b6b65bcd11` terminó succeeded (attempt 2/retry).
  Se verificó assert_release_complete PASS y 60 chunks/60 embeddings para esa current.
  La release canónica R2 permaneció ready histórica; los fallos posteriores no movieron current.

## Límites

El core solo persiste códigos allowlisted, no mensajes nativos ni secretos.
La recuperación es una decisión explícita, no detección automática por edad.
Una desconexión o COMMIT incierto exige inspección posterior; no hay reconexión,
retry automático, scheduler ni cola. Los runs/items históricos se conservan;
las versiones/chunks staging son candidatos reparables, no un log de cada vector
parcial histórico. El retry regenera, no cambia únicamente el origen de vectores viejos.

Pendientes: approval registry operativo, procedencia automática de implementation_revision,
permisos mínimos, montajes read-only, HTTP interno, N8N, retrieval productivo y
Agent/RAG. Las revisiones/configuraciones de fixtures no acreditan procedencia
operacional. No se midieron RAGAS/MRR ni tasas, latencias u objetivos OE2/OE4.
