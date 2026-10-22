# Corpus CCD local — BCH-03 incremento 1

## Ampliación publicada en el incremento 4

La versión `bch03-ccd-local-2` usa `schemas/corpus-1.1.schema.json` y vive en
`local/expanded-v2`, ignorado por Git. Conserva M01/M12 sin cambios de contenido y
añade siete resúmenes M02 (DOC-098–104, C05, descripción/competencias/temáticas,
§2–4 de cada syllabus) y una unidad `TEST_ORIENTATION` (DOC-110 §2, C11/M04 en
la auditoría: solo propósito, estructura y duración para 202660). Esta última etiqueta
técnica no admite los efectos académicos bloqueados de M04.

Cada curso tiene periodo no confirmado: el nombre del PDF no prueba su oferta
actual. Los nuevos derivados tienen estado `source_checked_local_candidate`,
revisión de fuentes durante la implementación; no validación nueva del equipo ni
aval CCD. M01/M12 conservan `team_validated_local_candidate`. Las huellas físicas,
localizadores y límites completos están en el manifiesto privado. Solo el contenido
depurado produce embeddings; no se incorporan los PDF completos ni sus metadatos
como documentos adicionales.

La receta explícita `ccd_expanded_v1` admite exactamente diez unidades conocidas,
un chunk por unidad y nueve fuentes. No flexibiliza los conteos sintéticos ni el
contrato original. Para preparar desde `backend/rag`:

```powershell
npm run prepare:ccd -- --corpus-root ../../data/ccd/local/expanded-v2 --institutional-root <raíz-local>
```

Añadir `--write-snapshot` únicamente para materializar un snapshot nuevo.
El procedimiento y resultados actuales están en
[checkpoint 4](../../docs/transition/bch03-increment-4-checkpoint.md). Las secciones
siguientes describen el antecedente M01/M12. Los verificadores de incrementos 2/3
son históricos y esperan aquella release de dos unidades; el runner actual es
`eval/integration/ccd-expansion.mts`.

Contrato independiente del dataset sintético: `schemas/corpus.schema.json`, versión
`ccd-1.0.0`. Solo M01/M12, validación del equipo y uso en desarrollo local; sin aval
institucional formal ni actualidad ratificada. No contiene datos personales.

El contenido institucional local está ignorado por defecto tanto aquí como en el
`.gitignore` raíz. Solo se versionan esta guía, las reglas de exclusión y el schema.
No usar `git add -f` para incorporar corpus, originales, reportes con texto o vectores.

## Entrada local preparada

`local/m01-m12/corpus.json` contiene dos unidades depuradas, no documentos originales:

| Unidad | Referencias C | Fuente primaria | Base editorial BCH-01 |
| --- | --- | --- | --- |
| `ccd-m01` / M01 | C04, C07 | DOC-110 §2, solo nombres de pilares; §3, estructura general | `02_Respuestas_6!D2` |
| `ccd-m12` / M12 | C44, C45 | DOC-110 §4, solo correo documentado | `02_Respuestas_6!D7` |

Los nombres/rutas y hashes completos de DOC-110 y del cierre están en la entrada
local. Los originales permanecen en la carpeta externa. Periodo de fuente: 202660.
La población se describe sin inventar una identidad de estudiante. La versión local
es editorial, no una edición institucional. M01 omite reconocimiento por pruebas,
insignias, exigencias individuales y reglas de homologación. M12 omite dirección,
horarios y extensiones, con actualidad del correo pendiente de ratificación.

La autorización editorial procede de la instrucción de Sala de Control BCH-03
incremento 1. No se modifica el libro de cierre que todavía dice «borrador».

Cada unidad exige identificador estable, grupo M, dos C, título, periodo, población,
estado editorial, aplicabilidad actual no confirmada, contenido, límites y referencias.
Cada fuente exige ID, ruta relativa bajo la raíz institucional y SHA-256 físico.
Se rechazan grupos distintos, C cruzadas, duplicados, datos extra fuera del contrato,
referencias editoriales equivocadas, fuentes alteradas y rutas inseguras. Esto no
es un detector de información personal dentro de texto libre: la admisión exige
revisión humana y minimización antes de usar el comando.

## Preparación reproducible

Desde `backend/rag`, con las dependencias existentes instaladas:

```powershell
npm run prepare:ccd -- --corpus-root ../../data/ccd/local/m01-m12 --institutional-root 'C:\Users\samue\OneDrive\Documentos\CCD_DOCUMENTACION'
```

La ruta externa es una opción local del operador, nunca entrada HTTP. Para otra
máquina proporcionar su raíz y el mismo corpus local transferido por un canal
autorizado. El contenido no público no puede reconstruirse a partir de un clon Git
solamente; se requieren esos dos originales y `corpus.json` con las huellas admitidas.
El script de diagnóstico previo no es dependencia de esta preparación.

El comando reutiliza `SafeReader`, SHA-256, JSON estricto y Ajv 2020 existentes.
Verifica fuentes antes y después de derivar, así como estabilidad de la entrada.
No invoca Git sobre los originales, PostgreSQL, N8N, red ni Ollama. Emite resumen
técnico sin contenido fuente ni paths arbitrarios en los errores.

Añadir `--write-snapshot` al final materializa exclusivamente en la carpeta local:

- `documents/artifacts/ccd-m01.md` y `ccd-m12.md`: contenido admitido, contexto,
  límites y referencias con hashes; cada documento produce un chunk completo.
- `manifest.json`: inventario de artefactos y huellas, `synthetic: false`,
  `corpus_kind: ccd_local`, contrato y procedencia completa en `ccd_provenance`.
- `pipeline.json`: receta `ccd-local-unit-v1` y huella del schema ejecutado.

Una segunda ejecución idéntica verifica y conserva los archivos. Se rechazan extras
y resultados existentes diferentes; no se sobrescriben. Para cambiar contenido usar
otra versión y otra carpeta local. El snapshot escrito no equivale a release SQL.

El SHA físico del DOCX/XLSX, el SHA de `corpus.json`, el SHA del Markdown derivado
y el hash JSONB de SQL son identidades diferentes. Se conservan sus enlaces, no se
sustituyen entre sí. El futuro backend servirá el Markdown depurado como artefacto
citado; no los originales externos. El manifiesto local conserva los localizadores
documentales y la decisión de validación del equipo para auditar la respuesta.

## Estado

BCH-03 incremento 3 verificó el chat completo por HTTP local: creación con el
contexto técnico `ccd-local-demo`, mensajes, citas en PostgreSQL, descarga de
artefactos e historial. No son perfiles de estudiantes. No se modificaron corpus,
release ni vectores. Mobile CCD y acceso LAN siguen pendientes. Véase
[checkpoint 3](../../docs/transition/bch03-increment-3-checkpoint.md).
Para repetir el flujo HTTP desde `backend/api`: `npm run test:ccd:http`; para usar
el listener local manualmente: `npm run start:ccd` (antes `npm run build`).
El verificador del incremento 2 se conserva como evidencia histórica y comprueba
huellas del código de ingesta de aquella ejecución; no sustituye el verificador
HTTP del incremento 3 ni autoriza cambiar la procedencia de la release existente.

BCH-03 incremento 2 publicó dos documentos / dos chunks / dos embeddings en la
base local aislada `banuchat_ccd_dev`. Se validaron dos consultas documentales y un
caso negativo mediante Document RAG directo, con citas y artefactos verificados.
El chat completo y Mobile CCD no están acreditados. La actualidad institucional
sigue sin ratificarse; la validación del equipo no se convirtió en aval CCD.

Desde `backend/rag`, con `infra/.env.ccd` local configurado:

```powershell
npm run ccd:local -- inspect
npm run ccd:verify -- validators
npm run ccd:verify -- queries
```

La evidencia y respuestas están en `data/ccd/evidence/increment-2/`, ignoradas por
Git. Las consultas no crean perfiles ni conversaciones. `ccd:local -- ingest`
devuelve `already_current` si coinciden corpus, modelo y código; rechaza reemplazar
una candidata anterior/diferente y no hace retry/recovery automático. El comando
`migrate` exige destino vacío: no volver a ejecutarlo sobre la base ya migrada.
El escritor sintético mantiene su contrato. Para operación y pruebas véanse
[persistencia CCD](../../infra/db/ccd-local-development.md) y
[checkpoint](../../docs/transition/bch03-increment-2-checkpoint.md).
