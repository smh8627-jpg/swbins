# Vitruvian × Mesh2Motion 실사 캐릭터 시험판 (2026-09-05)

**아직 게임에 안 물렸다.** HERO_RECIPES(`js/asset3d.js`)에도 안 넣었고, `ASSET_LICENSES.md`에도
아직 안 적었다 — 검증용 산출물이다. 다음 세션이 실제로 쓸지 결정한다.

## 이게 뭔가

"무료로 더 찾아봐줘"(2026-09-05) → Mesh2Motion(mesh2motion.org, MIT+CC0)이라는
새 도구를 발견 → 실제로 한 벌 뽑아본 결과물. `vitruvian_v1.glb` 하나:

- 몸: Vitruvian Project(CC0, itch.io `withinamnesia/vitruvian-project-cc0`)의
  `VitruvianProject142.blend` — 사진측량 기반 실사 인체, 3.7만 정점 원본을
  약 9%로 데시메이트
- 피부: 같은 프로젝트의 4K 텍스처 zip에서 뽑은 BaseColor
  (얼굴·몸통·팔은 African 변종, 다리는 African 변종이 zip에 없어서
  범용 Utility 변종으로 대체 — **다리 색조가 몸통보다 밝게 튄다, 알려진 흠**)
- 리그·애니메이션: Mesh2Motion의 Human 스켈레톤(28본, Single Hand Bone),
  관절은 어깨·팔꿈치·손·엉덩이·무릎·발을 손으로 맞췄다(손가락 단순화)
- 애니메이션 6개: Fighting_Idle · Walk · Run_Female · Sword_Attack ·
  Hit_Chest · Death_A — 전부 Mesh2Motion 자체 CC0 라이브러리(162종 중 선택),
  **Mixamo 안 거침** — 이 판이 지금까지 못 넘던 재배포 라이선스 벽을 피해 간다

## 왜 이게 중요한가

`HANDOFF.md`(2026-09-04, "캐릭터 실사화 재조사 후 결론")가 "무료 애니메이션
포함 실사 인간 팩은 없다"고 못박고 이 조사를 닫았는데, 그건 **"완성된 팩을
찾는다"** 는 전제에서만 맞다. Mesh2Motion처럼 **CC0 정적 스캔 메시에
직접 리깅·애니메이션을 입히는 도구**는 그 전제를 비켜 간다. 다만 대가가
있다 — 관절 맞추기는 자동화가 아니라 **사람이 마우스로 하는 수작업**이고,
이번 한 벌에 실제로 시간이 들었다(대충 5~10분 수준, 손가락은 생략).

## 남은 문제 · 다음 걸음

1. **다리 피부색 불일치** — Vitruvian 4K 텍스처 zip에 African Legs
   BaseColor가 없다(Face/Torso/Arms만 있음). 8K zip에도 없었다. 다른
   해상도·팩을 더 뒤지거나, 다리만 Photoshop/Blender에서 톤 보정하거나,
   그냥 이 캐릭터는 포기하고 파이프라인만 재사용해 다른 인물로 다시 뽑는
   방법이 있다
2. **아직 이 판 GLB 규격에 안 맞다** — `js/asset3d.js`의 `HERO_RECIPES`가
   기대하는 뼈대 이름(`SKIP_AUTORETARGET` 등)과 이 GLB의 뼈대(Mesh2Motion
   Human 스켈레톤, 28본)가 같은지 확인 안 했다. 그대로 넣으면 리타깃이
   깨질 수 있다 — `js/asset3d.js`의 실사 인물 리타깃 코드(981번째 줄
   `assembleHero()` 부근)부터 볼 것
3. **관절 정밀도가 낮다** — 손가락은 Single Hand Bone(단순화)이고, 무릎·팔꿈치도
   대략만 맞췄다. 실제로 이 판에 쓸 거면 다시 한번 더 꼼꼼히 맞추는 게 낫다
4. **더 뽑을지 결정** — 이 파이프라인으로 인물을 더 뽑으려면 인물 한 벌당
   위 수작업(관절 맞추기)이 매번 든다. 대량 생산엔 안 맞고, "이 캐릭터만은
   꼭 실사로" 싶은 한둘에 쓰는 게 현실적이다

## 원본 자료가 어디 있나

세션이 끝나면 스크래치 폴더(`/tmp` 격)는 사라지지만 이 파일들은 실제
디스크(`C:\Users\Windows\Downloads\`)에 남아 있다 — 재작업 시 다시
받을 필요 없다:

```
VitruvianProject142.blend              162MB  (단일 인물, Blender 원본)
Vitruvian-Project-Textures-4K.zip      826MB  (BaseColor 등 텍스처, 필요한 것 사용)
Vitruvian-Project-Textures-8K.zip      249MB  (Roughness/Height만, BaseColor 없음)
```

라이선스: CC0 1.0 Universal (Vitruvian Project · Mesh2Motion 둘 다).
`assets/ASSET_LICENSES.md`에 실제로 채택하면 그때 정식으로 옮겨 적을 것.
