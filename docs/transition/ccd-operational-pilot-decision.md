# Propuesta de decisión: piloto documental operativo aislado

Estado: experimento local autorizado por el responsable el 26 de octubre de 2026.
Promoción al producto y publicación institucional: pendientes de decisiones separadas.
Antecedente técnico: HEAD `3ee0c217336d837715ffdd87267d87f5d590dff9`.

## Cambio de autoridad y alcance

La nueva instrucción del responsable autoriza contrastar el funcionamiento académico
y operativo usando documentación CCD como referencia de trabajo y sus aclaraciones
explícitas. Supera para este experimento la exclusión general de reglas de validación,
planificación, tarifas y créditos en las primeras unidades y el estado sin admisión
de los candidatos del análisis multidominio anterior. No cambia retroactivamente
las decisiones, contratos, artefactos ni permisos de las releases históricas.

Se distinguen cuatro bases: `DOCUMENT_SOURCE`, `DOMAIN_CONFIRMATION`, `INFERENCE`
y `PENDING_CLARIFICATION`. Una confirmación del responsable puede justificar una regla
del piloto, pero no se presenta como texto encontrado en un documento ni como aval
independiente de la institución. La admisión para evaluación aislada no habilita
visibilidad estudiantil en el producto habitual.

## Precedencia temática

La reconciliación conserva cada divergencia, sus localizadores y la aclaración
aplicable. Se admite resolver para el proyecto la frontera inclusiva de validación,
la finalización mediante pruebas y cursos, la planificación sin secuencia general
obligatoria, el trámite ordinario de matrícula, el importe confirmado de cursos,
el canal organizacional autorizado y la diferencia entre créditos operativos y
créditos del plan. La fuente de contenidos de cada curso es su syllabus entregado,
con su ámbito, y no una paráfrasis promocional.

Siguen abiertos el alcance individual de homologaciones, las divergencias de la tabla
y la prosa de transición, las cohortes/periodos históricos, la relación entre servicios
de prueba con tarifas distintas y la rama condicional ambigua del instructivo.
La confirmación de un porcentaje de inasistencia no valida un ejemplo aritmético
incorrecto. Tampoco se infieren intentos ilimitados ni fecha exacta de insignia.
La precedencia se justifica por tema y confirmación, nunca solo por fecha.

## Frontera técnica del experimento

- Base `banuchat_p0_operational` en un contenedor propio y loopback `55473`.
- Roles exclusivos de administración, escritura y lectura; lector sin escrituras.
- Schema de lectura del piloto con versiones explícitas y sin tabla ni puntero
  `datasets.current_release_id`; no finalizador ni función de publicación del producto.
- A copia únicamente el corpus documental admitido bajo identidades nuevas; no copia
  cuentas, perfiles, expedientes ni datos auxiliares individuales.
- B conserva el contenido anterior y añade el piloto académico. C prepara derivados
  depurados con reconciliación y procedencia explícitas.
- El escritor nuevo verifica destino, rol, marcador de aislamiento, ausencia de
  puntero de publicación y hashes. El escritor histórico permanece intacto.
- El servicio de consulta es invocado por el evaluador privado usando los contratos
  internos de embeddings, PostgreSQL/pgvector, normalización y citas existentes.
  No se incorpora al arranque habitual ni instala otro servidor HTTP.

La selección usa metadatos de tema, curso y periodo, y la recuperación vectorial.
Las reglas sensibles se presentan mediante extracción de párrafos depurados con sus
condiciones y atribución; no mediante respuestas asociadas a identificadores del banco.
La síntesis descriptiva usa el generador local y valida referencias. Esta separación
de estrategia debe quedar visible en las métricas y no equivale a acreditar razonamiento
generativo normativo. Las citas del piloto no anuncian una URL HTTP de artefacto que
no esté servida.

## Restricciones que permanecen

Los originales externos siguen de solo lectura. El material privado y los secretos
permanecen ignorados por Git. No se exponen contactos personales ni información
individual. Un catálogo no demuestra grupos, profesores, horarios o cupos disponibles.
Una correspondencia histórica de cursos no equivale a reconocer una prueba antigua
o a decidir un expediente. No se extrapolan tarifas ni se aplica una interfaz histórica
como instrucción vigente sin comprobar su contexto.

La API habitual, Mobile, N8N y MCP no se modifican. No se reemplazan corpus, embeddings,
contratos o `current` existentes. No se hace commit ni push. Cualquier promoción exige
revisión de resultados, admisión de contenido, autorización del destino y una decisión
posterior; este experimento no puede promoverse copiando sus tablas al producto.

El informe de resultados es `eval/rag-quality/results/ccd-operational-multidomain-pilot.md`.
