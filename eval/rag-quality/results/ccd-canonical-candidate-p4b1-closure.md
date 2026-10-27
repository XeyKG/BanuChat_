# BanuChat — P4-B.1: cierre focalizado de CCD 1.4

## A. Estado inicial encontrado

Inicio: `2026-10-27T12:46:28.3798231-05:00`. Corte de cierre: `2026-10-27T12:58:30-05:00`, zona America/Bogota.
HEAD inicial real y conservado: `8c524a00b8d6c46e55555319f6eb8518b7ec568f`.
Branch `main`; working tree limpio. Cero cambios locales preexistentes. Se guardaron
HEAD, branch, porcelain completo y diff antes de editar código. No se cambió de
branch ni hubo commit/push.

## B. Archivos/documentación inspeccionados

AGENTS.md completo; README general, API, RAG, CCD y DB; checkpoint unificado;
informes de promoción 1.3, Mobile, P4-A, P4-B, trazabilidad OE1–OE6 y preparación
OE5-H0. Se consultaron las secciones pertinentes y sus contradicciones históricas.
Inspección funcional delimitada a `ccd-knowledge.ts` API/RAG, tests v2, resolución
conversacional, protocolo de citas, `captureCcdCode`, preparación/staging y evaluador
privado P4-B con sus dependencias transitivas. `inspected-documents.json` conserva
identidades y hashes. No se modificaron esos documentos históricos.

## C. Contradicciones o condiciones previas detectadas

- AGENTS y partes antiguas de README describen etapas anteriores. El checkpoint
  posterior acredita MCP operativo y agente determinista/acotado, sin ReAct
  gobernado por LLM; N8N participa en multifuente acotada. No se revirtió arquitectura.
- Documentación CCD y auxiliares ficticios conservan separación. Android técnico
  no equivale a SUS, aceptación humana ni despliegue institucional.
- La sección 10 de la solicitud contiene un UUID de current inconsistente. Se tomó
  como referencia histórica el UUID completo repetido en sección 1 y promoción:
  `f01c1c37-2d3f-4bc7-8940-fe724eb71c9a`. No se forzó ningún estado.
- El snapshot PostgreSQL inicial falló al conectar: `ECONNREFUSED`, loopback 55463.
  No se llegó a ejecutar SQL. La comprobación TCP final devolvió el mismo rechazo.
  Current y estados vivos no pudieron observarse. No se arrancó infraestructura.
- `aaa031da...` permanece como HEAD histórico P4-B, distinto del HEAD de esta tarea.

## D. Cambios implementados

P4B1-01: detección general de petición explícita de fuente/origen/respaldo; tratamiento
contextual basado en la última consulta del estudiante y límites existentes, sin
usar respuestas anteriores como evidencia. La explicación deriva exclusivamente
de `supporting_claim_ids` y sus bases reales, no del conjunto recuperado/seleccionado.
Se mantienen respuestas breves cuando no se solicita procedencia. El generador
recibe la instrucción condicional y, en solicitudes explícitas, el alcance de las
bases de cada pasaje en lenguaje natural. La atribución final se calcula después
de validar el protocolo de fuentes efectivamente utilizadas.

Se distinguen documentación, confirmación de dominio, combinación conservadora,
inferencia y aspectos pendientes. Se rechazan labels, IDs conocidos, hashes, UUIDs
y rutas internas en el texto visible. No se agregaron campos de schema ni reglas
por IDs de claims o de evaluación.

P4B1-02: sustitución local de la excepción genérica por el único contrato autorizado.
P4B1-03: cierre privado autocontenido y reproducción del evaluador histórico.

## E. Procedencia explícita: antes/después

Antes, «¿La primera oportunidad es gratis? ¿De dónde sale esa regla?» podía responder
solo la gratuidad. Ahora conserva la regla y explica que procede de confirmación
de dominio incorporada a BanuChat, sin fuente documental independiente para atribuirla
como literal institucional. La consulta simple conserva únicamente la respuesta factual.
«¿Esa regla está en un documento?» vuelve a resolver la consulta antecedente del
estudiante y recupera evidencia fresca; no inventa un documento ni reutiliza como
soporte una respuesta del asistente.

Respaldo documental exclusivo indica documentación citada. Respaldo mixto aclara
que no se puede atribuir toda la afirmación a un documento único. Inferencias y
pendientes se distinguen en lenguaje natural. Los tests usan bases tipadas reales:
la primera oportunidad del fixture es confirmación de dominio. La regresión de
síntesis demuestra que una fuente recuperada pero no utilizada no cambia la atribución.

## F. Contrato de placeholders: antes/después

Antes, cualquier texto con `{` eludía la prueba literal. Ahora una unidad sin llaves
exige `content.includes(unit.text)`. La única excepción contiene exactamente una
aparición de `{validated_pillar}`, ninguna otra llave/placeholder, aspecto
`two_pending_named` y una unidad general `two_pending` del mismo claim, sin plantilla
y respaldada literalmente por su derivado. No hay motor genérico ni excepción por ID.

Diez escenarios permanentes: unidad normal ausente; placeholder arbitrario; aspecto
incorrecto; falta de regla general; regla general no respaldada; plantilla válida;
placeholder adicional; nombre parecido; repetición; llave sin cerrar. Solo el caso
válido se acepta. Los 107 claims originales no fueron editados para superar el guard.

## G. Reproducibilidad del evaluador

Snapshot: `data/ccd/local/p4b1-canonical-candidate-closure/audit-input-snapshot/`.
119 inputs: driver histórico `review_bank.py` sin modificar; módulos locales
`semantic_evaluator.py` y `fact_catalog.py`; catálogo anterior; banco 249; matriz
P4-A con 27 controles; migration map; adopción; 107 derivados depurados consumidos
por el driver; outputs sellados y verdicts canónicos de 276 y 11 casos. El cierre
se comprobó inspeccionando imports y lecturas reales, no solo una lista sugerida.
El bloque histórico `__main__` de fact_catalog no se ejecuta al importarlo.

Cada entrada de `evaluation-input-manifest.json` registra ruta relativa, rol, tamaño
y SHA-256. SHA del manifiesto de inputs: `43af04b683044cdd4e978ec16badf6736a19c79295d7a4667d46476fefc6a4f7`.

`reproduce_verdicts.py` usa solo la biblioteca estándar y el paquete. Primero verifica
integridad y correspondencia; ejecuta el driver congelado dentro de una copia temporal
con árbol relativo; compara objetos de verdicts completos, no solo totales. Fallan
inputs ausentes/alterados/adicionales, tamaños/SHA, duplicados, IDs inesperados/faltantes,
preguntas sin correspondencia, denominador cambiado y divergencia de verdict canónico.

Reproducción histórica exacta: **249/249 banco + 27/27 controles + 11/11 críticos**,
con denominadores separados. No son nuevos resultados runtime. Diez controles
negativos se rechazaron. El ZIP autocontenido se extrajo fuera del repositorio y se
ejecutó desde un cwd ajeno: misma reproducción exacta, sin PostgreSQL/Ollama/API.
ZIP SHA: `a33ab6d305a2f05d8b49e1bbfe26a81a4a99385ec963ad6603486b47cbc25ae6`.

No se sobrescribió ningún JSONL histórico. La reproducción conserva también las
limitaciones del evaluador acotado y sus revisiones del agente; no subsana por sí
misma la omisión semántica histórica de procedencia. P4B1-C01–C09 cubren el cierre
con **9/9 controles nuevos**, sobre metadata y derivados reales de 107 claims con
retrieval/embedding controlados. No son retrieval vectorial vivo ni evaluación de
una sucesora. Inferencia, pendientes, fugas y generador también tienen regresiones
permanentes. No se cambió silenciosamente el denominador histórico de 27.

## H. Candidata sucesora y procedencia de código

**BLOCKED — successor staging candidate not materialized**.

PostgreSQL no disponible; no se pudo verificar identidad/current antes de staging.
No se ejecutó `stageKnowledgeCandidate`, no hubo INSERT manual ni copia de embeddings.
Las dos capturas normales de `captureCcdCode` intentadas también fallaron con
`SOURCE_REJECTED: read`; no se sustituyeron por una procedencia ficticia. Se conserva
un inventario de hashes ordinarios del parche como evidencia estática, expresamente
sin presentarlo como una captura/staging correctos.

La candidata histórica `768cded3-0093-4c47-942d-0bead66612c2`, run
`a7b6310a-1538-4222-a70d-386a2a27bd57`, conserva su evidencia histórica staging.
No representa ejecución del parche P4-B.1. No se reescribió ni reetiquetó.
Release sucesora, run, pipeline SHA y manifiesto runtime nuevo: no materializados.

Adopción intacta: `4824a74e21029a1964d681958b8ca452b35c14de3a1d6c94cd3516c079abf81e`.
135 comprobaciones de bytes correctas: 107 derivados, 25 referencias fuente y tres
archivos de gobernanza. No se copiaron originales institucionales. La primera
preparación protegida falló; la segunda pasó con 107 documentos y el contrato endurecido.
El manifiesto preparado es idéntico al histórico. Los 107 claims permanecen iguales:
81 IDs anteriores y 26 incorporados en P4-B; cero claims/cambios de contenido P4-B.1,
cero documentos/chunks/embeddings nuevos persistidos.

## I. Pruebas realmente ejecutadas

| Comprobación | Resultado de esta tarea |
|---|---|
| API focalizado inicial / final | 12/12; luego 13/13 tras añadir la regresión de síntesis/fugas |
| API typecheck y typecheck:unified | PASS, también sobre el parche final |
| API suite completa inicial / final | 691/691; luego 692/692 sobre el parche final |
| RAG focalizado v2 | 3/3; incluye diez escenarios de plantilla y demás guards |
| RAG typecheck | PASS |
| RAG `npm test` inicial | 233/238; cinco fallos SOURCE_REJECTED conservados |
| RAG casos afectados focalizados seriales | 66/66 |
| RAG suite completa serial | 238/238 |
| Reproducción histórica offline | 249/249 + 27/27 + 11/11, objetos completos idénticos |
| Rechazos negativos del reproductor | 10/10 |
| ZIP reubicado, cwd externo | PASS, misma reproducción |
| Controles nuevos P4-B.1 con corpus real y retrieval controlado | 9/9 |
| Integridad de bundle | 135/135 hashes; adopción original intacta |
| Preparación normal endurecida | Segunda comprobación: 107/107 documentos |
| Integridad de inputs históricos/contratos inspeccionados | 124/124 sin alteraciones |
| `git diff --check` y scope final | PASS; cinco archivos versionables del cierre |

Comando serial RAG: `node --import tsx --test --test-concurrency=1 test/*.test.ts`.
No se ejecutaron lint inexistente, test:db, E2E de ingesta, banco vivo, HTTP current,
Mobile, MCP, N8N, Expo, Docker OE6 ni estudio humano. Ninguna prueba omitida figura PASS.

## J. Current/staging/bindings/grants antes y después

| Elemento | Referencia histórica | Observación viva P4-B.1 / acción |
|---|---|---|
| Current | `f01c1c37-2d3f-4bc7-8940-fe724eb71c9a`, ccd-1.3.0, ready | No observable antes/después: conexión rechazada; ninguna escritura |
| Candidata P4-B | `768cded3-0093-4c47-942d-0bead66612c2`, staging, 107/107/107/107 | Evidencia privada preservada; estado vivo no verificable |
| Sucesora P4-B.1 | No existente al inicio de esta tarea | No creada/resuelta |
| Publicaciones durante esta tarea | — | 0 llamadas |
| Bindings/grants/roles/ACL | No se derivó un conjunto vivo | 0 operaciones de cambio/preparación |
| Sesiones/auth/conversaciones | Sin comprobaciones HTTP | 0 operaciones de auth o limpieza |

Los ceros describen operaciones ejecutadas por esta tarea, no fingerprints SQL que
no pudieron obtenerse. No se presume una cantidad permanente de usuarios autorizados.
Una futura preparación de bindings debe ser otra tarea para el release exacto aprobado.

## K. Incidentes y resultados fallidos conservados

1. Conexión inicial PostgreSQL rechazada, registrada en `environment-blocked.json`;
   comprobación TCP final también rechazada. No se intentó restaurar current.
2. Cinco fallos SOURCE_REJECTED en la suite RAG inicial paralela; focalizados y suite
   serial posteriores correctos. **Causa no demostrada**; no se llama bug de paralelismo.
3. Primera preparación de bundle con SOURCE_REJECTED; segunda comprobación correcta.
   Hashes de bytes correctos no reemplazan ni relajan SafeReader.
4. Dos capturas normales de procedencia de código fallaron por SOURCE_REJECTED.
   Se conservaron logs; no se declaró una captura válida ni se retocó SafeReader.
5. El primer comprobador privado de preservación comparó bytes de Git y working tree
   sin aplicar eol de .gitattributes y falló. Se corrigió el harness para comparar blobs
   canónicos de archivos versionados; los 119 inputs privados se cotejan byte a byte.
   No se modificaron archivos históricos para superar esa comprobación. La observación
   inicial está registrada como tal, no como reconstrucción de un log inexistente.

## L. Archivos versionables modificados

Exclusivamente por P4-B.1, sobre baseline limpio:

- `backend/api/src/chat/ccd-knowledge.ts`
- `backend/api/test/ccd-knowledge-v2.test.ts`
- `backend/rag/src/ccd/knowledge.ts`
- `backend/rag/test/ccd-knowledge-v2.test.ts`
- `eval/rag-quality/results/ccd-canonical-candidate-p4b1-closure.md` (nuevo)

No se editó AGENTS, schema, SQL, REST/OpenAPI, MCP, Mobile, N8N, .gitignore ni informe
histórico P4-B. Se respetó LF en los TypeScript modificados. No hay cambios preexistentes
que atribuir a este cierre. HEAD/branch sin cambios; sin operaciones destructivas.

## M. Evidencia privada generada

Raíz ignorada: `data/ccd/local/p4b1-canonical-candidate-closure/`.
Incluye baseline y scope final, scripts privados, logs de éxito/fallo, estado de entorno,
integridad documental, manifiesto preparado, procedencia estática, controles nuevos,
outputs históricos congelados, cierre transitivo, manifiesto 119 inputs, reproductor,
ZIP y prueba reubicada, negativos, privacidad, run-manifest y files-manifest.
No hubo `git add -f` ni cambios en reglas de exclusión. Los 107 derivados son depurados;
ningún PDF original, vector, configuración privada, credencial o dato de auth se empaquetó.
Los logs nuevos sustituyen paths personales por alias manteniendo errores/resultados.
El escaneo final y los hashes del paquete documentan su alcance; no constituyen aval humano.

## N. Límites/riesgos pendientes

Falta un entorno PostgreSQL verificable y una captura normal de código correcta para
materializar la sucesora staging con el mismo contenido y nueva procedencia. Después
corresponde evaluar ese release exacto, con resultados nuevos para banco 249,
controles históricos 27, críticos 11 y controles P4-B.1 por separado. Ninguna métrica
histórica ni fixture de esta tarea sustituye esa ejecución.

La causa de SOURCE_REJECTED sigue abierta; no se debilitó el guard ni se hicieron
reintentos automáticos. Las limitaciones documentales/temporales P4-A permanecen;
no se inventaron oferta actual, tarifas futuras, opciones P1 ni equivalencias.
Revisión independiente, futura autorización por release y eventual promoción siguen
separadas. OE5/SUS no ejecutados. Validación técnica del agente exclusivamente.

`institutional_endorsement = false`

`independent_human_acceptance = false`

## O. Estado final exacto

**P4-B.1 BLOCKED — PostgreSQL habitual no disponible; candidata sucesora staging y evaluación viva no materializadas.**

Parche y cierre offline implementados y validados en los límites anteriores. No hubo
promoción, preparación de bindings ni ejecución OE5. La tarea se detiene en este informe.
