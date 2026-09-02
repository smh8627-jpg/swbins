// Hips 의 수평(X·Z) 이동을 "제자리" 로 되돌린다 — 구르기·죽음처럼 Mixamo 가
// "In Place" 없이 내보낸 클립이 매 반복마다 옆으로 흘러가지 않게, 끝 값을 시작
// 값에 맞춰 선형으로 깎는다. 세로(Y, 웅크림·통통거림)는 안 건드린다.
//
// 쓰는 법: node detrend_root.js <in.glb> <out.glb>
// 필요한 패키지: npm install @gltf-transform/core
const { NodeIO } = require('@gltf-transform/core');

async function main() {
  const [, , inPath, outPath] = process.argv;
  if (!inPath || !outPath) {
    console.error('usage: node detrend_root.js <in.glb> <out.glb>');
    process.exit(1);
  }
  const io = new NodeIO();
  const doc = await io.read(inPath);
  const root = doc.getRoot();

  for (const anim of root.listAnimations()) {
    for (const ch of anim.listChannels()) {
      const node = ch.getTargetNode();
      if (!node || !/hip/i.test(node.getName()) || ch.getTargetPath() !== 'translation') { continue; }
      const sampler = ch.getSampler();
      const output = sampler.getOutput();
      const arr = output.getArray().slice();
      const n = arr.length / 3;
      if (n < 2) { continue; }
      const dx = arr[(n - 1) * 3 + 0] - arr[0];
      const dz = arr[(n - 1) * 3 + 2] - arr[2];
      if (Math.abs(dx) < 1e-4 && Math.abs(dz) < 1e-4) { continue; }
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        arr[i * 3 + 0] -= dx * t;
        arr[i * 3 + 2] -= dz * t;
      }
      output.setArray(arr);
      console.log(anim.getName(), '보정 dx=', dx.toFixed(3), 'dz=', dz.toFixed(3));
    }
  }

  await io.write(outPath, doc);
  console.log('완료 ->', outPath);
}
main().catch((e) => { console.error(e); process.exit(1); });
