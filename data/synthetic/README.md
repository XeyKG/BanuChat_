# Datos sintéticos de BanuChat

Esta ubicación es la fuente de verdad versionada de todos los datos funcionales del
prototipo. PostgreSQL contiene representaciones procesadas y reconstruibles de esos
archivos; N8N orquesta su ingesta y sincronización asíncrona.

Todo contenido será creado por el equipo y marcado como sintético en metadatos y
documentación. No se usan datos reales, sitios ni APIs de UNAB/CCD, tampoco como
inspiración de contenido. Los cambios del dataset deben revisarse y versionarse;
N8N no debe generarlos arbitrariamente.

## Estructura

- `schemas/`: definiciones de formato y metadatos por diseñar.
- `documents/`: documentos ficticios, incluidas guías servidas completas.
- `courses/`: catálogo sintético de cursos.
- `calendars/`: fuente de verdad del calendario simulado.
- `announcements/`: convocatorias y anuncios ficticios.
- `profiles/`: perfiles e historiales de demostración sintéticos.

Solo existe esta estructura documental; no se han generado datasets ni schemas.
Los formatos concretos y la trazabilidad hacia SQL se definirán en la próxima etapa.

Los posibles registros de participantes humanos en pruebas de usabilidad no son datos
funcionales sintéticos y no pertenecen a este directorio.
