# RAG-SEMANTIC-QUALITY-01 — comprensión y cobertura de respuestas

Fecha: **2026-10-31**, America/Bogota. Base: `c70dad4e`.
Estado: **implementado y validado dentro del corpus vigente**.
Alcance: política documental de la API actual y su composición Unified.
Se atendió la aclaración del usuario: esta ejecución cierra únicamente RAG;
WEB-02 queda pendiente y sus cambios previos se preservan.

## Diagnóstico y cambio

El archivo de respuestas del usuario sirve como diagnóstico, no como evidencia
institucional ni catálogo de respuestas que el código deba memorizar. Contiene
una contradicción sobre la tarifa: el texto detallado dice $362.550 y una fila
del resumen menciona $362.500. Se conserva el valor de la release publicada,
**$362.550 para 2026**; no se editan fuentes para acomodar expectativas.

Los errores observados no se originaban exclusivamente en la generación. Las
ramas de selección podían elegir un solo atributo y perder los demás, interpretar
«modalidad» del diagnóstico como modalidad de cursos o convertir la solicitud de
un procedimiento de matrícula en un catálogo. La selección ahora establece el
sujeto y acumula atributos independientes, usando las unidades revisadas de la
misma release. No hay tablas de preguntas/respuestas ni referencias a casos de
evaluación en el código de producto.

- Plataformas del diagnóstico y trámites de inscripción/cancelación conservan su
  sujeto, incluso si la consulta también menciona cursos, presencial o virtual.
- Propósito/duración, tarifa/intensidad, ambos pilares solicitados y
  cantidad/créditos se cubren por separado. Una parte sin evidencia se identifica
  explícitamente, con `insufficient_evidence=true`; las citas conservan solo las
  partes respaldadas. `unanswered_aspects` es una traza interna, no un campo REST.
- Un alias del catálogo se sustituye por un nombre de curso únicamente después
  de recuperar su ficha adoptada de la misma release. Se cita también esa ficha.
  Esto permite mostrar **Marca Personal Digital** sin reescribir el corpus.
- El total de tres cursos se explica **si los tres pilares se completan mediante
  cursos**. Se conserva la excepción de los pilares ya validados por diagnóstico;
  no se convierte una orientación general en una obligación universal individual.
- Las solicitudes de expedientes reales, notas/promedios de Banner, asignación
  docente individual, autorizaciones económicas o identificación de archivos
  internos por nombre/código/ruta se detienen antes del retrieval y, en Unified,
  antes de fast paths o admisión del Agent. Preguntar por temas de un syllabus,
  fuentes generales o archivos PDF como contenido académico sigue permitido.
- Para identificadores legales ausentes se muestran los contenidos respaldados y
  se explica el límite de la evidencia seleccionada. No se deduce que el original
  completo carezca de referencias legales. Las secciones rechazadas por el filtro
  documental tampoco adquieren una cita a través de esta respuesta parcial.

Se conservan búsqueda exacta/top-k, validación de release, acceso autenticado
existente, periodos, límites de contexto y protocolos de fuentes. No se modifican
prompts para insertar respuestas del diagnóstico, modelos ni configuración Ollama.

## Validación realizada

`backend/api`:

- `npm run typecheck`: PASS.
- `node --import tsx --test test/ccd-*.test.ts test/conversation-context.test.ts`:
  primera pasada **187/187 PASS**; suite final tras los ajustes y la regresión del
  pasaje académico rechazado: **188/188 PASS**, sin fallos, cancelados o saltados.
- Typecheck estricto explícito de los dos evaluadores `.mts`: PASS.
- `git diff --check`: PASS; alcance y huellas de los archivos WEB-02 revisados.

La prueba nueva usa nombres, plataformas, periodos, precios e intensidades
**sintéticos diferentes**. Comprueba paráfrasis, orden y puntuación distintos,
tres atributos simultáneos, falta de una parte, tarifa futura, periodos, fuentes
de catálogo, límites de capacidad y salida saneada. La regresión de routing que
enviaba «mis notas» a orquestación se adapta al límite de capacidad pedido por el
usuario; se conservan las pruebas de progreso auxiliar y consultas multifuente.

Muestra local de **14 casos**, sobre PostgreSQL y embeddings Ollama reales:

1. El evaluador toma las políticas `ccd-knowledge` y `ccd-query-intent` de HEAD
   como comparación anterior, resolviendo sus dependencias sin publicar cambios.
   El resultado anterior cumple **1/14** comprobaciones de esta muestra dirigida.
   No es una estimación de la calidad general del sistema.
2. La primera pasada del candidato cumple **12/14**. Detecta un error por claves
   repetidas/amplitud del catálogo y una omisión al reconocer el verbo «supervisa».
3. Se corrigen ambos y se repiten **solo esos dos casos**: **2/2 PASS**. El agregado
   observado cubre los 14 casos; no se presenta como otra pasada única 14/14.
4. Las conexiones usan `default_transaction_read_only=on`. La identidad y el hash
   del manifiesto permanecen iguales antes/después. Sin DML manual, publicación,
   nueva release, embeddings documentales ni benchmarks OE1/RAGAS.

Evidencia privada, con ACL restringida al usuario, fuera del repositorio y OneDrive:
`%LOCALAPPDATA%/BanuChat/rag-semantic-quality-01/`.
Pasada inicial: `580cc470-4c5c-46ee-abac-58b65259d201/report.json`.
Repetición focal: `0c61f671-063c-484b-bf12-5461674d8392/report.json`.
Los informes contienen respuestas seleccionadas y no se incorporan a Git.

Se recarga exclusivamente la API identificada en loopback 3004, con el entrypoint
existente `backend/api/scripts/start-unified.mts`. La prueba HTTP autenticada
comprueba cuatro turnos: tarifa/duración, plataformas/supervisión pendiente,
límite legal y autorización económica. Verifica citas de la release documental,
persistencia de **8 mensajes**, logout 204 y rechazo posterior 401. Primer informe:
`http-bc66365e-965f-4e46-9a5a-f9ab33e3c2b9/report.json`.
No se atribuye a la muestra directa la validación HTTP: son ejecuciones distintas.
La repetición HTTP sobre la revisión final también pasó: cuatro turnos, historial
de ocho mensajes y cierre de sesión. Informe final:
`http-b3d30f85-8add-42dd-b9ee-ff7f1810a290/report.json`.
La API final queda activa con PID **22984** en `127.0.0.1:3004`, iniciada con el
mismo launcher y las huellas de los cuatro archivos de producto registradas en
`runtime-final-3d32dada-c651-4a48-9cca-1b4cfd75956a/runtime.json`.
Se conserva la conversación ficticia propia de ensayo, sin borrarla ni modificar
conversaciones ajenas. No se vuelcan credenciales/tokens en los informes.

Reproducción explícita desde `backend/api`, con las dependencias locales existentes:

```powershell
node --import tsx scripts/evaluate-ccd-semantic-quality.mts --run-once
# Repetición focal opcional; no se ejecuta automáticamente:
node --import tsx scripts/evaluate-ccd-semantic-quality.mts --run-once --candidate-only --only=catalog,platform-monitoring-gap
node --import tsx scripts/evaluate-ccd-semantic-http.mts --run-once
```

## Límites y preservación

El derivado autorizado de plataformas nombra **Moodle–TEMA y Canvas**, pero no
contiene SUMADI. Ahora se recupera el pasaje pertinente con su periodo **2026-2**;
si se pide supervisión, se declara la parte pendiente. Incorporar ese dato o pasos
adicionales de otra fuente exige una ampliación editorial y publicación separadas.
No se inserta SUMADI en código ni se consulta Internet/UNAB para completar el dato.

La duración aproximada de dos horas conserva su alcance histórico para el conjunto
de tres instrumentos. La intensidad 32/64/96 conserva la distinción de horas y
edición. No se prometen oferta vigente, docentes, matrícula, gratuidad o derechos
individuales. La mejora sigue siendo una política determinista acotada; no acredita
comprensión universal, validación institucional ni evaluación humana de todos los
temas CCD.

Sin cambios en contratos REST/MCP, SQL/esquemas, corpus/release, documentos externos,
N8N, Agent/MCP, cuentas ajenas, Android ni despliegue. Se reutilizan las dependencias
activas. Solo se recarga la API y se realizan operaciones normales de autenticación
y chat para la cuenta ficticia de ensayo. Sin commit ni push.

Los siete archivos Mobile que ya tenían trabajo WEB-02 al aclararse el alcance se
preservan por hash: adaptador/pantalla de anuncios, `_layout`, calendario, progreso,
`screen-header` y `web-frame.web`. Su parche y huellas están en
`tmp/web02-preserved-before-rag.*`, ignorados. No pertenecen al cierre RAG ni se
declaran validados como WEB-02.

## Archivos de esta macrotarea

- `backend/api/src/chat/ccd-semantic-plan.ts`: planificación y límites de capacidad.
- `backend/api/src/chat/ccd-knowledge.ts`: recuperación/cobertura y respuesta parcial.
- `backend/api/src/chat/ccd-query-intent.ts`: rol documental para identificadores.
- `backend/api/src/auth/unified-product.ts`: límite previo a herramientas/fast paths.
- `backend/api/test/ccd-semantic-quality.test.ts` y
  `backend/api/test/ccd-knowledge-routing.test.ts`: pruebas y expectativa actualizada.
- `backend/api/scripts/evaluate-ccd-semantic-quality.mts` y
  `backend/api/scripts/evaluate-ccd-semantic-http.mts`: muestras opt-in, sin retry.
- `backend/api/README.md` y este checkpoint: comportamiento, evidencia y límites.
