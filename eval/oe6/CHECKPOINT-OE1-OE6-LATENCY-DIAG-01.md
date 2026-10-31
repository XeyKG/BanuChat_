# OE1-OE6-LATENCY-DIAG-01 — diagnóstico final

31/10/2026, America/Bogota.
Estado: **BANUCHAT_LATENCY_CAUSE_IDENTIFIED**.
Base limpia: `7435c80bb5d2b674d5e1bef913f9a7447eb198fd`.

## Resultado y alcance

Se ejecutó una única pasada prefijada: seis solicitudes documentales y dos
controles, sin retries, warm-up o unload deliberados. Ocho estados HTTP esperados,
cinco respuestas documentales citadas y una abstención. Nueve operaciones
administrativas y dos sondas 401 adicionales: 19 llamadas a la API en total.
Ollama procesó seis embeddings y cinco chat; no son preguntas adicionales.

El [protocolo previo](latency-diagnostic-protocol.md),
[informe técnico](results/unified-latency-diagnosis.md) y
[resultados saneados](results/unified-latency-2026-10-31.json) contienen consultas,
orden, condiciones, resultados individuales, agregados y fronteras A–H.

| Grupo | n | Media ms | Mediana ms | Máximo ms |
| --- | ---: | ---: | ---: | ---: |
| Documentales, rutas heterogéneas | 6 | 4.613,698 | 3.907,397 | 14.302,869 |
| Controles distintos | 2 | 33,812 | 33,812 | 37,348 |
| Documentales con generador, incluida abstención | 5 | 5.502,015 | 4.469,001 | 14.302,869 |

## Atribución confirmada y límites

- D1: carga reportada de embedding 6.167,942 ms y generador 5.206,205 ms;
  dos intervalos secuenciales que suman 11.374,147 ms del ciclo observado.
  La residencia inicial estaba vacía.
- D2: carga de embedding 2.354,698 ms. Después de D1 solo se observó el
  generador; después de D2–D6 ambos modelos. Motivo de pérdida de residencia
  del embedding, presión de VRAM y causas de driver/caché **no confirmados**.
- D3/D4: evaluación de tokens reportada de 3.754,654/2.883,385 ms; cargas
  pequeñas. La demora se localiza en carga e inferencia, sin explicar todos
  los mecanismos internos del runtime.
- Verificaciones de runtime: 57,728–222,261 ms por documental sumando sus
  métodos pre/post, incluidas dentro de C/F. No son el cuello principal aquí.
- Router máximo 2,135 ms; guardia + RPC de lectura máximo 26,277 ms;
  RPC de persistencia máximo 31,362 ms. No se demuestra defecto productivo en ellas.

Evidencia/contexto, validación/citas, resolución completa, pool wait y ciclo
completo de persistencia no se aislaron: **NOT_MEASURED** según frontera.
No se atribuye tiempo a esas etapas por resta de spans. No SLA, comparación
equivalente con el turno histórico de 10.487 ms ni nuevas métricas OE1.

## Instrumentación, seguridad y servicios

Preload opt-in en la API habitual, solo para User-Agent técnico de esta pasada,
sin endpoint/cambio de contrato. PID/propietario/entrypoint y ausencia de actividad
se verificaron antes de ambas sustituciones. Código productivo sin cambios.
La API quedó repuesta sin observador en 3004; sonda final 401, logout propio 204.
N8N/PostgreSQL/OE2 no se reiniciaron.

Una etiqueta SQL agrupó guardia y RPC; se conserva así en esta captura.
El observador final corrige la clasificación con regresión, sin repetir consultas.
Código exacto ejecutado, trazas completas, bookkeeping y huellas quedan bajo
ACL del custodio en LOCALAPPDATA/BanuChat/diagnostics/OE1-OE6-LATENCY-DIAG-01,
run `16c6a702-5b1a-4a91-874d-026f3d861fca`, fuera de Git/OneDrive.
Informes públicos solo con agregados por petición/etapa y contadores numéricos.

Preservación concordante: archivos/configuración relevante, corpus/current,
manifiesto/artefactos, modelos, evaluaciones históricas, publicaciones OE2,
definiciones N8N, Agent/MCP/REST y filas de cuentas/sesiones/historial ajenas al
principal de prueba. Se conservan las conversaciones propias creadas; no borrados
ni reset de cuotas. No se registraron respuestas completas, documentos o vectores.

## Verificación

- `npm run typecheck` y `npm run typecheck:unified`: aprobados.
- Suite focal del observador y clientes Ollama: **60/60**, incluidas diez
  pruebas de transparencia, privacidad, aislamiento, clasificación y agregación.
  La corrección de agregados se comprobó nuevamente con las diez focales.
- Cinco enlaces locales y tablas coherentes; sin secretos conocidos o campos
  de contenido/vectores en trazas. El protocolo y la captura original conservan
  sus hashes y tiempos individuales.
- Siete archivos nuevos dentro del alcance; `git diff --check` y comprobación
  equivalente de archivos nuevos sin errores. Ningún archivo productivo modificado.
- Preservación: 1.022 archivos/configuraciones, 23 tablas de corpus/auxiliares
  y ocho ámbitos de filas ajenas, además de fuentes/publicaciones indicadas.

No se realizaron nuevas inferencias para la revisión o los arreglos del observador.

## Propuesta, sin implementación

Evaluar en otra tarea una política explícita de preparación/residencia conjunta
de los modelos actuales, con observación de capacidad y expiraciones. No prometer
ahorro ni ocultar carga inicial; cualquier precarga futura debe contabilizarse
y autorizarse por separado. Conservar guardias, modelos, prompts, top_k y límites.

La tarea termina en diagnóstico. Sin optimización productiva, benchmark, RAGAS,
Android, scheduler, releases nuevas, restauraciones, commit o push.
