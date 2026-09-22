# BanuChat

Prototipo académico en Fase 1 — Análisis y Diseño. Existen documentación, contratos
preliminares y un borrador SQL; las aplicaciones todavía no están implementadas.

## Arquitectura vigente

- Mobile (React Native + TypeScript) → REST Backend API → Agent/RAG.
- El agente es cliente del servidor MCP interno, que expone herramientas controladas.
- Una sola instancia PostgreSQL con pgvector almacena representaciones procesadas.
- `data/synthetic/` es la fuente de verdad versionada de todos los datos funcionales.
- N8N orquesta ingesta y sincronización asíncrona de esos datos.
- Desarrollo y demostraciones iniciales mediante Docker Compose local.

No se utilizan infraestructura, APIs, sitios ni datos reales de UNAB/CCD.
Google Sheets queda fuera del MVP. Los modelos LLM, la autenticación local y las
notificaciones push reales siguen pendientes de diseño.

Consulta [AGENTS.md](AGENTS.md), [arquitectura](docs/arquitectura.md) y
[ADR de alcance](docs/adr/0001-alcance-sintetico-y-despliegue-local.md).
La configuración local se describe en [infra](infra/README.md); `.env.example` no
contiene credenciales utilizables.
