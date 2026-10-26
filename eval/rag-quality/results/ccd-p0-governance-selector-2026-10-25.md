# BanuChat: gobernanza SOURCE y corrección del selector CCD

Fecha local: 2026-10-25, America/Bogota. Evaluación de desarrollo, con adjudicación técnica del agente; no se declara revisión humana independiente, aval institucional ni benchmark ciego.

## 1. HEAD inicial y final

Ambos: `2b196dd82a769bf5bc2cb3718d4ae47ee0e6d340`. No se creó commit ni se hizo push.

## 2. Estado Git inicial y final

Inicial: `?? docs.zip`. Ningún archivo versionado modificado. El ZIP era preexistente y no se abrió ni modificó.

Final:

```text
 M backend/api/src/chat/conversation-context.ts
 M backend/api/src/chat/document-evidence.ts
?? backend/api/test/ccd-selector-p0.test.ts
?? docs.zip
?? eval/rag-quality/results/ccd-p0-governance-selector-2026-10-25.md
```

`data/ccd/local` y `data/ccd/evidence` permanecen privados e ignorados. Se comprobó `git check-ignore` antes de escribir el directorio nuevo. No existía una ejecución parcial anterior bajo esa ruta.

## 3. Archivos modificados

- `backend/api/src/chat/document-evidence.ts`: precedencia de intenciones y normalización ortográfica cerrada; 17 líneas añadidas y cinco reemplazadas.
- `backend/api/src/chat/conversation-context.ts`: reconoce referencias de verificación de caso y expone tres clases de follow-up; diez líneas añadidas.

No se modificaron contratos REST/MCP, SQL, corpus, modelo, prompts, configuración de embeddings, `top_k`, N8N ni Mobile.

## 4. Archivos creados versionables

- `backend/api/test/ccd-selector-p0.test.ts`: cuatro pruebas con casos de estructura, títulos, ortografía, ausencia de evidencia, orientación acotada y contexto.
- Este informe sanitizado.

## 5. Artefactos privados creados

Raíz: `data/ccd/local/p0-governance-selector-2026-10-25/`.

Incluye inventario limpio, particiones de conocimiento, conflictos, matriz de admisión, banco con procedencias separadas, evaluación antes/después, ranking, multiturno, propuesta de release y verificaciones. El listado absoluto y los SHA-256 están en `run-manifest.json`; `artifact-index.md` facilita su consulta. Los artefactos de la auditoría anterior permanecen intactos.

## 6. Corrección exacta SOURCE/GOVERNANCE

| Medida | LEGACY_MIXED_SCOPE | SOURCE_ONLY_SCOPE |
|---|---:|---:|
| Archivos físicos inventariados | 124 | 124, particionados |
| Hashes únicos totales | 109 | 109, particionados |
| Archivos fuente físicos | Sin separar | 119 |
| Hashes únicos fuente | Sin separar | 104 |
| Archivos GOVERNANCE_INTERNAL | Mezclados | 5 |
| Archivos analizables fuente | 49 mezclados | 44 |
| Unidades originales fuente | 3.335 mezcladas | 2.093 |
| Unidades de gobernanza | Mezcladas | 1.242 |
| Preguntas positivas | 4.228 | 4.228 |

Los cinco XLSX conocidos de auditoría se clasifican exclusivamente como GOVERNANCE_INTERNAL. Se excluyen de candidatos, denominadores SOURCE y evidencia destinada al usuario. Se conservan únicamente para trazabilidad interna.

La verificación del banco encontró cero preguntas originadas directamente en unidades de esos cinco libros. Sí encontró 72 preguntas curadas con referencias de gobernanza mezcladas en su procedencia. En el banco nuevo esas rutas se retiraron de `source_files` y quedaron en `governance_sources`; `evidence_sources` contiene solamente fuentes SOURCE. Esto corrige procedencia sin borrar ni alterar el banco previo.

## 7. Nuevo universo fuente y cobertura

El universo textual limpio contiene exactamente **2.093 unidades**. Las 12 unidades derivadas añadidas por la auditoría anterior no se vuelven a contar como unidades originales.

- Archivos fuente analizables representados por procedencia de la release: **10/44 = 22,7273%**.
- Unidades originales dentro de esos diez archivos: **400**; esto no implica que las 400 estén cubiertas.
- Coincidencias parciales léxicas del método anterior, restringidas a SOURCE: **112**; no equivalen a cobertura semántica validada.
- Unidades derivadas admitidas en la release: **12**.
- Relación entre granularidades: **12/2.093 = 0,5733%**. Se conserva como relación descriptiva, no como porcentaje semántico exacto del conocimiento cubierto.

No existe todavía un gold uno-a-uno que permita contar exactamente cuántas unidades originales respaldan cada oración de los doce derivados. El campo de cobertura semántica exacta queda explícitamente nulo. La cifra previa 12/3.335 permanece identificada como LEGACY_MIXED_SCOPE.

## 8. Conflictos detectados

Se aplicó screening de doce temas a las 2.093 unidades fuente. Se documentaron once grupos con afirmaciones, unidades y localizadores concretos. Un grupo no significa que todos sus documentos sean incompatibles en el mismo ámbito; la relación precisa queda registrada.

| Grupo | Relación | Estado |
|---|---|---|
| Diagnóstico frente a efectos de reconocimiento/exención | Contradicción | Gobernanza humana |
| Continuos: exclusión general frente a excepción temporal | Diferencia de alcance | Gobernanza humana |
| Extraordinaria/extemporánea: denominación, tarifa y población | Diferencia terminológica | Gobernanza humana |
| Cursos antiguos: condiciones conjuntas frente a alternativas | Contradicción | Gobernanza humana |
| Cortes de cohorte y periodos de transición | Posible cambio temporal | Gobernanza humana |
| Orden libre/concurrente frente a ruta progresiva | Diferencia de alcance | Gobernanza humana |
| Umbral inclusivo frente a umbral estricto | Contradicción | Gobernanza humana |
| Matrícula automática frente a orientación/gestión/elección | Diferencia de alcance | Gobernanza humana |
| Equivalencias dependientes de programa/modalidad | Diferencia de alcance | Gobernanza humana |
| Tarifas nominales y periodo efectivo | Posible cambio temporal | Sin resolver |
| Correo organizacional frente a datos de contacto ampliados | Diferencia de alcance | Gobernanza humana |

No se eligió un documento como oficial por ser más reciente. Las once tensiones requieren decisión humana o aclaración de vigencia; ninguna se resolvió usando conocimiento general. El screening y las reglas de admisión son herramientas de triage, no una prueba de que se hayan encontrado todas las contradicciones semánticas posibles.

## 9. Candidatos de admisión

Hay **547 unidades ADMIT_CANDIDATE**, cada una con fuente, localizador, hechos, alcance, periodo aparente, incertidumbres, dos preguntas propuestas cuando disponibles y estrategia de chunking. Las 547 tienen preguntas propuestas. Son candidatas pendientes de revisión, no autorización para ingerirlas.

Las categorías de fuente se asignaron mediante ruta y contenido. `SOURCE_FORMAL_CANDIDATE` significa apariencia documental para revisión; no certifica autoridad institucional. Las etiquetas de periodo son tokens observados en contenido/nombre y no prueban vigencia por sí mismas.

## 10. Exclusiones y categorías pendientes

| Decisión | Registros |
|---|---:|
| ADMIT_CANDIDATE | 547 |
| HISTORICAL_ONLY | 762 |
| TEMPORAL_REQUIRES_CONTEXT | 221 |
| PRIVACY_EXCLUDE | 181 |
| CONFLICT_REVIEW | 224 |
| LOW_VALUE | 158 |
| GOVERNANCE_ONLY | 1.242 |
| UNSUPPORTED_PENDING_REVIEW | 60 archivos sin unidad textual |

Las primeras seis categorías suman las 2.093 unidades SOURCE. Gobernanza suma sus 1.242 unidades separadas. Los 60 recursos sin extracción fiable son registros de archivo, no unidades inventadas.

Las dos hojas de programación aportan **162 unidades**, todas excluidas de admisión automática. Solo podrían abstraerse taxonomías o procedimientos genéricos después de retirar personas, asignaciones, identificadores, horarios, fechas, cupos y demás información operativa. Las alertas de redacción numérica previas se tratan como señales de revisión, pues también pueden afectar códigos académicos.

Clasificación de recursos pendientes y duplicados por valor esperado, basada en nombre/inventario: tres HIGH_VALUE_FOR_RAG, 48 MEDIUM_VALUE, dos LOW_VALUE, siete PRIVACY_REVIEW y 15 DUPLICATE. Solo los tres de valor alto se proponen para una futura tarea autorizada de OCR/transcripción selectiva. No se ejecutó OCR ni transcripción.

## 11. Falsas abstenciones antes/después

Se reprodujeron los trece fallos con la API vigente en 3004 antes de editar implementación; todos volvieron a abstenerse. También se reprodujo el fallo MT-04.

Después del cambio:

| Etapa | Antes | Después |
|---|---:|---:|
| Pérdida en selección de evidencia | 12 | 0 |
| Generación/postvalidación con evidencia correcta | 1 | 1 |
| Total sobre 72 casos | 13 (18,0556%) | 1 (1,3889%) |

Los doce casos corregidos cubren seis formulaciones de estructura, una paráfrasis de contacto, dos de orientación, dos variaciones ortográficas y una consulta de reconocimiento general. El caso residual Q-004167 selecciona M12 y termina absteniéndose. No se afirma haber separado generación de postvalidación dentro de ese fallo; requiere instrumentación específica en una tarea posterior.

## 12. Negativos antes/después

Seguridad: **24/24 → 24/24**. Después hay ocho CLARIFY_CORRECT y 16 ABSTAIN_CORRECT. Cuatro de los 16 dan contexto histórico o límites respaldados, en lugar de una abstención literal; ninguno concede el precio, derecho, equivalencia o aprobación solicitados sin evidencia. La comparación mide rechazo seguro, no relevancia perfecta de cada explicación.

## 13. Alucinaciones antes/después

Confirmadas: **0 → 0**. Se adjudicaron explícitamente las 106 respuestas monovuelta y los 22 turnos de las nueve secuencias. Se revisaron afirmaciones y citas contra los derivados admitidos. No se declara un revisor humano independiente ni un juez externo.

Las 81 respuestas monovuelta con citas tuvieron respaldo correcto: **81/81**, frente a 59/59 anteriores. Los denominadores difieren porque la corrida nueva incluye diez regresiones adicionales y más respuestas respaldadas.

## 14. Robustez antes/después

Sobre las mismas 35 preguntas: **28/35 (80%) → 34/35 (97,1429%)**. Es un subconjunto de los 72 positivos, no 35 ejecuciones independientes adicionales. La consulta corta residual de contacto explica el fallo restante.

## 15. Multiturno antes/después

Las cinco secuencias existentes pasan de **4/5 → 5/5**. El seguimiento sobre qué verificar conserva ahora el antecedente de transición y selecciona U04. Cuatro secuencias adicionales comprueban cambio de transición a contacto, cambio de curso a pruebas, referencia sin antecedente y cambio entre cursos: **4/4** correctas.

Se distinguen FOLLOW_UP_CLEAR_REFERENCE, FOLLOW_UP_TOPIC_CHANGE y FOLLOW_UP_AMBIGUOUS. Se conserva únicamente contexto aportado por el usuario para identificar el tema. Una respuesta previa del asistente no establece hechos institucionales.

## 16. Recall@1

**72/72 = 100%** en búsquedas nuevas con las consultas originales. La normalización ortográfica del selector no alteró los textos enviados a embeddings. El gold fue la unidad admitida esperada por caso.

## 17. Recall@3

**72/72 = 100%**. El primer chunk contiene la unidad esperada en todos los casos. El conjunto incluye dos consultas cuyo comportamiento de chat correcto es aclarar por referencia ambigua; son gold de ranking por tema, no positivas respondibles sin antecedente.

## 18. MRR y posiciones

**MRR = 1,0**, posición media **1**, mediana **1**, cero misses. Los rankings anteriores y los nuevos coinciden en esas medidas. Estas cifras miden ranking sobre esta pequeña colección y este banco reutilizado; no demuestran generalización a un corpus ampliado.

Selección offline de la unidad esperada: **60/72 → 72/72**. En chat, dos casos se aclaran antes de seleccionar evidencia por falta de antecedente. `top_k=12` productivo permanece igual y no se utiliza el recall@12 como argumento principal.

## 19. Cambios de código y pruebas

El selector identifica estructura general antes de la aclaración genérica de curso; conserva prioridad de pruebas y cursos nombrados. Reconoce variantes flexivas de contacto. Corrige solo un vocabulario ortográfico cerrado y limitado para términos del dominio. La orientación histórica pertinente precede a la descripción genérica de pruebas. La consulta sobre cursos antiguos se procesa como reconocimiento acotado antes de la regla de todos los temarios. La evidencia seleccionada siempre procede de chunks recuperados y no se añaden respuestas por case_id ni FAQ hardcodeadas.

El contexto conversacional reconoce la referencia de verificación de caso. La clasificación de follow-up se apoya en la existencia de antecedentes del usuario y las reglas de cambio de tema existentes.

Validaciones ejecutadas:

- Tests focalizados de selector, evidencia y contexto: **24/24 PASS**.
- `npm run typecheck`: **PASS**.
- `npm run typecheck:unified`: **PASS**.
- `npm test` en backend/api: **625/625 PASS**, sin fallos ni omisiones.
- HTTP antes: trece casos fallidos y una secuencia de tres turnos.
- HTTP después: 72 primarios, 24 negativos, diez nuevas regresiones y nueve secuencias con 22 turnos; todos los mensajes con estado 201.
- Resultado primario desglosado: 69 PASS, dos CLARIFY_CORRECT y una FALSE_ABSTENTION. Éxito comparable: **71/72 = 98,6111%**; solo respondibles: **69/70 = 98,5714%**.
- Nuevas regresiones: siete PASS, dos CLARIFY_CORRECT y una PARTIAL. La parcial da consecuencia histórica respaldada, pero omite quién orientaba la selección. No se la contabiliza como PASS.
- `git diff --check`: **PASS**.

Se evaluó el código nuevo mediante una instancia temporal en loopback 3005 con la misma composición, configuración y base del producto. Se detuvo al terminar. La API original en 3004 siguió activa sin reiniciarse: los resultados posteriores no se atribuyen a un proceso que hubiera cargado código antiguo. La aplicación habitual requerirá su reinicio normal para cargar los cambios.

## 20. Propuesta de próxima release

`next-release-plan.json` diseña una release sin publicarla. Propone selección humana de los 547 candidatos; las unidades históricas, temporales, conflictivas, privadas y no extraíbles se mantienen en categorías distintas.

Estrategia: secciones semánticas con contexto y límites; párrafo/tabla para DOCX; página/sección para PDF; hoja/celda/cabeceras para tablas aprobadas; diapositiva/forma/notas para PPTX. No se generan chunks de encabezados o filas aisladas sin contexto. El material audiovisual espera una tarea selectiva autorizada.

La metadata propuesta separa `evidence_sources` (fuente, hash y localizador citables) de `governance_sources` (decisión/editorial interna no visible como evidencia CCD). Los campos de vigencia distinguen periodo documentado, población/modalidad/cohorte, autoridad confirmada o desconocida, revisión humana y aplicabilidad actual. No se llena vigencia usando solo la fecha de modificación o el nombre del archivo.

La publicación exige revisar matriz y conflictos, aprobar un subconjunto y autorizar después ingesta/embeddings/promoción. En esta iteración esos pasos no se ejecutaron.

## 21. Riesgos y límites pendientes

1. La falsa abstención corta de contacto sigue en generación/postvalidación. El selector por sí solo no la resuelve.
2. La regresión nueva de orientación tiene una respuesta parcial. Las citas correctas no garantizan completitud.
3. La clasificación documental es una base de triage revisable; no una admisión institucional automática.
4. La cobertura exacta oración-a-unidad todavía no tiene gold semántico. No presentar 12/2.093 como equivalencia exacta.
5. Los derivados actuales conservan referencias editoriales internas en su pie de procedencia. No se modificaron porque la release está congelada. La separación de gobernanza queda aplicada en los nuevos artefactos y diseñada para la próxima release; la limpieza del contenido visible de los artefactos publicados requiere esa revisión posterior.
6. Las once tensiones siguen abiertas. No se publicó como norma ninguna afirmación discutida.
7. El mismo banco se utilizó para diagnóstico y desarrollo. Hace falta un conjunto independiente para evaluar generalización.
8. La normalización ortográfica es cerrada y limitada; no se afirma tolerancia universal a errores.
9. Los 60 archivos pendientes no tienen cobertura de contenido. El valor esperado del material visual se infiere solo de nombres/inventario.
10. La cuenta de pruebas se autenticó y creó mensajes/conversaciones de ensayo; esas operaciones escriben estado operativo de autenticación y conversación. Se eliminaron las 129 conversaciones creadas. No se modificaron tablas de corpus ni esquema.

Las 124 huellas de originales se comprobaron sin cambios. La huella de los 24 chunks almacenados, incluidos sus vectores, fue idéntica antes/después en ambas corridas; current, manifiesto, receta y configuración de embeddings también permanecieron iguales. Los doce chunks actuales y las releases históricas se conservaron.
