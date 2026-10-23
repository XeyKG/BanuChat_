# CHECKPOINT BANUCHAT — BCH-04/AUTH-P2.1

Fecha local: 2026-10-22. Base confirmada:
`8f69a71e2fbd085e7e34e0b0b8b5b5e7d5bd4e5d`, árbol inicialmente limpio.

**Estado técnico local: conciliación SQL superada y las nueve operaciones de
recursos REST v2 implementadas y verificadas con PostgreSQL real y HTTP loopback.**
AUTH-P2 cumple ese alcance de implementación y pruebas; queda para revisión de
Sala de Control. No se declara listo para estudiantes ni desplegado. Sin commit
ni push. No se inició AUTH-P3/P4, Mobile, M02 o A01.

## 1. Arquitectura implementada

Composición explícita de producto, sin listener automático:

```text
createAuthenticatedRuntimeServer
  → AuthService AUTH-P1: token, cuenta, sesión, expiración y ámbito
  → HTTP exclusivamente /api/v2
  → AuthenticatedResources
      → transacción: resource_context(token) → servicios existentes
      → mensaje: contexto autorizado → liberar conexión/locks
        → Intent Router / fast paths o Document RAG existente
        → nueva transacción: persist_turn(token, turno validado)
          → revalidación SQL → CTE histórica → commit completo
```

`main.ts` y el servidor v1 histórico permanecen intactos. La composición v2 no
importa/monta v1, no tiene flags para omitir auth o elegir CCD y no carga .env.
Valida Pool runtime limitado, base y deployment coincidentes con 007, así como
el catálogo del router. El responder reutiliza la interfaz existente de Document
RAG; no hay otro motor, agente o modelo de perfiles.

Antes de validar los argumentos específicos de recursos HTTP, verifyAccess
comprueba el access sin actualizar actividad. El gate SQL dentro de la unidad de
trabajo actualiza actividad aceptada; un fallo revierte esa unidad. Ni principal,
propietario, perfil o session_id se aceptan como autoridad del cliente/modelo.
No se pasa el token al router, generador, historial o citas. No hay logging de
payloads ni retries de POST/refresh ante resultado incierto.

## 2. Migración adicional y privilegios efectivos

[007_authenticated_resources.sql](../../infra/db/007_authenticated_resources.sql)
se aplicó solo a una base desechable nueva, después de 001/006 sin modificar.
Exige target exacto, runtime revisado y deployment UUID de configuración de
migración. Rechaza CCD, releases no sintéticas y aplicación repetida. No tiene
destino por defecto ni añade seeds, backfill o cambios en tablas de negocio.

Añade una tabla de ámbito fijo y dos funciones SECURITY DEFINER:

- `resource_context(access_token, conversation?, binding?, turn?)`: exige posesión
  del token canónico, calcula SHA-256 de sus bytes decodificados, descubre cuenta
  y sesión, bloquea cuenta → sesión → conversación y revalida status, credencial,
  versión, deployment, digest vigente, access/inactividad/límite absoluto, grant,
  owner y binding aprobado cuando corresponde. Contexto histórico solo propio.
- `persist_turn(access_token, conversation, expected_release, expected_ordinal,
  user, answer, insufficient_evidence, citations)`: ejecuta siempre el gate de
  turno; valida límites Unicode y registros de cita cerrados/índices consecutivos;
  conserva la CTE histórica, sus locks de conversación/current, ordinal, dos
  mensajes y citas en la misma sentencia. Los triggers/FKs verifican procedencia.

El ámbito se lee de runtime_scope, no de un GUC arbitrario en la llamada.
Pasar un principal, UUID de sesión o digest almacenado no sustituye el token.
La función no recibe SQL, identificadores dinámicos de tablas ni instrucciones de
escritura adicionales. Router y generación no están en PostgreSQL.

Propietario de ambas: `banuchat_auth_executor`, **NOLOGIN**, sin administración,
membresías, propiedad del corpus ni CREATE residual. Privilegios mínimos: SELECT
necesario; credenciales solo principal_id; UPDATE(id) en conversations/datasets/
dataset_releases para los locks; UPDATE(updated_at) para lock de cuenta;
UPDATE(last_seen_at) en sesiones; INSERT de messages/citations y EXECUTE de
release_records para el trigger histórico. No recibe publicación/ingesta.

Runtime: **sin UPDATE directo, ni por columna**, en las tres tablas; tampoco
INSERT directo de mensajes/citas o UPDATE/DELETE de owners. Conserva el núcleo
AUTH-P1 y los permisos de lectura/creación/borrado indispensables. No puede
SET ROLE al executor. Su lista de funciones de aplicación ejecutables contiene
solo resource_context, persist_turn y las dos funciones de retrieval históricas.
Las funciones/operadores estándar de PostgreSQL no constituyen esa lista de
aplicación; no se afirma una revocación global de pg_catalog.

PUBLIC no recibe EXECUTE ni acceso a la tabla nueva. Revocación y concesiones
ocurren dentro de la creación transaccional. search_path fijo con pg_temp al final;
objetos de aplicación calificados. No hay SQL dinámico en los cuerpos; el DDL de
GRANT identifica el runtime revisado durante migración.

La excepción y responsabilidades se documentan explícitamente en
[auth-permissions §5.1](../../infra/db/auth-permissions.md), siguiendo la
[documentación oficial de PostgreSQL 16](https://www.postgresql.org/docs/16/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY).
SECURITY DEFINER no protege automáticamente contra compromiso del rol técnico
API o del administrador. Esos roles permanecen dentro del perímetro confiable;
el usuario HTTP no tiene acceso SQL. No activar logs de valores de parámetros con
tokens. En el clúster de prueba log_statement=none y log_parameter_max_length_on_error=0.

La CTE está duplicada deliberadamente en 007 para conservar v1 sin cambios de
comportamiento. Una comparación de texto con sustitución exclusiva de sus siete
parámetros acredita equivalencia; las carreras y procedencia se ejercitan en SQL
real. Los dominios de retorno se preservan exactamente. Cambios futuros exigen
revisar ambas copias, no modificar una silenciosamente.

## 3. Las nueve operaciones y autorización real

| Operación v2 | Política implementada y evidencia |
| --- | --- |
| POST conversations | Body cerrado {}; binding aprobado en current; createConversation y owner en una conexión/transacción; 201 + Location v2; fallo de owner revierte conversación |
| GET conversations | JOIN owner/principal antes de agregación, orden y límite; incluye releases propias históricas; no selecciona por perfil; chats sin owner invisibles |
| GET conversations/{id} | Sesión, grant y owner antes de cargar contenido/citas; 404 común ajena/ausente; alias y fuentes históricos; UUID canónico |
| POST conversations/{id}/messages | Gates antes de contexto/router/RAG y en SQL antes de persistir; perfil derivado y compatible, release/ordinal/citas; revocación ganadora 401 sin turno parcial, publicación/actividad 409 |
| DELETE conversations/{id} | Gate y owner bajo lock; cascadas históricas de mensajes/citas y owner; 204 sin content-type; ajena/ausente/segundo borrado 404; generación activa 409 |
| GET me/progress | Perfil del binding aprobado de current; mismo servicio y filtros/precisión; no admite profile_key libre |
| GET calendar/events | Sesión y grant, calendario común permitido; mismo rango civil America/Bogota y servicio; no inventa agenda personal |
| GET announcements | Sesión y grant, filtros/defaults existentes y reference_time del servidor si falta; salida contractual |
| GET documents/{version}/artifact | Grant y dataset/release ready antes de bytes; servicio de contención/hash/revisión exacta; histórico permitido; documento común, sin exigir owner de chat |

Solo artifact_url se proyecta de v1 a v2 desde la salida confiable; no se reescribe
el texto del usuario/generador. Descargas conservan bytes completos, hash, nombre
UUID.bin, Content-Length, nosniff y Range ignorado. Fixture full_document sin chunks.

El servidor publica también los cuatro handlers AUTH-P1 autorizados (login,
refresh, me, logout). Recuperación sigue sin montar: son trece operaciones
disponibles en esta composición, no las quince del futuro conjunto con AUTH-P3.

## 4. Pruebas y resultados

Entorno: PostgreSQL **16.15**, imagen local pgvector/pgvector:pg16 sin pull,
base `banuchat_auth_p21_test`, puerto 127.0.0.1:55437, red y volumen exclusivos.
Node 24.19.0/Windows. Runtime no superusuario; migrador solo para DDL/fixtures.
HTTP de pruebas: puerto efímero exclusivamente 127.0.0.1, cerrado al terminar.

Fixture completamente ficticio: dos releases ready distintas, perfil compartido,
curso/progreso, evento, anuncio y revisión documental full_document por release.
Publicación SQL con triggers activos y procedencia explícitamente de fixture.
No se copiaron datos originales, generaron embeddings ni ejecutó Ollama/ingesta.

Fase C se ejecutó y aprobó antes de iniciar HTTP. La fase E exige PASS de la misma
base/deployment/release; setup invalida evidencia previa antes de preparar otra base.

| Ejecución real final | Resultado |
| --- | --- |
| test:auth:p21:setup | 001, 006, 007 y fixtures/roles aplicados |
| test:auth:p21:sql | **13/13**, doce comprobaciones y padre |
| test:auth:p21:http | **18/18**, diecisiete comprobaciones y padre |
| npm test en API | **546/546**, unidad/contrato/regresiones existentes |
| conversation-history.test.ts, comprobación final del guard defensivo | **17/17**, ya incluidos en la suite general, reejecutados tras ese ajuste |
| npm run typecheck | PASS, incluye .mts nuevos |
| npm run build | PASS, código de producto |
| diff --check y revisión de alcance | Sin errores; contratos y datos protegidos sin diferencias |

SQL acredita que los tres row locks permanecen hasta COMMIT: otra conexión con
FOR UPDATE NOWAIT recibe 55P03, mientras el runtime sigue recibiendo 42501 al
intentar UPDATE directo. A/B con el mismo perfil no comparten owner. Tokens
alterados, digests, UUID, ámbitos, auth_version, expiración o grants inválidos no
habilitan la función. Citas con procedencia incorrecta revierten el turno.
Dos persistencias concurrentes producen un insert y un conflicto, con ordinales
0–3 sin duplicación. Revocación ganadora y publicación conservan sus rechazos.

HTTP real cubre las nueve operaciones, schemas v2 de éxito, A/B, UUID ajeno/ausente,
historial legacy invisible, cambio de token en el mismo cliente, 401/403/404/409,
inputs cerrados, duplicados JSON escapados, Unicode inválido, tipos, filtros,
límites de body/target/header, Authorization repetida, caching y errores saneados.
Todas las rutas v1 ensayadas devuelven 404 en la composición protegida. Una
concesión UPDATE por columna o un deployment incorrecto hacen fallar el arranque.

La carrera HTTP detiene el generador controlado, demuestra que otra conexión puede
bloquear cuenta y conversación NOWAIT, confirma logout en una segunda solicitud y
luego libera la generación: respuesta 401 y ningún mensaje adicional. Otra carrera
publica una release de fixture durante generación: 409, sin alterar el detalle
histórico. Se comprueba rollback de creación al fallar INSERT del owner.

Huella de las trece tablas de corpus/ingesta del fixture idéntica antes/después de
SQL y HTTP, incluido current restaurado tras la prueba de publicación. Se conservan
huellas y ACL efectivas, sin secretos, en:

- [Validación completa](../../eval/auth/results/bch04-auth-p21-validation.json).
- [Fase C final](../../eval/auth/results/bch04-auth-p21-phase-c.json).
- [Fase E final](../../eval/auth/results/bch04-auth-p21-phase-e.json).
- [Primera fase C adversa](../../eval/auth/results/bch04-auth-p21-phase-c-first.json).

## 5. Defectos encontrados y correcciones

No se repitieron pruebas hasta ocultar fallos. Resultados iniciales y motivos
permanecen en la evidencia:

1. Nombre temporal con sufijo duplicado: guardia de entorno rechazó antes de SQL;
   se retiraron solo recursos verificados y corrigió el nombre.
2. Fixture omitía retrieval_mode documental: P0001; se añadió full_document al
   fixture sin relajar validación de manifiesto.
3. Dos releases ficticias tenían identidad reproducible idéntica: 23505; se
   distinguió su configuración de procedencia de prueba, sin tocar SQL congelado.
4. Primera fase C: 5 tests aprobados, 7 fallidos contando padre. La función retornaba
   text/timestamptz donde la CTE devolvía dominios nonblank/finite_time: 42804,
   expuesto de forma saneada como P0500. Diagnóstico en transacción revertida;
   se corrigieron tipos de retorno, no la CTE. El fixture de vencimiento violaba
   expires>issued; se corrigió a issued+1 ms. Los fallos dependientes incluyeron
   el puntero de publicación de fixture sin restaurar tras aserción fallida; esa
   instancia se retiró y la comprobación final usa una base nueva y huella idéntica.
5. Primer harness HTTP: URN de schema inválido antes de abrir listener; se corrigió
   el identificador del validador. No se cambió OpenAPI.

También se endurecieron sin cambiar contratos: comprobación de UPDATE efectivo
por columna al arrancar, límites HTTP sin destruir prematuramente el socket,
errores nativos saneados y clase explícita de whitespace Unicode en SQL.
Las repeticiones posteriores verificaron cambios concretos o la migración final;
los rechazos adversos esperados se conservaron, no se relajaron permisos para pasar.

## 6. Archivos añadidos y modificados

Modificados:

- `backend/api/src/application/messages.ts`: hooks internos de contexto/commit y adaptador; camino v1 por defecto conservado.
- `backend/api/src/application/conversation-history.ts`: selección opcional interna por owner antes de agregación; validación/proyección reutilizadas.
- `backend/api/src/auth/auth-service.ts`: verifyAccess sin aceptar actividad anticipada.
- `backend/api/src/auth/pg-auth-store.ts`: guardia de privilegios efectivos por columna.
- `backend/api/src/auth/primitives.ts`: CONFLICT contractual.
- `backend/api/src/http/auth-handlers.ts`: exporta parser estricto reutilizado.
- `backend/api/package.json`: tres comandos explícitos de pruebas P2.1, sin dependencias nuevas.
- `backend/api/auth-core.md`: composición actual y reproducción.
- `infra/db/auth-permissions.md`: excepción y privilegios aprobados explícitos.

Añadidos:

- `infra/db/007_authenticated_resources.sql`.
- `backend/api/src/auth/resources.ts`.
- `backend/api/src/authenticated-runtime.ts`.
- `backend/api/src/http/api-v2-server.ts`.
- `backend/api/test/auth-p21/environment.ts`.
- `backend/api/test/auth-p21-setup.mts`.
- `backend/api/test/auth-p21-sql.mts`.
- `backend/api/test/auth-p21-http.mts`.
- `backend/api/test/auth-p21-evidence.mts`.
- `infra/auth-p21-test-environment.ps1`.
- Los cuatro JSON de evidencia enumerados arriba.
- Este checkpoint.

## 7. Integridad, cierre y límites

001/006, migraciones CCD, REST v1/v2, MCP, Mobile, corpus sintético v1, releases,
manifiestos, embeddings y datos originales sin cambios. Las únicas publicaciones,
permisos y escrituras de ensayo pertenecieron al clúster desechable. No se abrió
conexión SQL a las bases originales ni se modificó su PUBLIC. T11 y U03/U04 no se
modificaron ni se reejecutaron generaciones para atribuirles nuevos resultados.

Tras conservar evidencia se verificaron IDs/etiquetas/montajes y retiraron
contenedor, red, volumen y archivo de credenciales exclusivos. Los tres
contenedores, ocho volúmenes y nueve redes originales permanecen. No queda una
instancia AUTH-P2.1 escuchando ni un piloto expuesto.

Límites pendientes fuera de AUTH-P2: aplicar/operar en un entorno aprobado distinto
del desechable, TLS/dispositivos/custodia, revisión de capacidad/múltiples réplicas
y pruebas de uso con estudiantes. La coordinación de actividad HTTP es por proceso;
locks/ordinal SQL protegen la persistencia entre procesos, no acreditan un despliegue
distribuido. No se afirma aislamiento frente a credenciales técnicas comprometidas.

AUTH-P3 conserva recuperación/establecimiento, tokens de un uso, cuotas y buzón
local detrás de interfaz; no hay endpoints activos ni envío. AUTH-P4 conserva
almacenamiento seguro Mobile, refresh serializado y descarte de respuestas de
sesiones anteriores. El ensayo HTTP de cambio de token prueba permisos del backend,
no una experiencia Mobile todavía inexistente.

**Detenido para revisión de Sala de Control. No iniciar el siguiente incremento.**
