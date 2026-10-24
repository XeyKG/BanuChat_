# OE1-D3 — evaluador reproducible de retrieval y RAGAS

Estado: **implementado y validado técnicamente con fixtures sintéticos**. No se ha
ejecutado el baseline CCD ni existe todavía un holdout válido.

## 1. Límites de seguridad

- Los bancos, ledgers, capturas y resultados CCD deben permanecer bajo
  `data/ccd/local`, excluido por Git.
- El runner rechaza banco u output CCD que no esté ignorado por Git.
- El adaptador RAGAS rechaza input/output CCD fuera de `data/ccd/local`.
- La calibración versionada es completamente sintética y no contiene información CCD.
- No hay reintentos automáticos. Errores, timeouts, abstenciones y casos no evaluables
  se conservan en denominadores separados.

## 2. Revisión humana

Resumen y señales de posible repetición:

```powershell
node eval/rag-quality/review-bank.mjs summary
```

Inspección de una candidata y del artefacto privado cuyo SHA-256 se verifica:

```powershell
node eval/rag-quality/review-bank.mjs show `
  --case OE1-CCD-C-001 `
  --corpus-root data/ccd/local/guidance-v3
```

Registrar una decisión humana:

```powershell
node eval/rag-quality/review-bank.mjs decide `
  --case OE1-CCD-C-001 `
  --decision approved `
  --reviewer "Nombre real" `
  --reason "Pregunta, respuesta, evidencia y límite temporal cotejados."
```

Para corregir se usa `--decision corrected --correction ruta/privada/correction.json`.
La corrección solo admite `question`, `reference_answer`, `relevant_contexts`,
`restrictions` y `review_notes`. `rejected` conserva responsable, fecha y motivo.
La herramienta nunca decide por el revisor.

Exportar el banco revisado:

```powershell
node eval/rag-quality/review-bank.mjs export
```

El export solo queda `approved` cuando hay 50 casos aceptados/corregidos. Con menos,
queda `incomplete`, registra la brecha y retorna código 2; no crea preguntas de relleno.

## 3. Captura de respuestas

El runner acepta opcionalmente `--responses` con un JSON privado:

```json
{
  "schema_version": "1.0.0",
  "benchmark_sha256": "sha256 del banco aprobado",
  "cases": [
    {"id": "OE1-CCD-C-001", "status": "completed", "response": "..."},
    {"id": "OE1-CCD-C-002", "status": "abstention"},
    {"id": "OE1-CCD-C-003", "status": "timeout"}
  ]
}
```

Los estados permitidos son `completed`, `error`, `timeout` y `abstention`. Solo los
casos `completed` con retrieval válido generan `ragas_input`.

## 4. Retrieval real

Compilar `backend/api` si `dist` no está actualizado y definir las credenciales locales
del PostgreSQL CCD mediante `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` y,
opcionalmente, `POSTGRES_PORT`. Luego:

```powershell
node eval/rag-quality/run-oe1-evaluation.mjs `
  --benchmark data/ccd/local/oe1-evaluation/approved-benchmark-v1.json `
  --responses data/ccd/local/oe1-evaluation/response-capture-v1.json `
  --output data/ccd/local/oe1-evaluation/results/baseline-v1.json
```

El preflight comprueba dataset, release actual, estado, contrato, manifest SHA-256,
conteos, embedding canónico y resolución de cada gold mediante
`document_key + ordinal + locator + source_sha256`. El retrieval llama a
`retrieveDocumentChunksForQuery`, es decir, reutiliza la implementación productiva.
Calcula MRR@5, Precision@5, Recall@5 y Hit@5 con el módulo K2 ya existente.

`--preflight-only` valida sin consultar el embedding. `--timeout-ms` cambia el límite
por caso; el valor efectivo queda registrado.

## 5. RAGAS 0.4.3 local

Crear un entorno aislado e instalar versiones fijadas:

```powershell
python -m venv .venv-ragas
.venv-ragas/Scripts/python -m pip install -r eval/rag-quality/ragas-requirements.txt
```

Ejecutar sobre el resultado privado del runner:

```powershell
.venv-ragas/Scripts/python eval/rag-quality/ragas-adapter.py `
  --input data/ccd/local/oe1-evaluation/results/baseline-v1.json `
  --output data/ccd/local/oe1-evaluation/results/baseline-v1-ragas.json
```

El adaptador usa exclusivamente `ragas.metrics.collections`: `Faithfulness`,
`ContextPrecision`, `ContextRecall` y `AnswerRelevancy`. El juez predeterminado es
`qwen3:4b-instruct` y los embeddings del evaluador son `qwen3-embedding:0.6b`, ambos
por el endpoint OpenAI-compatible de Ollama en loopback. Temperatura 0, cero reintentos
y timeout quedan en la evidencia. Cada métrica registra resultados por caso, errores,
timeouts, media, denominador e intervalo bootstrap percentil descriptivo de 95 %.

## 6. Pruebas

```powershell
node --test eval/rag-quality/*.test.mjs
```

La calibración local usa [judge-calibration-v1.json](judge-calibration-v1.json), doce
casos sintéticos separados del banco CCD y de cualquier reserva. Su frontera binaria
0,5 compara el juez con expectativas técnicas preparadas, todavía **no ratificadas por
una persona revisora**; no reemplaza la comparación humana solicitada ni los targets
académicos de OE1.
