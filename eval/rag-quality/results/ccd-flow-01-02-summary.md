# BanuChat — CCD-FLOW-01/02

Se corrigieron la interpretación previa al scope y la selección de evidencia por
atributo en el flujo CCD existente. La evaluación histórica OE1 permanece intacta.

## Cambios funcionales

`backend/api/src/chat/ccd-query-intent.ts` resuelve entidades, sujeto académico o
procedimental, aspectos solicitados y periodos antes de elegir presentaciones.
Los nombres proceden del manifest; una sigla académica solo se admite cuando
identifica inequívocamente una entidad. Las palabras «selección», «organización»
o «instrumento» dejan de determinar por sí solas una respuesta operativa.
La resolución conversacional existente conserva el sujeto del usuario; no se
modificó para incorporar afirmaciones anteriores del asistente como evidencia.

`backend/api/src/chat/ccd-knowledge.ts` utiliza esa interpretación para seleccionar
todos los aspectos explícitos admitidos por las presentaciones existentes. En
consultas académicas reserva evidencia del atributo solicitado y, en comparaciones,
cubre atributos por entidad antes de utilizar un resumen general. Conserva los
presupuestos de tres o cuatro paquetes académicos y el top_k recuperado de 20.
Las comparaciones exponen afirmaciones documentales por entidad: no se generan
relaciones causales, equivalencias ni avales curriculares sin soporte.

Si faltan atributos o los periodos/poblaciones son incompatibles, la comparación
se rechaza con un límite explícito. Las guardias personales, de oferta no acreditada,
la atribución de procedencia y las citas permanecen activas.

## Validación y comparación

Los fixtures nuevos son completamente sintéticos. La reproducción inicial produjo
diez fallos y dos aciertos; después se amplió a 17 pruebas. Pasaron el typecheck
y las 127 pruebas pertinentes: las 17 nuevas y 110 existentes. Cubren ambigüedad
de sujeto, consultas con dos aspectos, evidencia material, fechas, poblaciones,
seguimientos conversacionales, abstención, seguridad, citas y procedencia.

La comprobación operacional invocó el componente autenticado real con la publicación
CCD 1.4.0, PostgreSQL y Ollama existentes. Se verificaron 107 unidades y se utilizó
una transacción READ ONLY terminada con ROLLBACK. No fue una prueba HTTP/móvil.

Se compararon 13 casos ya observados durante el desarrollo. Antes se contestaban
algunas consultas sobre atributos con orientación administrativa o una presentación
general; después se utiliza el sujeto correspondiente y soporte del atributo en
cada entidad. Se verificaron 24 identidades de cita contra las filas recuperadas.
Los 13 terminaron sin errores ni abstenciones; esto por sí solo no demuestra
corrección semántica completa. La comparación detallada y sus límites permanecen
privados. Se preservan una primera pasada de 13, una comprobación correctiva de
tres y la pasada final de 13; no se ocultan los defectos detectados entre ellas.

## Límites

La selección utiliza facetas léxicas y metadatos, no un verificador universal de
entailment. Puede abstenerse conservadoramente ante poblaciones o ediciones
distintas. Las respuestas comparativas aportan soporte atribuido por entidad,
sin acreditar relaciones institucionales. No se puntuó exhaustividad respecto
del gold ni se garantiza reproducir todos sus detalles.

La regresión es de desarrollo, conocida y acotada: no permite estimar una nueva
tasa de calidad ni generalizar a los 43 casos. Se preservaron 58 archivos históricos,
incluidos benchmark, baseline y manifests. No se repitieron RAGAS, baseline ni
auditoría del corpus. No cambiaron SQL, corpus, releases, modelos, embeddings,
prompts ni configuración productiva. No se abordaron las otras tres intervenciones
del backlog.

La evidencia privada está en
`data/ccd/local/oe1-evaluation/ccd-flow-01-02-v1/`, ignorada por Git; contiene las
capturas completas, comparación, registro de pruebas, hashes e integridad inicial.
