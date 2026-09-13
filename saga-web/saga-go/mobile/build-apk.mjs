/**
 * 디버그 APK 를 굽는다.
 * ---------------------------------------------------------------
 * 이 PC 에는 JDK 8 이 기본이라 Gradle 이 돌지 않는다. 그래서 JDK 17 을 골라 준다.
 * 경로가 다르면 JAVA_HOME · ANDROID_SDK_ROOT 를 직접 주고 실행하면 된다.
 *
 * 주의: Node 20 은 .bat 를 직접 spawn 하지 못한다(EINVAL).
 *       그래서 셸을 거쳐 부르고, 경로는 따옴표로 묶는다.
 *
 * 이 파일은 **gradle 만** 돈다. www 를 안드로이드 자산으로 옮기는 것은
 * `npx cap sync` 의 몫이라, 이것만 단독으로 부르면 옛 자산으로 APK 가 구워진다.
 * 그래서 아래에서 자산이 www 보다 낡았는지 먼저 확인하고 멈춘다.
 * 정식 경로는 `npm run apk` (www 준비 → cap sync → 이 파일).
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AND = path.join(HERE, 'android');

const CANDIDATES = [
  process.env.JAVA_HOME,
  'C:/Users/DAOU/dev-tools/jdk17-extract/jdk-17.0.19+10',
  'C:/Program Files/Android/Android Studio/jbr'
].filter(Boolean);

/**
 * 17 이상인지 확인한다. 이 PC 의 JAVA_HOME 은 JDK 8 을 가리키고 있어서
 * 그대로 쓰면 'compatible with Java 8' 로 Gradle 이 죽는다.
 */
function javaMajor(home) {
  try {
    const rel = fs.readFileSync(path.join(home, 'release'), 'utf8');
    const m = /JAVA_VERSION="?([0-9]+)/.exec(rel);
    return m ? Number(m[1]) : 0;
  } catch {
    return 0;
  }
}

const java = CANDIDATES.find((p) =>
  fs.existsSync(path.join(p, 'bin', 'java.exe')) && javaMajor(p) >= 17);
if (!java) {
  console.error('JDK 17 이상을 찾지 못했습니다. JAVA_HOME 을 JDK 17 로 지정하세요.');
  console.error('후보: ' + CANDIDATES.join(' / '));
  process.exit(1);
}
console.log('JAVA_HOME =', java);

/* 안드로이드 자산이 www 와 다르면 멈춘다 —
   여기서 걸러 주지 않으면 "빌드 성공"인데 내용은 예전 것인 APK 가 나온다.
   시각(mtime)은 cap sync 가 그대로 물려주므로 소용이 없다 → 내용을 직접 견준다. */
function fileMap(root) {
  const out = new Map();
  if (!fs.existsSync(root)) { return out; }
  const walk = (dir, base) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name), rel = base ? base + '/' + e.name : e.name;
      if (e.isDirectory()) { walk(full, rel); }
      else { out.set(rel, crypto.createHash('sha1').update(fs.readFileSync(full)).digest('hex')); }
    }
  };
  walk(root, '');
  return out;
}

const WWW = path.join(HERE, 'www');
const ASSETS = path.join(AND, 'app', 'src', 'main', 'assets', 'public');
if (fs.existsSync(WWW)) {
  const a = fileMap(WWW), b = fileMap(ASSETS);
  const diff = [];
  for (const [k, v] of a) { if (b.get(k) !== v) { diff.push(b.has(k) ? '달라짐 ' + k : '빠짐 ' + k); } }
  /* cap sync 가 스스로 넣는 것들은 www 에 없는 게 정상이다 */
  const INJECTED = (k) => /^cordova(_plugins)?\.js$/.test(k) || k.startsWith('plugins/');
  for (const k of b.keys()) { if (!a.has(k) && !INJECTED(k)) { diff.push('남아 있음 ' + k); } }
  if (diff.length) {
    console.error('안드로이드 자산이 www 와 다릅니다 (' + diff.length + '건) — 이대로 구우면 옛 내용이 담깁니다.');
    const NL = String.fromCharCode(10) + '  ';
    console.error('  ' + diff.slice(0, 6).join(NL) + (diff.length > 6 ? NL + '…' : ''));
    console.error('  npx cap sync android   을 먼저 돌리거나, 그냥  npm run apk  를 쓰세요.');
    process.exit(1);
  }
}

const sdk = (process.env.ANDROID_SDK_ROOT || 'C:/Users/DAOU/dev-tools/android-sdk')
  .split('\\').join('/');
fs.writeFileSync(path.join(AND, 'local.properties'), 'sdk.dir=' + sdk + '\n');
console.log('sdk.dir =', sdk);

const cmd = '"' + path.join(AND, 'gradlew.bat') + '" assembleDebug --no-daemon';
try {
  execSync(cmd, {
    cwd: AND,
    stdio: 'inherit',
    env: Object.assign({}, process.env, { JAVA_HOME: java })
  });
} catch (e) {
  console.error('Gradle 빌드 실패 — 위 출력을 보세요 (JDK 17 · Android SDK 확인).');
  process.exit(1);
}

const apk = path.join(AND, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
if (fs.existsSync(apk)) {
  const mb = (fs.statSync(apk).size / 1048576).toFixed(1);
  console.log('APK -> ' + apk + ' (' + mb + ' MB)');
} else {
  console.log('APK 를 찾지 못했습니다');
}
