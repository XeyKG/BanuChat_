# BanuChat 1.0.9 · Categorías editoriales

El 22 de noviembre de 2026 se publicó la revisión `bbbe366` en la EC2 existente. El despliegue actualizó la API, los archivos del panel editorial y el cliente web `entry-f73bc63cc6bb00de5931b018388a5ed6.js`.

El panel ofrece **Tipo de publicación** para noticias, convocatorias y programación de cursos. La categoría se conserva en borradores, al editar, al programar y al publicar. La lista y la vista previa muestran el tipo seleccionado. La API devuelve `publication_category` para registros editoriales y el cliente usa ese dato para los filtros. Si el registro editorial coincide con una publicación OE2, se conserva la procedencia de ambas fuentes y se respeta la categoría elegida en el panel.

Se aplicó en Supabase la [migración 003](../../infra/db/editorial/003_editorial_publication_category.sql). Añade `publication_category` con valor predeterminado `news` y una restricción para los tres valores admitidos. La separación de noticias y eventos usa `kind`. Las actividades de Calendario se administran desde Eventos.

## Artefactos y respaldo

- APK Android ARM64 1.0.9, `versionCode=10`, paquete `com.anonymous.banuchat` y certificado de 1.0.8. Tamaño de 47 129 604 bytes. SHA‑256 `74d6f5b20406f876f0b056490791273e217d67b2dff61b6999df856218e9cdd3`. [APK 1.0.9](https://github.com/XeyKG/BanuChat_/releases/tag/demo-1.0.9).
- El respaldo de API, panel y lanzador web está en `/opt/banuchat/backups/editorial-category-109-bbbe366`. El export web anterior sigue en `/opt/banuchat/mobile/.expo/noticias-108-9b75eee1/`. La columna aditiva puede permanecer si se restaura el código anterior. [APK 1.0.8](https://github.com/XeyKG/BanuChat_/releases/tag/demo-1.0.8).

Las pruebas funcionales quedan pendientes y las realizará el propietario de BanuChat.
