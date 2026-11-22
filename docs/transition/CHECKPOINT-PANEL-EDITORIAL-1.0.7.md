# BanuChat 1.0.7 · Panel editorial y cliente

El 21 de noviembre de 2026 se publicó la revisión `2380299` en la EC2 existente. La revisión cambia el cliente web y los tres recursos estáticos del panel editorial. La API, Supabase y las versiones activas del colector de chat y la admisión OE4 de n8n conservan su composición previa.

## Cambios del cliente y del panel

- **Noticias y Eventos** ofrecen cantidades por estado, búsqueda, filtros, confirmaciones y vista previa. En el panel se conservan las revisiones de edición, el acceso administrativo separado y los formatos de portada y adjuntos existentes.
- **Mi progreso** presenta el UID de la sesión verificada y conserva el aviso de expedientes e inscripciones ficticios. Los rótulos muestran el nombre del curso seguido de `NRC` y su número.
- El aviso **Antes de conversar con Banu** se muestra al abrir una conversación nueva. En conversaciones anteriores se recupera con **Aviso sobre IA**. El contenido del aviso forma parte de la interfaz. [Circular Externa 002 de 2024 de la SIC](https://sedeelectronica.sic.gov.co/transparencia/normativa/circular-externa-2-de-2024-de-la-superintendencia-de-industria-y-comercio-lineamientos-sobre-el-tratamiento-de-datos).

## Comprobaciones

En local pasaron los typechecks de la API y Mobile, 30 pruebas enfocadas de la API y 79 pruebas de Mobile. El recorrido editorial aislado comprobó el acceso, la búsqueda, los filtros, un borrador, la vista previa, una imagen y un Markdown, la publicación, el archivo, la programación y el diseño a 390 px. El cliente web local con dos sesiones sintéticas verificó `U99000001` en el expediente de Celia Arcilla, NRC 99102 y ausencia de datos de la primera cuenta al entrar con la segunda. También se abrió Noticias y se recuperó el aviso desde Historial sin enviar mensajes.

AWS Academy mostraba US$15,80 de US$50 antes de la prueba pública. Por HTTPS se confirmó el cliente web `entry-697aa888c1e35434bc0219f9f9d5f296.js` y la huella del JavaScript editorial. El panel listó 35 registros con sesión administrativa, con 30 publicados y 5 archivados. El acceso anónimo y el acceso estudiantil devolvieron 401. Dos cuentas sintéticas conservaron su identidad, cursos e intentos.

Las comprobaciones en navegador sobre el despliegue abrieron **Mi progreso**, **Noticias** y el aviso al comenzar un chat, con la cuenta ficticia de Alba Arcilla. El panel publicado abrió Noticias y Eventos con una sesión editorial de lectura y se comprobó el ancho a 390 px. Los ensayos de publicación, programación y archivo se hicieron sobre datos aislados.

El formulario editorial declara `POST` en el HTML para mantener la contraseña fuera de la URL aun cuando el módulo JavaScript tarde en cargar. El ajuste se activó en la misma EC2 y se comprobó que los cinco servicios siguieran activos.

Se hicieron dos consultas públicas. La documental devolvió ocho citas y la consulta multifuente devolvió tres. Ambas conservaron respuesta y citas en Historial. El journal registró dos llamadas para `structured_mcp`, a `get_profile_progress` y `get_announcements`, con salida `answered`. Se observaron ejecuciones exitosas del colector n8n durante el intervalo del ensayo.

## APK de demostración

La actualización de 1.0.6 a 1.0.7 se instaló en el Huawei YAL-L21 con `versionCode=8`, el paquete `com.anonymous.banuchat` y el mismo certificado de firma de demostración. Con la cuenta ficticia de Alba Arcilla se verificaron el UID `U90000001`, los NRC 99001 y 99101 y el menú **Noticias**. El aviso apareció antes de la primera pregunta, su enlace a la SIC quedó alcanzable con letra ampliada y fue posible desplegar el aviso al reabrir una conversación desde Historial. La verificación de Celia Arcilla corresponde al recorrido web local con sesión sintética.

La APK publicada mide 47 073 400 bytes. La segunda descarga desde GitHub produjo el mismo SHA-256 que el archivo instalado, `0f2e48ed71ef0ca43bae7cac020e3cce6e019ae8b4c269ce4cd0be647af70f5f`. [Release 1.0.7 en GitHub](https://github.com/XeyKG/BanuChat_/releases/tag/demo-1.0.7).

## Reversión

El respaldo de los recursos editoriales y el lanzador web de la publicación anterior está en `/opt/banuchat/backups/editorial-107-2380299`. La preparación cotejó las huellas de los archivos anteriores y nuevos. El procedimiento de activación prevé restaurar el respaldo si fallan los controles de salud. El cliente anterior se conserva en la EC2 y la APK 1.0.6 sigue disponible. [APK 1.0.6](https://github.com/XeyKG/BanuChat_/releases/tag/demo-1.0.6).
