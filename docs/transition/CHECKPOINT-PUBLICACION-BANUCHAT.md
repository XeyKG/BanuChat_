# BanuChat — publicación de demostración

## Entorno

Base de código `8a32c04710b4e911c2f0c5a4623510aac5e6354b`. El Learner Lab muestra US$5,40 usados de US$50 al iniciar. La guía de ese curso indica sesiones de cuatro horas y parada automática de EC2 al vencer. En `us-east-1` se aprovisionó `i-0a726734ca6c6f10d`, Amazon Linux 2023, `m6i.large` de 8 GiB, gp3 cifrado de 24 GiB e IMDSv2 obligatorio. Session Manager administra la instancia. El grupo `sg-0e0b64c1a5bc3e1a6` permite entrada TCP 443. La IP pública asignada por EC2 puede cambiar tras detenerla.

Se instaló Node 24 y Ollama con `qwen3:4b-instruct` y `qwen3-embedding:0.6b`. Al vencer el laboratorio, la primera IP dejó de responder. Tras reactivar la misma EC2, se reconstruyeron los clientes para [el formulario público vigente](https://34-239-198-159.sslip.io/login). Respondió HTTP 200 con verificación TLS y se abrió en navegador. La instalación usa código y corpus sintético extraídos del repositorio y dos paquetes cifrados en un bucket S3 privado de staging. No se transfirió CCD ni se creó otra base PostgreSQL. Supabase conserva la base y las funciones de CLOUD-01B.3.

Ollama quedó en loopback. Tras la autorización, se instaló 0.35.0 a partir del paquete oficial verificado por SHA-256 y se descargaron de nuevo los manifiestos para recuperar las revisiones exactas. La API arrancó como servicio systemd después de instalar las dependencias de RAG y MCP. Los valores restringidos de Supabase se transfirieron cifrados y se comprobaron permisos 0600. El perfil administrado admite `BANUCHAT_GENERATOR_TIMEOUT_MS`; se configuró 150000 tras observar cancelaciones a los 30 y 75 segundos. El cliente conserva un límite de 90 segundos, por lo que una primera consulta con el modelo frío puede agotar su espera.

Una consulta de solo lectura confirmó 36 tablas privadas, 32 estudiantes, 62 intentos y 120 vectores de 1024 dimensiones. `cloud_runtime` carece de lectura directa de estudiantes. Los roles `anon` y `authenticated` carecen de `USAGE` sobre `banuchat_academic`.

## Código y pruebas

Se extendieron la configuración de Expo, la exportación web y el proxy existente para usar un origen HTTPS explícito en modo sintético. Web y Android comparten el mismo endpoint REST. El proxy comprueba Host, Origin, método y ruta y no publica CORS permisivo. La configuración local sigue disponible para CCD.

Pasaron `npm run typecheck` en móvil y API, 34 pruebas de contrato y recuperación documental, `npm run web:test`, seis pruebas enfocadas de origen y sesión web, la exportación estática con 15 rutas y `git diff --check`.

Gradle falló primero por la transformación `fbjni`, el espacio de C: y las rutas largas de Ninja. La copia de compilación con ruta corta `X:/bch` completó `assembleRelease` ARM64 para la nueva URL. Se forzó la regeneración del bundle porque Gradle había reutilizado el origen anterior. El APK actualizado está en `infra/local/BanuChat-demo-arm64.apk` (47.054.188 bytes, SHA-256 `3F5D9A76B8382CA3192304A27CD2A76758024197F211C4EBB6D25BE0FD26D402`). `apksigner` verificó la firma de debug local. ADB confirmó instalación y arranque en el Huawei YAL-L21. El login, restauración de sesión y expediente SIM-0001 se observaron en el teléfono. La corrección del cliente permite solamente GET al expediente propio. La captura está en `infra/local/BanuChat-Android-expediente.png`.

Desde el cliente de prueba externo, la API HTTPS validó dos cuentas distintas, expediente, recursamiento, progreso, selector rechazado, conversación ajena con HTTP 404 y chat académico con cero citas. El RAG documental respondió en 22,91 s con cinco citas, artefacto HTTP 200 y conversación `e74646a1-0e6b-4058-96f4-24b6da7225c0`. Después de reiniciar la API, se recuperaron las cinco citas y logout revocó el token con HTTP 401. También pasaron 32 pruebas del cliente Ollama. Quedan pendientes el recorrido gráfico autenticado completo en web y el RAG desde la interfaz Android.

## Operación

Mantener cerrado SSH y utilizar Session Manager. Instalar el código y corpus sintético desde un archivo de Git revisado, junto con la exportación web creada mediante `npm --prefix mobile run web:export` con `EXPO_PUBLIC_DEMO_MODE=synthetic` y `EXPO_PUBLIC_WEB_ORIGIN` configurados. La API usa el perfil `managed` con `cloud_runtime`, CA oficial y verificación de hostname. Ollama, API y proxy se enlazan en loopback. Caddy termina TLS público. La API usa la misma base y configuración de embedding que la demo local.

El guion académico y las consultas de Supabase están en [el checkpoint de entrega acelerada](CHECKPOINT-ENTREGA-ACELERADA.md). `U90000001` muestra recursamiento, `U90000002` un expediente distinto y `U90000032` el caso sin intentos. Las cuentas y sus datos son sintéticos.

Render gratuito tiene suspensión por inactividad y disco efímero. No se eligió para alojar ambos modelos. La publicación fuera de Learner Lab, Cloudflare Pages, la automatización desde GitHub y la validación independiente del PC requieren evidencia propia. [Render](https://render.com/docs/free) · [Cloudflare Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/) · [Qwen3 Embedding en Ollama](https://ollama.com/library/qwen3-embedding)
