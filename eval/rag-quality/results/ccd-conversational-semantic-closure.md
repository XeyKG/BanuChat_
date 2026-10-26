# BanuChat — cierre semántico y conversacional

Fecha: 2026-10-26. HEAD inicial y final: `c6fe6739255256334d3a588388951ad5310bc44d`.

La reevaluación técnica de las **50 respuestas anteriores** encontró **45 completas, cuatro parciales y una que contestó al aspecto equivocado**. Las 50 tenían estructura válida. Por tanto, el anterior resultado presentado como 50/50 no acredita corrección semántica y queda rectificado por este informe. Después de las correcciones y una nueva ejecución, las 50 respuestas funcionales satisfacen los criterios revisados. Esto sigue siendo revisión técnica del agente, no evaluación humana independiente ni exactitud demostrada fuera del banco.

## Error de reconocimiento y correcciones

F-12 recuperaba evidencia de insignia, pero seleccionaba solamente evidencia de finalización. La respuesta anterior explicaba cómo completar los pilares sin contestar qué reconocimiento se recibe. La prueba añadida falla con el módulo anterior: esperaba el soporte de insignia y obtuvo el de finalización. La ejecución real anterior confirma esa divergencia entre recuperación y respuesta. Con el módulo final, la prueba pasa y la nueva respuesta usa el soporte de insignia, la condición de completar los tres pilares y la limitación sobre la fecha de entrega.

Se corrigió la precedencia de la intención explícita de reconocimiento frente a finalización genérica. Incluye paráfrasis y la referencia contextual a certificado, sin prometer un certificado distinto de la insignia documentada. No hay excepciones por ID de evaluación ni por el texto literal de F-12.

La selección de presentación también cambia de forma general:

- Una consulta de propósito usa solamente ese aspecto. No despliega automáticamente el 70 %, cursos ni repetición.
- Los escenarios declarados por el estudiante permiten responder condicionalmente a un pilar pendiente, tres aprobados y dos pendientes; cuando identifica el pilar validado, se conserva ese referente. No se consulta ni se certifica su expediente.
- La matrícula simultánea comienza con una respuesta afirmativa y conserva la condición de apertura de grupos. No añade orientación ajena a la pregunta.
- El costo del curso se presenta directamente en el periodo de trabajo. El periodo queda en metadatos; las consultas futuras conservan su limitación. Una segunda prueba ambigua requiere aclaración y una tarifa identificada usa su propio concepto. La comparación entre primera oportunidad y extraordinaria comienza con «No» y no añade la extemporánea.
- La falta de programación docente se expresa de forma natural. Los seguimientos conservan el objeto pertinente y las comparaciones de temarios buscan contenidos, en lugar de asumir que cualquier evidencia del mismo curso responde al aspecto pedido.
- Las filas históricas conservan sus conjunciones y su ámbito de cursos. No se convierten en equivalencias universales de pruebas ni en reconocimiento individual.

La revisión ampliada detectó además cuatro desvíos intermedios: una consulta sobre repetición gratuita recibía un menú de tarifas; una pregunta general de pago en transición heredaba el costo de cursos; «quién lo dicta» recibía una limitación de grupos; una petición de fila literal recibía antecedentes de pruebas. Se corrigieron en el selector y se repitieron todos los conjuntos con el código final. Los fallos intermedios permanecen registrados; no se atribuyen a la corrida final ni se ocultaron cambiando criterios.

## Evaluación de aspectos y equivalencias

La auditoría del evaluador anterior identificó una promoción inválida a PASS basada en no abstenerse cuando el caso ya figuraba como aprobado. El nuevo procedimiento no hereda ese estado. Conserva las preguntas, rúbricas, comportamientos e IDs sugeridos de los 50 casos congelados y añade aspectos requeridos, aspectos prohibidos y grupos de soporte aceptables.

Se distinguen evidencia recuperada, seleccionada, sustentadora y citada. Se comprueban las fuentes efectivamente utilizadas y sus hashes, el hecho completo, las condiciones y su relación con la pregunta. Recuperar el claim correcto o tener una cita válida no basta. Las guardas de aspectos tampoco convierten la aparición de una palabra en corrección semántica.

El registro de proposiciones es acotado y revisado contra las fuentes. Las unidades modificadas requieren nueva aprobación; una síntesis libre necesita revisión explícita ligada al hash de pregunta, historial completo, respuesta y fuentes. Una paráfrasis no registrada queda pendiente, no aprobada por su ID. Se revisaron expresamente las síntesis libres de esta corrida. Las once pruebas del evaluador incluyen frases incorrectas que contienen «insignia», citas sin uso real, estados PASS heredados, unidades alteradas y equivalencias legítimas.

Los cinco casos anteriores incompletos o incorrectos fueron:

| Caso | Resultado de la reevaluación anterior | Aspecto faltante o equivocado |
| --- | --- | --- |
| F-12 | Aspecto equivocado | Reconocimiento mediante insignia y sus condiciones |
| F-13 | Parcial | Tres instrumentos actuales frente al esquema anterior |
| X-14 | Parcial | Contenidos de IA; se usaron competencias relacionadas |
| X-16 | Parcial | Temario de Interacción; se usaron competencias relacionadas |
| X-19 | Parcial | Fila literal solicitada; se ofreció una paráfrasis |

Las diferencias entre IDs sugeridos y soporte real se revisan por caso, antes y después, en `claim-equivalence-review.jsonl`. Se aceptan las que contienen el hecho solicitado: estructura equivalente; catálogo que ya incluye la regla de un curso; paquete de horas que ya contiene créditos y límites; fila histórica y ausencia de reconocimiento automático en el propio soporte de transición; competencias o contenidos pertinentes para una pregunta de aprendizajes. No se fuerza una cita adicional de insignia cuando solo se pregunta por cursos pendientes. Tampoco se acepta sustituir contenidos por competencias en preguntas específicamente de temario. Los cinco fallos anteriores no reciben crédito por equivalencia.

## Resultados reales

| Conjunto | Estructura válida | Criterios semánticos satisfechos |
| --- | ---: | ---: |
| Funcionales anteriores, reevaluados | 50/50 | 45/50 |
| Funcionales, nueva ejecución | 50/50 | 50/50 |
| Primarias | 72/72 | 72/72 |
| Robustez, subconjunto de primarias | 35/35 | 35/35 |
| Negativas | 24/24 | 24/24 |
| P0 | 10/10 | 10/10 |
| Presentación conversacional | 28/28 | 28/28 |
| Nueve secuencias anteriores | 22/22 turnos | 9/9 secuencias |
| Tres secuencias nuevas anteriores | 11/11 turnos | 3/3 secuencias |
| Secuencia progresiva | 3/3 turnos | 1/1 secuencias |

Son **220 registros finales únicos**. Las 35 preguntas de robustez no se suman de nuevo. La reevaluación de 50 respuestas anteriores es un análisis separado, no 50 ejecuciones nuevas del código final. Las aclaraciones y abstenciones apropiadas cuentan según el comportamiento esperado; no se equipara toda abstención a fallo ni toda respuesta a acierto.

Las guardas conversacionales detectaron incidencias en ocho respuestas funcionales anteriores y en ninguna de las 220 finales. Esto expresa el cumplimiento de guardas concretas de pertinencia, respuesta directa y condiciones; no es una calificación humana de naturalidad. La muestra privada contiene **19 respuestas** con pregunta, contexto y respuesta visible; fuentes, claims, procedencia y juicio técnico aparecen en una auditoría separada. Revisión humana independiente: **pendiente**. Los casos fueron utilizados durante el desarrollo; no constituyen una reserva ciega.

## Pruebas e integridad

API: typecheck y **662/662** pruebas. RAG: typecheck y **232/232** pruebas tanto en ejecución serial como en la repetición final de `npm test` desde su directorio original. La primera ejecución RAG tuvo **227/232**, con cinco rechazos de lectura protegida. Se conserva ese resultado fallido; la causa exacta no está demostrada. No se cambió `SafeReader` ni se relajaron las protecciones. Evaluador semántico privado: **11/11** pruebas. La prueba específica de reconocimiento quedó documentada en rojo antes y verde después. `git diff --check` y el cotejo del alcance forman parte del cierre.

La candidata privada conserva **87 claims y 87 chunks**, sin ampliar fuentes ni alterar enunciados canónicos o procedencia. Los cambios son de selección y metadatos de presentación. Se generaron **cero embeddings documentales** y se reutilizaron 87 vectores con contenido y configuración idénticos. La nueva candidata conserva las anteriores y no publica `current`.

La validación usó PostgreSQL/pgvector y Ollama reales del piloto aislado. El lector rechaza escritura y carece de permisos de publicación; su almacenamiento permanece separado del habitual. Las instantáneas habituales antes/después coinciden. Se cotejaron los 124 originales externos y los artefactos privados anteriores mediante hashes. No es una aceptación HTTP autenticada ni una prueba de Mobile, N8N o MCP.

## ESTADO DE ENTREGA BANUCHAT

- HEAD inicial/final: `c6fe6739255256334d3a588388951ad5310bc44d`. Sin commit ni push.
- Cinco archivos versionables: módulo experimental API y sus pruebas; preparación experimental RAG y sus pruebas; este informe.
- Entregables completos ignorados en `data/ccd/local/p0-conversational-semantic-closure/`: índices, criterios, revisiones semánticas y de equivalencia, chat, retrieval, fallos, muestra humana, pruebas, integridad y manifiesto de ejecución.
- Corpus y release habituales, dataset sintético, contratos REST/MCP, Mobile y N8N preservados. Sin operaciones destructivas ni cambios de configuración de PostgreSQL, pgvector u Ollama. Contenedores conservados.
- Revisión técnica del agente completada para el banco ejecutado. Revisión humana independiente pendiente; no implica aval institucional ni autorización de publicación.
- Trabajo detenido antes de integración autenticada y publicación. La muestra humana queda disponible para revisión antes de decidir una integración posterior.
