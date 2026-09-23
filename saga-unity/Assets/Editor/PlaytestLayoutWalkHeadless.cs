using System.Collections.Generic;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using Saga.Core;
using Saga.Go.Layout;

namespace Saga.EditorTools
{
    /// <summary>
    /// saga-godot tools/probe_layout_walk.gd 의 Unity 대응판 — LayoutWalk 씬을 배치 모드로
    /// 재생해 자동으로 걷는다: ① LayoutRoot 로드 완료 ② 물 칸 충돌체가 실제로 생김
    /// (씨앗 20260824 고정 — 다리 없는 강 칸은 막히고 다리 칸은 열림) ③ 명소 열셋 전부
    /// 순서대로 데려가면 발견 13/13 ④ 숨은 명소 이름표가 찾은 뒤에만 보임.
    /// **주의 — 다른 PlaytestXxxHeadless.cs 와 같은 이유로 -executeMethod로 부를 때
    /// -quit을 같이 주지 않는다.**
    /// </summary>
    public static class PlaytestLayoutWalkHeadless
    {
        private const string ScenePath = "Assets/Scenes/LayoutWalk.unity";
        private const int ReadyTimeoutFrames = 90;
        private const int FramesPerPlace = 15; // 순간이동 뒤 트리거가 겹침을 알아채는 데 몇 스텝 걸린다(Godot 판보다 여유 있게 잡음).

        private static int _framesSeen;
        private static bool _hadError;
        private static bool _ready;
        private static readonly List<string> _results = new List<string>();
        private static LayoutWalk _walk;
        private static Transform _player;
        private static List<Transform> _placeMarks;
        private static int _placeIndex;
        private static int _placeFrame;
        private static Vector3 _placeStartPos;
        private static bool _origEnterPlayModeOptionsEnabled;
        private static EnterPlayModeOptions _origEnterPlayModeOptions;

        [MenuItem("Saga/Playtest Layout Walk (Headless)")]
        public static void Run()
        {
            _origEnterPlayModeOptionsEnabled = EditorSettings.enterPlayModeOptionsEnabled;
            _origEnterPlayModeOptions = EditorSettings.enterPlayModeOptions;
            // 다른 PlaytestXxxHeadless.cs와 달리 SceneReload는 안 끈다 — 켜 둔 채로
            // 돌렸더니(끈 채로는 트리거가 첫 한 번 말고 다시는 안 잡혔다, 실측) 씬을
            // 새로 불러오면서 물리 브로드페이즈가 제대로 다시 잡혀 안정적으로 됐다.
            EditorSettings.enterPlayModeOptionsEnabled = true;
            EditorSettings.enterPlayModeOptions = EnterPlayModeOptions.DisableDomainReload;

            EditorSceneManager.OpenScene(ScenePath);
            _framesSeen = 0;
            _hadError = false;
            _ready = false;
            _results.Clear();
            _walk = null;
            _player = null;
            _placeMarks = null;
            _placeIndex = 0;
            _placeFrame = 0;
            EditorApplication.playModeStateChanged += OnStateChanged;
            EditorApplication.isPlaying = true;
        }

        private static void OnStateChanged(PlayModeStateChange state)
        {
            if (state == PlayModeStateChange.EnteredPlayMode)
            {
                // 배치 모드는 렌더링이 없어 실제 경과 시간이 거의 안 흘러 자동(Update 마다
                // 누적) 물리 스텝이 거의 안 돈다 — 트리거가 첫 한 번만 잡히고 순간이동을
                // 아무리 해도 그 뒤로 다시 안 잡히던 원인이 이것(실측). 수동 스텝으로 바꾼다.
                Physics.simulationMode = SimulationMode.Script;
                EditorApplication.update += Tick;
            }
            else if (state == PlayModeStateChange.EnteredEditMode)
            {
                Physics.simulationMode = SimulationMode.FixedUpdate;
                EditorApplication.playModeStateChanged -= OnStateChanged;
                EditorSettings.enterPlayModeOptionsEnabled = _origEnterPlayModeOptionsEnabled;
                EditorSettings.enterPlayModeOptions = _origEnterPlayModeOptions;
                Debug.Log($"LAYOUT_WALK_PROBE_DONE fails={(_hadError ? 1 : 0)} {string.Join(" ", _results)}");
                EditorApplication.Exit(_hadError ? 1 : 0);
            }
        }

        private static void Tick()
        {
            _framesSeen++;
            if (_walk == null) _walk = Object.FindFirstObjectByType<LayoutWalk>();
            if (_player == null)
            {
                var go = GameObject.FindWithTag("Player");
                if (go != null) _player = go.transform;
            }

            if (!_ready)
            {
                if (_walk != null && _walk.LayoutRootTransform != null)
                {
                    _ready = true;
                    CheckColliders();
                    var placesRoot = _walk.LayoutRootTransform.Find("Places");
                    _placeMarks = new List<Transform>();
                    foreach (Transform t in placesRoot) _placeMarks.Add(t);
                    Check("places_total", _placeMarks.Count == _walk.PlacesTotal,
                        $"marks={_placeMarks.Count} total={_walk.PlacesTotal}");
                }
                else if (_framesSeen > ReadyTimeoutFrames)
                {
                    Check("ready", false, $"{ReadyTimeoutFrames}프레임 안에 LayoutRoot 로드 안 됨");
                    Finish();
                }
                return;
            }

            if (_placeMarks == null || _placeIndex >= _placeMarks.Count)
            {
                CheckFinal();
                Finish();
                return;
            }

            // 한 번에 순간이동하면 물리 엔진이 중간 상태를 못 보고 트리거를 놓칠 때가 있다
            // (배치 모드에서 실제로 겪음) — 한 프레임마다 목표까지 조금씩 다가가 여러 스텝에
            // 걸쳐 실제로 "걸어 들어오는" 것처럼 만든다.
            if (_placeFrame == 0) _placeStartPos = _player.position;
            Vector3 target = _placeMarks[_placeIndex].position + Vector3.up * 0.5f;
            float lerpT = (_placeFrame + 1f) / FramesPerPlace;
            Vector3 step = Vector3.Lerp(_placeStartPos, target, Mathf.Clamp01(lerpT));
            _player.position = step;
            Physics.SyncTransforms();
            Physics.Simulate(Time.fixedDeltaTime);
            _placeFrame++;
            if (_placeFrame >= FramesPerPlace)
            {
                _placeFrame = 0;
                _placeIndex++;
            }
        }

        /// <summary>saga-unity/tools/layout/out/hebei.json(씨앗 20260824) 고정값 — 강(ty=7)
        /// 중 다리 없는 칸(tx=-10)은 막히고, 다리 칸(tx=-1, "@bridge")은 열린다.</summary>
        private static void CheckColliders()
        {
            var body = _walk.transform.Find("LayoutColliders");
            var info = _walk.Colliders;
            Check("colliders_built", body != null && body.childCount > 0,
                $"children={(body == null ? -1 : body.childCount)}");
            Check("water_cells_gt0", info != null && info.waterCells > 0,
                $"waterCells={(info == null ? -1 : info.waterCells)}");

            const float cell = 4f;
            var blocked = new Vector3(-10f * cell, 2f, -(7f * cell));
            var bridge = new Vector3(-1f * cell, 2f, -(7f * cell));
            var half = Vector3.one * (cell * 0.4f);
            // 명소 발견 트리거(SphereCollider)까지 같이 잡히지 않게 트리거는 무시하고
            // 순수 충돌체(물 칸 벽)만 본다.
            bool blockedHit = Physics.CheckBox(blocked, half, Quaternion.identity, ~0, QueryTriggerInteraction.Ignore);
            bool bridgeHit = Physics.CheckBox(bridge, half, Quaternion.identity, ~0, QueryTriggerInteraction.Ignore);
            Check("water_block", blockedHit, $"pos={blocked}");
            Check("bridge_open", !bridgeHit, $"pos={bridge}");

            // 벽이 되는 deco(집·탑·우물·장터) — 있으면 첫 것의 자리(바닥 위 1m)에 충돌체가 있어야 한다. 없으면 개수만.
            _results.Add($"deco_solids={(info == null ? -1 : info.decoSolids)}");
            var props = _walk.LayoutRootTransform.Find("Props");
            Physics.SyncTransforms();
            foreach (Transform pr in props)
            {
                if (pr.GetComponent<BoxCollider>() == null) continue;
                bool hit = Physics.CheckBox(pr.position + Vector3.up, Vector3.one * 0.3f, Quaternion.identity, ~0, QueryTriggerInteraction.Ignore);
                Check("deco_block", hit, pr.name);
                break;
            }
        }

        private static void CheckFinal()
        {
            Check("found_all", _walk.FoundCount == _walk.PlacesTotal, $"{_walk.FoundCount}/{_walk.PlacesTotal}");

            bool hiddenOk = true;
            foreach (var mk in _placeMarks)
            {
                var place = mk.GetComponent<LayoutPlace>();
                if (place == null || !place.hidden) continue;
                var label = _walk.transform.Find("Name_" + mk.name);
                if (label == null || !label.gameObject.activeSelf) hiddenOk = false;
            }
            Check("hidden_labels", hiddenOk, "");
        }

        private static void Check(string name, bool ok, string detail)
        {
            if (!ok) _hadError = true;
            _results.Add($"{name}={(ok ? "ok" : "FAIL")}{(string.IsNullOrEmpty(detail) ? "" : $"({detail})")}");
        }

        private static void Finish()
        {
            EditorApplication.update -= Tick;
            EditorApplication.isPlaying = false;
        }
    }
}
