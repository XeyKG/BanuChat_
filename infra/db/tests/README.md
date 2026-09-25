# Validación ejecutable del esquema

Suite SQL sin frameworks externos. Ejecutar únicamente contra una base desechable
recién migrada, como propietario de la migración. No prueba permisos de roles runtime.

`001_schema_integration.sql` comprueba el catálogo real (16 tablas exactas, 17 funciones,
20 triggers no internos, vector(1024), extensión vector, sin pgcrypto ni ANN) y A–K:

| Caso | Comprobación |
| --- | --- |
| A | Hash canónico automático y rechazo de configuración inválida/duplicada |
| B | Publicación incompleta rechazada; estado, fecha y puntero sin cambios |
| C | Publicación oficial completa: siete unidades, relaciones y dos chunks |
| D | Ocho UPDATE/DELETE rechazados sobre identidades y corpus publicado |
| E | FK compuestas rechazan progreso/evento que intentan usar claves de otra release |
| F | Documento completo no admite chunks, incluso en staging |
| G | Ranking exacto e1/e2: distancias 0/1, contenido y procedencia correctos |
| H | Rechazo de top_k 0/51/NULL, vector cero/NULL/otra dimensión y release incorrecta/NULL |
| I | Segunda release vigente; histórico conservado y excluido del retrieval normal |
| J | Conversación user/assistant y cita histórica; rechazo de release/fuente/user incompatibles |
| K | Cascada del historial sin cambiar ningún registro de las otras 13 tablas |

## Fixtures y transacciones

Los fixtures SQL son datos efímeros de prueba, no corpus funcional ni un seed de ingesta.
Sus nombres llevan `SYNTHETIC TEST`; revisiones, rutas y checksums son simulados y no
afirman corresponder a archivos existentes. No se modifica `/data/synthetic` ni se leen
archivos, APIs, modelos o fuentes institucionales. Una ingesta funcional futura debe
validar sus propios archivos versionados; esta suite no sustituye esa validación.

Los vectores de 1024 dimensiones se construyen con las bases ortogonales e1/e2, sin IA.
Toda la suite usa `BEGIN ISOLATION LEVEL READ COMMITTED` y termina en `ROLLBACK`:
no persisten fixtures, tablas auxiliares ni funciones temporales. Los fallos esperados
se aíslan en subtransacciones y se verifica tanto SQLSTATE como mensaje. Un error
inesperado o una aserción falsa detiene psql con código distinto de cero.

## Ejecución desde la raíz del repositorio

Requiere Docker Engine Linux activo. Conservar el Compose y su imagen
`pgvector/pgvector:pg16`; no levantar otros servicios. Antes de iniciar, revisar
`docker ps -a` y `docker volume ls`: el nombre fijo `banuchat-postgres` y el volumen
`banuchat-schema-test_pgvector_data` deben estar libres o pertenecer exclusivamente
a esta prueba, nunca a una instalación con datos que deban conservarse.

Usar `.env` local ignorado por Git, sin sobreescribir uno existente, con valores
exclusivamente de desarrollo: `POSTGRES_DB=banuchat_schema_test`,
`POSTGRES_USER=banuchat_test`, una contraseña ficticia de prueba y `POSTGRES_PORT=5432`
si está libre. Compose también requiere un valor ficticio `N8N_ENCRYPTION_KEY` para
interpolación: esto no inicia N8N. No usar `up` sin el selector `postgres`.

Ejecutar cada comando solo si el anterior terminó correctamente:

```powershell
docker compose --env-file .env -p banuchat-schema-test -f infra/docker-compose.yml up -d --no-deps postgres
docker exec banuchat-postgres pg_isready -U banuchat_test -d banuchat_schema_test
```

Esperar a `accepting connections` (exit 0) antes de continuar. Confirmar ausencia
de tablas de usuario y del schema `banuchat`; si existe, no aplicar encima.

```powershell
docker exec banuchat-postgres psql -X -v ON_ERROR_STOP=1 -U banuchat_test -d banuchat_schema_test -c "SELECT to_regnamespace('banuchat'); SELECT count(*) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema');"
docker cp infra/db/001_initial_schema.sql banuchat-postgres:/tmp/001_initial_schema.sql
docker exec banuchat-postgres psql -X -v ON_ERROR_STOP=1 -U banuchat_test -d banuchat_schema_test -f /tmp/001_initial_schema.sql
docker cp infra/db/tests/001_schema_integration.sql banuchat-postgres:/tmp/001_schema_integration.sql
docker exec banuchat-postgres psql -X -v ON_ERROR_STOP=1 -U banuchat_test -d banuchat_schema_test -f /tmp/001_schema_integration.sql
```

Éxito: 11 filas PASS, `ROLLBACK`, marcador `SUITE_A_K_PASS_FIXTURES_ROLLED_BACK`
y código de salida 0. Una ejecución parcial no acredita la suite.

### Segunda ejecución limpia y cierre

Inspeccionar antes de borrar:

```powershell
docker inspect banuchat-postgres
docker volume inspect banuchat-schema-test_pgvector_data
```

Confirmar proyecto `banuchat-schema-test`, servicio `postgres` y montaje exclusivo
del volumen indicado en `/var/lib/postgresql/data`. Solo entonces:

```powershell
docker compose --env-file .env -p banuchat-schema-test -f infra/docker-compose.yml stop postgres
docker compose --env-file .env -p banuchat-schema-test -f infra/docker-compose.yml rm -f postgres
docker volume rm banuchat-schema-test_pgvector_data
docker compose --env-file .env -p banuchat-schema-test -f infra/docker-compose.yml up -d --no-deps --pull never postgres
```

Repetir readiness, comprobación de base vacía, migración y suite completas. No usar
`prune`, borrados globales ni eliminar volúmenes de instalaciones anteriores. Al
finalizar, incluso si una prueba falla, detener exclusivamente el contenedor de prueba:

```powershell
docker compose --env-file .env -p banuchat-schema-test -f infra/docker-compose.yml stop postgres
docker inspect banuchat-postgres --format '{{.State.Status}}'
```

## Fallo reproducido y corrección mínima

La primera aplicación del candidato sobre una base vacía falló en la línea 29:
`ERROR: syntax error at or near "$"`. Se esperaba crear `text_sha256`; el cuerpo
estaba delimitado por `$` en lugar de `$$`. Se corrigieron únicamente esos dos
delimitadores, sin cambiar la función ni el modelo. Tras el error, se comprobó que
no existían el schema `banuchat` ni la extensión `vector`: el DDL se había revertido.
La migración corregida y la suite A–K pasaron. Después se detuvo y eliminó exclusivamente
el contenedor de prueba y su volumen `banuchat-schema-test_pgvector_data`, verificando
previamente sus etiquetas. Se creó un volumen nuevo con la misma imagen local y se
confirmaron cero tablas de usuario, ausencia de `banuchat` y ausencia de `vector`.
En esa segunda ejecución limpia, migración y los 11 casos A–K terminaron con código 0;
el catálogo volvió a confirmar 16/17/20. La suite imprimió
`SUITE_A_K_PASS_FIXTURES_ROLLED_BACK`. Los resultados finales proceden de esta ejecución.

Entorno observado: Docker Engine 29.7.2 Linux/amd64, Docker Desktop 4.90.0,
Compose 5.5.1, PostgreSQL 16.15 (Debian 16.15-1.pgdg12+2), pgvector 0.8.6.
Imagen solicitada, sin cambiar el Compose: `pgvector/pgvector:pg16`.
Digest descargado:
`sha256:ccc6e83d6e35e931dc7c5def2022729d5a6c370318d099181995567ff1fb4d6b`.
El tag puede cambiar; se registra el digest observado sin modificar la decisión de imagen.

Incidencia local ajena al DDL: Windows reservaba el puerto 55432; se usó el 5432 libre
mediante `.env`, sin cambiar Compose ni las reservas de Windows.

## Límites

Se valida integridad en una sesión READ COMMITTED, no concurrencia entre sesiones,
permisos runtime/ingesta, TRUNCATE restringido por roles, rendimiento ni métricas de
calidad RAGAS OE1. No se prueban REPEATABLE READ/SERIALIZABLE, Ollama, ingesta de
archivos, backend, MCP, N8N ni móvil. Ningún resultado acredita esos componentes.
