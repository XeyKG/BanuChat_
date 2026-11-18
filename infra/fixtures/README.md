# Publicación OE2 sintética

`oe2-approved-publication.json` es una exportación de solo lectura del pipeline sintético existente, no una consulta a sistemas institucionales ni una matrícula. Conserva la publicación actual, la anterior comparable y el historial de seis versiones aprobadas. Se validó la proyección mediante los servicios OE2 originales: dos programaciones, cuatro convocatorias/novedades y una modificación entre versiones.

El servidor utiliza `BANUCHAT_OE2_PUBLICATION_FILE` y `BANUCHAT_OE2_PUBLICATION_SHA256` para leer una copia aprobada e inmutable. El pin corresponde a los bytes del archivo que se despliega, calculado antes de activarlo. La lectura mantiene autenticación, hashes y aprobación originales; una fuente ausente o alterada devuelve indisponibilidad de ese módulo. La exportación actual es `c7a955744789e89621e070b5955a70dedfb69196f43b377722cbd9b9bbd4e276`.

No habilita adquisición institucional ni actualizaciones cloud automáticas. Una nueva publicación requiere exportar y validar la versión aprobada del pipeline y asociar explícitamente su nuevo hash. Los snapshots fuente se conservan para la demostración académica y no son servidos como archivos públicos.
