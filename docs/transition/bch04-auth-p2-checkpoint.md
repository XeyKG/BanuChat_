# CHECKPOINT BANUCHAT — BCH-04/AUTH-P2

Fecha de ejecución: 2026-10-22. Línea base confirmada:
`f88048eaa38e0ab6ed86e03a310f4501f7bc2528`; árbol limpio al comenzar.

**Estado: detenido en preflight por incompatibilidad comprobada entre los locks
de persistencia existentes y la matriz de privilegios aprobada. AUTH-P2 no está
implementado ni aceptado. Cero de las nueve operaciones funcionales v2 integradas.**

Se devuelve la decisión a Sala de Control. No se cambió código de producto,
contratos, migraciones ni privilegios de entornos originales. No hay instancia
piloto, Mobile, AUTH-P3/P4, M02 o A01 activos como resultado de este incremento.

## 1. Motivo de detención y evidencia

[AGENTS.md](../../AGENTS.md) establece:

> No modificar contratos congelados para hacer pasar una implementación.
> Si código y contrato vigente son incompatibles, detenerse y reportarlo.

El preflight detectó estas obligaciones simultáneas:

| Fuente vigente | Obligación | Consecuencia en PostgreSQL real |
| --- | --- | --- |
| [auth-permissions.md §4.1](../../infra/db/auth-permissions.md) | Ejecutar la sentencia atómica actual y conservar sus locks de conversación y current | No se pueden quitar locks para eludir el error |
| [messages.ts](../../backend/api/src/application/messages.ts) | `FOR UPDATE` sobre conversations; `FOR SHARE OF d, current_release` sobre datasets y dataset_releases | Cada tabla bloqueada exige también UPDATE sobre al menos una columna |
| [auth-permissions.md §5](../../infra/db/auth-permissions.md) | Historial: INSERT de conversations/messages/citations y DELETE de conversations; **sin UPDATE** | El runtime aprobado no puede adquirir el lock de conversación |
| [auth-permissions.md §5](../../infra/db/auth-permissions.md) | Corpus: SELECT y sin DML | El runtime aprobado no puede adquirir los dos locks de current |

La exigencia adicional de privilegios está documentada en
[SELECT de PostgreSQL 16](https://www.postgresql.org/docs/16/sql-select.html#SQL-SELECT-DESCRIPTION).
Se comprobó además con el motor real; no es una inferencia basada únicamente en
documentación. `FOR SHARE` sigue siendo una operación de lectura, pero PostgreSQL
exige permiso UPDATE para ejecutarla. No se concedió ese permiso por conveniencia.

Resultado adverso conservado: **SQLSTATE 42501** en cada uno de los tres locks y
en la llamada real a `sendMessage`, después de que el generador controlado
produjera su respuesta. No se sustituyó el generador por Ollama ni se modificó
la sentencia para obtener un éxito. No hubo reintentos de esos casos adversos.
Las aserciones del diagnóstico aprobaron porque comprobaron el rechazo esperado;
eso **no** significa que el envío de mensajes ni AUTH-P2 hayan aprobado.

## 2. Revisión de reutilización y arquitectura

Se revisaron REST v2/OpenAPI, AuthService, PgAuthStore, la unidad transaccional,
handlers AUTH-P1, creación/listado/detalle/mensajes/borrado, selección de release,
validación y persistencia de citas, composición HTTP/main, 006 y matriz de permisos.

La arquitectura ejecutable permanece en AUTH-P1: núcleo de autenticación y cuatro
handlers desacoplados; HTTP histórico v1 separado en su composición existente.
No se montó un servidor v2, un segundo sistema de conversaciones ni otro RAG.
El generador de la prueba es exclusivamente un adaptador de diagnóstico.

Ruta de integración identificada, **pendiente de implementar** tras conciliar
el bloqueo: composición exclusiva v2 → AuthService → gates de grant/binding/owner
en conexión transaccional → servicios existentes. Router/RAG fuera de locks;
nueva transacción autorizada al persistir el turno completo. No se deriva el
principal de mensajes, argumentos del modelo, perfil o JSON del cliente.

| Operación solicitada | Servicio reutilizable | Gate necesario aún pendiente |
| --- | --- | --- |
| Crear | createConversation | Access válido, grant, binding aprobado en current; INSERT de conversación y owner indivisibles |
| Listar | listConversations y su validación/proyección | JOIN de owners por principal antes de agregación, orden y límite; historial entre releases |
| Detalle | getConversationDetail y reconstrucción de citas históricas | Corpus y owner antes de cargar contenido; snapshot coherente; enlaces de artefacto v2 |
| Mensajes | sendMessage, dispatcher, Document RAG y sentencia atómica actuales | Gates antes de generar y antes de commit; cuenta → sesión → conversación; binding compatible, release/ordinal/citas; resolver primero los privilegios de locks |
| Borrar | deleteConversation y cascadas existentes | Revalidación bajo lock, owner; 404 común para ajena/ausente/repetida, actividad 409 |
| Progreso | getProfileProgress | Binding derivado del principal para current; sin selector libre |
| Calendario | getCalendarEvents | Sesión y grant; filtros y proyección REST v2 |
| Anuncios | getAnnouncements | Sesión y grant; defaults, filtros y proyección existentes |
| Artefactos | getDocumentArtifact | Corpus/dataset/release ready antes de bytes; conservar versión exacta, hash, contención y full_document |

La reutilización de creación se acreditó directamente con PostgreSQL y rol
limitado. La integración autorizada de los otros ocho recursos no se acredita
por encontrar servicios existentes. El listado actual por perfil no constituye
aislamiento por cuenta; los servicios históricos por UUID tampoco comprueban
owner. No se presentan como recursos v2 seguros.

## 3. Entorno y pruebas realmente ejecutadas

Instancia **nueva y desechable**, exclusivamente para este diagnóstico:

- PostgreSQL 16.15, imagen local `pgvector/pgvector:pg16`, sin descarga.
- Base `banuchat_auth_p2_test`, puerto **127.0.0.1:55436**.
- Contenedor `banuchat-auth-p2-preflight-20261022`.
- Red propia `banuchat-auth-p2-preflight-20261022-isolated`, bridge sin masquerade.
- Volumen propio `banuchat-auth-p2-preflight-20261022-data`, sin montajes del host.
- Rol migrador separado y runtime `auth_p2_runtime`, sin superusuario, membresías
  asignadas, CREATE/TEMP de base ni UPDATE sobre las tres tablas afectadas.

Se aplicaron 001 y 006 **sin cambios**, fijando el destino de 006 en la misma
conexión. Se reutilizó el fixture ficticio AUTH-P1 en la base nueva: un perfil,
sin documentos ni embeddings. Su SQL crea/publica únicamente esa release de
fixture mediante las validaciones existentes; no copia ni publica una release
del corpus original. No se consultó Ollama ni se ejecutó una ingesta.

Se otorgaron solo SELECT necesarios para la reproducción, INSERT de historial,
DELETE de conversations y SELECT/INSERT de owners. Es un rol mínimo de
diagnóstico, no un rol runtime completo de autenticación aprobado para despliegue.
La revocación PUBLIC de CONNECT/TEMP afectó solo al clúster nuevo. No se abrió
conexión SQL a las bases originales sintética o CCD.

Comando desde backend/api:

```powershell
node --import tsx --test test/auth-p2-preflight.mts
```

Resultado: **8 comprobaciones aprobadas, 9 tests incluyendo el contenedor padre**:

1. 001/006 aplicadas; 11 tablas auth y 16 FKs validadas.
2. Rol limitado sin poderes administrativos ni UPDATE sobre las tablas de locks.
3. createConversation existente funciona con SELECT/INSERT.
4. Lock de conversación rechazado: 42501.
5. Lock de dataset rechazado: 42501.
6. Lock de release rechazado: 42501.
7. sendMessage real, generador controlado invocado una vez, persistencia rechazada: 42501.
8. Cero mensajes/citas parciales y misma huella del corpus de prueba antes/después.

`npm run typecheck`: primera ejecución FAIL TS7060 por sintaxis del genérico
de una función de prueba en .mts; se añadió la coma requerida y la segunda
ejecución aprobó. No se alteró código runtime ni se relajó la configuración TS.
No se repitieron pruebas SQL para ocultar el resultado adverso.

Evidencia saneada versionada:
[bch04-auth-p2-preflight.json](../../eval/auth/results/bch04-auth-p2-preflight.json).
Incluye códigos, huellas SHA-256, identidad de recursos, línea base y resultados;
no incluye secretos ni hashes de credenciales. Las contraseñas aleatorias
existieron exclusivamente en configuración local ignorada y en el contenedor.

## 4. Alcance no ejecutado y compatibilidad

| Verificación solicitada | Estado real |
| --- | --- |
| HTTP v2 real en loopback y nueve recursos protegidos | No ejecutado: integración detenida |
| A/B, UUID ajeno, mismo perfil y cambio de usuario en cliente | No ejecutado |
| GET/POST/DELETE protegidos sin sesión y tokens alterados/caducados/revocados | No ejecutado en recursos v2; no reatribuir pruebas AUTH-P1 a AUTH-P2 |
| Revocación ganadora durante generación, sin locks durante Ollama | No ejecutado; el diagnóstico de generación no simula una revocación |
| Release/citas históricos en HTTP v2 | No ejecutado; fixture sin citas |
| Ausencia de bypass v1 en composición protegida | No acreditada: esa composición no existe aún; no se montó ni lanzó v1 en la instancia de prueba |
| Validación de headers/parser/caching/límites HTTP v2 | Pendiente de implementación y pruebas reales |
| Corpus de la instancia de prueba intacto | Huella anterior/posterior idéntica |
| Contratos, código runtime y datos protegidos del repositorio | Sin diferencias respecto a la línea base |
| Regresiones REST/RAG/MCP/Mobile | No ejecutadas: no se dejó ningún cambio de producto que regresionar |

No hay cambios en T11 ni U03/U04. No se atribuye validez institucional a reglas,
identidades o datos ficticios. El sistema no queda listo para estudiantes.

## 5. Archivos y cierre de recursos

Solo cuatro archivos nuevos:

- `backend/api/test/auth-p2-preflight.mts`: diagnóstico reproducible y guardias de destino.
- `infra/auth-p2-test-environment.ps1`: creación, inspección y retiro de recursos propios con verificación de IDs, etiquetas, montaje y red.
- `eval/auth/results/bch04-auth-p2-preflight.json`: evidencia saneada del rechazo.
- Este checkpoint.

No se modificó ningún archivo preexistente. `git diff --check` y comprobación de
alcance final sin diferencias en archivos protegidos. Sin commit ni push.

Tras conservar evidencia se retiraron el contenedor, red y volumen exclusivos,
verificando sus identidades; se eliminó su archivo local de credenciales. El
inventario final conserva los tres contenedores, ocho volúmenes y nueve redes
originales. No se eliminaron recursos de otros entornos ni conversaciones originales.

## 6. Decisión concreta que requiere Sala de Control

No es posible afirmar simultáneamente que el runtime respeta la matriz actual,
conserva exactamente sus locks y completa el turno con esos permisos. AUTH-P2
solo permite ampliar los privilegios indispensables dentro de lo aprobado; la
prohibición explícita de UPDATE y DML de corpus impide dar por autorizada una
excepción implícita. La autorización debe conciliarse antes de implementar.

Opciones para revisión, **ninguna aplicada**:

1. Preferida para evaluar: autorizar el diseño de una superficie SQL acotada de
   persistencia/locks, con rol técnico separado y funciones auditadas que no
   permitan SQL arbitrario. Mantener al runtime sin UPDATE directo de corpus.
   Requiere decidir DDL adicional, propiedad/EXECUTE, search_path y prueba de
   privilegios; no equivale a autorización concedida ni a un diseño ya validado.
2. Revisar expresamente la matriz para permitir UPDATE sobre columnas concretas
   requeridas por locks. Esto también concede capacidad SQL de UPDATE sobre
   ellas; no debe describirse como un permiso «solo para bloquear». Requiere
   revisar riesgos, controles y la guardia de privilegios de arranque, incluidas
   concesiones por columna, antes de autorizarlo.

No se propone quitar los locks, usar superusuario, modificar 001/006, desactivar
triggers, cambiar silenciosamente la semántica de concurrencia ni atribuir un
409 al rechazo de permisos. La decisión elegida debe conservar las reglas de
release/ordinal/citas y la revocación ganadora antes del commit.

Tras esa decisión: retomar AUTH-P2 desde la integración transaccional, demostrar
las nueve operaciones y toda la batería HTTP/PG A/B y carreras solicitadas.
AUTH-P3 conserva pendientes recuperación, tokens de un uso y transporte local;
AUTH-P4 conserva pendientes integración Mobile, almacenamiento seguro y descarte
de respuestas de sesiones anteriores. No iniciar ninguno automáticamente.

**Detenido para revisión de Sala de Control.**
