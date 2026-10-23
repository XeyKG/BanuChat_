# API REST — contrato y estado implementado

BCH-D37 / **CCD-AUTH-I1B** integra el corpus CCD seleccionado en una composición
v2 autenticada exclusiva de `banuchat_ccd_auth_i1b_test`, loopback 55443. Usa el
bootstrap [011](../../infra/db/011_ccd_authenticated_bootstrap.sql), no la serie
sintética 006–010. REST v2 revisión 4.0.0 conserva las quince operaciones y añade
`me.evidence_mode`; CCD declara solo chat/historial/documentos, con owners por
principal y contexto técnico, y deniega recursos académicos personales con 403.
El modo se fija internamente; no hay selector HTTP ni fallback a la demo.
Nuevas cuentas ficticias U+8, legado BCH-DEMO-#### conservado; 009 se aplicó solo
a otra copia sintética nueva. Correo suspendido, sin v1 anónimo o registro público.
Resultados reales, regresión T01/2, límite T11 y archivos modificados en el
[checkpoint I1B](../../docs/transition/bch05-ccd-auth-i1b-checkpoint.md).
Operación local y Android pendiente en el
[runbook I1B](../../docs/operations/ccd-auth-i1b-android.md).

Antecedente: BCH-05/CCD-AUTH-I1A corrigió el retrieval del proceso autenticado mediante
`banuchat_auth.retrieve_document_chunks`, migración aditiva
[010](../../infra/db/010_authenticated_document_reads.sql). La composición de
producto exige esa función al arrancar y mantiene el runtime sin SELECT directo
de `document_chunks`. Usa el mismo RAG, validación y ordenamiento; v1 conserva
su lectura histórica. I1A no modificó REST, UID, correo ni Mobile y no integró CCD
en v2. 010 se validó solo en una instancia sintética nueva; no aplicarla
ni reiniciar los entornos históricos con la nueva composición sin autorizar su
actualización. Véase el [checkpoint I1A](../../docs/transition/bch05-ccd-auth-i1a-checkpoint.md).

AUTH-P4-L0 añade consola administrativa local para primera contraseña sin correo y
`npm run start:authenticated`, composición v2 independiente, solo loopback, sin v1
ni recuperación funcional. Correo **SUSPENDIDO** por BCH-D33. No cambia contratos o
migraciones ni activa contactos de forma ficticia. Véanse
[operación](../../docs/operations/auth-p4l0-login-local.md) y
[checkpoint](../../docs/transition/bch04-auth-p4l0-checkpoint.md).

AUTH-P3.1 completa las dos operaciones de recuperación en la composición protegida
v2, con PostgreSQL aislado y entrega local de pruebas. Véanse el
[núcleo de recuperación](recovery-core.md) y el
[checkpoint AUTH-P3.1](../../docs/transition/bch04-auth-p31-checkpoint.md).
El listener histórico v1 de este README conserva su comportamiento; no se inicia
ni se monta dentro de la composición v2. La entrega externa sigue pendiente.

BCH-03 incremento 5 añade orientación histórica U03 (pilar no validado en 202660)
y U04 (transición desde Informática). CCD recupera las doce unidades de la release
antes de seleccionar por tema; la distancia vectorial no acredita soporte. El
selector conserva correcciones y distingue un curso reprobado de una prueba nueva,
una prueba antigua pendiente y un curso antiguo aprobado. Para U03/U04, la generación
usa antecedentes del usuario y evidencia fresca; las respuestas anteriores no se
reutilizan como fundamento. El historial persistido sigue completo y por release.

Las salidas positivas de gratuidad, reconocimiento personal, matrícula automática
y otras autorizaciones no admitidas se rechazan. Si el generador devuelve únicamente
el marcador de insuficiencia, puede presentarse un pasaje literal breve de U03/U04
con su cita y límites; una negación categórica de oportunidades también se sustituye
por evidencia acotada. No hay segunda generación ni retry de POST. Referencias
numéricas inválidas siguen fallando de forma cerrada. No se usan originales privados
como artefactos, ni se afirma que la falta de una norma demuestre inexistencia de un
procedimiento. La cuestión de los dos casos relatados sigue requiriendo confirmación
institucional, sin regla universal de gratuidad. Véase
[checkpoint 5](../../docs/transition/bch03-increment-5-checkpoint.md).

BCH-02 incremento 2 limita la evidencia CCD antes de generar: identifica el tema
explícito más reciente del usuario por título de syllabus (también sin el sufijo
Digital/Digitales), orientación de pruebas o contacto, sin usar la posición vectorial
como prueba de respaldo. El generador CCD declara únicamente las fuentes utilizadas
en una línea privada `FUENTES: [1]`. La API valida formato, rango, unicidad y ausencia
de referencias numéricas en el cuerpo; ante una referencia inválida o ausente se
abstiene sin citas. Esa línea se elimina antes de persistir/exponer la respuesta.
`buildDocumentCitations` recibe solo los fragmentos seleccionados y renumera desde
cero con el mismo contrato de citas existente; no se modifican citas históricas.

Las advertencias deterministas se calculan con esas mismas fuentes: syllabus sin
periodo/vigencia confirmados, pruebas/lineamientos de 202660 y contacto M12 con vigencia
actual no ratificada. El tema antiguo de contacto no contamina una corrección hacia
un curso. Las consultas reconocidas de efectos, repetición gratuita o elegibilidad
no pueden usar TEST_ORIENTATION para autorizar reglas: se abstienen antes de generar.
La instrucción de 80 palabras se conserva; una prueba real de propósito, duración,
estructura y límites respondió con detalle suficiente. Las descripciones siguen
siendo generadas, con continuidad y aclaraciones; no se añade un FAQ de respuestas.
La demo sintética conserva su comportamiento previo de citas. Las referencias
válidas garantizan pertenencia al contexto, no una demostración automática de cada
afirmación. Ver [CHECKPOINT incremento 2](../../docs/transition/bch02-increment-2-checkpoint.md).

BCH-02 incremento 1 incorpora continuidad en Document RAG. El envío lee los últimos
ocho mensajes de la misma conversación y release, ordenados por ordinal, dentro
del mismo snapshot SQL que comprueba la release y el próximo ordinal. Cada mensaje
aporta hasta 1.200 caracteres Unicode, con presupuesto total de 6.000. El contexto
no se busca por `profile_key`: compartir `ccd-local-demo` no comparte memoria.
Los seguimientos reconocidos por reglas léxicas incorporan el tema y refinamientos
recientes del usuario a la consulta de embedding (máximo 4.000 caracteres). La
generación recibe preguntas y respuestas anteriores como contexto no confiable,
separado de la evidencia documental recuperada nuevamente. Las correcciones actuales
prevalecen; las preguntas autónomas y los cambios explícitos de tema cortan ese contexto.
Una referencia ambigua sin antecedente solicita aclaración, con evidencia insuficiente
y sin citas, embeddings ni generación. No hay resumen persistido ni llamada LLM adicional.

El listado amplio de cursos CCD recupera diez unidades y enumera por metadata los
syllabus M02 recuperados, con sus citas y límites; la prueba detectó que el top-5
omitía cursos. Las consultas específicas conservan top-5 y generación. Las respuestas
CCD añaden por código límites temporales según sus fuentes. Una respuesta de contacto
requiere M12 y añade siempre la advertencia «202660; su vigencia actual no está
ratificada»; sin M12 se abstiene. El historial no aporta citas ni autoriza reglas.
El exceso de citas secundarias quedó registrado en el incremento 1 y se corrige
para CCD en el incremento 2 descrito arriba. No cambia el contrato REST, SQL ni MCP.

La lectura de chats de releases anteriores y sus citas permanece disponible; enviar
otro mensaje devuelve 409. Debe abrirse una conversación nueva; el tratamiento visual
de ese caso queda pendiente en Mobile. No se consulta conocimiento de dos releases.
Véase [CHECKPOINT BCH-02 incremento 1](../../docs/transition/bch02-increment-1-checkpoint.md).

BCH-03 incremento 4 admite releases CCD `ccd-1.0.0` y `ccd-1.1.0`, con contexto
técnico por release. En CCD, `course_catalog` consulta descripciones mediante RAG,
sin afirmar oferta vigente; el modo sintético conserva el fast path estructurado.
El prompt respeta el periodo de cada evidencia. Las raíces de artefactos CCD se
seleccionan por versión admitida, conservando citas históricas. Conversaciones de
una release anterior se pueden leer; enviarles otro mensaje devuelve 409 y exige
abrir una nueva. No cambia la forma REST ni se añade consulta semántica histórica.
Ver [checkpoint 4](../../docs/transition/bch03-increment-4-checkpoint.md).

BCH-03 incremento 3 incorpora un modo de chat CCD local sin cambiar schemas REST.
Tras aplicar `003_ccd_chat_demo.sql` solo en CCD, `GET /profiles` expone el contexto
`ccd-local-demo` claramente rotulado sin identidad institucional. No es un estudiante
ni una autenticación. El chat usa el router existente, persistencia atómica y Document
RAG con evidencia CCD; historial y artefactos conservan citas verificadas. La demo
sintética permanece como modo por defecto. Véase la justificación en
[el contrato](api-contract.md) y [checkpoint](../../docs/transition/bch03-increment-3-checkpoint.md).

Desde este directorio, con `infra/.env.ccd` local (ignorado) configurado según el
ejemplo, incluidos digest y versión efectivos del generador:

```powershell
npm run build
npm run start:ccd
# Verificación operacional explícita, con DB/Ollama reales y chats CCD nuevos:
npm run test:ccd:http
```

El listener CCD queda en `127.0.0.1:3001`; valida la base fija `banuchat_ccd_dev`,
credenciales `CCD_POSTGRES_*`, release CCD publicada y contexto de demo. Rechaza
port PostgreSQL 5432 y bind LAN para este modo. No hay fallback a la demo sintética.
La prueba inicia/detiene sus propios listeners, persiste solo historial CCD y hace
GET de solo lectura contra la demo sintética. Guarda evidencia en `data/ccd/evidence`.
No ejecutarla junto a un listener propio en 3001/3302. No hay retry de mensajes.

Mobile sigue sin modificaciones: cuerpo REST compatible, pero requiere adecuar sus
rótulos/perfil demo, capacidades disponibles y acceso de red antes de probar CCD en
un dispositivo físico. No se acreditó una prueba móvil ni se abrió LAN en este cambio.

Contrato REST v1 documentado para la app React Native, con base `/api/v1`.
Este directorio implementa servidor y handlers REST; Agent/ReAct no está implementado.
El fallback conversacional actual es Document RAG directo.

El cliente Ollama de query usa `options.num_ctx` de la receta de la release
consultada. Comprueba que el contexto nativo anunciado por `/api/show` sea al
menos el solicitado y mantiene la dimensión exacta; ambos valores pueden ser
distintos. La release observada en L1-B, `6a770ce7-13b7-4b0b-95ae-0c193fa0d655`, usa
`document.options.num_ctx=32768` y `query.options.num_ctx=4096`. Su medición
L1-B ya fue ejecutada y está [versionada](../../eval/generation/results/l1-b-rag-latency-2026-10-03.md).
Esto no verifica qué release está activa en una base local hoy ni acredita OE6.

- [OpenAPI 3.1.0](openapi.yaml): contrato `1.0.0-draft`, serializado en JSON
  (subconjunto de YAML 1.2) para facilitar validación local sin dependencias.
- [Contrato humano](api-contract.md): endpoints, citas, consistencia, errores,
  reintentos y trazabilidad con PostgreSQL y MCP 2.0.

Los mensajes pasan por Intent Router. Cinco fast paths respaldados por datos,
`course_catalog`, `profile_progress`, `calendar_events`, `announcements` y
`document_lookup`, ejecutan servicio de aplicación y renderer determinista. Las rutas
`basic_social`, `capabilities_help` y
`known_out_of_scope` usan renderers estáticos deterministas, sin SQL de dominio,
embeddings ni generación. `document_lookup` resuelve títulos canónicos por metadata
exacta en la release vigente, sin consultar chunks. `agent_fallback` va a Document
RAG directo para preguntas sobre el contenido.
Agent/ReAct y MCP permanecen pendientes dentro de la arquitectura objetivo.
La clasificación no usa LLM, embeddings ni N8N; el fast path no llama a MCP.
El catálogo del router y el `$id` del schema son `1.2.0-draft`.
M3.1 añadió `lexical_patterns` de score 90:
cada regla exige todos sus grupos de señales delimitadas y consume el mensaje
completo con hasta cinco tokens residuales de su propia lista `allowed_fillers`.
Un residual desconocido invalida esa regla léxica. M3.2 añade matching ponderado
para progreso, catálogo, calendario y anuncios cuando no hay evidencia de las reglas
previas: suma grupos únicos, penaliza contenido desconocido/señales ajenas y exige
al menos dos grupos, score ≥80 y margen ≥20, conservando guards y fallback.
No hay stemming, fuzzy matching ni clasificación con IA. La regresión conserva
los casos históricos/M3.1 de `cases.json`; las evaluaciones M3.2 se indexan en
[eval](../../eval/README.md). M8.1 implementa el fast path conversacional
`course_catalog` sobre `banuchat.courses` de la release vigente, sin requerir perfil
en el dispatcher ni consultar `profile_courses`. Admite filtros `available`,
`closed` y `archived`, límite por defecto 20 y máximo 50; produce citas `course`
con procedencia persistida y reconstruible en el historial. No añade `/courses`.
La integración HTTP usa el router real con SQL controlado y prueba envío/relectura
de citas; la comprobación operacional con PostgreSQL local sigue pendiente.
M8.2 añade `document_lookup`: descubre tanto documentos `chunked` como
`full_document`, persiste la versión documental con `chunk_id` nulo y expone la ruta
relativa verificada del artifact. Las citas documentales de RAG conservan su UUID de
chunk y también pueden abrir el documento original.
Las consultas REST directas usan los mismos servicios de aplicación y su futura
reutilización por MCP sigue pendiente. La app consume únicamente REST, nunca MCP ni
N8N. El servidor implementa además historial, artefactos documentales y lecturas HTTP
directas de calendario, progreso y anuncios; revisar `src/http/api-server.ts`.
Solo se emplean perfiles y datos sintéticos de demostración.
No se incluye autenticación institucional ni catálogo REST de cursos en v1.

### Configuración del listener

Por defecto, el API escucha solo en loopback con `BANUCHAT_API_HOST=127.0.0.1`.
Para una prueba temporal desde un celular real en la misma red LAN privada/de
confianza, configura `BANUCHAT_API_HOST=0.0.0.0` y conecta el celular a la IPv4
privada del PC, por ejemplo `http://<IP-LAN-DEL-PC>:3000/api/v1`. El celular no
debe consumir `0.0.0.0` directamente. La API todavía no implementa autenticación
de usuario final, por lo que este bind LAN es solo para desarrollo/demostración;
en Windows, limita cualquier regla o permiso del firewall a la red privada.
No expongas el API a Internet, no configures port forwarding ni uses una red
pública. `BANUCHAT_API_HOST` solo controla el listener HTTP REST; PostgreSQL
mantiene su host fijo en `127.0.0.1`.

- [Especificación del router](../../docs/enrutamiento-intenciones.md) y
  [ADR 0004](../../docs/adr/0004-enrutamiento-determinista-intenciones.md).
- [Catálogo declarativo](intent-routing.catalog.json) y
  [JSON Schema Draft 2020-12](intent-routing.schema.json), que valida catálogo y casos.
- [Casos de diseño](../../eval/intent-routing/cases.json): expectativas de clasificación,
  no resultados ejecutados ni preguntas RAGAS. El router sí está implementado
  en el runtime del prototipo; [intent-router.test.ts](test/intent-router.test.ts) lo prueba
  directamente y [J2](test/intent-http-integration.test.ts) lo prueba por HTTP.
