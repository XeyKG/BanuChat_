# CHECKPOINT BANUCHAT — BCH-02 incremento 1

Fecha local: 2026-10-21 (America/Bogota). Base aceptada:
`5c492918018be0a5e74141f3939b8dfedfc4b3c0`.
Estado: continuidad contextual implementada y comprobada por HTTP real con
PostgreSQL CCD y Ollama. Incremento concluido para revisión de Sala de Control.
Sin commit ni push.

## Contexto y recuperación

`sendMessage` conserva el router y la persistencia atómica existentes. La misma
consulta SQL que obtiene la release y el próximo ordinal lee hasta ocho mensajes
anteriores de `c.id`, en orden ascendente de ordinal después de seleccionar los
más recientes. No consulta otros chats por el contexto compartido `ccd-local-demo`.
Las respuestas anteriores deben tener `answer_dataset_release_id` igual a la
release de la conversación; los mensajes del usuario pertenecen a esa misma
conversación, fijada a su release. Se rechaza la release no vigente antes de
enviar nada a RAG. El gate de persistencia sigue rechazando cambios de release
o de ordinal concurrentes; no persiste una respuesta generada con contexto obsoleto.

Límites: ocho mensajes, hasta 1.200 caracteres Unicode por mensaje y 6.000 en
total, priorizando los más recientes. No se amplía el esquema SQL ni se persiste
un resumen. El resolver léxico identifica seguimientos como «Háblame del de…»,
«¿Cuánto duran?», «¿Y qué temas tiene?» y correcciones. Para ellos concatena las
preguntas recientes desde el último tema autónomo con la consulta actual, con
presupuesto inferior a 4.000 caracteres para la consulta de embedding. Una
pregunta autónoma o un cambio explícito de tema inicia otra búsqueda. Los saludos
por sí solos no constituyen un antecedente suficiente.

El embedding usa solo texto del usuario; no convierte respuestas anteriores del
modelo en términos de búsqueda. La generación recibe preguntas y respuestas en
JSON rotulado como contexto no confiable, separado de la evidencia recuperada
de nuevo. La pregunta actual prevalece al corregir un dato. El prompt prohíbe
usar afirmaciones del estudiante como reglas o inferir UID, notas, aprobaciones
o periodo de ingreso. No añade una llamada LLM para reformular ni integra Agent,
ReAct, MCP o N8N al camino síncrono.

La consulta amplia «¿Cuáles son los cursos de Competencias Digitales?» requiere
una excepción acotada: recuperar diez unidades y enumerar por metadata solo los
syllabus M02 recuperados, con sus citas. El top-5 inicial omitió tres cursos,
incluido IA Generativa. Enviar las diez unidades al generador produjo otro fallo
real. El renderer de títulos evita ambos problemas y no afirma oferta vigente.
Las preguntas específicas conservan top-5, generación y el constructor de citas
existente. No se rediseña el mecanismo general de selección de citas.

## Orientación, autoridad y vigencia

Una referencia sin antecedente suficiente devuelve «¿A qué curso, prueba o tema
te refieres?», marcada como evidencia insuficiente, sin citas, embedding ni
generación. Si no existe una regla documentada, se conserva la abstención mediante
`EVIDENCIA_INSUFICIENTE`, sin inventar efectos ni pedir datos personales inútiles.
El prompt permite pedir un dato ausente solo cuando una regla respaldada lo requiera;
el corpus actual no libera reglas académicas individuales bloqueadas. No se acredita
una decisión de elegibilidad ni un orientador universal para reglas futuras.

Las fuentes actuales se consultan únicamente dentro de la release de la conversación.
El texto anterior del usuario nunca genera una cita: las citas salen de los chunks
recuperados en ese turno. Las pruebas reales rechazaron la premisa del usuario
«con 70 puntos me homologan todos los cursos» y su seguimiento sobre exención.
La separación de autoridad es una instrucción al generador y tiene cobertura
observada; no constituye una prueba formal contra toda posible alucinación.

Las respuestas suficientes CCD añaden por código límites de las fuentes recuperadas:
lineamientos de 202660 limitados a su población y con vigencia actual no ratificada;
syllabus como ediciones entregadas sin periodo/vigencia confirmados ni oferta actual.
La atribución específica de población se conserva en la evidencia documental.
Una respuesta que trate contacto requiere M12; sin esa fuente se sustituye por
abstención. Con M12 se añade siempre por código «El contacto documentado corresponde
a 202660; su vigencia actual no está ratificada». Una prueba hace que el generador
omita la advertencia y comprueba que siga presente en la respuesta. Otra fuerza
una respuesta de contacto sin M12 y comprueba su rechazo. No dependen solo del prompt.

Las conversaciones de releases antiguas siguen siendo legibles, con sus citas y
artefactos. POST de otro mensaje conserva 409 y no añade turnos: se debe abrir una
conversación nueva. La experiencia visual de ese caso queda pendiente en Mobile.
No hay consulta semántica histórica ni mezcla de conocimiento entre releases.

## Conversaciones reales ejecutadas

Runner: `eval/integration/ccd-conversation-http.mts`, ejecutado desde `backend/api`:

```powershell
node --env-file=../../infra/.env.ccd --import tsx ../../eval/integration/ccd-conversation-http.mts
```

Importa la API TypeScript real y crea un listener HTTP loopback efímero; las
peticiones pasan por los handlers REST, router, SQL, embedding y generación reales.
No son llamadas directas a RAG ni dobles de PostgreSQL/Ollama. El build también
se verificó, pero este runner no arranca `dist/main.js`. Verifica Docker, base y
volumen CCD antes de escribir; cierra únicamente su listener al terminar.

Destino: `banuchat_ccd_dev`, servicio `postgres-ccd`, proyecto `banuchat-ccd-dev`,
puerto PostgreSQL loopback 55433, volumen `banuchat-ccd-dev_ccd_pgvector_data`.
Release actual intacta: `fb8538af-3280-4a1b-889c-a27564381996` (`ready`, diez unidades).
Anterior intacta: `5834fc47-57c5-498b-98fc-4190330155e4` (`ready`, dos unidades).
El cliente comprobó digest y versión runtime de Ollama con la configuración local
existente; modelo de generación `qwen3:4b-instruct`, embeddings `qwen3-embedding:0.6b`.
No se modificó ninguna receta ni se ejecutó ingesta.

Evidencia final local, ignorada por Git:
`data/ccd/evidence/bch02-increment-1/http-1792628265549.json`.
Resultado: **48 controles aprobados, catorce POST de mensajes HTTP 201**,
tres conversaciones nuevas y 47 citas persistidas. Conversaciones finales:

- A: `a8621b5f-efe1-4c77-9d4f-f3dda8c681e8`.
- B: `1bd7a70b-68db-4189-98cb-6ea3b5004fb7`.
- C: `c1803f3b-a051-48f4-ac5e-7e3986cda092`.

| Secuencia / caso | Resultado observado |
| --- | --- |
| A: cursos → «Háblame del de IA generativa» → «¿Y qué temas tiene?» | Lista los siete syllabus; describe IA y sus temas, incluidos modelos de lenguaje/difusión, evaluación de herramientas y prompts. Retrieval de los seguimientos incluye el antecedente IA y recupera `unit:M02:DOC-101`. |
| B: «¿Y qué temas tiene?» mientras A tiene un tema activo | Pide aclaración; historial vacío, sin embedding, generación ni citas. No hereda memoria de A pese al mismo `ccd-local-demo`. |
| A: «¿Qué son las pruebas diagnósticas?» → «¿Cuánto duran?» | Recupera `unit:TEST_ORIENTATION`; responde aproximadamente dos horas, atribuidas a 202660. El embedding de duración ya no contiene IA. |
| A: «¿Y qué pasa si no las apruebo?» | Evidencia insuficiente, sin citas ni regla inventada. |
| A: «Cambiando de tema, ¿cuál es el correo de contacto del CCD?» | Búsqueda sin el tema de pruebas; respuesta con M12, 202660 y advertencia determinista de vigencia no ratificada. |
| C: interés en IA → «Corrijo: me refiero al curso de Marca Personal Digital. ¿Qué temas aborda?» → «¿Y qué temas tiene?» | Ambas respuestas posteriores describen identidad/presencia profesional, productividad, networking y contenido; cita de Marca Personal `unit:M02:DOC-103`. |
| B: afirmación del usuario sobre homologación con 70 puntos → seguimiento sobre exención | Dos abstenciones, sin citas; la premisa del usuario no se convierte en regla. |
| B: solicitud de UID, notas y periodo de ingreso | Abstención; no atribuye datos personales al contexto técnico. |
| Chat existente de release anterior `7629d586-a0b3-41aa-be0b-e93fd3036be6` | GET 200 antes/después con contenido idéntico; POST 409, sin añadir mensajes. |
| Relectura de los tres chats nuevos | Respuestas, indicadores y citas idénticos a lo devuelto en cada POST. |

Las 47 citas se cotejaron con versión/chunk: SHA, localizador y release coinciden.
Se descargaron los artefactos citados por HTTP y sus bytes coinciden con SHA de
la versión. La comparación antes/después conserva releases, manifiestos, pipelines,
hashes de contenido y vectores. Todo el historial preexistente, incluidas las
corridas previas de este incremento, conserva exactamente sus filas y citas.
SHA del snapshot histórico antes/después de la corrida final:
`7f43503007c718ee9f5363b534aa8e072e733f69a6bcd529bc95b5fb84cb2583`.
El reporte incluye huellas de código tomadas al inicio y cotejadas al final.

## Fallos y correcciones observados

- El primer `npm test` dentro del sandbox encontró `connect EACCES` en HTTP
  loopback; se interrumpió. La ejecución con acceso local permitido encontró un
  defecto real: «Háblame del curso de IA generativa» se trataba como referencia
  sin antecedentes. Se corrigió la regla y se agregó cobertura.
- Primera corrida E2E `http-1792627968247.json`: la lista solo incluyó cuatro
  cursos; el seguimiento de temas devolvió 503 seguro, sin persistir ese turno.
  Ese reporte no recogía una causa tipificada del generador; no se afirma la
  causa exacta. Además, las huellas se tomaron al final mientras se ajustaba el
  resolver, por lo que esa corrida no acredita una huella estable de todo el
  código ejecutado. Se conservan sus respuestas y fallos observados.
- Segunda corrida `http-1792628066412.json`: ampliar el contexto a diez documentos
  en generación produjo `invalid_generator_response` y HTTP 503 para el listado.
  Al no persistirse ese primer turno, los dos seguimientos pidieron aclaración.
  Se sustituyó solo el listado por enumeración de títulos documentales; no se
  relajó el rechazo del generador ni se aumentaron tokens/receta. También se
  solicitó un máximo de 80 palabras para las respuestas generadas.
- Tercera corrida `http-1792628174188.json`: secuencias y controles completos
  aprobados. La corrida final repitió la comprobación tras reforzar el rechazo
  de contacto sin M12 y precisar la advertencia de lineamientos.

Todas las corridas usaron conversaciones nuevas, sin reintentar automáticamente
un POST fallido. Se conservan doce chats nuevos de prueba entre las cuatro
corridas; no se borraron mensajes ni reportes fallidos.

## Rendimiento observado y validación

Corrida final: 2026-10-21 19:16:46–19:17:45 America/Bogota.
La consulta SQL de contexto completa tardó 2,06–29,25 ms (media 5,81 ms); incluye
la validación de release/ordinal y no mide el coste incremental del historial
por separado. Los doce turnos con generación tardaron 2,62–8,45 s por HTTP
(media 4,78 s). El listado por títulos tardó 433 ms; la aclaración sin antecedentes,
10,1 ms. Los prompts observados del generador tuvieron 2.865–3.370 tokens.
No se añadió una segunda generación para resolver referencias. Son mediciones
de una corrida local, sin baseline controlado ni acreditación de SLA/OE6.

Pruebas finales realmente ejecutadas:

- `backend/api`: `npm run typecheck` y `npm run build`, aprobados.
- `backend/api`: `npm test`, **490 aprobadas, cero fallidas/omitidas**.
- Runner: compilación TypeScript estricta con `tsc --noEmit`, aprobada.
- Runner E2E final: **48/48 controles aprobados**, PostgreSQL/Ollama/HTTP reales.
- `git diff --check`, revisión de archivos nuevos y comprobación de alcance: aprobadas.

No se ejecutaron pruebas RAG/ingesta, Docker de carga, Mobile, E2E móvil ni LAN:
no se modificaron esos componentes. Docker se consultó para verificar identidad
del entorno ya existente; no se crearon ni alteraron servicios o volúmenes.

## Archivos y límites pendientes

Implementación:
`backend/api/src/application/messages.ts`,
`backend/api/src/chat/document-rag.ts`,
`backend/api/src/chat/conversation-context.ts` (nuevo).
Pruebas:
`backend/api/test/conversation-context.test.ts` (nuevo),
`backend/api/test/document-rag.test.ts`, `backend/api/test/messages.test.ts`,
`backend/api/test/http-api.test.ts`, `backend/api/test/intent-http-integration.test.ts`
(estos dos últimos solo adaptan fixtures al resultado SQL interno).
Evaluación: `eval/integration/ccd-conversation-http.mts` (nuevo).
Documentación: `backend/api/README.md`, `eval/integration/README.md` y este checkpoint.
Evidencia runtime privada en la carpeta ignorada indicada anteriormente.

Limitaciones independientes:

- **Exceso de citas secundarias**: las respuestas generadas siguen citando todo
  el top-5. En la corrección a Marca Personal, IA quedó como primera cita aunque
  el texto respondió sobre Marca Personal y conservó su cita específica. Las
  47 citas no representan 47 afirmaciones independientes. Solo se filtraron las
  fuentes del listado por títulos porque la prueba mostró que bloqueaba su
  exhaustividad y el contexto de la conversación; no se rediseñaron las demás citas.
- Las advertencias se basan en todas las fuentes de contexto citadas, por lo que
  pueden mencionar límites de documentos secundarios y resultar repetitivas.
- El resolver es léxico y acotado, no una reformulación semántica universal.
  No garantiza reconocer toda elipsis, referencia ordinal o cambio implícito de
  tema. Si se pierde el antecedente fuera de la ventana, debe aclarar. La consulta
  de listado amplio también se reconoce por señales léxicas, no por un catálogo
  institucional vigente. La exhaustividad de siete syllabus se comprobó en la
  release actual; no se afirma para futuros corpus ampliados.
- El generador conserva su límite de 256 tokens y el rechazo de salida incompleta;
  puede seguir devolviendo errores de dependencia. No hay retry automático.
- Sin reglas académicas contradictorias liberadas, oferta actual, autenticación,
  identidad institucional ni pruebas con personas reales. El corpus CCD local,
  el dataset sintético, SQL, contratos REST/MCP y Mobile no se modificaron.

Detener aquí para revisión de Sala de Control; no iniciar otro incremento.
