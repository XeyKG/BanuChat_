# BanuChat — organización y recuperación Docker local

Estado: **entorno `banuchat-dev` promovido como referencia operativa de desarrollo**.
O2 creó `banuchat-dev-postgres-ccd-auth-1` en 55453, O3 validó la integración y O4
conmutó la única API habitual de 3003 a ese entorno. I1B permanece intacto en
55443 como recurso histórico; no es el arranque principal.

## Fronteras de datos

- CCD autenticado combina el corpus CCD seleccionado con identidades y cuentas
  exclusivamente sintéticas. Conserva el nombre físico vigente
  `banuchat_ccd_auth_i1b_test`, sus roles y sus schemas durante la migración.
- La demo histórica conserva su base y volumen propios. `data/synthetic` sigue
  siendo su fuente de verdad y nunca funciona como fallback institucional.
- N8N conserva estado propio y solo orquesta ingesta asíncrona. No participa en
  el camino síncrono del chat.
- `CCD_DOCUMENTACION` es una fuente externa de solo lectura. No se monta en los
  servicios de ejecución. Una ingesta futura solo podrá leer un subconjunto
  autorizado y no forma parte de este procedimiento.
- API, Ollama y Mobile continúan ejecutándose en el host. El Compose candidato no
  crea imágenes ni servicios para esos componentes.

## Decisión sobre los archivos Compose

`infra/docker-compose.yml` y `infra/docker-compose.ccd.yml` se mantienen sin
cambios porque describen los laboratorios sintético/N8N y CCD editorial ya
existentes. Fusionarlos ahora alteraría la identidad de proyectos y volúmenes sin
mejorar la recuperación.

`infra/docker-compose.dev.yml` es el candidato para la operación futura. Agrupa
los recursos bajo el proyecto `banuchat-dev`, pero los separa por perfiles, redes
y volúmenes:

| Perfil | Servicio | Puerto local predeterminado | Persistencia | Alcance |
| --- | --- | --- | --- | --- |
| `ccd-auth` | `postgres-ccd-auth` | `127.0.0.1:55443` en plantilla; `55453` canónico privado | `ccd_auth_data` | Corpus CCD seleccionado y autenticación sintética |
| `synthetic` | `postgres-synthetic` | `127.0.0.1:5432` | `synthetic_data` | Demo histórica congelada |
| `automation` | `n8n` | `127.0.0.1:5678` | `n8n_data` | Estado de orquestación asíncrona |

Los perfiles impiden que un `up` sin perfil cree los tres grupos. No hay
`container_name`, migraciones, ingestas, restauraciones ni mounts de corpus en el
Compose. Los nombres físicos de las bases se reciben por variables y la plantilla
conserva los vigentes. Los puertos solo se publican en loopback.

## Configuración privada y validación

Desde la raíz del repositorio:

```powershell
Copy-Item .\infra\docker-dev.env.example .\infra\local\docker-dev.env
```

Completar todos los valores privados vacíos. No copiar a informes sus valores.
Validar la expansión sin crear recursos:

```powershell
docker compose `
  --env-file .\infra\local\docker-dev.env `
  -f .\infra\docker-compose.dev.yml `
  --profile ccd-auth `
  --profile synthetic `
  --profile automation `
  config
```

La validación de configuración por sí sola no acredita que un volumen contenga
datos. O2 restauró y verificó el volumen autorizado `banuchat-dev-ccd-auth-data`;
no volver a crear el servicio para el arranque habitual.

## Arranque operativo habitual

El arranque se documenta también en
[CCD autenticado Android](ccd-auth-i1b-android.md). Si la base canónica está detenida, el
operador puede iniciar exclusivamente el contenedor ya existente:

```powershell
docker start banuchat-dev-postgres-ccd-auth-1
```

La API autenticada usa el launcher operativo desde `backend/api`:

```powershell
npm run start:ccd-auth
```

El launcher carga `infra/local/banuchat-dev/ccd-auth-api.json`, valida la identidad
Docker completa y después reutiliza `src/authenticated-main.ts`. Escucha solo en
`127.0.0.1:3003`. No iniciar simultáneamente el launcher histórico I1B.

Mobile conserva Expo SDK 57 y su launcher desde la raíz:

```powershell
.\mobile\scripts\start-ccd-auth.ps1
```

El contenedor canónico ya existe en 55453; no ejecutar perfiles `synthetic` o
`automation` para arrancar el chat.

## Respaldo

Los respaldos O1 se guardan en
`infra/local/docker-organization/<fecha>-o1`, fuera de Git. El directorio debe
mantener herencia ACL deshabilitada y acceso exclusivo del usuario Windows que lo
custodia. Contiene:

- dumps PostgreSQL en formato custom;
- globals de cada clúster para conservar roles y atributos;
- copia completa del estado `.n8n`;
- configuración privada necesaria para recuperación;
- hashes SHA-256, inventario y resultados de verificación.

No abrir ni publicar los SQL de globals, la configuración privada, SQLite de N8N
o los dumps. Pueden contener hashes de credenciales y datos conversacionales.

## Recuperación aislada

1. Confirmar que el entorno funcional sigue activo y registrar estado, puertos,
   mounts y hashes de los respaldos. No reutilizar su volumen como destino.
2. Definir antes de crear recursos el nombre del contenedor, puerto de loopback o
   ausencia de puerto, red, volumen, dependencias y reversión. Obtener autorización
   para cualquier contenedor que prepare O2.
3. Crear un PostgreSQL `pgvector/pgvector:pg16` en una red y volumen nuevos. No
   publicar puerto durante la verificación si todo se ejecuta con `docker exec`.
4. Validar el catálogo de cada dump con `pg_restore --list`. Para una prueba de
   contenido sin roles originales, restaurar en el clúster aislado con:

   ```text
   pg_restore -d postgres -C --no-owner --no-privileges --exit-on-error <dump>
   ```

5. Comparar inventario de tablas y conteos exactos entre fuente y copia. Validar
   las funciones y schemas de autenticación sin consultar valores privados.
6. Validar los globals con `psql -v ON_ERROR_STOP=1` dentro de una transacción que
   termine en `ROLLBACK`. En una recuperación definitiva sobre un clúster vacío,
   restaurar primero los globals y luego el dump completo para conservar owners y
   ACL; revisar conflictos de roles antes de ejecutar.
7. Restaurar N8N en un directorio o volumen vacío, comparar todos los hashes y
   ejecutar `PRAGMA integrity_check` sobre `database.sqlite` en modo de solo
   lectura. El primer arranque de N8N debe usar la misma clave privada y versión
   `2.40.5`; probarlo sin exponer workflows o credenciales.
8. Ejecutar comprobaciones de aplicación contra el destino aislado. No cambiar
   todavía 55443, la API ni Mobile.
9. Si falla, detener solo los recursos nuevos. El entorno anterior y sus
   volúmenes permanecen intactos. La eliminación de recursos exige una
   autorización posterior.

## Validación funcional O3

O3 no ejecuta operaciones Compose. El entrypoint específico valida primero el
nombre, proyecto, servicio, puerto, volumen, red y salud del candidato, y después
inicia la API temporal en loopback:3013:

```powershell
cd .\backend\api
$env:BANUCHAT_O3_API_PORT = '3013'
node --import tsx test/ccd-candidate-o3-operator.mts
```

En otra terminal, la selección funcional se ejecuta con:

```powershell
$env:BANUCHAT_O3_API_PORT = '3013'
node --import tsx test/ccd-candidate-o3-http.mts
```

La prueba usa las cuentas ficticias locales ya existentes, crea dos conversaciones
controladas solo en el candidato y conserva ese historial para acreditar
persistencia. No imprime credenciales ni respuestas. Al terminar, cerrar únicamente
el proceso de API; no detener PostgreSQL. El resultado O3 está en
[`banuchat-o3-candidate-http.json`](../../eval/auth/results/banuchat-o3-candidate-http.json).

## Reversión después de O4

No apuntar directamente la API a I1B mientras existan escrituras nuevas en 55453.
El rollback operativo seguro comienza deteniendo solo la API de 3003, conservando
ambos PostgreSQL y generando un dump actualizado del candidato. El respaldo O4
inicial está en `infra/local/banuchat-dev/o4-post-promotion.dump`, fuera de Git.

El launcher I1B puede volver a ocupar 3003 después de cerrar la API canónica, pero
las conversaciones creadas desde O3 permanecerían únicamente en el candidato y no
serían visibles. Esa conmutación es una degradación temporal, no una conciliación.
Antes de recomendarla se debe elegir explícitamente una de estas rutas:

1. corregir hacia delante y mantener 55453 como autoridad;
2. conservar el dump/volumen candidato y aceptar temporalmente historial dividido;
3. autorizar una conciliación verificada de escrituras antes de volver a 55443.

No copiar tablas de autenticación o conversación manualmente ni restaurar el dump
sobre I1B sin un procedimiento específico. La retirada o archivo de I1B continúa
pendiente de autorización posterior.
