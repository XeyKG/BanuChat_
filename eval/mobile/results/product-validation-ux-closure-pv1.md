# PV-1 — Technical dry-run & operational freeze readiness

## Referencia posterior PV-1B — 28/10/2026

[PV-1B](product-validation-ux-closure-pv1b.md) verificó por separado el launch legacy
SDK 57, T02/T03 focales y una pasada limpia T01–T05. Este informe PV-1 conserva
su BLOCKED histórico y sus incidencias; no se reescriben sus resultados. La
verificación posterior del canal no completa freeze ni habilita reclutamiento.

28 de octubre de 2026, America/Bogota. BanuChat.

**PV-1 BLOCKED — TECHNICAL DEFECT BEFORE HUMAN STUDY: el overlay Tools de la development build intercepta navegación del instrumento.**

T01–T05 se completaron técnicamente en Android físico, primero por componentes y
luego una vez en orden. Se necesitó pulsar el extremo descubierto de controles
que Tools tapa. Esto acredita funciones ejecutables, pero impide cerrar como
limpio el canal previsto para una ejecución sin ayuda del operador. El hallazgo
es del entorno de development build; no demuestra un defecto del código de
negocio. Se clasifica SHOULD_FIX_BEFORE_STUDY y no se corrigió en PV-1.
La condición solicitada para COMPLETE —ningún defecto que deba corregirse— no
se cumple. No se transforma esta ejecución con workaround en aceptación humana.

Cero participantes, reclutamiento, consentimientos obtenidos, SUS, entrevistas o
datos humanos. El operador técnico conoce las soluciones; no representa P01.

**PENDIENTE DE CONFIRMACIÓN POR EL RESPONSABLE ACADÉMICO: procedimiento/revisión aplicable antes del reclutamiento**

Consentimiento: **DRAFT — NOT APPROVED FOR USE**.

## A. Baseline

- HEAD esperado y observado: `b4430e48339908a4ecccde615299c48ab57d8c34`.
- Branch `main`; `git status --porcelain=v1 --untracked-files=all` inicial vacío.
- Inicio registrado: 2026-10-28 15:20:13 UTC. AGENTS.md leído completo.
- Sin delta posterior de commits, cambio de branch, commit ni push.
- PV-0 permanece como rebaseline documental; este informe añade observación
  física actual y no reescribe los resultados históricos.
- Evidencia separada, privada e ignorada: `data/ccd/local/product-validation-pv1/`.
  Allí quedan jerarquías saneadas, tres capturas sin credenciales, registros de
  acciones, tiempos técnicos, snapshots y hashes. No se versiona esa evidencia.

## B. Dispositivo, build y red

| Elemento | Observado en PV-1 |
| --- | --- |
| Dispositivo físico | YAL-L21, Android 10, API 29; un dispositivo autorizado, no emulador |
| Package instalado | `com.anonymous.banuchat` |
| Versión nativa | versionName 1.0.0, versionCode 1 |
| APK SHA-256 | `78da868cfeffca095bdd01aba269251d4a5f7367d88a940e52dcb86448ace59c` |
| Instalación/actualización observada | 25/10/2026, 16:24:23; se reutilizó, no se reconstruyó |
| Proyecto servido | Mobile 1.0.0; Expo SDK 57, dependencia Expo ~57.0.31; runtime del dev client exposdk:57.0.0 |
| Canal | Development build existente con bundle del proyecto local servido por Metro recién iniciado |
| Modo | `ccd_authenticated`, evidencia `ccd_local`, REST `/api/v2` |
| API | `127.0.0.1:3004/api/v2`, inicio normal `npm start` |
| Metro | loopback IPv4 `127.0.0.1:8084`, script existente `mobile/scripts/start-ccd-auth.ps1` |
| Transporte | USB; ADB reverse 3004 y 8084 durante la ejecución |
| PostgreSQL | Instancia unificada aislada existente, loopback 55463; volumen existente preservado |
| Pantalla | 1080×2340, densidad 480; escala de fuente preexistente 1,15 |

API, Metro y el contenedor estaban apagados inicialmente. Se iniciaron solo los
recursos necesarios y después se restauró ese estado. Metro compiló la app y las
recargas/restauraciones cargaron el proyecto. Los 57 hashes de archivos Mobile
registrados (src, configuración, dependencias y arranque) coinciden al terminar.
Esto acredita coherencia del proyecto JavaScript servido sobre el host nativo
compatible reutilizado; no afirma que el APK se haya compilado en este HEAD.
Sin Expo Go, nueva build firmada, herramientas, SDK o dependencias instaladas.

## C. Cuenta y contexto pseudonimizados

SQL READ ONLY reconfirmó documental current
`10af4ffd-effb-41fc-bbfe-4dc48cb3398f`, ready, `ccd-1.4.0`; CCD 1.3 sigue ready.
Autorización release-specific derivada: 5/5, sin principals adicionales.
Los dos almacenes DPAPI existentes ofrecen cuatro credenciales operativas; dos
contextos vivos cumplen simultáneamente los candidatos T05. No se heredaron las
etiquetas AUX de PV-0 como asignación fija.

Se seleccionó una sola cuenta existente, alias **PV1-TECH-A**, como
`PV-1 TECHNICAL DRY-RUN ACCOUNT`, **NOT_FROZEN_FOR_P01**. No se publica UID,
contraseña, identificador de principal ni relación cuenta→contexto.
La selección y sus fingerprints quedan únicamente en evidencia privada.

Login normal y `/auth/me` devolvieron 200, current CCD 1.4, modo `ccd_local` y
seis capacidades: `chat`, `history`, `progress`, `calendar`, `announcements`,
`documents`. La release auxiliar reconfirmada fue
`af157a78-4c51-49c0-b8cc-509257d89f1e`. Sus endpoints normales confirmaron el
contexto derivado compatible: course-003 completed/100 % y announcement-006 active.
Ningún binding, grant, perfil, credencial o dato auxiliar fue cambiado.

## D. T04 provisional

| Campo | Target técnico observado |
| --- | --- |
| Alcance | **PV1_DRY_RUN_ONLY**, **NOT_FROZEN_FOR_P01** |
| Clave | event-016 |
| Título | Cierre demo: Encuentro informativo del programa demo |
| Fecha/hora Bogotá | 20/11/2026, 18:00 |
| Categoría/filtro | announcement_deadline / Cierres |
| Ventana Mobile del día | 28/10/2026–26/11/2026, inclusiva |
| Selección | Último evento existente visible por fecha en la ventana y límite normal de 20 resultados; título único |

T04 humano continúa **PENDIENTE DE VENTANA DE SESIONES**. No se sustituyó el target
definitivo en la hoja del participante ni se congeló una cuenta P01.

## E. T01 — login y restauración

**SUCCESS técnico**, en componentes y recorrido ordenado. Login ficticio normal,
Home protegido, cierre completo mediante force-stop sin borrar datos y reapertura
de la development build. Home reapareció sin solicitar contraseña. La sesión en
DB fue la misma: refresh rotado y token anterior consumido; no se extrajo
SecureStore ni se fabricó sesión/token. Identidad/contexto se cotejaron en privado.

Evidencia: `restore-component.json`, `restore-walk.json`, jerarquías Home y
restauración. 38,5 s en componentes y 48,1 s en recorrido, solo diagnóstico.

## F. T02 — tres pilares y fuente

**SUCCESS funcional técnico con interferencia de navegación del canal** en ambas
pasadas. Se introdujo y envió exactamente una vez por conversación:

> ¿Cuáles son los tres pilares de Competencias Digitales?

Respuesta observada: Competencias Digitales Básicas, Analítica y Contenido Digital,
y Tecnologías Transformativas. Se expandió «1 fuente», apareció `route:structure`,
se abrió «Abrir documento» y el visor nativo presentó el texto de la fuente.
El contenido admite scroll; se volvió al chat conservando pregunta, respuesta y
fuente. No se probó selección/copia del texto ni se declara esa capacidad validada.

La evidencia HTTP auxiliar de cada conversación confirma cita con release CCD 1.4,
artifact 200, versión `bch-ccd-knowledge-2` y SHA-256 igual al registrado en DB.
No se sustituye con ello la observación física del visor, que también se ejecutó.

Una pulsación central de «Volver» abrió realmente Tools. Se cerró su menú y se
pulsó la zona izquierda del control, fuera de la superposición, para continuar.
No se ocultó el overlay ni se cambió producto. La fuente y el botón de apertura
siguen siendo localizables; el nombre técnico por sí solo no se declara mala UX.

Evidencia: `T02-backend-component.json`, `T02-backend-walk.json`, jerarquías de
respuesta/fuente/visor/regreso, `screens/focal-chat.png` y `screens/focal-document.png`.
210,0 s en componentes y 47,0 s en recorrido; incluyen instrumentación.

## G. T03 — historial

**SUCCESS funcional técnico con workaround del canal**, en ambas pasadas.
Desde Home se desplazó hasta Historial, se abrió la conversación recién creada
para esa pasada (fecha/hora y dos mensajes), se verificó la misma respuesta y
se volvió a abrir el artifact. No se fabricó contenido para salvar la dependencia
T02→T03 ni se tocó la conversación histórica preexistente.

«Inicio» comparte la zona del overlay; se utilizó el área izquierda descubierta.
Evidencia: jerarquías `component-history-*` y `walk-history-*`.
82,0 s en componentes y 44,0 s en recorrido. La marca inicial de componentes T03
se inició antes de cerrar la incidencia de retorno T02: hay unos 34 s de solape
instrumental; no sumar esos tiempos como duraciones independientes.

## H. T04 — calendario

**SUCCESS técnico**, componentes y recorrido. En Todos se localizó event-016,
20 de noviembre a las 6:00 p. m., bajo el encabezado «hora de Bogotá»; después
se aplicó Cierres y se comprobó que el mismo título, día y hora continuaban visibles.
Las listas se recorrieron con scroll vertical; la barra de categorías es horizontal.

Evidencia: `ui-calendar-target-all.json`, `ui-component-t04-final.json`,
`ui-walk-event-all.json`, `ui-walk-event-filtered.json` y `T04-provisional.json`.
195,3 s en componentes y 32,0 s en recorrido. El primer tiempo incluye diagnóstico
del helper que inicialmente intentó desplazar la barra horizontal, no la lista.
No se atribuye ese error de automatización al producto.

## I. T05 — progreso y anuncios

**SUCCESS técnico**, en el mismo contexto, en ambas pasadas.

- Progreso: «Búsqueda y verificación de información», Completado, 100 %.
  Se desplazó la barra horizontal hasta Completados y se aplicó el filtro;
  el curso y porcentaje siguieron presentes.
- Noticias y novedades: «Actualización de material de orientación», Vigente.
  Cambiar a Próximos mostró otro conjunto; al volver a Vigentes reapareció el target.

Evidencia: `ui-component-course-completed.json`, `ui-walk-course-completed.json`,
jerarquías de anuncios iniciales/Próximos/Vigentes y preflight API.
74,8 s en componentes y 44,4 s en recorrido. No se cambió progreso ni vigencia.

## J. Recorrido completo

Una sola pasada T01→T02→T03→T04→T05, después de comprobar componentes,
sobre el mismo dispositivo/build/cuenta/contexto y con una nueva conversación propia.

| Tarea | Resultado técnico observado | Segundos diagnósticos del operador |
| --- | --- | ---: |
| T01 | SUCCESS; restaura misma sesión | 48,1 |
| T02 | Función completada; retorno requiere zona libre de Tools | 47,0 |
| T03 | Función completada; Inicio requiere zona libre de Tools | 44,0 |
| T04 | SUCCESS, target provisional y filtro | 32,0 |
| T05 | SUCCESS, curso/100 % y anuncio/filtros | 44,4 |

Transcurso total entre marcas: 216,2 s, con llamadas de instrumentación e inspección.
No es velocidad humana, tasa de éxito, completación del protocolo ni dato SUS;
no se compara contra sus límites. Ningún registro del operador entró en CSV humano.
No hubo crash, pérdida de sesión, dato ausente ni divergencia entre las pantallas
observadas. **La navegación sin maniobra técnica no recibe PASS limpio**: el canal
Tools intercepta una acción normal. No se propone todavía freeze final.

## K. Accesibilidad focal

Revisión técnica limitada, sin declarar WCAG ni aceptación humana.

| Aspecto | Observación y límite |
| --- | --- |
| Labels | Jerarquía nativa expone Usuario, Contraseña, Iniciar sesión, Mensaje, Enviar mensaje, Inicio, Volver, fuentes, Historial y filtros con nombres. Hay roles/estados en los componentes revisados |
| Touch targets | Controles principales observados de 132 px de alto equivalen a 44 dp a densidad 480; login 156 px / 52 dp. Tools reduce el área realmente utilizable de navegación. No se declara auditoría completa ni cumplimiento de 48 dp |
| Texto escalable | Se mantuvo la escala ya configurada 1,15. Textos de respuesta, fuente, títulos y tareas se recorrieron mediante scroll. No se ensayaron otros tamaños ni todas las resoluciones |
| Scroll | Home y listas verticales; filtros horizontales, incluido Completados inicialmente fuera de la porción visible; operables al desplazarlos |
| Teclado/input | Login normal y pregunta exacta comprobados. ADB input text rechazó Unicode; se usó Gboard ya instalado para ¿/á, sin enviar una pregunta distinta. SwiftKey original restaurado al terminar |
| Foco | Campo Mensaje recibió foco de entrada y se pudo escribir/enviar. Labels y orden de jerarquía se inspeccionaron. No equivale a recorrido de foco accesible con lector aprobado |
| Loading/error | Se observó carga del host al reabrir y recuperación posterior de Home. No se capturó un spinner de petición ni apareció error de aplicación en T01–T05. No se inyectaron fallos para producir estados de error |
| Contraste configurado | Se inspeccionaron tokens existentes: ink #101223, texto secundario #4B5062, superficies #FFFFFF/#F6F7FA, acento #3B4FE0 y blanco en controles; capturas legibles para inspección del operador. Sin medición exhaustiva de contraste ni afirmación WCAG |

TalkBack estaba instalado y desactivado. Se activó temporalmente el servicio
existente, aparecieron su instructivo y sus controles de salida, y se intentaron
avance de foco/activación. La ventana de BanuChat quedó desplazada por el setup;
el instructivo llegó a indicar «TalkBack está desactivado» aunque los flags de
settings/touch exploration seguían activos. No se logró observar una revisión
válida de T01/T02/Home/navegación con lector. El matcher de servicio del helper no
acredita ni descarta por sí solo su binding. No se diagnostica una causa del producto.

Revisión focal **TalkBack: NOT_EXECUTED — device/accessibility setup unavailable**
(activación/setup intentados, recorrido de aplicación no completado). Sin PASS de
navegación/lectura accesible ni verificación auditiva. Se restauraron enabled=0 y
servicios vacíos. VoiceOver/iOS fuera de PV-1.

## L. Incidencias

1. **Natural, canal físico:** Tools se superpone a Volver/Inicio; pulsación central
   de Volver abrió menú de desarrollo en lugar de regresar. Jerarquía registra
   Tools `[876,156][1032,312]` frente a Volver `[770,176][1020,308]`.
   Capturas muestran la superposición. La maniobra izquierda permite continuar.
2. **Entorno Metro:** arranque informó error opcional al instalar React Native
   DevTools. Metro compiló y el producto funcionó; no se instaló ni reparó nada.
3. **Instrumentación:** input Unicode de ADB rechazado sin envío; helper de scroll
   inicialmente eligió la barra horizontal. Se corrigieron solo helpers privados,
   se verificó el literal antes de enviar y se conservaron los fallos de diagnóstico.
4. **Chequeo auxiliar:** primer verify-chat del recorrido dio TypeError; una
   comprobación manual posterior del mismo recurso pasó 200/SHA. La UI había
   mostrado respuesta y visor. Causa no determinada; no se afirma que sea de red,
   de producto o un error HTTP concreto. Se conserva `ops-command-failure-1.json`.
5. **Setup accesible:** instructivo/estado TalkBack impidió completar el recorrido
   focal. No se inventa PASS ni se convierte automáticamente en defecto Mobile.
6. **Cleanup:** ADB dejó de responder tras detener servicios. Incluso host:version
   expiró; se verificaron PID, ejecutable y listener local antes de detener solo
   ese servidor y arrancar el ADB ya instalado. Luego se verificó el teléfono.
   Los reverses ya estaban vacíos: intentar retirarlos dio error de ausencia,
   seguido de comprobación final satisfactoria. No se borraron datos del dispositivo.
7. **Consulta diagnóstica privada:** el primer agregado final de security_events
   usó created_at, columna inexistente (42703). Se abortó la transacción READ ONLY,
   se usó occurred_at del esquema y la comparación final pasó. Sin DML SQL.

No se inyectó matriz 401/403/409/503 ni se ocultaron estos resultados adversos.

## M. Clasificación de hallazgos

| ID | Clasificación | Decisión |
| --- | --- | --- |
| PV1-01 Tools intercepta navegación | SHOULD_FIX_BEFORE_STUDY | Resolver y verificar el canal de estudio sin superposición antes de freeze. No exige inferir una corrección de mobile/src; no se corrigió aquí. Mantiene bloqueado el cierre técnico del canal |
| PV1-02 route:structure | OBSERVE_DURING_HUMAN_STUDY | No impidió localizar/abrir la fuente; comprender la etiqueta requiere evidencia humana |
| PV1-03 filtros horizontales fuera de vista inicial | OBSERVE_DURING_HUMAN_STUDY | Se alcanzan con scroll; no hay base para declarar fallo de descubribilidad humano |
| PV1-04 TalkBack | NO_ACTION sobre producto; pendiente de setup | Falta acreditar revisión focal con entorno accesible operativo; no aprobar accesibilidad por inferencia |
| PV1-05 DevTools opcional, helpers/consulta y ADB en cleanup | NO_ACTION sobre producto | Incidencias de herramientas separadas; restauración final comprobada |
| PV1-06 TypeError auxiliar | OBSERVE_DURING_HUMAN_STUDY / preflight técnico | Conservar evidencia y reconfirmar transporte antes de sesión; no demostrar ni encubrir un defecto de producto con un chequeo posterior |

No se demostró una función de negocio intrínsecamente imposible
(BLOCKS_HUMAN_STUDY). El bloqueo de cierre PV-1 responde al defecto claro del canal
que sesgaría una ejecución sin ayuda, no a una preferencia del operador.

## N. Cleanup

Logout normal de ambas sesiones nativas, con Login visible y revocación remota
verificada. La sesión auxiliar también hizo logout normal. **3 sesiones creadas,
3 revocadas, 0 activas**. Solo se eliminaron mediante DELETE normal de su owner
las dos conversaciones registradas como fixtures PV-1. La conversación histórica
preexistente quedó preservada; no se borraron security events ni se resetearon tasas.

Snapshots READ ONLY antes/después: **43 tablas**, solo cuatro con cambios:

| Tabla | Antes | Después | Delta normal conservado |
| --- | ---: | ---: | ---: |
| auth_rate_limits | 202 | 211 | +9 |
| refresh_tokens | 128 | 136 | +8 |
| security_events | 237 | 248 | +11 |
| sessions | 102 | 105 | +3 |

Eventos observados: 3 login_succeeded, 3 logout_succeeded, 5 refresh_succeeded;
sin denegaciones ni rate_limited. Las otras 39 tablas conservan conteos y
fingerprints, incluidas conversaciones/mensajes/citas/owners tras DELETE,
cuentas, credenciales, recuperación, bindings/grants, corpus, releases y todos
los auxiliares. Roles, memberships, ACL, funciones y permisos también iguales.
Current documental y auxiliar idénticos; autorización final 5/5.

App cerrada después del logout; ajustes de accesibilidad originales restaurados,
SwiftKey original, fuente 1,15 y reverses vacíos comprobados. API/Metro detenidos
y puertos 3004/8084 sin listener; solo el contenedor PostgreSQL iniciado para PV-1
se apagó de nuevo, puerto 55463 cerrado y volumen intacto. ADB existente quedó
operativo tras su reinicio puntual; no se instalaron herramientas.
Evidencia: `API-cleanup.json`, `snapshot-comparison.json`, `device-restoration.json`,
`environment-restoration.json`, `services-final.json`, `files-final-check.json`.

## O. Freeze readiness

| Categoría | Estado al cerrar PV-1 |
| --- | --- |
| READY_TO_FREEZE | Funciones T01–T05 técnicamente ejecutadas en físico; current/modo/seis capacidades; fuente CCD 1.4; contexto T05 compatible; analyzer y Mobile locales pasan. Reconfirmar todo contra el HEAD/build final |
| NEEDS_SESSION_WINDOW | T04 definitivo y vigencias/ventana de toda la tanda; no usar automáticamente event-016 ni event-012 |
| NEEDS_ACADEMIC_DECISION | Procedimiento/revisión, consentimiento, roles, custodia, retención, retiro y reclutamiento |
| NEEDS_PRODUCT_FIX | Ninguna modificación de código identificada como necesaria por esta evidencia. Sí hay corrección operativa obligatoria del canal Tools (PV1-01), aún pendiente; no confundirla con preferencia UX |
| Pendiente técnico focal | TalkBack sobre la app con setup operativo; esta ejecución no lo acredita |

**No se declara TECHNICALLY READY FOR FINAL FREEZE** mientras persista PV1-01.
No se completó freeze ni se asignó cuenta de participante. Ningún estado técnico
constituye autorización para reclutar.

## P. Puertas externas y comprobaciones

Continúa la puerta académica literal indicada al comienzo y consentimiento draft.
Instrumentos, criterios y umbrales no cambiaron. Los dos CSV humanos mantienen
solo cabecera; cero filas SUS/PIDs y cero participantes. Los cinco SHA-256 de CSV,
hoja del participante, SUS y consentimiento coinciden con el baseline.

| Comprobación realmente ejecutada | Resultado |
| --- | --- |
| `node --test eval/mobile/analyze-human-validation.test.mjs` | 13/13, 0 fail, 0 skip |
| Mobile `npm run typecheck` | PASS, exit 0 |
| Mobile `npm test` | 41/41, 0 fail, 0 skip, una ejecución |
| Android físico | Componentes y una pasada ordenada; hallazgo PV1-01 conservado |
| API/adaptadores y snapshots | Preflight y comparación final PASS; diagnóstico fallido separado en L |

No se ejecutó analyzer con datos humanos, no se crearon participantes ficticios
ni se repitieron suites backend/RAG/MCP, E2E de servicios o matriz de errores.

## Q. Git y scope

Solo se añade este informe y notas breves de precedencia/readiness en PV-0,
freeze-template, checkpoint OE5 y paquete final. Sin cambios de producto,
SQL, corpus, releases, datos auxiliares, contratos, dependencias, analyzer,
fixtures, criterios, hoja del participante, SUS o consentimiento.
Los 57 hashes Mobile y los cinco hashes de instrumentos permanecen iguales.
La evidencia privada está ignorada. Revisión de contenido y valores de credenciales
conocidos: ningún secreto, UID, contraseña, token, serial o mapa cuenta→contexto
añadido a los documentos versionables. `git diff --check` y status final registrados
al cerrar; sin commit, push ni operaciones Git prohibidas.

## R. Siguiente paso

Decidir una tarea separada para eliminar la interferencia de Tools del canal
previsto y reconfirmar navegación representativa; preparar el setup TalkBack
para una revisión focal válida. Después resolver ventana de sesiones, targets y
las decisiones académicas antes de completar el freeze final. PV-1 no aplica la
corrección ni avanza a reclutamiento, SUS humano o cambios de UI. Detenerse aquí.
