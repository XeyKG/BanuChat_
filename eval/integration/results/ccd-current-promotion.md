# BanuChat — promoción CCD 1.3 detenida en preflight

Fecha de verificación: 2026-10-26 UTC. HEAD inicial: `3470f7a6076920037361d18e474f207baa9d5f0c`; repositorio inicialmente limpio.

**Resultado: NO PUBLICADA.** La promoción se detuvo antes de ejecutar `publish_release`, por una dependencia de autorización por release que la operación de publicación no prepara. No se modificaron código funcional, autenticación, permisos, corpus ni configuración para intentar superar el bloqueo.

## Estado final real

| Identidad | Estado inicial | Estado final |
|---|---|---|
| `3d6cedac-0e86-40c8-909b-d3ff6e8ab741` | ready, current | ready, current |
| `f01c1c37-2d3f-4bc7-8940-fe724eb71c9a` | staging, candidata CCD 1.3 | staging, candidata CCD 1.3 |

Hubo **cero publicaciones, cero cambios de puntero y cero rollback**. La API habitual continúa funcionando en loopback 3004 con la release anterior. Esta entrega no acredita la promoción técnica ni declara producción lista.

## Precondiciones y validación de la candidata

Las identidades congeladas coinciden. Ambas releases pertenecen a `banuchat-ccd-local`; la candidata tiene schema `ccd-1.3.0`, estado staging y manifiesto aprobado `9bde9ff3c1bd9cd29906751de86d7ed31bece30077b9639042b79d221104da4e`.

La verificación en transacción de solo lectura confirmó:

- 87 claims adoptados, sin pendientes como única base.
- 87 documentos, 87 document_versions ready y 87 chunks.
- 87 embeddings existentes, no nulos, de dimensión 1024 y norma positiva; no se generaron embeddings.
- Ejecución de ingesta existente en estado succeeded.
- Los 87 derivados locales conservan exactamente los SHA aprobados; no se regeneraron.
- `SELECT banuchat.assert_release_complete('f01c1c37-2d3f-4bc7-8940-fe724eb71c9a')` pasó en modo lectura, antes de cualquier publicación.

Los snapshots antes/después incluyen current, ambas releases y sus hashes, configuración de embeddings, runs, runtime_scope, roles, ACL de tablas/funciones, fingerprints de tablas, conteos de conversaciones/mensajes y estado/identidad del proceso de API. La configuración habitual no cambió.

## Bloqueo encontrado antes de publicar

La autenticación normal exige una vinculación en `banuchat_auth.profile_binding_versions` para la release activa. `AuthService.currentSession()` une esa vinculación con `profile_bindings`, `ccd_demo_contexts` y el grant vigente; si falta, devuelve `FORBIDDEN`. Esta comprobación ocurre antes de seleccionar el contexto auxiliar unificado. No hay fallback de autorización.

| Release | Vinculaciones con grant vigente | Vinculaciones aprobadas para esa release |
|---|---:|---:|
| Current anterior | 5 | 5 |
| Candidata CCD 1.3 | 5 | 0 |

El análisis de las definiciones SQL realmente instaladas —`publish_release`, `guard_release` y `guard_dataset_pointer`— confirmó que publicar **no crea estas vinculaciones**. `publish_release` bloquea dataset/release, permite staging → ready y cambia el puntero; no prepara autorizaciones de perfiles para la nueva release.

Por tanto, cambiar current bajo las condiciones actuales dejaría `/auth/me` sin una vinculación válida para los cinco perfiles existentes. Esto se deduce de la consulta de autorización real y sus datos, sin publicar para provocar el fallo ni simular un éxito HTTP post-publicación.

La copia normal de staging del incremento anterior había añadido expresamente vinculaciones de versión para sus dos fixtures sintéticas (`p1-product-candidate-integration/create-staging.mts`). Esa preparación quedó confinada a la copia. La comparación actual muestra que no existe en el producto habitual. No es un fallo del corpus de 87 claims ni una razón para cambiar sus respuestas.

La tarea actual prohíbe alterar autenticación y permisos, y limita las mutaciones de promoción a los mecanismos normales de publicación. No se copiaron silenciosamente las autorizaciones de la release anterior. Se requiere una decisión/tarea explícita para preparar y verificar las vinculaciones de los perfiles autorizados en CCD 1.3, preservando las de la release anterior, antes de reintentar esta promoción.

## Precheck del producto habitual

Se utilizó la API existente en 3004, sin runtime aislado y sin reiniciarla ni cambiar configuración. Pasaron las nueve comprobaciones registradas: rechazo sin token, login normal, `/auth/me` mostrando el current anterior, creación de conversación, consulta documental básica no abstentiva con citas de la release anterior, historial idéntico a la respuesta enviada, borrado de la conversación de ensayo, logout y rechazo posterior del access token.

Este precheck acredita únicamente el producto con el current anterior. No se presenta como smoke de CCD 1.3 publicado.

## Publicación y rollback

La operación autorizada, si se resolviera el bloqueo, sería una transacción corta: bloquear dataset, exigir el current anterior exacto y la candidata staging exacta, ejecutar `assert_release_complete`, ejecutar `publish_release(candidata)`, comprobar puntero y COMMIT. **No se ejecutó esa transacción** ni se actualizaron directamente status/current.

La release anterior permanece ready y pasó además `assert_release_complete` en modo lectura. Se conserva como destino previsto de rollback, pero **no se ejercitó un rollback real**, porque no hubo publicación. Tampoco se publicó/despublicó repetidamente para ensayar.

## No mutación y limpieza

Los snapshots mantienen idénticos los estados/hashes de ambas releases, sus conteos, runs, configuración de embeddings, scope, roles/permisos, 87 SHA de derivados y todas las tablas de corpus/contexto. No hay nuevas releases, runs, chunks ni embeddings. Las tablas de aprobación de perfiles no cambiaron.

Las únicas diferencias corresponden al precheck normal de autenticación: una sesión, un refresh token, dos eventos de seguridad y tres filas de límites persistentes añadidas; sus fingerprints y conteos se registran. La sesión se cerró mediante logout y el access fue rechazado después. No se borraron buckets ni datos de auditoría para ocultar esas escrituras.

La conversación de ensayo se eliminó mediante la operación normal del propietario; los fingerprints de conversaciones, mensajes y citas coinciden con el snapshot anterior. No se reescribieron conversaciones históricas.

Mobile, N8N, MCP, originales y dataset sintético permanecen sin cambios. No se modificó ningún archivo funcional. Sin commit ni push.

## Comprobaciones ejecutadas y no ejecutadas

Ejecutadas en esta etapa:

- API typecheck: aprobado.
- RAG typecheck: aprobado.
- 19/19 tests críticos de current, retrieval autenticado, CCD knowledge/routing y autenticación normal.
- 3/3 tests RAG de CCD knowledge y finalización sin publicación, con fixtures temporales.
- Validación de candidata y release anterior con `assert_release_complete` en lectura.
- Precheck HTTP habitual y limpieza, comparación de snapshots y `git diff --check`.

No ejecutadas por detención previa a publicación: smoke con la nueva release, seguridad post-current, banco de 249 casos post-current, 87 descargas HTTP post-current, comparación runtime post-publicación, comportamiento de conversaciones históricas tras cambiar current ni reinicio leyendo CCD 1.3. No se heredan los resultados anteriores para declarar aprobadas estas pruebas. Las 87 verificaciones locales de SHA no se presentan como 87 descargas HTTP.

No hubo regresión runtime publicada que requiriera rollback; hubo una condición impeditiva detectada antes de escribir. El primer chequeo del harness de no mutación usó el nombre genérico `rate_buckets`; se ajustó únicamente esa comprobación al nombre real `auth_rate_limits`. No se cambió SQL ni lógica del producto.

## Evidencia y cierre

Evidencia privada, ignorada por Git: `data/ccd/local/p2-ccd-current-promotion/`. Incluye snapshots, preflight, assert, precheck habitual, tests críticos, no mutación, readiness de rollback, causa de detención, operaciones no ejecutadas y run-manifest con hashes. No se guardan tokens, contraseñas, env, configuraciones privadas ni dumps.

**ESTADO DE ENTREGA BANUCHAT: promoción detenida antes de publicar; current real `3d6cedac-0e86-40c8-909b-d3ff6e8ab741` ready; candidata `f01c1c37-2d3f-4bc7-8940-fe724eb71c9a` staging. Preparación explícita de autorizaciones por release pendiente antes de reintentar.**
