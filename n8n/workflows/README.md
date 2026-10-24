# Workflow lógico de ingesta

Estado: existe `ingestion-manual-v1.json`, importado en N8N 2.40.5 e inactivo como
automatización. Su ejecución manual N3 validó `/execute` y el camino E2E local con
publicación `ready/current`, seguida de `already_current`. Véase [evidencia N3](../../eval/ingestion/results/n3-n8n-e2e-2026-10-02.md).
La evidencia aplica solo a Windows + Docker Desktop + Compose actual; no acredita
Linux ni despliegue institucional.
Referencias: [ADR 0005](../../docs/adr/0005-ingesta-reproducible-n8n.md) y
[especificación autoritativa](../../docs/ingesta-reproducible.md).

## Secuencia del workflow manual v1

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

El paso 6 resume el trabajo interno realizado por el componente TypeScript durante
`/execute`; ese procesamiento no se descompone en nodos N8N con SQL/Code que
dupliquen el pipeline. Ante un fallo interno, el componente revierte la transacción
abierta, cierra los items `pending` y el run como `failed`, conserva `current` y
puede marcar la candidata como `failed`.

Si N8N pierde la respuesta de `/execute`, consulta
`POST /internal/ingestion/status` antes de cualquier decisión posterior. Un estado
desconocido no autoriza retry y un run activo no se abandona por timeout del cliente.

## Entradas, salidas y límites

Contrato HTTP implementado (verificado contra `backend/rag/src/internal-http/protocol.ts`):

- Execute: `approval_ref`, `source_git_revision` completo, `pipeline_version`,
  `workflow_ref`.
- Retry futuro: `approval_ref`, `release_id`, `source_git_revision` completo,
  `pipeline_version`, `workflow_ref`.
- Recover futuro: `release_id`, `run_id`, `workflow_ref`.
- Status por identidad: `approval_ref`, `source_git_revision` completo,
  `pipeline_version`, y `workflow_ref` como correlación.

Este workflow manual implementa solo status y execute. Retry y recover futuros
no forman parte de este flujo.
Selectores autorizados por configuración del componente, nunca rutas/SQL/modelos libres.
Salida: outcome, release_id, run_id/attempt_no si existen, revisión/hashes/configuración
y contadores derivados. Fallos llevan error_code y retryable; no stacks o credenciales.
Detalles y códigos HTTP privados en la especificación, sin alterar REST público.

El workflow manual v1 implementa únicamente ejecución manual. Retry/recover permanecen
previstos para una iteración posterior y `scheduled` continúa diferido. Un único escritor del dataset;
no calendario independiente, webhook público, Git pull, fuentes remotas ni nuevas tablas
de jobs. N8N no repara fuentes, valida schemas complejos, genera embeddings ni publica.

Retry explícito solo tras reconciliar resultado y restaurar dependencias, conservando
fuente/receta/configuración. No retry automático ilimitado ni ciego por nodo.
Ready histórica requiere acción administrativa aparte para rollback, no este workflow.

## Versionado y evidencia

La definición ejecutable se versiona en `ingestion-manual-v1.json`; los cambios
funcionales no deben quedar únicamente en la UI de N8N. El `workflow_ref` usado en
N3 fue
`n8n/workflows/ingestion-manual-v1.json@4fb7bd410cccf646d4454183550ec9f4aeb78f5a`.
El JSON base conserva placeholders para URL, `workflow_ref` e ID portable de
credencial; la instancia recibió overrides locales. Por ello no se afirma que el
objeto almacenado en N8N sea byte-for-byte idéntico al JSON versionado. Esta
limitación de procedencia queda pendiente para despliegues futuros. La evidencia de
ejecución está en [N3](../../eval/ingestion/results/n3-n8n-e2e-2026-10-02.md).

Capturar instantes reales de disponibilidad aprobada, trigger y publicación/fallo,
duraciones y resultados por intento. No incluir estos valores variables en receta.
N3 cubrió el camino manual exitoso asociado a I01 y el no-op I02, no todos los
escenarios del [plan](../../eval/ingestion/plan.md). Duración observada sin umbral
nuevo; retry/recover/scheduled y actualización académica de OE4 siguen pendientes.

## OE2 — flujos locales con fixtures

`oe2-academic-offer-fixture-v1.json`, `oe2-calls-fixture-v1.json` y
`oe2-news-fixture-v1.json` preparan schedules de seis horas, inactivos por defecto.
Coordinan la API interna OE2 y no duplican extracción, validación, estado o detección
de cambios en nodos Code. Solo aceptan fixtures locales y nunca publican en CCD.

No constituyen tres scrapers institucionales operativos ni evidencia de ejecución
autónoma. Véase [runbook OE2](oe2-fixtures-v1-runbook.md).
