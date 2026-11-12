# CHECKPOINT BANUCHAT — CLOUD-01A.3

12 de noviembre de 2026. Ensayo sobre `main`, HEAD `b4b02acb66a2a5fbc3a58f71cf732742a5a8efc2`, árbol limpio al inicio. **Sucesora publicada, restaurada y revertida en laboratorios aislados.** La generación completa de v1 desde cero quedó bloqueada por memoria CUDA. El ensayo continuó con una copia verificada de v1, sin regenerar sus vectores.

## Entorno y alcance

El cliente Docker 29.7.2 recibió acceso denegado al pipe de `desktop-linux` dentro del sandbox. Con acceso local autorizado respondió Docker Desktop 4.90.0, motor Linux 29.7.2 y WSL2 operativo. `psql`, `pg_dump` y `pg_restore` se ejecutaron dentro de la imagen local `pgvector/pgvector:pg16` con PostgreSQL 16.15 y pgvector 0.8.6. Ollama 0.35.0 respondió en loopback y confirmó los modelos locales `qwen3-embedding:0.6b` y `qwen3:4b-instruct`.

| Contenedor nuevo | Puerto loopback | Estado al cierre |
| --- | --- | --- |
| `banuchat-cloud01a3` | 55473 | Detenido y conservado con el primer intento fallido. |
| `banuchat-cloud01a3-reuse` | 55475 | Laboratorio de publicación, con el puntero revertido a v1 y ambas releases conservadas. |
| `banuchat-cloud01a3-restore` | 55474 | Destino independiente restaurado, con la sucesora vigente. |

Los tres clústeres nuevos usaron una base `banuchat_cloud01a` y almacenamiento independiente. El contenedor sintético preexistente `banuchat-oe6-local-postgres-synthetic-1` solo recibió consultas y una exportación de filas en transacciones de solo lectura. No se utilizaron `banuchat_unified`, volúmenes CCD ni respaldos privados institucionales.

## Base sintética, procedencia y publicación

1. Se ejecutaron `001_initial_schema.sql`, el preflight `SYNTHETIC_V1_PROFILE` y el núcleo `ingestApprovedCandidate` en el primer laboratorio. El intento terminó como `failed / OLLAMA_UNAVAILABLE`, con 60 chunks preparados y cero embeddings persistidos. Una prueba corta de Ollama devolvió 1024 dimensiones. La prueba con el contexto documental aprobado de 32768 devolvió HTTP 500 por falta de memoria CUDA al asignar el buffer de caché KV. Una invocación posterior del arnés también sufrió falta de memoria de Node antes de abrir otro intento. Se preservó la evidencia del clúster fallido.
2. La release vigente del contenedor sintético preexistente incluía sincronización de calendario y difería del manifiesto v1. Se eligió su release histórica `6a770ce7-13b7-4b0b-95ae-0c193fa0d655`, con manifiesto v1 exacto, receta de consulta de 4096, configuración documental de 32768, Ollama 0.35.0 y digest de modelo `ac6da0dfba84a81fdbfbaf330198c33cd77c4cdfc53e8bc50eb581914a15621d`. Se excluyó otra release histórica que tenía la receta de consulta de 32768. Se exportaron únicamente las filas de la release elegida y sus dependencias de catálogo y procedencia. La lista positiva excluyó auth, sesiones, conversaciones y las demás releases.
3. Se revalidaron los archivos de v1, las 12 huellas de contenido documental, la correspondencia de texto y localizadores de los 60 chunks, sus dimensiones y la configuración de embedding. Se reconstruyó v1 en el clúster nuevo con las restricciones habilitadas y se publicó con `banuchat.publish_release`, conservando IDs, vectores, revisión y procedencia de generación. El timestamp de validación corresponde a la publicación del laboratorio. La copia registró cero solicitudes de generación de embeddings.
4. Se revisaron y ejecutaron `build-successor.mjs`, `publish-successor.sql`, `academic.proposed.sql`, `verify-students.sql` y `verify-vectors.sql`. Se aplicaron `006 → 007 → 008 → 010` y el esquema académico en el clúster dedicado. La publicación adquirió el advisory lock del dataset y bloqueó el puntero durante la promoción. Se inyectó un error `22012` justo antes del commit en una primera ejecución de la sucesora. Tras el rollback se observaron una sola release, cero estudiantes, ausencia de `read_me(text)` y ausencia de la nueva restricción UID. La ejecución normal posterior publicó la sucesora.
5. PostgreSQL conservó íntegra la fila de v1 durante la publicación de la sucesora `1b63ecff-dcce-4580-b0d1-1ee13af3beb5`. Se comprobaron 60 pares de vectores idénticos de 1024 dimensiones con contenido equivalente. En la sucesora el manifiesto registra `vector_provenance: copied_from_base` y el UUID de la base. La ejecución y los timestamps asociados a los chunks de la sucesora describen la copia registrada bajo el esquema existente. La generación original sigue trazable en v1.

| Comprobación SQL en la sucesora | Observado |
| --- | ---: |
| Releases listas, incluida v1 | 2 |
| Ítems de ingesta de la sucesora | 162 |
| Perfiles de la sucesora | 36, incluidos 4 históricos |
| Estudiantes académicos nuevos | 32 |
| Intentos | 62 |
| Segundos intentos | 8 |
| Estudiantes sin historial | 1 |
| Claves foráneas académicas validadas | 8 |
| Vectores de 1024 dimensiones por release | 60 |
| Releases sin marca sintética | 0 |

El archivo físico `profiles/cloud-01a-2.json` se conservó fuera del repositorio. Su SHA-256 fue `93e738929ec42f4a0867b62ded4c9611524f71f42a6e8f60141e9a689bca8381`. Se leyeron del manifiesto restaurado los 86 localizadores nuevos y se resolvió cada uno contra el archivo físico, comprobando clave y hash. Se verificó la ausencia de esquema auxiliar unificado y de contexto CCD en los destinos. El corpus documental cargado coincidió con los derivados autorizados de v1.

## Autenticación, permisos y RAG

- Se creó una cuenta sintética histórica controlada y se comprobó su login antes y después del delta de UID. El aprovisionador `SyntheticAccountProvisioner` y `LocalPasswordAdministrator` crearon y habilitaron otras cuatro cuentas U+8. Se comprobó la cadena de sesión, UID, perfil, release y estudiante. Dos estudiantes distintos vieron sus propios cursos. El perfil sin historial devolvió cero cursos y el perfil histórico de control devolvió cero filas académicas.
- El runtime HTTP real verificó login, `auth/me`, `me/progress`, creación y lectura de conversación e historial con dos mensajes. La consulta de progreso con un `profile_key` ajeno devolvió 400. La conversación de otra cuenta devolvió 404. `banuchat_academic.read_me(text)` funcionó con sesión y sin selector de estudiante. La lectura directa de `banuchat_academic.students` por el rol runtime fue rechazada con SQLSTATE `42501`. El error completo de psql se conservó localmente.
- Se ejecutaron `retrieveAuthenticatedDocumentChunks` y `createAuthenticatedDocumentRag` con Ollama real. La primera consulta a Ollama devolvió `embedding_unavailable`; la prueba local con el contexto de consulta 4096 respondió y permitió completar el ensayo. El RAG recuperó cinco fragmentos y produjo cinco citas. Tras restauración y reversión se compararon orden, texto, hash de origen, localizador y distancia coseno de los fragmentos, además de tipo, etiqueta y localizador de las citas. La comparación no exigió igualdad de UUID de chunk o versión entre releases distintas. La consulta documental se ejecutó en el servicio RAG y la persistencia del historial se probó por HTTP con un turno de saludo.

## Respaldo, restauración y reversión

`pg_dump --format=custom` generó un respaldo de **902101 bytes** con SHA-256 `e9fdddcb66572c592b5349f97db1ee58617163c62d4754284b01be06f7562e1d`. Se crearon explícitamente en el segundo clúster los roles del laboratorio y se aplicó `pg_restore --single-transaction --exit-on-error`. Coincidieron conteos y huellas de **36 tablas** antes de ejecutar las pruebas funcionales de restauración. Pasaron nuevamente login histórico y U+8, progreso, historial, ACL, recuperación de cinco fragmentos y cinco citas, y comparación de vectores.

Se ejecutó `banuchat.publish_release` con el UUID base para revertir únicamente el laboratorio de publicación. Volvieron a pasar el login histórico y la recuperación con cinco citas sobre v1. El laboratorio restaurado conservó la sucesora vigente. Ambos conservaron las dos releases, 120 vectores, cinco cuentas ficticias y dos mensajes. El entorno original de BanuChat permaneció ajeno a la reversión.

Los logs privados, dump, fixture y huellas se guardaron bajo `%TEMP%\banuchat-cloud01a3-b4b02ac` del operador. El arnés de ensayo y el SQL de exportación quedaron en `infra/local`, excluido de Git. Los archivos de credenciales locales y el respaldo requieren la misma custodia privada.

## Validación y pendientes antes de Supabase

- `node --test infra/db/cloud-01a/fixtures.test.mjs`: 5/5.
- Regresión API con `node --import tsx --test` en `auth-v2-contract`, `auth-handlers`, `profile-progress` y `document-query-retrieval`: 47/47.
- SQL, login, ACL, RAG, respaldo, restauración y reversión: ver resultados observados arriba. La regeneración documental completa desde cero sigue pendiente en un equipo con capacidad suficiente para la receta aprobada.
- `git diff --check` y revisión del checkpoint nuevo: sin errores de espacios.

La futura validación administrada debe comprobar TLS con verificación de host, roles y propietarios efectivos, esquema de pgvector, identidad del destino, permisos de Data API y compatibilidad de locks con conexión directa o de sesión. La copia de v1 y la restauración verificadas fueron locales. No se cambiaron la aplicación, el publicador, el dataset v1 ni las migraciones históricas. El único archivo nuevo visible en Git es este checkpoint. No hubo commit, push, conexión a Supabase, recursos AWS ni inicio de CLOUD-01B.
