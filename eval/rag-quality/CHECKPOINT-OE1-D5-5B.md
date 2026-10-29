# CHECKPOINT BANUCHAT — OE1-D5.5B

Fecha: 29 de octubre de 2026, America/Bogota.
Estado: **GOLD_AUDIT_PARTIAL**.

## Preflight e integridad

- Rama `main`; HEAD inicial `113cb395f4abc97a7b6bb23ee4f985c856f19d4b`; estado Git inicial limpio. Se leyeron `AGENTS.md`, D5.5A, el protocolo académico OE1, el ensamblador y sus pruebas.
- El benchmark privado conserva SHA-256 `810794a83b40eb95a064532283cb9f7f59a6137b984f730952ed60f662ee2324`: **45 casos y 45 IDs únicos**, 41 `historical_remap`, cuatro `new_coverage_case` y 65 referencias gold. Su estado sigue `assembled_pending_gold_audit`.
- Se releyeron los seis bancos y seis ledgers y se reprodujo en memoria el ensamblaje con su fecha original: coincidencia completa con el benchmark, incluidos contenido y referencias a los eventos humanos. Los 12 hashes coinciden con D5.5A; permanecen las 45 aprobaciones anteriores, sin nuevas decisiones. El benchmark histórico CCD 1.2.0 conserva SHA-256 `1e007142c2a573d9f2e4403e28b8eaae7dfe03cd31d1a514ee97423a7617609e`.
- PostgreSQL Unified confirmó mediante transacción `REPEATABLE READ READ ONLY` y comprobación de `transaction_read_only=on`: release current `10af4ffd-effb-41fc-bbfe-4dc48cb3398f`, contrato `ccd-1.4.0`, estado `ready` y manifest `fde23cabe95c83f5bd632d129312ad68c90624e6ebd489e79e98c6a3d0d96852`. Se comprobó identidad del contenedor, volumen y puerto existentes sin modificar Docker.
- Las 107 unidades publicadas tienen versiones listas y embeddings. Sus artefactos locales coinciden por hash y contenido con los chunks. Las 65 referencias gold resuelven exactamente por identidad documental, versión, chunk, ordinal, localizador, ruta y SHA-256. Los 45 casos conservan periodo, población y restricciones, sin contextos repetidos dentro del caso. Los hashes acreditan integridad, no completitud semántica.

## Cribado de 45 casos y selección del bloque

El nuevo auxiliar `eval/rag-quality/audit-ccd-1.4-gold.mjs` prepara un reporte privado por cada caso: origen, familias, contextos completos con procedencia, periodos, poblaciones, condiciones, excepciones, metadatos de tensión documental, posibles soportes alternativos, casos relacionados y prioridad justificada. Compara términos con las 107 unidades locales; no usa embeddings, rankings del producto ni respuestas del sistema.

| Señal automática | Casos de 45 |
| --- | ---: |
| Procedencia con `INFERENCE` | 2 |
| Procedencia con `DOMAIN_CONFIRMATION` | 14 |
| Etiquetas de periodo distintas entre contextos | 6 |
| Etiquetas de población distintas entre contextos | 4 |
| Varias cláusulas y uno o dos contextos | 23 |
| Metadatos o términos de posible tensión documental | 9 |
| Vocabulario o soportes compartidos con otros casos | 34 |
| Posibles soportes alternativos por coincidencia de términos | 38 |

Estas categorías se solapan y **no se suman como errores ni probabilidades independientes**. Tener varias cláusulas no demuestra varias afirmaciones sin soporte; compartir documentos no demuestra redundancia; una coincidencia de términos puede ser de otra entidad. La procedencia de dominio tampoco demuestra dependencia material en todas las respuestas. La prioridad agrupa causas compartidas, incluyendo una sola causa de alcance cuando difieren periodo y población.

Se seleccionaron **12 casos distintos** para inspección documental. El corte automático se ajustó en dos posiciones para evitar repetir el mismo riesgo de soporte compartido y dar entrada a una dependencia material y a una familia nueva. El reporte privado conserva ambas selecciones, los motivos del ajuste y la lista explícita de los **33 casos todavía pendientes de inspección documental**. No se presentaron esos 33 como revisados semánticamente.

## Resultado documental del bloque

Se leyeron las preguntas y referencias completas, todos sus chunks gold, pasajes originales autorizados y posibles alternativas de las 107 unidades. Se cotejaron diez fuentes documentales, incluidas seis páginas PDF con revisión visual de las regiones pertinentes, además de los registros de confirmación de dominio. Los localizadores DOCX se interpretaron como párrafos no vacíos numerados desde uno; se comprobaron también filas de tabla. Los extractos y sus hashes permanecen privados.

| Clasificación de esta auditoría | Casos |
| --- | ---: |
| `SIN_PROBLEMA_DETECTADO_EN_ESTA_REVISION` | 3 |
| `REQUIERE_REVISION_DEL_AUTOR` | 5 |
| `POSIBLE_CORRECCION_VERSIONADA` | 2 |
| `CONFLICTO_DOCUMENTAL` | 2 |

Hay **nueve casos con atención pendiente del autor** en este bloque. Los tres sin problemas detectados conservan sus aprobaciones previas; este resultado acotado no es una aprobación nueva ni validación definitiva.

Se identificó **un desajuste demostrado de procedencia**: el identificador de confirmación citado no contiene toda la afirmación que debe sustentar; existe otra confirmación pertinente que debe cotejar el autor. Las dos posibles correcciones versionadas afectan suficiencia del soporte expresado en los chunks y delimitación de una secuencia. No se demostró que la afirmación histórica correspondiente fuera falsa: el original es más explícito que los chunks seleccionados. Las dos clasificaciones de conflicto conservan variantes documentales; una divergencia compartida por casos relacionados se trata como una causa documental común. No se borró ninguna variante ni se otorgó autoridad institucional a una decisión de proyecto.

También se encontraron soportes publicados potencialmente equivalentes fuera del gold. Antes de puntuar debe acordarse si el conjunto de relevancia incorpora todas las unidades pertinentes o representa conjuntos alternativos suficientes. Un conjunto mínimo de soporte no demuestra completitud para Precision@5 o Recall@5. No se añadieron contextos ni se eliminaron casos por solapamiento; no se demostró una duplicación semántica que autorice hacerlo.

## Paquete privado y seguimiento

Todos los artefactos nuevos están bajo `data/ccd/local/oe1-evaluation/` e ignorados por Git:

- `gold-audit-prioritized-ccd-1.4.0-d5-5b-v1.json`: cribado de 45 casos y selección automática preliminar.
- `gold-review-assessment-ccd-1.4.0-d5-5b-v1.json`: informe final de 45 casos, selección documental definitiva, contraste por afirmación y pendientes. SHA-256 `32aa8c540785f46ddf9788f0f11104238d0df9788803f859d3f5ae7ecf990df5`.
- `author-gold-review-packet-ccd-1.4.0-d5-5b-v1.md`: paquete legible de los 12 casos, separado en problemas demostrados, riesgos y comprobaciones completadas; contiene evidencia, alternativas y decisiones concretas solicitadas. SHA-256 `66f7300fe3778c11596e35a9b3183d9c10b3caf7e7e7e79d50e876371271fdea`.
- `d5-5b-source-review-v1/`: extractos acotados, hashes y regiones documentales revisadas; no se copiaron originales íntegros al paquete ni al repositorio público.
- `prepare-gold-review-d5-5b-private.mjs`: preparación privada de los hallazgos específicos y del paquete; no contiene ni registra dictámenes humanos nuevos.

El autor debe responder las nueve observaciones del bloque en un registro separado y vinculado al paquete; no se solicita repetir las tres comprobaciones sin problema detectado sin un motivo nuevo. Cualquier cambio futuro de contenido o gold exige nueva versión trazable y revisión correspondiente. Luego deben examinarse los 33 casos restantes, usando los soportes alternativos y causas agrupadas ya listados. El auxiliar evita sobrescribir sus salidas existentes; no debe ejecutarse para regenerar un benchmark.

## Propuesta de muestra y condiciones pendientes

La propuesta sigue siendo **45 respondibles: 41 reconstruidos y cuatro nuevos de cobertura**. Nueve históricos no se reconstruyeron por insuficiencia o contradicción documental; los casos nuevos no representan su recuperación. Hay una sola revisión humana atribuida al autor, sin revisión independiente, ratificación institucional formal del corpus ni reserva verdaderamente ciega.

Antes de considerar definitivo el tamaño, la dirección académica debe aceptar expresamente la muestra menor que 50 y su justificación, cobertura y exclusiones, dependencia entre casos que comparten fuentes y límites de generalización. Debe quedar registrada la versión/hash, responsable académico y fecha de esa aceptación. También faltan cerrar observaciones del gold, acordar la política de soportes equivalentes, MRR@5 y el camino documental que medirá el evaluador. Se conserva la limitación conocida de `AnswerRelevancy` de 7/12 coincidencias técnicas. Este checkpoint propone esas decisiones; no registra aceptación académica.

## Validación y límites de ejecución

- `node --check eval/rag-quality/audit-ccd-1.4-gold.mjs`: sin errores.
- `node --test eval/rag-quality/audit-ccd-1.4-gold.test.mjs`: **3/3**, únicamente fixtures sintéticos; prioridad y agrupación de causas, alternativas sin mutar el gold, rechazo de identidades/límites inválidos y paquete sin convertir clasificaciones en aprobaciones.
- Comprobación sintética de la convención de párrafos no vacíos antes de extraer localizadores DOCX: sin errores.
- Verificación independiente posterior: hashes de benchmark, histórico, seis bancos y seis ledgers conservados; 45 reportes, 12 casos seleccionados y 33 pendientes; preguntas y respuestas del paquete idénticas al benchmark; exclusión de Git comprobada para los 24 archivos privados verificados.
- `git diff --check` y comprobación de whitespace de los archivos nuevos: sin errores. El alcance versionable se limita a este checkpoint, auxiliar y pruebas.

No se creó otro benchmark ni se modificaron bancos, ledgers, contextos gold o documentos originales. No se modificaron producto, PostgreSQL, Docker, releases, modelos, embeddings, prompts, `top_k`, runner ni validador histórico. No se ejecutaron retrieval vectorial, generación del RAG, baseline ni RAGAS. No hubo commit ni push. Detenerse en esta auditoría parcial; no congelar ni evaluar.
