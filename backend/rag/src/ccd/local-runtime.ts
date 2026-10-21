import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Pool } from 'pg';
import { invariant } from '../db/errors.js';
import { assertCcdDatabase } from './ingest.js';

const execute = promisify(execFile);
/** Verify Docker labels, volume and loopback mapping before connecting or writing. */
export async function connectCcdLocal() {
  const port = process.env.CCD_POSTGRES_PORT ?? '55433';
  invariant(/^\d+$/.test(port) && Number(port) >= 1024 && Number(port) <= 65535);
  const ids = (await execute('docker', ['ps', '--filter', 'label=com.docker.compose.project=banuchat-ccd-dev',
    '--filter', 'label=com.docker.compose.service=postgres-ccd', '--format', '{{.ID}}'], { windowsHide: true })).stdout.trim().split('\n');
  invariant(ids.length === 1 && /^[a-f0-9]+$/.test(ids[0]!));
  const inspected: unknown = JSON.parse((await execute('docker', ['inspect', ids[0]!], { windowsHide: true })).stdout);
  invariant(Array.isArray(inspected) && inspected.length === 1);
  const container = inspected[0] as { Id: string; Config: { Labels: Record<string, string>; Image: string };
    State: { Running: boolean }; Mounts: { Type: string; Name: string; Destination: string }[];
    NetworkSettings: { Ports: Record<string, { HostIp: string; HostPort: string }[]> } };
  invariant(container.Config.Labels['com.docker.compose.project'] === 'banuchat-ccd-dev'
    && container.Config.Labels['com.docker.compose.service'] === 'postgres-ccd'
    && container.Config.Image === 'pgvector/pgvector:pg16' && container.State.Running);
  const mounts = container.Mounts.filter(mount => mount.Destination === '/var/lib/postgresql/data');
  invariant(mounts.length === 1 && mounts[0]?.Type === 'volume'
    && mounts[0].Name === 'banuchat-ccd-dev_ccd_pgvector_data');
  const bindings = container.NetworkSettings.Ports['5432/tcp'];
  invariant(bindings?.length === 1 && bindings[0]?.HostIp === '127.0.0.1' && bindings[0].HostPort === port);
  invariant(process.env.CCD_POSTGRES_USER?.trim() && process.env.CCD_POSTGRES_PASSWORD?.trim());
  const pool = new Pool({ host: '127.0.0.1', port: Number(port), database: 'banuchat_ccd_dev',
    user: process.env.CCD_POSTGRES_USER, password: process.env.CCD_POSTGRES_PASSWORD, connectionTimeoutMillis: 5000 });
  try {
    await assertCcdDatabase(pool);
    return { pool, identity: { container_id: container.Id, service: 'postgres-ccd', project: 'banuchat-ccd-dev',
      database: 'banuchat_ccd_dev', volume: mounts[0].Name, port: Number(port) } };
  } catch (error) { await pool.end(); throw error; }
}
