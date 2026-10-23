import type { SqlQueryClient } from '../data/sql-client.js';
import { DocumentRetrievalError } from './document-retrieval-errors.js';
import {
  normalizeDocumentRetrievalRow,
  validateDocumentRetrievalInput,
  type DocumentChunkRetriever,
} from './document-retrieval.js';

/** Trusted v2 composition only. SQL enforces current synthetic scope; v1 keeps its query. */
export const retrieveAuthenticatedDocumentChunks: DocumentChunkRetriever = async (client, input) => {
  const validated = validateDocumentRetrievalInput(input);
  try {
    const result = await client.query<unknown>(
      'SELECT * FROM banuchat_auth.retrieve_document_chunks($1::uuid,$2::public.vector,$3::integer)',
      [validated.releaseId, validated.queryVector, validated.topK],
    );
    return result.rows.map(row => normalizeDocumentRetrievalRow(row, validated.releaseId));
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === 'P0409') throw new DocumentRetrievalError('release_not_available');
    if (code === 'P0400') throw new DocumentRetrievalError('invalid_argument');
    // P0403/P0500 and dependency errors keep their existing HTTP authorization/sanitization.
    throw error;
  }
};

/** Fail product startup without 010; never grant missing privileges at runtime. */
export async function assertAuthenticatedDocumentReads(sql: SqlQueryClient): Promise<void> {
  const result = await sql.query<{ available: boolean }>(`SELECT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    JOIN pg_catalog.pg_roles r ON r.oid=p.proowner
    WHERE p.oid=to_regprocedure('banuchat_auth.retrieve_document_chunks(uuid,public.vector,integer)')
      AND n.nspname='banuchat_auth' AND p.prosecdef AND p.provolatile='s'
      AND r.rolname='banuchat_auth_executor' AND NOT r.rolcanlogin AND NOT r.rolsuper
      AND pg_catalog.has_function_privilege(p.oid,'EXECUTE')
      AND NOT pg_catalog.has_any_column_privilege('banuchat.document_chunks','SELECT')
  ) AS available`);
  if (result.rows.length !== 1 || result.rows[0]?.available !== true) {
    throw new Error('AUTHENTICATED_DOCUMENT_READS_UNAVAILABLE');
  }
}
