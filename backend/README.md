# Backend de BanuChat

Corte documental: **18/11/2026**. Backend TypeScript con REST v2, autenticación propia, servicios PostgreSQL y Document RAG. La aplicación web/Android consume únicamente REST.

| Componente | Responsabilidad y estado |
| --- | --- |
| [API](api/README.md) | Login/sesiones, propiedad de recursos, router, progreso, calendario, noticias, historial, citas y artefactos; composición publicada en AWS con Supabase y Ollama |
| [RAG e ingesta](rag/README.md) | Validación de fuentes, procesamiento, embeddings, aprobación y publicación; la conversación y su política documental viven en `api/src/chat` |
| [MCP](mcp-server/README.md) | Servidor stdio ejecutable de seis herramientas de lectura; cliente/agente acotados con evidencia local. No es solo un contrato ni un ReAct LLM productivo |

## Composiciones

La demostración publicada usa el perfil PostgreSQL `managed` del entrypoint autenticado, Supabase mediante TLS validado y un rol restringido. El suplemento CCD conserva release, manifiesto, vectores y artefactos propios; la identidad y el expediente siguen siendo sintéticos. Un lector OE2 fijado por hash habilita las rutas aprobadas existentes sin matrícula.

`npm start` en `api` inicia **Unified local**, mediante `scripts/start-unified.mts` y configuración privada. Esa composición puede activar planes multifuente con MCP/n8n. El perfil administrado desplegado no activa esas ramas; no se documentan como dependencias del chat público. N8N también tiene recorridos asíncronos de ingesta local.

## RAG vigente

PostgreSQL/pgvector recupera evidencia por coseno exacto. `qwen3-embedding:0.6b` genera vectores de consulta de 1024 dimensiones y `qwen3:4b-instruct` sintetiza cuando corresponde. La corrección del 18/11 mejora intención, pertinencia dentro del top-k existente, comparación y cobertura parcial, sin una tabla de respuestas del cuestionario ni cambios de modelos.

Los mensajes y sus citas se guardan y se recuperan con autorización de propietario. Las citas no sustituyen una evaluación semántica de la respuesta. Hay respuestas parciales, abstenciones y una limitación real de inferencia con dos vCPU. [Resultados y límites](../docs/transition/CHECKPOINT-RAG-PERTINENCIA-2026-11-18.md).

## Verificación

Desde cada paquete: `npm run typecheck` y `npm test`. Los cuatro paquetes se instalan/verifican desde la raíz con `node scripts/verify-local.mjs`. Las suites con PostgreSQL/Ollama, los scripts de operación y los datos privados requieren su entorno específico; no ejecutar una receta histórica contra otra base.

[Estado actual](../docs/estado-vigente.md) · [Arquitectura](../docs/arquitectura.md) · [Operación cloud](../docs/operations/cloud-demo.md).
