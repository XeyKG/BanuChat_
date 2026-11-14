import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const env = {...process.env, EXPO_NO_DOTENV:'1', EXPO_NO_TELEMETRY:'1'};
for (const key of Object.keys(env)) if (key.startsWith('EXPO_PUBLIC_')) delete env[key];
env.EXPO_PUBLIC_DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === 'synthetic' ? 'synthetic' : 'ccd_authenticated';
const publicOrigin = process.env.EXPO_PUBLIC_WEB_ORIGIN;
if (publicOrigin !== undefined) {
  if (env.EXPO_PUBLIC_DEMO_MODE !== 'synthetic' || !/^https:\/\/(?:[a-z0-9-]+\.)+[a-z][a-z0-9-]*$/u.test(publicOrigin) || publicOrigin.endsWith('.localhost')) {
    throw new Error('La exportación pública requiere modo sintético y un origen HTTPS canónico.');
  }
  env.EXPO_PUBLIC_WEB_ORIGIN = publicOrigin;
}
const cli = fileURLToPath(new URL('../node_modules/expo/bin/cli',import.meta.url));
const result = spawnSync(process.execPath,[cli,'export','--platform','web','--output-dir','.expo/unified-web'],{
  cwd:fileURLToPath(new URL('../',import.meta.url)), env, stdio:'inherit',windowsHide:true,
});
process.exitCode = result.status ?? 1;
