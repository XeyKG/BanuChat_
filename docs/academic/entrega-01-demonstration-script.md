# BanuChat — guion breve de demostración y sustentación

Guion propuesto de 6–8 minutos, ajustable al espacio concedido. No es una nueva
ejecución ni una medición de usabilidad. Se apoya en la
[evidencia Android CCD 1.4.0](../../eval/mobile/results/android-mvp-ccd14-validation.md)
y en el [procedimiento operativo](../operations/final-integrated-demonstration.md).
No requiere diapositivas ni mostrar bancos privados o credenciales.

## Recorrido

| Paso | Acción del operador | Qué explicar/comprobar |
| --- | --- | --- |
| 1 · Acceso | Entrar con la cuenta ficticia existente, sin grabar los campos | Es autenticación propia del prototipo; no acceso ni identidad UNAB |
| 2 · Home | Mostrar acceso a chat y aviso de alcance | Documentación CCD seleccionada; progreso/calendario/novedades auxiliares ficticios |
| 3 · Consulta | Abrir un chat y preguntar por los contenidos del temario de IA Generativa | Se muestra el recorrido documental; esperar respuesta y carga real sin prometer un texto exacto |
| 4 · Evidencia | Expandir las fuentes y abrir un documento | Relacionar respuesta y pasaje visible; revisar alcance temporal. La cita permite comprobar, no garantiza exactitud |
| 5 · Seguimiento | Volver y solicitar las clases de herramientas del mismo curso | El contexto debe conservar el sujeto del usuario; no memorizar la respuesta de la demostración |
| 6 · Límite | Preguntar por un profesor asignado a un grupo futuro no documentado | Mostrar abstención/límite explícito, sin presentar oferta o cupos inventados |
| 7 · Historial | Volver a Home, entrar al historial y reabrir el chat propio | Mismos mensajes y citas, sin exponer IDs internos ni historiales ajenos |
| 8 · Salida | Logout y comprobar que el historial protegido pide acceso | La sesión y la propiedad son controles del backend; no basta ocultar una pantalla |

Si una dependencia falla, mostrar la incidencia y la evidencia histórica fechada;
no inventar una salida ni reenviar automáticamente un POST incierto. Para un
recorrido multifuente adicional, comprobar antes N8N/MCP; no es requisito del guion
documental. No provocar fallos ni recrear infraestructura durante la sustentación.

## Explicaciones sencillas

**Arquitectura.** El teléfono consume REST v2. La API valida sesión y propietario,
clasifica la consulta y elige un servicio estructurado o evidencia documental.
Algunas consultas con varias fuentes pasan por N8N y MCP; no todas lo necesitan.

**PostgreSQL y pgvector.** PostgreSQL guarda publicaciones, historial y datos
estructurados. pgvector permite comparar vectores de pregunta/documentos para
buscar material semánticamente próximo. Recuperar algo próximo no demuestra que
sea suficiente: después se selecciona evidencia por entidad, aspecto y periodo.

**RAG y Ollama.** RAG recupera evidencia antes de responder. Parte de las salidas
son presentaciones/extracciones controladas y otras son síntesis del modelo local.
Ollama ejecuta embeddings y generación; no es una fuente institucional ni convierte
la respuesta en oficial. El sistema puede abstenerse si falta respaldo.

**N8N y MCP.** N8N coordina una transición de ciertos planes multifuente y una
ingesta manual separada; el backend conserva reglas y procesamiento. MCP expone
herramientas de lectura con permisos. El agente implementado es determinista y
acotado; no se presenta como ReAct ni como BPM institucional completo.

**Datos.** El corpus CCD local contiene derivados seleccionados para pruebas,
con procedencia y límites, sin ratificación institucional formal. Los auxiliares
son ficción de demostración. La demo histórica sintética permanece separada y no
rellena silenciosamente respuestas institucionales.

**Métricas OE1.** En 43 casos hubo 39 respuestas y cuatro abstenciones. MRR@5 fue
0,813953. Sobre las 39 respuestas, faithfulness fue 0,952991; context precision
0,709402, context recall 0,713675 y answer relevancy 0,618210: estas tres últimas
no alcanzaron las referencias preliminares. Ranking y juez miden cosas distintas;
una respuesta fiel al contexto puede desviarse de la pregunta. Las métricas son
del baseline anterior a las correcciones, no de esta demostración.

**Cierre oral sugerido.** Podemos demostrar el recorrido técnico de consulta y
verificación en Android. Esto no prueba usabilidad con estudiantes, información
institucional ratificada ni despliegue UNAB. El trabajo disponible y las brechas
están documentados; la aceptación académica y cualquier cambio de alcance siguen
siendo decisiones pendientes del director.
