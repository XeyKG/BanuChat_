# Infraestructura local

Configuración para desarrollo y demostraciones locales, usada en N0/N3. El Compose declara
una instancia PostgreSQL que incluye pgvector y un servicio N8N separado. No incluye
backend ni app móvil, y no monta ni ejecuta migraciones.

La organización Docker O1 añadió el entorno que posteriormente fue promovido en
[`docker-compose.dev.yml`](docker-compose.dev.yml). Conserva los Compose históricos,
separa CCD autenticado, demo sintética y N8N mediante perfiles. Durante O1 no
sustituyó el laboratorio `banuchat-ccd-auth-i1b-test`; O4 realizó la promoción
expresamente autorizada y O5 conserva I1B como reversión provisional.
La decisión, el arranque vigente y la recuperación se documentan en el
[runbook Docker](../docs/operations/docker-local-organization.md); el inventario y
la verificación están en el
[checkpoint O1](../docs/transition/docker-organization-o1-checkpoint.md).

La reconstrucción paralela O2 se documenta en el
[runbook CCD O2](../docs/operations/docker-ccd-auth-o2.md) y su
[checkpoint](../docs/transition/docker-organization-o2-checkpoint.md). El entorno
promovido permanece en 55453; I1B se conserva provisionalmente en 55443.

O3 ejecutó la API v2 en loopback:3013 contra ese candidato y validó autenticación,
aislamiento, historial, RAG CCD, citas, artefactos y abstención. La API temporal se
cerró al terminar. O4 promovió después `banuchat-dev` manteniendo PostgreSQL en
55453 y la API habitual en 3003, sin modificar Mobile ni retirar I1B. Véanse los
checkpoints [O3](../docs/transition/docker-organization-o3-checkpoint.md) y
[O4](../docs/transition/docker-organization-o4-checkpoint.md).

## Variables y seguridad

`/.env.example` documenta las variables. Usuario, contraseña y clave de cifrado se
dejan vacíos y deben definirse privadamente para cada ejecución local.
Compose exige los valores sensibles y solo publica puertos en `127.0.0.1`.
La ejecución desde la raíz debe cargar explícitamente `.env` mediante
`docker compose --env-file .env -f infra/docker-compose.yml up -d`.

La API CCD canónica usa el ejemplo
[`ccd-auth-api.config.example.json`](ccd-auth-api.config.example.json) y una copia
privada en `infra/local/banuchat-dev/ccd-auth-api.json`. El arranque habitual es
`npm run start:ccd-auth` desde `backend/api`; valida la identidad de 55453 antes de
abrir `127.0.0.1:3003`.

La API v2 ya autentica cuentas locales sintéticas en el entorno CCD; autenticación
institucional real sigue pendiente. El HTTP interno de ingesta usa un Bearer token
de servicio independiente. La clave de cifrado de N8N protege su configuración y
no sustituye las credenciales de usuario.

## Imágenes y persistencia

- Antes había `postgres:16` y `pgvector/pgvector:pg16` como dos servidores.
  Se conserva la imagen ya configurada `pgvector/pgvector:pg16` como única instancia,
  manteniendo PostgreSQL 16. Esta etiqueta conserva la versión mayor, pero no fija
  un parche ni un digest; el bloqueo exacto queda pendiente de validación del entorno.
- N8N está fijado en `n8nio/n8n:2.40.5`; fue levantado localmente con este Compose.
  N0 validó preparación y N3 ejecutó el workflow manual E2E. La versión observada
  en esas evidencias no afirma cuál es la versión más reciente publicada.
- Se conserva el volumen lógico `pgvector_data` y el de N8N. Quitar la declaración
  del antiguo `postgres_data` no borra ni migra un volumen existente. Antes de un
  futuro arranque debe comprobarse si hay volúmenes previos: cambiar variables de
  inicialización no modifica credenciales de una base ya creada.

El dataset original reside en `/data/synthetic`; PostgreSQL guarda su representación
procesada. La imagen PostgreSQL incluye pgvector y la migración vigente habilita
`vector` mediante `CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;`.
Compose no ejecuta automáticamente la migración: una base nueva sin aplicar
`001_initial_schema.sql` no debe suponerse migrada.

La conexión N8N → componente TypeScript de ingesta mediante HTTP interno está
implementada: startup y `/status` se validaron en
[N0](../eval/ingestion/results/n0-local-operational-preparation-2026-10-02.md), y
el workflow manual importado ejecutó `/status` → `/execute` → publicación
`ready/current`, seguido de `already_current`, en
[N3](../eval/ingestion/results/n3-n8n-e2e-2026-10-02.md).
N8N orquesta; validación, procesamiento y embeddings pertenecen a `backend/rag`.

N3 usó Windows + Docker Desktop y `host.docker.internal`; no acredita una topología
portable. Retry/recover/scheduled N8N y permisos/roles mínimos siguen pendientes.
Backend, ingesta y mobile no están containerizados por este Compose; Ollama también
se ejecuta por separado. No hay Google Sheets, integración o despliegue institucional.
