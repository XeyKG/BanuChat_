# WEB-02-RESUMED — funcionalidades y navegación web

Fecha: **2026-10-31**, America/Bogota. Base: `d71c1197c90c0c062f409b93f72018469b569210`.
Árbol inicialmente limpio. Estado: **BANUCHAT_WEB_02_BROWSER_VALIDATED**.
Alcance: **Edge 150.0.4078.48 headless**, Windows y servicios locales existentes.
Es validación automatizada en este entorno, no compatibilidad universal ni una
validación humana con estudiantes.

## Estado reutilizado y cambios necesarios

El commit base ya incluía los siete archivos WEB-02 preservados durante el trabajo
RAG. Se conservaron; no se revirtió ni reconstruyó su implementación. La navegación,
las pantallas auxiliares, los adaptadores REST, los filtros y las vistas OE2 ya
existían. La política RAG mejorada se utilizó tal como estaba.

Se completaron ajustes acotados:

- Sidebar desde 1024 px y menú compacto debajo, con sección activa, capacidades,
  creación explícita de conversación, regreso al chat abierto/historial y logout.
  El foco pasa al contenido al navegar; Escape cierra el menú y devuelve el foco.
- Edge demostró que volver a una ruta podía remontar el chat y perder el borrador.
  `use-chat-state.web` conserva mensajes, borrador, carga, envío y reconciliación
  en una caché de memoria por sesión/conversación. La invalidación de AuthSession
  borra también referencias retenidas y descarta resultados tardíos. No hay
  almacenamiento persistente ni reenvíos. Se deduplican mensajes por ID al recibir
  la respuesta de un POST que coincidió con una nueva lectura del historial.
- El adaptador nativo del hook conserva `useState` local. Los ajustes compartidos
  de chat/historial mantienen las acciones nativas y se verificaron con typecheck,
  pruebas pertinentes y exportación Android; no hubo prueba física nueva.
- Calendario web permite elegir 30 días desde una fecha civil y regresar a Hoy.
  Valida el calendario real, incluida la fecha inválida 2026-02-30, y mantiene las
  horas de eventos en America/Bogota. Android conserva su intervalo habitual.
- Publicaciones OE2 y Banu al día usan hasta 960 px en web; búsqueda y controles
  se adaptan a anchuras pequeñas. Progreso conserva dos columnas en escritorio;
  se corrige una llamada condicional al hook de dimensiones.

La navegación representa las capacidades de `/auth/me`. En el contrato actual las
cuentas Unified del ensayo reciben las seis capacidades completas; no se creó un
rol restringido ni se alteró el backend para simular otro. La regresión de sesión
rechaza respuestas de capacidades incompletas.

## Resultados en navegador

El recorrido **Login → Inicio → Progreso → Calendario → Anuncios → Publicaciones
OE2 → Banu al día → Chat → Historial → Logout** se ejecutó con REST real. Las
comparaciones de contenido se realizan en memoria, sin exportar conversaciones
o documentos CCD a la evidencia.

| Comprobación | Resultado observado |
| --- | --- |
| Login | Rechazo visible de credencial incorrecta; 503 de login simulado solo en pestaña; login real mediante Enter; capacidades y Home reales. |
| Progreso | Cinco cursos de la cuenta A; estados y porcentajes coinciden con REST; tres filtros. Error, vacío y carga controlados para comprobar sus vistas; reintento explícito. |
| Calendario | 22 eventos de demostración en la consulta anual; periodo visible de 30 días, evento/horario real de Bogotá, filtros, fecha inválida rechazada, futuro vacío y recuperación explícita de error controlado. |
| Anuncios | Ocho registros auxiliares reales; filtros temporales, búsqueda positiva y vacía, error controlado y reintento. |
| Publicaciones OE2 | Dos filas de programación, convocatorias y novedades, búsquedas y filtros temporales; origen/versión y fechas civiles verificadas. Fallo opcional 503 controlado y recuperación sin tocar la fuente. |
| Banu al día | Comparación real: 0 añadidos, 1 modificado, 0 retirados y 5 sin cambios. Categorías/tipos, campos Antes/Ahora y filtros vacíos. Ausencia de predecesora y fallo de fuente probados con respuestas de prueba en la pestaña. |
| Responsive y teclado | Seis pantallas auxiliares a 1366, 768 y 390 px sin desbordamiento horizontal raíz; sección activa única, Enter, Tab y Escape con retorno del foco. Capturas revisadas de escritorio y tamaños pequeños. |
| Borrador y envío | Texto sin enviar conservado tras Inicio → Chat y tres cambios de tamaño; cero mensajes guardados antes de enviarlo. Navegar durante el POST no repite el envío. |
| Chat documental | Una consulta temática real de IA Generativa, respuesta con dos fuentes, apertura del visor autenticado y reapertura desde historial. No se repitieron las 24 preguntas de diagnóstico. |
| Capacidades del chat | Petición de descuento rechazada por el backend vigente, sin modificar RAG para la prueba. |
| Aislamiento | Cuenta B: GET y DELETE de la conversación nueva de A devuelven 404; el listado de B la excluye; acceso anónimo 401. Tras logout y login B no se muestra la consulta de A y Progreso se vincula al perfil B. |
| Regresiones WEB-01 | 409 controlado bloquea el chat; pérdida de red controlada conserva incertidumbre al navegar; comprobación de historial sin reenvío. Cancelar borrado produce cero DELETE; confirmar uno elimina exclusivamente el chat nuevo vacío del ensayo. |
| Sesión invalidada | Revocación explícita de la sesión propia de B en el servidor, seguida de 401 real en la UI y mensaje de sesión expirada. No se esperaron quince minutos para simular vencimiento temporal. |
| Recarga y privacidad | La recarga descarta acceso/borrador, seis rutas protegidas no muestran datos y `/notifications` responde 404. localStorage, sessionStorage, IndexedDB, Cache Storage y cookies vacíos; sin credenciales/tokens/consulta observados en consola. |

El resumen de Banu al día muestra los registros sin cambios mediante su contador;
el contrato no devuelve tarjetas individuales para ellos. No se inventaron altas,
retiradas ni publicaciones para hacer más visible la comparación.

## Evidencia e incidencias

Evidencia privada depurada: `%LOCALAPPDATA%/BanuChat/web-02/`, con ACL restringida
al usuario, fuera del repositorio y OneDrive. No se guardan contraseñas, tokens,
DOM de chats/documentos/historial/login ni capturas de esas pantallas. Solo hay
capturas auxiliares y metadatos/comprobaciones saneados.

- `43eae1e7-8957-445f-8353-ae825ef2e4a7`: incidencia del evaluador, que intentó
  enviar con Enter sin reintroducir la contraseña borrada tras el 503 simulado.
  Se corrigió el ensayo; no se alteró el login para retener contraseñas.
- `3f468ad8-a0d6-461b-b028-8f211ce1f3d0`: credencial rechazada y 503 acreditados;
  detecta la pérdida real del borrador. Se corrigió el estado web y se volvió a
  exportar antes de revalidarlo.
- `4fe1a677-fbb8-4883-a4dc-cc0e8ebef500`: recorrido completo y controles hasta
  logout/cambio de cuenta acreditados con la caché corregida. La auditoría posterior
  se detuvo porque esperaba Login al abrir `/notifications`, aunque el proxy
  deliberadamente devuelve 404. Se conserva el informe original con estado FAILED;
  no se lo reetiqueta como una pasada sin incidentes.
- `d3bbf5f8-f46d-4caf-b4d7-eaaea7ebbe18`: repetición **solo** de recarga/privacidad
  con la expectativa correcta, resultado `WEB_02_PRIVACY_CHECKS_PASSED`.
  `acceptance.json` consolida **19 comprobaciones acreditadas**, con referencias
  y hashes de los informes originales y de código/bundles. Es una aceptación
  agregada, no la afirmación de una única pasada completa sin incidentes.

Las sesiones observadas se verificaron y cerraron usando el contrato existente;
la pasada principal registra dos revocaciones de limpieza y dos accesos ya
inactivos, sin revocaciones inciertas. La auditoría final también limpió su sesión.
Los cuatro perfiles Edge desechables propios se eliminaron tras cerrar los
procesos, verificando las rutas. Las conversaciones propias con mensajes de
ensayo se conservan; solo se borró la conversación nueva vacía cuya identidad
se comprobó antes de ensayar cancelar/confirmar.

503, vacío de Progreso, latencia, 409, fallo de red y ausencia de predecesora son
controles del navegador. No acreditan una caída real de PostgreSQL/OE2 ni una
publicación adicional. La generación y fuentes positivas proceden de la API real.

## Pruebas y compilación

Desde `mobile`, realmente ejecutado:

- `npm run typecheck`: **PASS**.
- Diez archivos focales de sesión/CCD/OE2/notificaciones y caché web:
  **39/39 PASS**, sin fallos ni saltados. La caché comprueba borradores separados,
  incertidumbre, limpieza al cambiar sesión y rechazo de actualizaciones tardías.
- `npm run web:test`: **PASS**, una prueba compuesta del proxy con backend de
  prueba local, sin modificar el proxy.
- Typecheck estricto explícito de los dos evaluadores `.mts`: **PASS**.
- `npm run web:export`: **PASS**, 15 rutas; bundle final
  `entry-b54746da7fa067b6b0e24a2b227cc9c7.js`. Ausentes los marcadores nativos
  de refresh/SecureStore comprobados.
- Expo export Android con Hermes: **PASS**, 1671 módulos, bundle
  `entry-d24b7e1d8c742c15facb8f905817ae78.hbc`. Conserva SDK 57 y canal USB;
  usa `TEMP`/`TMP` en `.expo/web02-hermes-temp`, como el procedimiento WEB-01.
  El marcador web `web-main` no aparece en el HBC. No es APK, Gradle ni ejecución
  física Android; no se generaron proyectos `android/` o `ios/`.
- `git diff --check`: **PASS** al cierre; alcance revisado sin cambios de backend,
  corpus, esquemas, modelos, N8N o contratos.

No se ejecutaron RAGAS, OE1, pruebas Android completas ni otra evaluación semántica.

## Servicios, archivos y cierre

Se reutilizó la API mejorada, PID **22984**, loopback **3004**, sin reiniciarla.
El preflight observó PostgreSQL/Ollama/OE2/N8N disponibles y una incidencia de
salud/identidad en el listener Metro de 8084. No se tocó ese listener; no es
necesario para exportar y servir el artefacto web ni para exportar Hermes.
La prueba física Android queda fuera de este cierre.

El servidor/proxy existente se inició en **127.0.0.1:8085**, PID **21692**, y se
detiene al finalizar la validación. No se alteran los servicios compartidos.
Arranque posterior: desde `mobile`, `npm run web:export` y `npm run web:serve`;
abrir **http://127.0.0.1:8085/login**. Las credenciales existentes se entregan por
el canal privado del operador. Véase [web local](../operations/web-local.md).

Archivos modificados en esta reanudación:

- `mobile/src/components/web-frame.web.tsx`: navegación y foco.
- `mobile/src/app/chat.tsx`, `history.tsx`: conservación del chat/navegación web;
  adaptación compartida comprobada sin rediseñar el flujo nativo.
- `mobile/src/session/use-chat-state.ts`, `use-chat-state.web.ts`,
  `web-chat-cache.ts`: estado por plataforma y memoria de sesión web.
- `mobile/src/app/calendar.tsx`: periodo civil web; `progress.tsx`: hook de tamaño.
- `mobile/src/app/oe2.tsx`, `oe2-changes.tsx`: distribución adaptable de escritorio.
- `mobile/test/web-chat-cache.test.ts`: regresiones del nuevo estado.
- `mobile/scripts/check-unified-web-browser.mts`, `unified-web02-journey.mts`:
  harness reutilizado, recorrido WEB-02 y custodia/limpieza de evidencia.
- `mobile/README.md`, `docs/operations/web-local.md` y este checkpoint.

Se conservan los archivos previos de anuncios, `_layout` y `screen-header` sin
reconstruirlos. No se modificaron RAG, corpus/releases/snapshots, Agent/MCP,
workflows N8N, SQL/roles, contratos REST, credenciales o cuentas ajenas. Solo hubo
operaciones funcionales de autenticación/chat autorizadas por el ensayo.
Sin commit, push, web push, Admin, despliegue público ni inicio de WEB-03.
