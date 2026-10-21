# CHECKPOINT BANUCHAT — BCH-03 incremento 3

Fecha: 2026-10-21. Base aceptada: `c61f306`. Estado: flujo conversacional REST CCD
local verificado con PostgreSQL/pgvector y Ollama reales. Mobile CCD no probado.
Sin commit ni push. No se afirma integración institucional ni autenticación real.

## Adaptación mínima y contrato

La dependencia que impedía abrir conversaciones era la FK de
`conversations(dataset_release_id, profile_key)` a `synthetic_profiles`.
El corpus CCD publicado no contiene estudiantes y no debía recibirlos para pasar
esa validación. `003_ccd_chat_demo.sql` añade `ccd_demo_contexts` fuera del corpus,
con una clave fija `ccd-local-demo` y alias «Demostración CCD local — sin identidad
institucional». Conserva release FK e inmutabilidad. La FK de conversaciones de
la base CCD apunta ahora a ese contexto; no se elimina la validación de pertenencia.
Un INSERT con otra clave se rechazó realmente con SQLSTATE 23503 y rollback.

La migración se aplicó una sola vez en `banuchat_ccd_dev`, tras verificar identidad
de servicio, volumen y publicación, sin conversaciones ni perfiles previos. No se
reaplicaron 001/002, no se alteraron sus archivos ni la base sintética. El corpus
conserva dos documentos y dos vectores; el contexto no se incorpora al manifiesto.

Se conserva la forma REST: mismas rutas, métodos, campos, schemas, requisitos y
códigos. Sí existe una extensión semántica explícita: en modo CCD `profile_key`
agrupa historial demo compartido y no identifica un alumno. `GET /profiles`, apertura
y detalle consultan la tabla de contextos solo en ese modo. Se justificó en
`backend/api/api-contract.md` y ADR 0006. OpenAPI solo cambió annotations de
`description`/`summary`: comparación estructural con HEAD confirmó que el resto
del documento es idéntico. No se altera MCP.

## Configuración y flujo implementados

- `BANUCHAT_DEMO_MODE=ccd_local`: base fija `banuchat_ccd_dev`, credenciales
  `CCD_POSTGRES_*`, puerto PostgreSQL por defecto 55433, listener `127.0.0.1:3001`.
- El arranque exige release CCD publicada, un contexto demo vigente y cero perfiles
  sintéticos; rechaza usar puerto DB 5432, LAN o un modo ambiguo. El modo sintético
  sigue como default; no puede apuntarse accidentalmente a la base CCD sin seleccionarlo.
- `createRuntimeApiServer` reutiliza handlers, coordinador de concurrencia, router,
  persistencia atómica de turnos y citas y relectura histórica. Main inyecta raíz
  CCD para artefactos y `evidence_mode=ccd_local` para el generador.
- El router recibe `profile_selected=false`: el contexto técnico no habilita progreso
  de un estudiante. Su catálogo queda intacto. El dispatcher CCD deriva el antiguo
  `known_out_of_scope` sintético a RAG, porque una pregunta genérica de contacto ahora
  está respaldada por M12. Ayuda/saludo delimitan la demo y rutas estructuradas no
  incorporadas no presentan oferta/progreso como datos de una persona.
- El prompt sintético permanece igual. Solo el CCD sitúa respuestas institucionales
  en 202660 y exige advertir vigencia no ratificada al contestar contacto.
- Historial persistido no significa memoria generativa: cada llamada RAG recibe
  únicamente la pregunta actual. Sin Agent/ReAct ni MCP.

Para repetir: completar las opciones no secretas del ejemplo en el archivo local
`infra/.env.ccd`, conservar las credenciales existentes y los digest/versiones
inspeccionados realmente de Ollama. Desde `backend/api`, `npm run build` y
`npm run start:ccd`. No repetir la migración sobre la base ya migrada.
`npm run test:ccd:http` requiere 3001/3302 libres y crea otro chat CCD de prueba;
no hace retry de mensajes, reingesta ni modificación de la demo sintética.

## HTTP real observado

El runner inicia la API compilada a través de `main.ts`, usa fetch HTTP en loopback
y luego cierra solo sus procesos/listeners. PostgreSQL/Ollama y volúmenes permanecen
activos. No son handlers simulados ni invocación directa de Document RAG.

Evidencia final local, ignorada por Git:
`data/ccd/evidence/increment-3/http-1792624797073.json`.
Conversación final: `7bda9272-8d94-49eb-af17-b409f839f883`.

| Operación/caso | Resultado final |
| --- | --- |
| GET perfiles/contexto CCD | 200, solo `ccd-local-demo` con alias sin identidad institucional. |
| POST conversación con clave no admitida | 404, sin crear estudiante ni conversación para esa clave. |
| POST conversación con contexto CCD | 201, alias y contexto correctos. |
| Pregunta M01 de tres pilares de 202660 | 201, respuesta cotejada con el contenido admitido; citas `unit:M01`, `unit:M12`. |
| Pregunta M12 de contacto documentado de 202660 | 201, respuesta cotejada; citas `unit:M12`, `unit:M01`. |
| Pregunta genérica de contacto | 201, llega a RAG aunque el router histórico la clasifique fuera de alcance; respuesta explicita periodo 202660 y vigencia actual no ratificada. |
| Repetición gratuita de pruebas | 201, evidencia insuficiente, sin citas ni autorización inventada. |
| Homologaciones automáticas | 201, evidencia insuficiente, sin citas ni equivalencias inventadas. |
| Exención de todos los pilares por 70 puntos | 201, evidencia insuficiente, sin citas ni efectos académicos inventados. |
| Ayuda/capacidades | 201, alcance CCD local y ausencia de identidad institucional explícitos. |
| Progreso individual | 201, evidencia insuficiente, sin progreso de estudiante simulado. |
| GET detalle e historial | 200; 16 mensajes. Cada assistant reconstituido coincide con la respuesta enviada, incluidas citas e insuficiencia. |
| GET artefactos de citas | 200; bytes/checksum coinciden con `message_citations.source_sha256` y la versión documental. |

La conversación final tiene 8 turnos y 6 citas persistidas. Las tres respuestas
documentales recuperan ambos chunks porque top-k=5 y solo existen dos: las citas
enumeran contexto, no atribución individual de cada afirmación. Se verificaron
release, versión, chunk, localizador y hash contra PostgreSQL, no solo contra el JSON
de respuesta. Los casos negativos y ayuda no guardaron citas.

Primera pasada HTTP: `http-1792624658155.json`, conversación
`7629d586-a0b3-41aa-be0b-e93fd3036be6`, también 8 turnos/6 citas. Su contacto genérico
era correcto pero omitía el límite temporal, por lo que se aclaró el prompt CCD y
se repitió la verificación con una conversación nueva. No fue un retry automático
del mismo POST. Ambas quedan como evidencia local: estado final 2 conversaciones,
32 mensajes y 12 citas; `db-final.json` registra esos conteos y el rechazo de FK.
No se borró el historial de prueba.

## Conservación del corpus y demo sintética

La release CCD permanece `5834fc47-57c5-498b-98fc-4190330155e4`, `ready/current`.
Manifiesto JSONB `27391f96ab9fd830c34e4aeed4c45699ccd20bd2d5a03d2c0fb1de54ee0b02be` y
pipeline `6fc5eeefe186802a84d355221d92c5f92a158ac509a290617459bbf65a76afc4` sin cambios.
Antes/después de cada prueba se cotejaron conteos y hashes de ambos vectores:
2 documentos/chunks/embeddings, sin reingesta ni embeddings documentales nuevos.
Los embeddings de las preguntas son transitorios, propios de la consulta.

La demo sintética fue comprobada por otro listener local, mismo código, modo
`synthetic`, solo con GET: perfiles, progreso, listado y detalle de una conversación
ya existente devolvieron 200. Se releyó
`36380018-77aa-40a3-8601-0367518de458`; no se creó ni envió un turno a la demo.
La regresión unitaria incluye los POST sintéticos mediante SQL controlado. No se
declara una nueva prueba operacional de escritura sintética en este incremento.

La revisión automática rechazó la versión inicial del runner porque incluía crear
un chat en la base sintética existente, interpretándolo como alteración de su volumen.
Ese comando no se ejecutó. Se retiraron todos los POST sintéticos y se completó
la alternativa de solo lectura, sin eludir el rechazo ni solicitar acceso adicional.

## Pruebas ejecutadas y archivos

| Validación | Resultado |
| --- | --- |
| Typecheck API y RAG | Ambos código 0. |
| Build API y RAG | Ambos código 0. |
| Typecheck estricto del runner `.mts` | Código 0. |
| Suite API final | 475 aprobadas, 0 fallos, 0 omitidas; salida en `api-unit-final.log`. |
| HTTP final | 17 observaciones, todas con los resultados esperados; sin simulación de DB/Ollama. |
| FK real CCD con clave no admitida | 23503; transacción revertida, sin fila nueva. |
| OpenAPI frente a HEAD | Estructura idéntica al retirar solo anotaciones descriptivas. |
| Integridad de carpeta institucional | 124 archivos cotejados por SHA-256 contra el diagnóstico; 0 diferencias. |
| Diff de dataset v1, migraciones 001/002 y Mobile | Sin cambios. |
| `git diff --check` y revisión de alcance/ignore | Código 0, sin whitespace inválido ni archivos fuera de alcance; contenido/evidencia y credenciales locales ignorados. Aviso de conversión futura LF/CRLF en el ejemplo de entorno por `text=auto`, sin renormalizar. |

El primer typecheck detectó dos respuestas estáticas sin la propiedad interna
`route`; se corrigieron antes de ejecutar HTTP. La suite API también pasó antes
de la aclaración de contacto; no se suman ambas corridas como pruebas distintas.
No se repitió la suite costosa de ingesta: el procesamiento y corpus no cambiaron;
la modificación RAG se limita al comando operacional de migración 003 y pasó
typecheck/build. No se ejecutaron tests móviles, E2E de ingesta ni RAGAS.

Nuevos:

- `infra/db/003_ccd_chat_demo.sql`.
- `backend/api/src/application/demo-mode.ts`, `backend/api/src/ccd-runtime.ts`.
- `backend/api/test/ccd-mode.test.ts` y `eval/integration/ccd-chat-http.mts`.
- Este checkpoint.

Modificados:

- API: `package.json`; `src/application/{profiles,conversations,conversation-detail,messages}.ts`;
  `src/chat/{chat-types,chat-dispatcher,document-rag}.ts`; `src/http/api-server.ts`;
  `src/main.ts`, `src/runtime-config.ts`; `README.md`, `api-contract.md`, `openapi.yaml`.
- `backend/rag/src/ccd/load-local.ts`, `infra/.env.ccd.example`.
- `AGENTS.md`, `data/ccd/README.md`, `infra/db/ccd-local-development.md`,
  `docs/arquitectura.md`, ADR 0006.
- Locales ignorados: opciones de `infra/.env.ccd`, logs y evidencia del incremento 3.
  No se mostraron credenciales ni se incorporaron originales institucionales a Git.

## Límites para una prueba móvil posterior

El cuerpo REST es compatible, pero Mobile aún conserva sesión/rótulos/capacidades
de perfiles sintéticos, calendario/progreso/anuncios y presentación local del asistente.
Debe adaptar esos textos/capacidades al modo CCD, sin llamar estudiante al contexto.
El contexto es compartido y no aísla historiales por persona: no es autenticación.

El listener CCD actual es loopback y rechaza bind LAN; no puede apuntarse un teléfono
físico a la IP LAN sin una tarea de acceso local controlado. También debe comprobarse
la URL base `EXPO_PUBLIC_API_BASE_URL`, artefactos y relectura en el dispositivo.
Expo SDK 57, archivos móviles y proyectos nativos permanecen intactos.

No hay memoria, Agent/ReAct, MCP, corpus ampliado, validación institucional formal
ni generalización de reglas académicas. La vigencia actual sigue sin ratificarse;
el contacto probado se limita a la documentación 202660. El incremento termina aquí.
