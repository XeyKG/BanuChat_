import assert from "node:assert/strict";
import test from "node:test";

import {
  ConversationOrchestrationError,
  N8nConversationOrchestrator,
  loadN8nConversationRuntimeConfig,
} from "../src/orchestration/n8n-conversation.js";

const OPERATION = "11111111-1111-4111-8111-111111111111";
const RELEASE = "22222222-2222-4222-8222-222222222222";
const TOKEN = "a".repeat(32);
const input = { operation_id: OPERATION, release_id: RELEASE, demo_mode: "synthetic",
  route: "agent_fallback", requested_capability: "bounded_mcp_agent" } as const;

test("envía una operación correlacionada y valida la directiva cerrada", async () => {
  let observedAuthorization: string | null = null;
  const orchestrator = new N8nConversationOrchestrator({
    url: "http://127.0.0.1:5678/webhook/banuchat/internal/oe4/conversation",
    service_token: TOKEN,
    fetch: async (_url, init) => {
      observedAuthorization = new Headers(init?.headers).get("x-banuchat-service-token");
      assert.deepEqual(JSON.parse(String(init?.body)), input);
      return new Response(JSON.stringify({ operation_id: OPERATION,
        release_id: RELEASE, state: "authorized", directive: "invoke_bounded_mcp_agent", workflow: "oe4-conversation-v1" }),
      { status: 200, headers: { "Content-Type": "application/json" } });
    },
  });
  const result = await orchestrator.orchestrate(input);
  assert.equal(observedAuthorization, TOKEN);
  assert.equal(result.operation_id, OPERATION);
});

test("rechaza respuesta con correlación distinta", async () => {
  const orchestrator = new N8nConversationOrchestrator({ url: "http://127.0.0.1:5678/hook",
    service_token: TOKEN, fetch: async () => new Response(JSON.stringify({
      operation_id: RELEASE, directive: "invoke_bounded_mcp_agent", workflow: "oe4-conversation-v1",
    }), { status: 200, headers: { "Content-Type": "application/json" } }) });
  await assert.rejects(orchestrator.orchestrate(input),
    (error: unknown) => error instanceof ConversationOrchestrationError && error.reason === "invalid_response");
});

test("convierte timeout en dependencia no disponible", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let calls = 0;
  let aborted = false;
  const orchestrator = new N8nConversationOrchestrator({ url: "http://127.0.0.1:5678/hook",
    service_token: TOKEN, timeout_ms: 100, fetch: async (_url, init) => {
      calls += 1;
      assert.ok(init?.signal);
      return new Promise((_resolve, reject) => {
        init.signal!.addEventListener("abort", () => {
          aborted = true;
          reject(new Error("aborted"));
        }, { once: true });
      });
    } });
  const rejected = assert.rejects(orchestrator.orchestrate(input),
    (error: unknown) => error instanceof ConversationOrchestrationError && error.reason === "dependency_unavailable");
  assert.equal(calls, 1);
  t.mock.timers.tick(99);
  assert.equal(aborted, false);
  t.mock.timers.tick(1);
  assert.equal(aborted, true);
  await rejected;
  assert.equal(calls, 1);
});

test("configuración N8N es opcional pero no admite valores parciales", () => {
  assert.equal(loadN8nConversationRuntimeConfig({}), undefined);
  assert.throws(() => loadN8nConversationRuntimeConfig({ BANUCHAT_N8N_SERVICE_TOKEN: TOKEN }));
  assert.deepEqual(loadN8nConversationRuntimeConfig({ BANUCHAT_N8N_SERVICE_TOKEN: TOKEN,
    BANUCHAT_N8N_CONVERSATION_URL: "http://127.0.0.1:5678/hook" }),
  { service_token: TOKEN, url: "http://127.0.0.1:5678/hook", timeout_ms: 4000 });
});

test('admission asks for clarification over two sources and correlates the release',async()=>{
 const request={...input,required_sources:3};
 const orchestrator=new N8nConversationOrchestrator({url:'http://127.0.0.1:15679/hook',service_token:TOKEN,
  fetch:async()=>new Response(JSON.stringify({operation_id:OPERATION,release_id:RELEASE,state:'clarification_required',
   directive:'request_clarification',workflow:'oe4-conversation-v1'}),{headers:{'Content-Type':'application/json'}})});
 assert.equal((await orchestrator.orchestrate(request)).directive,'request_clarification');
});

test('admission rejects wrong release, state, directive and extra capabilities',async()=>{
 const valid={operation_id:OPERATION,release_id:RELEASE,state:'authorized',directive:'invoke_bounded_mcp_agent',workflow:'oe4-conversation-v1'};
 for(const extra of [{release_id:OPERATION},{state:'clarification_required'},{directive:'request_clarification'},{tools:['write_sql']}]){
  const orchestrator=new N8nConversationOrchestrator({url:'http://127.0.0.1:15679/hook',service_token:TOKEN,
   fetch:async()=>new Response(JSON.stringify({...valid,...extra}),{headers:{'Content-Type':'application/json'}})});
  await assert.rejects(orchestrator.orchestrate(input),ConversationOrchestrationError);
 }
});

test('invalid source budgets are rejected before network access',async()=>{
 const orchestrator=new N8nConversationOrchestrator({url:'http://127.0.0.1:15679/hook',service_token:TOKEN,fetch:async()=>{throw new Error('must not call');}});
 for(const required_sources of [0,-1,7,1.5,NaN])await assert.rejects(orchestrator.orchestrate({...input,required_sources}),
  e=>e instanceof ConversationOrchestrationError&&e.reason==='invalid_response');
});
