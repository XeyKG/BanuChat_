# BanuChat · Muestra manual de Markdown privado

El workflow lista una carpeta concreta de Drive, acepta de uno a tres archivos explícitamente seleccionados y comprueba que los bytes descargados son texto válido en UTF-8. El resultado contiene solo el número de archivos y los tamaños. Esta prueba cubre la entrada documental. La publicación sigue a cargo de la ingesta del backend.

1. Importa `drive-markdown-pilot-v1.json` como workflow inactivo en n8n.
2. En **Listar carpeta privada** sustituye `__PRIVATE_DRIVE_FOLDER_ID__` por el ID de la carpeta privada de la prueba. Conserva el filtro por carpeta.
3. Vincula la misma credencial Google Drive de lectura a los dos nodos Drive. La autorización de la herramienta de Codex y la de n8n son independientes.
4. En **Filtrar Markdown y seleccionar muestra**, añade a `approvedNames` los nombres exactos de uno a tres archivos aprobados. Para el primer ensayo usa Markdown sintético. Se exige extensión `.md`, MIME `text/markdown`, nombre único y un tamaño entre 1 y 65536 bytes. `MANIFEST.json` queda fuera de la muestra.
5. Ejecuta manualmente y comprueba que `checked` coincide con el número esperado y que `published` es `false`. La definición lleva desactivado el guardado de ejecuciones. El editor puede mostrar la salida de nodos durante la ejecución, así que usa contenido sintético si vas a proyectarlo.

Antes de indexar una muestra desde Drive, vincula los bytes a una aprobación y verifica sus hashes contra el manifiesto correspondiente. El endpoint de ingesta existente consume una fuente ya preparada y aprobada. Este workflow todavía no prepara ese paquete ni crea una release en Supabase.
