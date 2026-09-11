# ARCHITECTURE

master.md 6·31장의 구조를 그대로 따른다. 여기는 실제로 만든 폴더만 짧게 기록한다.
**2026-09-11 갱신 — Phase 1 직후 적어 둔 뒤로 한참 안 고쳐서 실제 구조와
많이 어긋나 있었다(`data/`는 결국 안 만들었고 `saga_core/`는 2026-09-11까지
정말 빈 폴더였다). 지금 저장소에 실제로 있는 파일 기준으로 다시 썼다.**

```text
saga-godot/
├── project.godot            # Godot 4.x 프로젝트 설정, Main.tscn
├── saga_core/                # 5개 게임 공통 시스템
│   └── data/
│       └── characters.gd     # 인물 105명(웹판 js/data.js HEROES 그대로,
│                              # id 불변) — LEGACY_FEATURE_AUDIT.md 6장 결정,
│                              # 2026-09-11에야 실제로 만듦. REALM 전용 무장은
│                              # 아직 안 옮김(그 차례가 왔을 때 최신본으로)
├── games/
│   └── saga_go/               # GO Vertical Slice + 콘텐츠 확장 — 유일하게
│       │                      # 손댄 게임(39장 순서, DUNGEON 이후는 아직)
│       ├── data/               # test_map · duel_rules · party_state ·
│       │                       # quest_state · save_state (전부 autoload
│       │                       # 싱글턴이거나 순수 데이터)
│       ├── player/              # Player.tscn · player.gd · camera_rig.gd
│       ├── world/               # TestVillage.tscn과 그 빌더/사건 스크립트
│       │                        # (terrain·landmarks·vegetation·npc_builder·
│       │                        # bandit_encounter·simple_event·hero_encounter 등)
│       └── ui/                  # MobileHUD.tscn과 그 라벨/버튼/헬퍼
│                                 # (choice_prompt·toast는 world/ 스크립트가
│                                 # 같이 쓰는 공용 헬퍼)
├── assets/                    # characters/ buildings/ dungeon/ rocks/
│                              # vegetation/ environment/ — CC0 Kenney 킷
│                              # 여러 개(Nature·Fantasy Town·Blocky
│                              # Characters·Modular Cave), ASSET_GUIDE.md 참고.
│                              # 아직 안 받은 갈래(enemies/bosses/animals/
│                              # weapons/armor/effects/UI/audio)는 폴더도 없음
└── docs/
    ├── PROJECT_STATE.md         # 완료/현재/다음 — 세션마다 갱신
    ├── ARCHITECTURE.md          # 이 파일
    ├── LEGACY_FEATURE_AUDIT.md  # Phase 2, 다섯 웹판 KEEP/REWORK/MERGE/DROP
    ├── VERTICAL_SLICE.md        # Phase 3, GO 슬라이스 설계+완료 조건
    └── ASSET_GUIDE.md           # primitive→GLB 교체 근거·실측치
```

git이 빈 폴더를 추적하지 않으므로, 안에 파일이 하나도 없는 폴더는 로컬에만
있고 커밋에는 안 남는다(`data/`처럼 계획만 되고 결국 안 쓴 갈래가 그런
경우 — 위 표에서 아예 뺐다). `PERFORMANCE.md`·`CHANGELOG.md`는 여태 필요한
순간이 없어서 안 만들었다 — 필요해지면 그때 추가한다.
