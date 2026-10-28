# PV-1A — Study channel remediation & clean technical dry-run

## Referencia posterior PV-1B — 28/10/2026

[PV-1B](product-validation-ux-closure-pv1b.md) probó explícitamente los flags legacy
SDK 57 y verificó canal limpio/focales/walkthrough. PV-1A conserva su BLOCKED
histórico: EXPO_NO_DEV_MENU no produjo esos parámetros con el CLI instalado y
no se ejecutaron sus retests. El resultado posterior no aprueba estudio ni freeze.

28 de octubre de 2026, America/Bogota. BanuChat.

**PV-1A BLOCKED — Expo dev-menu suppression ineffective**

`EXPO_NO_DEV_MENU=1` no suprimió Tools con el CLI instalado 57.0.32.
La URL emitida siguió sin parámetros de supresión y la jerarquía/captura física
confirmó Tools sobre BanuChat después de cargar el proyecto. Se aplicó la parada
expresa del punto 4 de PV-1A: no se ejecutaron retest focal ni recorrido T01–T05.
No se modificó producto ni se declara canal limpio o readiness para freeze.

## A. Baseline y PV-1 histórico

HEAD esperado y observado: `1986f24aecfc4c50540f9d74e1758baf3571895a`.
Branch `main`; `git status --porcelain=v1 --untracked-files=all` inicial vacío.
AGENTS.md leído completo. Sin cambios de branch, operaciones Git prohibidas,
commit ni push.

[PV-1](product-validation-ux-closure-pv1.md) conserva su estado histórico BLOCKED:
las funciones se ejecutaron con maniobra para sortear Tools. Su informe no fue
reescrito ni convertido en PASS. PV-1A es una prueba separada del canal.

Evidencia privada separada e ignorada:
`data/ccd/local/product-validation-pv1a/`. Incluye baseline, versiones/hashes,
jerarquías antes/después, captura sin credenciales, configuración de arranque,
resultado del gate, restauración, privacidad y manifiesto SHA-256.

## B. Tools pertenece al Expo development client

| Elemento reconfirmado | Resultado actual |
| --- | --- |
| Dispositivo | YAL-L21 físico, Android 10 / API 29; un dispositivo autorizado, no emulador |
| Package / versión instalada | com.anonymous.banuchat, versionName 1.0.0 / versionCode 1, flag DEBUGGABLE |
| APK SHA-256 | 78da868cfeffca095bdd01aba269251d4a5f7367d88a940e52dcb86448ace59c |
| Proyecto Expo instalado | expo 57.0.31, @expo/cli 57.0.32 |
| Dependencias existentes | expo-dev-client 57.0.20, expo-dev-launcher 57.0.21, expo-dev-menu 57.0.20 |
| Runtime mostrado por el menú nativo | exposdk:57.0.0 |
| Canal | Development build existente, proyecto local servido por Metro loopback 8084 |
| API configurada por script | 127.0.0.1:3004/api/v2, ccd_authenticated, adb_reverse |
| Pantalla / escala | 1080×2340, densidad 480, fuente 1,15; sin cambios |

Antes de cambiar el arranque se abrió el proyecto por el canal normal y se
observó Tools. Su pulsación abrió el menú nativo con Runtime version, Reload,
Go home, Performance monitor y DevTools; se cerró normalmente con Close.
El APK coincide con el hash observado en PV-1, pero su disponibilidad/versiones
se comprobaron de nuevo, no se asumieron por el antecedente.

La procedencia se corroboró leyendo las dependencias ya instaladas, sin editarlas:
`expo-dev-menu/.../fab/FloatingActionButtonContent.kt` define el Icon con
contentDescription Tools; `expo-dev-launcher/.../DevLauncherController.kt`
procesa los parámetros legacy de supresión. No se buscó ni añadió un componente
Tools en mobile/src, ni se movió ningún header o botón de BanuChat.
Evidencia: `device-build-baseline.json`, `ui-baseline-ready.json`,
`ui-baseline-expo-menu.json` y hashes de dependencias en `channel-result.json`.

## C. Mecanismo operacional utilizado y límite de compatibilidad

Se consultó la [documentación oficial de Expo sobre launch URLs y automatización](https://docs.expo.dev/develop/development-builds/development-workflows/).
Describe EXPO_NO_DEV_MENU y distingue la forma legacy de SDK 57 frente a los
parámetros reservados de SDK 58. La [nota oficial de SDK 58](https://expo.dev/changelog/sdk-58)
da contexto de versión; no se realizó actualización.

La prueba utilizó exclusivamente configuración de ejecución, desde mobile:

```powershell
$env:EXPO_NO_DEV_MENU='1'
./scripts/start-ccd-auth.ps1
```

Se ejecutó en proceso hijo con restauración del valor previo en finally; la
variable estaba inicialmente ausente y volvió a quedar ausente. Antes de arrancar
Expo se registró que el proceso Node heredaba exactamente el valor 1.
No se editó `mobile/scripts/start-ccd-auth.ps1` ni se propuso un cambio versionado
para un mecanismo que aún no funciona en esta instalación.

El script existente arrancó Metro con localhost IPv4, puerto 8084 y --dev-client.
Se configuraron los reverses habituales 3004/8084. El helper abrió exactamente
la URL que emitió el CLI, sin sustituirla por una URL construida con flags nuevos:

```text
exp+banuchat://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8084
```

El generador instalado `@expo/cli/build/src/start/server/UrlCreator.js`,
constructDevClientUrl, construye esa URL solo con url. La búsqueda en los JS de
`@expo/cli/build/src` no encontró ninguna referencia a EXPO_NO_DEV_MENU.
El terminal confirmó que el valor 1 no añadió disableFab, disableAutoLaunch,
disableOnboarding ni parámetros reservados. Esta es evidencia local del CLI
57.0.32, no una refutación del comportamiento documentado para versiones actuales.

El launcher nativo instalado sí contiene lectores para los tres flags legacy.
No se ensayó su inyección manual después del fallo: la solicitud ordena detenerse
si Tools persiste. Por tanto, no se afirma que todos los mecanismos oficiales
legacy sean ineficaces ni que el APK carezca de ese soporte.

## D. Resultado de ausencia de Tools

**FAIL del gate de canal limpio.** Tools apareció durante el lanzamiento y
continuó presente con el onboarding de BanuChat ya renderizado. Su icono conservó
bounds físicos `[915,195][993,273]`, dentro de la zona superior derecha que
interfería con navegación en PV-1. La captura muestra también superposición sobre
Omitir; no fue necesario avanzar ni iniciar sesión para rechazar el gate.

La expectativa Tools ausente no se cumplió. No se pulsaron lateralmente controles,
no se arrastró ni ocultó el FAB y no se alteraron sus preferencias manualmente.
Volver/Inicio de las tareas no se alcanzaron en este intento: su retest central
no recibe PASS ni se presenta como ejecutado por comparación geométrica histórica.

Evidencia: `ui-suppression-launch.json`, `ui-suppression-ready.json`,
`screens/suppression-ineffective.png`, `channel-attempt.json`, `channel-result.json`.

## E. Retest focal T02/T03

| Retest solicitado | Estado real |
| --- | --- |
| T02: nueva conversación, pregunta exacta, fuente, Volver central → chat | NOT_EXECUTED — parada por Tools presente |
| T03: Inicio, Historial, conversación T02, fuente y retorno normales | NOT_EXECUTED — misma puerta; no se creó conversación T02 |

No se fabricó una conversación ni se utilizó una maniobra especial para continuar.
Los resultados de PV-1 no se reutilizan como PASS focal de PV-1A.

## F. Única pasada limpia T01–T05

**NOT_EXECUTED — no se superó la puerta previa de canal limpio.**

| Tarea | Resultado PV-1A |
| --- | --- |
| T01 login / force-stop / reopen / restore | NOT_EXECUTED |
| T02 pilares / fuente / retorno limpio | NOT_EXECUTED |
| T03 historial / fuente / navegación limpia | NOT_EXECUTED |
| T04 calendario / target del día / filtro | NOT_EXECUTED |
| T05 curso completed/100 % y anuncio active en contexto común | NOT_EXECUTED |

No hubo pasadas de componentes, walkthrough parcial atribuido como completo ni
registro de tiempos humanos. API y PostgreSQL permanecieron apagados y no se
seleccionó cuenta. La configuración apunta al endpoint esperado, pero current
10af4ffd-effb-41fc-bbfe-4dc48cb3398f, /auth/me, release auxiliar y compatibilidad
T05 **no se reconfirmaron por backend en PV-1A** debido a la parada anterior.
El antecedente PV-1 no sustituye esas reconfirmaciones de una futura pasada limpia.

No se repitieron API suite, RAG, C01–C09, artifacts, MCP, N8N, analyzer, Mobile tests
ni typecheck; la tarea solo comprobó el arranque del canal y no cambió código.

## G. TalkBack separado

Se conserva **NOT_EXECUTED — device/accessibility setup unavailable** como brecha
técnica de accesibilidad procedente de PV-1. No se intentó reparar su setup ni se
activó en PV-1A. No se inventa PASS y no constituye por sí solo el bloqueo actual:
la causa de parada es Tools. No se declara validación asistiva, WCAG o iOS.

## H. T04 sin freeze

T04 humano continúa **PENDIENTE DE VENTANA DE SESIONES**. No se derivó un target
PV1A_DRY_RUN_ONLY al no alcanzar el walkthrough; event-016 no se asumió vigente
ni se convirtió en target P01. Hoja del participante, candidatos, criterios y
protocolo funcional permanecen sin cambios.

## I. Puerta académica

**PENDIENTE DE CONFIRMACIÓN POR EL RESPONSABLE ACADÉMICO: procedimiento/revisión aplicable antes del reclutamiento**

Consentimiento **DRAFT — NOT APPROVED FOR USE**.
Cero participantes, reclutamiento, consentimientos, SUS o entrevistas. Los CSV
humanos siguen solo con cabeceras; instrumentos sin cambios de hash.
**NOT READY FOR RECRUITMENT**. Ventana/T04, decisión académica, consentimiento,
custodia, roles y freeze final siguen pendientes.

## J. Cleanup y restauración

- App inicialmente cerrada, cerrada otra vez al terminar, sin borrar datos.
- Cero logins, sesiones o conversaciones creadas por PV-1A: logout y DELETE
  propios no aplican. No se extrajeron tokens ni se fabricó sesión. No se hizo
  una consulta SQL de revocación que pudiera presentarse como ejecutada.
- API y PostgreSQL no se iniciaron; no hubo llamadas autenticadas ni escritura
  de negocio desde la tarea. Sin publicación, DML SQL, reset de tasas o borrado
  de security events; no se afirma comparación DB por snapshots que no se ejecutó.
- Las dos instancias secuenciales de Metro usadas para baseline/intento quedaron
  detenidas normalmente. Puertos API 3004, Metro 8084 y PostgreSQL 55463 cerrados,
  igual que al iniciar; servidor ADB existente continúa operativo.
- Reverses restaurados al baseline vacío, antes de detener el último Metro.
  IME original, escala 1,15 y accesibilidad desactivada/servicios vacíos verificados
  sin cambiarlos. EXPO_NO_DEV_MENU volvió a su estado inicial ausente.

Incidencias de herramienta: el helper inicial trató pidof sin proceso como error;
se corrigió solo ese helper privado para reconocer su exit 1 normal. No fue un
fallo del producto. Ambos arranques CLI informaron el error opcional ya conocido
al instalar React Native DevTools; después compilaron el proyecto. No se ejecutó
una instalación/actualización manual como solución ni se atribuye a ese mensaje
la falta de supresión, que se explica por la URL y el código instalado.

Evidencia: `device-restoration.json`, `channel-env-restoration.json`, `cleanup.json`.

## K. Scope Git, privacidad y archivos

Solo se crea este informe versionable. Al no pasar PV-1A, no se añadieron las notas
de precedencia condicionadas al éxito en PV-1, checkpoint OE5, paquete final o
freeze-template. Esos cuatro documentos conservan su contenido histórico.

Los 63 hashes baseline de Mobile/configuración/script/dependencias versionadas e
instrumentos coinciden al cerrar. Sin cambios en producto, backend, SQL, corpus,
releases, bindings/grants, perfiles, calendario/anuncios, dependencias, Expo SDK,
node_modules, APK, analyzer o instrumentos. No se creó eas.json, projectId,
keystore ni configuración de firma; no se ejecutó EAS.

La evidencia privada contiene helpers y metadatos saneados; su manifiesto enumera
cada archivo/hash. No contiene UID/password/token/serial ni mapa cuenta→contexto.
La captura fue inspeccionada sin campos privados. Revisión de privacidad, enlaces,
`git diff --check` y status final registrados; sin commit ni push.

Archivos de esta tarea:

- Modificados versionables: ninguno.
- Creado versionable: `eval/mobile/results/product-validation-ux-closure-pv1a.md`.
- Creados privados ignorados: `data/ccd/local/product-validation-pv1a/`, listado
  completo en su `evidence-manifest.json`.
- Eliminados: ningún archivo.

## L. Siguiente estado

**PV-1A BLOCKED — Expo dev-menu suppression ineffective**.
No se declara **TECHNICALLY READY FOR FINAL FREEZE**.

La evidencia permite decidir una tarea separada de canal, incluida la evaluación
de una preview/internal-distribution build prevista como plan B. No se configura
EAS ni se genera esa build dentro de PV-1A. El soporte legacy leído en el launcher
queda documentado, pero no se declara probado con flags explícitos después de la
condición de parada. No se concluye que una preview sea técnicamente indispensable
sin esa evaluación separada.

No se modifica el producto para sortear el entorno. Detenerse aquí, sin participantes.
