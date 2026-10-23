# CHECKPOINT BANUCHAT — AUTH-P3/Correo Gmail

Base: `28fbc68d1e8715ebc8ba0d645469af445989f586`, árbol limpio al iniciar.
**Estado: delta propuesto; pendiente de aprobación. AUTH-P3 no implementado ni probado.**

La corrección obligatoria de Sala de Control prevalece sobre el adjunto inicial
AUTH-P3: recepción real en Gmail sustituye la captura local como aceptación final.
Se mantiene el alcance original OE1–OE6 y la naturaleza ficticia de los datos
académicos. El contacto real se reconoce como dato privado, no como expediente o
identidad institucional.

Se revisaron contrato REST v2/OpenAPI, diseño X01, migraciones 006/007, matriz de
permisos, servicios AUTH-P1/P2, limitador, aprovisionamiento y AGENTS.md. Se consultó
documentación primaria de proveedor, Gmail y OWASP, sin configurar servicios.

Propuesta completa y delta preciso:
[auth-p3-delta-correo-gmail.md](../architecture/auth-p3-delta-correo-gmail.md).

Decisiones propuestas para revisión:

- Mantener solicitud por UID y 202 genérico. Confirmación cerrada con synthetic_uid,
  verification_code de ocho dígitos y new_password; retirada explícita del formato
  de token de recuperación anterior. Revisión mayor del contrato propuesta, sin
  aplicar cambios a las rutas ni schemas actuales.
- Access/refresh continúan con 32 bytes/43 caracteres. Los códigos son otro tipo
  de secreto: 300 s, cinco intentos por reto y presupuesto privado por UID, HMAC
  con clave externa y un reto de recuperación activo por cuenta.
- Migración adicional 008 propuesta, aún sin archivo SQL ejecutable: contactos
  reales cifrados y verificados separados de accounts.recovery_email sintético,
  retos con propósito/versión, contadores privados y estados mínimos de envío.
  001/006/007 permanecen intactas.
- MailDelivery reutilizable y Resend/HTTPS como candidato sujeto a autorización,
  dominio/remitente propios y verificados, revisión de privacidad/coste y claves
  custodiadas. Gmail es destinatario; no se necesitan credenciales de su buzón ni
  acceso al correo privado de estudiantes.
- Demostración futura separa emisión, aceptación del proveedor, llegada al servidor,
  observación real en Gmail y consumo. Un evento de entrega del proveedor no
  acredita bandeja Gmail ni restablecimiento consumido.
- Estimación posterior: 56–88 horas combinadas, unas 10–15 jornadas de seis horas,
  más esperas externas sin disponibilidad confirmada. Dominio, proveedor y dos
  buzones Gmail consentidos son dependencias de cierre aún no confirmadas.

Solo se añadieron dos documentos: la propuesta y este checkpoint. No se modificaron
contratos, código, migraciones, datos o configuración. No se levantaron contenedores,
consultó PostgreSQL, ejecutaron pruebas, enviaron correos ni accedió a Gmail. La
entrega aceptada, recepción observada y consumo tienen estado **NO EJECUTADO**.
No se atribuyen resultados de AUTH-P2 a recuperación funcional AUTH-P3.

Validación documental: revisión de schemas actuales y comparación de alcance;
enlace local comprobado y git diff --check sin errores; ningún archivo preexistente
modificado. No corresponde declarar
PASS de pruebas unitarias/SQL/HTTP/correo por estos documentos.

Se conserva la restricción de no aplicar deltas incompatibles antes de revisión
expresada por el usuario. No se solicita todavía un correo o secreto real en este
chat. Sin commit ni push. AUTH-P4, MCP, RAG y corpus sin cambios.

**Detenido para revisión de Sala de Control antes de implementar o aplicar el delta.**
