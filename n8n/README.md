# N8N

Estado: N8N 2.40.5 fue levantado localmente mediante el Compose vigente y desde su
contenedor se verificó conectividad autenticada a `POST /internal/ingestion/status`.
El resultado fue `not_started`; no hay workflows funcionales ni ejecución de ingesta.
La fuente de verdad es `/data/synthetic`, creada/revisada por el equipo y versionada
antes de ingesta. El calendario se ingiere dentro de una **release completa**;
no existe sincronización de calendario independiente ni fuente institucional externa.
N8N no inventa hechos, modifica fuentes, ejecuta Git pull ni administra colaboración Git.

La frontera seleccionada en el [ADR 0005](../docs/adr/0005-ingesta-reproducible-n8n.md)
es N8N → interfaz HTTP privada → componente TypeScript de `backend/rag` → Ollama y
PostgreSQL. N8N controla triggers, llamada, condiciones sencillas y resumen; TypeScript
posee preflight, relaciones, parser, chunking, embeddings, DML, retry y publicación.
No SQL manual ni reglas complejas en nodos Code. No Execute Command ni webhook público.

Primera implementación: triggers `manual` y `retry`; `scheduled` está soportado por
el contrato físico, pero su activación queda para después. Entrada: referencia de
aprobación, SHA Git completo, receta, referencia de workflow y run previo en retry.
Salida: resultado, identidad de release, run/attempt y contadores por estado; errores
saneados. Nunca paths libres, credenciales, SQL o corpus completo en los payloads.

No reintentar ciegamente una llamada con timeout: consultar estado primero. Un retry
verifica la representación existente y registra 76 resultados nuevos. Un fallo no
reemplaza current; solo publish_release promueve. Ready actual es no-op; ready histórica
se reporta sin reactivación. Procedencia desde runs fallidos requiere el tratamiento
documental/vectorial específico de la [especificación](../docs/ingesta-reproducible.md).

El workflow lógico y la política de exportación/versionado están en
[workflows/README.md](workflows/README.md). Se exportará JSON sin secretos cuando se
implemente, y workflow_ref fijará ruta y revisión de esa definición, no execution ID.
Los logs solo contienen correlación, estados, tiempos y códigos técnicos seguros.

N8N queda fuera del camino Mobile → REST → Intent Router → fast path / Agent-RAG.
OE2 mantiene sus objetivos no medidos; OE4 verifica orquestación E2E y publicación
atómica, no una latencia de calendario de 30 minutos. Véase el
[plan de pruebas](../eval/ingestion/plan.md). La evidencia local se registra en
[N0](../eval/ingestion/results/n0-local-operational-preparation-2026-10-02.md).
La conectividad observada acredita solo Windows local + Docker Desktop + Compose
actual; no acredita workflow, `/execute`, E2E, Linux ni despliegue institucional.
