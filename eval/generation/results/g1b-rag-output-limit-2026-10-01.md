# G1b — Límite de salida para RAG

## Propósito

Encontrar un límite de salida suficiente para el prompt RAG real.

## Entorno probado

- Implementation revision: `47f729693c3d0c0c1cded2bf87f715964d084884`
- Modelo: `qwen3:4b-instruct`
- Digest: `0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`
- Ollama: `0.35.0`
- Query: `¿Qué información debo incluir al reportar una incidencia?`
- `prompt_eval_count`: `1436`

Retrieval se ejecutó previamente para construir el mismo contexto top-5 de G1b.

## Observaciones

| num_predict | done_reason | eval_count | wall_ms | resultado |
| ---: | --- | ---: | ---: | --- |
| 128 | length | 128 | 7868.68 | truncada |
| 160 | length | 160 | 8664.83 | truncada |
| 192 | length | 192 | 5059.69 | truncada |
| 256 | stop | 208 | 5450.66 | completa |

`thinking_present=false` en todas las observaciones mostradas.

Las cifras de `wall_ms` corresponden únicamente a generación, no a latencia E2E HTTP. `256` es el menor límite probado que logró terminación natural; no se probaron todos los valores entre `193` y `255`, por lo que no se afirma que sea el mínimo matemático.

Este ajuste no modifica los resultados históricos de G0 y no acredita OE6.
