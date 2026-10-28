# BanuChat — promoción controlada de CCD 1.3

**Estado actual tras el reintento final:** CCD 1.3 `f01c1c37-2d3f-4bc7-8940-fe724eb71c9a` es current y está ready. La release anterior permanece ready histórica. Pasaron smoke, seguridad, 249 casos, 87 artefactos y reinicio habitual; sin rollback. Las fases siguientes conservan la detención inicial y la preparación previa de vinculaciones.

Fecha de verificación: 2026-10-26 UTC. HEAD inicial: `3470f7a6076920037361d18e474f207baa9d5f0c`; repositorio inicialmente limpio.

**Resultado del primer intento: NO PUBLICADA.** La promoción se detuvo antes de ejecutar `publish_release`, por una dependencia de autorización por release que la operación de publicación no prepara. No se modificaron código funcional, autenticación, permisos, corpus ni configuración para intentar superar el bloqueo.

## Estado al cierre del primer intento

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

## Preparación de vinculaciones para CCD 1.3

Actualización posterior, 2026-10-26 en America/Bogota (operación del 2026-10-27 UTC), sobre HEAD `3dcc996f392507b3335ea0b4c6e3f3335e88c65e`. Esta tarea autorizó expresamente preparar las vinculaciones por versión y **no publicar**. El relato anterior documenta la detención original; el bloqueo específico de vinculaciones queda resuelto por la operación descrita aquí.

Eran necesarias porque `AuthService.currentSession()` exige la combinación binding estable + versión aprobada + grant vigente + contexto CCD para la release activa, y `publish_release()` no crea `profile_binding_versions`.

La lectura previa confirmó todas las precondiciones exactas: current anterior ready, candidata CCD 1.3 staging en `banuchat-ccd-local`, contexto candidato `ccd-local-demo`, cinco bindings estables relevantes, cinco grants vigentes `ccd_local/read`, cinco aprobaciones en la release anterior y cero en la candidata. Los cinco principales se derivaron de la intersección de esas relaciones y cuentas activas con credenciales existentes; no se usó una lista manual de UUIDs ni se amplió el conjunto autorizado.

El aprovisionador administrativo existente crea cuentas/bindings/grants y selecciona current; no es un mecanismo adecuado para extender solo una aprobación de versión. Se creó únicamente el script administrativo privado y reproducible `data/ccd/local/p2-profile-binding-preparation/prepare-bindings.mjs`, sin credenciales incorporadas ni cambios en servicios públicos. Reutiliza la conexión administrativa normal, comprueba que ese rol tiene INSERT y que no es el runtime. No se reutilizó un evento `account_provisioned` para atribuir falsamente la creación de cuentas: la auditoría de esta operación puntual queda en evidencia privada.

La operación utilizó una transacción corta con límites de espera, bloqueos compartidos de las relaciones fuente/dataset/releases/contextos y `SHARE ROW EXCLUSIVE` sobre `profile_binding_versions`. Dentro de los bloqueos se revalidaron identidades, estado, conjunto y conteos. Un único **INSERT ... SELECT** derivado de las autorizaciones existentes añadió exactamente cinco filas; `approved_at` se omitió del INSERT para utilizar el valor nuevo generado por PostgreSQL. Se verificaron los cinco timestamps nuevos, la identidad del conjunto y todos los invariantes antes de COMMIT. No hubo `ON CONFLICT DO NOTHING`, UPDATE de filas históricas ni DELETE.

| Comprobación | Antes | Después |
|---|---:|---:|
| Aprobaciones de la release anterior | 5 | 5 |
| Aprobaciones de CCD 1.3 | 0 | 5 |
| Bindings estables relevantes | 5 | 5 |
| Grants vigentes CCD/read | 5 | 5 |
| Nuevos principales/cuentas/perfiles/grants | — | 0 |

La consulta con la misma semántica del componente de autorización de perfil de `currentSession()` encontró **5/5 autorizables** para la candidata: cada principal conserva binding estable, grant vigente, contexto `ccd-local-demo` y versiones anterior/candidata. No hay principales extra. Esta comprobación fue SQL, sin cambiar current ni fingir una respuesta HTTP de staging. No acredita sesiones/tokens ni un smoke post-publicación.

La comparación de snapshots, realizada dentro de la transacción y repetida mediante una conexión posterior, muestra una única diferencia: **cinco filas añadidas a `banuchat_auth.profile_binding_versions`**. El fingerprint de todas las aprobaciones históricas permanece idéntico. No cambiaron cuentas, credenciales, bindings estables, grants, sesiones, tokens, límites ni eventos de seguridad; tampoco corpus, releases, chunks, embeddings, perfiles, roles o ACL. Los snapshots guardan conteos/fingerprints agregados, no hashes de contraseña, emails ni contenido de sesiones. Los principales de la auditoría se representan mediante pseudónimos derivados de sus IDs internos.

El runtime continúa sin INSERT/UPDATE/DELETE sobre `profile_binding_versions`, tanto a nivel de tabla como en los permisos de columna aplicables. Tres intentos DML sin filas, en transacciones revertidas, fueron rechazados con 42501. Las ACL antes/después son idénticas. No se añadieron roles, permisos, SECURITY DEFINER ni endpoints.

Comprobaciones realmente ejecutadas: preflight de solo lectura; sintaxis de ambos scripts privados; INSERT exacto 5/5; validación dentro de la transacción; verificación independiente posterior; equivalencia de autorización 5/5; permisos de catálogo y tres rechazos DML del runtime; comparación integral de snapshots; rechazo de una nueva comprobación de preparación que esperaba cero filas y encontró las cinco ya creadas; `git diff --check`. Este último rechazo es una comprobación esperada del cierre seguro ante repetición, sin segundo INSERT ni retry.

No se modificó TypeScript ni código reutilizable del producto; no correspondió ejecutar API typecheck ni suites del producto para este cambio administrativo. No se inició sesión ni se llamó a `/auth/me`, para respetar la prohibición de modificar sesiones/tokens; su selección de release continúa siendo la current anterior. No se ejecutaron banco de 249 casos, 87 descargas, ingesta, embeddings, reinicio ni `publish_release`. Mobile, MCP y N8N permanecen intactos.

Evidencia privada: `data/ccd/local/p2-profile-binding-preparation/`, con preflight, principales pseudonimizados, operación, snapshots antes/después, equivalencia de autorización, permisos, rechazo esperado de repetición, análisis de fallos y run-manifest. No contiene contraseñas, tokens, env, hashes de contraseña ni emails de recuperación. El único archivo versionable modificado es este informe; sin commit ni push.

**ESTADO DE ENTREGA BANUCHAT: vinculaciones de perfil para CCD 1.3 preparadas y verificadas; current sin cambios; reintento de promoción pendiente.** Current real: `3d6cedac-0e86-40c8-909b-d3ff6e8ab741` ready. Candidata: `f01c1c37-2d3f-4bc7-8940-fe724eb71c9a` staging.

## Reintento final de promoción a current

HEAD inicial del reintento: `b391c0679b829906666de7f75e1285ea8905de96`, repositorio limpio. Publicación realizada el **2026-10-27 a las 01:33:46 UTC**, correspondiente al 2026-10-26 en America/Bogota. Esta fase conserva la secuencia real: primer intento detenido → preparación explícita 5/5 → revalidación viva → publicación → aceptación técnica del current real.

### Preflight y publicación exacta

Se consultó nuevamente `banuchat_unified` en loopback 55463. Coincidieron las identidades congeladas, current anterior ready, candidata staging, schema `ccd-1.3.0` y manifiesto aprobado `9bde9ff3c1bd9cd29906751de86d7ed31bece30077b9639042b79d221104da4e`. Se verificaron 87 claims adoptados, 87 documentos/versiones ready/chunks/embeddings válidos de 1024 dimensiones y norma positiva, run existente succeeded y 87 SHA locales aprobados. `assert_release_complete` pasó en lectura.

La autorización se revalidó sin insertar nada: cinco bindings estables, cinco grants vigentes CCD/read, cinco versiones anteriores y cinco candidatas, 5/5 cuentas con la combinación autorizable y cero principales extra. El precheck HTTP habitual pasó sobre la release anterior: login, me, conversación, consulta documental/cita, historial, eliminación del ensayo, logout y rechazo posterior. Se conservó solo una fixture propia, separada y temporal, para la comprobación histórica posterior.

Con el rol administrativo existente `auth_i1b_admin`, una transacción de **46 ms hasta la validación previa a COMMIT** bloqueó dataset y ambas releases, exigió las identidades/estados exactos, bloqueó las relaciones de autorización y revalidó las cinco vinculaciones candidatas. Ejecutó, en este orden:

```sql
SELECT banuchat.assert_release_complete('f01c1c37-2d3f-4bc7-8940-fe724eb71c9a');
SELECT banuchat.publish_release('f01c1c37-2d3f-4bc7-8940-fe724eb71c9a');
```

Se comprobó current igual a la candidata y estado ready dentro de la transacción antes de COMMIT. Hubo **una sola llamada de publicación**, sin UPDATE directo de puntero/status y sin nuevas vinculaciones, cuentas, grants, roles o ACL.

La comprobación inmediata encontró únicamente los cambios propios de la autoridad normal: `datasets.current_release_id`, status staging → ready de la candidata y su `validated_at`, generado por el trigger existente `guard_release`. La release anterior y las otras releases permanecieron idénticas. No hubo nuevas releases, runs, chunks ni embeddings.

### Runtime real, smoke y seguridad

El proceso habitual en 3004 observó el nuevo current **sin reinicio posterior a la publicación**. El smoke pasó diez casos, incluidos propósito del diagnóstico, 70 %, primera oportunidad gratuita, pilar pendiente, insignia, tarifa, transición, guía vigente, profesor futuro sin programación inventada y una secuencia de tres turnos. Todas las conversaciones nuevas y sus citas usaron CCD 1.3; pasaron historial, descarga real con SHA, refresh y logout. La evaluación semántica del smoke fue 10/10.

La validación se hizo sobre la API habitual, su base y su current reales, sin staging, copia temporal ni opción `isolated_pilot`. Para observar retrieval/selección/soporte y ensayar fallos se usó temporalmente un preload privado durante `npm start`: envolvió el retorno normal del RAG y los puertos de retrieval/generación, sin editar los archivos funcionales ni sus decisiones. Solo los requests de ensayo etiquetados se registraron, sin headers de autorización. El control de fallos fue un archivo privado, no un endpoint ni selector HTTP. El banco normal no recibió expectativas/rúbricas ni respuestas anteriores como entrada de generación. La instrumentación se retiró en el reinicio final.

Pasaron ausencia/token inválido, propiedad cruzada GET/POST/DELETE con 404, selectores de release e IDs/campos internos rechazados, rutas de artefacto inválidas, desconocido 404, falta de token 401 y derivado válido con SHA correcto. Refresh invalidó el access anterior; logout invalidó la sesión. No se modificaron permisos ni límites para estas pruebas.

En la dependencia de generación del proceso real se mantuvo pendiente un turno y se aplicó logout, revocación, expiración o deployment incorrecto sobre sesiones de ensayo. Los cuatro POST terminaron 401, sin mensajes ni citas persistidos. Un fallo controlado de la dependencia produjo 500 seguro y cero mensajes/citas. El deployment de ensayo se restauró antes de revocar su sesión; no se alteró el deployment configurado. La expiración se ensayó con timestamps válidos de esa sesión nueva, sin modificar cuentas. No hubo turnos parciales ni retry de POST de resultado incierto.

### Conversaciones históricas

Una conversación propia creada bajo la release anterior conservó su `dataset_release_id`, mensajes y citas. GET del propietario respondió 200 y el historial completo coincidió con el registrado antes de publicar. POST sobre esa conversación devolvió **409**: no añadió mensajes/citas ni migró la conversación. Se eliminó únicamente esa fixture de ensayo mediante el propietario. Los 146 chats preexistentes, 532 mensajes y 267 citas conservaron sus fingerprints después de limpiar todos los ensayos.

### Banco de 249 casos y comparación prepublicación

Se ejecutaron los **249 casos completos por HTTP sobre el current real**. Los 249 respondieron 201, validaron el schema vigente, conservaron el historial exacto y coincidieron con el contenido efectivamente devuelto por el servicio. Se registraron retrieval real, selección real, soporte, citas SQL persistidas y respuesta visible. Se mantuvieron todos los conjuntos:

| Conjunto | Resultado técnico |
|---|---:|
| Funcionales | 50/50 |
| Primarios | 72/72 |
| Robustez, subconjunto de primarios | 35/35 |
| Negativos | 24/24 |
| P0 | 10/10 |
| Presentación | 28/28 |
| Aceptación adicional | 12/12 |
| Guías vigentes | 5/5 |

Incluye nueve secuencias anteriores, tres nuevas, la progresiva y cuatro HTTP adicionales. Resultado semántico: **249/249 correctos** —204 PASS, 26 abstenciones correctas, diez rechazos acotados y nueve aclaraciones—; sin incidencias conversacionales pendientes. No se importó ningún veredicto ni revisión por caso anterior. Se reutilizó únicamente el registro de proposiciones completas de fuente, comprobado por SHA, y se revisaron de nuevo 61 respuestas actuales de redacción libre contra pregunta, historial, condiciones y fuentes. Es validación técnica del agente, no aceptación humana independiente ni aval institucional.

La comparación derivada de los resultados reales muestra **27 textos distintos y cinco historiales distintos solo por redacción de respuestas anteriores**. Retrieval y selección coinciden en 249/249; los 249 historiales conservan exactamente los mensajes enviados. Hay exactamente tres diferencias de soporte/citas, revisadas individualmente:

- `Q-004178`: añade KC-005 porque la respuesta actual explica también competencias, además del temario de KC-006.
- `Q-004179`: conserva solo KC-006; la respuesta actual se limita a sus contenidos, sin necesitar las otras fuentes antes citadas.
- `N-0023`: pasa de abstención genérica sin citas a rechazo acotado con MD-037 y OP-006. Explica que la evidencia histórica no confirma vigencia actual; no afirma vigencia ni expiración definitiva. El flag no abstentivo no se tomó como éxito automático: la respuesta completa satisface la rúbrica que permite rechazo acotado.

Estas diferencias conservan significado y respaldo y no se forzó igualdad artificial. El análisis procede de `candidate-vs-current-comparison.jsonl`, no de una atribución manual a otra consulta.

### Artefactos, reinicio y no mutación

Se descargaron **87/87 derivados por HTTP**, con 200, document_version y release correctos, SHA exacto, `nosniff` y bytes iguales a los derivados depurados aprobados. Pasaron las comprobaciones de rutas locales, metadata de gobernanza, originales y secretos. No se regeneraron derivados ni embeddings documentales.

Después de smoke, seguridad, banco y artefactos se detuvo normalmente la API y se ejecutó **`npm start` sin preload**, sin modificar configuración. Un proceso nuevo arrancó leyendo CCD 1.3, pasó login/me, conversación nueva, consulta documental, historial, cita, descarga con SHA y logout. La API quedó funcionando en loopback 3004; el preload temporal ya no está cargado.

Los snapshots finales mantienen manifiesto, pipeline, configuración de embeddings, fuentes/procedencia, documentos, chunks, vectores, release anterior, cinco bindings anteriores y cinco candidatos, grants, bindings estables, cuentas, credenciales, roles y ACL. Las únicas relaciones adicionales con cambios son las de autenticación normal de los ensayos: diez sesiones, doce refresh tokens, 18 eventos de seguridad y 13 filas de límites persistentes añadidas, junto con las actualizaciones normales de esas filas. No se eliminaron logs ni límites para hacer coincidir hashes. Las diez sesiones de ensayo están revocadas y no queda access utilizable de ellas. Conversaciones, mensajes y citas coinciden con el estado anterior al inicio de los ensayos.

### Incidencias, evidencia y cierre del reintento

Antes de publicar hubo una interrupción del harness: se detuvo la API mientras acababa una fixture del precheck. Se conservó el fallo de transporte, se resolvió su estado mediante lectura y se limpiaron sus dos conversaciones y su sesión de ensayo. No se repitió un POST incierto. Un precheck nuevo completo pasó antes de publicar. Además se corrigió una consulta diagnóstica privada que usaba `created_at` en vez del campo de ownership, y una expectativa de snapshot demasiado estrecha que omitía el `validated_at` del trigger existente. No hubo parche funcional ni relajación de contratos para superar estas incidencias; ninguna se contó como PASS de la ejecución interrumpida.

Pasaron API typecheck, RAG typecheck, 19/19 tests críticos API de current/release, CCD knowledge/routing y auth normal, 3/3 tests RAG de CCD knowledge/finalización y `git diff --check`. No se repitieron suites completas innecesarias. Mobile, MCP, N8N, originales y dataset sintético permanecen sin cambios.

La evidencia nueva está en `data/ccd/local/p2-ccd-current-promotion/final-retry/`, incluido su `run-manifest.json`. Las fases anteriores y sus manifiestos se conservan como antecedentes; `phase-index.json` identifica cada fase. Se incluyen snapshots, binding-preflight, precheck completado/interrumpido, publicación, smoke, seguridad, historial, 249 casos, comparación, revisión semántica, 87 descargas, reinicio, limpieza, rollback-readiness y análisis de incidencias, sin secretos.

**No hubo rollback.** La release anterior sigue ready y completa, con su script de rollback controlado disponible, pero no se publicó/revirtió para ensayarlo. Esta entrega acredita únicamente la publicación técnica en el entorno habitual validado; no declara el sistema completo en producción ni aval CCD. Sin commit ni push.

**ESTADO DE ENTREGA BANUCHAT: current real `f01c1c37-2d3f-4bc7-8940-fe724eb71c9a` ready; release anterior `3d6cedac-0e86-40c8-909b-d3ff6e8ab741` ready histórica; vinculaciones 5/5; API habitual funcional tras reinicio; 249 casos y 87 artefactos válidos; sin rollback.**


## P4-B.3 — preparación controlada de bindings de la sucesora CCD 1.4

Cierre 2026-10-28T03:40:59.188483-05:00, America/Bogota. **P4-B.3 COMPLETE — SUCCESSOR BINDINGS PREPARED FOR PROMOTION REVIEW**.
Las fases históricas anteriores se conservan íntegras. La aprobación independiente
comunicada para esta etapa fue únicamente APPROVE FOR BINDING PREPARATION.

### A. Git inicial y elegibilidad

HEAD real `111c5e33f10e267b43dc0f9ea473485e61567153`, branch `main`, working tree inicialmente limpio.
Coincide con la referencia auditada; no hay commits posteriores que requieran
revisión adicional. Se leyó AGENTS.md completo. Sin cambio de branch, operaciones
destructivas, commit o push.

### B. Current/candidata y entorno antes

| Release | Estado inicial y final | Schema |
|---|---|---|
| `f01c1c37-2d3f-4bc7-8940-fe724eb71c9a` | ready; current sin cambios | ccd-1.3.0 |
| `10af4ffd-effb-41fc-bbfe-4dc48cb3398f` | staging; sin activación | ccd-1.4.0 |

La sucesora conserva el run `821b7f99-44e8-4fa5-be93-c8c361807e07` succeeded,
107 documentos/versiones ready, 107 chunks y 107 embeddings de dimensión 1024 y
norma positiva. Sus hashes de manifest/pipeline, embedding config y revisión de
código coinciden con la evidencia P4-B.2R. No se regeneró ni modificó nada de ello.

Se verificó el contenedor unificado por ID, scope, volumen, mount, base y publicación
exclusiva loopback 55463. Ningún otro contenedor comparte ese volumen o puerto.
La conexión viva confirmó `banuchat_unified`, dataset CCD, product_config versión 1
y runtime_scope/deployment iguales a la configuración habitual. La identidad de
deployment se conserva mediante fingerprint, sin copiar configuración privada.

### C–E. Derivación dinámica y plan exacto

La fuente de verdad fue el estado vivo, contrastado con currentSession y los
contratos/constraints de autorización realmente instalados. Intersección de:
cuenta activa y no deshabilitada con credencial existente (solo existencia), binding
estable CCD, versión válida para el current exacto con igual dataset/profile,
grant preexistente CCD/read sin revocación y contexto CCD de current existente.
Se comprobó además el contexto auxiliar requerido por el producto unificado.
Las cuentas no tienen deployment individual: se verificó el guard compartido de
database/deployment/runtime_scope, sin inventar una relación por cuenta.

Resultado derivado: **5 principals elegibles**. No se usaron UUIDs, número de
cuentas, perfiles o grants históricos como lista de entrada.

El plan exacto para cada principal de esa intersección es:
`principal → dataset 1 / profile_key ccd-local-demo → current f01c1c37-2d3f-4bc7-8940-fe724eb71c9a → successor 10af4ffd-effb-41fc-bbfe-4dc48cb3398f`.
La identidad del principal se representa solo mediante pseudónimo SHA-256 en la
evidencia privada. Allí se guardan las 5 entradas completas, aprobación current,
fingerprints de cuenta/binding/grant/contextos y checks de contexto equivalente.
No hay duplicados, extras u omisiones; dataset/profile son los mismos. El contexto
sucesor ya existía y tenía la misma identidad/alias técnico; no se creó contexto.

Plan sellado **antes del DML**, SHA-256 `a9a83e4878c1161de381a5d47e297d8c5c3cd0227fc3d168e6b94cc7f2aa20f2`.
También se selló el script privado que lo aplica y se verificaron ambos hashes
antes de la transacción. Los grants son condición de elegibilidad, no filas a copiar.

### F–G. Filas preexistentes e INSERT

Filas previas para la sucesora: **0**.
El aprovisionador de cuentas no es adecuado: crea cuentas/bindings/grants y
selecciona current. Se siguió el antecedente de DML administrativo privado,
limitado exclusivamente a versiones de binding y sin cambiar SQL versionado.

Una sola transacción y un solo INSERT SELECT añadieron **5 filas**; sin
ON CONFLICT DO NOTHING, UPDATE, DELETE ni retry del INSERT. `approved_at` se omitió
para usar el valor nuevo generado por PostgreSQL; se comprobó respecto al inicio
de la transacción y a las aprobaciones anteriores.

Antes de escribir se revalidaron current, staging, integridad de candidata, conjunto
exacto y snapshot baseline. Se usó el guard histórico SHARE ROW EXCLUSIVE sobre
profile_binding_versions para filas ausentes/nuevas versiones, junto con bloqueos
solo de las filas fuente necesarias: cuentas con versión current, credenciales,
grants incluidos los revocados, bindings, contextos y filas de dataset/runtime.
El bloqueo de cuentas serializa también nuevos hijos grant/credencial por sus FKs.
No se bloquearon tablas de sesiones, tokens o recovery.

### H–I. Validación y diferencias before/after

Antes de COMMIT se comprobaron cardinalidad, conjunto exacto, dataset/release/profile,
FKs, timestamps y ausencia de cualquier otra mutación. Una conexión independiente
posterior repitió la derivación y la comparación completa.

`successor_binding_principals == eligible_current_principals`: **5/5**.

`unexpected_successor_binding_principals == 0`.

La consulta READ ONLY con la semántica del componente de autorización de perfil de
currentSession encontró exactamente una combinación válida por principal para la
sucesora. Esto no es un login, sesión o smoke HTTP de staging ni la hace servible
como current. No se invocaron currentSession ni resource_context, que pueden tocar sesiones.

Snapshots inicial y final en REPEATABLE READ READ ONLY, con conteos/fingerprints de
43 tablas y superficie de seguridad. Los snapshots internos son consultas
sin efectos dentro de la transacción que contiene el INSERT; no se describen como
una transacción READ ONLY. Diferencia exacta: **solo 5 filas añadidas a
banuchat_auth.profile_binding_versions para la sucesora**. Todas las versiones
históricas conservan sus conteos/fingerprints; todas las otras tablas son idénticas.

### J–K. Current y seguridad

Current sigue siendo `f01c1c37-2d3f-4bc7-8940-fe724eb71c9a`, ready, CCD 1.3; la sucesora
`10af4ffd-effb-41fc-bbfe-4dc48cb3398f` sigue staging. Cero llamadas a publish_release, cero
cambios de puntero/status, cero publicación y cero promoción.

Grants, bindings estables, cuentas, credenciales, recovery, sesiones/tokens,
conversaciones/mensajes/citas, auth ownership, perfiles y releases auxiliares,
corpus, runs y embeddings no cambiaron. Roles, memberships, owners, schemas y ACL
de tablas/columnas/funciones son idénticos. El runtime conserva ausencia de permisos
INSERT/UPDATE/DELETE sobre profile_binding_versions, incluido nivel de columna.
No se crearon cuentas, perfiles, grants, contexto, permisos o sesiones.

### L. Evidencia, restauración e incidentes

Paquete privado ignorado: `data/ccd/local/p4b3-binding-preparation/`.
Baseline Git, identidad de entorno, snapshot before, contrato instalado, integridad
current/candidata, derivación, plan y sello previo, validación con bloqueos,
transaction result, filas pseudonimizadas, post-binding, snapshot after/diff,
no-publication/security, restauración, privacidad y run/files manifests SHA-256/tamaño.
La evidencia privada quedó cerrada y sellada antes de añadir esta sección.

PostgreSQL estaba detenido; se arrancó únicamente el contenedor identificado y se
restauró su estado detenido al terminar. Bindings, candidata, run, volumen e historial
se conservan. No se inició API, ni se operaron Ollama, Mobile, MCP, N8N u otros servicios.

Incidente conservado: el primer sellado de plan encontró ENOENT porque el harness
privado pasó una URL de módulo como string de filesystem. Ocurrió después de las
lecturas y antes de todo DML; se archivó el intento, se corrigió únicamente el
instrumento y se revalidó. La revisión previa al DML normalizó Date/JSON para las
comparaciones; el plan persistido siguió byte a byte igual y se renovó el sello del
instrumento antes de su única aplicación. No se usó una discrepancia de producto
como excepción ni hubo una segunda inserción.

Pasaron sintaxis del instrumento, preflight/contratos/FKs/plan sellado, inserción y
validaciones pre-COMMIT, verificación independiente, snapshots/seguridad, privacidad
y git diff --check. No se repitieron suites/typechecks de producto: no hubo cambios
funcionales. No se ejecutó smoke completo, RAG, promoción u OE5.
No se exportaron passwords, hashes de contraseña, tokens, recovery data, correos,
filas sensibles, .env, dumps, corpus privado, PDFs o datos personales.

### M–N. Git final, límite y estado

Única modificación versionada propia de esta tarea: esta sección aditiva en
`eval/integration/results/ccd-current-promotion.md`. Todo el contenido histórico se
conserva íntegro. HEAD/branch sin cambios, sin commit ni push; git diff --check correcto.

Los bindings quedan preparados únicamente para revisión de promoción en otra etapa.
No se declara aprobada esa promoción, publicación, aceptación CCD/institucional,
producción o finalización de OE5. Se detiene la operación aquí.

`institutional_endorsement = false`

`independent_human_acceptance = false`

**P4-B.3 COMPLETE — SUCCESSOR BINDINGS PREPARED FOR PROMOTION REVIEW**


## P4-B.4 — promoción detenida antes de publicar por compatibilidad de artefactos

Cierre 2026-10-28T04:07:21.830045-05:00, America/Bogota.

**P4-B.4 BLOCKED — normal API has no artifact root for CCD 1.4 version label**

Esta sección es aditiva; conserva la promoción histórica CCD 1.3 y P4-B.3.
La aprobación independiente comunicada fue APPROVE FOR PROMOTION, condicionada
a las revalidaciones y al runtime normal exigidos por esta tarea. No se efectuó
la promoción y no se heredaron resultados HTTP de otras etapas como resultados nuevos.

### Git y entorno iniciales

HEAD `19e4f609c4ba331438ae0fff717471664a1cad2d`, branch `main`, working tree limpio. Coincide con el HEAD
auditado. Desde la revisión materializada `c145b5adb62fee7f4720d2d31322d08d4100c0dd`
solo cambiaron los informes P4-B.2R y P4-B.3, sin cambios funcionales del producto.
Se leyó AGENTS.md completo. Sin cambio de branch ni operaciones Git destructivas.

Se revalidó el contenedor PostgreSQL unificado por ID/scope, volumen/mount, base y
puerto exclusivo loopback 55463; no hay otro contenedor compartiendo volumen/puerto.
PostgreSQL estaba detenido y se arrancó únicamente ese mismo contenedor. La API no
tenía listener en 3004 y no fue iniciada por la tarea. No se operaron Ollama ni N8N.

### Puertas de identidad y autorización aprobadas en lectura

Current antes/después: `f01c1c37-2d3f-4bc7-8940-fe724eb71c9a`, ready, ccd-1.3.0.
Sucesora antes/después: `10af4ffd-effb-41fc-bbfe-4dc48cb3398f`, staging, ccd-1.4.0.

La candidata conserva los hashes auditados de manifest y pipeline, embedding config
y procedencia de código `c145b5adb62fee7f4720d2d31322d08d4100c0dd`. El run
`821b7f99-44e8-4fa5-be93-c8c361807e07` sigue succeeded; hay 107 documentos/versiones
ready, 107 chunks y 107 embeddings de 1024 dimensiones y norma positiva. No se
regeneró contenido ni embeddings ni se releyeron/copiaron los originales.

El conjunto se derivó de nuevo de cuenta activa/no deshabilitada con credencial
existente, binding estable CCD, versión current, grant CCD/read no revocado,
contextos current/sucesor compatibles y contexto auxiliar válido. Resultado vivo:
5 principals elegibles y 5 bindings de la sucesora, igualdad exacta y cero extras.
El plan auditado P4-B.3 permanece exactamente igual. No se añadieron/corrigieron bindings.

`assert_release_complete` pasó para ambas releases dentro de una transacción
REPEATABLE READ READ ONLY. CCD 1.3 sigue completa, ready y con sus autorizaciones
históricas, como destino válido previsto de rollback. No se hizo rollback de ensayo.

### Bloqueo concreto del runtime normal

El comando normal `npm start` carga `scripts/start-unified.mts`, que usa
`startAuthenticatedApi` de `backend/api/src/authenticated-main.ts`.
Su configuración CCD define `version_roots` únicamente para:

- `bch03-m01-m12-local-1`;
- `bch03-ccd-local-2`;
- `bch03-ccd-local-3`;
- `bch-ccd-knowledge-1`.

Una consulta READ ONLY de metadata viva confirma que los 107 document_versions
de la candidata tienen `version_label = bch-ccd-knowledge-2`. Esa clave no existe
en el mapa normal anterior. Se reconstruyeron sus claves desde el AST TypeScript
actual, sin asumir una lista histórica como configuración vigente.

`backend/api/src/application/document-artifact.ts` exige, cuando existe
`version_roots`, que `Object.hasOwn(storage.version_roots, row.version_label)` sea
true. Si falta la clave lanza `DocumentArtifactError("not_found")`; no hace fallback
a storage.root. `AuthenticatedResources.artifact()` delega al mismo resolvedor con
la configuración de arranque, sin registro alternativo para esa versión.

Por tanto, hacer ready/current a la candidata no resolvería la descarga: su label
seguiría sin root registrado en el producto normal. Es una incompatibilidad
demostrada entre metadata viva y configuración/guard del código, anterior a la
publicación. **No se presenta como un HTTP 404 observado**: no se llamó al endpoint,
no se simuló la respuesta y no se publicó para provocar el fallo.

AGENTS.md ordena: «Si código y contrato vigente son incompatibles, detenerse y
reportarlo». Además, esta tarea prohíbe modificar producto/configuración para hacer
pasar la promoción y exige artifact protegido con HTTP 200 y bytes/SHA correctos.
Se detuvo la operación antes de exponer un current que no cumpliría esa puerta.
No se añadió ningún root, preload, selector especial, endpoint ni bypass.

Pendiente para una tarea separada: revisar/registrar el root autorizado de esa
versión en el arranque normal, verificar su correspondencia con los SHA auditados
y reauditar esa compatibilidad antes de reautorizar la promoción. Esta tarea no
implementó el cambio ni eligió silenciosamente un directorio alternativo.

### Publicación, smoke y rollback no ejecutados

Llamadas a publish_release: **0**. Transacción de promoción: **no iniciada**.
COMMIT de publicación: **no intentado**. Rollback de release: **0**, no requerido
porque current nunca cambió. No hubo UPDATE directo de puntero/status ni otro DML.

No ejecutados por esta detención previa: precheck HTTP con fixture antigua,
autenticación post-current del conjunto completo, smoke documental/artifact,
ownership, C01–C09 por HTTP, transición de conversación histórica y reinicio normal
de API. No existen nuevos PASS de esos controles; los 9/9 de staging siguen siendo
antecedentes, no validación current. Tampoco se repitieron 249/27/11, descargas
masivas, embeddings, suites/typechecks generales, Android, MCP/N8N u OE5.

### Snapshots, restauración y evidencia

Snapshot inicial y final READ ONLY: coincidencia exacta de 43 tablas, identidad,
releases, run, conteos/dimensiones/normas, bindings, grants, contextos, runtime scope,
cuentas/auth/credenciales/recovery mediante fingerprints, sesiones/tokens,
conversaciones/mensajes/citas, auxiliares, roles/memberships, owners, schemas y ACL.
**Cero tablas o filas de producto modificadas**. Sin nuevas sesiones, eventos de
autenticación o rate limits; no se descifraron credenciales HTTP de ensayo.

PostgreSQL recuperó su estado detenido inicial, conservando volumen, releases,
bindings y auditoría. La API permanece detenida como al inicio; no quedó ningún
proceso temporal/instrumentado. Los demás servicios no se modificaron.

Incidente privado conservado: al registrar el número de línea del guard, el
formatter usó String.index en lugar de indexOf y produjo TypeError dentro del
primer preflight READ ONLY. Se conservó el intento y su snapshot, se cerró esa
transacción con ROLLBACK de lectura y se corrigió solo el formatter. La revalidación
READ ONLY produjo el mismo snapshot y dejó sellada la metadata del bloqueo. No hubo
fallo runtime post-current ni retry de publicación/DML.

Evidencia privada cerrada/sellada antes de esta sección:
`data/ccd/local/p4b4-current-promotion/`, con baseline, identidad del entorno,
snapshots before/after, revalidación de sucesora, equivalencia de bindings,
rollback readiness, AST/metadata/guard de artefactos, ledger de fases omitidas,
commit outcome no intentado, diff idéntico, restauración, privacidad y manifiestos
SHA-256/tamaño. No hay passwords/tokens/recovery values, .env, dumps, originales,
corpus privado, vectores completos, filas sensibles o paths personales absolutos.

Único cambio versionado autorizado: esta sección aditiva del informe. Contenido
histórico íntegro, HEAD/branch sin cambios, sin commit/push; git diff --check correcto.
No se declara promovida la candidata, aval CCD/UNAB, producción institucional ni OE5.

`institutional_endorsement = false`

`independent_human_acceptance = false`

**P4-B.4 BLOCKED — normal API has no artifact root for CCD 1.4 version label**


## P4-B.4A — root explícito de artefactos CCD 1.4 registrado y verificado

Cierre 2026-10-28T04:29:57.980689-05:00, America/Bogota.

**P4-B.4A COMPLETE — CCD 1.4 ARTIFACT ROOT REGISTERED AND VERIFIED**

Esta sección es aditiva: el bloqueo histórico P4-B.4 se conserva como detención
real anterior a cualquier publicación. Esta tarea resuelve exclusivamente su
configuración de almacenamiento; **no reanuda ni ejecuta la promoción**.

### Baseline y bloqueo revalidado antes del cambio

HEAD real `3a9602b66b878ccd01ef95a925d9b6a3f663bb8b`, branch `main`, working tree inicialmente limpio,
coincidente con la referencia auditada. Se leyó AGENTS.md completo. Sin cambio
de branch, operaciones Git destructivas, commit o push.

Desde el código actual se confirmó que startAuthenticatedApi usa version_roots
en modo ccd_local, registra bch-ccd-knowledge-1 y no registraba bch-ccd-knowledge-2.
El resolvedor exige Object.hasOwn para el label y rechaza con not_found antes de
filesystem si falta, sin fallback a storage.root. La ruta normal de recursos
delega a ese mismo almacenamiento, sin un registro alternativo.
La metadata viva de la candidata confirmó 107 document_versions con exactamente
version_label bch-ccd-knowledge-2. Estas premisas pasaron antes de modificar producto.

### Root existente y verificación de bytes

Se usó únicamente `data/ccd/local/product-knowledge-v2/`, que ya existía.
No se creó otra copia, no se reconstruyó el corpus ni se copiaron PDFs originales.
El root es un directorio real en la ubicación configurada, sin symlink/junction
del root; se verificó contención de realpaths de sus componentes/archivos, sin
symlinks o junctions que escaparan de él.

Adoption v2 SHA-256 observado y esperado:
`4824a74e21029a1964d681958b8ca452b35c14de3a1d6c94cd3516c079abf81e`.
Los paths se derivaron de la metadata viva y de los 107 artifacts de adoption,
sin una lista manual. Cada path/key/SHA coincide entre esas dos fuentes; el
inventario de artifacts coincide exactamente. Solo se guardaron paths relativos,
SHA esperado/observado, resultados y conteos, nunca contenido documental.

| Comprobación privada | Resultado |
|---|---:|
| expected | 107 |
| existing | 107 |
| inside_root | 107 |
| hash_match | 107 |
| wrong_label | 0 |
| missing | 0 |
| mismatch | 0 |

Después del cambio se importó la configuración real, se comprobó que su root v2
es exactamente ese directorio y se releyeron sus 107 archivos para confirmar los
SHA contra la metadata sellada; adoption permaneció idéntica.

### Cambio funcional mínimo

En `backend/api/src/authenticated-main.ts` se añadió explícitamente:

`bch-ccd-knowledge-2 → data/ccd/local/product-knowledge-v2/`.

Para probar la configuración utilizada realmente por el arranque sin abrir una
API o duplicarla en otro registro, se extrajo solo el antiguo objeto CCD inline
a `ccdArtifactStorage()`, función pequeña, pura, sin argumentos, en el mismo archivo.
El arranque normal consume esa misma función; la rama sintética no cambió.
No hay helper adicional en otro archivo ni clase/framework/servicio de configuración.

Los cuatro roots históricos se conservan con sus paths exactos: m01-m12,
expanded-v2, guidance-v3 y product-knowledge-v1. La configuración sigue siendo
una allowlist estática de cinco entradas literales. No hay wildcard, derivación
de rutas por label, input HTTP, root genérico o fallback nuevo.
`getDocumentArtifact()` permanece byte por byte intacto.

### Pruebas realmente ejecutadas

Cuatro tests nuevos de API comprueban la configuración CCD normal completa,
la selección exclusiva del root v2 frente a storage.root/v1, rechazo de labels
desconocidos o heredados del prototipo con cero accesos filesystem y rechazo de
bytes v2 con SHA incorrecto. Los tests usan SQL/filesystem controlados, sin
depender del corpus privado ni iniciar la API. La prueba existente de versión
desconocida y las de hash incorrecto se conservan sin debilitar aserciones.

| Validación | Resultado nuevo |
|---|---|
| Focalizados storage/resolver/HTTP de artefactos | 34/34, cero fail/cancelled/skipped/todo |
| API npm run typecheck | exit 0 |
| API npm test, una sola ejecución completa | 698/698, cero fail/cancelled/skipped/todo |
| 107 artifacts reales mediante el root configurado | 107/107 SHA correctos |
| Snapshot inicial/final | idénticos, 43 tablas y superficie de seguridad |
| git diff --check | correcto |

No se repitieron diez corridas ni bancos RAG, suites RAG/MCP/Mobile, verify-local
de cuatro paquetes, workflows CI, Android, N8N u OE5. Los servidores HTTP/stdio
fixture que forman parte de la suite API no son el runtime normal ni servicios externos.
No hubo intermitencias/fallos en las validaciones ejecutadas de esta tarea.

### No publicación y entorno

Current permanece `f01c1c37-2d3f-4bc7-8940-fe724eb71c9a`, ready, CCD 1.3.
La candidata `10af4ffd-effb-41fc-bbfe-4dc48cb3398f` permanece staging, CCD 1.4,
con sus 107 documentos/chunks/embeddings y los bindings preparados intactos.
Los snapshots fuertes READ ONLY de 43 tablas y seguridad coinciden exactamente:
cero cambios de releases/status, current pointer, corpus, runs, embedding configs,
bindings, grants, cuentas/auth, auxiliares, roles, memberships, owners o ACL.
Llamadas a publish_release: 0. DML de producto: 0.

PostgreSQL se identificó por contenedor/scope/volumen/mount/base y puerto exclusivo
loopback antes de arrancarlo. Estaba detenido; se arrancó solo ese contenedor para
lecturas y se restauró su estado detenido, conservando volumen e historial.
No se inició la API normal ni se cambiaron Ollama, modelos, prompts o top_k.
No se modificaron SQL, REST/OpenAPI, MCP, N8N, Mobile o workflows CI.

No se hizo una descarga HTTP v2 de la candidata staging ni se alteró el filtro
de releases ready para simularla. La prueba HTTP real por la ruta protegida
corresponde a la reanudación de P4-B.4 después de revisar este cambio.

### Scope, evidencia y cierre

Archivos versionados propios de esta tarea:

- `backend/api/src/authenticated-main.ts`;
- `backend/api/test/ccd-artifact-storage.test.ts`;
- esta sección aditiva de `eval/integration/results/ccd-current-promotion.md`.

El pequeño helper está dentro del primer archivo y solo permite probar la misma
configuración que consume el arranque. No se añadieron otras abstracciones.
El resolvedor, los tests existentes, los contratos, paquetes/locks y todos los
otros archivos protegidos inspeccionados conservan sus SHA iniciales.

Evidencia privada cerrada/sellada antes de añadir esta sección:
`data/ccd/local/p4b4a-artifact-root/`, con baseline, bloqueo pre-change, metadata
viva, identidad del root, SHA de adoption, 107 paths/hashes/resultados sin contenidos,
diff funcional, logs/resultados de pruebas, snapshot before/after, no-publication,
restauración, privacidad, run manifest y files manifest SHA-256/tamaño.
No contiene documentos, PDFs, contenido CCD, .env, passwords/tokens, filas sensibles
o paths personales absolutos.

El bloqueo P4-B.4 no se reescribe como una promoción aprobada. La compatibilidad
del root queda corregida y verificada en código/tests y bytes reales; la promoción
continúa pendiente de revisión y de una tarea de reanudación explícita.
Sin commit ni push; no se continúa con promoción ni nuevas mejoras en esta tarea.

`institutional_endorsement = false`

`independent_human_acceptance = false`

**P4-B.4A COMPLETE — CCD 1.4 ARTIFACT ROOT REGISTERED AND VERIFIED**

## P4-B.4 — reanudación tras P4-B.4A: publicación y rollback confirmado

Cierre 2026-10-28, America/Bogota. Esta sección es aditiva y conserva el bloqueo
P4-B.4 original, la corrección P4-B.4A y las fases anteriores.

**P4-B.4 BLOCKED — POST-CURRENT FAILURE, ROLLED BACK TO CCD 1.3: smoke-owner login exhausted the normal rate limit after redundant harness logins**

### Baseline y precondiciones

HEAD `6a40d814a2a072e9b5ab96bf17b83c644102ef4b`, branch `main`, árbol limpio
incluyendo untracked. Se leyó AGENTS.md completo. Sin cambios de branch, operaciones
Git destructivas, commit ni push. No se modificó producto.

Se reidentificó el PostgreSQL habitual por ID, scope `unified-isolated`, volumen
`banuchat-unified-data`, mount `/var/lib/postgresql/data`, base `banuchat_unified`
y binding exclusivo `127.0.0.1:55463`. Sin otros contenedores compartiendo volumen
ni puerto. PostgreSQL estaba detenido y solo se arrancó ese contenedor existente.
La API inicialmente no tenía listener en 3004.

El root normal `bch-ccd-knowledge-2 → data/ccd/local/product-knowledge-v2/` existe
y coincide con la configuración revisada. No se repitieron los 107 SHA de P4-B.4A.
El cambio de composición de artifacts no se interpretó como cambio en el scope de
captureCcdCode: no se recreó ni rematerializó la candidata.

Snapshot inicial READ ONLY de 43 tablas, corpus/runs/vectores, autorización/auth,
historial, auxiliares, roles/memberships, propietarios y ACL, con fingerprints y
metadata limitada, sin exportar secretos. Se revalidaron:

- current `f01c1c37-2d3f-4bc7-8940-fe724eb71c9a`, ready, CCD 1.3;
- sucesora `10af4ffd-effb-41fc-bbfe-4dc48cb3398f`, staging, CCD 1.4;
- run `821b7f99-44e8-4fa5-be93-c8c361807e07`, succeeded;
- 107 documentos/versiones ready, 107 chunks, 107 embeddings de dimensión 1024;
- manifiesto/pipeline/config/procedencia auditados, sin drift;
- conjunto elegible derivado de nuevo: 5 principals, bindings sucesora 5/5, cero
  extras; plan P4-B.3 exactamente igual, grants/contextos/auxiliares sin cambios.

assert_release_complete pasó para ambas releases en lectura. CCD 1.3 conservaba
sus bindings y estaba lista para rollback, sin ensayo de rollback.

### Modificación explícita de la puerta de cuentas

Durante la reanudación se localizaron credenciales de cuatro principals en los dos
almacenes DPAPI existentes. La quinta cuenta procede de un diagnóstico cuya
contraseña aleatoria solo se usó en memoria. El usuario confirmó que no existe otro
almacén autorizado/documentado y modificó expresamente la puerta de P4-B.4:
verificación SQL release-specific para todos y login HTTP solo para los principals
con credenciales legítimamente disponibles. La ausencia histórica de una contraseña
operativa, por sí sola, dejó de ser condición de bloqueo/rollback.

No se restablecieron contraseñas, generaron credenciales, crearon nuevos almacenes,
intentaron revertir hashes ni fabricaron sesiones/tokens. Las contraseñas DPAPI se
usaron exclusivamente en memoria. Los conteos de principals y disponibilidad se
derivaron dinámicamente, sin usar cinco o cuatro como entradas de selección.

Resultado post-current antes del fallo posterior:

| Verificación | Resultado |
| --- | --- |
| release_authorization | **5/5**, SQL READ ONLY, exactamente una combinación válida por principal, cero extras |
| http_login_verified | **4/5**, todos los disponibles: login 200, /auth/me 200, release sucesora, ccd_local, capacidades esperadas, logout 204 |
| credential_unavailable | **1**, AUTHORIZATION_SQL_VERIFIED_CREDENTIAL_UNAVAILABLE; **sin PASS HTTP** |

La consulta SQL reprodujo el join release-specific de la rama normal CCD de
AuthService.currentSession: cuenta activa/no deshabilitada con credencial existente,
binding estable y versión del nuevo current, grant ccd_local/read no revocado,
contexto CCD correspondiente; además validó el contexto auxiliar de unified y la
selección de current ready no sintético. No sustituyó la validación de una sesión
real para el principal sin contraseña operativa.

### Precheck normal y publicación única

API iniciada mediante `npm start` de backend/api, sin preload, instrumentación ni
runtime alternativo. Bajo CCD 1.3 pasaron login/me, conversación nueva, la consulta
«¿Qué temas se estudian en el curso de Inteligencia Artificial Generativa?», HTTP 201
no abstentivo con cita documental, historial exacto y artifact protegido HTTP 200
con SHA igual al source_sha256 de DB, label bch-ccd-knowledge-1.

Incidencias del arnés privado previas a publicación: inicialmente esperaba un campo
dataset_release_id en la respuesta HTTP de detalle, aunque el contrato no lo expone.
Se corrigió solo el arnés para comprobarlo mediante SQL READ ONLY y se reutilizó
la misma respuesta/conversación, sin repetir el turno RAG; el artifact representativo
se descargó dos veces en esa comprobación inicial. Mientras se esperaba la
aclaración sobre la quinta cuenta, se eliminó esa fixture normalmente; después de
la autorización modificada se creó otra fixture bajo CCD 1.3 para la transición.
Estas operaciones adicionales y logins quedaron acreditados, no ocultos.

Promoción: **una llamada a publish_release(sucesora) y un COMMIT**, confirmados.
Transacción corta con bloqueo de dataset/releases y fuentes de autorización,
revalidación exacta de current/staging/identidad/bindings/grants/contextos,
assert_release_complete y validación de current sucesora ready y CCD 1.3 ready.
Se comprobó que solo cambiaron datasets y dataset_releases, con el resto de campos,
tablas, corpus y seguridad conservados. Sin UPDATE directo de puntero/status ni retry.
La transacción duró menos de un segundo antes del COMMIT.

### Fallo post-current y causa

Tras los cuatro logins post-current correctos y sus logout, el arnés intentó otro
login del propietario para iniciar el smoke documental. Ese login agotó la ventana
normal por UID: límite **5 intentos por 900 segundos**. La planificación del arnés
introdujo autenticaciones redundantes y fue incorrecta; no se atribuye el fallo a
RAG ni al arreglo de artifacts de P4-B.4A.

La causa se reconstruyó con lectura del código y estado persistido:

- cuatro login/me/logout post-current completados entre 09:58:42Z y 09:58:45Z;
- evento rate_limited a las 09:58:46Z, sin sesión adicional exitosa ni conversación
  documental CCD 1.4 creada;
- bucket del propietario con siete intentos en 09:45Z–10:00Z, incluidos el intento
  de smoke y una primera comprobación HTTP de rollback aún dentro de esa ventana;
- la última fixture existente seguía siendo la del precheck CCD 1.3;
- tras el cambio natural de ventana, la verificación HTTP de rollback pasó.

El wrapper original conservó el código ERR_ASSERTION y la fase amplia
ccd14-documentary-artifact, pero no el status HTTP de esa petición. **No se registra
un 429 observado que no quedó capturado**: la atribución al rate limiter está
respaldada por los contadores, auditoría, secuencia de sesiones y código. La lectura
posterior de la fixture antigua no se presenta como smoke de la sucesora.

No se borraron contadores, alteró política, cambió código ni intentó completar el
smoke con otro principal para evitar el fallo. Se siguió la regla de rollback.

### Rollback único y resultado real

Se confirmó CCD 1.3 ready, completa y con autorización/bindings válidos. Se ejecutó
**una llamada a publish_release(CCD 1.3) y un COMMIT**, confirmados, sin UPDATE
directo ni segunda promoción. Current volvió a
`f01c1c37-2d3f-4bc7-8940-fe724eb71c9a`.

La primera verificación HTTP de rollback se rechazó todavía dentro de la ventana
agotada. Tras diagnosticar en lectura y pasar naturalmente a la siguiente ventana,
se verificó sin repetir ninguna operación de publicación: login 200, /auth/me 200
bajo CCD 1.3, conversación nueva, documental 201 no abstentivo, cita histórica,
artifact protegido 200 con SHA correcto e historial exacto. Logout normal y
eliminación exclusiva de las fixtures propias por DELETE del propietario.

**No ejecutados** por la detención inmediata: turno documental/artifact CCD 1.4,
C01–C09 sobre current, ownership, transición histórica GET/POST 409 bajo CCD 1.4 y
reinicio normal post-current. No tienen PASS nuevo. Hubo dos arranques normales antes
de promover; no se confunden con el gate de reinicio post-current.

### Estado final, límites y evidencia

Snapshot final READ ONLY comparado con el inicial: 43 tablas. Current restaurado;
CCD 1.3 ready. La sucesora permanece **ready, no current**, con validated_at de la
publicación: el rollback normal solo restableció el puntero, sin volverla a staging.
No se alteró su status manualmente ni se eliminó la release.

Cambios persistidos clasificados:

- dataset_releases: sin filas nuevas; solo status staging→ready/validated_at de la
  sucesora; las otras releases permanecen idénticas;
- sessions: +9, **9/9 revocadas mediante logout normal**;
- refresh_tokens: +9, retenidos con las sesiones revocadas;
- security_events: +20, 18 de login/logout y dos rate_limited; auditoría conservada;
- auth_rate_limits: +13 buckets normales, sin limpieza/reset.

Datasets volvió al fingerprint inicial. Conversaciones, mensajes, citas y ownership
coinciden con el baseline tras las eliminaciones normales. Corpus, runs, embeddings,
bindings, grants, cuentas, credenciales, recovery, auxiliares, runtime scope, roles,
memberships, propietarios y ACL permanecen intactos. No hubo mutaciones inesperadas.
Ambas releases siguen pasando assert_release_complete; autorización final CCD 1.3 5/5.

API detenida correctamente con SIGINT y PostgreSQL detenido como al inicio, volumen
y auditoría conservados. No se operaron otros contenedores, Ollama ni N8N. No se
repitieron 249/27/11, 107 artifacts, suites/typechecks generales, Mobile, MCP,
Android ni OE5.

Evidencia privada: `data/ccd/local/p4b4-current-promotion-resumed/`, con baseline,
entorno/root, snapshots, revalidación/rollback readiness, modificación de la puerta,
prechecks, transacciones, autorización 5/5 y HTTP 4/5 separados, diagnóstico del
rate limiter, rollback HTTP, cleanup/restauración, privacidad, run manifest y
files manifest SHA-256/tamaño. Incluye respuestas de las fixtures HTTP propias;
no copia originales, corpus completo, vectores, passwords/tokens, hashes de
credenciales, datos de recuperación ni paths personales absolutos.

Único cambio versionable: esta sección de
`eval/integration/results/ccd-current-promotion.md`. git diff --check aprobado;
status final limitado a ese archivo. Sin secretos añadidos, commit ni push.

Pendiente para una tarea explícita: revisar el arnés para reutilizar sesiones o
planificar el presupuesto de login sin modificar límites, y autorizar una nueva
operación que tenga en cuenta que la sucesora ahora está ready. Esta tarea **no**
vuelve a promover ni ejecuta etapas posteriores. La línea CCD 1.4 no queda cerrada
como promoción exitosa. Sin producción, aval CCD, despliegue UNAB ni OE5 completo.

## P4-B.4R — reintento con sesión conservada: C05 bloqueado y rollback confirmado

2026-10-28, America/Bogota. Sección aditiva: conserva íntegramente las fases
anteriores, P4-B.4A y la primera publicación/rollback por autenticaciones redundantes.

**P4-B.4R BLOCKED — PRODUCT FAILURE, ROLLED BACK TO CCD 1.3: C05 HTTP 503 DEPENDENCY_UNAVAILABLE**

### Baseline y presupuesto antes de autenticar

HEAD real y esperado `e8c35cf832e8d69464ff2b8735b1104a56ddc8cd`, branch `main`,
árbol limpio incluyendo untracked. AGENTS.md leído completo. Sin cambios de branch,
operaciones Git destructivas, commit ni push. No se modificó producto.

Se reidentificó el contenedor PostgreSQL habitual por ID/scope, volumen/mount,
base `banuchat_unified` y puerto exclusivo loopback 55463. Inicialmente estaba
detenido; solo se arrancó ese contenedor existente. API inicialmente ausente en 3004.

Estado vivo inicial correcto: CCD 1.3 `f01c1c37-2d3f-4bc7-8940-fe724eb71c9a`
ready/current, y CCD 1.4 `10af4ffd-effb-41fc-bbfe-4dc48cb3398f` ready/no current.
No se exigió staging ni se alteró status/validated_at. Se confirmaron 107 documentos,
107 chunks y 107 embeddings de 1024 dimensiones, run
`821b7f99-44e8-4fa5-be93-c8c361807e07` succeeded, identidad/procedencia auditadas,
root normal v2 existente y assert_release_complete para ambas releases.
No se repitieron ingesta, materialización, 107 hashes ni bancos/suites generales.

Se derivaron todos los principals y las credenciales disponibles en los dos DPAPI
existentes. Autorización release-specific **5/5**, exactamente una combinación
válida por principal, cero extras; bindings/grants/contextos y contexto auxiliar
conservados. Cuatro disponen de credencial operativa; el quinto conserva el estado
AUTHORIZATION_SQL_VERIFIED_CREDENTIAL_UNAVAILABLE, sin PASS HTTP inventado.
El HTTP 4/5 de la publicación anterior no se repitió ni se contabiliza como nuevo.

Antes de cualquier login se inspeccionaron READ ONLY los buckets aplicables:
login_uid 5/900s para A y B, login_origin 30/900s y hash_work 20/60s. Había presupuesto
natural suficiente para dos logins. Se seleccionaron A/B dinámicamente entre los
principals autorizados con credencial legítima, por consumo vigente e identidad,
sin hardcodear sus identificadores ni el conteo de credenciales disponibles.
Se revalidó el presupuesto inmediatamente antes del único login realizado.

Plan explícito: un login de A, sesión conservada para toda la secuencia incluido
restart; un login de B exclusivamente para ownership. Tokens/access/refresh solo
en memoria del coordinador. Sin resets de límites, nuevas contraseñas/almacenes,
sesiones fabricadas ni modificaciones de cuentas/bindings/grants.

### Gates realmente aprobados

API iniciada mediante `npm start` normal, sin preload, instrumentación ni runtime
alternativo. A hizo **un** login bajo CCD 1.3. /auth/me confirmó la release antigua,
evidence mode y capacidades. Con esa sesión se creó la fixture histórica y pasó
la consulta documental «¿Qué temas se estudian en el curso de Inteligencia Artificial
Generativa?»: respuesta 201 no abstentiva, cita válida, artifact protegido 200 con
SHA correcto e historial exacto. No se hizo logout antes de promover.

Promoción: una llamada a publish_release(CCD 1.4) y un COMMIT, confirmados.
Duración previa al COMMIT: 424 ms. La transacción bloqueó/revalidó
los objetos y fuentes de autorización pertinentes; seleccionó una sucesora ya ready.
**Única tabla cambiada: banuchat.datasets, exclusivamente current_release_id.**
Todas las releases, status y validated_at permanecieron idénticos. Sin UPDATE directo,
segunda publicación de la sucesora ni retry.

Con el mismo access token/sesión de A, /auth/me respondió 200 y adoptó CCD 1.4,
ccd_local y las capacidades esperadas. Se volvió a comprobar SQL **5/5**, cero extras.

Una conversación NUEVA bajo CCD 1.4 respondió 201 no abstentivo a la misma consulta,
con citas de la sucesora e historial exacto. Se descargó **un artifact representativo**
por el endpoint protegido: HTTP 200, document_version
`6a9e07aa-ace1-4058-a648-4337a083f556`, label **bch-ccd-knowledge-2**,
185 bytes, SHA-256 `04ffe17deeab0edd903f42c3335c33368573c1721f3bfeb39e3fcac636b5c31b` igual al source_sha256 de DB.
Esto sí prueba por HTTP real el root de P4-B.4A; no es una simulación ni la descarga
histórica. No se descargaron los 107 artifacts.

### C01–C09: resultado explícito y fallo real observado

Se conservaron las preguntas y aserciones congeladas. Se usó la misma sesión de A,
con conversaciones separadas y mensajes previos de usuario enviados por HTTP normal;
las respuestas previas fueron las reales, sin inyectar el texto de assistant de la
fixture controlada. No se sustituyó la API por un runtime de diagnóstico.

| Control | Resultado nuevo |
| --- | --- |
| C01 | PASS, HTTP 201 y rúbrica congelada aprobada |
| C02 | PASS, HTTP 201 y rúbrica congelada aprobada |
| C03 | PASS, HTTP 201, follow-up real y rúbrica aprobada |
| C04 | PASS, HTTP 201 y rúbrica congelada aprobada |
| C05 | **FAIL: HTTP 503, DEPENDENCY_UNAVAILABLE**, esperado 201 |
| C06 | NOT_EXECUTED: detención tras C05 y rollback |
| C07 | NOT_EXECUTED: detención tras C05 y rollback |
| C08 | NOT_EXECUTED: detención tras C05 y rollback |
| C09 | NOT_EXECUTED: detención tras C05 y rollback |

C05 exacto: «¿Cuánto cuesta un curso en 2026? ¿Qué documento lo dice?».
503 observado a las 08:19:15.966 America/Bogota (13:19:15.966Z). No hubo respuesta
201 para evaluar sus aserciones de tarifa/procedencia mixta. El registro HTTP
conserva status y código seguros; no se presenta como error de serialización del
arnés ni como un 429 inferido. Total: **4 PASS, 1 FAIL, 4 no ejecutados**, sin 9/9.

### Clasificación y límite causal

Después del rollback se inspeccionó el código y se evaluaron únicamente predicados
puros, sin repetir C05 por HTTP ni llamar servicios de diagnóstico:

- requiresConversationalOrchestration devuelve false para C04 y **true para C05**;
- C05 reconoce el tema fees; no aplica el bypass documental de badge;
- planCalls combina find_documents, get_courses y search_knowledge al encontrar
  curso/documento/dice; más de una operación activa la orquestación;
- unifiedResponder evalúa esa rama **antes** de su retorno final a input.rag(query),
  invoca el orquestador configurado y después el agente MCP;
- falta/fallo del orquestador y ciertos fallos de dependencias se proyectan como
  DEPENDENCY_UNAVAILABLE/503 en la API normal.

La consulta congelada entra, por tanto, en una dependencia de orquestación de la
composición normal; es compatible con el 503 observado. **No quedó demostrada la
causa exacta dentro de esa dependencia**, ni que se alcanzara MCP, ni una regresión
del contenido CCD 1.4 o de Ollama. No se instrumentó el runtime para atribuir una
excepción interna no expuesta. El fallo acreditado es el servicio HTTP del control
obligatorio bajo current, suficiente para bloquear este cierre. RAG/artifact del
smoke anterior sí habían pasado.

Propuesta para una tarea separada: revisar el desvío de esta consulta canónica CCD
a orquestación compuesta antes de Document RAG y su dependencia N8N/MCP. No se
implementó un bypass, cambió el router, modificó la pregunta/rúbrica, activó N8N,
ni intentó hacer pasar el control con otro runtime. No hubo otra promoción.

### Rollback, sesión y gates pendientes

Rollback normal una vez mediante publish_release(CCD 1.3), un COMMIT, confirmado;
509 ms antes del COMMIT. Solo cambió el puntero current, sin status/validated_at.
Se confirmó CCD 1.3 completa/ready con autorización SQL 5/5. **La misma sesión de A**
siguió funcionando: /auth/me 200 sobre CCD 1.3, nueva conversación documental 201,
cita/artifact histórico 200 con SHA correcto e historial exacto. Sin nuevo login,
refresh ni retry de publicación.

Se eliminaron las ocho fixtures propias por DELETE normal del propietario y se
hizo logout de A al final. Su única sesión quedó revocada en DB. El gate de ownership
y el primer login de B no llegaron a ejecutarse. Tampoco la transición histórica
GET/POST409 bajo CCD 1.4 ni el reinicio normal post-current.

El helper de reutilización de access se usó también para verificar rollback; sus
etiquetas internas restart en el ledger no significan que se reiniciara la API.
Hubo un arranque normal y una detención normal: **ningún PASS de restart**.

Consumo observado, contrastado con los buckets persistidos y la auditoría:

| Medida | Resultado |
| --- | --- |
| Login attempts A | 1 |
| Login attempts B | 0, etapa no alcanzada |
| Total logins | 1 |
| Nuevos rate_limited | 0 |
| Sesiones creadas/revocadas | 1/1 |

El presupuesto máximo de dos logins se respetó. Este fallo es distinto del
agotamiento de login_uid del intento previo.

### Snapshot final, restauración y evidencia

Snapshot final READ ONLY: 43 tablas. Current vuelve a CCD 1.3; la sucesora sigue
ready/no current. Datasets y todas las releases coinciden exactamente con el
baseline, incluidos status/validated_at. Corpus 107/107/107, run/embeddings,
bindings/grants/contextos, cuentas/credenciales/recovery, auxiliares, runtime scope,
roles/memberships, propietarios y ACL permanecen intactos. Conversaciones/mensajes/
citas/ownership coinciden con el baseline después del cleanup normal.

Cambios persistidos exclusivamente operativos: sessions +1 (revocada), refresh_tokens
+1, security_events +2 (login/logout) y auth_rate_limits +3 buckets. Cero eventos
rate_limited; no se borraron auditoría ni buckets para igualar fingerprints.

Incidencia privada de cierre, posterior al rollback: el agregado de security_events
usaba created_at en lugar del occurred_at instalado (42703, READ ONLY revertido).
Se verificó el esquema y corrigió solo esa consulta privada; el snapshot final pasó.
Se conserva la evidencia del primer intento. No causó el 503 de C05 ni añadió
logins o publicaciones.

API detenida correctamente con SIGINT y PostgreSQL devuelto a su estado detenido
inicial, conservando volumen/auditoría. No se arrancaron/configuraron otros servicios,
N8N u Ollama. No se repitieron 249/27/11, suites generales, 107 artifacts, Mobile,
MCP, Android ni OE5.

Evidencia privada en `data/ccd/local/p4b4r-final-promotion/`: baseline, presupuesto,
snapshots, autorización, ciclo de sesión, promoción, me/smoke/artifact current,
los nueve estados de controles, clasificación C05, rollback, cleanup/restauración,
privacidad y manifests SHA-256/tamaño. Incluye respuestas de fixtures propias,
sin originales íntegros, corpus completo, vectores, passwords/tokens, hashes de
credenciales, recuperación ni paths personales absolutos.

Único cambio versionable: esta sección de
`eval/integration/results/ccd-current-promotion.md`. Prefijo histórico preservado
byte por byte; nuevo texto con LF. git diff --check aprobado y status limitado al
informe. Sin secretos añadidos, commit ni push. La promoción final queda bloqueada;
no se continúa con trabajo CCD ni UX/OE5. Sin producción, aval CCD o despliegue UNAB.

## P4-B.4B — corrección de prioridad documental/procedencia en unified

2026-10-28, America/Bogota.

**P4-B.4B COMPLETE — CCD DOCUMENTARY PROVENANCE ROUTING CORRECTED**

Esta sección es aditiva. P4-B.4R conserva su C05 HTTP 503
DEPENDENCY_UNAVAILABLE y su rollback confirmado; no se reescribe como PASS.
La causa interna exacta dentro de N8N/MCP no quedó demostrada y esta tarea no
la atribuye a un servicio concreto. El defecto acreditado es la selección previa
de composición multifuente para una consulta documental CCD con procedencia.

### Baseline y reproducción antes del cambio

HEAD `7c6169aada992ce15f2dd1f1a991036bea4ba047`, branch `main`, árbol limpio
incluyendo untracked; coincidencia exacta con la referencia. AGENTS.md leído
completo. Sin cambios de branch, operaciones Git destructivas, commit ni push.

Se añadió primero una prueba focal para «¿Cuánto cuesta un curso en 2026?
¿Qué documento lo dice?». Con unified-product.ts todavía idéntico al baseline:

- pasó la clasificación: requiresConversationalOrchestration=true, topic fees y
  asksCcdProvenance=true;
- falló la expectativa nueva de RAG directo: se invocó el fake orchestrator.

Reproducción: 2 tests, 1 PASS y 1 FAIL esperado, sin N8N/MCP reales. La combinación
curso/documento/dice sigue produciendo múltiples operaciones en el planner general;
no se cambió planCalls ni se desactivó la orquestación de otros productos/modos.

### Cambio aplicado y frontera arquitectónica

Único código funcional modificado: backend/api/src/auth/unified-product.ts.
Se reutilizan asksCcdProvenance y ccdKnowledgeQueryScope; la primera ya estaba
exportada, por lo que ccd-knowledge.ts no necesitó cambios.

Antes de requiresConversationalOrchestration(bound), la composición reconoce la
prioridad documental existente de badge o una solicitud explícita de procedencia
sobre un tema CCD reconocible. Exige ausencia de intención auxiliar explícita y
una release ready con schema CCD Knowledge adoptado. Entonces llama exclusivamente
a input.rag(query), conservando la entrada original, incluida history.
No se copió generación RAG, cambiaron prompts ni creó otra persistencia.

Para una procedencia sin asunto factual en el turno actual se usa
boundConversationContext sobre query.history: solo antecedentes USER y el asunto
más reciente, omitiendo follow-ups que únicamente piden procedencia. No se usa
texto assistant, ni se busca un tema antiguo a través de un cambio de asunto,
ni se amplía la memoria. La selección sigue la política de procedencia de
generateCcdKnowledgeAnswer; el RAG normal conserva la autoridad de respuesta.

La frontera auxiliar comprende mi progreso, mis cursos, mis notas, calendario/
eventos y anuncios/noticias/convocatorias, en el turno actual o en el antecedente
USER seleccionado. Una nueva pregunta factual autosuficiente no hereda un asunto
auxiliar anterior. Se conserva el gate del schema; no hay admisión especial para
releases desconocidas, ni regla basada en C05, texto exacto o fees exclusivamente.

Los tests distinguen expresamente:

- CCD documental/procedencia pura: C05, follow-up, modalidades, duración y contacto
  llegan al fake RAG, sin invocar el fake orchestrator; se prueban CCD 1.3 y 1.4;
- «Según mis cursos completados, ¿qué convocatorias activas podrían interesarme?»
  y auxiliares con documento continúan invocando el orquestador, sin caer a RAG;
- el error del fake orchestrator se propaga: no existe try N8N/catch→RAG;
- badge conserva su test existente sin cambios;
- procedencia sin antecedente, solo texto assistant, tema reemplazado o USER fuera
  del contexto acotado no inventan un asunto CCD por esta prioridad;
- schema desconocido/no adoptado o release no encontrada no activan la prioridad.

### Validación ejecutada

| Comprobación | Resultado |
| --- | --- |
| Reproducción pre-fix | 1/2 PASS; 1 FAIL esperado con fuente de producción sin cambios |
| Routing CCD focal final | **11/11**, cero fail/skipped |
| CCD Knowledge v1/v2 pertinentes | **22/22**, cero fail/skipped |
| API npm run typecheck | **PASS** |
| API npm test, una ejecución completa | **708/708**, cero fail/skipped |
| git diff --check | **PASS** |

Se añadieron diez tests al archivo focal existente. Los tests de asksCcdProvenance,
supporting_claim_ids, DOMAIN_CONFIRMATION, DOCUMENT_SOURCE, evidencia mixta,
follow-up y ausencia de leakage conservaron sus expectativas intactas.

Un caso auxiliar nuevo inicialmente asumía que «fuente documental» producía varias
tools; el planner no reconoce documental como documento. Se corrigió solo esa
fixture nueva para preguntar explícitamente «¿Qué documento lo dice?», conforme a
la frontera solicitada. Se conserva el resultado intermedio 10/11 y su explicación
privada; no se relajó ninguna aserción existente. La suite completa se ejecutó
una sola vez después de resolver los focales y no se repitió al pasar.

### Estado, alcance y pendientes

No se arrancó API, PostgreSQL, N8N u Ollama ni se abrió una conexión de producto.
Cero llamadas a publish_release, cero cambios de bindings/grants y cero DML de
producto. Los clientes de SQL/RAG/orquestación de los focales son fakes sin servicios.

Estado de partida confirmado por el usuario y el cierre previo: CCD 1.3
`f01c1c37-2d3f-4bc7-8940-fe724eb71c9a` ready/current; CCD 1.4
`10af4ffd-effb-41fc-bbfe-4dc48cb3398f` ready/no current. Esta tarea no lo modifica.
No se presenta como una nueva lectura de estado vivo ni como HTTP C05 post-fix:
no se conectó a la base y **la promoción sigue pendiente** de otra tarea explícita.

No se modificaron N8N, MCP server/tools/planner, SQL, auth de cuentas/sesiones,
rate limiter, corpus/adoption, bindings/grants, artifact storage, Mobile, modelos,
prompts ni top_k. No se ejecutaron bancos 249/107 artifacts, suites RAG/MCP/Mobile,
Android, nueva ingesta, rematerialización ni promoción.

Archivos versionados de esta tarea: unified-product.ts, ccd-knowledge-routing.test.ts
y esta sección de eval/integration/results/ccd-current-promotion.md. El prefijo
histórico del informe se conserva byte por byte; el texto nuevo usa LF.
Evidencia privada en data/ccd/local/p4b4b-documentary-routing/: baseline,
reproducción, diff, logs/resultados, integridad de superficies protegidas,
no-publication, privacidad y manifest SHA-256/tamaño. Sin secretos, credenciales,
tokens, corpus privado ni paths personales absolutos en la evidencia guardada.
Sin commit ni push; no se continúa automáticamente con la promoción.
