/* three.js 를 통째로 window.THREE 로 내보낸다.
   ESM 만 배포되는 버전이라, file:// 에서 <script type="module"> 이 막히는
   PC 단독판을 위해 IIFE 로 다시 묶는다.

   본체 말고 여기 얹은 것 (3D 전환 PHASE 3 — GLB 파이프라인)
     GLTFLoader    glTF 2.0 / .glb 를 읽는다. three 본체에는 없고 examples 에 있다
     SkeletonUtils 뼈대가 있는 모델을 여러 벌 세울 때 skinned clone 을 뜬다
                   (그냥 .clone() 하면 뼈대를 공유해 배우 스물이 같이 걷는다)
   DRACOLoader·KTX2Loader 는 **넣지 않았다** — 둘 다 별도 wasm/js 디코더 파일을
   런타임에 받아야 해서 file:// 단독판에서 못 쓴다. 압축 모델을 쓸 때 다시 본다.
   2026-09-07 — 그 "압축 모델을 쓸 때"가 왔다(마을 진입 직후 먹통 신고, GLB
   총량이 너무 크다). Draco/KTX2 대신 **MeshoptDecoder**를 골랐다 — 이건
   wasm이 파일 안에 base64로 통째로 박혀 있어(`meshopt_decoder.module.js`
   24KB 단일 파일) 별도 디코더 파일을 안 받아도 된다, file:// 단독판에서도
   그대로 도는 이유다. 지오메트리+애니메이션 키프레임까지 압축해 준다. */
export * from 'three';
export { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
export * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
export { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
