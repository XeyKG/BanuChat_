# AGENTS.md — BanuChat

## Proyecto

Nombre oficial: **BanuChat**.

"Route AI" es únicamente el nombre antiguo del anteproyecto y no debe usarse como
nombre vigente en código, UI, paquetes, carpetas, variables ni documentación nueva.

BanuChat es un proyecto de grado de Ingeniería de Sistemas. El repositorio se encuentra
en implementación incremental. No asumir que el anteproyecto académico original describe
el estado técnico actual.

## Restricciones de datos

Todo el corpus funcional del MVP es **100% sintético** y versionado en:

`/data/synthetic`

No usar, buscar, copiar ni incorporar datos reales de personas, UNAB o CCD.

No hacer scraping ni consumir sitios/APIs reales de UNAB o CCD.

`/data/synthetic` es la fuente de verdad. PostgreSQL contiene su representación procesada.

No modificar el dataset v1 congelado salvo autorización explícita.

## Arquitectura vigente

Flujo conversacional:

`Mobile → REST Backend API → Intent Router → fast path o Agent/RAG → MCP interno`

N8N NO participa en el camino síncrono de consultas.

La arquitectura prevé que N8N orqueste de forma asíncrona la ingesta, delegando
validación, procesamiento, embeddings, recovery y retry en `backend/rag`.

Persistencia:

- PostgreSQL + pgvector.
- Una configuración de embedding por release.
- Ollama local.
- Modelo de embeddings MVP: `qwen3-embedding:0.6b`.
- 1024 dimensiones.
- Distancia coseno.
- Búsqueda exacta inicialmente; sin HNSW/IVFFlat.

Los documentos `full_document` no se fragmentan ni vectorizan.

## Estado y contratos

Los detalles del estado implementado viven en los archivos específicos del componente,
no en este AGENTS.md.

Leer SOLO cuando la tarea lo requiera:

- arquitectura general → `docs/arquitectura.md`
- ingesta/recovery/retry → `docs/ingesta-reproducible.md`
- decisiones → `docs/adr/`
- PostgreSQL → `infra/db/001_initial_schema.sql` y `infra/db/README.md`
- RAG/ingesta implementada → `backend/rag/README.md`
- MCP → `backend/mcp-server/tools-contract.md`
- REST → contratos de `backend/api`
- Intent Router → ADR/especificación correspondiente
- evaluación de ingesta → `eval/ingestion/plan.md`

No leer todos estos documentos por defecto.

SQL, dataset v1, REST y contrato MCP se consideran congelados salvo autorización
explícita de la tarea.

## Reglas de implementación

- TypeScript estricto.
- Cambios pequeños y delimitados.
- No introducir tecnologías o frameworks fuera del alcance solicitado.
- No añadir ORM si SQL explícito es suficiente.
- No mover lógica de negocio a N8N.
- No crear endpoints, workflows, componentes o abstracciones "para el futuro"
  sin necesidad de la tarea actual.
- No modificar contratos congelados para hacer pasar una implementación.
- Si código y contrato vigente son incompatibles, detenerse y reportarlo.
- No hacer retry/recovery automático si la tarea no lo autoriza.
- No inventar métricas, resultados de pruebas ni procedencia runtime.

## Seguridad

Nunca commitear:

- passwords;
- tokens;
- API keys;
- connection strings reales;
- secretos de N8N/PostgreSQL/Ollama;
- datos identificables reales.

Los errores expuestos no deben incluir secretos, SQL completo, stacks, payloads
privados ni paths arbitrarios.

No contratar ni configurar servicios cloud de pago sin autorización explícita.

## Git y archivos

No ejecutar operaciones destructivas sin autorización:

- `git reset`
- `git clean`
- `git checkout --`
- `git restore`
- rebase destructivo

No hacer commit ni push salvo solicitud explícita.

Respetar `.gitattributes`.

No ejecutar `git add --renormalize .` sin revisión explícita.

## Validación

Ejecutar únicamente las pruebas pertinentes al componente modificado.

Para cambios en `backend/rag`, normalmente desde esa carpeta:

`npm run typecheck`

`npm test`

Ejecutar `npm run test:db`, E2E, Docker u Ollama solo cuando la tarea los necesite.

No volver a ejecutar pruebas costosas ya acreditadas si el cambio no puede afectarlas.

Antes de terminar:

`git diff --check`

y comprobar que no se modificaron archivos fuera del alcance autorizado.

## Forma de trabajo

Primero inspeccionar el estado existente y reutilizarlo.

No rediseñar decisiones ya aprobadas salvo contradicción real.

Si la tarea especifica archivos concretos, revisar esos archivos y sus dependencias
directas; no hacer un barrido completo del repositorio.

Reportar al final:

- archivos modificados;
- pruebas realmente ejecutadas;
- resultados;
- límites o riesgos encontrados.

No declarar PASS para pruebas que no se ejecutaron.