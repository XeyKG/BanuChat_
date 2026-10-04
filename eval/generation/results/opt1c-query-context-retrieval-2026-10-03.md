# OPT-1C: contexto de query y estabilidad de retrieval

Exploración sobre L1-01..L1-10. Misma release documental; los embeddings de documentos no se regeneraron. No se midió latencia ni se cambió producción.

- Revision: `3ebe94c7e8aab8553cbf910c8c597ea046afafee`; runner SHA-256: `43a61c8208fcfa1d003a3a0fc23f0c06f2ad7210c925fe794ecf72efe204a3c3`; workload SHA-256: `8b9216cdf0a94f7fcf17faf8f09cca1cbe4fb5a46775ddf84da30b7eb83b4b25`.
- Release: `5b307391-f475-4120-b8de-30df8f9a7d63`; modelo: `qwen3-embedding:0.6b`; digest: `ac6da0dfba84a81fdbfbaf330198c33cd77c4cdfc53e8bc50eb581914a15621d`; runtime: `0.35.0`.
- Query: 32768 frente a 4096; top_k=5; distancia coseno. Primero se ejecutaron los diez casos 32768 y después los diez 4096.

## Resumen descriptivo

- Coseno min/media/mediana: 0.9994328670215906 / 0.9996494275203924 / 0.9996661887112255. Máxima diferencia absoluta: 0.0073805494.
- Top-1 igual: 10/10; top-5 mismo conjunto: 10/10; mismo orden: 9/10.
- Intersección top-5 media/mínima: 5 / 5; Jaccard medio/mínimo: 1 / 1.

## Casos

| Caso | Top-1 | Conjunto | Orden | Intersección | Jaccard | Interpretación |
|---|---|---|---|---:|---:|---|
| L1-01 | true | true | true | 5 | 1 | top-5 idéntico |
| L1-02 | true | true | true | 5 | 1 | top-5 idéntico |
| L1-03 | true | true | true | 5 | 1 | top-5 idéntico |
| L1-04 | true | true | true | 5 | 1 | top-5 idéntico |
| L1-05 | true | true | true | 5 | 1 | top-5 idéntico |
| L1-06 | true | true | true | 5 | 1 | top-5 idéntico |
| L1-07 | true | true | true | 5 | 1 | top-5 idéntico |
| L1-08 | true | true | true | 5 | 1 | top-5 idéntico |
| L1-09 | true | true | true | 5 | 1 | top-5 idéntico |
| L1-10 | true | true | false | 5 | 1 | mismo conjunto; orden distinto |

Los IDs, locators, distancias y cambios de rank por caso están en el JSON. La similitud de vectores por sí sola no establece equivalencia del retrieval ni una decisión de cambio productivo.
