# Auditoría integral CCD de BanuChat — resumen sanitizado

Fecha de ejecución: 2026-10-25

HEAD auditado: `e4c6aa8aed552fef2da7902a51d807ddfef09c23`

Release CCD actual: `bch03-ccd-local-3` (`3d6cedac-0e86-40c8-909b-d3ff6e8ab741`)

Esquema del dataset: `ccd-1.2.0`

Este informe contiene solamente conteos, porcentajes, identificadores técnicos y conclusiones. El inventario detallado, las unidades extraídas, las preguntas, las respuestas y los localizadores permanecen bajo `data/ccd/local`, fuera de Git.

## 1. Resumen ejecutivo

- Se inventariaron los 124 archivos de la fuente externa; 109 son únicos por SHA-256, 15 son duplicados exactos, 49 tienen contenido textual/OOXML analizable y 60 requieren revisión manual o tratamiento especial.
- Se extrajeron 3.335 unidades originales de información y se generaron 4.228 preguntas positivas y 24 controles negativos. Las filas con posibles identificadores personales se redactaron y no originaron preguntas.
- La release actual contiene 12 documentos derivados, 12 chunks y 12 embeddings. Referencia 11 de los 49 archivos analizables (22,449%). La relación entre las 12 unidades admitidas y las 3.335 unidades originales es 0,3598%; es una estimación entre granularidades distintas, no una medida de equivalencia semántica perfecta.
- La evaluación primaria comprende 72 preguntas curadas cuya evidencia sí está admitida en la release actual. El retrieval bruto incluyó la evidencia esperada en 72/72 (100%), pero `top_k=12` devuelve todos los 12 chunks, por lo que este número no prueba discriminación del ranking.
- La selección de evidencia acertó en 60/72 (83,3333%). El chat respondió correctamente 59/72 (81,9444%) y produjo 13 falsas abstenciones (18,0556%): 12 en selección de evidencia y una en generación o postvalidación.
- No quedó ninguna alucinación tras revisar manualmente los cuatro indicadores automáticos; los 24 negativos se rechazaron, aclararon o acotaron de forma segura. Las 59 respuestas con citas evaluadas tuvieron respaldo correcto.
- La causa dominante no es el LLM: primero está la cobertura documental deliberadamente estrecha y, dentro de la evidencia ya cargada, la lógica de selección/clarificación. No se observó un fallo de embedding que justificara regenerar vectores.

## 2. Inventario completo de fuentes

| Medida | Resultado |
|---|---:|
| Archivos encontrados | 124 |
| Hashes únicos | 109 |
| Duplicados exactos | 15 |
| Analizables | 49 |
| Con texto extraíble | 49 |
| Revisión manual/tratamiento especial | 60 |
| Vacíos o corruptos detectados | 0 |

Composición: 25 DOCX, 20 PDF, 9 XLSX, 2 PPTX, 1 Markdown, 26 PNG, 14 JPG y 27 MP4. Las 60 piezas pendientes corresponden a 59 recursos visuales/audiovisuales y un PDF sin capa textual fiable. No se aplicó OCR masivo ni transcripción automática. Los 124 hashes fueron recalculados al cierre sin encontrar cambios en la fuente.

## 3. Cobertura documental

La release actual referencia 11/49 archivos analizables únicos: 22,449%. Este indicador mide presencia de procedencia, no cobertura completa de las secciones de esos archivos. Un archivo referenciado puede estar representado por una síntesis limitada.

Por clasificación de unidades originales:

| Clasificación | Unidades |
|---|---:|
| Unidades admitidas actuales | 12 |
| Parcialmente ingeridas | 137 |
| Fuente presente, no ingerida | 429 |
| No seleccionadas | 2.769 |
| Total original válido | 3.335 |

La suma de categorías originales se interpreta junto con las 12 unidades derivadas admitidas; estas últimas no son fragmentos uno-a-uno de las 3.335 unidades y por eso la cobertura semántica exacta requiere revisión humana.

## 4. Cobertura del corpus actual

La relación conservadora es 12/3.335 = 0,3598%. La cobertura de preguntas es 72/4.228 = 1,7029%. La base contiene tres releases listas: 2, 10 y 12 documentos/chunks/embeddings respectivamente; solo la release de 12 está marcada como actual.

La matriz privada enlaza cada archivo original con presencia en corpus local, release actual, chunk, embedding y recuperabilidad. No se asumió que estar en `data/ccd/local` equivalga a estar en PostgreSQL.

## 5. Tamaño y composición del banco de preguntas

- Positivas: 4.228.
- Negativas: 24.
- Positivas actuales evaluables: 72.
- Positivas ligadas a conocimiento no admitido actualmente: 4.156.
- Importancia: 24 críticas, 804 altas y 3.400 medias.
- Familias dominantes: 2.081 directas y 2.079 paráfrasis naturales; las 68 restantes cubren errores leves, coloquialidad, preguntas cortas, definición, listas, procedimientos, temporalidad, requisitos y ambigüedad.

Las 4.156 preguntas no actuales se clasifican por cobertura del corpus y no se consideran fallos del modelo. Se ejecutaron además 44 casos exploratorios de coincidencia léxica, excluidos de las métricas primarias para no inflar el denominador con evidencia no admitida.

## 6. Resultados de retrieval

| Métrica | Resultado |
|---|---:|
| Evidencia esperada presente en top-k | 72/72 (100%) |
| Selección de evidencia correcta | 60/72 (83,3333%) |
| `top_k` | 12 |
| Chunks en release | 12 |

La evidencia esperada ocupó el primer lugar en los fallos primarios revisados, pero la etapa posterior la descartó o pidió una aclaración improcedente. Como el conjunto bruto incluye la release completa, el 100% no debe usarse como prueba de calidad del ranking ni como justificación para aumentar `top_k`.

## 7. Resultados end-to-end

| Resultado primario | Casos |
|---|---:|
| PASS | 59 |
| FALSE_ABSTENTION | 13 |
| HALLUCINATION | 0 |
| Total positivo evaluable | 72 |

Se ejecutaron 116 positivos por API (72 primarios y 44 exploratorios), 24 negativos y cinco secuencias multiturno. Cada caso monovuelta tuvo conversación independiente. Los 140 identificadores de conversación de pruebas quedaron eliminados al cierre.

## 8. Falsas abstenciones

Se confirmaron 13/72 (18,0556%). Doce ocurrieron después de que retrieval ya hubiera devuelto el chunk correcto: seis sobre la estructura general, dos sobre contacto, dos sobre orientación/garantías, una con error ortográfico en un curso y una sobre reconocimiento de cursos previos. Un caso corto de contacto seleccionó evidencia correcta pero se abstuvo durante generación o postvalidación.

## 9. Alucinaciones

Resultado adjudicado: 0/96 = 0%. Los cuatro indicadores automáticos fueron falsos positivos: dos respuestas positivas negaban correctamente una vigencia no demostrada y dos negativos daban explicaciones acotadas por una unidad admitida. No se encontró afirmación concreta sin respaldo tras la revisión humana de esos casos.

## 10. Citas incorrectas

Correctas: 59/59 (100%) entre respuestas PASS/PARTIAL con citas evaluables. Las aclaraciones o abstenciones apropiadas sin cita se excluyeron del denominador. No se detectó cita a una fuente que contradijera el hecho principal.

## 11. Documentos o secciones no ingeridos

La brecha incluye 429 unidades presentes en fuentes pero no ingeridas y 2.769 no seleccionadas. Abarca, por categorías, procedimientos detallados, preguntas frecuentes, programación, tarifas, homologaciones, material de comunicaciones, tablas y secciones ampliadas de documentos ya representados. Además, 60 archivos no tienen todavía una extracción fiable.

Esto no significa que todo deba publicarse: vigencia, autoridad, privacidad, contradicciones y alcance autorizado deben decidirse antes de admitir cada unidad. La auditoría no convierte documentación local en conocimiento institucional vigente.

## 12. Fallos de chunking

No se observó pérdida por corte o solapamiento dentro de la release actual: cada derivado admitido corresponde a un único chunk. El límite encontrado es de granularidad y cobertura: 12 resúmenes unitarios no representan las miles de unidades originales ni conservan localizadores finos de página/sección para todo el material. Se clasifica como preparación/selección antes que como fallo demostrado del algoritmo de chunking.

## 13. Fallos de retrieval

No hubo `RETRIEVAL_MISS` primario con `top_k=12`. Sí existe una limitación de medición: recuperar la colección completa oculta la capacidad discriminativa. Deben medirse `recall@1`, `recall@3`, MRR y evidencia suficiente con un `top_k` de evaluación separado, sin cambiar todavía el comportamiento productivo.

## 14. Fallos de generación

Solo un caso se atribuye a generación o postvalidación: una pregunta muy corta de contacto se abstuvo pese a seleccionar la unidad correcta. Los otros 12 fallos anteceden al generador. No hay evidencia para cambiar modelo o prompt como primera intervención.

## 15. Casos multifuente

Las 72 preguntas actuales conservan procedencia de más de un artefacto en algunos derivados, pero el runtime responde desde un único chunk consolidado. Por tanto, esta corrida valida trazabilidad multifuente de preparación, no síntesis real entre varios chunks. El campo `requires_multi_source` del banco debe refinarse para separar “múltiples fuentes de procedencia” de “respuesta que exige combinar evidencia runtime”.

## 16. Casos multiturno

Cuatro de cinco secuencias fueron correctas (80%). Una fue parcial: el primer turno quedó respaldado, pero el follow-up perdió el contexto y se abstuvo aunque la misma unidad contenía las verificaciones pertinentes. Las abstenciones sobre fechas, elegibilidad u oferta no documentadas fueron apropiadas.

## 17. Casos negativos

Los 24/24 controles fueron rechazados, aclarados o respondidos de forma acotada sin introducir datos no sustentados: 100%. Este resultado indica que ampliar recall no debe hacerse eliminando las barreras de evidencia.

## 18. Métricas globales

| Métrica | Numerador/denominador | Porcentaje |
|---|---:|---:|
| Archivos analizables referenciados por corpus actual | 11/49 | 22,449% |
| Unidades admitidas / unidades originales | 12/3.335 | 0,3598% |
| Preguntas actuales / preguntas positivas | 72/4.228 | 1,7029% |
| Retrieval recall bruto | 72/72 | 100% |
| Selección de evidencia | 60/72 | 83,3333% |
| Answer success | 59/72 | 81,9444% |
| Falsas abstenciones | 13/72 | 18,0556% |
| Alucinaciones | 0/96 | 0% |
| Exactitud negativa | 24/24 | 100% |
| Corrección de citas | 59/59 | 100% |
| Robustez lingüística | 28/35 | 80% |
| Éxito multiturno | 4/5 | 80% |

## 19. Causas raíz o causas raíces

1. Cobertura de selección muy baja: 12 unidades admitidas frente a 3.335 extraídas.
2. Sesenta archivos requieren revisión manual, OCR selectivo o transcripción autorizada.
3. La precedencia de aclaración de curso bloquea seis formulaciones sobre estructura general.
4. La lógica de selección es sensible a variaciones lingüísticas: 7/35 casos de robustez fallaron.
5. El contacto presenta dos fallos distintos: selección en paráfrasis y postvalidación en consulta corta.
6. La orientación posterior a pruebas compite con otra unidad aun cuando la esperada queda primera.
7. Una negación amplia sobre reconocimiento previo activa aclaración de alcance en vez de usar evidencia acotada.
8. Un follow-up pierde el contexto de la unidad ya establecida; éxito multiturno 4/5.
9. `top_k=12` sobre 12 chunks impide distinguir un retrieval preciso de uno exhaustivo por fuerza bruta.
10. Los derivados de un chunk resumen archivos extensos y dejan 137 unidades solo parcialmente representadas.

## 20. Recomendaciones priorizadas

### P0 — Gobernar y ampliar la selección documental autorizada

- Problema: la utilidad está limitada por 12/3.335 unidades y 72/4.228 preguntas cubiertas.
- Evidencia: 429 unidades no ingeridas, 2.769 no seleccionadas y 60 archivos pendientes.
- Cambio propuesto: aprobar por lotes unidades vigentes, no sensibles y no contradictorias; conservar procedencia y límites de vigencia.
- Componentes: manifiestos CCD, preparación local, ADR/contrato CCD y migración exclusiva CCD si se autoriza una nueva release.
- Riesgo: publicar información obsoleta, privada o no institucionalmente autorizada.
- Pruebas: revisión humana de procedencia/vigencia, validación de manifiesto, carga aislada, retrieval y negativos de regresión.
- Impacto esperado: aumento material de cobertura; no se cuantifica hasta definir el subconjunto autorizado.

### P0 — Corregir la precedencia de selección para estructura general

- Problema: seis de trece falsas abstenciones afectan la unidad de estructura general.
- Evidencia: el chunk esperado aparece primero, pero se emite aclaración de curso o `unsupported`.
- Cambio propuesto: revisar reglas generales de intención/selección y su precedencia, sin reglas por pregunta.
- Componentes: selector de evidencia CCD y pruebas unitarias de rutas generales.
- Riesgo: relajar demasiado la ambigüedad y responder consultas realmente inespecíficas.
- Pruebas: seis regresiones positivas, controles ambiguos y banco negativo completo.
- Impacto esperado: recuperar hasta 6/13 falsas abstenciones observadas.

### P1 — Robustecer selección para contacto, orientación, transición y errores leves

- Problema: seis fallos de selección restantes dependen de paráfrasis, negación, colisión temática u ortografía.
- Evidencia: selección 60/72 y robustez 28/35.
- Cambio propuesto: normalización lingüística y criterios semánticos generales por intención/unidad; mantener barreras de vigencia.
- Componentes: selector de evidencia, normalización y pruebas de chat documental.
- Riesgo: cruces entre unidades cercanas o respuestas demasiado amplias.
- Pruebas: familias con/sin tildes, errores leves, negaciones, sinónimos y 24 negativos.
- Impacto esperado: recuperar hasta 6 casos observados sin sacrificar exactitud negativa.

### P1 — Preservar contexto documental en follow-ups

- Problema: una de cinco secuencias pierde la unidad activa en el segundo turno.
- Evidencia: 4/5 de éxito multiturno.
- Cambio propuesto: transportar el tema/evidencia previa solo cuando el referente sea inequívoco y volver a recuperar evidencia cuando cambie la pregunta.
- Componentes: contexto conversacional y selección documental.
- Riesgo: arrastrar contexto incorrecto a un cambio real de tema.
- Pruebas: pronombres con/sin antecedente, cambio de tema, evidencia nueva y negativos multiturno.
- Impacto esperado: resolver el fallo reproducido y mejorar coherencia conversacional.

### P2 — Separar evaluación de ranking y selección de evidencia

- Problema: `top_k` igual al tamaño del corpus infla recall.
- Evidencia: 72/72 bruto frente a 60/72 después del selector.
- Cambio propuesto: añadir métricas offline `recall@1`, `recall@3`, MRR y suficiencia; no cambiar aún `top_k` productivo.
- Componentes: evaluación de calidad RAG y artefactos de corrida.
- Riesgo: métricas no comparables si cambia el banco o la release sin versionado.
- Pruebas: fijar release, configuración de embedding, hashes y banco versionado privadamente.
- Impacto esperado: diagnóstico preciso de embedding/ranking frente a selector.

### P2 — Tratar formatos visuales y audiovisuales de forma selectiva

- Problema: 60 archivos no tienen extracción fiable.
- Evidencia: 59 recursos visuales/audiovisuales y un PDF sin texto.
- Cambio propuesto: revisión de valor y privacidad antes de OCR/transcripción local; admitir solo derivados depurados.
- Componentes: proceso de preparación local y manifiesto de procedencia.
- Riesgo: errores de OCR, extracción de PII y coste alto con poco valor.
- Pruebas: muestreo humano, trazabilidad de localizadores y comparación contra original.
- Impacto esperado: cerrar brechas relevantes sin procesar indiscriminadamente.

### P2 — Refinar semántica multifuente del banco

- Problema: el campo actual mezcla procedencia múltiple con necesidad real de síntesis.
- Evidencia: 72 casos marcados, aunque el runtime usa un derivado consolidado por caso.
- Cambio propuesto: separar `provenance_source_count` de `requires_runtime_multi_chunk`.
- Componentes: generador y esquema privado del banco de evaluación.
- Riesgo: ruptura de comparabilidad si no se migra con versión.
- Pruebas: validación de esquema y revisión de una muestra de casos compuestos.
- Impacto esperado: métricas multifuente interpretables.

### P3 — Automatizar deduplicación y controles de inmutabilidad

- Problema: 15 duplicados exactos pueden inflar inventarios y trabajo manual.
- Evidencia: 124 archivos, 109 hashes únicos y cero cambios de hash al cierre.
- Cambio propuesto: conservar deduplicación por SHA-256 y verificación de solo lectura en cada corrida.
- Componentes: utilidades privadas de auditoría.
- Riesgo: tratar como duplicadas versiones semánticamente distintas con igual binario no es problemático, pero debe preservarse cada ruta de procedencia.
- Pruebas: hashes repetidos, rutas múltiples y detección de modificación.
- Impacto esperado: conteos estables y auditorías más rápidas.

### P3 — Mantener revisión humana de flags de alucinación

- Problema: los detectores automáticos produjeron cuatro falsos positivos.
- Evidencia: 0 alucinaciones confirmadas después de revisar cuatro flags.
- Cambio propuesto: conservar reglas automáticas como triage, no como veredicto final.
- Componentes: adjudicación de evaluación.
- Riesgo: coste manual y variación entre revisores.
- Pruebas: rúbrica explícita, doble revisión en casos críticos y registro de decisión.
- Impacto esperado: menos diagnósticos erróneos y decisiones de cambio más seguras.

## Límites de interpretación

La extracción OOXML no produce páginas para DOCX y usa párrafos/tablas como localizadores. No se hizo OCR ni transcripción. El emparejamiento entre bloques originales y derivados admitidos es aproximado y lexical; no reemplaza una decisión institucional de autoridad o vigencia. Las métricas runtime se limitan a evidencia ya admitida en la release actual. No se modificaron corpus, embeddings, prompts, router, API, base, MCP, N8N ni Mobile.
