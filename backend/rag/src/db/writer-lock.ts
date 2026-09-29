import type { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { DatabaseError, databaseError, invariant } from './errors.js';

/** ASCII "BANU", big-endian 0x42414e55 = 1111576149, positive PostgreSQL int32. */
export const WRITER_LOCK_NAMESPACE = 0x42414e55;
export const DATASET_ID = 1;

export class WriterLease {
  private lost = false;
  private closed = false;
  private inTransaction = false;
  private readonly onError = (): void => { this.lost = true; };
  private constructor(private readonly client: PoolClient) {
    client.on('error', this.onError);
    client.on('end', this.onError);
  }
  static async acquire(pool: Pool): Promise<WriterLease> {
    let client: PoolClient;
    try { client = await pool.connect(); }
    catch (error) { throw new DatabaseError('DATABASE_UNAVAILABLE', { cause: error }); }
    const lease = new WriterLease(client);
    try {
      const result = await lease.query<{ acquired: boolean }>(
        'SELECT pg_try_advisory_lock($1::integer,$2::integer) AS acquired', [WRITER_LOCK_NAMESPACE, DATASET_ID]);
      if (!result.rows[0]?.acquired) throw new DatabaseError('DATABASE_CONFLICT');
      return lease;
    } catch (error) {
      lease.closed = true;
      client.release(true);
      throw databaseError(error);
    }
  }
  async query<R extends QueryResultRow = QueryResultRow>(sql: string, values: unknown[] = []): Promise<QueryResult<R>> {
    if (this.lost || this.closed) throw new DatabaseError('DATABASE_UNAVAILABLE');
    try { return await this.client.query<R>(sql, values); }
    catch (error) {
      const mapped = this.lost ? new DatabaseError('DATABASE_UNAVAILABLE', { cause: error }) : databaseError(error);
      if (mapped.code === 'DATABASE_UNAVAILABLE') this.lost = true;
      throw mapped;
    }
  }
  async transaction<T>(work: () => Promise<T>): Promise<T> {
    invariant(!this.inTransaction);
    this.inTransaction = true;
    try {
      await this.query('BEGIN ISOLATION LEVEL READ COMMITTED');
      const result = await work();
      await this.query('COMMIT');
      return result;
    } catch (error) {
      try { await this.query('ROLLBACK'); } catch { this.lost = true; }
      throw databaseError(error);
    } finally { this.inTransaction = false; }
  }
  async release(): Promise<void> {
    if (this.closed) return;
    try {
      if (!this.lost) {
        const result = await this.query<{ unlocked: boolean }>(
          'SELECT pg_advisory_unlock($1::integer,$2::integer) AS unlocked', [WRITER_LOCK_NAMESPACE, DATASET_ID]);
        invariant(result.rows[0]?.unlocked);
      }
    } finally {
      this.closed = true;
      // Discard the dedicated session, including on uncertain connection/transaction state.
      this.client.release(true);
    }
  }
}

export async function withWriterLease<T>(pool: Pool, work: (lease: WriterLease) => Promise<T>): Promise<T> {
  const lease = await WriterLease.acquire(pool);
  try { return await work(lease); }
  finally { await lease.release(); }
}
