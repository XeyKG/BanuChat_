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


## P4-B.2R — reanudación controlada desde checkout estable

Cierre 2026-10-28T02:54:51.249351-05:00, America/Bogota. **P4-B.2R COMPLETE — SUCCESSOR STAGING READY FOR INDEPENDENT REVIEW**.
El cierre bloqueado P4-B.2 anterior se conserva íntegro.

### Procedencia y elegibilidad

HEAD real inicial/final `c145b5adb62fee7f4720d2d31322d08d4100c0dd`, branch `main`, árbol inicialmente limpio.
Se leyó AGENTS.md completo. No se cambió de branch ni se hicieron commit, push o
operaciones destructivas. P4-B.2D es antecedente de contraste entre checkouts,
no una demostración de causa raíz. V1 fue el único commit posterior a su captura
`0f56d5096fc0acb88563249c6a60bc64bb09c52a`; sus ocho archivos no intersectan el
scope reconstruido de la implementación actual de `captureCcdCode`.

Scope real: 87 tracked / 0 untracked no ignorados, reconstruido
con las reglas y comandos Git actuales, sin reutilizar una lista histórica.
El worktree temporal detached se creó fuera del proyecto y de la carpeta
sincronizada, con `core.autocrlf=false` solo para ese comando y el HEAD exacto.
Cada archivo capturado coincidió RAW con su blob del commit y con el sello P4-B.2D.
`npm ci` de RAG y API usó sus locks exactos; status siguió limpio.

El checkout principal presenta CRLF en
`data/ccd/schemas/knowledge-adoption-v2.schema.json` y
`infra/db/014_ccd_knowledge_v2.sql`; sus blobs LF no cambiaron desde P4-B.2D y
la comparación confirma que no hay ninguna otra diferencia de bytes en esos dos
archivos. No se modificaron ni normalizaron. No se atribuye a este hecho el rechazo
de metadata histórico de SafeReader.

La implementación de staging y sus imports transitivos se cargaron del mismo
worktree estable utilizado como `runtimeRoot`, con cwd en esa raíz. La captura
normal única de preflight pasó, seguida por una única llamada normal a
`stageKnowledgeCandidate`, incluidas sus capturas/revalidaciones internas normales.
No hubo bypass de SafeReader, captura manual sustitutiva, copia de embeddings,
retry, DML correctivo ni publicación. No se observó SOURCE_REJECTED en esta ejecución.

`executed checkout HEAD == runtimeRoot HEAD == stored code_base_git_revision`
`== c145b5adb62fee7f4720d2d31322d08d4100c0dd`.
Los 87 `executed_files_sha256` almacenados coinciden con el worktree ejecutado y
con P4-B.2D. El cambio de HEAD por V1 no implica cambio de esos bytes capturados.

### Corpus y resultado normal

Se usó exclusivamente P4B_CANONICAL_STABLE_BUNDLE, la copia privada sanitizada
canónica aceptada; no se reconstruyó ni editó. Adoption v2 SHA
`4824a74e21029a1964d681958b8ca452b35c14de3a1d6c94cd3516c079abf81e`.
107 claims y artifacts, 81 IDs preservados y 26 incorporados; 135 comprobaciones
SHA de artifacts/fuentes/gobernanza pasaron. El par OP-003 `two_pending` /
`two_pending_named` coincide con el guard cerrado actual; solo existe una unidad
parametrizada. No se copiaron PDFs originales.

| Campo | Sucesora de esta ejecución |
|---|---|
| Release | `10af4ffd-effb-41fc-bbfe-4dc48cb3398f` |
| Run | `821b7f99-44e8-4fa5-be93-c8c361807e07`, succeeded |
| Estado/schema | staging / ccd-1.4.0 |
| Manifest SHA | `fde23cabe95c83f5bd632d129312ad68c90624e6ebd489e79e98c6a3d0d96852` |
| Pipeline SHA | `bd4cad46d7927c6aa6847fe9a2dc1b80b89f9badfb06f3e461558913ee556a6b` |
| Embedding config | `d7fb7a32-bf06-418b-b411-d0c7b33d5663` |
| Documentos/chunks/embeddings | 107 / 107 / 107 |
| Dimensión | 1024, mínimo y máximo |
| Norma mínima/máxima | 0.9999994087350818 / 1.0000005608538518 |
| current_activated | false |

Ollama conservó URL, modelos y parámetros normales. Provider/model/digest,
dimensión/coseno y parámetros document/query/runtime coinciden estructuralmente
con la configuración histórica válida. También pasó la coherencia del generador
normal. No se hizo pull, cambio de modelos, parámetros ni configuración manual.

### Comparación contra 768c

La histórica `768cded3-0093-4c47-942d-0bead66612c2` permanece staging y no se reutilizó.
Adoption, 107 IDs, statements, presentation units, artifacts, fuentes/gobernanza y
manifest semántico de conocimiento son exactamente iguales; embedding config también.
Cambian release/run, revisión de código, pipeline SHA y timestamps.

Además cambia únicamente `ccd_provenance.schema_sha256` en el manifest: histórico
`d1ecd2c8896e55b849674ea102e78d6eae70845d397e09d0da83f6670a2c15f7` frente a
`bbb9949da23c790064adaadc3b945ba40fd62449df1b85d68b233ae1488dd200`, por los bytes CRLF históricos frente a
los LF exactos del commit en el worktree. Esta diferencia física está demostrada,
sin cambios del schema lógico. Por ello los manifests completos y sus SHA no se
declaran idénticos. Tampoco se declaran iguales los pipelines.

El verificador privado inicialmente exigió igualdad del manifest completo y
rechazó esa metadata. Se conservó el incidente y se completó la comprobación
READ ONLY contra la diferencia física demostrada; no se repitió staging ni se
alteró producto, corpus, schema, SQL o estado de release/run.

### Evaluaciones nuevas de la release exacta

Responder y módulos reales cargados del worktree estable, retrieval vectorial
exacto acotado al ID de esta sucesora mediante el adaptador privado READ ONLY
preexistente. No current implícito, endpoint, selector público, sesión o binding.
Preguntas, expectativas, rúbricas congeladas, prompt, top_k, modelo y política de
cache se conservaron. Solo se guardaron estadísticas de cache, nunca vectores.

| Grupo separado | Total | Correctos | Categorías |
|---|---:|---:|---|
| Banco histórico | 249 | 249 | 205 PASS, 27 ABSTAIN_CORRECT, 9 BOUNDED_REFUSAL_CORRECT, 8 CLARIFY_CORRECT |
| P4 histórico adicional | 27 | 27 | 26 PASS, 1 ABSTAIN_CORRECT |
| Críticos | 11 | 11 | 10 PASS, 1 ABSTAIN_CORRECT |
| P4-B.1 C01–C09 | 9 | 9 | 9 PASS, sobre retrieval real de la sucesora |

Los outputs y verdicts son nuevos, separados por grupo. La revisión automatizada
inicial dejó 64 respuestas como REVIEW_REQUIRED; no se llamó PASS a esa etapa.
Se registraron 63 revisiones académicas nuevas y una de procedencia, ligadas al
hash de respuesta/historial/citas y a sus supporting claims, usando el mecanismo
de revisión ya admitido por el evaluador congelado. Se leyeron las respuestas
completas y sus proposiciones/condiciones; no se importó ningún verdict anterior
ni se cambió la rúbrica. Quedaron cero fallos o revisiones pendientes de esos cuatro
grupos. Esto es revisión técnica-semántica del agente, no aceptación humana independiente.

Diff semántico por 296 case IDs: 281 SAME (262 respuestas de texto idéntico y 19
paráfrasis de significado equivalente), 1 EXPECTED_P4B1_CHANGE y 14
UNEXPECTED_CHANGE. Estos últimos son variaciones de detalle/cobertura académica
respaldadas por fuentes y compatibles con las rúbricas congeladas, retenidas para
revisión independiente; no se declaran mejoras ni una causa de variabilidad.
IDs: X-08, X-10, Q-004170, Q-004172, Q-004173, Q-004178, Q-004192, Q-004197, Q-004202, Q-004203, Q-004205, Q-004208, P0-R04, MT-02-T2.

P4-NEW-09 conserva el hecho de primera oportunidad gratuita y añade la explicación
de confirmación de dominio y la ausencia de fuente documental independiente para
atribuir un literal institucional. No cambió pregunta ni expectativa para obtener PASS.

### Controles funcionales y privacidad

C01 responde en una frase factual sin procedencia no solicitada; C02 explica
confirmación de dominio sin inventar respaldo documental; C04 atribuye correctamente
la base documental; C05 distingue la base mixta. C03 recupera el antecedente del
usuario y evidencia real con un mensaje previo del asistente deliberadamente no
probatorio; C09 respeta el cambio de tema. CP-06 y SP-06 ejercitan la variante
parametrizada OP-003 con el pilar real autorizado. No se introdujo otra plantilla.

Pasó el escaneo de las 296 salidas visibles: sin labels técnicos internos, claim IDs,
hashes, release IDs ni rutas privadas. La evidencia no incluye .env, credenciales,
filas sensibles de auth, dumps, PDFs originales, vectores completos o paths personales
absolutos. Se preservan evaluadores/rúbricas/resultados históricos y sus sellos.

### Snapshot final, entorno y límites

Snapshots REPEATABLE READ / READ ONLY sobre 43 tablas y roles/memberships,
owners, schemas y ACL de tablas/columnas/funciones. Current antes/después:
`f01c1c37-2d3f-4bc7-8940-fe724eb71c9a`, ready, ccd-1.3.0, sin cambios de manifest
ni filas preexistentes. La comparación de fingerprints excluyendo exclusivamente
la nueva release recupera exactamente el baseline en las tablas modificadas.
Únicas adiciones: 1 release, 1 run, 107 items, 107 versions, 107 chunks y 1 contexto
técnico. Todas pertenecen al camino normal de staging. Cero bindings nuevos,
cero grants, cero cambios de roles/ACL, auth o auxiliares; embedding configs iguales.
`publish_release` no fue llamado; la ruta normal `finalizeCandidate` usa activate=false.

PostgreSQL se identificó por ID/scope/volumen/mount/base/puerto loopback, sin otro
contenedor compartiendo volumen o puerto. Estaba detenido; se arrancó solo ese
contenedor y se dejó detenido al terminar, preservando volumen, candidata y auditoría.
Ollama estaba corriendo y se dejó activo. No se modificó N8N.
Antes de retirar el worktree se sellaron HEAD/status, blobs RAW, procedencia,
pipeline almacenado, staging, evaluaciones y snapshots. Se retiró exclusivamente
ese worktree mediante `git worktree remove`, sin force.

Evidencia privada cerrada y sellada antes de añadir esta sección:
`data/ccd/local/p4b2r-successor-staging/`, con run manifest, manifiesto SHA-256/tamaño,
snapshot before/after, comparaciones, outputs/verdicts separados, diff semántico,
controles, restauración y cleanup. Incidentes del harness conservados, incluida una
quotación de shell fallida durante su preparación, sin operación de producto/DB.
Las observaciones P4-B.2D/V1 no se convierten en prueba de causa raíz.

No se repitieron suites generales/typechecks ya acreditados: no hubo cambios de producto.
Solo se añade este informe versionado; el cierre P4-B.2 anterior permanece intacto.
Sin commit ni push. Esta etapa se detiene aquí: sin bindings, publicación/promoción,
Android, participantes ni OE5. Las 14 variaciones señaladas forman parte del paquete
que deberá revisar la auditoría independiente antes de cualquier siguiente etapa.

`institutional_endorsement = false`

`independent_human_acceptance = false`

**P4-B.2R COMPLETE — SUCCESSOR STAGING READY FOR INDEPENDENT REVIEW**
