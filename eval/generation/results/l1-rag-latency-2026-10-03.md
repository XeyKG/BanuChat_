# L1 — Perfil de latencia RAG end-to-end de BanuChat

## Entorno y método

- Generado: `2026-10-03T23:18:18.469Z`.
- Commit: `7360955a18359e59c969415d8ecd317c8c3016bf`.
- Archivos L1 sin commit al ejecutar: `ninguno`.
- SHA-256 del runner: `aed0972f207af4407fd56df5fbf6b9a3184f8c2179b6609448107cad42ef5143`.
- SHA-256 del workload L1: `8b9216cdf0a94f7fcf17faf8f09cca1cbe4fb5a46775ddf84da30b7eb83b4b25`.
- Release: `5b307391-f475-4120-b8de-30df8f9a7d63`.
- PostgreSQL: `16.15 (Debian 16.15-1.pgdg12+2)`; pgvector: `0.8.6`.
- Ollama: `0.35.0`.
- Embedding: `qwen3-embedding:0.6b`, digest `ac6da0dfba84a81fdbfbaf330198c33cd77c4cdfc53e8bc50eb581914a15621d`, 1024 dimensiones, cosine.
- Generador: `qwen3:4b-instruct`, digest `0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`.
- Receta generador: `{"think":false,"stream":false,"options":{"temperature":0,"num_predict":256},"keep_alive":"5m"}`.
- Receta embedding de release: `{"query":{"options":{"num_ctx":32768},"truncate":false,"dimensions":1024,"input_prefix":null,"normalization":"none"},"document":{"options":{"num_ctx":32768},"truncate":false,"dimensions":1024,"input_prefix":null,"normalization":"none"},"runtime_version":"0.35.0"}`.
- Diez POST /messages secuenciales con conversación nueva, retrieval y modelos reales. El warmup se excluyó de los agregados.

## Warmup excluido

HTTP 201; wall 12469.57 ms; limpieza confirmada: true.

## Diez corridas warm

| ID | HTTP | wall ms | embedding ms | vector DB ms | generación ms | citas | evidencia insuficiente | cleanup |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| L1-01 | 201 | 12075.68 | 5589.33 | 4.58 | 6456.62 | 5 | false | true |
| L1-02 | 201 | 11434.08 | 5558.08 | 3.36 | 5839.61 | 5 | false | true |
| L1-03 | 201 | 12697.18 | 5673.10 | 3.93 | 6988.66 | 5 | false | true |
| L1-04 | 201 | 13965.46 | 5897.38 | 3.06 | 8043.07 | 5 | false | true |
| L1-05 | 201 | 15825.18 | 6315.37 | 2.87 | 9484.79 | 5 | false | true |
| L1-06 | 201 | 13248.61 | 6030.84 | 3.49 | 7191.73 | 5 | false | true |
| L1-07 | 201 | 14256.19 | 6184.52 | 3.16 | 8042.68 | 5 | false | true |
| L1-08 | 201 | 15594.09 | 6144.64 | 2.57 | 9421.43 | 5 | false | true |
| L1-09 | 201 | 16517.71 | 5529.57 | 4.50 | 10907.67 | 5 | false | true |
| L1-10 | 201 | 12667.59 | 5905.77 | 5.54 | 6722.13 | 5 | false | true |

Las preguntas exactas, todas las etapas por corrida y las banderas `all_document` están en el JSON complementario.

## Agregados de las diez corridas

- Wall clock: n=10; media 13828.18 ms; mediana 13607.03 ms; mínimo 11434.08 ms; máximo 16517.71 ms; p95 16517.71 ms.
- Por debajo de 5000 ms: 0; en o por encima: 10.

| Etapa | media ms | mediana ms | mínimo ms | máximo ms | p95 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| conversation_context_db_ms | 2.42 | 2.38 | 2.07 | 2.95 | 2.95 |
| rag_embedding_config_db_ms | 1.78 | 1.76 | 1.28 | 2.24 | 2.24 |
| query_embedding_ms | 5882.86 | 5901.58 | 5529.57 | 6315.37 | 6315.37 |
| rag_release_availability_db_ms | 2.33 | 2.24 | 1.57 | 3.78 | 3.78 |
| vector_retrieval_db_ms | 3.71 | 3.43 | 2.57 | 5.54 | 5.54 |
| generation_ms | 7909.84 | 7617.20 | 5839.61 | 10907.67 | 10907.67 |
| persistence_db_ms | 16.02 | 11.21 | 6.87 | 58.85 | 58.85 |
| generator_ollama_total_duration_ms | 7818.23 | 7525.57 | 5749.10 | 10826.58 | 10826.58 |
| other_orchestration_ms | 9.22 | 10.12 | 2.59 | 10.91 | 10.91 |

El p95 usa nearest rank: ordenar las diez observaciones y tomar la posición `ceil(0.95 × 10) = 10` (el máximo). Con n=10 es una descripción muy inestable, cercana al extremo superior; no es una estimación poblacional robusta.

`generator_ollama_total_duration_ms` es una métrica interna de Ollama incluida dentro de `generation_ms`; no se suma al residual. `rag_release_availability_db_ms` mide la comprobación de release separada de la consulta pgvector. `other_orchestration_ms` es wall menos las siete etapas secuenciales observadas; incluye router, serialización, transporte HTTP local y trabajo no separado. No atribuye ese residual a un componente individual.

## Interpretación

En el entorno local observado, la muestra L1 no alcanzó la referencia histórica de 5000 ms para las solicitudes RAG medidas. L1 no decide el cumplimiento de OE6. G0, G2 y J1 son antecedentes separados y no se combinaron estadísticamente con L1.
