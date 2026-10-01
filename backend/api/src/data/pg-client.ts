import type { Pool } from "pg";

import { DatabaseDependencyError } from "./database-errors.js";
import type { SqlQueryClient } from "./sql-client.js";

const NODE_AVAILABILITY_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "ENETUNREACH",
]);

const POSTGRES_SHUTDOWN_CODES = new Set(["57P01", "57P02", "57P03"]);

function errorCode(error: unknown): string | undefined {
  if (error === null || typeof error !== "object" || !("code" in error)) {
    return undefined;
  }

  return typeof error.code === "string" ? error.code : undefined;
}

function isDatabaseAvailabilityError(error: unknown): boolean {
  const code = errorCode(error);
  return (
    code !== undefined &&
    (NODE_AVAILABILITY_CODES.has(code) ||
      code.startsWith("08") ||
      POSTGRES_SHUTDOWN_CODES.has(code))
  );
}

export class PgSqlClient implements SqlQueryClient {
  constructor(private readonly pool: Pool) {}

  async query<T>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: T[] }> {
    try {
      const result = await this.pool.query(
        text,
        values === undefined ? undefined : [...values],
      );
      return { rows: result.rows as T[] };
    } catch (error) {
      if (isDatabaseAvailabilityError(error)) {
        throw new DatabaseDependencyError();
      }
      throw error;
    }
  }
}
