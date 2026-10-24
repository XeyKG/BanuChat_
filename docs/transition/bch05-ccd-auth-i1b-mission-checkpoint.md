# CHECKPOINT BANUCHAT — Misión F2 / OPS

2026-10-23. Revisión de partida y entrega: `1583457cf818d8f7c359671c51093ab7832587df`,
rama `main`, inicialmente limpia. Sin commit/push. Entrega para Sala de Control.

**Actualización de cierre:** la sección J registra la reanudación y el estado
actual de servicios. Las observaciones de ejecución de las secciones anteriores
conservan su fecha y no acreditan que esos servicios sigan activos.

## A. Resumen ejecutivo

**OPS implementado:** comando de preparación reproducible, pruebas, diagnóstico
real y regresiones de propiedad. Detectó un dispositivo autorizado sin reverse
3003/8084; no modificó el teléfono. Expone incertidumbres de revisión API y entorno
Metro en vez de aprobarlas a partir de conectividad.

**F2 parcial:** harness adversarial de 24 casos implementado y ejecutado, con
medición de selección/prompt y cuatro probes reales. Una paráfrasis nueva reproduce
el exceso de contexto (6420/4096). El runtime del chat no se cambió: la protección
general sigue pendiente de política y mecanismo de admisión justificable. Se usó
la alternativa autorizada en A7 y se completó el incremento OPS.

## B. Auditoría focal

Se revisaron AGENTS, checkpoints I1B/503/F1, runbook Android y documentos académicos
indicados, luego las dependencias directas de selección, contexto, recuperación,
cliente Ollama, runtime autenticado y sesiones Mobile. Los documentos académicos
anteriores a I1B todavía describen ausencia de autenticación: se conserva su
procedencia histórica; no se adopta esa descripción como estado actual ni se
reescriben los compromisos OE1–OE6.

Arquitectura conservada: Mobile → REST v2 → router/servicios/Document RAG →
PostgreSQL/pgvector y Ollama. No I1C, Agent/ReAct, MCP conversacional o N8N síncrono.
No se cambiaron seguridad, SQL, contratos, corpus, modelo, digest, prompts, top-k,
timeouts ni generación. No paquetes nuevos ni cambios Expo/React Native.

Servicios verificados con acceso local autorizado: API 3003 responde 401 v2,
Metro 8084 responde status, Ollama 11434 versión 0.35.0 y PostgreSQL I1B 55443 con
identidad/volumen/red/scope correctos. Los probes iniciales dentro del sandbox no
accedieron a loopback; se verificó fuera de esa restricción antes de atribuir una
caída a los servicios. No se arrancó/reinició ninguno.

## C. Incremento A — F2 parcial

[Detalle, decisiones y batería F2](bch05-ccd-auth-i1b-f2-checkpoint.md).
Pruebas deterministas con metadatos/dobles separadas de la captura con embedding
y SQL reales, y de la generación real. Sin cambios funcionales de producción A.

| Medición real nueva | Antes / estado actual observado | Cambio o límite |
| --- | --- | --- |
| Paráfrasis no literal | 10 fragmentos, 20695 bytes, Ollama 400, 6420 > 4096 tokens | Fallo conservado; no se declara corregido |
| IA canónica | DOC-101, 1883 tokens, Ollama 200/stop | F1 sigue funcionando en este control real |
| Dos cursos explícitos | DOC-101 + DOC-103, 2370 tokens, Ollama 200/stop | Una política de un solo documento rompería este caso |
| Pregunta casi máxima | 3999 caracteres, DOC-101, 2964 tokens, Ollama 200/stop | Caracteres de la consulta no bastan para decidir capacidad |
| Alias y pregunta exacta F1 | DOC-101 en captura y pruebas deterministas | No se reenvió la pregunta Android ni se atribuyeron sus request_id |
| Historial/fuentes | Integridad antes/después en los dos ensayos A | Cero escrituras de negocio en A |

La medición de bytes no se convierte en tokens exactos. Falta decidir aclaración
de paráfrasis/consulta amplia y tratamiento explícito de capacidad sin confundirlo
con evidencia insuficiente. No se reetiquetan T01/2 ni T11. Los nuevos casos son
desarrollo, no una evaluación reservada ni aprobación semántica humana.

## D. Incremento B — OPS implementado

Nuevo comando `npm --prefix .\backend\api run ops:ccd -- --adb --report`, con
raíz resuelta desde el archivo, comprobaciones puras testeables y adaptadores
locales. Reutiliza configuración/guardas I1B, baseline de modelos y launcher
Mobile; no duplica autenticación. Los JSON llevan timestamp y creación exclusiva.

El diagnóstico comprueba Git, dependencias, Expo 57, API/bind, Metro, laboratorio
PostgreSQL, release/embedding, versión/digests/capacidades Ollama y ADB por destino.
No mezcla configuración de la shell con entorno cargado del proceso. No imprime
secretos, seriales, connection strings ni cuerpos de respuesta.

La nueva prueba Mobile cubre cambio A→B y restauración CCD mediante vault/HTTP
dobles. La prueba HTTP/PG reutilizó dos fixtures F1 existentes y creó solamente dos
chats vacíos nuevos; verificó lectura/escritura/borrado ajenos en ambas direcciones,
refresh propietario, logout y sesión requerida para artefactos. Cero generación,
mensajes nuevos o cuentas nuevas. Las dos conversaciones vacías se conservaron.
Sesiones F1 no revocadas al cierre: **0**.

## E. Matriz verificable

Todos los ensayos nuevos corresponden al HEAD arriba indicado y a los archivos de
trabajo de esta entrega; no se presentan como ejecutados desde un commit nuevo.

| Comprobación | Esperado | Observado / estado | Tipo / evidencia / límite |
| --- | --- | --- | --- |
| Typecheck API | Sin errores | PASS final | `npm run typecheck` en backend/api |
| Pruebas API pertinentes | Sin regresiones | **165/165 PASS** | Unitario/dobles; incluye 21 F2 y 8 OPS; no genera con Ollama |
| Typecheck Mobile | Sin errores | PASS | `npm run typecheck` en mobile |
| Lint Mobile | Sin errores | PASS | `npm run lint`; configuración existente analiza mobile/src |
| Sesiones Mobile | Propietario/estado correcto | **15/15 PASS** | Unitario, auth-session + ccd-authenticated + ccd-session-ownership; no SecureStore físico |
| Captura F2 | Medir sin persistir | 24 casos; PASS de ejecución/integridad | [capture](../../eval/auth/results/bch05-ccd-auth-i1b-f2-capture-1792782378649.json); generador doble |
| Probe F2 | Identificar éxito y rechazo real | 3 completados / 4 intentados; **1 FAIL de capacidad** | [probe](../../eval/auth/results/bch05-ccd-auth-i1b-f2-probe-1792782408521.json); PG/embedding/Ollama; no HTTP mensaje |
| Propiedad REST/PG | 404 ajenos, sesión/owner preservados | **9 grupos PASS** | [isolation](../../eval/auth/results/bch05-ccd-auth-i1b-ops-isolation-1792782761693.json); no generación/UI |
| Preflight definitivo | Declarar fallos e incertidumbre | **16 PASS, 2 FAIL, 3 NOT_EVALUABLE, 1 NOT_EXECUTED** | [preflight](../../eval/auth/results/bch05-ccd-auth-i1b-ops-preflight-1792782951405.json); código Node 2 |
| Git limpio para demostración | Sin cambios pendientes | FAIL esperado de desarrollo | Cambios de esta misión pendientes de Sala; no reset/clean/commit |
| ADB reverse | 3003 y 8084 por destino | FAIL: faltan ambas en el único autorizado observado | Solo devices/reverse --list, serial retenido únicamente en memoria |
| Revisión efectiva API / entorno Metro / shell Mobile | Identidad/configuración acreditables | NOT_EVALUABLE | No se deduce versión por 401 ni configuración por status |
| A/B Android físico | Observar dos propietarios y reinicio | NOT_EXECUTED por agente | Pendiente del operador; ADB no acredita Expo Go |
| Focal/integral previas | Conservar baseline | NOT_EXECUTED en esta misión | Históricos F1: 18/18–91/91 y 43/43–216/216. Runtime intacto; no se inventa una nueva comparación de respuestas |

Las pruebas pertinentes API se ejecutaron con:

```powershell
node --import tsx --test test/ccd-context-adversarial.test.ts test/ccd-preflight.test.ts test/document-evidence.test.ts test/document-rag.test.ts test/conversation-context.test.ts test/document-query-retrieval.test.ts test/authenticated-document-retrieval.test.ts test/ollama-generator-client.test.ts test/auth-handlers.test.ts test/auth-v2-contract.test.ts
```

Mobile, desde su carpeta:

```powershell
node --import ../backend/api/node_modules/tsx/dist/loader.mjs --test test/auth-session.test.ts test/ccd-authenticated.test.ts test/ccd-session-ownership.test.ts
```

Ejecuciones A desde backend/api: `node --import tsx test/auth-i1b-f2-adversarial.mts capture`
y `... probe`. Son ensayos explícitos, no acciones del preflight. B HTTP:
`node --import tsx test/auth-i1b-ops-isolation.mts`; no repetir automáticamente.

Resultados de desarrollo adversos conservados: primer fixture de historial excedía
el límite (19/20, descrito en F2); primer fixture Mobile usó un alias distinto del
contrato exacto (14/15), corregido en el fixture, sin relajar validación. Hubo errores
de tipado en herramientas nuevas corregidos antes de sus ejecuciones; un intento
de npm en la raíz falló por ausencia de package.json y se repitió desde backend/api.
El runbook usa `--prefix` para evitar ese error. El primer preflight no encontraba
ADB en PATH; los informes anteriores se conservan y la herramienta ahora contempla
su ubicación estándar. Ninguno de estos intentos se publica como PASS.

## F. Integridad y archivos

Solo archivo existente modificado: `backend/api/package.json`, añade `ops:ccd`.
Archivos nuevos A: tres archivos de harness/tests indicados en F2, dos informes de
captura/probe y su checkpoint. Archivos nuevos B:

- `backend/api/src/operations/ccd-preflight.ts`.
- `backend/api/test/ccd-preflight.test.ts`.
- `backend/api/test/auth-i1b-ops-{preflight,isolation,audit}.mts`.
- `mobile/test/ccd-session-ownership.test.ts`.
- Informes `eval/auth/results/bch05-ccd-auth-i1b-ops-*.json`.
- Este checkpoint y `docs/operations/ccd-auth-i1b-ops.md`.

La auditoría final pasó: HEAD y alcance correctos, rutas runtime y evidencia
histórica intactas, `git diff --check` y whitespace de archivos nuevos correctos;
no se detectaron coincidencias con secretos en los archivos nuevos/modificados
al cotejarlos con credenciales privadas I1B y fixtures F1 en memoria. El resultado se registra
en `bch05-ccd-auth-i1b-ops-audit-*.json`; el escaneo exacto complementa la revisión de
salidas, no es una garantía universal de ausencia de cualquier secreto desconocido.

Corpus verificado antes/después:
`db29ad53062ee400a367fb4a16b4c5cc2f9c178cb1333e29dab29fe12a449963`.
Historias preexistentes intactas; el ensayo B comprobó su huella excluyendo solo
sus dos chats nuevos. No se leyó el CCD original, `CCD_DOCUMENTACION`, bases
sintéticas o laboratorios históricos. Sin migraciones, ingesta o reembedding.

## G. Efecto académico

OE1: evidencia de selección y límites operacionales; no garantiza fundamentación
universal. OE3: validación parcial de RAG directo; no acredita Agent/MCP. OE5:
pruebas de sesión y preparación móvil; no usabilidad estudiantil ni SecureStore
físico nuevo. OE6: reproducibilidad e integración locales, sin despliegue UNAB,
SLA ni participantes. OE2 y OE4 no avanzan: no extracción/RPA ni BPM conversacional.
No se declaran objetivos cumplidos o sustituidos, alcance aprobado ni 16 semanas
disponibles. El banco es desarrollo y deberá excluirse de un reservado independiente.

## H. Próximos pasos del operador

1. Revisar diff y [runbook OPS](../operations/ccd-auth-i1b-ops.md); ejecutar preflight
   en su PowerShell. Los FAIL actuales no deben ocultarse.
2. Identificar personalmente el teléfono y establecer exclusivamente sus reverse
   3003/8084. Validar B tras logout A, historial propio, reinicio/restauración y
   regreso a A. Segundo teléfono opcional; registrar sin seriales/secretos.
3. Confirmar personalmente revisión de arranque API y configuración Metro si se
   requiere acreditarlas. Esta entrega no reinició procesos del operador.
4. Sala debe decidir la política pendiente F2 y revisar el rechazo real preservado.
   No aceptar F2 como corrección funcional completa. T01/2 y T11 siguen abiertos.
5. Tras revisión, el operador decide commit/push. No se ejecutaron aquí.

## I. Decisiones, riesgos y detención

Confirmado: OPS funciona y detecta preparación incompleta; F1 mantiene selección;
paráfrasis amplia aún excede contexto; corpus/propiedad protegidos. Provisional:
diseño F2 de cinco estados y mecanismo de admisión pendiente. Descartado: recortar
top-k, documentos o reglas; modificar num_ctx/modelos; aparentar Android con mocks.
Preguntas pendientes: política de consulta amplia/capacidad, evaluación semántica
humana, aislamiento físico B y calendario académico real.

Implicación arquitectónica: solo diagnóstico externo a la ruta síncrona y nuevos
tests; autenticación/RAG existentes intactos. Implicación de cronograma: OPS
entregable ahora, F2 requiere decisión y validación adicional; no se fija plazo ni
se aprueba una extensión. Riesgos: 503 de capacidad persiste, cercanía vectorial
no equivale a pertinencia, estado de servicios puede cambiar tras el preflight,
y sus PASS locales no prueban revisión de procesos ni seguridad institucional.
Bloqueos para I1C: falta autorización de Sala y no se resuelven distribución/TLS,
custodia multioperador, validación física pendiente ni compromisos académicos.
**Detenido para revisión de Sala de Control BanuChat.**

## J. Cierre reanudado — 23 de octubre de 2026, America/Bogota

Se retomó exclusivamente la auditoría. Estado inicial observado: **20 archivos
pendientes**, uno rastreado modificado y 19 nuevos, no 13. HEAD sigue siendo
`1583457cf818d8f7c359671c51093ab7832587df`. No se descartó ni reinició trabajo.

El informe `ops-audit-1792783275223.json` sí existía; cinco archivos habían cambiado
después: núcleo del preflight, runner, tests del preflight y los dos checkpoints.
La diferencia de pruebas es comprobable: se añadió el caso de clasificación de
ausencia/configuración/permisos después del resultado de 164. La reejecución barata
actual confirma **165/165 API**, no un nuevo conjunto de 164.

| Verificación de cierre | Estado | Resultado / límite |
| --- | --- | --- |
| Pruebas API pertinentes | PASS | 165/165, misma lista de comandos de §E |
| Pruebas Mobile pertinentes | PASS | 15/15, dobles de vault/HTTP; no SecureStore físico |
| Typecheck API y Mobile | PASS | Reejecutados; API nuevamente tras el ajuste exclusivo del auditor |
| Lint Mobile | PASS | Configuración existente sobre mobile/src |
| Preflight actual | FAIL de preparación | 8 PASS, 3 FAIL, 7 NOT_EVALUABLE, 1 NOT_EXECUTED; código 2 |
| API 3003 / Metro 8084 | FAIL | No aceptan conexiones; no se arrancaron |
| Contenedor I1B | PASS de inspección, detenido | Docker confirmó nombre esperado y `Running=false`; no se arrancó |
| PostgreSQL, huella actual y sesiones actuales | NOT_EVALUABLE | Laboratorio detenido; no se abrió conexión ni se afirma una nueva huella de corpus/historial |
| Ollama / generador | PASS | Runtime y revisión/capacidad esperados; embedding no cotejable con release sin PG |
| ADB | NOT_EVALUABLE | Servidor 5037 no iniciado; no se invocó cliente ni se modificaron rutas |
| A/B físico, incluida U08000002 | NOT_EXECUTED | Pendiente del operador |
| Captura/probes F2, aislamiento HTTP y focal/integral | NOT_EXECUTED en el cierre | Evidencias anteriores revisadas y conservadas; no se repitieron ensayos costosos ni escrituras |

Preflight actual:
[ops-preflight-1792803476042](../../eval/auth/results/bch05-ccd-auth-i1b-ops-preflight-1792803476042.json).
El contenedor detenido explica por qué no puede renovarse la comprobación PG;
el PASS histórico de aislamiento sigue referido a su ejecución anterior.

Único ajuste de código en el cierre: el auditor de archivos dejó de llamar a
`f1Accounts()`, helper dependiente de Docker que contiene aprovisionamiento.
Ahora descifra **solo el archivo DPAPI existente**, en memoria, y valida las entradas
del escaneo; no crea cuentas ni lee/escribe PostgreSQL, ni cambia credenciales.
No hay cambios adicionales al runtime, tests de producto o política F2.

Se revisaron los archivos nuevos, informes públicos y salidas: no contienen cuerpos
privados, preguntas del operador, documentos completos, vectores, seriales, tokens
o contraseñas reales observados. Las cadenas de autenticación de los tests son
fixtures ficticias. El escaneo exacto I1B/F1 y los hashes actualizados quedan en
el nuevo informe `ops-audit-*.json`, sin sobrescribir el anterior. Se comprobaron
whitespace también de archivos no rastreados y enlaces locales de documentación.

**F2: parcial, sin corrección general. OPS: implementado y probado; entorno de
demostración actualmente no preparado.** T01/2 y T11 siguen pendientes. Antes del
commit, el operador debe revisar el diff completo (incluidos no rastreados), el
escaneo y estos límites; preparar personalmente los servicios existentes y repetir
preflight, y completar aislamiento físico B/restauración cuando proceda. No realizar
bootstrap/migraciones ni sustituir resultados adversos por una nueva ejecución.

**CHECKPOINT BANUCHAT — cierre para revisión de Sala, sin commit, push ni I1C.**

## K. Contraste final con la misión original

Revisión del adjunto solicitada por el operador, 23 de octubre de 2026
(America/Bogota). Se contrastó el alcance completo con los archivos y reportes
existentes, sin repetir las generaciones ni el ensayo REST con escrituras.

| Requisito | Resultado verificable | Estado y alcance |
| --- | --- | --- |
| Estado real e instrucciones (§0, fase 0) | main / HEAD 1583457; trabajo previo preservado; AGENTS y dependencias directas revisados | PASS |
| A3: trazado consulta→prompt | Sección de reconstrucción del checkpoint F2; selección, contexto, embedding, SQL, generación, citas y persistencia | PASS de análisis |
| A4: batería antes de cambiar lógica | 24 casos en cases.ts y captura real; 21 pruebas deterministas/clientes; niveles separados | PASS de harness, sin declarar calidad académica |
| A5/A7: protección general o alternativa explícita | Diseño de cinco estados y rechazo 6420/4096 conservado; A7 autoriza avance parcial si falta política | PARCIAL: protección funcional no implementada; no se cierra ese objetivo como PASS |
| A6: regresiones y F1 | 165 pruebas API del cierre anterior; RAG de producción idéntico a HEAD; controles reales F2 existentes | PASS de verificaciones realizadas; focal/integral NOT_EXECUTED de nuevo |
| B1/B2: preflight implementado | ops:ccd, comprobaciones puras, runner, modelos, SDK, servicios, PG y ADB sin mutaciones | PASS de implementación; preparación del entorno FAIL |
| B3: segundo teléfono opcional | Guion privado por destino y límites de ADB preparados; sin automatización de UI autorizada disponible | NOT_EXECUTED físico, pendiente del operador |
| B4: propiedad y sesiones | Nueve grupos REST/PG aprobados en informe existente; 15 pruebas Mobile con dobles | PASS automatizado observado; aislamiento físico B no acreditado |
| B5: evidencia y runbook | Matriz §E/J, reportes con HEAD, comandos y limitaciones en runbook OPS | PASS documental |
| Restricciones / integridad | Auditor de alcance/secretos, hashes y whitespace; sin cambios de runtime o corpus | PASS de archivos; PG actual NOT_EVALUABLE por contenedor detenido |
| Entrega A–I y trazabilidad OE1–OE6 | Secciones A–I y checkpoints F2/OPS; pendientes académicos explícitos | PASS de entrega; sin aprobación académica nueva |

Se encontró y corrigió una carencia operacional concreta: el runner llamaba a la
guarda de entorno activo antes de inspeccionar el contenedor; estando detenido,
una lectura de bindings impedía clasificar su estado. Ahora lee la configuración
privada existente, inspecciona exclusivamente el destino I1B y devuelve
`FAIL / EXPECTED_LAB_CONTAINER_STOPPED` para el ID/nombre esperado detenido,
antes de cualquier conexión PG. Si está activo conserva la guarda original y la
validación completa de bind/red/volumen/scope. No se cambia el helper compartido.

Archivos ajustados en esta comprobación: `src/operations/ccd-preflight.ts`,
`test/auth-i1b-ops-preflight.mts`, `test/ccd-preflight.test.ts`, este checkpoint y
el runbook OPS. El test existente ahora incluye el contenedor detenido sin
bindings/red activa. Typecheck API y **8/8 pruebas OPS** volvieron a pasar.
No se volvieron a ejecutar las otras 157 pruebas API ni las 15 Mobile, ya
acreditadas en §J; el ajuste está fuera de su ruta funcional.

Nuevo informe de diagnóstico, sin sobrescribir los anteriores:
[ops-preflight-1792804208015](../../eval/auth/results/bch05-ccd-auth-i1b-ops-preflight-1792804208015.json).
Resultado: **8 PASS, 4 FAIL, 6 NOT_EVALUABLE, 1 NOT_EXECUTED**. El cambio de
conteo corresponde a clasificar el contenedor detenido como FAIL explícito en
lugar de incertidumbre. Los otros FAIL son árbol pendiente, API y Metro sin
conexiones. No se arrancaron servicios ni ADB. El escaneo final se renovó después
de estos ajustes.

El criterio final de la misión —al menos un incremento de ingeniería verificable—
se satisface con OPS. La entrega A cumple la alternativa parcial de A7; **no
significa que la resiliencia general F2 esté resuelta**. Lo pendiente es una
decisión de política de capacidad/pertinencia y la validación física del operador,
no una prueba omitida que pueda declararse aprobada. T01/2 y T11 se conservan.

**CHECKPOINT BANUCHAT — verificación final entregada a Sala, sin commit ni push.**
