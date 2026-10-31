# OE6-CCD-HISTORICAL-ARTIFACTS-01 — diagnóstico final

31/10/2026, America/Bogota.
Estado: **BANUCHAT_CCD_HISTORICAL_ARTIFACTS_DIAGNOSED**.
Base limpia: `db7918137af31a16e504a8c7160f823f4b68c5e6`.

## Hallazgo

Las 33 referencias discrepantes corresponden a 33 document_version_id de **una
sola candidata staging** (R5), no a documentos perdidos de una publicación ready.
La raíz de esa misma etiqueta/ruta contiene bytes coincidentes con el current posterior.
Clasificación primaria: D=33; A/B/C/E=0. La observación física de hash distinto
ocurre en las 33 y no se suma nuevamente a D.

Hay copias físicas con SHA-256 exacto para **33/33 referencias**: 49 ubicaciones
verificadas, 33 en el archivo P4B y ocho adicionales tanto en CCD 1.3 como en
custodia OE6. También existen 33 chunks SQL con bytes UTF-8 exactos por hash.
No se copiaron archivos, reconstruyó contenido o restauraron documentos.

## Impacto

- Una candidata staging afectada; cero citas, mensajes o conversaciones
  persistidos relacionados, incluidos vínculos por chunk/procedencia y punteros
  de conversaciones/mensajes a la release afectada.
- Las 218 versiones de releases ready coinciden con sus archivos; current
  CCD 1.4.0 conserva sus 107 referencias verificadas.
- Servicio real de artefactos + SQL READ ONLY: 33 `not_found`, por filtro de
  release no ready antes de filesystem. No se alcanzó el guard de hash en esas
  llamadas. Una muestra current devolvió bytes verificados.
- Sin nuevas sesiones ni HTTP autenticado. No se atribuye fallo actual de RAG,
  corrupción reciente, fecha exacta o autor del cambio de archivos.

El [informe](results/ccd-historical-artifacts-diagnosis.md) contiene matriz de
siete releases con alias, clasificación, búsqueda, límites y recomendación; el
[resumen saneado](results/ccd-historical-artifacts-2026-10-31.json) conserva conteos.
IDs, hashes, rutas exactas y coincidencias quedan en el inventario privado de
LOCALAPPDATA/BanuChat/diagnostics/OE6-CCD-HISTORICAL-ARTIFACTS-01,
run `ad446cab-30e5-42d8-b4c8-dafe8314f5e3`.

## Custodia

Respaldos OE6 presentes fuera de Git/OneDrive, ACL del custodio y dump íntegro.
Solo se inspeccionaron metadatos locales de OneDrive; no acreditan sincronización
por archivo en la ventana del respaldo. Riesgo histórico: **NO DETERMINADO**.
Requiere decisión explícita del custodio; no se usó la ausencia final del proceso
como prueba, ni se accedió a nube/cuentas o eliminaron materiales.

## Comprobaciones y alcance

Huella de 43 tablas Unified, identidad/arranque, artefactos runtime, 650 Markdown
de ocho raíces autorizadas y dump: iguales antes/después. Se verificó la igualdad
de chunks con el snapshot del backup anterior sin restaurarlo otra vez.

- Validación de sintaxis del script: `node --check`, aprobada.
- Pruebas focales: **29/29**, nueve nuevas sintéticas y veinte existentes del
  lector. Incluyen versiones con mismo nombre/bytes distintos, ausente, copia
  exacta autorizada, hash incorrecto, escape de ruta y filtro staging antes de FS.
- Revisión de enlaces, coherencia, privacidad y `git diff --check`, incluidos
  archivos nuevos: sin errores. Sin hashes documentales, IDs privados o rutas
  absolutas en informes públicos; metadatos detallados bajo custodia.

Se añadieron únicamente script diagnóstico, fixtures/pruebas y documentación
de este incremento; no hubo cambios productivos, de corpus, releases, permisos
o metadatos persistidos. Sin RAGAS, benchmark, scheduler, publicación,
restauraciones, Android, commit o push.

## Decisión

Conservar current y registrar deuda de reproducción de esa candidata, sin
restauración inmediata. Las copias exactas permiten proponer una recuperación
controlada futura si se necesita reproducirla. Proponer archivo inmutable por
candidata/release/hash y resolvedor interno por versión concreta en otra tarea
autorizada. No habilitar staging, cambiar etiquetas/hashes o crear una release.

El diagnóstico está cerrado en el alcance comprobado; encontrar copias no
significa haberlas incorporado al producto ni acreditar recuperación completa OE6.
