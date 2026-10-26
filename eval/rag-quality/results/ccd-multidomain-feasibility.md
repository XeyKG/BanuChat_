# BanuChat — Viabilidad de ampliación documental multidominio

Fecha de análisis: 25 de octubre de 2026, America/Bogota. HEAD inspeccionado: `59816938063f05fd8a410577c523bfdc677a5d53`.

**Recomendación: C, por etapas y con aprobación posterior.** Hay 50 claims nuevos con viabilidad documental condicionada: 38 descriptivos con alcance acotado y 12 comparaciones de tensiones entre fuentes. Se conservan exactamente los 26 claims del piloto. Los 76 siguen pendientes, con `NOT_APPROVED` y `evidence_visible_allowed=false`. Este informe diseña la ampliación; no la implementa ni autoriza su publicación.

## 1. Universo y límites del análisis

Se aplicó un cribado reproducible a las **2.093 unidades SOURCE**, procedentes de 44 archivos con extracción textual. Se revisaron semánticamente los pasajes propuestos y sus relaciones con el piloto y el corpus actual. El inventario privado conserva, por unidad, clasificación anterior, decisión nueva, fuente, SHA-256, localizador, conflictos y claims asociados. Esto constituye cobertura completa del inventario textual, no una revisión humana independiente de todas las unidades ni de todo el material visual pendiente de extracción.

Se reutilizaron los inventarios y resultados privados de auditoría integral, gobernanza y curación P0. Los archivos de auditoría interna sirven para gobernanza y nunca se proponen como evidencia para estudiantes. No se consultaron sitios ni APIs institucionales. Los originales permanecen de solo lectura.

| Decisión principal de cribado | Unidades |
| --- | ---: |
| Soporte de nuevas oportunidades, sujeto a revisión | 464 |
| Soporte del piloto conservado | 135 |
| Editorial o interno | 241 |
| Promocional, sin autoridad académica | 83 |
| Temporal o autoridad por confirmar | 134 |
| Histórico o edición incierta fuera de la propuesta | 335 |
| Privacidad o contexto sensible mixto | 207 |
| Conflicto abierto sin respuesta normativa | 110 |
| Referencias o metadatos | 81 |
| Fragmentos que necesitan contexto | 105 |
| Revisión semántica o de autoridad diferida | 198 |
| **Total** | **2.093** |

Son categorías principales excluyentes de cribado, no autorizaciones ni cifras de datos personales confirmados. Un pasaje propuesto puede tener además un conflicto asociado. Hay **415 unidades de soporte recuperadas fuera de los 547 candidatos anteriores**; recuperar soporte no equivale a aprobarlo.

## 2. Claims y nuevas capacidades

| Área | Claims nuevos | Aporte y límite |
| --- | ---: | --- |
| Académica, contenidos históricos | 21 | Secciones temáticas de cinco temarios con actualización documental de 2025; solo describen esa edición |
| Académica, detalle formativo | 10 | Actividades, relaciones con aprendizajes y ejemplos temáticos ausentes de las síntesis del piloto; no establecen evaluación vigente |
| Orientación y procedimientos | 4 | Estructura de un instrumento, comprobaciones y pasos descritos por un instructivo; interfaz actual no verificada |
| Historia y transición | 3 | Diferencias documentadas por modalidad y un plan por fases; periodo explícito, sin presumir ejecución |
| Consultas complejas | 12 | Comparación atribuida de afirmaciones de varias fuentes; no decide la norma ni el caso individual |
| **Total nuevo** | **50** | **38 descriptivos + 12 comparaciones condicionadas** |

Los 50 se distinguen del contenido normalizado de los 26 claims del piloto por sus detalles, procedimientos, periodos o capacidad de comparación. No se crearon claims por cada fila ni se fijó una cuota. El soporte compartido entre claims no se cuenta como información distinta. Los dos subtemas procedimentales que habían quedado fuera del piloto se identifican como recuperación de candidatos retenidos, no como parte de los 26 conservados.

Cada claim privado incluye afirmación, área, fuente original, SHA-256, localizadores, unidades de soporte, hechos candidatos, procedencia temporal, ámbito, vigencia conocida o desconocida, privacidad, conflictos, preguntas habilitadas, aporte incremental y motivo de admisión condicionada. Los hechos extraídos son material de revisión; **no se autoriza ingerir bloques crudos ni originales completos**. No hay un número de chunks definido: deberá resultar de la preparación semántica aprobada.

Se propone priorizar **17 claims nuevos no dedicados a los temarios antiguos**: 10 académicos, 4 de orientación y 3 históricos. Junto con el piloto formarían una primera etapa de 43 claims pendientes. Los 21 de temarios antiguos y las 12 comparaciones quedan como etapas posteriores separables. La fecha de actualización de un temario no demuestra oferta vigente; la fecha de un formato tampoco reemplaza la fecha de su contenido.

## 3. Cobertura incremental estimada

El banco llamado positivo contiene 4.228 casos: 4.156 formulaciones generadas desde bloques SOURCE y 72 casos curados actuales. Incluye preguntas sobre encabezados, instrucciones editoriales y referencias. Dos casos curados esperan aclaración. Por ello, **4.228 no es un denominador válido de exactitud de atención a estudiantes**.

Se asignó crédito solo con correspondencia explícita entre el hecho esperado completo y una evidencia conservada con alcance documental. No se usó coincidencia léxica como prueba. Cada caso tiene decisión y justificación en una matriz privada. Los casos de comparación conflictiva no reciben crédito por responder preguntas normativas de una sola fuente.

| Alternativa | Casos con respaldo documental mapeado | Incremento frente a la etapa previa | Evidencia de ejecución |
| --- | ---: | ---: | --- |
| A. Release actual | 82 | — | 70 respuestas acreditadas en la curación anterior; 12 correspondencias adicionales estimadas |
| B. Actual + piloto de 26 | 86 | +4 frente a A | Incremento estimado; no ejecutado |
| C. Actual + piloto + propuesta completa | 916 | +830 frente a B; +834 frente a A | Incremento estimado; no ejecutado |

Estas son **cotas documentales conservadoras del mapeo realizado**, condicionadas a revisión, preparación y funcionamiento futuro. No son resultados del chat ni una enumeración exhaustiva de toda respuesta posible. El piloto aporta además preguntas nuevas sobre propósito y pilares que el banco antiguo no representa bien; no se sumaron artificialmente al total del banco.

Los 830 casos nuevos de C corresponden a **415 hechos originales**, normalmente con dos formulaciones cada uno:

| Área del incremento C sobre B | Casos estimados |
| --- | ---: |
| Temarios históricos | 730 |
| Detalle académico | 68 |
| Orientación documentada | 16 |
| Historia y transición | 16 |
| **Total** | **830** |

Así, aproximadamente el 88% del incremento numérico proviene de temarios históricos. Estos permiten responder qué figuraba en el temario, no enseñar procedimientos de software que la fuente solo enumera. La primera etapa prioritaria de 17 claims aportaría **100 casos adicionales sobre B**, una cota acumulada de **186** y **104 más que A**. Su valor es diversificar la consulta, aunque su volumen sea menor.

Las 12 comparaciones realmente multifuente son una capacidad adicional que no se cuantifica dentro de esos 830. El diseño de evaluación incluye esas 12 y otras 3 comparaciones entre documentos sin conflicto. Se mantienen **3.310 casos sin crédito de respuesta** y 2 controles de aclaración fuera del total de 916. Sin crédito puede significar exclusión, evidencia insuficiente o mapeo pendiente; no significa que todos sean preguntas legítimas que deban producir abstención.

## 4. Bloqueos y riesgos

Los **15 grupos de conflicto se conservan íntegros y sin resolver**. Cubren reconocimiento, elegibilidad, tarifas, equivalencias, cohortes, secuencia, umbral, matrícula, ámbitos de homologación, créditos, alcance temático, contacto y pasos condicionales. Doce admiten estudiar un informe comparativo con fuentes separadas. Los otros tres se mantienen fuera de esa propuesta por sensibilidad de contacto, un ejemplo aritmético interno o una rama procedimental relacionada con credenciales.

Una comparación no confirma cuál fuente es vigente ni qué derecho tiene una persona. Tampoco una diferencia entre ámbitos demuestra necesariamente contradicción lógica: el sistema debe conservar esa distinción. Se excluyeron de la evidencia propuesta pasajes editoriales y promocionales presentes en los registros de conflicto; el registro de auditoría completo permanece privado.

Permanecen bloqueados los datos personales, expedientes, programación con información sensible, credenciales, tarifas aplicables hoy, decisiones individuales de reconocimiento y reglas incompatibles sin decisión autorizada. Los 24 negativos anteriores siguen siendo controles obligatorios de respuesta segura. Los procedimientos sin fecha solo podrían describirse como contenido del documento, nunca como instrucciones de una interfaz vigente.

Los principales riesgos técnicos son mezclar periodos, perder evidencia necesaria al recuperar más chunks, confundir coincidencia temática con suficiencia y presentar una síntesis contradictoria como una regla. La principal dependencia externa es la revisión humana de autoridad, privacidad y ámbito. No se obtuvo ni se presume aval institucional.

## 5. Cambios mínimos que requeriría una implementación posterior

| Componente inspeccionado | Límite actual | Cambio propuesto, todavía no implementado |
| --- | --- | --- |
| Manifiesto y preparación CCD | Schema y preparador fijan fuentes, grupos e identidades; la versión actual exige 12 unidades | Nuevo schema versionado y catálogo aprobado; conservar validadores y releases anteriores; diferenciar evidencia estudiantil de gobernanza |
| Persistencia e ingesta | Receta fija de 12 documentos/chunks y CLI restringida a la base histórica de desarrollo | Nueva receta y validación aditiva, revisadas expresamente para el destino CCD aislado de la aplicación unificada; no reutilizar ciegamente el CLI histórico |
| Chunking | Un chunk por unidad preparada | Secciones semánticas acotadas; contexto de curso, edición, periodo y límites en cada fragmento; tamaño medido, sin fijar un chunk por bloque ni por claim |
| Metadatos | Parte de la selección depende de nombres y localizadores fijos | Conservar procedencia original y derivada, unidades, revisión, ámbito, fecha documental, aplicabilidad y conflictos; metadatos internos versionados, sin exigir nuevo contrato público |
| Selector | Reconoce grupos concretos de la release; menciones de cursos antiguos pueden activar orientación de transición | Seleccionar por tema, edición, periodo y autorización; aclarar ambigüedad; recuperar todas las fuentes necesarias para comparar; conservar protecciones de contacto y orientación |
| Retrieval | `top_k=12` en CCD, equivalente al tamaño de la colección actual | Medir recuperación con colección ampliada y valores de K; evaluar cobertura completa y ruido antes de configurar; mantener inicialmente búsqueda exacta por coseno |
| Generación | Evidencia acotada y límite de 80 palabras | Respuesta limitada al alcance; atribución temporal y separación explícita de fuentes; pedir acotar listas extensas o comparación incompleta; evaluar presupuesto antes de cualquier ajuste |
| Citas y artefactos | UUID, SHA, localizadores y lectura por raíces versionadas ya disponibles | Reutilizar contratos; registrar la nueva raíz autorizada y probar que cada afirmación conserva su fuente; servir solo derivados depurados |
| MCP y orquestación | El MCP unificado reutiliza el selector documental; la orquestación existente cubre otros flujos | Verificar regresión del selector compartido; no crear agentes ni cambiar contratos o workflows para esta ampliación documental |

Referencias técnicas del repositorio: `data/ccd/schemas/corpus-1.2.schema.json`, `backend/rag/src/ccd/prepare.ts`, `backend/rag/src/ccd/ingest.ts`, `backend/rag/src/db/recipe.ts`, `infra/db/005_ccd_guidance_manifest.sql`, `backend/api/src/chat/document-evidence.ts`, `backend/api/src/chat/document-rag.ts`, `backend/api/src/chat/document-citations.ts`, `backend/api/src/application/document-artifact.ts` y `backend/api/src/authenticated-main.ts`. El detalle privado conserva los puntos de inspección.

La aplicación actual usa el destino unificado documentado por su checkpoint; el escritor histórico exige otra base y no puede asumirse apto para publicar allí. Una implementación necesitaría autorización específica y pruebas del destino, permisos, predecesor, integridad y publicación. Este hallazgo no justifica relajar guards existentes.

Se mantienen Mobile, REST, PostgreSQL/pgvector, Ollama, MCP y N8N. Se conservan inicialmente embeddings de 1.024 dimensiones, coseno y una configuración por release. No hay evidencia de necesidad de HNSW, otro modelo, microservicios o agentes adicionales. Los documentos `full_document` siguen sin fragmentarse ni vectorizarse. El número de claims no determina el de documentos ni el de embeddings.

## 6. Pruebas que acreditarían una mejora

Se diseñaron **115 casos nuevos**, no ejecutados: 14 positivos, 24 históricos, 15 multifuente, 4 ambiguos, 54 negativos y 4 positivos adicionales del piloto. Incluyen límites de vigencia, decisiones personales, privacidad, promoción y comparación sin resolución normativa. Los hechos extensos actúan como pasajes de referencia, no como exigencia de transcripción literal. Los casos de temarios se acotan para respetar el presupuesto de respuesta.

El conjunto tiene redacción nueva frente al banco antiguo, pero **no es un holdout ciego ni una evaluación de autoría humana independiente**. Antes de implementar se debe revisar el gold, congelar su hash y obtener una reserva no vista redactada por otro evaluador. La revisión y la calibración deben mantener separados los casos de desarrollo y de aceptación.

La validación posterior deberá:

1. Revisar los claims y hechos candidatos; aprobar solo derivados mínimos con procedencia y ámbito completos. Congelar el subconjunto del banco que realmente sea válido para evaluación.
2. Comparar A, B y cada etapa de C en condiciones iguales, conservando versiones y configuración; ejecutar los casos mapeados admitidos y el conjunto independiente, sin anunciar éxito sobre los 830 por disponer de un solo caso por claim.
3. Medir recall@1/3/5/12, MRR, recuperación de todas las fuentes necesarias, suficiencia del contexto, precisión de ámbito y periodo, citas respaldadas, falsas abstenciones, alucinaciones y latencia. Informar resultados por área y por hecho, además de por formulación.
4. Repetir las 72 primarias anteriores, los 24 negativos, el subconjunto robusto de 35, las 10 regresiones P0 y las 9 secuencias multiturno de 22 turnos. El subconjunto robusto no se suma como casos únicos adicionales.
5. Ejecutar typecheck y pruebas pertinentes de RAG, API y selector compartido; añadir pruebas de schema/receta, hashes, original/derivado, periodo ambiguo, evidencia parcial, cambio de tema, dos fuentes, conflictos y acceso a artefactos versionados.

Criterios propuestos, no resultados: ninguna regresión en los controles congelados; cero autorizaciones personales o vigencias inventadas; negativos de privacidad y decisiones conflictivas seguros; procedencia y citas completas; y al menos 90% de respuestas completas y respaldadas por área nueva. El umbral es una meta de proyecto por validar con el evaluador, no una garantía ni un criterio institucional. El ranking por sí solo no acredita una respuesta correcta.

La curación anterior registró 70 respuestas correctas y 2 aclaraciones, 24 negativos seguros, 35 robustos, 10 regresiones y 9 secuencias correctas, sin alucinaciones confirmadas en su pasada final. Son **resultados previos reutilizados**, no mediciones nuevas de este HEAD ni resultados de la propuesta. En esta iteración no se ejecutó chat, retrieval, Ollama, pruebas npm ni consultas a la base.

## 7. Alternativas, esfuerzo y horizonte académico

Las horas siguientes son estimaciones de planificación, sin medición de productividad. Suponen un implementador disponible 20–25 horas por semana, un revisor de dominio disponible 4–6 horas por semana y acceso al entorno local existente. Ingeniería y revisión se presentan separadas.

| Aspecto | A. Conservar actual | B. Solo piloto | C. Multidominio por etapas |
| --- | --- | --- | --- |
| Incremento estimado frente a A | 0 | 4 casos del banco; además mejor detalle no bien representado por ese banco | 834 casos completos; primera prioridad: 104 |
| Variedad nueva | Ninguna | Descripciones, competencias, contenidos y propósito académico | Actividades, orientación, historia atribuida y comparación de fuentes |
| Ingeniería total desde A | 0–8 h de documentación/higiene | 90–140 h | 190–300 h |
| Revisión humana desde A | 0–4 h | 20–35 h | 50–85 h |
| Trabajo técnico | Mantener y registrar límites | Preparación/manifiesto versionados, integración y regresión | Base de B más ámbito temporal, selección temática, síntesis y evaluación por etapas |
| Riesgo principal | Conservar cobertura limitada | Sobreestimar novedad por resumir conocimiento existente | Confundir historia o conflicto con instrucción vigente; degradar recuperación |
| Dependencias | Entorno y release conservados | Aprobación de los 26, diseño del escritor y derivados depurados | Las de B, revisión por área, gold revisado y límites de comparación |
| Validación | Regresiones existentes cuando corresponda | Regresiones más hechos nuevos del piloto | Comparación A/B/C, aceptación por área y multifuente, controles temporales y de privacidad |
| Viabilidad en 16 semanas | Alta, sin avance de alcance | Alta con aprobación oportuna | Condicionada; viable por etapas, sin prometer publicar los 76 |

C supone **100–160 horas adicionales de ingeniería y 30–50 de revisión frente a B**. En el extremo superior necesita una disponibilidad cercana a 25 h/semana y revisión temprana; con 20 h/semana o aprobación tardía se reduce el alcance. La revisión de 76 claims y sus contextos no puede estimarse contando solo afirmaciones cortas.

Secuencia propuesta: semanas 1–2, revisión y gold; 3–4, schema, preparación y receta; 5–7, selector, periodos y evidencia; 8–10, recuperación y pruebas por área; 11–12, regresión y aceptación; 13–14, informe y defensa; 15–16, contingencia. Los temarios históricos son opcionales si desplazan la aceptación de las capacidades prioritarias. Las comparaciones conflictivas se habilitarían únicamente si conservan todas las atribuciones y pasan los negativos; su exclusión no impide entregar la primera etapa.

Se recomienda C porque añade tipos de consulta verificables y una evaluación defendible. **La recomendación se apoya en los 17 claims prioritarios y en comprobar la comparación de fuentes, no en maximizar los 730 casos históricos.** B es una alternativa de reducción de alcance si no llegan revisión o capacidad de ingeniería. A conserva la estabilidad mientras no exista una decisión posterior.

## 8. Entrega y trazabilidad

El detalle está exclusivamente en el directorio ignorado `data/ccd/local/p0-multidomain-feasibility/`: inventario de 2.093 unidades, 26 claims preservados, 50 nuevos, 15 conflictos preservados, matriz de 4.228 casos, cobertura incremental, 115 casos prospectivos, riesgos, plan técnico, comparación, validaciones e índice con hashes. Contiene texto interno y no debe agregarse a Git. Este informe omite los textos originales, rutas de fuentes internas y datos personales.

### ESTADO DE ENTREGA BANUCHAT

- HEAD de inicio y cierre verificado: `59816938063f05fd8a410577c523bfdc677a5d53`.
- Archivo nuevo versionable: `eval/rag-quality/results/ccd-multidomain-feasibility.md`, sin staging, commit ni push.
- Código de aplicación, contratos, SQL y configuración: sin modificaciones. Los scripts privados solo reproducen el análisis de archivos.
- Artefactos privados: 21 archivos en el directorio ignorado indicado; comprobaciones y hashes en `validation-results.json` y `run-manifest.json`.
- Validación de esta iteración: consistencia de inventarios, cobertura, 490 referencias a fuentes y periodos, estados y preservación; hashes de los 124 originales sin diferencias; 61 comprobaciones contra hashes registrados de artefactos previos sin diferencias; `git diff --check` con salida 0. Son comprobaciones de integridad del análisis, no pruebas de calidad del producto.
- Tests de producto, recuperación y chat: no ejecutados en esta iteración. Los 115 casos nuevos siguen diseñados, sin resultado runtime.
- Base de datos, corpus publicado, `current` y embeddings: ninguna operación ni modificación ejecutada; no se abrió conexión a la base. No se afirma una nueva inspección runtime de su estado.
- Implementación, ampliación y publicación: pendientes de una decisión posterior.
