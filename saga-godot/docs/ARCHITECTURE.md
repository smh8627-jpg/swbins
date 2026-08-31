# ARCHITECTURE

master.md 6·31장의 구조를 그대로 따른다. 여기는 실제로 만든 폴더만 짧게 기록한다.

```text
saga-godot/
├── project.godot          # Godot 4.x 프로젝트 설정 (텍스트로만 작성, 미검증)
├── saga_core/              # 5개 게임 공통 시스템 — 지금은 빈 폴더뿐
│   ├── combat/ character/ player/ enemy/ quest/ dialogue/
│   ├── inventory/ equipment/ item/ skill/ save/ world/
│   └── event/ ui/ mobile/ data/ utilities/
├── games/                   # 게임별 콘텐츠 — 지금은 빈 폴더뿐
│   ├── saga_go/ saga_dungeon/ saga_forest/ saga_story/ saga_realm/
├── assets/                  # characters/enemies/bosses/animals/buildings/
│                             # environment/vegetation/rocks/props/weapons/
│                             # armor/effects/UI/audio — 전부 빈 폴더
├── data/                    # characters/enemies/bosses/items/equipment/
│                             # skills/quests/dialogue/maps/events/balance
│                             # — 전부 빈 폴더
└── docs/
    ├── PROJECT_STATE.md
    ├── ARCHITECTURE.md      # 이 파일
    ├── LEGACY_FEATURE_AUDIT.md   # 아직 없음 — Phase 2에서 작성
    ├── VERTICAL_SLICE.md         # 아직 없음 — Phase 3에서 작성
    ├── PERFORMANCE.md            # 아직 없음
    ├── ASSET_GUIDE.md            # 아직 없음
    └── CHANGELOG.md              # 아직 없음
```

git이 빈 폴더를 추적하지 않으므로, 커밋 시점에는 실제 파일이 들어간 폴더만
저장소에 남는다. 위 구조 중 지금 비어 있는 폴더는 로컬에만 존재하고,
안에 첫 파일이 생길 때 자연스럽게 커밋에 포함된다.
