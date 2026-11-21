# Panel editorial Banu al Día

El [panel editorial web](https://banuchat.duckdns.org/api/v2/editorial) permite a personal autorizado del Centro de Competencias Digitales preparar y mantener noticias con adjuntos. Usa una cuenta administrativa aprovisionada por el responsable técnico. Las cuentas de estudiantes conservan su propio acceso.

1. Abre el panel y elige **Nueva noticia**.
2. Escribe un título y el contenido. Si necesitas adjuntar un documento, selecciona un PDF o Markdown de hasta 2 MB.
3. Selecciona **Guardar borrador** para conservar el trabajo o **Publicar noticia** para que aparezca en Banu al Día.
4. Abre una noticia de la lista para actualizarla. Puedes mantener, reemplazar o quitar el adjunto. **Archivar** retira la noticia y el acceso estudiantil al adjunto. Puedes volver a publicarla.

Los estudiantes con sesión iniciada ven las noticias en el listado habitual. En web pueden descargar los adjuntos publicados desde la tarjeta correspondiente. El panel administrativo es independiente y se abre solamente en navegador. Las noticias históricas de la release se conservan como contenido de solo lectura. Los adjuntos editoriales se distribuyen como descargas y quedan fuera de la indexación del RAG.

El backend activa el panel administrado con `BANUCHAT_EDITORIAL_ORIGIN=https://banuchat.duckdns.org`. Aplica la [migración editorial](../../infra/db/editorial/001_editorial.sql) antes de habilitar la variable. El esquema está separado de las releases del RAG. El responsable técnico aprovisiona cada cuenta por un canal privado, con un hash Argon2id en `banuchat_editorial.accounts`. Deshabilitar una cuenta bloquea también sus cookies de sesión vigentes. Las sesiones administrativas caducan a las ocho horas.

Si la EC2 está detenida, inicia la instancia existente desde AWS Academy. El panel vuelve con la API, y las noticias, los adjuntos y las cuentas permanecen en Supabase. [Guía de arranque](GUIA-PRESENTACION-BANUCHAT.md)

El 20/11/2026 se verificaron por HTTPS el acceso separado, el rechazo de un origen externo, la privacidad del borrador, la publicación en el listado estudiantil, la descarga de dos versiones de un archivo Markdown, el archivo de la noticia y la revocación de la sesión. La noticia ficticia de prueba terminó archivada. La EC2 pasó a estado `stopped` después de la comprobación por solicitud del propietario.

## Noticias y eventos con fechas

En la revisión local, **Noticias** y **Eventos** muestran también las publicaciones existentes de la release activa. Selecciona una fila para ver sus fechas y editarla. El panel permite filtrar por vigencia, programación, vencimiento, borrador y archivo. Las ediciones quedan en el esquema editorial y se preserva la publicación de origen.

Para noticias, la fecha inicial abre la vigencia y la final la cierra. El texto vencido queda en el filtro **Archivo** de Banu al Día. La acción **Archivar** retira la publicación del listado de estudiantes. Los eventos conservan su historial en el calendario y aparecen en todos los días que cubre su intervalo. Las fechas del panel se editan en hora de Bogotá. Puedes adjuntar una portada PNG, JPG o WebP de hasta 1 MB, además del PDF o Markdown habitual.

Antes de desplegar esta revisión, aplica [002_editorial_schedule.sql](../../infra/db/editorial/002_editorial_schedule.sql) sobre la base que tiene la migración 001. Luego actualiza la API y el cliente. Se probaron ambas migraciones y las rutas HTTP en una base PostgreSQL desechable en memoria. AWS y la base administrada quedaron fuera de esta ejecución.

## Nombres de la cohorte en Mi progreso

La API administrada muestra Ingeniería de Sistemas o Ingeniería Industrial para la cohorte, con los nombres Interacción Digital y Habilidades de Analítica Digital en los dos cursos de prueba. La UI usa períodos de seis dígitos y NRC ficticios por curso y período, por ejemplo **NRC 99101 · Interacción Digital**. Los intentos, las cuentas y las claves de la release permanecen en su sitio. [Programas de pregrado UNAB](https://unab.edu.co/pregrados/) · [Oferta del Centro de Competencias Digitales](https://unab.edu.co/asi-funciona-la-formacion-en-competencias-digitales-de-la-unab/)
