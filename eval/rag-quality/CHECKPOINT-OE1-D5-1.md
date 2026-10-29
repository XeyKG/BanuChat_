# CHECKPOINT BANUCHAT — OE1-D5.1

Fecha: 28 de octubre de 2026, America/Bogota.
Rama: `main`.
HEAD base: `ec907e21e2d4b0700ec7d5f3b92292ea21e4a9e4`.
Estado Git inicial: limpio.
Estado final: **BLOCKED**.

OE1-D5.1 identificó y puso en marcha exclusivamente el PostgreSQL Unified
existente, pero el preflight no puede pasar porque la release congelada en el
benchmark ya no es la release `current` del dataset. No se modificaron punteros,
releases, permisos, credenciales, benchmark ni corpus para forzar un resultado.

## 1. Benchmark verificado

| Campo | Valor |
| --- | --- |
| Ruta privada | `data/ccd/local/oe1-evaluation/approved-benchmark-v1.json` |
| SHA-256 observado | `1e007142c2a573d9f2e4403e28b8eaae7dfe03cd31d1a514ee97423a7617609e` |
| SHA-256 esperado | `1e007142c2a573d9f2e4403e28b8eaae7dfe03cd31d1a514ee97423a7617609e` |
| Coincidencia | Sí |
| Visibilidad Git | Privado, ignorado |

## 2. Identidad PostgreSQL utilizada

Se inventariaron los PostgreSQL existentes mediante `docker ps` y
`docker inspect`, sin iniciar bases históricas. El único contenedor intervenido
fue el vigente indicado por el runbook:

| Campo | Valor verificado |
| --- | --- |
| Nombre | `banuchat-unified-postgres` |
| ID | `874662fc76ea6bd972b7631d7f9e245fa06af2f8331c4af12130cdc7acf2d63e` |
| Scope | `unified-isolated` |
| Puerto publicado | `127.0.0.1:55463` → `5432/tcp` |
| Volumen | `banuchat-unified-data` → `/var/lib/postgresql/data` |
| Base configurada | `banuchat_unified` |
| Estado inicial | `exited` |
| Estado final | `running`; `pg_isready` exitoso |

El volumen existe, usa driver local y tiene label `banuchat.scope=unified-isolated`.
La configuración privada `infra/local/unified/application.json` existe, está
ignorada por Git, coincide en base/puerto y contiene las credenciales vigentes.
No se imprimieron sus valores.

Los otros cuatro PostgreSQL inventariados permanecieron detenidos. En particular,
`banuchat-dev-postgres-ccd-auth-1` en `55453` no se inició para probar al azar.

## 3. Permisos observados

Los roles runtime y MCP de la configuración Unified conectaron a la base correcta
y tuvieron `SELECT` sobre `datasets`, `dataset_releases`, `embedding_configs`,
`document_versions` y `documents`, pero no sobre `document_chunks`. No se les
otorgaron permisos adicionales.

Para el intento definitivo se reutilizaron en memoria las credenciales PostgreSQL
vigentes del contenedor exacto, sin mostrarlas ni persistirlas. Su uso se limitó
a las consultas de lectura implementadas por el preflight y al diagnóstico de
identidad posterior.

## 4. Resultado del preflight

Comando ejecutado:

```powershell
node eval/rag-quality/run-oe1-evaluation.mjs `
  --benchmark data/ccd/local/oe1-evaluation/approved-benchmark-v1.json `
  --preflight-only `
  --output data/ccd/local/oe1-evaluation/results/preflight-oe1-d5-1.json
```

Resultado definitivo: exit code 1,
`Preflight: current_release_id no coincide con el banco.` El runner abortó antes
de crear el archivo privado de resultado. No ejecutó los 50 casos, retrieval,
captura de respuestas, generación ni RAGAS.

## 5. Comparación benchmark–publicación

La consulta diagnóstica posterior fue exclusivamente de lectura y no recuperó
contenido documental.

| Comprobación | Resultado |
| --- | --- |
| Dataset | `banuchat-ccd-local`, coincide |
| Release objetivo | `3d6cedac-0e86-40c8-909b-d3ff6e8ab741`, existe |
| Estado objetivo | `ready`, coincide |
| Contrato objetivo | `ccd-1.2.0`, coincide |
| Manifest objetivo | `ed288f6e79bc099b55cdbb16cae3ea3daa970f67b3c8074cf382c52bdd64d61a`, coincide |
| Pipeline objetivo | `3d6d8c51357a6f325d66efebaf910457f998917b294292e3397e6ddf52402b1d`, coincide |
| Embedding | Ollama `qwen3-embedding:0.6b`, 1024, coseno, coincide |
| Config SHA-256 | `e1441a0aad0547d9db657f20708d585209a7d863c27f1b2b1e05aa42e6546771`, coincide |
| Documentos / chunks / embeddings | 12 / 12 / 12, coincide |
| Contextos gold | 12 identidades únicas; 0 sin resolver |
| Puntero `current_release_id` | **No coincide** |

El puntero actual de Unified es
`10af4ffd-effb-41fc-bbfe-4dc48cb3398f`, publicación `ready` con contrato
`ccd-1.4.0` y 107 documentos, 107 chunks y 107 embeddings. La release objetivo
`ccd-1.2.0` permanece íntegra, pero no es `current`. El contrato del runner exige
que la release evaluada sea exactamente la actual, por lo que el resto de las
coincidencias no permite declarar el preflight exitoso.

## 6. Confirmación de solo lectura

La única mutación operacional fue `docker start banuchat-unified-postgres`,
expresamente permitida tras verificar nombre, ID, scope, volumen y puerto. Todas
las interacciones PostgreSQL fueron `SELECT` o comprobaciones de readiness. No se
ejecutaron migraciones, `UPDATE`, `INSERT`, `DELETE`, DDL, publicación, cambio de
puntero, grants, restauración ni creación de contenedores o volúmenes.

No se ejecutó `docker compose`, baseline, retrieval de evaluación ni RAGAS. No se
modificaron RAG, API, MCP, N8N, Mobile, Docker, SQL, embeddings, `top_k`, prompts,
modelos, documentos CCD, banco o ledger.

## 7. Limitaciones metodológicas pendientes

1. Las 50 preguntas fueron revisadas únicamente por el autor; no existe revisión
   humana independiente ni acuerdo interevaluador.
2. El corpus CCD no cuenta con ratificación institucional formal.
3. Las 15 `reserve_candidate` no constituyen una reserva ciega válida.
4. `AnswerRelevancy` conserva la limitación de 7/12 coincidencias frente a
   expectativas técnicas no ratificadas humanamente.
5. MRR@5 sigue pendiente de aceptación académica como operacionalización del
   criterio original.

## 8. Siguiente paso recomendado

Resolver explícitamente la divergencia temporal sin cambiar silenciosamente el
benchmark ni el puntero productivo. Las opciones requieren una nueva decisión
autorizada: disponer de un entorno aislado legítimo donde CCD `1.2.0` sea
`current`, o preparar y revisar un benchmark nuevo contra CCD `1.4.0`. No usar la
base histórica de `55453`, repuntar Unified ni modificar el runner para eludir la
guardia sin una tarea específica.

OE1-D5.1 termina **BLOCKED**. No avanzar automáticamente a OE1-D6.
