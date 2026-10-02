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

## Secuencia implementada en N2

1. N8N: `Manual Trigger` inicia el flujo y `Prepare Control Configuration`
   aporta los valores de control no secretos.
2. N8N: invocar `POST /internal/ingestion/status` con selector de identidad.
3. N8N: evaluar `outcome`. Solo `not_started` continúa hacia ejecución; los demás
   estados conocidos terminan en un resumen y cualquier valor no reconocido usa la
   salida fallback sin ejecutar acciones.
4. N8N: únicamente para `not_started`, invocar
   `POST /internal/ingestion/execute`.
5. N8N: si `/execute` responde, terminar con `Execution Summary`. Si hay error de
   transporte o timeout, consultar `POST /internal/ingestion/status` y terminar con
   `Reconciliation Summary`; nunca repetir `/execute` automáticamente.
6. Componente TypeScript: durante `/execute`, resolver aprobación y revisión Git;
   realizar preflight completo, procesar la release y gobernar su publicación.

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

El workflow N2 implementa únicamente ejecución manual. Retry/recover permanecen
previstos para una iteración posterior y `scheduled` continúa diferido. Un único escritor del dataset;
no calendario independiente, webhook público, Git pull, fuentes remotas ni nuevas tablas
de jobs. N8N no repara fuentes, valida schemas complejos, genera embeddings ni publica.

Retry explícito solo tras reconciliar resultado y restaurar dependencias, conservando
fuente/receta/configuración. No retry automático ilimitado ni ciego por nodo.
Ready histórica requiere acción administrativa aparte para rollback, no este workflow.

## Versionado y evidencia

La definición ejecutable se versiona en `ingestion-manual-v1.json`; los cambios
funcionales no deben quedar únicamente en la UI de N8N. La exportación versionada
no contiene secretos, URLs operacionales definitivas ni datos de ejecuciones.
`workflow_ref` deberá fijar la ruta de esa exportación y el SHA completo de su
revisión desplegada; la exportación no se autoincluye su propio SHA.

Capturar instantes reales de disponibilidad aprobada, trigger y publicación/fallo,
duraciones y resultados por intento. No incluir estos valores variables en receta.
OE4 exige todos los escenarios críticos del [plan](../../eval/ingestion/plan.md)
con resultado esperado; hoy ninguno se presenta como ejecutado. Duración observada
sin umbral nuevo, y actualización académica de OE4 pendiente.
