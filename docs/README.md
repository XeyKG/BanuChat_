# Documentación de BanuChat

Corte del índice: **18/11/2026**. Empezar por el estado actual; los registros históricos conservan su fecha y no se convierten en nuevas pruebas al actualizar este índice.

## Para conocer y presentar el producto

1. [Estado vigente](estado-vigente.md): despliegue, funcionalidades, fuentes, evidencia y pendientes.
2. [Checkpoint consolidado de publicación](transition/CHECKPOINT-PUBLICACION-BANUCHAT.md).
3. [Entrega académica y guion](transition/ENTREGA-FINAL-BANUCHAT.md).
4. [Release 1.0.4 y descargas](https://github.com/XeyKG/BanuChat_/releases/tag/demo-1.0.4).
5. [Recuperación de AWS Academy y operación cloud](operations/cloud-demo.md).

## Diseño e implementación

| Documento | Qué describe |
| --- | --- |
| [Arquitectura](arquitectura.md) | Composición publicada frente a Unified local; responsabilidades y flujo de datos |
| [Modelo de datos](modelo-datos.md) | Diseño conceptual/lógico y comparación histórica; los cambios posteriores se verifican en SQL y checkpoints |
| [REST v2](../backend/api/api-contract-v2.md) | Interfaz autenticada y ampliación autorizada de disponibilidad OE2; OpenAPI en el paquete API |
| [API](../backend/api/README.md), [Mobile](../mobile/README.md) | Entrypoints, configuración y pruebas; separar arranque local y aplicación publicada |
| [RAG/ingesta](../backend/rag/README.md), [ingesta reproducible](ingesta-reproducible.md) | Preparación, validación, publicación y recuperación según receta |
| [Enrutamiento](enrutamiento-intenciones.md) | Catálogo determinista y antecedentes de evolución; política documental en el código de API |
| [MCP](../backend/mcp-server/README.md), [n8n](../n8n/README.md) | Implementación y evidencia locales; no son dependencias activas del chat público |
| [Infraestructura](../infra/README.md), [SQL](../infra/db/README.md) | Entornos, migraciones, ejemplos y límites de operación |

## Evidencias recientes

- [RAG: pertinencia y cobertura, 18/11](transition/CHECKPOINT-RAG-PERTINENCIA-2026-11-18.md): pruebas, consultas reales, respuestas parciales y lagunas documentales.
- [Cliente 1.0.4](transition/CHECKPOINT-DEMO-1.0.4.md): calendario mensual, Banu al Día, OE2, Android y descargas.
- [Migración controlada a Supabase](transition/CHECKPOINT-CLOUD-01B-3.md): restauración, permisos, TLS y validaciones del corte.
- [Índice de evaluaciones](../eval/README.md): separar tests, experimentos, pruebas con servicios y validación académica.
- [Matriz OE1–OE6](academic/oe1-oe6-current-status.md) y [reconciliación con el anteproyecto](academic/anteproyecto-reconciliation-matrix.md).

## Decisiones y antecedentes

Los [ADR](adr/) describen decisiones en su contexto: [alcance inicial](adr/0001-alcance-sintetico-y-despliegue-local.md), [releases](adr/0002-publicaciones-sinteticas-inmutables.md), [embeddings](adr/0003-embedding-local-qwen3.md), [router](adr/0004-enrutamiento-determinista-intenciones.md), [n8n e ingesta](adr/0005-ingesta-reproducible-n8n.md) y [CCD seleccionado](adr/0006-corpus-ccd-seleccionado-local.md).

La [demostración integral local](operations/final-integrated-demonstration.md) y los checkpoints de octubre siguen siendo antecedentes útiles para ese laboratorio. No describen por sí solos la operación AWS/Supabase. Las propuestas, planes y métricas históricas no deben presentarse como ejecuciones nuevas o aprobaciones institucionales.

## Mantener la documentación

Cada cambio de cliente, backend, datos o despliegue debe actualizar el README del componente, esta ficha de estado y el consolidado cuando cambie la operación. Conservar fecha, entorno, revisión de código y alcance de las pruebas; enlazar el resultado original en vez de copiar un PASS sin contexto. No incluir credenciales, datos personales, corpus CCD privado ni rutas de descarga sin verificar. Los archivos del paquete académico publicado representan su corte y no se sobrescriben silenciosamente.
