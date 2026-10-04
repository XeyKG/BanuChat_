# L1-B — Perfil de latencia RAG end-to-end de BanuChat

## Entorno y método

- Generado: `2026-10-04T01:41:03.432Z`.
- Commit: `c8b724d755877fc66e0614e0605bf58c225b2d61`.
- Archivos L1 sin commit al ejecutar: `ninguno`.
- SHA-256 del runner: `ab2f3a5c7363b94627e633ef814e86a4bf8e91f085ca17215a3b8906dbee5634`.
- SHA-256 del workload L1: `8b9216cdf0a94f7fcf17faf8f09cca1cbe4fb5a46775ddf84da30b7eb83b4b25`.
- Release: `6a770ce7-13b7-4b0b-95ae-0c193fa0d655`.
- PostgreSQL: `16.15 (Debian 16.15-1.pgdg12+2)`; pgvector: `0.8.6`.
- Ollama: `0.35.0`.
- Embedding: `qwen3-embedding:0.6b`, digest `ac6da0dfba84a81fdbfbaf330198c33cd77c4cdfc53e8bc50eb581914a15621d`, 1024 dimensiones, cosine.
- Generador: `qwen3:4b-instruct`, digest `0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`.
- Receta generador: `{"think":false,"stream":false,"options":{"temperature":0,"num_predict":256},"keep_alive":"5m"}`.
- Receta embedding de release: `{"query":{"options":{"num_ctx":4096},"truncate":false,"dimensions":1024,"input_prefix":null,"normalization":"none"},"document":{"options":{"num_ctx":32768},"truncate":false,"dimensions":1024,"input_prefix":null,"normalization":"none"},"runtime_version":"0.35.0"}`.
- Diez POST /messages secuenciales con conversación nueva, retrieval y modelos reales. El warmup se excluyó de los agregados.
- Tipo de medición: post-optimización, comparable descriptivamente con `banuchat-rag-latency-l1` por usar el mismo workload congelado y la misma metodología.

## Warmup excluido

HTTP 201; wall 9634.18 ms; limpieza confirmada: true.

## Diez corridas warm

| ID | HTTP | wall ms | embedding ms | vector DB ms | generación ms | citas | evidencia insuficiente | cleanup |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| L1-01 | 201 | 3961.19 | 2251.33 | 2.47 | 1670.91 | 5 | false | true |
| L1-02 | 201 | 1883.42 | 154.89 | 2.57 | 1696.57 | 5 | false | true |
| L1-03 | 201 | 2781.65 | 153.88 | 1.79 | 2602.18 | 5 | false | true |
| L1-04 | 201 | 4661.86 | 93.59 | 2.24 | 4535.43 | 5 | false | true |
| L1-05 | 201 | 5555.57 | 125.74 | 10.01 | 5386.77 | 5 | false | true |
| L1-06 | 201 | 2752.51 | 130.36 | 2.08 | 2578.61 | 5 | false | true |
| L1-07 | 201 | 3952.37 | 234.57 | 2.01 | 3688.00 | 5 | false | true |
| L1-08 | 201 | 4769.60 | 138.32 | 3.05 | 4599.68 | 5 | false | true |
| L1-09 | 201 | 6485.59 | 174.53 | 1.66 | 6289.51 | 5 | false | true |
| L1-10 | 201 | 3331.95 | 120.35 | 2.41 | 3176.09 | 5 | false | true |

Las preguntas exactas, todas las etapas por corrida y las banderas `all_document` están en el JSON complementario.

## Agregados de las diez corridas

- Wall clock: n=10; media 4013.57 ms; mediana 3956.78 ms; mínimo 1883.42 ms; máximo 6485.59 ms; p95 6485.59 ms.
- Por debajo de 5000 ms: 8; en o por encima: 2.

| Etapa | media ms | mediana ms | mínimo ms | máximo ms | p95 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| conversation_context_db_ms | 2.54 | 2.46 | 1.85 | 3.19 | 3.19 |
| rag_embedding_config_db_ms | 1.93 | 1.94 | 1.51 | 2.37 | 2.37 |
| query_embedding_ms | 357.76 | 146.10 | 93.59 | 2251.33 | 2251.33 |
| rag_release_availability_db_ms | 4.83 | 1.94 | 1.30 | 15.26 | 15.26 |
| vector_retrieval_db_ms | 3.03 | 2.33 | 1.66 | 10.01 | 10.01 |
| generation_ms | 3622.38 | 3432.04 | 1670.91 | 6289.51 | 6289.51 |
| persistence_db_ms | 10.87 | 9.54 | 6.89 | 19.88 | 19.88 |
| generator_ollama_total_duration_ms | 3537.72 | 3334.65 | 1584.78 | 6202.50 | 6202.50 |
| other_orchestration_ms | 10.25 | 9.44 | 7.02 | 14.51 | 14.51 |

El p95 usa nearest rank: ordenar las diez observaciones y tomar la posición `ceil(0.95 × 10) = 10` (el máximo). Con n=10 es una descripción muy inestable, cercana al extremo superior; no es una estimación poblacional robusta.

`generator_ollama_total_duration_ms` es una métrica interna de Ollama incluida dentro de `generation_ms`; no se suma al residual. `rag_release_availability_db_ms` mide la comprobación de release separada de la consulta pgvector. `other_orchestration_ms` es wall menos las siete etapas secuenciales observadas; incluye router, serialización, transporte HTTP local y trabajo no separado. No atribuye ese residual a un componente individual.

## Interpretación

La media observada de la muestra L1-B quedó por debajo de la referencia histórica de 5000 ms para estas solicitudes RAG. L1-B no decide el cumplimiento de OE6. G0, G2 y J1 son antecedentes separados y no se combinaron estadísticamente con L1-B. La comparación con L1 es descriptiva y no constituye una prueba general de SLA u OE6.
