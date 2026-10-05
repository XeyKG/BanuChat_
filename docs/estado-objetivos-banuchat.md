# Estado real de BanuChat frente a los 6 Objetivos Específicos
Generado a partir de inspección directa del repo (commit ~2026-10-04/05), no de reportes verbales.

| OE | Qué promete el anteproyecto | Evidencia encontrada en el repo | Estado |
|----|---|---|---|
| **OE1** — Motor de búsqueda semántica (RAG) | pgvector + RAG, evaluado con framework **RAGAS** (faithfulness ≥0.80, etc.) | `eval/retrieval/results/k2-v1`: MRR@5 85.2%, hit rate 100%, recall 100% (métrica propia de retrieval). **No hay evidencia de evaluación RAGAS** (faithfulness, answer relevancy) como tal. | 🟡 Avanzado en retrieval, falta la evaluación prometida específicamente |
| **OE2** — Ingesta/actualización automática (antes RPA, ahora datos sintéticos) | Pipeline de ingesta + actualización automática | Preflight, chunking, embeddings, publicación atómica, **recovery/retry implementado y documentado**, N8N ejecutó el flujo E2E manualmente con éxito | 🟢 Más avanzado que el resto |
| **OE3** — Núcleo cognitivo agéntico (ReAct) + MCP | LLM con ciclo ReAct que decide dinámicamente qué herramienta MCP usar | ADR 0004, literal: **"Agent/ReAct y MCP interno siguen pendientes de integración."** El fallback actual es "Document RAG directo", no un agente que razona. MCP solo tiene el contrato de tools definido (`tools.contract.json`), sin conectar | 🔴 **No iniciado** |
| **OE4** — Orquestación N8N (BPM) | Flujos N8N integrando todo el sistema | Un workflow manual (`BanuChat - Manual ingestion v1`), probado una vez E2E. `active=false`. Sin scheduling, sin retry automático vía N8N | 🟡 Prototipo manual, falta producción |
| **OE5** — App móvil + usabilidad (SUS) | App funcional + SUS >70/100 con ≥10 usuarios reales | 7 pantallas implementadas (chat, calendario, historial, perfiles, progreso) | 🟡 App avanzada, **cero evidencia de SUS** |
| **OE6** — Despliegue Docker + evaluación integral | Contenedores estables, respuesta <5s promedio | `docker-compose.yml` solo define **postgres y n8n** — backend/rag/mobile corren fuera de Docker todavía. Latencia medida: **12.2s promedio, 0/5 muestras bajo la meta de 5s** | 🔴 Infra incompleta + meta de latencia incumplida |

## El hallazgo central
El **núcleo agéntico (OE3)** — que es el diferenciador conceptual de todo el proyecto frente a
un chatbot RAG cualquiera, y la razón de ser de "Route AI"/BanuChat según su propia
justificación (sección 3.2 del anteproyecto) — **todavía no existe**. Mientras tanto, una
cantidad considerable de ciclos de orquestador+Codex (K1 → K1.1 → K1.2 → M3.1 → M3.2 →
M3.2-B → M3.2-C → M3.2-C.1 → M3.2-C.1 corregido) se invirtió en pulir casos límite
lingüísticos de un router determinista que es, por diseño propio (ADR 0004), una optimización
*secundaria* delante del agente — y cuyo propio ADR admite "no se han demostrado ahorros ni
resultados de rendimiento".

Esa es la causa técnica concreta de la sensación de "perder el panorama general": no es
percepción, es que el tiempo se fue a la pieza que menos define la tesis, mientras la pieza que
más la define sigue en cero.

## Riesgos que compiten por atención ahora mismo
1. OE3 sin iniciar — riesgo alto para la sustentación (es el núcleo conceptual).
2. OE6 — latencia 2.4x por encima de la meta declarada; nadie la está trabajando activamente.
3. OE5 — sin una sola sesión de SUS; necesita ≥10 usuarios reales, lo cual toma tiempo de
   agendar, no solo de programar.
4. OE1 — falta la evaluación RAGAS específica prometida (tienen métricas de retrieval, pero no
   el framework exacto que se comprometieron a usar).

## Recomendación de secuencia (no de contenido técnico, eso ya lo maneja bien el orquestador)
1. Cerrar M3.2-C.1 corregido — ya está en vuelo, no abandonarlo a medias.
2. Declarar el router de intenciones **"suficientemente bueno"** después de eso: congelar
   nuevas rondas de refinamiento salvo que algo se rompa en producción.
3. Redirigir el siguiente ciclo completo del orquestador a **OE3**: diseño del ciclo ReAct y
   conexión real del agente con el servidor MCP ya especificado.
4. En paralelo (no necesita a Codex): agendar las sesiones de SUS — es la única tarea del
   proyecto que depende de tiempo de calendario de terceros, no de cómputo.
5. Dejar la optimización de latencia (OE6) como la siguiente prioridad técnica después de OE3,
   no antes — un agente ReAct más la resolverá parcialmente al cambiar el patrón de llamadas al
   LLM, así que medirla antes de tener el agente puede ser prematuro.
