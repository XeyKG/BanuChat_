# BanuChat — protocolo prefijado de latencia Unified

OE1-OE6-LATENCY-DIAG-01, 31/10/2026. Registrado antes de inferencias de esta
tarea. Base limpia: `7435c80bb5d2b674d5e1bef913f9a7447eb198fd`.
No es benchmark OE1, evaluación de calidad, warm-up o prueba de carga.

## Muestra y orden fijos

Una pasada secuencial, **seis solicitudes documentales y dos controles**.
No utilizar las dos plazas documentales restantes como retries ni para ampliar
el estudio después de observar resultados. Login, creación de conversaciones,
lectura de historial ante incertidumbre y logout son operaciones administrativas;
se registran separadamente, sin contarlas como consultas documentales o controles.

| Orden | ID | Consulta / operación |
| --- | --- | --- |
| 1 | C1 | GET autenticado de progreso ficticio, sin pregunta documental |
| 2 | D1 | ¿Qué temas se estudian en el curso de Inteligencia Artificial Generativa? |
| 3 | D2 | ¿Qué temas se estudian en el curso de Inteligencia Artificial Generativa? |
| 4 | D3 | ¿Qué temas se estudian en el curso de Analítica y Ciencia de Datos? |
| 5 | D4 | ¿Qué temas se estudian en el curso de Creación de Contenidos Digitales? |
| 6 | D5 | ¿Cuál es el costo documentado de un curso CCD en 2026 y qué se sabe de 2027? |
| 7 | D6 | ¿Cuál es el horario de atención confirmado del CCD para el domingo de 2030? |
| 8 | C2 | ¿Qué puedes hacer? |

Cada POST de chat usa una conversación propia nueva, sin contexto de preguntas
anteriores. D1/D2 son repetición prevista, no retry ni prueba ciega. D5/D6 permiten
observar extracción o abstención legítima, sin prescribir la decisión del sistema.
Respuestas, documentos, prompts entregados al modelo y vectores no se registran.
Solo resultado citado/abstención, contadores, tiempos y códigos técnicos.

## Condiciones iniciales y ventana

Inspección previa: API habitual en 3004, PID 29224, del custodio y entrypoint
normal; coincide con el registro de proceso OE5. Cero conexiones establecidas
observadas. Los tres contenedores PostgreSQL Unified, fuente OE2 y N8N estaban
activos; no se reinician. Ollama /api/ps devolvió lista vacía: **sin modelos
residentes observables en esa lectura**. Se vuelve a observar al iniciar la
pasada y entre consultas, sin cargar/descargar modelos deliberadamente.

Antes de sustituir temporalmente la API se revalidarán PID, propietario,
entrypoint, ausencia de conexiones y actividad PostgreSQL. Si no es seguro,
no se reinicia y el alcance se declara parcial. Usar el mismo entrypoint y
configuración privada, con un preload opt-in de observación; al terminar,
retirar el preload y reponer el arranque habitual.

No cambiar generador, embeddings, prompts, top_k, presupuestos, timeouts del
servidor, guardias, corpus o configuración persistida. Metadatos de modelo y
residencia se observan; no constituyen intervención térmica controlada.

## Instrumentación y semántica

El observador vive en scripts de diagnóstico, sin editar código productivo,
endpoint nuevo o cambios REST. Se activa solo en esa API y filtra el User-Agent
estándar de este run para correlacionar C1/D1–D6/C2. No cambia cuerpos, cabeceras
de respuesta, decisiones o resultados; introduce sobrecarga de observación que
no se calibra como cero. Los registros se emiten después del finish HTTP.

| Etapa | Medición prevista y límite |
| --- | --- |
| A. HTTP | Cliente: fetch hasta JSON consumido; servidor: request a finish. Relojes monotónicos locales, límites distintos |
| B. Resolución/clasificación | Router determinista medido directamente; resolución de sujeto/política libre no aislable: NOT_MEASURED |
| C. Embedding | Método completo; verificación de runtime antes/después y llamadas HTTP Ollama como hijos. No registrar vector |
| D. PostgreSQL/pgvector | Client.query clasificado por RPC de recuperación, verificación de privilegios, contexto, auth o transacción. Incluye espera/red/DB; no es tiempo CPU exclusivo del motor |
| E. Evidencia | Selección/contexto de funciones libres: NOT_MEASURED sin instrumentación invasiva |
| F. Generación | Método completo, verificaciones pre/post y HTTP chat. Duraciones/counters numéricos reportados por Ollama separados del reloj cliente |
| G. Validación/citas | NOT_MEASURED como etapa independiente; no inferir su duración restando spans |
| H. Persistencia | RPC persist_unified_turn y transacciones observables; RPC no equivale al ciclo completo de persistencia/serialización |

Spans anidados **no se suman** a sus padres. Varias llamadas a una misma etapa
se informan con su conteo. Una etapa instalada sin llamadas se distingue de una
etapa no instrumentada. Intervalos no cubiertos no se atribuyen a E/G ni a CPU.

## Reglas de decisión y parada

- **Observada:** tiempo directo con límites, correlación y unidad conocidos.
- **Atribuida:** predominio localizado en un span reproducido o duración de
  carga/evaluación reportada por Ollama consistente con el request. Distinguir
  mecanismo medido de motivación interna no observable y evitar causalidad
  experimental no realizada.
- **No determinada:** sin span, mediciones incompatibles, solapamiento, petición
  incierta o muestra insuficiente para separar mecanismos.
- No extrapolar a media poblacional/SLA, otra composición, otros dispositivos
  o el turno histórico de 10.487 ms. Informar media/mediana/máximo del grupo con
  n explícito y separar controles, rutas sin generación y solicitudes generativas.
- Sin retries HTTP. Ante POST incierto, consultar solo el historial propio antes
  de otra decisión; no repetir la pregunta. Errores de dependencia se registran;
  no reiniciar Ollama/N8N ni cambiar límites para completar la muestra.
- Si la instrumentación no es transparente o la ventana no es segura, detener
  la parte afectada y entregar cobertura parcial. No iniciar optimización.

## Privacidad y preservación

Trazas en LOCALAPPDATA/BanuChat/diagnostics/OE1-OE6-LATENCY-DIAG-01,
fuera de Git/OneDrive y con ACL del custodio; se consideran almacenamiento local
privado excluido de Git. No guardar texto de respuestas, embeddings, tokens,
credenciales, SQL completo o datos personales. IDs de recursos propios, si se
requieren para comprobación de propiedad, quedan solo como bookkeeping privado.

Comparar antes/después current/manifiesto, artefactos autorizados, historial de
evaluaciones, código/contratos/Agent/MCP, configuración privada, publicaciones
OE2 y definiciones N8N. Las escrituras normales de nuestra cuenta y conversaciones
se identifican separadamente; no se borran ni se incluyen en los hashes de filas
ajenas. Registrar logout y restauración de la API sin preload.
