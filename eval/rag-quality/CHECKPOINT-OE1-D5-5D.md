# CHECKPOINT BANUCHAT — OE1-D5.5D

Fecha: 29 de octubre de 2026, America/Bogota.
Estado: **GOLD_AUDIT_ALL_45_EXAMINED_PENDING_RESOLUTION**.

## Preflight e integridad

- Rama inicial `main`; HEAD `f44a594fbdd9ca0cebe43b73d3c162515ade5bc8`; árbol de trabajo inicial limpio. Se leyeron `AGENTS.md`, D5.5A, D5.5B, D5.5C, los assessments definitivos B/C, el índice acumulado C y el protocolo académico OE1.
- Coincidieron los cuatro SHA-256 requeridos: benchmark `810794a83b40eb95a064532283cb9f7f59a6137b984f730952ed60f662ee2324`; assessment B `32aa8c540785f46ddf9788f0f11104238d0df9788803f859d3f5ae7ecf990df5`; assessment C `c17bafa7c9774510706c63a7d50b67b5c685bcc875d5b9b50d66a096cd76c509`; índice C `d610e5889bfa0bb4702a775d2c5aa1234af67d286a6d93571ba37f75c7b4a9f3`.
- Se comprobaron 45 casos y 45 IDs únicos, 65 referencias gold, 12 resultados B, 17 resultados C y exactamente 16 pendientes, sin duplicaciones entre bloques. Los seis bancos y seis ledgers conservaron sus hashes; la reproducción en memoria del ensamblaje coincide íntegramente con el benchmark y sus referencias a las 45 decisiones humanas anteriores. No se reconstruyeron decisiones ni se autenticó identidad civil mediante la coincidencia de identificadores.
- PostgreSQL Unified se consultó en transacción `REPEATABLE READ READ ONLY`, comprobando `transaction_read_only=on`. Release current `10af4ffd-effb-41fc-bbfe-4dc48cb3398f`, contrato `ccd-1.4.0`, estado `ready`, manifest `fde23cabe95c83f5bd632d129312ad68c90624e6ebd489e79e98c6a3d0d96852`. La inspección del contenedor, volumen y puerto existentes no modificó Docker.
- Las 107 versiones/chunks tienen embedding y coinciden por hash y contenido con los artefactos locales. Las 65 referencias resolvieron por clave, versión, chunk, ordinal, localizador, ruta y SHA-256. La identidad y los hashes no demuestran completitud semántica.

## Inspección de los últimos 16

Se utilizaron exclusivamente las entradas `PENDING` del índice D5.5C y se mantuvo su orden. No hubo nueva priorización, sustitución o repetición de los 29 casos anteriores.

Se examinaron preguntas y referencias completas, afirmaciones verificables, todos los gold y originales autorizados, periodos, población, condiciones y excepciones. Se cotejaron siete fuentes originales y 19 páginas PDF pertinentes, con revisión visual y verificación de localizadores y hashes. Se verificaron 150 correspondencias de extracción de pasajes, usadas como control de identidad y lectura. El espacio de comparación de soportes alternativos fue el inventario actual de 107 unidades; las coincidencias de términos se contrastaron por contenido y se descartaron cuando correspondían a otro asunto.

El assessment separa **suficiencia**, **completitud** y **procedencia** por caso. Distingue aportes parciales, posibles soportes equivalentes y contextos que no sustituyen una afirmación concreta. No se demostró un contexto gold irrelevante que autorice eliminarlo automáticamente. Las posibles redundancias se conservaron como decisiones individuales pendientes.

## Clasificaciones

| Clasificación | D5.5D: 16 nuevos | Acumulado: 45 |
| --- | ---: | ---: |
| `SIN_PROBLEMA_DETECTADO_EN_ESTA_REVISION` | 8 | 19 |
| `REQUIERE_REVISION_DEL_AUTOR` | 5 | 17 |
| `POSIBLE_CORRECCION_VERSIONADA` | 3 | 7 |
| `CONFLICTO_DOCUMENTAL` | 0 | 2 |
| **Total** | **16** | **45** |

**Pendientes de inspección: cero. Casos con observaciones para intervención del autor: 26. Casos sin problema detectado en el alcance revisado: 19.** Estos últimos no necesitan una nueva revisión íntegra sin un motivo nuevo y no se convierten en aprobación global del gold.

Las 12 categorías B y las 17 categorías C se conservaron exactamente. La matriz contiene cada resultado original íntegro, su assessment, SHA-256 de archivo y hash del objeto de resultado. La finalización de la lectura no resuelve ninguno de sus hallazgos anteriores.

## Observaciones demostradas y riesgos pendientes

- Se conserva **un desajuste demostrado de procedencia** de B, pendiente de resolución. No se identificaron desajustes nuevos de ese tipo en D.
- D añade **tres observaciones de especificidad en tres casos**. En el conjunto hay **siete observaciones de especificidad en seis casos**: detalles expresos en originales u otras unidades no están explícitos en los gold seleccionados. Esto no demuestra falsedad de las referencias ni obliga automáticamente a corregirlas; debe juzgarse si la paráfrasis o inferencia resulta suficiente. Los tres casos nuevos permanecen como posibles correcciones versionadas.
- Se preservan **tres variantes documentales observadas** en resultados anteriores, incluidas las que tienen precedencia definida solo al alcance de proyecto. Las categorías originales mantienen dos casos de conflicto y un caso de revisión con diferencia de fuentes. No se demostró un conflicto documental nuevo en D ni se otorgó interpretación institucional a una decisión del proyecto.
- Siguen abiertos suficiencia interpretativa de algunos resúmenes, exhaustividad esperada de una respuesta, política de unidades relevantes/equivalentes, límites de edición y actualidad, categoría de un caso de límite de evidencia y posible solapamiento conceptual. No se demostró una duplicación semántica que autorice eliminar o fusionar casos.

Los conteos de observaciones describen tipos y afirmaciones; no se suman como errores independientes. Una misma pregunta puede tener procedencia y conflicto asociados. El registro privado distingue las observaciones contrastadas de los riesgos interpretativos.

## Matriz global y paquete del autor

Se organizaron siete causas compartidas: procedencia, pérdida de detalle, soportes alternativos, variantes documentales, periodo/población, confirmación de dominio/inferencia y clasificación/redundancia. Cada grupo conserva miembros y acciones individuales; también distingue casos correctamente acotados que no requieren reabrir su revisión.

El paquete final presenta una sola vez las observaciones y los pasajes de evidencia. Un catálogo privado asigna identidad, hash y localizador a cada referencia y permite navegar por caso. Hay una solicitud concreta por cada uno de los 26 casos con atención, con enlaces al resultado original y evidencia; los 19 sin problema detectado se listan sin una solicitud de reaprobación. Las decisiones metodológicas se muestran separadas de los dictámenes documentales. La agrupación facilita revisar los hallazgos sin repetir íntegramente las 45 preguntas y no constituye una aprobación por lote.

Los nuevos artefactos están exclusivamente bajo `data/ccd/local/oe1-evaluation/` e ignorados por Git:

| Artefacto | SHA-256 |
| --- | --- |
| `gold-review-assessment-ccd-1.4.0-d5-5d-v1.json` | `e07d836f69b2014b12e3b2df1cfb29096dc4c9be36bfdc5cd0308857db23ee86` |
| `gold-review-index-ccd-1.4.0-through-d5-5d-v1.json` | `2d45452e8ed6a90e749f380124573ea537be13eb7df6bb56288081649297cfe2` |
| `gold-review-global-matrix-ccd-1.4.0-d5-5d-v1.json` | `e027cecabba7614c36fa0dccd9769e7879e828aed292dfbe8f2fdd52da569ea5` |
| `author-gold-review-final-packet-ccd-1.4.0-d5-5d-v1.md` | `56946252e69a6ba905bc93df789f4452f119cb35c2f70628118044ba846fbbb0` |
| `artifacts-manifest-d5-5d-v1.json` | `0ca75580bebb646caa6ec77d1dcdc73526eac692b4b3aa76aa08d164b70f975a` |

El manifest registra SHA-256 y tamaño de los 39 archivos privados nuevos restantes, incluidos catálogo, auxiliares, pruebas, extractos y páginas pertinentes. Este checkpoint ancla el hash del propio manifest para evitar una referencia circular. Las referencias a assessments y paquetes B/C permanecen en los artefactos nuevos; no se sobrescribieron esos archivos.

## Decisiones y alcance de resolución pendientes

Antes de congelar siguen pendientes:

1. Aceptación académica de la muestra de 45 casos y sus límites de cobertura, con 41 remapeados, cuatro nuevos y nueve históricos no reconstruidos.
2. Política de conjuntos relevantes o equivalentes para Precision@5, Recall@5 y MRR@5, seguida de adjudicación individual.
3. Pertinencia de casos de límite de evidencia en el denominador y expectativas de exhaustividad de referencias.
4. Dictámenes específicos y posibles correcciones versionadas, conservando historial y revisión de cualquier cambio.
5. Interpretación institucional de contradicciones y ratificación formal del corpus.
6. MRR@5 como operacionalización de la meta original.
7. Suficiencia del juez RAGAS, preservando la limitación conocida de `AnswerRelevancy` de 7/12 coincidencias técnicas.
8. Alineación y declaración del camino medido frente a `ccd-knowledge` actual.

Persisten revisión humana únicamente por el autor y ausencia de reserva verdaderamente ciega. No se inventó aceptación académica, revisión independiente ni aval institucional.

Alcance recomendado para la siguiente tarea: resolver los 26 casos con observaciones mediante el paquete y sus causas compartidas; separar políticas académicas de juicios documentales; registrar motivos específicos y decidir si hacen falta nuevas versiones. Una resolución compartida no sustituye el dictamen por caso. Los 19 casos restantes no requieren repetición de lectura sin evidencia nueva. No iniciar correcciones, integración del evaluador, congelación o evaluación desde este checkpoint.

## Validación y límites de ejecución

- Pruebas Node con fixtures completamente sintéticos: **4/4**; orden exacto del índice, exclusión de inspeccionados, consolidación sin pérdida o mutación, rechazo de duplicados/faltantes/IDs ajenos/categorías inventadas y una solicitud por caso sin reaprobación rutinaria.
- Tres comprobaciones sintéticas de normalización y localizador antes de la extracción: sin errores.
- Verificación independiente final: 45 IDs inspeccionados, cero pendientes, resultados originales preservados 12/17/16, enlaces y hashes del índice/matriz correctos y una acción por caso con observación. Los 66 archivos protegidos del preflight conservaron sus hashes, al igual que los siete originales examinados y los 107 artefactos del corpus. El benchmark histórico conserva su hash anterior.
- `git diff --check` y comprobación de whitespace del archivo nuevo: sin errores. El único archivo nuevo versionable es este checkpoint; auxiliares y datos detallados permanecen privados.

No se modificaron benchmark, sus 65 referencias, bancos, ledgers, assessments o paquetes anteriores, fuentes originales, PostgreSQL, Docker, releases, producto, modelos, embeddings, prompts, `top_k`, runner ni validador. No se ejecutaron retrieval, generación, baseline ni RAGAS. No se registraron decisiones humanas nuevas, commit o push. Se detuvo el trabajo con resolución pendiente.
