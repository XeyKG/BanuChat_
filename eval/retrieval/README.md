# Benchmark gold de retrieval K2 v1

Este benchmark fue definido manualmente antes de ejecutar sus consultas u observar
rankings. La versión queda asociada al release
`5b307391-f475-4120-b8de-30df8f9a7d63`.

Los casos `K2-01` a `K2-18` evalúan retrieval vectorial sobre los 60 chunks del
corpus. Los casos `K2-19` y `K2-20` se evalúan por separado porque sus documentos
usan el modo `full_document` y, deliberadamente, no se fragmentan ni vectorizan.

## Métricas

Las métricas principales solicitadas para los casos chunked son MRR y
Precision@5. También se reportarán Hit@5 y Recall@5 como diagnóstico.

Para una consulta `q`:

- `RR(q) = 1 / rank del primer chunk relevante`.
- `MRR = promedio de RR(q)`.
- `Precision@5(q) = chunks relevantes recuperados en top 5 / 5`.
- `Recall@5(q) = chunks relevantes recuperados en top 5 / total de chunks relevantes del gold`.
- `Hit@5(q) = 1` si aparece al menos un chunk relevante; `0` en otro caso.

Debido al gold disperso de esta evaluación, Precision@5 tiene un máximo global
teórico de `20 / 90 = 0.222222...`. Por ello, Precision@5 no debe compararse con
un umbral de 0.80. El criterio académico existente `MRR >= 0.70` sí puede
evaluarse directamente.

## Congelación del gold

Las preguntas y sus golds no deben modificarse después de observar rankings,
salvo que exista una corrección objetiva documentada mediante una nueva versión
del benchmark.
