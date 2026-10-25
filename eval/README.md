# Evaluaciones de BanuChat

Índice de metodología y evidencias versionadas sobre el corpus 100 % sintético.
Los archivos `results/*.md` y `results/*.json` son registros históricos de cada
revisión, release, entorno y muestra; no describen automáticamente el HEAD actual.
Esta auditoría documental no vuelve a ejecutar sus pruebas ni acredita nuevos PASS.

## Implementado y evaluado por etapas

| Área | Evidencia y alcance |
| --- | --- |
| Retrieval | [K2 v1](retrieval/results/k2-v1-2026-10-01.md): 18 casos chunked, top_k=5, MRR@5≈0.8519, Precision@5≈0.2222, Recall@5=Hit@5=1, 18/18 hits. Precision@5 coincide con el máximo teórico agregado del gold. No mide faithfulness, answer relevancy, UX ni latencia HTTP completa; full_document queda fuera del vectorial. |
| Intent Router | [M3.2-C.1](intent-routing/results/m3-2-postweighted-reviewed.md): desarrollo; [regresión](intent-routing/results/m3-2-regression-reviewed.md): 158 casos históricos; [M3.2-D](intent-routing/results/m3-2-reserved-first-run.md): reserved_primary 14/14 route correct, 14/14 exact correct, cero unexpected fast paths y false fast-path rate 0 %. Los primarios son todos negativos/fallback: no demuestra accuracy poblacional, recall positivo ni generalización. |
| Generación | [G0, G0 v2 y G1b](generation/README.md): generación aislada y diagnóstico de terminación/límite de salida; no equivalen a RAGAS completa. |
| Latencia Document RAG | [G2](generation/results/g2-rag-e2e-smoke-2026-10-01.md) es el smoke histórico; [L1](generation/results/l1-rag-latency-2026-10-03.md) es baseline; [L1-B](generation/results/l1-b-rag-latency-2026-10-03.md) es posterior. L1-B: diez warm secuenciales, media 4013.57 ms, mediana 3956.78 ms, mínimo 1883.42 ms, máximo/p95 nearest rank 6485.59 ms, 8/10 <5000 ms; generación media 3622.38 ms, vector DB 3.03 ms. No acredita formalmente OE6, SLA ni distribución poblacional. |
| Ingesta | [Plan e índices](ingestion/plan.md): Implementación 3 con embeddings reales, Implementación 4 con embeddings TEST_ONLY, N0 preparación y [N3](ingestion/results/n3-n8n-e2e-2026-10-02.md) manual N8N E2E. N3 publicó ready/current y luego already_current; no cubre todos los escenarios ni workflows retry/recover/scheduled. |
| Integración y mobile | [J1/J2/J3](integration/README.md): smoke con servicios reales, HTTP con SQL controlado/RAG simulado y checkpoint histórico de validaciones móviles. Las etapas posteriores y sus límites están en [Mobile](../mobile/README.md). J3 no sustituye el estado vigente ni valida Agent/MCP. |
| Mobile M7.4 | [Plan funcional congelado antes de la ejecución](mobile/m7-4-validation-plan.md), preparado en M7.4-A para Android físico + Expo Go; la regla de congelación se aplica al commitear. Resultados todavía pendientes. No es SUS ni evaluación formal con usuarios. |
| Calidad RAG M9 | [Protocolo en preparación](rag-quality/README.md): contrato primario y compromiso de reserva endurecidos, sin preguntas reales, benchmark congelado, RAGAS ejecutada ni resultados. Todavía no acredita OE1. |
| OE6 integrado | [Runners y evidencia](oe6/README.md): MCP/PostgreSQL/Ollama real, rendimiento por rama, caída/recuperación y restauración aislada. No equivale a despliegue institucional ni validación humana. |

## Pendiente

RAGAS completa (faithfulness, context precision/recall y answer relevancy), SUS
formal y pruebas formales con usuarios no tienen resultados ejecutados versionados
que las acrediten. OE6 ya ejecutó la selección MCP determinista con dependencias
reales; sigue pendiente ReAct dirigido por LLM, escenarios avanzados de
ingesta/concurrencia/permisos y mediciones más amplias. K2 mide Precision@5 sobre su gold; no es
la métrica context precision de RAGAS ni prueba integral de OE1.

Los umbrales académicos son objetivos, no resultados. No se combinan estadísticamente
corridas con distinta revisión, metodología, entorno o receta. El historial de
experimentos se conserva, incluidos sus versiones antiguas y pendientes de entonces.
