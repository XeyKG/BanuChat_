# BanuChat — organización y recuperación Docker local

Estado: **propuesta preparada, no promovida**. El entorno funcional
`banuchat-ccd-auth-i1b-test` continúa siendo la referencia operativa. El archivo
`infra/docker-compose.dev.yml` no se ha usado para crear servicios.

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
| `ccd-auth` | `postgres-ccd-auth` | `127.0.0.1:55443` | `ccd_auth_data` | Corpus CCD seleccionado y autenticación sintética |
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

La validación de configuración no acredita que un volumen contenga datos. No usar
`up` hasta que la promoción y el volumen restaurado hayan sido aprobados.

## Arranque vigente antes de la promoción

El arranque operativo continúa documentado en
[CCD-AUTH-I1B Android](ccd-auth-i1b-android.md) y
[CCD-AUTH-I1B OPS](ccd-auth-i1b-ops.md). Si la base vigente está detenida, el
operador puede iniciar exclusivamente el contenedor ya existente:

```powershell
docker start banuchat-ccd-auth-i1b-test
```

La API autenticada usa el entrypoint privado existente desde `backend/api`:

```powershell
node --import tsx test/auth-i1b-operator.mts api
```

Mobile conserva Expo SDK 57 y su launcher desde la raíz:

```powershell
.\mobile\scripts\start-ccd-auth.ps1
```

No ejecutar el Compose candidato para complementar este laboratorio. Eso crearía
un segundo entorno en vez de recuperar el vigente.

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

## Promoción pendiente

La promoción requiere una ventana separada y autorización explícita. Debe definir
el volumen restaurado que usará `ccd_auth_data`, comprobar owners/ACL, levantar el
candidato en un puerto alterno, validar API y Mobile, detener el cambio ante
cualquier diferencia y finalmente decidir el intercambio de 55443. La retirada
del entorno I1B solo puede evaluarse después de una validación completa y nunca en
la misma operación de promoción.

La reconstrucción paralela O2 y la regla para inicializar el clúster con el mismo
administrador están en [docker-ccd-auth-o2.md](docker-ccd-auth-o2.md). El candidato
continúa en 55453 y no constituye una promoción.
