# M3.2 — Baseline preweighted del Intent Router

## Alcance

Esta evidencia corresponde al estado **pre-M3.2** del Intent Router. Ejecuta 20 casos predefinidos antes de implementar lógica o scoring de M3.2.

- Cohortes V y P: casos `peer_authored`.
- Cohorte A: casos `user_authored`.
- El resultado mide conformidad con casos de diseño; no mide accuracy poblacional.
- Los fallos en casos V son esperados y útiles para identificar cobertura léxica faltante antes de M3.2.
- Los casos negativos P y A miden fast paths inesperados.

## Identificación e integridad

- Commit/revisión evaluada: `1865d6affb3300861fe8911377c55310a857e4f9`
- Versión del catálogo: `1.1.0-draft`
- SHA-256 de m3-2-cases.json: `fba82e600db7c42f3aab2415261614ddb9f640316af83bb1e6cdc6f0a19213a3`
- SHA-256 de intent-routing.catalog.json: `6673973f8c2e25b70025d854ce458ebcc48f4342eccf40753355ccced2a0749f`
- Casos ejecutados: 20
- Casos V: 7
- Casos P: 7
- Casos A: 6

## Métricas globales observadas

- Route correct: 13/20 (65.00 %)
- Exact correct: 13/20 (65.00 %)
- Unexpected fast path: 0
- Unexpected fallback: 7
- Wrong non-fallback route: 0

## Breakdown por cohorte

| Cohorte | Total | Route correct | Exact correct | Unexpected fast path | Unexpected fallback | Wrong non-fallback route |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| V | 7 | 0 | 0 | 0 | 7 | 0 |
| P | 7 | 7 | 7 | 0 | 0 | 0 |
| A | 6 | 6 | 6 | 0 | 0 | 0 |

## Breakdown por categoría

| Categoría | Total | Route correct | Exact correct | Unexpected fast path | Unexpected fallback | Wrong non-fallback route |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| valid_paraphrase | 7 | 0 | 0 | 0 | 7 | 0 |
| unknown_content | 4 | 4 | 4 | 0 | 0 | 0 |
| unsupported | 2 | 2 | 2 | 0 | 0 | 0 |
| ambiguous | 7 | 7 | 7 | 0 | 0 | 0 |

## Breakdown por procedencia

| Procedencia | Total | Route correct | Exact correct | Unexpected fast path | Unexpected fallback | Wrong non-fallback route |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| peer_authored | 14 | 7 | 7 | 0 | 7 | 0 |
| user_authored | 6 | 6 | 6 | 0 | 0 | 0 |

## Mismatches

- `V-01` — ¿Podrías mostrarme mi progreso actual en el CCD? Expected `profile_progress` with `{"limit":20}`; actual `agent_fallback` with `{}`. Differing fields: route, parameters.
- `V-02` — Quiero revisar mi avance actualmente, por favor Expected `profile_progress` with `{"limit":20}`; actual `agent_fallback` with `{}`. Differing fields: route, parameters.
- `V-03` — Quisiera conocer los cursos que ofrece el CCD Expected `course_catalog` with `{"limit":20}`; actual `agent_fallback` with `{}`. Differing fields: route, parameters.
- `V-04` — ¿Cuáles cursos tiene disponibles el CCD ahora? Expected `course_catalog` with `{"limit":20,"statuses":["available"]}`; actual `agent_fallback` with `{}`. Differing fields: route, parameters.
- `V-05` — Por favor, me puedes decir qué eventos hay esta semana Expected `calendar_events` with `{"limit":20,"date_from":"2026-09-21","date_to":"2026-09-27"}`; actual `agent_fallback` with `{}`. Differing fields: route, parameters.
- `V-06` — Muéstrame los anuncios que están vigentes ahora Expected `announcements` with `{"limit":20,"temporal_status":"active","reference_time":"2026-09-26T15:00:00-05:00"}`; actual `agent_fallback` with `{}`. Differing fields: route, parameters.
- `V-07` — Podrías decirme qué avisos están activos en este momento Expected `announcements` with `{"limit":20,"temporal_status":"active","reference_time":"2026-09-26T15:00:00-05:00"}`; actual `agent_fallback` with `{}`. Differing fields: route, parameters.

No se atribuyen causas automáticamente. El detalle estructurado de expectativas, resultados y campos diferentes está en `m3-2-baseline-preweighted.json`.

## Interpretación

Este baseline captura el comportamiento productivo previo a M3.2 frente a expectativas de diseño congeladas. Un acierto indica conformidad con el caso correspondiente; no demuestra generalización sobre consultas reales ni calidad del fallback RAG.
