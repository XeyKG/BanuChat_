# Panel editorial de Noticias y Eventos

El [panel editorial web](https://banuchat.duckdns.org/api/v2/editorial) permite a personal autorizado del Centro de Competencias Digitales preparar y mantener noticias con adjuntos. Usa una cuenta administrativa aprovisionada por el responsable técnico. Las cuentas de estudiantes conservan su propio acceso.

1. Inicia sesión y selecciona **Noticias** o **Eventos**. Los contadores muestran los registros de esa sección por estado. Usa un contador o el filtro de estado y busca por título o contenido.
2. Abre un registro de la lista o crea uno nuevo. Escribe el título y el contenido, ajusta las fechas en hora de Colombia y añade una portada o un adjunto si hace falta.
3. Abre **Vista previa** para revisar el contenido, la portada, el adjunto y las fechas. Cierra la vista con **Escape** o con su botón. La vista conserva el estado de la publicación.
4. Selecciona **Guardar borrador** o confirma **Publicar noticia**. Para un evento futuro, confirma **Programar evento**. Si sales del editor con cambios pendientes, el panel pide confirmar que quieres descartarlos.
5. Abre un registro para editarlo. Puedes mantener, reemplazar o quitar la portada y el adjunto. **Archivar** retira la publicación y el acceso estudiantil al adjunto tras una confirmación. Puedes volver a publicarla.

Los estudiantes con sesión iniciada ven las noticias en el listado habitual. En web pueden descargar los adjuntos publicados desde la tarjeta correspondiente. El panel administrativo es independiente y se abre solamente en navegador. Las noticias históricas de la release se conservan como contenido de solo lectura. Los adjuntos editoriales se distribuyen como descargas y quedan fuera de la indexación del RAG.

El backend activa el panel administrado con `BANUCHAT_EDITORIAL_ORIGIN=https://banuchat.duckdns.org`. Aplica la [migración editorial](../../infra/db/editorial/001_editorial.sql) antes de habilitar la variable. El esquema está separado de las releases del RAG. El responsable técnico aprovisiona cada cuenta por un canal privado, con un hash Argon2id en `banuchat_editorial.accounts`. Deshabilitar una cuenta bloquea también sus cookies de sesión vigentes. Las sesiones administrativas caducan a las ocho horas.

Si la EC2 está detenida, inicia la instancia existente desde AWS Academy. El panel vuelve con la API, y las noticias, los adjuntos y las cuentas permanecen en Supabase. [Guía de arranque](GUIA-PRESENTACION-BANUCHAT.md)

El 20/11/2026 se verificaron por HTTPS el acceso separado, el rechazo de un origen externo, la privacidad del borrador, la publicación en el listado estudiantil, la descarga de dos versiones de un archivo Markdown, el archivo de la noticia y la revocación de la sesión. La noticia ficticia de prueba terminó archivada. La EC2 pasó a estado `stopped` después de la comprobación por solicitud del propietario.

## Noticias y eventos con fechas

**Noticias** y **Eventos** muestran también las publicaciones existentes de la release activa. Selecciona una fila para ver sus fechas y editarla. El panel permite filtrar por vigencia, programación, vencimiento, borrador y archivo. Las ediciones quedan en el esquema editorial y se preserva la publicación de origen.

Para noticias, la fecha inicial abre la vigencia y la final la cierra. El texto vencido queda en el filtro **Archivo** de Noticias. La acción **Archivar** retira la publicación del listado de estudiantes. Los eventos conservan su historial en el calendario y aparecen en todos los días que cubre su intervalo. Las fechas del panel se editan en hora de Bogotá. Puedes adjuntar una portada PNG, JPG o WebP de hasta 1 MB, además del PDF o Markdown habitual.

La revisión de `6134fb3` está publicada en DuckDNS. Se aplicó [002_editorial_schedule.sql](../../infra/db/editorial/002_editorial_schedule.sql) en Supabase y se desplegaron la API y el cliente web en la EC2 existente. La vista editorial conserva 60 registros de origen y su lectura está concedida al rol de la API. Por HTTPS se comprobó el listado con sesión editorial, la aparición y el vencimiento de una noticia, el acceso a su portada y la presencia de un evento en dos fechas del calendario de Bogotá. Las publicaciones ficticias de la prueba quedaron archivadas desde el panel.

La copia para revertir API y web está en `/opt/banuchat/backups/editorial-schedule-6134fb3-r2`. Para una instalación nueva, aplica en orden las migraciones 001 y 002 antes de activar el panel.

## Nombres de la cohorte en Mi progreso

La API administrada muestra Ingeniería de Sistemas o Ingeniería Industrial para la cohorte, con los nombres Interacción Digital y Habilidades de Analítica Digital en los dos cursos de prueba. El cliente web publicado muestra períodos de seis dígitos y NRC ficticios por curso y período, por ejemplo **NRC 99101 · Interacción Digital**. Los intentos, las cuentas y las claves de la release permanecen en su sitio. La verificación HTTPS usó una cuenta ficticia. El cambio de presentación en Android requiere una APK construida desde esta revisión. [Programas de pregrado UNAB](https://unab.edu.co/pregrados/) · [Oferta del Centro de Competencias Digitales](https://unab.edu.co/asi-funciona-la-formacion-en-competencias-digitales-de-la-unab/)
