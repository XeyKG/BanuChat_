import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";

// Test-only reuse of dependencies already pinned by this repository; no MCP runtime.
const testRequire = createRequire(new URL("../../mcp-server/package.json", import.meta.url));
interface Validator {
  (value: unknown): boolean;
  errors?: unknown;
}
interface SchemaCompiler {
  addSchema(schema: unknown): void;
  addFormat(name: string, format: boolean): void;
  compile(schema: unknown): Validator;
}
const Ajv2020 = (testRequire("ajv/dist/2020.js") as { default: new (options: unknown) => SchemaCompiler }).default;
const addFormats = testRequire("ajv-formats") as (compiler: SchemaCompiler) => void;
type ObjectValue = Record<string, unknown>;
function object(value: unknown): ObjectValue {
  assert.ok(value !== null && typeof value === "object" && !Array.isArray(value));
  return value as ObjectValue;
}
const contract = object(JSON.parse(await readFile(new URL("../openapi-v2.yaml", import.meta.url), "utf8")));
const frozen = object(JSON.parse(await readFile(new URL("../openapi.yaml", import.meta.url), "utf8")));
const components = object(contract.components);
const schemas = object(components.schemas);
const paths = object(contract.paths);
const compiler = new Ajv2020({ strict: true, strictTypes: false, allErrors: true, validateFormats: true });
addFormats(compiler);
compiler.addFormat("binary", true); // OpenAPI binary annotation; no JSON assertion of actual artifact bytes.
const schemaId = "urn:banuchat:auth-p0:schemas";
function jsonSchema(schema: unknown): ObjectValue {
  return object(JSON.parse(JSON.stringify(schema).replaceAll("#/components/schemas/", "#/$defs/")));
}
const definitions = jsonSchema(schemas);
compiler.addSchema({ $id: schemaId, $schema: "https://json-schema.org/draft/2020-12/schema", $defs: definitions });
function validator(name: string): Validator {
  return compiler.compile({ $ref: `${schemaId}#/$defs/${name}` });
}
function accepts(name: string, value: unknown): void {
  const validate = validator(name);
  assert.equal(validate(value), true, JSON.stringify(validate.errors));
}
function rejects(name: string, value: unknown): void {
  assert.equal(validator(name)(value), false, `${name} accepted invalid fixture`);
}
function dereference(value: unknown): ObjectValue {
  const item = object(value);
  if (typeof item.$ref !== "string") return item;
  assert.ok(item.$ref.startsWith("#/"));
  let target: unknown = contract;
  for (const part of item.$ref.slice(2).split("/")) target = object(target)[part];
  return object(target);
}
function operation(path: string, method: string): ObjectValue {
  return object(object(paths[path])[method]);
}
function response(path: string, method: string, status: string): ObjectValue {
  return dereference(object(operation(path, method).responses)[status]);
}
function validatesResponse(path: string, method: string, status: string, value: unknown): boolean {
  const schema = object(object(object(response(path, method, status).content)["application/json"]).schema);
  // Compile the operation-specific constraints AND the same local component root.
  const root = { ...jsonSchema(schema), $defs: definitions };
  return compiler.compile(root)(value);
}
const uuid = "11111111-1111-4111-8111-111111111111";
const date = "2026-10-22T12:00:00Z";
const token = "A".repeat(43); // Shape fixture only: not generated, stored, sent or an operative credential.
const profile = { profile_key: "demo-profile", alias: "Perfil ficticio" };
const capabilities = ["chat", "history", "progress", "calendar", "announcements", "documents"];
const newPassword = "frase de prueba ficticia";
const expected = [
  "POST /auth/login", "POST /auth/refresh", "GET /auth/me", "POST /auth/logout",
  "POST /auth/password/reset-requests", "POST /auth/password/reset",
  "POST /conversations", "GET /conversations", "GET /conversations/{conversation_id}",
  "DELETE /conversations/{conversation_id}", "POST /conversations/{conversation_id}/messages",
  "GET /calendar/events", "GET /announcements", "GET /documents/{document_version_id}/artifact", "GET /me/progress",
];
const publicIds = new Set(["login", "refresh_session", "request_password_reset", "confirm_password_reset"]);
const methods = new Set(["get", "post", "delete"]);
function operations(): Array<{ path: string; method: string; value: ObjectValue; item: ObjectValue }> {
  return Object.entries(paths).flatMap(([path, item]) => Object.entries(object(item))
    .filter(([method]) => methods.has(method))
    .map(([method, value]) => ({ path, method, value: object(value), item: object(item) })));
}

test("AUTH-P0 v2 declares exactly fifteen operations, six identity operations, and no selector/admin/registration bypass", () => {
  assert.equal(contract.openapi, "3.1.0");
  assert.equal(object(contract.info).version, "2.0.0");
  assert.deepEqual(contract.servers, [{ url: "/api/v2", description: "Base relativa; TLS obligatorio fuera del canal local aislado autorizado." }]);
  assert.deepEqual(operations().map(o => `${o.method.toUpperCase()} ${o.path}`), expected);
  assert.equal(operations().filter(o => o.path.startsWith("/auth/")).length, 6);
  assert.deepEqual(contract.security, [{ banu_bearer: [] }]);
  assert.equal(object(object(components.securitySchemes).banu_bearer).scheme, "bearer");
  const ids = operations().map(o => o.value.operationId);
  assert.equal(new Set(ids).size, ids.length);
  for (const { path, value } of operations()) {
    const publicOperation = publicIds.has(String(value.operationId));
    assert.equal(Object.hasOwn(value, "security"), publicOperation, path);
    if (publicOperation) assert.deepEqual(value.security, []);
    if (!publicOperation) assert.ok(object(value.responses)["401"], path);
    assert.equal(value["x-unknown-query-parameters"], "reject");
    const asText = JSON.stringify(value);
    assert.doesNotMatch(asText, /\/api\/v1|contexto técnico CCD|204 también si ya no existe|perfil elegido por la app/);
  }
});

test("AUTH-P0 compiles every schema and resolves every local reference without external v1 references", () => {
  for (const name of Object.keys(schemas)) validator(name);
  function visit(value: unknown): void {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (value === null || typeof value !== "object") return;
    const node = object(value);
    if (node.$ref !== undefined) dereference(node);
    if (node.type === "object") assert.equal(node.additionalProperties, false);
    Object.values(node).forEach(visit);
  }
  visit(contract);
  for (const { path, method, value } of operations()) {
    const parameters = [...(object(paths[path]).parameters as unknown[] ?? []), ...(value.parameters as unknown[] ?? [])].map(dereference);
    const placeholders = [...path.matchAll(/\{([^}]+)\}/gu)].map(match => match[1]);
    assert.deepEqual(parameters.filter(p => p.in === "path").map(p => p.name).sort(), placeholders.sort());
    assert.ok(!parameters.some(p => p.name === "profile_key" || p.name === "principal_id" || p.name === "synthetic_uid"));
    for (const parameter of parameters) {
      if (parameter.in === "path") assert.equal(parameter.required, true);
      compiler.compile({ ...jsonSchema(parameter.schema), $defs: definitions });
    }
    if (method === "get" || method === "delete" || path === "/auth/logout") {
      assert.equal(value["x-empty-request-body"], true);
      assert.equal(value.requestBody, undefined);
    }
  }
});

test("AUTH-P0 request schemas reject extra identity selectors, wrong types, noncanonical UID and tokens", () => {
  accepts("login_request", { synthetic_uid: "BCH-DEMO-0001", password: "x" });
  for (const uid of ["bch-demo-0001", " BCH-DEMO-0001", "BCH-DEMO-00001", "BCH-DEMO-000１", "", null]) {
    rejects("login_request", { synthetic_uid: uid, password: "x" });
  }
  for (const field of ["principal_id", "profile_key", "recovery_email", "role", "release_id"]) {
    rejects("login_request", { synthetic_uid: "BCH-DEMO-0001", password: "x", [field]: uuid });
    rejects("create_conversation_request", { [field]: uuid });
    rejects("send_message_request", { content: "Consulta ficticia", [field]: uuid });
  }
  accepts("create_conversation_request", {});
  rejects("create_conversation_request", null);
  accepts("refresh_request", { refresh_token: token });
  accepts("reset_confirmation", { token, new_password: newPassword });
  for (const bad of ["A".repeat(42), "A".repeat(44), "A".repeat(42) + "B", "A".repeat(42) + "=", uuid, 123, null]) {
    rejects("refresh_request", { refresh_token: bad });
    rejects("reset_confirmation", { token: bad, new_password: newPassword });
  }
  accepts("reset_request", { synthetic_uid: "BCH-DEMO-0002" });
  rejects("reset_request", { synthetic_uid: "BCH-DEMO-0002", email: "demo-0002@banuchat.test" });
  rejects("reset_confirmation", { token, new_password: newPassword, principal_id: uuid });
});

test("AUTH-P0 password/message limits count Unicode code points and reject malformed Unicode", () => {
  accepts("new_password", " ".repeat(15)); // Blocklist/content policy is an application obligation, not invented schema logic.
  accepts("new_password", "😀".repeat(15));
  accepts("new_password", "😀".repeat(128));
  rejects("new_password", "a".repeat(14));
  rejects("new_password", "😀".repeat(129));
  rejects("new_password", "abc" + "\ud800" + "defghijklmnop");
  rejects("login_password", "\udfff");
  rejects("login_password", "");
  accepts("send_message_request", { content: "😀".repeat(4000) });
  rejects("send_message_request", { content: "😀".repeat(4001) });
  rejects("send_message_request", { content: " \n\t" });
});

test("AUTH-P0 success payloads omit recovery email, credentials, hidden session state and third-party data", () => {
  const tokens = { access_token: token, refresh_token: token, token_type: "Bearer", expires_in: 900, session_expires_at: date };
  accepts("token_response", tokens); // Independent CSPRNG generation is not demonstrated by shape fixtures.
  rejects("token_response", { ...tokens, expires_in: 901 });
  rejects("token_response", { ...tokens, expires_in: 0 });
  rejects("token_response", { ...tokens, password_hash: "not-a-hash" });
  const me = { principal_id: uuid, synthetic_uid: "BCH-DEMO-0001", session_id: uuid, session_expires_at: date, release_id: uuid, profile, capabilities };
  accepts("current_session", me);
  rejects("current_session", { ...me, recovery_email: "demo-0001@banuchat.test" });
  rejects("current_session", { ...me, auth_version: 1 });
  rejects("current_session", { ...me, capabilities: [...capabilities, "admin"] });
  rejects("current_session", { ...me, capabilities: [...capabilities].reverse() });
  accepts("reset_accepted", { message: "Si la cuenta puede recuperar el acceso, recibirás instrucciones en su buzón asociado." });
  rejects("reset_accepted", { message: "Cuenta no encontrada" });
  rejects("reset_accepted", { message: "Si la cuenta puede recuperar el acceso, recibirás instrucciones en su buzón asociado.", token });
  rejects("date_time", "2026-10-22T12:00:00");
  rejects("uuid", "not-a-uuid");
});

test("AUTH-P0 all declared responses resolve, are no-store, and bind error codes to sanitized fixed messages", () => {
  for (const { path, method, value } of operations()) {
    for (const [status, raw] of Object.entries(object(value.responses))) {
      if (object(raw).$ref !== undefined) assert.deepEqual(Object.keys(object(raw)), ["$ref"], "OpenAPI Reference Object has unsupported siblings");
      const r = dereference(raw);
      const headers = object(r.headers);
      assert.equal(object(dereference(headers["Cache-Control"]).schema).const, "no-store");
      assert.equal(object(dereference(headers.Vary).schema).const, "Authorization");
      if (status === "204") assert.equal(r.content, undefined);
      if (status === "401") assert.ok(headers["WWW-Authenticate"]);
      if (status === "429") assert.ok(headers["Retry-After"]);
      if (status === "405") assert.ok(headers.Allow);
      for (const media of Object.values(object(r.content ?? {}))) {
        const schema = object(object(media).schema);
        compiler.compile({ ...jsonSchema(schema), $defs: definitions });
      }
    }
    if (!publicIds.has(String(value.operationId))) {
      const err = { error: { code: "UNAUTHENTICATED", message: "No se pudo autenticar la solicitud.", request_id: uuid } };
      assert.equal(validatesResponse(path, method, "401", err), true);
      assert.equal(validatesResponse(path, method, "401", { error: { ...err.error, code: "NOT_FOUND" } }), false);
      assert.equal(validatesResponse(path, method, "401", { error: { ...err.error, message: "Token de otra cuenta" } }), false);
    }
  }
  for (const code of ["INVALID_ARGUMENT", "INVALID_RESET"]) {
    const message = code === "INVALID_RESET" ? "No se pudo restablecer la contraseña." : "La solicitud no cumple el contrato esperado.";
    assert.equal(validatesResponse("/auth/password/reset", "post", "400", { error: { code, message, request_id: uuid } }), true);
  }
  assert.equal(object(operation("/auth/password/reset-requests", "post").responses)["404"], undefined);
  assert.equal(object(operation("/auth/password/reset-requests", "post").responses)["401"], undefined);
});

test("AUTH-P0 preserves business response schema shapes with the exact necessary v2 citation URL projection", () => {
  const original = object(object(frozen.components).schemas);
  const retained = ["profile", "created_conversation", "conversation_summary", "conversations_response", "user_message", "assistant_message", "visible_message", "conversation_detail", "send_message_request", "send_message_response", "calendar_event", "calendar_response", "course_progress", "progress_response", "announcement", "announcements_response"];
  for (const name of retained) assert.deepEqual(schemas[name], original[name], name);
  const citation = structuredClone(object(original.citation));
  const url = object(object(citation.properties).artifact_url);
  url.pattern = String(url.pattern).replace("/api/v1/", "/api/v2/");
  assert.deepEqual(schemas.citation, citation);
  const doc = { index: 0, source_kind: "document", label: "Documento ficticio", locator: "Sección", release_id: uuid, document_version_id: uuid, artifact_url: `/api/v2/documents/${uuid}/artifact` };
  accepts("citation", doc);
  rejects("citation", { ...doc, artifact_url: `/api/v1/documents/${uuid}/artifact` });
  rejects("citation", { ...doc, artifact_url: "https://banuchat.test/document" });
  rejects("citation", { ...doc, source_kind: "profile" });
  accepts("citation", { ...doc, source_kind: "profile", document_version_id: null, artifact_url: null });
  const locationSchema = object(dereference(object(response("/conversations", "post", "201").headers).Location).schema);
  const validateLocation = compiler.compile(locationSchema);
  assert.equal(validateLocation(`/api/v2/conversations/${uuid}`), true);
  assert.equal(validateLocation(`/api/v1/conversations/${uuid}`), false);
  assert.equal(validateLocation("/api/v2/conversations/" + "-".repeat(36)), false);
});

test("AUTH-P0 query defaults, request ceilings and recovery/session policy are explicit", () => {
  const limit = object(dereference(object(components.parameters).limit).schema);
  assert.deepEqual(limit, { type: "integer", minimum: 1, maximum: 50, default: 20 });
  const listParameters = operation("/conversations", "get").parameters as unknown[];
  assert.deepEqual(listParameters.map(dereference).map(p => p.name), ["limit"]);
  const policy = object(contract["x-auth-policy"]);
  assert.equal(policy.request_body_max_bytes, 16384);
  assert.equal(policy.request_headers_max_bytes, 16384);
  assert.equal(policy.request_target_max_bytes, 8192);
  assert.equal(policy.manual_recovery_token, true);
  assert.equal(policy.recovery_domain, "banuchat.test");
  assert.equal(policy.public_registration, false);
  assert.equal(policy.reset_ttl_seconds, 1200);
  assert.equal(policy.max_pending_reset_tokens, 3);
  assert.equal(policy.recovery_queue_capacity, 128);
  assert.equal(policy.recovery_dispatch_concurrency, 1);
  assert.equal(policy.session_absolute_seconds, 604800);
  assert.equal(policy.session_idle_seconds, 86400);
  assert.equal(policy.access_ttl_seconds, 900);
  const rates = contract["x-rate-limits"] as ObjectValue[];
  assert.deepEqual(rates.map(r => [r.action, r.window_seconds, r.limit]), [
    ["login_uid", 900, 5], ["login_origin", 900, 30], ["reset_uid", 3600, 3],
    ["reset_origin", 900, 10], ["confirm_origin", 900, 10], ["refresh_origin", 900, 60], ["hash_work", 60, 20],
  ]);
  assert.equal(rates.find(r => r.action === "reset_uid")?.response_status, 202);
});
