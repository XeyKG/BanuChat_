# Runbook — OE2 fixture flows v1

Los tres workflows `oe2-*-fixture-v1.json` preparan disparadores de seis horas para
oferta académica, convocatorias y novedades. Permanecen `active=false`. Solo pueden
invocar los IDs `fixture-*` aceptados por el servicio OE2; no contienen URLs UNAB/CCD
ni habilitan extracción real.

## Configuración local

1. Compilar `backend/rag` y levantar `npm run start:oe2` con:
   `BANUCHAT_OE2_FIXTURE_ROOT`, `BANUCHAT_OE2_STATE_ROOT` y un
   `BANUCHAT_OE2_SERVICE_TOKEN` local de al menos 32 caracteres.
2. Reemplazar `__BANUCHAT_OE2_BASE_URL__` en la copia importada. En Windows con el
   contenedor N8N podría ser `http://host.docker.internal:3011`, pero debe verificarse
   para el entorno; no es una topología portable.
3. Revincular la credencial Header Auth `BanuChat OE2 Service`. No versionar el token
   ni el ID interno de la credencial.
4. Probar manualmente `Check Last Valid State` y luego el flujo completo.
5. Activar un schedule solo para una evaluación local expresamente planificada.

Los nodos HTTP tienen retry automático desactivado. Si status falla, no se ejecuta
el flujo. Si run falla después de una publicación válida local, el reemplazo atómico
no ocurre y el último snapshot permanece. La siguiente ejecución programada vuelve a
consultar estado y ejecuta una vez; no llama al retry/recover de la ingesta CCD porque
estos fixtures nunca crean una release CCD.

No activar estos workflows con fuentes reales. Antes se requiere aceptar la fuente,
confirmar autoridad, términos/robots, permiso de automatización, contrato de campos,
política de altas/modificaciones/bajas y política de admisión/publicación CCD.
