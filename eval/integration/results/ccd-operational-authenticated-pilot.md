# BanuChat — piloto multidominio mediante REST autenticado aislado

Fecha: 2026-10-26. HEAD inicial/final: `f1ed7b58638714020f7e4e68c36d8377b9aeffd8`. El adjunto partía de un commit anterior; se conservó el estado posterior de 87 claims y sus decisiones de dominio ya confirmadas.

## Alcance y dominio reconciliado

La corrección obligatoria se aplicó **antes de HTTP**. Se revisaron los 87 claims y se sustituyó la antigua cautela de vigencia en cinco unidades de guías, no solo en MD-033. MD-032–035 y OP-015 se adoptan como procedimientos actuales dentro de BanuChat, preservando fuente, SHA, localizador y procedencia. El registro `SUPERSEDED_DOMAIN_DECISION` conserva qué decisión anterior y qué rúbrica quedaron reemplazadas. La comprobación de periodo y nivel se responde directamente, sin añadir que la interfaz no está verificada.

Se mantienen la recuperación de contraseña únicamente cuando se olvidó, la ambigüedad real del paso de menú, los periodos históricos y tarifarios, y la falta de programación dinámica de grupos, docentes, horarios o cupos. La confirmación de vigencia del contenido no publica ni avala institucionalmente el sistema. Los originales y los artefactos históricos no se reescribieron.

OP-011 diferencia atribuciones por afirmación. La sustitución del esquema de cursos y los tres instrumentos actuales tienen respaldo documental directo. Los nombres de las pruebas antiguas y ciertas condiciones operativas conservan confirmación del responsable: la fuente de transición consultada nombra cursos, lo que no permite atribuirle una lista de pruebas que no documenta. Se conserva la distinción entre documento, corroboración e inferencia. Ninguna aclaración pendiente se convirtió en regla. La confirmación posterior de primera oportunidad gratuita continúa vigente y reemplaza el antiguo supuesto de precio desconocido del adjunto.

## Arquitectura y aislamiento probados

Cliente HTTP compatible con v2 → handlers REST reales → núcleo real de autenticación BanuChat → conversación con owner → clasificación del router y selección de aspectos documental → RAG del piloto → PostgreSQL/pgvector aislado y Ollama → persistencia atómica de respuesta/citas → historial y descarga autenticada.

Se reutilizan los schemas y endpoints v2 existentes. La composición experimental fija candidata, release y SHA desde configuración privada; no admite selectores HTTP. Los servicios habituales requieren una publicación current: el adaptador experimental conserva un ámbito fijo sin ese puntero y un historial separado. No se simula la autenticación: se usan Argon2id, tokens, sesiones, cuotas y verificación de revocación del núcleo existente. Son cuentas permanentemente sintéticas, sin autenticación institucional.

La instancia temporal escucha solo en loopback 3307 y usa exclusivamente la base del piloto en loopback 55473. El arranque exige base, roles, marker `NO_PUBLICATION`, ausencia de current/publicador, release esperada, manifest SHA y permisos restringidos. Un desajuste aborta. Se conservan lector de RAG y runtime HTTP separados. No se montan v1, Mobile, MCP ni N8N en este camino. No se modificaron los arranques habituales.

El primer preflight rechazó privilegios heredados de PUBLIC. Se restringieron TEMP y CONNECT a otras bases **solo en el contenedor aislado**, manteniendo la exigencia del guard. El runtime no puede escribir corpus ni publicar. Una función de lectura/bloqueo permite revalidar el ámbito bajo los locks de cuenta/sesión, sin conceder UPDATE sobre corpus al runtime.

## Citas, presentación y trazabilidad

Se generaron 87 derivados depurados y una candidata de metadatos posterior, conservando ambas. Las descargas contienen únicamente esos derivados: no originales completos, datos personales, credenciales, rutas locales ni gobernanza. Se reutiliza el lector de artefactos existente con contención real de rutas y comprobación de SHA. El endpoint existente conserva su forma y exige autenticación.

Las **87 descargas** dieron 200 y coincidieron con el SHA de su revisión exacta; sin token dieron 401. Un UUID ausente y una versión fuera de la candidata fijada dieron 404. Las citas de chat e historial apuntan a las revisiones verificadas. La respuesta visible usa títulos y secciones naturales; los IDs y localizadores internos, source hashes y bases de procedencia permanecen en los registros privados. Se comprobaron los payloads completos del asistente, no solo el cuerpo textual.

## Resultados técnicos realmente ejecutados

| Conjunto | Directo | HTTP autenticado |
| --- | ---: | ---: |
| Funcionales, con cambio de dominio explícito en la guía | 50/50 | 50/50 |
| Primarias | 72/72 | 72/72 |
| Robustez, subconjunto de primarias | 35/35 | 35/35 |
| Negativas | 24/24 | 24/24 |
| P0 | 10/10 | 10/10 |
| Aceptación técnica anterior, reconciliada con decisiones posteriores | 12/12 | 12/12 |
| Presentación conversacional | 28/28 | 28/28 |
| Guías actuales | 5/5 | 5/5 |
| Nueve secuencias anteriores | 9/9 | 9/9 |
| Tres secuencias nuevas anteriores | 3/3 | 3/3 |
| Secuencia progresiva | 1/1 | 1/1 |
| Cuatro secuencias HTTP adicionales | 4/4 | 4/4 |

Son **249 casos/turnos únicos por modo**, 498 respuestas finales y 48 turnos secuenciales incluidos en esos denominadores. Las 35 robustas no se suman otra vez. Los casos explícitos cubren transición → antecedentes → tarifas; curso → horas/contenidos; prueba → resultado hipotético → curso; y cambio de tema académico. Los seeds y comprobaciones de seguridad se registran aparte.

La forma REST, el historial y las citas son válidos en los 249 casos HTTP. Las dos respuestas de cada par se revisaron contra pregunta, hechos completos, fuentes efectivamente usadas y condiciones; no se heredan PASS por no abstenerse o por tener citas. La nueva rúbrica retira la cautela de interfaz y además impide que ese criterio antiguo siga acreditando una guía actual. Las síntesis libres requieren revisión técnica ligada al cuerpo completo, historial y fuentes.

Se observaron **15 pares con redacción distinta** y **2 con diferente selección de soporte**. No se detectó diferencia funcional bajo los criterios del banco: ambas variantes satisfacen el aspecto solicitado y sus condiciones. No se exige igualdad artificial de IDs. La equivalencia y los pares completos quedan documentados; no se afirma equivalencia universal ni exactitud fuera de esta muestra.

La revisión conversacional separa guardas de pertinencia de corrección semántica. No se detectaron incidencias en esas guardas finales. La muestra privada reúne 20 respuestas HTTP con conversación visible y auditoría separadas. La revisión técnica del agente está completada; **la revisión humana independiente de aceptación sigue pendiente**. La confirmación humana del dominio no se presenta como aprobación humana de todas las respuestas. No es un holdout ciego.

## Seguridad, fallos y pruebas

Se verificaron 401 sin token, aislamiento por propietario mediante 404 en lectura/envío/borrado ajenos, 403 en progreso personal, rechazo de selectores adicionales y ausencia de v1. Refresh invalida el access anterior. Logout durante generación impide confirmar todo el turno: 401 y cero mensajes persistidos. Esa prueba se ejecutó con el mismo código de autenticación/recursos del cierre; no se repitió tras el último ajuste exclusivo del selector, y su reutilización queda ligada a hashes idénticos. Una escritura de corpus por el runtime se rechazó con 42501. Las conversaciones temporales se eliminaron mediante DELETE autenticado normal; quedaron cero conversaciones y mensajes del piloto. El listener temporal se cerró al terminar.

Los fallos de desarrollo se conservan: dependencia de retrieval ausente en el runner, omisiones de aspectos, comparación de JSON sensible al orden de propiedades, dos fallos semánticos en la primera corrida completa y exposición inicial de localizadores internos en citas. Se corrigieron reglas generales y se repitió el banco con el código final. Un arranque recibió 429 por la cuota real de login; no se borraron contadores ni se relajaron límites. Se inició otra corrida después de expirar la ventana. No se reintentaron mensajes de chat inciertos.

El typecheck detectó inicialmente una API de arrays ajena a la biblioteca configurada; se reemplazó por un recorrido compatible, sin migrar versiones, y se añadió una prueba del límite de contexto. API: typecheck y **669/669 pruebas**. Evaluador privado de sustitución de dominio: **4/4**, incluyendo rechazo de la antigua cautela aunque llevara PASS y rechazo de SHA adulterado. RAG/SafeReader no se modificaron; no se repitió su suite ya acreditada sin un cambio de código que la afectara. La preparación, embeddings, retrieval y generación de esta integración sí se ejecutaron contra dependencias reales. `git diff --check` y cotejo de alcance forman parte del cierre.

## Preservación y límites

Las instantáneas de las 43 tablas habituales, configuración y estado documental coinciden antes/después. Los vectores, número de embeddings e historial de releases habituales se incluyen en ese cotejo. **3004 no estaba escuchando al inicio y siguió sin arrancarse**: se acredita preservación de esa ausencia, no disponibilidad de una API habitual en ejecución. Los contenedores y almacenamiento habituales conservaron su identidad.

Los 124 originales externos y los artefactos privados de las iteraciones anteriores coinciden con sus hashes. Se conservaron las candidatas previas. Hay 87 claims/chunks; no se amplió el volumen documental. Se generaron 87 embeddings documentales exclusivamente para los nuevos bytes depurados del piloto; la revisión de metadatos reutilizó los 87. No se regeneraron embeddings habituales ni se cambió su configuración. No hubo operaciones destructivas sobre Docker o PostgreSQL.

## Archivos modificados

| Archivo versionable |
| --- |
| `backend/api/src/auth/auth-service.ts` |
| `backend/api/src/auth/isolated-pilot-lock.sql` |
| `backend/api/src/auth/isolated-pilot-resources.ts` |
| `backend/api/src/auth/isolated-pilot-scope.ts` |
| `backend/api/src/chat/ccd-operational-pilot.ts` |
| `backend/api/src/http/api-v2-server.ts` |
| `backend/api/test/ccd-operational-pilot.test.ts` |
| `backend/api/test/isolated-pilot-auth.test.ts` |
| `eval/integration/results/ccd-operational-authenticated-pilot.md` |

## ESTADO DE ENTREGA BANUCHAT

- HEAD inicial/final: `f1ed7b58638714020f7e4e68c36d8377b9aeffd8`. Sin commit, push, publicación current ni integración con el producto habitual.
- Versionables: núcleo de autenticación con ámbito experimental explícito; recursos/preflight/lock del piloto; tipo de composición v2; selector experimental y pruebas pertinentes; este informe. Nueve archivos.
- Privados ignorados: `data/ccd/local/p0-authenticated-operational-integration/`. Incluye decisiones sustituidas, procedencia de 87 claims, manifiestos, preflight, HTTP/directo/retrieval, equivalencias, descargas, presentación, regresión, fallos, integridad y run-manifest.
- Mobile, N8N, MCP, contrato REST público, corpus sintético, originales y entorno habitual preservados. La instancia HTTP temporal está detenida; el contenedor aislado y sus candidatas se conservan.
- Cierre técnico del banco completado. Aceptación humana independiente y cualquier incorporación posterior al producto/Mobile pendientes. No se declara listo para producción ni avalado institucionalmente.
