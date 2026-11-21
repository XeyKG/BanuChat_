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
