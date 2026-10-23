# CHECKPOINT BANUCHAT — I1B-503-F1

Fecha: 2026-10-23. Incremento listo para revisión de Sala de Control BanuChat.
HEAD de partida y entrega: `762efcde1c5cb89e6ca505abcd0e5161c40e787d`.
Sin commit ni push. Android físico: **no ejecutado por el agente**.

## Diagnóstico y cambio delimitado

El diagnóstico anterior confirmó, en un ensayo nuevo del laboratorio I1B, que el
nombre desarrollado no reconocía el curso documental. El fallback seleccionaba diez
fragmentos y Ollama rechazaba un prompt de 6411 tokens frente a 4096 de contexto
cargado; REST devolvía 503 sin persistir el turno. No se atribuyen retrospectivamente
los cuatro request_id del operador a esa reproducción.

`backend/api/src/chat/document-evidence.ts` añade un único alias explícito, después
de la normalización existente de acentos, mayúsculas y puntuación:
`inteligencia artificial generativa` → `ia generativa`, con límites de palabra.
Se usa en `selectCcdEvidence` y en `ccdGuidanceTopic`: reconocer el tema nuevo también
debe detener el arrastre de una orientación U03/U04 anterior. La normalización base,
las prioridades de corrección y el fallback cuando falta el syllabus no cambian.
Una mención genérica de inteligencia artificial no activa este alias.

La integración existente de `document-rag.ts` limita estos selectores al modo CCD;
ese archivo no cambia. No se añaden cursos, documentos, vectores o referencias.
El diff de producción es de 7 líneas añadidas y 2 sustituciones, en un solo archivo.
No cambian SQL, migraciones, autenticación, contratos REST, corpus, prompts,
top-k, modelos, digest, parámetros de generación, contexto ni tiempos de espera.

## Identidad y protección del laboratorio

Se reutilizó exclusivamente `banuchat-ccd-auth-i1b-test`, PostgreSQL loopback
`127.0.0.1:55443`, base `banuchat_ccd_auth_i1b_test`, red y volumen del laboratorio
I1B verificados por `test/auth-i1b/environment.ts`, sin bootstrap ni migraciones.
Release actual: `3d6cedac-0e86-40c8-909b-d3ff6e8ab741`.
Se comprobaron el rol runtime y el modo `ccd_local` antes de los ensayos.

Se crearon dos cuentas ficticias F1 independientes, con conversaciones nuevas,
sin reutilizar ni modificar cuentas del operador. Sus contraseñas aleatorias
se conservan únicamente mediante DPAPI CurrentUser y ACL del operador en
`infra/local/auth-i1b/f1/accounts.dpapi`, excluido de Git. El estado privado de
auditoría se conserva en la misma carpeta. No se reinicializan cuentas al repetir
herramientas; un estado de preparación parcial detiene el ensayo.

Antes de provisionar se capturó una huella de todas las conversaciones preexistentes,
sus mensajes y citas. Las comprobaciones posteriores confirmaron que no cambiaron.
Las sesiones F1 terminaron revocadas/cerradas; las cuentas y conversaciones de ensayo
se conservan como evidencia. Solo se eliminó la conversación vacía recién creada de
la segunda cuenta para probar aislamiento y conservar el escenario focal esperado.

Huella del corpus antes/después:
`db29ad53062ee400a367fb4a16b4c5cc2f9c178cb1333e29dab29fe12a449963`.
Se verificaron 24 artefactos con sus hashes. No se conectó a `banuchat_ccd_dev`,
bases sintéticas ni laboratorios históricos. El modo sintético se verificó con
dobles unitarios, sin acceder a su PostgreSQL.

Ollama: `0.35.0`, generador `qwen3:4b-instruct`, digest
`0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`.
Receta conservada: `think=false`, `stream=false`, `temperature=0`,
`num_predict=256`, `keep_alive=5m`; timeout del generador 30 s.
Embedding de la release: `qwen3-embedding:0.6b`, 1024 dimensiones, coseno,
configuración/revisión guardadas y validadas por el cliente existente, timeout
120 s. No se modificó ninguna configuración para obtener éxito.

## Pruebas ejecutadas

Primero, desde `backend/api`:

```powershell
npm run typecheck
node --import tsx --test test/document-evidence.test.ts test/document-rag.test.ts test/conversation-context.test.ts test/document-query-retrieval.test.ts test/authenticated-document-retrieval.test.ts
```

Resultado: typecheck correcto; **92/92 pruebas** aprobadas. Incluyen nombre
canónico/desarrollado, pregunta exacta del operador, acentos y mayúsculas, los otros
seis títulos admitidos, falta del syllabus, menciones genéricas, seguimiento,
corrección a Marca Personal, corte de orientación anterior, ambigüedad sin contexto,
selección exclusiva DOC-101 en CCD y ausencia del filtro nuevo en modo sintético.
En RAG se inspeccionó también la evidencia recibida por el generador y las citas.

Después, desde la raíz del repositorio:

```powershell
node --import ./backend/api/node_modules/tsx/dist/loader.mjs backend/api/test/auth-i1b-503-f1-http.mts
node --import ./backend/api/node_modules/tsx/dist/loader.mjs eval/integration/ccd-auth-i1b-503-f1.mts focal
node --import ./backend/api/node_modules/tsx/dist/loader.mjs eval/integration/ccd-auth-i1b-503-f1.mts full
node --import ./backend/api/node_modules/tsx/dist/loader.mjs eval/integration/ccd-auth-i1b-503-f1-review.mts 503-f1-full-1792779633613.json
```

| Validación | Resultado real |
| --- | --- |
| HTTP específico alias/canónico/pregunta exacta/seguimiento | 4/4 POST con 201; 4 citas DOC-101; sin 400 del generador ni 503 |
| Historial y persistencia | GET antes/después coincide con pares usuario/asistente; citas verificadas por SQL, release, locator y hash |
| Aislamiento entre cuentas | GET ajeno 404 en ambas direcciones y POST de B sobre A 404; logout 204 |
| Regresión focal I1B | 18/18 turnos, 91/91 controles, 23 citas, 24 artefactos |
| Revocación focal durante generación | 401 y cero mensajes parciales |
| Regresión integral I1B | 43/43 turnos, 216/216 controles, 40 citas, 24 artefactos |
| Gates de autorización integral | anónimo 401, ajeno 404, recursos no soportados 403, override de scope 400, v1/legacy sin dueño 404 |
| Comparación contra I1B anterior | 43/43 textos, identidades de citas, selecciones e insuficiencia iguales; misma receta y llamadas |

No hubo reenvío automático de POST ni cambios de parámetros. Las herramientas
reconcilian historial antes/después; un POST de resultado incierto se detiene y no
se repite. Los servidores del ensayo usaron puertos efímeros loopback; no se
reinició el proceso del operador en 3003.

### Selección y contexto antes/después

El estado anterior se toma del informe histórico de diagnóstico, sin repetir el
POST que provocaba exceso de contexto. El posterior se observó en selección pura
y en la entrada real al generador autenticado.

| Formulación de ensayo | Antes: fragmentos | Después: fuente única | Bytes del prompt / tokens evaluados después |
| --- | --- | --- | --- |
| Nombre canónico | 1 | `unit:M02:DOC-101` | 6974 / 1883 |
| Nombre desarrollado | 10 | `unit:M02:DOC-101` | 6989 / 1886 |
| Pregunta exacta del operador | 10 (selector puro anterior) | `unit:M02:DOC-101` | 7006 / 1891 |
| Seguimiento del nombre desarrollado | — | `unit:M02:DOC-101` | 7616 / 2045 |

La reproducción histórica del nombre desarrollado medía 20661 bytes / 6411 tokens.
Los cuatro ensayos F1 terminaron con `done_reason=stop`, insuficiencia falsa y una
cita del syllabus correcto. La inspección de las respuestas observó temario
pertinente y el límite de vigencia histórica, sin acreditar oferta actual.
La equivalencia documental se acredita por selección y cita, no por igualdad
textual entre las distintas formulaciones.

### Comparación semántica y pendientes

Baseline privado I1B: `full-1792769823958.json`, SHA-256
`73dcbae6ba92aec7fb0fb412d8f0bb29c3934b71bcbc7dc784c77afb06bfbdd2`.
F1: `503-f1-full-1792779633613.json`. Se verificaron preguntas idénticas,
texto completo, locator/versión/release de citas, selección, insuficiencia y
conteos de llamadas. La clasificación previa se conserva por identidad de las
salidas ya revisadas; HTTP 201 no se convirtió en juicio semántico automático.

T01 y T11 conservan C; T02–T09 y T12 conservan B; T10a/T10b, REG, AMB y AMB_FRESH
conservan A. **T01/2 sigue perdiendo la orientación parcial útil respecto de 5.3;
T11 sigue pendiente académico. Este alias no resuelve ninguno de los dos.**
No hay nuevos cambios semánticos en los 43 turnos del baseline I1B.

## Archivos de entrega y evidencia

- Producción: `backend/api/src/chat/document-evidence.ts`.
- Pruebas existentes ampliadas: `backend/api/test/document-evidence.test.ts` y
  `backend/api/test/document-rag.test.ts`.
- Ensayo y auditoría F1: `backend/api/test/auth-i1b-503-f1-http.mts`,
  `backend/api/test/auth-i1b-503-f1-audit.mts`,
  `backend/api/test/auth-i1b-f1/environment.ts`.
- Evaluador y comparación separados: `eval/integration/ccd-auth-i1b-503-f1.mts`
  y `eval/integration/ccd-auth-i1b-503-f1-review.mts`.
- Informes públicos depurados:
  `eval/auth/results/bch05-ccd-auth-i1b-503-f1-{http,focal,full,comparison,audit}.json`.
- Este checkpoint. Las respuestas completas solo están en
  `data/ccd/evidence/auth-i1b/503-f1-*`, excluido de Git. No se sobrescribió
  evidencia I1A/I1B ni del diagnóstico previo.

La auditoría final pasó: cero secretos del laboratorio/fixtures en los archivos
versionables de la entrega, corpus e historiales previos intactos, dos cuentas F1,
cero sesiones F1 abiertas y 16 archivos protegidos verificados. Typecheck volvió
a pasar al cerrar las herramientas. `git diff --check` y la comprobación de
whitespace de archivos nuevos pasaron al entregar.
No se ejecutaron pruebas Mobile: no hay cambios Mobile. No se ejecutó Android.

## Repetición personal en Android por el operador

El proceso ya abierto en 3003 puede conservar módulos anteriores. En **su terminal
API**, detenerlo con Ctrl+C y arrancar el entrypoint existente, que carga el código
actual y la configuración privada del laboratorio (no usar la acción `accounts`):

```powershell
Set-Location 'C:\Users\samue\OneDrive\Documentos\BanuProject\BanuChat_\backend\api'
node --import tsx test/auth-i1b-operator.mts api
```

Mantener Ollama y PostgreSQL del laboratorio existentes. En otra PowerShell, para
arrancar Metro con el logger de desarrollo aprobado en 8084:

```powershell
Set-Location 'C:\Users\samue\OneDrive\Documentos\BanuProject\BanuChat_\mobile'
$env:EXPO_PUBLIC_DEMO_MODE = 'ccd_authenticated'
$env:EXPO_PUBLIC_API_BASE_URL = 'http://127.0.0.1:3003/api/v2'
$env:EXPO_PUBLIC_AUTH_LOCAL_CHANNEL = 'adb_reverse'
$env:EXPO_PUBLIC_BANUCHAT_DIAGNOSTIC_HTTP = '1'
$env:EXPO_NO_TELEMETRY = '1'
adb reverse tcp:3003 tcp:3003
adb reverse tcp:8084 tcp:8084
npx expo start --localhost --port 8084 --clear
```

Si Metro ya tiene esa configuración puede mantenerse; no hay cambios de frontend.
Los comandos ADB anteriores son instrucciones para el operador, no ejecuciones
del agente. Usar las credenciales locales que ya conserva el operador; no copiar
contraseñas ni tokens a reportes.

En Expo Go: abrir una conversación de ensayo nueva y enviar una sola vez
«¿Qué temas se estudian en el curso de Inteligencia Artificial Generativa?».
Comprobar respuesta sobre temario, abrir la fuente DOC-101 y reabrir el historial.
Continuar con «¿Y qué temas tiene?», después corregir explícitamente a Marca
Personal y comprobar la fuente de ese curso. En otro chat nuevo, «¿Y ese curso?»
debe pedir contexto suficiente. No interpretar ausencia de logger como prueba
de éxito: el logger aprobado solo observa rechazos HTTP.

Si falla, conservar únicamente status, código, request_id y duración del logger
aprobado; reconciliar historial antes de decidir cualquier nuevo envío. No reenviar
automáticamente. Al terminar puede desactivarse la variable de diagnóstico y
reiniciarse Metro para actualizar el bundle.

## Límites y punto de detención

El alias reduce la evidencia del caso demostrado; no implementa presupuesto
general de contexto ni garantiza que otras consultas amplias no excedan el modelo.
No concede autenticación institucional, vigencia académica o nuevas capacidades.
Los riesgos académicos previos de I1A/I1B permanecen, incluidas T01/2 y T11.
La validación física Android y la revisión de Sala de Control siguen pendientes.
**Detenido en I1B-503-F1 para revisión; sin I1C, commit ni push.**
