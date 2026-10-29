# BanuChat — integración del chat CCD

Estado: **CCD_INTEGRATED_CHAT_REST_VALIDATED_MOBILE_PENDING**.
29 de octubre de 2026. Es validación funcional de desarrollo; no reemplaza OE1.

## Correcciones

- **FLOW-03:** las preguntas sobre lo que acredita una fuente reciben un límite
  sustentado y citado, sin confundirse con solicitudes de disponibilidad actual.
  Las solicitudes mixtas de programación conservan su guardia. Los nombres de una
  tabla histórica no obligan a recuperar una ficha curricular vigente por nombre;
  se conserva la divergencia documental y el límite de reconocimiento individual.
- **FLOW-04:** se conservan los detalles pertinentes de las secciones publicadas
  admitidas, con variantes de encabezado y CRLF. Se seleccionan párrafos o viñetas
  completos, incluyendo sus condiciones; se excluyen secciones ajenas, bloques de
  código y órdenes detectadas. Cada paquete se acota a 1.600 caracteres, sin aumentar
  top_k ni número de paquetes, y la evidencia mantiene su rol de datos no confiables.
- **Entrada REST:** un tema sobre archivos dentro de un temario se deriva al RAG
  documental, en vez de exigir una búsqueda multifuente. Se reutiliza el contexto
  del usuario; los cambios de tema y solicitudes auxiliares conservan su recorrido.

Se modificaron `backend/api/src/chat/ccd-knowledge.ts`, `ccd-query-intent.ts`,
`backend/api/src/auth/unified-product.ts` y se añadió
`backend/api/src/chat/ccd-evidence-text.ts`. No fue necesario cambiar Mobile,
contratos, modelos, embeddings, SQL, corpus ni configuración.

## Evidencia ejecutada

| Comprobación | Resultado real |
| --- | --- |
| Backend | Typecheck y 157/157 pruebas pertinentes; 18 nuevas sintéticas |
| Mobile | Typecheck y 41/41 pruebas existentes |
| REST autenticado | Ocho consultas y un seguimiento; HTTP y revisión material de las respuestas |
| Fuentes | Siete artefactos descargados con autenticación y SHA-256 coincidente; anónimo rechazado |
| Seguridad y sesión | Login válido e inválido, refresh, rechazo del access anterior, logout y rechazo posterior |
| Propiedad e historial | Reapertura exacta, historial propio, GET/DELETE ajenos rechazados |
| Adaptadores móviles reales | Login, chat, cita/fuente, abstención, historial, restauración por refresh y logout por HTTP |
| Android físico | No ejecutado: ADB no detectó dispositivo en las dos comprobaciones |
| Integridad | Publicación de 107 unidades verificada READ ONLY antes/después; 73 archivos históricos protegidos intactos |

Los recorridos REST cubrieron contenidos de curso, comparación por atributo,
historia, alcance documental, divergencia de tabla/prosa, prácticas detalladas,
disponibilidad insuficiente y datos personales fuera de alcance. Se revisó que
las respuestas atendieran esos aspectos; no se exigió reproducir literalmente
un gold ni se produjo una puntuación nueva. El detalle ahora incluye acciones
concretas donde antes solo se enunciaban categorías generales.

La pasada final creó y eliminó ocho conversaciones REST y una de adaptadores,
exclusivamente propias y mediante la API. Las conversaciones de las pasadas
anteriores también se limpiaron. No se borraron cuentas ni conversaciones ajenas.

## Incidencias y límites

Se conservaron las trazas de desarrollo: una expectativa inicial del comprobador
confundía el localizador público con el interno; después se observó el 503 real
del desvío de temario hacia orquestación. Se reprodujo con un fixture y se corrigió
la entrada documental. Otra pasada se detuvo en login al agotarse la cuota; se
esperó la siguiente ventana sin resetear contadores ni cambiar permisos.

El capturador congelado de OE1 reconoce la representación anterior del contexto
y rechaza la nueva. Permanece intacto; sus métricas y guardas no se modificaron.
Las trazas nuevas se conservan por separado, sin ejecutar ese baseline.

La comprobación de adaptadores usa almacenamiento de sesión en memoria. No acredita
SecureStore, navegación, interacción táctil ni renderizado nativo actuales. Carga,
error, abstención y apertura de citas se revisaron en el código/pruebas existentes;
su ejecución visual nueva queda pendiente junto con Android. El contenido descargado
no se renderiza como HTML ejecutable.

El filtrado de detalle es conservador y no demuestra inmunidad universal a prompt
injection. Las consultas y fuentes ya eran conocidas durante el desarrollo; no es
una evaluación ciega ni aceptación humana, académica o institucional. Las respuestas
se verificaron en su intención y contenido material, sin certificar exhaustividad
semántica universal. FLOW-05 y la disponibilidad general de servicios multifuente
quedan fuera de este cierre; no se iniciaron servicios Docker para forzarlo.

Evidencia privada: `data/ccd/local/product-validation/ccd-integration-01-v1/`,
ignorada por Git. Para usar la API actual se reutiliza `npm start` desde
`backend/api`, loopback 3004, y el procedimiento USB vigente cuando exista un
dispositivo autorizado. No se cambió la configuración Expo SDK 57.
