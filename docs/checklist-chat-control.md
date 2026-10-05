# Checklist — Chat de Control General (BanuChat)

Este chat NO hace trabajo técnico profundo. Si te encuentras discutiendo detalles de
implementación (nombres de funciones, lógica de un guard, esquema SQL exacto), es señal de
que esa conversación debería estar en el chat del OE correspondiente, no aquí.

## Su único trabajo, en cada ciclo:

### 1. Antes de abrir o retomar cualquier chat de OE
- [ ] Leer `docs/estado-objetivos-banuchat.md` completo.
- [ ] Identificar el OE en 🔴 con mayor impacto en la defensa del proyecto, o el que más
      riesgo acumula si se sigue postergando.
- [ ] Confirmar que no hay un bloqueador externo (ej. "necesitamos agendar usuarios para
      SUS") que haga más urgente otro OE aunque esté en 🟡.
- [ ] Decidir explícitamente: "esta ronda trabajamos en [OE_N] porque [razón]".

### 2. Al abrir el chat del OE elegido
- [ ] Usar `docs/plantilla-apertura-chat-OE.md`, rellenada para ese OE específico.
- [ ] Darle solo el contexto mínimo necesario — no pegar el historial completo de otros
      chats de OE.

### 3. Al recibir el reporte de cierre de un chat de OE
- [ ] Verificar que el reporte trae evidencia concreta (archivos, resultados de pruebas,
      métricas), no solo narrativa de lo que "se intentó".
- [ ] Actualizar `docs/estado-objetivos-banuchat.md`: estado, fecha, evidencia.
- [ ] Si el chat de OE reportó algo urgente de OTRO OE (ver plantilla de apertura), anotarlo
      en una sección de "pendientes detectados" del documento de estado — no actuar sobre
      ello todavía.
- [ ] Preguntarte: ¿esta sesión movió la aguja en el OE que más lo necesitaba, o se diluyó en
      algo adyacente? Si fue lo segundo, ese es el momento de ajustar la plantilla de
      apertura la próxima vez, no de repetir el mismo patrón.

### 4. Señal de alarma (igual a la que detectamos esta vez)
Si durante 2+ rondas seguidas el OE trabajado NO es el que estaba en 🔴 en el documento de
estado, detente y pregúntate por qué — puede ser una razón legítima (bloqueo externo), o
puede ser que el panorama general se está perdiendo otra vez.

## Cadencia sugerida
No tiene que ser semanal ni diaria — que sea **por entregable verificable**. Un ciclo
termina cuando hay algo real que mover en el documento de estado, no cuando pasó cierto
tiempo.
