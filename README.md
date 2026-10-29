# BanuChat

Prototipo académico de Ingeniería de Sistemas para consulta asistida y demostración
local. La aplicación vigente usa **login propio BanuChat, cuentas ficticias, REST v2
y Expo SDK 57**. El recorrido documental CCD 1.4.0 está comprobado por REST y en
Android físico; no equivale a autenticación, aprobación ni despliegue institucional.

## Qué datos utiliza

- **Producto local vigente:** documentos CCD seleccionados y derivados autorizados
  para pruebas locales, en `data/ccd/local`, ignorados por Git. Conservan procedencia,
  periodos y restricciones; no tienen ratificación institucional formal.
- **Datos auxiliares:** perfiles, progreso, cursos, calendario y novedades ficticios,
  separados del corpus documental. El backend asigna el perfil a la cuenta; la UI
  actual no ofrece selección libre de identidad.
- **Demo histórica y fixtures:** `data/synthetic` permanece congelado y es la fuente
  de verdad de esa demo. No se utiliza como fallback documental institucional.

El repositorio público no incluye el corpus CCD privado, bancos, respuestas,
credenciales ni la configuración local. Clonarlo no aprovisiona una instalación CCD.

## Arquitectura y capacidades actuales

Mobile → REST v2 autenticado → autorización/propiedad → router determinista.
Las lecturas estructuradas usan servicios PostgreSQL; las consultas documentales
usan Document RAG con PostgreSQL/pgvector y Ollama. Algunas solicitudes multifuente
pasan por N8N y un agente determinista acotado que consume MCP de lectura.
**Ese agente no es ReAct dirigido por un LLM.** N8N no interviene en cada consulta;
la ingesta manual local delega procesamiento y embeddings en `backend/rag`.

Hay chat, citas y visor protegido, historial propio, refresh/logout y módulos
auxiliares ficticios. Las citas permiten verificar procedencia; no garantizan por
sí mismas que una respuesta sea completa o correcta.

## Evidencia y límites

- [OE1: cierre técnico](eval/rag-quality/results/oe1-cierre02-technical-report.md):
  43 casos, 39 respuestas y cuatro abstenciones. RAGAS fue exploratorio y tres de
  sus cuatro medias quedaron bajo las referencias preliminares. La aceptación
  académica y la revisión independiente siguen pendientes.
- [Integración CCD](eval/integration/results/ccd-integration-01-summary.md):
  FLOW-01/02/03/04, REST autenticado y regresiones; no reemplaza el baseline histórico.
- [Android físico CCD 1.4.0](eval/mobile/results/android-mvp-ccd14-validation.md):
  login, chat, fuentes, historial, carga, abstención, restauración y logout en un
  YAL-L21/Android 10. No es SUS, aceptación humana ni matriz de dispositivos.

Fuentes institucionales automáticas, ReAct, Google Sheets real, push remoto,
usabilidad con estudiantes y despliegue en servidores UNAB no están acreditados.
Los seis objetivos no se declaran aprobados por tener una demostración funcional.

## Preparar y presentar la entrega

1. [Estado vigente y precedencia documental](docs/estado-vigente.md).
2. [Procedimiento de demostración local](docs/operations/final-integrated-demonstration.md).
   Preflight de lectura desde la raíz: `node scripts/demo-preflight.mjs`;
   con servicios activos y USB preparado: `node scripts/demo-preflight.mjs --running --adb`.
3. [Matriz vigente OE1–OE6](docs/academic/oe1-oe6-current-status.md).
4. [Paquete breve para revisión del director](docs/academic/entrega-01-director-brief.md).
5. [Guion de demostración y sustentación](docs/academic/entrega-01-demonstration-script.md).
6. [Cierre de ENTREGA-01](docs/transition/entrega-01-summary.md).

Los detalles de componente viven en [API](backend/api/README.md),
[Mobile](mobile/README.md), [RAG/ingesta](backend/rag/README.md) y
[MCP](backend/mcp-server/README.md). Los documentos históricos mantienen su corte;
la ficha vigente identifica las contradicciones de presentación sin reescribirlos.

Para una verificación completa con instalación de dependencias existe
`node scripts/verify-local.mjs`: ejecuta `npm ci`, typechecks y suites de API, RAG,
MCP y Mobile. No es el preflight de demostración ni sustituye pruebas con servicios,
Android o usuarios. No se requiere repetirlo antes de cada presentación.
