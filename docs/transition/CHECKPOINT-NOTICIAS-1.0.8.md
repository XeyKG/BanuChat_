# BanuChat 1.0.8 · Noticias y lectura de publicaciones

El 22 de noviembre de 2026 se activó en AWS la web de la revisión `905b538`. Noticias reúne el catálogo, las publicaciones del panel editorial y las fuentes sintéticas versionadas de OE2. Los filtros ven todos los contenidos, Noticias, Convocatorias o Programación. La búsqueda acepta texto o datos de un curso. Cada tarjeta muestra un extracto y abre un lector con el texto completo, las fechas y la procedencia. El lector reutiliza el acceso autenticado a portadas y adjuntos.

Los registros con el mismo título, texto y fechas se presentan juntos y conservan la procedencia de ambas fuentes. El catálogo y cada categoría de OE2 se consultan de forma independiente. El cliente pide hasta 50 registros por consulta, el límite del contrato actual. La comparación Antes/Ahora de OE2 sigue en el entorno Unified autenticado, al final de Noticias. La ruta histórica `/oe2` dirige al módulo unificado.

## Validación

- Mobile pasó el typecheck y 82 pruebas. Pasaron 50 pruebas enfocadas de API y la prueba del proxy web.
- El recorrido web local con datos aislados comprobó categorías, deduplicación, búsqueda, fallo parcial con reintento, lectura larga, procedencia, portada, enlace HTTPS, descarga Markdown, Escape, retorno de foco, ancho de 390 px y acceso a la comparación técnica.
- La regresión editorial aislada comprobó los registros de release, el acceso separado y la gestión de publicaciones y archivos.
- Por HTTPS el catálogo devolvió nueve registros, uno editorial. OE2 devolvió dos noticias, dos convocatorias y dos programaciones. El panel abrió por HTTPS y rechazó con 401 una consulta administrativa hecha con sesión estudiantil. En la web publicada se comprobó el rol de diálogo en el árbol de accesibilidad, el control de cierre, el retorno de foco y el ajuste con escala de texto 1,5.
- En el Huawei se actualizó la app instalada de 1.0.7 a 1.0.8 y se conservó la sesión. Con escala de texto 1,15 se verificaron el filtro Programación, la modalidad en el detalle y el cierre con Atrás. También se buscó Moodle, se abrió el artículo editorial con su portada autenticada y se cerró con el control visible. La publicación editorial disponible tenía portada. La prueba de descarga con adjunto se hizo en web local.

## APK

La APK ARM64 conserva el paquete `com.anonymous.banuchat` y el certificado de la 1.0.7. Tiene `versionCode=9` y mide 47 129 176 bytes. La descarga pública volvió a producir el SHA-256 del archivo instalado, `b4a5b257906ec393fa99fe7b64032af08e53cc9bfd747de801fa8f24da6229f0`. El tag apunta a `905b538` y la APK es el único adjunto publicado. [Release 1.0.8](https://github.com/XeyKG/BanuChat_/releases/tag/demo-1.0.8) · [Release 1.0.7](https://github.com/XeyKG/BanuChat_/releases/tag/demo-1.0.7).

## Reversión web

El respaldo en la EC2 está en `/opt/banuchat/backups/noticias-108-9b75eee1`. El lanzador original apunta al cliente 1.0.7 y el nuevo a `.expo/noticias-108-9b75eee1/`. Se reinició el servicio web y los cinco servicios quedaron activos. La activación verifica el bundle de Noticias y recupera el respaldo si falla el control de salud.
