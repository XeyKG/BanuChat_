# BanuChat — Mobile con CCD 1.3 current

Fecha: 26 de octubre de 2026, America/Bogota; evidencias UTC del 27 de octubre.
Commit inicial y final: `2802ae5aa7c66eac5680c5af2f0b515d813b636f`.
El árbol inicial estaba limpio. No se hizo commit ni push durante esa etapa.

Actualización del 27 de octubre de 2026: auditoría y corrección focalizada posterior
a `4785ac4b67b23f944adc7b96dd3bf630a3e6b590`. El resumen inicial acreditó de forma
demasiado amplia las nueve consultas: la variante aislada sobre la primera
oportunidad diagnóstica no estaba semánticamente aprobada. Se conserva abajo la
incidencia y su reejecución; los artefactos históricos permanecen intactos.

## Estado de entrega

| Dimensión | Resultado y alcance |
| --- | --- |
| Backend current | `f01c1c37-2d3f-4bc7-8940-fe724eb71c9a`, `ready`, `ccd-1.3.0`; sin promoción ni rollback. |
| VALIDACIÓN TÉCNICA AUTOMATIZADA | Typecheck, lint, 41/41 pruebas locales y cliente unificado pasaron en la etapa Mobile. La auditoría posterior detectó la aclaración innecesaria de una consulta aislada; se corrigió y reejecutó por HTTP y adaptador Mobile el 27 de octubre. |
| VALIDACIÓN EN DISPOSITIVO | Android físico validado por el agente para los recorridos descritos abajo, con capturas privadas y lecturas de jerarquía UI. No es una matriz completa de dispositivos. |
| ACEPTACIÓN HUMANA | Pendiente de revisión del responsable. No participaron estudiantes ni se obtuvo aval CCD. |

## Inventario y arquitectura observada

Se revisaron README/package/configuración, AuthSession/runtime/provider/SecureStore,
contexto de sesión, los adaptadores de conversaciones/mensajes/documentos/progreso/
calendario/anuncios, las pantallas correspondientes, login/onboarding/home,
guardas de navegación/logout, pruebas locales y el evaluador unificado existente.

Se reutiliza Expo SDK 57 + React Native + TypeScript y Expo Router:
pantallas → adaptadores existentes → AuthSession → REST v2. Mobile no accede a
PostgreSQL, MCP ni N8N. Las consultas SQL de auditoría se ejecutaron externamente,
en transacciones de lectura; no se añadieron al producto.

Ya funcionaban: aceptación de current desde `/auth/me`, seis capacidades,
Bearer en recursos/artefactos, refresh serializado, SecureStore nativo, guardas,
historial propio, visor de texto seleccionable, conflicto 409 y reconciliación
de envíos inciertos. No fue necesario cambiar esos contratos ni los adaptadores
de recursos.

## Correcciones y archivos modificados

| Archivos | Cambio necesario |
| --- | --- |
| `mobile/src/app/_layout.tsx` | La clave del Stack cambiaba durante login y desmontaba el formulario, perdiendo campos/estado de error. Ahora permanece estable mientras está signed out y cambia al autenticar/cerrar sesión. El borrado de navegación protegida se mantiene. |
| `mobile/src/config/demo-mode.ts` | Aviso CCD sin negación global de vigencia; cuenta de demostración, ausencia de aval y alcance ficticio auxiliar explícitos. Aviso auxiliar reutilizable. |
| `mobile/src/app/home.tsx`, `chat.tsx` | Aviso visible y bienvenida que explica documentación, fuentes, historial y capacidades auxiliares de demostración. Se conservan sugerencias compatibles. |
| `mobile/src/app/progress.tsx`, `calendar.tsx`, `announcements.tsx` | Aviso de datos ficticios. Calendario deja de mostrar el UUID de release, incluso como etiqueta de accesibilidad. Los adaptadores conservan la separación entre releases. |
| `mobile/src/app/index.tsx` | Onboarding identifica progreso/calendario como demostración, sin expediente académico real. |
| `mobile/scripts/start-ccd-auth.ps1` | Arranque IPv4 localhost en 8084 para ADB reverse; development build existente por defecto, Expo Go compatible mediante `-ExpoGo`. No instala ni genera builds. |
| `mobile/scripts/evaluate-unified-client.mts` | Expectativa explícita de current solo en evaluación; comprueba modo/capacidades, elimina su propia conversación, exige logout confirmado y escribe evidencia privada sin sobrescribir el antecedente histórico. |
| `mobile/test/ccd-presentation.test.ts` | Tres regresiones: alcance de avisos, current arbitrario independiente del contexto auxiliar y estabilidad de navegación con transiciones reales de AuthSession. |
| `mobile/README.md` | Separa aplicación unificada vigente de antecedentes y documenta configuración USB, fuentes, sesión y límites actuales. |
| Este informe | Resultado reproducible y límites de aceptación. |

En la etapa Mobile original no se cambió package.json, SDK, lockfiles, backend, SQL, corpus, bindings,
embeddings, contratos REST/MCP ni documentos originales.

## Configuración y preflight

Modo `ccd_authenticated`; base `http://127.0.0.1:3004/api/v2`;
canal `adb_reverse`; Metro IPv4 `127.0.0.1:8084`; telemetría Expo desactivada.
Se configuraron reverses USB de 3004 y 8084. API y Metro permanecieron en loopback.
Las cuentas de ensayo se leyeron por el mecanismo privado DPAPI existente.
No se reprovisionaron ni cambiaron contraseñas.

`/auth/me` autenticado devolvió el current esperado, `evidence_mode=ccd_local`
y `chat/history/progress/calendar/announcements/documents`. El UUID solo figura
como expectativa del evaluador, no como lógica de selección de release en la app.
Las nuevas conversaciones de adaptadores y dispositivo usaron current.

Dispositivo autorizado único: modelo YAL-L21, Android 10, 1080 × 2340.
Se utilizó el development build ya instalado `com.anonymous.banuchat`, versión
1.0.0, cargando el proyecto SDK 57. Expo Go instalado era 58.0.5 y mostró
incompatibilidad con SDK 57; no se usó para dar por aprobada la ejecución.
No se instaló/desinstaló software ni se generaron carpetas nativas.

## Resultados funcionales

| Área | Evidencia y resultado |
| --- | --- |
| Auth válida/inválida | HTTP real mediante AuthSession y login nativo real. Tras la corrección, el error de credenciales inválidas permanece visible; login válido abre home. |
| Persistencia | Revisión de código: access solo en memoria, refresh solo mediante expo-secure-store, password no persistido. Reinicio real de la app restauró sesión y produjo un refresh real en el backend. No se extrajo SecureStore. |
| Refresh/401/logout | Adaptador real: refresh con reloj del cliente adelantado, access anterior rechazado, 401 real tras revocación invalida estado/almacenamiento, cambio de principal y logout confirmado. El reloj del servidor no cambió. En dispositivo se comprobaron cambio de cuenta, logout y reinicio sin recuperar contenido protegido. |
| Chat | Conversación vacía, envío único, user/assistant, texto largo y multilínea, scroll, citas y abstención. Pregunta de seguimiento nativa sobre la nota mínima respondió 70 %. Una consulta adicional RAG permitió observar y capturar el indicador de escritura/carga. |
| Historial | Lista propia y reapertura tras reiniciar la app: conversación nativa con 18 mensajes. Las respuestas y citas se restauraron. Una cuenta distinta no pudo cargar el histórico ajeno y la UI no mostró sus mensajes. |
| 409 histórico | GET real del propietario sobre release anterior; POST real devolvió conflicto tanto en adaptador como en dispositivo. La UI conserva historial, explica posibilidades sin atribuir una causa definitiva y ofrece crear una conversación nueva. Esa acción creó un chat vacío en current, sin trasladar mensajes. |
| Fuentes | Tres UUID distintos desde tres respuestas: prueba diagnóstica, umbral y primera oportunidad gratuita. Descargas reales v2 con Bearer y SHA coincidente con los recibos aprobados previos. Etiquetas naturales; sin claim IDs, SHA ni rutas locales en los casos solicitados. |
| Visor | Tres fuentes abiertas mediante UI, texto plano legible, scroll y selección de texto comprobados. No hay WebView ni intérprete HTML. 404 real, retry explícito y error de red nativo; restaurar el túnel y pulsar Reintentar recuperó el documento. |
| Límite documental | Se conserva 1.000.000 caracteres. El adaptador rechazó una respuesta controlada de 1.000.001; no se fabricó un artefacto grande en current. Este caso no se ejecutó como descarga grande nativa. |
| Auxiliares | Progreso, calendario y anuncios respondieron por adaptadores reales y se abrieron en Android. La release estructurada es distinta de la documental y no impide el uso. Avisos ficticios visibles, sin UUID técnico en calendario. |
| Navegación | Login/home/chat/historial/documentos/auxiliares reales. Tras logout, atrás y un enlace a una ruta protegida no recuperan datos; se muestra login. Cambio de cuenta cambia la identidad visible. |

### Nueve consultas solicitadas

Se ejecutaron literalmente en conversaciones independientes desde los adaptadores.
En Android se introdujeron sus equivalentes mediante ADB/IME, que aplicó tildes y
autocorrecciones. La auditoría posterior encontró una inconsistencia que el resumen
inicial no había reflejado: en conversación vacía, «¿La primera oportunidad
diagnóstica es gratuita?» pidió «¿A qué curso, prueba o procedimiento te refieres?
Necesito ese antecedente para orientarte.». Durante Android, después de establecer
el tema diagnóstico, sí respondió correctamente. Las comprobaciones instrumentales
iniciales no protegían ese significado en el caso aislado.

El 27 de octubre se reprodujo el fallo antes de modificar código, se corrigió la
política conversacional del backend y se reejecutó literalmente la consulta en
conversaciones nuevas por HTTP y por los adaptadores Mobile reales: ambos casos
pasaron, sin mensaje previo. No se repitió el recorrido físico completo.

| Consulta | Resultado observado |
| --- | --- |
| Finalidad de las pruebas | Diagnóstico/orientación de competencias y tres pilares, con cita. |
| Exactamente 70 % | Sí alcanza el mínimo por pilar. |
| Primera oportunidad gratuita | Inicial aislada: aclaración innecesaria. Android con contexto diagnóstico: correcta. Tras la corrección: aislada correcta por HTTP 201 y adaptador Mobile, con la cita adoptada correspondiente. |
| Pilar no validado | Completar mediante el curso correspondiente, sin repetir pilares ya completados. |
| Tres pilares completos | Insignia digital; no inventa fecha de entrega. |
| Precio actual del curso | $362.500 COP según la evidencia publicada. |
| Transición | Explica reconocimiento condicionado a revisión del programa/CCD. En la conversación de nueve turnos el contexto previo enfocó la respuesta en gratuidad de la transición; se repitió además en un chat nativo nuevo y respondió sobre cursos anteriores/pilares pendientes. |
| Antes de registrar evaluación | Comprobar periodo académico y nivel, sin la cautela antigua de interfaz no verificada. |
| Profesores del próximo semestre | Abstención explícita y estado de evidencia insuficiente; no inventa programación. |

### Envíos inciertos: frontera de prueba

Con API real y los adaptadores existentes se produjo pérdida controlada de respuesta
después de un POST realmente persistido: una sola petición; comprobar historial
reconcilió los dos mensajes. También se probaron ausencia del turno, historial
cambiado y continuación con advertencia. Se ejecutaron las funciones reales del
chat extraídas de su fuente, con setters de estado de ensayo; no es una prueba de
render nativo para esas tres variantes.

En Android se retiró únicamente el reverse de la API: apareció «Resultado del
envío sin confirmar». Tras restaurarlo, Comprobar estado mostró que aún no aparecía
el turno; Continuar mostró la advertencia de duplicación y restauró solo el
borrador. La conversación mantuvo sus dos mensajes anteriores. No se hizo retry
automático ni se afirmó exactly-once.

## Pruebas realmente ejecutadas

| Comprobación final | Resultado |
| --- | --- |
| `npm run typecheck`, desde mobile | Exit 0. |
| `npm run lint -- --no-cache`, desde mobile | Exit 0. |
| `npm run test:local`, desde mobile | 41/41, sin fallos ni omitidas. |
| Evaluador unificado existente, contra API 3004 | PASS: current, chat documental, artefacto, auxiliares, fuentes estructuradas, historial y limpieza/logout. |
| Evaluación adicional con adaptadores Mobile reales | Ejecución instrumental completa de preguntas, seguimiento, auth, 409, fuentes, errores y envíos inciertos. Su indicador inicial PASS no acreditaba la semántica del caso aislado de gratuidad; esa incidencia se detectó y corrigió posteriormente. |
| Arranque PowerShell | Parser sin errores; ejecución real del script con Metro en IPv4 y carga en development build. |
| Android físico | Recorrido real del agente documentado arriba. |
| `git diff --check` | Comprobado al cierre; sin errores de whitespace. |

En la etapa Mobile original no se repitieron las 249 pruebas del corpus ni los
87 artefactos, test:db o migraciones. La microcorrección posterior sí ejecutó
las 249 consultas contra el RAG real en modo de solo lectura, además de dos
comprobaciones HTTP/Mobile focalizadas; no constituye otra corrida HTTP de 249 casos.

### Corrección focalizada posterior: diagnóstico y gratuidad

La frase «la primera» activaba el resolver de seguimiento. Sin historial,
`needs_clarification=true`; el scope tenía `diagnostic/fees`, pero `fees` no
habilitaba `explicitDiagnosticSubject`. Se añadió ese tema acotado, sin casos
por frase ni respuestas nuevas. También se mantuvo la aclaración cuando falta
el sujeto financiero y se evitó heredar la tarifa de curso ante diagnóstico
explícito o deducir un beneficio diagnóstico de una oportunidad ambigua.

La respuesta aislada corregida es: «La primera oportunidad de la prueba
diagnóstica de Competencias Digitales es gratuita.». Se utiliza la evidencia
adoptada `OP-016`; su procedencia interna se conserva. No se extiende a
repeticiones ni pruebas especiales.

API typecheck y 679/679 pruebas pasaron; el banco completo se ejecutó y revisó
nuevamente: 249/249 correctas según evaluación técnica del agente, incluyendo
61 revisiones nuevas de respuestas libres ligadas a pregunta, historial y fuentes.
No se importaron PASS ni revisiones de respuestas anteriores. Las dos
conversaciones HTTP/Mobile se eliminaron y el logout fue confirmado. Current,
corpus, embeddings, bindings y autenticación se mantuvieron. Detalles en
[la regresión focalizada](../../rag-quality/results/ccd-mobile-diagnostic-fee-regression.md).
La aceptación humana continúa pendiente.

## Revisión visual, incidencias y límites

Se revisaron capturas privadas de home/chat/respuestas largas/abstención,
fuentes/selección, historial, auxiliares, errores documentales y logout. Se
comprobó que el teclado deja accesibles input y envío; no se conserva captura
del teclado porque sus sugerencias del sistema pueden incluir datos personales.
Un ensayo de captura con sugerencia del teclado fue descartado y eliminado.
No se conservan imágenes de campos con credenciales ni UID completo.

La UI permite scroll hasta el último mensaje y selección del artefacto. Los
filtros horizontales y textos largos requieren desplazamiento. La herramienta
flotante del development build se superpone ocasionalmente a botones del header;
se usó navegación atrás y se desplazó la herramienta, sin rediseñar la aplicación.
UIAutomator no obtuvo jerarquía en algunos estados animados; las lecturas vacías
se consideran inconclusas, no PASS. El 409 conserva una jerarquía válida aunque
su captura específica fue rechazada por el control de privacidad del ensayo.

Se observó un 429 durante los intentos iniciales de login. Se respetó la ventana
vigente; no se reinició ni alteró el limitador. El fallo del formulario se corrigió
y las dos cuentas pudieron iniciar sesión. El CLI informó un fallo opcional de
DevTools; Metro y la ejecución nativa continuaron funcionando.

Pendientes: aceptación humana de respuestas/usabilidad; otros dispositivos,
versiones Android e iOS; reproducción nativa de pérdida de respuesta después de
persistencia, historial concurrente y documento demasiado grande. Esas variantes
sí tienen comprobación técnica controlada, no se atribuyen al dispositivo.

## Evidencias y cierre

Evidencia completa ignorada por Git: `data/ccd/local/p3-mobile-current-validation/`.
Incluye preflight/configuración saneada, resultados de adaptadores/auth/chat/
historial/409/documentos/auxiliares/navegación/envíos inciertos, dispositivo,
revisión visual, incidencias, limpieza y manifiesto con hashes.
No se publican respuestas privadas ni capturas en el informe versionable.

El evaluador unificado y la evaluación adicional eliminaron sus conversaciones
mediante REST. Se eliminaron también únicamente las tres conversaciones nativas
registradas durante esta tarea. Las huellas finales de conversaciones, mensajes,
citas, corpus, releases, bindings, credenciales, roles y permisos coinciden con
el estado inicial. Solo cambiaron las tablas normales de sesiones, refresh,
eventos de seguridad y límites por la actividad de ensayo.

La app quedó cerrada y sin sesión de ensayo. Metro se detuvo y se retiraron los
dos reverses creados para la prueba. La API habitual sigue activa en loopback y
conserva CCD 1.3 current. No se ejecutó publish_release ni se tocó la fuente externa.
