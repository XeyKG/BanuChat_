# BanuChat — calendario, Banu al Día y publicaciones OE2 1.0.4

Trabajo solicitado el 18/11/2026. El usuario aclara que Publicaciones OE2 conserva el alcance documentado, no matrícula. El propietario autorizó explícitamente ampliar su disponibilidad a AWS mediante copia aprobada de solo lectura. La ampliación de disponibilidad está documentada en el contrato v2; no modifica sus respuestas ni autorización. Activación remota completada y comprobada el 18/11/2026.

## Cambios preparados

- Banu al Día es el nombre de noticias y convocatorias, con tarjetas, búsqueda móvil/web, filtros y texto completo. La comparación OE2 se llama Cambios de publicaciones y se abre desde Publicaciones OE2.
- Calendario mensual de lunes a domingo; meses anterior/siguiente, Hoy, marcadores por fecha, selección de actividades, filtros y hora de Bogotá. El rango consultado cubre la cuadrícula; se mantiene la semántica del endpoint de agrupar por comienzo de actividad. En móvil, seleccionar una fecha acerca la agenda y permite volver al mes.
- Recordatorios reemplaza Notificaciones en navegación; permanece la configuración local, se retiran prueba de cinco segundos y panel técnico de push del recorrido habitual. No se implementó ni se declara push remoto.
- OE2: exportación de solo lectura desde el pipeline sintético existente; seis releases aprobadas, dos programaciones y cuatro convocatorias/novedades, una modificación y cinco registros sin cambios en la comparación. SHA de exportación c7a955744789e89621e070b5955a70dedfb69196f43b377722cbd9b9bbd4e276. Mantiene candidato, snapshots, hashes y aprobaciones originales; no crea matriculas, cupos, docentes ni reglas académicas.
- Adaptador preparado para leer una exportación aprobada con pin de SHA, tamaño acotado, JSON estricto y validadores OE2 existentes. Las rutas, schemas, filtros y autenticación se conservan; su ampliación de disponibilidad fue autorizada expresamente. Fuente ausente o adulterada solo produce indisponibilidad del módulo.

## Validaciones locales reales

Typecheck Mobile/API correctos. Mobile 77/77; API 22/22 focales OE2/contrato/lector. Dos HTTP fallaron inicialmente por EACCES de loopback en el sandbox; al ejecutar con permiso de red local, los 22 pasaron. No se modificaron contratos para hacer pasar pruebas.

Edge aislado con PostgreSQL/auth del laboratorio y publicación OE2 real exportada: diez pasos PASS: login; cuadrícula y actividad seleccionada; navegar mes/Hoy; ancho 390 y controles de día >=44px; selección móvil con agenda visible; noticias sin texto recortado; búsqueda vacía y recuperación; categorías OE2; comparación de versiones; noticias estrechas sin overflow. Vectores de consulta registrados en ese laboratorio, sin generación LLM; este recorrido es local; las pruebas remotas y físicas se describen a continuación.

Revisión visual independiente antes/después: se resolvió el botón de lectura que no aportaba contenido adicional; se compactó la cabecera móvil, se acercó la agenda y se relegó el UUID de publicación a su detalle de procedencia. Reauditoría sin bloqueantes ni hallazgos mayores. Estados de error visuales y lector de pantalla no evaluados en ese recorrido.

Capturas y logs auténticos privados en infra/local/community-web. No se modificó corpus CCD, dataset sintético v1, autenticación, RAG, modelos ni tablas Supabase. Compilación Android 1.0.4/versionCode 5 correcta e instalada mediante adb install -r en Huawei YAL-L21. Paquete com.anonymous.banuchat, mismo certificado SHA-256 fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c. APK SHA-256 daddd2a9eae5b5036ffb80215e0e9b716696b8240bcbf054fb7e7ed4c862ce36. Escaneo dirigido de archivos privados/marcadores de conexión correcto, origen DuckDNS presente. Sesión conservada; calendario remoto, días marcados y selección de actividad comprobados. Capturas auténticas en infra/local/community-android-*.private.png. APK publicada en GitHub y descargada de nuevo con SHA idéntico. Web nueva activada y comprobada.

## Activación y pruebas remotas

Autorización explícita del propietario para habilitar las rutas OE2 existentes en la app publicada mediante copia aprobada de solo lectura. Contrato v2 ampliado solo en disponibilidad de entorno. No se modificaron REST schemas, base Supabase, sesiones, modelos ni n8n.

SSM e6dcd000-dbb3-4f06-a7a8-7d684e737d69: Success. Guardas de SHA de los tres archivos anteriores y ambos paquetes; shell sin BOM con set -eu. Copia de reversión /opt/banuchat/backups/release-104-20261118. Exportación anterior intacta. Salud verificada: API y web canónica, Caddy y Ollama activos. HTTPS externo 200, bundle entry-ebd1609ffc7fc690df5e6e65e11fc2b4.js. Origen sslip.io conserva su versión de transición.

Fuente OE2 instalada con permisos 0444 en /opt/banuchat/backend/api/fixtures/oe2-approved-publication.json. Pin SHA asociado en api.env sin tocar api.secret. Hash validado antes de reiniciar. No crea roles, tablas, credenciales, servicios ni infraestructura. La fuente íntegra no se sirve como archivo público; las rutas autenticadas proyectan los campos permitidos.

Ocho comprobaciones REST remotas: programación 200 con dos registros; anuncios 200 con cuatro; comparación 200 con modified=1, unchanged=5, created=removed=0; progreso y expediente 200; sin sesión 401; selector profile_key y limit=0 rechazados con 400. Sesión de prueba revocada al terminar.

Edge aislado contra https://banuchat.duckdns.org, backend AWS y Supabase reales: diez pasos PASS (login, mes/agenda, navegación/Hoy, 390px y días >=44px, selección estrecha, noticias completas, búsqueda sin resultados/recuperación, tres categorías OE2, comparación y noticias estrechas). Primer intento: BUTTON_NOT_FOUND por reutilizar una etiqueta de día antes de terminar la carga del mes; se corrigió la espera del harness y se conservó el reporte inicial. No se cambió la aplicación para ese fallo. Evidencia privada infra/local/community-cloud.

Huawei YAL-L21, API local y Metro detenidos: calendario mensual y actividad del 20/11, Banu al Día vigente/archivo y desplazamiento del texto completo, pantalla Recordatorios, programación/convocatorias/novedades OE2 y comparación 0/1/0/5 comprobados contra el servidor público. Sesión ficticia conservada al actualizar. No se activaron ni se certifican entregas de recordatorios en este ensayo. Capturas privadas infra/local/community-android-*.private.png.

## Límites y reversión

OE2 es una copia sintética aprobada, no una consulta institucional ni una matrícula; actualizarla requiere una nueva exportación validada y su pin. Banu al Día usa los anuncios existentes de la demo; no se confunde su lista con la comparación OE2. El calendario mantiene el límite y la semántica de inicio del endpoint existente: no se presenta como sincronización institucional completa. No se probaron lectores de pantalla ni entrega de push; los tamaños y texto ampliado se revisaron en las capturas.

RAG no se modificó ni se volvió a certificar: permanecen las consultas satisfactorias/fallidas y el límite de dos vCPU documentados en la entrega anterior. La disponibilidad sigue condicionada a AWS Academy. Este despliegue no ensayó un downgrade Android.

Reversión preparada con los tres archivos API, api.env y launcher anteriores en el backup citado; reiniciar banuchat-api y banuchat-web-duckdns tras restituir esas copias. La exportación web anterior y APK anteriores se conservan. La salud nueva pasó; no se ejecutó rollback durante este incremento.

## Publicación

Código 5bd4d94 enviado a main. [Release 1.0.4](https://github.com/XeyKG/BanuChat_/releases/tag/demo-1.0.4). [APK ARM64](https://github.com/XeyKG/BanuChat_/releases/download/demo-1.0.4/BanuChat-demo-1.0.4-arm64.apk), 47.066.048 bytes, SHA-256 daddd2a9eae5b5036ffb80215e0e9b716696b8240bcbf054fb7e7ed4c862ce36. Digest del asset y descarga efectiva verificados. Versiones anteriores conservadas; el repositorio privado exige acceso autorizado. Escaneo de secretos conocidos y paths privados correcto, git diff --check correcto.

[Paquete académico 1.0.4](https://github.com/XeyKG/BanuChat_/releases/download/demo-1.0.4/BanuChat-entrega-academica-1.0.4.zip): APK, guía, checkpoint y seis capturas sintéticas web/Android; sin secretos ni corpus CCD. Descargado y verificado, SHA-256 1f84c119e1d2088e723ed73dd6288524cf863f8ac5e05a20b37205b5cff8c025.
