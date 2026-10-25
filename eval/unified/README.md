# BanuChat — aceptación unificada

Los resultados de esta carpeta pertenecen a la composición autenticada unificada.
Las pruebas HTTP usan PostgreSQL/Ollama/MCP/N8N reales. El adaptador de almacenamiento
de AuthSession en Node es de memoria; la navegación, SecureStore y recepción de
notificaciones en Android/iOS requieren dispositivo físico.

Desde backend/api, con puerto 3004 libre:

~~~powershell
npm run test:unified
npm run typecheck:unified
~~~

El runner arranca/cierra su API y reinicia únicamente PostgreSQL/N8N aislados.
La repetición que agota límites de login puede usar --reset-test-limits para preparar
contadores exclusivamente en banuchat_unified/55463 con etiqueta verificada. No cambia
la política ni los eventos de seguridad.

Con la API normal iniciada mediante npm start:

~~~powershell
node --import tsx scripts/evaluate-unified-security.mts
~~~

Desde mobile, contra esa misma API:

~~~powershell
node --import ../backend/api/node_modules/tsx/dist/loader.mjs scripts/evaluate-unified-client.mts
~~~

Resultados finales: T01–T06 y T08–T14 PASS; T07 valida nueve candidatos aislados por
cuenta y deja programación/recepción del SO sin ejecutar. Los tres JSON identifican
sus límites; no son evidencia de UI física o push remoto.

Estado/arquitectura y matriz: [checkpoint](../../docs/transition/banuchat-unified-application-checkpoint.md).
