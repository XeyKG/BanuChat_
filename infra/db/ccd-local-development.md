# Persistencia local CCD — delta del incremento 1

## Chat HTTP local del incremento 3

`003_ccd_chat_demo.sql` se aplica exclusivamente en CCD publicado y sin chats
previos: `npm run ccd:local -- chat-migrate` desde `backend/rag`. No repetir sobre
la instalación ya migrada. Añade una tabla de contexto técnico fuera del corpus,
con clave y alias fijos, release FK e inmutabilidad; la FK de conversaciones CCD
ahora apunta a ese contexto. No añade registros a `synthetic_profiles`, no modifica
el corpus ni las guardas de mensajes/citas y no cambia la FK de la base sintética.

El caso HTTP se inicia desde `backend/api` con `npm run test:ccd:http`. Usa la API
real compilada y verifica historial/citas; escribe solo historial CCD. La demo
sintética se comprueba solo con GET. El runner cierra exclusivamente sus listeners;
PostgreSQL y volúmenes quedan activos. Los detalles están en
[checkpoint 3](../../docs/transition/bch03-increment-3-checkpoint.md).

## Estado ejecutado en BCH-03 incremento 2

Primera ingesta realizada en `banuchat_ccd_dev`, proyecto `banuchat-ccd-dev`, servicio
`postgres-ccd`, volumen exclusivo y puerto loopback 55433. Se comprobó destino vacío
antes de aplicar `001` intacta y `002_ccd_local_manifest.sql`. Solo M01/M12: dos
documentos/versiones/chunks/embeddings, release `ready/current`. Sin escritura en la
demo. Los resultados exactos están en
[el checkpoint](../../docs/transition/bch03-increment-2-checkpoint.md).

El diseño del incremento 1 que sigue más abajo se conserva como antecedente;
las adaptaciones que describía como pendientes ya están implementadas.

Operación implementada desde `backend/rag` (usa `infra/.env.ccd`, no versionado):

```powershell
# Solo sobre una base CCD nueva y vacía, después de verificar su identidad:
npm run ccd:local -- migrate
# Admisión SQL sin persistir pruebas (rollback):
npm run ccd:verify -- validators
# Primera carga explícita; no reemplaza una release diferente:
npm run ccd:local -- ingest
npm run ccd:local -- inspect
# Document RAG directo, tres preguntas y evidencia local:
npm run ccd:verify -- queries
```

No repetir `migrate` en la instalación existente. `connectCcdLocal` comprueba labels
de proyecto/servicio, imagen, volumen, puerto loopback y `current_database()` antes
de SQL. `load-local.ts` rechaza migraciones en destinos con tablas/esquemas previos.
La migración adicional falla fuera de `banuchat_ccd_dev` o si ya hay corpus cargado;
no modifica tablas iniciales ni permite multidataset. Mantiene el validador v1 y
añade la rama CCD con scope, C/M, fuentes, huellas, límites y referencias.

El escritor usa `StorageRecipe` explícita, sin modificar defaults v1. La segunda
invocación idéntica observada fue `already_current`, con cero embeddings nuevos.
No hay retry/recovery automático. Un corpus o código distinto exige otra tarea de
actualización: esta entrada de primera carga lo rechaza, no sobrescribe.

La ruta de consultas usa SQL CCD, `getDocumentArtifact` con raíz CCD y el modo
`evidence_mode: ccd_local`. El modo sintético conserva su prompt. La ruta real de
chat/perfiles no se altera; no se persisten conversaciones ni `message_citations`.
Las citas devueltas se guardan en la evidencia local y se cotejan con artefactos/DB.
No se abren puertos adicionales para API/Mobile ni se publica contenido institucional.

## Antecedente: diseño del incremento 1

Estado: diseño acotado para la primera carga posterior. Sin SQL aplicado, servicios
arrancados ni base CCD creada en este incremento. No cambiar `001_initial_schema.sql`.

## Aislamiento implementado en configuración

`infra/docker-compose.ccd.yml` usa proyecto `banuchat-ccd-dev`, servicio
`postgres-ccd`, base `banuchat_ccd_dev`, puerto local por defecto 55433 y volumen
propio `ccd_pgvector_data` dentro de ese proyecto. No reutiliza `pgvector_data`,
`container_name`, variables ni N8N de la demo. No monta scripts de inicialización.
Un puerto ocupado debe hacer fallar el arranque; no detener otro servicio para liberarlo.
El puerto se puede cambiar con `CCD_POSTGRES_PORT`. No se comprobó disponibilidad
operacional en este incremento.

Para el siguiente incremento, después de completar escritor/delta y revisar destino:

```powershell
# Desde la raíz. Copiar y completar infra/.env.ccd antes del arranque.
docker compose --env-file infra/.env.ccd -f infra/docker-compose.ccd.yml up -d postgres-ccd
```

No se ejecuta este comando aquí. Las credenciales se mantienen locales. No usar
`down -v`, ni operaciones sobre la base o el volumen de demostración.

## Origen comprobado de la restricción

| Capa | Restricción | Resolución mínima |
| --- | --- | --- |
| SQL, tabla `datasets` | `CHECK (id = 1)` | Mantener: hay una base aislada por corpus. |
| SQL, publicación/recuperación | `publish_release`, `current_retrieval_context`, `search_chunks_cosine` fijan id 1 | Mantener dentro de cada base. |
| Servicios `db/releases.ts` y tipos | `datasetId: 1` | Mantener; no introducir multidataset. |
| SQL `validate_manifest` | Solo admite `synthetic: true` | Delta imprescindible para la base CCD. |
| Runtime/source approval | Carpeta Git sintética y perfil v1 | CCD parte de snapshot local y hashes externos, no de un falso checkout fuente. |
| Configuración actual | Compose y conexión demo | Compose CCD independiente; conexiones de carga/API deben apuntar explícitamente a CCD. |

## Delta físico mínimo a implementar y probar durante la primera carga

Aplicar el esquema inicial solo sobre una base CCD vacía, comprobando primero
`current_database() = 'banuchat_ccd_dev'` y ausencia de esquema/datos anteriores.
Después aplicar una migración CCD separada, nunca reescribir la migración histórica.
La migración deberá preservar el validador sintético y añadir una rama explícita
para `synthetic: false`, `corpus_kind: ccd_local`, `schema_version: ccd-1.0.0`,
dataset `banuchat-ccd-local` y alcance local con `institutional_approval: false`.
Comprobar en SQL: items documentales únicos, rutas/hashes coherentes, solo M01/M12,
enlace de cada item a su unidad y procedencia, dos fuentes distintas y estados de
validación/alcance. La rama CCD debe fallar ante metadatos ausentes o corpus ajeno.
Preservar las guardas de staging, inmutabilidad, citas y publicación completa.

No hacen falta tablas nuevas: `manifest.ccd_provenance` conserva el contrato CCD
completo, SHA físico de `corpus.json`, fuentes externas con SHA y localizadores;
las tablas documentales existentes conservan el artefacto depurado y sus chunks.
El hash `source_sha256` de la versión/cita corresponde al Markdown derivado servido
por la API, no al DOCX. La cadena al original está en `ccd_provenance`; no confundir
esos hashes ni sobrescribir una versión publicada.

`git_revision` NO puede atribuirse a los originales externos. Para CCD se propone
documentar explícitamente esa columna como revisión base del código/contrato,
y guardar la identidad fuente efectiva (`local_snapshot_sha256`), revisión de código
y huellas de archivos de implementación ejecutados en `pipeline_config`. Esto permite
ejecutar código aún no commiteado sin afirmar que HEAD contiene esos cambios. La
identidad del corpus está dada por el snapshot y sus fuentes, no por HEAD. El escritor
deberá calcular esta procedencia; en este incremento no se registra runtime de ingesta.

## Adaptaciones exactas del escritor pendientes

No pasar CCD al `StageInput` sintético por un cast ni modificar sus conteos globales.
Crear una entrada CCD específica que reutilice lease, SQL documental, registro de
intentos, cliente Ollama, generación vectorial y publicación. Los puntos que deben
recibir la receta/conteos validados CCD en esa entrada son:

- `db/releases.ts`: `validatePipelineConfigV1` y la identidad fuente Git.
- `db/documents.ts`: exige seis chunks por documento y descarta páginas; CCD produce
  un chunk por unidad, sin páginas inventadas y con locator `unit:M01`/`unit:M12`.
- `ingest.ts`: construye receta sintética y exige 60 embeddings.
- `db/finalize.ts`: exige 76 items, 12 documentos y 60 chunks. CCD exige 2/2/2.
- `approval/source.ts` y verificador Git: no aceptan fuentes locales externas;
  reutilizar la frontera CCD ya implementada, sin debilitar la aprobación v1.

Los metadatos no se vectorizan por separado ni se vectorizan originales completos.
Solo se generan los dos embeddings de contenido documental depurado. Mantener
Qwen 0.6b/1024/coseno, revisión y receta reales inspeccionadas mediante Ollama.
No añadir reintentos automáticos ni declarar disponible un modelo no inspeccionado.

## Comprobación inmediata posterior

Revalidar las dos fuentes y el snapshot antes de cargar. Ensayar el delta y las
guardas en una base desechable, publicar en CCD aislado y comprobar persistencia,
idempotencia explícita y correspondencia de hashes. Para consultar usar los servicios
documentales del backend con SQL CCD, raíz de artefactos CCD y etiqueta de evidencia
adecuada. El prompt actual se declara sintético y el artefacto usa `data/synthetic`
por defecto: requieren cableado de compatibilidad, sin mejoras conversacionales.
No crear un estudiante real ni copiar perfiles para eludir las FK del chat; primero
probar `generateDocumentRagAnswer` directamente con la release CCD.

Una consulta por grupo: «¿Qué tres pilares describen los lineamientos 202660?»
y «¿Qué correo registra la fuente 202660 para orientación del CCD?». Verificar
`unit:M01`/`unit:M12`, Markdown/checksum, localizadores originales y advertencias
temporales. Añadir negativa sobre reconocimiento, equivalencias o vigencia actual.
Las citas automáticas enumeran contexto recuperado; la fidelidad de la respuesta
requiere cotejo humano. Guardar resultados observados, no inferirlos de este diseño.
