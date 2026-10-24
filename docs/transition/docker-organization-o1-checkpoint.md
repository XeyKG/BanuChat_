# CHECKPOINT BANUCHAT — ORGANIZACIÓN DOCKER

Fecha: 2026-10-24. Alcance: O1 completado y O2 preparado en configuración, sin
promoción. No se eliminaron contenedores, volúmenes, redes, imágenes o datos; no se
detuvo el entorno CCD funcional.

## Inventario conservado

La captura privada `docker-inventory.json` registra mounts, redes y etiquetas sin
variables de entorno. Al cierre hay nueve contenedores:

| Contenedor | Imagen | Estado al cierre | Puerto publicado | Volumen |
| --- | --- | --- | --- | --- |
| `banuchat-ccd-auth-i1b-test` | `pgvector/pgvector:pg16` | running | `127.0.0.1:55443` | `banuchat-ccd-auth-i1b-test-data` |
| `banuchat-ccd-dev-postgres-ccd-1` | `pgvector/pgvector:pg16` | exited | ninguno | `banuchat-ccd-dev_ccd_pgvector_data` |
| `banuchat-postgres` | `pgvector/pgvector:pg16` | exited | ninguno | `banuchat-schema-test_pgvector_data` |
| `banuchat-n8n` | `n8nio/n8n:2.40.5` | exited | ninguno | `banuchat-schema-test_n8n_data` |
| `banuchat-auth-p4l1-demo` | `pgvector/pgvector:pg16` | exited | ninguno | `banuchat-auth-p4l1-demo-data` |
| `banuchat-auth-r0-replay` | `pgvector/pgvector:pg16` | exited | ninguno | `banuchat-auth-r0-replay-data` |
| `banuchat-auth-i1a-test` | `pgvector/pgvector:pg16` | exited | ninguno | `banuchat-auth-i1a-test-data` |
| `banuchat-auth-i1b-uid-test` | `pgvector/pgvector:pg16` | exited | ninguno | `banuchat-auth-i1b-uid-test-data` |
| `banuchat-o1-restore-verify` | `pgvector/pgvector:pg16` | exited | ninguno | `banuchat-o1-restore-verify-data` |

Los catorce volúmenes se conservaron:

| Volumen | Uso medido |
| --- | ---: |
| `banuchat-ccd-auth-i1b-test-data` | 68.54 MB |
| `banuchat-ccd-dev_ccd_pgvector_data` | 67.61 MB |
| `banuchat-schema-test_pgvector_data` | 78.05 MB |
| `banuchat-schema-test_n8n_data` | 2.771 MB |
| `banuchat-auth-p4l1-demo-data` | 68.9 MB |
| `banuchat-auth-r0-replay-data` | 68.85 MB |
| `banuchat-auth-i1a-test-data` | 68.99 MB |
| `banuchat-auth-i1b-uid-test-data` | 68.87 MB |
| `banuchat-o1-restore-verify-data` | 89.97 MB |
| `banuchat_postgres_data` | 48.56 MB |
| `banuchat_n8n_data` | 2.073 MB |
| `banuchatv2_postgres_data` | 81.34 MB |
| `banuchatv2_n8n_data` | 719 B |
| `infra_pgvector_data` | 0 B |

Se conservaron quince redes, incluidas las redes aisladas de los laboratorios, las
redes Compose históricas, tres redes Docker integradas y
`banuchat-o1-restore-isolated`. Se conservaron siete imágenes: PostgreSQL/pgvector
16 en uso, N8N 2.40.5 en uso, pgvector 17, N8N `stable` y las imágenes históricas
`banuchat-api`, `banuchat-mcp` y `banuchat-migrate`. Que una imagen o volumen no
tenga contenedor activo no demuestra que pueda eliminarse.

El CCD autenticado conserva sus tres publicaciones, documentos, versiones,
chunks, embeddings, procedencia, schemas de autenticación, cuentas sintéticas,
permisos y datos conversacionales. CCD editorial, demo sintética congelada y N8N
siguen separados. No se consultó ni modificó `CCD_DOCUMENTACION`.

## Respaldos y restauración

Directorio privado ignorado por Git:
`infra/local/docker-organization/2026-10-24-o1`. La ACL heredada se deshabilitó y
el acceso quedó restringido al usuario Windows custodio.

| Respaldo | Tamaño | SHA-256 |
| --- | ---: | --- |
| `ccd-auth.dump` | 432771 B | `558e89ba2466d27cfd6688bba713945ae0dfd9ffebb4fae947de76c4b2d0eb73` |
| `ccd-editorial.dump` | 356151 B | `455589ed35431048c58dfd984930a3379c55d646c2b347af3e731678ee18c789` |
| `synthetic.dump` | 787131 B | `0be85845fe1d1b4545a12a1f2ad5b1c01580a7a9a076f397d010a9c90ffb35c1` |
| `ccd-auth-globals.sql` | 1567 B | `f3a54767fb25fbea1410061cbef55c66516fad1fac734fb6deab21a285212c47` |
| `ccd-editorial-globals.sql` | 691 B | `5c0288eead79068a69d0a5852ae0f45b9a95ab8995ffeed3312e474b9b6aeb4b` |
| `synthetic-globals.sql` | 681 B | `32710071120e884de866740adbea2eadb5a96980ca651d3eea4fa51723149387` |
| `n8n-state` | 2771457 B / 7 archivos | hashes por archivo en informe privado |

También se respaldó la configuración privada necesaria para reconstruir las
conexiones. No se publican sus nombres internos, valores ni hashes en este
checkpoint.

Verificación realizada:

- Los tres dumps pasaron `pg_restore --list` y restauración con
  `--exit-on-error` en `banuchat-o1-restore-verify`.
- CCD autenticado comparó 33 tablas, CCD editorial 17 y demo sintética 16. Los
  conjuntos de tablas y todos sus conteos fueron idénticos entre fuente y copia.
- Los tres globals pasaron `psql` con `ON_ERROR_STOP` dentro de transacciones
  revertidas; no quedaron roles de origen en el verificador.
- N8N se copió a un segundo directorio aislado. Coincidieron los siete hashes y
  `PRAGMA integrity_check` devolvió `ok` sobre la copia.
- Los dumps temporales se retiraron del contenedor de verificación. El contenedor,
  su red y su volumen se conservaron y el contenedor quedó detenido.

Los informes privados son `database-restore-verification.json`,
`globals-restore-verification.json`, `n8n-restore-verification.json`,
`docker-inventory.json`, `docker-system-df.txt` y los manifiestos de hashes. No
contienen cuerpos de conversaciones ni contraseñas.

## Organización preparada

Se eligió conservar los Compose existentes y añadir un candidato no activado:

- `infra/docker-compose.yml`: laboratorio sintético y N8N existente;
- `infra/docker-compose.ccd.yml`: laboratorio CCD editorial existente;
- `infra/docker-compose.dev.yml`: candidato canónico con proyecto
  `banuchat-dev` y perfiles `ccd-auth`, `synthetic` y `automation`.

La separación por perfiles mantiene un punto operativo común sin mezclar
persistencia. Cada PostgreSQL tiene red, volumen, puerto y variables propias. El
nombre físico CCD sigue siendo `banuchat_ccd_auth_i1b_test`. La API, Ollama y
Mobile permanecen en el host. No hay migraciones o ingestas automáticas.

## Archivos de la entrega

- `infra/docker-compose.dev.yml` — Compose candidato no activado.
- `infra/docker-dev.env.example` — plantilla sin credenciales reales.
- `infra/README.md` — estado y enlaces operativos.
- `docs/operations/docker-local-organization.md` — arranque, respaldo,
  recuperación y promoción.
- `docs/transition/docker-organization-o1-checkpoint.md` — este checkpoint.

Los respaldos e informes bajo `infra/local/` no son archivos versionables.

## Pruebas y resultados

| Prueba | Resultado |
| --- | --- |
| Integridad de tres archivos custom de PostgreSQL | PASS: catálogos legibles y restauración sin error |
| Igualdad fuente/restauración | PASS: tablas y conteos exactos en las tres bases |
| Globals PostgreSQL | PASS: tres scripts válidos y revertidos |
| Estado N8N | PASS: 7/7 hashes y SQLite íntegro |
| Estado del laboratorio después de la prueba | PASS: CCD autenticado activo; auxiliares y verificador detenidos |
| `docker compose config` del candidato | PASS: los tres perfiles expanden sin errores y no crean recursos |
| `git diff --check` | PASS |
| Pruebas de código, DB E2E, Ollama, API, Mobile/Android | No ejecutadas; no eran pertinentes a cambios de configuración |

Incidencias recuperadas, sin efecto sobre datos:

- El primer comando de respaldo usó una opción `pg_dump -X` no soportada. Falló
  antes de crear dumps; se comprobó la ausencia de archivos parciales y se repitió
  con opciones válidas.
- La primera comparación tabla por tabla excedió la ventana del proceso y dejó
  encendidas temporalmente las bases CCD editorial y sintética. Se detuvieron de
  inmediato, se repitió la comparación en una consulta agregada y ambas volvieron
  a `exited`.
- El alias Windows de Python no pudo abrirse durante la prueba SQLite. El fallo
  ocurrió antes de abrir la copia; `node:sqlite` de Node 24 ejecutó después la
  comprobación en modo de solo lectura.

## Riesgos y pasos pendientes

- El entorno funcional conserva nombres de laboratorio (`i1b-test`). Cambiar la
  identidad Docker sin cambiar la base física exige crear y validar una copia; no
  se hizo en O1.
- La validación restauró datos sin owners/ACL originales y probó los globals en
  rollback. La promoción debe probar en un clúster aislado la restauración efectiva
  de roles, owners y privilegios antes del cambio de puerto.
- La copia N8N pasó integridad de archivos y SQLite. Su arranque con la copia y la
  clave vigente queda para el ensayo aislado de promoción.
- `pgvector/pgvector:pg16` fija la versión mayor, no el digest. Cambiar el pin
  requiere una validación separada.
- Las imágenes y volúmenes sin contenedor activo son candidatos de revisión, no de
  borrado. No se clasifican como innecesarios hasta acreditar procedencia y una
  retención aprobada.
- Para preparar O2 se debe presentar y autorizar la identidad, puerto, volumen,
  red, dependencias y reversión del nuevo contenedor. Después: restaurar, validar
  API/Ollama/Mobile en puerto alterno, planear el intercambio de 55443 y pedir una
  autorización distinta para promover. La retirada del entorno anterior se decide
  aún después.

**CHECKPOINT BANUCHAT — ORGANIZACIÓN DOCKER: O1 COMPLETADO; O2 PREPARADO Y NO
PROMOVIDO.**
