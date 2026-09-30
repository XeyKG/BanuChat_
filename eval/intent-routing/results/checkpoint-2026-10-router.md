# Evaluación reproducible del Intent Router — Checkpoint 2026-10

## Propósito

Evaluar la conformidad del router determinista productivo con los casos de diseño congelados en `eval/intent-routing/cases.json`.

## Identificación e integridad

- Revisión del router: `d7527947236674489c9a8308ee0c509932129431`
- Versión del catálogo: `1.0.0-draft`
- SHA-256 de cases.json: `109a83cfc31d197840abce8f86ac9773600adb691829e6fd2a64ba2cbef7eb72`
- SHA-256 de intent-routing.catalog.json: `4ab86c511316b7f292747a890d71366c69c352116b7a174a508787b3a81835f4`
- Casos ejecutados: 129

## Métricas observadas

- Route accuracy: 129/129 (100.00 %)
- Exact case accuracy: 129/129 (100.00 %)
- Unexpected fast path: 0
- Unexpected fallback: 0
- Wrong non-fallback route: 0

## Breakdown por ruta esperada

| Ruta esperada | Total | Route correct | Exact correct |
| --- | ---: | ---: | ---: |
| profile_progress | 11 | 11 | 11 |
| course_catalog | 11 | 11 | 11 |
| calendar_events | 15 | 15 | 15 |
| announcements | 11 | 11 | 11 |
| document_lookup | 11 | 11 | 11 |
| capabilities_help | 11 | 11 | 11 |
| basic_social | 11 | 11 | 11 |
| known_out_of_scope | 11 | 11 | 11 |
| agent_fallback | 37 | 37 | 37 |

## Mismatches

0 mismatches.

El detalle estructurado completo de cada mismatch está en `checkpoint-2026-10-router.json`. No se atribuyen causas automáticamente; solo se indican los campos diferentes.

## Limitaciones de interpretación

> **Advertencia:** Estos resultados miden conformidad contra casos de diseño congelados del Intent Router. No representan accuracy de un modelo de IA, generalización sobre consultas reales ni evaluación de calidad RAG.

`cases.json` forma parte del diseño del router y no es un dataset externo independiente. Esta evaluación tampoco mide desempeño sobre usuarios reales.

## Comando utilizado

```powershell
Set-Location backend/api
npm run build
Set-Location ../..
node eval/intent-routing/run-evaluation.mjs
```
