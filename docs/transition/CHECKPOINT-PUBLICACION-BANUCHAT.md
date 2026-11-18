# BanuChat — publicación de demostración

## Calendario, Banu al Día y OE2 — 1.0.4 (18/11/2026)

Web canónica actualizada y verificada por HTTPS. OE2 habilitado con autorización expresa mediante exportación sintética aprobada de solo lectura: dos programaciones, cuatro convocatorias/novedades, comparación con una modificación y cinco registros sin cambios. No matrícula ni integración institucional. Calendario mensual con agenda por fecha, noticias bajo Banu al Día, comparación dentro de Publicaciones OE2 y Recordatorios locales.

Diez pasos Edge contra el dominio público y ocho comprobaciones REST remotas correctos. Huawei físico actualizado a 1.0.4/versionCode 5, misma firma, sesión conservada; calendario, noticias y categorías/comparación OE2 comprobados con backend remoto y sin Metro/API local. Mobile 77/77 y API 22/22 focales; typechecks correctos. Sin cambios RAG, modelos, Supabase ni servicios nuevos. Backup /opt/banuchat/backups/release-104-20261118; versiones anteriores conservadas. APK validada, publicación GitHub pendiente al registrar este código. [Evidencia detallada y límites](CHECKPOINT-DEMO-1.0.4.md).


## Chat conversacional y acceso a progreso — 18/11/2026

Cambios solicitados por el dueño: respuestas normales sin la cabecera repetitiva de procedencia y acceso directo al progreso desde el chat. El backend deja de anteponer esa cabecera y usa «Expediente de…» en su presentación académica. No se cambian permisos, corpus, citas, autenticación ni contratos. La procedencia y el carácter ficticio de expedientes siguen disponibles en las fuentes/pantallas de detalle; no se atribuye aval institucional.

El cliente retira únicamente las cabeceras heredadas conocidas al representar conversaciones guardadas; no reescribe mensajes persistidos ni elimina límites documentales de las respuestas. La tarjeta «Ver mi progreso» aparece junto a evidencia de progreso o una pregunta sobre los datos propios. Navega a la ruta fija /progress, sin aceptar un usuario, perfil o URL generados por el modelo. El usuario puede volver a la misma conversación. La bienvenida es más breve y las sugerencias web usan dos columnas, con controles accesibles y adaptación estrecha.

Validación local real: typecheck Mobile/API correctos; 74/74 tests Mobile y 28/28 backend focales. Edge aislado con PostgreSQL/auth del laboratorio existente: login, bienvenida, consulta de progreso, tarjeta de 79 px de alto, navegación al expediente propio, retorno a la misma conversación, consulta documental sin prefijo, ancho 390 px sin overflow y navegación estrecha y expediente sin cabecera repetitiva: nueve pasos PASS. Embedding de consulta registrado y sin generación LLM en este ensayo local; no confundirlo con una validación remota.

Revisión independiente de tres capturas auténticas: sin bloqueantes ni hallazgos mayores; observación menor sobre nombres heredados «Nueva conversación»/«Nuevo chat». Estados de fallo/espera y lectores de pantalla no se evaluaron visualmente en este recorrido. Capturas y reporte en infra/local/chat-polish-web, excluidos de Git.

Publicación efectiva de esta corrección: API y web canónica actualizadas en la EC2 existente mediante SSM, con guardas de SHA y rollback por fallo de salud. Backup /opt/banuchat/backups/chat-polish-20261118; exportación anterior intacta. Los cuatro servicios activos y HTTPS externo HTTP 200; bundle nuevo entry-4af851d98faa7793861b75827fe41340.js. Edge aislado contra el dominio público repitió los nueve pasos con autenticación real, AWS, Supabase y embeddings de consulta remotos: todos PASS. Las generaciones libres del LLM no fueron el objeto de este recorrido; no se declara RAG estable. El origen sslip.io de transición conserva su exportación anterior. APK chat-polish 1.0.3/versionCode 4 compilada correctamente e instalada con adb install -r en Huawei YAL-L21, mismo paquete y firma. SHA-256 48dcdb79660b06e4909e80863c7948442223bacb2cf919af83329975410b27f9. Sesión conservada; consulta de progreso y botón comprobados contra AWS/Supabase; abrió el expediente propio de la misma cuenta, sin API local/Metro. Escaneo dirigido de ZIP/bundle correcto y origen DuckDNS presente. Archivo privado infra/local/BanuChat-demo-1.0.3-chat-polish-arm64.apk; publicado en https://github.com/XeyKG/BanuChat_/releases/tag/demo-1.0.3 y descargado de nuevo con SHA idéntico. Exportación web canónica activada: entry-4af851d98faa7793861b75827fe41340.js. Android comprobó también vuelta al mismo chat y respuesta documental sin cabecera; capturas auténticas privadas conservadas. La serie remota de nueve consultas posteriores pasó con HTTP 201, 1,75–1,97 s, citas/artefactos/historial coherentes, otra cuenta 404, progreso/expediente 200 y reutilización tras logout 401. Código publicado en main: 70adc8e; corpus, secretos y archivos privados excluidos. Paquete académico 1.0.3 publicado y descargado/verificado: https://github.com/XeyKG/BanuChat_/releases/download/demo-1.0.3/BanuChat-entrega-academica-1.0.3.zip, SHA-256 e20bd242b404ba9075dc91b89a812385f3cceb15ab0b5ca3ffcefd41a3357602. Contiene APK, guía, checkpoint y capturas sintéticas; no incluye corpus CCD ni secretos.


## Actualización operativa 1.0.3 — cobertura CCD y procedencia (18/11/2026)

La consulta «Cuales pruebas debo hacer» fallaba porque el despliegue solo tenía el corpus sintético y seis referencias CCD de costos. El corpus CCD depurado completo seguía local. Con autorización expresa del dueño se copian ahora sus 107 referencias adoptadas; no se subieron PDF originales, expedientes privados ni el árbol externo CCD_DOCUMENTACION.

### Estado instalado y preservación

- Web principal: https://banuchat.duckdns.org/login. HTTPS externo HTTP 200 y bundle 1.0.3 `entry-eb6c831988e8e2b12b4c5f08b70a1267.js`.
- Transición: https://34-239-198-159.sslip.io/login, HTTPS HTTP 200, bundle `entry-58b880a1d47aa5b5cf40dc83c5bbb22e.js`. Ambas exportaciones anteriores conservadas.
- API de la misma EC2 activa con el rol restringido existente. Caddy, web canónica y Ollama también activos después de activar. No se reconstruyó EC2 ni la base, no se cambiaron modelos, autenticación, REST, MCP ni n8n.
- La demo conserva dos releases sintéticas, 32 estudiantes, 62 intentos y 120 vectores. El suplemento privado conserva la release anterior de seis referencias y agrega 107: 113 vectores suplementarios de 1024 dimensiones, independientes de los 120 sintéticos.
- Release suplementaria activa: `82bf409b-2de8-4250-817d-fe19a167b0c2`; manifiesto PostgreSQL SHA-256 `a6cedd1042fc0f5def1752f35b89a75c34659c8b5184f125682fb68f8ea11e12`.
- Procedencia: release local `10af4ffd-effb-41fc-bbfe-4dc48cb3398f`, manifiesto `fde23cabe95c83f5bd632d129312ad68c90624e6ebd489e79e98c6a3d0d96852`. Se conservaron contenido de chunk y vectores, con sus hashes; el Markdown derivado tiene su propio SHA-256. Los embeddings documentales se **copiaron**, no se regeneraron. Los embeddings de consulta sí se calculan en Ollama remoto.
- La carga SQL 016 y los 107 registros se ejecutaron atómicamente mediante pooler de sesión, psql ON_ERROR_STOP, shell set -eu verificado y TLS verify-full con CA oficial. Los errores completos permanecen privados. No se amplió la exposición Data API: anon/authenticated/service_role carecen de USAGE del esquema; runtime solo recibe funciones acotadas. RLS habilitada y executor existente sin login ni BYPASSRLS.

### Comprobaciones realmente ejecutadas

| Consulta nueva contra DuckDNS | HTTP | Segundos | Citas |
| --- | --- | --- | --- |
| Cuales pruebas debo hacer | 201 | 3,01 | 1 |
| Opciones de pruebas diagnósticas del segundo pilar | 201 | 1,81 | 1 |
| Opciones de pruebas diagnósticas del tercer pilar | 201 | 1,61 | 1 |
| cuanto cuesta los cursos vacionales | 201 | 1,65 | 1 |
| cuanto cuesta hacer las pruebas diagnosticas | 201 | 1,64 | 1 |
| Costo de un curso en 2030 | 201 | 1,73 | 1, límite de tarifa no confirmada |
| Intensidad de los cursos | 201 | 1,78 | 1 |
| Inscripción en Cosmos | 201 | 1,65 | 1 |
| Correo de contacto CCD | 201 | 1,71 | 1 |

Cada turno fue reabierto desde Historial, sus citas comparadas campo a campo y su artefacto descargado/verificado por SHA-256. Otra cuenta obtuvo 404 para cada conversación. Expediente y progreso respondieron 200; logout 204 y reutilización del token 401. Las citas de la release anterior de seis referencias siguen leyéndose con el mismo hash. Control negativo: opciones actuales del primer pilar sin respaldo -> abstención honesta y cero citas. No se inventa una lista ni elegibilidad personal.

Estas nueve respuestas reutilizan el motor CCD existente y sus extractos documentados; no acreditan nueve generaciones libres del LLM ni RAG estable. Se mantuvieron API 150 s, cliente 175 s y proxy 180 s. La limitación de generación de dos vCPU continúa.

PostgreSQL local existente: cinco consultas extractivas, HTTP autenticado, historial, descarga, aislamiento y lectura directa denegada 42501. Se usó un vector de consulta de fixture, **no Ollama real local**. Adulterar contenido hizo fallar la integridad; ROLLBACK recuperó el estado. Un pin incorrecto fue rechazado P0409 y las citas con SHA falso P0400 sin mensajes parciales. Ensayo anterior del migrador administrado sin superusuario conservó los grants originales.

Regresiones: backend typecheck correcto, 91/91 pruebas focales de mensajes/CCD/REST y 2/2 nuevas de pin/procedencia y enrutamiento sintético; Mobile typecheck y 71/71; exportación web de ambos orígenes correcta. No se repitió toda la evaluación RAGAS.

Huawei físico: adb install -r exitoso; sesión y cuenta conservadas, pregunta exacta respondida, fuente expandida con texto ampliado, documento completo abierto con etiqueta CCD correcta y retorno al chat. Sin Metro/API local escuchando los puertos 3000/3002/3004/8081/8085/8086. Capturas auténticas y respuestas CCD se conservan en infra/local, excluidas de Git.

### Drive y orquestación

Carpeta privada creada y releída: [BanuChat — CCD depurado](https://drive.google.com/drive/folders/1xFriAxBwPbYV_SJgscJJxV3VL2E5UMu0). 107 archivos text/markdown verificados mediante listado paginado, sin compartir; MANIFEST.json adicional verificado por metadata, 42.579 bytes. Es una copia de referencias depuradas, no 107 PDF originales. Incluye límites, período, condiciones y diferenciación de confirmaciones de dominio; no aval institucional.

Drive conserva los documentos; Supabase privado conserva vectores y citas. El camino de consulta sigue Web/Android -> API AWS -> Supabase + Ollama. No se sustituyeron referencias por enlaces públicos Drive ni se puso n8n en el camino síncrono. La automatización Drive -> n8n -> validador/ingesta existente requiere una credencial Google propia de n8n y control de publicaciones por manifiesto. **No configurada ni ejecutada en este cierre**; la conexión Google de esta herramienta no acredita acceso OAuth de n8n. No usar un template de 1536 dimensiones ni abrir las tablas a Data API para conectarlo. MCP/ReAct conserva su estado académico previamente documentado.

### Archivos, artefactos y reversión

Se agregaron 015_approved_fee_references.sql y 016_approved_ccd_corpus.sql, el adaptador aprobado de RAG, composición opcional de runtime, persistencia autenticada de citas suplementarias y tests de su frontera. Exportador/constructores de carga en infra/scripts producen archivos privados; no cargan ni regeneran vectores automáticamente. El visor Mobile determina la procedencia del artefacto autenticado; versión 1.0.3, versionCode 4.

APK candidata verificada: 47.055.224 bytes; SHA-256 `f856943b5e7dd2f7a42d664ddb33f902fbf15c69e298a2b17330c3aa84b82d41`; paquete com.anonymous.banuchat y mismo certificado SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`. Inspección dirigida ZIP/bundle: sin archivos privados/keystores ni marcadores de conexión/clave privada, origen DuckDNS presente. Firma de debug, no certificado de producción. No es auditoría exhaustiva.

Backup de código/env no secreto previo a activar: /opt/banuchat/backups/approved-ccd-82bf409b. Reversión preparada: restaurar sus dos TS y api.env.before, reiniciar banuchat-api y verificar auth/me=401; no borrar releases. La release de seis fuentes sigue íntegra y funciona con el adaptador anterior. Backup previo de código base y snapshot privado del esquema suplementario de seis referencias conservados; no se declara una restauración del suplemento 107 no ejecutada. El enlace web anterior se guarda en transition-link.before en el mismo backup. Exportaciones 1.0.2 y APK anteriores intactas. No se ejecutó una parada/downgrade para retirar la corrección en servicio.

Riesgos: disponibilidad condicionada a AWS Academy; sin SLA ni permanencia, no se compraron recursos. Último crédito observado durante esta tarea: US$8,10 usados de US$50, lectura anterior con retraso, no saldo actual certificado. Fuentes con vigencia/alcance acotados y sin aval institucional; expedientes sintéticos no prueban situación real. Los resultados históricos y brechas OE1–OE6 de la guía académica se conservan.


## Release 1.0.2 — cierre visual del 17 de noviembre de 2026

Base: `main` en `9442407`, inicialmente limpio. [Entrega académica consolidada](ENTREGA-FINAL-BANUCHAT.md). No se modificaron arquitectura, contratos REST, autenticación del servidor, RAG, modelos, Supabase ni servicios AWS. Solo se desplegaron las exportaciones del cliente sobre los servicios existentes y se actualizó la APK.

Publicación efectiva: [release `demo-1.0.2`](https://github.com/XeyKG/BanuChat_/releases/tag/demo-1.0.2), creada sobre el commit `aea7ccb`, publicada tras descargar y verificar por SHA-256 el [APK](https://github.com/XeyKG/BanuChat_/releases/download/demo-1.0.2/BanuChat-demo-1.0.2-arm64.apk). La descarga autenticada coincide con los 47.054.452 bytes instalados en el Huawei. La 1.0.1 se conserva. El acceso a los assets requiere permisos del repositorio privado. La guía final enlaza el paquete académico único; su archivo de sumas permite comprobar la descarga.

El [paquete académico único](https://github.com/XeyKG/BanuChat_/releases/download/demo-1.0.2/BanuChat-entrega-academica-1.0.2.zip), de 49.941.551 bytes, también fue publicado y descargado con verificación SHA-256 `0e7b83f0268e3bb3d29839263a41270d2bd88ca3496f15bc24c8a53945f70f17`. Incluye APK, guía, checkpoint hasta `dd76014`, matrices académicas, informe histórico público sin preguntas/respuestas CCD y capturas. Sus 25 entradas de manifiesto fueron verificadas individualmente. [SHA256SUMS](https://github.com/XeyKG/BanuChat_/releases/download/demo-1.0.2/SHA256SUMS-1.0.2.txt) publicado y descargado correctamente. GitHub confirmó `draft=false` y los tres assets con sus tamaños y digests; no se sustituyeron versiones anteriores.

### Cambios y validación efectiva

- `ChatScreen`, `ChatSources`, `WebFrame` y CSS web: eliminación de cabecera y panel documental duplicados en chat web; citas completas disponibles en cada respuesta. Compositor con campo y envío en una fila; instrucciones duplicadas retiradas. Controles conservan mínimos táctiles y texto ampliado. Fuentes multilínea, detalle/localizador conservado y control para contraer al final.
- `DocumentScreen`: `isCcdKnowledge()` distingue la procedencia; modo sintético muestra «Material ficticio de demostración», modo CCD conserva procedencia y ausencia de aval institucional.
- `Login`: botón sin condición de campos/formato ni bloqueo por fase unavailable; valida al pulsar. Continúa bloqueado solo mientras la solicitud está en curso para evitar duplicados. La validación no autentica ni modifica contratos. El origen sslip.io conservaba una exportación antigua con botón vacío desactivado: se reemplazó también esa exportación, preservando la anterior.
- Metadatos Mobile: 1.0.2 / versionCode 3, mismo identificador y certificado.

Pruebas finales: `npm run typecheck` correcto; `npm test` **70/70**; `npm run web:test` **1/1**, incluyendo errores REST y binarios del proxy; `git diff --check` correcto. Revisión independiente visual/código sin bloqueantes; observación inicial sobre captura incorrecta de texto ampliado resuelta con la prueba real del chat. No se repitieron regresiones de backend o nuevas inferencias costosas, porque este cambio no afecta esas implementaciones.

Web real 1366 × 768: misma conversación antes/después, área aproximada de mensajes de 403 a 541 px (+34 %) y pane de 807 a 1071 px (+33 % de ancho). Sin desbordamiento del documento. A 390 × 844 se recorrieron las cinco fuentes y se contrajeron desde abajo. Visor y artefacto completo abiertos, procedencia sintética correcta. Login: ambos campos vacíos, UID inválido, contraseña ausente y credenciales rechazadas muestran sus errores; acceso correcto comprobado. La comprobación HTTPS desde Windows devolvió HTTP 200, TLS verificado y cero redirecciones para `/login` tanto DuckDNS como sslip.io.

Huawei YAL-L21 físico: `adb install -r` correcto, sesión sintética existente conservada; versión instalada 1.0.2/code 3. Se reabrió el turno documental del 17/11 a las 12:06 desde Historial, con cinco fuentes persistidas; se abrió el documento completo con el rótulo corregido. Campo y envío visibles con teclado. A escala de texto 1,5 se recorrió la quinta fuente, se pulsó Contraer fuentes y se confirmó Mostrar 5 fuentes. Se restauró escala original 1,15. Logout, botón activo con campos vacíos/advertencia y nuevo login correcto de `U90000002` comprobados. No había listeners locales en 3000, 8081, 8082, 8085 y 8086 durante la comprobación; el APK usa DuckDNS. No se ensayó lector de pantalla ni se declara accesibilidad integral certificada.

### Artefactos, despliegue y reversión

APK ARM64: **47.054.452 bytes**, SHA-256 `263770f24b17149b73a48b2b37d08167a7faa85480168067e76dea11f3222f90`. `apksigner` verifica el mismo certificado SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c` que 1.0.1; firma local de debug. `aapt` confirma `com.anonymous.banuchat`, versionCode 3, ARM64. Inspección dirigida del ZIP/bundle: URL `https://banuchat.duckdns.org/api/v2` presente, URL antigua de API ausente; no archivos de credenciales/keystores ni marcadores de conexión privada ni contraseñas de fixtures. No equivale a auditoría exhaustiva de dependencias.

En la misma EC2, exportación DuckDNS en `/opt/banuchat/mobile/.expo/release-1.0.2`; bundle `entry-0a1d53778381e8a9ea0bd06d37006f54.js`. Se actualizó la ruta del launcher existente y reinició `banuchat-web-duckdns`, con comprobación HTTP posterior. Archivo previo conservado en `/opt/banuchat/web-launcher.pre-102.jFkVo0` y exportación 1.0.1 intacta. Reversión web canónica: restaurar ese launcher y reiniciar el mismo servicio. No se ejecutó reversión porque retiraría la corrección validada.

Origen sslip.io: exportación separada en `.expo/release-1.0.2-transition`, bundle `entry-e03e2b23fb50d32224c7075548195f54.js`. El servidor 8085 conserva su configuración y `.expo/unified-web` apunta a esa exportación. Directorio previo conservado en `/opt/banuchat/transition.pre-102.3SWRy0/unified-web`; permite revertir el enlace sin reconstruir. No se eliminaron APK ni releases anteriores. Un downgrade Android puede requerir otro procedimiento y no se ensayó.

Archivo de transporte canónico: SHA-256 `592ccd015a23019ab10e723fa3a6c81c96ed6d0cf0cbe776265560cedad4f6c2`. Archivo de transición: `dc67a939734827cceb923f8a8305abdfef593dc36b48127d20f5e5f712a86a65`. Se usaron CloudShell, el bucket privado de transferencia existente y SSM; sin credenciales añadidas al repositorio ni nuevos recursos.

### Evidencia académica y límites

Capturas auténticas antes/después y texto ampliado en [evidence/release-1.0.2](evidence/release-1.0.2/). La entrega final coteja la guía con la transcripción del anteproyecto y la matriz académica vigente: objetivos parcialmente demostrados, métricas históricas insuficientes, estudio SUS no ejecutado y ausencia de aprobación institucional. No se incorporó el PDF privado ni corpus CCD al paquete.

**RAG sigue siendo irregular**: se conservan los éxitos y fallos 1.0.1 siguientes. No se cambia la espera API 150 s / cliente 175 s / proxy 180 s. Dos vCPU y la disponibilidad de AWS Academy siguen siendo límites. No se leyó de nuevo el saldo, no se ensayó otra parada de la instancia y no se declara hosting permanente. La 1.0.1 documenta recuperación real del mismo laboratorio y pruebas previas de aislamiento/revocación/expediente; no se vuelven a presentar como ejecutadas en 1.0.2.

## Release 1.0.1 — cierre del 17 de noviembre de 2026

[Web principal](https://banuchat.duckdns.org/login) · [Release 1.0.1 publicada](https://github.com/XeyKG/BanuChat_/releases/tag/demo-1.0.1) · [APK ARM64](https://github.com/XeyKG/BanuChat_/releases/download/demo-1.0.1/BanuChat-demo-1.0.1-arm64.apk).

GitHub confirmó la publicación con `draft=false`, etiqueta `demo-1.0.1` y archivo de 47.054.108 bytes. Se descargó el asset autenticado y se comprobó su SHA-256 contra el APK instalado. La etiqueta identifica el código de `5728a13`. El repositorio conserva acceso privado y la versión 1.0.0 sigue disponible. La comprobación HTTPS final desde Windows devolvió HTTP 200 sin redirección y verificación TLS satisfactoria. El estado entregado es una demostración funcional con inferencia irregular, documentada en los ensayos siguientes.

DuckDNS sirve directamente la web y REST v2 desde `https://banuchat.duckdns.org`. La comprobación externa devolvió HTTP 200, TLS válido y ninguna redirección en `/login`. El origen de transición `sslip.io` conserva su proxy anterior para la APK 1.0.0. La misma EC2 ejecuta `banuchat-web-duckdns.service`, habilitado para arrancar automáticamente, con el proxy en loopback 8086 y la exportación `mobile/.expo/release-1.0.1-fixed`. Caddy dirige DuckDNS a ese puerto y conserva 8085 para el origen anterior. Host y Origin mantienen comprobación exacta por origen. Una petición con Origin ajeno recibió 403, una petición anónima a `/auth/me` recibió 401 y el expediente autenticado respondió 200 sin redirección.

El backend de generación que ya estaba desplegado coincide con el SHA-256 del archivo local `ollama-generator-client.ts`, `6d148bc5394af39a97fa30b786ab51111a5e86cd51dcb26a3c93fbaaad5fca19`. La API conserva 150 s para generación, el cliente publicado incorpora 175 s sobre HTTPS y el proxy conserva 180 s. El perfil local mantiene su límite anterior. Los errores 502, 503 y 504 se tratan como resultado incierto porque también pueden producirse al perder el acuse de un COMMIT. El cliente conserva la pregunta y ofrece Comprobar estado, sin reenvío automático. La revisión independiente del cambio confirmó esa recuperación. Los tests simulan respuestas HTTP ambiguas; la pérdida real de un acuse de COMMIT no se provocó.

### Serie remota sobre DuckDNS

Las dos preguntas se enviaron secuencialmente desde un cliente externo, en conversaciones nuevas, con la API remota y Supabase. Cada respuesta dejó exactamente dos mensajes y cinco citas. Las diez descargas de artefactos respondieron HTTP 200.

| Pregunta | HTTP / tiempo total | Tokens entrada / salida | Evaluación del prompt | Generación |
| --- | --- | --- | --- | --- |
| ¿Qué explica la orientación general del Programa Demo de Aprendizaje Digital sobre sus límites? | 201 / 145,87 s | 1659 / 78 | 110778 ms | 24125 ms |
| ¿Qué indica el documento de evaluación formativa sobre la entrega de evidencias? | 201 / 117,41 s | 1614 / 82 | 89883 ms | 25245 ms |

En la primera, embedding tardó 5231 ms y pgvector 74 ms. En la segunda, pgvector tardó 64 ms. El generador recibió dos hilos. Se conservaron los cinco fragmentos completos y los modelos y vectores existentes. La serie previa de preguntas distintas y repetidas permanece documentada abajo. El costo de evaluar prompts nuevos en dos vCPU sigue siendo una limitación. Recortar los documentos o cambiar de modelo requiere una evaluación de calidad adicional y no se aplicó a esta entrega.

Durante la interrupción por créditos de la herramienta, el Learner Lab llegó a 00:00 y detuvo la EC2. Se inició otra sesión del mismo laboratorio. La instancia existente recuperó DuckDNS con la misma IP elástica y HTTP 200. `banuchat-api`, `banuchat-web-duckdns`, `banuchat-https` y `ollama` aparecieron activos, y la precarga terminó con `Result=success` y `ExecMainStatus=0`. Con los modelos cargados se observaron 3013 MiB disponibles y cero swap. El crédito mostrado antes y después de reactivar fue US$7,60 usados de US$50, sujeto al retraso del tablero.

### Web y distribución Android

En el navegador bajo DuckDNS se reabrió una conversación desde Historial, se expandieron sus cinco fuentes y se abrió el contenido completo de un artefacto. Las dos cuentas ficticias mostraron SIM-0003 y SIM-0004, respectivamente. El historial de la segunda estaba vacío y el de la primera conservaba sus turnos. Se verificó el regreso al login al cerrar sesión. Por REST en DuckDNS, logout devolvió 204 y el uso posterior de esa sesión devolvió 401. El aislamiento por conversación ajena con 404 está acreditado en la serie previa.

La APK ARM64 1.0.1 usa `https://banuchat.duckdns.org/api/v2`, conserva `com.anonymous.banuchat` y aumenta `versionCode` a 2. `apksigner` verificó ambas versiones y el mismo certificado SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`. La firma sigue siendo la local de debug de esta demostración. El APK tiene SHA-256 `0c1a913cc062048a9289d6b9b93dbff6a8e86cba6a21ba65e983364bd7b3292d`. La inspección del ZIP y del bundle comprobó la URL nueva, ausencia de la URL de API anterior y ausencia de archivos de credenciales, keystores y marcadores de conexión privada o contraseñas de fixtures. El alcance fue una inspección dirigida del artefacto.

La compilación inicial falló por memoria nativa de Java en el PC. Gradle completó el build con un trabajador, heap de 1 GiB y la caché existente. ADB instaló 1.0.1 como actualización y confirmó versión 1.0.1 / código 2. El formulario vacío mostró «Ingresa tu usuario y contraseña». El login permitió abrir SIM-0001 y mostrar el recursamiento con sus dos intentos. Durante estas pruebas Metro y la API local estaban apagados y ADB no tenía túneles reverse.

En el ensayo Android posterior al arranque se envió una pregunta nueva sobre preparación para una sesión, recuperó cinco fragmentos, embedding en 450 ms y pgvector en 127 ms. Ollama agotó 150003 ms y la APK pasó al estado de resultado sin confirmar conservando el texto. Comprobar estado devolvió que el turno no aparecía. La revisión automática rechazó confirmar el aviso de posible duplicado al intentar un reenvío manual. Se canceló esa confirmación y se continuó con una pregunta distinta en una conversación independiente.

La segunda pregunta Android, sobre la entrega de evidencias, respondió con cinco citas. Embedding tardó 246 ms y pgvector 71 ms. La llamada a Ollama terminó con HTTP 200 en 136217 ms, con 1613 tokens de entrada, 96 de salida, evaluación del prompt de 104652 ms y generación de 31415 ms. El cliente recibió la respuesta después de superar los 90 s de la versión anterior. Durante esta generación, tres muestras de un segundo de vmstat reportaron 100 % de CPU de usuario, 2772 MiB disponibles y cero swap. La muestra respalda una limitación de cómputo en esta instancia.

Se expandieron las cinco citas, se descargó y visualizó el documento completo, se reabrió el turno desde Historial y se confirmaron sus fuentes. La verificación REST posterior observó exactamente dos mensajes y cinco citas en `50f0faba-a566-4876-b1b6-62c5783b9e94`, cinco artefactos HTTP 200 y cero mensajes en el intento cancelado `8696d1d4-cc63-4c71-94e5-ce425de2cd59`. La segunda cuenta recibió 404 al solicitar el turno ajeno. El selector académico ajeno recibió 400. Logout revocó el token de la prueba REST con 401. En Android se cerró sesión y el nuevo login de la segunda cuenta mostró Bruno Arcilla. El recorrido de 1.0.1 se completó con Metro y API local apagados.

El visor conserva el subtítulo heredado «Fuente documental CCD» en esta demostración sintética. El contenido descargado está marcado como sintético. La captura permite reconocer esta inconsistencia de rotulado sin atribuir procedencia institucional a los documentos.

### Pruebas y entrega académica

Pasaron los chequeos de tipos, 107 pruebas enfocadas de API, 70 pruebas de móvil y la prueba del proxy web. Esta última necesitó permiso de loopback fuera del sandbox tras un EACCES. La guía compacta, el guion con contingencia mediante Historial y la relación provisional con OE1–OE6 están en [ENTREGA-DEMO-1.0.1.md](ENTREGA-DEMO-1.0.1.md). Las capturas auténticas se conservan en `docs/transition/evidence/release-1.0.1/`. Los criterios académicos de calidad, SUS y latencia requieren sus evaluaciones específicas.

La configuración de Caddy previa al cambio se conserva en `/etc/caddy/Caddyfile.pre-101.batssA`. Para volver temporalmente a la redirección anterior, copiar ese archivo sobre `/etc/caddy/Caddyfile`, validar con `caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile` y recargar Caddy. La APK 1.0.0 y el origen anterior permiten recuperar la demostración previa. No se eliminaron datos ni versiones.

## Validación de rendimiento y publicación del 17 de noviembre de 2026

Desde Windows, `https://banuchat.duckdns.org/login` completó la redirección con TLS válido y devolvió HTTP 200 en el origen `sslip.io`. La serie REST se ejecutó por HTTPS en ese origen, con la misma cuenta sintética, consultas secuenciales y una conversación vacía por envío. Después de cada POST se consultó el historial y se descargaron los cinco artefactos por sus rutas protegidas.

| Orden y pregunta | Tiempo POST | HTTP | Mensajes persistidos | Citas | Descargas |
| --- | ---: | ---: | ---: | ---: | --- |
| 1. ¿Qué explica la orientación general del Programa Demo de Aprendizaje Digital sobre sus límites? | 147,06 s | 201 | 2 | 5 | 5 de 5 HTTP 200 |
| 2. ¿Qué indica el documento de evaluación formativa sobre la entrega de evidencias? | 117,11 s | 201 | 2 | 5 | 5 de 5 HTTP 200 |
| 3. Misma pregunta del paso 2, en otra conversación nueva | 29,97 s | 201 | 2 | 5 | 5 de 5 HTTP 200 |

La pregunta del paso 1 había agotado el plazo de generación en el ensayo anterior y ahora quedó a unos tres segundos del límite de la API. La repetición del paso 2 fue 3,9 veces más rápida. El resultado es compatible con reutilización del prefijo y con un costo alto al evaluar evidencia nueva. La instrumentación del ensayo anterior sí separó evaluación y generación. En esta serie se midió desde el cliente y quedaron sin observar las métricas internas por consulta, fallos de página, configuración efectiva de la cola y manejo de la cancelación dentro de Ollama. La sesión administrativa de EC2 no estuvo disponible desde las herramientas de esta ejecución, por lo que tampoco hubo reinicio, prueba controlada de hilos o contexto, ni nueva lectura de créditos. El último valor observado sigue siendo US$7,60 de US$50.

Se investigó el formato del prompt. Su evidencia conserva los cinco fragmentos completos, con título y localizador por fragmento. Quitar solo encabezados conserva la información, pero no reduce el cuerpo de los 5 KiB observados en el ensayo anterior. Antes de recortar el contenido o el historial, se requiere una comparación de respuestas, fuentes y seguimiento en el modelo remoto. La prueba de regresión verifica que un error de generación, incluida una respuesta incompleta, no llega a persistir el turno. El historial remoto confirmó exactamente dos mensajes por cada envío exitoso. Esta serie no observó un 503, por lo que no aportó una comprobación remota nueva de persistencia tras cancelación.

En Huawei, con la APK existente, se reabrió un turno documental con cinco fuentes desde Historial, se expandieron las referencias, se cerró sesión y se volvió a iniciar con la cuenta sintética. Desde esa sesión se envió una nueva pregunta documental sobre la entrega de evidencias, se observó la respuesta con cinco fuentes y se abrió el expediente SIM-0001. Evidencia local en `infra/local/BanuChat-Android-RAG-2026-11-17.png`. Metro y la API local estaban apagados, sin túneles ADB reverse. Por REST se comprobaron expedientes distintos para ambas cuentas, HTTP 404 al abrir una conversación ajena, HTTP 204 en logout y HTTP 401 al usar la sesión revocada. La repetición de estas comprobaciones con dos cuentas en el navegador y la captura web siguen pendientes.

Los chequeos de tipos y 107 pruebas de API y 69 de móvil pasaron. La prueba de transporte móvil ahora admite el origen HTTPS sintético que ya permite el código y mantiene la comprobación del canal HTTP local. Se conservan el origen de transición y la APK existente. Las consultas nuevas quedaron cerca de los límites y sobrepasan en algunos casos los 90 s del cliente publicado. La exportación de DuckDNS y el ajuste del cliente de 175 s continúan sin publicar. Para la demostración actual, comprobar el estado de la EC2 y la precarga desde Session Manager, ensayar el turno previsto y conservar su conversación para mostrar evidencia y fuentes desde Historial si Ollama agota el plazo durante la presentación.

## Estabilización del 17 de noviembre de 2026

Desde Windows, con verificación TLS, DuckDNS respondió HTTP 302 y el origen de transición respondió HTTP 200. La IP elástica conservó el valor 34.239.198.159 al arrancar de nuevo la EC2 existente. El panel del Learner Lab mostró US$7,60 usados de US$50. Los servicios publicados dependen de que el laboratorio mantenga la instancia encendida. Para recuperar la demo, iniciar el Learner Lab, comprobar los servicios con `systemctl is-active ollama banuchat-api banuchat-web banuchat-https` desde Session Manager y confirmar la precarga con `journalctl -u banuchat-ollama-warmup -b`. En el arranque observado, la precarga automática terminó con código 0 y la sonda de generación tardó 21,45 s.

La API de la EC2 registra tiempos y tamaños mediante `BANUCHAT_RAG_METRICS=1`. El registro excluye las preguntas, el texto de las fuentes y los tokens de sesión. La configuración de prueba pasó dos hilos a Ollama en la EC2 de dos vCPU. Los dos modelos estaban residentes, ambos con un contexto de 4096, y el sistema tenía 2232 MiB disponibles y cero swap. Se conservaron los modelos, los embeddings y la recuperación de cinco fragmentos.

| Consulta | Extremo a extremo | Embedding / SQL | Evaluación / generación | Resultado |
| --- | ---: | ---: | ---: | --- |
| Propósito del Programa Demo de Aprendizaje Digital, después del arranque y la precarga | 137,87 s | 534 / 153 ms | 112010 / 16518 ms | 5 citas, artefacto HTTP 200 |
| Misma pregunta, nueva conversación con el sistema caliente | 19,17 s | 81 / 71 ms | 326 / 16784 ms | 5 citas, artefacto HTTP 200 |
| Límites del mismo programa | 150 s hasta el corte de la API | 455 / 82 ms | Sin métricas finales de Ollama | API 503 `DEPENDENCY_UNAVAILABLE`, Ollama HTTP 500 al cancelarse la solicitud |
| Sonda breve directa de Ollama, 13 tokens de entrada y 2 de salida | 1,30 s | No aplica | 961 / 192 ms | HTTP 200 |

La primera pregunta documental incluyó 5285 bytes de evidencia y 1656 tokens de entrada. La variante fallida recuperó cinco fragmentos y 5219 bytes de evidencia. El temporizador de la API canceló la generación a los 150002 ms y no se observó un evento de falta de memoria. La causa interna exacta del HTTP 500 de Ollama sigue sin determinarse. Los resultados confirman que la latencia de la evaluación del prompt puede dejar la generación fuera del presupuesto incluso con los modelos ya cargados. La repetición caliente solo mide un escenario favorable. Dentro del laboratorio, la mitigación comprobada para la demo es conservar la precarga y comprobar anticipadamente la pregunta del guion. Cualquier cambio de empaquetado de evidencia requiere repetir preguntas distintas y comparar la calidad de las respuestas y las cinco citas.

El código compartido por web y Android fija 175 s para el chat sobre HTTPS, entre el corte de generación de 150 s y el límite de 180 s del proxy. En local conserva 90 s. Pasaron los chequeos de tipos y 106 pruebas de API y 21 de móvil. Se exportó la web de DuckDNS en staging en la misma EC2. La web pública y la APK publicada aún usan la configuración anterior. La migración del origen y la nueva APK quedan condicionadas a respuestas documentales consistentes.

En el navegador real se verificó el login con la cuenta ficticia asociada a SIM-0003, su expediente y progreso, una respuesta documental con cinco fuentes, la expansión de esas referencias, la navegación a Historial y el regreso al login tras cerrar sesión. La descarga del artefacto se comprobó por REST. Siguen pendientes la reapertura del turno desde Historial, la comprobación del segundo usuario desde la interfaz y el nuevo login y logout en Android físico. Las pruebas Android y de aislamiento por REST anteriores se conservan abajo.

## Entorno

Base de código `8a32c04710b4e911c2f0c5a4623510aac5e6354b`. El Learner Lab muestra US$5,40 usados de US$50 al iniciar. La guía de ese curso indica sesiones de cuatro horas y parada automática de EC2 al vencer. En `us-east-1` se aprovisionó `i-0a726734ca6c6f10d`, Amazon Linux 2023, `m6i.large` de 8 GiB, gp3 cifrado de 24 GiB e IMDSv2 obligatorio. Session Manager administra la instancia. El grupo `sg-0e0b64c1a5bc3e1a6` permite entrada TCP 443. La IP pública asignada por EC2 puede cambiar tras detenerla.

Se instaló Node 24 y Ollama con `qwen3:4b-instruct` y `qwen3-embedding:0.6b`. Al vencer el laboratorio, la primera IP dejó de responder. Tras reactivar la misma EC2, se reconstruyeron los clientes para [el formulario público vigente](https://34-239-198-159.sslip.io/login). Respondió HTTP 200 con verificación TLS y se abrió en navegador. La instalación usa código y corpus sintético extraídos del repositorio y dos paquetes cifrados en un bucket S3 privado de staging. No se transfirió CCD ni se creó otra base PostgreSQL. Supabase conserva la base y las funciones de CLOUD-01B.3.

Ollama quedó en loopback. Tras la autorización, se instaló 0.35.0 a partir del paquete oficial verificado por SHA-256 y se descargaron de nuevo los manifiestos para recuperar las revisiones exactas. La API arrancó como servicio systemd después de instalar las dependencias de RAG y MCP. Los valores restringidos de Supabase se transfirieron cifrados y se comprobaron permisos 0600. El perfil administrado admite `BANUCHAT_GENERATOR_TIMEOUT_MS`; se configuró 150000 tras observar cancelaciones a los 30 y 75 segundos. El cliente conserva un límite de 90 segundos, por lo que una primera consulta con el modelo frío puede agotar su espera.

Una consulta de solo lectura confirmó 36 tablas privadas, 32 estudiantes, 62 intentos y 120 vectores de 1024 dimensiones. `cloud_runtime` carece de lectura directa de estudiantes. Los roles `anon` y `authenticated` carecen de `USAGE` sobre `banuchat_academic`.

## Código y pruebas

Se extendieron la configuración de Expo, la exportación web y el proxy existente para usar un origen HTTPS explícito en modo sintético. Web y Android comparten el mismo endpoint REST. El proxy comprueba Host, Origin, método y ruta y no publica CORS permisivo. La configuración local sigue disponible para CCD.

Pasaron `npm run typecheck` en móvil y API, 34 pruebas de contrato y recuperación documental, `npm run web:test`, seis pruebas enfocadas de origen y sesión web, la exportación estática con 15 rutas y `git diff --check`.

Gradle falló primero por la transformación `fbjni`, el espacio de C: y las rutas largas de Ninja. La copia de compilación con ruta corta `X:/bch` completó `assembleRelease` ARM64 para la nueva URL. Se forzó la regeneración del bundle porque Gradle había reutilizado el origen anterior. El APK actualizado está en `infra/local/BanuChat-demo-arm64.apk` (47.054.188 bytes, SHA-256 `3F5D9A76B8382CA3192304A27CD2A76758024197F211C4EBB6D25BE0FD26D402`). `apksigner` verificó la firma de debug local. ADB confirmó instalación y arranque en el Huawei YAL-L21. El login, restauración de sesión y expediente SIM-0001 se observaron en el teléfono. La corrección del cliente permite solamente GET al expediente propio. La captura está en `infra/local/BanuChat-Android-expediente.png`.

Desde el cliente de prueba externo, la API HTTPS validó dos cuentas distintas, expediente, recursamiento, progreso, selector rechazado, conversación ajena con HTTP 404 y chat académico con cero citas. El RAG documental respondió en 22,91 s con cinco citas, artefacto HTTP 200 y conversación `e74646a1-0e6b-4058-96f4-24b6da7225c0`. Después de reiniciar la API, se recuperaron las cinco citas y logout revocó el token con HTTP 401. También pasaron 32 pruebas del cliente Ollama. Quedan pendientes el recorrido gráfico autenticado completo en web y el RAG desde la interfaz Android.

## Operación

### Precarga de Ollama en EC2

`banuchat-ollama-warmup.service` está habilitado para ejecutar la precarga al arrancar la EC2. Ejecuta una consulta corta de embeddings y otra de generación, con residencia de 15 minutos y comprobación de que ambos modelos siguen cargados. La primera ejecución del servicio en la instancia terminó con código 0 en 10 s. Después quedaron 3.041 MiB de memoria disponible y el servidor seguía sin swap. La prueba se hizo iniciando el servicio en la EC2 activa. Falta validar el siguiente reinicio completo.

Una consulta documental posterior agotó el tiempo de generación incluso después de la precarga. Ollama devolvió HTTP 200 en embeddings en 0,47 s y HTTP 500 en generación tras 2 min 29 s. La API devolvió `DEPENDENCY_UNAVAILABLE`. La residencia de los modelos quedó verificada, pero no garantiza la latencia de una pregunta con evidencia documental.

Desde Session Manager, usar `systemctl is-enabled banuchat-ollama-warmup` y `journalctl -u banuchat-ollama-warmup -b`. Antes de abrir la demo, comprobar residencia con `bash /opt/banuchat/infra/scripts/ollama-demo-warmup.sh --check`. Si devuelve un error porque los modelos se descargaron de memoria, ejecutar `sudo systemctl start banuchat-ollama-warmup` y repetir la comprobación. Esta señal es distinta del estado HTTP de Caddy. El cliente todavía espera 90 s, mientras que la generación administrada puede esperar 150 s y el proxy 180 s.

El usuario registró `banuchat.duckdns.org`. Su registro A apunta a la IP elástica 34.239.198.159. Caddy sirve HTTPS para el nombre y redirige con HTTP 302 al origen `https://34-239-198-159.sslip.io` conservando la ruta. Desde Windows se verificó la resolución pública, TLS válido y HTTP 200 al seguir la redirección de `/login`. La APK publicada usa ese mismo origen de API. El alias está disponible mientras la EC2 sirve HTTPS. [Acceso a BanuChat](https://banuchat.duckdns.org/login) · [Documentación de DuckDNS](https://www.duckdns.org/about.jsp)

### Recuperación observada el 17 de noviembre de 2026

El laboratorio estaba terminado y la URL agotaba el tiempo de conexión. Al iniciar otra sesión del Learner Lab, la EC2 existente arrancó con la misma IP pública, 34.239.198.159. Los servicios `banuchat-api`, `banuchat-web`, `banuchat-https` y `ollama` aparecieron activos y habilitados. Ollama reportó 0.35.0. Desde Windows se obtuvo HTTP 200 con TLS válido y se recuperó el expediente SIM-0001 por HTTPS mientras los puertos locales de Metro y la demo estaban cerrados. El tablero mostró US$7,50 usados de US$50.

La primera consulta documental tras el arranque agotó 150 segundos durante la generación. Con ambos modelos ya cargados, el siguiente turno respondió en 25,26 segundos, con cinco citas y descarga HTTP 200. El turno web anterior que había quedado en curso conservó la conversación vacía. En aquella sesión del navegador se observó el expediente con recursamiento y el envío de la consulta. Tras reactivar el laboratorio, la pestaña anterior ya estaba cerrada. Queda pendiente repetir la consulta visual y verificar el cierre de sesión en web y Android con sesiones autenticadas.

La [web restaurada](https://34-239-198-159.sslip.io/login) conserva el origen del [APK publicado](https://github.com/XeyKG/BanuChat_/releases/download/demo-1.0.0-e7cd37d/BanuChat-demo-arm64.apk). El APK y su SHA-256 siguen siendo los de la Release documentada abajo.

### Cierre del 13 de noviembre de 2026

- [Web de demostración](https://34-239-198-159.sslip.io/login). HTTP 200 y TLS válido desde Windows con los puertos locales 3004, 8081 y 8085 sin listeners. ADB no registró túneles reverse.
- [Release 1.0.0 de demostración](https://github.com/XeyKG/BanuChat_/releases/tag/demo-1.0.0-e7cd37d) y [descarga ARM64](https://github.com/XeyKG/BanuChat_/releases/download/demo-1.0.0-e7cd37d/BanuChat-demo-arm64.apk). El repositorio es privado y la descarga requiere acceso. GitHub confirmó el digest indicado arriba. La inspección del ZIP y bundle verificó el origen HTTPS y la ausencia de archivos de credenciales y keystores.
- En EC2 se verificó que `banuchat-api`, `banuchat-web`, `banuchat-https` y `ollama` estaban activos y habilitados para arrancar automáticamente. Ollama reportó 0.35.0 y los digests esperados. Dos cuentas completaron login, expediente y progreso por REST con los servicios locales apagados. Una nueva consulta documental devolvió 503 tras 149 s en generación y Android mostró el estado de envío sin confirmar. El resultado anterior de cinco citas sigue siendo evidencia de una ejecución satisfactoria, no de una latencia sostenida.
- Tras precargar `qwen3:4b-instruct` desde Session Manager, otra consulta documental HTTPS respondió en 28,16 s, con cinco citas y artefacto HTTP 200. El Huawei recuperó su propio turno desde Historial y expandió sus cinco fuentes. Evidencia local: `infra/local/BanuChat-Android-fuentes.png` y `infra/local/BanuChat-Android-expediente.png`. Para precargar antes de presentar, ejecutar en EC2 `curl -fsS --max-time 75 http://127.0.0.1:11434/api/generate -H 'Content-Type: application/json' -d '{"model":"qwen3:4b-instruct","stream":false,"keep_alive":"15m"}'` y comprobar `done:true`. El resultado en frío puede superar la espera del cliente.
- Arquitectura observada: web y APK → Caddy HTTPS → proxy Node → API Node → Supabase y Ollama. AWS conserva código, configuración y modelos en el volumen de EC2. Supabase conserva expedientes e historial. El PC se usó como cliente de prueba.
- Para recuperar la demo, iniciar Learner Lab y comprobar que la EC2 existente está en ejecución. Abrir Session Manager y ejecutar `systemctl is-active ollama banuchat-api banuchat-web banuchat-https`. Si la IP cambió, exportar web para el nuevo origen `sslip.io`, actualizar Caddy y `BANUCHAT_WEB_ORIGIN`, reiniciar web y HTTPS, comprobar TLS y reconstruir el APK con el nuevo `EXPO_PUBLIC_API_BASE_URL`. El laboratorio documenta sesiones de cuatro horas por defecto y parada automática de EC2. El último crédito observado fue US$5,40 usados de US$50.
- Una EC2 equivalente fuera del laboratorio, encendida 730 horas, costaría aproximadamente US$75,65 al mes por cómputo, IPv4 y 24 GiB gp3, antes de transferencia y otros servicios. Render gratuito suspende el proceso por inactividad y pierde escrituras en su disco efímero. No se ha verificado una alternativa gratuita continua para estos modelos. [EC2](https://aws.amazon.com/ec2/pricing/on-demand/) · [IPv4](https://aws.amazon.com/vpc/pricing/) · [EBS](https://aws.amazon.com/ebs/pricing/) · [Render](https://render.com/docs/free)

Mantener cerrado SSH y utilizar Session Manager. Instalar el código y corpus sintético desde un archivo de Git revisado, junto con la exportación web creada mediante `npm --prefix mobile run web:export` con `EXPO_PUBLIC_DEMO_MODE=synthetic` y `EXPO_PUBLIC_WEB_ORIGIN` configurados. La API usa el perfil `managed` con `cloud_runtime`, CA oficial y verificación de hostname. Ollama, API y proxy se enlazan en loopback. Caddy termina TLS público. La API usa la misma base y configuración de embedding que la demo local.

El guion académico y las consultas de Supabase están en [el checkpoint de entrega acelerada](CHECKPOINT-ENTREGA-ACELERADA.md). `U90000001` muestra recursamiento, `U90000002` un expediente distinto y `U90000032` el caso sin intentos. Las cuentas y sus datos son sintéticos.

Render gratuito tiene suspensión por inactividad y disco efímero. No se eligió para alojar ambos modelos. La publicación fuera de Learner Lab, Cloudflare Pages, la automatización desde GitHub y la validación independiente del PC requieren evidencia propia. [Render](https://render.com/docs/free) · [Cloudflare Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/) · [Qwen3 Embedding en Ollama](https://ollama.com/library/qwen3-embedding)
