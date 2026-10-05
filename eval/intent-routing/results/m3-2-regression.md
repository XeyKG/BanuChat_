# M3.2 — Regresión histórica del Intent Router weighted

## Propósito

Reevaluar los 158 casos históricos definidos bajo el catálogo `1.1.0-draft` contra el catálogo actual `1.2.0-draft`, sin modificar las evidencias históricas.

## Identificación e integridad

- Commit base del working tree al ejecutar: `5cfac4400bcdbf19f5fd5a1a5c334ee96be20971`
- Versión declarada por el fixture: `1.1.0-draft`
- Versión del catálogo evaluado: `1.2.0-draft`
- SHA-256 de cases.json: `ed01899284d43aacf136a0ce969b99ff2f3456017c5ab2bcc3e650eea1a4cefc`
- SHA-256 de intent-routing.catalog.json: `823fca852f0bd5b37a7bbb3ff6c15e9ec80dca055d999723ae2cd9f67acf5069`
- Casos ejecutados: 158
- Casos históricos hasta K1.1: 154
- Casos nuevos post-K1.1: 4

## Métricas combinadas observadas

- Route accuracy: 158/158 (100.00 %)
- Exact case accuracy: 158/158 (100.00 %)
- Unexpected fast path: 0
- Unexpected fallback: 0
- Wrong non-fallback route: 0

## Breakdown por procedencia

| Procedencia | Total | Route correct | Exact correct | Unexpected fast path | Unexpected fallback | Wrong non-fallback route |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| through_k1_1 | 154 | 154 | 154 | 0 | 0 | 0 |
| post_k1_1 | 4 | 4 | 4 | 0 | 0 | 0 |
| combined | 158 | 158 | 158 | 0 | 0 | 0 |

## Breakdown por ruta esperada

| Ruta esperada | Total | Route correct | Exact correct |
| --- | ---: | ---: | ---: |
| profile_progress | 16 | 16 | 16 |
| course_catalog | 11 | 11 | 11 |
| calendar_events | 17 | 17 | 17 |
| announcements | 13 | 13 | 13 |
| document_lookup | 11 | 11 | 11 |
| capabilities_help | 11 | 11 | 11 |
| basic_social | 11 | 11 | 11 |
| known_out_of_scope | 11 | 11 | 11 |
| agent_fallback | 57 | 57 | 57 |

## Mismatches

0 mismatches.

El detalle estructurado completo de cada mismatch está en `m3-2-regression.json`. No se atribuyen causas automáticamente; solo se indican los campos diferentes.

## Limitaciones de interpretación

> **Advertencia:** Estos resultados miden conformidad contra casos de diseño versionados del Intent Router. No representan accuracy de un modelo de IA, generalización sobre consultas reales ni evaluación de calidad RAG.

`cases.json` es un artefacto de diseño, no un dataset externo independiente. Los 4 casos post-K1.1 se desarrollaron durante esta corrección como regresión y conformidad; por ello, no constituyen validación externa independiente.

Un resultado de 158/158, si ocurre, demuestra conformidad y ausencia de regresión sobre estos casos versionados; no demuestra desempeño poblacional ni comportamiento sobre consultas reales.

## Ejecución

La evaluación requiere compilar y validar previamente `backend/api`, y después ejecutar una vez:

`node eval/intent-routing/run-m3-2-regression.mjs`
