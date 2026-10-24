# CHECKPOINT BANUCHAT — OE2 — 2026-10-24

## Alcance y decisión de seguridad

Se implementó la capacidad técnicamente reusable de OE2 sin extraer ni publicar datos
institucionales. Ninguna fuente real dispone todavía, en el repositorio, de autorización
de automatización y política de admisión suficientes. Por ello el ejecutable acepta solo
fixtures representativos y rechaza cualquier otro `source_id`.

## A. Funcionalidades preexistentes reutilizadas

- Preflight seguro, lectura local confinada, UTF-8/JSON estricto y SHA-256.
- Ingesta TypeScript, publicación atómica, lease de escritor y preservación de current.
- Estado HTTP, retry y recover explícitos; no se duplicaron en OE2.
- Bearer token y respuestas HTTP internas saneadas.
- Workflow N8N manual con status antes de execute, sin retry ciego.
- Evidencia N0 de startup/status y N3 del camino manual N8N → HTTP → TypeScript →
  PostgreSQL/Ollama para el corpus sintético. Esas evidencias no acreditan OE2 real.

## B. Fuentes identificadas y autorización

El inventario estructurado está en `eval/oe2/source-inventory.json`.

| Fuente candidata | Categorías | Formato | Fecha | Frecuencia | Estado |
| --- | --- | --- | --- | --- | --- |
| Índice público `https://unab.edu.co/estudiantes/` | oferta, convocatorias, novedades | HTML | visible en publicaciones | irregular, no medida | pendiente de términos, robots, autoridad y permiso |
| Artículo público de formación CCD | oferta, novedades | HTML | visible | puntual, no medida | pendiente de verificación |
| Artículo público de inscripción a pruebas CCD | convocatorias | HTML + formulario | visible | por convocatoria, no medida | pendiente; formulario excluido |
| `CCD_DOCUMENTACION/PROGRAMACION 202710` | oferta | XLSX | no verificada | no medida | solo lectura; extracción no autorizada |
| `CCD_DOCUMENTACION/COMUNICACIONES` | novedades/oferta | DOCX/PPTX/PDF/imágenes | mixta/ausente | no medida | solo lectura; admisión pendiente |

El responsable aparente de las páginas públicas es la Universidad Autónoma de
Bucaramanga y, por su contenido, el Centro de Competencias Digitales. “Aparente” no
equivale a autoridad confirmada por dato. No se abrieron ni procesaron esas páginas
como input del pipeline.

## C. Implementación de los tres flujos

Se implementaron flujos separados `academic_offer`, `calls` y `news` con:

- adquisición confinada de fixture local mediante `SafeReader`;
- extracción JSON estricta y normalización por categoría;
- campos cerrados, fechas/timestamps y versión de origen obligatorios;
- SHA-256 de fuente y contenido normalizado;
- rechazo de IDs duplicados;
- comparación de altas, modificaciones, bajas y sin cambios;
- estado por categoría y reemplazo atómico del snapshot;
- bitácora JSONL de ejecuciones con ID, tiempos, resultado y código de error saneado;
- conservación del último estado válido ante error;
- resultado explícito `published_to_ccd=false` y métrica de latencia no verificable.

No se implementó un parser especulativo de HTML/XLSX real: falta aceptar una fuente y
congelar su contrato. Los fixtures no se presentan como scraping operativo.

## D. Reutilización de N8N y núcleo de ingesta

Los tres exports N8N incluyen un Schedule Trigger cada seis horas, status previo, una
sola ejecución HTTP y retry automático desactivado. Están `active=false` y solo usan
IDs fixture. Extracción, validación, deduplicación y estado permanecen en TypeScript.

La publicación CCD existente no se modificó. El core de release/retry/recover se
mantiene disponible para una futura adaptación autorizada, pero no se invoca porque
no existe política de admisión de OE2 a una release CCD.

## E. Pruebas y resultados medidos

Ejecución local del 2026-10-24:

- `npm run typecheck`: PASS.
- `npm test`: 221 PASS, 0 FAIL, 0 SKIP; incluye seis pruebas OE2.
- `npm run build`: PASS.
- `npm run evaluate:oe2`: 3 flujos implementados, 3 ejecuciones locales exitosas;
  6/6 documentos correctos y 42/42 campos correctos.
- Fórmula de exactitud de campo: `campos correctos / campos de referencia` =
  `42 / 42 = 100 %`, exclusivamente en fixtures.
- Tres JSON N8N parseados correctamente mediante `ConvertFrom-Json`.
- Ejecuciones autónomas N8N observadas: 0.
- Modificaciones al corpus/publicación CCD: 0 por diseño; no se ejecutó PostgreSQL.

Las pruebas cubren segunda ejecución sin cambios, duplicado rechazado, fuente no
autorizada y conservación byte a byte del último snapshot válido tras un error.

## F. Estado de requisitos

| Requisito | Estado | Evidencia/límite |
| --- | --- | --- |
| Tres flujos separados | Parcial | Implementados y probados con fixtures; no operativos contra fuentes reales |
| Extracción correcta >90 % | Parcial | 100 % (42/42) local; no acredita datos institucionales |
| Actualización <24 h desde origen | Bloqueado | Sin eventos reales origen/destino autorizados; no verificable |
| Ejecución autónoma | Preparada, no acreditada | Schedules versionados e inactivos; 0 ejecuciones observadas |
| Cambios/duplicados/errores | Cumplido localmente | Pruebas unitarias reproducibles |
| Publicación CCD controlada | Bloqueada deliberadamente | Falta política de admisión/autorización; current no se toca |

## G. Limitaciones institucionales reales

- No hay permiso de scraping/automatización registrado por fuente y operación.
- No se han confirmado términos, robots, límites de acceso ni responsable técnico.
- No se ha confirmado cuál origen es autoridad para oferta, convocatoria o novedad.
- No existe contrato estable de HTML/XLSX ni política de bajas/correcciones.
- No existe aprobación para publicar salidas automáticas en el corpus CCD vigente.
- Las fechas indexadas o visibles no se han observado como eventos de publicación
  durante una operación controlada, por lo que no sirven para acreditar el SLA.

## H. Pendientes para cerrar OE2

1. Obtener decisión por fuente sobre autoridad y operaciones permitidas: consultar,
   almacenar derivado, versionar, programar y publicar.
2. Verificar términos/robots y elegir el mecanismo preferido (API/export/HTML/archivo).
3. Congelar contrato de campos, semántica temporal y política de altas/bajas.
4. Implementar el adaptador concreto mínimo y fixtures derivados permitidos.
5. Definir admisión/revisión y rollback antes de conectar con publicación CCD.
6. Importar, configurar y ejecutar los tres workflows en un entorno aprobado.
7. Construir referencia revisada de fuente real y medir exactitud con denominador.
8. Observar timestamps reales de publicación y disponibilidad para medir <24 h.
9. Ejecutar casos de fallo/reconciliación N8N y registrar evidencia sin secretos.

## I. Checkpoint

OE2 queda **parcialmente implementado y validado localmente**. La base técnica de los
tres flujos, su control periódico y su evaluación son reutilizables. No se declara
cumplido OE2: las tres extracciones institucionales, las ejecuciones autónomas y la
actualización inferior a 24 horas permanecen bloqueadas por autorización, contrato de
fuente y evidencia operacional real. No se hizo commit/push ni se avanzó a OE3.
