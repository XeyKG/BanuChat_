import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { createApiServer, DatabaseDependencyError } from "../src/index.js";
import {
  ARTIFACT_BYTES, ARTIFACT_HASH, ARTIFACT_PATH, ARTIFACT_ROOT, ARTIFACT_ROW,
  ArtifactFileSystem, ArtifactSqlClient, DOCUMENT_ID, filesystemError,
} from "./document-artifact-fixtures.js";

const ARTIFACT_ROUTE = `/api/v1/documents/${DOCUMENT_ID}/artifact`;

async function withServer(
  action: (baseUrl: string) => Promise<void>,
  sql = new ArtifactSqlClient(),
  filesystem = new ArtifactFileSystem(),
): Promise<void> {
  const server = createApiServer({
    sql,
    router: { catalog_valid: true, catalog_version: "test", route: () => {
      throw new Error("artifact must not call the router");
    } },
    document_rag: async () => { throw new Error("artifact must not call RAG"); },
    document_artifact: { root: ARTIFACT_ROOT, filesystem },
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  try {
    const address = server.address() as AddressInfo;
    await action(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error === undefined ? resolve() : reject(error));
    });
  }
}

async function assertSafeError(response: Response, status: number, code: string): Promise<void> {
  assert.equal(response.status, status);
  assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("content-disposition"), null);
  const text = await response.text();
  const body = JSON.parse(text);
  assert.deepEqual(Object.keys(body), ["error"]);
  assert.deepEqual(Object.keys(body.error).sort(), ["code", "message", "request_id"]);
  assert.equal(body.error.code, code);
  assert.match(body.error.request_id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu);
  for (const secret of [ARTIFACT_ROOT, ARTIFACT_PATH, ARTIFACT_HASH, ARTIFACT_ROW.source_path,
    "source_sha256", "EACCES", "EIO", "private filesystem detail", "SELECT", "stack"]) {
    assert.equal(text.includes(secret), false, `error leaked ${secret}`);
  }
}

async function assertFullArtifact(response: Response): Promise<void> {
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/octet-stream");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("content-disposition"), `attachment; filename="${DOCUMENT_ID}.bin"`);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("content-length"), String(ARTIFACT_BYTES.byteLength));
  assert.equal(response.headers.get("content-range"), null);
  assert.equal(response.headers.get("location"), null);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), ARTIFACT_BYTES);
}

test("H4 GET artifact returns exact binary bytes and all safe download headers", async () => {
  await withServer(async (baseUrl) => {
    await assertFullArtifact(await fetch(`${baseUrl}${ARTIFACT_ROUTE}`));
  }, new ArtifactSqlClient([{ ...ARTIFACT_ROW, title: 'untrusted filename".html' }]));
});

test("H4 uppercase UUID uses the canonical UUID for SQL and attachment filename", async () => {
  const sql = new ArtifactSqlClient();
  await withServer(async (baseUrl) => {
    await assertFullArtifact(await fetch(`${baseUrl}/api/v1/documents/${DOCUMENT_ID.toUpperCase()}/artifact`));
  }, sql);
  assert.deepEqual(sql.calls[0]?.parameters, [DOCUMENT_ID]);
});

test("H4 Range is ignored and returns 200 with complete bytes, never partial content", async () => {
  await withServer(async (baseUrl) => {
    await assertFullArtifact(await fetch(`${baseUrl}${ARTIFACT_ROUTE}`, {
      headers: { Range: "bytes=0-1" },
    }));
  });
});

test("H4 invalid UUID and any query parameter return 400 before SQL", async () => {
  const sql = new ArtifactSqlClient();
  await withServer(async (baseUrl) => {
    for (const path of ["/api/v1/documents/bad/artifact", `${ARTIFACT_ROUTE}?source_path=documents/artifact.bin`,
      `${ARTIFACT_ROUTE}?release_id=${DOCUMENT_ID}`, `${ARTIFACT_ROUTE}?filename=x`, `${ARTIFACT_ROUTE}?unknown=`]) {
      await assertSafeError(await fetch(`${baseUrl}${path}`), 400, "INVALID_ARGUMENT");
    }
  }, sql);
  assert.equal(sql.calls.length, 0);
});

test("H4 GET body returns 400 before SQL through the existing global rule", async () => {
  const sql = new ArtifactSqlClient();
  await withServer(async (baseUrl) => {
    const response = await new Promise<Response>((resolve, reject) => {
      const req = httpRequest(new URL(ARTIFACT_ROUTE, baseUrl), {
        method: "GET", headers: { "Content-Length": "2" },
      }, (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("error", reject);
        res.on("end", () => {
          const headers = new Headers();
          for (const [key, value] of Object.entries(res.headers)) {
            if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
          }
          resolve(new Response(Buffer.concat(chunks), { status: res.statusCode ?? 500, headers }));
        });
      });
      req.on("error", reject);
      req.end("{}");
    });
    await assertSafeError(response, 400, "INVALID_ARGUMENT");
  }, sql);
  assert.equal(sql.calls.length, 0);
});

test("H4 missing or non-ready version returns safe 404", async () => {
  await withServer(async (baseUrl) => {
    await assertSafeError(await fetch(`${baseUrl}${ARTIFACT_ROUTE}`), 404, "NOT_FOUND");
  }, new ArtifactSqlClient([]));
});

test("H4 unavailable exact file, hash or unsafe realpath returns safe 404", async () => {
  const missing = new ArtifactFileSystem();
  missing.targetError = filesystemError("ENOENT");
  const changed = new ArtifactFileSystem();
  changed.bytes = Buffer.from("current bytes are not the historical bytes");
  const outside = new ArtifactFileSystem();
  outside.targetRealpath = `${ARTIFACT_ROOT}-outside`;
  const directory = new ArtifactFileSystem();
  directory.targetIsFile = false;
  for (const filesystem of [missing, changed, outside, directory]) {
    await withServer(async (baseUrl) => {
      await assertSafeError(await fetch(`${baseUrl}${ARTIFACT_ROUTE}`), 404, "NOT_FOUND");
    }, new ArtifactSqlClient(), filesystem);
  }
});

test("H4 database unavailability returns safe 503", async () => {
  await withServer(async (baseUrl) => {
    await assertSafeError(await fetch(`${baseUrl}${ARTIFACT_ROUTE}`), 503, "DEPENDENCY_UNAVAILABLE");
  }, new ArtifactSqlClient(new DatabaseDependencyError()));
});

test("H4 malformed or duplicate database rows return safe 500", async () => {
  for (const rows of [[{ ...ARTIFACT_ROW, source_path: "documents/../private" }], [ARTIFACT_ROW, ARTIFACT_ROW]]) {
    await withServer(async (baseUrl) => {
      await assertSafeError(await fetch(`${baseUrl}${ARTIFACT_ROUTE}`), 500, "INTERNAL_ERROR");
    }, new ArtifactSqlClient(rows));
  }
});

test("H4 unexpected filesystem failure and missing runtime root return safe 500", async () => {
  const denied = new ArtifactFileSystem();
  denied.readError = filesystemError("EACCES");
  const failed = new ArtifactFileSystem();
  failed.targetError = filesystemError("EIO");
  const missingRoot = new ArtifactFileSystem();
  missingRoot.rootError = filesystemError("ENOENT");
  for (const filesystem of [denied, failed, missingRoot]) {
    await withServer(async (baseUrl) => {
      await assertSafeError(await fetch(`${baseUrl}${ARTIFACT_ROUTE}`), 500, "INTERNAL_ERROR");
    }, new ArtifactSqlClient(), filesystem);
  }
});
