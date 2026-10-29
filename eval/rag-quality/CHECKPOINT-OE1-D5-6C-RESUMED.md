# CHECKPOINT BANUCHAT — OE1-D5.6C reanudado

Fecha: 29 de octubre de 2026, America/Bogota.
Estado: **VERSIONED_GOLD_CORRECTIONS_PROPOSED_PENDING_AUTHOR_REVIEW**.

## Antecedente e integridad

Rama inicial `main`; HEAD `6e882eefe4fd3078aab16ae550821f251cc9a3f8`. El estado inicial contenía únicamente `?? eval/rag-quality/CHECKPOINT-OE1-D5-6C.md`, antecedente BLOCKED de la ejecución anterior. Se conservó sin editar ni sustituir, con SHA-256 `4d36b570eabd7045e9db836fcded332ad0ec92a7d1e67838793b65be4960ad74`.

Se leyeron el antecedente, `AGENTS.md`, D5.5D, D5.6A y D5.6B, los insumos privados y el auxiliar de preflight existente. Este último conserva SHA-256 `1c50b54bf78579d8819fdc6726665c8d36335d63e51e0fb578ebad56df5d7ce1`; se reutilizó sin modificarlo. La ejecución bloqueada no había producido snapshot ni propuestas. Los nuevos destinos se comprobaron inexistentes y se escribieron con `wx`.

Coincidieron los hashes requeridos:

| Insumo | SHA-256 |
| --- | --- |
| Benchmark CCD 1.4.0 v1 | `810794a83b40eb95a064532283cb9f7f59a6137b984f730952ed60f662ee2324` |
| Ledger de resoluciones D5.6B | `0e76b531d9bbf7f02dc0bbfad4adbef8b8b42c91e1346c48abf3b4d6e4ff0773` |
| Resumen D5.6B | `b47a6344bffcdc070b7390ae0a31c317a3446d5f853d7979dd4e0380ce2bd558` |
| Matriz global | `e027cecabba7614c36fa0dccd9769e7879e828aed292dfbe8f2fdd52da569ea5` |
| Hoja D5.6A | `3b159d5f5f1efe40eb6bb5b56b132ba7093826e78b907446d8f8e393a07ddf74` |
| Traza D5.6A | `abe0ecc954fa31ee8046e65972d840805e5ed4f18959d8720671441189b32ca4` |

Se verificaron 45 casos, 65 referencias, ocho eventos de resolución y exactamente seis autorizaciones `CORRECCION_VERSIONADA_REQUERIDA`, para 023, 030, 039, 044, 047 y 049. Los eventos se enlazan por línea y SHA-256, además del hash del caso y del resultado de auditoría original. Los seis bancos, seis ledgers iniciales, ledger D5.6B, assessments y paquetes anteriores conservaron sus hashes. No se reconstruyeron decisiones humanas ni se importaron aprobaciones como aceptación de contenido revisado.

## PostgreSQL y publicación

El contenedor existente `banuchat-unified-postgres` se encontró en ejecución; se verificaron volumen `banuchat-unified-data` y puerto 55463 mediante inspección de solo lectura. No se inició, recreó ni modificó ningún servicio.

Se reutilizó el acceso privado existente en memoria, sin imprimir credenciales. La consulta SQL se ejecutó en transacción `REPEATABLE READ READ ONLY`, con `transaction_read_only=on`, y terminó con `ROLLBACK`. Release current `10af4ffd-effb-41fc-bbfe-4dc48cb3398f`, contrato `ccd-1.4.0`, estado `ready`, manifest `fde23cabe95c83f5bd632d129312ad68c90624e6ebd489e79e98c6a3d0d96852`: todos coinciden con el benchmark.

Las 107 unidades publicadas están listas, tienen embedding y coinciden byte por byte y por SHA-256 con sus artefactos locales. Las 65 referencias originales resolvieron por clave, versión, chunk, ordinal, localizador, ruta y hashes. No hubo consulta vectorial, ranking ni consulta de evaluación.

## Seis propuestas privadas

| Caso técnico | Operación propuesta | Preparación |
| --- | --- | --- |
| 023 | A: ampliar contextos, conservando pregunta y referencia | Completa documentalmente |
| 030 | B: acotar referencia a evidencia publicada | Completa documentalmente |
| 039 | B: acotar referencia a evidencia publicada | Completa documentalmente |
| 044 | B y C: acotar referencia y reformular explícitamente la pregunta | Completa documentalmente |
| 047 | A: ampliar contextos, conservando pregunta y referencia | Completa documentalmente |
| 049 | A: ampliar contextos y presentar alternativas de relevancia | Condicionada por política global |

Conteos de las propuestas principales: **tres cambios de conjuntos de contextos, cinco referencias añadidas distintas, tres cambios de respuesta y un cambio de pregunta**. Las operaciones se solapan en un caso; no son intercambiables. Cinco propuestas están completas documentalmente para revisión; una conserva una dependencia explícita de política. Ninguna está aprobada o implementada.

Se examinaron los contenidos de las 107 unidades como espacio de comparación, limitando el juicio semántico a los seis casos autorizados. La búsqueda de términos se usó como navegación y se contrastó por contenido, periodo y entidad. Para tres casos no se identificó una unidad publicada que restituyera el detalle cuestionado con el alcance requerido; se prepararon alternativas textuales acotadas. Esto no afirma falsedad del original. Se cotejaron hashes de seis fuentes originales autorizadas sin modificarlas; los pasajes de auditoría archivados se identifican como comparación, sin convertirlos en contextos recuperables.

El paquete muestra antes/después, afirmaciones conservadas y retiradas, justificación por afirmación, identidades completas, contenido publicado, procedencia, periodos, población, condiciones y excepciones. Conserva todos los contextos originales pertinentes. La reformulación del 044 reconoce expresamente la pérdida de exigencia relacional y el posible solapamiento con otros casos; requiere aceptación individual del autor.

En 049, las tres adiciones documentadas se separan de unidades alternativas o complementarias pendientes de adjudicación. Se muestran combinaciones suficientes candidatas sin equipararlas a un conjunto exhaustivo de unidades relevantes. Una política más amplia puede producir conjuntos de seis o siete contextos y limitar el máximo posible de Recall@5; no se descarta evidencia pertinente para ocultar esa consecuencia. Ninguna política global se considera resuelta.

## Artefactos nuevos y trazabilidad

Todos los archivos detallados están exclusivamente bajo `data/ccd/local/oe1-evaluation/` e ignorados por Git:

| Archivo | SHA-256 |
| --- | --- |
| `gold-corrections-preflight-ccd-1.4.0-d5-6c-v1.json` | `ffa8705b92240ba5d8701be104cc81bb16e44579768f02ece9ade7245695b649` |
| `gold-correction-proposals-ccd-1.4.0-d5-6c-v1.json` | `6b50dceb0a0a806e142a13aca700c5b245f341aab1db0f9004b61621b4f663b0` |
| `author-gold-corrections-review-ccd-1.4.0-d5-6c-v1.md` | `574772e1cef1873f2e67ae621586c5f29488a071548dbbf3ee61d308b5cd7ffd` |
| `gold-correction-proposals-resume-manifest-d5-6c-v1.json` | `2b0a5d2d38ad158a238d0da806f4f6b0ae5c673c3800f83a24d4ca32b13871f6` |

El manifest registra hashes y tamaños de los otros seis archivos nuevos: preflight, propuestas, paquete y tres auxiliares privados de preparación/validación/pruebas. También ancla el antecedente BLOCKED, el auxiliar anterior, 174 verificaciones de archivos protegidos —incluidos corpus y benchmark histórico— y seis fuentes originales. Su propio hash se ancla en este checkpoint para evitar circularidad.

El patch semántico contiene exactamente seis entradas `proposal_pending_author_review`, sin aprobación humana y sin implementación. Los hashes de archivos usan bytes originales; los de caso/resultado usan `JSON.stringify` del objeto original y los de evento los bytes de su línea JSONL sin terminador. No es una nueva versión del benchmark y no contiene un mecanismo de aplicación.

## Validación y decisión requerida

- Pruebas Node completamente sintéticas: **4/4**. Formato de seis propuestas sin mutación; rechazo de casos/operaciones no autorizados, duplicados, aprobación copiada, decisión incompatible, hash de caso alterado, identidades inventadas, release anterior, localizadores/hashes alterados, eliminación de soporte y alternativas sin identidad.
- Comprobación de sintaxis del generador: sin errores.
- Verificación independiente real: seis IDs únicos correctos, vínculo exacto a sus eventos, conteos 3/5/3/1, referencias añadidas de la release verificada, hashes de propuestas y manifest correctos, siete archivos nuevos privados ignorados. Los 174 controles de archivos y las seis fuentes originales conservaron sus hashes.
- `git diff --check` y control de whitespace de ambos checkpoints no versionados: sin errores. El checkpoint BLOCKED preexistente permanece idéntico; el único archivo versionable añadido por esta reanudación es este checkpoint.

El autor debe revisar cada ficha y resolver el contenido propuesto, la pérdida de especificidad y dificultad, y las alternativas de relevancia. Una ratificación posterior requerirá registro propio; este trabajo no la simula. Los casos 010 y 017, los otros 37 y los seis casos originales siguen intactos. Los 18 casos sin dictamen previo no recibieron decisiones nuevas.

Persisten ausencia de ratificación institucional formal, revisión independiente y reserva ciega, así como decisiones pendientes sobre muestra, MRR@5, política de relevantes, alineación del camino evaluado y suficiencia del juez `AnswerRelevancy` con la limitación previa 7/12. No se declara congelación ni preparación para baseline.

No se modificaron benchmark v1 ni sus 65 referencias, bancos, ledgers, assessments, fuentes, corpus, releases, PostgreSQL, Docker, producto, RAG, modelos, embeddings, prompts, `top_k`, runner o validador. No se ejecutaron retrieval, generación, baseline ni RAGAS. No se creó benchmark v2, decisión humana nueva, commit o push. Se detuvo el trabajo con las seis propuestas pendientes de revisión del autor, sin aplicar el patch ni avanzar a D5.6D.
