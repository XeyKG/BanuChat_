# BanuChat — operación Docker local

Estado: **`banuchat-dev` es el entorno CCD autenticado principal de desarrollo**.
PostgreSQL escucha en `127.0.0.1:55453` y la única API habitual en
`127.0.0.1:3003`. I1B continúa provisionalmente en 55443 y no se usa en el
arranque diario.

## Mapa de recursos vigentes

| Necesidad | Recurso | Cuándo iniciarlo |
| --- | --- | --- |
| Chat CCD autenticado | `banuchat-dev-postgres-ccd-auth-1` | Desarrollo habitual de API/Mobile |
| Demo y regresión sintética | `banuchat-postgres` | Solo pruebas que exigen PostgreSQL sintético |
| Automatización asíncrona | `banuchat-n8n` | Solo importación/ejecución manual de workflows N8N |
| Preparación editorial CCD | `banuchat-ccd-dev-postgres-ccd-1` | Solo al preparar o verificar una publicación autorizada |
| Reversión histórica | `banuchat-ccd-auth-i1b-test` | No iniciar como API habitual; conservar hasta cumplir las condiciones de retirada |

`data/synthetic` sigue siendo la fuente de verdad de la demo. El corpus CCD, la
demo sintética, N8N y el entorno editorial mantienen volúmenes separados.
`CCD_DOCUMENTACION` no se monta en Docker.

## Arranque diario

Comprobar primero que el contenedor canónico ya existe:

```powershell
docker inspect banuchat-dev-postgres-ccd-auth-1 --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}'
```

Si está detenido, iniciar ese mismo contenedor sin recrearlo:

```powershell
docker start banuchat-dev-postgres-ccd-auth-1
```

Iniciar la API desde `backend/api`:

```powershell
npm run start:ccd-auth
```

El launcher carga la configuración privada ignorada por Git en
`infra/local/banuchat-dev/ccd-auth-api.json`. Antes de escuchar valida exactamente:

- proyecto `banuchat-dev` y servicio `postgres-ccd-auth`;
- contenedor `banuchat-dev-postgres-ccd-auth-1` healthy;
- base física `banuchat_ccd_auth_i1b_test` en 55453;
- volumen `banuchat-dev-ccd-auth-data`;
- red `banuchat-dev-ccd-auth`;
- modo `ccd_local`, rol runtime y deployment esperados.

Un fallo de identidad impide iniciar la API. El ejemplo público sin secretos es
[`infra/ccd-auth-api.config.example.json`](../../infra/ccd-auth-api.config.example.json).
No iniciar a la vez `auth-i1b-operator.mts api`.

Mobile conserva su launcher y REST v2:

```powershell
.\mobile\scripts\start-ccd-auth.ps1
```

Para Android USB, seguir el
[runbook CCD autenticado](ccd-auth-i1b-android.md). La validación física continúa
pendiente; las pruebas locales no la sustituyen.

## Servicios opcionales

La demo sintética y N8N comparten el Compose histórico, pero son servicios
independientes. Desde la raíz:

```powershell
# PostgreSQL sintético
docker compose --env-file .env -p banuchat-schema-test `
  -f infra/docker-compose.yml up -d --no-deps postgres

# N8N, solo para ingesta asíncrona autorizada
docker compose --env-file .env -p banuchat-schema-test `
  -f infra/docker-compose.yml up -d --no-deps n8n
```

N8N no participa en consultas de chat. Su volumen vigente es
`banuchat-schema-test_n8n_data` y su imagen es `n8nio/n8n:2.40.5`.

El entorno editorial CCD se inicia únicamente para preparar publicaciones:

```powershell
docker compose --env-file infra/.env.ccd `
  -f infra/docker-compose.ccd.yml up -d postgres-ccd
```

No ejecutar ingestas o migraciones por el solo hecho de iniciar PostgreSQL.

## Verificación rápida

```powershell
docker inspect banuchat-dev-postgres-ccd-auth-1 --format `
  'status={{.State.Status}} health={{.State.Health.Status}} port={{(index (index .NetworkSettings.Ports "5432/tcp") 0).HostPort}} volume={{(index .Mounts 0).Name}}'
Get-NetTCPConnection -State Listen -LocalPort 3003,55453
```

El resultado esperado es API solo en loopback:3003, PostgreSQL en 55453, volumen
`banuchat-dev-ccd-auth-data` y estado healthy. El launcher vuelve a validar estos
valores y el runtime scope antes de aceptar tráfico.

## Respaldo

Los respaldos O1 verificados están en
`infra/local/docker-organization/2026-10-24-o1`, con ACL restringida. Incluyen
CCD autenticado, CCD editorial, demo sintética, globals y estado N8N. Los 32 hashes
continúan coincidiendo; los tres dumps fueron restaurados en O1 y la copia N8N pasó
hashes e integridad SQLite.

El respaldo posterior a la promoción está en
`infra/local/banuchat-dev/o4-post-promotion.dump`. Su hash coincide y su catálogo
es legible, pero todavía no se ha restaurado en un destino aislado. Crear un dump
actualizado antes de cualquier rollback o mantenimiento que pueda separar
escrituras. Los dumps pueden contener conversaciones y nunca se versionan.

Procedimiento de captura desde la raíz, usando un nombre fechado dentro de
`infra/local/banuchat-dev`:

```powershell
docker exec banuchat-dev-postgres-ccd-auth-1 `
  pg_dump -U auth_i1b_admin -d banuchat_ccd_auth_i1b_test -Fc `
  -f /tmp/banuchat-ccd-auth.dump
docker cp banuchat-dev-postgres-ccd-auth-1:/tmp/banuchat-ccd-auth.dump `
  infra/local/banuchat-dev/<fecha>-ccd-auth.dump
docker exec banuchat-dev-postgres-ccd-auth-1 rm -f /tmp/banuchat-ccd-auth.dump
Get-FileHash -Algorithm SHA256 infra/local/banuchat-dev/<fecha>-ccd-auth.dump
```

Restringir la ACL del archivo y validar su catálogo antes de considerarlo respaldo.

## Recuperación

1. No sobrescribir el volumen canónico ni I1B.
2. Verificar hashes del dump y de los globals correspondientes.
3. Restaurar primero en un volumen y red aislados con PostgreSQL/pgvector 16.
4. Comparar roles, owners, ACL, tablas, conteos, publicaciones y fingerprints.
5. Ejecutar la API en un puerto alterno y comprobar autenticación, RAG, historial,
   citas y documentos.
6. Promover solo mediante una autorización explícita.

Para un fallo de API, preferir corregir hacia delante conservando 55453. Volver a
I1B ocultaría las escrituras creadas desde O3. Antes de esa conmutación se debe
cerrar solo la API, crear un dump actualizado y aceptar formalmente historial
dividido o autorizar una conciliación. No copiar tablas manualmente ni restaurar
sobre I1B.

## Recursos históricos

No ejecutar habitualmente los laboratorios `banuchat-auth-p4l1-demo`,
`banuchat-auth-r0-replay`, `banuchat-auth-i1a-test`,
`banuchat-auth-i1b-uid-test` o `banuchat-o1-restore-verify`. Sus scripts, contratos,
checkpoints y resultados versionados se conservan. Sus recursos Docker se clasifican
en el [checkpoint O5](../transition/docker-organization-o5-checkpoint.md).

Los Compose `docker-compose.yml` y `docker-compose.ccd.yml` se conservan porque
siguen describiendo pruebas sintéticas/N8N y edición CCD. `docker-compose.dev.yml`
es la configuración canónica por perfiles; activar un perfil no inicia los demás.

Ningún recurso se elimina hasta aprobar la lista exacta O5. La limpieza aprobada
debe ejecutarse como una sola operación, con inventario anterior y posterior y sin
usar `prune` global.
