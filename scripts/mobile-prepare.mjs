import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import plist from 'plist';
import { root, readTarget, saveTarget } from './mobile-target.mjs';

const args = process.argv.slice(2);
const target = readTarget(args);
if (!process.env.CI) saveTarget(target);
const env = { ...process.env, VITE_MOBILE_API_ORIGIN: target.origin, VITE_MOBILE_LOCAL_TEST: String(target.localTest) };
function run(script, params) {
  const result = spawnSync(process.execPath, [script, ...params], { cwd: root, env, stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
run('node_modules/vite/bin/vite.js', ['build', '--configLoader', 'native', '--mode', 'mobile', '--outDir', 'dist-mobile']);
const platform = args.find(arg => arg.startsWith('--platform='))?.split('=')[1];
if (platform && !['android', 'ios'].includes(platform)) throw new Error('Piattaforma non valida. Usa android oppure ios.');
run('node_modules/@capacitor/cli/bin/capacitor', ['sync', ...(platform ? [platform] : [])]);

const url = new URL(target.origin);
const httpLocal = target.localTest && url.protocol === 'http:';
const xml = '<?xml version="1.0" encoding="utf-8"?>\n<network-security-config>\n  <base-config cleartextTrafficPermitted="false" />\n'
  + (httpLocal ? `  <domain-config cleartextTrafficPermitted="true"><domain includeSubdomains="false">${url.hostname}</domain></domain-config>\n` : '')
  + '</network-security-config>\n';
const androidConfig = join(root, 'android/app/src/main/res/xml/network_security_config.xml');
if (existsSync(join(root, 'android'))) { mkdirSync(join(root, 'android/app/src/main/res/xml'), { recursive: true }); writeFileSync(androidConfig, xml); }
const iosBase = join(root, 'ios/App/App/Info.plist');
if (existsSync(iosBase)) {
  const info = plist.parse(readFileSync(iosBase, 'utf8'));
  if (httpLocal) info.NSAppTransportSecurity = { NSAllowsLocalNetworking: true, NSExceptionDomains: { [url.hostname]: { NSExceptionAllowsInsecureHTTPLoads: true, NSIncludesSubdomains: false } } };
  else delete info.NSAppTransportSecurity;
  writeFileSync(join(root, 'ios/App/App/Info.runtime.plist'), plist.build(info));
}
console.log(`App mobile preparata. Backend: ${target.origin}. Collaudo locale: ${target.localTest ? 'sì' : 'no'}.`);
