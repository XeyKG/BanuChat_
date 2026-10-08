# Docs

Documentación técnica y decisiones de arquitectura.

- [Modelo de datos conceptual y lógico del MVP](modelo-datos.md) — aprobado; conserva la comparación histórica con el borrador SQL.
- [Arquitectura vigente](arquitectura.md) — camino síncrono e ingesta asíncrona.
- [Intent Router](enrutamiento-intenciones.md) — especificación del enrutamiento determinista.
- [Ingesta reproducible](ingesta-reproducible.md) — core TypeScript, HTTP interno y startup implementados; workflow manual N8N validado E2E en N3. Retry/recover/scheduled N8N y topología portable pendientes.

## Decisiones de arquitectura disponibles

- [ADR 0001: alcance sintético y despliegue local](adr/0001-alcance-sintetico-y-despliegue-local.md).
- [ADR 0002: publicaciones sintéticas inmutables](adr/0002-publicaciones-sinteticas-inmutables.md).
- [ADR 0003: embeddings locales con Qwen3](adr/0003-embedding-local-qwen3.md).
- [ADR 0004: enrutamiento determinista de intenciones](adr/0004-enrutamiento-determinista-intenciones.md).
- [ADR 0005: ingesta reproducible y N8N](adr/0005-ingesta-reproducible-n8n.md) — decisión aceptada; recorrido manual local implementado y validado. Los ADR conservan el contexto de cada decisión, que puede preceder al estado actual.
