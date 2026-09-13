/**
 * 폰에서 쓰기 위한 자체 서명 인증서를 만든다.
 * ---------------------------------------------------------------
 * 왜 필요한가: 아이폰 사파리는 **안전하지 않은 출처(http)에서 위치 API 를 막는다.**
 * GPS 산책이 이 게임의 핵심이므로, 폰에서 제대로 하려면 https 가 있어야 한다.
 * (서비스 워커 = 오프라인 캐시도 https 에서만 붙는다)
 *
 * 만드는 것 (server/certs/):
 *   dg-ca.crt      ← 이 파일을 **아이폰에 설치하고 신뢰**시킨다 (한 번만)
 *   dg-ca.key
 *   dg-server.crt  ← 서버가 쓰는 인증서 (SAN 에 이 PC 의 IP·호스트명이 들어간다)
 *   dg-server.key
 *
 * 이름을 ASCII 로 쓴 이유: openssl 이 설정 파일의 한글 CN 을 이중 인코딩해서
 * 폰의 "인증서 신뢰 설정" 목록에 깨진 글자로 뜬다. 찾을 수 없으면 신뢰를 켤 수 없다.
 *
 * 실행: node server/make-cert.mjs
 *       node server/make-cert.mjs 192.168.0.5     (주소를 더 넣고 싶을 때)
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'certs');

/** 이 PC 의 사설 IP 들 */
function localIps() {
  const out = [];
  const ifs = os.networkInterfaces();
  for (const name of Object.keys(ifs)) {
    for (const a of ifs[name] || []) {
      if (a.family === 'IPv4' && !a.internal) { out.push(a.address); }
    }
  }
  return out;
}

const extra = process.argv.slice(2);
const ips = Array.from(new Set(['127.0.0.1'].concat(localIps(), extra.filter((x) => /^[0-9.]+$/.test(x)))));
const names = Array.from(new Set(['localhost', os.hostname(), os.hostname().toLowerCase()]
  .concat(extra.filter((x) => !/^[0-9.]+$/.test(x)))));

fs.mkdirSync(OUT, { recursive: true });

const san = names.map((n, i) => 'DNS.' + (i + 1) + ' = ' + n)
  .concat(ips.map((ip, i) => 'IP.' + (i + 1) + ' = ' + ip)).join('\n');

const conf = `[req]
distinguished_name = dn
x509_extensions = v3_ca
prompt = no

[dn]
CN = DeungyongGO Local CA
O = deungyong-go

[v3_ca]
basicConstraints = critical, CA:TRUE
keyUsage = critical, keyCertSign, cRLSign
subjectKeyIdentifier = hash
`;

const leafConf = `[req]
distinguished_name = dn
req_extensions = v3_req
prompt = no

[dn]
CN = deungyong-go
O = deungyong-go

[v3_req]
basicConstraints = CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt

[alt]
${san}
`;

const caConfPath = path.join(OUT, 'ca.cnf');
const leafConfPath = path.join(OUT, 'leaf.cnf');
fs.writeFileSync(caConfPath, conf, 'utf8');
fs.writeFileSync(leafConfPath, leafConf, 'utf8');

function ssl(args) {
  execSync('openssl ' + args, { cwd: OUT, stdio: ['ignore', 'ignore', 'pipe'] });
}

try {
  // 뿌리 CA (10년) — 이걸 폰에 심는다
  ssl('req -x509 -newkey rsa:2048 -nodes -keyout dg-ca.key -out dg-ca.crt ' +
    '-days 3650 -sha256 -config ca.cnf');

  // 서버 인증서 — iOS 는 825일 넘는 서버 인증서를 거부하므로 넉넉히 365일
  ssl('req -newkey rsa:2048 -nodes -keyout dg-server.key -out dg-server.csr ' +
    '-sha256 -config leaf.cnf');
  ssl('x509 -req -in dg-server.csr -CA dg-ca.crt -CAkey dg-ca.key -CAcreateserial ' +
    '-out dg-server.crt -days 365 -sha256 -extfile leaf.cnf -extensions v3_req');

  fs.rmSync(path.join(OUT, 'dg-server.csr'), { force: true });

  console.log('인증서를 만들었습니다 → ' + OUT);
  console.log('  들어간 주소: ' + names.join(', ') + ' / ' + ips.join(', '));
  console.log('');
  console.log('아이폰에서 할 일 (한 번만):');
  console.log('  1) dg-ca.crt 를 폰으로 보낸다 (메일 첨부 · 카톡 · AirDrop 아무거나)');
  console.log('  2) 파일을 열면 "프로파일 다운로드" → 설정 앱에서 설치');
  console.log('  3) 설정 → 일반 → 정보 → 인증서 신뢰 설정 → "DeungyongGO Local CA" 켜기');
  console.log('     (3번을 안 하면 https 가 여전히 경고를 냅니다)');
} catch (e) {
  console.error('openssl 실행에 실패했습니다.');
  console.error(String((e && e.stderr) || e).slice(0, 600));
  console.error('\nGit for Windows 의 openssl 이 PATH 에 있는지 확인하세요.');
  process.exit(1);
}
