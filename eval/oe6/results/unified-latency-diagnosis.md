# BanuChat — diagnóstico focalizado de latencia Unified

OE1-OE6-LATENCY-DIAG-01, 31/10/2026.
Estado: **BANUCHAT_LATENCY_CAUSE_IDENTIFIED**.
Alcance: atribución por etapas en una pasada local prefijada; sin optimización
productiva, evaluación de calidad o certificación de desempeño.

## Protocolo y condiciones

Se respetó el [protocolo registrado antes de medir](../latency-diagnostic-protocol.md):
seis solicitudes documentales D1–D6 y dos controles C1/C2, secuenciales, sin
retries, sin warm-up/unload deliberados. D1/D2 repiten la misma pregunta prevista
en conversaciones nuevas. No se ejecutaron las 43 preguntas ni RAGAS.

Los [resultados saneados](unified-latency-2026-10-31.json) contienen tiempos,
códigos, contadores, configuración y agregados por etapa. Las trazas completas
permanecen privadas bajo LOCALAPPDATA, fuera del repositorio/OneDrive.
No se registraron respuestas completas, documentos, prompts, vectores o secretos.
Las preguntas prefijadas permanecen en el protocolo, separadas de los logs.

Composición real: REST v2 habitual 3004, cuenta ficticia existente, RAG CCD
autenticado, PostgreSQL Unified, embedding qwen3-embedding:0.6b 1024D/coseno y
generador qwen3:4b-instruct, runtime Ollama 0.35.0 y revisiones existentes fijadas.
No se cambiaron parámetros, prompts, corpus, timeouts del servidor o modelos.

Antes de la ventana se verificaron PID, custodio y entrypoint contra el registro
previo del proyecto. Cero conexiones establecidas y cero operaciones PostgreSQL
no idle observadas antes de detener la API. Se reutilizó start-unified.mts con
preload temporal; no se abrió otro puerto o endpoint. N8N/OE2/PostgreSQL no se
reiniciaron. Tras la pasada se retiró el preload y se repuso el entrypoint normal.

Las dos lecturas iniciales de residencia y la lectura anterior a D1 estaban
vacías. Después de D1 solo se observó el generador; después de D2–D6 se observaron
ambos modelos. Son observaciones puntuales de
[Ollama /api/ps](https://docs.ollama.com/api/ps), no prueba de residencia continua
ni de presión de VRAM. No se controló temperatura, caché del SO o carga del GPU.

## Resultados individuales

Todos los tiempos de las tablas están en **milisegundos**. HTTP es fetch del
cliente hasta JSON consumido. C/F son métodos completos con verificaciones;
D agrupa guardia de lectura y RPC; H es solo RPC de persistencia.

| ID | HTTP | Servidor request→finish | Router | C embedding incl. | D guardia + RPC | F generador incl. | H persist RPC | Resultado |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| C1 | 37,348 | 35,314 | No llamado | No llamado | No llamado | No llamado | No llamado | Progreso 200 |
| D1 | 14.302,869 | 14.294,944 | 2,135 | 6.341,157 | 26,277 | 7.797,579 | 31,362 | 201, cuatro citas |
| D2 | 4.518,940 | 4.507,118 | 0,716 | 2.560,557 | 14,115 | 1.864,975 | 13,350 | 201, cuatro citas |
| D3 | 4.469,001 | 4.462,287 | 0,134 | 141,040 | 8,185 | 4.225,234 | 17,654 | 201, tres citas |
| D4 | 3.345,792 | 3.336,824 | 0,604 | 114,662 | 8,081 | 3.152,837 | 8,729 | 201, tres citas |
| D5 | 172,110 | 165,164 | 0,069 | 101,712 | 10,713 | No llamado | 10,417 | 201, dos citas sin llamada al generador |
| D6 | 873,474 | 864,714 | 0,447 | 144,149 | 8,641 | 656,802 | 5,519 | 201, abstención sin citas |
| C2 | 30,275 | 28,786 | 0,381 | No llamado | No llamado | No llamado | 4,753 | Ayuda 201, sin citas |

Las seis solicitudes documentales tuvieron HTTP 201: cinco respuestas citadas y
una abstención. Los dos controles dieron los estados esperados. No hubo errores
de transporte/HTTP, retries o peticiones inciertas. Esto no califica corrección
semántica independiente ni produce porcentajes nuevos de calidad.

Denominadores: ocho consultas medidas y nueve operaciones administrativas del
runner (login, siete creaciones de conversación y logout); dos sondas 401 de
readiness sin autenticación, antes/después de la ventana. **19 peticiones a la
API en total**, de las cuales solo seis fueron solicitudes documentales y dos
controles. Las llamadas internas a Ollama fueron seis embeddings, cinco chat y
66 verificaciones HTTP de runtime; no se cuentan como preguntas adicionales.

## Agregados HTTP

| Grupo | n | Media ms | Mediana ms | Máximo ms |
| --- | ---: | ---: | ---: | ---: |
| Documentales D1–D6 | 6 | 4.613,698 | 3.907,397 | 14.302,869 |
| Controles, operaciones distintas | 2 | 33,812 | 33,812 | 37,348 |
| Documentales con llamada al generador, incluida abstención D6 | 5 | 5.502,015 | 4.469,001 | 14.302,869 |
| Documentales citadas con generador D1–D4 | 4 | 6.659,151 | 4.493,971 | 14.302,869 |

Los grupos se solapan y no se suman. La media de seis mezcla rutas y salidas
distintas, incluye una repetición conocida y un primer turno sin residencia
observable. No equivale a distribución de uso normal ni acredita ≤5 s de SLA.
No se compara estadísticamente con el turno histórico de 10.487 ms, otras
composiciones, carga Docker o benchmarks anteriores.

## Evidencia de atribución

Ollama devuelve duraciones en nanosegundos; aquí se convierten a milisegundos.
`load_duration` identifica carga; `prompt_eval_duration` y `eval_duration`
identifican evaluación de entrada y generación de tokens. Se contrastó la
semántica en las referencias primarias de
[chat](https://docs.ollama.com/api/chat) y
[embedding](https://docs.ollama.com/api/embed).
Son relojes/reportes del servidor, distintos del wall time HTTP y de los métodos
cliente; no se suman a esos padres para construir un total.

| ID | Carga embedding reportada | Carga generador reportada | Evaluación prompt chat | Generación tokens chat | Tokens generados |
| --- | ---: | ---: | ---: | ---: | ---: |
| D1 | 6.167,942 | 5.206,205 | 840,273 | 1.603,253 | 57 |
| D2 | 2.354,698 | 10,355 | 123,940 | 1.597,077 | 58 |
| D3 | 3,664 | 4,465 | 326,407 | 3.754,654 | 134 |
| D4 | 6,420 | 6,087 | 143,569 | 2.883,385 | 105 |
| D5 | 5,112 | No llamado | No llamado | No llamado | No llamado |
| D6 | 8,573 | 7,476 | 261,301 | 231,460 | 9 |

**Atribución confirmada en la captura:** el primer turno contiene dos cargas
reportadas que suman 11.374,147 ms en llamadas secuenciales distintas. Sus wall
times externos son 6.263,192 ms para embed y 7.693,164 ms para chat. Esto localiza
la mayor demora inicial en el ciclo de carga/inferencia de Ollama, coherente
con la ausencia previa de modelos observables.

D2 conserva una carga de embedding de 2.354,698 ms, coherente con su ausencia en
la lectura después de D1. Se confirma el costo reportado de carga; **no se
confirma por qué dejó de observarse ese modelo**. Expulsión por memoria, caché,
decisión del runtime o driver son hipótesis no aisladas; no se inventa una
limitación de GPU/VRAM.

En D3 y D4 las cargas son de pocos milisegundos y predominan los tiempos de
evaluación/generación reportados. Hay duraciones y conteos de tokens compatibles
con ese trabajo; no se atribuye intención interna al modelo, ni se promete un
ahorro reduciendo tokens, contexto o cambiando modelo.

Las verificaciones sí se repiten: dos por embedding y dos por generación,
cada una con version/tags/show. Sus métodos completos suman 181,547 ms en D1,
208,874 en D2, 169,375 en D3, 158,986 en D4, 57,728 en D5 y 222,261 en D6.
Son subconjuntos de C/F. **No explican los segundos de carga/generación** de
esta muestra, por lo que no se recomienda retirar guardias o cachear identidades
sin un análisis de seguridad propio.

Router, guardia/RPC y persistencia observados tienen escalas mucho menores:
router máximo 2,135 ms, guardia+RPC máximo 26,277 ms, RPC persistencia máximo
31,362 ms. No se identificó un defecto causal reproducible en esos componentes.

## Qué no se midió y corrección del observador

La captura inicial clasificó como `sql_retrieval` tanto el RPC real como una
consulta de privilegios que menciona ese nombre en to_regprocedure. Por ello
**D conserva ambos tiempos como un grupo de dos llamadas**; no se presenta como
CPU pgvector exclusiva o tiempo puro de búsqueda.

Se corrigió el orden del clasificador del observador y se añadió una regresión.
Las trazas originales y el código exacto ejecutado están preservados privadamente
con hash coincidente con el plan. No se reetiquetaron tiempos como mediciones
nuevas ni se repitieron inferencias para obtener una tabla mejor.

| Frontera | Cobertura |
| --- | --- |
| A HTTP cliente/servidor | Medida con límites distintos; su diferencia no se presenta como tiempo exacto de red |
| B router | Medido; resolución completa de sujeto/política NOT_MEASURED |
| C embedding | Método, verificación y HTTP embed medidos; CPU/GPU/cola interna no aisladas |
| D PostgreSQL | Guardia + RPC agrupados; pool acquisition NOT_MEASURED; duración cliente/red/DB, sin EXPLAIN o CPU de motor |
| E selección/preparación de evidencia | NOT_MEASURED como etapa independiente |
| F generador | Método, verificaciones, HTTP chat y métricas numéricas del servidor medidos |
| G validación/citas | NOT_MEASURED como etapa independiente |
| H persistencia | RPC medida; ciclo completo/commit/serialización no aislado como fase única |

No se restan ni se suman spans solapados para asignar E/G. La instrumentación
tiene sobrecarga no calibrada, aunque pruebas focales comprobaron preservación
de argumentos, this, resultados, errores, lectura JSON y aislamiento async.

## Propuesta acotada, sin ejecución

La oportunidad respaldada es **evaluar una política explícita de preparación y
residencia conjunta de los dos modelos actuales**. Una futura tarea puede
verificar capacidad, permanencia y causas de pérdida de residencia, y distinguir
instalado, residente y listo para el primer turno. La evidencia de D2–D6 muestra
residencia conjunta observable, sin probar que pueda garantizarse permanentemente.

Si se decide estudiar precarga operativa, debe ser otra tarea con autorización y
presupuesto propios, contabilizando su costo fuera y dentro del arranque.
No esconder el primer turno ni llamarla mejora de latencia en frío. No se ejecutó
precarga aquí, ni se modificaron keep_alive, modelos, top_k, prompts o timeouts.
El ahorro real y sus costos de memoria no se estiman sin ese ensayo.

No se propone optimizar SQL, reducir evidencia, saltar verificaciones o modificar
respuestas para alcanzar un número. La política de residencia es candidata,
no una implementación aprobada o una segunda macrotarea iniciada.

## Preservación y cierre

Coincidieron snapshots de archivos versionados y configuración privada relevante,
tablas de corpus/auxiliares, filas de cuentas/sesiones/historial ajenas al
principal ficticio usado, current/manifiesto, 107 artefactos, modelos instalados,
publicaciones OE2, definiciones/versiones N8N e identidades de contenedores.
No se imprimieron sus datos, tokens o SQL completo.

Se crearon siete conversaciones propias y siete turnos normales, correspondientes
a 14 mensajes por contrato, con 16 citas devueltas en las respuestas. Se conservaron
en el historial habitual, sin borrados. Login/logout y sus contadores propios
son escrituras esperadas; no se afirma inmutabilidad de cuotas/logs globales de auth.

La API normal quedó activa en 3004 sin preload; su sonda sin credencial devolvió
401 y logout propio devolvió 204. Es una comprobación de disponibilidad y cierre,
no otra prueba documental posterior. PID y registros propios están bajo custodia;
el registro OE5 del PID anterior se conserva como antecedente histórico.
PostgreSQL, N8N, fuente OE2 y sus volúmenes no se reiniciaron.

No hubo cambios en código productivo, contratos REST/MCP, Agent, corpus, modelos,
publicaciones o evaluaciones históricas. Solo se añadieron scripts de observación,
pruebas, protocolo y documentación/resultados de este incremento.
