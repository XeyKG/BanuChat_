import assert from "node:assert/strict";
import test from "node:test";

import {
  CurrentReleaseError,
  resolveCurrentRelease,
  type SqlQueryClient,
} from "../src/index.js";

const RELEASE_ID = "9c24f15e-17d8-4a30-a676-69fd706f0967";
const EMBEDDING_CONFIG_ID = "00afe95c-df6b-42fc-b6ae-dd6e5b4470b2";

function fakeClient(rows: unknown[]): SqlQueryClient {
  return {
    async query<T>(): Promise<{ rows: T[] }> {
      return { rows: rows as T[] };
    },
  };
}

async function assertReason(
  action: () => Promise<unknown>,
  reason: "no_current_release" | "invalid_database_result",
): Promise<void> {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof CurrentReleaseError);
    assert.equal(error.reason, reason);
    assert.deepEqual(error.toJSON(), {
      error_code: "CURRENT_RELEASE_REJECTED",
      reason,
    });
    return true;
  });
}

test("returns the current ready release context", async () => {
  const context = await resolveCurrentRelease(
    fakeClient([
      {
        release_id: RELEASE_ID,
        embedding_config_id: EMBEDDING_CONFIG_ID,
      },
    ]),
  );

  assert.deepEqual(context, {
    release_id: RELEASE_ID,
    embedding_config_id: EMBEDDING_CONFIG_ID,
  });
});

test("rejects zero rows", async () => {
  await assertReason(
    () => resolveCurrentRelease(fakeClient([])),
    "no_current_release",
  );
});

test("rejects multiple rows", async () => {
  const row = {
    release_id: RELEASE_ID,
    embedding_config_id: EMBEDDING_CONFIG_ID,
  };
  await assertReason(
    () => resolveCurrentRelease(fakeClient([row, row])),
    "invalid_database_result",
  );
});

test("rejects an invalid release_id", async () => {
  await assertReason(
    () =>
      resolveCurrentRelease(
        fakeClient([
          {
            release_id: "not-a-uuid",
            embedding_config_id: EMBEDDING_CONFIG_ID,
          },
        ]),
      ),
    "invalid_database_result",
  );
});

test("rejects an invalid embedding_config_id", async () => {
  await assertReason(
    () =>
      resolveCurrentRelease(
        fakeClient([
          {
            release_id: RELEASE_ID,
            embedding_config_id: "not-a-uuid",
          },
        ]),
      ),
    "invalid_database_result",
  );
});

test("propagates query errors without wrapping", async () => {
  const queryError = new Error("database unavailable");
  const client: SqlQueryClient = {
    async query<T>(): Promise<{ rows: T[] }> {
      throw queryError;
    },
  };

  await assert.rejects(
    () => resolveCurrentRelease(client),
    (error: unknown) => error === queryError,
  );
});

test("queries only dataset_id 1 through a parameter", async () => {
  let capturedText: string | undefined;
  let capturedValues: readonly unknown[] | undefined;
  const client: SqlQueryClient = {
    async query<T>(
      text: string,
      values?: readonly unknown[],
    ): Promise<{ rows: T[] }> {
      capturedText = text;
      capturedValues = values;
      return {
        rows: [
          {
            release_id: RELEASE_ID,
            embedding_config_id: EMBEDDING_CONFIG_ID,
          } as T,
        ],
      };
    },
  };

  await resolveCurrentRelease(client);

  assert.deepEqual(capturedValues, [1]);
  assert.match(capturedText ?? "", /WHERE d\.id = \$1/);
  assert.match(capturedText ?? "", /dr\.id = d\.current_release_id/);
  assert.match(capturedText ?? "", /dr\.status = 'ready'/);
  assert.doesNotMatch(capturedText ?? "", /MAX\s*\(|ORDER\s+BY|LIMIT\s+1/i);
});
