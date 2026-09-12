using System.Reflection;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using Saga.Story.Data;
using Saga.Story.Player;
using Saga.Story.World;

namespace Saga.EditorTools
{
    /// <summary>
    /// VERTICAL_SLICE_STORY.md 완료 조건을 실제 Play 모드 GameObject 경로로
    /// 확인한다(DUNGEON `PlaytestDungeonFloorProgression.cs`와 같은 결 —
    /// CharacterController 토글 순간이동 + 리플렉션으로 사설 로직 직접
    /// 호출). 실제 키보드 입력 시뮬레이션은 이 프로젝트에 아직 선례가
    /// 없어(다른 Playtest들도 전부 순간이동+직접 호출 방식) 이동감·점프
    /// 궤적·로프 키 조작 자체는 사람이 GUI로 확인해야 한다 — 여기서는
    /// **로직 경로**(트리거 배선, 전투 판정, 저장/로드)만 검증한다:
    /// (1) 잡졸 셋에게 다가가 실제로 때려서 죽이고 사명 카운트가 오르는지,
    /// (2) 점프 버튼이 수직 속도를 실제로 올리는지,
    /// (3) 로프 트리거 진입/이탈이 실제로 배선되는지,
    /// (4) 저장 후 상태를 지웠다가 불러오면 그대로 돌아오는지.
    /// </summary>
    public static class PlaytestStorySlice
    {
        private const string ScenePath = "Assets/Scenes/TestField.unity";

        private static bool _hadError;
        private static int _framesSeen;
        private static bool _origEnterPlayModeOptionsEnabled;
        private static EnterPlayModeOptions _origEnterPlayModeOptions;

        private enum Phase { Init, KillEnemies, LandBeforeJump, EnterRope, ExitRope, SaveLoad, Done }
        private static Phase _phase = Phase.Init;
        private static float _waitUntilRealTime;
        private static int _enemyIndex;

        private static Transform _player;
        private static CharacterController _playerController;
        private static StoryPlayerController _storyController;
        private static GameObject _ropeGo;
        private static StoryRope _rope;

        [MenuItem("Saga/Playtest Story Slice (Headless)")]
        public static void Run()
        {
            _origEnterPlayModeOptionsEnabled = EditorSettings.enterPlayModeOptionsEnabled;
            _origEnterPlayModeOptions = EditorSettings.enterPlayModeOptions;
            EditorSettings.enterPlayModeOptionsEnabled = true;
            EditorSettings.enterPlayModeOptions =
                EnterPlayModeOptions.DisableDomainReload | EnterPlayModeOptions.DisableSceneReload;

            EditorSceneManager.OpenScene(ScenePath);

            _hadError = false;
            _framesSeen = 0;
            _phase = Phase.Init;
            _waitUntilRealTime = 0f;
            _enemyIndex = 0;
            _player = null;
            _playerController = null;
            _storyController = null;
            _ropeGo = null;
            _rope = null;

            Application.logMessageReceived += OnLog;
            EditorApplication.playModeStateChanged += OnStateChanged;
            EditorApplication.isPlaying = true;
        }

        private static void OnLog(string condition, string stackTrace, LogType type)
        {
            if (type != LogType.Error && type != LogType.Exception) return;
            if (stackTrace.Contains("UnityEditor.Search.SearchInit.IndexationOnStartup")) return;

            _hadError = true;
            Debug.LogError($"[PlaytestStorySlice] runtime error: {condition}\n{stackTrace}");
        }

        private static void OnStateChanged(PlayModeStateChange state)
        {
            if (state == PlayModeStateChange.EnteredPlayMode)
            {
                EditorApplication.update += Tick;
            }
            else if (state == PlayModeStateChange.EnteredEditMode)
            {
                Application.logMessageReceived -= OnLog;
                EditorApplication.playModeStateChanged -= OnStateChanged;
                EditorSettings.enterPlayModeOptionsEnabled = _origEnterPlayModeOptionsEnabled;
                EditorSettings.enterPlayModeOptions = _origEnterPlayModeOptions;

                bool ok = !_hadError && _phase == Phase.Done;
                Debug.Log(ok
                    ? "[PlaytestStorySlice] OK - killed 3 grunts, jump/rope/save-load all verified, no errors"
                    : $"[PlaytestStorySlice] FAIL - error={_hadError} phase={_phase} frames={_framesSeen}");
                EditorApplication.Exit(ok ? 0 : 1);
            }
        }

        private static void Tick()
        {
            _framesSeen++;
            // 다른 Playtest들의 2000 프레임 예산과 달리 이 테스트는 트리거
            // 안정화를 위해 실시간(Time.realtimeSinceStartup) 기준 대기를
            // 세 번 쓴다(각 0.2초) — 배치 모드가 초당 수천 프레임으로
            // 도는 걸 감안해 여유 있게 잡는다.
            if (_framesSeen > 20000)
            {
                Debug.LogError("[PlaytestStorySlice] 프레임 예산 초과");
                Fail();
                return;
            }

            switch (_phase)
            {
                case Phase.Init:
                    var playerGo = GameObject.FindWithTag("Player");
                    _player = playerGo != null ? playerGo.transform : null;
                    _playerController = playerGo != null ? playerGo.GetComponent<CharacterController>() : null;
                    _storyController = playerGo != null ? playerGo.GetComponent<StoryPlayerController>() : null;
                    _ropeGo = GameObject.Find("Rope");
                    _rope = _ropeGo != null ? _ropeGo.GetComponent<StoryRope>() : null;

                    if (_player == null || _storyController == null || _rope == null || StoryEnemy.All.Count != 3)
                    {
                        Debug.LogError($"[PlaytestStorySlice] 씬 구성 못 찾음 — player={_player != null} controller={_storyController != null} rope={_rope != null} enemies={StoryEnemy.All.Count}");
                        Fail();
                        return;
                    }
                    if (StoryQuestState.Kills != 0)
                    {
                        Debug.LogError($"[PlaytestStorySlice] 시작 kills가 0이 아님 — {StoryQuestState.Kills}");
                        Fail();
                        return;
                    }
                    _enemyIndex = 0;
                    _phase = Phase.KillEnemies;
                    break;

                case Phase.KillEnemies:
                    if (_enemyIndex >= 3)
                    {
                        if (StoryQuestState.Kills != 3)
                        {
                            Debug.LogError($"[PlaytestStorySlice] 잡졸 셋을 다 죽였는데 kills={StoryQuestState.Kills}(기대=3)");
                            Fail();
                            return;
                        }
                        Debug.Log($"[PlaytestStorySlice] killed 3 grunts, kills={StoryQuestState.Kills}");
                        _phase = Phase.LandBeforeJump;
                        break;
                    }

                    var enemy = StoryEnemy.All[0]; // 죽을 때마다 리스트에서 빠지므로 항상 [0]이 "다음" 잡졸.
                    Vector3 enemyPos = enemy.transform.position;
                    TeleportPlayer(enemyPos + new Vector3(-1f, 0f, 0f)); // 왼쪽에 서면 dx>0=facing(+1)과 일치 — 정면 판정 통과.
                    // TryAttack()의 쿨다운(0.36초)은 이 판의 손맛 규칙이지 이 테스트가
                    // 확인하려는 대상이 아니다 — 연속 공격 사이 실제로 몇 프레임씩
                    // 기다리는 대신 매번 0으로 되돌려 "판정 자체"만 격리해서 본다.
                    SetPrivate(_storyController, "_attackCooldownLeft", 0f);
                    InvokePrivate(_storyController, "TryAttack");

                    // 데미지 굴림(atk21×0.88~1.12)의 최솟값(18.48)이 EnemyHp(18)보다
                    // 항상 크다 — 한 방에 죽어야 정상, 안 죽었으면 판정 로직 결함.
                    // Destroy()는 실제 파괴를 프레임 끝으로 미루니 IsDead 플래그로 본다.
                    if (!enemy.IsDead)
                    {
                        Debug.LogError($"[PlaytestStorySlice] 잡졸 #{_enemyIndex}이 한 방에 안 죽음(StartAtk={StoryCombat.StartAtk} vs EnemyHp={StoryCombat.EnemyHp})");
                        Fail();
                        return;
                    }
                    _enemyIndex++;
                    break;

                case Phase.LandBeforeJump:
                    // 배치 모드는 실시간보다 훨씬 빠르게 돈다(초당 수천 프레임 —
                    // PlaytestForestFurniture.cs가 이미 겪은 함정과 같은 종류) —
                    // 프레임 수만큼 기다려도 중력이 실제로 몇 mm도 못 끌어내릴 수
                    // 있다. `Move()`를 직접 큰 하강 벡터로 한 번 불러 접지시키고,
                    // **같은 프레임 안에서 곧바로** isGrounded를 읽는다 — 한 프레임
                    // 쉬면 `StoryPlayerController.Update()`가 그 사이 극소 dt로 자기
                    // Move()를 한 번 더 굴려(속도 0 근처, 배치 모드에서 사실상
                    // 이동량이 0에 가까워) isGrounded를 다시 false로 덮어써 버리는
                    // 걸 실제로 겪었다(CharacterController는 "이번 Move 호출이
                    // 바닥에 닿았는가"만 본다, 최근 방문 프레임 누적이 아니다).
                    TeleportPlayer(new Vector3(2f, 1f, 0f));
                    _playerController.Move(Vector3.down * 5f);
                    if (!_playerController.isGrounded)
                    {
                        var groundGo = GameObject.Find("Terrain/Ground");
                        var groundCol = groundGo != null ? groundGo.GetComponent<Collider>() : null;
                        Debug.LogError("[PlaytestStorySlice] Move(down) 뒤에도 isGrounded가 false — 지형 콜라이더 결함 의심 " +
                            $"playerPos={_player.position} controllerHeight={_playerController.height} controllerCenter={_playerController.center} " +
                            $"groundFound={groundGo != null} groundBounds={(groundCol != null ? groundCol.bounds.ToString() : "n/a")}");
                        Fail();
                        return;
                    }
                    CheckJumpNow();
                    _phase = Phase.EnterRope;
                    break;

                case Phase.EnterRope:
                    // 트리거 충돌 이벤트는 물리 엔진의 FixedUpdate 스텝에서 잡힌다 —
                    // 배치 모드는 렌더 프레임이 실시간보다 훨씬 빠르게 도니(위
                    // LandBeforeJump 주석과 같은 함정) "프레임 수"로 기다리면 실제
                    // 물리 스텝이 한 번도 안 돌았을 수 있다. `Time.realtimeSinceStartup`
                    // 기준 실제 0.2초를 기다린다(PlaytestForestFurniture.cs가 프레임
                    // 대신 Time.time 기준 대기로 고친 것과 같은 처방).
                    if (Time.realtimeSinceStartup < _waitUntilRealTime) return;
                    // rope.X(6.8)가 Platform[0](x 3.8~9.0, y 2.2~2.6) 바로 아래라
                    // 로프 중간 높이로 순간이동하면 캐릭터 캡슐이 그 발판 밑면에
                    // 박혀 CharacterController가 위로 밀어내 버린다(실제로 겪음 —
                    // Enter 직후 곧바로 Exit, y=1.41→2.69로 튀어 오름). 바닥에서
                    // 걸어와 오르기 시작하는 자리(로프 밑동 근처)로 대신 선다 —
                    // 발판과 안 겹치는 진짜 진입 지점.
                    var ropeDef = FieldMapData.Rope();
                    float entryY = ropeDef.Bottom + 0.3f;
                    TeleportPlayer(new Vector3(ropeDef.X, entryY, 0f));
                    _waitUntilRealTime = Time.realtimeSinceStartup + 0.2f;
                    _phase = Phase.ExitRope;
                    break;

                case Phase.ExitRope:
                    if (Time.realtimeSinceStartup < _waitUntilRealTime) return;
                    var ropeAreaField = GetPrivate(_storyController, "_ropeArea");
                    if (ropeAreaField == null)
                    {
                        Debug.LogError("[PlaytestStorySlice] 로프 트리거 안에 서 있는데 _ropeArea가 안 채워짐(OnTriggerEnter 배선 결함)");
                        Fail();
                        return;
                    }
                    // 로프 밖으로 — 여기는 TeleportPlayer()(disable→대입→enable)를
                    // 안 쓴다. Unity는 **트리거와 겹친 콜라이더를 disable하는
                    // 순간엔 OnTriggerExit를 안 보낸다**(문서화된 동작) — 그래서
                    // Enter는 이 헬퍼로 잘 잡히는데 Exit만 실제로 안 잡혔다(직접
                    // 겪음). 콜라이더를 계속 켜 둔 채 `Move()`로 실제 스윕을 한 번
                    // 굴려야 물리 엔진이 "겹침→안 겹침" 전이를 정상적으로 본다.
                    _playerController.Move(new Vector3(10f, 0f, 0f));
                    _waitUntilRealTime = Time.realtimeSinceStartup + 0.2f;
                    _phase = Phase.SaveLoad;
                    break;

                case Phase.SaveLoad:
                    if (Time.realtimeSinceStartup < _waitUntilRealTime) return;
                    var ropeAreaAfterExit = GetPrivate(_storyController, "_ropeArea");
                    if (ropeAreaAfterExit != null)
                    {
                        Debug.LogError("[PlaytestStorySlice] 로프 밖으로 나갔는데 _ropeArea가 안 비워짐(OnTriggerExit 배선 결함)");
                        Fail();
                        return;
                    }

                    Vector3 posBeforeSave = new Vector3(7.5f, 0.1f, 0f);
                    TeleportPlayer(posBeforeSave);
                    if (!StorySaveState.Save())
                    {
                        Debug.LogError("[PlaytestStorySlice] StorySaveState.Save() 실패");
                        Fail();
                        return;
                    }

                    // 상태를 지운 뒤 다시 불러와 그대로 돌아오는지 확인.
                    StoryQuestState.Restore(0);
                    TeleportPlayer(new Vector3(0f, 0.1f, 0f));
                    if (!StorySaveState.TryLoad())
                    {
                        Debug.LogError("[PlaytestStorySlice] StorySaveState.TryLoad() 실패");
                        Fail();
                        return;
                    }
                    if (StoryQuestState.Kills != 3)
                    {
                        Debug.LogError($"[PlaytestStorySlice] 로드 후 kills={StoryQuestState.Kills}(기대=3)");
                        Fail();
                        return;
                    }
                    if (Vector3.Distance(_player.position, posBeforeSave) > 0.01f)
                    {
                        Debug.LogError($"[PlaytestStorySlice] 로드 후 위치={_player.position}(기대={posBeforeSave})");
                        Fail();
                        return;
                    }

                    Debug.Log("[PlaytestStorySlice] save/load round-trip OK");
                    EditorApplication.update -= Tick;
                    EditorApplication.isPlaying = false;
                    _phase = Phase.Done;
                    break;
            }
        }

        private static void CheckJumpNow()
        {
            _storyController.TriggerJump();
            float v = (float)GetPrivate(_storyController, "_verticalVelocity");
            if (v <= 0f)
            {
                Debug.LogError($"[PlaytestStorySlice] TriggerJump() 뒤에도 수직 속도가 0 이하 — v={v}");
                Fail();
            }
            else
            {
                Debug.Log($"[PlaytestStorySlice] jump OK, verticalVelocity={v}");
            }
        }

        private static bool IsDestroyed(StoryEnemy enemy) => enemy == null;

        private static void Fail()
        {
            _hadError = true;
            EditorApplication.update -= Tick;
            EditorApplication.isPlaying = false;
        }

        private static void TeleportPlayer(Vector3 position)
        {
            if (_playerController != null) _playerController.enabled = false;
            _player.position = position;
            if (_playerController != null) _playerController.enabled = true;
        }

        private static object GetPrivate(object target, string fieldName)
        {
            var field = target.GetType().GetField(fieldName, BindingFlags.NonPublic | BindingFlags.Instance);
            return field?.GetValue(target);
        }

        private static void SetPrivate(object target, string fieldName, object value)
        {
            var field = target.GetType().GetField(fieldName, BindingFlags.NonPublic | BindingFlags.Instance);
            field?.SetValue(target, value);
        }

        private static void InvokePrivate(object target, string methodName)
        {
            var method = target.GetType().GetMethod(methodName, BindingFlags.NonPublic | BindingFlags.Instance);
            method?.Invoke(target, null);
        }
    }
}
