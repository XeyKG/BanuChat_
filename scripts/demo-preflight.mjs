// Read-only launcher: report missing local dependencies without a loader stack.
import {createRequire} from 'node:module';
const api=createRequire(new URL('../backend/api/package.json',import.meta.url));
try {
 api('tsx/esm/api').register();
 const {runPreflight}=await import('../backend/api/scripts/demo-preflight.mts');
 process.exitCode=await runPreflight(process.argv.slice(2));
} catch {
 console.log(JSON.stringify({status:'NOT_READY',reason:'PREFLIGHT_OR_LOCAL_DEPENDENCIES_UNAVAILABLE_NO_SERVICES_CHANGED'}));
 process.exitCode=1;
}
