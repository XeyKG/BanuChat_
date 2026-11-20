# Operar y recuperar la demostración cloud

Corte: **20/11/2026**. Procedimiento para el despliegue existente de BanuChat, no para crear infraestructura, migrar datos o desplegar en una cuenta distinta.

## Topología y acceso

Web/Android → `https://banuchat.duckdns.org` → Caddy y proxy Node → API REST v2 en EC2 → Supabase PostgreSQL/pgvector y Ollama en la EC2. El usuario necesita internet y una cuenta ficticia autorizada. No necesita encender el PC del desarrollador, Metro, adb reverse o una API local.

El repositorio y sus Releases son privados; las descargas requieren acceso a GitHub. Instalar la [APK ARM64 1.0.4](https://github.com/XeyKG/BanuChat_/releases/download/demo-1.0.4/BanuChat-demo-1.0.4-arm64.apk) como actualización, conservando el paquete y la firma existentes. Las contraseñas se entregan por otro canal.

DuckDNS es el nombre estable que usan web y APK. La IP elástica conserva la dirección de la EC2 mientras siga asignada; no mantiene la máquina encendida. El origen sslip.io se conserva temporalmente como transición, no como dirección preferida para nuevas instalaciones.

## Tras una parada de AWS Academy

1. Iniciar sesión personalmente en Academy/Vocareum y activar el Learner Lab. Las credenciales, MFA y vigencia del laboratorio dependen del titular.
2. Comprobar y, si procede, encender la **instancia existente** identificada en el checkpoint de publicación. No crear una sustituta ni restaurar la base por una parada normal.
3. Abrir Session Manager en esa instancia y comprobar servicios:

```sh
systemctl is-active ollama banuchat-api banuchat-web-duckdns banuchat-https banuchat-n8n
systemctl is-enabled ollama banuchat-api banuchat-web-duckdns banuchat-https banuchat-n8n
```

4. Si falta un servicio, revisar su estado y arrancar únicamente el componente afectado. Ejemplo para la API existente:

```sh
sudo systemctl start banuchat-api
```

5. Comprobar precarga de modelos con las herramientas ya instaladas:

```sh
journalctl -u banuchat-ollama-warmup -b --no-pager
bash /opt/banuchat/infra/scripts/ollama-demo-warmup.sh --check
```

Si es necesario, `sudo systemctl start banuchat-ollama-warmup`. El modo `--check` solo comprueba residencia de modelos; no prueba una respuesta RAG.

6. Comprobar desde otro cliente `https://banuchat.duckdns.org/login`, certificado válido y ausencia de redirección de solicitudes autenticadas. Después probar login, expediente, una consulta documental, su fuente e Historial. Finalizar con logout.

Si la web no abre, separar estado de EC2, asociación de IP, resolución DuckDNS, Caddy y servicios. Si abre pero falla la consulta, separar autenticación, conexión a Supabase, recuperación y generación. La API no debe operar habitualmente como `postgres` ni degradar TLS para superar un error.

El editor cloud se abre en `https://n8n.banuchat.duckdns.org`, con dos accesos distintos: protección del servidor y cuenta propietaria de n8n. El acceso inicial está en el archivo privado del operador indicado en la guía; no se necesita Docker. El workflow conversacional debe aparecer Published. La API activa `managed_mcp` solo para consultas estructuradas multifuente; no es una migración de Unified.

## Disponibilidad y rendimiento

Los servicios públicos y datos persisten fuera del PC, pero AWS Academy es temporal. Terminar o agotar el laboratorio puede detener la demostración; el dominio no evita esa condición. No se acredita funcionamiento permanente, SLA institucional ni presupuesto restante en tiempo real.

Los límites preservados son API 150 s, cliente HTTPS 175 s y proxy 180 s. En la [serie RAG del 18/11](../transition/CHECKPOINT-RAG-PERTINENCIA-2026-11-18.md), 24 turnos remotos completaron en 1,30–110,28 s, con respuestas parciales y abstenciones. Otros cortes conservaron fallos al límite. No aumentar indefinidamente los timeouts ni presentar una muestra satisfactoria como estabilidad.

Para la sustentación, preparar una conversación verificada y reabrirla desde Historial si falla una generación nueva; explicar que es una respuesta persistida. No simular una consulta nueva ni mostrar datos no autorizados para suplir la caída.

## Reversión y cambios posteriores

Cada publicación registra archivos, hashes y respaldo en el [checkpoint consolidado](../transition/CHECKPOINT-PUBLICACION-BANUCHAT.md). La corrección RAG conserva `/opt/banuchat/backups/rag-relevance-20261118` y el cliente 1.0.4. La reversión requiere restituir solo los fuentes/configuración del despliegue correspondiente y reiniciar su servicio; no mezclar backups ni sobrescribir datos.

El paquete académico publicado refleja su fecha. La corrección del backend posterior está en [su checkpoint](../transition/CHECKPOINT-RAG-PERTINENCIA-2026-11-18.md); no requiere otra APK. Este runbook se revisó contra scripts y evidencias existentes: no se volvió a detener la EC2 ni se ejecutó una reversión durante la revisión documental.

## Comprobación actual de la integración, 20/11

La EC2 conservó IP y cinco servicios habilitados/activos. El propietario recuperó el laboratorio mediante la guía. Se probó la rama MCP en API aislada y por DuckDNS, citas/Historial, dos cuentas, aislamiento y revocación; una generación nueva tardó 100,029 s con tres fuentes y tres hashes correctos. n8n conservó workflow y credencial tras su reinicio. La composición de API se revirtió y reactivó sin tocar datos; no se reinició toda la EC2.

Learner Lab: Ready, US$13,40 usados de US$50 observados; es una lectura fechada del panel, susceptible de retraso. No equivale a hosting permanente. [Checkpoint completo](../transition/CHECKPOINT-MCP-AWS-2026-11-20.md).

## Comprobación histórica durante la revisión documental

En el sondeo puntual del 18/11/2026, la conexión a la URL de login agotó su tiempo sin obtener respuesta HTTP. No se determinó la causa ni se modificó infraestructura; no debe atribuirse automáticamente a EC2, DNS o Supabase. Los resultados funcionales anteriores mantienen sus fechas y no acreditan disponibilidad en ese instante. Este dato no sustituye una revisión del laboratorio y sus servicios.
