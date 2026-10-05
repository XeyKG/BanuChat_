# M3.2 — Evaluación postweighted del Intent Router

## Alcance

Esta evidencia corresponde al estado **postweighted M3.2** del Intent Router. Ejecuta los 20 casos de desarrollo definidos previamente bajo el catálogo `1.1.0-draft` contra el catálogo `1.2.0-draft`.

- Cohortes V y P: casos `peer_authored`.
- Cohorte A: casos `user_authored`.
- El resultado mide conformidad con casos de diseño; no mide accuracy poblacional.
- Los casos V miden la cobertura de paráfrasis válidas buscada por M3.2.
- Los casos negativos P y A miden fast paths inesperados.

## Identificación e integridad

- Commit/revisión evaluada: `5cfac4400bcdbf19f5fd5a1a5c334ee96be20971`
- Versión declarada por el fixture: `1.1.0-draft`
- Versión del catálogo evaluado: `1.2.0-draft`
- SHA-256 de m3-2-cases.json: `fba82e600db7c42f3aab2415261614ddb9f640316af83bb1e6cdc6f0a19213a3`
- SHA-256 de intent-routing.catalog.json: `823fca852f0bd5b37a7bbb3ff6c15e9ec80dca055d999723ae2cd9f67acf5069`
- Casos ejecutados: 20
- Casos V: 7
- Casos P: 7
- Casos A: 6

## Métricas globales observadas

- Route correct: 20/20 (100.00 %)
- Exact correct: 20/20 (100.00 %)
- Unexpected fast path: 0
- Unexpected fallback: 0
- Wrong non-fallback route: 0

## Breakdown por cohorte

| Cohorte | Total | Route correct | Exact correct | Unexpected fast path | Unexpected fallback | Wrong non-fallback route |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| V | 7 | 7 | 7 | 0 | 0 | 0 |
| P | 7 | 7 | 7 | 0 | 0 | 0 |
| A | 6 | 6 | 6 | 0 | 0 | 0 |

## Breakdown por categoría

| Categoría | Total | Route correct | Exact correct | Unexpected fast path | Unexpected fallback | Wrong non-fallback route |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| valid_paraphrase | 7 | 7 | 7 | 0 | 0 | 0 |
| unknown_content | 4 | 4 | 4 | 0 | 0 | 0 |
| unsupported | 2 | 2 | 2 | 0 | 0 | 0 |
| ambiguous | 7 | 7 | 7 | 0 | 0 | 0 |

## Breakdown por procedencia

| Procedencia | Total | Route correct | Exact correct | Unexpected fast path | Unexpected fallback | Wrong non-fallback route |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| peer_authored | 14 | 14 | 14 | 0 | 0 | 0 |
| user_authored | 6 | 6 | 6 | 0 | 0 | 0 |

## Mismatches

0 mismatches.

No se atribuyen causas automáticamente. El detalle estructurado de expectativas, resultados y campos diferentes está en `m3-2-postweighted.json`.

## Interpretación

Esta evaluación captura el comportamiento postweighted frente a expectativas de diseño congeladas antes de implementar M3.2. Un acierto indica conformidad con el caso correspondiente; no demuestra generalización sobre consultas reales ni calidad del fallback RAG.
