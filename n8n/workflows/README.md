# Workflow lógico de ingesta

Estado: existe `ingestion-manual-v1.json`, workflow manual implementado e importado
en N8N 2.40.5 (inactivo). No existe evidencia de `/execute` real ni ingesta N8N E2E.
N8N 2.40.5 se levantó localmente con el Compose vigente y se verificó desde su
contenedor conectividad autenticada a `POST /internal/ingestion/status` con resultado
`not_started`.
La importación quedó verificada; no se ha ejecutado ingesta orquestada por N8N. La
evidencia operacional aplica solo a Windows + Docker Desktop + Compose actual; no
acredita `/execute`, E2E, Linux ni despliegue institucional.
Referencias: [ADR 0005](../../docs/adr/0005-ingesta-reproducible-n8n.md) y
[especificación autoritativa](../../docs/ingesta-reproducible.md).

## Secuencia prevista

1. N2: Manual Trigger prepara configuración; retry no está incluido en este workflow.
2. N8N: invocar `POST /internal/ingestion/execute` privado, no `/api/v1` ni MCP.
3. Componente TypeScript: resolver aprobación y revisión Git; preflight completo.
4. Componente: resolver configuración Ollama efectiva y candidata por identidad.
   Ready/current devuelve no-op; ready histórica devuelve already_ready_not_current.
5. Componente/PostgreSQL: abrir run y 76 items pending, con exclusión de escritor.
6. Componente: procesar cursos, anuncios, perfiles, eventos, progreso y documentos.
   Full_document → versión; chunked → secciones → Ollama → chunks con embeddings.
7. Componente/PostgreSQL: cerrar 76 items, incluidos skipped verificados en retry.
8. Componente/PostgreSQL: en una transacción final, cerrar run succeeded,
   assert_release_complete y publish_release; commit y resumen.
9. N8N: evaluar outcome y guardar resumen saneado, no corpus/vectores ni secretos.

Los pasos 3–8 son internos de una llamada al componente, **no nodos con SQL/Code
duplicando el pipeline**. Failure: el componente revierte transacción abierta,
cierra pending y run failed, conserva current y puede marcar candidata failed.
N8N recibe estado/código. Si no hay respuesta, consulta
`POST /internal/ingestion/status` antes de cualquier reenvío; estado desconocido
no autoriza retry. Un run activo no se abandona por timeout del cliente.

## Entradas, salidas y límites

Contrato HTTP implementado (verificado contra `backend/rag/src/internal-http/protocol.ts`):

- Execute: `approval_ref`, `source_git_revision` completo, `pipeline_version`,
  `workflow_ref`.
- Retry futuro: `approval_ref`, `release_id`, `source_git_revision` completo,
  `pipeline_version`, `workflow_ref`.
- Recover futuro: `release_id`, `run_id`, `workflow_ref`.
- Status por identidad: `approval_ref`, `source_git_revision` completo,
  `pipeline_version`, y `workflow_ref` como correlación.

Este workflow N2 implementa solo status y execute manual. Retry y recover futuros
no forman parte de este flujo.
Selectores autorizados por configuración del componente, nunca rutas/SQL/modelos libres.
Salida: outcome, release_id, run_id/attempt_no si existen, revisión/hashes/configuración
y contadores derivados. Fallos llevan error_code y retryable; no stacks o credenciales.
Detalles y códigos HTTP privados en la especificación, sin alterar REST público.

Manual/retry son obligatorios; scheduled diferido. Un único escritor del dataset;
no calendario independiente, webhook público, Git pull, fuentes remotas ni nuevas tablas
de jobs. N8N no repara fuentes, valida schemas complejos, genera embeddings ni publica.

Retry explícito solo tras reconciliar resultado y restaurar dependencias, conservando
fuente/receta/configuración. No retry automático ilimitado ni ciego por nodo.
Ready histórica requiere acción administrativa aparte para rollback, no este workflow.

## Versionado y evidencia futura

Al implementar, exportar la definición JSON revisada aquí; no dejar cambios importantes
solo en la UI. Limpiar secretos, URLs privadas y datos de ejecuciones de la exportación.
Fijar workflow_ref a ruta de exportación y SHA completo del commit que la contiene;
validar que coincida con lo desplegado. La exportación no se autoincluye su propio SHA.
N8N execution ID solo correlaciona logs con run_id; no sustituye versión de workflow.

Capturar instantes reales de disponibilidad aprobada, trigger y publicación/fallo,
duraciones y resultados por intento. No incluir estos valores variables en receta.
OE4 exige todos los escenarios críticos del [plan](../../eval/ingestion/plan.md)
con resultado esperado; hoy ninguno se presenta como ejecutado. Duración observada
sin umbral nuevo, y actualización académica de OE4 pendiente.
