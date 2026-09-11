import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './mobile-target.mjs';

const env = { ...process.env };
const localSdk = join(root, 'work/android-sdk');
if (!env.ANDROID_HOME && existsSync(join(localSdk, 'platforms/android-36'))) env.ANDROID_HOME = localSdk;
env.ANDROID_HOME ||= env.ANDROID_SDK_ROOT;
if (!env.ANDROID_HOME) throw new Error('Installa Android SDK e imposta ANDROID_HOME prima di compilare. Consulta MOBILE.md.');
env.ANDROID_SDK_ROOT = env.ANDROID_HOME;
env.ANDROID_USER_HOME ||= join(root, 'work/android-user');
env.GRADLE_USER_HOME ||= join(root, 'work/gradle');
mkdirSync(join(root, 'work/android-user'), { recursive: true });
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
run(process.execPath, ['scripts/mobile-prepare.mjs', '--platform=android', ...process.argv.slice(2)]);
// Invoca direttamente Java: evita quoting di percorsi e script batch su Windows.
const java = env.JAVA_HOME ? join(env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java') : 'java';
run(java, ['-classpath', join(root, 'android/gradle/wrapper/gradle-wrapper.jar'), 'org.gradle.wrapper.GradleWrapperMain', '--no-daemon', '--console=plain', 'assembleDebug'], join(root, 'android'));
const destination = join(root, 'work/mobile-builds'); mkdirSync(destination, { recursive: true });
copyFileSync(join(root, 'android/app/build/outputs/apk/debug/app-debug.apk'), join(destination, 'ClickSocial-test.apk'));
console.log('APK pronto in work/mobile-builds/ClickSocial-test.apk.');
