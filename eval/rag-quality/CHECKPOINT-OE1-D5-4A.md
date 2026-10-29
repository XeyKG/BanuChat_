# CHECKPOINT BANUCHAT — OE1-D5.4A

Fecha: 28 de octubre de 2026, America/Bogota.  
Estado: **READY_FOR_AUTHOR_REVIEW_TOOL**.

## Identidad y alcance

- Rama `main`; HEAD inicial `8ce8fc566b75e8003d55709a18e324b6ba299e8a`.
- Estado Git inicial limpio. Archivos nuevos de esta tarea: `eval/rag-quality/review-ccd-1.4.mjs`, `eval/rag-quality/review-ccd-1.4.test.mjs` y este checkpoint. Sin commit ni push.
- Banco candidato privado: `data/ccd/local/oe1-evaluation/candidate-bank-ccd-1.4.0-v1.json`, 29 casos, SHA-256 `0f7c22993956c3e6ec1ea11c50071eb41c86e6141a45dc43787467d878fba3bf`.
- Paquete privado inspeccionado: `data/ccd/local/oe1-evaluation/author-review-packet-ccd-1.4.0-v1.json`, 29 casos. Se inspeccionó su esquema, sin versionar contenido.
- Benchmark histórico CCD 1.2.0 intacto: SHA-256 comprobado `1e007142c2a573d9f2e4403e28b8eaae7dfe03cd31d1a514ee97423a7617609e`. No se importó su ledger.

## Herramienta y uso del autor

Ejecutar desde la raíz del repositorio. La herramienta está en `eval/rag-quality/review-ccd-1.4.mjs`:

```powershell
node eval/rag-quality/review-ccd-1.4.mjs summary
node eval/rag-quality/review-ccd-1.4.mjs show --case OE1-CCD-14-C-001
node eval/rag-quality/review-ccd-1.4.mjs decide --case OE1-CCD-14-C-001 --decision approved --reviewer "<nombre real>" --reason "<motivo específico tras cotejar fuentes>"
node eval/rag-quality/review-ccd-1.4.mjs decide --case OE1-CCD-14-C-001 --decision rejected --reviewer "<nombre real>" --reason "<motivo específico tras cotejar fuentes>"
node eval/rag-quality/review-ccd-1.4.mjs request-correction --case OE1-CCD-14-C-001 --reviewer "<nombre real>" --reason "<cambio requerido y evidencia>"
```

Para adjuntar una propuesta de corrección, añadir `--proposal <ruta-privada-json>` al último comando. Se aceptan solo `question`, `reference_answer`, `relevant_contexts` y `restrictions`; la herramienta guarda una copia con nombre único, fecha y hash en `data/ccd/local/oe1-evaluation/review-proposals-ccd-1.4.0/`, sin sobrescribir copias anteriores. La solicitud deja el caso pendiente y no altera el banco ni equivale a una decisión `corrected`. Una corrección efectiva requiere una versión nueva y revisable del banco, con nueva vinculación de hash y ratificación del autor.

El autor debe repetir `show` y el cotejo con el documento original autorizado para cada uno de los 29 IDs del paquete, revisar pregunta, respuesta, **todos** los contextos, periodo, población, restricciones y procedencia, y luego registrar individualmente aprobación, rechazo o solicitud de corrección. No existe comando de aprobación por lote. La CLI no ejecuta retrieval ni usa respuestas de BanuChat.

`show` verifica SHA-256 de cada artefacto privado referenciado antes de presentarlo. La ruta del ledger es `data/ccd/local/oe1-evaluation/review-ledger-ccd-1.4.0-v1.jsonl`, ignorada por Git. La cabecera queda vinculada al SHA-256 exacto del banco; cada decisión se añade como evento con motivo, identidad y fecha UTC real, sin reemplazar el historial. La CLI rechaza IDs desconocidos, motivos ausentes o demasiado breves, hashes cambiados y rutas fuera de `data/ccd/local`. El ledger real se crea solo con la primera decisión; no se creó en esta tarea.

## Comprobaciones y límites

- `node --test eval/rag-quality/review-ccd-1.4.test.mjs`: **1 prueba compuesta, PASS**. Fixtures totalmente sintéticos comprobaron `show`, aprobación, rechazo, ID desconocido, motivo ausente, cambio de hash, historial de segunda decisión y solicitud de corrección con copia privada trazable. Los fixtures temporales se retiraron.
- `node --check eval/rag-quality/review-ccd-1.4.mjs`: **PASS**. Una ejecución real de `show` para un caso verificó sus hashes sin registrar decisión ni exponer su contenido en el reporte.
- `node eval/rag-quality/review-ccd-1.4.mjs summary` sobre el banco real: **29 pendientes, 0 aprobadas, 0 corregidas, 0 rechazadas, 0 solicitudes y 0 eventos**. No hubo intervención manual del autor.
- `git diff --check`: ejecutado sin errores. Los nuevos archivos también se inspeccionaron por espacios finales.

Las 21 preguntas históricas sin candidata permanecen fuera de esta herramienta. No hay revisión humana independiente ni ratificación institucional formal del corpus. No se ejecutaron RAGAS, retrieval, generación o baseline; no se modificaron producto, PostgreSQL, releases, banco candidato, paquete privado ni benchmark histórico.
