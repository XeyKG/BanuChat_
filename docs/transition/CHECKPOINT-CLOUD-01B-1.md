# CHECKPOINT BANUCHAT — CLOUD-01B.1

12 de noviembre de 2026. Preflight remoto de solo lectura ejecutado y verificado en el proyecto Supabase `banuchat`, rama `main`, región `us-west-2`. **El destino todavía no está listo para restaurar BanuChat.** Base Git `main` en `9b4b2fc`, árbol inicialmente limpio y alineado con la referencia local `origin/main`.

## Alcance y método

Se revisaron el [checkpoint CLOUD-01B.0](CHECKPOINT-CLOUD-01B-0.md), `preflight.sql`, `local-inventory.sql` y `target-binding.proposed.sql`. La referencia local documenta 36 tablas y 21 funciones, con PostgreSQL 16.15, pgvector 0.8.6 en `public`, dos releases sintéticas, 32 estudiantes, 62 intentos y 120 vectores de 1024 dimensiones. Los conteos locales proceden del ensayo previo.

No había `psql` en PATH, variables libpq/Supabase visibles ni archivo de servicio libpq en la ubicación comprobada. Se usó el SQL Editor autenticado y se adaptó el preflight a dos sentencias `SELECT` de catálogos. La sesión del panel reportó `transaction_read_only=off`. Las únicas sentencias enviadas para ejecución fueron consultas de lectura, sin comandos psql, DDL ni DML. Se inspeccionaron también los paneles Connect y Data API. No se guardaron snippets ni se consultaron filas de aplicación.

## Resultados remotos

| Comprobación | Resultado observado |
| --- | --- |
| Servidor y base | PostgreSQL **17.11**, base **`postgres`**, rol del SQL Editor **`postgres`**. |
| Capacidad | `pg_database_size` devolvió **10 999 475 bytes** (~10,49 MiB) para esa base. El checkpoint anterior registró **26 de 500 MB** en el indicador del plan Free. Son mediciones de distinto alcance. El catálogo devolvió `max_connections=60` y `superuser_reserved_connections=3`. El límite efectivo del rol de aplicación y del pooler sigue sin comprobarse. |
| pgvector | **0.8.2 disponible**, sin instalación ni esquema efectivo. La consulta de versiones disponibles devolvió 0.8.2 y ninguna fila para 0.8.6. El control de 0.8.2 indica `superuser=true`, `trusted=false`, `relocatable=true` y esquema fijo nulo. La habilitación y el esquema de instalación requieren validación posterior por la vía administrada. |
| TLS | `pg_stat_ssl` para el backend que ejecutó el SELECT indicó **`ssl=true`, TLS 1.3, `TLS_AES_256_GCM_SHA384`**. Acredita cifrado del tramo observado por PostgreSQL. La verificación CA/hostname de un cliente PostgreSQL y el modo de conexión usado internamente por el panel siguen sin comprobarse. |
| Rutas anunciadas | Connect mostró conexión directa por IPv6 y pooler de sesión por IPv4. También ofreció pooler transaccional. Se inspeccionaron las opciones sin iniciar una conexión externa. El pooler transaccional queda excluido para `WriterLease`, que conserva su lock entre transacciones. [Conexiones y verificación TLS](https://supabase.com/docs/guides/database/connecting-to-postgres). |
| Data API | Habilitada. El panel muestra dos esquemas expuestos, `public` y `graphql_public`. `search_path` extra: `public` y `extensions`. Exposición automática de tablas nuevas activada, máximo 1000 filas y tamaño de pool sin valor explícito. El GUC `pgrst.db_schemas` fue nulo en la sesión SQL. [Permisos de Data API](https://supabase.com/docs/guides/api/securing-your-api). |
| Colisiones | Ausentes `banuchat`, `banuchat_auth`, `banuchat_academic` y `banuchat_aux`. `public` tenía cero tablas, otras relaciones y funciones de las clases consultadas. No se detectaron colisiones con los esquemas ni los roles propuestos de BanuChat. |

### Esquemas y objetos preexistentes

| Esquema | Dueño | Tablas | Otras relaciones¹ | Funciones | `CREATE` del rol editor |
| --- | --- | ---: | ---: | ---: | --- |
| `auth` | `supabase_admin` | 27 | 1 | 4 | No |
| `extensions` | `postgres` | 0 | 2 | 55 | Sí |
| `graphql` | `supabase_admin` | 0 | 0 | 0 | No |
| `graphql_public` | `supabase_admin` | 0 | 0 | 1 | No |
| `public` | `pg_database_owner` | 0 | 0 | 0 | Sí |
| `realtime` | `supabase_admin` | 3 | 1 | 19 | No |
| `storage` | `supabase_admin` | 10 | 0 | 24 | No |
| `vault` | `supabase_admin` | 1 | 1 | 5 | No |

¹ Vistas, vistas materializadas, secuencias y tablas foráneas. `anon`, `authenticated` y `service_role` tenían `USAGE` en los esquemas listados, salvo `vault`, donde solo `service_role` lo tenía de esos tres. `USAGE` por sí solo no acredita acceso a las filas. Extensiones instaladas: `pg_stat_statements` 1.11, `pgcrypto` 1.3 y `uuid-ossp` 1.1 en `extensions`, `plpgsql` 1.0 en `pg_catalog` y `supabase_vault` 0.3.1 en `vault`. Se excluyen todos estos objetos administrados de la transferencia.

### Roles y conflicto efectivo

| Rol observado | LOGIN | SUPERUSER | BYPASSRLS | CREATE en base | Membresías |
| --- | --- | --- | --- | --- | --- |
| `postgres` | Sí | No | Sí | Sí | Sí |
| `supabase_admin` | Sí | Sí | Sí | Sí | No |
| `authenticator` | Sí | No | No | No | Sí |
| `anon`, `authenticated` | No | No | No | No | No |
| `service_role` | No | No | Sí | No | No |

El rol `postgres` también tiene `CREATEROLE` y `CREATEDB`. Los seis roles consultados tenían `CONNECT` y `TEMP` sobre `postgres`. Los roles `cloud_runtime`, `cloud_provision`, `banuchat_auth_executor`, `banuchat_mcp_reader` y `banuchat_ingestion` no aparecieron en el catálogo.

`PUBLIC` tiene `CONNECT` y `TEMPORARY` en `postgres`. También tiene `CONNECT` en `template1`, que admite conexiones. `template0` tiene `CONNECT` para `PUBLIC`, pero su bandera de conexión está deshabilitada. Un rol nuevo con esos permisos heredados fallaría los checks `db_write` y `other_database` de `PgAuthStore.assertRuntime`. Revocar un permiso al rol individual no neutraliza una concesión a `PUBLIC`. Hace falta un plan acotado que preserve el aislamiento y verifique el rol real. La receta local de revocación en bloque sobre el clúster no es apropiada para Supabase.

## Matriz de compatibilidad

| Área | Decisión para una futura restauración |
| --- | --- |
| Esquemas y relaciones BanuChat | **Conservar** los tres esquemas privados, sus UUID, FKs, tablas y triggers. Están libres en el destino observado. Mantenerlos fuera de Data API y comprobar grants efectivos y por defecto. La exposición automática activa desaconseja alojar tablas de aplicación en `public`. |
| Vector de 1024 dimensiones | **Bloqueado en el estado actual.** Habilitar pgvector solo tras autorización. Validar el esquema efectivo y ensayar en PostgreSQL 17 / pgvector 0.8.2 una copia de los 120 vectores. La diferencia de versión por sí sola no exige regeneración. |
| Operadores y funciones vectoriales | **Adaptación condicional.** El código actual califica `public.vector`, `OPERATOR(public.<=>)`, `vector_dims` y `vector_norm`. Si la instalación queda en `extensions` u otro esquema, ajustar las referencias calificadas del DDL de transferencia y de los clientes SQL afectados. Comprobar firmas, dimensiones, distancias y orden de resultados. [Extensiones en Supabase](https://supabase.com/docs/guides/database/extensions). |
| `SECURITY DEFINER` | **Conservar diseño y adaptar propietarios/grants.** Recrear el ejecutor auth sin login, asegurar `search_path` fijo y referencias calificadas, revocar ejecución a `PUBLIC` y concederla por firma. Probar que el migrador administrado puede asignar los propietarios previstos. |
| Autenticación y autorización | **Adaptar ACL y perfil de conexión.** Separar migrador, API, aprovisionador, lector MCP e ingesta. Los roles administrados no cumplen los requisitos del runtime de BanuChat. Comprobar TEMP, CONNECT entre bases, memberships, propietarios y permisos efectivos de cada rol real. Mantener la autenticación propia. |
| `runtime_scope` | **Adaptar.** La base efectiva es `postgres`. Exigir referencia de proyecto comprobada, TLS verificado, manifiesto esperado, nuevo UUID de despliegue y ausencia de sesiones. El SQL propuesto de asociación quedó sin ejecutar. |
| Advisory locks | **Viable por diseño con prueba pendiente.** Usar directa o sesión. Validar con dos conexiones reales la contención, persistencia del lock al cruzar una transacción y liberación. El modo transaccional es incompatible con ese contrato. |
| Sesiones y credenciales | **Conservar las identidades sintéticas autorizadas.** Mantener UUID, bindings, grants y verificadores aprobados. Excluir tokens, sesiones, refresh, resets, contactos, credenciales de infraestructura y registros transitorios. El usuario de prueba debe iniciar sesión de nuevo. |
| Restauración lógica y capacidad | **Requiere ensayo.** Restaurar solo objetos propios y contrastar TOC, ACL, versiones, huellas y tamaño real de tablas e índices. El dump local de 902101 bytes es comprimido. Medir el presupuesto efectivo de conexiones con el rol y el pooler elegidos. |

## Plan de restauración controlada

1. Obtener autorización nueva y establecer conexión directa o de sesión con CA y hostname verificados, mediante un servicio libpq privado. Confirmar que proyecto, base, roles, ACL, capacidad y catálogo siguen coincidiendo con este preflight.
2. En un laboratorio descartable de PostgreSQL 17 y pgvector 0.8.2, validar DDL derivado sin reescribir migraciones congeladas. Preparar una lista positiva de los tres esquemas y los objetos revisados. Congelar el snapshot exclusivamente sintético, comprobar hashes de archivos, manifiestos y tablas y revisar el TOC. Excluir objetos de Supabase y CCD.
3. **Cerrar la prueba de citas persistidas antes de transferir.** El snapshot local revisado tenía cero filas de `message_citations`. Crear un turno RAG citado por REST con una cuenta sintética y confirmar que se guardan dueño, mensaje, release, versión documental, chunk y localizador. Exportar e importar esa fila con los UUID originales en el laboratorio, validar FKs y huellas y comprobar que un usuario dueño recibe la cita y puede resolver el artefacto por el REST existente. Verificar denegación a otro usuario. La comparación de citas en memoria del ensayo anterior no cubre esta prueba.
4. Con autorización, habilitar y verificar pgvector, aplicar el DDL adaptado con roles mínimos, restaurar transaccionalmente y asociar el nuevo despliegue con el manifiesto de la sucesora. Antes de habilitar tráfico, comprobar huellas, 2 releases, 32 estudiantes, 62 intentos, 120 vectores de 1024, login, progreso, historial, citas, aislamiento y recuperación. Repetir pruebas de TLS, permisos efectivos y locks con credenciales de aplicación.
5. Ante una discrepancia, conservar el runtime local activo. Tras un corte futuro, pausar escrituras y conciliar mensajes nuevos antes de volver a la configuración local. Conservar el respaldo sintético y las evidencias de ambos destinos.

La regeneración completa de embeddings sigue pendiente por falta de memoria CUDA para el contexto documental aprobado. Se conserva la estrategia de copiar vectores sintéticos existentes con procedencia verificada.

## Cierre

Pasaron los SELECT remotos de servidor, TLS, extensiones, roles, ACL de bases, esquemas y conteos de objetos, y la inspección de Connect y Data API. La conexión cliente `verify-full`, los permisos de los futuros roles y la restauración siguen pendientes. El único archivo local añadido es este checkpoint. No hubo cambios en Supabase, transferencia, commits, push ni avance a la migración.
