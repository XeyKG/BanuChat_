# BanuChat — operación Docker local

Estado actualizado en **INFRA-D1, 2026-10-28**, después de Unified, CCD 1.4 y
PV-1B. La referencia de inventario es [INFRA-D0](../transition/banuchat-docker-rationalization-infra-d0.md)
y la retirada acotada está acreditada en [INFRA-D1](../transition/banuchat-docker-rationalization-infra-d1.md).
Los checkpoints históricos conservan el estado que observaron en su fecha.

## VIGENTE — producto actual

| Componente | Ejecución y recurso | Dirección local configurada | Persistencia |
| --- | --- | --- | --- |
| PostgreSQL del producto | Docker: `banuchat-unified-postgres`, scope `banuchat.scope=unified-isolated` | `127.0.0.1:55463` | `banuchat-unified-data`; base `banuchat_unified` |
| API unificada | Proceso Node en host: `npm start` desde `backend/api` | `127.0.0.1:3004` | Usa PostgreSQL Unified |
| N8N multifuente opcional | Docker: `banuchat-unified-n8n` | `127.0.0.1:15679` | `banuchat-unified-n8n-data` |
| Ollama | Proceso en host Windows | `127.0.0.1:11434` | Almacén del host; no confundir con el volumen Ollama OE6 |
| Mobile / Metro | Dispositivo y host, sin contenedor | Metro `127.0.0.1:8084` | Aplicación móvil / bundle de desarrollo |

Las direcciones son configuración de arranque, no una declaración de servicios
activos: INFRA-D1 terminó con los **16 contenedores restantes detenidos** y sin
arrancar API, Metro, Ollama ni otros servicios.

La API usa fast paths y Document RAG con PostgreSQL y Ollama. La rama multifuente
vigente espera la orquestación N8N y usa Agent/MCP en host; N8N es necesario cuando
se ejerce esa capacidad. No es requisito de todos los flujos ni de los casos
T01–T05 de PV-1B. La antigua afirmación general «N8N no participa en consultas de
chat» describe el flujo anterior y no toda la aplicación unificada.

`data/synthetic` conserva su papel de fuente de verdad de la demo. Unified reúne
contextos CCD y auxiliar sintético con separación lógica; los almacenes Docker
sintético/editorial históricos siguen separados. No usar la demo como fallback
institucional silencioso. `CCD_DOCUMENTACION` no se monta en Docker.

## Arranque autorizado del producto

Estos pasos documentan operación posterior; **no se ejecutaron en INFRA-D1**.
No aprovisionar ni recrear recursos para un arranque normal.

Comprobar identidad, scope, montaje y estado del PostgreSQL existente:

```powershell
docker inspect banuchat-unified-postgres --format '{{.Name}} {{.Id}} {{.State.Status}} {{index .Config.Labels "banuchat.scope"}} {{range .Mounts}}{{.Name}} {{end}}'
```

El resultado debe corresponder a `banuchat-unified-postgres`, scope
`unified-isolated` y volumen `banuchat-unified-data`. Contrastar puerto 55463 y
el inventario antes de iniciar. Si hay deriva, detener la operación y revisarla.
Cuando el trabajo autorizado lo requiera y esté detenido:

```powershell
docker start banuchat-unified-postgres
```

Desde `backend/api`:

```powershell
npm start
```

El script actual es `scripts/start-unified.mts`. Lee configuración privada
ignorada por Git y exige `banuchat_unified`, puerto DB 55463 y API 3004. Los alias
`start:ccd-auth` y `start:authenticated` también apuntan hoy a Unified; no son el
antiguo arranque en 3003. No imprimir la configuración ni variables privadas.

Solo para una prueba o capacidad multifuente autorizada, comprobar primero el
scope y volumen del N8N existente y, si está detenido, iniciar **ese contenedor**:

```powershell
docker inspect banuchat-unified-n8n --format '{{.Name}} {{.State.Status}} {{index .Config.Labels "banuchat.scope"}} {{range .Mounts}}{{.Name}} {{end}}'
docker start banuchat-unified-n8n
```

Conservar el estado N8N y su clave de cifrado bajo custodia privada. No ejecutar
los scripts `provision-unified*.mts` como sustituto de `start`.

Mobile conserva su launcher actual desde la raíz:

```powershell
.\mobile\scripts\start-ccd-auth.ps1
```

Configura REST v2 en 3004 y Metro en 8084, usando development build por defecto.
La conexión USB/ADB y la validación con dispositivo/usuarios requieren su propia
operación; iniciar servicios no acredita esos resultados. Ver el
[checkpoint Unified](../transition/banuchat-unified-application-checkpoint.md)
y la evidencia [PV-1B](../../eval/mobile/results/product-validation-ux-closure-pv1b.md).

## DO NOT DELETE YET

Se conservan todos los contenedores siguientes, sus volúmenes y las imágenes y
redes que correspondan. «Histórico» o «deprecated» no equivale a autorización de
borrado.

| Contenedor protegido | Razón concreta |
| --- | --- |
| `banuchat-p1-product-staging` | Evidencia de integración P1; sin archivo final integral de DB acreditado |
| `banuchat-p0-operational-pilot` | Piloto experimental y volumen anónimo identificado; retención pendiente |
| `banuchat-unified-postgres` | Producto vigente y persistencia current |
| `banuchat-unified-n8n` | Capacidad multifuente vigente y estado N8N current |
| `banuchat-oe6-local-ollama-1` | Cache/modelos históricos no archivados; distinto del Ollama host |
| `banuchat-oe6-local-postgres-synthetic-1` | Demo histórica; comparte persistencia con `banuchat-postgres` |
| `banuchat-oe6-local-n8n-1` | Dependencia nominal del provisionador N8N Unified; comparte volumen con `banuchat-n8n` |
| `banuchat-dev-postgres-ccd-auth-1` | Fuente nominal del aprovisionamiento PostgreSQL Unified; recovery pendiente |
| `banuchat-ccd-auth-i1b-test` | Evidencia y referencia histórica de auth; retención pendiente |
| `banuchat-ccd-dev-postgres-ccd-1` | Corpus/editorial histórico y evidencia de publicaciones |
| `banuchat-auth-i1b-uid-test` | Laboratorio Auth; requiere decisión posterior de archivo/retirada |
| `banuchat-auth-i1a-test` | Laboratorio Auth; requiere decisión posterior de archivo/retirada |
| `banuchat-auth-r0-replay` | Laboratorio Auth; requiere decisión posterior de archivo/retirada |
| `banuchat-auth-p4l1-demo` | Laboratorio Auth; requiere decisión posterior de archivo/retirada |
| `banuchat-n8n` | Estado N8N histórico compartido con OE6; retención pendiente |
| `banuchat-postgres` | Demo sintética histórica compartida con OE6; retención pendiente |

También se conservan las cuatro imágenes, incluida `banuchat/backend:oe6-local`
aunque ya no tenga contenedores consumidores. No ejecutar `compose down` del
proyecto OE6: permanecen PostgreSQL, N8N y Ollama, sus labels y sus volúmenes.

## UNKNOWN_DO_NOT_TOUCH

Sin procedencia/contenido/backup suficientemente demostrados:

- `banuchat_n8n_data`;
- `banuchat_postgres_data`;
- `banuchatv2_n8n_data`;
- `banuchatv2_postgres_data`.

INFRA-D1 no inspeccionó su contenido, no los montó y no los eliminó. Tamaño pequeño
ni ausencia de consumidores autorizan su retirada.

## Recovery — deuda current y dependencias

**`banuchat-unified-data` no tiene todavía un backup integral posterior a CCD 1.4
con restore aislado verificado acreditado. `banuchat-unified-n8n-data` tampoco
tiene backup current verificado acreditado.** Es deuda de una futura decisión de
recovery/OE6; INFRA-D1 no crea backups ni realiza restores.

El dump anterior a Unified y los backups O1/O4/OE6 son evidencia histórica y no
cubren las escrituras current de Unified por el solo hecho de existir. Snapshots,
conteos y catálogos legibles no sustituyen un restore integral verificado.

Dependencias actuales de los scripts, aunque el runtime normal use Unified:

- `provision-unified-n8n.mts` inspecciona `banuchat-oe6-local-n8n-1` y exige
  `banuchat-schema-test_n8n_data`, **incluso con `--workflow-only`**. El arranque
  normal del N8N vigente no requiere ese contenedor fuente, pero el script de
  actualización/reaprovisionamiento sí. Conservar ambos hasta sustituir y
  verificar esa dependencia mediante otra tarea autorizada.
- `provision-unified.mts` exige como fuente
  `banuchat-dev-postgres-ccd-auth-1` y `banuchat-dev-ccd-auth-data`; esto no hace
  de 55453 el PostgreSQL principal actual.
- `start-unified.mts` aún lee el archivo privado histórico
  `infra/local/oe6/n8n-conversation.env` y sustituye la URL por la de Unified.
  No borrar configuración privada por tener un nombre histórico.

Una futura recuperación debe preservar DB, roles/owners/ACL, artefactos privados,
estado N8N y custodia legítima de claves, y demostrar un restore aislado antes de
una retirada de persistencia. No restaurar sobre Unified, I1B ni otros volúmenes
existentes; su ejecución necesita alcance separado.

## Arquitectura anterior / legacy

Antes de Unified, O3/O4 usaba `banuchat-dev-postgres-ccd-auth-1` en 55453, volumen
`banuchat-dev-ccd-auth-data`, base histórica `banuchat_ccd_auth_i1b_test` y API
3003. I1B en 55443 era referencia de reversión. Eso es historia, no el arranque
habitual actual. `docker-compose.dev.yml` conserva el entorno CCD histórico;
no es la configuración canónica del producto Unified.

`docker-compose.yml` conserva demo/N8N histórico y
`docker-compose.ccd.yml` el entorno editorial. `docker-compose.oe6.yml` conserva
la receta de transferencia OE6, incluidos el servicio `api`, sus condiciones de
arranque y configuración privada necesaria. La retirada de su wrapper no borra
la receta ni la imagen. Si se autoriza reproducirlo, resolver primero puertos,
credenciales y dependencias; no levantar el stack solo para comprobar existencia.
Los runbooks OE6/demostración anteriores requieren reconstruir el servicio API
retirado antes de ejecutar instrucciones que lo nombran.

O1 acreditó restauraciones históricas de CCD autenticado/editorial/demo y una
copia N8N; O4 acreditó hash/catálogo de un dump posterior a aquella promoción,
sin restore aislado entonces; OE6 acreditó restauración sintética. Esos resultados
pertenecen a sus checkpoints, no son pruebas repetidas por INFRA-D1. O5 retiró
solo sus recursos autorizados: ver [checkpoint O5](../transition/docker-organization-o5-checkpoint.md).

## Retirada acotada INFRA-D1

Se eliminaron únicamente los wrappers detenidos
`banuchat-unified-n8n-port-conflict` y `banuchat-oe6-local-api-1`, por ID completo,
sin `force` ni retirada de volúmenes. Inventario: **18 → 16 contenedores,
18 → 18 volúmenes, 12 → 12 redes, 4 → 4 imágenes**. Todos los restantes detenidos.
El informe D0 se mantiene como inventario histórico anterior a esta retirada.

Cualquier futura retirada requiere autorización propia y nombres/IDs exactos
revisados. No usar `docker system prune`, `docker container prune`,
`docker volume prune`, `docker network prune`, `docker image prune`,
`docker compose down` ni `compose down -v` genérico. No tocar build cache.
