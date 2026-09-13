// 애니메이션 전용 glb 에서 메시·스킨(중복 body)을 지우고 뼈대+애니메이션만 남긴다.
// 클립 이름도 "mixamo.com"(mixamo 는 파일마다 늘 이 이름 하나만 쓴다) 대신
// 우리 슬롯 이름(idle·walk·run·attack·hit·dodge·death·interaction)으로 바꿔 준다.
//
// 쓰는 법: node slim_anim.js <in.glb> <out.glb> <slotName>
// 필요한 패키지: npm install @gltf-transform/core
const { NodeIO } = require('@gltf-transform/core');

const [, , inPath, outPath, slotName] = process.argv;
if (!inPath || !outPath || !slotName) {
  console.error('usage: node slim_anim.js <in.glb> <out.glb> <slotName>');
  process.exit(1);
}

async function main() {
  const io = new NodeIO();
  const doc = await io.read(inPath);
  const root = doc.getRoot();

  for (const node of root.listNodes()) {
    if (node.getMesh()) { node.setMesh(null); }
    if (node.getSkin()) { node.setSkin(null); }
  }
  for (const mesh of root.listMeshes()) { mesh.dispose(); }
  for (const skin of root.listSkins()) { skin.dispose(); }
  for (const mat of root.listMaterials()) { mat.dispose(); }
  for (const tex of root.listTextures()) { tex.dispose(); }

  const clips = root.listAnimations();
  clips.forEach((c) => c.setName(slotName));

  await io.write(outPath, doc);
  console.log(outPath, '완료 — 애니메이션', clips.length, '개, 이름:', slotName);
}

main().catch((e) => { console.error(e); process.exit(1); });
