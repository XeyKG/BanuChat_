# BanuChat — informe académico de cierre técnico de OE1

Fecha: 29 de octubre de 2026. Versión pública, sin preguntas, respuestas ni documentos CCD privados.

Estado: **OE1_TECHNICAL_EVALUATION_CLOSED_ACADEMIC_ACCEPTANCE_PENDING**.

## 1. Objetivo y alcance comprobado

Se comprobó el comportamiento de recuperación, selección de evidencia y respuesta del componente documental CCD utilizado por BanuChat. La evidencia procede exclusivamente del baseline de OE1-CIERRE-01. Este cierre analiza sus resultados; no añade consultas, ejecuciones RAGAS, benchmarks ni auditoría del corpus.

El evaluador anterior invocó la composición `createAuthenticatedDocumentRag → generateCcdKnowledgeAnswer`, con el manifiesto, filtros, funciones SQL autenticadas, embeddings y generador existentes. Por tanto, midió el componente documental específico del producto, no un RAG genérico. No evaluó de extremo a extremo autenticación, REST, Intent Router, Mobile u orquestación.

El cierre técnico significa que la ejecución, sus evidencias, resultados y limitaciones están documentados y diagnosticados. No significa que el desempeño sea satisfactorio en todas las dimensiones ni que el director o el CCD hayan aprobado OE1.

## 2. Corpus, muestra y preparación

El baseline utilizó CCD 1.4.0: 107 unidades publicadas con embedding, release `10af4ffd-effb-41fc-bbfe-4dc48cb3398f` y manifest `fde23cabe95c83f5bd632d129312ad68c90624e6ebd489e79e98c6a3d0d96852`. Estos datos corresponden a las comprobaciones de aquella ejecución; en este cierre no se consultó PostgreSQL ni se volvió a inspeccionar el corpus.

La muestra congelada contiene **43 casos**: 39 remapeos históricos y cuatro casos nuevos, con 91 referencias gold contadas por caso y 46 unidades gold distintas. Se preservaron los 45 IDs originales y dos exclusiones explícitas: 010 por procedencia/aclaración institucional pendiente y 044 porque la reformulación disponible perdía su objetivo relacional. No se crearon sustitutos para completar 50.

Antes de ejecutar se aplicaron, en una versión nueva, 11 ajustes de respuesta de referencia y 15 cambios de conjuntos relevantes, sin modificar preguntas. Las decisiones técnicas por delegación se distinguen de las aprobaciones humanas originales. Las correcciones revisadas solo por IA no recibieron una aprobación humana nueva. El benchmark original, los bancos, ledgers y fuentes anteriores permanecen intactos.

El criterio histórico mínimo de 50 no se alcanzó. La aceptación académica de una muestra de 43 y de sus exclusiones es una dependencia pendiente; ni la delegación técnica ni este informe la sustituyen. La muestra tampoco representa cobertura uniforme de las 107 unidades o de todas las consultas futuras.

## 3. Método y configuración

Benchmark, política de relevancia, protocolo y código se congelaron antes del smoke prefijado de dos casos y de una única pasada del baseline completo. Se utilizaron las preguntas exactas y conversación vacía. No se seleccionaron preguntas a partir de respuestas observadas ni se hizo tuning posterior para mejorar las cifras.

Una unidad relevante aporta respaldo material, incluso parcial o equivalente, con entidad, periodo y población compatibles. Un conjunto suficiente sustenta la respuesta completa; no equivale automáticamente a todas las unidades relevantes. En el caso 049 se etiquetaron siete unidades relevantes: Recall@5 tiene techo 5/7 aunque una combinación menor pueda ser suficiente.

El ranking medido son las primeras cinco filas de la primera llamada SQL scoped real, conservando su orden y separándolo de la selección posterior. El producto mantuvo su solicitud de hasta 20 candidatos. Precision@5 divide entre cinco incluso ante un ranking corto; Recall@5 divide entre el número de relevantes adjudicados. La ausencia de retrieval contribuye cero al agregado primario, sin retirar el caso.

Para las respuestas se conservaron los contextos efectivamente suministrados al generador o extraídos por la presentación determinista, las fuentes atribuidas, citas, texto final, abstenciones y latencias. Fuente atribuida no equivale a atención causal del modelo ni a prueba automática de entailment.

Configuración observada en el baseline: PostgreSQL Unified con lecturas READ ONLY; embeddings `qwen3-embedding:0.6b`, 1024 dimensiones y coseno; generador `qwen3:4b-instruct`, Ollama 0.35.0, temperatura 0, `think=false`, `num_predict=256`. Las revisiones, recetas y hashes efectivos se conservan en los artefactos privados. No se cambiaron modelo, prompts, chunking, filtros o `top_k` para ejecutar.

## 4. Resultados y denominadores

| Resultado operacional | Casos |
| --- | ---: |
| Planificados e intentados | 43 |
| Respuestas no abstentivas | 39 |
| Abstenciones | 4 |
| Errores / timeouts | 0 / 0 |
| Casos con ranking observado | 42 |
| Extracciones sin generador | 22 |
| Síntesis | 17 |

Hubo 19 llamadas al generador: 17 síntesis y dos llamadas que terminaron en abstención. Las otras dos abstenciones no llamaron al generador. Se verificó la captura de las 39 respuestas y la trazabilidad de las cuatro abstenciones; no se inventaron contextos usados para respuestas inexistentes.

| Métrica de recuperación | Resultado sobre los 43 casos |
| --- | ---: |
| Hit@5 | 0,860465 (37/43) |
| MRR@5 | 0,813953 |
| Precision@5 macro | 0,306977 |
| Recall@5 macro | 0,764673 |

Se recuperaron 66 referencias relevantes entre 91 etiquetas por caso; el recall micro fue 0,725275. En 28 casos se devolvieron menos de cinco posiciones. El techo teórico de Precision@5 macro impuesto por el tamaño del gold es 0,413953. Por eso no corresponde interpretar 0,306977 frente al target 0,80 de otra métrica, context precision de RAGAS.

La cobertura media de unidades gold seleccionadas fue 0,615172 y la de soporte atribuido 0,541528. La presencia parcial de soporte alcanzó 54 de 80 afirmaciones mapeadas; nueve de 89 no tenían mapeo. Este indicador no equivale a exactitud, suficiencia completa ni factualidad de las respuestas.

La latencia media observada fue 1.017,7 ms por caso, después del smoke y en una sola pasada local. No es una estimación de capacidad bajo carga ni de rendimiento de todo el producto.

## 5. RAGAS y comparación preliminar

RAGAS 0.4.3 puntuó una vez las 39 respuestas con contextos verificables. Cada métrica completó 39 casos, sin errores ni timeouts. Las cuatro abstenciones no tenían un sample válido para ese adaptador y no se puntuaron; permanecen en el denominador operacional de 43. Las medias del juez son condicionales a las 39 respuestas, no a toda la muestra.

| Indicador | Resultado | Referencia preliminar | Lectura numérica |
| --- | ---: | ---: | --- |
| MRR@5 | 0,813953 sobre 43 | ≥0,70 | Superada en este conjunto |
| Faithfulness | 0,952991 sobre 39 | ≥0,80 | Superada, exploratoria |
| Context precision | 0,709402 sobre 39 | ≥0,80 | No alcanzada |
| Context recall | 0,713675 sobre 39 | ≥0,75 | No alcanzada |
| Answer relevancy | 0,618210 sobre 39 | ≥0,80 | No alcanzada |

Son referencias del proyecto, no estándares universales ni umbrales ratificados institucionalmente. Context precision/recall del juez describen la evidencia suministrada para responder y las afirmaciones de referencia; no son Precision@5/Recall@5 del ranking bruto.

El juez comparte modelo con el generador. La calibración histórica de AnswerRelevancy obtuvo 7/12 coincidencias técnicas. La comprobación pequeña de CIERRE-01 coincidió en 12/12 comparaciones de cuatro métricas sobre tres fixtures, pero tenía solo tres casos, sin revisión humana independiente ni controles negativos para todas las métricas. No anula la limitación histórica. Los intervalos bootstrap conservados son descriptivos y los casos comparten fuentes: no demuestran independencia estadística ni generalización.

La faithfulness alta significa que una respuesta puede estar respaldada por el contexto que recibió, aunque ese contexto no responda la pregunta. Los ocho desvíos de tema tuvieron faithfulness=1; esto ilustra el alcance de la métrica, no demuestra por sí solo un fallo del juez. También se identificaron puntuaciones de context recall=1 ante brechas explícitas en comparaciones seleccionadas: son posibles sobreaceptaciones que requieren adjudicación independiente; sus scores originales no se modificaron.

## 6. Diagnóstico de comportamiento

Se analizaron prioritariamente las 26 trazas antes marcadas con abstención, desvío o parcialidad/especificidad. Los 17 casos anteriormente alineados no se reexaminaron por rutina. No se releyó el corpus ni se generaron respuestas contrafactuales.

Se distinguieron seis tipos, que pueden coexistir:

- **A — recuperación:** falta de soporte en el conjunto observado, diferenciando exclusión por scope de posición fuera de los primeros cinco.
- **B — selección/representación:** soporte recuperado que se descarta o cuyo detalle no llega al prompt.
- **C — salida:** contexto material suministrado, pero respuesta incompleta o abstención; no se conoce automáticamente el motivo interno.
- **D — intención/guardia:** entidad, periodo, filtro o prioridad incompatibles con lo preguntado.
- **E — benchmark:** ambigüedad, exhaustividad o suficiencia que requieren interpretación, sin alterar el gold.
- **F — juez:** límite del constructo o posible sobreaceptación, sin sustituir una revisión humana.

| Grupo verificable | Casos técnicos | Observación y alcance |
| --- | --- | --- |
| Sujeto, entidad, periodo o aspecto restringidos a otro objeto | 034, 039, 012, 015, N-002, 005 | Seis salidas sin generador; el scope canónico o las claves SQL dejan fuera soporte solicitado. En 015 se conserva parte del límite negativo, pero se pierde el alcance histórico: no se afirma falsedad de la regla actual. |
| Soporte material recuperado, pero selección insuficiente | 002, 013, 046, 047, 048, 049, 050 | Siete salidas deterministas; unas prioridades sustituyen el objetivo y las comparaciones eligen fichas generales sin el atributo central. No se necesita suponer un fallo del LLM para explicar esas salidas. |
| Guardias que impiden explicar evidencia documental | 025, 017 | Una abstención ocurre antes de retrieval; otra después de recuperar evidencia histórica, al exigir cobertura por nombres tratados como cursos. |
| Detalle perdido en la representación del contexto | N-001 | El chunk contiene una sección detallada que no aparece en el prompt; el generador recibe un resumen genérico. |
| Abstención con contexto ya suministrado | 040, 043 | Se observa el marcador de insuficiencia. No se aisló su motivo; en 043 también es ambigua la relación que exige el enunciado. |

Los primeros cuatro grupos reúnen **16 hallazgos materiales** en las 26 trazas priorizadas. Las causas deterministas se apoyan en scope, claves, ranking, selección, salida y código congelado coincidentes; no se ensayó una intervención ni se demostró su efecto futuro. Una falta de gold causada por el filtro no permite concluir que el embedding habría rankeado mal ese soporte.

Las siete diferencias de granularidad de 023, 024, 027, 028, 029, 033 y 037 **no establecen automáticamente un error material**: una respuesta puede dar ejemplos válidos o cubrir el propósito central sin reproducir toda la referencia. En 042 queda una especificidad por revisar; no se declara una alucinación por ausencia literal de un término. Estas lecturas matizan el diagnóstico anterior y no sobrescriben sus etiquetas, cifras o benchmark. No se deriva de ellas una nueva tasa de exactitud sobre 43.

Las **62 citas** registradas coinciden con chunk, versión, release, checksum y soporte atribuido en las trazas, sin discrepancias de identidad. Este control no comprueba que todas las afirmaciones estén sustentadas, que se haya contestado lo pedido o que el enlace HTTP del documento funcione. Una cita correcta puede apuntar a evidencia insuficiente para el aspecto solicitado.

## 7. Mejoras priorizadas y evidencia de causalidad

El backlog separado contiene un máximo de cinco intervenciones, con casos asociados, esfuerzo, riesgo y tests futuros. Se prioriza resolver entidad/periodo y preservar cobertura de aspectos antes que tocar el generador: los ocho desvíos originales ocurrieron **sin llamada al generador**. El cambio de prompts por sí solo no explica ni corregiría esas rutas deterministas.

Las primeras cuatro intervenciones se basan en mecanismos verificables en las trazas y el código; la quinta es una investigación de dos abstenciones, no un bug causal ya demostrado. Ninguna se implementó ni se probó contra el baseline en esta macrotarea. Los tests propuestos usarán fixtures neutrales y criterios de utilidad para el usuario, sin IDs del benchmark, frases de respuesta memorizadas, aumento de `top_k` o cambios diseñados solo para elevar métricas.

## 8. Limitaciones y aceptaciones pendientes

La muestra es pequeña y técnicamente seleccionada: 43 frente al mínimo histórico de 50, 46 unidades gold distintas y múltiples casos dependientes de fuentes compartidas. No hay reserva verdaderamente ciega ni revisión humana independiente del gold corregido. La ausencia de ratificación institucional impide convertir la orientación local del corpus en reglas oficiales o decisiones sobre expedientes.

La relevancia y las anotaciones de afirmaciones son adjudicaciones técnicas, no una garantía de completitud. Algunas preguntas no distinguen ejemplos, lista exhaustiva, relación temática y relación causal. Eso exige cautela al diagnosticar omisiones y al interpretar el juez. Este cierre no cambia esas preguntas, etiquetas ni denominadores después de observar resultados.

Siguen pendientes las decisiones académicas sobre suficiencia de la muestra y operacionalización mediante MRR@5, así como validación independiente y suficiencia del juez para conclusiones fuertes. La interpretación institucional de los casos excluidos depende de autoridad externa; no bloquea documentar el alcance técnico ya ejecutado. Los defectos de producto identificados son trabajo de desarrollo posterior, no motivo para esconder o repetir este baseline.

## 9. Conclusión para sustentación

**Evaluación técnicamente ejecutada:** sí, con una pasada completa, versiones congeladas, denominadores explícitos, evidencias privadas y resultados verificables del componente definido. Este cierre utiliza únicamente esa evidencia existente.

**Desempeño observado:** se recuperó al menos un gold en 37/43 casos y el primer relevante tendió a aparecer pronto; sin embargo, la selección, las guardias y algunas salidas perdieron el propósito de la consulta. Hubo 39 respuestas y cuatro abstenciones. La alta fidelidad al contexto no acredita por sí sola utilidad o completitud de respuesta.

**Referencias preliminares:** MRR@5 y la media exploratoria de faithfulness superaron sus valores de referencia; context precision, context recall y answer relevancy no los alcanzaron. No se cumplieron todas las metas numéricas y las métricas del juez no constituyen validación sólida por sí solas.

**Aceptación académica:** pendiente. No se atribuye aprobación al director ni al CCD. Se cierra la fase técnica de esta evaluación con un informe defendible y un backlog acotado, preservando como línea base sus resultados positivos y negativos.

## 10. Trazabilidad y verificaciones de este cierre

Se verificaron el benchmark congelado `44c7464b8f6a9ecdc34c436205beafb532c7a26bc4d44c1b99d4af98c93275c8`, baseline `8528d8af371f74d47aa1e8ea92b1f63c8fb9b8e6984b9a7cdbc5e27bf43ae58f` y manifest final CIERRE-01 `62eb07cf5b6579ed07447ce7b715da4e703b4c34303ff175e55ea374e366c4c3`, incluidos sus 22 artefactos y código congelado. Los resultados nuevos remiten por ID, índice JSON y hash a la traza original.

La versión privada añade pregunta, referencia, respuesta, rankings, contextos, citas, explicación probable, confianza y solución por caso. El manifest de CIERRE-02 contiene rutas y hashes de todos los entregables nuevos. Las verificaciones actuales son lectura de archivos, consistencia, privacidad e integridad; no se repitieron las 11 pruebas de CIERRE-01 ni se declaran como ejecutadas ahora.

No se consultaron o cambiaron PostgreSQL, Docker, Ollama, corpus, releases o producto. No hubo retrieval, generación, RAGAS, entrenamiento, nuevo benchmark, commit ni push.
