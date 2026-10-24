# CHECKPOINT BANUCHAT — BCH-05 / CCD-AUTH-I1B-F2

2026-10-23. Base limpia: `main`, `1583457cf818d8f7c359671c51093ab7832587df`.
**Avance parcial: harness adversarial implementado y ejecutado; protección funcional
general pendiente.** No se ha eliminado el riesgo general de 503 por contexto.
Se continúa con OPS según la alternativa expresamente autorizada en A7.

## Reconstrucción de la decisión

1. REST v2 autentica y autoriza el owner; los servicios consultan la conversación
   y sus mensajes antes de invocar RAG. La persistencia del par y sus citas ocurre
   después de una respuesta válida; el fallo de generación no produce un medio turno.
2. `conversation-context.ts`: limita contexto a ocho mensajes, 1200 caracteres
   por mensaje y 6000 en total; resuelve referencia/tema usando antecedentes del
   usuario. La consulta de embedding admite 4000 puntos de código. Las respuestas
   anteriores no van a la consulta de embedding como evidencia institucional.
3. `document-query-retrieval.ts` lee la configuración de la release ready, valida
   revisión/receta/dimensión y llama al embedding. El adaptador autenticado reutiliza
   las validaciones y la función SQL autorizada. La similitud ordena candidatos;
   no demuestra pertinencia semántica.
4. `document-rag.ts` recupera top-k 12 en CCD (5 sintético). El catálogo reconocido
   usa títulos de los siete syllabus sin generación. `selectCcdEvidence` usa
   títulos, alias F1, prioridades y antecedentes; el fallback excluye U03/U04 y
   puede conservar diez unidades. Esa cantidad es un efecto del fallback, no una
   regla de que diez fuentes sean pertinentes.
5. El prompt combina instrucciones, documentos completos seleccionados, pregunta
   e historial acotado. En orientación se conservan solo antecedentes del usuario;
   el historial sigue declarado no confiable y no sustituye fuentes.
6. `OllamaGeneratorClient` valida versión/digest/capacidad, envía `/api/chat` con
   la receta existente, valida fin `stop` y vuelve a verificar runtime. Un 400
   de capacidad y otros 400 comparten `invalid_generator_response`. El contrato
   público devuelve 503; el cliente no distingue capacidad en su razón actual.
7. RAG valida las referencias generadas, filtra afirmaciones bloqueadas, agrega
   límites temporales y construye citas. Un locator válido no prueba por sí solo
   respaldo semántico ni completitud de una comparación entre cursos.

Reglas conservadas: procedencia, límites históricos, no derechos inventados,
correcciones, aislamiento, atomicidad, ninguna repetición automática y F1.
Efectos accidentales observados: fallback amplio ante paráfrasis/tema ajeno y
ausencia de distinción interna entre capacidad y otros rechazos 400.

## Batería y medición

Archivos nuevos: `backend/api/test/auth-i1b-f2/cases.ts`,
`backend/api/test/ccd-context-adversarial.test.ts`,
`backend/api/test/auth-i1b-f2-adversarial.mts`.
24 casos de **desarrollo**, no reservados: siete cursos presentes, alias completo,
normalización, paráfrasis, catálogo, todos los temarios, dos cursos, tema ajeno,
ambigüedad, seguimientos, correcciones sucesivas, corte de orientación anterior,
historial largo, antecedente eliminado por límites, consulta de 3999 caracteres,
testimonio no verificado y horario/cupos sin soporte admitido.

Hay tres niveles separados:

- 21 pruebas deterministas/clientes con dobles. Incluyen caracterización de defectos:
  que un test confirme diez fragmentos **no significa pertinencia aprobada**.
- Captura de 24 casos: PostgreSQL I1B en solo lectura, embedding y retrieval reales;
  generador sustituido por captura sin respuesta. Solo métricas, hashes y locators.
- Cuatro probes: mismo RAG autenticado, PostgreSQL en solo lectura y Ollama real.
  Cero POST REST de mensajes, cuentas nuevas, conversaciones o persistencia en A.

Evidencias nuevas, conservadas sin sustituir baseline:

- [Captura](../../eval/auth/results/bch05-ccd-auth-i1b-f2-capture-1792782378649.json).
- [Probe real](../../eval/auth/results/bch05-ccd-auth-i1b-f2-probe-1792782408521.json).

| Caso | Selección | Observación |
| --- | --- | --- |
| IA canónica | DOC-101 | Ollama 200; 1883 tokens evaluados; `stop`, cita DOC-101 |
| Nombre desarrollado / pregunta exacta F1 | DOC-101 | Captura de 7006 bytes, mismo tamaño registrado en F1; no se infiere igualdad de contenido por tamaño ni hubo nueva generación de ese caso |
| Paráfrasis no literal | 10 unidades | Ollama 400: proveedor declara **6420 frente a 4096 tokens**; `invalid_generator_response` |
| Dos cursos explícitos | DOC-101 + DOC-103 | Ollama 200; 2370 tokens; cita ambas fuentes, sin aprobación semántica humana nueva |
| Pregunta de 3999 caracteres | DOC-101 | Ollama 200; 2964 tokens; cita DOC-101 |
| Todos los temarios / tema ajeno | 10 unidades | Capturas de 20658 / 20653 bytes; no se infiere pertinencia ni conteo de tokens |
| Historial largo dentro del límite | DOC-101 | Captura de 13097 bytes; no generación real de ese caso |
| Antecedente expulsado por límite | Ninguna | Aclaración sin generación; no inventa el antecedente perdido |
| Catálogo | Siete syllabus | Presentación de metadatos sin generación |

Los bytes son tamaño UTF-8, **no conteo exacto ni presupuesto demostrado de tokens**.
En el primer informe probe, `generation: NOT_STARTED` quedó sin actualizar en el
caso rechazado: `provider_status: 400`, categoría y tokens acreditan que sí se intentó
Ollama. Se conserva el informe original y se corrigió el harness para futuras
ejecuciones (`REAL_OLLAMA_ATTEMPTED`); no se repitió el rechazo para cambiar evidencia.
El primer test de historial largo falló porque el fixture excedía 6000 caracteres;
se mantuvo ese escenario como `history_subject_evicted` y se añadió el escenario
realmente dentro del límite. No se cambió el límite ni la lógica de producción.

## Diseño verificable y decisión pendiente

No se eligió el primer resultado vectorial como curso, no se cortaron documentos
ni se impuso un umbral arbitrario de caracteres. El probe de dos cursos y el de
3999 caracteres demuestran por qué esas reglas simples rechazarían solicitudes
que actualmente caben. Un máximo nativo del modelo tampoco acredita su contexto
cargado: `/api/ps` observó 4096. Se usaron solo endpoints ya existentes/verificados
(`/api/version`, `/api/tags`, `/api/show`, `/api/embed`, `/api/chat`, `/api/ps`).
No se ha verificado una operación disponible que cuente exactamente los tokens del
prompt completo con la plantilla cargada; no se inventa un endpoint tokenizador.

La política propuesta, **sin implementar**, separa:

| Estado | Evidencia necesaria / tratamiento propuesto |
| --- | --- |
| Identificado | Conservar títulos/alias/correcciones acreditados y todas las fuentes pertinentes |
| Ambiguo | Pedir precisión sin elegir por proximidad; aprobar qué paráfrasis/consultas amplias activan aclaración |
| Sin soporte pertinente | Conservar insuficiencia justificada, sin importar conocimientos externos |
| Evidencia pertinente que excede capacidad | Categoría operacional independiente, sin truncado silencioso; acordar respuesta y si pide dividir temas |
| Infraestructura/proveedor | Mantener error sanitizado y atomicidad, sin convertirlo en falta documental |

Para cerrar F2 se necesita decidir el tratamiento de consulta amplia/no reconocida
y de capacidad: ¿aclaración previa, rechazo operacional específico o división
explícita solicitada al usuario? No todos los temas no reconocidos son ambiguos:
el tema ajeno es claro pero no respaldado. `insufficient_evidence=true` tampoco
debe disfrazar un fallo del proveedor. Debe acordarse cómo representar capacidad
sin cambiar el contrato congelado ni presentar una respuesta parcial como completa.
Luego hace falta validar el mecanismo de medición/admisión con la plantilla real,
incluidas instrucciones, historial y salida, antes de fijar un límite conservador.

Punto mínimo de instrumentación futura: entrada de `generate` (tamaño UTF-8,
cantidad de fuentes, hash) y rechazo de `/api/chat` (categoría allowlist), enlazados
al request_id. Ya está probado **solo en el harness**, sin logs nuevos de producto.
No publicar errores crudos, prompts, preguntas, cuerpos o documentos.

## Regresiones, integridad y detención

165 pruebas API pertinentes aprobaron, incluidas las 92 de F1 y los controles de
cliente, contrato y autenticación. La batería focal 18/18 y la integral 43/43 son
**evidencia histórica**, no reejecutada aquí: no cambió código de la ruta RAG, sus
parámetros ni contratos. No se afirma una nueva equivalencia de 43 respuestas.
T01/2 y T11 permanecen pendientes, sin cambio de rúbrica o clasificación.

Corpus antes/después:
`db29ad53062ee400a367fb4a16b4c5cc2f9c178cb1333e29dab29fe12a449963`.
Historias intactas en ambas ejecuciones A. No acceso al CCD original, bases
sintéticas, laboratorios históricos o `CCD_DOCUMENTACION`.

Decisiones confirmadas: reproducir el fallo antes de cambiar selección; preservar
casos favorables y adversos; seguir con OPS. Provisionales: diseño de cinco estados
y política de capacidad. Descartados: top-k global menor, aliases indefinidos,
truncado silencioso, mayor num_ctx, usar texto generado como evidencia.
**F2 funcional pendiente de Sala; no iniciar I1C.**

### Confirmación de cierre reanudado

Se revisaron los informes de 24 capturas y cuatro probes sin repetirlos. Las
pruebas API pertinentes volvieron a pasar 165/165. El laboratorio I1B está detenido
en esta comprobación: integridad PG actual NOT_EVALUABLE; se conserva la evidencia
histórica anterior, sin afirmar nueva generación ni nueva verificación de corpus.
No cambió la decisión F2: harness entregado, corrección general pendiente.
El [cierre de misión, sección J](bch05-ccd-auth-i1b-mission-checkpoint.md) detalla
la auditoría y los pendientes de OPS y Android.
