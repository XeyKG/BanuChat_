# BanuChat — decisiones externas y cronograma de cierre

## Registro vigente de decisiones — 31/10/2026

La [matriz vigente](oe1-oe6-current-status.md) contiene el cotejo A–I, las seis
alternativas de alcance y el backlog **actual de cinco actividades**.
El [checkpoint](CHECKPOINT-OE1-OE6-CLOSURE-GAP-01.md) recomienda
OE6-UNIFIED-RECOVERY-01. Esta actualización no registra ninguna decisión externa
nueva ni inicia las tareas propuestas.

| Asunto | Estado vigente y efecto |
| --- | --- |
| Autoridad documental y evaluación OE1 | Pendiente ratificación/independencia y decisión de banco/k/juez. RAGAS sí se ejecutó el 29/10 sobre 39 respuestas de 43 intentadas; tres metas quedaron por debajo. QUALITY-03/04 posteriores no sustituyen ese baseline |
| Adquisición institucional OE2 | No autorizada. Tres schedulers fixture y publicación aislada comprobados; no acreditan scraping, >90 % institucional ni <24 h desde sitio CCD |
| Agent/ReAct OE3 | Producto adaptativo determinista y MCP reales comprobados; política LLM C solo experimental. Sustitución o conservación del ReAct original pendiente del director; no desarrollar por etiqueta |
| Sheets/BPM OE4 | N8N participa en rama multifuente y automatización local; no existe Sheets autorizado ni prueba ≤30 min/100 % flujos originales. Fuentes sintéticas de perfiles sí son compatibles con A0 |
| Plataformas y notificaciones OE5 | Android físico y recepción local comprobados al 31/10. iOS físico/push remoto y evaluación completa de accesibilidad pendientes; no confundir local con push ni export con prueba iOS |
| Validación humana OE5/OE6 | Rige la decisión canónica enlazada abajo: criterios originales NO CUMPLIDOS, sin reclutamiento/SUS autorizados; alternativa del autor pendiente de aprobación |
| Infraestructura y operación OE6 | Readiness local Unified acreditado; falta receptor/operador/ventana institucional y evaluación SLA. Restore sintético anterior no cubre coherencia de todo Unified actual |

No se atribuyen decisiones al director, CCD o TI sin respuesta documentada.
La autoridad académica puede decidir alcance; permisos de datos y operación
institucional deben ser otorgados por sus responsables correspondientes.

### Impacto vigente sobre planificación

La siguiente tarea recomendada es recuperación aislada del Unified actual, sin
activar automatismos restaurados ni tocar fuentes protegidas. Investigación
causal OE1 y diagnóstico de latencia tienen presupuesto acotado y no autorizan
nuevos benchmarks. La preparación metodológica puede avanzar; evaluación
independiente y ramas institucionales siguen sujetas a sus dependencias.

Solo se estiman esfuerzos relativos en P1–P5 de la matriz. No hay fechas nuevas,
plazo institucional confirmado ni tiempo restante calculable. **Las 23–41
jornadas-persona y las 16 semanas que siguen son cifras/plantillas históricas,
no estimación actual ni autorización para ejecutar sus actividades.** Android,
RAGAS y scheduler ya tienen evidencia posterior: no se repiten por figurar
pendientes en una tabla antigua. Las actividades humanas antiguas no son backlog
activo. No hay reclutamiento ni SUS.

## Registro histórico conservado

El cuerpo siguiente conserva decisiones y planificación anteriores; las
afirmaciones técnicas superadas se interpretan con el registro vigente anterior.

> La fila y actividades históricas de pruebas humanas quedan subordinadas a la
> [decisión canónica de cierre OE5](oe5-human-validation-closure-decision.md):
> **NO EJECUTADO — FUERA DE ALCANCE — PENDIENTE DE DECISIÓN DEL DIRECTOR**. No
> autorizan reclutamiento ni SUS; los criterios originales permanecen **NO
> CUMPLIDOS** y la alternativa del autor es **PROPUESTA / PENDIENTE DE APROBACIÓN**.

## Estado de decisiones externas

Este documento solicita decisiones; no registra aprobaciones inexistentes. `PENDIENTE`
significa que el repositorio no contiene una decisión suficiente para ejecutar el alcance
original. `NO AUTORIZADO` impide actuar hasta recibir autorización explícita.

| Decisión | Estado comprobado | Quién debe decidir/proveer | Evidencia mínima de cierre | Efecto si sigue abierta |
| --- | --- | --- | --- | --- |
| Autoridad documental CCD: dueño, versión, vigencia, jerarquía y uso permitido | PENDIENTE; el corpus local es seleccionado y trazable, sin aval CCD | Responsable CCD autorizado y director | Acta/listado de documentos y versiones, alcance de uso, fecha de vigencia y tratamiento de conflictos | OE1 no puede afirmar información oficial/verificada ni congelar gold definitivo |
| Adquisición/RPA/scraping y fuentes | NO AUTORIZADO; no se deben consultar sitios/APIs reales | CCD/UNAB, responsable legal/técnico y director | Fuente por flujo, mecanismo permitido, autenticación, cadencia, límites, retención y criterio de exactitud/frescura | OE2 queda parcial; no se implementan conectores ni se mide <24 h contra origen |
| Google Sheets/calendario real | PENDIENTE; existe fixture, no hoja ni credencial | Propietario funcional de calendario y seguridad TI | ID/owner de fuente, service account o mecanismo aprobado, schema, zonas horarias, cancelación y SLA | OE4 conserva fixture; no se afirma Sheets ni sincronización ≤30 min |
| Alcance de Agent/ReAct | PENDIENTE; agente/MCP actual es determinista, no LLM ReAct | Director con revisión técnica/seguridad | Decisión conservar/sustituir, casos multietapa, tools/permisos y criterio de evaluación | OE3 queda parcial; no se crea un ciclo LLM sin necesidad aprobada |
| Dispositivos Android/iOS físicos | PENDIENTE para la validación final; export no equivale a dispositivo | Equipo/laboratorio y responsables de firma | Inventario, OS, build/hash, firma, canal local seguro y agenda | DV físico/accesibilidad y afirmaciones nativas quedan pendientes |
| Pruebas con estudiantes | CERRADAS: NO EJECUTADAS — FUERA DE ALCANCE | Director | Decisión posterior explícita si desea reconsiderar la alternativa propuesta; no reclutamiento ni SUS por defecto | No hay completación, SUS ni cierre OE5/OE6 con usuarios reales; criterios originales NO CUMPLIDOS |
| Servidor On-Premise UNAB | PENDIENTE; Docker Desktop local no es UNAB | Infraestructura/seguridad/operación UNAB | Host, CPU/RAM/GPU/disco, SO, red/DNS/TLS, backups, operador, ventana y aceptación | OE6 queda local; no se repite baseline receptor ni se mide disponibilidad |
| Credenciales push | AUSENTES y no deben inventarse | Dueños FCM/APNs, seguridad y backend | Proyectos/bundles, credenciales custodiadas, contrato de dispositivos y revocación, development builds | Solo recordatorios locales; DV-13 permanece `BLOCKED` |

## Corrección de la estimación OE6

El checkpoint OE6 declaró **20–36 jornadas-persona**, pero enumeró:

- recepción/TLS/secretos/monitoreo: 3–5;
- fuentes y Sheets institucionales: 5–10;
- carga/soak/hardening: 3–5;
- Android+iOS+push: 5–8;
- revisión RAGAS y banco: 2–4;
- sesiones SUS y consolidación: 3–5;
- cierre académico: 2–4.

La suma correcta es **23–41 jornadas-persona**, no 20–36. Esta corrección es aritmética,
no una promesa de calendario ni una medición de trabajo ya consumido. La concurrencia
local 1/2/5 ya está ejecutada; el bloque de carga/hardening conserva recepción, soak y
seguridad en el host institucional, que no se acreditan localmente.

## Backlog de cierre condicionado

| Prioridad | Actividad/entregable | Responsable por rol | Dependencia | Esfuerzo | Criterio de aceptación | Paralelismo/bloqueo |
| --- | --- | --- | --- | ---: | --- | --- |
| P0 | Resolver alcance por OE y las ocho decisiones externas | Director, CCD, TI; equipo prepara | Agenda/autoridad | Incluido en cierre académico | Registro fechado con decisión, owner, condiciones y efecto por OE | Preparación paralela; decisión bloquea las ramas correspondientes |
| P0 | Recepción On-Prem, TLS, secretos, backup y monitoreo | TI/operación UNAB + equipo | Host, DNS/certificado, operador | 3–5 jornadas | Compose validado en receptor, secretos fuera de Git, health/logs/backups y rollback aceptados; sin exponer DB/N8N/Ollama | Puede empezar al obtener host; bloqueado por TI |
| P0 | Fuente/autoridad y, si se conserva, Sheets/adquisición | CCD/owner fuente + equipo | Permisos y mecanismo | 5–10 jornadas | Fuente y reloj definidos; flujo autorizado E2E con exactitud/frescura/sync medidas y evidencia adversa conservada | Puede avanzar en paralelo con recepción; bloqueado por CCD/credenciales |
| P0 | Baseline receptor, soak y hardening | Equipo técnico + operación/seguridad | Recepción; corpus/modelos congelados | 3–5 jornadas | Warm-up/ready gate, carga acordada, ventana soak, fallos/recuperación y media ≤5 s medidos en receptor; no interrupción >5 min según ventana aprobada | Después de recepción; local 1/2/5 ya no se repite como sustituto |
| P0 | Android/iOS físicos y push si se mantiene | Mobile + dueños de dispositivos/credenciales | Builds/firma/canal/FCM/APNs | 5–8 jornadas | DV-01–DV-14 por plataforma; push remoto solo con registro/revocación real; accesibilidad registrada | Login/chat local pueden avanzar; push/iOS bloqueados por recursos externos |
| P0 | Revisión del banco, gold, juez y RAGAS | Revisores CCD, árbitro, operador | Autoridad corpus y protocolo | 2–4 jornadas | Banco aprobado/congelado, juez aceptado y baseline completo contra cinco targets, con hashes/denominadores | Revisión puede solaparse con recepción; ejecución espera freeze |
| PENDIENTE DEL DIRECTOR | Alternativa OE5 del autor, si se aprueba | Director y autor | Decisión posterior explícita | No estimado | Evidencia limitada: T01–T05 en Android físico, registro e inspección heurística; no SUS ni población objetivo | No reclutamiento ni sesiones de terceros; no sustituye criterios originales |
| P0 | Informe, matriz y defensa | Equipo + director | Evidencia anterior o decisiones de aceptación de pendientes | 2–4 jornadas | Matriz OE1–OE6 actualizada, resultados/limitaciones, demo reproducible y aceptación académica registrada | Síntesis parcial paralela; conclusión espera resultados/decisiones |

Total aritmético de las siete filas con esfuerzo: **23–41 jornadas-persona**. Las esperas
de terceros, reclutamiento, revisión o agenda no son jornadas de desarrollo y pueden ampliar
el calendario sin cambiar esa suma.

## Encaje condicional en el horizonte histórico de 16 semanas

Las 16 semanas pertenecen al plan histórico 2026-2. No se sabe cuántas han transcurrido ni
cuántas quedan; por tanto, la tabla siguiente es una **plantilla relativa si se autoriza una
ventana completa**, no un cronograma vigente ni un reinicio automático del semestre.

| Ventana relativa | Carril técnico | Carril humano/institucional | Puerta de salida |
| --- | --- | --- | --- |
| S1–S2 | Congelar baseline y preparar recepción | Decidir alcance, autoridad, fuentes, host, dispositivos y protocolo | Decisiones/owners/agenda registrados |
| S2–S6 | Recepción/TLS/secretos; fuente/Sheets autorizada en paralelo | Revisión independiente del banco y arbitraje | Host y corpus/fuente aprobados |
| S4–S8 | Baseline receptor, ready gate, seguridad y soak | Calibración humana del juez | Runtime y juez congelados |
| S5–S10 | Builds Android/iOS; push solo si se conserva | OE5 humano fuera de alcance; decisión del director sobre alternativa del autor | No hay sesiones humanas autorizadas |
| S8–S12 | Ejecución retrieval/RAGAS y correcciones solo si se abre un ciclo explícito | Sin ejecución de cinco tareas ni SUS con participantes | Criterios OE5 humanos permanecen NO CUMPLIDOS |
| S12–S16 | Consolidación técnica y demo | Análisis, revisión académica y decisiones sobre brechas | Informe/matriz/aceptación final |

Recepción, autorización de fuentes, revisión del banco y preparación de dispositivos pueden
solaparse. No pueden solaparse con ejecución final si aún cambian versión, corpus, juez,
tareas o entorno. Las ramas bloqueadas por terceros permanecen visibles; no se sustituyen
por fixtures ni se declaran terminadas para cumplir la ventana.

Si el tiempo real confirmado es menor, el director debe escoger qué compromisos sustituir o
diferir y actualizar el documento académico correspondiente. El equipo técnico no debe
recortar muestras, targets, plataformas o entornos después de observar resultados.
