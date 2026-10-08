# ADR 0005 — Ingesta reproducible y orquestación N8N

Fecha: 2026-09-26. Estado: aceptado e implementado para el recorrido manual del MVP;
retry/recover/scheduled N8N permanecen fuera de la validación N3.

La opción 3 fue implementada y validada localmente para el recorrido manual N8N E2E;
véase [evidencia N3](../../eval/ingestion/results/n3-n8n-e2e-2026-10-02.md). Esta
validación no demuestra métricas generales de ingesta, recuperación o rendimiento.

Nota posterior de evaluación: retrieval K2, generación y latencia L1/L1-B tienen
evidencias independientes [indexadas en eval](../../eval/README.md). Las frases de
este ADR sobre mediciones pendientes corresponden a su contexto/alcance de ingesta;
N3 no acredita esas métricas ni el cumplimiento integral de objetivos académicos.

## Contexto y autoridad

El camino conversacional aprobado no cambia. Este ADR define exclusivamente la
ingesta asíncrona de revisiones sintéticas aprobadas y completas. Prevalece el
[SQL vigente](../../infra/db/001_initial_schema.sql), ya validado según su README,
sobre referencias históricas del modelo lógico. Se mantienen los
[ADR 0002](0002-publicaciones-sinteticas-inmutables.md) y
[0003](0003-embedding-local-qwen3.md). Al aceptar originalmente este ADR todavía no
había una ingesta operacional N8N ejecutada del dataset v1; esa situación cambió con
N3, cuyo recorrido manual local se registra en [su evidencia](../../eval/ingestion/results/n3-n8n-e2e-2026-10-02.md).

El alcance de aproximadamente 16 semanas favorece un único componente pequeño,
testeable y sin motor de tareas, broker ni base adicional. N8N no puede convertirse
en autor del corpus ni en dueño de reglas que solo existan en su UI.

## Alternativas

| Criterio | 1. Nodos N8N/PostgreSQL/Code | 2. Execute Command en contenedor N8N | 3. Componente TypeScript interno bajo backend/rag |
| --- | --- | --- | --- |
| Simplicidad inicial | Pocos componentes, pero muchas expresiones y nodos | Llamada corta, imagen y entorno acoplados | Adaptador HTTP mínimo adicional; lógica cohesionada |
| Reproducibilidad | Exportar JSON no fija por sí solo librerías y lógica dispersa | Requiere fijar binarios, imagen y comandos | Código, receta y dependencias fijadas al implementar |
| Testabilidad | Difícil aislar parser, retry y transacciones | Núcleo testeable si se extrae; shell añade otra frontera | Pruebas unitarias del núcleo e integración de adaptadores |
| Seguridad | Credenciales SQL y errores circulan entre nodos | Riesgo de interpolación de shell, permisos y ejecución arbitraria | Entrada cerrada, sin comandos/rutas libres ni SQL del caller |
| Fuente sintética | Montaje/lectura y reglas repartidas en N8N | Checkout y herramientas Git dentro de N8N | Checkout aprobado de solo lectura visible al componente |
| Ollama | Bucles, validación vectorial y errores en nodos | Cliente del script ligado al contenedor N8N | Adaptador local y configuración efectiva centralizados |
| PostgreSQL | Transacciones entre nodos difíciles de gobernar | Núcleo puede hacerlo, pero no el shell | Un dueño de locking, transacciones y publicación |
| Fallos/retry | Riesgo de retry por nodo que omita evidencia del intento | Exit code insuficiente ante resultado incierto | Identidad de release, intentos e items ya existentes en SQL |
| Mantenimiento en 16 semanas | Aumenta con reglas y excepciones | Menos interfaz, más acoplamiento operativo | Coste acotado; sin plataforma genérica de jobs |
| Versionado fuera de UI | Exige disciplina en cada nodo Code | Script versionado, configuración de comando también | Núcleo versionado; workflow exportado solo orquesta |

## Decisión aceptada

Elegir **opción 3**: N8N maneja triggers manual/retry, llamada interna, condiciones
simples, correlación y resumen. TypeScript bajo `backend/rag` posee preflight,
relaciones, extracción, chunking, embeddings, DML parametrizado, reintentos y
publicación. PostgreSQL conserva sus constraints, triggers y funciones actuales.

La invocación manual validada usa HTTP JSON privado: `/status` por identidad aprobada
y una llamada `/execute`, descritas en la [especificación](../ingesta-reproducible.md)
y la [evidencia N3](../../eval/ingestion/results/n3-n8n-e2e-2026-10-02.md). No pertenecen a `/api/v1`, MCP ni mobile;
no hay webhook público, Execute Command, shell ni acceso SQL directo desde N8N.
La ejecución HTTP espera el resultado, pero el trabajo sigue siendo asíncrono
respecto a las consultas móviles. Un timeout no equivale a fallo confirmado.

Solo un intento activo del dataset por componente y bloqueo PostgreSQL de sesión
cooperativo. No se mantienen transacciones abiertas durante llamadas a Ollama.
La persistencia de seguimiento se limita a `ingestion_runs`/`ingestion_items`;
no se añade cola durable, tabla de jobs ni una garantía ficticia de exactly-once.

## Revisiones y raíces operativas distintas

`source_git_revision` identifica el commit exacto de la fuente sintética aprobada;
se persiste en la columna existente `dataset_releases.git_revision`. Para v1 es
`af7ac711e1da3426e1f5fbe8b2892cec1344ce8b`, no una constante universal.
`implementation_revision` identifica el código/build real que ejecuta validación,
extracción, chunking, integración Ollama y persistencia/publicación; vive dentro de
`pipeline_config` y puede ser posterior y diferente de la revisión fuente.

El runtime tiene su propia raíz/revisión. Lee una raíz fuente separada, preparada
por el operador como Git worktree o checkout equivalente de solo lectura. El
servidor configura ambas raíces; ninguna petición HTTP admite paths. El campo de
control `git_revision` designa exclusivamente `source_git_revision`, nunca HEAD
del runtime. Preflight comprueba HEAD, limpieza y bytes en el checkout **fuente**;
por separado verifica código/build y receta efectivos del runtime.

`approval_ref` vincula source_git_revision, dataset_key, hash bruto del manifest y
evidencia humana, no automáticamente implementation_revision. La autorización de
receta/runtime se controla aparte: cambiar solo implementación/pipeline puede
crear otra release por pipeline_sha256 sin otra aprobación de contenido. Cambiar
la fuente requiere nueva aprobación. N0 preparó y validó localmente el source
worktree; N3 validó el recorrido manual. N8N no ejecuta checkout, pull, fetch ni
comandos de red Git.

## Consecuencias y límites

- El equipo prepara localmente una revisión aprobada; ni Git pull ni credenciales
  GitHub en N8N. El componente verifica Git y bytes, nunca modifica la fuente.
- N3 validó N8N local → adaptador HTTP privado en el entorno Windows + Docker Desktop.
  Para futuros despliegues quedan por decidir topología/bind, montaje del checkout
  fuente de solo lectura y permisos mínimos. El Compose actual no fija topología
  portable ni Linux.
- Se conserva la distinción entre fuente aprobada y release SQL publicada.
  `ready` histórica no se reactiva desde una ingesta normal aunque SQL permita
  su activación administrativa mediante `publish_release`.
- La receta y la configuración Ollama son inmutables por release. La primera
  implementación debe verificar digest/runtime reales, nunca seeds inventados.
- Una representación originada en un intento fallido puede no ser publicable:
  el SQL exige procedencia documental/vectorial desde intentos exitosos. El
  diseño especifica reprocesamiento honesto, no cambio artificial de timestamps.
- La duración, calidad de recuperación y capacidad del hardware siguen sin medir.
  Las pruebas propuestas están en [el plan](../../eval/ingestion/plan.md).

La opción 3 queda implementada y validada para el recorrido manual local observado.
Esta actualización no aprueba infraestructura externa; retry/recover/scheduled y
despliegues futuros permanecen fuera de N3.
