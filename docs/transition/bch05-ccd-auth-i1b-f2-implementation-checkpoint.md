# CHECKPOINT BANUCHAT — F2

Fecha: 23 de octubre de 2026, America/Bogota. Base verificada limpia en `main`:
`bbfcd9d54350cc51c16b9a6d2bcb30a6c057f52d`. Sin commit/push. Este documento es
nuevo; los checkpoints F2 parcial, F1, OPS y sus informes se conservan.

**Resultado:** implementadas la decisión explícita de evidencia CCD y la
diferenciación interna de capacidad. El caso F2 6420/4096 ahora produce una
aclaración persistida y puede continuar hacia DOC-101. **F2 sigue parcialmente
resuelto como protección general:** una petición identificada de siete cursos
todavía puede exceder la capacidad y conservar el 503 contractual. No se presenta
una estimación de caracteres como límite garantizado de tokens.

## Implementación y comportamiento

Puntos mínimos de intervención: selección CCD, su consumo en RAG y la frontera
del cliente Ollama. No se cambian SQL, contratos REST, Mobile, autenticación, OPS,
modelos/digest, parámetros, top-k, timeout, embeddings, corpus o releases.

`document-evidence.ts` añade `decideCcdEvidence`, que devuelve motivo y fuentes:

| Situación | Comportamiento implementado |
| --- | --- |
| Nombre documentado, alias F1, tema de pruebas/contacto/orientación admitido | Conserva la selección por identidad/antecedentes, nunca por primer resultado vectorial |
| Dos o más syllabus identificados | Conserva todas las fuentes seleccionadas, sin reducir a un documento |
| Curso descrito pero no identificado | Solicita nombre/tema concreto; no aprende un alias a partir del caso F2 |
| Petición de todos los cursos/temarios o cada curso | Solicita delimitación, salvo el catálogo ya reconocido que sigue listando metadatos completos |
| Tema sin identidad documental reconocida | Insuficiencia sin citas ni generación; no usa el fallback de diez unidades como prueba de pertinencia |

`selectCcdEvidence` reutiliza esa decisión. Se mantiene la normalización de
acentos, mayúsculas y puntuación. No se agregan cursos o equivalencias de títulos.
La corrección hacia un syllabus nombrado prevalece sobre el patrón genérico
«corrijo ... curso» cuando no hay un fracaso académico explícito. La instrucción
de curso reprobado queda limitada a la orientación U03; así una consulta de
temario no hereda ese antecedente por contener la palabra «curso».

`document-rag.ts` usa la decisión únicamente en CCD. Una aclaración es una
respuesta válida con `insufficient_evidence=true` y cero citas, como las
aclaraciones existentes. Se persiste con el mismo esquema. No afirma que todo el
corpus se haya analizado ni que la paráfrasis sea IA Generativa. Si se seleccionan
varios syllabus y la salida cita solo parte de ellos, devuelve una limitación
explícita sobre la respuesta incompleta, sin mostrarla como comparación completa.
La presencia de todas las citas tampoco se presenta como garantía semántica.

Una consulta sobre contenidos no se confunde con el catálogo de títulos, incluso
si contiene «cursos de Competencias Digitales». Se prueba esa combinación y se
conserva el listado de metadatos para «Lista todos los cursos».

Los documentos y el historial preparados no se recortan para hacerlos caber.
Se conservan los límites anteriores de ocho mensajes/6000 caracteres y la
separación de contexto no confiable frente a evidencia documental fresca.

### Capacidad y contrato

`GeneratorInput.classify_context_capacity` es una marca interna aplicada solo por
RAG CCD; no entra al prompt, a opciones Ollama, REST o persistencia. El modo
sintético mantiene el tratamiento anterior, incluso para un 400 semejante.

Para `/api/chat` con HTTP 400 se lee como máximo un diagnóstico de 8192 bytes;
solo un JSON con `error` textual que indique contexto excedido y dos conteos
positivos explícitos, entrada mayor que contexto, produce
`generator_context_capacity_exceeded`. No se guarda ni adjunta el cuerpo al
error. JSON inválido, diagnóstico excesivo/ambiguo, conteos incompatibles u otro
400 conservan `invalid_generator_response`. Infraestructura, timeout y validación
de runtime conservan sus razones. No hay retry automático.

La nueva razón llega al servicio de mensajes y conserva el mapeo público
`503 DEPENDENCY_UNAVAILABLE`. No se convierte en falta de evidencia y no persiste
un medio turno. El contrato fija el código/mensaje del 503; no permite añadir una
categoría de capacidad o mensaje distinto en su envelope. **Una UX diferenciada
para ese rechazo queda bloqueada por el contrato congelado**, no implementada
mediante un 201 de insuficiencia engañosa.

No se implementó una guarda previa universal: no hay una operación de conteo
exacto verificada para esta plantilla cargada. Se mantiene `num_predict=256` y
se observó contexto cargado 4096 sin aumentarlo. Las decisiones de alcance evitan
el prompt descontrolado de los casos demostrados; no garantizan la suma exacta
de instrucciones, evidencia, historial y reserva de salida para cualquier consulta.

## Pruebas y resultados reales

Primero typecheck y pruebas deterministas; después se verificaron servicios y
contenedor activos. Se usaron solo I1B en 55443 y Ollama local. API 3003 y Metro
8084 del operador no se reiniciaron ni se ocuparon por otro proceso. Los ensayos
REST usaron servidores en puertos efímeros loopback disponibles.

| Capa | Resultado | Evidencia / límite |
| --- | --- | --- |
| Typecheck API | PASS | `npm run typecheck`, también después del cierre de herramientas |
| Unitarios/dobles pertinentes | **196/196 PASS** | Selector, los 24 casos en RAG, cliente, mensajes/atomicidad, contexto, retrieval, contratos y autenticación |
| Captura real PG/embedding + generador doble | 24 casos completados | [capture](../../eval/auth/results/bch05-ccd-auth-i1b-f2-implementation-capture-1792807111945.json); 16 prompts conservados idénticos por SHA-256 |
| Probes PG/embedding/Ollama | 14/15 completados; un rechazo residual conservado | [probe](../../eval/auth/results/bch05-ccd-auth-i1b-f2-implementation-probe-1792807337904.json); tres completados sin generación, once generaciones completas y un rechazo real |
| HTTP de conversación F2 | **6/6 respuestas 201**, historial exacto y citas verificadas por SQL | [http](../../eval/auth/results/bch05-ccd-auth-i1b-f2-implementation-http-1792807346976.json) |
| Fallo tipado inyectado en HTTP/PG | 503, cero mensajes parciales | Mismo informe HTTP; explícitamente doble del generador, no Ollama real |
| Capacidad real por HTTP/PG/Ollama | 503, razón específica y cero mensajes parciales | [http-capacity](../../eval/auth/results/bch05-ccd-auth-i1b-f2-implementation-http-capacity-1792807778622.json) |
| Focal I1B | **18/18 turnos; 91/91 controles** | [focal](../../eval/auth/results/bch05-ccd-auth-i1b-f2-implementation-focal-1792807127076.json); incluye revocación durante generación: 401/0 parciales |
| Integral I1B | **43/43 turnos; 216/216 controles** | [full](../../eval/auth/results/bch05-ccd-auth-i1b-f2-implementation-full-1792807191623.json); 40 citas, 24 artefactos verificados |
| Comparación con F1 | **43/43 textos, citas, selección e insuficiencia iguales** | [comparison](../../eval/auth/results/bch05-ccd-auth-i1b-f2-implementation-comparison-1792808226111.json); no nuevo juicio semántico automático |
| Android físico F2 | NOT_EXECUTED por el agente | Validación personal de las aclaraciones nuevas pendiente |

Los probes no son conversaciones HTTP ni pruebas de persistencia. Una operación
concluida con aclaración tampoco es una generación. El rechazo residual de
capacidad cuenta como fallo operacional, aunque su clasificación sea correcta.

### Antes/después por caso

| Caso | Antes | Después |
| --- | --- | --- |
| Paráfrasis F2 | Diez unidades, 6420/4096, rechazo 400 del proveedor | Cero unidades al generador; HTTP 201, aclaración sin citas, dos mensajes persistidos |
| Continuación con IA Generativa | — | HTTP 201, DOC-101, cuatro mensajes totales en el mismo chat |
| Pregunta original F1 | DOC-101, 7006 bytes | Mismo prompt; 1891 tokens, 201 y DOC-101 |
| Siete syllabus individuales | Identidad literal por metadatos | Los siete funcionan con su propia fuente y `stop` en Ollama real |
| Comparación IA + Marca | Dos fuentes, 8498 bytes / 2370 tokens | Se conservan ambas fuentes y prompt; respuesta 201 con dos citas |
| Todos los temarios | Diez unidades, 20658 bytes | Solicitud de delimitación antes de generación; 201 persistido |
| Motores de aeronaves | Diez unidades, 20653 bytes | Insuficiencia sin citas/generación, 201 persistido |
| Historial extenso admitido | DOC-101, 13097 bytes en captura | Misma captura; generación real con 3307 tokens y `stop` |
| Pregunta de 3999 caracteres | DOC-101, 2964 tokens | Se conserva, sin umbral por longitud de pregunta |
| Siete cursos explícitos en una comparación | Sin ensayo previo de esa petición | Siete fuentes, 16206 bytes; **4903/4096, rechazo real**, nueva razón interna; 503/0 parciales en ensayo HTTP nuevo |

[Comparación de selección/capturas](../../eval/auth/results/bch05-ccd-auth-i1b-f2-implementation-selection-comparison-1792808226111.json).
No se volvió a enviar ningún POST de Android. Los request_id históricos no se
atribuyen retrospectivamente al caso residual ni a esta solución.

## Regresiones y límites semánticos

T01/2 y T11 **no mejoran ni se degradan en el integral observado**: sus salidas
son idénticas a F1. Conservan sus pendientes académicos y rúbricas. Igualdad de
texto se acompaña de identidad de citas/release/versión, selección y receta; no se
usa coincidencia textual aislada como prueba de fuente.

Se afinaron al final la condición de curso reprobado a U03 y la separación entre
catálogo y petición de contenidos. La
revisión reproducible del comparador confirma que no cambia ningún prompt de
los 43 turnos medidos ni de los 24 casos de captura. Se probaron los nuevos casos de
corrección de temario con antecedente fallido y catálogo/contenidos mediante dobles. No se repitió
el integral costoso para una condición que no se activa en ninguno de sus inputs.

La primera corrida contra expectativas antiguas produjo fallos de tests que
exigían conservar el fallback o usaban temas sin identificar para probar citas.
Se actualizaron al comportamiento aprobado y se conservaron los controles de
protocolo/citas usando temas identificados. Fixtures nuevos de RAG tuvieron títulos
vacíos o IDs repetidos y fueron rechazados por el normalizador/citador; se corrigieron solo sus metadatos
ficticios, sin relajar validación. Un error de tipado del harness HTTP se corrigió
antes de ejecutarlo. Estos intentos no se presentan como PASS ni se ajustó una
rúbrica académica para ocultarlos.

Limitaciones: reconocimiento determinista, no comprensión universal de paráfrasis;
no garantía semántica por tener citas; pedidos identificados grandes o historiales
distintos todavía pueden exceder capacidad. La clasificación exige el formato
demostrado del proveedor; otro formato sigue como rechazo genérico. El diagnóstico
interno no añade logs ni nuevos detalles al error público.

## Reproducción

Desde `backend/api`, primero:

```powershell
npm run typecheck
node --import tsx --test test/ccd-context-adversarial.test.ts test/ccd-preflight.test.ts test/document-evidence.test.ts test/document-rag.test.ts test/conversation-context.test.ts test/document-query-retrieval.test.ts test/authenticated-document-retrieval.test.ts test/ollama-generator-client.test.ts test/auth-handlers.test.ts test/auth-v2-contract.test.ts test/messages.test.ts
```

Ensayos explícitos, revisar primero precondiciones/último resultado; no son retry:

```powershell
node --import tsx test/auth-i1b-f2-implementation-adversarial.mts capture
node --import tsx test/auth-i1b-f2-implementation-adversarial.mts probe
node --import tsx test/auth-i1b-f2-implementation-http.mts
node --import tsx test/auth-i1b-f2-implementation-http.mts --capacity-only
```

Desde la raíz, focal antes de full:

```powershell
node --import ./backend/api/node_modules/tsx/dist/loader.mjs eval/integration/ccd-auth-i1b-f2-implementation.mts focal
node --import ./backend/api/node_modules/tsx/dist/loader.mjs eval/integration/ccd-auth-i1b-f2-implementation.mts full
node --import ./backend/api/node_modules/tsx/dist/loader.mjs eval/integration/ccd-auth-i1b-f2-implementation-review.mts f2-implementation-full-1792807283995-1792807191623.json
```

Las herramientas reutilizan exclusivamente fixtures F1 ya aprovisionadas, exigen
archivo DPAPI existente y ausencia de sesiones activas de esas fixtures; no
ejecutan setups ni cambian contraseñas. Se admiten historiales previos de ensayo
de B: se verifica que excluyan los chats nuevos de A, no que estén vacíos. No hay
una segunda implementación de autenticación. Cada resultado nuevo tiene nombre
único; respuestas completas permanecen privadas/excluidas en `data/ccd/evidence/`.

## Integridad y archivos

Producción: `backend/api/src/chat/document-evidence.ts`, `document-rag.ts`,
`backend/api/src/generation/generator-client.ts`, `ollama-generator-client.ts`.
Tests existentes: `ccd-context-adversarial.test.ts`, `document-evidence.test.ts`,
`document-rag.test.ts`, `messages.test.ts`. Se reutiliza el banco original de 24
casos sin modificar sus preguntas; el probe residual es un caso adicional nuevo.
Herramientas nuevas: `test/auth-i1b-f2-implementation-{adversarial,http,audit}.mts`,
`test/auth-i1b-f2-implementation/environment.ts`,
`eval/integration/ccd-auth-i1b-f2-implementation{,-review}.mts`, informes y este
checkpoint. OPS/Mobile/REST/SQL/autenticación y checkpoints históricos intactos.

Cada ensayo real compara huella del corpus y, para HTTP, huella de todos los
historiales preexistentes (mensajes y citas incluidos). Coinciden antes/después.
Corpus: `db29ad53062ee400a367fb4a16b4c5cc2f9c178cb1333e29dab29fe12a449963`.
Solo se escribieron chats nuevos de ensayo y estado de sus sesiones ficticias;
la revocación focal afecta únicamente su token nuevo. No se accedió a
`banuchat_ccd_dev`, bases sintéticas/históricas o `CCD_DOCUMENTACION`.
La auditoría final registra alcance exacto, secretos I1B/F1 contrastados en memoria,
huella actual del corpus, sesiones de fixture cerradas y `git diff --check`.

## Verificación personal Android y decisión de cierre

El operador reportó ya autenticación A/B, aislamiento, historial y restauración
en Android; no se atribuye esa observación al agente ni se exige repetirla como
si estuviera pendiente. **Lo nuevo de F2 en Android sí está pendiente.**
La API existente en 3003 puede conservar código cargado anterior. El operador
debe detener únicamente su terminal API con Ctrl+C y arrancar:

```powershell
Set-Location 'C:\Users\samue\OneDrive\Documentos\BanuProject\BanuChat_\backend\api'
node --import tsx test/auth-i1b-operator.mts api
```

Conservar Metro 8084 y las rutas reverse autorizadas del teléfono. En un chat
nuevo: enviar la paráfrasis F2, comprobar aclaración concreta sin fuentes; indicar
IA Generativa y comprobar respuesta/DOC-101 y los cuatro mensajes al reabrir
Historial. Probar la pregunta F1, comparación de dos cursos con dos fuentes,
petición de todos los temarios y tema ajeno. No es necesario provocar capacidad
en el teléfono. Ante resultado incierto, reconciliar historial sin retry automático.

Confirmado: caso F2 corregido mediante aclaración, no alias; casos identificados y
comparación conservados; capacidad diferenciada; atomicidad y baseline verificados.
Pendiente: prevención universal o UX pública específica de capacidad, reconocimiento
más amplio si se autoriza, calidad semántica humana y recorrido F2 físico.
Descartado: truncado, primer vector como verdad, reducción global de top-k,
mayor contexto/modelo, nuevos campos HTTP o una abstención que oculte capacidad.
No se cambian compromisos OE1–OE6 ni se acredita una evaluación reservada o aval CCD.
**Entrega acotada funcional, F2 general parcialmente resuelto; detener para Sala,
sin I1C, commit o push.**
