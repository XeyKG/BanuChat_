# BanuChat — demostración física del MVP CCD 1.4.0

Estado: **BANUCHAT_ANDROID_MVP_TECHNICALLY_VALIDATED**.
Fecha: 29 de octubre de 2026, America/Bogota.
HEAD: `ca2408c7f1c127693608c766a850a10c41712cd1`, rama `main`, árbol inicial limpio.

Se completó el recorrido solicitado en el Android físico YAL-L21 previamente
documentado y autorizado por ADB: Android 10, 1080 × 2340. Se reutilizó el
development build instalado `com.anonymous.banuchat`, versión 1.0.0, cargando el
código actual de Expo SDK 57. No se usó Expo Go 58, emulador ni preview web como
sustituto. No se generaron proyectos nativos ni se reinstaló la aplicación.

Se leyeron AGENTS.md, el checkpoint CCD-INTEGRATION-01 y los procedimientos
vigentes de Mobile/USB. Se conservaron la API v2 de loopback 3004 y PostgreSQL/Ollama
existentes. Metro se inició con `mobile/scripts/start-ccd-auth.ps1`, loopback 8084,
y se configuraron únicamente los reverses USB documentados de 3004 y 8084.
La release CCD 1.4.0 se confirmó por REST y SQL READ ONLY:
`10af4ffd-effb-41fc-bbfe-4dc48cb3398f`, manifest
`fde23cabe95c83f5bd632d129312ad68c90624e6ebd489e79e98c6a3d0d96852`,
con 107 documentos, chunks y embeddings. No se modificó esa publicación.

## Recorrido ejecutado en el teléfono

| Paso | Resultado observado |
| --- | --- |
| Onboarding y login | Pantallas legibles; credenciales incorrectas mostraron error genérico persistente; acceso válido con cuenta ficticia existente |
| Home y chat nuevo | Navegación nativa, aviso de alcance y creación de conversación funcionando |
| Respuestas | Seis turnos físicos: contenidos, seguimiento, detalle histórico, competencias, abstención por disponibilidad y comparación por atributo |
| Carga | Indicador «Banu está pensando…» capturado durante una respuesta real, con navegación temporalmente deshabilitada |
| Citas y fuentes | Expansión de una y dos fuentes; apertura y regreso desde dos documentos en el visor nativo, incluyendo título multilínea |
| Historial | Conversación visible y reabierta; doce mensajes persistidos, con respuestas y citas conservadas |
| Restauración | Tras force-stop y reapertura del mismo build, Home autenticada sin volver a escribir credenciales; historial nuevamente accesible |
| Abstención | Mensaje explícito de insuficiencia sin inventar disponibilidad ni fuentes |
| Logout | Regreso al login vacío; enlace protegido al historial bloqueado; tras reiniciar no se restauró contenido autenticado |

Se inspeccionaron capturas y jerarquías de la interfaz, distinguiendo navegación
correcta de contenido material de la respuesta. Las respuestas académicas observadas
incluyeron aspectos pertinentes y la comparación separó ambas entidades. No se
midió exhaustividad ni se calificó contra un gold. Siete artefactos citados se
verificaron adicionalmente por descarga autenticada y SHA-256 frente a los derivados
autorizados; esa comprobación HTTP complementa las dos aperturas físicas.

En las pantallas revisadas no aparecieron credenciales, expedientes personales,
hashes, UUIDs, rutas internas ni etiquetas técnicas de procedencia. Se mostraron
los derivados CCD autorizados que el usuario consultó, citas legibles y la cuenta
ficticia; las capturas con ese contenido permanecen privadas. Los campos de login
se vaciaron antes de capturarlos.

## Evidencia y cambios

Hay **21 capturas privadas**, jerarquías UI, instantáneas REST del historial,
identidad de publicación y un registro de 18 comprobaciones físicas en:

`data/ccd/local/product-validation/android-mvp-ccd14-v1/`

`validation-results.json` tiene SHA-256
`e84712b4540a99ba4ecfef355fddb5d6ca94d6284def655d4f1227da2f5c0367`.
El manifest privado `artifacts-manifest.json` indexa los archivos y hashes.
La primera captura de carga fue demasiado temprana y se conserva como antecedente;
la evidencia del indicador es `screens/09b-loading.png`.

No se detectaron defectos reproducibles que exigieran corregir estos recorridos.
No cambió código productivo, configuración, corpus, modelos ni contratos. Los
73 archivos históricos protegidos y los ocho archivos de código/configuración
registrados al inicio conservaron sus hashes. Este resumen es el único archivo
versionable nuevo; no se abrió otra cadena de checkpoints. No se repitieron
pruebas unitarias ya acreditadas al no existir cambios de implementación.

El CLI emitió un aviso de DevTools al arrancar; no impidió Metro ni el build. No se
instalaron herramientas manualmente ni se modificaron dependencias para resolverlo.
La aplicación queda sin sesión, la conversación de demostración propia permanece
en el historial y no se modificaron conversaciones anteriores. API, Metro y USB
quedan preparados para la demostración local. `git diff --check` sin errores;
sin commit ni push.

## Alcance de la conclusión

Esta es una ejecución técnica física operada por el agente en un dispositivo y
una cuenta ficticia, no aceptación de usabilidad, revisión humana independiente,
validación institucional ni matriz de compatibilidad. No se ejecutaron SUS,
reclutamiento, iOS, fallos de red inducidos ni aislamiento entre cuentas en Android;
este último conserva su evidencia REST anterior. No se repitieron OE1, RAGAS,
baseline ni métricas académicas.

Para explicar la demostración: BanuChat permite entrar, consultar documentación,
seguir el contexto, comparar aspectos, revisar las fuentes y recuperar el historial
en el teléfono real. Cuando falta respaldo lo señala; al salir protege el acceso.
Se comprobó ese recorrido funcional en el entorno local descrito. La facilidad
de uso para estudiantes y la aceptación académica continúan pendientes.
