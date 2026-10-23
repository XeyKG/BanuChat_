import type { Pool } from "pg";
import type { SqlQueryClient } from "./sql-client.js";

/** One reserved connection, including rollback and release on every failure. */
export class PgTransactionRunner {
  constructor(private readonly pool: Pool) {}
  async run<T>(operation: (client: SqlQueryClient) => Promise<T>): Promise<T> {
    const connection = await this.pool.connect();
    let discard=false;
    try {
      await connection.query("BEGIN");
      const result = await operation({ query: async <R>(sql: string, values?: readonly unknown[]) => {
        const response = await connection.query(sql, values === undefined ? undefined : [...values]);
        return { rows: response.rows as R[] };
      } });
      await connection.query("COMMIT");
      return result;
    } catch (error) {
      try { await connection.query("ROLLBACK"); } catch { discard=true; }
      throw error;
    } finally { connection.release(discard); }
  }
}
