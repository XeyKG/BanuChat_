# CHECKPOINT BANUCHAT — O5

Fecha: 2026-10-24. Alcance: inventario y propuesta de limpieza; **no se eliminó,
detuvo ni reinició ningún recurso**.

## Estado protegido

`banuchat-dev-postgres-ccd-auth-1` continúa healthy en 55453 con volumen
`banuchat-dev-ccd-auth-data` y red `banuchat-dev-ccd-auth`. La única API habitual
continúa en loopback:3003 mediante `npm run start:ccd-auth`. I1B permanece activo
en 55443, sin cambios y fuera de la lista de eliminación.

El incidente de detención I1B durante O2 sigue sin causa atribuida. Su retirada
requiere Android físico, restauración aislada del respaldo O4, estabilidad,
recuperación de escrituras posteriores y autorización específica.

## Inventario final

Se observaron 10 contenedores, 15 volúmenes, 16 redes contando `bridge`, `host` y
`none`, y 7 imágenes. La captura sanitizada está en
[`banuchat-o5-docker-inventory.json`](../../eval/auth/results/banuchat-o5-docker-inventory.json).

### Conservar

| Tipo | Recursos | Razón |
| --- | --- | --- |
| Contenedor | `banuchat-dev-postgres-ccd-auth-1` | PostgreSQL CCD autenticado principal |
| Volumen / red | `banuchat-dev-ccd-auth-data`, `banuchat-dev-ccd-auth` | Datos y aislamiento del entorno principal |
| Contenedor | `banuchat-ccd-auth-i1b-test` | Reversión provisional exigida por O5 |
| Volumen / red | `banuchat-ccd-auth-i1b-test-data`, `banuchat-ccd-auth-i1b-test-isolated` | Estado histórico I1B |
| Imagen | `pgvector/pgvector:pg16` | Usada por nueve contenedores y todos los Compose PostgreSQL vigentes |
| Redes Docker | `bridge`, `host`, `none` | Recursos del motor; fuera de la limpieza BanuChat |

### Conservar para pruebas y operación opcional

| Función | Contenedor | Volumen | Red / imagen |
| --- | --- | --- | --- |
| Demo y regresión sintética | `banuchat-postgres` | `banuchat-schema-test_pgvector_data` | `banuchat-schema-test_default`, pgvector 16 |
| Automatización N8N | `banuchat-n8n` | `banuchat-schema-test_n8n_data` | `banuchat-schema-test_default`, `n8nio/n8n:2.40.5` |
| Edición/publicación CCD | `banuchat-ccd-dev-postgres-ccd-1` | `banuchat-ccd-dev_ccd_pgvector_data` | `banuchat-ccd-dev_default`, pgvector 16 |

Estar detenidos es su estado normal cuando esas tareas no se ejecutan.

### Archivar antes de decidir su eliminación

| Grupo | Recursos | Estado |
| --- | --- | --- |
| AUTH-P4-L1 | contenedor, volumen y red `banuchat-auth-p4l1-demo*` | Detenido; evidencia versionada, sin dump de archivo específico |
| CCD-AUTH-R0 | contenedor, volumen y red `banuchat-auth-r0-replay*` | Detenido; evidencia versionada, sin dump de archivo específico |
| CCD-AUTH-I1A | contenedor, volumen y red `banuchat-auth-i1a-test*` | Detenido; evidencia versionada, sin dump de archivo específico |
| I1B UID | contenedor, volumen y red `banuchat-auth-i1b-uid-test*` | Detenido; evidencia versionada, sin dump de archivo específico |
| Compose antiguos sin contenedor | `banuchat_postgres_data` 48.56 MB, `banuchat_n8n_data` 2.073 MB, `banuchatv2_postgres_data` 81.34 MB, `banuchatv2_n8n_data` 719 B | Sin consumidores; contenido no conciliado con respaldos O1 |

No se propone borrar estos doce recursos de laboratorio ni los cuatro volúmenes
huérfanos hasta capturar un archivo, verificar su lectura y decidir expresamente
si su estado exacto merece conservación. Sus scripts, contratos y pruebas
versionadas no son candidatos de limpieza.

## Lista exacta propuesta para eliminar

La siguiente lista es la única autorizable para la limpieza inmediata. Ningún
comando destructivo se ejecutó en O5.

| Recurso | Tipo | Dependencias y respaldo | Consecuencia / recuperación |
| --- | --- | --- | --- |
| `banuchat-o1-restore-verify` | contenedor detenido | Sin consumidores; O1 conserva dumps y restauración verificada | Se pierde solo la copia restaurada; se recrea desde los dumps O1 con pgvector 16 |
| `banuchat-o1-restore-verify-data` | volumen, 89.97 MB | Usado solo por el contenedor anterior | Misma recuperación desde O1 |
| `banuchat-o1-restore-isolated` | red vacía | Sin endpoints | Se recrea como bridge aislado si vuelve a verificarse un restore |
| `infra_pgvector_data` | volumen, 0 B | Sin contenedor, referencia o contenido | Ninguna consecuencia funcional |
| `banuchat_default` | red vacía | Sin endpoints ni Compose vigente asociado | Ninguna; una definición futura puede recrearla |
| `banuchat_egress` | red vacía | Sin endpoints | Ninguna; recreable con su topología histórica si fuese necesaria |
| `banuchat_internal` | red interna vacía | Sin endpoints | Ninguna; recreable como red `internal` |
| `infra_default` | red vacía | Sin endpoints; Compose vigente usa nombres explícitos | Ninguna |
| `banuchat-api:latest` | imagen, 0 contenedores | No referenciada; backend vigente corre en host | Se archivará con `docker image save` antes del borrado |
| `banuchat-mcp:latest` | imagen, 0 contenedores | No referenciada; MCP no usa esa imagen en el runtime actual | Se archivará con `docker image save` antes del borrado |
| `banuchat-migrate:latest` | imagen, 0 contenedores | No referenciada; migraciones actuales son SQL/código versionado | Se archivará con `docker image save` antes del borrado |
| `docker.n8n.io/n8nio/n8n:stable` | imagen, 0 contenedores | Compose fija `n8nio/n8n:2.40.5` | Se archivará; la imagen vigente 2.40.5 permanece |
| `pgvector/pgvector:0.8.6-pg17-trixie` | imagen, 0 contenedores | Todos los Compose fijan pg16 | Se archivará; pg16 permanece |

Las tres imágenes `banuchat-*` comparten casi todo su almacenamiento; su retiro
ordena etiquetas más que liberar espacio. N8N `stable` y pgvector 17 representan
aproximadamente 2.37 GB únicos recuperables. No se propone `docker system prune`,
`volume prune`, borrado de build cache ni patrones globales.

## Comprobaciones

| Comprobación | Resultado |
| --- | --- |
| API canónica y PostgreSQL principal | PASS, 3003 / 55453 |
| I1B | PASS, activo e intacto en 55443 |
| Conexiones hacia candidatos de eliminación | Ninguna |
| Endpoints en redes candidatas | 0 |
| Contenedores sobre imágenes candidatas | 0 |
| Compose `banuchat-dev` | PASS |
| Compose sintético/N8N | PASS |
| Compose editorial CCD | PASS |
| Manifiesto O1 | 32/32 hashes, sin diferencias |
| Restauraciones PostgreSQL O1 | Verificadas previamente |
| Copia N8N O1 | Hashes e integridad SQLite verificadas |
| Respaldo O4 | Hash y catálogo PASS; restauración aislada pendiente |

## Operación única propuesta

Después de aprobar por nombre los trece recursos anteriores:

1. Repetir inventario, listeners, endpoints y hashes; abortar ante cualquier cambio.
2. Guardar las cinco imágenes candidatas en un archivo privado mediante
   `docker image save`, calcular SHA-256 y validar que el tar sea legible.
3. Eliminar solo el contenedor verificador O1.
4. Eliminar sus volumen/red, el volumen vacío y las cuatro redes huérfanas.
5. Eliminar únicamente las cinco referencias de imagen enumeradas.
6. Repetir inventario y `docker compose config`; comprobar API 3003, candidato
   55453, I1B 55443 y separación sintético/CCD.
7. Detenerse y reportar; no encadenar limpieza de los recursos clasificados
   ARCHIVAR.

La operación no toca datos del entorno principal, I1B, demo sintética, N8N,
editorial CCD, código, pruebas o evidencias.

**CHECKPOINT BANUCHAT — O5: INVENTARIO Y LIMPIEZA EXACTA PREPARADOS; CERO RECURSOS ELIMINADOS.**
