# CHECKPOINT BANUCHAT — BCH-04/M01: preflight detenido

Fecha: 22 de octubre de 2026, America/Bogota. Base comprobada: `7c423bd3d4706a3b728e1bbdb07c315b794e702d`. Árbol limpio al iniciar. Se conserva la línea base integral de OE1–OE6.

## Resultado y motivo de detención

**M01 no está implementado ni aprobado. No se creó un servidor ejecutable ni se publicaron herramientas.** El preflight encontró incompatibilidades entre los servicios que se pidió reutilizar y el contrato MCP congelado. Se documentan para decisión de Sala de Control antes de modificar esos servicios o sustituir sus superficies de lectura.

La regla de [AGENTS.md](../../AGENTS.md), sección Reglas de implementación, es explícita: **«Si código y contrato vigente son incompatibles, detenerse y reportarlo.»** También prohíbe modificar contratos congelados para hacer pasar una implementación. Esta es la causa de la detención; no se atribuye a una revisión MCP inexistente, falta de permiso de red institucional ni rechazo automático de herramientas.

**No se ha demostrado que sea necesario modificar el contrato MCP.** La vía recomendada es mantenerlo y autorizar una conciliación delimitada de servicios/superficies de lectura, preservando REST y el esquema SQL. La decisión pendiente es cómo realizar esa conciliación dentro de la prohibición de alterar SQL y duplicar reglas. No se adoptó una coincidencia exacta como equivalente de búsqueda parcial, no se descartó `query` silenciosamente y no se inventó `version_label: null`.

La autorización de M01 no se extendió a M02, A01, CCD, Sheets, cambios de corpus, recetas o publicaciones. Las brechas encontradas corresponden al perfil sintético de M01, no requieren iniciar una integración CCD.

## Preflight realizado y archivos protegidos

Se revisaron completos [README MCP](../../backend/mcp-server/README.md), [contrato funcional](../../backend/mcp-server/tools-contract.md) y [contrato JSON](../../backend/mcp-server/tools.contract.json), sus seis herramientas, defaults, errores y reglas de release/procedencia. Se inspeccionaron los servicios de [recuperación por consulta](../../backend/api/src/application/document-query-retrieval.ts), [retrieval](../../backend/api/src/application/document-retrieval.ts), [documentos](../../backend/api/src/application/document-lookup.ts), [cursos](../../backend/api/src/application/course-catalog.ts), [calendario](../../backend/api/src/application/calendar-events.ts), [anuncios](../../backend/api/src/application/announcements.ts), [progreso](../../backend/api/src/application/profile-progress.ts) y [release vigente](../../backend/api/src/application/current-release.ts). Se cotejaron las funciones de lectura y columnas relevantes de `infra/db/001_initial_schema.sql` sin modificarlo.

Protegidos: contratos REST/MCP, backend existente, Mobile, SQL/migraciones, dataset sintético, corpus/manifiestos/releases CCD, embeddings almacenados y recetas. No se leyeron archivos de credenciales ni se abrieron conexiones PostgreSQL/Ollama. No se inició una aplicación, contenedor o listener.

Se capturó un inventario SHA-256 de **610 archivos** protegidos: archivos versionados de backend/API/RAG/MCP, Mobile, infra y datos, más archivos locales CCD presentes. Incluye **36 archivos bajo `data/synthetic` y 293 bajo `data/ccd`**; son conteos de archivos, no de documentos o unidades del corpus. El inventario auxiliar está fuera del repositorio, en el directorio de artefactos de esta conversación. SHA-256 del inventario: `ba9a594eed61df09043bd69a231d4bd266a419c36ea5a2c171e698267b80dad0`.

Esta captura se hizo durante el preflight, antes de crear este checkpoint y sin haber realizado modificaciones del repositorio. La comparación final contra sus entradas comprueba integridad física de esos archivos; no es una auditoría del estado de PostgreSQL ni un hash de sus filas/vectores. Como no hubo conexión DB, no se atribuye una validación runtime de aislamiento o ausencia de escrituras a ese inventario.

## Compatibilidad MCP y transporte

### Revisión declarada y ciclo de vida

La revisión **`2026-07-28` sí existe**. El esquema oficial la declara como revisión vigente y exige versión/capacidades del cliente por petición en `_meta`. Las respuestas incluyen `resultType`; el objeto de datos de cada herramienta seguiría validándose separadamente contra su `outputSchema`. [Esquema oficial 2026-07-28](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2026-07-28/schema.ts).

El SDK TypeScript oficial distingue era anterior, con `initialize`, y moderna, con `server/discover` y metadatos por petición. Permite fijar `2026-07-28` sin fallback. Por tanto, la prueba solicitada de inicialización/negociación debe comprobar descubrimiento, versión y rechazo de incompatibles para la revisión elegida; no anunciar `2026-07-28` sobre un handshake antiguo. Esto es una precisión del protocolo ejecutable, no una modificación automática de los inputs/outputs de negocio. [Versiones y negociación del SDK oficial](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/protocol-versions.md).

### SDK y decisión de transporte propuesta

El `package.json` oficial consultado declara `@modelcontextprotocol/server` **2.3.1**, Node `>=20` y exportación `./stdio`. El proyecto API declara Node `>=22`. Esto acredita compatibilidad declarada de motores y disponibilidad del transporte en la fuente consultada, **no una combinación instalada y probada en BanuChat**. [Paquete oficial del servidor](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/packages/server/package.json).

Se propone **stdio local**, lanzado como subproceso por el cliente de demostración, sin puerto de escucha. El protocolo usa JSON-RPC delimitado por líneas en stdin/stdout; logs solo en stderr. El perfil se entrega por configuración controlada al arrancar el proceso y nunca mediante argumentos de `tools/call` o metadatos del modelo. La conexión de ese proceso a PostgreSQL/Ollama sería exclusivamente local. [Transporte stdio oficial](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/basic/transports/stdio.mdx).

No se instaló SDK, no se creó package/lockfile y no se ejecutó negociación de transporte. Una consulta `npm view @modelcontextprotocol/server@2.3.1 version engines dist.integrity --json` no produjo respuesta y se interrumpió; **no se verificó la disponibilidad del tarball ni su integridad de registro**. La URL tentativa `packages/server/src/stdio/index.ts` respondió 404 y no se usó como evidencia de implementación. No se confunde el código de la rama oficial `main` con una versión npm instalada. La selección definitiva exige instalar/fijar la versión verificable y realizar pruebas cliente-servidor después de resolver la detención.

### Diferencias de protocolo que deben quedar expresas

El contrato exige error JSON-RPC cuando los argumentos incumplen el schema de una tool; los errores semánticos posteriores van en `isError: true` y el schema de error propio. La documentación MCP distingue peticiones mal formadas/tools desconocidas de errores de validación de la herramienta; recomienda que estos últimos se comuniquen al modelo como errores de ejecución. El esquema oficial formula ese tratamiento como **SHOULD**, no como una prohibición absoluta de JSON-RPC. No se presenta esa diferencia como incompatibilidad normativa concluyente ni se cambia el contrato por ella. El comportamiento efectivo del SDK elegido debe comprobarse; un wrapper no debe transformar silenciosamente la clasificación congelada. [Errores de herramientas](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/server/tools.mdx), [schema `CallToolResult`](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2026-07-28/schema.ts).

No se identificó una incompatibilidad de los seis JSON Schemas Draft 2020-12 con la revisión oficial por la mera presencia de `inputSchema`, `outputSchema`, anotaciones o `structuredContent`. No se ejecutó certificación de conformidad del SDK. Ningún campo protocolar adicional se incorporó al contrato de datos de las herramientas.

## Comparación concreta con los servicios existentes

| Área / herramienta | Contrato congelado | Código inspeccionado / diagnóstico | Consecuencia y decisión pendiente |
| --- | --- | --- | --- |
| `find_documents`: búsqueda | Coincidencia parcial literal sin distinguir mayúsculas según campos descritos; consulta 2–500, límite máximo 20 | `document-lookup.ts:30` usa `dv.title = $2`; `lookupDocuments` recorta la consulta y aplica coincidencia exacta. El diagnóstico capturó esa consulta parametrizada | No delegar sin adaptación: fallarían términos parciales y diferencias de mayúsculas. Autorizar superficie nueva/reutilización explícita sin cambiar el lookup exacto usado por REST |
| `find_documents`: salida | `version_label` requerido, nullable solo cuando el valor real es nulo | La consulta, el tipo `DocumentLookupDocument` y la normalización omiten la columna. La respuesta del servicio fue rechazada por el outputSchema MCP por falta de `version_label` en el fixture | Añadir el campo desde su fuente real en una superficie aprobada. No completar con null por desconocimiento ni alterar el schema para aceptar la omisión |
| `get_courses`: filtro | `query` opcional, búsqueda literal parcial sobre nombre/descripción antes del límite; estados/defaults según contrato | `CourseCatalogInput` solo admite `statuses`/`limit`. En JavaScript, pasar un objeto con `query` no lo filtra ni lo envía a SQL; en TypeScript la interfaz tampoco lo representa | No ignorar el argumento. Autorizar filtro en servicio de lectura preservando el comportamiento REST existente; no filtrar solo el primer lote limitado |
| `search_knowledge`: camino | `current_retrieval_context` → embedding de la release → `search_chunks_cosine`, un reintento completo ante cambio y después error de dependencia | El servicio de API consulta configuración de una release suministrada internamente y ejecuta su propia consulta de chunks; no invoca esas funciones ni resuelve por sí solo el puntero actual/reintento MCP | Se necesita adaptador/servicio de recuperación para MCP que reutilice el cliente y validaciones, respetando las funciones aprobadas. No asumir equivalencia completa del camino actual |
| `search_knowledge`: desempate | Distancia, clave documental, ordinal | `document-retrieval.ts:50`: distancia, `document_version_id`, ordinal. La función SQL `search_chunks_cosine` existente sí ordena por clave documental | Cambiar el orden del resultado después del top-k puede perder empates que quedaron fuera. Autorizar reutilización del camino SQL correcto sin modificar la función congelada ni alterar el RAG existente |
| Consultas estructuradas: snapshot | Puntero y registros en mismo snapshot READ COMMITTED, con pertenencia a la release; vacío conserva UUID | Servicios resuelven `resolveCurrentRelease` mediante una consulta y luego consultan entidades con ese UUID; progreso hace además una lectura de perfil. No existe garantía de misma instantánea por delegar directamente | Inmutabilidad protege datos de la release elegida, pero no demuestra selección de current junto a datos en la instantánea exigida. Diseñar superficie/adaptador y probar publicación concurrente. No declarar que envolver en READ COMMITTED varias sentencias crea una sola instantánea |
| `get_calendar_events` | Días civiles Bogotá, hasta 366 inclusivos, filtros y claves por tipo, límite 50 | Servicio ya convierte límites en SQL usando `America/Bogota`, verifica rango y normaliza fin/claves/fechas | Lógica de dominio reutilizable; falta wrapper estricto, snapshot, errores y guardas de destino. No se creó ni probó una tool MCP |
| `get_announcements` | Filtro literal, estado derivado, referencia capturada una vez, límite 50 | Servicio usa `strpos(lower(...),lower(...))`, captura/reutiliza referencia, filtra estados y normaliza procedencia | Lógica reutilizable; falta snapshot/wrapper y validación completa contra salida MCP. No se creó ni probó una tool MCP |
| `get_profile_progress` | Perfil del contexto controlado, sin argumento libre; joins y progreso coherentes, límite 50 | Servicio exige `profile_key` por llamada desde código y verifica progreso/fechas. No proporciona transporte ni autorización del contexto por sí mismo | Inyectar perfil fijo/controlado del proceso, rechazar argumentos extra; conservar PROFILE_CONTEXT_REQUIRED/NOT_FOUND. Falta snapshot/wrapper y configuración local segura |
| Seguridad de lectura/destino | Cliente de privilegios mínimos, sin identidad propietaria/ingesta; solo demo sintética | No existe runtime MCP que imponga rol/DB/dataset/manifest sintético ni excluya CCD en cada frontera necesaria | Diseñar/verificar esas guardas antes de exponer herramientas. No basta usar las anotaciones `readOnlyHint` ni el nombre de la base |

Las diferencias anteriores son del código de reutilización y de la frontera aún ausente; **no son pruebas de que el contrato sea inválido o deba reducirse**. La función SQL correcta ya existe para búsqueda; no se propone reescribirla. Tampoco se propone una consulta SQL distinta dentro de cada handler que duplique dominio para sortear las diferencias.

## Arquitectura interna propuesta, no implementada

```text
Cliente local controlado
  -> proceso stdio MCP (descubrimiento/revisión por petición)
  -> catálogo exacto desde tools.contract.json
  -> validador de entrada Draft 2020-12 + invariantes semánticas
  -> contexto confiable de perfil sintético + guardas de destino/lectura
  -> adaptadores de seis tools
  -> servicios de aplicación/superficies de lectura reconciliados
     -> PostgreSQL sintético local con permisos mínimos
     -> cliente Ollama local solo para embedding de consulta
  -> validación de salida/procedencia/límites e invariantes
  -> structuredContent y su JSON idéntico en un bloque text, o error saneado
```

El transporte no consume REST ni se conecta al chat. El servidor no contiene agente, prompts de planificación o selección autónoma de herramientas. El LLM no elige perfil, release histórica, SQL, rutas, credenciales o URL de embedding. No hay escritura de historial ni corpus; `full_document` no entra al embedding. RAG generativo/T11/U03/U04 permanecen fuera de este proceso.

El contexto de base/perfil debe proceder de configuración del operador, validada al arrancar; nunca de `_meta` arbitrario. Configuración de rol de lectura y permisos requiere revisión sin crear roles/grants o migraciones en esta tarea. No se reutiliza automáticamente un propietario. Para satisfacer snapshot/current hacen falta pruebas de concurrencia de la superficie que finalmente se apruebe, no solo fixtures de respuestas.

## Pruebas y resultados realmente ejecutados

Desde `backend/api` se ejecutó un diagnóstico efímero con `node --import tsx --input-type=module`, importando los servicios TypeScript reales. Usó Ajv Draft 2020-12 y `ajv-formats` ya instalados en `backend/rag`, sin instalar dependencias. Los clientes SQL eran dobles de prueba en memoria con UUID/textos/hashes ficticios; no hubo conexión DB ni embedding.

| Comprobación | Resultado real | Límite |
| --- | --- | --- |
| JSON y catálogo | Nombres y orden exactos de las seis herramientas comprobados con aserción | No es `tools/list` de un servidor |
| Schemas | Compilaron los **13 schemas**: seis inputs, seis outputs y error, con formatos registrados y validación estricta; `strictTypes:false` para uniones nullable del contrato | Compilación no es batería exhaustiva de instancias ni validación de una salida runtime |
| Falta `version_label` | Respuesta de `lookupDocuments` con fixture válido de documento rechazada por outputSchema; aserción de error required `version_label` satisfecha | Demuestra falta de campo al reutilizar el servicio; no se inventó el valor DB |
| Búsqueda documental exacta | Consulta capturada contiene `dv.title = $2` y omite `version_label`; aserciones satisfechas | No se ejecutó esa sentencia en PostgreSQL |
| Filtro de curso | Payload con `query: 'termino-inexistente'` no pasa el término a la consulta del servicio; se devolvió el fixture no filtrado, como esperaba la aserción diagnóstica | Evidencia de argumento no soportado por el servicio, no fallo de una tool implementada |
| Desempate de retrieval | Lectura/aserción de fuente confirmó `ORDER BY cosine_distance ASC, dc.document_version_id ASC, dc.ordinal ASC` | Es una comprobación estática; no una prueba de empate real pgvector |

El proceso terminó con código **0** y resumen `diagnostico_preflight_sin_servicios`: catálogo/orden, 13 schemas y cuatro hallazgos reproducidos, `database_calls:0`, `ollama_calls:0`, `writes:0`. Las aserciones pasaron porque comprobaron los hallazgos; **no significan que el contrato MCP pase**.

No se ejecutaron inicialización/negociación real, `tools/list`, `tools/call`, salidas/errores de servidor, SDK/transporte, paridad end-to-end, permisos DB o aislamiento runtime CCD. Estado de esas pruebas: **no ejecutadas**. Herramientas realmente implementadas: **0 de 6**. No hay servidor parcial que anuncie seis tools o devuelva éxitos ficticios.

No se ejecutaron suites REST/RAG/Mobile ni consultas reales: al no cambiar implementación no se justificó volver a correr baterías costosas. Su compatibilidad se preservó por ausencia de cambios de esos archivos; **no se presenta una nueva regresión runtime como PASS**. No hubo ingestas, generación/almacenamiento de embeddings, modificaciones de publicaciones, infraestructura universitaria ni pruebas con usuarios reales.

## Integridad, archivos y cierre

Único archivo añadido en el repositorio: `docs/transition/bch04-m01-checkpoint.md`. No se modificaron README, contratos o fuentes de implementación para insinuar que existe servidor. Inventario auxiliar fuera del repo; diagnóstico efímero sin archivos de código persistidos, nuevas dependencias o lockfiles.

Al cierre se compararon los hashes de las **610 entradas protegidas: cero cambios**. `git diff --check` y `git diff --no-index --check -- NUL docs/transition/bch04-m01-checkpoint.md` terminaron con código 0; no se encontraron enlaces locales rotos. `git status --short` mostró únicamente este checkpoint nuevo. La igualdad física acredita conservación del dataset sintético y de los archivos CCD inspeccionados, incluidos sus manifiestos locales. No sustituye consultas de integridad DB; estas no se ejecutaron. La separación CCD se conservó operativamente al no conectarlo ni configurar un proceso MCP; no se atribuye una prueba negativa runtime de aislamiento.

## Decisión concreta solicitada a Sala de Control

Se recomienda **mantener sin cambios `2.0.0-draft`** y autorizar una continuación M01 de conciliación técnica que especifique:

1. Una superficie de lectura compartida para búsqueda documental parcial con `version_label` real, manteniendo el lookup exacto REST y sus respuestas congeladas.
2. Filtro literal de nombre/descripción de cursos antes del límite, sin alterar defaults o forma REST.
3. Adaptador de retrieval MCP sobre `current_retrieval_context`/`search_chunks_cosine`, reutilizando cliente/receta de embedding y validadores, con el reintento limitado previsto por contrato. Mantener RAG existente intacto.
4. Solución de instantánea/current y permisos mínimos para lectura estructurada, sin modificar DDL, funciones SQL, releases o dataset; aclarar expresamente si la restricción «no alterar SQL» permite nuevas consultas SELECT en servicios de aplicación. No duplicar SQL de dominio en handlers.
5. SDK publicado verificable y stdio moderno, con pruebas reales de descubrimiento/rechazo de revisión, catálogo y clasificación de errores conforme al contrato. El perfil controlado y la exclusión CCD se prueban antes de habilitar llamadas reales.

Estas decisiones no requieren iniciar M02 ni A01. Si Sala concluye que debe cambiar una obligación congelada, deberá autorizar el delta del contrato de forma expresa y coordinada; no hacerlo como efecto secundario de instalar un SDK.

**CHECKPOINT BANUCHAT — BCH-04/M01: preflight documentado; implementación detenida ante diferencias código/contrato.** No hay aceptación técnica del servidor, ni equivalencia con ReAct. Sin commit ni push. Devolver a Sala de Control y esperar decisión; no iniciar M02/A01 o corregir T11 automáticamente.
