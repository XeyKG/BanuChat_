# Experimento y validación OE3/OE4, incremento 01

Los 18 escenarios de `scenarios.json` se definieron antes de medir. Son casos de
desarrollo sintéticos; el orden exacto de herramientas y el resultado esperado
forman el criterio de acierto. Una respuesta completa exige citas de los tipos de
fuente solicitados. No se juzga corrección semántica general ni significancia
estadística. El baseline es el agente del commit
`f2724505fa4a0543b64644cb8ce21e36c34592a7`; no se modifica OE1.

- A: implementación anterior, recuperada con `git show` a un módulo privado.
- B: reglas adaptativas, máximo dos herramientas/pasos, 30 s y 32 KiB por observación.
- C: misma selección inicial y barreras que B; el modelo local decide la siguiente
  acción después de observar un resultado validado. No recibe la recomendación
  de B. Puede elegir solo acciones admisibles, y el backend comprueba esa elección.

Un piloto previo dejó también la selección inicial al modelo y mostró abstenciones
prematuras. Se conserva aparte, sin mezclarlo con la medición C desde observaciones.
La revisión del protocolo precede a esta segunda medición; los escenarios y sus
resultados esperados se mantienen. Se registra esta iteración de desarrollo, sin
presentarla como evaluación ciega. El modelo, digest, receta, decisiones y tiempos
reales quedan en el informe privado. No se instala ningún modelo.

Desde `backend/api`, con dependencias y configuración privada Unified existentes:

```powershell
node --import tsx scripts/update-unified-conversation.mts
node --import tsx scripts/evaluate-agent-orchestration.mts
node --import tsx scripts/evaluate-unified-agent-orchestration.mts
npm run typecheck
npm run typecheck:unified
node --import tsx --test test/adaptive-agent.test.ts test/agent-mcp.test.ts test/n8n-conversation.test.ts test/ccd-documentary-routing.test.ts test/ccd-knowledge-routing.test.ts
```

El actualizador solo importa/publica el workflow conversacional del contenedor
Unified existente: verifica etiqueta, volumen y puerto loopback, guarda el export
anterior privado y restaura ese workflow si la publicación o sus probes fallan.
La espera de registro del webhook es una comprobación de arranque, sin retry de
consultas productivas ni copia/recreación de volúmenes. Las credenciales se conservan.

La evaluación HTTP abre un listener loopback efímero con la composición normal v2,
cuentas sintéticas ya autorizadas, PostgreSQL/MCP/Ollama reales y el workflow
publicado. Escribe sesiones e historial de prueba en Unified; no reinicia PostgreSQL
ni cambia publicaciones, permisos o corpus. Detiene brevemente N8N para comprobar
503 sin persistencia y lo vuelve a iniciar en `finally`. S13 del experimento de
políticas es una inyección de fallo; la caída real pertenece a la evaluación HTTP.
Las releases obsoletas se prueban con pins de sesión, sin mover punteros SQL.

Desde `backend/mcp-server`:

```powershell
npm run typecheck
npm test
```

Los payloads CCD, respuestas, perfiles, configuración y trazas completas se guardan
exclusivamente en `infra/local/oe3-oe4-increment-01/`, excluido de Git. El resumen
público omite contenido y claves de evidencias privadas. No se repite Android
físico ni las 43 preguntas OE1. El checkpoint final registra lo realmente ejecutado.
