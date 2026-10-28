# PV-1B — Expo SDK 57 legacy clean-launch verification

28 de octubre de 2026, America/Bogota. BanuChat.

**PV-1B COMPLETE — CLEAN SDK 57 DEVELOPMENT-CLIENT CHANNEL VERIFIED**

**TECHNICALLY READY FOR FINAL FREEZE**, bajo el canal legacy aquí observado.
**NOT READY FOR RECRUITMENT**: siguen pendientes ventana real/T04, decisión
académica, consentimiento, custodia, roles y freeze final.

T02/T03 focales y una única pasada T01→T05 se completaron en Android físico con
Tools ausente y pulsaciones centrales normales. No se cambió producto, SDK,
dependencias ni build. Esto verifica un procedimiento operacional; no es aceptación
humana ni autoriza participantes.

## A. Baseline

HEAD esperado y observado: `46450f250a174d12b07901e348bce6b92ee8c4cd`.
Branch `main`; status completo incluyendo untracked vacío al iniciar. AGENTS.md
leído completo. Sin operaciones Git prohibidas, cambio de branch, commit ni push.

[PV-1](product-validation-ux-closure-pv1.md) y
[PV-1A](product-validation-ux-closure-pv1a.md) conservan sus estados **BLOCKED
históricos**. Este resultado posterior no reescribe esos intentos.

| Elemento reconfirmado | Observación PV-1B |
| --- | --- |
| Dispositivo | YAL-L21 físico, Android 10 / API 29; un dispositivo autorizado, no emulador |
| Package / versión instalada | com.anonymous.banuchat; versionName 1.0.0, versionCode 1; DEBUGGABLE |
| APK SHA-256 | 78da868cfeffca095bdd01aba269251d4a5f7367d88a940e52dcb86448ace59c |
| Dependencias locales existentes | expo 57.0.31; @expo/cli 57.0.32; expo-dev-client 57.0.20; expo-dev-launcher 57.0.21; expo-dev-menu 57.0.20 |
| Canal | Development build existente + Metro local recién iniciado; sin nueva build ni EAS |
| Configuración actual | ccd_authenticated; REST /api/v2; API loopback 3004, Metro 8084, USB/ADB reverse |
| Pantalla | 1080×2340, densidad 480, escala preexistente 1,15 |

Se reutilizaron los scripts normales: `npm start` desde backend/api y
`./scripts/start-ccd-auth.ps1` desde mobile. Puertos/configuración se derivaron
del script y configuración existentes; el scheme y manifest se obtuvieron del
servidor activo. Los 63 hashes baseline de Mobile/configuración/script e
instrumentos coinciden al terminar. El APK compatible se reutilizó: no se afirma
que se haya reconstruido en este HEAD.

Evidencia privada ignorada: `data/ccd/local/product-validation-pv1b/`.
`baseline-git.json`, `files-baseline.json`, `device-build-baseline.json`,
`public-start.json` y `runtime-metadata.json` distinguen observación y antecedente.

## B. Causa de PV-1A y mecanismo aplicable

PV-1A comprobó que el CLI 57.0.32 no añadía flags al definir EXPO_NO_DEV_MENU=1;
Tools siguió presente y se detuvo el intento. No demostró que el launcher nativo
rechazara flags explícitos. La lectura del launcher instalado en PV-1B confirma
los lectores disableOnboarding, disableFab y disableAutoLaunch, sin modificarlo.

La [documentación oficial de Expo](https://docs.expo.dev/develop/development-builds/development-workflows/)
describe la forma legacy para SDK 57 y los tres parámetros junto a url. También
advierte que los flags legacy actualizan preferencias guardadas del dev menu.
Por ello no se afirma que su efecto se limite al proceso ni que cerrar la app
restaure esas preferencias. No se inspeccionaron ni editaron archivos privados
del dev client; no se añadieron configuraciones o código para persistirlo.

Tools procede del development client. No se buscó un componente Tools en
mobile/src ni se movieron controles de BanuChat para esquivarlo.

## C. Scheme y URL derivados, sin adivinar

Se observó en el terminal del CLI la dirección del servidor
`http://localhost:8084`. Se consultó mediante **GET**, sin lanzar desde ese
endpoint, `/_expo/open?platform=android&runtime=custom`. El middleware instalado
devuelve la misma URL que crea para la development build y para el terminal.

| Dato devuelto/derivado | Valor observado |
| --- | --- |
| runtime | custom |
| appId | com.anonymous.banuchat |
| Scheme de launch | exp+banuchat |
| Manifest/project URL, decodificado una vez | http://127.0.0.1:8084 |
| Resolución Android VIEW | com.anonymous.banuchat/.MainActivity |

La URL normal efectivamente devuelta fue:

```text
exp+banuchat://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8084
```

`cmd package resolve-activity` confirmó en el dispositivo que esa URL resuelve
a la actividad instalada. No se confundió el scheme normal de navegación del
producto con el scheme generado para el path reservado expo-development-client.
No se cambió ningún scheme del producto.

Evidencia: `launch-derived.json` conserva procedencia, normal_url, scheme,
manifest_url, actividad resuelta y la igualdad del manifest tras añadir flags.

## D. URL legacy y cold launch controlado

Se conservó literalmente la URL devuelta y se añadieron tres parámetros hermanos
de url; el valor del manifest no se sustituyó ni se volvió a codificar:

```text
exp+banuchat://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8084&disableOnboarding=1&disableFab=1&disableAutoLaunch=1
```

Se hizo force-stop, sin clear-data, reinstalación o extracción/borrado de
SecureStore, y se lanzó esa URL mediante VIEW intent restringido al package
instalado. Android devolvió **Status: ok** y la actividad esperada. La misma
operación se repitió únicamente como cierre/reapertura de T01 del walkthrough,
usando de nuevo la URL legacy explícita.

BanuChat cargó su proyecto local correcto y su propia introducción; esta es
distinta del onboarding del dev client. Se accedió al login mediante Omitir
introducción, pulsado normalmente por el centro. No apareció launcher inesperado.

Los dos `intent-reopen-*.json` conservan resultado saneado, URL y force-stop
previo, sin identificador del dispositivo. No se utilizó el icono como prueba
inicial ni EXPO_NO_DEV_MENU como sustituto de los flags.

## E. Supresión observable y ausencia de interferencia

**PASS.** Las 39 jerarquías guardadas con contenido de BanuChat no contienen
nodo Tools ni el contenedor con sus bounds anteriores `[876,156][1032,312]`.
Las dos jerarquías vacías durante carga no se usaron como evidencia de ausencia.
Capturas de la introducción, chat y visor muestran las áreas normales despejadas.

El host Compose global del dev client permanece montado, vacío y no clickable;
no se confunde ese host con el FAB. Un chequeo privado inicial que exigía ausencia
de cualquier ComposeView rechazó esa condición excesiva. Se documentó el host
y se comprobó el criterio pertinente: ausencia de Tools/contenedor del FAB y
respuesta real de los controles centrales, sin repetir el recorrido.

Se registraron **11 activaciones centrales de headers**: cuatro Volver y siete
Inicio. En los casos afectados de T02/T03:

- Volver: bounds `[770,176][1020,308]`, centro `[895,242]`, resultado documento→chat.
- Inicio desde chat: bounds `[794,150][1020,282]`, centro `[907,216]`, resultado chat→Home.

Estos centros están en la zona antes interferida. Volver conservó su área de
250×132 px e Inicio 226×132 px. La combinación de jerarquía, captura y destino de
las pulsaciones descarta una mera transparencia visual que siguiera interceptando
las acciones probadas. No se usó extremo izquierdo, arrastre del FAB ni workaround.

Evidencia: `channel-verification.json`, `control-activations.jsonl`,
`compose-host-observation.json` y capturas `legacy-ready`, `focal-source`,
`focal-viewer` y `walk-viewer`.

## F. Retest focal T02/T03

Cuenta existente compatible derivada nuevamente: alias **PV1B-TECH-A**, solo
técnica, NOT_FROZEN_FOR_P01. SQL READ ONLY verificó current documental
`10af4ffd-effb-41fc-bbfe-4dc48cb3398f`, ready / ccd-1.4.0, autorización 5/5 y
release auxiliar `af157a78-4c51-49c0-b8cc-509257d89f1e`. Se derivaron cuatro
credenciales legítimamente disponibles y dos contextos compatibles; no se publicó
UID ni relación cuenta→contexto. Se utilizó uno, sin modificar datos.

Login normal y /auth/me confirmaron 200, evidence_mode ccd_local, current CCD 1.4
y chat/history/progress/calendar/announcements/documents. Los adaptadores normales
confirmaron course-003 completed/100 % y announcement-006 active en ese contexto.

| Retest focal | Resultado observado |
| --- | --- |
| T02 | PASS: conversación nueva, literal exacto, tres pilares, fuente expandida, visor y Volver central→chat |
| T03 | PASS: Inicio central→Home, Historial, conversación focal, misma respuesta/fuente, visor y retornos centrales normales |

Literal enviado una sola vez en cada conversación de la tarea:

> ¿Cuáles son los tres pilares de Competencias Digitales?

Respuesta observada: Competencias Digitales Básicas; Analítica y Contenido Digital;
Tecnologías Transformativas. route:structure permanece como etiqueta visible;
no se cambió UI ni se convirtió en juicio de comprensión humana.

La evidencia HTTP auxiliar de ambas conversaciones confirmó cita documental CCD
1.4, artifact 200, versión bch-ccd-knowledge-2 y SHA igual al registrado en DB.
Un verify-chat focal solicitado inmediatamente tras el envío dio TypeError antes
de la inspección de respuesta; después de observar respuesta y fuente en UI, la
comprobación manual pasó. Se conserva `ops-command-failure-1.json`; no se afirma
una causa raíz del error auxiliar ni se oculta con el resultado posterior.
La comprobación del walkthrough se hizo después de observar su respuesta y pasó.

Se cerró normalmente la sesión focal y se verificó revocación antes del walkthrough.
No se repitieron T01/T04/T05 como evaluación de componentes.

## G. Única pasada T01→T05

**PASS técnico**, una sola pasada ordenada tras aprobar los focales, mismo
dispositivo/build/canal y cuenta compatible, nueva conversación propia.

| Tarea | Comprobación física bajo el canal legacy |
| --- | --- |
| T01 | Login→Home; force-stop y VIEW legacy→Home sin pedir contraseña otra vez. SQL verifica misma sesión y refresh rotado/consumido, sin extraer SecureStore |
| T02 | Literal exacto, tres pilares, fuente, artifact y Volver central→chat; sin Tools |
| T03 | Inicio central→Home; Historial reabre la conversación del walkthrough, misma respuesta y fuente; nuevo acceso al visor y retorno central |
| T04 | Target del día en Todos, fecha/hora Bogotá y categoría; filtro Cierres conserva el evento |
| T05 | Búsqueda y verificación de información, Completado/100 %, visible al filtrar Completados; Actualización de material de orientación en Vigentes; Próximos muestra otro conjunto y Vigentes recupera el target |

T04 se derivó nuevamente dentro de la ventana Mobile **28/10/2026–26/11/2026**,
con límite normal de resultados. El último candidato visible fue **event-016**,
**Cierre demo: Encuentro informativo del programa demo**, **20/11/2026 a las 18:00
de Bogotá**, categoría announcement_deadline / Cierres. Título identificable en
Todos y Cierres; sin modificar calendario.

Su alcance es **PV1B_DRY_RUN_ONLY**, **NOT_FROZEN_FOR_P01**. T04 humano continúa
**PENDIENTE DE VENTANA DE SESIONES**; no se editó la hoja del participante.

No hubo crash, pérdida de contexto o sesión ni maniobra para esquivar tooling.
Los tiempos en evidencia son diagnósticos del operador, con instrumentación,
sin comparación contra límites humanos ni entradas en CSV de participantes.

TalkBack conserva **NOT_EXECUTED — device/accessibility setup unavailable**.
No se activó ni reparó; sigue como brecha técnica separada. No se declara revisión
asistiva, WCAG, iOS o aceptación humana, ni se usa esa brecha como bloqueo por sí
sola del SUS Android general sin una decisión académica que así lo requiera.

## H. Cleanup y restauración

Logout normal en ambas sesiones nativas y en la sesión auxiliar de preflight/
cleanup. **3 sesiones creadas, 3 revocadas, 0 activas**. Se eliminaron por DELETE
normal de su owner solo las dos conversaciones registradas como propias PV-1B;
la conversación histórica preexistente quedó intacta. No se borró auditoría ni
se resetearon tasas; sin SQL DML de limpieza.

Snapshots READ ONLY de **43 tablas** antes/después: solo cuatro con cambios:

| Tabla auth | Antes | Después | Delta normal preservado |
| --- | ---: | ---: | ---: |
| auth_rate_limits | 211 | 217 | +6 |
| refresh_tokens | 136 | 140 | +4 |
| security_events | 248 | 255 | +7 |
| sessions | 105 | 108 | +3 |

Eventos: tres login_succeeded, tres logout_succeeded y un refresh_succeeded.
Cero denegaciones y cero rate_limited. Otras 39 tablas con mismos conteos y
fingerprints: conversaciones/mensajes/citas/owners tras DELETE, credenciales,
cuentas, recuperación, bindings/grants, corpus, releases y auxiliares. Roles,
ACL, memberships, funciones y permisos sin delta. Current documental y auxiliar
iguales; autorización final 5/5.

App cerrada después de logout. SwiftKey original restaurado tras usar Gboard ya
instalado para escribir ¿/á; no se enviaron variantes del literal. Fuente 1,15,
accesibilidad desactivada y servicios accesibles vacíos sin cambios. Reverses
restaurados al baseline vacío. API/Metro detenidos; solo el contenedor PostgreSQL
aislado iniciado por PV-1B volvió a apagarse, volumen preservado. Puertos y estado
del servidor ADB coinciden con el baseline. Esto no afirma revertir todas las
preferencias guardadas del dev menu, cuyo comportamiento legacy se explica en B.

Incidencias de herramientas separadas del resultado de canal: el CLI informó el
error opcional previo de React Native DevTools, pero compiló/cargó el proyecto.
Una revisión automática rechazó dos comandos de preparación combinados; no se
ejecutaron. Se omitió la lectura opcional de preferencias privadas incluida en el
primero y se usaron helpers explícitos de derivación/VIEW/UI. No se parcheó APK,
dependencias o producto. El chequeo de host Compose se corrigió sobre evidencia
ya guardada; no se realizó otra pasada de tareas.

Evidencia: `API-cleanup.json`, `snapshot-comparison.json`, `device-restoration.json`,
`environment-restoration.json`, `services-final.json`, `files-final-check.json`.

## I. Scope y documentos

Sin cambios en mobile/src, app.json, package.json, lockfile, script de arranque,
backend, SQL, RAG, MCP, N8N, corpus/datos de negocio, releases, dependencias,
SDK, node_modules o APK. Sin EAS, eas.json, projectId, keystore o nueva build.
No se repitieron suites Mobile/typecheck/analyzer/API/RAG/MCP/N8N ni artifacts
masivos: no hubo cambios de código que los justificaran.

Se crea este informe y se añaden referencias breves en checkpoint OE5, paquete
final, freeze-template y PV-1/PV-1A. Los dos últimos retienen sus resultados
BLOCKED históricos. No se modifican SUS, CSV, criterios, consentimiento,
hoja del participante ni protocolo funcional. Cero participantes y filas humanas;
los CSV siguen solo con cabecera. Evidencia privada ignorada, saneada y con
manifiesto SHA-256; no tokens, passwords, serial o mapa público cuenta→contexto.
Revisión final de privacidad, enlaces, status y git diff --check registrada.
Sin commit ni push.

## J. Siguiente decisión

**PV-1B COMPLETE — CLEAN SDK 57 DEVELOPMENT-CLIENT CHANNEL VERIFIED**

**TECHNICALLY READY FOR FINAL FREEZE** bajo este procedimiento: iniciar los
servicios existentes, derivar la URL real del CLI, añadir los tres flags legacy,
cold launch VIEW a la build instalada y reconfirmar UI/navegación normales. No
copiar scheme/manifest/puertos de este informe como garantía de otro entorno.
No se decide todavía un cambio versionado para persistirlo ni se requiere avanzar
automáticamente a una preview build/EAS a partir de este resultado.

**NOT READY FOR RECRUITMENT**.

**PENDIENTE DE CONFIRMACIÓN POR EL RESPONSABLE ACADÉMICO: procedimiento/revisión aplicable antes del reclutamiento**

Consentimiento **DRAFT — NOT APPROVED FOR USE**. Antes de freeze final resolver
ventana real/T04, decisión académica, consentimiento, custodia y roles, y
reconfirmar HEAD/build/current/contexto de la tanda. El canal técnico verificado
no equivale a freeze completado o aprobación del estudio. Detenerse aquí, sin
participantes ni SUS humano.
