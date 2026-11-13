# BanuChat — CHECKPOINT ENTREGA ACELERADA

## Estado observado

13 de noviembre de 2026. Demostración web en [BanuChat local](http://127.0.0.1:8085/login). El proxy y la API Node.js escuchan en el equipo, en los puertos 8085 y 3004. Ollama genera las respuestas y embeddings de consulta desde el equipo. La API usa Supabase real para autenticación, expediente y persistencia, mediante `cloud_runtime` y el pooler de sesión con TLS y verificación de CA y hostname.

En el proyecto existente `banuchat` se reemplazó el cuerpo de `banuchat_academic.read_me(text)` para devolver las etiquetas de programa, período y cursos. La modificación fue transaccional y conservó firma, propietario y ACL. El runtime conserva permiso de ejecución y carece de lectura directa sobre estudiantes. El endpoint `GET /api/v2/me/academic` obtiene la identidad de la sesión y rechaza parámetros de consulta. El expediente aparece en Progreso en modo sintético. El chat responde preguntas explícitas sobre el propio perfil con datos estructurados sin citas documentales. Las preguntas de documentos siguen el recorrido RAG.

Las consultas remotas observaron 36 tablas privadas, dos releases, 32 estudiantes, 62 intentos, 120 embeddings no nulos en una columna `vector(1024)`, pgvector 0.8.2, 15 citas tras la nueva prueba RAG y cero tablas en `public`. El nuevo turno aportó cinco citas que se recuperaron por REST tras reiniciar. No hubo restauración ni importación en esta entrega. La configuración efectiva de exposición de Data API no se volvió a inspeccionar. La entrega no cambió esa configuración ni añadió objetos a `public`.

## Guion de demostración

1. Abrir la web en este equipo y entrar como `U90000001` con la contraseña de demostración entregada por canal privado. En Progreso, abrir el expediente y mostrar dos intentos del mismo curso. Las etiquetas y resultados son ficticios.
2. En el chat, preguntar «¿Cuál es mi perfil académico?». La respuesta se obtiene del expediente de la sesión. Luego preguntar «¿Cuál es el propósito del Programa Demo de Aprendizaje Digital según su orientación general?». Abrir las fuentes y descargar un artefacto disponible.
3. Salir y entrar como `U90000002`. Su expediente es distinto y la conversación de `U90000001` responde 404 desde esa sesión. `U90000032` muestra el caso sin intentos. `BCH-DEMO-9701` conserva el acceso histórico y devuelve expediente académico vacío.
4. Para repetir el arranque en el equipo de trabajo, conservar Ollama activo con la configuración validada y ejecutar `$env:EXPO_PUBLIC_DEMO_MODE='synthetic'` y `npm --prefix mobile run web:export` desde la raíz. Ejecutar `infra/local/entrega-web.ps1`, el lanzador local excluido de Git que carga las credenciales privadas y arranca API y proxy. Para detenerlos, comprobar en `infra/local/entrega-processes.json` los PID y sus líneas de comando antes de parar exclusivamente esos dos procesos.

## Supabase y evidencia

En el panel del proyecto, seleccionar `banuchat`, `banuchat_academic` o `banuchat_auth` en el selector de esquemas del Table Editor, o usar el SQL Editor con una cuenta autorizada. `public` queda sin tablas de la aplicación. Estas consultas muestran inventario y totales sin abrir filas de autenticación.

```sql
SELECT schemaname, count(*) AS tables
FROM pg_tables
WHERE schemaname IN ('public', 'banuchat', 'banuchat_academic', 'banuchat_auth')
GROUP BY schemaname ORDER BY schemaname;

SELECT (SELECT count(*) FROM banuchat_academic.students) AS students,
       (SELECT count(*) FROM banuchat_academic.course_attempts) AS attempts,
       (SELECT count(*) FROM banuchat.dataset_releases) AS releases,
       (SELECT count(embedding) FROM banuchat.document_chunks) AS vectors,
       (SELECT count(*) FROM banuchat.message_citations) AS citations,
       has_table_privilege('cloud_runtime', 'banuchat_academic.students', 'SELECT') AS runtime_direct,
       has_function_privilege('cloud_runtime', 'banuchat_academic.read_me(text)', 'EXECUTE') AS runtime_exec;
```

El nuevo turno documental se recuperó con cinco citas tras reiniciar API y proxy en la conversación `345c776b-5974-431b-88c6-f8a083f89f61`. El turno académico se recuperó sin citas en `695c3e26-cecc-4725-a377-0277a4bdb927`. La captura del acceso web se observó en el navegador de Codex. Quedan pendientes capturas exportables de la sesión autenticada, del panel y de Android.

## Pruebas y límites

| Verificación | Resultado |
| --- | --- |
| API y móvil, comprobación de tipos | Ambas pasaron |
| Pruebas enfocadas de API | 21 pasaron |
| Proxy web y pruebas de sesión/interacción móvil | 1 y 14 pasaron, respectivamente |
| Exportación web sintética y pantalla de acceso | Exportación y carga en navegador verificadas |
| REST vía proxy contra Supabase | Cuatro cuentas, expedientes distintos, progreso, chat académico, selector rechazado con 400, acceso anónimo con 401 y conversación ajena con 404 |
| Historial, citas y artefacto | Pregunta RAG nueva con cinco citas, artefacto previo con HTTP 200 y ambos turnos nuevos recuperados tras reinicio |
| Sesión | Logout invalidó el token con 401 y un nuevo login recuperó el historial. El vencimiento natural y el recorrido autenticado en la interfaz gráfica siguen pendientes |
| Android | ADB sin dispositivo. Sin prueba física |
| AWS | Sin sesión disponible del Learner Lab. Sin despliegue, URL pública ni costos de AWS generados. Saldo y recursos efectivos sin verificar |

Para desbloquear AWS, iniciar el Learner Lab y dejar disponible su consola autenticada en esta sesión. Antes de elegir una instancia, verificar saldo, cuotas, duración y memoria disponible para Ollama. La demostración comprobada depende del equipo para API, web y Ollama. La regeneración completa de embeddings documentales sigue pendiente.

CLOUD-00 recoge la solicitud de Supabase, AWS, RAG, n8n y MCP. Supabase y RAG tienen evidencia en esta entrega. n8n y MCP conservan sus integraciones existentes y no se ejercitaron aquí. AWS sigue bloqueado. Los demás detalles de la reunión y del ejemplo externo quedan sujetos a confirmación cuando se disponga de sus notas o material original.

## Archivos

- `backend/api/src/auth/resources.ts`, `backend/api/src/http/api-v2-server.ts`, `backend/api/openapi-v2.yaml`, `backend/api/test/auth-v2-contract.test.ts`.
- `infra/db/cloud-01b/academic-display.sql`.
- `mobile/src/components/academic-record.tsx`, `mobile/src/app/progress.tsx`, `mobile/scripts/export-unified-web.mjs`, `mobile/scripts/serve-unified-web.mjs`.
- Este checkpoint y el lanzador local ignorado descrito arriba.
