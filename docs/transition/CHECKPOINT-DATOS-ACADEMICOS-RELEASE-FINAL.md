# BanuChat · Sincronización del catálogo académico de demostración

**Corte del 21/11/2026, hora de Bogotá.** Se partió de `main` en `76a3177`. El código y las fuentes de la release académica están en `3dfdf6758655bfc4f6b42dddd4adf5edf880e497`. La web pública previa servía `entry-b9d4d4ce0269c3ccbb42fecd44308e63.js`. GitHub tenía 1.0.4 como última release antes de este corte. El Huawei ya tenía una construcción 1.0.5 con `versionCode=6` y se actualizó a 1.0.6 con `versionCode=7`.

## Matriz de verificación

| Funcionalidad | Código | Supabase | AWS API | Web | APK | Estado de verificación |
| --- | --- | --- | --- | --- | --- | --- |
| Mi progreso y tarjetas | Nombres desde la API y NRC ficticio por sección | Se conservaron 72 progresos | Lee la nueva release | Bundle 1.0.6 activo | Tarjeta comprobada en Huawei | Pruebas locales y lectura autenticada |
| Expediente y recursamiento | Nombre, programa, semestre, período, curso, intentos, estado y nota | 32 estudiantes, 62 intentos, ocho recursamientos y un expediente vacío | Lee expediente propio | Bundle 1.0.6 activo | Dos intentos y NRC comprobados en Huawei | Migración, HTTPS y Android físico |
| Catálogo y consultas de cursos | Fuente común para catálogo, progreso y MCP | 14 cursos, cuatro de referencia CCD | Lecturas sobre la release activa | Cursos en Mi progreso y chat | Interacción Digital comprobada | Catálogo verificado en SQL y MCP por HTTPS |
| Calendario | Contrato REST conservado | 22 eventos, dos títulos alineados con los cursos | Lee eventos versionados y editoriales | Ruta publicada con el bundle nuevo | Disponible en 1.0.6 | Verificación local y HTTPS |
| Banu al Día y panel editorial | Lectura y edición existentes | Esquema editorial conservado | Panel HTTP 200 | Ruta publicada con el bundle nuevo | Banu al Día en el cliente | Lectura de smoke, publicación editorial fuera del ensayo |
| Chat, citas e Historial | RAG directo y persistencia existentes | Releases y citas históricas conservadas | API reiniciada con la configuración previa | Origen HTTPS común | Teclado, respuesta, citas e Historial comprobados | RAG y MCP por HTTPS, saludo real en Android |
| n8n y MCP | Colector correlacionado y admisión OE4 | El lector usa la release de la consulta | Revisiones efectivas conservadas | Chat por la misma API | Chat por la misma API | Rutas técnicas y smoke acotado |

## Datos y procedencia

La release previa `1b63ecff-dcce-4580-b0d1-1ee13af3beb5`, manifiesto `fb410dd6c67a043f31865588924024cc3953819be1289c683c072c08fe1da746`, tenía 12 cursos, 22 eventos, 36 perfiles sintéticos y siete vínculos de cuenta en la release. Cinco de los 32 estudiantes académicos tenían una cuenta asociada. Los programas y ciclos usaban nombres simulados. Las claves `course-001` y `course-002` tenían nombres distintos de los que proyectaba la interfaz.

La nueva release `1014a6f9-dd44-49b5-8323-5f4819857cb0` quedó activa, con manifiesto `124bd27fc2f824e2d2a7c65cbf1ff8bc3cae06b17e26da8363e67e3d6a9c2cc5`. El catálogo de demostración conserva las claves e intentos asociados y actualiza `course-001` a **Interacción Digital** y `course-002` a **Habilidades en Analítica Digital**. **Marca Personal Digital** e **IA Generativa** se añadieron como referencias de catálogo sin generar matrículas, intentos ni notas. Los otros diez cursos pertenecen a escenarios sintéticos existentes. Los cuatro nombres de referencia cubren los tres pilares documentados. Los NRC de demostración 99001, 99002, 99101 y 99102 son ficticios. Los períodos 202610 y 202660 se usan como etiquetas de los fixtures. [Oferta intensiva de abril–mayo de 2026](https://unab.edu.co/cursos-intensivos-de-competencias-digitales-para-estudiantes-de-6o-semestre-en-adelante-15-de-abril-a-15-de-mayo-de-2026/).

Los nombres **Ingeniería de Sistemas** e **Ingeniería Industrial** se aplicaron a los dos grupos de 16 estudiantes ficticios. El expediente muestra aparte el semestre. Las fuentes revisadas identifican los programas y cursos. Las fechas de los eventos, las inscripciones, las notas y las cuentas de BanuChat son de demostración. [Ingeniería de Sistemas](https://unab.edu.co/programas/ingenieria-de-sistemas/) · [Ingeniería Industrial](https://unab.edu.co/programas/ingenieria-industrial/) · [Tres rutas y otras opciones publicadas por la UNAB](https://unab.edu.co/asi-funciona-la-formacion-en-competencias-digitales-de-la-unab/).

El publicador conserva bajo sus IDs originales las releases listas, los mensajes, las citas y los PDF históricos. Copia los vectores sintéticos a la sucesora con nuevas identidades de versión y conserva los contenidos y sus hashes. La transacción comprueba igualdad de estudiantes, intentos, perfiles, progreso y vínculos de cuenta entre la base y la sucesora, excluyendo de la comparación únicamente el ID de release. Las fuentes nuevas viven en `data/academic-demo`. Sus rutas y hashes están en el manifiesto; el v1 congelado sigue separado. El corpus CCD aprobado y las tablas de credenciales quedan fuera de la migración.

## Despliegue, respaldos y reversión

- **Supabase.** Respaldo privado del catálogo y calendario con SHA-256 `af11efe09fbf914e611ff1346f4ca2222c6735b750a089c12dd10ce90227eb45`. Las filas académicas y vínculos se verificaron en el servidor mediante conteos y hashes, sin exportar identificadores ni contactos. El rollback lógico usa la release anterior preservada. La copia PostgreSQL local aislada tuvo el mismo ID y hash de manifiesto de origen y su respaldo lógico se verificó con SHA-256 `49edee0b918df29c8cd2dddce471a39210648d6512e306230ab241e44cfd462b`.
- **EC2 existente.** Systems Manager `3a71a231-5df8-4d59-8c8b-bc6569f5419c` verificó paquete SHA-256 `ca289bb7728cec99d1d7536d428d6ddc3ded12380c4b626329df3cae3d25ad93` y respaldo privado `/opt/banuchat/backups/academic-final-3dfdf67`. `edee68bb-50be-4b8a-b8cf-65f59cb30ccc` activó los dos archivos de API y el lanzador web, comprobó salud de los cinco servicios y ambas publicaciones n8n. Se conservaron Caddy, DNS, certificados, modelos y roles.
- **API efectiva.** Los archivos desplegados desde `3dfdf67` son `backend/api/src/auth/resources.ts` con SHA-256 `9eb91ef6250e9e668f17f7f4805bf0d08e32c4a4cc6ad064e14fcf1f1dd8382d` y `backend/api/src/authenticated-runtime.ts` con SHA-256 `3e75cd8ab3b9ae90de4b28ff8f09fee75511bfe37c47459902addea194b9bd80`. Los demás archivos conservan la composición administrada previa.
- **Web.** Exportación `entry-898905f47d2b33bbbb6763958492c875.js`, archivo de despliegue SHA-256 `d134de7c70cdcc3fc9d868cecd3c08809dea1cc38c8e573e7962d88abe0d492a`. El lanzador anterior y su exportación siguen disponibles. La web y Android apuntan al origen canónico de BanuChat.
- **n8n.** Colector `6360ea8c-f1bc-4ddf-8112-5217133a3dc2` y OE4 `60a7577b-30b1-4d52-87d9-dbaf28642def`. Se comprobaron las revisiones en SQLite. [Evidencia previa de observabilidad](CHECKPOINT-N8N-RAG-OBSERVABILIDAD.md).
- **Crédito.** Learner Lab mostró US$15,80 consumidos de US$50 después de la primera ventana de validación. La EC2 existente se comprobó en línea durante el despliegue y el smoke se limitó a dos cuentas y dos turnos de chat. El saldo mostrado puede actualizarse con retraso.

Para revertir, tomar el bloqueo de escritura, confirmar que el puntero apunta a `1014a6f9-dd44-49b5-8323-5f4819857cb0` y ejecutar `banuchat.publish_release('1b63ecff-dcce-4580-b0d1-1ee13af3beb5')` con el rol de publicación autorizado. Restaurar los archivos de API y el lanzador desde el respaldo indicado, con propietario y modos, y reiniciar solo API y web. Comprobar HTTPS, login, release activa, progreso y revisiones n8n. Las citas históricas siguen asociadas a su release. En Android conservar los APK previos como respaldo; una versión con menor `versionCode` puede requerir una compilación de reversión firmada con código superior.

## Pruebas y límites

En PostgreSQL 17 aislado se probó rollback y publicación, con tres releases listas, 60 vectores vigentes y 11 citas conservadas en la copia. Supabase también pasó el ensayo en transacción con rollback antes de la promoción. Pasaron los typechecks de API, Mobile y MCP, 66 pruebas focales de API, 79 de Mobile, 45 de MCP y la prueba local del proxy web. El caso sin intentos y todas las relaciones académicas se comprobaron en datos y no requirieron crear cuentas nuevas.

El control SQL posterior en Supabase confirmó tres releases listas, 60 vectores iguales por documento y ordinal, 173 citas asociadas a la release previa, 36 perfiles, 72 progresos y siete vínculos de cuenta en la sucesora. La comprobación de contexto en PostgreSQL aislado usó cinco cuentas ya presentes en la copia, todas con su perfil y release correctos. La copia local tenía tres expedientes con cuenta vinculada. La prueba pública usó dos cuentas ficticias.

Por HTTPS se comprobaron los programas de ambas cuentas, los nombres consistentes en expediente y progreso y los dos intentos del caso de recursamiento, con reprobación de 48 y aprobación de 82. Calendario devolvió cuatro eventos en la ventana de prueba, incluidos los dos títulos actualizados, y Banu al Día devolvió ocho publicaciones. Las rutas web `login`, `progress`, `calendar` y `announcements` sirvieron el bundle nuevo y el panel editorial devolvió HTTP 200. El cierre de sesión devolvió 204 y el acceso con el token revocado, 401, en ambas cuentas.

| Turno de prueba | Resultado | Correlación n8n |
| --- | --- | --- |
| ¿Qué es el Centro de Competencias Digitales? | HTTP 201, 3.346 ms, ocho citas documentales, Historial coincidente | UUID `3f72f022-2d36-4864-a4e1-c9c9c81a432e`, secuencias 0–4 en ejecuciones 91–95. [Cierre](https://n8n.banuchat.duckdns.org/workflow/BanuChatChatExecution1/executions/95). |
| Cursos completados y convocatorias | HTTP 201, 4.303 ms, tres citas, nombre actual Interacción Digital e Historial coincidente | UUID `931d446c-1c26-44b1-bbda-c9c96879e9b9`, secuencias 0–2 en ejecuciones 96, 97 y 99. El journal registró admisión OE4 y dos llamadas, `get_profile_progress` y `get_announcements`. [Cierre](https://n8n.banuchat.duckdns.org/workflow/BanuChatChatExecution1/executions/99). |

## Android 1.0.6

Gradle construyó `assembleRelease` ARM64 con Expo SDK 57. La APK pesa 47.070.008 bytes, tiene SHA-256 `5caef0ec57bc060155db903e175b47e6ec31e01a19b9915f50182f2979309c98` y conserva `com.anonymous.banuchat` y el certificado SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`. `apksigner` y `aapt` comprobaron firma, paquete, versión y ABI. El bundle contiene `https://banuchat.duckdns.org/api/v2`, rótulos de la versión nueva y ningún marcador revisado de datos privados.

La actualización por ADB en el Huawei YAL-L21 se hizo sobre la aplicación existente y el arranque en frío completó. Se probó iniciar sesión, el teclado nativo, el expediente ficticio, el semestre separado y la tarjeta de Interacción Digital con avance completo. El recursamiento mostró los intentos de 202610 y 202660, sus notas 48/100 y 82/100 y los NRC ficticios 99001 y 99101.

Desde esa APK se envió un saludo con el teclado del teléfono. Se observó la respuesta con cinco fuentes y se reabrió el mismo turno desde Historial, con respuesta y fuentes. **Cerrar sesión** devolvió la aplicación al formulario de acceso. La comprobación web combinó rutas servidas, lecturas autenticadas y navegación hacia Mi progreso. La interrupción del cliente cortó la inspección visual del expediente en Brave.

Paquete académico `BanuChat-entrega-academica-1.0.6.zip`, 29.278.381 bytes, SHA-256 `c128e2d5a7f5211028ab86329b33922817279f81f3d625de4f9d699068514702`. Se verificaron los hashes de la APK y los dos Markdown dentro del ZIP. El archivo incluye únicamente esos tres, un LEEME y el manifiesto de sumas.

La APK y el ZIP están verificados localmente. La publicación de estos archivos en el repositorio público requiere confirmación explícita. La [release 1.0.4](https://github.com/XeyKG/BanuChat_/releases/tag/demo-1.0.4) permanece disponible como respaldo.

La demostración sigue condicionada por el tiempo del Learner Lab y por la latencia de Ollama. Los cursos de referencia describen nombres y pilares documentados en 2026. La aplicación muestra datos ficticios y citas. Los escenarios académicos quedan fuera de matrícula institucional, oferta vigente y evaluación de estudiantes reales.

[Guía de presentación](../operations/GUIA-PRESENTACION-BANUCHAT.md).
