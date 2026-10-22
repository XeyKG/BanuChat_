import type { SqlQueryClient } from "./data/sql-client.js";

/** Fail startup instead of serving CCD with a synthetic pool, release or identity. */
export async function assertCcdChatDatabase(sql: SqlQueryClient): Promise<void> {
  const result = await sql.query<{ database: string; contexts: number; synthetic_profiles: number }>(`
    SELECT current_database() AS database,
      (SELECT count(*)::int FROM banuchat.ccd_demo_contexts ctx
       JOIN banuchat.datasets d ON d.current_release_id=ctx.dataset_release_id AND d.name='banuchat-ccd-local'
       JOIN banuchat.dataset_releases r ON r.id=ctx.dataset_release_id AND r.status='ready'
       WHERE ctx.profile_key='ccd-local-demo' AND r.manifest->'synthetic'='false'::jsonb
         AND r.manifest->>'schema_version' IN ('ccd-1.0.0','ccd-1.1.0')) AS contexts,
      (SELECT count(*)::int FROM banuchat.synthetic_profiles) AS synthetic_profiles`);
  const row = result.rows[0];
  if (result.rows.length !== 1 || row?.database !== "banuchat_ccd_dev" || row.contexts !== 1 || row.synthetic_profiles !== 0) {
    throw new Error("CCD_CHAT_DATABASE_REJECTED");
  }
}
