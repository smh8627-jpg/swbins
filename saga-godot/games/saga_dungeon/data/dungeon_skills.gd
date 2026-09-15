extends RefCounted
class_name DungeonSkills

## PLAN.md 51장 "장비→빌드" — 11·12장(장비 8부위)이 끝난 뒤 남은 마지막
## 갈래. 웹판 `data-skill.js`는 직업 다섯 × 여덟 갈래 × 세 단 = 120개
## 무예를 갖고 있지만, 그중 실제로 **전투 코드가 없어도(투사체·소환·
## 범위 판정을 새로 안 짜도) 이 슬라이스에 바로 꽂히는 것은 `shape:
## 'passive'` 열넷뿐**이다 — `dungeon_run_state.gd::_sum_eff()`가 이미
## boons(은사)·장비·부대 세 갈래를 world eff 키(atkPct·hpPct·critPct·
## reachPct·atkSpdPct·drainPct·guardPct 등) 하나로 합산해 melee_attack.gd·
## player_health.gd가 그대로 소비하고 있다 — 여기에 "무예로 얻은 랭크"
## 라는 **네 번째 자리**만 얹으면 새 시스템(투사체·소환·쿨타임 UI 등)
## 없이도 실제 전투에 즉시 반영된다.
##
## **직업(cls) 표는 새로 안 만든다** — dungeon_items.gd의
## `class_key_for_weapon()`/`CLASS_NAMES`(무기 look → 직업)를 그대로
## 쓴다(원작도 같은 표를 두 파일이 나눠 쓴다, data-skill.js WEAPON_CLASS
## == data-item.js 없음, dungeon_items.gd가 이미 이 슬라이스의 유일한
## 소스). 이 파일은 SKILLS 표 하나만 갖는다.
##
## 궁장(archer)·무장(warrior)·도독(marshal)·방사(mystic)는 br=2 세 단
## (row 0~2)이 전부 passive라 그대로 옮겼다. 책사(scholar)만 br=2 row 0
## (`s_wave`, 기(氣) 결 bolt)이 passive가 아니었다.
## **2026-09-14, 같은 날 이어서 — 첫 활성 무예로 옮겼다**(`games/
## saga_dungeon/player/skill_bolt.gd` 참고). 진짜 투사체(속도 330, 최대
## 1.5초 생존) 대신 "가장 가까운 적 하나를 즉시 맞히는" 히트스캔으로
## 근사했다 — 우물이 원작 미니게임을 즉시 회복으로 근사한 것과 같은 결의
## 판단. `shape`·`cd`·`el` 세 필드를 이때 채워 넣었다(원작 값 그대로,
## 지어내지 않음). `s_focus`·`y_hex`가 쌓아 온 `skillPct`도 이걸로 처음
## 실제 소비된다(`DungeonRunState.skill_mul()`).
##
## **eff 키 중 반영되는 것**: critPct·reachPct·atkSpdPct·hpPct·atkPct·
## drainPct·guardPct — 전부 `dungeon_run_state.gd`가 이미 소비 중이다
## (위 헤더 참고). skillPct는 world eff 합산이 아니라 skill_bolt.gd가
## `DungeonRunState.skill_mul()`로 직접 소비한다(passive들과 다른 자리 —
## "무예 위력 배율"은 무예 데미지에만 곱해야지 은사/장비의 다른 수치에
## 섞이면 안 된다). **아직 반영 안 되는 것(시스템이 없다)**: mpRegen
## (기력 자체가 없다)·allResPct(원소 저항 합산 자리, `dungeon_equipment_
## state.gd elem_resist()`가 이미 있지만 "전체 결" 합산 채널은 없다).
## 데이터는 그대로 두고(다음에 채널이 생기면 그때 잇는다), 이 둘에 점을
## 넣어도 지금은 조용히 아무 효과가 없다 — dungeon_run_state.gd 헤더의
## "goldPct(경제 시스템 없음)"과 같은 결의 판단이다.
##
## **2026-09-14, 또 이어서 — 무장(warrior) br=0 row=0 `w_whirl`(회전참,
## shape:'swing') 추가**(`games/saga_dungeon/player/skill_whirl.gd` 참고).
## bolt(가장 가까운 적 하나)와 달리 swing은 자기 둘레 반경(`sk.r`×reach_
## mult()) 안의 적 **전부**를 때린다 — 새 반경 판정이지만 투사체·소환보다
## 훨씬 작은 몫이라 다음으로 골랐다. 원작의 넉백(`kb:30`)은 이 슬라이스에
## 넉백 자체가 없어(melee_attack.gd도 안 한다) 값만 보존하고 안 쓴다.
##
## **2026-09-15, 이어서 — 방사(mystic) br=5 row=0 `y_thunderdoom`(뇌쇄,
## shape:'nova') 추가**(`games/saga_dungeon/player/skill_nova.gd` 참고).
## 방사는 여태 br=2 세 단(passive)뿐이라 이걸로 첫 활성 무예를 얻는다
## (bolt→scholar, swing→warrior, 이제 nova→mystic). swing과 판정은 같지만
## (둘레 반경 안 전부) **reach_mult()를 안 곱한다** — 원작 dungeon.js
## `applyShapeSkill()`의 'nova'는 `sk.r`을 그대로 반경으로 쓰지 swing처럼
## `reachOf()`를 곱하지 않는다(코드 그대로). 다만 원작 `sk.r`(130)은
## `reachOf()`에 곱해질 걸 전제 안 한 **원시 픽셀** 값이라 swing의 `sk.r`
## (1.7~3.2, 이미 미터로 쓸 만한 크기)과 자릿수가 다르다 — 그대로 미터로
## 쓰면 방 절반(6m)의 곱절이 넘는다. swing 포팅이 "웹 `sk.r`를 그대로
## 미터로 쓴다"고 정한 선례를 지키려면 두 무예의 **원작 반경 비율**부터
## 맞춰야 한다: 웹에서 실제 반경은 swing이 `reachOf()×sk.r`(예: w_whirl
## 34×2.3=78.2px), nova는 `sk.r`(130px) 그대로 — 즉 nova의 원시 `sk.r`은
## `reachOf()`의 기준값 `BASE_REACH`(34px)만큼 "이미 스케일업"돼 있다.
## 그래서 여기서는 `sk.r`을 그 34로 나눠(130/34=3.82) swing과 같은
## 자릿수로 되돌린 값을 미터로 쓴다 — 결과 비율(3.82/2.3=1.66)이 웹의
## 실제 반경 비율(130/78.2=1.66)과 정확히 같다(같은 판단의 연장, 새
## 임의 상수 아님). **아직 반영 안 되는 것**: `el`(lit, 원소 저항은
## `melee_attack.gd`가 아니라 무예 자체가 직접 계산한다, skill_bolt.gd와
## 같은 경계).
##
## **2026-09-15, 또 이어서 — 궁장(archer) br=5 row=0 `a_dashshot`(질주사,
## shape:'dash') 추가**(`games/saga_dungeon/player/skill_dash.gd` 참고).
## 궁장은 여태 br=2 세 단(passive)뿐이라 넷째 직업이 첫 활성 무예를 얻는다.
## bolt·swing·nova는 "제자리에서 판정"이지만 dash는 **그 자리에서 짧게
## 돌진하며 지나는 적을 벤다** — 처음으로 플레이어 위치 자체를 옮기는
## 무예라 `player.gd`(GO와 공유)에 아주 작은 훅 둘(`dash_dir`·`dash_speed`)
## 을 추가했다: 0이 아니면 그 프레임 이동 입력을 무시하고 그 방향/속력으로
## `move_and_slide()`한다 — boon_speed_sync.gd가 `speed_mult`를 미는 것과
## 같은 결의 일방 통행(하위 호환: 기본값 0이라 GO는 아무 영향 없다).
## `player.gd`는 여전히 `DungeonRunState`를 모른다. **실측으로 고친 것** —
## 처음엔 `velocity`+`move_and_slide()`로 옮겼더니 적(CharacterBody3D)과
## 몸통이 부딪혀 옆으로 밀려났다(검증 스크립트가 사거리 밖 적까지 맞히는
## 걸로 드러남). 원작 dungeon.js 돌진도 `p.x`/`p.y`를 충돌 없이 직접
## 더할 뿐이라, `player.gd`의 돌진 분기는 `global_position`을 직접
## 옮기고 그 프레임 `move_and_slide()`(와 중력)를 건너뛴다.
##
## **2026-09-15, 또 이어서 — 도독(marshal) br=0 row=0 `m_rally`(사기,
## shape:'buff') 추가**(`games/saga_dungeon/player/skill_buff.gd` 참고).
## 이걸로 다섯 직업 전부 활성 무예를 하나씩 갖는다(bolt·swing·nova·dash·
## buff). buff는 처음으로 **한동안**(sec초) 효과가 붙는 무예라 —
## `dungeon_run_state.gd`에 `_temp_buffs`(잠깐짜리 world eff, 다섯 번째
## 합산 자리) 신규. 원작 dungeon.js `addBuff()`/`boonVal()` 그대로: 값과
## 만료 시각만 들고 있다가 `_sum_eff()`가 조회 시점에 안 끝났으면 더한다
## (틱 타이머로 안 지운다 — 굳이 지울 필요가 없다, 만료된 항목은 그냥
## 조용히 안 더해질 뿐이고 다음에 같은 eff로 다시 buff를 걸면 덮어 쓴다).
## 세이브에는 안 남는다(원작 주석 "잠깐짜리 무예·분신은 회차 안에서만
## 산다" 그대로).
##
## **2026-09-15, 또 이어서 — 책사(scholar) br=5 row=0 `s_restore`(축기회복,
## shape:'heal') 추가**(`games/saga_dungeon/player/skill_heal.gd` 참고).
## 다섯 직업 전부(bolt·swing·nova·dash·buff)가 첫 활성 무예를 이미 가진
## 뒤라 이번엔 **책사의 둘째 활성 무예**로 "heal" 모양을 채운다(원작 desc
## "책사의 첫 회복" 그대로 — 원작에서도 책사에게 heal은 이 자리가 처음).
## `player_health.gd`의 기존 `heal_by()`를 그대로 부른다 — buff처럼 대상도
## 방향도 없어 지금까지 중 가장 단순하다(새 상태·판정이 전혀 없다).
##
## **2026-09-15, 또 이어서 — 무장(warrior) br=5 row=0 `w_intimidate`(위해,
## shape:'curse') 추가**(`games/saga_dungeon/player/skill_curse.gd` 참고).
## 원작 desc "무장의 첫 저주" 그대로 — 무장의 둘째 활성 무예(첫째는
## w_whirl, swing). 반경은 nova와 같은 문제라 같은 요령으로 옮겼다(원작
## `sk.r`이 `reachOf()`를 안 곱하는 원시 픽셀 값 — `BASE_REACH`로 나눈
## 3.82m, w_intimidate의 원작 r도 130이라 y_thunderdoom과 정확히 같은
## 값이 나온다). 데미지가 없는 "상태만 거는" 무예라 처음으로
## `dungeon_enemy.gd`에 새 상태 하나(`_hex_v`/`_hex_time_left`,
## `apply_hex()`)를 추가했다 — "그동안 이 적이 받는 모든 피해가 v%만큼
## 는다"를 `take_damage()` 한 곳에서 계산해, 공격 스크립트마다 따로
## 체크할 필요가 없게 했다(원작 strike()가 물리·무예 안 가리고 한 곳에서
## 곱하는 것과 같은 효과). 느려짐은 기존 `apply_elem_slow()`(냉기와 같은
## 자리, mult=0.35 원작 그대로)를 그대로 재사용 — 새 감속 채널을 안
## 만든다. 원작 `sk.v`(위해의 위력, 30)는 hex 배율에, 슬로우는 원작처럼
## 랭크와 무관하게 항상 0.35다.
##
## **속도 환산** — dash는 "반경"이 아니라 "이동"이라 `BASE_REACH`가 아니라
## `BASE_SPD`(148px/s, 원작 이동속도 기준값)를 기준으로 삼는다. `player.gd`
## 의 `WALK_SPEED`(6.0m/s)가 그 Godot 쪽 짝이므로, 원작 돌진 속도(620px/s,
## dungeon.js 하드코딩값)를 `620×(6.0/148)≈25.14`m/s로 옮긴다. 지속시간은
## 원작 `0.2×(sk.far||1)`초 그대로(a_dashshot은 far 없음 → 0.2초) — 즉
## 한 번에 약 5m를 돌진한다. 지나는 적 판정 반경("de.r+P_R+6", 몬스터별
## 픽셀 반지름)은 이 슬라이스에 몬스터 개별 충돌 반지름을 안 두므로(swing·
## nova도 마찬가지) 새 상수를 안 만들고 `melee_attack.gd`의 `ATK_RANGE`
## (2.4m)를 그대로 재사용한다("스쳐 지나가며 벤다"는 접촉 판정이라 평타
## 사거리와 같은 성격). 원작의 무적(`p.invuln`)은 이 슬라이스에 회피·
## 무적 시스템 자체가 없어(`combat_dodge` 입력 액션도 아직 아무 데도
## 안 걸려 있다) 값만 흘리고 안 쓴다 — kb·mpRegen과 같은 결의 판단.
##
## **2026-09-15, 또 이어서 — 방사(mystic) br=0 row=0 `y_shade`(분신술,
## shape:'summon') 추가**(`games/saga_dungeon/player/skill_summon.gd`·
## `games/saga_dungeon/world/dungeon_minion.gd` 참고). 방사 자체가 원작
## `CLASSES` 설명부터 "분신을 세우고 적을 묶는다"라 y_shade가 그 직업의
## 가장 원래 모양이다(nova·curse처럼 다른 직업에서 "빌려 온" 게 아니다).
## 처음으로 **화면에 남는 새 개체**(분신)가 필요해 지금까지 중 가장 큰
## 걸음이다 — `dungeon_minion.gd` 신규: `CharacterBody3D`가 아니라 맨
## `Node3D`(물리 충돌 없음, `global_position`을 직접 옮긴다 — dash가
## 겪은 몸통 충돌 문제를 아예 피한다, 원작 분신도 2D 좌표만 있지 몸통
## 충돌이 없다) 하나가: 가장 가까운 적을 쫓다가 닿으면 멈춰 서서
## 주기적으로 때리고(`melee_attack.gd`의 `ATK_DAMAGE`를 `mul`(=0.5×
## `sk.str`, y_shade는 str 없음 → 0.5)만큼 줄여 쓴다 — crit·저항은
## 그대로 적용, 적이 없으면 플레이어 곁으로 돌아온다), `sec`초 뒤 스스로
## `queue_free()`한다. **적이 분신을 공격하지 않는다**(원작 그대로 — hp도
## 없다, 죽음·부활을 새로 안 만드는 선택).
##
## **속도 환산** — dash와 같은 이유로 "이동"이라 `BASE_SPD`(148px/s)
## 기준을 쓴다: 추격 110px/s→`110×(6.0/148)≈4.46`m/s, 복귀 90px/s→
## `≈3.65`m/s, 소환 위치 흩뿌림(±20px×±15px)→`≈±0.81m×±0.61m`. 공격
## 판정 거리("bd > best.r+14", 몬스터별 반지름 없음)는 curse·dash와 같은
## 이유로 `melee_attack.gd`의 `ATK_RANGE`(2.4m)를 재사용한다. 공격
## 쿨다운(0.7초)은 이미 초 단위라 그대로 옮긴다. **랭크가 하는 일** —
## 데미지가 아니라 **개체 수**(`round(value_at(rank))`)를 늘린다(원작
## `summon(Math.round(v), ...)` 그대로) — 다른 무예와 결이 다르다.
##
## **2026-09-15, 또 이어서 — 궁장(archer) br=3 row=0 `a_chain`(연환시,
## shape:'chain') 추가**(`games/saga_dungeon/player/skill_chain.gd` 참고).
## 이걸로 웹판의 아홉 모양(bolt·swing·nova·dash·buff·heal·curse·summon·
## chain) 전부가 이 슬라이스에 있다 — 궁장의 둘째 활성 무예(첫째는
## a_dashshot, dash). nova·curse처럼 "제자리 반경"이 아니라 원작
## `applyShapeSkill()`의 'chain' 그대로 **가장 가까운 적부터 시작해, 아직
## 안 맞은 적 중 가장 가까운 쪽으로 최대 hops(기본 3)번 옮겨 붙는다** —
## 튈 때마다 12%씩 약해진다(`v * skillMul() * (1 - hop*0.12)`, 원작 그대로).
## 탐색 반경(`sk.r`, 다음 표적을 찾는 거리)은 nova·curse와 같은 문제라
## 같은 요령으로 옮겼다 — a_chain은 원작에 `r` 필드가 없어(기본값 260px)
## `260 ÷ BASE_REACH(34) ≈ 7.65`m를 쓴다. hops는 원작에 없으면 3(data-
## skill.js `sk.hops || 3` 그대로), a_chain도 hops 필드가 없어 3.
##
## **2026-09-15, 또 이어서 — 도독(marshal) br=3 row=0 `m_chain`(연환기격,
## shape:'chain') 추가**(`games/saga_dungeon/player/skill_chain_marshal.gd`
## 참고). 도독은 여태 m_rally(buff) 하나뿐이라(다섯 직업 중 활성 무예가
## 가장 적었다) 이걸로 둘째를 얻는다. **'chain'이 처음으로 두 직업이
## 공유하는 모양이다** — a_chain과 판정·감쇠 계산이 완전히 같아(원작
## `applyShapeSkill()`은 shape 하나로 모든 chain 무예를 처리한다) 로직을
## 그대로 복사했다(기존 스크립트들이 "직업당 스크립트 하나" 결을 지켜온
## 선례를 따른 것 — skill_nova.gd/skill_curse.gd도 반경 판정이 거의
## 같지만 따로 파일이다). 다른 점은 SKILL_KEY·입력 액션·el 기본값(`el:
## 'chi'`, a_chain은 phys)뿐이다.
##
## **2026-09-15, 다섯 직업 모두 둘씩을 채운 뒤 — 셋째 활성 무예 다섯 개를
## 한 번에 이어간다("사가고돗 이어 해둬 묻지말고").** 웹판 데이터를
## 다시 훑어 **다음 조건 둘을 모두 만족하는 항목**만 골랐다: (1) `row: 0`
## (이 슬라이스는 진짜 트리가 아니라 br/row 여러 갈래에서 낱개로 옮겨
## 온 것이라 `prereq_of()`가 전 단을 못 찾으면 조용히 요구 안 함으로
## 넘어가긴 하지만, row 0을 고르면 애초에 그 불일치 자체가 안 생긴다),
## (2) 이미 옮겨진 아홉 모양(bolt·swing·nova·dash·buff·heal·curse·summon·
## chain) 중 하나라 새 판정 코드가 필요 없다. 그 결과:
## - 궁장(archer) `a_pierce`(관통사, br0row0, bolt, el 없음) — 궁장의
##   첫 bolt(지금까지 dash·chain뿐이었다).
## - 무장(warrior) `w_dash`(돌진, br1row0, dash, el 없음) — 무장의
##   첫 dash(swing·curse에 이어 셋째 모양).
## - 책사(scholar) `s_chainfire`(연쇄화염, br3row0, chain, el:'fire') —
##   chain이 세 번째로 공유하는 직업이 된다(a_chain·m_chain에 이어).
## - 도독(marshal) `m_smite`(기격, br1row0, swing, el:'chi', r=1.6) —
##   도독의 첫 swing.
## - 방사(mystic) `y_curse`(주박, br1row0, curse, r=130→3.82, sec=5,
##   v=30) — w_intimidate와 v·r·sec가 전부 같다(원작에서도 그렇다).
##
## 각각 skill_bolt.gd/skill_dash.gd/skill_chain.gd/skill_whirl.gd/
## skill_curse.gd를 그대로 복제해 SKILL_KEY·그룹·입력 액션만 바꿨다(직업당
## 스크립트 하나 결 유지 — chain이 두 벌 있던 선례를 셋째로 늘린 것뿐, 새
## 판정 로직은 전혀 안 늘었다). 입력 액션은 dungeon_skill_11~15(G·I·O·P·U
## 키) 신규 — 그 다섯 글자는 DUNGEON 안에서 여태 안 쓰인 키라 새로
## 배정했다(FOREST·STORY가 같은 글자를 쓰고 있지만 두 게임은 동시에 안 돈다).
##
## **2026-09-15, 또 이어서 — 넷째 활성 무예 다섯 개("사가고돗 이어해").**
## 셋째와 같은 방식으로 골랐다: `row: 0`이면서 이미 옮겨진 아홉 모양 중
## 하나. 이번엔 **다섯 직업 모두 br=4 row=0**이 조건에 맞았다(우연히
## 웹판이 그 갈래를 다섯 직업 다 "여태 이 직업이 안 써 본 모양"으로
## 채워 뒀다) — 그래서 이 배치가 끝나면 다섯 직업 전부 **서로 다른
## 모양 넷씩**을 갖는다:
## - 궁장 `a_flourish`(궁신무, swing, r=1.6) — 궁장의 첫 swing.
## - 무장 `w_throw`(투창, bolt, el 없음) — 무장의 첫 bolt.
## - 책사 `s_blink`(축지, dash, el:'lit') — 책사의 첫 dash.
## - 도독 `m_javelin`(표창, bolt, el:'chi') — 도독의 첫 bolt.
## - 방사 `y_soulbolt`(혼탄, bolt, el:'chi') — 방사의 첫 bolt(이걸로
##   bolt가 궁장·무장·도독·방사 넷이 공유하는 모양이 된다 — chain 다음
##   으로 널리 재사용되는 shape).
## 각각 skill_whirl.gd/skill_bolt.gd/skill_dash.gd를 복제해 SKILL_KEY·
## 그룹·입력 액션만 바꿨다(새 판정 로직 없음). 입력 액션은
## dungeon_skill_16~20(E·Q·T·X·Y 키) 신규.
##
## **2026-09-15, 또 이어서 — 다섯째 활성 무예 둘("사가고돗 이어해").**
## 넷째까지 끝나면 남는 row 0 항목은 대부분 이미 쓴 모양의 다른 원소
## 변형이라 셋째·넷째만큼 깔끔하지 않다고 적어 뒀는데, 그중 **chain**만은
## 예외다 — 무장(warrior)·방사(mystic)에게 chain을 채우면 다섯 직업
## 전부가 공유하는 첫 모양이 된다(지금까지 최대 넷 공유였던 bolt를 넘어선다).
## - 무장 `w_chain`(연환격, br3row0, el 없음) — 무장의 첫 chain.
## - 방사 `y_chain`(독쇄, br3row0, el:'pois') — 방사의 첫 chain(`pois`
##   원소는 `dungeon_enemy.gd`/`dungeon_items.gd`에 이미 있다 — 새 결 아님).
## skill_chain.gd/skill_chain_marshal.gd/skill_chain_scholar.gd와 판정·감쇠
## 계산이 완전히 같아(chain이 네 번째로 공유) 그대로 복제했다. 신규
## skill_chain_warrior.gd·skill_chain_mystic.gd, 입력 액션
## dungeon_skill_21~22(Z·5 키).

const MAX_RANK := 5

const SKILLS: Array[Dictionary] = [
	## 궁장(弓將) br=2 — data-skill.js 그대로.
	{ "key": "a_eye", "cls": "archer", "br": 2, "row": 0, "name": "매의 눈(鷹眼)",
		"eff": "critPct", "v": 4.0, "grow": 3.0, "desc": "치명타 확률이 오른다." },
	{ "key": "a_reach", "cls": "archer", "br": 2, "row": 1, "name": "장궁(長弓)",
		"eff": "reachPct", "v": 8.0, "grow": 6.0, "desc": "닿는 거리가 길어진다." },
	{ "key": "a_swift", "cls": "archer", "br": 2, "row": 2, "name": "질보(疾步)",
		"eff": "atkSpdPct", "v": 6.0, "grow": 4.0, "desc": "손이 빨라진다." },
	## 궁장(弓將) br=5 row 0 — data-skill.js 그대로(cost=18은 기력이 없어
	## 안 씀). el 없음(물리) — 위 헤더의 dash 환산 참고.
	{ "key": "a_dashshot", "cls": "archer", "br": 5, "row": 0, "name": "질주사(疾走射)",
		"shape": "dash", "cd": 6.0,
		"eff": "", "v": 1.3, "grow": 0.3, "desc": "몸을 날려 스치며 벤다." },
	## 궁장(弓將) br=3 row 0 — data-skill.js 그대로(cost=22는 기력이 없어
	## 안 씀). r=7.65는 위 헤더의 chain 환산(260÷34) 참고. hops·el 없음(원작도
	## 없음 → hops 기본 3, el 기본 phys).
	{ "key": "a_chain", "cls": "archer", "br": 3, "row": 0, "name": "연환시(連環矢)",
		"shape": "chain", "cd": 9.0, "r": 7.65,
		"eff": "", "v": 1.7, "grow": 0.4, "desc": "가까운 적을 꿰고 다음 적으로 튄다." },
	## 궁장(弓將) br=0 row 0 — data-skill.js 그대로(cost=14는 기력이 없어
	## 안 씀). el 없음(물리) — 궁장의 첫 bolt.
	{ "key": "a_pierce", "cls": "archer", "br": 0, "row": 0, "name": "관통사(貫通射)",
		"shape": "bolt", "cd": 3.0,
		"eff": "", "v": 1.6, "grow": 0.35, "desc": "꿰뚫는 화살. 뒤의 적까지 닿는다." },
	## 궁장(弓將) br=4 row 0 — data-skill.js 그대로(cost=20은 기력이 없어
	## 안 씀). r=1.6은 m_smite와 같은 자릿수(swing은 원작 r을 그대로
	## 미터로 쓴다 — 위 헤더 참고). 궁장의 첫 swing.
	{ "key": "a_flourish", "cls": "archer", "br": 4, "row": 0, "name": "궁신무(弓身舞)",
		"shape": "swing", "cd": 5.0, "r": 1.6,
		"eff": "", "v": 1.5, "grow": 0.35, "desc": "활대로 후려친다. 가까이 붙은 적에게 쓴다." },
	## 무장(武將) br=0 row 0 — data-skill.js 그대로. shape/cd는 원작 값
	## 그대로(cost=22는 기력이 없어 안 씀, kb=30은 넉백이 없어 안 씀).
	{ "key": "w_whirl", "cls": "warrior", "br": 0, "row": 0, "name": "회전참(回轉斬)",
		"shape": "swing", "cd": 5.0, "r": 2.3,
		"eff": "", "v": 1.7, "grow": 0.35, "desc": "둘레의 모든 적을 벤다." },
	## 무장(武將) br=2 — data-skill.js 그대로.
	{ "key": "w_tough", "cls": "warrior", "br": 2, "row": 0, "name": "단련(鍛鍊)",
		"eff": "hpPct", "v": 8.0, "grow": 5.0, "desc": "부대 체력이 오른다." },
	{ "key": "w_mastery", "cls": "warrior", "br": 2, "row": 1, "name": "병기술(兵器術)",
		"eff": "atkPct", "v": 7.0, "grow": 5.0, "desc": "부대 공격력이 오른다." },
	{ "key": "w_second", "cls": "warrior", "br": 2, "row": 2, "name": "이혼대법(離魂)",
		"eff": "drainPct", "v": 2.0, "grow": 1.0, "desc": "적을 잡으면 체력이 조금 돌아온다." },
	## 무장(武將) br=5 row 0 — data-skill.js 그대로(cost=24는 기력이 없어
	## 안 씀). r=3.82는 y_thunderdoom과 같은 환산(위 헤더 참고, 원작 r도
	## 130으로 같다). sec(지속초)은 랭크 무관 고정.
	{ "key": "w_intimidate", "cls": "warrior", "br": 5, "row": 0, "name": "위해(威嚇)",
		"shape": "curse", "cd": 9.0, "r": 3.82, "sec": 5.0,
		"eff": "", "v": 30.0, "grow": 8.0, "desc": "노호로 적을 굼뜨고 약하게 만든다." },
	## 무장(武將) br=1 row 0 — data-skill.js 그대로(cost=18은 기력이 없어
	## 안 씀). el 없음(물리) — 무장의 첫 dash(skill_dash.gd 그대로 복제).
	{ "key": "w_dash", "cls": "warrior", "br": 1, "row": 0, "name": "돌진(突進)",
		"shape": "dash", "cd": 6.0,
		"eff": "", "v": 1.2, "grow": 0.3, "desc": "앞으로 파고들며 벤다." },
	## 무장(武將) br=4 row 0 — data-skill.js 그대로(cost=16은 기력이 없어
	## 안 씀). el 없음(물리) — 무장의 첫 bolt.
	{ "key": "w_throw", "cls": "warrior", "br": 4, "row": 0, "name": "투창(投槍)",
		"shape": "bolt", "cd": 4.0,
		"eff": "", "v": 1.6, "grow": 0.4, "desc": "창을 던진다. 곧게 나간다." },
	## 무장(武將) br=3 row 0 — data-skill.js 그대로(cost=24는 기력이 없어
	## 안 씀). r=7.65는 a_chain 등과 같은 환산(위 헤더 참고, 원작 r 필드
	## 없음 → 기본 260px). el 없음(물리) — 무장의 첫 chain.
	{ "key": "w_chain", "cls": "warrior", "br": 3, "row": 0, "name": "연환격(連環擊)",
		"shape": "chain", "cd": 9.0, "r": 7.65,
		"eff": "", "v": 1.8, "grow": 0.4, "desc": "가까운 적을 치고 다음 적으로 옮겨 붙는다." },
	## 책사(策士) br=2 — row 0(s_wave)만 passive가 아니다(위 헤더 참고).
	## shape/cd/el은 data-skill.js 그대로(cost=30은 기력이 없어 안 씀).
	{ "key": "s_wave", "cls": "scholar", "br": 2, "row": 0, "name": "기공파(氣功波)",
		"shape": "bolt", "cd": 8.0, "el": "chi",
		"eff": "", "v": 2.2, "grow": 0.5, "desc": "꿰뚫는 기를 쏜다." },
	{ "key": "s_wit", "cls": "scholar", "br": 2, "row": 1, "name": "명민(明敏)",
		"eff": "mpRegen", "v": 2.0, "grow": 1.4, "desc": "기력이 빨리 찬다.(아직 기력 없음)" },
	{ "key": "s_focus", "cls": "scholar", "br": 2, "row": 2, "name": "집중(集中)",
		"eff": "skillPct", "v": 10.0, "grow": 7.0, "desc": "무예의 위력이 오른다." },
	## 책사(策士) br=5 row 0 — data-skill.js 그대로(cost=30은 기력이 없어
	## 안 씀). v는 "최대 체력의 %"(player_health.gd::heal_by()가 그대로
	## 받는다) — eff/world_eff_sum과는 무관해 비워 둘 필요조차 없지만
	## 다른 shape 무예와 통일한다.
	{ "key": "s_restore", "cls": "scholar", "br": 5, "row": 0, "name": "축기회복(蓄氣回復)",
		"shape": "heal", "cd": 16.0,
		"eff": "", "v": 16.0, "grow": 6.0, "desc": "기를 모아 상처를 아문다." },
	## 책사(策士) br=3 row 0 — data-skill.js 그대로(cost=26은 기력이 없어
	## 안 씀). r=7.65는 a_chain·m_chain과 같은 환산(원작 r 필드 없음 →
	## 기본 260px). el:'fire'만 다르다 — chain이 세 번째로 공유하는 직업.
	{ "key": "s_chainfire", "cls": "scholar", "br": 3, "row": 0, "name": "연쇄화염(連鎖火焰)",
		"shape": "chain", "cd": 9.0, "r": 7.65, "el": "fire",
		"eff": "", "v": 1.9, "grow": 0.45, "desc": "불덩이가 적 사이를 옮겨 붙는다." },
	## 책사(策士) br=4 row 0 — data-skill.js 그대로(cost=20은 기력이 없어
	## 안 씀). el:'lit' — 책사의 첫 dash.
	{ "key": "s_blink", "cls": "scholar", "br": 4, "row": 0, "name": "축지(縮地)",
		"shape": "dash", "cd": 7.0, "el": "lit",
		"eff": "", "v": 1.3, "grow": 0.3, "desc": "번개처럼 파고든다." },
	## 도독(都督) br=0 row 0 — data-skill.js 그대로(cost=34는 기력이 없어
	## 안 씀). sec(지속초)은 랭크와 무관하게 고정(원작 그대로) — v(위력)만
	## value_at()으로 랭크에 따라 는다. **`eff`를 비워 둔 이유** — 다른
	## shape 무예(bolt·swing·nova·dash)와 같은 이유다: `eff`를 채우면
	## `dungeon_skill_state.gd::world_eff_sum()`이 "랭크만 있으면 늘
	## 더하는 패시브"로 착각해 버프가 안 걸려 있어도 영구히 atkSpdPct가
	## 오른다. 실제로 버프할 자리는 `buff_eff`라는 별도 필드에 둔다
	## (skill_buff.gd가 캐스팅 순간에만 이 값을 읽어 `DungeonRunState.
	## add_temp_buff()`로 넘긴다 — 랭크 합산과 완전히 분리된 경로).
	{ "key": "m_rally", "cls": "marshal", "br": 0, "row": 0, "name": "사기(士氣)",
		"shape": "buff", "cd": 16.0, "sec": 6.0, "buff_eff": "atkSpdPct",
		"eff": "", "v": 30.0, "grow": 8.0, "desc": "한동안 손과 발이 빨라진다." },
	## 도독(都督) br=2 — data-skill.js 그대로.
	{ "key": "m_res", "cls": "marshal", "br": 2, "row": 0, "name": "기수련(氣修)",
		"eff": "allResPct", "v": 5.0, "grow": 4.0, "desc": "모든 결의 저항이 오른다.(아직 합산 채널 없음)" },
	{ "key": "m_wall", "cls": "marshal", "br": 2, "row": 1, "name": "철벽(鐵壁)",
		"eff": "guardPct", "v": 4.0, "grow": 3.0, "desc": "받는 피해가 늘 조금 준다." },
	{ "key": "m_lead", "cls": "marshal", "br": 2, "row": 2, "name": "통솔(統率)",
		"eff": "hpPct", "v": 6.0, "grow": 4.0, "desc": "부대 체력이 오른다." },
	## 도독(都督) br=3 row 0 — data-skill.js 그대로(cost=24는 기력이 없어
	## 안 씀). r=7.65는 a_chain과 같은 환산(위 헤더 참고, 원작 r 필드 없음 →
	## 기본 260px). el:'chi'만 a_chain(phys)과 다르다.
	{ "key": "m_chain", "cls": "marshal", "br": 3, "row": 0, "name": "연환기격(連環氣擊)",
		"shape": "chain", "cd": 9.0, "r": 7.65, "el": "chi",
		"eff": "", "v": 1.9, "grow": 0.4, "desc": "기를 실어 가까운 적을 연달아 친다." },
	## 도독(都督) br=1 row 0 — data-skill.js 그대로(cost=20은 기력이 없어
	## 안 씀). r=1.6은 w_whirl(2.3)과 같은 자릿수(swing은 이미 미터로 쓸
	## 만한 원작 r을 그대로 쓴다 — 위 헤더 참고). 도독의 첫 swing.
	{ "key": "m_smite", "cls": "marshal", "br": 1, "row": 0, "name": "기격(氣擊)",
		"shape": "swing", "cd": 4.0, "r": 1.6, "el": "chi",
		"eff": "", "v": 1.9, "grow": 0.4, "desc": "기를 실어 둘레를 친다." },
	## 도독(都督) br=4 row 0 — data-skill.js 그대로(cost=16은 기력이 없어
	## 안 씀). el:'chi' — 도독의 첫 bolt.
	{ "key": "m_javelin", "cls": "marshal", "br": 4, "row": 0, "name": "표창(標槍)",
		"shape": "bolt", "cd": 4.0, "el": "chi",
		"eff": "", "v": 1.5, "grow": 0.35, "desc": "기를 실은 창을 던진다." },
	## 방사(方士) br=0 row 0 — data-skill.js 그대로(cost=26은 기력이 없어
	## 안 씀). v/grow는 데미지가 아니라 분신 "개체 수"(round(value_at))다
	## — 위 헤더 참고. sec(지속초)은 랭크 무관 고정.
	{ "key": "y_shade", "cls": "mystic", "br": 0, "row": 0, "name": "분신술(分身)",
		"shape": "summon", "cd": 12.0, "sec": 12.0,
		"eff": "", "v": 1.0, "grow": 1.0, "desc": "분신을 세운다. 대신 싸운다." },
	## 방사(方士) br=2 — data-skill.js 그대로.
	{ "key": "y_leech", "cls": "mystic", "br": 2, "row": 0, "name": "흡정(吸精)",
		"eff": "drainPct", "v": 2.0, "grow": 1.5, "desc": "적을 잡으면 체력이 돌아온다." },
	{ "key": "y_hex", "cls": "mystic", "br": 2, "row": 1, "name": "주술(呪術)",
		"eff": "skillPct", "v": 8.0, "grow": 6.0, "desc": "무예의 위력이 오른다." },
	{ "key": "y_spirit", "cls": "mystic", "br": 2, "row": 2, "name": "정신(精神)",
		"eff": "mpRegen", "v": 2.0, "grow": 1.2, "desc": "기력이 빨리 찬다.(아직 기력 없음)" },
	## 방사(方士) br=5 row 0 — data-skill.js 그대로(cost=30은 기력이 없어
	## 안 씀). r=3.82는 원작 130px÷BASE_REACH(34px) — 위 헤더 참고.
	{ "key": "y_thunderdoom", "cls": "mystic", "br": 5, "row": 0, "name": "뇌쇄(雷殺)",
		"shape": "nova", "cd": 9.0, "r": 3.82, "el": "lit",
		"eff": "", "v": 2.2, "grow": 0.5, "desc": "벼락이 둘레에 떨어진다." },
	## 방사(方士) br=1 row 0 — data-skill.js 그대로(cost=20은 기력이 없어
	## 안 씀). r=3.82·sec=5.0·v=30.0은 w_intimidate와 전부 같다(원작에서도
	## 그렇다, r 130도 동일). 방사의 첫 curse.
	{ "key": "y_curse", "cls": "mystic", "br": 1, "row": 0, "name": "주박(呪縛)",
		"shape": "curse", "cd": 8.0, "r": 3.82, "sec": 5.0,
		"eff": "", "v": 30.0, "grow": 8.0, "desc": "둘레의 적이 굼떠지고 더 아파한다." },
	## 방사(方士) br=4 row 0 — data-skill.js 그대로(cost=16은 기력이 없어
	## 안 씀). el:'chi' — 방사의 첫 bolt. 이걸로 bolt를 가진 직업이
	## 궁장·무장·도독·방사 넷으로 는다(위 헤더 참고, 책사는 이미 별개로
	## s_wave가 있어 다섯 다 bolt를 갖는다).
	{ "key": "y_soulbolt", "cls": "mystic", "br": 4, "row": 0, "name": "혼탄(魂彈)",
		"shape": "bolt", "cd": 3.0, "el": "chi",
		"eff": "", "v": 1.6, "grow": 0.4, "desc": "넋을 실은 기를 쏜다." },
	## 방사(方士) br=3 row 0 — data-skill.js 그대로(cost=22는 기력이 없어
	## 안 씀). r=7.65는 w_chain 등과 같은 환산(원작 r 필드 없음 → 기본
	## 260px). el:'pois' — 방사의 첫 chain. 이걸로 chain이 다섯 직업 전부가
	## 공유하는 첫 모양이 된다(위 헤더 참고).
	{ "key": "y_chain", "cls": "mystic", "br": 3, "row": 0, "name": "독쇄(毒鎖)",
		"shape": "chain", "cd": 9.0, "r": 7.65, "el": "pois",
		"eff": "", "v": 1.8, "grow": 0.4, "desc": "독한 기운이 적 사이를 옮겨 붙는다." },
]


static func skill_by_key(k: String) -> Dictionary:
	for s: Dictionary in SKILLS:
		if s.key == k:
			return s
	return {}


static func skills_of(cls_key: String) -> Array[Dictionary]:
	var out: Array[Dictionary] = []
	for s: Dictionary in SKILLS:
		if s.cls == cls_key:
			out.append(s)
	return out


## data-skill.js valueAt() 그대로 — 0단이면 0, 그 뒤론 v + grow*(rank-1).
static func value_at(sk: Dictionary, rank: int) -> float:
	if rank <= 0:
		return 0.0
	return float(sk.v) + float(sk.grow) * float(rank - 1)


## data-skill.js prereqOf() 그대로 — row 0은 조건 없음(null). row>0은
## 같은 갈래(cls+br)의 바로 앞 단(row-1)에 1점이 있어야 한다.
static func prereq_of(sk: Dictionary) -> Dictionary:
	if int(sk.row) == 0:
		return {}
	for s: Dictionary in skills_of(str(sk.cls)):
		if int(s.br) == int(sk.br) and int(s.row) == int(sk.row) - 1:
			return s
	return {}
