# CHECKPOINT BANUCHAT — BCH-03 / Incremento 5.3

Fecha: 2026-10-22. Base verificada: `8e803350be661e0a4c32e77b4a469c8b39863ec5`, sin cambios locales al inicio. Sin commit ni push.

La corrección de ambigüedad está comprobada. La batería HTTP integral pasa **329/329 controles técnicos**, con **43/43 turnos respondidos y persistidos**, sin 503. Esto no certifica estabilidad futura de Ollama ni resuelve las reglas institucionales pendientes. T11 conserva una limitación de orientación descrita en la matriz semántica.

## Causa y corrección delimitada

Antes, el catálogo contaba como antecedente suficiente para «¿Y qué temas tiene?». Sin un curso individual, la selección genérica podía enviar diez documentos al generador. El diagnóstico 5.2 había observado un rechazo por contexto en una reproducción de ese estado; no demuestra la causa del REG/2 histórico.

Ahora el resolutor diferencia catálogo de curso identificado, reutilizando el reconocimiento existente del catálogo y la forma singular de seguimiento. Con solo catálogo responde **«¿De cuál curso quieres conocer los temas?»**, antes de SQL documental, embedding o generación, sin citas. También contempla una segunda pregunta ambigua tras esa aclaración. Un nombre incluido solo en la respuesta del asistente no identifica el curso del estudiante.

La selección genérica descarta el conjunto documental para esa referencia singular si no encontró un tema pertinente. Esta defensa adicional evita generar con diez fragmentos por defecto; no afecta las preguntas generales autónomas, que conservan su selección previa. No se añadió una interpretación semántica universal ni un catálogo nuevo de sinónimos. La cobertura queda limitada a las formas comprobadas, no a cualquier paráfrasis posible.

Se mantienen los controles de U03/U04, citas y advertencias. No cambió el prompt para resolver esta ambigüedad.

## Archivos modificados

- `backend/api/src/chat/conversation-context.ts`: aclaración cuando solo existe catálogo; detectores compartidos de las formas existentes.
- `backend/api/src/chat/document-evidence.ts`: defensa en la selección genérica para el seguimiento singular sin tema reconocido.
- `backend/api/src/chat/document-rag.ts`: respuesta de aclaración y reutilización del detector del catálogo.
- `backend/api/test/conversation-context.test.ts`, `document-evidence.test.ts`, `document-rag.test.ts`: reproducción, llamadas evitadas y continuidad válida.
- `eval/integration/ccd-guidance.mts`: dependencias, persistencia observada, métricas separadas, controles no evaluables explícitos y dos casos de ambigüedad.
- `eval/integration/conversation-evaluation.mts` y `.test.mts`: contabilidad pura del evaluador y cinco pruebas sin servicios.
- `eval/integration/ccd-resource-sample.ps1`: muestreo de recursos de solo lectura, acotado y detenido mediante un archivo nuevo.
- Este checkpoint.

Las evidencias nuevas están en `data/ccd/evidence/increment-5/`, excluidas de Git. No se sobrescribieron los resultados históricos ni las respuestas T07 fallidas.

## Evaluación fiable

Cada escenario registra `planned`, `attempted`, `completed`, `failed`, `not_evaluable` y `script_complete`. `completed` exige HTTP 201 y coincidencia exacta de ambos mensajes devueltos con el GET posterior. HTTP 201 solo no basta.

Tras cada POST se consulta el historial. No se reenvía un POST fallido o incierto. Un seguimiento requiere que sus antecedentes explícitos estén completados; si faltan, queda no evaluable y no se envía. Un resultado incierto o un historial inaccesible impide continuar esa conversación. Los cambios independientes de tema de REG y el contacto T12 tienen dependencias explícitas separadas. La evidencia conserva el fallo original.

La integridad del historial se compara con las respuestas efectivamente completadas. Otro control exige completar el guion requerido; un escenario incompleto no puede obtener `integral_pass`. El campo es técnico y no representa aprobación académica A/B/C.

Los controles aplicables a respuestas ausentes se registran como `not_evaluable` con `passed: null`; no desaparecen del denominador. `check_metrics.planned = passed + failed + not_evaluable`. En un fallo operacional, el control de HTTP falla, y los controles sin respuesta son no evaluables. Los cinco tests del evaluador comprueban estas distinciones y que un turno independiente siga siendo evaluable. Esta rama se prueba de forma simulada; en la batería real actual no ocurrió un fallo que la ejercitara.

Los denominadores 119 y 329 corresponden a alcances distintos. La batería anterior tenía 40 preguntas en 14 conversaciones; esta añade AMB y AMB_FRESH, tres preguntas en dos conversaciones, y controles explícitos de persistencia y completitud. No debe compararse 329 directamente con 249 como si fueran controles idénticos.

## Pruebas ejecutadas y evidencia

| Prueba | Resultado | Evidencia privada |
| --- | --- | --- |
| Reproducción antes del cambio, cuatro tests seleccionados | 3 fallos / 1 correcto | `53-before.log` |
| Suite focal de contexto, evidencia y RAG, incluido T07 | 56/56 | `53-focused-final.log` |
| Suite completa API | 519/519, sin omisiones | `53-api-unit.log` |
| Contabilidad del evaluador, sin servicios | 5/5 | `53-evaluation-unit.log` |
| API `npm run typecheck` y `npm run build` | Correctos | ejecución local |
| TypeScript del evaluador, `strict` y `noUncheckedIndexedAccess` | Correcto | `53-eval-typecheck.log` |
| HTTP focal AMB + AMB_FRESH | 119/119 controles; 3/3 turnos | `http-1792693115264.json` |
| HTTP integral T01–T12 + REG + AMB + AMB_FRESH | 329/329 controles; 43/43 turnos | `http-1792693227245.json` |

Una comprobación adicional del evaluador con `exactOptionalPropertyTypes` detectó dos asignaciones opcionales preexistentes en `ccd-generation-trace.mts`, líneas 45 y 50 (`string | undefined` asignado a un campo opcional `string`). No se corrigió ese observador de 5.2 ni se presenta esa comprobación como aprobada. El typecheck de la API conserva todas sus opciones estrictas. El evaluador está fuera del alcance de su tsconfig.

No se repitieron pruebas Android, Expo Web, ingesta o Mobile. No se atribuyen a estas plataformas los ensayos HTTP.

## Ejecución operacional observada

Se ejecutaron una prueba focal y una integral, con conversaciones nuevas; no hubo ensayos descartados ni repetición hasta obtener éxito. El ensayo focal preservó 153 conversaciones previas y añadió dos. El integral preservó las 155 existentes al comenzar y añadió 16. Se añadieron en total 18 conversaciones y 46 pares de mensajes; no se borró ninguna.

Integral: 2026-10-22 **18:18:48–18:20:27 UTC** (13:18:48–13:20:27, Bogotá). Los 43 turnos fueron planificados, intentados y completados; cero fallidos y cero no evaluables. Los 16 guiones técnicos terminaron completos. Las 31 llamadas a `/api/chat` devolvieron HTTP 200: duración observada 669–5695 ms y `prompt_eval_count` 1881–2916. No hubo rechazo 400, fallo de formato ni timeout. Los prompts generados seleccionaron uno o dos fragmentos; los catálogos se resolvieron sin generación.

Servicios reales: PostgreSQL `banuchat_ccd_dev` en `127.0.0.1:55433`, proyecto Docker `banuchat-ccd-dev`; API temporal en `127.0.0.1:3001`; Ollama local, versión 0.35.0, `qwen3:4b-instruct`. Embedding de consulta `qwen3-embedding:0.6b`, 1024 dimensiones. Se conservaron timeout 30 s, temperatura 0, `num_predict: 256`, modelo y configuración de contexto. La regresión sintética usó únicamente lecturas mediante una API temporal en loopback 3302. Ambas APIs temporales quedaron cerradas.

### Ejemplos reales

- **AMB/2:** «¿De cuál curso quieres conocer los temas?»; citas vacías, embedding 0, generación 0; persistida. La prueba unitaria acredita además cero llamadas SQL documentales. La API sí consulta el historial para atender la conversación.
- **AMB_FRESH:** pide contexto sin citas, embedding 0 y generación 0.
- **REG/2–3:** IA Generativa y luego sus temas; únicamente `unit:M02:DOC-101`. La respuesta enumera fundamentos, modelos de lenguaje y difusión, evaluación crítica e ingeniería de prompts.
- **REG/4:** corrección a Marca Personal; únicamente `unit:M02:DOC-103`, con identidad, reputación, productividad, comunicación y networking.
- **REG/5:** duración aproximada de dos horas en 202660, `unit:TEST_ORIENTATION` y límite de vigencia.
- **T12/4 y REG/6:** `ccdigital@unab.edu.co`, únicamente `unit:M12`, y «El contacto documentado corresponde a 202660; su vigencia actual no está ratificada».
- **T07/1–3:** insuficiencia sin citas, pasajes de Informática ni advertencias históricas ajenas. No autoriza otro intento gratis ni equipara ausencia a reprobación.
- **T08:** distingue el curso reprobado de la consecuencia histórica de una prueba; el tercer turno exige confirmación CCD/programa, sin eximir de pruebas nuevas.
- **T11/1–2:** insuficiencia genérica sin citas, incluida la pregunta sobre otorgar ese derecho a todos. No atribuye testimonios a U04. **T11/3** explica la consecuencia histórica de U03 con límite temporal, sin prometer repetición gratis.

## Matriz semántica, separada del PASS técnico

A = orientación respaldada y comprobada dentro de su alcance; B = orientación parcial segura con regla pendiente; C = comportamiento incorrecto o no demostrado. La clasificación evalúa los textos completos, no solo HTTP, citas presentes o ausencia de afirmaciones prohibidas.

| Escenario | Turnos completados | Clase | Resultado y pendiente |
| --- | --- | --- | --- |
| T01 | 3/3 | B | No inventa solicitud, fecha o lugar; describe límites de TEST_ORIENTATION. Falta procedimiento admitido y orientación más útil en las abstenciones. |
| T02 | 3/3 | B | Consecuencia de pilar no validado en 202660 comprobada con U03; repetición gratuita sigue sin demostrar. |
| T03 | 3/3 | B | U04 exige verificar plan, códigos y registro; no autoriza primera prueba gratis actual. Procedimiento concreto pendiente. |
| T04 | 2/2 | B | No concede derecho de antiguos a cohorte 202510; límites U04. Elegibilidad y beneficio pendientes. |
| T05 | 3/3 | B | Word/PowerPoint no producen reconocimiento ni gratuidad automáticos. AND/OR y tarifas siguen pendientes. |
| T06 | 3/3 | B | Excel anterior no demuestra aprobación de IA; requiere comprobación institucional, sin calcular un expediente personal. |
| T07 | 3/3 | B | Abstención pertinente, sin U03/U04 ni autorización gratuita. Procedimiento por inasistencia/admisión tardía no admitido. |
| T08 | 3/3 | B | Acepta corrección de prueba a curso y no traslada la consecuencia ni concede exención. Recuperación de curso pendiente. |
| T09 | 2/2 | B | Señala diferencias por programa/modalidad/cohorte; no equipara UNAB Tec y profesional presencial. Aplicación concreta pendiente. |
| T10a/b | 1/1 + 1/1 | A | Aclaración aislada en conversaciones distintas; no toma antecedentes ajenos. No resuelve una regla académica. |
| T11 | 3/3 | C, no demostrado parcialmente | No generaliza gratuidad y U03 es pertinente al tercer turno. Los dos primeros son abstenciones genéricas: no explican los casos relatados ni distinguen expresamente hipótesis de procedimiento y derecho universal. No se declara escenario resuelto. |
| T12 | 4/4 | B | Contacto M12 y vigencia correctos; publicación de notas, inmediatez y umbral de 70 permanecen sin orientación documental suficiente. |
| REG | 6/6 | A | Catálogo, IA, temas, corrección, duración histórica y contacto con fuentes pertinentes y advertencias. No acredita oferta o vigencia actual. |
| AMB / AMB_FRESH | 2/2 + 1/1 | A | Solicitan aclaración antes de embedding/generación, sin atribución documental. |

No se modifica T11 para mejorar su orientación en este incremento: requiere revisión de Sala. El PASS automático no contradice su C semántica; los controles técnicos no acreditan calidad explicativa completa. Permanecen bloqueadas gratuidad universal, repetición gratuita, elegibilidad de continuos, homologaciones individuales, AND/OR no conciliados, matrícula automática y tarifas no acreditadas. No localizar una norma tampoco demuestra que el procedimiento relatado nunca existió.

## Condiciones del equipo y límites operacionales

El operador confirmó antes de las pruebas: **«El equipo está libre de videojuegos y cargas intensivas»**. No se cerraron sus aplicaciones. La nota de que jugaba durante algunas ejecuciones pasadas se conserva como **posible competencia por recursos, no causa demostrada** de sus timeouts.

Muestreo: `53-resources-1792693088832.jsonl`, 56 muestras entre 18:18:15 y 18:20:32 UTC, con CPU/RAM por CIM y GPU/VRAM por `nvidia-smi`. Incluye ambas ejecuciones; intervalo nominal 2 s más el coste de observación. RAM visible 16 473 976 KiB; libre observada 1 962 340–6 421 608 KiB. CPU 0–51 %, media 26,6 %. NVIDIA GeForce RTX 3050 6GB Laptop GPU: utilización 0–100 %, VRAM 314–5721 MiB de 6144 MiB. Son métricas del equipo completo, sin atribución por proceso; el uso alto de GPU durante inferencia no identifica otra carga. El muestreo no captura necesariamente picos breves.

Estos resultados muestran disponibilidad en este ensayo bajo las condiciones declaradas. No prueban qué causó los fallos históricos, ni que desapareció la intermitencia. Se distinguen los abortos de tiempo de respuesta de los rechazos de contexto; ninguno ocurrió ahora. No se ajustaron parámetros por la hipótesis del videojuego.

## Integridad y conservación

El integral comprobó exactamente historial y citas de todas las 155 conversaciones previas y los pares de mensajes de los nuevos guiones. Sus **41 citas nuevas** concuerdan con hash, localizador y release de los fragmentos reales; los artefactos de las versiones listas se descargaron y verificaron por SHA-256. El ensayo focal persistió siete citas del catálogo y ninguna de las aclaraciones.

Current permanece **`3d6cedac-0e86-40c8-909b-d3ff6e8ab741`**: doce documentos, doce fragmentos y doce embeddings. Históricas: `5834fc47-57c5-498b-98fc-4190330155e4` (2/2/2) y `fb8538af-3280-4a1b-889c-a27564381996` (10/10/10). Total 24 versiones/fragmentos/embeddings. Las capturas previas y posteriores coinciden en releases, manifiestos, configuración y hashes de vectores/fragmentos. Se mantuvo el 409 de continuación de release antigua sin alterar su historial.

No hubo publicación, ingesta, migración, cambio de corpus, SQL, embeddings almacenados, Mobile, autenticación, contratos REST/MCP, datos sintéticos, dependencias o servicios nuevos. La instrumentación y los campos de contabilidad son internos del evaluador, no del contrato REST. La regresión sintética de esta ejecución es de lectura; no se afirma una batería generativa sintética adicional.

`git diff --check` y revisión final de alcance forman parte del cierre. Sin borrados, reintentos automáticos de POST, operaciones destructivas de Docker, commit o push.

**CHECKPOINT BANUCHAT: ambigüedad corregida y validación técnica integral aprobada en esta ejecución. Reglas institucionales y límite semántico de T11 pendientes. Detenerse para revisión de Sala de Control.**
