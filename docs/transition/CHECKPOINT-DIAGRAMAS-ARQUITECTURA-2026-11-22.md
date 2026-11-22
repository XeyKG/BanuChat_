# Checkpoint de documentación de arquitectura

**22/11/2026 · America/Bogota.** Se preparó la Figura 3 del apartado 8.3 y un diagrama complementario para la sustentación de BanuChat. La auditoría se basó en `main` en `72501b1`, el cambio de publicación 1.0.9 en `bbbe366` y la evidencia conversacional fechada del 20 y 21 de noviembre.

## Archivos

| Entregable | Ubicación |
| --- | --- |
| Secuencia del turno autenticado | [Mermaid](../architecture/figura-3-secuencia-banuchat.mmd) · [SVG](../architecture/figura-3-secuencia-banuchat.svg) · [PNG](../architecture/figura-3-secuencia-banuchat.png) |
| Detalle de admisión y herramientas MCP | [Mermaid](../architecture/secuencia-multifuente-banuchat.mmd) · [SVG](../architecture/secuencia-multifuente-banuchat.svg) · [PNG](../architecture/secuencia-multifuente-banuchat.png) |
| Trazabilidad, guion oral y pie de figura | [Documento técnico](../architecture/secuencia-conversacional-banuchat.md) |

## Decisiones documentales

- La secuencia mantiene en la API la selección de ruta y el guardado de mensajes y citas. Separa la admisión OE4, que devuelve una directiva, del colector asíncrono, que recibe metadatos de las tres rutas si está activo.
- El RAG administra el uso de evidencia versionada y puede usar Ollama para vectorizar o generar según el caso. El detalle multifuente muestra una política determinista y herramientas MCP de solo lectura.
- La ficha de estado conservaba referencias a clientes anteriores y el diagrama de componentes podía leerse como una invocación directa al agente desde n8n. Este paquete documenta la composición administrada 1.0.9 y sitúa sus observaciones de AWS en los checkpoints de origen. [Estado anterior](../estado-vigente.md) · [Integración observada el 20/11](CHECKPOINT-MCP-AWS-2026-11-20.md) · [Observabilidad del 21/11](CHECKPOINT-N8N-RAG-OBSERVABILIDAD.md) · [Publicación 1.0.9](CHECKPOINT-CATEGORIAS-EDITORIALES-1.0.9.md)

## Comprobación de entregables

- Los grafos se renderizaron localmente con Mermaid CLI 11.4.2, Mermaid 11.17.2 y Edge en segundo plano. Las fuentes incluyen su estilo. Los SVG son vectoriales y los PNG se exportaron a escala 3.
- Se revisaron visualmente los diagramas y se comprobaron los formatos de exportación, los enlaces relativos de la documentación y los espacios en blanco de los cambios.
- El alcance se limitó a documentación. Se conservaron la aplicación, los contratos, los workflows, los datos y el despliegue existentes. No se ejecutaron pruebas funcionales ni se modificó el informe en Google Drive.

La incorporación al informe queda a cargo del propietario.
