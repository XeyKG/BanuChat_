export interface SqlQueryClient {
  query<T>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: T[] }>;
}
