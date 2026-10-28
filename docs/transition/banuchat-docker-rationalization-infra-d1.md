# BanuChat — INFRA-D1: Safe Docker Wrapper Cleanup

Resultado: **`INFRA-D1 COMPLETE — TWO OBSOLETE CONTAINER WRAPPERS REMOVED, PERSISTENCE PRESERVED`**.
Fecha: 2026-10-28. Se retiraron exclusivamente dos contenedores detenidos,
con preflight de ambos antes de actuar y verificación completa tras cada retirada.
No se arrancó ni recreó ningún servicio.

## A. Baseline

- HEAD esperado y observado: `5c4a6051668c1120c57c1b39591e0dcc7086db45`.
- Branch: `main`; estado inicial completo: limpio, sin entradas de porcelain.
- `AGENTS.md` leído íntegramente antes de operar.
- Referencia: [INFRA-D0](banuchat-docker-rationalization-infra-d0.md),
  `INFRA-D0 COMPLETE WITH UNKNOWN RESOURCES — NO RESOURCES REMOVED`.
- Docker local: contexto `desktop-linux`, endpoint local comprobado,
  Engine `29.7.2`.
- Inventario fresco: `2026-10-28T21:32:20.291071+00:00`; 18 contenedores, 18 volúmenes,
  12 redes y 4 imágenes; cero contenedores running.
- Se ejecutaron variantes de lectura de `docker ps -a`, `docker volume ls`,
  `docker network ls`, `docker image ls`, inspect de todos los recursos y tamaños
  mediante `docker system df`. Solo se guardó metadata sanitizada.

Comparación D0 → preflight: los 18 contenedores, 18 volúmenes y 4 imágenes
conservaron todos los campos sanitizados; las nueve redes de proyecto y las redes
integradas `host`/`none` también. Solo la red integrada `bridge` devolvió otro
ID/created respecto de D0. La excepción integrada está permitida por el alcance;
no cambió identidad de ningún candidato. No se atribuye causa ni se corrigió nada.

Evidencia local fuera de Git: `banuchat-infra-d1-ok89oos4` dentro del directorio temporal del
operador. Contiene `inventory-before.json`, `inventory-after-a.json`,
`inventory-after-b.json`, comparación D0, preflight, comandos/resultados de
retirada, verificaciones por fase, tamaños y manifiesto SHA-256. El manifiesto
final enumera archivos y hashes; no contiene secretos ni exportaciones de DB.

## B. Preflight A — N8N port-conflict

| Comprobación | Evidencia / resultado |
| --- | --- |
| Nombre e ID recién observados | `banuchat-unified-n8n-port-conflict`; `dd2fd21429088798f690cf6c09d1391c6e8a61d047dde0410e2928604ba9dd78`; coinciden con D0 y autorización |
| Imagen | `n8nio/n8n@sha256:9f693fd5565539efd5e75ad168526c8041a6af516d9e50bc4d9cb1c9c5031523`; misma imagen que el N8N vigente, tag `n8nio/n8n:2.40.5` conservado |
| Estado | `created`, running=false, exit=128, categoría de error port-binding; StartedAt/FinishedAt cero, nunca inició |
| Labels | Scope `banuchat.scope=unified-isolated`; sin project/service Compose; labels completos sanitizados coinciden con D0 |
| Mounts | Un único volumen RW `banuchat-unified-n8n-data` en `/home/node/.n8n`; compartido con `banuchat-unified-n8n`, sin volumen exclusivo |
| Red / puerto | Sin endpoint conectado; configuración histórica bridge y loopback 5679; ningún puerto actualmente publicado |
| Origen | Checkpoint Unified documenta el fallo de 5679 y el N8N correcto posterior en 15679 |
| Dependencias | Sin referencia a nombre/ID en código operativo inspeccionado; sin Links/VolumesFrom/NetworkMode/PidMode/IpcMode dependiente en otros contenedores |

El checkpoint y D0 demuestran que nunca fue el N8N vigente. El provisionador actual
opera sobre `banuchat-unified-n8n` y su fuente OE6, no sobre el wrapper fallido.
Las referencias encontradas a este candidato son evidencia/checkpoint, no una
dependencia actual de ejecución. **Preflight A PASS**.

## C. Removal A

Después de acreditar **ambos** preflights se reconsultó el candidato por ID y se
volvió a comprobar nombre, estado detenido, imagen, labels y mounts.

Única orden mutante de esta fase, ya ejecutada:

```text
docker container rm dd2fd21429088798f690cf6c09d1391c6e8a61d047dde0410e2928604ba9dd78
```

Fecha UTC: `2026-10-28T21:33:22.351046+00:00`. Exit code 0; Docker devolvió exactamente el ID
solicitado. Sin `--force`, sin `-v`, sin wildcard ni filtro múltiple.

## D. Verification A

`inventory-after-a.json` y `verification-after-a.json`: **PASS**.

- Candidato A ausente; exactamente los otros 17 contenedores presentes e intactos.
- `banuchat-unified-n8n` presente y detenido, mismo ID/configuración/mounts.
- `banuchat-unified-n8n-data` presente e intacto; único cambio de consumidores:
  desaparece A de la metadata de referencia.
- Imagen N8N presente; único cambio de consumidores: desaparece A.
- Las 18 identidades/metadata de volúmenes, 12 redes y 4 imágenes se preservan,
  descontando únicamente esas referencias esperadas. Bridge sin cambios en D1.
- Cero contenedores running. Solo después de este PASS se permitió la fase B.

## E. Preflight B — OE6 API

| Comprobación | Evidencia / resultado |
| --- | --- |
| Nombre e ID recién observados | `banuchat-oe6-local-api-1`; `6a7defe79c9e1dbf11b8fda3101608e6a1fa410cb877f457b203f3f50301c2a6`; coinciden con D0 y autorización |
| Imagen | `banuchat/backend:oe6-local`, `sha256:1b65b080f2979548895051f0be1940d66ca4f89542511993886c61cd42fc236c` |
| Estado | `exited`, exit=0, running=false; health almacenada unhealthy, no es prueba de salud en vivo |
| Compose | Project `banuchat-oe6-local`; service `api`; labels/config-hash sin cambios |
| Mounts | Lista vacía; sin volumen persistente propio ni bind mounts |
| Red | `host`, ID `a326d586b3cc5df48d0e0d4f66d410cdce3c62df878648ccca4a5d50c63ce06d`; sin publicación Docker de puertos |
| API vigente | `backend/api/package.json` → `scripts/start-unified.mts`; proceso host mediante `npm start`, DB 55463/API 3004 |
| Reconstrucción | Servicio `api` en `infra/docker-compose.oe6.yml`, imagen conservada, build context/Dockerfile versionados; requiere configuración privada legítima y dependencias saludables |

No es la API actual. La reproducción de OE6 no implica recuperar la misma capa RW,
secretos ni identidad del contenedor; se conserva la receta e imagen, sin afirmar
que Git por sí solo reproduce el estado privado exacto. Sus instrucciones en
runbooks anteriores son de demostración/transferencia y requieren reconstruir
el wrapper cuando exista autorización; no se editaron esos documentos históricos.
**Preflight B PASS** antes de A y reconfirmación inmediata antes de retirar B.

## F. Removal B

Única orden mutante de esta fase, ya ejecutada después de verificar A:

```text
docker container rm 6a7defe79c9e1dbf11b8fda3101608e6a1fa410cb877f457b203f3f50301c2a6
```

Fecha UTC: `2026-10-28T21:33:35.676899+00:00`. Exit code 0; Docker devolvió exactamente el ID.
Sin `--force`, sin `-v`, sin `compose down`, sin operaciones sobre otros servicios.

## G. Verification B

`inventory-after-b.json` y `verification-after-b.json`: **PASS**.

- A y B ausentes; ninguna otra identidad de contenedor desapareció ni fue añadida.
- PostgreSQL, N8N y Ollama OE6 siguen presentes, detenidos, con sus IDs, labels,
  project/service, restart policies, red host y mounts idénticos.
- La imagen `banuchat/backend:oe6-local` sigue presente aunque ya no tiene
  consumidores. No se eliminó ninguna capa de imagen ni se ejecutó build/prune.
- Permanecen `banuchat-schema-test_pgvector_data`,
  `banuchat-schema-test_n8n_data` y `banuchat-closure-ollama-models`.
- Las 18 identidades de volúmenes, 12 redes y 4 imágenes conservadas; metadata
  comparada en todas ellas, exceptuando exclusivamente referencias a A/B.
- Todos los 16 contenedores restantes detenidos; no se levantó OE6 para probarlo.

## H. Inventario final

Captura UTC: `2026-10-28T21:33:41.674881+00:00`.

| Recurso | Antes | Tras A | Tras B | Retirados |
| --- | ---: | ---: | ---: | ---: |
| Contenedores | 18 | 17 | 16 | 2 |
| Volúmenes | 18 | 18 | 18 | 0 |
| Redes | 12 | 12 | 12 | 0 |
| Imágenes | 4 | 4 | 4 | 0 |
| Contenedores running | 0 | 0 | 0 | 0 |

### Contenedores restantes

| Nombre | ID completo | Estado | Project / service | Volúmenes |
| --- | --- | --- | --- | --- |
| `banuchat-p1-product-staging` | `b920befbb0f75a6a887444387d5a9e08dfc399c92d287ed58ea24855b870dcd5` | exited; running=false | manual / — | `banuchat-p1-product-staging-data` |
| `banuchat-p0-operational-pilot` | `d083ecc9a2a831ebb7606f06a4a682ee68bf8d98237a8f6a42790aba712b0eac` | exited; running=false | manual / — | `a1c49345d74b6dedffa3387996cd95fc14a5a1b37aa09166d3e5cb3fd6eafe8b` |
| `banuchat-unified-n8n` | `44ad546b86e539638559e3a3fd2d821eea50e26cde14cb05a7f3d3e1352c785f` | exited; running=false | manual / — | `banuchat-unified-n8n-data` |
| `banuchat-unified-postgres` | `874662fc76ea6bd972b7631d7f9e245fa06af2f8331c4af12130cdc7acf2d63e` | exited; running=false | manual / — | `banuchat-unified-data` |
| `banuchat-oe6-local-ollama-1` | `d01b0dd3a93f0c413417f183c0a044dd09fd431d38348051ab8ea04e6e88d1d6` | exited; running=false | banuchat-oe6-local / ollama | `banuchat-closure-ollama-models` |
| `banuchat-oe6-local-postgres-synthetic-1` | `e3eb5edb4980c5bb8ffa8386fcde4ed55f351e514d28da262fa239d475a94a18` | exited; running=false | banuchat-oe6-local / postgres-synthetic | `banuchat-schema-test_pgvector_data` |
| `banuchat-oe6-local-n8n-1` | `5b7d715a612e7aff9d7fd3c72c3bede9be7f95a02118d7acc4b446eb3a2a6554` | exited; running=false | banuchat-oe6-local / n8n | `banuchat-schema-test_n8n_data` |
| `banuchat-dev-postgres-ccd-auth-1` | `a8aeeb2c44e768328b48082433e17f008cf7487ce853219be4fc76f47021cd0d` | exited; running=false | banuchat-dev / postgres-ccd-auth | `banuchat-dev-ccd-auth-data` |
| `banuchat-auth-i1b-uid-test` | `a43254674c3700dc0b47694089056d56547b994753dd4a802181dd67aac2c3c4` | exited; running=false | manual / — | `banuchat-auth-i1b-uid-test-data` |
| `banuchat-ccd-auth-i1b-test` | `ab46191b3e79253562b0010aacc5855005429d3a4f5734037f50a83a2342db0f` | exited; running=false | manual / — | `banuchat-ccd-auth-i1b-test-data` |
| `banuchat-auth-i1a-test` | `9ad9605680e1ac28194a81be95e782b60f5cb8fb4c631cd30e124606e317c151` | exited; running=false | manual / — | `banuchat-auth-i1a-test-data` |
| `banuchat-auth-r0-replay` | `2ce0225e189ed36de8910bccc9bc73e57358b12978e2cfcbe1e66d6ba78a2a68` | exited; running=false | manual / — | `banuchat-auth-r0-replay-data` |
| `banuchat-auth-p4l1-demo` | `d1589cf81081c9b0cde1f81d228493849666bfa50b83379d114e15d551a374c8` | exited; running=false | manual / — | `banuchat-auth-p4l1-demo-data` |
| `banuchat-ccd-dev-postgres-ccd-1` | `3492ad8d2a3c4432b3589751dd7b4966153244c238273411fa220c025b30a069` | exited; running=false | banuchat-ccd-dev / postgres-ccd | `banuchat-ccd-dev_ccd_pgvector_data` |
| `banuchat-n8n` | `9511c8128cf55c2e4e9049e5626c2ed525cec13f6c89eace3bd3fdfad1032b42` | exited; running=false | banuchat-schema-test / n8n | `banuchat-schema-test_n8n_data` |
| `banuchat-postgres` | `a2903193f220e5f8acc0a1808868d0d76f13f13a21a947d492f6c10a03010999` | exited; running=false | banuchat-schema-test / postgres | `banuchat-schema-test_pgvector_data` |

### Volúmenes conservados

| Volumen | Consumidores finales (todos detenidos) |
| --- | --- |
| `a1c49345d74b6dedffa3387996cd95fc14a5a1b37aa09166d3e5cb3fd6eafe8b` | `banuchat-p0-operational-pilot` |
| `banuchat-auth-i1a-test-data` | `banuchat-auth-i1a-test` |
| `banuchat-auth-i1b-uid-test-data` | `banuchat-auth-i1b-uid-test` |
| `banuchat-auth-p4l1-demo-data` | `banuchat-auth-p4l1-demo` |
| `banuchat-auth-r0-replay-data` | `banuchat-auth-r0-replay` |
| `banuchat-ccd-auth-i1b-test-data` | `banuchat-ccd-auth-i1b-test` |
| `banuchat-ccd-dev_ccd_pgvector_data` | `banuchat-ccd-dev-postgres-ccd-1` |
| `banuchat-closure-ollama-models` | `banuchat-oe6-local-ollama-1` |
| `banuchat-dev-ccd-auth-data` | `banuchat-dev-postgres-ccd-auth-1` |
| `banuchat-p1-product-staging-data` | `banuchat-p1-product-staging` |
| `banuchat-schema-test_n8n_data` | `banuchat-oe6-local-n8n-1`, `banuchat-n8n` |
| `banuchat-schema-test_pgvector_data` | `banuchat-oe6-local-postgres-synthetic-1`, `banuchat-postgres` |
| `banuchat-unified-data` | `banuchat-unified-postgres` |
| `banuchat-unified-n8n-data` | `banuchat-unified-n8n` |
| `banuchat_n8n_data` | Ninguno; UNKNOWN_DO_NOT_TOUCH |
| `banuchat_postgres_data` | Ninguno; UNKNOWN_DO_NOT_TOUCH |
| `banuchatv2_n8n_data` | Ninguno; UNKNOWN_DO_NOT_TOUCH |
| `banuchatv2_postgres_data` | Ninguno; UNKNOWN_DO_NOT_TOUCH |

### Redes conservadas

| Red | ID completo |
| --- | --- |
| `banuchat-auth-i1a-test-isolated` | `f8edbfd7cb6dccc263dc773d8310ad4cd219ba08dfa46b36a7a90781526743fd` |
| `banuchat-auth-i1b-uid-test-isolated` | `c9a5b53b926e3df98740119cfae865113ad73d68ba642e960dc24c8d4827e615` |
| `banuchat-auth-p4l1-demo-isolated` | `d7aed135f81ef0a15fc05c13c16db9437d74d8af60e98cb0b8d9a51fb8b6be1b` |
| `banuchat-auth-r0-replay-isolated` | `fb95a06778d3d889f33e2720864842c495379438d8b3b97aee3cd1faaccdd881` |
| `banuchat-ccd-auth-i1b-test-isolated` | `4d0e5644c06264fca495e3aae7db19ab9d937cfcf0a0e47ca3def1ce0db50df7` |
| `banuchat-ccd-dev_default` | `3e1ba8834e0fac10c15aea283a211c9e3db1768475cf7426f715f30b32e55181` |
| `banuchat-dev-ccd-auth` | `99c2fa2eee75d5655c1c2a49d6d61d53571cbdfade9931a9b99ad574be85a38d` |
| `banuchat-p1-product-staging-net` | `2af97f18e32a2ef97620e6884ff5f219bf487140579fbb59d76cd27ea2877e7f` |
| `banuchat-schema-test_default` | `04afd6752cc7b9b63dac175abd217d71f11078fdfd9cd6e85d4be1287820ab5c` |
| `bridge` | `c494d965a7e201f29365e3b59cf8c502828ba944419b90b08c47cbe802b3e3e1` |
| `host` | `a326d586b3cc5df48d0e0d4f66d410cdce3c62df878648ccca4a5d50c63ce06d` |
| `none` | `3006174f8f0f2cd8fce00b60ff37382896d622fbc5cdc318fc16271112380f3b` |

### Imágenes conservadas

| Tags | ID completo | Consumidores finales |
| --- | --- | ---: |
| `banuchat/backend:oe6-local` | `sha256:1b65b080f2979548895051f0be1940d66ca4f89542511993886c61cd42fc236c` | 0 |
| `ollama/ollama@sha256:2a6e883b917fc543389599dae79918f5cac9e1438890506982f44aa4f5625d01` | `sha256:2a6e883b917fc543389599dae79918f5cac9e1438890506982f44aa4f5625d01` | 1 |
| `n8nio/n8n:2.40.5` | `sha256:9f693fd5565539efd5e75ad168526c8041a6af516d9e50bc4d9cb1c9c5031523` | 3 |
| `pgvector/pgvector:pg16` | `sha256:ccc6e83d6e35e931dc7c5def2022729d5a6c370318d099181995567ff1fb4d6b` | 12 |

La metadata integrada `bridge` conservó en las tres capturas D1 el ID de la tabla
anterior y created `2026-10-28T21:32:16.71039573Z`. El ID difiere de D0
(`2204cfd13d948a1e60379f462789b569c767cf01c645e326ec32a36d241a9391`),
sin causa atribuida. No se operó sobre la red ni se repararon referencias antiguas
de contenedores detenidos.

Build cache: no se ejecutó ninguna operación mutante sobre él; las tres capturas
conservan el agregado de 33 entradas/1.019GB. Esto no es una auditoría del contenido
del cache. La imagen backend pasa de referenciada a sin consumidores; el cambio
de «Active/Reclaimable» en `docker system df` no significa que haya sido borrada
ni autoriza su limpieza. No se promete un ahorro de disco calculado por sumas.

## I. Recursos protegidos

Los **16 contenedores restantes** de H y sus mounts quedan expresamente
**DO NOT DELETE YET**, incluidos todos los laboratorios Auth. Se mantienen
`banuchat-unified-postgres` / `banuchat-unified-data` como REQUIRED y
`banuchat-unified-n8n` / `banuchat-unified-n8n-data` como OPTIONAL del producto
actual. Optional significa necesario cuando se ejerce multifuente.

P1/P0 conservan evidencia y persistencia final sin archivo integral acreditado;
OE6 conserva modelos, demo y fuente N8N; `banuchat-dev-postgres-ccd-auth-1`
conserva la fuente de aprovisionamiento PostgreSQL Unified; I1B/editorial y Auth
mantienen evidencia/retención pendiente. `banuchat-postgres` comparte volumen
con PostgreSQL OE6 y `banuchat-n8n` con N8N OE6. No se retiró ningún consumidor
adicional. Ver razones individuales en el runbook actualizado.

Todas las imágenes y redes se conservaron, incluidas backend sin consumidores,
N8N compartida, bridge integrada y las redes históricas. No se amplía la lista de
retirada. No se inició ningún servicio.

## J. UNKNOWN volumes

Continúan **UNKNOWN_DO_NOT_TOUCH**:

- `banuchat_n8n_data`;
- `banuchat_postgres_data`;
- `banuchatv2_n8n_data`;
- `banuchatv2_postgres_data`.

Se comparó únicamente metadata de inventario. No se investigó contenido, montó,
leyó una DB ni borró ninguno. Su ausencia de consumidores no autoriza retirada.

## K. Runbook actualizado

Se actualizó [docker-local-organization.md](../operations/docker-local-organization.md):

- producto vigente: PostgreSQL Unified 55463 y volumen `banuchat-unified-data`;
- API host `npm start` en loopback 3004;
- N8N multifuente opcional Unified 15679 y `banuchat-unified-n8n-data`;
- Ollama host Windows 11434; Mobile/dispositivo y Metro host 8084;
- arquitectura anterior 55453/3003 distinguida como histórica;
- los 16 recursos protegidos, cuatro UNKNOWN y dependencias de recuperación;
- receta OE6 e imagen conservadas; instrucciones antiguas necesitan reconstruir
  el wrapper API antes de volver a usar su nombre.

No se ejecutaron los comandos de arranque documentados. No se reescribieron
checkpoints históricos, INFRA-D0 ni documentación de producto.

## L. Deuda de recovery

Sigue sin acreditarse un backup integral de `banuchat-unified-data` posterior a
CCD 1.4 con restore aislado verificado. Tampoco hay backup current verificado
acreditado de `banuchat-unified-n8n-data`. Esta tarea **no hizo backups/restores**
ni buscó contenido en volúmenes UNKNOWN.

Los resultados O1/O4/OE6 y el snapshot anterior a Unified conservan su alcance
histórico. No sustituyen un respaldo actual de DB/roles/owners/ACL/artefactos ni
el estado y las claves legítimas N8N. Es una futura decisión de recovery/OE6.

`provision-unified-n8n.mts` sigue requiriendo contenedor/volumen N8N OE6 incluso
con `--workflow-only`. `provision-unified.mts` mantiene dependencia de la fuente
PostgreSQL en 55453. El launcher actual aún lee configuración privada bajo la
ruta histórica OE6. Esas dependencias no se modificaron y sus fuentes se conservan.
La retirada de estos dos wrappers no pretende resolver la recuperación completa.

## M. Scope Git y validación

Únicamente:

- modificado `docs/operations/docker-local-organization.md`;
- creado `docs/transition/banuchat-docker-rationalization-infra-d1.md`;
- ningún archivo eliminado del repositorio.

Las evidencias sanitizadas y utilidades temporales están fuera del repositorio;
el manifiesto local enumera archivos y hashes. Se conserva una copia del runbook
público anterior para revisión. No se guardaron Env completos, claves, tokens,
passwords, logs de health, payloads privados ni DBs.

Validaciones efectivamente ejecutadas: comparación de identidades D0/preflight;
preflights A/B; reinspección inmediatamente antes de cada retirada; comparación
completa de sets y metadata sanitizada tras A y B; validación de alcance Git,
links locales y revisión de privacidad; `git diff --check` y estado porcelain
completo. Resultado **PASS**, detalles en evidencia local.
No se ejecutaron tests de aplicación, SQL, HTTP, Docker build ni pruebas de
servicios: no hubo cambio de producto ni se arrancaron servicios para hacerlo.
No commit, push, cambio de rama ni operaciones Git destructivas.

## N. Resultado

**`INFRA-D1 COMPLETE — TWO OBSOLETE CONTAINER WRAPPERS REMOVED, PERSISTENCE PRESERVED`**.

Dos contenedores autorizados retirados por ID completo en órdenes separadas.
Cero volúmenes, redes o imágenes retirados; persistencia preservada por ausencia
de operaciones sobre datos y comprobación de identidad/metadata, sin afirmar
una comprobación de contenido de DB. Los otros 16 contenedores siguen detenidos.

No se usó force, retirada de volúmenes, wildcard, filtro múltiple, prune,
compose down, recreación, arranque ni mutación de build cache. Cualquier nueva
retirada queda fuera de INFRA-D1 y necesita su propia autorización. Se detiene
la limpieza aquí.
