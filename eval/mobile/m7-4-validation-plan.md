# M7.4 — Plan de validación funcional del MVP móvil

## Identificación y alcance

| Campo | Valor |
| --- | --- |
| stage | M7.4 |
| Preparación del instrumento | M7.4-A; anterior a la ejecución física |
| repository_revision observada al crear el plan | `d1631e9f7a08dc939dcc5a93480e04f480ba745f` |
| Última revisión que modificó `mobile/` | `60d508cedcdf23c377603cf28af74d3b61ef2312` |
| Fecha de congelación del contenido | 2026-10-13, America/Bogota; aplicación de la regla al commitear |
| Corpus | 100 % sintético, versionado en `data/synthetic/` |
| Ejecución prevista | Android físico + Expo Go; equipo del proyecto |
| Conectividad | Backend/API local por LAN privada |
| Identidad | Perfil sintético de sesión demo; ausencia de autenticación real |
| SUS | No se ejecuta ni evalúa en esta etapa |
| Resultados | Pendientes de ejecución; sin casos calificados en este plan |

El propósito es comprobar que el producto técnico que se utilizará posteriormente
en una evaluación de usabilidad esté estable y que sus flujos definidos funcionen
como se espera. Es validación funcional del MVP de demostración, no evaluación
formal con usuarios. La inspección estática que preparó este plan no acredita
ningún resultado físico.

## Congelación

Una vez que este plan sea commiteado, los IDs, pasos esenciales y resultados
esperados no deben modificarse después de observar los resultados. Si se detecta
un error objetivo del instrumento, documentarlo y crear una revisión nueva;
no corregir silenciosamente la expectativa para convertir un FAIL en PASS.

Los resultados se registrarán posteriormente en un archivo independiente, que
referenciará la revisión del plan y la revisión real de ejecución. El commit que
incorpore este documento será posterior a la revisión observada arriba. No se ha
creado un archivo de resultados en M7.4-A.

## Entorno y preparación de la ejecución

Registrar en el futuro archivo de resultados, sin inventar valores:

| Campo | Valor por completar |
| --- | --- |
| Fecha/hora de ejecución y responsable del equipo | [PENDIENTE DE REGISTRAR EN LA EJECUCIÓN] |
| Commit que incorpora el plan | [PENDIENTE DE REGISTRAR EN LA EJECUCIÓN] |
| Repository revision ejecutada y estado Git | [PENDIENTE DE REGISTRAR EN LA EJECUCIÓN] |
| Última revisión de `mobile/` ejecutada | [PENDIENTE DE REGISTRAR EN LA EJECUCIÓN] |
| Modelo de teléfono | [PENDIENTE DE REGISTRAR EN LA EJECUCIÓN] |
| Versión Android | [PENDIENTE DE REGISTRAR EN LA EJECUCIÓN] |
| Versión Expo Go | [PENDIENTE DE REGISTRAR EN LA EJECUCIÓN] |
| Entorno LAN y URL base local, sin secretos | [PENDIENTE DE REGISTRAR EN LA EJECUCIÓN] |
| Revisiones/versiones del API y servicios locales utilizados | [PENDIENTE DE REGISTRAR EN LA EJECUCIÓN] |
| Release sintética utilizada, si está disponible en la respuesta del API | [PENDIENTE DE REGISTRAR EN LA EJECUCIÓN] |
| Perfil A y perfil B: alias y claves sintéticos distintos | [PENDIENTE DE REGISTRAR EN LA EJECUCIÓN] |

1. Disponer de Android físico y Expo Go compatible con el proyecto Expo SDK 57.
2. Preparar el API local y su release sintética en PostgreSQL/pgvector. Para los
   casos documentales, disponer del Ollama y modelos ya configurados por el proyecto.
3. Configurar la URL base según [Mobile](../../mobile/README.md): teléfono y PC
   en la misma LAN privada, API accesible desde el teléfono. No exponer a Internet
   ni registrar credenciales o connection strings.
4. Seleccionar dos perfiles sintéticos disponibles como A y B. Mantener la misma
   sesión durante los casos que dependan del perfil A; la sesión vive en memoria.
5. Ejecutar MV-01 a MV-12 en orden y conservar la conversación de MV-04/05/06 para
   MV-10. Crear otra conversación exclusivamente desechable para MV-11. Volver al
   perfil A antes de MV-13/14 y usar una conversación desechable distinta por caso.
6. Para MV-13/14, mantener Expo Go abierto y evitar recargar la app: el estado
   incierto también vive en memoria. Interrumpir únicamente la conexión del teléfono
   a la LAN; mantener el backend operativo en MV-14. Restaurar la LAN antes de
   comprobar el estado. El cliente tiene timeout de 90 segundos; esperar a que
   termine el envío o se manifieste el fallo de red antes de continuar.

## Matriz de casos obligatorios

Todos los casos están pendientes; las siguientes expectativas son criterios
previos y no observaciones. Registrar cada paso y cualquier desviación.

### MV-01 — Arranque y perfil

**Precondición:** servicios locales disponibles; app abierta desde un arranque nuevo.

**Pasos:** abrir BanuChat en Expo Go; recorrer la introducción con Continuar/Comenzar
o acceder con Omitir; llegar al selector; esperar los perfiles sintéticos; elegir A;
pulsar Continuar y entrar a Home.

**Esperado:** flujo completo sin error, lista cargada y perfil A visible en Home.

### MV-02 — Recuperación de carga de perfiles

**Precondición:** selector accesible; posibilidad de detener y restaurar el API local.

**Pasos:** dejar temporalmente indisponible el backend antes de entrar al selector
(desde Home, Cambiar perfil); intentar cargar; observar el error; restaurar el
backend; pulsar Reintentar; seleccionar A para los casos siguientes.

**Esperado:** error controlado “No fue posible cargar los perfiles” y lista
recuperada con Reintentar, sin reiniciar la app.

### MV-03 — Home y navegación principal

**Precondición:** perfil A activo en Home.

**Pasos:** abrir Calendario, Progreso, Anuncios e Historial, uno por uno; comprobar
el título correspondiente y volver a Home mediante Inicio en cada pantalla.

**Esperado:** las cuatro rutas abren la pantalla correcta y permiten retornar a Home.

### MV-04 — Crear conversación

**Precondición:** Home con perfil A y API disponible.

**Pasos:** pulsar Iniciar conversación en “Pregúntale a Banu”; esperar la apertura
y carga de Chat; observar la bienvenida, sugerencias y campo de mensaje.

**Esperado:** conversación creada, estado vacío “Bienvenida de Banu” y chat
operativo. La bienvenida local no se considera un turno persistido.

### MV-05 — Fast path de progreso

**Precondición:** conversación de MV-04 lista, con perfil A.

**Pasos:** introducir exactamente “¿Cuál es mi progreso?” y enviarlo una sola vez;
esperar la respuesta; revisar el contenido y expandir las fuentes disponibles.

**Esperado:** respuesta válida con información de progreso, sin error y con
representación de citas estructuradas cuando corresponda al contrato actual
(por ejemplo, perfil/progreso). No exigir citas documentales en este caso.
Mobile no inspecciona internamente el router ni SQL; la UI por sí sola no demuestra
la ruta interna seleccionada.

### MV-06 — Document RAG y citas

**Precondición:** misma conversación, servicios documentales locales disponibles.

**Pasos:** enviar una sola vez “¿Qué información debo incluir al reportar una
incidencia?”; esperar la respuesta; desplegar sus fuentes, observar al menos una
fuente de tipo Documento y volver a colapsarlas.

**Esperado:** respuesta del asistente, al menos una cita documental visible y
expansión/colapso funcional. No exigir `artifact_url` ni apertura del documento:
las citas RAG actuales pueden tener `artifact_url=null`. Conservar esta conversación
para MV-10. No exigir texto generado literal ni evaluar calidad con RAGAS.

### MV-07 — Calendario

**Precondición:** perfil A activo; volver a Home y abrir Calendario.

**Pasos:** recorrer Todos, Sesiones, Cierres y Generales; esperar la carga de cada
filtro y revisar las categorías de los eventos visibles; volver a Todos.

**Esperado:** cada filtro responde sin error, mantiene su selección y la UI sigue
operativa. Los resultados visibles corresponden a la categoría seleccionada;
“Sin eventos” es válido cuando no hay datos en la ventana de próximos 30 días.
Las horas se presentan como hora de Bogotá. No se exigen conteos exactos de J3
ni de otra release; cualquier conteo registrado será solo una observación.

### MV-08 — Progreso

**Precondición:** perfil A activo; abrir Progreso desde Home.

**Pasos:** recorrer Todos, Inscritos, En progreso y Completados; esperar cada
carga; revisar el perfil visible, estados y porcentajes; volver a Todos.

**Esperado:** filtros funcionales, progreso presentado sin error para A, estados
visibles correspondientes al filtro y porcentajes legibles. “Sin cursos” es válido
si el filtro no tiene datos. No fijar conteos particulares como regla de producto.

### MV-09 — Anuncios

**Precondición:** API disponible; abrir Anuncios desde Home.

**Pasos:** recorrer Vigentes, Próximos, Vencidos y Todos, esperando cada carga;
volver a Vigentes y luego a Todos para comprobar nuevamente el acceso.

**Esperado:** los cuatro filtros cargan sin estado de error; los estados visibles
corresponden al filtro, y Todos funciona y permite mostrar cualquier estado.
“Sin anuncios” es válido si no existen datos. Este caso protege expresamente
la regresión M7.1.1: Todos DEBE funcionar, sin aceptar un error como lista vacía.
Su parámetro REST actual es `temporal_status=all`.

### MV-10 — Historial: listar y abrir

**Precondición:** conservar la conversación de MV-04/05/06; perfil A activo.

**Pasos:** ir a Home y abrir Historial; localizar la conversación previa usando
su fecha/hora y referencia anotadas durante la ejecución; abrirla; comparar los
mensajes con MV-05/06 y desplegar sus fuentes.

**Esperado:** la conversación aparece, corresponde a A y conserva los mensajes
y citas, incluido el turno documental. No confundir conversaciones de otros casos.

### MV-11 — Historial: borrado

**Precondición:** crear desde Home una conversación distinta, DESECHABLE, e
identificarla por su fecha/hora. No usar la conversación conservada para MV-10.

**Pasos:** abrir Historial; pulsar Eliminar en la conversación desechable;
confirmar Eliminar en el diálogo; volver a Home y reabrir Historial.

**Esperado:** la conversación desaparece y continúa ausente al recargar Historial;
la aplicación permanece estable y las conversaciones conservadas siguen visibles.
No borrar evidencia o conversaciones que se quieran conservar.

### MV-12 — Sesión de demostración

**Precondición:** A activo, B disponible y ningún envío en curso.

**Pasos:** desde Home pulsar Cambiar perfil; comprobar retorno al selector;
seleccionar B y Continuar; verificar el nuevo alias en Home y Progreso. Volver a
Home, pulsar Cerrar sesión demo; comprobar el selector y seleccionar A de nuevo.

**Esperado:** ambas acciones devuelven al selector y el contexto visual cambia al
perfil seleccionado. Esto verifica sesión demo local en memoria, NO autenticación.

### MV-13 — Envío incierto sin turno visible

**Precondición:** A activo, conversación desechable cargada y sin envío pendiente.
Anotar su estado previo y un texto sintético no vacío.

**Pasos:** escribir el texto; cortar la conexión del teléfono antes de que el POST
pueda confirmarse y pulsar Enviar una sola vez; esperar “Resultado del envío sin
confirmar”; restaurar la red; pulsar Comprobar estado. Si no aparece el turno,
observar Comprobar de nuevo y Continuar de todos modos. Pulsar Continuar de todos
modos, cancelar el diálogo y comprobar que sigue protegido; abrirlo otra vez y
confirmar Continuar. No volver a pulsar Enviar durante la observación.

**Esperado:** sin turno visible, no hay retry automático, el chat permanece
protegido y aparecen ambas acciones. Continuar exige confirmación; cancelar
conserva la protección; confirmar desbloquea SIN enviar automáticamente y conserva
el texto. Comprobar consulta historial, no reenvía el POST.

Si el turno sí aparece, el intento no reprodujo la condición de MV-13: registrar
el timing y dejar el caso BLOCKED si no pudo reproducirse. No aceptar el resultado
de MV-14 como PASS de MV-13. Si se observa la condición y falla una expectativa,
registrar FAIL.

### MV-14 — Envío procesado con respuesta HTTP perdida

**Precondición:** A activo, nueva conversación desechable lista, backend y Ollama
operativos. Mantener el backend conectado durante el corte del teléfono.

**Pasos:** enviar una sola vez “¿Qué información debo incluir al reportar una
incidencia?”; permitir que la solicitud alcance al backend; cortar conectividad del
teléfono antes de recibir la respuesta; esperar el estado incierto; restaurar la
red; pulsar Comprobar estado. Si aún no aparece el turno, esperar y usar Comprobar
de nuevo manualmente, registrando cada intento, sin volver a enviar.

**Esperado:** cuando el backend ya persistió user + assistant, el historial
reconcilia el turno, muestra ambos mensajes (y sus citas), desbloquea el chat y
no ejecuta otro POST. El texto enviado se limpia tras la reconciliación.

La reproducción exacta depende del timing de red: respuesta recibida normalmente
o turno que nunca llegó al backend no reproducen este escenario. Si no puede
reproducirse, registrar BLOCKED y la condición observada; no modificar timeout,
código ni contratos para forzarlo. Si la condición se reproduce y el comportamiento
es incorrecto, registrar FAIL.

Para MV-13/14, registrar el momento del corte/restauración y las acciones manuales.
La ausencia de otro POST debe sustentarse con un registro de solicitudes del API
local si está disponible, sin payloads privados ni secretos. Si solo se observa UI,
declarar ese límite: ausencia de duplicados visibles no demuestra ausencia de POST.
Si no puede verificarse esa expectativa, registrar BLOCKED; no atribuir garantía
de idempotencia durable ni procesamiento exactamente una vez.

### MV-15 — Smoke visual/accesibilidad básica M7.3

**Precondición:** servicios disponibles y perfil seleccionado.

**Pasos:** recorrer selector de perfiles, Home, Chat, Calendario, Progreso,
Anuncios e Historial. Desplazar contenido y barras horizontales de filtros cuando
sea necesario; abrir el teclado en Chat y después cerrarlo. Pulsar filtros y
acciones principales sin borrar conversaciones conservadas.

**Esperado:** ningún control importante cortado o inaccesible, ausencia de overlays
inesperados, filtros y acciones principales pulsables, texto principal legible y
layouts funcionales tras los cambios de touch target M7.3. Es observación visual y
táctil básica en el dispositivo registrado; no acredita cumplimiento WCAG.

## Criterios y registro posterior

| Estado | Criterio |
| --- | --- |
| PASS | Resultado esperado observado y sustentado para el caso completo. |
| FAIL | Resultado esperado no observado una vez reproducidas las precondiciones. |
| BLOCKED | No fue posible ejecutar o verificar el caso por una condición externa o de entorno; registrar la causa. |

No convertir BLOCKED en PASS. Un M7.4 completamente exitoso requiere que todos
los casos obligatorios ejecutables sean PASS. Si hay BLOCKED, conservarlos como
tales y decidir posteriormente si deben repetirse; el reporte no debe declarar
cobertura completa de los 15 casos. Un FAIL requiere registrar la desviación y no
ajustar este instrumento después de verla.

El futuro archivo independiente registrará por caso: ID, precondiciones reales,
pasos ejecutados, resultado observado, PASS/FAIL/BLOCKED, causa de bloqueo o fallo,
referencias a evidencia realmente capturada y límites. Si no hay capturas/logs,
declarar observación manual; no inventarlos. Registrar repeticiones por separado
con su motivo y conservar el primer resultado. No presentar conteos de esta muestra
técnica como tasas de éxito de usuarios o métricas poblacionales.

## Qué no mide M7.4

M7.4 no mide SUS, satisfacción, facilidad de uso percibida, aceptación,
accesibilidad WCAG formal, rendimiento estadístico, seguridad institucional,
autenticación, producción, escalabilidad, Agent/ReAct, MCP, N8N ni RAGAS.
Tampoco sustituye una evaluación formal con usuarios o prueba el despliegue final.

## Fuentes de preparación

- [Estado general](../../README.md) y [Mobile](../../mobile/README.md).
- [Índice de evaluación](../README.md) e [integración](../integration/README.md).
- [J3 histórico](../integration/results/j3-checkpoint-2026-10-03.md), conservado sin cambios.
- Pantallas `mobile/src/app/{index,profiles,home,chat,calendar,progress,announcements,history}.tsx`
  y clientes `mobile/src/api/{profiles,conversations,messages,calendar,progress,announcements}.ts`.

Los pendientes que J3 declaraba en su revisión no describen automáticamente la
revisión actual: este plan usa los flujos móviles posteriores inspeccionados y no
reescribe ni reutiliza los resultados de J3 como evidencia M7.4.
