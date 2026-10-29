# BanuChat — matriz vigente OE1–OE6

Corte ENTREGA-01, 29/10/2026; base `17feea92291aa10118b18a1d145b348a7ac60fcd`.
Los compromisos siguientes son **síntesis fieles**, no una sustitución de objetivos.
El texto original y su cotejo permanecen en la
[matriz A4.1](anteproyecto-reconciliation-matrix.md#7-objetivos-específicos):
A0, objetivos pp. 7–8 y resultados/criterios §12.2, pp. 20–21. Esa fuente prueba
lo escrito, no su aprobación formal ni autorización institucional.

Los resultados referenciados se ejecutaron en sus fechas originales. ENTREGA-01
consolida evidencia y comprueba dependencias; no vuelve a evaluar los seis objetivos.

| Objetivo | Estado defendible del corte |
| --- | --- |
| OE1 | Evaluación técnica ejecutada y cerrada; desempeño desigual y aceptación académica pendiente |
| OE2 | Parcial: adquisición y automatización comprobadas con fixtures, sin fuente institucional real autorizada |
| OE3 | Parcial: MCP y agente determinista implementados; ReAct LLM no acreditado |
| OE4 | Parcial: N8N local e integración acotada; Sheets real y BPM institucional no acreditados |
| OE5 | Parcial respecto del compromiso: Android técnico validado; criterios humanos originales no cumplidos |
| OE6 | Parcial: integración/operación local; sin despliegue en servidores UNAB ni aceptación integral |

Ningún objetivo se marca aprobado por el director o el CCD. Las brechas técnicas
y dependencias académicas se separan para evitar presentar fixtures como producción.

## OE1 — recuperación y respuestas sustentadas

| Campo | Estado verificable |
| --- | --- |
| Compromiso escrito | Motor PostgreSQL/pgvector y RAG sobre documentos CCD, con respuestas exclusivamente oficiales y verificadas. Banco 50–80; faithfulness ≥0,80, context precision ≥0,80, context recall ≥0,75, answer relevancy ≥0,80 y MRR ≥0,70. A0 no fija k para MRR |
| Implementación | Document RAG CCD, embeddings 1024D/coseno, selección por sujeto/aspecto/periodo, límites, abstención, citas y trazabilidad. FLOW-01/02/03/04 implementados después del baseline |
| Evidencia | [Informe de cierre OE1](../../eval/rag-quality/results/oe1-cierre02-technical-report.md), [protocolo CCD14](../../eval/rag-quality/CCD14-EVALUATION-PROTOCOL.md), [integración CCD](../../eval/integration/results/ccd-integration-01-summary.md) |
| Resultado disponible | 43 intentados, 39 respuestas y cuatro abstenciones; cero errores/timeouts. Hit@5=0,860465; MRR@5=0,813953; Precision@5=0,306977; Recall@5=0,764673. RAGAS sobre 39: faithfulness=0,952991, context precision=0,709402, context recall=0,713675, answer relevancy=0,618210 |
| Brecha técnica/metodológica | No se alcanzaron tres medias RAGAS preliminares. Juez exploratorio; limitación técnica histórica de AnswerRelevancy 7/12. Las mejoras posteriores se verificaron como desarrollo conocido; no existe otra tasa ciega de calidad que sustituya el baseline |
| Dependencia académica/institucional | Aceptar o rechazar 43 frente a 50–80, exclusiones y correcciones técnicas; decidir MRR@5 y alcance del juez; revisión independiente y ratificación documental pendientes. Autor único, sin reserva verdaderamente no vista |
| Estado defendible | `OE1_TECHNICAL_EVALUATION_CLOSED_ACADEMIC_ACCEPTANCE_PENDING`; no significa todas las metas alcanzadas ni información institucional ratificada |

MRR@5 y faithfulness superan numéricamente sus referencias preliminares; las otras
tres medias del juez no. Precision@5 no es context precision de RAGAS y no debe
compararse con su umbral 0,80. Las cuatro abstenciones siguen en el denominador
operacional de 43, aunque el juez solo puntúe las 39 respuestas.

## OE2 — extracción y actualización

| Campo | Estado verificable |
| --- | --- |
| Compromiso escrito | RPA basada en scraping periódico de oferta, convocatorias y novedades CCD; tres flujos automáticos exitosos, actualización <24 h desde publicación de origen y extracción documental >90 % |
| Implementación | Tres flujos de adquisición/extracción local, validación, deduplicación, estado y bitácora; pipeline de ingesta/publicación reusable. Exports N8N con Schedule Trigger, inactivos y limitados a IDs fixture |
| Evidencia | [Checkpoint OE2](../transition/oe2-checkpoint-2026-10-24.md), [evaluador y fixtures](../../eval/oe2/README.md), [N3 de ingesta manual](../../eval/ingestion/results/n3-n8n-e2e-2026-10-02.md) |
| Resultado disponible | Corte 24/10: tres ejecuciones locales, 6/6 documentos y 42/42 campos correctos, exclusivamente fixtures; cero ejecuciones autónomas N8N observadas en ese corte. N3 acredita otra ingesta manual local, no scraping institucional |
| Brecha técnica | Sin adquisición institucional real, sin validación contra páginas autorizadas y sin reloj publicación-origen → disponibilidad; una plantilla de scheduling no demuestra ejecución periódica |
| Dependencia académica/institucional | Fuente, autoridad, permiso, contrato y cadencia; decidir conservar RPA/scraping o aprobar otra adquisición. La carpeta externa CCD sigue siendo de lectura |
| Estado defendible | Parcial. El 100 % sobre fixtures no satisface automáticamente el >90 % institucional ni el plazo original |

## OE3 — enfoque agéntico y MCP

| Campo | Estado verificable |
| --- | --- |
| Compromiso escrito | Núcleo agéntico con RAG, pgvector y herramientas MCP; el resultado escrito precisa un LLM con ciclo ReAct y selección de herramientas para tareas de varios pasos |
| Implementación | Seis tools MCP de lectura, transporte stdio, política determinista acotada, límites de pasos/calls, contexto de cuenta y publicaciones fijadas. En Unified consulta documentos CCD y auxiliares ficticios autorizados |
| Evidencia | [OE3](../transition/banuchat-oe3-checkpoint.md), [integración Unified y seguridad](../transition/banuchat-unified-application-checkpoint.md), código `backend/api/src/agent` y `backend/mcp-server/src/unified-main.ts` |
| Resultado disponible | Evidencia OE6 de 6/6 tools reales y diez recorridos N8N/MCP; Unified acredita integración y rechazo de perfil ajeno/escrituras. Son pruebas locales, no validación de decisiones ReAct |
| Brecha técnica | El LLM no gobierna un ciclo iterativo de razonamiento/acción/observación; la selección actual es determinista. No hay una tasa de selección ReAct medida |
| Dependencia académica/institucional | Director debe decidir si conserva ReAct o acepta expresamente la política acotada; definir casos y autoridad de herramientas reales si se mantiene el compromiso |
| Estado defendible | Parcial. MCP operativo y agente determinista no equivalen automáticamente a ReAct |

## OE4 — N8N, BPM y calendario

| Campo | Estado verificable |
| --- | --- |
| Compromiso escrito | N8N/BPM para interacción y directrices institucionales, integrando fuentes; calendario Google Sheets, sincronización máxima 30 min, E2E sin pérdida/corrupción y cobertura del 100 % de flujos definidos |
| Implementación | Webhook correlacionado antes de ciertos planes multifuente, agente/MCP y persistencia; ingesta manual separada; calendario y auxiliares versionados a partir de fixtures |
| Evidencia | [OE4](../transition/banuchat-oe4-checkpoint.md), [Unified](../transition/banuchat-unified-application-checkpoint.md), [OE6](../transition/banuchat-oe6-checkpoint.md) |
| Resultado disponible | Diez recorridos N8N/MCP locales en el corte OE6 y prueba de fallo seguro 503 sin turno persistido; calendario local `unchanged` medido. ENTREGA-01 observó N8N 15679 sin TCP: no afirma que esa rama esté disponible hoy |
| Brecha técnica | Sin Google Sheets real ni su reloj fuente→release; no se acredita BPM institucional completo, sincronización real ≤30 min o cobertura de todos los flujos originales |
| Dependencia académica/institucional | Autoridad sobre reglas, catálogo de procesos, hoja/fuente y credencial; decisión sobre alcance final. La disponibilidad de N8N local debe comprobarse antes de una demo multifuente |
| Estado defendible | Parcial. Workflow local y fixture de filas no acreditan integración institucional con Sheets |

## OE5 — interfaz móvil y usabilidad

| Campo | Estado verificable |
| --- | --- |
| Compromiso escrito | Interfaz React Native intuitiva, accesible y optimizada, con consulta natural, calendario, historial académico y push. Mínimo diez estudiantes reales, cinco tareas, completación >85 %, SUS medio >70 y ningún SUS individual <50 |
| Implementación | Expo SDK 57, login propio, sesión/refresh/logout, chat/citas/visor, historial conversacional, progreso/calendario/novedades ficticios y recordatorios locales |
| Evidencia | [Android CCD 1.4.0](../../eval/mobile/results/android-mvp-ccd14-validation.md), [integración](../../eval/integration/results/ccd-integration-01-summary.md), [cierre humano canónico](oe5-human-validation-closure-decision.md) |
| Resultado disponible | Integración: 41 pruebas Mobile. Android: seis turnos físicos, doce mensajes, 21 capturas privadas, fuentes, carga, historial, restauración y logout en YAL-L21/Android 10. No son resultados SUS ni muestra de estudiantes |
| Brecha técnica | Sin iOS físico, matriz completa de dispositivos, accesibilidad integral ni push remoto acreditados. Historial conversacional y datos auxiliares ficticios no son expediente académico real |
| Dependencia académica/institucional | Criterios humanos originales no cumplidos. No hay reclutamiento ni SUS autorizados. Alternativa de evidencia del autor pendiente de decisión del director; no se presenta esta ejecución del agente como esa aceptación |
| Estado defendible | Parcial respecto del OE original; recorrido Android técnicamente validado para el alcance descrito |

## OE6 — despliegue y desempeño integral

| Campo | Estado verificable |
| --- | --- |
| Compromiso escrito | On-premise con Docker en servidores proporcionados por la universidad y evaluación integral con estudiantes. Media ≤5 s, sin interrupciones no planificadas >5 min y cobertura completa de la evaluación prevista |
| Implementación | Infraestructura local, API autenticada, persistencia, imagen/Compose de transferencia, controles de seguridad, operación y evidencias de integración; Android actual host-native por USB |
| Evidencia | [OE6](../transition/banuchat-oe6-checkpoint.md), [cierre técnico Docker](../transition/banuchat-technical-closure-checkpoint.md), [Unified](../transition/banuchat-unified-application-checkpoint.md), [Android](../../eval/mobile/results/android-mvp-ccd14-validation.md) |
| Resultado disponible | Corte OE6: RAG host-native medio 3.031,4 ms en diez muestras, con p95 5.340 ms; N8N/MCP diez corridas; restore con 16/16 huellas. Cierre posterior acredita carga Docker 1/2/5. No son un SLA del producto actual ni una medición en UNAB |
| Brecha técnica | No hay despliegue universitario, TLS/DNS institucionales, operación sostenida/soak ni cobertura de todas las evaluaciones originales; un portátil local no prueba estabilidad institucional |
| Dependencia académica/institucional | Servidor, recursos, accesos, responsable de operación y decisión sobre sustitución local; aceptación integral ligada a las brechas OE1–OE5 |
| Estado defendible | Parcial. Transferibilidad y pruebas locales útiles, sin acreditar despliegue UNAB |

## Decisión de alcance

Se recomienda presentar el prototipo local y sus evidencias como la entrega técnica
disponible, con brechas explícitas. Acotar compromisos, aceptar instrumentos
alternativos o diferir componentes requiere decisión académica. El
[paquete para el director](entrega-01-director-brief.md) organiza esas decisiones;
no registra ninguna como aprobada ni modifica el anteproyecto.
