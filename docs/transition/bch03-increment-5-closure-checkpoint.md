# CHECKPOINT BANUCHAT — BCH-03 / Incremento 5: cierre de validación integral

Fecha: 2026-10-22. Código evaluado: `b8d5a8a6e1ee175a7e8806e3105075bcc6023588`.

**Resultado automático: PASS, 252/252 controles. Resultado integral: permanece abierto por un fallo de pertinencia de U04/respaldo documental en T07.** El contacto de T12 y REG quedó comprobado en la batería completa. No se modificó la implementación para corregir el hallazgo; se propone un cambio mínimo para decisión de Sala de Control.

## Estado inicial y ejecución

`git rev-parse HEAD` coincidió exactamente con el commit publicado. `git status --short` estaba vacío: sin cambios locales inesperados. Se utilizó el evaluador publicado `eval/integration/ccd-guidance.mts` sin editarlo; SHA-256 `a9283bb3e6b28c091bdd21e254b834febded0250c7319503d655eb6d73f0c63a`.

PostgreSQL CCD estaba detenido. Tras verificar imagen, volumen y publicación loopback, se inició su contenedor existente, sin recreación, ingesta ni migración. También se inició el PostgreSQL sintético existente, necesario para las lecturas de regresión del evaluador, después de comprobar su publicación en `127.0.0.1:5432`. No se inició N8N.

Entorno real utilizado:

- PostgreSQL CCD: proyecto `banuchat-ccd-dev`, servicio `postgres-ccd`, base `banuchat_ccd_dev`, volumen `banuchat-ccd-dev_ccd_pgvector_data`, `127.0.0.1:55433`.
- API CCD de evaluación: `127.0.0.1:3001`; API sintética temporal para lecturas: `127.0.0.1:3302`.
- Ollama local: `127.0.0.1:11434`, runtime 0.35.0; generación `qwen3:4b-instruct`, revisión `0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`. Embeddings de consulta con `qwen3-embedding:0.6b`; configuración documental y vectores almacenados sin cambios.

Comandos ejecutados:

```powershell
# backend/api: recompila la API sintética leída por el evaluador desde el código publicado
npm run build

# backend/rag: batería completa, sin argumento «contact»
node --env-file=../../infra/.env.ccd --import tsx ../../eval/integration/ccd-guidance.mts http
```

El build pasó. La batería real se ejecutó una sola vez en este cierre, entre **11:05:16 y 11:07:20, America/Bogota**. Se crearon **14 conversaciones nuevas**, con **40 preguntas y 80 mensajes persistidos**. T10 se divide en dos conversaciones independientes; REG contiene seis turnos. No hubo reintentos ni reenvíos de mensajes fallidos. El evaluador conserva un control negativo separado: un POST en una release histórica devolvió 409 y no añadió mensajes; no se utilizó ese historial para continuar ninguno de los escenarios nuevos.

**Corrección del conteo anterior:** las preguntas enumeradas en el evaluador publicado suman 40, no 42 como indicaba el checkpoint previo. Los 252 controles automáticos sí coinciden. Se deja esta rectificación en el cierre, conservando el documento y los resultados anteriores. La auditoría complementaria inicialmente asumió 42; se corrigió su comprobación para contar las preguntas declaradas, sin modificar ni repetir el evaluador HTTP.

## Resultado automático y contacto

Reporte completo: [`http-1792685240358.json`](../../data/ccd/evidence/increment-5/http-1792685240358.json), SHA-256 `a285f0892b069dee2dc5c5a156387c454aeb67ebbe8a299e83c73a2ac6348586`.

- **252 controles correctos, cero fallos; código de salida 0.**
- 40/40 solicitudes de mensajes devolvieron HTTP 201; siete respuestas se marcaron como insuficiencia/aclaración. Esto no significa que todos los escenarios hayan quedado resueltos.
- 36 generaciones reales de Ollama, todas con `done_reason: stop`. Aclaraciones sin contexto, filtro de puntaje y catálogo por metadatos no necesitaron generación.
- 39 registros de cita nuevos; correspondencia real de hash, localizador, versión documental y release comprobada en PostgreSQL. GET de cada conversación coincidió con sus respuestas y citas persistidas.
- Las 24 versiones documentales pudieron descargarse y coincidieron con sus hashes.
- Lecturas sintéticas de perfiles, progreso e historial correctas. No hubo mensajes nuevos ni cambios de datos sintéticos. No se acredita una nueva batería de generación sintética.

En **T12/4** y **REG/6** se observó y persistió el mismo contenido:

> El contacto documentado del equipo de Competencias Digitales para el periodo 202660 es ccdigital@unab.edu.co. Su vigencia actual debe confirmarse.
>
> El contacto documentado corresponde a 202660; su vigencia actual no está ratificada.

Ambos guardaron **solo `unit:M12`**, versión documental `e87efaea-b10a-4bc4-92d3-60e8c10acf19`, release `3d6cedac-0e86-40c8-909b-d3ff6e8ab741`. La salida cruda incluyó `FUENTES: [1]`; el protocolo privado no apareció en la respuesta REST. Los mensajes son `3027f50b-7b81-4ce0-8737-4a379d6ded37` y `8c71dcc0-d557-4ae3-92b7-2c9de64c6457`.

## Matriz de revisión semántica T01–T12

Clasificación de la conversación completa, no del estado HTTP:

- **A — Orientación respaldada y comprobada.**
- **B — Orientación parcial correcta, con regla pendiente.**
- **C — Comportamiento incorrecto o no demostrado.**

| Caso | Resultado | Evidencia observada y pendiente |
| --- | --- | --- |
| T01 — solicitar prueba, ingreso virtual, dónde/cuándo | **B** | No inventa solicitud ni cronograma. Explica que TEST_ORIENTATION solo describe propósito/estructura; otras preguntas terminan en insuficiencia. Procedimiento, requisitos, plataforma y fechas R01–R04 no admitidos, sin resolver. |
| T02 — prueba nueva no validada, pilar 202660, repetir gratis | **B** | U03 explica cursar la asignatura del pilar y gestionar matrícula en 202660, con límite temporal determinista. No concede repetición; falta comprobar su procedimiento/costo. La consecuencia histórica sí queda comprobada. |
| T03 — Informática pendiente, ingreso 202410, primera gratuita ahora | **B** | U04 exige comprobar reconocimientos; distingue las pruebas antiguas pendientes de autorización para una nueva. No confirma primera presentación gratuita ni elegibilidad. Procedimiento de transición/beneficio sigue prioritario y pendiente. |
| T04 — cohorte 202510 y oportunidad de antiguos | **B** | No convierte cohorte o relato en derecho; mantiene necesidad de comprobación con programa/CCD. Excepción, periodos y población R05 no admitidos. |
| T05 — Word aprobado, no PowerPoint, pilar 2/sin pago | **B** | U04 conserva la orientación sobre comprobación del plan, códigos y registro; no concede pilar, AND/OR ni exención económica. No calcula equivalencias personales. |
| T06 — Excel anterior, ¿IA Generativa aprobada?, faltantes | **B** | No reconoce IA por Excel ni determina faltantes desde el relato. Cita U04, no el syllabus de IA como supuesto respaldo de una equivalencia. Reconocimientos individuales pendientes. |
| T07 — inasistencia, admisión después de primera fecha, intento gratis | **C** | Se selecciona U04 y se devuelve el pasaje de transición de Informática **sin ese antecedente**. El respaldo evita una concesión, pero es ajeno al caso. No se acredita orientación pertinente sobre ausencia/admisión tardía; R08/R09 siguen pendientes. Hallazgo detallado abajo. |
| T08 — prueba reprobada → corrección a curso → nuevas pruebas | **B** | Tras la corrección no impone nuevamente el curso ni concede exención de pruebas. La frase cruda «no se requiere presentar nuevas pruebas» se sustituye por el límite de U03: recuperación de curso y otro periodo requieren confirmación. Procedimiento de recuperación no admitido. |
| T09 — UNAB Tec y comparación con profesional presencial | **B** | U04 señala diferencias de programa/modalidad/cohorte y necesidad de adaptación particular; no aplica el plan profesional a todos. Anexo/regla individual pendiente. |
| T10 — referencia ambigua y conversación distinta | **A** | T10a/T10b piden contexto, sin generación ni citas. No heredan el antecedente de otra conversación. Es comprobación de aclaración/aislamiento conversacional, no de un derecho institucional. |
| T11 — dos casos relatados, derecho universal, reprobación posterior | **B** | U04 explica que no localizar una norma no demuestra inexistencia de procedimientos particulares; pide confirmar condiciones y beneficio económico, sin invalidar relatos ni universalizar gratuidad. El seguimiento cambia a U03 como orientación histórica 202660, sin autorizar repetición ni aplicar ese periodo a los casos relatados. Primera presentación y repetición no se tratan como un mismo beneficio. |
| T12 — nota virtual, inmediatez, 70 puntos, contacto | **B** | Resultados/inmediatez/umbral terminan en insuficiencia, sin citas ajenas. No decide aprobación con 70. Contacto M12 y vigencia comprobados. Las reglas de publicación de notas y puntaje R04/R06 permanecen sin admitir. |

Distribución: **1 A, 10 B, 1 C**. No se consideran doce escenarios resueltos ni se convierte una abstención en validación de una regla.

REG, revisada aparte: catálogo de siete cursos con sus siete citas; IA y temas con DOC-101; corrección a Marca Personal con DOC-103; duración histórica con TEST_ORIENTATION; contacto con M12. No arrastra citas de IA a Marca Personal ni advertencias de contacto a syllabus. No se usaron pasajes de U03/U04 en ninguno de estos seis turnos.

## Hallazgo de pertinencia: respaldo fuera de escenario en T07

Conversación nueva `a998b63a-50ec-478b-98f4-650caf91b51c`. Evidencia extraída sin editar respuestas: [`closure-T07-evidence.json`](../../data/ccd/evidence/increment-5/closure-T07-evidence.json).

1. **T07/1**, «No asistí a la prueba»: se seleccionan U04/M12. La salida cruda mezcla ausencia con reconocimiento de curso antiguo. El control sustituye esa formulación por un pasaje U04 que empieza «La documentación explicativa de la transición de Informática a Competencias Digitales contempla reconocer cursos ya aprobados…». Se persiste U04 y su advertencia histórica, pese a que el operador no mencionó Informática, cursos aprobados ni transición.
2. **T07/2**, «Me admitieron después de la primera fecha»: el generador devuelve exactamente `EVIDENCIA_INSUFICIENTE`. El respaldo devuelve de nuevo el mismo pasaje de transición y la cita U04. Este turno demuestra directamente el uso de un pasaje documental fuera del escenario pertinente. Mensaje persistido `f277cdac-9efd-4b68-a0ed-beef96de2383`.
3. **T07/3** no concede un intento gratis y limita lo afirmado a lo no documentado, pero mantiene U04 y su advertencia de transición. No subsana la falta de pertinencia de los turnos anteriores.

La cita existe y sus identificadores/hashes son correctos; **la integridad referencial no demuestra pertinencia**. Tampoco la advertencia sobre transición resulta pertinente para ese antecedente. Los controles publicados no detectan este defecto: permiten T07 con U04 y solo comprueban, entre otras cosas, ausencia de concesiones y validez formal de citas. Por eso pueden dar 252/252 mientras falla el requisito de pertinencia.

Lectura acotada del código: `backend/api/src/chat/document-evidence.ts:25` retorna U04 si encuentra una regla no admitida, sin exigir antecedente de transición. «No asistí» activa esa vía. `backend/api/src/chat/document-rag.ts:219` permite el respaldo cuando U04 ya fue seleccionado; no vuelve a comprobar que el escenario corresponda a esa unidad. La salida cruda, el texto persistido y estas condiciones permiten explicar el caso observado sin atribuirlo solo a aleatoriedad del modelo.

En los demás usos revisados el respaldo corresponde a su tema: U03 para consecuencia histórica de prueba; el límite de recuperación de curso tras T08; U04 para Informática, Word/Excel, UNAB Tec o los casos de solicitud relatados. Puede ser repetitivo y no resuelve las condiciones que faltan, pero no concede derechos individuales. **No se puede confirmar que el respaldo se use exclusivamente en escenarios pertinentes: T07 es un contraejemplo real.**

Propuesta mínima, **no implementada**:

- Evitar que la mera detección de una regla no admitida seleccione U04; exigir un antecedente pertinente de transición/reconocimiento antes de utilizar esa evidencia y su respaldo.
- Para ausencia/admisión posterior sin ese antecedente, conservar la falta de evidencia de su procedimiento; no sustituirla por transición ni por la consecuencia de una prueba reprobada. No añadir reglas R08/R09 ni garantías económicas.
- Agregar una comprobación semántica de T07 que rechace pasaje, cita y advertencia de transición sin antecedente; conservar las pruebas positivas de U04 con antecedentes reales y repetir la batería completa después de una corrección autorizada.

No se hizo ese cambio ni se repitieron solicitudes para buscar una salida más favorable.

## Integridad y conservación

La auditoría complementaria tomó una captura **antes** de la batería de todos los historiales existentes y hashes de filas de persistencia fija. Comparó después, sin escribir en esas tablas:

- **119 conversaciones anteriores**, sus filas, mensajes y citas idénticos, incluidas las pruebas fallidas previas.
- Tablas `datasets`, `dataset_releases`, `documents`, `document_versions`, `document_chunks`, `embedding_configs` y `ccd_demo_contexts` sin cambios de filas/hash. Incluye la release actual y todos sus embeddings, no solo las releases antiguas.
- **36 archivos** de los tres snapshots CCD y schemas sin cambios; **13 resultados JSON anteriores** conservados byte a byte.
- Exactamente 14 conversaciones nuevas, que coinciden con los IDs del reporte HTTP; no conversaciones adicionales ajenas a la batería.

Estado total: **119 → 133 conversaciones; 800 → 880 mensajes; 516 → 555 citas**. Solo cambió la persistencia conversacional autorizada para esta evaluación.

| Release | Documentos/versiones | Fragmentos | Embeddings | Estado |
| --- | ---: | ---: | ---: | --- |
| `5834fc47-57c5-498b-98fc-4190330155e4` | 2 | 2 | 2 | Histórica, sin cambios |
| `fb8538af-3280-4a1b-889c-a27564381996` | 10 | 10 | 10 | Histórica, sin cambios |
| `3d6cedac-0e86-40c8-909b-d3ff6e8ab741` | 12 | 12 | 12 | ready/current, sin cambios |

Totales: 12 identidades documentales, 24 versiones, 24 fragmentos y 24 embeddings. No se publicó otra release, reingirió contenido ni recalculó vectores documentales.

## Evidencia y alcance final

Evidencia privada, ignorada por Git, en `data/ccd/evidence/increment-5/`:

- `http-1792685240358.json`: batería completa publicada, trazas crudas, respuestas, citas y 252 controles.
- `closure-before.json`: captura de integridad anterior a la batería.
- `closure-integrity-1792685280361.json`: comparación posterior; SHA del reporte y del evaluador, conteos y conservación.
- `closure-T07-evidence.json`: los tres turnos de T07 con generación, respuesta y citas.
- `closure-provenance.json`: commit, estado limpio y huellas de código.
- `closure-audit.mts`: helper nuevo exclusivamente de lectura SQL/archivos y escritura de evidencia local; no altera el evaluador publicado ni la implementación.

Único archivo nuevo revisable en Git: **este checkpoint**. Se conservó el checkpoint anterior. Build API y `git diff --check` correctos; revisión final de estado confirma que no hay modificaciones de implementación, corpus, embeddings, datos sintéticos, Mobile, autenticación, contratos REST/MCP ni migraciones. No se repitieron las suites unitarias previamente acreditadas ni pruebas Android/Expo Web: no hubo cambios de código. Las pruebas de este cierre son HTTP real y comprobaciones directas de persistencia, no validación de plataforma móvil ni respuestas simuladas.

Los servidores temporales de API se cerraron al terminar. PostgreSQL CCD y sintético quedan iniciados en loopback; Ollama continúa local. No hubo borrados, recreación de volúmenes, comandos destructivos de Docker, commit ni push.

Las condiciones institucionales no admitidas —procedimiento, cohortes/programas/modalidades, primera presentación, repetición, eventual beneficio económico, homologaciones, AND/OR, tarifas y vigencia actual— permanecen pendientes. La consulta sobre los dos casos de transición sigue siendo prioritaria y no se envió a terceros.

**CHECKPOINT BANUCHAT: batería automática completa aprobada; validación integral no cerrada por T07. Se documenta y propone la corrección mínima, sin implementarla. Detenerse y devolver a Sala de Control.**
