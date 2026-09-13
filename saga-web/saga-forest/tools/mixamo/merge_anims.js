// 슬롯별로 슬림화한 애니메이션 glb 여럿을 뼈대 하나(첫 파일 것)에 클립 여러 개로
// 합친다. `asset3d.js` 의 ANIM_SRC(단일 파일, 여러 클립) 패턴에 맞춘다.
//
// 쓰는 법: node merge_anims.js <out.glb> <in1.glb> <in2.glb> ...
//   (각 in 파일은 slim_anim.js 를 거쳐 이미 이름이 붙어 있어야 한다)
// 필요한 패키지: npm install @gltf-transform/core
const { NodeIO } = require('@gltf-transform/core');

async function main() {
  const [, , outPath, ...inputs] = process.argv;
  if (!outPath || inputs.length < 1) {
    console.error('usage: node merge_anims.js <out.glb> <in1.glb> [in2.glb ...]');
    process.exit(1);
  }
  const io = new NodeIO();
  const baseDoc = await io.read(inputs[0]);
  const baseRoot = baseDoc.getRoot();
  const nodeByName = {};
  for (const n of baseRoot.listNodes()) { nodeByName[n.getName()] = n; }

  for (let fi = 1; fi < inputs.length; fi++) {
    const srcDoc = await io.read(inputs[fi]);
    const srcRoot = srcDoc.getRoot();
    for (const srcAnim of srcRoot.listAnimations()) {
      const dstAnim = baseDoc.createAnimation(srcAnim.getName());
      for (const ch of srcAnim.listChannels()) {
        const srcNode = ch.getTargetNode();
        const dstNode = srcNode ? nodeByName[srcNode.getName()] : null;
        if (!dstNode) { console.warn('  스킵(대상 노드 없음):', srcNode && srcNode.getName()); continue; }
        const sampler = ch.getSampler();
        const input = sampler.getInput();
        const output = sampler.getOutput();

        const dstInput = baseDoc.createAccessor()
          .setType(input.getType()).setArray(input.getArray().slice());
        const dstOutput = baseDoc.createAccessor()
          .setType(output.getType()).setArray(output.getArray().slice());

        const dstSampler = baseDoc.createAnimationSampler()
          .setInput(dstInput).setOutput(dstOutput)
          .setInterpolation(sampler.getInterpolation());
        const dstChannel = baseDoc.createAnimationChannel()
          .setTargetNode(dstNode).setTargetPath(ch.getTargetPath())
          .setSampler(dstSampler);
        dstAnim.addSampler(dstSampler).addChannel(dstChannel);
      }
      console.log('합침:', srcAnim.getName(), '채널', srcAnim.listChannels().length, '개');
    }
  }

  await io.write(outPath, baseDoc);
  console.log('완료 ->', outPath, '애니메이션', baseDoc.getRoot().listAnimations().length, '개');
}

main().catch((e) => { console.error(e); process.exit(1); });
