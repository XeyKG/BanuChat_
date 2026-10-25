# BanuChat

BanuChat es un prototipo académico de Ingeniería de Sistemas en implementación
incremental, para desarrollo y demostración local. Todos sus datos funcionales son
100 % sintéticos y están versionados en `data/synthetic/`, su fuente de verdad.
PostgreSQL + pgvector conserva la representación procesada. No hay datos, scraping,
APIs ni integración real de UNAB/CCD, despliegue o autenticación institucional.

## Estado actual

- La app móvil (Expo SDK 57, React Native y TypeScript) consume exclusivamente REST.
  Implementa selección de perfiles sintéticos, chat con citas y apertura interna de
  documentos Markdown sintéticos, historial, calendario, progreso y anuncios.
  Seleccionar un perfil no equivale a autenticarse.
  Las validaciones manuales por etapa y sus límites están en [Mobile](mobile/README.md).
- La API REST implementa conversaciones, mensajes, historial, artefactos documentales
  y lecturas de perfiles/calendario/progreso/anuncios. El Intent Router determinista
  usa el catálogo `1.2.0-draft`: M3.1 léxico y M3.2 ponderado están implementados.
  Despacha catálogo de cursos, progreso, calendario, anuncios y localización exacta
  de documentos mediante servicios de aplicación, y social/ayuda/fuera de alcance
  mediante renderers estáticos.
- El fallback actual es Document RAG directo: embedding de la pregunta con
  `qwen3-embedding:0.6b` mediante Ollama → búsqueda exacta en PostgreSQL + pgvector
  → fragmentos → generación con `qwen3:4b-instruct` mediante Ollama → citas y
  persistencia del turno. Ollama es el runtime local; pgvector almacena y compara
  vectores. Las citas conservan procedencia y facilitan verificar lo recuperado;
  no garantizan exactitud de la respuesta.
- La ingesta TypeScript implementa preflight, procesamiento/chunking, embeddings,
  publicación atómica, aprobación/procedencia, recovery/retry explícitos y HTTP
  interno `execute`/`retry`/`recover`/`status`. N0 validó startup/status; N2 versionó
  e importó el workflow manual; [N3](eval/ingestion/results/n3-n8n-e2e-2026-10-02.md)
  lo ejecutó en N8N 2.40.5 local: publicó una release `ready/current` con 76 items,
  12 versiones documentales y 60 embeddings; la segunda ejecución fue
  `already_current`. N8N orquesta y queda fuera del camino síncrono móvil.

## Arquitectura actual y objetivo

Actual: **Mobile → REST → Intent Router → fast path o Document RAG directo**. En la
demo sintética, los fallbacks que requieren dos fuentes pasan por el webhook N8N y
el agente acotado OE3, que consume MCP por stdio. CCD autenticado conserva Document
RAG directo y nunca usa las tools sintéticas.

El ciclo implementado de agente es determinista y limitado; no acredita ReAct dirigido
por LLM. Continúan pendientes fuentes institucionales, Sheets real, push, RAGAS humana,
SUS/dispositivos y despliegue universitario. El paquete local, las mediciones y los
límites actuales están en el [checkpoint OE6](docs/transition/banuchat-oe6-checkpoint.md).

## Evidencia versionada

[K2](eval/retrieval/results/k2-v1-2026-10-01.md) evaluó retrieval en 18 casos chunked
con top_k=5: MRR@5≈0.8519, Recall@5=Hit@5=1 y Precision@5≈0.2222 (su máximo
teórico agregado por el gold). No mide calidad de generación o UX.

La medición posterior [L1-B](eval/generation/results/l1-b-rag-latency-2026-10-03.md)
registró diez solicitudes warm secuenciales: media 4013.57 ms, mediana 3956.78 ms,
8/10 por debajo de 5000 ms. Es evidencia local acotada; no demuestra formalmente
OE6 ni un SLA. [G2](eval/generation/results/g2-rag-e2e-smoke-2026-10-01.md) permanece
como antecedente histórico separado. Las demás evaluaciones y sus límites están
en [eval](eval/README.md).

## Documentación

- [Arquitectura](docs/arquitectura.md): estado actual, objetivo y pendientes.
- [Docs y ADR](docs/README.md): especificaciones y decisiones históricas.
- [Backend](backend/README.md), [API](backend/api/README.md),
  [ingesta/RAG](backend/rag/README.md) y [MCP](backend/mcp-server/README.md).
- [N8N](n8n/README.md), [Mobile](mobile/README.md) e [infraestructura](infra/README.md).

El Compose histórico conserva PostgreSQL/pgvector y N8N. OE6 añade un Compose de
transferencia separado con imagen backend, health checks, volúmenes externos y
perfiles de operación/CCD; tampoco aplica SQL automáticamente. Embeddings usa 1024
dimensiones y distancia coseno, sin HNSW/IVFFlat; `full_document` no se fragmenta
ni vectoriza.
