# Intent Router determinista — diseño v1

Estado: especificación `1.0.0-draft`, sin router, servicios ni renderers implementados.
Aplica [ADR 0004](adr/0004-enrutamiento-determinista-intenciones.md). Las reglas y
valores versionados residen en el [catálogo](../backend/api/intent-routing.catalog.json);
su [schema](../backend/api/intent-routing.schema.json) es Draft 2020-12.
No altera REST, MCP, SQL, dataset aprobado ni la ingesta.

## 1. Entrada, contexto y salida interna

Entrada: texto original de `content` (restricciones REST de 1–4000 caracteres),
conversación validada, perfil seleccionado por el backend, release vigente fijada,
`turn_now` capturado una sola vez por el backend y versión del catálogo.
El usuario no suministra profile_key, release_id, reloj, tool o modelo al router.
Una mención de otro perfil no cambia contexto. No se usa historial para completar
«esas», «lo anterior» o una fecha implícita: tales mensajes van al agente.

Salida conceptual interna: ruta (un id del catálogo o agent_fallback), parámetros
validados, variante de renderer cuando sea estático y motivo de decisión. No se
añade esa salida al JSON REST ni al modelo persistido. Para auditoría futura bastan
versión, ids de reglas, scores y motivo; no registrar texto sensible por defecto.

No hay probabilidades ni confianza producida por IA. `priority` solo ordena la
evaluación y el diagnóstico de forma reproducible; no elige ganador ante conflicto.
Un catálogo inválido debe deshabilitar el fast path y dejar disponible Agent/RAG,
con diagnóstico interno, no cargar reglas parcialmente.

## 2. Normalización y conservación del original

Solo se normaliza una copia para matching. El mensaje persistido y el contenido
entregado al fallback conservan exactamente el original aceptado por REST.

1. Unicode NFC; minúsculas Unicode. No transliterar alfabetos ni corregir erratas.
2. Comparación tolerante a acentos: NFD, retirar acento agudo y diéresis, recomponer
   NFC; conservar la tilde de ñ. «qué» y «que» coinciden; «mañana» no se convierte
   en «manana». No hay stemming ni sinónimos implícitos fuera del catálogo.
3. Antes de descartar puntuación, detectar segmentos no vacíos separados por signos
   de pregunta/exclamación de apertura o cierre, punto y coma o salto de línea.
   Más de uno fuerza fallback: «¿qué cursos hay? ¿qué anuncios hay?». Un único
   segmento rodeado de signos no es compuesto. Saltos vacíos laterales no cuentan.
4. Reemplazar solo `¿ ? ¡ ! , . : ;` por espacios, nunca concatenar palabras. Los
   guiones de fechas ISO, barras, comillas y otros signos no se eliminan. Un carácter
   no admitido por la gramática queda residual y conduce a fallback.
5. Colapsar whitespace y recortar bordes de la copia. Se puede retirar una sola
   ocurrencia del sufijo completo «por favor», como cortesía; no otros prefijos,
   saludos, verbos, negaciones ni cláusulas.

Las frases almacenadas están en forma normalizada; no duplicar variantes solo por
tildes, puntuación o mayúsculas. No normalizar el título devuelto por un servicio:
los valores `query` declarados conservan sus acentos y se usan como búsqueda literal.
La normalización de routing no modifica las reglas de búsqueda literal MCP.

## 3. Regla de decisión reproducible

Primero aplicar el guard de cláusulas, las exclusiones globales y los conectores
compuestos, con límites de token/frase, no substring. «y» como palabra es conector;
la letra y dentro de «ayuda» no lo es. Los marcadores `segun`, `compara` y similares
envían la solicitud completa a fallback, no intentan resolver la relación.

Evaluar todas las familias, sin cortocircuito por prioridad:

| Evidencia de matching | Puntos | Condición |
| --- | ---: | --- |
| Expresión fuerte | 100 | Igualdad de toda la copia normalizada |
| Patrón absoluto de fecha | 100 | Gramática completa, fechas reales y rango válido |
| Combinación de términos | 80 | Elegir una alternativa de cada segmento, en orden, separadas por espacios; consumir todo el mensaje |
| Token genérico / frase parcial | 0 | Solo indicio de conflicto, jamás habilita una ruta |

Las combinaciones son secuencias cerradas, no bolsas de palabras. Cada alternativa
puede contener varios tokens; no admite inserciones, permutaciones ni capturas libres.
No se ejecuta código ni regex proporcionado por el catálogo. Los dos patrones de
fechas son producción declarativa finita, no lenguaje de plantillas ejecutables.

El score de una familia es el máximo, no la suma. Exigir score >=80 y margen >=20
frente a otro candidato; además, **dos familias con score >=80 siempre hacen fallback**,
incluso si hay margen o distinta prioridad. Esta regla más estricta domina al margen.
Si dos reglas de una misma familia proponen parámetros distintos, hacer fallback.
Reglas solapadas con parámetros y variante idénticos se deduplican, sin sumar puntos.

Las exclusiones por familia invalidan sus coincidencias. Para detectar conflictos se
conservan también señales fuertes interiores de dos familias, aunque una exclusión
las invalide: no se elimina una cláusula para rescatar la otra. No se enruta un
substring reconocido dejando texto sin consumir. Una fecha ilegible, filtro extra,
negación o petición de escritura no se corrige mediante adivinación.

«curso», «fecha», «calendario», «notas» y «mis cursos» no activan fast path.
La única excepción de una palabra es el conjunto social completo hola/gracias/adiós;
no son tokens genéricos de dominio. «hola, cursos disponibles» no es saludo aislado.
No se busca maximizar cobertura usando reglas compuestas progresivamente más complejas.

## 4. Familias y parámetros

| Intención | Servicio lógico / renderer | Extracción acotada |
| --- | --- | --- |
| profile_progress | ProfileProgressService / progreso | statuses: enrolled, in_progress, completed; requiere perfil controlado |
| course_catalog | CourseCatalogService / catálogo | statuses: available, closed, archived |
| calendar_events | CalendarEventsService / calendario | date_from/date_to; event_types=course_session cuando se piden sesiones |
| announcements | AnnouncementsService / comunicaciones | temporal_status: active, upcoming, expired, all; reference_time=turn_now |
| document_lookup | DocumentLookupService / localización | query literal declarado; retrieval_mode=full_document en peticiones de las dos guías |
| capabilities_help | Renderer estático de capacidades | Sin parámetros ni hechos del corpus |
| basic_social | Renderer estático social | greeting, thanks o farewell |
| known_out_of_scope | Renderer estático de límite | not_available; no agrega funcionalidades |

Los parámetros efectivos son defaults de familia más los valores de la regla
reconocida. No hay merges entre reglas conflictivas. Límites: 20 para progreso,
catálogo, calendario y anuncios; 10 para localización. El usuario no puede cambiar
limit en esta gramática. No convertir una lista limitada en un total del corpus.
Filtros omitidos incluyen todos según MCP; no generar `[]` como si significara todos.

No se extraen filtros arbitrarios de texto libre. El catálogo declara los enums
exactos asociados a frases/combinaciones. Uniones de estados, búsquedas por curso
específico y filtros no listados van inicialmente a fallback. Progreso no acepta
profile_key textual. Si falta perfil, el router aislado no habilita esa familia;
en el flujo REST normal, un contexto inválido se resuelve antes según su contrato,
sin inventar un perfil ni pedir al generador que lo seleccione.

La localización busca los títulos declarados, no IDs fijos ni respuestas sobre sus
contenidos. Esos títulos son selectores, no garantía de existencia en una release.
«Dame una guía» sin selector y «explícame/resume la guía» van al agente. No se abre
ni vectoriza full_document para producir un resumen por el fast path.

Fuera de alcance reconoce únicamente solicitudes inequívocas sobre categorías ya
ausentes: notas/calificaciones/promedios, costos/pagos, profesores y certificados
reales, contactos, ubicaciones y trámites reales. No interpreta «notas de trabajo»
como calificaciones. El template dice que el prototipo no ofrece esa consulta;
no inventa hechos alternativos ni contesta sobre una persona o institución real.

## 5. Gramática temporal v1

Toda interpretación usa America/Bogota e instantes RFC 3339. `turn_now` es confiable,
se captura una sola vez; no depende del reloj del móvil ni se recalcula por servicio.
Las únicas formas relativas son las frases del catálogo que contienen hoy, mañana,
esta semana, próxima semana o semana que viene, y las combinaciones declaradas.

| Regla | date_from | date_to |
| --- | --- | --- |
| today | Día civil de turn_now | Mismo día |
| tomorrow | Día civil siguiente | Mismo día |
| this_week | Lunes de la semana civil que contiene hoy | Domingo de esa semana |
| next_week | Lunes posterior a esa semana | Domingo siguiente |

Semana significa lunes–domingo, no siete días móviles. «Esta semana» puede incluir
días pasados de esa semana; no se añade un filtro de ahora en adelante. La familia
no acepta «próximas sesiones» sin ventana, «próximo viernes», «en dos semanas», horas
sueltas o zonas distintas. Esos casos requieren fallback, no una ventana por defecto.

Formas absolutas exactas: `eventos del {date}` y
`eventos del {date_from} al {date_to}`. Los slots son fechas civiles reales de forma
YYYY-MM-DD, con año de cuatro dígitos; no aceptar fechas imposibles ni DD/MM/YYYY.
Rango ordenado y máximo 366 días inclusivos, igual que MCP/REST. No interpretar
expresiones dentro de instrucciones o texto sobrante. Todos los demás parámetros
de esos patrones se limitan a limit=20, sin event_types implícito.

El servicio transforma inicio de date_from y comienzo del día posterior a date_to
a instantes con zona, filtra starts_at con primer límite incluido y segundo excluido.
No hay solapamiento. Los timestamps de salida conservan RFC 3339 con offset.
La vigencia de anuncios conserva exactamente sus fronteras MCP: upcoming antes de
valid_from, active incluyendo inicio y final (o sin final), expired después del final.
No admite reference_time libre del usuario en esta gramática inicial.

## 6. Servicios compartidos y release coherente

Intent Router y MCP son adaptadores del mismo código de aplicación futuro. El
fast path no llama al servidor MCP, ni emula tools/call, ni duplica consultas/reglas.
Cada servicio estructurado usa internamente el contexto de turno con release esperada,
validación de parámetros, reglas de orden/límite y procedencia equivalentes a su tool.
Los endpoints REST directos podrán reutilizar esa lógica sin pasar por router/agente.
No se crea ahora esa capa ni se decide su empaquetado, transporte o contenedores.

Flujo de POST messages:

1. Recibir y validar el mensaje; aplicar exclusión de conversación según REST.
2. Fijar release vigente publicada y resolver allí el perfil de la conversación;
   capturar turn_now. Sin contexto válido, aplicar errores REST antes de insertar.
3. Persistir user original en transacción corta, sin normalización destructiva.
4. Normalizar copia, evaluar catálogo completo y detectar exclusiones/conflictos.
5. Si una familia es segura, invocar servicio + renderer o renderer estático.
6. Si no, pasar el texto original a Agent/RAG, que usa MCP y servicios compartidos.
7. Validar toda procedencia y su pertenencia a la release fijada.
8. Persistir assistant y citas atómicamente, con la release efectiva del turno;
   responder el mismo 201 REST y liberar la exclusión incluso ante error.

`answer_release_id` es el nombre conceptual usado por el contrato humano;
su columna SQL vigente es `messages.answer_dataset_release_id`. No se renombra SQL.
Incluso los renderers sin citas conservan esa release, como exige el modelo actual.

Los servicios no aceptan elección histórica desde usuario o catálogo. Resuelven
vigente + filas en un snapshot coherente y comprueban la release esperada del turno.
Si la release devuelta difiere, no mezclan datos: el coordinador aplica el 409 ya
documentado, no cambia silenciosamente la release del mensaje. En fallback se
conservan los reintentos internos MCP existentes; su resultado final debe coincidir
con el turno. No se añaden argumentos a tools MCP para cambiar ese contrato.

Una respuesta vacía mantiene release_id. El fast path no llama al generador para
«rellenarla». Un fallo de dependencia, validación de evidencia o renderer utiliza
los errores REST existentes; no es un fallo de matching. El user puede quedar sin
assistant igual que en fallback. Se conserva la política sin Idempotency-Key y la
consulta de historial antes de reenviar; no se añade estado ni tabla de reintentos.

## 7. Renderers, citas y listas vacías

Los templates son de presentación, no otra base de hechos. Reciben valores de
servicios, escapan texto para que títulos no inyecten Markdown/enlaces, conservan
orden, distinguen null de valor y no inventan nombres, fechas o porcentajes.
Ejemplo no factual: «Se muestran {n} actividades completadas: {nombres}» con
`n = filas recibidas`, no «tienes exactamente n» si existe limitación de resultados.
No incluyen títulos/resultados del dataset como respuestas hardcodeadas.

Textos estáticos propuestos para las variantes (su uso empieza con la futura
implementación, no afirma que hoy exista un servidor): greeting → «Hola. ¿Qué
necesitas consultar?»; thanks → «Con gusto.»; farewell → «Hasta luego.».
capabilities → «Puedes consultar el catálogo, calendario, anuncios y progreso del
perfil de demostración, localizar documentos y preguntar sobre los materiales
sintéticos disponibles. No realizo inscripciones ni trámites reales.».
not_available → «Esa información no está disponible en el prototipo sintético.».
Son mensajes de interfaz y alcance, no hechos sobre cursos o personas. Si cambia
el alcance aprobado, revisar estas plantillas junto con la versión del catálogo.

Datos internos citables conservan source_kind, source_path, source_locator,
source_sha256 y release_id, junto con claves reales de entidad; los documentos
incluyen document_version_id y los fragmentos, cuando proceda, chunk_id.
No se fabrican citas para una lista vacía, una ausencia o un texto estático.

| Renderer | Evidencia para afirmaciones | Caso vacío / insuficiente |
| --- | --- | --- |
| Progreso | profile, profile_course; nombres del curso requieren además procedencia course en la misma release | Sin asociaciones coincidentes: explicitarlo, no asignar cero a cursos inexistentes |
| Catálogo | course por fila | Informar que no se encontraron cursos con esos filtros |
| Calendario | calendar_event; no añadir hechos de curso/anuncio que no traiga evidencia | Informar rango consultado sin inventar agenda |
| Anuncios | announcement, con referencia temporal efectiva | Informar ausencia de comunicaciones coincidentes |
| Documentos | document con versión exacta; no citar chunks inexistentes | Sin coincidencias: no fabricar enlace ni sustituir por un título aproximado |
| Capacidades / social | Ninguna: texto de interfaz, no hechos del corpus | citations=[], insufficient_evidence=false |
| Fuera de alcance | Ninguna: límite del prototipo, no afirmación sobre el mundo | citations=[], insufficient_evidence=true |

Para resultados estructurados no vacíos y suficientes: insufficient_evidence=false.
Para listas vacías de los cinco servicios: true y explicación acotada de que no hay
evidencia coincidente, no una afirmación universal de inexistencia. Se pueden conservar
citas de perfil si realmente se presenta su alias, pero no inventar una cita que
«demuestre» la ausencia de filas. Todos los enums/campos REST permanecen iguales.

ProfileProgressService puede enriquecer su resultado interno con procedencia course
del mismo snapshot para sustentar nombres; el adaptador MCP proyecta exactamente su
output congelado, sin propiedades extra. No se dispara una segunda intención para
ese join necesario. Una comparación o recomendación entre dominios sí requiere agente.

Las citas públicas siguen el objeto REST: index, source_kind, label, locator,
release_id, document_version_id y artifact_url. source_path/source_locator internos
no se copian sin sanitizar; hashes, paths físicos y URLs externas nunca salen al móvil.
`message_citations` recibe las claves y procedencia verificadas, con sus validaciones
vigentes. Si una cita requerida falla, no se guarda un assistant parcial.

Para documentos disponibles, artifact_url solo puede ser la ruta interna
`/api/v1/documents/{document_version_id}/artifact`, con el UUID verificado exacto;
si no está disponible, null. La descarga histórica conserva la versión precisa o
devuelve 404; no reemplaza bytes por los actuales. Full_document no se fragmenta.
Una petición que exige interpretar el documento, en vez de localizarlo, va al agente.

## 8. Catálogo y casos: validación estática

El schema distingue `artifact_type=intent_routing_catalog` de `intent_routing_cases`.
Todos los objetos de datos se cierran. Políticas/valores están fijados para esta
versión mediante const; cambiarlos requiere editar schema, catálogo y expectativas
coordinadamente, no código ejecutable en el catálogo. Las referencias son locales.

Validación cruzada adicional: ocho IDs únicos y enlaces a servicios correctos;
IDs de reglas únicos; expresiones no duplicadas tras normalizar; ausencia de
triggers genéricos aislados; reglas temporales solo en calendario; parámetros por
familia compatibles con límites/enums MCP; static renderers sin parámetros de
servicio; casos referencian IDs existentes y al menos diez positivos por familia.
JSON Schema no demuestra que un renderer futuro cite bien ni que el algoritmo se
implemente correctamente. Los formatos requieren validación explícita de fechas reales.

[cases.json](../eval/intent-routing/cases.json) tiene expectativas de clasificación,
parámetros, contexto controlado, variante estática y razón técnica. No contiene
respuestas gold, preguntas RAGAS ni resultados ejecutados. Su reloj fijo no cambia
el dataset. Los casos de perfil ausente prueban el router aislado, no autorizan
procesar una conversación REST inválida. No se ejecuta un IntentRouter aquí.

## 9. Métricas futuras y límites de esta entrega

- fast_path_hit_rate: turnos elegibles clasificados a fast path / turnos elegibles;
  desglosar servicios frente a social/ayuda/fuera de alcance.
- agent_fallback_rate: decisiones de fallback / esos mismos turnos elegibles.
  Excluir rechazos previos de REST y reportarlos aparte; no ocultar errores de ejecución.
- Tasa de clasificación correcta: comparar rutas y parámetros con revisión humana
  independiente, no solo con ejemplos usados para redactar el catálogo.
- Falsos positivos: fast path elegido cuando correspondía fallback u otra intención;
  informar cantidad y proporción sobre elecciones fast path. Prioridad de seguridad.
- Latencias fast path y fallback: distribución y percentiles bajo carga controlada,
  separando decisión del router, servicio, generación y persistencia.
- Número/proporción de turnos que realmente invocan LLM generador, contado por
  invocación efectiva, no inferido automáticamente de la decisión de fallback.

No hay mínimo arbitrario de ahorro ni resultados de accuracy. No se llama a Ollama,
no se ejecutan queries ni se cambia la semántica de los objetivos OE1–OE6. El router
solo evita generación donde un renderer seguro basta; no sustituye evaluación de
RAG, selección de tools, calidad de evidencia o usabilidad.
