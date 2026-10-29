# CHECKPOINT BANUCHAT — OE1-D5.6A

Fecha: 29 de octubre de 2026, America/Bogota.
Estado: **READY_FOR_AUTHOR_RESOLUTION_BATCH_1**.

## Integridad y alcance

- Rama inicial `main`; HEAD `dc6830af9a27a5f9ddd6e7bbc1098bb4e7d976a2`; estado Git inicial limpio. Se leyeron `AGENTS.md` y los checkpoints D5.5A, D5.5B, D5.5C y D5.5D.
- Benchmark verificado: SHA-256 `810794a83b40eb95a064532283cb9f7f59a6137b984f730952ed60f662ee2324`.
- Matriz global verificada: SHA-256 `e027cecabba7614c36fa0dccd9769e7879e828aed292dfbe8f2fdd52da569ea5`.
- Paquete final verificado: SHA-256 `56946252e69a6ba905bc93df789f4452f119cb35c2f70628118044ba846fbbb0`.
- Se confirmaron 45 casos inspeccionados, 19 sin problemas detectados y 26 con observaciones. Los seis bancos y seis ledgers conservan sus hashes. Los resultados originales de B/C/D coinciden con los objetos y hashes registrados en la matriz; no se cambiaron categorías.
- La preparación utiliza la matriz, los assessments, paquetes y catálogo de evidencia existentes, y el benchmark para reproducir los casos. Se verificaron 23 archivos de entrada protegidos. No se repitió la auditoría ni se recorrieron las 107 unidades; no se consultaron PostgreSQL, Docker o servicios del producto.

## Primera tanda

Se priorizaron **ocho IDs únicos**, en este orden:

1. `OE1-CCD-14-C-010`
2. `OE1-CCD-14-C-017`
3. `OE1-CCD-14-C-044`
4. `OE1-CCD-14-C-049`
5. `OE1-CCD-14-C-047`
6. `OE1-CCD-14-C-023`
7. `OE1-CCD-14-C-030`
8. `OE1-CCD-14-C-039`

Los IDs son identificadores técnicos sin texto documental o datos personales. Las preguntas, referencias, evidencia y motivos específicos permanecen exclusivamente en los archivos privados.

| Clasificación original de la tanda | Casos |
| --- | ---: |
| `POSIBLE_CORRECCION_VERSIONADA` | 6 |
| `CONFLICTO_DOCUMENTAL` | 2 |
| **Total** | **8** |

La selección cubre el caso con desajuste demostrado de procedencia, los seis casos con siete observaciones de pérdida de especificidad y los dos casos clasificados como conflicto. El caso de procedencia ya forma parte de los dos conflictos: aparece una sola vez y conserva ambas observaciones. También se conservan juntas las dos observaciones de especificidad que afectan otro ID único.

Se priorizó el impacto sobre la atribución y suficiencia de afirmaciones, según el diagnóstico existente. Las brechas de especificidad no prueban automáticamente falsedad ni obligan a corregir; la suficiencia por paráfrasis o inferencia sigue siendo una decisión del autor. Los conflictos no se convierten en decisiones institucionales. La posible corrección por alcance/secuencia que no corresponde a una brecha de especificidad queda para otra tanda, con su categoría intacta.

**Quedan 18 casos para tandas posteriores. Los 26 casos con observaciones continúan pendientes de resolución humana**, incluidos los ocho preparados ahora. Los 19 sin problemas detectados no se seleccionaron por rutina. La traza contiene la lista explícita de los 18 y sus assessments de origen.

## Hoja y trazabilidad privadas

Ambos archivos nuevos están bajo `data/ccd/local/oe1-evaluation/` e ignorados por Git:

| Archivo | SHA-256 |
| --- | --- |
| `author-gold-resolution-batch-1-ccd-1.4.0.md` | `3b159d5f5f1efe40eb6bb5b56b132ba7093826e78b907446d8f8e393a07ddf74` |
| `author-gold-resolution-batch-1-ccd-1.4.0-trace-v1.json` | `abe0ecc954fa31ee8046e65972d840805e5ed4f18959d8720671441189b32ca4` |

Cada ficha incluye pregunta y referencia exactas, identidades y hashes de los gold actuales, contenido ya archivado o enunciado conservado en el banco, procedencia, periodo, población, condiciones, excepciones, hallazgos y afirmaciones afectadas, evidencia y alternativas ya valoradas. Distingue consecuencias de conservar el gold, propuestas de modificación futura y decisión concreta solicitada. Las evidencias compartidas se reproducen una sola vez en el anexo de la tanda.

Se muestran **32 casillas sin marcar**, cuatro por caso: `CONSERVAR_GOLD`, `CORRECCION_VERSIONADA_REQUERIDA`, `ACLARACION_INSTITUCIONAL_REQUERIDA` y `DECISION_METODOLOGICA_PENDIENTE`. Todos los espacios de dictamen, motivo, cambio, evidencia, responsable, fecha y firma están sin completar. No se creó un ledger de decisiones ni un evento humano afirmativo.

La traza registra selección, orden, motivo de prioridad, clasificación original, assessment, hash de archivo y resultado, observaciones agrupadas, evidencias y estado `pending_author_resolution`. También distingue los 18 siguientes de los 26 todavía pendientes en total. Las propuestas están identificadas como preparación de Codex y no como dictámenes del autor o del director.

## Decisiones metodológicas separadas

La hoja ofrece opciones y consecuencias técnicas, pendientes de adopción, para:

- Unidades relevantes frente a gold mínimo y conjuntos suficientes alternativos. Distingue expresamente suficiencia de respuesta, relevancia para ranking y combinaciones de evidencia; no equipara esos tres conceptos.
- Casos de límite de evidencia dentro del denominador respondible o en un conjunto complementario.
- Aceptación académica de la muestra de 45 y sus límites de cobertura, revisión y reserva.
- MRR@5 y profundidad evaluativa, sin modificar `top_k` productivo.
- Objeto de evaluación y alineación con `ccd-knowledge`.
- Calibración y suficiencia del juez RAGAS, conservando la limitación conocida de `AnswerRelevancy`.

No se atribuyó aceptación al director ni se resolvió una política mediante una corrección de respuesta.

## Validación y siguiente acción humana

- Pruebas sintéticas privadas: **3/3**. Comprueban selección válida sin mutar categorías, rechazo de IDs ajenos/duplicados/casos sin observación o más de ocho, recuperación de contextos archivados y ausencia de opciones o datos humanos prellenados.
- Verificación real de la hoja: ocho fichas, 32 opciones sin marcar, ocho espacios vacíos de responsable y fecha, preguntas/referencias reproducidas exactamente y todas las observaciones de los ocho casos conservadas.
- Los insumos protegidos mantuvieron sus hashes y los archivos nuevos están ignorados por Git. `git diff --check` y comprobación de whitespace del checkpoint nuevo: sin errores. Los auxiliares de preparación y pruebas son privados; el único archivo nuevo versionable es este checkpoint.

Siguiente acción: el autor debe abrir la hoja, conservar la plantilla y su hash de referencia, y completar una copia de trabajo caso por caso. Debe seleccionar un dictamen, justificarlo con evidencia/localizador y completar personalmente responsable y fecha real. Si no dispone de autoridad o política suficiente, debe dejar expresada esa dependencia. Una solicitud de corrección no ejecuta cambios ni traslada aprobaciones a otra versión.

El benchmark, sus 65 referencias, bancos, ledgers, assessments y paquetes anteriores permanecen intactos. No se creó otra versión del benchmark ni se modificaron producto, PostgreSQL, Docker, releases, modelos, embeddings, prompts, `top_k`, runner o validador. No se ejecutaron retrieval, generación, RAGAS o baseline, ni se registraron decisiones humanas, commit o push. Detenerse en la preparación de esta tanda.
