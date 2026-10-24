# Evaluación OE2

Esta evaluación distingue explícitamente la preparación local con fixtures de una
operación sobre fuentes institucionales reales. No hace solicitudes de red, no usa
`data/ccd`, no modifica `/data/synthetic` y no publica en PostgreSQL.

Desde `backend/rag`:

```powershell
npm run evaluate:oe2
```

La referencia independiente está en `reference.json`; los inputs representativos,
marcados como demostración, están en `fixtures/`. La exactitud por campo se calcula
como `campos extraídos iguales a la referencia / campos totales de la referencia`.
La exactitud documental exige que todos los campos del documento coincidan.

La salida informa por separado:

- flujos implementados y ejecuciones locales exitosas;
- ejecuciones autónomas N8N realmente observadas;
- exactitud de campos y documentos;
- cobertura de duplicados y conservación del último estado válido;
- verificabilidad del tiempo publicación-origen → disponibilidad BanuChat;
- ausencia de publicación en el corpus CCD.

Una ejecución con fixtures nunca acredita scraping institucional, autorización,
frecuencia real ni actualización inferior a 24 horas.
