import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const env = {...process.env, EXPO_NO_DOTENV:'1', EXPO_NO_TELEMETRY:'1'};
for (const key of Object.keys(env)) if (key.startsWith('EXPO_PUBLIC_')) delete env[key];
env.EXPO_PUBLIC_DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === 'synthetic' ? 'synthetic' : 'ccd_authenticated';
const cli = fileURLToPath(new URL('../node_modules/expo/bin/cli',import.meta.url));
const result = spawnSync(process.execPath,[cli,'export','--platform','web','--output-dir','.expo/unified-web'],{
  cwd:fileURLToPath(new URL('../',import.meta.url)), env, stdio:'inherit',windowsHide:true,
});
process.exitCode = result.status ?? 1;
