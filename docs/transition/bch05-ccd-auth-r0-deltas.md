# BCH-05/CCD-AUTH-R0 — deltas para decisión, SIN APLICAR

Complemento del [checkpoint](bch05-ccd-auth-r0-checkpoint.md). Los nombres siguientes
son **archivos futuros propuestos**, no migraciones creadas/aplicadas ni cambios
aprobados. 001–008, REST v1/v2 y MCP permanecen intactos. La propuesta usa solo
TypeScript, SQL explícito, PostgreSQL/pgvector, Ollama y Expo existentes.

## 1. 009_demo_uid_convention.sql — rama AUTH después de 008

Destino: únicamente una base AUTH sintética revisada que ya tenga 006–008.
Guardas: target literal igual a current_database; runtime_scope con esa base;
recovery_contacts/nombre de 008 presentes; current sintética; ausencia de CCD;
CHECK original de UID presente con definición esperada, sin CHECK nuevo. Abortar
ante drift, sin corregirlo. Preflight de valores existentes y UNIQUE de UID; cero
filas que incumplan el formato legado. Mantener transacción y `ON_ERROR_STOP`.

Delta de columnas/claves **único**:

```sql
-- Candidato dentro de BEGIN/COMMIT y después de las guardas anteriores.
ALTER TABLE banuchat_auth.accounts
  DROP CONSTRAINT accounts_synthetic_uid_check;
ALTER TABLE banuchat_auth.accounts
  ADD CONSTRAINT accounts_synthetic_uid_format_check CHECK (
    (char_length(synthetic_uid) = 13
      AND synthetic_uid COLLATE "C" ~ '^BCH-DEMO-[0-9]{4}$')
    OR
    (char_length(synthetic_uid) = 9
      AND synthetic_uid COLLATE "C" ~ '^U[0-9]{8}$')
  ) NOT VALID;
ALTER TABLE banuchat_auth.accounts
  VALIDATE CONSTRAINT accounts_synthetic_uid_format_check;
```

El preflight debe verificar el nombre/definición real del CHECK de 006 antes de
usar el nombre generado indicado; no adivinarlo y borrar cualquier CHECK de la
columna. No tocar PK/UNIQUE, UUID, recovery_email, password_hash, fechas, owners,
bindings, sesiones ni valores de UID existentes. No UPDATE/backfill ni seed.
La conservación del legado es compatibilidad, no aceptación de registro público.

Aplicación/contrato requeridos conjuntamente:

- `backend/api/src/auth/primitives.ts`: `uid()` acepta exactamente la unión
  `^(?:BCH-DEMO-[0-9]{4}|U[0-9]{8})$`, longitud 13 o 9; sin trim/casefold/conversión
  numérica. Contraseñas, códigos de recuperación y tokens no cambian.
- `provision-account.ts`, `admin-local-account.ts`: cuentas nuevas exclusivamente
  U+8; operaciones sobre existentes aceptan ambos. No renombrar al recibir login.
  Usar UID completo canónico en el identificador reservado histórico generado,
  no `slice(-4)`: evitar colisiones entre UIDs distintos con últimos cuatro dígitos
  iguales. Conservar nombres ficticios; no importar el UID privado del integrante.
- `api-contract-v2.md` y `openapi-v2.yaml#/components/schemas/synthetic_uid`:
  minLength 9, maxLength 13 y patrón de unión anterior; eliminar obligación de
  longitud única 13. Todos los `$ref` de login/reset/current heredan la revisión;
  la política de aprovisionamiento solo U+8 es semántica administrativa.
- `mobile/src/auth/auth-session.ts` y `src/app/login.tsx`: validación de ambos;
  maxLength 13 permite el legado; placeholder/copy U+8 para nuevas cuentas, sin
  presentarlo como credencial universitaria. No eliminar verificación de `me`.
- Tests `auth-primitives`, `auth-schema`, `auth-v2-contract`, `auth-handlers`,
  `recovery-crypto`/recuperación donde consuman UID, consola y `mobile/test/auth-session`.
  Mantener pruebas de rechazo Unicode/espacios/minúscula/longitudes.

Aceptación en copia: cuenta legada entra y conserva owner/historial; cuenta U+8
entra con contraseña propia; UID duplicado rechazado; dígitos Unicode, siete/nueve
dígitos, U minúscula, espacios y nuevas cuentas con formato legado rechazados por
aprovisionamiento. Nombres/mails/credenciales no pasan a log. Un contacto privado
existente continúa asociado al mismo principal, sin reenvío ni nueva verificación.

## 2. 010_authenticated_document_reads.sql — conciliar SELECT/EXECUTE

Destino inicial: copia AUTH revisada con 007/008; independiente de adoptar U+8.
No modifica el cuerpo de 001/007, sus locks ni permisos de escritura. Introduce
una función de **lectura acotada**, para mantener runtime sin SELECT directo de
document_chunks, tal como exige auth-permissions. La función de búsqueda actual
sí funciona; no se cambia para ocultar que Document RAG no la utiliza.

Delta exacto de ámbito:

| Objeto | Adición propuesta |
| --- | --- |
| runtime_scope | `evidence_mode text NOT NULL DEFAULT 'synthetic' CHECK (evidence_mode IN ('synthetic','ccd_local'))`; `dataset_name text NOT NULL DEFAULT 'banuchat-synthetic'`; CHECK de pareja mode/name (`synthetic`/`banuchat-synthetic`, `ccd_local`/`banuchat-ccd-local`). Dataset 1 sigue fijo, no multitenancy. Validar el registro existente antes; no cambiar deployment/base |
| Función nueva | `banuchat_auth.retrieve_document_chunks(p_release uuid, p_query public.vector, p_top_k integer)`; STABLE SECURITY DEFINER; search_path `pg_catalog,banuchat_auth,pg_temp`; todas las referencias/operador vector calificados |
| Retorno | Las mismas 15 columnas y tipos normalizados de la consulta de `document-retrieval.ts`: chunk_id uuid, document_version_id uuid, document_id uuid, document_key text, title text, ordinal integer, content text, chunk_locator text, page_start integer, page_end integer, source_path text, source_locator text, source_sha256 text, release_id uuid, cosine_distance double precision |
| Guardas de lectura | Base coincide con runtime_scope inmutable; dataset 1 con nombre y synthetic coherentes con modo; current ready y p_release=current; top_k 1–20, vector finito/no nulo/1024 y norma positiva. CCD exige schema ccd-1.0.0/1.1.0/1.2.0 autorizado y cero perfiles sintéticos; sin decidir modo por argumentos del cliente |
| Consulta | Mismos JOIN de chunks/versions/documents, release exacta, ready, retrieval_mode=chunked y embedding no NULL; **mismo ORDER BY distancia, document_version_id, ordinal antes de LIMIT**. Excluir full_document, sin fragmentarlo ni vectorizarlo |
| Propietario | banuchat_auth_executor NOLOGIN; ya tiene SELECT de chunks/versions/documents/datasets/releases por 007; añadir SELECT de runtime_scope si faltara; sin derechos de ingesta/publicación |
| Grants | REVOKE EXECUTE a PUBLIC en la misma transacción; EXECUTE exclusivamente runtime revisado; runtime sin SELECT chunks, UPDATE corpus o membresía del executor; retirar CREATE temporal al transferir propietario |

`cosine_similarity` se deriva en TypeScript como ahora, no se almacena ni se añade
al retorno SQL. Cambio de current debe conservar 409 (P0409 traducido por el
adaptador/gate); argumentos inválidos P0400 y errores internos P0500 saneados.
Las dependencias conservan 503. No exponer SQL, paths o payloads ni registrar
parámetros enlazados.

La alternativa de componer directamente `search_chunks_cosine` necesita revisar
su salida: no devuelve `source_locator` documental y su desempate previo a LIMIT
es document_key, distinto de document_version_id. Un JOIN/proyección posterior no
garantiza los mismos elementos en un empate en el corte. Por eso se propone una
función pequeña con la consulta exacta existente; no otro motor RAG ni flexibilizar
la matriz de privilegios. Dar SELECT directo a chunks sería un delta distinto de
política que esta propuesta no recomienda.

Adaptación interna, sin endpoint nuevo:

| Archivo futuro a modificar | Cambio delimitado |
| --- | --- |
| application/document-query-retrieval.ts | Dependencia opcional tipada para recuperar chunks tras embedding; por defecto la implementación v1 existente |
| chat/document-rag.ts | Propagar esa dependencia; no cambiar prompt, selección CCD, U03/U04/T07/T11, número de documentos o validación de citas |
| application/document-retrieval.ts | Adaptador explícito de función y normalización compartida existente; misma validación de salida. No sustituir consulta mediante detección de strings SQL |
| authenticated-main.ts / authenticated-runtime.ts | Inyectar adaptador autorizado al RAG v2; leer/validar ámbito fijo, no aceptar modo desde request/modelo; v1 conserva su composición |
| infra/db/auth-permissions.md | Registrar superficie nueva, propietario y EXECUTE; mantener prohibición de SELECT chunks directo y UPDATE runtime |

Pruebas previas a aceptar: equivalencia de filas y top-k, empate en el borde,
full_document excluido, vector/config/release inválidos, cambio current sin mezcla,
rol sin poderes/DDL/PUBLIC/membresías, EXECUTE autorizado y rechazo de invocadores
no autorizados. Integración con PG y Ollama real sobre copia: pregunta documental
debe llegar a generación y producir respuesta/citas persistidas, o abstención
pertinente; nunca acreditar el camino con solo una aclaración previa a retrieval.
Mantener pruebas de procedencia y rollback de 007 sin repetir indiscriminadamente
toda ingesta. No modificar el SQL congelado para hacer pasar el adaptador.

## 3. 011_ccd_authenticated_bootstrap.sql — rama CCD nueva

**No es `ALTER` de la demo sintética ni de banuchat_ccd_dev original.** Destino
propuesto: `banuchat_ccd_auth_dev`, instancia/puerto local nuevo, sin base sintética
accesible al runtime. El puerto exacto y recursos deben fijarse en la autorización;
no reutilizar 55433/5432 ni el volumen original.

Prerequisito autorizado futuro: snapshot exclusivamente del estado seleccionado
CCD ya publicado, con schema de negocio y 002–005 tal como está instalado,
incluida FK de 003 y contexts; **sin datos de conversaciones/mensajes/citas ni auth**.
Verificar antes/después IDs, tres releases, manifests/pipeline/config/artefactos y
vectores por hash, conteos 24/24/24, current 12/12/12. No volver a aplicar 001–005,
regenerar embeddings, usar originales externos, publicar release o copiar corpus
sintético. Conservar las raíces de artefacto depurado por version_label.

006/007/008 no pueden aplicarse aquí: su rechazo CCD es parte del contrato.
011 es un **bootstrap de rama explícito** sobre ese snapshot, tomando los DDL
auth revisados como especificación y con estos únicos cambios semánticos:

| Familia | Definición en la rama CCD |
| --- | --- |
| accounts, password_credentials, sessions, refresh_tokens, password_reset_tokens, auth_rate_limits, security_events | Mismas columnas/constraints de 006; UID con CHECK compatible de 009; nombre synthetic_display_name y sus checks de 008. Mismos límites/costes, sin datos importados |
| recovery_contacts, recovery_challenges, recovery_uid_limits, recovery_mail_dispatches | Mismos objetos/ACL de 008, vacíos; reutilización del administrador local que invalida retos. No componer RecoveryService ni proveedor; no contactos ni envíos |
| profile_bindings | Misma PK/FK a account/dataset; dataset 1 CCD, `profile_key='ccd-local-demo'`; no perfil académico |
| profile_binding_versions | Conservar FK triple a binding y pareja dataset/release; **FK (dataset_release_id,profile_key) → banuchat.ccd_demo_contexts**, nunca synthetic_profiles |
| corpus_grants | Mismas account/dataset/read/revoked_at; mode exclusivo ccd_local, dataset 1 con nombre CCD aprobado |
| conversation_owners | Misma PK y FKs de 006, CASCADE solo al borrar conversación; principal estable sintético local. Sin adopción/backfill de chats históricos |
| runtime_scope | Columnas 007 + 010; registro fijo para nueva base/deployment, evidence_mode=ccd_local y dataset_name=banuchat-ccd-local; no writable por runtime |
| resource_context | Mismos argumentos/retorno y validación criptográfica/temporal de 007, token canónico y locks cuenta→sesión→conversación; grant CCD, binding a context current, owner explícito y release aprobada. Cuenta activa con credencial; ningún principal/perfil del request como autoridad |
| persist_turn | Misma firma, saneamiento y CTE histórica de 007; invocar siempre el gate CCD antes de escribir. Mantener exactamente los locks/ordinal/release/two-message/citation invariants |
| retrieve_document_chunks | Definición acotada de 010 con scope CCD fijo, misma ordenación/consulta; no SELECT chunks directo al runtime |
| Permisos | Equivalentes a AUTH-P2.1/008 sobre objetos auth e historial; USAGE/SELECT de ccd_demo_contexts para runtime/executor y aprovisionador según caso. Funciones protegidas propiedad NOLOGIN, EXECUTE solo runtime; sin corpus DML, UPDATE runtime, ingesta/publicación ni membresías |

Son los **16 objetos tabla auth** de 006–008 (incluye runtime_scope), no un segundo
sistema de cuentas. No se copian cuentas/hashes/contactos del origen AUTH ni se
asignan conversaciones por coincidencia de UID. Las cuentas existentes siguen
operativas en su despliegue y no se renombran; 009 sirve a esa conservación.
El bootstrap nuevo crea cuentas solo mediante aprovisionamiento explícito posterior,
con nombres ficticios y nuevas contraseñas individuales. Si Sala pide conservar
el mismo principal/credencial entre despliegues, hace falta otra autorización de
transferencia privada y conflictos; **no se presupone ni se implementa SSO**.

Orden de ramas: AUTH existente `008 → 009` y/o `008 → 010` (independientes).
CCD nuevo `snapshot 001–005 instalado → 011`, que incluye las definiciones
compatibles de 009/010; **no ejecutar 006–010 en esa rama para llegar a 011**.
El número no implica que una base deba tener todas las ramas. El coste de mantener
equivalentes las definiciones auth es explícito: comparar DDL/gates/CTE en tests
para impedir drift, sin rediseñar todas las migraciones congeladas.

## 4. Deltas REST y Mobile necesarios

Propuesta de revisión **mayor 4.0.0 del documento OpenAPI v2**, manteniendo ruta
`/api/v2`; el contrato vigente es 3.0.0. No tocar `/api/v1`, MCP ni los schemas de
mensaje/cita para introducir datos privados.

| Superficie | Delta exacto propuesto |
| --- | --- |
| current_session de GET /auth/me | Añadir `evidence_mode` obligatorio. Dos variantes cerradas: synthetic conserva profile actual/capabilities de seis elementos; ccd_local devuelve profile técnico ccd-local-demo/alias de 003 y capabilities exactamente [chat,history,documents]. release_id es current del corpus de ese despliegue |
| synthetic_uid | Unión y límites indicados en §1; mismo `$ref` para login/reset/current; no endpoint de registro |
| POST /conversations | Seguir body `{}`; contexto/permisos siempre del servidor. Respuesta misma forma, profile_key/alias técnicos CCD en esa variante; aclarar semántica, no nombre de estudiante |
| GET/POST/DELETE conversaciones | Mismos schemas/estados y owner; rutas v1 no montadas en base protegida. 409 no continúa release histórica ni migra mensajes |
| GET /me/progress, /calendar/events, /announcements | Mantener rutas/schemas de éxito sintéticos; en CCD devolver 403 después de autenticar, sin fallback ni payload académico fabricado. Capabilities/cliente ocultan esas pantallas |
| GET /documents/{id}/artifact y citation.artifact_url | Misma ruta v2/proyección; autorizar dataset/release ready del scope CCD, histórico o current. Descripción del contrato admite raíz depurada por version_label, no solo data/synthetic. SHA/bytes y contención/symlink conservados; ningún original externo |
| Auth/login/refresh/logout, passwords, cuotas, cabeceras | Sin cambio de tokens, reglas de revocación, no-store o límites. El realm banuchat-synthetic puede conservarse: describe la identidad de cuenta sintética, no selecciona corpus |
| Recuperación | Continúa suspendida, sin proveedor/contactos; no ampliar el alcance a envío externo |

Dependencias concretas: `api-contract-v2.md`, `openapi-v2.yaml`,
`auth/auth-service.ts` (me y tipo CurrentSession), `auth/pg-auth-store.ts`
(guardia por scope/base/corpus verificado), `auth/resources.ts` (create en modo CCD,
send demo_mode CCD y gate artifact/capabilities), `authenticated-main.ts`
(configuración explícita, raíz version_roots, evidence_mode), `authenticated-runtime.ts`
(comparación estricta del scope), `auth/provision-account.ts`,
`auth/local-password-administrator.ts`, `admin-local-account.ts` (destinos CCD
solo con scope aprobado, binding técnico; preservar separación de roles/hash).

No relajar `assertCcdChatDatabase` histórico ni la validación v1 de loopback:
añadir la comprobación de despliegue **autenticado** correspondiente, que exige
su nueva base/deployment y scope CCD, en vez de aceptar cualquier nombre con CCD.
Autenticación y modo de evidencia deben ser ejes separados en Mobile:

- `mobile/src/config/demo-mode.ts`, `auth/runtime.ts`, `auth/auth-provider.tsx`,
  `config/api.ts`: CCD autenticado sigue la ruta Bearer/SecureStore/v2. El modo
  histórico ccd_local/v1 sigue separado; no activar su bypass para recuperar CCD.
- `auth/auth-session.ts`: aceptar las variantes cerradas de `me`; mantener refresh
  serializado, validación tras restore, epoch/descarte de respuestas, sin retry POST.
- `session/session-context.tsx`, `app/_layout.tsx`, `home.tsx`, `chat.tsx`, `history.tsx`
  y clientes API: capacidades de `me`, contexto técnico sin selector de perfil,
  historial por owner v2; no usar la lista en memoria del operador como autorización.
- Aviso persistente: cuenta ficticia BanuChat y conocimiento CCD seleccionado para
  desarrollo local, sin aval institucional/actualidad ratificada. Mantener caveats
  completos de cada respuesta y visor; no presentar profile.alias como nombre propio.
- `login.tsx`, tests auth-session/ccd-local y API/artefactos: formatos de UID,
  auth obligatoria, A/B mismo contexto y ausencia de rutas v1/fallback de corpus.

## 5. Primera tarea y aceptación revisable

**CCD-AUTH-I1**, únicamente después de aprobación explícita de estos deltas:

1. Cerrar 010/adaptador con equivalencia y prueba PG real limitada; el bloqueo
   nuevo es SELECT/EXECUTE, no los locks ya resueltos por AUTH-P2.1.
2. Autorizar destino CCD nuevo exacto y snapshot seleccionado; verificar hashes y
   crear/bootstrap 011, sin ingesta. Aprovisionar dos cuentas ficticias distintas,
   mismo contexto técnico, contraseñas propias. Aplicar 009 solo a copias AUTH
   autorizadas; no tocar el entorno existente por defecto.
3. Integrar composición v2 y Mobile explícitos, manteniendo mismos servicios RAG
   y las correcciones 5.3. No iniciar correo, Agent/ReAct, N8N/MCP conversacional.
4. Probar REG completo y AMB/AMB_FRESH; T02, T07 y T11 con su criterio semántico,
   preservando B/C si la limitación permanece. Luego batería 5.3 completa si el
   bloque focal permite continuaciones fiables. No sustituirla por saludos.
5. Citas/artefactos por hash y versión, historial exacto, 401/403/404/409; A/B mismo
   contexto, chats legacy sin owner invisibles, revocación durante generación,
   cambio de release/ordinal y rollback sin pares/citas parciales. Cero fallback
   sintético y cero expediente real. Una prueba de carrera usa solo copia desechable.
6. Android focal: login, restore seguro, chat con fuente CCD abierta vía v2,
   cambio A/B sin historial cruzado y aviso permanente. No declarar iOS ni correo
   operativo. Comparar corpus/orígenes antes/después y cerrar con checkpoint.

No implementar ningún paso de esta sección en R0. La aprobación debe decidir rama
aislada, contratos/SQL propuestos y recursos/custodia de la copia. No se solicita
autorizar una arquitectura genérica ni avanzar automáticamente de etapa.
