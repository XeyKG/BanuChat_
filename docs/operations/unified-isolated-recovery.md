# BanuChat — respaldo y restauración aislada Unified

OE6-UNIFIED-RECOVERY-01, 31/10/2026. Procedimiento local, acotado a los
almacenes inventariados. Resultado real: **BANUCHAT_OE6_UNIFIED_RECOVERY_PARTIAL**.
El [checkpoint](../../eval/oe6/CHECKPOINT-OE6-UNIFIED-RECOVERY-01.md) y el
[resumen saneado](../../eval/oe6/results/oe6-unified-recovery-2026-10-31.json)
separan restauración de bases, copias de archivos y verificación N8N.

No sustituye despliegue UNAB, recuperación de producción, RTO/RPO, SLA,
portabilidad general ni aceptación integral OE6. No arrancar el producto desde
estas copias ni convertirlas en current habitual.

## Inventario y relaciones

| Store | Identidad y persistencia | Alcance respaldado/verificado |
| --- | --- | --- |
| Unified | Contenedor `banuchat-unified-postgres`, base `banuchat_unified`, volumen `banuchat-unified-data`, loopback 55463 | 43 tablas de `banuchat`, `banuchat_auth` y `banuchat_aux`; esquema completo de la base, datos, propietarios y ACL. Auth, sesiones, historial, citas, corpus y auxiliares en el mismo snapshot |
| CCD físico | Cinco raíces permitidas de `data/ccd/local`, según `version_label` del servicio de artefactos | Solo archivos referidos por `document_versions`, con hash coincidente. No copia recursiva de originales, carpeta externa CCD, fuentes internas o repositorio completo |
| OE2 | `banuchat-oe6-local-postgres-synthetic-1`, base `postgres`, volumen `banuchat-schema-test_pgvector_data`; red host Linux existente, sin puerto publicado | Siete tablas `public.oe2_pipeline_*`, seis releases ready y 18 snapshots. No se respaldaron las otras bases sintéticas del mismo contenedor |
| N8N | `banuchat-unified-n8n`, volumen `banuchat-unified-n8n-data`, loopback 15679 | Lectura transaccional SQLite de definiciones seleccionadas: 12 workflows, 12 versiones históricas y una referencia publicada. Archivo lógico offline, sin instancia N8N restaurada |
| Configuración privada | `infra/local/unified/application.json`, `oe2-reader.json`, `postgres.env`, `n8n.env`; `infra/local/oe6/n8n-conversation.env` | Existencia, tamaño y huellas antes/después; no se copiaron secretos ni claves |
| Identidades del operador | `infra/local/auth-i1b/operator-accounts.dpapi` y usuario Windows custodio | Solo inventario/huella del archivo cifrado. Sin descifrado, copia o login restaurado; DPAPI no se presenta como portable a otro usuario/host |

PostgreSQL observado: **16.15**; Unified requiere **vector 0.8.6** y
plpgsql 1.0. OE2 usa plpgsql 1.0. Se reutilizó la imagen PostgreSQL existente por
su ID inmutable, sin pull. N8N observado en el entorno: 2.40.5; su SQLite vivo
está en modo WAL, por lo que no se copió en bruto `database.sqlite` omitiendo WAL.

Unified contiene las relaciones entre cuentas, sesiones, propietarios,
conversaciones, mensajes, citas, documentos y auxiliares. OE2 tiene sus propias
claves y proyecciones; su identidad de embedding es una referencia sintética de
compatibilidad, sin vectores generados/copias CCD. N8N enlaza por metadatos de
operación y credenciales externas; esos secretos no están en el archivo recuperado.
La configuración y archivos CCD completan dependencias que un dump SQL no incorpora.

## Consistencia y límites observados

Cada base se respalda con `pg_dump --format=custom --create --snapshot=...`.
Una conexión mantiene `REPEATABLE READ READ ONLY` y exporta su snapshot.
Inventario, huellas por tabla y comprobaciones se leen en esa misma transacción;
pg_dump importa el snapshot. No se escribe un dump temporal en el contenedor
fuente: stdout se dirige a un archivo privado del host.

Las dos bases tienen snapshots **distintos**. La lectura N8N usa otra transacción
SQLite. No existe transacción distribuida ni snapshot global atómico. Huellas de
los datos observados, configuraciones, artefactos e identidades coincidieron
antes/después de la ventana; esto acredita concordancia observada, no atomicidad
entre servicios ni ausencia demostrada de cualquier escritura transitoria.

Las 43/7 huellas incluyen todas las filas de aplicación de esos esquemas.
Contraseñas verificadoras y tokens persistentes están dentro del dump de auth
por ser parte de la base recuperada; no se imprimen ni utilizan. No se exportan
contraseñas de roles PostgreSQL ni se ejecuta pg_dumpall.

Las identidades de roles, flags, defaults permitidos, propietarios y ACL se
recrean en el destino. Los roles propios quedan **NOLOGIN**, sin password.
El administrador local nuevo `postgres` permite únicamente el ejercicio aislado.
Las tres membresías internas de pg_monitor y el propietario plpgsql se comparan
normalizando el bootstrap de cada cluster; no se intenta convertir el administrador
recreado en el OID bootstrap. La extensión vector se crea bajo el propietario
original mediante `pg_restore --role`. Esta equivalencia no acredita recuperación
de secretos de conexión ni autenticación de las cuentas de la aplicación.

## Preflight obligatorio

Usar el contexto Windows del custodio con acceso autorizado a Docker Desktop.
El sandbox puede redirigir LOCALAPPDATA o denegar su pipe; una denegación no
justifica modificar permisos de fuentes. No ejecutar el script histórico
`verify-synthetic-backup.mjs` sobre Unified.

El [script específico](../../infra/scripts/verify-unified-recovery.mjs) verifica:

- Nombres, IDs, imágenes, estado, etiquetas, bindings loopback y volúmenes/montajes
  exactos de los tres contenedores; ninguna recreación o inicio implícito.
- Acceso administrativo local existente para dump por socket, sin cambiar roles.
  Opciones de rol solo si están en la allowlist observada; otras requieren diagnóstico.
- Espacio Windows ≥2 GiB, memoria Windows libre ≥1 GiB y memoria disponible Docker
  ≥512 MiB; bases ≤128 MiB para los destinos acotados de este ensayo. Son guardias
  locales, no dimensionamiento institucional ni valores generales de capacidad.
- Artefactos actuales íntegros. Históricos ausentes/discrepantes quedan explícitos;
  nunca se copia un archivo incorrecto como si tuviera el hash esperado.
- Custodia bajo LOCALAPPDATA/BanuChat/recovery/OE6-UNIFIED-RECOVERY-01,
  fuera del repositorio/OneDrive, ACL exclusiva del custodio y ruta física local.
  MSIX puede redirigirla a LocalCache; comprobar desde el mismo contexto Windows.

```powershell
node --check infra/scripts/verify-unified-recovery.mjs
node --test infra/scripts/verify-unified-recovery.test.mjs
node infra/scripts/verify-unified-recovery.mjs --preflight
```

Conservar el UUID y revisar `plan.json` privado. Contiene identidades, tamaños,
capacidad, dependencias y el hash del script. El preflight no ejecuta restauración.
Si alguna condición falla, investigar el estado antes de repetir; no modificar
grants, current, fuentes o límites para fabricar aprobación.

## Ejecución delimitada

Solo tras un plan seguro, usar su UUID, sin sustituirlo por el de otra ventana:

```powershell
node infra/scripts/verify-unified-recovery.mjs --run <UUID-del-preflight>
```

Un marcador creado exclusivamente impide repetir el mismo run. Un cambio del
script invalida el plan. Ante error/operación incierta, consultar reporte privado,
contenedores y huellas antes de decidir otra acción; conservar el intento anterior.

Por cada base, secuencialmente:

1. Revalidar identidad contra el plan y abrir snapshot de lectura. Guardar huellas,
   metadatos y dump; calcular SHA-256 del archivo completo.
2. Crear un contenedor nuevo con etiqueta de tarea/UUID, imagen ya existente,
   `--network none`, cero puertos, sin bind mounts ni volúmenes fuente.
   PGDATA es tmpfs independiente de 512 MiB, límite de memoria 768 MiB.
   No se crea volumen persistente; auth trust solo corresponde al destino sin red.
3. Esperar el PostgreSQL final por loopback interno; no confundir el servidor
   transitorio de initdb con readiness final.
4. Recrear metadatos de roles sin passwords y restaurar con pg_restore,
   `--create --exit-on-error`. La base de mantenimiento es `restore_control`;
   si el dump corresponde a `postgres`, solo se elimina esa base inicial del
   contenedor temporal verificado.
5. Comparar filas/hashes, dominios, schemas, tablas, columnas, constraints,
   rutinas, triggers, índices, políticas, ACL/defaults, roles, membresías,
   extensiones, metadatos de base y referencias de negocio.
6. Cerrar transacciones y eliminar únicamente el contenedor de esa ejecución
   después de comprobar ID completo, nombre, imagen, UUID, etiquetas y aislamiento.

Los archivos CCD coincidentes se copian a la custodia conservando rama/ruta
relativa y hash. Son copia verificada en disco, no montaje ni activación del producto.
Las copias de versiones publicadas no se convierten en current.

En N8N se seleccionan campos de workflow/history/publicación, se procesan como
JSON y se redactan claves/valores sensibles reconocidos. Se conserva un JSON y se
reconstruye un SQLite **de archivo de evidencia**, no el esquema operativo completo
de N8N. Se verifica igualdad y referencias entre versiones; la marca active
original es metadato archivado, no activación. No hay entrypoint N8N, webhooks,
schedules, credenciales, claves de cifrado o payloads de ejecución en esa copia.

## Cobertura realmente obtenida

| Componente | Cobertura | Resultado/límite |
| --- | --- | --- |
| Unified SQL | Restaurado | 43/43 tablas; checks, estructura y ACL concordantes, 432 chunks y embeddings conservados; siete releases CCD |
| Auth/historial | Restaurado como datos | Cinco cuentas, 149 sesiones, 176 conversaciones, 606 mensajes y 288 citas; cero huérfanos en las comprobaciones FK explícitas. Ocho conversaciones preexistentes sin owner permanecen así; no se asignaron ni se probó login |
| Auxiliares | Restaurados en snapshot Unified | Release y referencias iguales, incluidas cuentas/perfiles y procedencia ficticia |
| OE2 SQL | Restaurado | 7/7 tablas; seis ready, 18 snapshots y current intactos; cero orígenes sin fuente |
| CCD físico actual | Copia verificada | 107/107 referencias current con hash correcto; incluidas en los 218 archivos copiados |
| CCD físico histórico | Parcial/bloqueado por bytes no coincidentes | 251 referencias distintas en total; 218 coinciden y 33 históricas no coinciden con el archivo disponible en su raíz permitida. No se repararon ni se buscaron originales externos; no afirmar que esos bytes no existen en ningún otro archivo privado |
| N8N definiciones | Solo verificado/recuperado como archivo lógico | 12 workflows, 12 history, una referencia publicada; igualdad e integridad SQLite. No restauración nativa N8N completa |
| N8N secretos/identidades/ejecuciones | No probado, fuera de esta copia segura | 11 credenciales y 116 ejecuciones contadas en origen; sin copiar material cifrado, clave, usuarios o payloads ni arrancar motor |
| Configuración y DPAPI | Solo verificados | Seis archivos con huellas idénticas; sin exportar secretos ni descifrar identidades. Recuperación en otro host/usuario no acreditada |
| App restaurada/modelos/dispositivo | No probado | No API, Agent, MCP, N8N, Ollama o Mobile iniciados desde copia; modelos/binarios y SecureStore del teléfono no respaldados |
| Atomicidad global / entorno UNAB | No probado | Comparaciones concordantes de snapshots separados; sin SLA, RTO/RPO o recepción institucional |

Comparar conteos/hashes y restaurar constraints no acredita por sí solo que toda
la aplicación puede iniciar y operar. Las ocho conversaciones sin owner y las
33 referencias históricas son estado preexistente preservado, sin “arreglos” al
corpus, identidades o historial para pasar la prueba.

## Custodia y limpieza

Los dumps, copias CCD, JSON/SQLite N8N, reportes completos y errores se conservan
privados. No eliminar respaldos al limpiar contenedores. La transferencia de
custodia de 574 archivos mantuvo todos sus hashes y la revisión de ACL sobre
629 elementos entonces existentes no halló accesos Allow ajenos al custodio.
El inventario final privado registra la ruta física y hashes de los cuatro
artefactos principales. No copiar archivos privados a la entrega pública.

Inicialmente se usó la carpeta ignorada del repositorio; al estar bajo OneDrive,
se trasladó toda la carpeta creada por esta tarea a custodia local externa y se
cambió el default del script. No se ejecutó ninguna subida externa; se observó
cero procesos OneDrive al revisar la custodia. Esto no es una auditoría
retrospectiva de sincronización del host. No se cambió ningún proceso ajeno.

El script limpia automáticamente solo sus contenedores tras verificar identidad.
Ante interrupción del proceso, inspeccionar por etiqueta/UUID y cotejar con
`report-private.json`; confirmar además ausencia de red, puertos y montajes.
Si no coincide cualquier dato, detener la limpieza. Nunca borrar por prefijo,
nombre aproximado o lista de volúmenes. No usar prune, compose down -v o rm masivo.

Conservar respaldos hasta que el custodio registre auditoría y retención/destino.
Una eliminación posterior requiere decisión explícita, ruta absoluta resuelta
dentro de esta custodia y comprobación de hashes/recursos propios. No se ejecutó
esa eliminación aquí. LOCALAPPDATA/MSIX no es un respaldo externo duradero del
host ni una política institucional de retención; no desinstalar/limpiar el perfil
que custodia esta evidencia sin trasladarla previamente a otro destino autorizado.
