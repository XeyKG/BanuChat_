# CHECKPOINT BANUCHAT — O5 FINAL

Fecha: 2026-10-24. La limpieza controlada autorizada se ejecutó una sola vez y
exclusivamente sobre los trece recursos del checkpoint O5. No se usaron comandos
`prune`, patrones globales, `compose down` ni eliminación forzada.

## Preflight

Al primer intento Docker había detenido tanto el candidato como I1B y la API no
estaba activa. No se eliminó nada. Tras la autorización de reintento se iniciaron
los mismos contenedores, sin recrearlos: candidato healthy en 55453, I1B ready en
55443 y una sola API canónica en loopback:3003. El endpoint protegido respondió
401 sin credenciales.

Antes de limpiar se confirmó:

- HEAD `a6304c23fe441881a3d1fd95e095866466d9371d` y árbol limpio;
- cero consumidores en las cinco redes y cinco imágenes autorizadas;
- el volumen verificador usado solo por su contenedor y `infra_pgvector_data` sin
  consumidor;
- cero referencias efectivas a esas imágenes y redes en la configuración vigente;
- 32/32 hashes O1 correctos y evidencia de restauración disponible;
- respaldo O4 con hash y catálogo previamente verificados.

## Archivo de recuperación

Las tres imágenes históricas propias no mostraron marcadores de secretos en su
configuración o historial. Se guardaron juntas, fuera de Git y con ACL restringida:

- archivo: `infra/local/docker-cleanup/2026-10-24-o5-final/banuchat-historical-images.tar`;
- tamaño: 74,805,248 bytes;
- SHA-256: `6b8cbe91d59817b759db4b54755a346d3d3ab60174e89280f0a2e69cd963eb69`;
- tags: `banuchat-api:latest`, `banuchat-mcp:latest`, `banuchat-migrate:latest`;
- tar y `manifest.json`: legibles y completos.

Las imágenes oficiales fueron comprobadas en sus registros por digest antes de
eliminarlas:

- N8N stable: `docker.n8n.io/n8nio/n8n@sha256:a8c95f75c6fdf65f5f2b7a7b354744eaa1c62bb911b5c00af6499c3f38e4cd32`;
- pgvector 17: `pgvector/pgvector@sha256:724a4041afdb1750446e3f6b5cfa8f3b0ac5a2cf538ddfa6bfee4f94c2fa85c6`.

## Recursos eliminados

| Tipo | Recursos |
| --- | --- |
| Contenedor | `banuchat-o1-restore-verify` |
| Volúmenes | `banuchat-o1-restore-verify-data`, `infra_pgvector_data` |
| Redes | `banuchat-o1-restore-isolated`, `banuchat_default`, `banuchat_egress`, `banuchat_internal`, `infra_default` |
| Imágenes | `banuchat-api:latest`, `banuchat-mcp:latest`, `banuchat-migrate:latest`, `docker.n8n.io/n8nio/n8n:stable`, `pgvector/pgvector:0.8.6-pg17-trixie` |

La comparación de inventarios confirmó exactamente 1 contenedor, 2 volúmenes,
5 redes y 5 imágenes retirados. No desapareció ningún recurso adicional.

## Estado posterior

| Comprobación | Resultado |
| --- | --- |
| PostgreSQL principal | healthy, failing streak 0, 55453, volumen `banuchat-dev-ccd-auth-data` |
| API principal | una instancia canónica en loopback:3003; recurso protegido responde 401 |
| I1B | ready en 55443, volumen y red conservados |
| Sintético | contenedor y volumen intactos |
| N8N | contenedor, volumen e imagen `n8nio/n8n:2.40.5` intactos |
| Editorial CCD | contenedor, volumen y red intactos |
| Imagen PostgreSQL vigente | `pgvector/pgvector:pg16` intacta |
| Compose canónico | PASS |
| Compose sintético/N8N | PASS |
| Compose editorial | PASS |
| Errores/OOM en recursos protegidos | ninguno |

El inventario pasó de 10 a 9 contenedores, 15 a 13 volúmenes, 16 a 11 redes
incluyendo las redes del motor, y 7 a 2 imágenes. Los recursos clasificados
ARCHIVAR permanecen intactos.

La evidencia sanitizada final está en
[`banuchat-o5-docker-inventory.json`](../../eval/auth/results/banuchat-o5-docker-inventory.json).
Los inventarios completos anterior/posterior y el manifiesto del archivo permanecen
privados bajo `infra/local/docker-cleanup/2026-10-24-o5-final`.

**CHECKPOINT BANUCHAT — O5 FINAL: 13/13 RECURSOS AUTORIZADOS ELIMINADOS; ENTORNO PRINCIPAL E I1B OPERATIVOS.**
