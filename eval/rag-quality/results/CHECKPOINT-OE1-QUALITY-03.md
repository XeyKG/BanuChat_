# OE1-QUALITY-03 — corrección documental focalizada

Fecha: 31 de octubre de 2026, America/Bogota.
Estado: **correcciones focales verificadas con fixtures y RAG autenticado en solo lectura**.
Base limpia inspeccionada: `e31cbbbdb58133555f771f9bc2baafa8f1d31ebd`.

## Diagnóstico actual

FLOW-03 y parte sustancial de FLOW-04 ya estaban implementados en `ca2408c`, con
regresiones en `ccd-documentary-evidence.test.ts`. El backlog histórico describe
el estado anterior; no se modificó para presentarlo como una evaluación nueva.
Se conservaron las guardias de disponibilidad, antecedentes, población, periodo,
comparación curricular, datos personales y atribución documental. No se repitió
la comprobación operacional FLOW-01/02 ni se rediseñó su selección.

La representación todavía cortaba el resumen por caracteres, detenía la selección
al encontrar un detalle grande y permitía paquetes vacíos después del filtrado.
Esto podía perder una condición final, ocultar detalles posteriores o asociar una
cita con contexto vacío. Cinco fallos se reprodujeron antes de corregir producción.
Las [expectativas sintéticas](../oe1-quality-03-expectations.md) quedaron fijadas primero.

## Corrección y comparación controlada

| Escenario sintético | Antes | Después |
| --- | --- | --- |
| Resumen grande con condición final | Recorte de la condición | Rechazo íntegro del paquete |
| Viñeta grande seguida de detalle pertinente breve | El detalle posterior no llega al contexto | Se conserva completo si cabe |
| Ningún paquete factual utilizable | Llamada al generador y posible cita vacía | Abstención sin generación ni citas |
| Primer paquete rechazado, segundo válido | FUENTES podía atribuir el primero vacío | Contexto, índices y cita del segundo coinciden |
| Órdenes en un resumen multilínea | Se reconstruía eliminando una línea | Se rechaza el paquete, sin usar sus detalles fuera de contexto |
| Condiciones, contradicción parcial, distractores y órdenes en detalles | Dos controles ya pasaban | Siguen pasando |

Se conservan 1.600 caracteres por paquete y párrafos/viñetas indivisibles.
No se cambiaron prompts, modelo, embeddings, top_k, número de paquetes ni corpus.
El rechazo conservador de un resumen grande o con órdenes detectadas puede aumentar
abstenciones. El filtrado léxico no es un detector universal de inyección o contradicción.
La prueba de contradicción comprueba conservación del contexto, no entailment del LLM.

## Verificación ejecutada

- `npm run typecheck`, desde `backend/api`: PASS.
- Siete pruebas nuevas: **2 pasan / 5 fallan antes; 7/7 pasan después**.
- Regresiones focales CCD, contexto, selección, RAG y citas: **214/214 PASS**, incluidas
  las siete nuevas. Comando y archivos exactos en el [resumen saneado](oe1-quality-03-summary.json).
- RAG operacional: `createAuthenticatedDocumentRag → generateCcdKnowledgeAnswer`,
  rol runtime existente, SQL autenticado, PostgreSQL Unified y Ollama existentes;
  transacciones READ ONLY terminadas con ROLLBACK. Sin HTTP, móvil ni sesiones nuevas.
- Cuatro consultas finales: detalle solicitado, límite documental, divergencia histórica
  y disponibilidad no acreditada. Tres respuestas citadas y una abstención; tres identidades
  de cita verificadas contra chunk, versión, hash y release efectivamente recuperados.
  Revisión material: prácticas explícitas, límite de oferta, conjunción histórica y falta
  de autorización individual conservados. Latencias: 4.871, 366, 187 y 18 ms.
- Se conserva una primera sonda: una pregunta pedía prácticas ausentes del curso elegido
  y se abstuvo correctamente. El comprobador esperaba respuesta por error; se inspeccionó
  el soporte antes de elegir el curso documentado. No se atribuye ese fallo al producto.
- Las 43 tablas comprobadas, incluidos sesiones/historiales, quedaron iguales en cada
  pasada. También coinciden los snapshots de ambas pasadas. Current CCD 1.4.0:
  `10af4ffd-effb-41fc-bbfe-4dc48cb3398f`, sin publicación nueva ni reinicios de servicios.
- Integridad de archivos históricos/corpus/configuración verificada antes/después;
  `git diff --check`, archivos nuevos y revisión de alcance: PASS.

Archivos de producto: `ccd-evidence-text.ts` y `ccd-knowledge.ts`; prueba nueva:
`ccd-quality-budget.test.ts`. Se añaden únicamente expectativas, este checkpoint y resumen.
Evidencia completa y sonda inicial en `infra/local/oe1-quality-03/`, excluido de Git.

No se confirma una causa nueva de FLOW-05. Estos controles conocidos de desarrollo
no estiman una tasa de calidad ni sustituyen la evaluación OE1, la adjudicación humana
o el aval CCD. No se ejecutaron las 43 preguntas del baseline, RAGAS ni tareas OE2/3/4.
Sin cambios de contratos, SQL, modelos, configuración o datos. Sin commit ni push.
