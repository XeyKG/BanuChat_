# BanuChat — candidata CCD en arquitectura habitual

Fecha: 2026-10-26. Base de trabajo: `d75882880df969fcf1a2c88e9ab441a0e443f70e`.
Validación técnica del agente; aceptación humana independiente pendiente. No se declara producción lista.

## Resultado y límite de publicación

Se incorporaron los 87 claims aprobados mediante preparación e ingesta normales, con 87 derivados, 87 chunks y **87 embeddings nuevos realmente generados por Ollama**. La candidata `f01c1c37-2d3f-4bc7-8940-fe724eb71c9a` permanece **staging** en `banuchat_unified`. Su ejecución de ingesta terminó `succeeded`; se ejecutó `assert_release_complete` sin publicar.

El `current` habitual sigue siendo `3d6cedac-0e86-40c8-909b-d3ff6e8ab741`. Su publicación no se cambió durante las pruebas. El GET autenticado de un artefacto de la candidata staging devuelve 404 en la API habitual.

La API habitual quedó encendida en loopback 3004 mediante `npm start`, con el código actualizado y el current anterior. No se hizo commit ni push. Mobile, MCP, N8N y sus contratos no se modificaron. Tampoco se modificaron SQL 001–012, los documentos originales ni el dataset sintético congelado.

## Baseline anterior a la incorporación

El repositorio estaba limpio. Se arrancó la API con su mecanismo habitual, sin modificar datos para conseguir el arranque y **sin `isolated_pilot`**. Pasaron autenticación, sesión y seis capacidades, creación de conversación, chat documental, citas, historial idéntico al mensaje devuelto, descarga con SHA correcto, refresh, logout y rechazo de lectura/envío/borrado entre propietarios. Se eliminaron las conversaciones creadas por la comprobación.

Antes de incorporar la candidata pasaron typecheck API, typecheck unified y 669/669 pruebas existentes de API. Los snapshots registran configuración, tablas, releases, versiones, chunks/embeddings, roles/permisos y estado de la API. La API estaba apagada al iniciar el trabajo.

Después del cambio se reinició con `npm start` y se repitió satisfactoriamente el baseline sobre el current anterior. El snapshot final demuestra releases previas, versiones y configuración de embeddings intactas; las 27 tablas previas de corpus/contexto conservan sus fingerprints al excluir las filas añadidas por la candidata. Las escrituras de autenticación de las pruebas se distinguen de los datos del corpus. Los 124 archivos del inventario original conservan su SHA.

## Arquitectura y decisiones de promoción

Se conserva el runtime habitual: `createAuthenticatedRuntimeServer`, `AuthService`, `AuthenticatedResources`, propietario de conversación, historial SQL habitual, publicación/current normal y composición existente de servicios. No se crea un segundo historial operativo ni un selector HTTP de release.

| Componente experimental | Decisión y destino |
|---|---|
| Conocimiento de 87 claims | **PROMOTE**: referencias adoptadas con procedencia, unidades, periodos, condiciones y excepciones. |
| Política conversacional `ccd-operational-pilot.ts` | **ADAPT**: política CCD en `ccd-knowledge.ts`, independiente del almacenamiento experimental; el archivo anterior queda como adaptador histórico. |
| Retrieval acotado por metadatos | **ADAPT**: RPC autenticada del modelo normal, current obligatorio, filtro de claves revisadas y ranking coseno exacto. |
| `isolated-pilot-scope.ts`, resources, roles y schemas | **DISCARD** del producto: conservados únicamente para reproducir el experimento anterior. |
| `isolated-pilot-lock.sql` / `lock_pilot_scope` | **DISCARD** del producto: no está instalada ni se invoca en la arquitectura normal. |
| Opción `isolated_pilot` | **DISCARD** de la composición habitual; importación diferida únicamente cuando se solicita explícitamente el replay histórico. |
| `withAuthorizedAccess()` | **ADAPT**: primitiva interna con las mismas comprobaciones y bloqueos de cuenta/sesión; no sustituye la autorización de propietario del producto. |
| Proyección v2 de citas | **ADAPT**: conserva localizador canónico y URL v1 en persistencia; proyecta sección legible y URL v2 en envío e historial. No se debilita la invariancia SQL de las citas. |
| Preparación, BD `banuchat_p0_operational`, marker `NO_PUBLICATION` | **DISCARD** del producto: no se copian sus tablas ni sus vectores. |
| Perfil `ccd-local-demo` | **ADAPT**: contexto técnico habitual existente, sin identidad institucional. |
| N8N y MCP | Se conservan su composición y mecanismos habituales, sin cambios de código/configuración. |

`component-decisions.json` amplía estas decisiones. No se generalizó la política CCD como una supuesta política universal de RAG.

## Ingesta y procedencia

Se añadió el contrato CCD `1.3.0`, el schema de adopción y la migración adicional `013_ccd_knowledge_candidate.sql`. `prepareKnowledgeCorpus` verifica aprobación explícita por SHA, fuentes documentales y bytes de los 87 derivados. `stageKnowledgeCandidate` utiliza WriterLease, runs/items, documentos, embeddings y validación de finalización habituales. `finalizeCandidate` completa y valida la candidata sin ejecutar `publish_release`; la finalización/publicación anterior conserva su comportamiento.

Los derivados depurados mantienen exactamente el SHA de los artefactos revisados, con nuevas rutas normales `documents/artifacts/ccd-knowledge-*.md`. Se preservan las 22 fuentes documentales referenciadas, localizadores, registros de procedencia y hashes de revisión. Las bases `DOCUMENT_SOURCE`, `DOMAIN_CONFIRMATION`, `INFERENCE` y `PENDING_CLARIFICATION` siguen diferenciadas. La inferencia aritmética conserva operación/alcance; no recibe una fuente documental o SHA inventados. Ningún claim adoptado tiene solo una base pendiente.

MD-032–035 y OP-015 conservan su vigencia confirmada y el antecedente **`SUPERSEDED_DOMAIN_DECISION`**. No se alteró la evidencia histórica para ocultar la decisión anterior. La respuesta de comprobación de periodo/nivel es directa y no reintroduce la cautela de interfaz. Los grupos, docentes, horarios, cupos y decisiones individuales no se convierten en información permanente.

Manifiesto SQL de candidata: `9bde9ff3c1bd9cd29906751de86d7ed31bece30077b9639042b79d221104da4e`. Pipeline: `2cee3bf6646f7ad6a4e3da4c4f493f5f0d1876267fb492f068b5ce87ec37063d`. La procedencia de ingesta registra los archivos ejecutados en ese momento; los hashes del código final de evaluación se registran aparte, sin reescribir esa procedencia histórica.

## Validación temporal mediante copia normal

El producto exige current para servir documentos. Se respetó ese contrato y se creó una copia temporal del **modelo normal**, en un contenedor/volumen independiente, PostgreSQL loopback 55483, mismo nombre `banuchat_unified`, mismos schemas, propietarios y ACL. La copia parte del producto normal después de la ingesta, no de la base del piloto. No comparte volúmenes con el producto.

La candidata se publicó **una sola vez y exclusivamente en esa copia**. Se usaron `createAuthenticatedDocumentRag`, router habitual, `createAuthenticatedRuntimeServer`, servicios/SQL de historial habituales y autenticación sin opción experimental. Las tablas de auth/historial no se clonaron como datos históricos; se prepararon únicamente dos fixtures sintéticas existentes. El deployment y los secretos de staging son distintos.

Los listeners temporales se cerraron y las conversaciones, mensajes y citas de ensayo quedaron en cero. El contenedor de staging queda conservado como evidencia reproducible. Sus credenciales y el dump de preparación quedan fuera del directorio/ZIP de revisión, en almacenamiento local ignorado. La copia no es una segunda arquitectura permanente.

## Regresiones funcionales y revisión semántica

Se ejecutaron **249 casos HTTP completos**, usando conversaciones reales para secuencias y registrando historial acotado, retrieval, selección, soporte, registros SQL de cita y respuesta visible. Después de corregir la prioridad de reconocimiento se repitieron los 14 casos y secuencias afectados; la matriz aceptada sustituye únicamente esas ejecuciones y conserva el primer resultado como antecedente.

| Banco | Resultado técnico HTTP |
|---|---:|
| Funcionales | 50/50 |
| Primarios | 72/72 |
| Robustez, subconjunto de primarios | 35/35 |
| Negativos | 24/24 |
| P0 | 10/10 |
| Presentación y presentación semántica | 28/28 |
| Aceptación adicional | 12/12 |
| Guías vigentes | 5/5 |

Incluye nueve secuencias anteriores, tres nuevas, la secuencia progresiva y cuatro secuencias HTTP adicionales. Los 249 casos aceptados pasan integridad estructural y semántica: 204 PASS, 27 abstenciones correctas, nueve rechazos acotados correctos y nueve aclaraciones correctas. No hay incidencias conversacionales pendientes en esa matriz.

La evaluación exige proposiciones completas y condiciones vinculadas a los bytes de las fuentes; no basta una coincidencia léxica, un ID, una cita ni la ausencia de abstención. Se reutiliza conocimiento revisado solamente tras verificar el hash de la proposición y del derivado. Para redacción libre se comprueba pregunta, historial completo, respuesta completa y fuentes. Las 22 respuestas con nueva redacción tienen revisión explícita del agente; no se importaron veredictos PASS de la etapa anterior. La revisión independiente humana sigue pendiente y el banco no es un holdout ciego.

Frente al piloto autenticado aceptado: 22 respuestas cambian de redacción; cuatro historiales difieren por redacción previa generada; retrieval y selección coinciden en los 249 casos. Un caso negativo (N-0023) cambia el conjunto sustentador/fuentes: en la candidata normal la respuesta es una abstención correcta y no utiliza claims sustentadores ni citas, por lo que la diferencia no modifica el resultado semántico. Los 249 historiales devuelven exactamente los mensajes enviados. Las rutas/versiones/URLs de artefactos cambian por la incorporación normal; los 87 cuerpos mantienen sus SHA aprobados.

Se detectó y corrigió una regresión real: «¿Qué reconocimiento obtengo cuando ya completé la ruta?» se desviaba al progreso/calendario sintético. La composición habitual ahora prioriza la regla documental de reconocimiento cuando la release es CCD 1.3 y la consulta no solicita explícitamente los servicios auxiliares. Se conserva el resultado fallido; la corrección tiene prueba de regresión y validación HTTP dirigida.

## Autenticación, privilegios y SECURITY DEFINER

Las pruebas nuevas verifican explícitamente que `AuthService.create()` sin `isolated_pilot` aplica sus guards normales y no sustituye una comprobación fallida por un marker experimental. La ruta normal sigue verificando cuenta, token, sesión, deployment, expiración, revocación y propietario.

La auditoría encontró dos funciones de lectura existentes con propietario administrador: `current_retrieval_context` y `search_chunks_cosine`. La migración las transfiere a `banuchat_ccd_reference_reader`, **NOLOGIN**, sin superusuario, CREATE DATABASE/ROLE, replicación, bypass RLS ni membresías. El rol solo lee siete tablas requeridas y ejecuta el helper puro necesario. No conserva CREATE ni escrituras de corpus. Se conserva a los consumidores existentes.

La RPC nueva usa el mismo propietario mínimo, `search_path=pg_catalog`, objetos calificados, SQL estático, sin EXECUTE para PUBLIC y con permiso solo para el runtime requerido. Las siete funciones SECURITY DEFINER normales quedan con propietarios dedicados sin atributos elevados. Se conservaron las cuatro funciones de autenticación ya endurecidas; sus referencias estáticas calificadas y ausencia de permisos de TEMP/CREATE para runtime impiden introducir objetos en sus search paths.

La auditoría automatizada registra `pg_proc.proowner`, atributos del propietario, ACL, `prosecdef`, `proconfig`, dependencias de catálogo y referencias estáticas complementarias —estas últimas son necesarias para referencias PL/pgSQL—. No se afirma que pg_depend por sí solo describa todas sus referencias.

En producto y staging se ejecutaron transacciones negativas para: escritura de corpus/current/release, publicación, scope/grants, GRANT EXECUTE, creación de tabla en schemas internos/public, creación de schema/TEMP, SET ROLE, elevación del rol, alteración de función y lectura directa de embeddings. Las 15 capacidades fueron rechazadas en cada entorno y se hizo rollback. Se comprobó además el catálogo completo de permisos/columnas, propietarios y roles; no se cierra la seguridad por un único 42501. Se probó el rechazo SHA usando un directorio temporal propio y el servicio real, sin modificar artefactos aprobados.

La RPC rechazó seis variantes adicionales: otra release, clave ajena, duplicados, top_k fuera de rango, dimensión incorrecta y conjunto vacío. Por HTTP se repitieron ausencia/token inválido, refresh y rechazo de token anterior, logout, propiedad cruzada GET/POST/DELETE, identificadores/rutas, selector de release y límites de artefactos.

Con generación detenida antes de persistencia, logout, revocación, expiración y deployment incorrecto produjeron **401 y cero mensajes**. Un fallo de generación inyectado produjo **500 seguro y cero mensajes**. No hubo retry de POST. En staging los ensayos independientes usaron namespaces nuevos del limitador, sin borrar buckets ni modificar límites del producto; los rechazos 429 de ejecuciones preliminares se conservan como antecedente.

El contrato habitual autoriza artefactos por corpus y release ready, no por propietario de conversación: un artefacto histórico ready autorizado responde 200; uno desconocido responde 404, sin token 401 y uno staging en el producto 404. Esta diferencia respecto del scope fijo del piloto es deliberada y no se oculta como supuesto fallo de propietario.

## Pruebas ejecutadas y fallos conservados

- API final: typecheck, typecheck unified y **675/675 tests**.
- RAG: typecheck y **235/235 tests** en la ejecución posterior.
- Banco runtime: 249 casos completos más 14 repeticiones dirigidas; 249 schemas HTTP, contenidos, historiales y vínculos de citas comprobados contra el contrato vigente.
- Artefactos: 87 descargas HTTP reales con SHA correcto y correspondencia con las citas.
- Matrices SQL, RPC y seguridad HTTP descritas arriba; baseline habitual antes y después.
- `git diff --check` y revisión de alcance.

La primera suite RAG tuvo cinco fallos: una fixture nueva omitía el LF final exigido por el parser estricto; se corrigió. Otros cuatro fueron rechazos `SOURCE_REJECTED: read` del lector protegido. La ejecución posterior aprobó las 235 pruebas; se conservan ambos logs, sin declarar aprobada la primera ni cambiar SafeReader.

La preparación inicial también detectó lecturas protegidas inestables. La observación mostró cambios de ctime durante una lectura con contenido, tamaño e inode estables; no se atribuye una causa externa como hecho probado. Se usó una copia propia de derivados depurados fuera de OneDrive, sin copiar/modificar originales. La preparación íntegra y la ingesta posterior pasaron las comprobaciones sin relajarlas. No se ejecutó recovery/retry automático de ingesta.

Las ejecuciones preliminares de seguridad conservan sus fallos de harness: transporte, límite 429, una fixture temporal que infringía la restricción de fechas de sesión y expectativas de status/columnas corregidas. Ninguna se cuenta como PASS. El ZIP incluye resúmenes seguros de los fallos y excluye logs que puedan contener filas de autenticación.

## Evidencia privada y siguiente decisión

Directorio: `data/ccd/local/p1-product-candidate-integration/`. Contiene baseline, snapshots, clasificación, candidata/ingesta, auditorías, resultados completos, revisión semántica, comparación piloto/producto, fallos, integridad, cleanup y run-manifest con hashes. El paquete `revision-ccd-product-candidate.zip` usa una lista permitida y verificación de secretos; excluye configuraciones privadas, dump, tokens, contraseñas y archivos equivalentes a auth-private.

La siguiente decisión sigue siendo explícita: revisión humana y eventual promoción posterior a current. Esta entrega no publica la candidata ni modifica Mobile, y no acredita aprobación institucional CCD.

**ESTADO DE ENTREGA BANUCHAT: incorporación técnica validada como candidata normal; current preservado; aceptación humana y publicación pendientes.**
