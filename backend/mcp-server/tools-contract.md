# Contrato de herramientas MCP de BanuChat

## Estado y alcance

Esta especificación define el contrato previo a implementación de las herramientas que el núcleo agéntico de BanuChat puede invocar. Los nombres, entradas y salidas aquí descritos constituyen el contrato entre el agente, el servidor MCP, PostgreSQL, pgvector y el adaptador de calendario.

La especificación se basa en las secciones 7.6, 7.7, 11.4 y 12.2 (OE3) del anteproyecto, en `docs/arquitectura.md` y en `infra/db/001_initial_schema.sql`. No contiene handlers, credenciales ni conexiones reales.

El archivo `tools.contract.json` es la representación legible por máquina de este documento. Ante una discrepancia, se debe corregir ambos archivos en el mismo cambio antes de implementar.

## Perfil de protocolo

- Revisión objetivo: MCP `2026-07-28`.
- Esquemas: JSON Schema 2020-12.
- `tools/list`: publica las tools en el orden determinista definido en `tools.contract.json`.
- `inputSchema`: siempre tiene un objeto como raíz y rechaza propiedades desconocidas.
- `outputSchema`: usa un objeto como raíz para conservar compatibilidad con clientes anteriores.
- Respuesta exitosa: incluye el objeto validado en `structuredContent` y el mismo objeto serializado como JSON en un bloque `content` de tipo `text`.
- Error de ejecución: usa `isError: true` y un bloque `content` de tipo `text` con un mensaje seguro y recuperable.
- Los errores de protocolo, como parámetros inválidos o una tool inexistente, se responden mediante el error JSON-RPC correspondiente, no mediante el esquema de salida exitoso.

Las anotaciones MCP son indicativas y no sustituyen autenticación, autorización ni validación en el servidor.

## Convenciones comunes

### Nombres

Los nombres son estables, descriptivos y usan `snake_case`. Cambiarlos exige actualizar el agente, las pruebas, la documentación y cualquier flujo n8n consumidor.

### Identificadores y fechas

- Los identificadores internos se representan como UUID en texto.
- Las fechas sin hora usan ISO 8601 `YYYY-MM-DD`.
- Las marcas de tiempo usan ISO 8601 con zona horaria.
- Los cursores son tokens opacos; el cliente no debe interpretarlos ni construirlos.

### Resultado y trazabilidad

Toda evidencia institucional recuperada debe conservar:

- documento y versión;
- título y autoridad de la fuente;
- sección o ruta de sección cuando exista;
- páginas cuando el formato las proporcione;
- URI canónica;
- hash SHA-256 de la versión o del fragmento;
- fecha de extracción o sincronización.

La ausencia de resultados se devuelve como un resultado exitoso vacío y explícito. El agente debe comunicar que no existe información suficiente y no completar la respuesta con conocimiento no verificado.

### Paginación y límites

- `top_k` y `limit` tienen máximos bajos para evitar extracción masiva de información.
- Las listas potencialmente extensas usan `next_cursor`.
- El servidor aplica límites aun cuando un cliente intente omitirlos o excederlos.

### Errores de ejecución

El texto de error debe serializar un objeto con esta forma, sin exponer consultas SQL, credenciales ni trazas internas:

```json
{
  "code": "DEPENDENCY_UNAVAILABLE",
  "message": "El calendario académico no está disponible temporalmente.",
  "retryable": true,
  "request_id": "0ee7de1c-cf72-4d90-9f2b-7e1a8ef82028"
}
```

| Código | Uso | Recuperable |
| --- | --- | --- |
| `UNAUTHENTICATED` | No existe una identidad de llamada válida. | No, requiere autenticación. |
| `FORBIDDEN` | La identidad no puede acceder al recurso solicitado. | No, requiere otro alcance o usuario. |
| `INVALID_ARGUMENT` | Una combinación de argumentos supera una regla no expresable en JSON Schema. | Sí, corrigiendo la llamada. |
| `NOT_FOUND` | Un identificador solicitado no existe o no es visible para el llamador. | Sí, consultando otro recurso. |
| `DEPENDENCY_UNAVAILABLE` | PostgreSQL, pgvector, embeddings o calendario no responden. | Sí, mediante reintento limitado. |
| `STALE_DATA` | La fuente existe, pero excede la ventana de frescura requerida. | Sí, tras una sincronización. |
| `INTERNAL_ERROR` | Fallo inesperado sin detalle sensible. | Posiblemente. |

## Catálogo de tools

| Nombre | Intención que resuelve | Fuente principal | Efectos |
| --- | --- | --- | --- |
| `search_institutional_knowledge` | Recuperar evidencia semánticamente relacionada con una consulta institucional | PostgreSQL + pgvector | Solo lectura |
| `find_official_documents` | Encontrar documentos y enlaces oficiales, incluidas guías no vectorizadas | PostgreSQL | Solo lectura |
| `get_academic_calendar` | Consultar eventos académicos y verificar frescura de la sincronización | Calendario sincronizado desde Google Sheets | Solo lectura |
| `get_student_course_history` | Consultar el historial del estudiante autenticado | PostgreSQL relacional | Solo lectura y sujeto autenticado |

## Tool search_institutional_knowledge

### Cuándo usarla

Se usa para preguntas sobre oferta, convocatorias, procesos, requisitos, noticias o contenido institucional del CCD cuando la respuesta debe fundamentarse en fragmentos documentales. No se usa para guías de cátedra completas, fechas del calendario estructurado ni historial personal.

### Entrada

| Campo | Tipo | Obligatorio | Regla |
| --- | --- | --- | --- |
| `query` | string | Sí | Entre 3 y 2000 caracteres. |
| `top_k` | integer | No | De 1 a 20; valor predeterminado 5. |
| `max_cosine_distance` | number o null | No | De 0 a 2; si se omite, no filtra por umbral. |
| `filters.source_types` | array | No | Subconjunto de `website`, `pdf`, `excel`, `google_sheet`, `manual`. |
| `filters.document_types` | array | No | Subconjunto de `pdf`, `excel`, `html`, `google_sheet`, `other`. |
| `filters.language_code` | string | No | Código de idioma; inicialmente `es`. |
| `filters.extracted_after` | timestamp | No | Excluye versiones extraídas antes de la fecha. |

La tool genera el embedding de la consulta mediante el modelo activo; el agente nunca envía ni recibe vectores numéricos.

### Salida

Devuelve `retrieval_run_id`, datos del modelo empleado, estado de evidencia y una lista ordenada de coincidencias. Cada coincidencia contiene distancia y similitud coseno, texto del chunk y un objeto `citation` completo.

`evidence.status` solo indica si hubo coincidencias (`found` o `not_found`). No afirma que la evidencia sea suficiente para responder; esa decisión pertenece al agente y debe considerar la pregunta completa.

### Anotaciones

```json
{
  "readOnlyHint": true,
  "destructiveHint": false,
  "idempotentHint": true,
  "openWorldHint": false
}
```

## Tool find_official_documents

### Cuándo usarla

Se usa cuando el estudiante solicita el documento oficial, una guía de cátedra o un enlace de descarga. Realiza búsqueda sobre metadatos; nunca fragmenta ni vectoriza documentos cuya política sea `full_document_link`.

### Entrada

| Campo | Tipo | Obligatorio | Regla |
| --- | --- | --- | --- |
| `query` | string | Sí | Título, tema o términos del documento; entre 2 y 500 caracteres. |
| `document_types` | array | No | Filtra por tipos documentales aprobados. |
| `vectorization_policy` | string | No | `chunk` o `full_document_link`. |
| `limit` | integer | No | De 1 a 20; valor predeterminado 10. |
| `cursor` | string o null | No | Cursor opaco devuelto por una llamada anterior. |

### Salida

Devuelve documentos activos con título, autoridad, URI canónica, política de vectorización y metadata de su versión lista más reciente. No devuelve el contenido completo del archivo.

### Anotaciones

```json
{
  "readOnlyHint": true,
  "destructiveHint": false,
  "idempotentHint": true,
  "openWorldHint": false
}
```

## Tool get_academic_calendar

### Cuándo usarla

Se usa para fechas, inscripciones, convocatorias y eventos académicos estructurados. Consulta la copia sincronizada del calendario y reporta su frescura; no lee rangos arbitrarios de Google Sheets.

### Entrada

| Campo | Tipo | Obligatorio | Regla |
| --- | --- | --- | --- |
| `date_from` | date | Sí | Inicio inclusivo del rango. |
| `date_to` | date | Sí | Fin inclusivo; debe ser igual o posterior a `date_from` y estar a máximo 366 días. |
| `event_types` | array | No | Filtro por tipos definidos en el catálogo del calendario. |
| `academic_program_code` | string o null | No | Código institucional, máximo 50 caracteres. |
| `limit` | integer | No | De 1 a 100; valor predeterminado 50. |
| `cursor` | string o null | No | Cursor opaco para continuar la consulta. |

### Salida

Devuelve eventos ordenados cronológicamente y un bloque `freshness` con la última sincronización, nombre de la fuente, antigüedad en minutos y estado `fresh` o `stale`. Una antigüedad superior a 30 minutos se marca como `stale` para hacer verificable OE4.

### Anotaciones

El resultado depende de una fuente institucional sincronizada y por eso usa `openWorldHint: true`.

```json
{
  "readOnlyHint": true,
  "destructiveHint": false,
  "idempotentHint": true,
  "openWorldHint": true
}
```

## Tool get_student_course_history

### Cuándo usarla

Se usa para preguntas en primera persona sobre cursos completados o en progreso. La identidad del estudiante se obtiene del contexto autenticado de la llamada y no de un identificador proporcionado por el LLM.

### Entrada

| Campo | Tipo | Obligatorio | Regla |
| --- | --- | --- | --- |
| `statuses` | array | No | Subconjunto de `completed`, `in_progress`, `planned`. |
| `completed_from` | date o null | No | Fecha mínima de finalización. |
| `completed_to` | date o null | No | Fecha máxima; no puede preceder a `completed_from`. |
| `limit` | integer | No | De 1 a 50; valor predeterminado 20. |
| `cursor` | string o null | No | Cursor opaco para continuar la consulta. |

### Salida

Devuelve únicamente el identificador seudónimo visible para el servicio y la lista autorizada de cursos. No devuelve nombre, correo, documento de identidad, calificaciones ni datos de otro estudiante.

La tool falla con `UNAUTHENTICATED` si no existe un sujeto de llamada y con `FORBIDDEN` si el sujeto no tiene el alcance `student:history:read`. La autorización se aplica en el servidor aunque el agente solicite la llamada.

### Anotaciones

```json
{
  "readOnlyHint": true,
  "destructiveHint": false,
  "idempotentHint": true,
  "openWorldHint": false
}
```

## Reglas de selección para el agente

| Intención detectada | Tool | Ejemplo |
| --- | --- | --- |
| Pregunta institucional que requiere evidencia textual | `search_institutional_knowledge` | “¿Qué requisitos tiene la convocatoria?” |
| Solicitud de guía, PDF o enlace oficial | `find_official_documents` | “Dame la guía de cátedra de ciudadanía digital.” |
| Consulta de fechas o eventos | `get_academic_calendar` | “¿Cuándo cierran las inscripciones?” |
| Consulta sobre cursos del usuario | `get_student_course_history` | “¿Qué cursos he completado?” |
| Pregunta compuesta | Varias tools en ciclo ReAct | “Según mis cursos, ¿qué convocatoria vigente me conviene?” |

El agente no debe sustituir una tool fallida con conocimiento propio. Puede reformular argumentos, consultar otra fuente autorizada o declarar que la información no está disponible.

## Controles de seguridad

- No se expone una tool de SQL arbitrario.
- No se expone una tool para leer rangos arbitrarios de Google Sheets.
- No se aceptan nombres de tabla, columnas, operadores SQL ni URLs libres como parámetros de consulta.
- Las consultas usan sentencias parametrizadas y una identidad de base de datos de solo lectura.
- La tool de historial deriva el estudiante del principal autenticado.
- Los logs registran nombre de tool, duración, resultado y `request_id`, pero no vectores completos, contenido sensible ni credenciales.
- Los límites, filtros y permisos se aplican en el servidor; las anotaciones MCP no son controles de acceso.
- Los mensajes de error no incluyen consultas SQL, trazas de pila ni secretos.

## Dependencias de diseño pendientes

Antes de implementar se requieren estos artefactos:

1. Migración para eventos del calendario sincronizado.
2. Migración para historial de cursos asociado a `student_profiles`.
3. Definición del proveedor y modelo activo de embeddings.
4. Política de autenticación del transporte MCP y mapeo del principal al perfil seudónimo.
5. Política de cursores firmados y tiempo de expiración.
6. ADR sobre transporte MCP; Streamable HTTP es el candidato para el despliegue en contenedores.

## Criterios de aceptación del contrato

- `tools/list` publica exactamente los cuatro nombres y sus anotaciones.
- Toda entrada válida por JSON Schema llega al handler con tipos normalizados.
- Toda entrada inválida es rechazada antes de acceder a una dependencia.
- Todo resultado exitoso valida contra su `outputSchema`.
- `content` y `structuredContent` representan el mismo resultado.
- Las coincidencias semánticas siempre incluyen una cita reproducible.
- Una búsqueda sin evidencia devuelve `not_found` y una lista vacía.
- Las guías de cátedra solo se devuelven como metadata y enlace.
- El historial nunca permite elegir el identificador de otro estudiante.
- Los fallos de PostgreSQL, embeddings o calendario se convierten en errores MCP seguros y recuperables.
- Las pruebas de selección demuestran que el agente elige la tool correcta y combina tools en consultas de varios pasos, conforme a OE3.

## Control de cambios

Los nombres y esquemas quedan congelados al aprobar esta especificación. Un cambio incompatible requiere una nueva versión de contrato, actualización coordinada del agente y pruebas de compatibilidad. Agregar campos opcionales puede tratarse como cambio compatible; renombrar campos, cambiar tipos, volver obligatorio un campo o alterar su semántica es incompatible.

## Referencias técnicas

- [MCP 2026-07-28: Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- [MCP TypeScript SDK v2](https://ts.sdk.modelcontextprotocol.io/v2/)
- [JSON Schema 2020-12](https://json-schema.org/draft/2020-12)
