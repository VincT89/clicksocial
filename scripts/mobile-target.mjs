import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mobileOrigin } from '../shared/mobile-config.mjs';

export const root = fileURLToPath(new URL('..', import.meta.url));
export const targetFile = join(root, 'work', 'mobile-target.json');
export function readTarget(args = process.argv.slice(2)) {
  const option = name => args.find(arg => arg.startsWith(name + '='))?.slice(name.length + 1);
  let stored = {};
  if (existsSync(targetFile) && !process.env.CI) stored = JSON.parse(readFileSync(targetFile, 'utf8'));
  const localTest = args.includes('--local') || (process.env.MOBILE_LOCAL_TEST !== undefined
    ? process.env.MOBILE_LOCAL_TEST === 'true'
    : !option('--api') && !process.env.MOBILE_API_ORIGIN && stored.localTest === true);
  const origin = mobileOrigin(option('--api') || process.env.MOBILE_API_ORIGIN || stored.origin, localTest);
  return { origin, localTest };
}
export function saveTarget(target) {
  mkdirSync(resolve(root, 'work'), { recursive: true });
  writeFileSync(targetFile, JSON.stringify(target, null, 2) + '\n');
}
