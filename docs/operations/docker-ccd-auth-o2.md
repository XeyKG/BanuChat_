# BanuChat — reconstrucción Docker CCD autenticada O2

Estado: candidato validado en paralelo, sin promoción.

## Recursos

| Recurso | Identidad |
| --- | --- |
| Proyecto / perfil / servicio | `banuchat-dev` / `ccd-auth` / `postgres-ccd-auth` |
| Contenedor | `banuchat-dev-postgres-ccd-auth-1` |
| Puerto | `127.0.0.1:55453` |
| Volumen | `banuchat-dev-ccd-auth-data` |
| Red | `banuchat-dev-ccd-auth` |
| Base | `banuchat_ccd_auth_i1b_test` |

No iniciar `synthetic` o `automation`. I1B conserva 55443, su volumen y su red.

## Preflight y configuración privada

1. Verificar HEAD, árbol limpio y los 32 hashes del manifiesto O1.
2. Confirmar que contenedor, volumen, red y 55453 estén libres.
3. Capturar del origen roles, owners, ACL, estructura, fingerprints y permisos
   efectivos sin extraer conversaciones o credenciales.
4. Crear `infra/local/docker-organization/<fecha>-o2/docker-dev.env`, restringido
   por ACL al custodio Windows.

El usuario inicial debe ser `auth_i1b_admin`, con su contraseña privada vigente.
No usar un bootstrap distinto: el usuario de `initdb` posee catálogos requeridos
por PostgreSQL y no puede retirarse mediante `REASSIGN OWNED`.

El globals O1 contiene `CREATE ROLE auth_i1b_admin`. Crear una copia privada y
eliminar solo esa sentencia. Debe conservar cuatro `CREATE ROLE` y los cinco
`ALTER ROLE`, incluido admin. No editar el respaldo original.

## Creación y restauración

Validar y crear únicamente el servicio autorizado:

```powershell
docker compose --env-file .\infra\local\docker-organization\<fecha>-o2\docker-dev.env `
  -f .\infra\docker-compose.dev.yml --profile ccd-auth config --quiet
docker compose --env-file .\infra\local\docker-organization\<fecha>-o2\docker-dev.env `
  -f .\infra\docker-compose.dev.yml --profile ccd-auth `
  up -d --pull never postgres-ccd-auth
```

Con el contenedor healthy:

1. Restaurar el globals filtrado con `psql -v ON_ERROR_STOP=1`.
2. Restaurar `ccd-auth.dump` sobre la base precreada usando
   `pg_restore --exit-on-error`, conservando owners y privilegios.
3. Reproducir las ACL de las cuatro bases. PUBLIC no conserva acceso; runtime y
   provisioner reciben solo `CONNECT` al destino CCD.
4. Reponer los `GRANT ALL` explícitos del owner en `ingestion_items`,
   `ingestion_runs` y `password_reset_tokens`, omitidos por `pg_restore` aunque el
   acceso efectivo sea equivalente.
5. Retirar las copias del dump y globals del `/tmp` del contenedor.

## Validación

Comparar origen/candidato: cinco roles sin bootstrap extra; owners/ACL; schemas;
relaciones; rutinas SECURITY DEFINER; defaults; políticas; constraints; índices;
triggers; extensiones; fingerprints de 33 tablas y 295 decisiones de acceso.

Probar login TCP de admin/runtime/provisioner y rechazos de acceso cruzado,
TEMP, lectura directa de chunks y lectura de verificadores. Confirmar tres releases
ready, misma current, embeddings 1024, procedencia completa, cuentas sintéticas y
ausencia de perfiles/cursos/eventos/anuncios del dataset sintético.

Reiniciar solo el candidato y repetir fingerprints, roles, mount, red, puerto y
salud. Comprobar I1B antes y después. En O2 se observó una parada limpia inesperada
de I1B durante esa ventana; el mismo contenedor volvió a `ready` y sus fingerprints
coincidieron. Los eventos no identificaron al emisor, por lo que debe vigilarse en
una futura validación.

## Reversión

```powershell
docker compose --env-file .\infra\local\docker-organization\<fecha>-o2\docker-dev.env `
  -f .\infra\docker-compose.dev.yml --profile ccd-auth `
  stop postgres-ccd-auth
```

Conservar contenedor, volumen y red hasta autorización de descarte. Confirmar I1B
`ready` en 55443. No usar `down -v` ni cambiar clientes a 55453.
