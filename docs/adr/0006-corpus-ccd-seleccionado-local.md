# ADR 0006 — Corpus CCD seleccionado para desarrollo local

Fecha: 2026-10-21.
Estado: aceptado técnicamente por Sala de Control, BCH-03 incremento 1.

Ejecución posterior autorizada: BCH-03 incremento 2 aplicó el delta exclusivo CCD,
publicó M01/M12 y comprobó Document RAG directamente en entorno local. Su evidencia
y límites están en [el checkpoint](../transition/bch03-increment-2-checkpoint.md).
El texto de decisión del incremento 1 siguiente se conserva como antecedente.

## Contexto

ADR 0001 estableció el alcance exclusivamente sintético. BCH-01 produjo un
inventario y paquete de admisión, con candidatos, condiciones y bloqueos. Sala de
Control aceptó el diagnóstico y autorizó preparar M01/M12 para pruebas locales.
Las seis respuestas revisadas favorablemente por el equipo son base editorial,
sin aval institucional formal. No se presume vigencia actual por existir un archivo.

## Decisión

- Se permite información CCD real, seleccionada, minimizada y trazable en entorno
  local. Esta excepción sustituye la exclusividad sintética técnica de ADR 0001;
  conserva íntegro su texto y el antecedente de la demostración.
- `data/synthetic` v1 y su contrato permanecen intactos. No hay mezcla ni fallback
  silencioso entre corpus. Los perfiles sintéticos no identifican personas reales.
- Los originales de `CCD_DOCUMENTACION` son de solo lectura. `data/ccd` contiene
  contrato público y derivados locales ignorados por Git por defecto. No se copian
  originales internos íntegros. El contenido local puede tener estado
  `team_validated`, nunca aval CCD inferido.
- Incremento 1 se limita a M01 (estructura general) y M12 (contacto documentado).
  Cada unidad preserva C/M, fuentes y huellas, localizadores, versión editorial,
  periodo, población, límites y aplicabilidad actual no confirmada. Los límites
  forman parte del chunk recuperable, no solo de metadatos laterales.
- No se incorporan reconocimiento por pruebas, elegibilidad general, equivalencias,
  tarifas, expedientes, UID, notas ni información personal. Tampoco oferta interna,
  actas completas, siete syllabus o multimedia.
- Se conserva TypeScript, PostgreSQL/pgvector y Ollama local. Preparación manual y
  determinista sin N8N adicional, Agent/ReAct ni MCP. Una unidad breve con su
  contexto produce un chunk; no se exige banner sintético ni seis H2.
- PostgreSQL CCD se prepara con base, servicio, puerto y volumen propios. No se
  arranca ni aplica SQL en este incremento. El delta mínimo se documenta en
  `infra/db/ccd-local-development.md`; no se cambia la migración histórica.

## Consecuencias y límites

La preparación verifica bytes originales y produce artefactos/manifiesto/receta
en memoria. No demuestra autoridad institucional, exactitud semántica automática,
ingesta, embeddings o consultas. El contenido nuevo o una corrección editorial
requieren otra versión local y revisión; los hashes no sustituyen esa revisión.

El siguiente incremento implementará el escritor CCD y aplicará el delta aislado
para la primera carga. No debe usar `synthetic: true` para eludir SQL ni atribuir
una revisión Git a los originales externos. El backend deberá recibir la raíz de
artefactos CCD y corregir la etiqueta sintética del prompt antes de probar generación
CCD, sin mejoras conversacionales en este incremento.

Esta decisión no acredita aval CCD, cumplimiento de objetivos, benchmark real,
permisos de publicación institucional ni aprobación académica de cambios pendientes
(Agent/MCP, scraping, N8N/BPM, Sheets, despliegue y evaluación con usuarios).
