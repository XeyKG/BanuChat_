# CHECKPOINT BANUCHAT — CIERRE TÉCNICO

Fecha: 25 de octubre de 2026 (Bogotá). Línea base:
`39b6b6221d61bd7aef2ce236dd124c3b11488345`.

Este cierre resuelve la brecha Docker RAG local y organiza la validación restante. No
crea una fase nueva, no modifica REST/SQL/Mobile, no publica una release y no declara los
seis objetivos cumplidos.

## A. Estado técnico consolidado

BanuChat dispone de dos composiciones que se mantienen separadas:

- demo sintética: API v1, PostgreSQL/pgvector, N8N, agente determinista acotado, MCP
  stdio y Ollama;
- CCD autenticado: REST v2, identidad/owner, PostgreSQL CCD y Document RAG, sin fallback
  silencioso a la demo ni módulos académicos sintéticos.

OE1–OE6 conservan sus evidencias anteriores. Este cierre solo añadió:

1. GPU al servicio Ollama del perfil existente `ollama-container`;
2. un volumen exclusivo de modelos, sin montar Ollama Windows ni CCD;
3. evidencia Docker RAG fría/caliente;
4. rendimiento caliente acotado a concurrencias 1/2/5;
5. documentación de demostración, trazabilidad, validación humana, decisiones y calendario.

No se modificaron corpus, migraciones, datos, releases, contratos REST/MCP, Mobile,
workflows o credenciales. No hubo commit ni push.

## B. Resultado Docker RAG

Preflight observado:

- volumen nuevo `banuchat-closure-ollama-models`, etiquetado
  `scope=closure-validation` y `content=ollama-models`;
- volúmenes sintético/N8N existentes reutilizados por nombre; ningún volumen CCD montado;
- Ollama Windows conservó sus cuatro modelos y no fue reconfigurado;
- contenedor Ollama 0.35.0, imagen fijada por digest, GPU RTX 3050 6 GB mediante CUDA;
- solo se descargaron `qwen3-embedding:0.6b` (639.150.858 bytes) y
  `qwen3:4b-instruct` (2.497.293.803 bytes) en el volumen nuevo;
- CCD canónico permaneció `running/healthy` sobre `banuchat-dev-ccd-auth-data`.

La primera corrida J1 llegó a Ollama, pero el arranque del embedding tardó más que el
timeout MCP de 15 s: API devolvió 503, Ollama registró 499 a 19.143,84 ms y el runner
confirmó cleanup. No se oculta: **Docker frío no cumple la demostración sin warm-up**.

Un warm-up explícito completó `/api/embed` en 31.061,55 ms. La segunda corrida, ya
caliente, pasó API → PostgreSQL/pgvector → Ollama → MCP `search_knowledge` → respuesta
con cita:

| Paso J1 caliente | Resultado |
| --- | ---: |
| perfiles/calendario/progreso | PASS, 49/11/10 ms |
| crear conversación/fast path | PASS, 11/22 ms |
| consulta documental con cita | PASS, 16.049 ms |
| historial de cuatro mensajes y cita | PASS, 13 ms |
| cleanup y 404 posterior | PASS, 9 ms |

Evidencia: [`oe6-docker-rag-2026-10-25.json`](../../eval/oe6/results/oe6-docker-rag-2026-10-25.json).
El ready gate/warm-up pasa a ser requisito operacional; no se cambió el timeout contractual.
En la demo sintética esa rama está implementada por el agente determinista MCP: no invocó
generación LLM directa ni acredita ReAct. La conectividad Docker que causaba el 503 y la
recuperación vectorial citada sí quedaron cerradas; el Document RAG directo CCD conserva
su evidencia host-native y no se reejecutó para evitar tocar la base protegida.

## C. Resultado concurrente

Método: 10 solicitudes por rama/nivel, retries 0, errores incluidos, frontera HTTP
`POST /messages` hasta JSON parseado, embedding calentado antes de cada corrida. El caso
frío está separado en B porque sin warm-up falla de forma segura.

| Concurrencia | Rama | Media | Mediana | p95 | Máximo | Errores | Timeouts | >5 s |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | fast path | 14,7 ms | 15 ms | 18 ms | 18 ms | 0 | 0 | 0 |
| 1 | Document RAG | 1.840,4 ms | 1.809 ms | 2.053 ms | 2.053 ms | 0 | 0 | 0 |
| 1 | N8N/MCP | 1.950,2 ms | 1.868 ms | 2.497 ms | 2.497 ms | 0 | 0 | 0 |
| 2 | fast path | 22,6 ms | 22 ms | 33 ms | 33 ms | 0 | 0 | 0 |
| 2 | Document RAG | 2.349,3 ms | 2.208 ms | 2.768 ms | 2.768 ms | 0 | 0 | 0 |
| 2 | N8N/MCP | 2.244,4 ms | 2.248 ms | 2.381 ms | 2.381 ms | 0 | 0 | 0 |
| 5 | fast path | 29,7 ms | 29 ms | 37 ms | 37 ms | 0 | 0 | 0 |
| 5 | Document RAG | 3.998,4 ms | 4.033 ms | 4.089 ms | 4.089 ms | 0 | 0 | 0 |
| 5 | N8N/MCP | 3.675,7 ms | 3.680 ms | 3.905 ms | 3.905 ms | 0 | 0 | 0 |

Total: 90 turnos, 0 errores, 0 timeouts y 0 respuestas >5 s. La media de cada rama
cumplió ≤5 s en este portátil y estado caliente. No se observó saturación hasta 5; no se
probó >5, CPU-only, soak ni servidor UNAB. A concurrencia 5, RAG se acerca al límite y no
justifica extrapolar capacidad.

Evidencia: [`oe6-concurrency-summary-2026-10-25.json`](../../eval/oe6/results/oe6-concurrency-summary-2026-10-25.json)
y sus tres fuentes con SHA-256 incorporado.

## D. Guion de demostración integral

[`final-integrated-demonstration.md`](../operations/final-integrated-demonstration.md)
ofrece un único orden reproducible para:

1. inventario y arranque seguro;
2. warm-up y Document RAG con citas;
3. N8N/MCP, calendario, progreso/anuncios e historial;
4. fallo seguro mediante evidencia o ventana exclusiva;
5. login Mobile v2 sintético;
6. separación CCD autenticada;
7. cierre sin eliminar persistencia.

El guion conserva dos carriles visibles porque la API v1 técnica y el login v2 no están
compuestos en un endpoint. No los une artificialmente ni llama autenticación a un perfil.

## E. Matriz OE1–OE6

La matriz definitiva está en
[`oe1-oe6-final-traceability.md`](../academic/oe1-oe6-final-traceability.md).

| OE | Estado final |
| --- | --- |
| OE1 | IMPLEMENTADO, VALIDACIÓN PENDIENTE |
| OE2 | PARCIAL |
| OE3 | PARCIAL |
| OE4 | PARCIAL |
| OE5 | PARCIAL |
| OE6 | PARCIAL |

No hay OE clasificado **CUMPLIDO Y VALIDADO** contra el compromiso original. La matriz
distingue fixtures/scraping, MCP determinista/ReAct LLM, calendario fixture/Sheets,
recordatorios locales/push y Docker local/UNAB.

## F. Paquete humano

[`final-human-validation-package.md`](../validation/final-human-validation-package.md)
ordena sin rehacer instrumentos: revisión del banco CCD, calibración humana del juez,
baseline retrieval/RAGAS, Android/iOS físico, cinco tareas y SUS.

Estado de entrada: 63 preguntas `primary`, todas `draft`; la condición de 60 aprobadas
no está satisfecha. La calibración técnica de 12 casos obtuvo 40/48 coincidencias, pero
sus labels no son humanos. No hay participantes, aprobaciones, sesiones o resultados
humanos nuevos.

## G. Decisiones externas

[`final-external-decisions-and-schedule.md`](../academic/final-external-decisions-and-schedule.md)
registra ocho decisiones pendientes: autoridad CCD, adquisición/scraping, Sheets, ReAct,
dispositivos, estudiantes, On-Prem UNAB y push. Ninguna se presenta como concedida.

## H. Cronograma corregido

La suma OE6 correcta es **23–41 jornadas-persona**, no 20–36:

`3–5 + 5–10 + 3–5 + 5–8 + 2–4 + 3–5 + 2–4 = 23–41`.

El cronograma prioriza decisión/autoridad, recepción, validación técnica en receptor,
Mobile físico, RAGAS, SUS e informe. Incluye responsables, dependencias, aceptación y
paralelismo. Su encaje S1–S16 es una plantilla relativa del horizonte histórico, no una
afirmación sobre semanas restantes.

## I. Cierre técnico

### Cambios justificados

| Archivo/grupo | Cambio | Justificación |
| --- | --- | --- |
| `infra/docker-compose.oe6.yml` | `gpus: all` solo en Ollama | Usar la RTX disponible y evitar carga CPU innecesaria en el perfil ya existente |
| `eval/oe6/run-performance.mjs` | output independiente y estadística fría/caliente | Evitar sobrescribir OE6 y comparar 1/2/5 con trazabilidad |
| `eval/oe6/summarize-performance.mjs` | consolida/hasha las tres corridas | Evidencia reproducible, sin framework nuevo |
| `eval/oe6/results/*docker*` | resultados observados | Acreditar brecha fría, warm path y carga acotada |
| documentación de cierre | demo, matriz, paquete humano, decisiones/cronograma y manual | Entregables D–I solicitados |

### Validaciones realmente ejecutadas

- `docker compose ... config --quiet`: PASS con perfil `ollama-container`.
- Ollama container health/modelos/GPU/volumen: PASS; CUDA y 100 % GPU observados.
- J1 Docker frío: FAIL seguro esperado, HTTP 503; cleanup confirmado.
- Warm-up: PASS, HTTP 200.
- J1 Docker caliente: PASS completo con cita/historial/cleanup.
- Rendimiento Docker c1/c2/c5: PASS; 90/90, sin error/timeout/>5 s.
- `node --check` de ambos runners: PASS.
- resumen/hashes: PASS.
- nueve JSON OE6 parseados y enlaces locales de ocho documentos comprobados: PASS.
- `git diff --check`: PASS; solo aviso informativo LF→CRLF del runner en Windows.
- comprobación de residuo: las fechas máximas de conversaciones/mensajes sintéticos
  quedaron en 14 de octubre, anteriores a esta corrida.

No se volvieron a ejecutar las suites API 620/620, MCP 24/24, RAG 224/224 o Mobile
38/38 porque este cambio no toca sus componentes funcionales. Se reutiliza su evidencia.

### Límites finales

- El cold start sigue requiriendo warm-up/ready gate.
- La prueba es Docker Desktop local, no UNAB ni disponibilidad sostenida.
- Login v2 y N8N/MCP v1 se demuestran en carriles separados.
- RAGAS humano, autoridad CCD, dispositivos, push y SUS permanecen externos.
- El volumen de modelos y las imágenes se conservan; no se borraron backups/releases.

Durante el apagado final, `docker compose stop` nombró solo los cuatro servicios OE6 en
su salida, pero los timestamps/logs mostraron que Docker Desktop también envió un apagado
limpio a `banuchat-dev-postgres-ccd-auth-1` y `banuchat-ccd-auth-i1b-test` segundos antes.
No hubo OOM, error ni eliminación. Ambos se restauraron por nombre exacto al estado inicial:
CCD canónico `running/healthy` sobre `banuchat-dev-ccd-auth-data` e I1B `running` sobre
`banuchat-ccd-auth-i1b-test-data`. El guion final usa `docker stop` con los cuatro nombres
OE6 explícitos y exige verificar CCD después; queda como riesgo operativo de Docker Desktop.
Al cierre, los cuatro contenedores OE6 están detenidos; imágenes, volumen Ollama y modelos
se conservan. Los contenedores históricos `banuchat-postgres`/`banuchat-n8n` siguen
detenidos, como al inicio.

BanuChat queda **integrado y reproducible para demostración local caliente**, con el trabajo
humano/institucional preparado y las brechas originales explícitas. No queda académicamente
cerrado hasta resolver las decisiones y ejecutar las validaciones externas correspondientes.
