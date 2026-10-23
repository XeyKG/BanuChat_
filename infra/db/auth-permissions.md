# AUTH-P0 — Persistencia y autorización de BanuChat

Base revisada: `705fb555b6ee050df4c5d07b68724251963a83f9`. Candidato final: [006_synthetic_auth.sql](006_synthetic_auth.sql), **sin aplicar**. Contrato independiente: [REST v2](../../backend/api/api-contract-v2.md) y [OpenAPI](../../backend/api/openapi-v2.yaml). No se crean roles, cuentas, permisos de clúster ni servicios en AUTH-P0.

## 1. Destino y fronteras de la migración

Se añade únicamente `banuchat_auth` a una base sintética revisada, conservando `banuchat` y todas las migraciones 001–005. No se cambia v1/MCP, ninguna FK de negocio ni corpus/manifiestos/releases/embeddings. No se alteran las conversaciones anteriores ni se rellena owner por perfil. Once tablas nuevas, cero seeds/backfill, funciones de login o triggers sobre negocio.

La base sintética observada documentalmente en M01.2 es `banuchat_schema_test`; **no está autorizada para aplicar AUTH-P0**. CCD `banuchat_ccd_dev` queda excluida. No se establece conexión a ninguna en esta tarea ni se infiere su estado actual a partir del checkpoint histórico.

Guardias, antes de crear el schema:

1. `banuchat_auth.target_database` debe estar definido en la misma conexión y coincidir exactamente con `current_database()`. El operador deberá fijar el nombre literal revisado en la autorización futura. Sin valor/mismatch: aborta; no existe destino por defecto ni se deduce de `.env`.
2. Rechazar nombres con `ccd`, schema auth previo, contexto o validador CCD. La migración no es idempotente ni intenta adaptar una base existente parcialmente.
3. Exigir tablas de negocio existentes, un único dataset `id=1`, nombre `banuchat-synthetic`, current ready con `synthetic=true`, y todas las releases con marca sintética explícita.
4. Exigir FK de conversaciones hacia perfiles sintéticos; las FKs nuevas deben resolver las claves reales indicadas abajo. Un drift incompatible aborta la transacción, sin corregir el esquema histórico.

El setting de destino es una protección frente a selección accidental, no una autorización criptográfica: un administrador que cambia SQL/setting puede eludirla. La autorización escrita del destino, el rol limitado, aislamiento y verificación de identidades de servidor/base siguen siendo requisitos. Nunca introducir un `SET` por defecto apuntando a la base actual dentro del archivo de migración.

## 2. Relaciones y simplificaciones decididas

| Relación | Claves reales / acción al borrar | Garantía |
| --- | --- | --- |
| Cuenta → credencial | accounts.id → password_credentials.principal_id PK/FK; RESTRICT | Máximo una credencial por cuenta, sin hash dentro del registro que devuelve `me` |
| Cuenta → sesiones | sessions.principal_id → accounts.id; RESTRICT | Sesiones asociadas a una identidad estable. `auth_version` es snapshot, **sin FK a versión mutable** |
| Sesión → refresh | refresh_tokens.session_id → sessions.id; RESTRICT | Una sesión es la familia. Conservar digests consumidos mientras se pueda detectar replay |
| Refresh → sucesor | FK `(session_id,replaced_by)` → refresh_tokens `(session_id,id)` UNIQUE; RESTRICT | Sucesor de la misma familia, un único predecesor por reemplazo; no autorreferencia directa |
| Cuenta → reset | reset.principal_id → accounts.id; RESTRICT | Propósito, versión, digest y terminales. Cuenta no se elimina borrando un token |
| Cuenta → asignación | profile_bindings.principal_id PK/FK; RESTRICT | Un perfil por cuenta; **sin UNIQUE de profile_key entre cuentas** |
| Asignación → versión | FK `(principal_id,dataset_id,profile_key)` a la misma UNIQUE de profile_bindings; RESTRICT | El perfil aprobado por release coincide con la asignación estable |
| Versión → release de dataset | FK `(dataset_id,dataset_release_id)` → banuchat.dataset_releases `(dataset_id,id)` UNIQUE real | No unir una release de otro dataset |
| Versión → perfil publicado | FK `(dataset_release_id,profile_key)` → banuchat.synthetic_profiles, cuya PK es exactamente esa pareja | Sin FK incorrecta por profile_key solo ni copia del perfil académico |
| Cuenta → permiso común | corpus_grants PK `(principal_id,dataset_id)`, FKs a accounts y datasets; RESTRICT | Solo modo synthetic, dataset 1 y permiso read en esta versión |
| Cuenta → conversación propia | owners.conversation_id PK/FK → conversations.id, CASCADE; owners.principal_id → accounts.id, RESTRICT | Un propietario por chat. Borrar conversación propia elimina su owner; borrar owner no borra conversación, mensajes o corpus |
| Auditoría → sesión/cuenta | FK sesión SET NULL; cuenta RESTRICT | Limpieza autorizada de sesiones no borra eventos; sin cascada destructiva desde cuenta |

No se añade UNIQUE `(id,profile_key,release)` a conversaciones congeladas: solo tiene PK `id`; su FK original valida el perfil de apertura. La coincidencia entre ese contexto, el binding aprobado y el principal al crear un owner la garantiza el caso de uso transaccional, no una FK inventada o un CHECK con subconsultas.

Se mantienen las once responsabilidades/tablas del diseño porque tienen permisos/ciclo de vida distintos. Simplificaciones concretas: `profile_bindings` usa principal_id como PK, sin un UUID de binding redundante; sesiones son también familias de refresh, sin tabla de familias; revocación de refresh se deriva de la sesión, sin flags redundantes por token; token inicial y reset comparten tabla con propósito; no hay tabla de IdP, credencial institucional, copia de expedientes, cola persistente de correo, tabla de roles de producto o JSON arbitrario de auditoría. No se añade ORM.

Separar password_credentials permite al aprovisionador crear cuentas pendientes sin leer/ver contraseñas o hashes. profile_binding_versions es necesaria porque la PK del perfil está versionada y una release nueva no puede reasignarse silenciosamente. La asignación puede ampliarse a nuevas releases mediante tarea administrativa autorizada sin tocar perfiles. Reasignar a otro perfil requiere retirar referencias de aprobación de la asignación anterior de forma controlada, registrar evento y revocar sesiones/tokens; no concede historial previo del perfil nuevo ni altera el contexto de apertura de chats propios.

## 3. Tipos, checks e índices

- UUID nativos con `gen_random_uuid()` para identificadores internos, nunca como token secreto. Todos los timestamps usan el dominio existente `banuchat.finite_time` con columna NOT NULL cuando obligatoria; no se admiten ±infinity. Expiraciones positivas y techos en segundos, sin dependencias de DST o `now()` dentro de CHECK/index.
- UID ASCII exacto `BCH-DEMO-[0-9]{4}`, correo de prueba único bajo `banuchat.test`, estado pending_password/active/disabled, versión positiva y coherencia de disabled_at/updated_at. El DDL restringe formato/dominio, no identifica personas por semántica; la herramienta administrativa solo admite direcciones inventadas y buzones controlados.
- Credenciales PHC Argon2id v19, salt 16 bytes y salida 32 bytes; coste m entre 19456 y 262144 KiB, t entre 2 y 10, p1. CHECK valida forma/coste, **no calcula/verifica Argon2 ni demuestra aleatoriedad del salt**. Estado active/credencial/binding/permisos se establece coherentemente en el caso de uso, no mediante múltiples commits.
- Tokens: dominio sha256_hex reutilizado, NOT NULL y UNIQUE; no columna token/password en claro. Access ≤900 s, sesión ≤604800 s, reset ≤1200 s. El runtime elige la política exacta del contrato y comprueba inactividad 86400 s y expiración exclusiva.
- Refresh: sucesor único, misma familia, consumo ligado a reemplazo y dentro de vigencia; reset no puede quedar simultáneamente consumido e invalidado. No impedir con una FK el incremento de accounts.auth_version: los snapshots antiguos deben conservarse para quedar inválidos.
- Contadores: clave HMAC digest + acción + inicio de ventana PK, intentos positivos y duración/expiración exactas por acción. Ventanas alineadas por epoch. No FK a cuentas: también se limitan UID inexistentes sin revelarlos.
- Auditoría tipada con outcome y tipos de evento cerrados, correlación aleatoria y relaciones internas opcionales; sin JSON libre, correo, UID, IP, tokens, hashes de contraseña, SQL o mensajes. No se expone a Mobile.

Índices UNIQUE/PK resuelven UID/email, digests, cuenta/binding y owner por chat. Índices adicionales: sesiones por principal y expiración; refresh por sesión/expiración; reset pendiente por principal/expiración y cleanup; versiones por release/perfil; owners por principal/chat; ventanas por expiración; auditoría por tiempo/principal/sesión. No índice parcial con `expires_at > now()`: la expiración se filtra en la consulta. No índices nuevos sobre corpus ni campos de conversaciones congeladas.

La DDL no equivale al sistema de autorización: no implementa consumo único transaccional, CSPRNG, versiones crecientes, revocación, relación temporal refresh-sesión, máximo de tokens pendientes, independencia de secretos ni sanitización. Esas obligaciones de aplicación están fijadas a continuación y deben probarse en AUTH-P1/P2/P3; no se declaran resueltas con tests de texto SQL.

## 4. Matriz de autorización de aplicación

| Operación | Contexto derivado del servidor | Gate y operación indivisible |
| --- | --- | --- |
| Login | UID sintético + verificador de contraseña propia | Rate limit, lookup y hash real/ficticio; luego cuenta bloqueada y misma credencial/versión/estado antes de crear sesión. Fallo genérico 401 |
| Refresh | Digest → familia → cuenta; deployment_id fijo | Cuenta/sesión/token revalidados bajo lock; activo, no expirado, versión actual; insertar sucesor, consumir previo, rotar access y actualizar actividad en una transacción. Replay revoca familia |
| Me / consultas | Access → sesión → principal | Cuenta activa, versión, expiración/inactividad/deployment y permiso; binding de current para me/progreso, sin selector del cliente |
| Crear chat | Principal → grant → binding y versión aprobada | Resolver current ready; crear conversación y owner en misma transacción sobre una conexión, o ninguna fila. No apropiar chats existentes |
| Listar chats | Principal autenticado + permiso de corpus | JOIN owners por principal antes de agregar, ordenar y limitar; no filtrar únicamente por perfil |
| Leer chat | Principal + owner por UUID | Verificar antes de cargar historial/citas; 404 común para ajeno/ausente. Releer en contexto coherente, sin devolver un resultado de otra cuenta |
| Enviar | Sesión/principal + owner + contexto histórico autorizado | Antes de router/RAG y nuevamente antes de persistir; perfil de apertura compatible con binding aprobado para current; no perfil del request/modelo |
| Borrar | Sesión/principal + owner | Revalidar bajo lock y borrar solo conversación propia. Cascada existente mensajes/citas y nueva FK owner; 404 para ajeno/ausente |
| Artefacto común | Principal + permiso de corpus + pertenencia dataset/release ready | Autorización antes de acceder a bytes/ruta; luego mismos hashes/contención/versión exacta existentes. No exige owner de un chat |
| Calendario/anuncios | Principal + corpus vigente | Servicio común de lectura, sin permisos académicos individuales inventados |
| Progreso | Principal → binding en current | Mismo servicio de progreso con perfil resuelto en servidor; no permitir path/query de otro perfil |
| Reset | Digest → cuenta/proposición persistida | Cuenta y tokens bajo locks; propósito/estado/versión/expiry válidos; escribir hash, activar pendiente si corresponde, incrementar versión, consumir token, invalidar hermanos y revocar todas las sesiones atómicamente |
| Logout | Access → sesión actual | Revocar antes de 204; no permitir selección de otra sesión por argumento |

Campos principal_id, synthetic_uid, profile_key, deployment_id, permisos o destinatario enviados en operaciones de recursos son propiedades/query no declaradas: 400 tras autenticar. Un UID válido distinto en login no es una petición autorizada de recursos: necesita su contraseña. Solicitar reset para cualquier UID válido conserva respuesta genérica y entrega solo al buzón previamente asociado; no modifica ni revela esa cuenta.

No exponer correo propio o ajeno en REST v2; me solo proyecta los campos definidos. Mensajes/historial pueden contener texto que el operador haya escrito: limitar el ensayo a preguntas sintéticas, no capturar datos privados en logs y controlar acceso al historial aun si su contenido parece una demo. El corpus común no convierte chats en documentos compartidos. El principal no se transmite como argumento libre al LLM/MCP.

### 4.1 Orden transaccional para conservar invariantes

1. Usar `pool.connect()` con BEGIN/COMMIT/ROLLBACK y liberación garantizada. Los servicios pueden recibir el cliente transaccional; no hacer BEGIN y operaciones mediante distintos `Pool.query()`.
2. Orden común: cuenta → sesiones por UUID ascendente → conversación → token. Lookup inicial de digest/UUID solo descubre IDs; bajo locks repetir validez y pertenencia. Todos los cambios de estado/credencial/binding/grant que invaliden permisos toman primero el lock de cuenta, incrementan auth_version y revocan sesiones/tokens en esa misma transacción.
3. Prevalidar sesión/owner antes de leer contexto y generar. Capturar release/ordinal mediante los servicios existentes, sin mantener transacción durante router, Ollama, Argon2 o correo.
4. Para confirmar turno: nueva transacción que bloquea cuenta/sesión, comprueba revocación/versión/corpus/owner, y ejecuta dentro de esa conexión la sentencia atómica actual. Conservar sus locks de conversación y current, ordinal esperado, roles/citas y restricciones. Si la revocación gana, rollback y 401; si gana el turno, un logout posterior no lo elimina. No tocar datos al detectar un UUID ajeno.
5. La protección de actividad HTTP sigue siendo por proceso; no sustituye locks/invariantes SQL. Conservar los 409 existentes. Borrar también usa el orden anterior y exige owner hasta su commit. Detalle/listados usan un snapshot de lectura coherente con los gates; revocar después de comenzar una lectura no puede retirar bytes ya enviados, y Mobile descarta respuestas de otra generación de sesión.
6. No reintentar automáticamente refresh, POST mensajes o reset tras commit/respuesta inciertos. Consultar estado/historial propio y volver a login cuando corresponda. No cambiar el comportamiento del RAG, T11/U03/U04 o releases para resolver una carrera de identidad.

No hay RLS nuevo ni SECURITY DEFINER para login: el límite es la API y sus credenciales técnicas privadas. El usuario final no recibe acceso SQL. Un rol runtime con lectura de tablas puede leer más filas que una cuenta HTTP; por eso debe estar aislado, con secretos protegidos y sin exponer una pasarela SQL arbitraria. Esta matriz no afirma aislamiento frente al propietario/administrador de la base.

## 5. Matriz mínima de privilegios técnicos — no aplicada

Los nombres de roles se decidirán al autorizar entorno. Roles lógicos separados: propietario/migrador, runtime API, aprovisionador y mantenimiento/auditoría. Sin crear ninguno aquí. No dar membresía del propietario al runtime; NOINHERIT no elimina privilegios PUBLIC. Verificar privilegios **efectivos**, incluidas membresías y defaults, antes de provisionar. El bloqueo [M01.2](../../docs/transition/bch04-m01-2-checkpoint.md) sigue independiente y no se corrige en AUTH-P0.

| Objetos | API runtime | Aprovisionamiento controlado | Mantenimiento/auditoría |
| --- | --- | --- | --- |
| Base revisada | CONNECT solo al destino; sin CREATE/TEMPORARY o acceso adicional por PUBLIC | CONNECT al mismo destino autorizado | Conexión solo al destino autorizado |
| Schemas banuchat/banuchat_auth | USAGE; sin CREATE | USAGE; sin CREATE | USAGE; sin CREATE |
| accounts | SELECT; UPDATE solo status/auth_version/updated_at/disabled_at para establecimiento/revocación, sin cambiar UID/email/id | INSERT pending; SELECT solo id/UID/email/status/version/fechas; UPDATE controlado UID/email/status/version/fechas para gestión autorizada | Lectura mínima o agregada según revisión; sin DELETE de cuentas |
| password_credentials | SELECT, INSERT; UPDATE solo password_hash/changed_at; sin DELETE | **Ningún permiso** de lectura/escritura de hash | Sin SELECT de hash por defecto |
| sessions | SELECT, INSERT; UPDATE solo digest access, access_issued_at/expires_at, last_seen_at, revoked_at; no principal/deployment/version/creación/límite absoluto | SELECT solo id/principal para revocar; UPDATE revoked_at | DELETE de sesiones terminales/expiradas solo tras limpiar refresh y vencer ventana de replay |
| refresh_tokens | SELECT, INSERT; UPDATE solo consumed_at/replaced_by; sin DELETE | Sin lectura de digests ni escritura | DELETE solo de familias vencidas, respetando self-FK; no limpieza de digests consumidos de familias vivas |
| password_reset_tokens | SELECT, INSERT; UPDATE solo consumed_at/invalidated_at; sin DELETE | INSERT para token inicial, SELECT solo id/principal/fechas/estado, UPDATE invalidated_at para cambio administrativo; sin leer digests | DELETE tras expiración/consumo y política de retención aprobada |
| profile_bindings / versions | SELECT, sin modificación | SELECT/INSERT; reasignación excepcional dentro de procedimiento autorizado con revocación/auditoría; no acceso a chats | Sin modificación por defecto |
| corpus_grants | SELECT, sin modificación | SELECT/INSERT; UPDATE revoked_at, con cambio de versión/revocación | Sin modificación por defecto |
| conversation_owners | SELECT/INSERT para chat nuevo, **sin UPDATE/DELETE directo** | Ninguno | Lectura solo si autorizada; sin transferir propiedad |
| auth_rate_limits | SELECT/INSERT; UPDATE attempts; sin modificar clave/ventana | Ninguno salvo uso del servicio de aprovisionamiento limitado | DELETE de ventanas vencidas |
| security_events | INSERT únicamente; no UPDATE/DELETE/SELECT por defecto | INSERT de eventos administrativos | SELECT restringido y DELETE por retención aprobada; no UPDATE |
| Tablas de negocio de lectura | SELECT en datasets, dataset_releases, embedding_configs, documents, document_versions, courses, announcements, calendar_events, synthetic_profiles, profile_courses, conversations, messages, message_citations | SELECT solo datasets/releases/perfiles para validar binding; sin conversaciones/mensajes/citas | Sin acceso a contenidos por defecto |
| Historial de negocio | INSERT conversations/messages/message_citations y DELETE **conversations**; sin UPDATE, DELETE de hijos directo ni TRUNCATE | Ninguno | Sin borrado de historial en esta tarea |
| Retrieval | EXECUTE solo current_retrieval_context() y search_chunks_cosine(public.vector,integer,uuid); USAGE public para vector, sin CREATE | Ninguno | Ninguno por defecto |
| Resto | Sin DML corpus, ejecución de publicación/ingesta, ALTER/DROP, creación de roles/bases, superusuario/BYPASSRLS, permisos de secuencias no usados | Sin elevación o lectura de secretos de usuarios | Sin poderes administrativos implícitos |

Las FKs nuevas requieren privilegio REFERENCES al migrador/propietario sobre las claves de negocio usadas y acceso a dominios/funciones necesarios para crear objetos; **runtime no necesita REFERENCES ni propiedad**. UUID usa función nativa, no secuencia. Se reutilizan dominios de banuchat: verificar USAGE efectivo de esos tipos para los roles autorizados. No conceder SELECT de document_chunks directamente cuando retrieval por funciones existentes basta.

La tabla muestra máximos por responsabilidad, no un script GRANT ejecutado. Gestionar UID/email/asignación excepcional puede requerir un procedimiento administrativo distinto del mero aprovisionamiento; no conceder UPDATE de propiedad/hash o borrar aprobaciones antiguas a una cuenta de seed por comodidad. Si se autoriza ese procedimiento, revisar su permiso mínimo específico y la revocación transaccional antes de habilitarlo.

006 revoca PUBLIC solamente sobre los **objetos nuevos** de banuchat_auth y configura defaults del creador en ese schema. No revoca CONNECT/TEMPORARY de bases, ni permisos de objetos existentes, ni repara PUBLIC en el clúster compartido. Aprobar un entorno que pueda cumplir la matriz es un gate externo, sin reutilizar el superusuario actual como runtime.

## 6. Retención y limpieza propuesta para implementación

No se ejecuta limpieza ni se introduce scheduler en AUTH-P0. Política contractual: conservar digests refresh consumidos hasta el vencimiento absoluto de la familia. Después, una tarea autorizada puede eliminar cadenas desde hojas hacia predecesores por la self-FK, y por último la sesión; no DELETE masivo que ignore referencias. Auditoría conserva evento y pone session_id a NULL al borrar la sesión. Reset consumido/invalidado/vencido puede limpiarse tras expirar su vigencia; ventanas al expirar; eventos a los treinta días, propuesta heredada del diseño sujeta a política de custodia antes del piloto. No borrar cuentas, owners, conversaciones, mensajes o citas por retención de tokens.

No se almacenan secretos en backups/logs deliberadamente; un backup de credenciales/digests sigue siendo sensible. Proteger disco/copias, acceso del operador y mensajes del buzón local; en ese buzón sí existe el token de recuperación en claro como parte del canal de entrega y debe purgarse/restringirse. No versionar mensajes del buzón ni secretos de configuración. Falta confirmar responsables y mecanismo concreto de backup/custodia; no sustituirlo por el CHECK de un hash.

## 7. Prueba PostgreSQL desechable propuesta — no ejecutada/autorizada aquí

Las pruebas estáticas no compilan DDL ni ejercen constraints en PostgreSQL. Para acreditar esa capa se requiere una tarea posterior que autorice expresamente:

1. Instancia PostgreSQL 16 + pgvector **nueva y aislada**, con nombre/puerto y almacenamiento temporal propios, sin volúmenes o conexiones de la demo/CCD/N8N existentes y sin red institucional. No reutilizar banuchat_schema_test con historiales ni modificar PUBLIC/roles del clúster actual. Revisar imagen ya disponible y recursos antes de arrancar; AUTH-P0 no ejecuta Docker.
2. Preparar el schema inicial sin modificar en esa base vacía y una copia de prueba autorizada del corpus sintético ya publicado, conservando sus bytes/manifiestos/configuraciones; **sin llamar a Ollama, generar embeddings o publicar una release nueva para esta prueba**. Si no hay forma aprobada de preparar una current ready fiel, detener la prueba en lugar de falsear manifest/status o desactivar triggers. Documentar el método antes de copiar datos.
3. Verificar current_database, identidad de instancia, dataset/current/manifiestos, FKs y ausencia de datos/personas reales; establecer el target literal de esa base desechable en la misma sesión, con ON_ERROR_STOP. Aplicar 006 una sola vez **solo cuando exista esa autorización**. No incluir en esta entrega un comando apuntando al clúster actual.
4. Comprobar abortos ante setting ausente/mismatch, schema auth previo, destino CCD o dataset incorrecto mediante fixtures exclusivamente en esa instancia. No apuntar la prueba negativa a la base CCD real. Error/rollback deja cero objetos auth parciales y nunca muta negocio.
5. Dentro de transacciones de prueba, comprobar formatos/NULL/fechas infinitas/costes, unicidad, FK exactas y ON DELETE; dos cuentas con mismo perfil y owners distintos; falta de owner de legado, expiración, replay/concurrencia, rollback y locks. Algunas son de DDL y otras requieren los casos de uso de AUTH-P1/P2/P3: reportarlas por separado, sin ejecutar login todavía en una prueba solo de schema.
6. Comparar huellas/filas de corpus, current/release y negocio antes/después; escrituras de prueba solo auth y conversaciones nuevas identificadas, revertidas en esa base. Confirmar ACL efectivos con roles de prueba de esa instancia cuando se autorice provisionarlos, incluyendo rechazos y efectos PUBLIC. No declarar que un CHECK reemplaza la verificación de permisos.
7. Guardar resultados saneados y evidencias. No borrar volúmenes existentes; cierre/eliminación de la instancia temporal y su almacenamiento requieren que ese destino exacto y descarte estén incluidos en la autorización futura. Hasta entonces dejar el procedimiento como propuesta.

## 8. Gates y decisiones para Sala

No hay una incompatibilidad de claves que obligue a modificar SQL/v1/MCP congelados para preparar estos artefactos. Los límites de política quedan fijados en REST v2 y 006; su coste/capacidad y funcionamiento permanecen sin validar.

Antes de AUTH-P1 operativo: autorizar aplicación en destino exacto o pruebas desechables, resolver privilegios efectivos/matriz sin alterar el clúster actual por conveniencia y aprobar implementación de unidad transaccional. Antes de recuperación funcional: buzón local, transporte y custodia confirmados, sin proveedor externo. Antes de Mobile/piloto: canal TLS confiable, dispositivos y consentimiento/custodia del estudio. Ninguna de estas decisiones se satisface por crear el contrato o por las pruebas estáticas.

Referencias primarias: [constraints PostgreSQL 16](https://www.postgresql.org/docs/16/ddl-constraints.html), [privilegios PostgreSQL 16](https://www.postgresql.org/docs/16/ddl-priv.html). No son permisos institucionales ni autorizan cambios en las bases existentes.
