# CHECKPOINT BANUCHAT — OE1-D5.5C

Fecha: 29 de octubre de 2026, America/Bogota.
Estado: **GOLD_AUDIT_SECOND_BLOCK**.

## Preflight e integridad

- Rama `main`; HEAD inicial `f02e2ed1b10e094557be0ac2d630ea0471fb61b9`; árbol de trabajo inicial limpio. Se leyeron `AGENTS.md`, los checkpoints D5.5A/D5.5B, el auxiliar de auditoría y sus pruebas, y el assessment privado definitivo D5.5B.
- Benchmark conservado: SHA-256 `810794a83b40eb95a064532283cb9f7f59a6137b984f730952ed60f662ee2324`, 45 casos distintos, 41 remapeos históricos y cuatro nuevos de cobertura, 65 referencias gold y estado `assembled_pending_gold_audit`.
- Assessment D5.5B conservado: SHA-256 `32aa8c540785f46ddf9788f0f11104238d0df9788803f859d3f5ae7ecf990df5`. Sus 12 resultados y su lista definitiva de 33 pendientes se verificaron antes de seleccionar. No se usó el corte automático preliminar como lista de pendientes.
- Los seis bancos y seis ledgers conservan sus hashes. El ensamblaje reproducido en memoria con la fecha original coincide íntegramente con el benchmark y sus referencias de aprobación. Se registró además una línea base de 25 archivos privados protegidos, incluidos los artefactos D5.5B, para comprobar su conservación al cierre.
- PostgreSQL Unified se verificó exclusivamente con `REPEATABLE READ READ ONLY`, comprobando `transaction_read_only=on`: release current `10af4ffd-effb-41fc-bbfe-4dc48cb3398f`, contrato `ccd-1.4.0`, estado `ready` y manifest `fde23cabe95c83f5bd632d129312ad68c90624e6ebd489e79e98c6a3d0d96852`. Se inspeccionaron contenedor, volumen y puerto existentes sin modificar Docker.
- Las 107 versiones/chunks tienen embedding y artefactos locales idénticos por hash y contenido a lo publicado. Las 65 referencias gold resolvieron exactamente por clave, versión, chunk, ordinal, localizador, ruta y SHA-256. Estas comprobaciones acreditan integridad; no demuestran completitud semántica.

## Selección e inspección

Se seleccionaron **exactamente 17 IDs distintos**, todos pertenecientes a los 33 pendientes definitivos, sin intersección con los 12 examinados en D5.5B. La selección privada es reproducible mediante una tupla descendente: señal de inferencia, confirmación de dominio, tensión documental, mezcla de alcance agrupada, varias afirmaciones, diversidad de familias todavía no representadas en el bloque, cantidad de contextos, soporte alternativo y prioridad previa; desempate por ID ASCII ascendente. La lista de IDs, orden y motivos se conserva solo en el reporte privado.

La selección cubre **seis familias documentales**. Las señales se interpretaron después del cotejo: procedencia de dominio no significa automáticamente dependencia material y etiquetas distintas pueden describir la misma edición. No se sumaron señales correlacionadas como errores independientes.

Para cada caso se examinaron pregunta y referencia completas, sus contextos, procedencia, periodos, población, condiciones, excepciones y alternativas publicadas. Se cotejaron 13 fuentes documentales originales autorizadas, dos transcripciones de fuente del bundle y registros de dominio; se revisaron visualmente 25 páginas PDF pertinentes. Los pasajes DOCX se resolvieron con la convención de párrafos no vacíos numerados desde uno. Las coincidencias de extracción se usaron como control de lectura, junto al original; no como prueba de suficiencia o completitud.

El assessment y el paquete distinguen expresamente **suficiencia**, **completitud** y **procedencia** por caso y contrastan cada afirmación verificable. Se compararon soportes alternativos del inventario de 107 unidades y se descartaron coincidencias de vocabulario que no respaldaban la afirmación examinada. No se usaron respuestas o rankings del producto.

## Resultados del segundo bloque

| Clasificación | Casos nuevos |
| --- | ---: |
| `SIN_PROBLEMA_DETECTADO_EN_ESTA_REVISION` | 8 |
| `REQUIERE_REVISION_DEL_AUTOR` | 7 |
| `POSIBLE_CORRECCION_VERSIONADA` | 2 |
| `CONFLICTO_DOCUMENTAL` | 0 |
| **Total** | **17** |

Hay **nueve casos nuevos con atención pendiente del autor**. Se constataron **tres brechas de especificidad de soporte en dos casos**: ciertos detalles de las referencias están expresos en los originales y en otras unidades publicadas, pero no explícitos en los resúmenes gold seleccionados. Son tres observaciones por afirmación agrupadas en una causa de pérdida de detalle; no se cuentan como tres causas independientes. No se demostró falsedad factual de las referencias ni se decidió automáticamente que una inferencia desde el resumen sea inválida. Los dos casos quedan como posibles correcciones versionadas, pendientes de decisión del autor.

Los demás riesgos abiertos incluyen relevancia de soportes parciales o equivalentes, alcance de una edición frente a disponibilidad actual y la categoría metodológica de un caso de límite de evidencia. La adecuación de ese caso al denominador respondible debe decidirse expresamente; no se reclasificó ni se cambió la muestra. No se demostraron errores nuevos de procedencia ni conflictos documentales nuevos sin resolver. Tampoco se demostró una duplicación semántica que autorice eliminar o fusionar casos.

Los ocho casos sin problemas detectados conservan sus aprobaciones previas; este resultado es acotado y no valida definitivamente el gold. La política global de relevancia continúa pendiente, incluso cuando el contenido de una respuesta está suficientemente sustentado.

## Causas compartidas y resultados anteriores

La agrupación privada propone organizar el trabajo por pérdida de detalle en resúmenes, soportes alternativos, límites históricos, alcance de confirmaciones de dominio y atribución a ediciones. Relaciona esos grupos con hallazgos D5.5B sin reescribirlos. También distingue una alerta sintáctica de etiquetas equivalentes de una mezcla temporal real y mantiene separada una decisión sobre categoría de caso y denominador.

Compartir causa o documento no fusiona preguntas con decisiones académicas independientes. Los conflictos y el desajuste de procedencia registrados en D5.5B siguen pendientes en sus términos originales; la ausencia de conflictos nuevos no los resuelve. No se volvieron a inspeccionar sus 12 casos completos.

**Acumulado: 29 casos inspeccionados documentalmente y 16 pendientes.** Las clasificaciones acumuladas, conservando D5.5B, son 11 sin problema detectado, 12 que requieren revisión del autor, cuatro posibles correcciones versionadas y dos conflictos documentales. Hay 18 casos examinados con observaciones para el autor; esto es distinto de los 16 todavía no inspeccionados.

## Artefactos privados

Los nuevos archivos están bajo `data/ccd/local/oe1-evaluation/`, ignorados por Git; ninguno sobrescribe D5.5B:

| Archivo | SHA-256 |
| --- | --- |
| `gold-review-assessment-ccd-1.4.0-d5-5c-v1.json` | `c17bafa7c9774510706c63a7d50b67b5c685bcc875d5b9b50d66a096cd76c509` |
| `author-gold-review-packet-ccd-1.4.0-d5-5c-v1.md` | `74272039608f5eb03da22fa299456327036243e62c24c88dceb4f0720c5a0259` |
| `gold-review-index-ccd-1.4.0-through-d5-5c-v1.json` | `d610e5889bfa0bb4702a775d2c5aa1234af67d286a6d93571ba37f75c7b4a9f3` |

El índice contiene los 45 IDs, identifica el bloque de inspección, conserva la clasificación original y enlaza el resultado por archivo y hash. Las 16 entradas pendientes no tienen una clasificación semántica inventada. El paquete conserva preguntas, referencias y gold exactos, e indica evidencia, alternativas, problemas observados, riesgos y acción concreta solicitada al autor. Los extractos, hashes de fuentes, páginas pertinentes y scripts privados de preparación quedan en archivos nuevos del mismo directorio, incluido `d5-5c-source-review-v1/`.

## Validación y alcance siguiente

- Comprobaciones sintéticas privadas de selección: determinismo, no mutación de entrada, prioridad de inferencia, exclusión del bloque anterior y partición 17/16; sin errores.
- Tres comprobaciones sintéticas de extracción: numeración de párrafos no vacíos y comparación de espacios; sin errores.
- Comprobaciones finales de integridad, índice, contenido del paquete, exclusión de Git y conservación de los 25 archivos protegidos: sin diferencias. El benchmark y sus fuentes mantienen sus hashes.
- No se introdujo código versionable; el auxiliar y las pruebas de D5.5B permanecen intactos. El único archivo nuevo versionable es este checkpoint. `git diff --check` y comprobación de whitespace del archivo nuevo: sin errores.

Alcance propuesto para **D5.5D**: verificar los hashes del benchmark, assessments e índice; inspeccionar exclusivamente los 16 IDs pendientes del índice; luego consolidar el estado de auditoría sin sobrescribir resultados anteriores. Deben mantenerse separados el cierre de observaciones del autor, la política de relevancia y las decisiones académicas sobre muestra, MRR@5 y camino documental medido. Persisten revisión solo por el autor, ausencia de reserva ciega y ratificación institucional, y la limitación conocida de `AnswerRelevancy`. No hay aceptación académica simulada.

No se modificaron benchmark, contextos gold, bancos, ledgers, fuentes originales, PostgreSQL, Docker, releases, producto, RAG, modelos, embeddings, prompts, `top_k`, runner ni validador. No se ejecutaron retrieval, generación, baseline o RAGAS. No hubo commit ni push. Se detuvo el trabajo antes de inspeccionar los 16 casos restantes, congelar o generar otra versión del benchmark.
