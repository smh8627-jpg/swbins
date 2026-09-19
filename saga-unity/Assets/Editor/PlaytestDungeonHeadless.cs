using System.Reflection;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;
using Saga.Core;
using Saga.Dungeon.Data;
using Saga.Dungeon.Player;
using Saga.Dungeon.UI;
using Saga.Dungeon.World;

namespace Saga.EditorTools
{
    /// <summary>
    /// `PlaytestHeadless.cs`(GO)와 같은 결, 씬 경로만 다르다 — TestDungeon
    /// 씬을 배치 모드에서 몇 프레임 재생해 런타임 예외가 없는지 확인한다.
    /// **주의 — PlaytestHeadless.cs와 같은 이유로 -executeMethod로 부를
    /// 때 -quit을 같이 주지 않는다.**
    ///
    /// **회전베기 검증(2026-09-14 추가)** — 이 프로젝트의 DUNGEON
    /// Playtest들은 지금까지 `TakeDamage(999999f)`로 적을 바로 죽여
    /// 전투 스킬(TryAttack/TryHeavyAttack) 자체는 한 번도 직접 확인한
    /// 적이 없었다(PlaytestDungeonFloorProgression.cs 등). 새 AoE
    /// 스킬(PlayerCombat.TriggerWhirl, PLAN.md 51장 "DUNGEON 확장 —
    /// 빌드")은 "반경 안 여럿, 반경 밖은 안 건드림"이 핵심이라 이번엔
    /// 직접 스폰한 더미로 실제로 확인한다(STORY `PlaytestStorySlice.
    /// SpawnDummyEnemy`와 같은 결).
    /// </summary>
    public static class PlaytestDungeonHeadless
    {
        private const string ScenePath = "Assets/Scenes/TestDungeon.unity";
        private const int FramesToRun = 10;
        private const int WhirlCheckFrame = 3; // 씬 로드 직후 Awake 체인이 다 돈 뒤(여유 있게 잡음).

        private static int _framesSeen;
        private static bool _hadError;
        private static bool _whirlChecked;
        private static bool _origEnterPlayModeOptionsEnabled;
        private static EnterPlayModeOptions _origEnterPlayModeOptions;

        [MenuItem("Saga/Playtest TestDungeon (Headless)")]
        public static void Run()
        {
            _origEnterPlayModeOptionsEnabled = EditorSettings.enterPlayModeOptionsEnabled;
            _origEnterPlayModeOptions = EditorSettings.enterPlayModeOptions;
            EditorSettings.enterPlayModeOptionsEnabled = true;
            EditorSettings.enterPlayModeOptions =
                EnterPlayModeOptions.DisableDomainReload | EnterPlayModeOptions.DisableSceneReload;

            EditorSceneManager.OpenScene(ScenePath);
            _framesSeen = 0;
            _hadError = false;
            _whirlChecked = false;
            Application.logMessageReceived += OnLog;
            EditorApplication.playModeStateChanged += OnStateChanged;
            EditorApplication.isPlaying = true;
        }

        private static void OnLog(string condition, string stackTrace, LogType type)
        {
            if (type != LogType.Error && type != LogType.Exception) return;
            if (stackTrace.Contains("UnityEditor.Search.SearchInit.IndexationOnStartup")) return;

            _hadError = true;
            Debug.LogError($"[PlaytestDungeonHeadless] runtime error: {condition}\n{stackTrace}");
        }

        private static void OnStateChanged(PlayModeStateChange state)
        {
            if (state == PlayModeStateChange.EnteredPlayMode)
            {
                EditorApplication.update += CountFrames;
            }
            else if (state == PlayModeStateChange.EnteredEditMode)
            {
                Application.logMessageReceived -= OnLog;
                EditorApplication.playModeStateChanged -= OnStateChanged;
                EditorSettings.enterPlayModeOptionsEnabled = _origEnterPlayModeOptionsEnabled;
                EditorSettings.enterPlayModeOptions = _origEnterPlayModeOptions;
                Debug.Log(_hadError
                    ? "[PlaytestDungeonHeadless] FAIL - runtime error(s) logged"
                    : $"[PlaytestDungeonHeadless] OK - {FramesToRun} frames, no errors");
                EditorApplication.Exit(_hadError ? 1 : 0);
            }
        }

        private static void CountFrames()
        {
            _framesSeen++;

            if (_framesSeen == WhirlCheckFrame && !_whirlChecked)
            {
                _whirlChecked = true;
                CheckHitstop(); // CheckWhirl보다 먼저 — TryAttack의 _cooldownLeft는 TryWhirl의 _whirlCooldownLeft와 별개 필드라 순서가 서로 안 막는다.
                CheckHitSpark();
                // CheckLootMarker보다 먼저 — CheckLootMarker의 더미 처치 보상(rewardExp
                // 기본값 20)이 레벨 1의 ExpToNext(20)와 정확히 맞아떨어져 그 자리에서
                // 먼저 레벨업을 하나 유발한다. 그 뒤에 이 체크가 돌면 Time.deltaTime이
                // 이 프레임에 크게 잡힌 경우(배치 모드 실행 시간 편차) CameraRig.
                // LevelUpCutRoutine()의 첫 동기 반복에서 두 번의 레벨업 컷이 모두
                // _zoom을 MinZoom으로 완전히 클램프해 zoomBefore==zoomAfter가 되어
                // 간헐적으로 실패했다(2026-09-17, 지형 반응 데칼 검증 중 실제로 겪음).
                // 이 체크를 세션의 첫 레벨업으로 만들면 zoomBefore가 항상 손 안 댄
                // 기본값(6)이라 결정적으로 통과한다.
                CheckLevelUpCut();
                CheckLootMarker();
                CheckSigilState();
                CheckWeaponVisual();
                CheckWhirl();
                CheckDebugHud();
                CheckSettingsPanel();
                CheckPlayerHudLocalization();
                CheckActionButtonLocalization();
                CheckGoalBoardAndSessionCard();
                CheckGraveMarker(); // SessionCard를 띄우므로 CheckGoalBoardAndSessionCard 뒤(그 체크가 "시작부터 숨김" 전제를 이미 다 씀).
                CheckGroundDecal();
            }

            if (_framesSeen >= FramesToRun)
            {
                EditorApplication.update -= CountFrames;
                EditorApplication.isPlaying = false;
            }
        }

        /// <summary>"타격감 2차"(PLAN.md 101-3 C hitstop, 2026-09-17 추가) —
        /// `PlayerCombat.ApplyHitstop()`가 코루틴 첫 세그먼트(첫 yield 전)를
        /// `StartCoroutine()` 호출과 같은 프레임에 동기 실행한다는 점을
        /// 이용해, 공격 직후 바로 Animator.speed==0인지 확인한다(복원
        /// 타이밍까지는 안 본다 — `SessionCard`의 `_closeTimer`처럼 실시간을
        /// 흉내 내는 필드가 따로 없어, FlashHit()의 색 복원과 같은 결로
        /// 신뢰한다). 더미(`SpawnDummyEnemy`)는 모델이 없어 자기 Animator가
        /// 원래 null이라 피해자 쪽은 "null 허용" 분기만 확인되고, 가해자
        /// (플레이어) 쪽만 실제로 값을 본다.</summary>
        private static void CheckHitstop()
        {
            var playerGo = GameObject.FindWithTag("Player");
            var combat = playerGo != null ? playerGo.GetComponent<PlayerCombat>() : null;
            var controller = playerGo != null ? playerGo.GetComponent<PlayerController>() : null;
            if (playerGo == null || combat == null || controller == null)
            {
                Debug.LogError("[PlaytestDungeonHeadless] hitstop 검증용 player/PlayerCombat/PlayerController를 못 찾음");
                _hadError = true;
                return;
            }

            var dummy = SpawnDummyEnemy(playerGo.transform.position + new Vector3(1.5f, 0f, 0f));
            var playerAnimator = controller.Animator;
            combat.TriggerAttack();
            float? speedRightAfter = playerAnimator != null ? playerAnimator.speed : (float?)null;
            Object.Destroy(dummy.gameObject);

            if (playerAnimator == null)
            {
                Debug.Log("[PlaytestDungeonHeadless] hitstop 검증 스킵 — 이 씬 Player Animator가 null(폴백 캡슐, 정상 케이스)");
                return;
            }
            if (speedRightAfter != 0f)
            {
                Debug.LogError($"[PlaytestDungeonHeadless] hitstop이 공격 직후 player Animator를 안 멈춤 — speed={speedRightAfter}");
                _hadError = true;
                return;
            }
            Debug.Log("[PlaytestDungeonHeadless] hitstop OK - 공격 직후 player Animator.speed=0 확인");
        }

        /// <summary>PLAN.md 101-3 C "타격 VFX"(2026-09-17 추가) — `HitSpark`는
        /// 풀링 없이 매번 새 GameObject를 만들어 `SpawnCount`(테스트 전용
        /// 카운터, `StoryCombat.RestoreMp`와 같은 결)로만 확인한다. 실제
        /// 타격은 `DungeonEnemy.TakeDamage()`가 부르므로 더미를 죽지 않을
        /// 만큼 살짝만 때린다(CheckHitstop처럼 999999f로 즉사시키면 이후
        /// 검증에 쓸 더미가 없어진다 — 이 더미는 이 체크 전용으로 새로 스폰).</summary>
        private static void CheckHitSpark()
        {
            var playerGo = GameObject.FindWithTag("Player");
            if (playerGo == null)
            {
                Debug.LogError("[PlaytestDungeonHeadless] hitspark 검증용 player를 못 찾음");
                _hadError = true;
                return;
            }

            var dummy = SpawnDummyEnemy(playerGo.transform.position + new Vector3(1.5f, 0f, 0f));
            int before = HitSpark.SpawnCount;
            dummy.TakeDamage(1f);
            Object.Destroy(dummy.gameObject);

            if (HitSpark.SpawnCount != before + 1)
            {
                Debug.LogError($"[PlaytestDungeonHeadless] 히트 파티클이 안 생김 — SpawnCount {before} → {HitSpark.SpawnCount}");
                _hadError = true;
                return;
            }
            Debug.Log("[PlaytestDungeonHeadless] hitspark OK - 타격마다 HitSpark.Spawn 호출 확인");
        }

        /// <summary>PLAN.md 101-3 F "죽음"(2026-09-17 추가) — 실제로 죽여서
        /// `LootMarker.Spawn()`이 불렸는지만 카운터로 본다(`CheckHitSpark`와
        /// 같은 결). 더미를 player 1.5m 옆에서 죽여 마커의 회수 반경(2m)
        /// 안에서 바로 스폰되게 하면 이후 자연 프레임에서 픽업 경로도 같이
        /// 타는데, 그때 예외가 나면 `Run()`의 전역 로그 리스너가 잡아
        /// FAIL로 드러난다 — 여기서 따로 다시 확인하지 않는다.</summary>
        private static void CheckLootMarker()
        {
            var playerGo = GameObject.FindWithTag("Player");
            if (playerGo == null)
            {
                Debug.LogError("[PlaytestDungeonHeadless] 유품 마커 검증용 player를 못 찾음");
                _hadError = true;
                return;
            }

            var dummy = SpawnDummyEnemy(playerGo.transform.position + new Vector3(1.5f, 0f, 0f));
            int before = LootMarker.SpawnCount;
            dummy.TakeDamage(999999f);

            if (LootMarker.SpawnCount != before + 1)
            {
                Debug.LogError($"[PlaytestDungeonHeadless] 유품 마커가 안 생김 — SpawnCount {before} → {LootMarker.SpawnCount}");
                _hadError = true;
                return;
            }
            Debug.Log("[PlaytestDungeonHeadless] loot marker OK - 사망마다 LootMarker.Spawn 호출 확인(픽업 경로는 이후 자연 프레임에서 같이 검증됨)");
        }

        /// <summary>PLAN.md 101-2 5.3 "부적 던전"(2026-09-19 추가) — `SigilState`는
        /// UnityEngine 의존이 없는 순수 함수라 게임 오브젝트 없이 직접 호출해
        /// 값을 본다(`DungeonFormulas`류와 같은 결). 층9(층10 미만)·층11(보스층
        /// 아님)은 부적 층이 아니고, 층12(보스층·10 이상)는 부적 층에 정예 폭증
        /// (hp×2·dmg×1), 층15는 유리대포(hp×1·dmg×1.5)가 항상 걸리는지 —
        /// 그리고 `ModOf`가 결정적인지(같은 층 두 번 호출해도 같음) 확인한다.</summary>
        private static void CheckSigilState()
        {
            if (SigilState.IsSigilFloor(9) || SigilState.IsSigilFloor(11) || !SigilState.IsSigilFloor(12))
            {
                Debug.LogError($"[PlaytestDungeonHeadless] SigilState.IsSigilFloor 조건이 어긋남 — 9={SigilState.IsSigilFloor(9)} 11={SigilState.IsSigilFloor(11)} 12={SigilState.IsSigilFloor(12)}(기대 false/false/true)");
                _hadError = true;
                return;
            }

            if (SigilState.ModOf(12) != SigilState.ModOf(12))
            {
                Debug.LogError("[PlaytestDungeonHeadless] SigilState.ModOf가 결정적이지 않음(같은 층인데 값이 다름)");
                _hadError = true;
                return;
            }

            bool eliteSurgeOk = Mathf.Approximately(SigilState.EnemyHpMultiplier(12), 2f) && Mathf.Approximately(SigilState.EnemyDamageMultiplier(12), 1f);
            bool glassCannonOk = Mathf.Approximately(SigilState.EnemyHpMultiplier(15), 1f) && Mathf.Approximately(SigilState.EnemyDamageMultiplier(15), 1.5f);
            bool normalFloorOk = Mathf.Approximately(SigilState.EnemyHpMultiplier(9), 1f) && Mathf.Approximately(SigilState.EnemyDamageMultiplier(11), 1f);
            if (!eliteSurgeOk || !glassCannonOk || !normalFloorOk)
            {
                Debug.LogError($"[PlaytestDungeonHeadless] SigilState 배율이 기대와 다름 — 12층 hp×{SigilState.EnemyHpMultiplier(12)} dmg×{SigilState.EnemyDamageMultiplier(12)}, 15층 hp×{SigilState.EnemyHpMultiplier(15)} dmg×{SigilState.EnemyDamageMultiplier(15)}");
                _hadError = true;
                return;
            }

            int bonus12 = SigilState.ClearBonusGold(12);
            int expectedBonus12 = DungeonFormulas.RewardGold(12, true);
            if (bonus12 != expectedBonus12 || SigilState.ClearBonusGold(11) != 0)
            {
                Debug.LogError($"[PlaytestDungeonHeadless] SigilState.ClearBonusGold가 기대와 다름 — 12층={bonus12}(기대 {expectedBonus12}), 11층={SigilState.ClearBonusGold(11)}(기대 0)");
                _hadError = true;
                return;
            }

            Debug.Log($"[PlaytestDungeonHeadless] sigil state OK - 층12=정예 폭증(hp×2), 층15=유리대포(dmg×1.5), 결정적, 클리어 보상 {bonus12}");
        }

        /// <summary>PLAN.md 101-2 5.2 "유품"(2026-09-19 추가) — 플레이어를 실제로
        /// 죽여(`HeroState.TakeDamage`) `GraveMarker.Spawn()`이 불렸는지, 그리고
        /// 소지 골드가 정확히 그 값만큼 0으로 비워지는지 본다(`CheckLootMarker`와
        /// 같은 결 — 회수 경로는 마커가 플레이어 자리에 그대로 스폰돼(거리 0,
        /// PickupRadius 2m 안) 이후 자연 프레임에서 예외 없이 타는지로 대신
        /// 확인한다). `CheckGoalBoardAndSessionCard` 뒤에 둔다 — 이 죽음이
        /// `GameBootstrap.OnHeroDied()`로 SessionCard를 띄우는데, 그 체크는
        /// "세션 시작부터 떠 있으면 실패"를 전제해 먼저 끝나 있어야 한다.</summary>
        private static void CheckGraveMarker()
        {
            var playerGo = GameObject.FindWithTag("Player");
            if (playerGo == null)
            {
                Debug.LogError("[PlaytestDungeonHeadless] 유품(사망) 검증용 player를 못 찾음");
                _hadError = true;
                return;
            }

            HeroState.AddGold(77);
            int goldBefore = HeroState.Gold;
            int before = GraveMarker.SpawnCount;

            HeroState.TakeDamage(999999f);

            if (GraveMarker.SpawnCount != before + 1)
            {
                Debug.LogError($"[PlaytestDungeonHeadless] 유품(사망) 마커가 안 생김 — SpawnCount {before} → {GraveMarker.SpawnCount}");
                _hadError = true;
                return;
            }
            if (HeroState.Gold != 0)
            {
                Debug.LogError($"[PlaytestDungeonHeadless] 사망 후 골드가 안 비워짐 — {HeroState.Gold}(기대 0, 원래 {goldBefore})");
                _hadError = true;
                return;
            }
            Debug.Log($"[PlaytestDungeonHeadless] grave marker OK - 사망 시 금 {goldBefore} 전부 유품으로, HeroState.Gold=0(픽업 경로는 이후 자연 프레임에서 같이 검증됨)");
        }

        /// <summary>PLAN.md 101-3 G "성장 연출"(2026-09-17 추가) — Timeline
        /// 대신 `CameraRig.PlayLevelUpCut()`(줌 펀치인)으로 대신했다(클래스
        /// 주석 참고). `HeroState.AddExp()`가 `LeveledUp`을 동기 호출하고
        /// `GameBootstrap.OnLeveledUp()`이 그 자리에서 `StartCoroutine()`을
        /// 부르니 `CheckHitstop`과 같은 이유로 같은 프레임에 `_zoom`이 이미
        /// 움직여 있다.</summary>
        private static void CheckLevelUpCut()
        {
            var cameraRig = Object.FindFirstObjectByType<CameraRig>();
            if (cameraRig == null)
            {
                Debug.LogError("[PlaytestDungeonHeadless] 성장 연출 검증용 CameraRig를 못 찾음");
                _hadError = true;
                return;
            }

            var zoomField = typeof(CameraRig).GetField("_zoom", BindingFlags.NonPublic | BindingFlags.Instance);
            float zoomBefore = (float)zoomField.GetValue(cameraRig);

            HeroState.AddExp(HeroState.ExpToNext + 1);

            float zoomAfter = (float)zoomField.GetValue(cameraRig);
            if (Mathf.Approximately(zoomAfter, zoomBefore))
            {
                Debug.LogError($"[PlaytestDungeonHeadless] 레벨업 직후 카메라 줌이 안 바뀜 — zoom={zoomAfter}");
                _hadError = true;
                return;
            }
            Debug.Log($"[PlaytestDungeonHeadless] level-up cut OK - 레벨업 직후 zoom {zoomBefore:F2}→{zoomAfter:F2}");
        }

        /// <summary>PLAN.md 101-3 G "장비 가시화"(2026-09-17 추가) —
        /// `HeroState.EquipmentChanged`가 동기 이벤트라 `CheckLevelUpCut`과
        /// 같은 이유로 `EquipIfBetter()` 호출 직후 바로 값을 본다.
        /// wp_glaive(2등급, AtkBonus 26)는 이 시점까지 다른 검사가 남긴
        /// 어떤 드랍(기본 wp_axe, 2등급 미만)보다도 확실히 세서 결정적으로
        /// "장착됨 → 칼날이 커짐"을 보장한다.</summary>
        private static void CheckWeaponVisual()
        {
            var playerGo = GameObject.FindWithTag("Player");
            var weaponVisual = playerGo != null ? playerGo.GetComponent<WeaponVisual>() : null;
            if (playerGo == null || weaponVisual == null)
            {
                Debug.LogError("[PlaytestDungeonHeadless] 무기 가시화 검증용 WeaponVisual을 못 찾음");
                _hadError = true;
                return;
            }

            var blade = (Transform)GetPrivate(weaponVisual, "_blade");
            if (blade == null)
            {
                Debug.LogError("[PlaytestDungeonHeadless] 무기 칼날(blade) 메시가 안 생김");
                _hadError = true;
                return;
            }

            float lengthBefore = blade.localScale.y;
            HeroState.EquipIfBetter("wp_glaive");
            float lengthAfter = blade.localScale.y;

            if (lengthAfter <= lengthBefore)
            {
                Debug.LogError($"[PlaytestDungeonHeadless] 무기 등급 갱신이 칼날 크기에 안 반영됨 — {lengthBefore:F2}→{lengthAfter:F2}");
                _hadError = true;
                return;
            }
            Debug.Log($"[PlaytestDungeonHeadless] weapon visual OK - 무기 교체 시 칼날 길이 {lengthBefore:F2}→{lengthAfter:F2}(등급 갱신 반영)");
        }

        private static void CheckWhirl()
        {
            var playerGo = GameObject.FindWithTag("Player");
            var combat = playerGo != null ? playerGo.GetComponent<PlayerCombat>() : null;
            if (playerGo == null || combat == null)
            {
                Debug.LogError("[PlaytestDungeonHeadless] 회전베기 검증용 player/PlayerCombat을 못 찾음");
                _hadError = true;
                return;
            }

            Vector3 origin = playerGo.transform.position;
            var near1 = SpawnDummyEnemy(origin + new Vector3(1.5f, 0f, 0f));
            var near2 = SpawnDummyEnemy(origin + new Vector3(-1.5f, 0f, 0f));
            var far = SpawnDummyEnemy(origin + new Vector3(10f, 0f, 0f));

            float hpBefore = (float)GetPrivate(near1, "hp");
            combat.TriggerWhirl();

            float near1Hp = (float)GetPrivate(near1, "_curHp");
            float near2Hp = (float)GetPrivate(near2, "_curHp");
            float farHp = (float)GetPrivate(far, "_curHp");

            // 회전베기 피해(24 HP 더미에 약 2.8)로는 안 죽어 STORY 더미(Die()로
            // 자가 정리)와 달리 손수 치워야 한다 — 안 치우면 남은 프레임 동안
            // DungeonEnemy.Active에 그대로 남아 플레이어를 쫓아다니며(aggroRadius
            // 8f) 이후 검사에 비결정적 부작용을 끼얹는다.
            Object.Destroy(near1.gameObject);
            Object.Destroy(near2.gameObject);
            Object.Destroy(far.gameObject);

            if (near1Hp >= hpBefore || near2Hp >= hpBefore)
            {
                Debug.LogError($"[PlaytestDungeonHeadless] 회전베기가 반경 안 더미를 안 때림 — near1={near1Hp} near2={near2Hp}(기대 < {hpBefore})");
                _hadError = true;
            }
            else if (!Mathf.Approximately(farHp, hpBefore))
            {
                Debug.LogError($"[PlaytestDungeonHeadless] 회전베기가 반경 밖 더미까지 때림 — far={farHp}(기대={hpBefore})");
                _hadError = true;
            }
            else
            {
                Debug.Log($"[PlaytestDungeonHeadless] whirl OK - near1={near1Hp} near2={near2Hp} far={farHp}(변화 없음)");
            }
        }

        /// <summary>PLAN.md 44~49장 디버그 화면(2026-09-14, GO와 같은 결) —
        /// 레벨/층/적 수/사명/좌표 줄이 실제로 채워지는지 본다.</summary>
        private static void CheckDebugHud()
        {
            var hudGo = GameObject.Find("DebugUI");
            var hud = hudGo != null ? hudGo.GetComponent<DebugHud>() : null;
            var labelGo = hudGo != null ? hudGo.transform.Find("Label") : null;
            var label = labelGo != null ? labelGo.GetComponent<Text>() : null;
            if (hud == null || label == null)
            {
                Debug.LogError("[PlaytestDungeonHeadless] DebugUI/Label을 못 찾음");
                _hadError = true;
                return;
            }

            var method = typeof(DebugHud).GetMethod("Refresh", BindingFlags.NonPublic | BindingFlags.Instance);
            method.Invoke(hud, null);

            if (!label.text.Contains("lv ") || !label.text.Contains("floor ") || !label.text.Contains("quest:") || !label.text.Contains("pos:"))
            {
                Debug.LogError($"[PlaytestDungeonHeadless] 디버그 오버레이 내용 이상 text=\"{label.text}\"");
                _hadError = true;
            }
            else
            {
                Debug.Log($"[PlaytestDungeonHeadless] debug hud OK - \"{label.text.Replace("\n", " | ")}\"");
            }
        }

        /// <summary>PLAN.md 104-1 ②(2026-09-16) — GO
        /// `PlaytestHeadless.CheckSettingsPanel()`과 같은 결로 존재 확인만
        /// 하던 걸 TogglePanel()·ChooseSfx() 실제 호출 + 라벨 텍스트
        /// 확인으로 바꿨다(RealmCommandUi 사례 재발 방지 — 그쪽 클래스
        /// 주석 참고).</summary>
        private static void CheckSettingsPanel()
        {
            var panel = Object.FindFirstObjectByType<DungeonSettingsPanel>();
            if (panel == null)
            {
                Debug.LogError("[PlaytestDungeonHeadless] DungeonSettingsPanel 컴포넌트를 못 찾음");
                _hadError = true;
                return;
            }

            var panelGoField = typeof(DungeonSettingsPanel).GetField("_panel", BindingFlags.NonPublic | BindingFlags.Instance);
            var panelGo = panelGoField.GetValue(panel) as GameObject;
            if (panelGo == null)
            {
                Debug.LogError("[PlaytestDungeonHeadless] DungeonSettingsPanel._panel이 null — 씬 재로드 후 참조가 안 살아남음");
                _hadError = true;
                return;
            }

            var toggleMethod = typeof(DungeonSettingsPanel).GetMethod("TogglePanel", BindingFlags.NonPublic | BindingFlags.Instance);
            toggleMethod.Invoke(panel, null); // 열기 — 여기서 NRE가 나면 그대로 테스트 실패로 드러난다.
            if (!panelGo.activeSelf)
            {
                Debug.LogError("[PlaytestDungeonHeadless] TogglePanel() 호출 후에도 설정 패널이 안 열림");
                _hadError = true;
                return;
            }
            toggleMethod.Invoke(panel, null); // 닫기
            if (panelGo.activeSelf)
            {
                Debug.LogError("[PlaytestDungeonHeadless] TogglePanel() 두 번째 호출 후에도 설정 패널이 안 닫힘");
                _hadError = true;
                return;
            }

            var sfxValueLabelField = typeof(DungeonSettingsPanel).GetField("_sfxValueLabel", BindingFlags.NonPublic | BindingFlags.Instance);
            var sfxValueLabel = sfxValueLabelField.GetValue(panel) as Text;
            if (sfxValueLabel == null)
            {
                Debug.LogError("[PlaytestDungeonHeadless] DungeonSettingsPanel._sfxValueLabel이 null");
                _hadError = true;
                return;
            }

            bool sfxBefore = DungeonSettingsState.SfxOn;
            var chooseSfxMethod = typeof(DungeonSettingsPanel).GetMethod("ChooseSfx", BindingFlags.NonPublic | BindingFlags.Instance);
            chooseSfxMethod.Invoke(panel, null); // 실제 버튼 핸들러 — 상태를 뒤집고 Refresh()까지 그대로 탄다.
            string expectedText = DungeonLocalization.T(DungeonSettingsState.SfxOn ? "state.on" : "state.off");
            if (DungeonSettingsState.SfxOn == sfxBefore || sfxValueLabel.text != expectedText)
            {
                Debug.LogError($"[PlaytestDungeonHeadless] ChooseSfx() 이후 라벨이 실제로 안 바뀜 text=\"{sfxValueLabel.text}\"(기대=\"{expectedText}\")");
                _hadError = true;
                return;
            }
            chooseSfxMethod.Invoke(panel, null); // 원상복귀

            bool vibBefore = DungeonSettingsState.VibrationOn;
            DungeonSettingsState.VibrationOn = !vibBefore;
            if (DungeonSettingsState.VibrationOn == vibBefore)
            {
                Debug.LogError("[PlaytestDungeonHeadless] 진동 토글이 안 바뀜");
                _hadError = true;
                return;
            }

            DungeonSettingsState.UiScaleMultiplier = 1.15f;
            var scaler = Object.FindFirstObjectByType<CanvasScaler>();
            float expected = 1080f / 1.15f;
            if (scaler == null || Mathf.Abs(scaler.referenceResolution.x - expected) > 1f)
            {
                Debug.LogError($"[PlaytestDungeonHeadless] UI 크기가 캔버스에 안 먹음 — got={(scaler == null ? "null" : scaler.referenceResolution.x.ToString())}");
                _hadError = true;
                return;
            }
            DungeonSettingsState.UiScaleMultiplier = 1f;

            DungeonSettingsState.HighGraphicsQuality = false;
            if (!Mathf.Approximately(QualitySettings.shadowDistance, 15f) || QualitySettings.antiAliasing != 0)
            {
                Debug.LogError($"[PlaytestDungeonHeadless] 그래픽 품질(절약)이 QualitySettings에 안 먹음 — shadowDistance={QualitySettings.shadowDistance} aa={QualitySettings.antiAliasing}");
                _hadError = true;
                return;
            }
            DungeonSettingsState.HighGraphicsQuality = true;

            string langBefore = DungeonLocalization.CurrentLanguage;
            string qualityLabelBefore = DungeonSettingsState.GraphicsQualityLabel();
            DungeonLocalization.CycleLanguage();
            if (DungeonLocalization.CurrentLanguage == langBefore
                || DungeonSettingsState.GraphicsQualityLabel() == qualityLabelBefore)
            {
                Debug.LogError("[PlaytestDungeonHeadless] 언어 전환이 실제 문구를 안 바꿈");
                _hadError = true;
                return;
            }
            DungeonLocalization.CurrentLanguage = langBefore;

            Debug.Log("[PlaytestDungeonHeadless] settings panel OK - sfx/vibration/ui-scale/graphics-quality/language all verified");
        }

        /// <summary>PLAN.md 67~69장 "Localization" 2차(2026-09-14) — PlayerHud의
        /// 체력/경험치/돈/공격력/층 표시가 실제로 영어 문구를 보여주는지 본다.</summary>
        private static void CheckPlayerHudLocalization()
        {
            var hudGo = GameObject.Find("PlayerHudUI");
            var hud = hudGo != null ? hudGo.GetComponent<PlayerHud>() : null;
            var label = hudGo != null ? hudGo.GetComponentInChildren<Text>() : null;
            if (hud == null || label == null)
            {
                Debug.LogError("[PlaytestDungeonHeadless] PlayerHudUI/Label을 못 찾음");
                _hadError = true;
                return;
            }

            string langBefore = DungeonLocalization.CurrentLanguage;
            var method = typeof(PlayerHud).GetMethod("Refresh", BindingFlags.NonPublic | BindingFlags.Instance);

            DungeonLocalization.CurrentLanguage = "en";
            method.Invoke(hud, null);
            if (!label.text.Contains("HP") || !label.text.Contains("EXP") || !label.text.Contains("ATK"))
            {
                Debug.LogError($"[PlaytestDungeonHeadless] PlayerHud 영어 전환이 안 먹음 text=\"{label.text}\"");
                _hadError = true;
                DungeonLocalization.CurrentLanguage = langBefore;
                return;
            }
            DungeonLocalization.CurrentLanguage = langBefore;
            method.Invoke(hud, null);

            Debug.Log("[PlaytestDungeonHeadless] player hud localization OK");
        }

        /// <summary>2026-09-15 "모바일 액션 버튼 언어 전환 반응" —
        /// `LocalizedButtonLabel`(폴링, Update()는 private이라 리플렉션)이
        /// 씬 빌드 시점 이후에도 언어를 따라가는지 본다.</summary>
        private static void CheckActionButtonLocalization()
        {
            var go = GameObject.Find("AttackButton");
            var localized = go != null ? go.GetComponent<LocalizedButtonLabel>() : null;
            var label = go != null ? go.GetComponentInChildren<Text>() : null;
            if (localized == null || label == null)
            {
                Debug.LogError("[PlaytestDungeonHeadless] AttackButton/LocalizedButtonLabel을 못 찾음");
                _hadError = true;
                return;
            }

            string langBefore = DungeonLocalization.CurrentLanguage;
            var method = typeof(LocalizedButtonLabel).GetMethod("Update", BindingFlags.NonPublic | BindingFlags.Instance);

            DungeonLocalization.CurrentLanguage = "en";
            method.Invoke(localized, null);
            if (label.text != "Attack")
            {
                Debug.LogError($"[PlaytestDungeonHeadless] 액션 버튼 영어 전환이 안 먹음 text=\"{label.text}\"(기대=Attack)");
                _hadError = true;
                DungeonLocalization.CurrentLanguage = langBefore;
                return;
            }
            DungeonLocalization.CurrentLanguage = langBefore;
            method.Invoke(localized, null);
            if (label.text != "공격")
            {
                Debug.LogError($"[PlaytestDungeonHeadless] 액션 버튼이 원래 언어로 안 돌아옴 text=\"{label.text}\"(기대=공격)");
                _hadError = true;
            }

            Debug.Log("[PlaytestDungeonHeadless] action button localization OK");
        }

        /// <summary>PLAN.md 101-2 "공통 선행" A·B(DUNGEON 두 번째 이식) —
        /// `PlaytestHeadless.CheckGoalBoardAndSessionCard()`(GO)와 완전히
        /// 같은 기준 — GoalBoard 세 줄이 실제로 채워지는지, Awake()의
        /// IGoalSource 자동 재탐색이 동작하는지, SessionCard 가 뜨고
        /// 스스로 닫히는지를 직접 확인한다 — 존재 확인만으로 끝내지 않는다.</summary>
        private static void CheckGoalBoardAndSessionCard()
        {
            var board = Object.FindFirstObjectByType<GoalBoard>();
            if (board == null)
            {
                Debug.LogError("[PlaytestDungeonHeadless] GoalBoard 컴포넌트를 못 찾음");
                _hadError = true;
                return;
            }

            var sourceField = typeof(GoalBoard).GetField("_source", BindingFlags.NonPublic | BindingFlags.Instance);
            if (sourceField.GetValue(board) == null)
            {
                Debug.LogError("[PlaytestDungeonHeadless] GoalBoard._source가 null — Awake() 자동 재탐색 실패");
                _hadError = true;
                return;
            }

            var labelField = typeof(GoalBoard).GetField("_label", BindingFlags.NonPublic | BindingFlags.Instance);
            var label = labelField.GetValue(board) as Text;
            if (label == null || !label.text.Contains("지금 —") || !label.text.Contains("이번 세션 —") || !label.text.Contains("이번 주 —"))
            {
                Debug.LogError($"[PlaytestDungeonHeadless] GoalBoard 세 줄이 안 채워짐 text=\"{(label == null ? "null" : label.text.Replace("\n", " | "))}\"");
                _hadError = true;
                return;
            }

            var card = Object.FindFirstObjectByType<SessionCard>();
            if (card == null)
            {
                Debug.LogError("[PlaytestDungeonHeadless] SessionCard 컴포넌트를 못 찾음");
                _hadError = true;
                return;
            }
            if (card.IsShowing)
            {
                Debug.LogError("[PlaytestDungeonHeadless] SessionCard가 세션 시작부터 떠 있음(기본은 숨김)");
                _hadError = true;
                return;
            }

            card.Show("테스트", "줄1", "줄2");
            if (!card.IsShowing)
            {
                Debug.LogError("[PlaytestDungeonHeadless] SessionCard.Show() 호출 후에도 안 뜸");
                _hadError = true;
                return;
            }

            // 5초를 실제로 안 기다리고 _closeTimer를 만료 직전으로 돌린 뒤
            // Update()를 한 번 더 불러 자동 닫힘 경로를 확인한다.
            var closeTimerField = typeof(SessionCard).GetField("_closeTimer", BindingFlags.NonPublic | BindingFlags.Instance);
            closeTimerField.SetValue(card, 0.0001f);
            var updateMethod = typeof(SessionCard).GetMethod("Update", BindingFlags.NonPublic | BindingFlags.Instance);
            updateMethod.Invoke(card, null);
            if (card.IsShowing)
            {
                Debug.LogError("[PlaytestDungeonHeadless] SessionCard가 만료 후에도 자동으로 안 닫힘");
                _hadError = true;
                return;
            }

            if (Object.FindFirstObjectByType<DungeonSessionTracker>() == null)
            {
                Debug.LogError("[PlaytestDungeonHeadless] DungeonSessionTracker 컴포넌트를 못 찾음");
                _hadError = true;
                return;
            }

            Debug.Log("[PlaytestDungeonHeadless] goal board / session card OK - 3 lines filled, source auto-found, card shows and auto-closes");
        }

        /// <summary>PLAN.md 101-3 G "지형 반응"(2026-09-17 추가) — 타격마다
        /// `GroundDecal.Spawn(HitMark)`가 실제로 호출되는지, 그리고 "최대
        /// 32" 캡이 지켜지는지 둘 다 본다. 이 시점까지 이미 여러 검사
        /// (hitstop·hitspark·loot marker·whirl·weapon visual)가 적을 때려
        /// 히트마크를 계속 쌓아 왔으니 그 누적 위에 40개를 몰아 스폰해
        /// 캡이 진짜 32에서 멈추는지 확인한다(발자국은 씬이 짧게 도는
        /// 헤드리스 특성상 플레이어가 거의 안 움직여 여기선 안 본다 —
        /// 히트마크 경로와 스폰 함수 자체가 같아 캡 검증엔 충분하다).</summary>
        private static void CheckGroundDecal()
        {
            var playerGo = GameObject.FindWithTag("Player");
            if (playerGo == null)
            {
                Debug.LogError("[PlaytestDungeonHeadless] 지형 데칼 검증용 player를 못 찾음");
                _hadError = true;
                return;
            }

            int before = GroundDecal.ActiveCount;
            var dummy = SpawnDummyEnemy(playerGo.transform.position + new Vector3(2f, 0f, 0f));
            dummy.TakeDamage(1f);
            Object.Destroy(dummy.gameObject);

            if (GroundDecal.ActiveCount <= before)
            {
                Debug.LogError($"[PlaytestDungeonHeadless] 타격 지형 데칼이 안 생김 — before={before} after={GroundDecal.ActiveCount}");
                _hadError = true;
                return;
            }

            for (int i = 0; i < 40; i++)
            {
                GroundDecal.Spawn(Vector3.zero, GroundDecal.Kind.HitMark);
            }

            if (GroundDecal.ActiveCount > 32)
            {
                Debug.LogError($"[PlaytestDungeonHeadless] 지형 데칼 최대 32 캡이 안 지켜짐 — ActiveCount={GroundDecal.ActiveCount}");
                _hadError = true;
                return;
            }

            Debug.Log($"[PlaytestDungeonHeadless] ground decal OK - 타격마다 생성 확인, 캡 이후 ActiveCount={GroundDecal.ActiveCount}(<=32)");
        }

        private static DungeonEnemy SpawnDummyEnemy(Vector3 position)
        {
            var go = new GameObject("WhirlTestDummy");
            go.transform.position = position;
            return go.AddComponent<DungeonEnemy>();
        }

        private static object GetPrivate(object target, string fieldName)
        {
            var field = target.GetType().GetField(fieldName, BindingFlags.NonPublic | BindingFlags.Instance);
            return field?.GetValue(target);
        }
    }
}
