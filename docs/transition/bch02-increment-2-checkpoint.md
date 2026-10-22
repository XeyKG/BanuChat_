# CHECKPOINT BANUCHAT — BCH-02 incremento 2

Fecha local: 2026-10-21 (America/Bogota).
Base aceptada: `698f5d869fca2f60d59e7b877397b4c27bf8e2ce`.
Estado: estabilización de citas y advertencias CCD comprobada; detener para
revisión de Sala de Control. Sin commit ni push.

## Cambio acotado

Antes, cada respuesta generada citaba todo el top-5 y añadía advertencias de todos
esos documentos. La corrección de IA a Marca Personal seguía poniendo IA como
primera cita; una respuesta de syllabus arrastraba la advertencia de lineamientos
202660. No era una correspondencia comprobada entre respuesta y fuentes.

Ahora, antes de generar se limita la evidencia CCD mediante metadatos. El tema
explícito más reciente del usuario identifica un título de syllabus normalizado
(admite omitir el sufijo Digital/Digitales), pruebas o contacto. En un seguimiento
se recorren los antecedentes del usuario desde el más reciente; las respuestas
anteriores del modelo no deciden qué fuente seleccionar. Un curso coincidente
se conserva aunque venga al final del ranking vectorial. Contacto selecciona M12;
pruebas selecciona TEST_ORIENTATION. La consulta amplia de cursos mantiene su
enumeración de siete títulos documentales del incremento 1.

El generador CCD debe terminar su respuesta suficiente con una línea privada
`FUENTES: [1], [2]` usando solo los números del contexto que recibió. No hay otro
modelo ni otra llamada de generación. Un parser estricto exige una línea final,
al menos un número entero positivo, sin duplicados, dentro del rango recuperado
y filtrado. Rechaza fuentes ausentes, inventadas, formato incorrecto, referencias
numéricas en el cuerpo, múltiples líneas de control y texto posterior. Ante esos
fallos devuelve evidencia insuficiente, sin citas y sin exponer el protocolo.
No se reintenta la generación ni se cita todo el retrieval como fallback.

La línea se retira; únicamente sus fragmentos validados se pasan al constructor
existente `buildDocumentCitations`, que conserva índices contiguos desde cero,
UUID, hash, localizador y release. La persistencia y la forma REST no cambian.
La similitud vectorial sirve para recuperar candidatos, no para demostrar respaldo.
La pertenencia de una referencia al contexto tampoco demuestra por sí sola la
verdad de cada afirmación; el filtro de tema reduce el contexto ajeno y las pruebas
cotejan las respuestas concretas con la evidencia seleccionada.

Las advertencias usan exactamente las fuentes finales de las citas. Syllabus:
edición entregada, periodo y vigencia no confirmados, sin oferta actual. Pruebas
y lineamientos: periodo 202660 y población documental, sin vigencia ratificada.
Contacto: M12 obligatorio y advertencia determinista de 202660/vigencia actual no
ratificada. No se añade además la advertencia genérica de lineamientos por M12.
El contacto detectado en una respuesta sin M12 sigue produciendo abstención.
La comprobación ya no usa el texto completo de búsqueda para activar la advertencia
de contacto: una corrección hacia otro tema no hereda la palabra «correo» del pasado.

No se modificaron la ventana del historial, el router, el aislamiento por conversación
y release, el 409 de continuación histórica ni las aclaraciones sin antecedentes.
La demo sintética conserva su comportamiento anterior de generación/citas; este
ajuste de protocolo y selección es exclusivo de `ccd_local`.

## Regresión encontrada y corregida

Primera corrida real: `data/ccd/evidence/bch02-increment-2/http-1792628862932.json`.
Las citas y advertencias pertinentes pasaron, pero «¿Y qué pasa si no las apruebo?»
generó una afirmación incorrecta: «no se derivan consecuencias académicas ni se
afecta la elegibilidad», citando TEST_ORIENTATION. Esa fuente solo describe propósito,
duración y estructura; la falta de reglas no autoriza afirmar ausencia de efectos.
El fallo se detectó en el control de abstención; el reporte quedó `passed: false`.
La respuesta errónea persiste en su chat de prueba: no se borró ni se reescribió.

Se añadió una barrera pequeña y verificable: cuando TEST_ORIENTATION está en el
contexto, preguntas reconocidas sobre efectos de no aprobar, repetición/gratuidad,
homologación, exenciones, puntajes o elegibilidad se abstienen antes de generar.
Esto respeta el límite ya admitido del corpus; no introduce una regla académica
nueva. El prompt también distingue «no documentado» de «sin consecuencias» y pide
expresar los límites sin códigos internos de auditoría. Una prueba fuerza un
generador que afirmaría ausencia de consecuencias y comprueba que ni se invoque.

La corrida siguiente `http-1792628955868.json` aprobó los casos completos. En la
revisión se detectó además que el detector anterior de contacto podía contaminar
una corrección hacia un curso por la palabra «correo» en el embedding contextual.
Se corrigió y se incorporó un turno real contacto → corrección hacia IA. La corrida
final descrita abajo verifica el código definitivo. Una prueba unitaria inicial
también detectó un patrón incorrecto al quitar el sufijo Digital; se corrigió
antes del primer E2E.

## Resultado operacional final

Comando desde `backend/api` con configuración local CCD existente:

```powershell
node --env-file=../../infra/.env.ccd --import tsx ../../eval/integration/ccd-conversation-http.mts
```

Evidencia final privada, ignorada por Git:
`data/ccd/evidence/bch02-increment-2/http-1792629010829.json`.
**55/55 controles aprobados; dieciséis POST HTTP 201; 16 citas persistidas.**
El listener es HTTP real en loopback y puerto efímero, con API/router/servicios
TypeScript reales y PostgreSQL/Ollama reales. No es RAG directo ni un mock SQL.
El runner verifica Docker/base/volumen CCD antes de escribir; no arranca `dist/main.js`,
aunque el build se validó por separado. Se mantuvo `banuchat_ccd_dev`, puerto
PostgreSQL 55433, proyecto `banuchat-ccd-dev`, servicio `postgres-ccd`, volumen
`banuchat-ccd-dev_ccd_pgvector_data`. No se abrió LAN ni se configuró multiusuario.

Conversaciones nuevas de la corrida final:

- A: `f57fff05-2b3f-4d96-9dc8-dcb906b8ceea`.
- B: `f4f9b55b-21f9-4061-b05d-0330459737d1`.
- C: `3d30238c-d0be-413b-a023-33f112d34a18`.

| Conversación / caso | Contenido y citas realmente persistidos |
| --- | --- |
| A: cursos → IA Generativa → temas | Lista los siete syllabus; las dos respuestas sobre IA citan solo `unit:M02:DOC-101`. Describen modelos de lenguaje/difusión, evaluación de herramientas y prompts. Advertencia de syllabus, sin 202660/contacto/lineamientos. |
| B: referencia ambigua sin antecedentes mientras A tiene un tema | Pide aclaración, sin citas, embedding ni generación. No hereda memoria por compartir `ccd-local-demo`. |
| A: propósito, duración, estructura y límites de pruebas de 202660 | Responde los cuatro aspectos: diagnóstico para orientar la ruta, unas dos horas, tres instrumentos y límites de aplicabilidad. Solo `unit:TEST_ORIENTATION`, con advertencia 202660 y sin advertencia de syllabus. |
| A: «¿Cuánto duran?» | «La prueba diagnóstica dura aproximadamente dos horas». Misma fuente pertinente y advertencia 202660. |
| A: no aprobar / repetir gratuitamente | Dos abstenciones sin citas; no autoriza reglas ni afirma ausencia de efectos. No se invoca el generador para esos dos casos. |
| A: cambio explícito a contacto | Solo `unit:M12`. El modelo devuelve el correo y la aplicación añade la advertencia de 202660/vigencia no ratificada. Sin advertencias de syllabus ni duplicación de advertencia genérica por M12. |
| A: corrección desde contacto hacia IA | Responde temas de IA, solo DOC-101, sin arrastrar 202660/contacto del historial. |
| C: IA → corrección a Marca Personal → temas | IA usa DOC-101; las dos respuestas posteriores solo `unit:M02:DOC-103`. Identidad profesional, productividad, organización, comunicación y networking; sin cita de IA ni advertencia 202660. |
| B: premisa inventada de homologación con 70 → seguimiento de exención | Dos abstenciones sin citas. |
| B: UID, notas y periodo de ingreso | Abstención; el contexto técnico no aporta identidad. |
| Chat de release antigua | GET 200 idéntico antes/después; POST 409, sin añadir mensajes. |

Ejemplos antes/después con evidencia real del incremento 1 y de esta corrida:

| Respuesta | Antes: fuentes citadas en BCH-02/1 | Ahora: fuentes citadas en BCH-02/2 |
| --- | --- | --- |
| Temas de IA | M01, DOC-101, DOC-102, DOC-099, DOC-104 | Solo DOC-101. |
| Corrección a Marca Personal | DOC-101, DOC-103, DOC-104, DOC-102, DOC-099 | Solo DOC-103. |
| Duración de pruebas | TEST_ORIENTATION, DOC-098, M01, DOC-099, DOC-100 | Solo TEST_ORIENTATION. |
| Contacto | M12, DOC-102, M01, DOC-100, DOC-104 | Solo M12. |

El baseline anterior es
`data/ccd/evidence/bch02-increment-1/http-1792628265549.json`, conservado.
No se comparan cantidades globales de citas como métrica de calidad: son
conversaciones con distinto número de turnos. La comprobación relevante es por mensaje.

Las citas de cada POST se compararon con GET de historial y directamente con
`message_citations` por `message_id`, índice y localizador. Las 16 citas conservan
SHA/localizador/release coincidentes con versión/chunk; los artefactos HTTP coinciden
byte a byte con sus hashes. Los snapshots antes/después mantienen corpus, vectores,
releases y todo el historial preexistente, incluidas las pruebas fallidas de este
incremento. Huella histórica idéntica antes/después de la corrida final:
`848fa34204ca4b12dd21b9774469bdb143f9a9d5b523e32a276077fa51e3e6db`.
La release vigente sigue siendo `fb8538af-3280-4a1b-889c-a27564381996`, diez unidades;
la anterior `5834fc47-57c5-498b-98fc-4190330155e4`, dos unidades, ambas `ready`.
Las huellas de los archivos ejecutados se tomaron al inicio y se cotejaron al final.
Las tres corridas crearon nueve chats de prueba; todos se conservan.

## Naturalidad, validación y rendimiento

Se conserva la instrucción de un máximo de 80 palabras en la generación. El caso
real que pide propósito, duración, estructura y límites incluyó todos esos aspectos
sin truncarse y con `done_reason: stop`. No se encontró necesidad de aumentar el
límite ni de alterar la receta de 256 tokens. Las respuestas siguen generándose:
la orientación no se sustituyó por un FAQ, salvo el listado por títulos ya existente.
La aclaración y la abstención conservan sus mensajes deterministas anteriores.
El protocolo de fuentes se elimina y no aparece en UI, REST o historial.

Pruebas finales realmente ejecutadas en `backend/api`:

- `npm run typecheck`: aprobado.
- `npm run build`: aprobado.
- `npm test`: **500 aprobadas, cero fallidas/omitidas**.
- Compilación TypeScript estricta del runner con `tsc --noEmit`: aprobada.
- E2E HTTP/PostgreSQL/Ollama: **55 controles aprobados**, incluido SQL persistido.
- `git diff --check`, revisión de archivos nuevos y de alcance: aprobadas.

La corrida final fue el 2026-10-21, 19:29:44–19:30:10 America/Bogota. Los diez
turnos que invocaron generación tardaron 0,72–4,13 s por HTTP (media 2,49 s);
la aclaración ambigua tardó 11 ms. El contexto de las respuestas suficientes
con una fuente tuvo 1.083–1.486 tokens en esta corrida. El caso insuficiente de
datos personales conservó candidatos más amplios y tuvo 3.031 tokens. No es un
benchmark controlado ni acredita mejora de SLA: modelos/cachés y consultas difieren
del baseline. No hubo llamada LLM adicional ni nueva dependencia.

No se ejecutaron pruebas de ingesta, Mobile, LAN ni despliegue institucional.
Docker solo se consultó para comprobar el entorno local existente; no se alteraron
servicios o volúmenes. No se modificaron fuentes externas ni corpus CCD/sintético,
releases, migraciones SQL, contratos REST/MCP, Mobile o autenticación.

## Archivos modificados y límites restantes

- `backend/api/src/chat/document-evidence.ts` (nuevo): selección CCD y validación privada de referencias.
- `backend/api/src/chat/document-rag.ts`: aplica selección, rechazo de reglas excluidas, citas y advertencias pertinentes.
- `backend/api/test/document-evidence.test.ts` (nuevo): metadatos, corrección, límites y protocolo inválido.
- `backend/api/test/document-rag.test.ts`: integración del protocolo, fuentes, advertencias y regresiones.
- `eval/integration/ccd-conversation-http.mts`: amplía el runner existente con contenido, citas exactas y SQL persistido.
- `backend/api/README.md`, `eval/integration/README.md` y este checkpoint.

La selección de tema y el guard de reglas son léxicos y delimitados al corpus
admitido, no una solución universal de desambiguación. Alias no reconocidos,
negaciones o preguntas que mezclen temas pueden requerir una aclaración o una
mejora posterior. En preguntas sin tema reconocido, el generador elige referencias
entre los candidatos: se valida su identidad y formato, no entailment semántico
automático. Pueden quedar citas poco pertinentes en esos casos no cubiertos.
Las pruebas muestran la corrección en los cursos, pruebas y contacto solicitados;
no demuestran que toda respuesta futura esté libre de alucinaciones.

Un modelo que incumpla el formato de fuentes ahora produce una abstención segura,
lo que puede reducir cobertura. No se implementó retry. Algunas respuestas aún
repiten un límite pertinente en su cuerpo y en el pie determinista; se conserva
la advertencia para no eliminar garantías por brevedad. Las citas históricas
secundarias no se reescribieron. No se amplía este incremento a refactorización
general del RAG, Agent/ReAct, MCP, agentes adicionales ni experiencia móvil.

Incremento concluido. Detener para revisión de Sala de Control.
