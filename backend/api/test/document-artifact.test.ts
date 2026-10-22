import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import {
  DatabaseDependencyError,
  DocumentArtifactError,
  getDocumentArtifact,
  isPathInside,
  type DocumentArtifactErrorReason,
} from "../src/index.js";
import {
  ARTIFACT_BYTES, ARTIFACT_PATH, ARTIFACT_ROOT, ARTIFACT_ROW,
  ArtifactFileSystem, ArtifactSqlClient, DOCUMENT_ID, filesystemError,
} from "./document-artifact-fixtures.js";

function hasReason(reason: DocumentArtifactErrorReason): (error: unknown) => boolean {
  return (error) => error instanceof DocumentArtifactError && error.reason === reason;
}

function retrieve(sql = new ArtifactSqlClient(), filesystem = new ArtifactFileSystem()) {
  return getDocumentArtifact(sql, { document_version_id: DOCUMENT_ID }, {
    root: ARTIFACT_ROOT, filesystem,
  });
}

test("artifact rejects invalid UUID before SQL or filesystem", async () => {
  for (const id of ["bad", "", `${DOCUMENT_ID}/x`, ` ${DOCUMENT_ID}`, `${DOCUMENT_ID}\n`]) {
    const sql = new ArtifactSqlClient();
    const filesystem = new ArtifactFileSystem();
    await assert.rejects(getDocumentArtifact(sql, { document_version_id: id }, {
      root: ARTIFACT_ROOT, filesystem,
    }), hasReason("invalid_argument"));
    assert.equal(sql.calls.length, 0);
    assert.equal(filesystem.calls.length, 0);
  }
});

test("artifact canonicalizes uppercase UUID and returns only exact verified bytes", async () => {
  const sql = new ArtifactSqlClient();
  const filesystem = new ArtifactFileSystem();
  const result = await getDocumentArtifact(sql, {
    document_version_id: DOCUMENT_ID.toUpperCase(),
  }, { root: ARTIFACT_ROOT, filesystem });
  assert.deepEqual(result, { document_version_id: DOCUMENT_ID, bytes: ARTIFACT_BYTES });
  assert.equal(sql.calls.length, 1);
  assert.deepEqual(sql.calls[0]?.parameters, [DOCUMENT_ID]);
  assert.deepEqual(filesystem.calls, [
    { operation: "realpath", path: ARTIFACT_ROOT },
    { operation: "stat", path: ARTIFACT_ROOT },
    { operation: "realpath", path: ARTIFACT_PATH },
    { operation: "stat", path: ARTIFACT_PATH },
    { operation: "readFile", path: ARTIFACT_PATH },
  ]);
});

test("artifact selects an allowlisted historical version root, not the current root", async () => {
  const filesystem = new ArtifactFileSystem();
  const sql = new ArtifactSqlClient([{ ...ARTIFACT_ROW, version_label: "old-version" }]);
  const result = await getDocumentArtifact(sql, { document_version_id: DOCUMENT_ID }, {
    root: resolve(ARTIFACT_ROOT, "current"), version_roots: { "old-version": ARTIFACT_ROOT }, filesystem,
  });
  assert.deepEqual(result.bytes, ARTIFACT_BYTES);
  assert.equal(filesystem.calls[0]?.path, ARTIFACT_ROOT);
});

test("artifact refuses an unadmitted version label before reading any filesystem path", async () => {
  const filesystem = new ArtifactFileSystem();
  const sql = new ArtifactSqlClient([{ ...ARTIFACT_ROW, version_label: "unknown" }]);
  await assert.rejects(getDocumentArtifact(sql, { document_version_id: DOCUMENT_ID }, {
    root: ARTIFACT_ROOT, version_roots: { "old-version": ARTIFACT_ROOT }, filesystem,
  }), hasReason("not_found"));
  assert.equal(filesystem.calls.length, 0);
});

test("artifact SQL selects exactly the ready version in its ready release, including historical releases", async () => {
  const sql = new ArtifactSqlClient();
  await retrieve(sql);
  const text = sql.calls[0]?.text ?? "";
  assert.match(text, /FROM banuchat\.document_versions dv/u);
  assert.match(text, /JOIN banuchat\.dataset_releases dr\s+ON dr\.dataset_id = dv\.dataset_id\s+AND dr\.id = dv\.dataset_release_id/u);
  assert.match(text, /WHERE dv\.id = \$1\s+AND dv\.processing_status = 'ready'\s+AND dr\.status = 'ready'/u);
  assert.doesNotMatch(text, /current_release|LIMIT|content_sha256|manifest_sha256/u);
});

for (const state of ["missing version", "version not ready", "release not ready"]) {
  test(`artifact ${state} filtered out by SQL returns not_found`, async () => {
    const sql = new ArtifactSqlClient([]);
    const filesystem = new ArtifactFileSystem();
    await assert.rejects(retrieve(sql, filesystem), hasReason("not_found"));
    assert.equal(filesystem.calls.length, 0);
  });
}

test("artifact rejects malformed or multiple database rows before filesystem access", async () => {
  for (const rows of [
    [null], ["bad"], [[]], [{}], [ARTIFACT_ROW, ARTIFACT_ROW],
    [{ ...ARTIFACT_ROW, id: null }], [{ ...ARTIFACT_ROW, id: 42 }],
    [{ ...ARTIFACT_ROW, id: "bad" }],
    [{ ...ARTIFACT_ROW, id: "22222222-2222-4222-8222-222222222222" }],
    [{ ...ARTIFACT_ROW, source_sha256: null }],
    [{ ...ARTIFACT_ROW, source_sha256: "a".repeat(63) }],
    [{ ...ARTIFACT_ROW, source_sha256: "A".repeat(64) }],
    [{ ...ARTIFACT_ROW, source_sha256: `${ARTIFACT_ROW.source_sha256}\n` }],
    [{ ...ARTIFACT_ROW, id: `${DOCUMENT_ID}\n` }],
  ]) {
    const filesystem = new ArtifactFileSystem();
    await assert.rejects(retrieve(new ArtifactSqlClient(rows), filesystem), hasReason("invalid_database_result"));
    assert.equal(filesystem.calls.length, 0);
  }
});

test("artifact rejects absolute, non-document, malformed and traversal DB paths", async () => {
  for (const sourcePath of [
    null, 42, "", "/documents/a.bin", "C:/documents/a.bin", "C:\\documents\\a.bin",
    "\\\\server\\share\\a.bin", "../documents/a.bin", "documents/../secret", "documents/./a.bin",
    "documents//a.bin", "documents/", "documents", "profiles/a.json", "documents/a\\b.bin",
    "documents/a:stream", "documents/a\u0000.bin", "documents/%2e%2e/secret",
    "documents/a.bin\n", "documents/a.bin\r\n", "documents/a.bin\u2028",
  ]) {
    const filesystem = new ArtifactFileSystem();
    await assert.rejects(retrieve(new ArtifactSqlClient([{ ...ARTIFACT_ROW, source_path: sourcePath }]), filesystem), hasReason("invalid_database_result"));
    assert.equal(filesystem.calls.length, 0);
  }
});

test("artifact containment rejects root, parents and similarly prefixed sibling roots", () => {
  assert.equal(isPathInside(ARTIFACT_ROOT, ARTIFACT_PATH), true);
  assert.equal(isPathInside(ARTIFACT_ROOT, ARTIFACT_ROOT), false);
  assert.equal(isPathInside(ARTIFACT_ROOT, resolve(ARTIFACT_ROOT, "..")), false);
  assert.equal(isPathInside(ARTIFACT_ROOT, resolve(`${ARTIFACT_ROOT}-outside`, "file.bin")), false);
});

test("artifact uses the canonical root and reads only the canonical target", async () => {
  const filesystem = new ArtifactFileSystem();
  filesystem.rootRealpath = resolve(ARTIFACT_ROOT, "canonical-root");
  filesystem.targetRealpath = resolve(filesystem.rootRealpath, "documents", "real.bin");
  await retrieve(new ArtifactSqlClient(), filesystem);
  assert.equal(filesystem.calls[2]?.path, resolve(filesystem.rootRealpath, ARTIFACT_ROW.source_path));
  assert.equal(filesystem.calls.at(-1)?.path, filesystem.targetRealpath);
});

test("artifact symlink or junction escaping the root returns not_found without stat or read of target", async () => {
  for (const target of [resolve(`${ARTIFACT_ROOT}-outside`, "file.bin"), ARTIFACT_ROOT]) {
    const filesystem = new ArtifactFileSystem();
    filesystem.targetRealpath = target;
    await assert.rejects(retrieve(new ArtifactSqlClient(), filesystem), hasReason("not_found"));
    assert.deepEqual(filesystem.calls.map((call) => call.operation), ["realpath", "stat", "realpath"]);
  }
});

test("artifact nonexistent target or non-directory ancestor returns not_found", async () => {
  for (const code of ["ENOENT", "ENOTDIR"]) {
    for (const stage of ["targetError", "statError", "readError"] as const) {
      const filesystem = new ArtifactFileSystem();
      filesystem[stage] = filesystemError(code);
      await assert.rejects(retrieve(new ArtifactSqlClient(), filesystem), hasReason("not_found"));
    }
  }
});

test("artifact non-regular target returns not_found without reading", async () => {
  const filesystem = new ArtifactFileSystem();
  filesystem.targetIsFile = false;
  await assert.rejects(retrieve(new ArtifactSqlClient(), filesystem), hasReason("not_found"));
  assert.equal(filesystem.calls.some((call) => call.operation === "readFile"), false);
});

test("artifact historical hash mismatch returns not_found without substituting bytes", async () => {
  const filesystem = new ArtifactFileSystem();
  filesystem.bytes = Buffer.from("different current revision\n");
  const sql = new ArtifactSqlClient();
  await assert.rejects(retrieve(sql, filesystem), hasReason("not_found"));
  assert.equal(sql.calls.length, 1);
  assert.equal(filesystem.calls.filter((call) => call.operation === "readFile").length, 1);
});

test("artifact unexpected filesystem failures are safe internal errors", async () => {
  for (const code of ["EACCES", "EIO", "UNKNOWN"]) {
    for (const stage of ["targetError", "statError", "readError"] as const) {
      const filesystem = new ArtifactFileSystem();
      filesystem[stage] = filesystemError(code);
      await assert.rejects(retrieve(new ArtifactSqlClient(), filesystem), (error: unknown) => {
        assert.ok(error instanceof DocumentArtifactError);
        assert.equal(error.reason, "filesystem_error");
        assert.equal(error.message.includes(ARTIFACT_PATH), false);
        return true;
      });
    }
  }
});

test("artifact missing or invalid runtime root is an internal error", async () => {
  for (const code of ["ENOENT", "ENOTDIR", "EACCES"]) {
    const filesystem = new ArtifactFileSystem();
    filesystem.rootError = filesystemError(code);
    await assert.rejects(retrieve(new ArtifactSqlClient(), filesystem), hasReason("filesystem_error"));
  }
  const filesystem = new ArtifactFileSystem();
  filesystem.rootIsDirectory = false;
  await assert.rejects(retrieve(new ArtifactSqlClient(), filesystem), hasReason("filesystem_error"));
  await assert.rejects(getDocumentArtifact(new ArtifactSqlClient(), { document_version_id: DOCUMENT_ID }, {
    root: "relative-root", filesystem,
  }), hasReason("filesystem_error"));
});

test("artifact DatabaseDependencyError propagates unchanged", async () => {
  const error = new DatabaseDependencyError();
  await assert.rejects(retrieve(new ArtifactSqlClient(error)), (caught: unknown) => caught === error);
});

test("artifact default root resolves the synthetic corpus from the module location", async () => {
  const sourcePath = "documents/artifacts/doc-001.md";
  const bytes = await readFile(new URL(`../../../data/synthetic/${sourcePath}`, import.meta.url));
  const sql = new ArtifactSqlClient([{ id: DOCUMENT_ID, source_path: sourcePath,
    source_sha256: createHash("sha256").update(bytes).digest("hex") }]);
  const artifact = await getDocumentArtifact(sql, { document_version_id: DOCUMENT_ID });
  assert.deepEqual(artifact.bytes, bytes);
});
