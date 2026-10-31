# BanuChat — PRODUCT-INTEGRATION-03

**30 de octubre de 2026, Bogotá.** Estado comprobado:
**`BANUCHAT_UNIFIED_MULTISOURCE_REST_VALIDATED`**.
No se declara validación Android nueva. Base de código habitual:
`d8bbe5780cfdbbf69c7019abbe054238dbc4ab63`.

## Diagnóstico y recuperación

No había listener en 3004 ni proceso Node con `start-unified` o
`authenticated-main`. PostgreSQL Unified, publicación CCD 1.4.0, Ollama y modelos
pasaron el preflight de lectura. N8N ya estaba disponible. Se inició exclusivamente
el entrypoint normal `node --import tsx scripts/start-unified.mts`, utilizado por
`npm start`, con la configuración privada existente y salida en archivos privados.
La API respondió y completó el recorrido sin modificar código productivo.

El diagnóstico actual es **proceso detenido**, sin evidencia de listener incorrecto,
dependencia caída o defecto de arranque. No hay registro persistido que establezca
cuándo o por qué terminó el proceso anterior; no se atribuye una causa histórica.
No se recrearon bases, volúmenes, cuentas, credenciales, modelos ni publicaciones.

## Validación real

Se utilizaron dos cuentas ficticias existentes, REST v2 habitual en 3004, PostgreSQL
55463, N8N 15679, MCP stdio y Ollama reales. No se construyó otro servidor de API,
no se inyectó un agente ni se activó la política experimental LLM. El agente
productivo es adaptativo **determinista**, acotado a dos herramientas.

Las 12 comprobaciones funcionales terminaron aprobadas entre la ejecución inicial
y su reanudación. La [evidencia depurada](results/2026-10-30-summary.json) contiene
consultas, tiempos, herramientas, decisiones, correlaciones y releases.

| Consulta / comprobación | Observación |
| --- | --- |
| Login y recursos directos | Cuenta CCD autorizada; progreso, anuncios y calendario con release auxiliar independiente |
| «Según mis cursos completados, ¿qué convocatorias activas podrían interesarme?» | `get_profile_progress` → `get_announcements`; 201; 4 citas; 3534 ms |
| «¿Y qué convocatorias activas podrían interesarme?» | Conserva el antecedente del usuario; mismas dos herramientas; 4 mensajes recuperados; 2646 ms |
| Documento CCD seleccionado y cursos del catálogo | `find_documents` → `get_courses`; 201; 6 citas; 2402 ms |
| Abrir cita documental | Artefacto v2 autenticado: 200 y bytes no vacíos |
| Documento inexistente y petición de contenido | Metadata vacía → `search_knowledge`; abstención sin citas; 8213 ms |
| Progreso, convocatorias y calendario | N8N solicita aclaración antes de abrir agente/MCP; ninguna tercera herramienta |
| Progreso de otro estudiante | Rechazo del sujeto antes de herramientas; sin citas |
| Lectura MCP adicional real | Contenido CCD, calendario, catálogo y progreso; resultados con releases y procedencia correctas |
| Admisión N8N | Sin credencial: 403; metadata inválida: 422; operaciones válidas correlacionadas con el agente |
| Fallo y recuperación de dependencia | Evidencia real de caída N8N del 29/10 reutilizada: 503, cero mensajes y fast path disponible; servicio hoy operativo |
| Aislamiento, logout y reapertura | Otra cuenta recibe 404 y no lista el chat; perfiles distintos; access revocado da 401; al volver a entrar se recuperan contenido y citas idénticos |

Las respuestas se contrastaron con los registros reales: cursos completados y
anuncios activos coinciden con los servicios de lectura; título documental y
nombres del catálogo coinciden con las fuentes. La respuesta combinada distingue
«Evidencia documental CCD» de «Datos auxiliares ficticios» y no infiere elegibilidad.
Las citas documentales apuntan a `10af4ffd-effb-41fc-bbfe-4dc48cb3398f`; las auxiliares,
a `af157a78-4c51-49c0-b8cc-509257d89f1e`. El historial conserva esa separación.

En cada turno con agente, las trazas `unified_n8n` y `unified_agent` comparten
`operation_id`, con pins de ambas releases y selección/observación/decisión reales.
La búsqueda tras metadata vacía registra
`metadata_empty_content_requested:search_knowledge`. La rama que excede el
presupuesto registra `clarification_required` y no invoca el agente.

Se comprobó que MCP deriva el perfil del principal, ignora una pista de perfil
ajena, rechaza el argumento de perfil y no admite `write_sql`. Su rol carece de
DML, administración y bypass RLS. Las llamadas adicionales devolvieron 5 matches
CCD, 5 eventos, 10 cursos y 5 registros de progreso, respectivamente; son cantidades
de esas llamadas limitadas, no totales del corpus. La comprobación de citas y
servicios no equivale a una evaluación semántica general ni a RAGAS.

## Integridad y frontera OE2

Una auditoría posterior de solo lectura verificó las **20 tablas protegidas**
legibles por el rol existente, sin cambios. Los registros anteriores de
`banuchat_aux.turn_sources` conservan su huella; se añadieron exactamente las seis
filas correspondientes a los seis turnos de esta prueba. No se escalaron permisos
para leer directamente la tabla de chunks. Sesiones e historial propios de las
cuentas de demostración son las únicas escrituras funcionales de este recorrido.

La lectura OE2 usó su rol fixture lector y `BEGIN READ ONLY`: seis releases listas,
18 snapshots, mismo `current` `8ed084d9-2d5e-4f90-8011-99912278b27c`, hashes,
candidatos, orígenes y todas las filas proyectadas verificados contra la evidencia
anterior. Solo se inició temporalmente su contenedor PostgreSQL existente para
leerlo y se restauró a detenido. No se ejecutaron adquisición, publicación o
scheduler OE2, ni se modificó su implementación.

El dataset OE2 sigue separado de `banuchat_aux` y del corpus CCD. No se importaron
fixtures y no se añadió endpoint público de programación. El workflow conversacional
conserva definición, configuración y versiones anteriores; todos los clones de
prueba OE2 observados siguen inactivos. N8N no se reinició ni se detuvo.

## Estado final de los servicios

| Servicio | Estado comprobado al cierre |
| --- | --- |
| API habitual | `127.0.0.1:3004`, iniciada y dejada en ejecución; desafío anónimo 401 y solicitudes autenticadas aprobadas |
| PostgreSQL Unified | `127.0.0.1:55463`, en ejecución; current/manifest CCD 1.4.0 intactos |
| Ollama | `127.0.0.1:11434`, versión y digests de ambos modelos coincidentes con configuración/release |
| N8N Unified | `127.0.0.1:15679`, health 200; webhook conversacional admite operaciones y mantiene correlación |
| MCP | Stdio por solicitud, lector limitado, sin listener HTTP permanente |
| Metro | 8084 libre; no se inició sin dispositivo |
| Android | ADB instalado; daemon consultado/iniciado; lista de dispositivos autorizados vacía |
| PostgreSQL fixture OE2 | Detenido, como al inicio; datos conservados |

No se instaló build, agregó reverse USB ni realizó recorrido físico. Chat móvil,
estados de carga/error, fuentes, historial y logout nativos quedan **sin nueva
ejecución**. No se reutiliza evidencia histórica como si fuera de esta macrotarea.
El preflight final marca falta de dispositivo; no certifica preparación Android.

## Evaluador, pruebas y límites

Se añadió únicamente el evaluador reproducible
`backend/api/scripts/evaluate-unified-product-integration.mts`, este resumen y su
JSON depurado. No hubo defectos productivos corregidos ni cambios de contratos,
corpus, schemas o modelos.

Hubo dos errores del evaluador, conservados en los resultados crudos:

1. Envió `{}` a logout; el contrato exige cuerpo vacío y respondió 400. Se corrigió
   la petición y se reanudó solo la comprobación pendiente: logout 204, revocación
   401 y reapertura con cuatro mensajes y citas idénticas. Las dos sesiones de esa
   reanudación confirmaron logout 204 al cerrar.
2. El fingerprint inicial incluyó `turn_sources`, que debe crecer al persistir
   nuevos mensajes. La comprobación funcional reanudada pasó, pero el resultado
   global crudo quedó FAIL por esa clasificación. Se corrigió el evaluador para
   separar datos protegidos de historial y se ejecutó una auditoría independiente
   de solo lectura: las filas anteriores son idénticas y hay exactamente seis
   nuevas de esta prueba. No se borraron datos para forzar igualdad.

Los archivos crudos mantienen sus estados originales. El estado final de esta
macrotarea se acredita con las 12 comprobaciones y las dos auditorías de lectura;
**no se afirma una nueva ejecución completa del runner después del último ajuste**.
El runner corregido pasó typecheck. Para una repetición autorizada desde
`backend/api`, con la API habitual ya iniciada:

```powershell
node --import tsx scripts/evaluate-unified-product-integration.mts
```

El evaluador no inicia la API, no reinicia dependencias, no restablece límites de
login y no imprime tokens. Crea historial propio de demostración. Si un POST es
incierto, consulta historial, conserva evidencia y se detiene; no lo reenvía.
Su opción `--resume=rest-<marca>` está limitada a la comprobación final fallida y
valida el resultado anterior antes de continuar.

Validación ejecutada: `npm run typecheck`, `npm run typecheck:unified`, las 12
comprobaciones de producto, auditoría de integridad Unified y auditoría OE2 de solo
lectura, preflights inicial/final y `git diff --check`. No se repitieron suites de
producto sin cambios, OE1, RAGAS, experimentos A/B/LLM ni scheduler acelerado OE2.

Respuestas CCD, cuentas, trazas completas, errores del evaluador, custodia referida
y logs del proceso quedan en `infra/local/product-integration-03/`, ignorado por
Git; la custodia y configuración originales no se copiaron al paquete público.
La causa histórica de salida de la API, la prueba Android y las limitaciones
léxicas/top-k del agente siguen sin resolverse en este incremento.

Sin commit ni push. La macrotarea termina aquí.
