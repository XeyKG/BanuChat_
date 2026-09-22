# N8N

Orquestación asíncrona de ingesta y sincronización de datasets sintéticos,
incluido el calendario de `/data/synthetic/calendars`.

La fuente de verdad permanece versionada en `/data/synthetic`; N8N no la genera
arbitrariamente. No interviene como gateway síncrono entre móvil y backend.
Los flujos futuros se exportarán a `workflows/`; todavía no hay workflows funcionales.
