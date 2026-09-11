import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { localStatus, reportLocalStatus } from './local-status.mjs';
const cwd=fileURLToPath(new URL('..',import.meta.url));
try {
  const status = await localStatus();
  if (status !== 'available') process.exit(reportLocalStatus(status));
} catch (error) {
  console.error('Impossibile controllare la porta 5180:', error.message);
  process.exit(1);
}
if (!process.argv.includes('--no-build')) {
  const built=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build','--configLoader','native'],{cwd,stdio:'inherit',windowsHide:true});
  if (built.status!==0) process.exit(built.status || 1);
}
const server=spawn(process.execPath,['server/index.mjs'],{cwd,stdio:'inherit',windowsHide:true,env:{...process.env,PORT:'5180',APP_ORIGIN:'http://127.0.0.1:5180',LOCAL_MODE:'true'}});
server.on('error',error=>{console.error(error.message);process.exitCode=1;});
server.on('exit',code=>{process.exitCode=code || 0;});
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>server.kill());
