# Runbook — BanuChat Manual ingestion v1

## Propósito

Orquestar manualmente la consulta de estado y, solo si devuelve `not_started`, una
única llamada a `POST /internal/ingestion/execute`. Ante error de transporte o
timeout de execute, el flujo consulta `/status` y termina con un resumen; nunca vuelve
a llamar `/execute` automáticamente.

## Importación y estado

Importar `ingestion-manual-v1.json` desde la interfaz de N8N o con el CLI nativo. El
workflow debe permanecer **inactivo**. N2 valida importación; no autoriza pulsar
Manual Run. La primera ejecución real corresponde a N3, con autorización y preparación
operacional de esa tarea.

## Configuración tras importar

En el nodo **Prepare Control Configuration**, reemplazar los placeholders:

- `ingestion_base_url`: `__BANUCHAT_INGESTION_BASE_URL__`.
- `workflow_ref`: `__BANUCHAT_WORKFLOW_REF__`.

No versionar esos valores operacionales definitivos en el JSON. En N0 se observó
`http://host.docker.internal:3010` únicamente en Windows + Docker Desktop; no es una
decisión portable ni topología aprobada para Linux o despliegues futuros.

## Credencial

Los tres nodos HTTP declaran una referencia de credencial N8N `BanuChat Ingestion
Service` de tipo HTTP Header Auth. En la instancia validada, ese ID no corresponde a
una credencial existente; después de importar, el operador debe seleccionar/revincular
la credencial correcta en **Check Ingestion Status**, **Execute Ingestion** y
**Reconcile Status**. No incluir el token en workflow, parámetros, body, README o
logs. La referencia local de credencial del export no es portable.

## Parámetros y comportamiento

- `/status` inicial: timeout explícito 30000 ms.
- `/execute`: timeout explícito 900000 ms.
- `/status` de reconciliación: timeout explícito 30000 ms.
- `Retry On Fail`: desactivado en todos los HTTP Request.
- `Execute Ingestion` envía errores por su salida de error a `Reconcile Status`.
- Si falla también la reconciliación, el flujo termina en `Reconciliation Summary`
  con `status_unavailable`; no repite execute.

Los timeouts son parámetros operacionales iniciales. 30000 ms no es SLA; 900000 ms
no es métrica académica. N0 observó una única consulta `/status` de 10538 ms y un
timeout artificial de 5 s insuficiente; 10538 ms no es latencia de N8N.

Los resúmenes contienen estado y campos técnicos saneados, sin autorización, token,
URLs de base de datos, paths personales, corpus, vectores o stack traces.
