# CHECKPOINT BANUCHAT — CLOUD-01A.2

12 de noviembre de 2026. Base `main` en `ab16f0d`, limpia al comenzar y alineada con la referencia local `origin/main`. Se revisaron CLOUD-01A, las migraciones 001 y 006–010, `SyntheticAccountProvisioner`, `resource_context`, `getProfileProgress`, el validador v1, `WriterLease` y la clonación de releases de calendario. El motor Linux de Docker Desktop no respondió a `docker ps`. `psql` no estaba en PATH y no se observó un proceso PostgreSQL local. Este incremento deja la publicación preparada y pruebas ejecutables para el ensayo, sin una release aplicada.

## Identidad y cohorte

- [`fixtures.mjs`](../../infra/db/cloud-01a/fixtures.mjs) conserva 32 estudiantes y las claves de perfil previas de la propuesta. Separa UID de alta `U9000####`, ID académico `SIM-####`, nombre y apellido, correo académico como `alba.arcilla.0001@banuchat.test` y correo de recuperación reservado según el patrón del CLI actual. Los nombres, identificadores y períodos son de demostración.
- Hay 62 intentos, ocho recursamientos, 23 cursos en curso y un estudiante sin historial. Los resultados de intento son explícitos y el porcentaje visible de avance es una proyección sintética separada. Los 54 avances nuevos usan estados del contrato existente. Los cursos conservan sus claves y procedencia.
- El delta valida una restricción que admite `BCH-DEMO-####` y `U########` antes de retirar la restricción sintética original dentro de la misma transacción. Conserva filas, UID y UUID de las cuentas. El alta usa el aprovisionador actual para U+8. Las migraciones 006 y 009 conservan sus límites originales.
- `banuchat_academic.read_me(token)` usa `resource_context` para resolver sesión, principal, perfil y release activa. El rol runtime recibe ejecución de la función y uso del esquema, con tablas privadas. Solo el propietario técnico sin login obtiene lectura directa además del dueño del esquema. La firma admite únicamente el token. Para un perfil válido sin fila académica devuelve cero filas. El HTTP de progreso conserva su validación de parámetros y autorización actual, sin endpoint académico nuevo.

## Publicación local y procedencia

[`build-successor.mjs`](../../infra/db/cloud-01a/build-successor.mjs) genera un script psql reproducible desde el manifiesto v1 y los fixtures, con hash SHA-256 sobre los bytes exactos del JSON de cohorte. [`publish-successor.sql`](../../infra/db/cloud-01a/publish-successor.sql) exige `banuchat_cloud01a`, configuración explícita de base y UUID de despliegue, rol limitado, corpus sintético exclusivo y manifiesto vigente idéntico al de v1. Reusa el namespace de bloqueo de `WriterLease` y bloquea el puntero para la promoción.

La sucesora conserva los cuatro perfiles y 18 avances históricos dentro de la nueva release, añade la cohorte y replica las aprobaciones de binding existentes. Conserva intacta la release v1 y no adopta historial ajeno. El manifiesto procesado contiene 162 ítems, 86 nuevos con sus localizadores dentro de `profiles/cloud-01a-2.json`. Programas, períodos, estudiantes e intentos se vinculan al mismo hash mediante los metadatos de la release y se cargan por FK antes de promoverla. Los triggers reutilizan la inmutabilidad del corpus publicado.

La vía de publicación es un delta local explícito con checks propios. El preflight de ingesta de archivos sigue aceptando exclusivamente el v1 aprobado. La sucesora copia las 12 versiones documentales y 60 vectores de v1, conserva su configuración de embeddings y registra en el manifiesto que los vectores provienen de la base. No recalcula ni sustituye vectores. `banuchat.publish_release` aplica sus validaciones normales de completitud y procedencia. El SQL no publica directamente sobre un destino administrado.

## Ensayo pendiente en el destino desechable

1. Usar un clúster nuevo, con base `banuchat_cloud01a`, puerto loopback propio, volumen independiente y roles acotados. Aplicar `001`, publicar v1 por la ingesta aprobada con Ollama y aplicar `006 → 007 → 008 → 010` siguiendo los guardas y el modelo de [permisos auth](../../infra/db/auth-permissions.md). No usar el arranque normal unificado ni los scripts de bootstrap atados a otros entornos. En esta rama el rol runtime debe carecer de `CONNECT` a las demás bases conectables del clúster, según `PgAuthStore.assertRuntime`.
2. En la conexión psql local con `ON_ERROR_STOP`, fijar `banuchat_auth.target_database`, `banuchat_auth.runtime_role` y `banuchat_auth.deployment_id` con los valores de ese laboratorio. Aplicar [`academic.proposed.sql`](../../infra/db/cloud-01a/academic.proposed.sql) para crear las tablas iniciales. Generar los bytes de fuente con `node infra/db/cloud-01a/fixtures.mjs` y custodiar el JSON como `profiles/cloud-01a-2.json` en una raíz de evidencias independiente de v1. Generar el SQL con `node infra/db/cloud-01a/build-successor.mjs` y cargarlo en esa misma sesión mediante `\i`. Conservar el hash exacto del JSON y evitar operaciones de aprovisionamiento concurrentes durante la promoción.
3. Usar el CLI local existente `npm run admin:local-account` en API con las credenciales acotadas del laboratorio, el modo `synthetic` y las asignaciones del fixture. Arrancar `authenticated-main.ts` directamente con el perfil de entorno sintético y Ollama local. Probar login y `/api/v2/me/progress` para `U90000001`, `U90000002`, `U90000032` y una cuenta ligada a un perfil histórico sin estudiante académico. Comprobar rechazo de `profile_key` como parámetro y de acceso a una conversación ajena. Si se prepara un fixture histórico con UID `BCH-DEMO-####` antes de publicar, probar su login antes y después del delta.
4. Ejecutar [`verify-students.sql`](../../infra/db/cloud-01a/verify-students.sql) como runtime con los cuatro tokens efímeros del paso anterior en `CLOUD01A_TOKEN_A`, `CLOUD01A_TOKEN_B`, `CLOUD01A_TOKEN_EMPTY` y `CLOUD01A_TOKEN_LEGACY_PROFILE`. Comprueba propiedad de resultados, ausencia de selector, ACL, recursamiento, curso en curso, historial vacío y estudiante ausente. Ejecutar [`verify-vectors.sql`](../../infra/db/cloud-01a/verify-vectors.sql) como verificador con lectura del corpus. Comparar también una consulta RAG y sus citas contra v1 mediante el runtime y Ollama.
5. Tomar un dump lógico exclusivamente de la base sintética y restaurarlo en otro clúster desechable sin acceso externo. Probar integridad, vectores, ACL, login y consultas con credenciales de prueba nuevas, conservando los artefactos fuera del dump por hash. Registrar los resultados y custodiar el respaldo fuera de Git. Para revertir el experimento, detener el runtime dedicado y volver a la configuración previa. Dentro del laboratorio se puede restaurar el puntero a v1 con `banuchat.publish_release` y su UUID base. Las cuentas nuevas carecerán de binding v1; conservar ambas releases y sus datos para diagnóstico.

## Validación ejecutada

| Prueba | Resultado |
| --- | --- |
| `node --test infra/db/cloud-01a/fixtures.test.mjs` | 5/5, incluidos reproducibilidad del SQL generado, procedencia y casos de cohorte. |
| `npm run typecheck` en API y RAG | Ambos correctos. |
| API con `node --import tsx --test` sobre auth-v2-contract, auth-handlers, auth-primitives, profile-progress y document-query-retrieval | 55/55 con fixtures. |
| RAG con `node --import tsx --test` sobre content, db-unit y oe4-calendar | 38/38 con fixtures. |
| `npm run validate:dataset` en RAG | V1 válido, 18 archivos, 76 ítems y 60 chunks derivados. |
| `git diff --check` y revisión de archivos nuevos | Sin errores de espacios. |
| SQL aplicado, login real, aislamiento real, generación Ollama, RAG real, respaldo/restauración y reversión | Pendientes por indisponibilidad del motor local. |

## Matriz antes de Supabase

| Requisito | Estado |
| --- | --- |
| Base sintética exclusiva y sucesora | Generador y DDL listos para ensayo local. Falta publicar, probar guardas y verificar los hashes del contenido cargado. |
| Identidades, roles y acceso cruzado | Delta de UID y función limitada preparados. Falta comprobar roles efectivos, login histórico y nuevo, consultas cruzadas y permisos en PostgreSQL real. |
| Vectores, artefactos y compatibilidad RAG | Copia preparada. Falta generar v1 con Ollama, verificar los 60 vectores de ambas releases y ejecutar recuperación real. |
| Recuperación y reversión | Procedimiento definido. Falta un restore aislado y probar reversión a configuración previa. |
| Conexión administrada | Pendiente validar TLS con verificación de hostname, esquema y versión de pgvector, roles y propietarios, nombre efectivo de base, ACL de la Data API y conexión de sesión para ingesta. |

Se cambiaron el generador y sus pruebas. Se añadieron el generador de publicación, el SQL del sucesor, dos verificaciones SQL y este checkpoint. Se conservaron aplicación, contratos, dataset v1 y migraciones históricas. No hubo conexión a Supabase, cambios AWS, operaciones sobre CCD, commits ni push. CLOUD-01B sigue sin iniciar.
