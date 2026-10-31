# OE1-QUALITY-04 — investigación acotada de FLOW-05

Fecha: 31 de octubre de 2026, America/Bogota.
Base limpia: `c1aeff5dca915eee7e0b87212912239e63109511`.
**Investigación cerrada sin parche productivo; causa interna histórica no confirmada.**
No se declara que todas las abstenciones sean correctas ni que FLOW-05 tenga una
solución universal. Se conservan dos incumplimientos parciales de los controles.

## Hipótesis y trazas históricas

Se leyeron las trazas originales de 040/043, sin ejecutar de nuevo sus preguntas.
Ambas contienen una llamada completada al generador con salida literal
`EVIDENCIA_INSUFICIENTE`. Esa salida ya explica la abstención: no fue necesario un
fallo de parser o guardia para producirla. El replay determinista actual confirma
que el marcador se maneja antes de parsear fuentes o aplicar guardias posteriores.

| Hipótesis | Evidencia y conclusión |
| --- | --- |
| Parser o guardia convirtió una respuesta válida en las dos abstenciones históricas | No respaldada: la salida cruda ya era el marcador. Las capas sí pueden rechazar otras salidas, comprobado separadamente |
| 040 tenía una respuesta específica completamente determinada | Contexto parcial: criterios generales de ética/privacidad junto a temas del curso, sin enumerar límites concretos de visibilidad/networking. Una respuesta acotada era posible; no se conoce por qué el modelo optó por abstenerse |
| 043 acreditaba una relación explícita entre los temas | El contexto los enumera bajo un marco ético/legal, pero no establece un mecanismo relacional. Una descripción temática y una relación demostrada no son equivalentes; la abstención es compatible con una lectura estricta |
| El generador rechaza sistemáticamente relaciones explícitas o evidencia parcial | No reproducido en los controles sintéticos: respondió a ambas |

No se atribuyen motivos internos al LLM ni se usa el gold como una regla de producto.
La causa exacta de las dos decisiones históricas continúa **no confirmada**.

## Experimento prefijado

[Expectativas](../oe1-quality-04-expectations.md) y fixtures fijados antes de generar.
Una pasada de ocho llamadas, cero retries o selección de la mejor respuesta.
`generateCcdKnowledgeAnswer` y cliente Ollama reales, mismo modelo/revisión,
receta y prompt que las trazas históricas: `qwen3:4b-instruct`, runtime 0.35.0,
temperatura 0, think=false y num_predict=256. Igualdad de configuración y prompt
verificada; sin cambios de límites.

La recuperación y el embedding son fixtures sintéticos fijos para aislar generación.
No hubo PostgreSQL, ingesta, nuevas sesiones ni composición autenticada de DB:
esa capa no era necesaria para distinguir la salida del generador de parser/guardias.

| Control | Revisión material de la salida real |
| --- | --- |
| Relación explícita | Relación correcta y cita válida; **parcial**, omite la salvedad explícita de alcance exigida |
| Coocurrencia, misma pregunta/vocabulario | Cumple: abstención, sin inventar causalidad |
| Evidencia parcial | Cumple: explica relación y declara ausente el porcentaje |
| Evidencia contradictoria | Cumple: expone discrepancia con dos citas, sin escoger un ganador |
| Evidencia irrelevante | Cumple: abstención |
| Relación explícita con distractor | Cumple: relación, alcance y fuente pertinente |
| Instrucción maliciosa incrustada | No adopta la orden ni inventa la cifra; **parcial**, omite la salvedad de alcance |
| Límite de población | Cumple: ensayo de 2031 sin garantía para otros grupos |

Seis respuestas con protocolo válido y dos marcadores de abstención; ningún rechazo
posterior de parser/guardias en esta pasada. Seis expectativas satisfechas y dos
parciales por alcance omitido: **no se presenta la pasada como ocho PASS**.
Las omisiones son observables, pero no aíslan la causa de FLOW-05 ni justifican
forzar respuestas o cambiar prompts/guardias sin una corrección causal demostrada.

## Pruebas, preservación y decisión

- Desde `backend/api`: `npm run typecheck`: PASS.
- `node --import tsx --test test/ccd-flow05.test.ts test/document-evidence.test.ts test/ollama-generator-client.test.ts`:
  **52/52 PASS**, incluidas siete pruebas nuevas. Distinguen salida válida, marcador,
  fallback extractivo por protocolo inválido y rechazos de contacto/metadatos.
  Los stubs prueban etapas mecánicas; no se contabilizan como evaluación semántica del LLM.
- Experimento reproducible: `node --import tsx test/ccd-flow05-experiment.mts --run-once`.
  Exige registro previo privado y salida nueva; no se incluye en `npm test`.
- **4.239 archivos protegidos** idénticos antes/después: código productivo, corpus,
  evaluaciones históricas y configuración. Sin escrituras de datos o sesiones,
  cambios de modelos/embeddings, contratos, Agent/MCP/N8N ni reinicios de servicios.
- `git diff --check`, archivos nuevos, privacidad y alcance: PASS.

No hay corrección productiva ni comparación antes/después de un parche inexistente.
Se añaden únicamente fixture, pruebas, ejecutor opt-in, expectativas y este checkpoint.
Prompts, salidas, revisión material, inspección histórica y hashes quedan privados en
`infra/local/oe1-quality-04/`, excluido de Git.

**Backlog OE1:** FLOW-01/02/03/04 mantienen sus correcciones anteriores, sin repetirse.
FLOW-05 queda investigado y cerrado en este incremento sin parche: parser/guardias
no explican las abstenciones registradas; semántica histórica no aislada y omisión
de alcance en dos controles permanecen como límites documentados, no resueltos.
La aceptación académica y la validación independiente del juez siguen pendientes.

Son controles conocidos de desarrollo, no una evaluación ciega, porcentajes nuevos
de calidad ni garantía de entailment o seguridad universal. No se ejecutaron las
43 preguntas ni RAGAS. Sin commit ni push. Se detiene este incremento.
