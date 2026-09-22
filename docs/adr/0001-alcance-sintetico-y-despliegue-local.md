# ADR 0001 Alcance sintético y despliegue local

Fecha: 2026-09-22.
Estado: aceptado por decisión del proyecto.

## Contexto

El anteproyecto histórico describía despliegue en servidores UNAB, scraping del CCD
y fuentes institucionales. El alcance aprobado es un prototipo reproducible con
datos sintéticos y ejecución local. El nombre vigente es BanuChat; “Route AI”
identifica únicamente el antecedente académico.

## Decisión

- Todo dato funcional será sintético y versionado en `/data/synthetic`.
- PostgreSQL mantiene una representación procesada de esos archivos.
- Una sola instancia PostgreSQL contiene la extensión pgvector y los datos relacionales.
- La frontera síncrona es Mobile → REST Backend API → Agent/RAG.
- El agente consume herramientas del servidor MCP interno.
- N8N orquesta exclusivamente procesos asíncronos sobre versiones aprobadas del dataset;
  no genera arbitrariamente su fuente de verdad.
- El calendario reside en `/data/synthetic/calendars`; Google Sheets queda fuera del MVP.
- Desarrollo y demostraciones iniciales utilizan Docker Compose local.
- No se utilizan datos, APIs, sitios web ni infraestructura real de UNAB/CCD.

## Consecuencias

Se preserva la trazabilidad desde archivos sintéticos hasta contexto recuperado y
respuestas. No existe autenticación institucional; la autenticación local, los modelos
LLM y una eventual integración push requieren diseño posterior.

Los registros que puedan recogerse en pruebas de usabilidad con personas tienen un
tratamiento separado: requieren diseño de consentimiento y manejo de datos, y no
se incorporan al corpus sintético.

El SQL y los contratos MCP actuales se mantienen como borradores pendientes de revisión.
Esta decisión no congela nombres ni esquemas concretos de tools.

## Alternativas descartadas

- Despliegue institucional y uso de datos o scraping real.
- PostgreSQL relacional y vectorial como servidores independientes.
- N8N como gateway síncrono.
- Google Sheets como fuente obligatoria del calendario.
- Dataset creado arbitrariamente por N8N o mantenido únicamente en la base de datos.
