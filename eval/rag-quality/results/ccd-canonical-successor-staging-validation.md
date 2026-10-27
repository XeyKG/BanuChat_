# BanuChat — P4-B.2: materialización y evaluación de sucesora staging

## A. Estado Git inicial

Inicio `2026-10-27T16:42:33.713034-05:00`; cierre `2026-10-27T16:47:51-05:00`, America/Bogota. HEAD real esperado y
observado: `0e2c3721606f9d305080f0e10f7933008059b845`; branch `main`; working tree limpio.
No había cambios preexistentes. Se leyó AGENTS.md completo y se consultaron únicamente
los informes P4-B/P4-B.1, promoción 1.3, checkpoint unificado y fuentes/scripts
necesarios para el preflight y la operación solicitada. No se cambió de branch,
ni se hicieron commit, push u operaciones destructivas.

## B. Estado del entorno y recursos iniciados

La configuración privada habitual y la administrativa existentes se leyeron en
memoria, sin copiar credenciales ni imprimirlas. La configuración identifica
`banuchat_unified`, puerto PostgreSQL loopback 55463 y la URL local habitual de Ollama.

`banuchat-unified-postgres` estaba detenido. Se comprobó su ID exacto, label
`banuchat.scope=unified-isolated`, volumen `banuchat-unified-data` con el mismo scope,
mount de datos, POSTGRES_DB y publicación exclusiva `127.0.0.1:55463` hacia 5432.
El inventario Docker no encontró otro contenedor que compartiera ese volumen o puerto.
Se ejecutó únicamente `docker start banuchat-unified-postgres` para acceder a la DB.
Tras los snapshots se verificó de nuevo el ID y se restauró su estado detenido con
`docker stop banuchat-unified-postgres`, preservando volumen e historial.

Ollama ya estaba accesible; no se inició/detuvo ese runtime. No hubo instalación,
pull, cambio de modelos/parámetros, reprovisión, Compose up/down, restauración, dump,
importación ni modificación de N8N u otros contenedores.

## C. Snapshot current/releases antes

Se obtuvo un snapshot REPEATABLE READ / READ ONLY. Identidad viva:
`current_database()=banuchat_unified`, product_config versión 1, dataset ID 1
`banuchat-ccd-local`. Se registraron seis releases y sus runs/configuraciones,
conteos/fingerprints de 43 tablas, contextos y demás corpus/auth/auxiliares;
21 roles, memberships, owners/ACL de schemas/tablas/columnas y 29 funciones con hashes.
Credenciales y datos de auth se representaron únicamente mediante conteos/fingerprints,
sin volcar sus filas. Los atributos de roles excluyen passwords.

Current real: `f01c1c37-2d3f-4bc7-8940-fe724eb71c9a`, ready, `ccd-1.3.0`, con
87 documentos/chunks/embeddings. Manifest SHA
`9bde9ff3c1bd9cd29906751de86d7ed31bece30077b9639042b79d221104da4e`.
Las candidatas `2be94dbf-f3cf-49ad-85b9-55bb6cea01c8` y
`768cded3-0093-4c47-942d-0bead66612c2` estaban staging, cada una con 107 documentos,
chunks y embeddings de dimensión 1024 y norma positiva; cero bindings de versión.
Las identidades históricas coincidieron sin DML correctivo.

## D. Verificación de corpus/adopción

Se reutilizó la copia privada estable sanitizada canónica P4-B, identificada en la
evidencia como P4B_CANONICAL_STABLE_BUNDLE. No se usó el snapshot de evaluación como
corpus operacional ni se materializó otra copia.

Adoption SHA exacto:
`4824a74e21029a1964d681958b8ca452b35c14de3a1d6c94cd3516c079abf81e`.
107 claims/artifacts, 81 IDs preservados respecto a current y 26 nuevos; adoption
`ccd-knowledge-adoption-2`, dataset histórico `ccd-1.4.0`, knowledge `ccd-knowledge-2`.
Los claims se cotejaron completos con el manifest vivo histórico 768c.

Pasaron 135 comprobaciones SHA de bytes: 107 artifacts, 25 referencias fuente y
source-registry/source-review/domain-decisions. No se cambió contenido ni metadata,
no se copiaron originales externos. Los hashes actuales de los dos módulos CCD
API/RAG coincidieron con la evidencia sellada del hardening P4-B.1. Estas lecturas
son comprobaciones de integridad; **no sustituyen captureCcdCode ni se presentan
como una preparación protegida o ingesta ejecutada**.
También coincidieron 12 archivos históricos inspeccionados con sus sellos previos;
no se sobrescribieron carpetas P4-B/P4-B.1.

## E. Verificación de Ollama/configuración

Se inspeccionó Ollama usando exclusivamente la URL de la configuración unificada.
La configuración completa obtenida por OllamaClient.inspect coincidió estructuralmente
con la configuración efectiva derivada de la release histórica 768c: provider/model,
digest/revisión, dimensión, distancia y parámetros document/query/runtime. Config ID
`d7fb7a32-bf06-418b-b411-d0c7b33d5663`; modelo `qwen3-embedding:0.6b`, 1024 dimensiones,
coseno. No se resolvió ni insertó otra configuración en PostgreSQL.

Para el generador se cargó la configuración normal del producto y se cotejaron
versión real de runtime, digest del modelo y capacidad completion mediante version,
tags y show. Coincidieron. No se ejecutó generación: fue una comprobación de coherencia,
no evaluación de respuestas ni una nueva medición de calidad/latencia.

## F. Captura normal de procedencia de código

Se llamó **una vez** a `captureCcdCode(runtimeRoot)` con la raíz real del checkout.
Resultado: `PreflightError`, `code=SOURCE_REJECTED`, `category=read`.
El fallo seguro se conserva en `code-provenance-failure.json` y `code-provenance.log`.
No se obtuvo una captura válida del código. No se debilitó SafeReader, no se usaron
hashes manuales como sustituto y no se repitió la captura ni staging.

Esta condición activa explícitamente la detención requerida en la sección 7 de la
solicitud. Su causa no está demostrada: no se atribuye a paralelismo, OneDrive u otra
hipótesis. P4-B.2 no autoriza corregir producto para resolverla.

## G. Nueva release/run

**NO MATERIALIZADOS.** `stageKnowledgeCandidate` no se llamó. No hubo DML de staging,
retry, recovery, INSERT de release/run o copia de embeddings. No hay IDs nuevos que
registrar. El snapshot posterior demuestra exactamente cero releases y runs añadidos.
No se adoptó una candidata histórica como si representara el código nuevo.

## H. Comparación 768c histórica vs sucesora

| Campo | 768c histórica, verificada viva | Sucesora P4-B.2 |
|---|---|---|
| Release | `768cded3-0093-4c47-942d-0bead66612c2` | No creada/resuelta |
| Estado | staging | No aplica |
| Manifest SHA | `1f87fe41023ea000e201a4e115f780cada2b2b2cd58eeb4c0f61078828d9c443` | No generado |
| Pipeline SHA | `6d527ab78dcbbf0f96fc11915cf8e90b6e6225006872cafdb4f6166696bd4577` | No generado |
| Embedding config | `d7fb7a32-bf06-418b-b411-d0c7b33d5663` | No resuelto por staging |
| Code base | `aaa031da5a65ae655d684c2863fe159e6b1dbdae` | Captura rechazada; HEAD esperado 0e2c3721… |
| Source snapshot | `4824a74e21029a1964d681958b8ca452b35c14de3a1d6c94cd3516c079abf81e` | Corpus verificado; pipeline nuevo inexistente |
| Run | `a7b6310a-1538-4222-a70d-386a2a27bd57`, succeeded | No creado |

No se modificó el pipeline histórico ni se forzó un pipeline SHA nuevo.

## I. 107 documentos/chunks/embeddings

Los 107/107/107 pertenecen a cada candidata histórica observada, no a una sucesora.
La candidata 768c tiene norma mínima 0.999999408735.
Corpus preparado para esta etapa: 107 artifacts íntegros; preparación/ingesta normal
no ejecutadas por detención de procedencia. Nuevos documentos, chunks y embeddings
persistidos: **0**. Query embeddings generados o usados desde cache: **0**.

## J. Banco histórico 249

**NO EJECUTADO**: no existe sucesora staging válida. No se importaron 249 outputs
anteriores como resultados nuevos ni se heredó su PASS.

## K. Controles históricos 27

**NO EJECUTADOS**. El denominador histórico permanece 27 y no se alteraron expectativas,
outputs o rúbricas. No hay resultados nuevos de este grupo.

## L. Críticos 11

**NO EJECUTADOS**. Ningún resultado histórico se presenta como nueva corrida.

## M. Controles P4-B.1 9

**NO EJECUTADOS**. C01–C09 requerían nueva release, base y retrieval vectorial reales;
no se ejecutó un fixture controlado para sustituirlos. El hardening previo aceptado
no se transforma en una evaluación viva P4-B.2.

## N. Diff semántico contra P4-B histórico

No hay nuevos outputs para producir un diff semántico honesto por case ID.
El caso histórico P4-NEW-09 («¿La primera oportunidad es gratis? ¿De dónde sale esa
regla?») sigue identificado como control que necesita procedencia explícita en la
futura ejecución. No se reprodujo su output anterior como si correspondiera al nuevo
código. No se cambiaron prompts, top_k, modelos, cache ni retrieval para obtener PASS.
El evaluador congelado y sus rúbricas permanecen intactos; no se ejecutaron esta vez.

## O. Boundary/no-publication

Publicaciones: **0**. Nuevos profile bindings: **0**. Cero cambios de grants/roles/ACL.
No hubo selector HTTP nuevo, sesión, endpoint, cambio de runtime_scope o acceso normal
a una staging habilitado por esta tarea. No se llamó publish_release ni se cambió
current/status de ninguna release. La comprobación funcional RPC de una sucesora
**no se ejecutó**, porque no se creó. Los snapshots sí comprueban current, status,
permisos y fingerprints idénticos, y cero bindings en las dos staging históricas.
No se presentan esos snapshots como pruebas positivas de retrieval de una sucesora.

## P. Snapshot final/no mutación

Segundo snapshot reproducible READ ONLY antes de detener el contenedor. Coincidencia
exacta de identity/current, las seis releases, ambas candidatas/manifests/pipelines,
runs, embedding configs, 43 tablas con conteos/fingerprints y superficie completa de
roles/ACL registrada. Se incluyen corpus, contexts, cuentas, credenciales, bindings,
version bindings, grants, conversaciones/mensajes/citas y releases/tablas auxiliares.

**Cero releases/runs/filas nuevas; cero mutaciones del corpus/auth/config registrados.**
Current antes/después: `f01c1c37-2d3f-4bc7-8940-fe724eb71c9a`, ready, ccd-1.3.0.
No hubo auth/HTTP ni limpieza de auditoría. El contenedor iniciado por la tarea quedó
detenido como al inicio; Ollama y los demás procesos/servicios preexistentes se dejaron
sin cambios operativos por esta tarea.

## Q. Incidentes/fallos conservados

Único fallo de preflight: captura normal SOURCE_REJECTED/read. No se hizo staging
para intentar superarlo ni se reintentó una ingesta. Los checks de identidad DB,
current, candidatas, corpus y coherencia de modelos anteriores a esa captura pasaron.
Los dos snapshots y la comparación final pasaron. El primer generador privado del
informe encontró un KeyError de metadata al suponer `size` donde un sello histórico
usa `bytes`; se adaptó el lector de evidencia para ambos nombres, sin editar los
sellos o insumos históricos. La observación del fallo se conserva como tal en el
paquete. Los errores operativos se guardaron sin stacks,
paths personales, SQL completo, payloads privados o credenciales.

No se repitieron API 694/694, RAG 238/238, typechecks ni tests focalizados ya acreditados:
no se modificó producto ni se necesitó ampliar aquellas pruebas. Esos resultados
siguen siendo antecedentes, no resultados nuevos de P4-B.2.

## R. Limitaciones y evidencia

Falta una captura normal válida; por ello siguen pendientes materialización y evaluación
viva de la sucesora. Debe investigarse la causa del rechazo dentro de una autorización
adecuada, conservando SafeReader y la identidad del checkout. Esta tarea termina aquí,
sin corregir producto, preparar bindings, promover o ejecutar OE5.

Único archivo versionable nuevo:
`eval/rag-quality/results/ccd-canonical-successor-staging-validation.md`.
No se modificaron producto, tests, schemas, SQL, REST, MCP, Mobile, N8N ni los informes
históricos. HEAD y branch permanecen iguales, sin commit/push. `git diff --check`
y comparación del scope final contra el baseline: correctos.

Evidencia privada nueva: `data/ccd/local/p4b2-successor-staging/`. Baseline Git,
identidad/configuración/contenedor/volumen, recursos iniciados/restaurados, snapshots
DB before/after, coherencia Ollama, integridad de corpus/históricos, fallo de captura,
ledger de operaciones omitidas, no-mutación, privacidad y manifiestos SHA/tamaño.
Los outputs/verdicts no ejecutados no se fabricaron ni se sustituyeron por archivos
históricos. No se incluyeron PDFs originales, vectores, credenciales, .env o dumps.

`independent_human_review = false`

`institutional_endorsement = false`

## S. Estado final exacto

**P4-B.2 BLOCKED — code provenance capture rejected**
