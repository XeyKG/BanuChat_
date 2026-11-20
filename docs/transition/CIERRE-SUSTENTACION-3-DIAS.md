# BanuChat · Sustentación y estado del ensayo

Corte del 20/11/2026, hora de Bogotá. Cliente web y Android de referencia 1.0.4. Revisión de código `2331c1a`.

## Arranque y recorrido

1. Abre AWS Academy, activa el Learner Lab y comprueba la EC2 existente en Virginia del Norte. Enciéndela si aparece detenida y espera los controles de estado. Comprueba la web y el editor n8n en el navegador. El detalle está en la guía incluida.
2. Abre [BanuChat](https://banuchat.duckdns.org/login), inicia sesión con una cuenta ficticia y muestra su expediente. Entrega los accesos por el canal privado acordado.
3. Pregunta «¿Cuánto cuesta realizar las pruebas diagnósticas?». Abre una fuente de la respuesta y recupera el mismo turno desde Historial.
4. En otro chat pregunta «Según mis cursos completados, ¿qué convocatorias activas podrían interesarme?». Abre las fuentes y muestra el [workflow conversacional publicado en n8n](https://n8n.banuchat.duckdns.org/workflow/BanuChatOe4Conversation1). Explica que la API decide cuándo pedir admisión a n8n y que el agente ejecuta herramientas MCP de lectura para este tipo de pregunta.
5. Comprueba que la segunda cuenta no puede abrir la conversación de la primera, cierra ambas sesiones y reproduce en el Huawei el recorrido de consulta documental, fuentes e Historial.

El flujo principal es web/Android → HTTPS en AWS → API autenticada → Supabase y Ollama. Las preguntas documentales recuperan evidencia mediante pgvector. La ruta estructurada multifuente usa n8n y el agente acotado con MCP. AWS Academy condiciona la disponibilidad.

## Contingencias

- Si AWS responde y Ollama tarda, abre un turno ya verificado desde Historial y preséntalo como respuesta guardada.
- Si AWS está detenido, recupera la instancia existente siguiendo la guía. Si el sitio no vuelve a tiempo, usa las capturas y resultados fechados del paquete. Historial también necesita la API.
- En esta demo no hace falta encender servicios del PC. La APK incluida conserva el paquete y la firma de la release 1.0.4. El piloto Drive y el despliegue del filtro de respeto quedan fuera del guion principal.

## Evidencia de este corte

| Comprobación | Resultado |
| --- | --- |
| Web canónica, origen de transición y editor n8n | Tiempo de conexión agotado. El estado del Learner Lab y de los servicios administrativos queda por confirmar. |
| RAG, evaluación nueva | 12 casos congelados: cinco directos, tres multifuente, dos parciales y dos sin respaldo. El preflight del ejecutor terminó en `UND_ERR_CONNECT_TIMEOUT` antes del login. Se enviaron **0 de 12 preguntas**. Corrección, citas, abstención, mediana y máximo quedan sin medir. |
| Banco | SHA-256 `42364804ce003f1e12be2b3422cca1fefb078a934f72ee126789061a255002e2`. Preguntas, rúbrica, referencias y resultados por caso se custodian en privado. |
| Web, dos cuentas | El ensayo nuevo queda pendiente. Se conserva la evidencia anterior de identidad, expediente, aislamiento, citas y revocación en el checkpoint de AWS. |
| Huawei | ADB arrancó y no listó dispositivos. Las capturas del paquete son del ensayo histórico 1.0.4, fechado el 18/11, y cada archivo coincide con su hash publicado. |
| APK | Enlace directo respondió HTTP 200. El archivo local coincide con el SHA-256 publicado `daddd2a9eae5b5036ffb80215e0e9b716696b8240bcbf054fb7e7ed4c862ce36`. |

La evidencia anterior de 24 turnos y el banco de 43 casos conservan su corte. El nuevo banco queda disponible para una sola pasada cuando la API vuelva. La matriz OE1–OE6 registra las decisiones académicas pendientes.

[APK 1.0.4](https://github.com/XeyKG/BanuChat_/releases/download/demo-1.0.4/BanuChat-demo-1.0.4-arm64.apk) · [Evidencia histórica de AWS](CHECKPOINT-MCP-AWS-2026-11-20.md) · [Matriz de objetivos](../academic/oe1-oe6-current-status.md)
