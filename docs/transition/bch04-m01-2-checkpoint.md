# CHECKPOINT BANUCHAT — BCH-04/M01.2

Fecha: 22 de octubre de 2026, America/Bogota. Base verificada: `7d12ea7359b3cb0ebd957b93a5e89055817c4282`; árbol limpio al iniciar. Se mantiene OE1–OE6. M02 y A01 no se inician.

## 1. Resultado: detención antes de provisionar

**M01 sigue abierto. No se creó el rol MCP y no se ejecutaron tools contra PostgreSQL/Ollama reales.** La inspección previa encontró permisos de PUBLIC que una identidad nueva recibiría fuera de la matriz autorizada:

- `TEMPORARY` en la base sintética de destino `banuchat_schema_test`.
- `CONNECT` a otras bases conectables del mismo clúster: `banuchat_n8n_test`, `postgres` y `template1`.
- También `TEMPORARY` en `banuchat_n8n_test` y `postgres`.

La instrucción M01.2 exige: **«Si aparecen permisos heredados excesivos, necesidad de revocar privilegios de otros usuarios, o imposibilidad de aislar el destino, detenerse antes de provisionar.»** Se aplicó esa condición sin crear siquiera un rol temporal, generar contraseña o cambiar permisos existentes.

En PostgreSQL los privilegios concedidos a PUBLIC se suman a los de cada usuario; un REVOKE dirigido únicamente al nuevo rol no elimina una concesión de PUBLIC. `NOINHERIT` regula membresías de roles, no suprime PUBLIC. Por eso conceder solo los permisos deseados al candidato no produciría la matriz efectiva restringida solicitada. Referencias primarias: [privilegios PostgreSQL 16](https://www.postgresql.org/docs/16/ddl-priv.html), [membresía de roles](https://www.postgresql.org/docs/16/role-membership.html).

La autorización permite un nuevo rol, pero no cambiar la política de los usuarios existentes. No se ejecutaron REVOKE sobre PUBLIC, cambios de autenticación/red, GRANT ALL o ajustes de roles previos para superar este bloqueo. No se usó la cuenta administrativa como identidad MCP alternativa.

## 2. Inspección efectuada y destino

Se revisaron [README DB](../../infra/db/README.md), [esquema inicial](../../infra/db/001_initial_schema.sql), [runtime MCP](../../backend/mcp-server/src/runtime.ts), [superficies de lectura](../../backend/api/src/application/mcp-synthetic-reads.ts), [README MCP](../../backend/mcp-server/README.md), [Compose sintético](../../infra/docker-compose.yml) y la configuración local necesaria para la conexión. La contraseña/connection string no se imprimió ni se copió al checkpoint.

| Evidencia real | Resultado |
| --- | --- |
| Cliente PostgreSQL | `127.0.0.1`, puerto de la configuración sintética, 5432; se rechaza el puerto CCD 55433 antes de conectar |
| Base comprobada | `banuchat_schema_test`; dataset `banuchat-synthetic` presente |
| PostgreSQL | `16.15 (Debian 16.15-1.pgdg12+2)` |
| Encoding / collation requerida | `UTF8`; `pg_catalog."C.utf8"` existe |
| Transacciones de auditoría | Dos sesiones/snapshots secuenciales `REPEATABLE READ READ ONLY`, con `default_transaction_read_only=on`; finalizan con ROLLBACK |
| Identidad administrativa existente | Rol técnico `banuchat_test`: superusuario, creador de roles/bases, replicación y bypass RLS; se empleó solo para la auditoría administrativa e integridad autorizadas |
| Roles existentes | 15, incluidos 14 predefinidos `pg_*`; ningún rol MCP existente |
| Candidato examinado | `banuchat_mcp_reader`; ausente antes y después; **no creado** |
| Membresías existentes | Tres: `pg_monitor` recibe `pg_read_all_settings`, `pg_read_all_stats` y `pg_stat_scan_tables`; no hay membresías asignadas al candidato inexistente |

No se abrió conexión a las otras bases enumeradas, a CCD ni a servidores institucionales. La inspección de `pg_database` identifica concesiones ACL del clúster; **no prueba haber iniciado sesión o leído datos en esas otras bases**. Tampoco se afirma haber verificado `pg_hba.conf` o que toda conexión externa sea posible. El exceso de privilegios ACL ya activa la condición de detención establecida por Sala.

## 3. Política histórica y matriz de lectura MCP necesaria

La política histórica del README/SQL de consulta es **USAGE de schema más EXECUTE únicamente en `current_retrieval_context` y `search_chunks_cosine`, sin SELECT de tablas base**. Esa política cubre la recuperación mediante funciones SECURITY DEFINER, pero **no cubre las nuevas lecturas estructuradas de MCP**.

Las consultas nuevas resuelven current mediante `datasets`/`dataset_releases` y leen documentos, catálogo, calendario, anuncios y progreso. La ampliación a SELECT fue autorizada por M01.1/M01.2, pero debe materializarse con privilegios efectivos revisados. No se cambió silenciosamente la política histórica ni se modificaron funciones para elevar privilegios.

Matriz mínima propuesta, **ningún permiso aplicado en esta tarea**:

| Objeto | Permiso necesario | Justificación |
| --- | --- | --- |
| Base sintética de destino | CONNECT | Conectar exclusivamente al destino autorizado |
| Schema `banuchat` | USAGE | Resolver tablas y funciones de lectura |
| Schema `public` | USAGE | Tipo `public.vector` utilizado en la búsqueda; PUBLIC ya tiene USAGE de este schema |
| `banuchat.datasets` | SELECT | `id`, nombre y puntero current |
| `banuchat.dataset_releases` | SELECT | Pertenencia, estado ready, manifiesto sintético e identidad de configuración |
| `banuchat.documents` | SELECT | Identidad, pertenencia y modo documental |
| `banuchat.document_versions` | SELECT | Metadata real, `version_label`, estado y procedencia |
| `banuchat.courses` | SELECT | Filtro nombre/descripción/estado y join de progreso |
| `banuchat.calendar_events` | SELECT | Eventos, tipos, relaciones, días civiles y procedencia |
| `banuchat.announcements` | SELECT | Ventanas temporales, filtros y procedencia |
| `banuchat.synthetic_profiles` | SELECT | Perfil de demostración y alias, no identidad real |
| `banuchat.profile_courses` | SELECT | Estados, porcentajes, fechas y procedencia del progreso |
| `banuchat.current_retrieval_context()` | EXECUTE | Configuración de consulta de la release vigente |
| `banuchat.search_chunks_cosine(public.vector,integer,uuid)` | EXECUTE | Recuperación exacta mediante función existente |

Son **nueve tablas**. No hacen falta SELECT directos de `embedding_configs` o `document_chunks` para ejecutar las herramientas: las dos funciones de lectura acceden a ellos con su identidad definidora. Tampoco hacen falta permisos sobre tablas de ingesta, conversaciones, mensajes, citas o secuencias para MCP. Los hashes administrativos de integridad de esas tablas se obtuvieron con la identidad de auditoría, no se propone concedérselos al runtime.

El candidato, si posteriormente se autoriza una solución compatible, debería tener LOGIN con secreto local no versionado, sin membresías, propiedad ni capacidades administrativas; NOINHERIT, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION y NOBYPASSRLS. No debe recibir CREATE, TEMPORARY, DML, TRUNCATE, privilegios de secuencias o ejecución directa de funciones de negocio distintas de las dos aprobadas. Esta es una matriz de revisión, no un rol provisionado ni un archivo de credenciales preparado.

## 4. Permisos efectivos de PUBLIC observados

| Base / schema | Permisos PUBLIC reales | Evaluación para el candidato |
| --- | --- | --- |
| `banuchat_schema_test` | CONNECT, TEMPORARY | CONNECT corresponde al destino; TEMPORARY excede la lista autorizada |
| `banuchat_n8n_test` | CONNECT, TEMPORARY | Destino adicional fuera de esta integración |
| `postgres` | CONNECT, TEMPORARY | Destino adicional fuera de esta integración |
| `template1` | CONNECT | Base conectable adicional |
| `template0` | CONNECT en ACL, `datallowconn=false` | Se registra el ACL, sin presentarlo como base conectable |
| Schema `public` del destino | USAGE; sin CREATE a PUBLIC | Compatible como acceso al tipo vector; no es el bloqueo |
| Schema `banuchat` del destino | Sin concesiones a PUBLIC | Coherente con la revocación histórica; el futuro rol necesita USAGE explícito |
| Tablas/secuencias `banuchat` | Cero concesiones a PUBLIC | No se observó DML o lectura de tablas por PUBLIC |
| Funciones `banuchat` | Cero concesiones a PUBLIC | No se observó EXECUTE público de publicación/ingesta |

También se inspeccionaron ACL de las 17 funciones de negocio y default privileges del propietario. La revocación histórica sobre schema/tablas/funciones no elimina por sí misma los permisos PUBLIC de las bases de datos. No se infiere ausencia de privilegios desde un ACL nulo: la inspección expandió los defaults mediante `acldefault`/`aclexplode`.

En `public` se observaron 118 rutinas de la extensión vector con EXECUTE a PUBLIC: 111 declaradas immutable y siete volatile, todas SECURITY INVOKER. No se encontraron rutinas personalizadas fuera de extensiones con EXECUTE público en ese schema. Esa clasificación se registra sin afirmar que volatile equivalga a escritura de corpus. La definición final de privilegios técnicos de tipos/operadores/extensión deberá distinguirse de los permisos de funciones de negocio; **el bloqueo actual se sostiene por TEMPORARY/CONNECT, sin depender de una interpretación de esas rutinas**.

El chequeo de `runtime.ts` sigue siendo una defensa válida de M01.1 para su alcance implementado, pero no comprueba CONNECT a otras bases ni TEMPORARY de PUBLIC. No se lo usó como sustituto de esta matriz administrativa y no se lo debilitó para aceptar la cuenta disponible.

## 5. Pruebas ejecutadas y pruebas bloqueadas

| Comprobación | Resultado real / estado |
| --- | --- |
| Inspección previa de roles, membresías, ACL, defaults y destino | Ejecutada contra PostgreSQL real; condición de bloqueo confirmada antes de provisionar |
| Disponibilidad `C.utf8` y UTF-8 | Comprobada por catálogo/configuración reales |
| `backend/mcp-server`: `npm test` | **24/24 aprobadas**, cero fallos, omitidas o canceladas; procesos cliente-servidor stdio reales con SQL/embeddings dobles |
| Creación de rol y secreto local | **No ejecutada**, por la condición de detención; cero roles/credenciales nuevos |
| Seis tools con rol nuevo y PostgreSQL real | **Bloqueadas**, no ejecutadas |
| `search_knowledge` con Ollama/pgvector reales | **Bloqueada**, cero llamadas Ollama y cero embeddings nuevos |
| Sentencias `snapshot()` reales | **Pendientes**; el éxito de los SELECT de auditoría no valida su sintaxis/correlación/resultados |
| Búsqueda parcial, `version_label`, filtros previos al límite | Solo evidencia previa/conservada con dobles; sin nueva ejecución funcional PostgreSQL |
| Días civiles Bogotá, anuncios y progreso real | Pendientes mediante tools y rol adecuado |
| Comparación con caracteres acentuados y `C.utf8` | Pendiente funcionalmente; existencia de collation no demuestra el resultado de `lower`/`strpos` con esos datos |
| Rechazo efectivo de INSERT/UPDATE/DELETE/TRUNCATE y cambio del puntero bajo identidad MCP | **No ejecutado**, porque no existe esa identidad; no se sustituyó por rechazo read-only de administrador |
| Rechazo de funciones de publicación/ingesta bajo identidad MCP | **No ejecutado**; ausencia de EXECUTE a PUBLIC comprobada por catálogo, sin invocar funciones de escritura |
| Argumento de perfil arbitrario y destino CCD | Siguen cubiertos por las pruebas MCP existentes con dobles/configuración; no se afirma un ataque runtime de una credencial real |
| Regresiones API/CCD, cambios de release, ingesta y pruebas universitarias | No ejecutadas; no hubo cambios de código que las afecten |

Las tools `search_knowledge`, `find_documents`, `get_courses`, `get_calendar_events`, `get_announcements` y `get_profile_progress` conservan su implementación y contrato. **Ninguna recibió un PASS de integración de datos real en M01.2.** No se registraron errores SQL de herramientas porque no se llegó a ejecutarlas. La detención por permisos queda conservada como resultado adverso, sin reintentar con privilegios elevados ni cambiar collation.

No se ejecutaron operaciones negativas destructivas o potencialmente escritoras. Si se habilita posteriormente el rol, las verificaciones negativas deberán diseñarse sin registros modificables y con transacciones seguras; su éxito no puede inferirse ahora desde los atributos de otro rol.

## 6. Integridad antes/después y evidencia

Se calcularon conteos y SHA-256 de las filas completas de las 16 tablas de aplicación, dentro de cada snapshot administrativo read-only. Cada hash ordena la representación JSON de las filas con collation C y la convierte a bytes UTF-8; incluye las columnas de embeddings, manifiestos, puntero y contenido de historiales, sin exportar filas o vectores al checkpoint.

| Tabla / área | Filas antes = después |
| --- | ---: |
| datasets / dataset_releases / embedding_configs | 1 / 2 / 2 |
| documents / document_versions / document_chunks | 12 / 24 / 120 |
| ingestion_runs / ingestion_items | 2 / 152 |
| courses / calendar_events / announcements | 24 / 44 / 16 |
| synthetic_profiles / profile_courses | 8 / 36 |
| conversations / messages / message_citations | 75 / 160 / 240 |

**16/16 hashes de tablas idénticos**, cero cambios de filas observados. El hash de `document_chunks` incluye el contenido exacto serializado de la columna embedding; no se confundió cantidad de filas con un conteo independiente de vectores no nulos. El puntero y estados de publicaciones están incluidos en los hashes de datasets/releases. No se activaron ni borraron publicaciones.

Digest SHA-256 del resumen de conteos/hashes de las 16 tablas, antes y después:
`cd77ed8a124a18d6c6f51c1c8307f1fbebd6c5272f5a9d3c9cfc88b42b13bcb5`.

Se compararon además **nueve secciones de permisos/metadatos**, con cero diferencias: roles, membresías, ACL de bases, schemas y tablas, firmas/atributos/ACL de funciones, defaults y rutinas públicas de extensión/personalizadas. El candidato estaba ausente en ambos extremos. La igualdad de snapshots no se presenta como monitorización continua de acciones de terceros; las operaciones emitidas por esta tarea fueron exclusivamente de lectura y cierre de transacción.

En archivos se compararon **470 entradas protegidas**, sin cambios, incluidas **36 bajo `data/synthetic` y 293 bajo `data/ccd`**, código de lectura/conversación, MCP, SQL y Mobile. El cotejo de archivos CCD locales no es una conexión a la base CCD ni admisión de fuentes nuevas; los originales externos no se modificaron.

Evidencia local, ignorada por Git:

- `tmp/m01-2-permissions-audit.mjs`: auditoría administrativa de lectura, sin CREATE ROLE/GRANT/REVOKE o credenciales literales.
- `tmp/m01-2-permissions-before.json`, `tmp/m01-2-permissions-after.json`: metadatos/ACL y hashes, sin contraseña ni filas de negocio exportadas.
- `tmp/m01-2-integrity-comparison.json`: comparación de estado de datos y permisos.
- `tmp/m01-2-files-before.json`: huellas físicas de archivos protegidos.
- `tmp/m01-2-mcp-tests.log`: corrida de las 24 pruebas existentes.

## 7. Archivos modificados y decisiones pendientes

Único archivo del repositorio añadido: `docs/transition/bch04-m01-2-checkpoint.md`. No se modificaron implementación MCP/API, runtime, SDK/lockfiles, contratos, SQL/migraciones, Mobile, corpus, modelos o parámetros. Los auxiliares anteriores permanecen ignorados; no se creó un script de provisioning que pudiera aplicarse sin resolver la condición de permisos. Sin commit ni push.

Validación final: `git diff --check` sin errores; cero enlaces locales rotos o líneas con whitespace final; `git check-ignore` confirma la exclusión de evidencias auxiliares. `git status --short` muestra únicamente este checkpoint nuevo y los 470 archivos protegidos siguen sin cambios.

La decisión devuelta a Sala es **cómo obtener una identidad con la matriz efectiva restringida sin incumplir la prohibición de cambiar PUBLIC/política de otros usuarios**. Una solución podría requerir una autorización delimitada sobre ACL del entorno local, con inventario de afectados y preservación de sus accesos, o un entorno de demostración separado con política compatible. No se crea, clona, migra ni configura ninguno de esos escenarios en esta tarea. Revocar solo al candidato o añadir read-only de sesión no resuelve las concesiones PUBLIC observadas.

También permanece el límite explícito de SELECT sobre tablas versionadas: aun con el rol correcto, esas concesiones no imponen aislamiento histórico por fila. El uso de current y la prohibición de seleccionar otra release se hacen cumplir en las herramientas; un cliente SQL directo con SELECT de esas tablas podría leer otras publicaciones sintéticas allí almacenadas. No se propuso RLS, vista nueva o función adicional para ocultar ese límite sin autorización.

M02 requerirá su propia revisión de contrato/procedencia/aislamiento CCD; una credencial de demostración sintética no es transferible por defecto. A01 continúa pendiente: contar con servidor MCP y tests stdio no demuestra selección autónoma, razonamiento ReAct ni tareas agénticas multietapa. T11 y U03/U04 no cambiaron.

**CHECKPOINT BANUCHAT — BCH-04/M01.2: inspección real e integridad completadas; provisioning y validación MCP de datos detenidos por privilegios PUBLIC excesivos. M01 sigue sin cierre integral. Detenerse para revisión de Sala de Control; no iniciar M02/A01.**
