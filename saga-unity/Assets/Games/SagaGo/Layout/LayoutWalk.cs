using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using Saga.Core;
using Saga.Go.UI;

namespace Saga.Go.Layout
{
    /// <summary>
    /// 글자 지도 조립 씬(tools/scene-layout → Assets/Scenes/Generated/*.unity)을 걸어 다니게
    /// 배선한다 — saga-godot games/saga_go/layout/layout_walk.gd 와 같은 역할. 생성 씬은
    /// BuildFromLayout 이 다시 쓰면 통째로 덮이니 이 스크립트는 그 씬 자체를 손대지 않고,
    /// 실행 시점에 SceneManager 로 additive 로드해 안의 LayoutRoot/LayoutGroundTile/
    /// LayoutPlace 를 읽어 붙인다:
    ///   · 바닥 판 하나 + 가장자리 벽(BoxCollider)
    ///   · 물 칸 막기 — 다리가 놓인 물 칸(Props 의 at_* — 옛 마크 물건)은 연다. 산은 안 막는다
    ///     (굴·폭포·산등성이 명소가 산 칸 안에 있어 막으면 못 간다).
    ///   · 명소마다 발견 판정(SphereCollider 트리거 + "Player" 태그)과 이름표(TextMesh).
    ///     hidden 명소의 이름표는 찾기 전엔 안 보인다.
    /// 발견은 CodexState 에 넣지 않고 이 씬 안에서만 센다 — 명소 id(village·gate_n…)가
    /// GO 도감 43칸에 없고, 여기서 도장을 찍으면 TestVillage 세이브·도감 총계가 어긋난다.
    /// 물건(나무·바위)은 부딪히지 않는다 — 보기용 배치표라 충돌 모양이 없다.
    /// </summary>
    public class LayoutWalk : MonoBehaviour
    {
        private const float WaterWallHeight = 4f;
        private const float LabelHeight = 3.2f;
        // 한 칸(cell) 대비 발견 반경 — 이웃 명소가 3칸(12m) 떨어져 있어 한 칸 안쪽이면 겹치지 않는다.
        private const float DiscoverRadiusCells = 0.9f;
        private const float ToastSeconds = 3f;

        [SerializeField] private string generatedScenePath = "Assets/Scenes/Generated/HebeiLayout.unity";
        [SerializeField] private Text placeCountLabel;

        private readonly Dictionary<string, bool> _found = new Dictionary<string, bool>();
        private readonly Dictionary<string, TextMesh> _labels = new Dictionary<string, TextMesh>();
        private int _placesTotal;
        private float _cell = 4f;
        private Transform _layoutRoot;

        public int FoundCount => _found.Count;
        public int PlacesTotal => _placesTotal;
        public Transform LayoutRootTransform => _layoutRoot;
        public LayoutColliderInfo Colliders { get; private set; }

        private IEnumerator Start()
        {
            string sceneName = System.IO.Path.GetFileNameWithoutExtension(generatedScenePath);
            var scene = SceneManager.GetSceneByName(sceneName);
            if (!scene.IsValid())
            {
                // Assets/Scenes/Generated/*.unity는 Build Settings에 안 넣는다(다른 PC는
                // gitignore된 로컬 자산으로 매번 다시 조립하는 산출물이라) — 일반
                // SceneManager.LoadScene은 Build Settings에 없는 씬을 못 찾는다(에디터
                // Play 모드에서도 마찬가지). 에디터에서만 되는 EditorSceneManager.
                // LoadSceneInPlayMode로 경로째 불러온다(실제 빌드에선 이 도구 자체를 안 쓴다).
#if UNITY_EDITOR
                UnityEditor.SceneManagement.EditorSceneManager.LoadSceneInPlayMode(
                    generatedScenePath, new LoadSceneParameters(LoadSceneMode.Additive));
#else
                Debug.LogError($"[LayoutWalk] 빌드에선 {generatedScenePath}를 못 불러옴 — 에디터 전용 도구.");
                yield break;
#endif
                float timeout = 5f;
                while (timeout > 0f)
                {
                    scene = SceneManager.GetSceneByName(sceneName);
                    if (scene.IsValid() && scene.isLoaded && scene.rootCount > 0) break;
                    timeout -= Time.unscaledDeltaTime;
                    yield return null;
                }
                scene = SceneManager.GetSceneByName(sceneName);
                if (!scene.IsValid() || !scene.isLoaded)
                {
                    Debug.LogError($"[LayoutWalk] {generatedScenePath} 를 못 불러옴.");
                    yield break;
                }
            }

            LayoutRoot root = null;
            foreach (var go in scene.GetRootGameObjects())
            {
                root = go.GetComponent<LayoutRoot>();
                if (root != null) break;
            }
            if (root == null)
            {
                Debug.LogError($"[LayoutWalk] {sceneName} 안에 LayoutRoot 가 없음.");
                yield break;
            }

            _layoutRoot = root.transform;
            _cell = root.cell;
            DisableOverviewCamera();
            BuildColliders();
            WirePlaces();
            RefreshCount();
        }

        /// <summary>생성 씬의 Overview 카메라(둘러보기용, tag=MainCamera)를 꺼서 Player 카메라와 안 겹치게 한다.</summary>
        private void DisableOverviewCamera()
        {
            var overview = _layoutRoot.Find("Overview");
            if (overview != null) overview.gameObject.SetActive(false);
        }

        private Vector2Int CellKey(Vector3 p) =>
            new Vector2Int(Mathf.RoundToInt(p.x / _cell), Mathf.RoundToInt(p.z / _cell));

        /// <summary>물 칸 중 명소 물건(배치표 mark, Props 의 at_* — 옛 다리)이 선 칸만 연다.
        /// 명소 표식만 있는 물 칸(강나루)은 막힌 채 둔다 — 발견 반경이 칸 가장자리 너머까지
        /// 닿아 강가에서 찾아진다.</summary>
        private void BuildColliders()
        {
            var ground = _layoutRoot.Find("Ground");
            var props = _layoutRoot.Find("Props");

            var markCells = new HashSet<Vector2Int>();
            foreach (Transform pr in props)
            {
                if (pr.name.StartsWith("at_")) markCells.Add(CellKey(pr.localPosition));
            }

            var bodyGo = new GameObject("LayoutColliders");
            bodyGo.transform.SetParent(transform, false);
            int water = 0;
            var min = new Vector2(float.PositiveInfinity, float.PositiveInfinity);
            var max = new Vector2(float.NegativeInfinity, float.NegativeInfinity);
            foreach (Transform g in ground)
            {
                Vector3 p = g.localPosition;
                min = new Vector2(Mathf.Min(min.x, p.x), Mathf.Min(min.y, p.z));
                max = new Vector2(Mathf.Max(max.x, p.x), Mathf.Max(max.y, p.z));

                var tile = g.GetComponent<LayoutGroundTile>();
                if (tile != null && tile.kind == "water" && !markCells.Contains(CellKey(p)))
                {
                    AddBox(bodyGo, new Vector3(_cell, WaterWallHeight, _cell), new Vector3(p.x, WaterWallHeight * 0.5f, p.z));
                    water++;
                }
            }

            float half = _cell * 0.5f;
            Vector2 lo = min - new Vector2(half, half);
            Vector2 hi = max + new Vector2(half, half);
            Vector2 size = hi - lo;
            Vector2 mid = (lo + hi) * 0.5f;
            AddBox(bodyGo, new Vector3(size.x, 1f, size.y), new Vector3(mid.x, -0.5f, mid.y));
            AddBox(bodyGo, new Vector3(size.x, 6f, 1f), new Vector3(mid.x, 3f, lo.y - 0.5f));
            AddBox(bodyGo, new Vector3(size.x, 6f, 1f), new Vector3(mid.x, 3f, hi.y + 0.5f));
            AddBox(bodyGo, new Vector3(1f, 6f, size.y), new Vector3(lo.x - 0.5f, 3f, mid.y));
            AddBox(bodyGo, new Vector3(1f, 6f, size.y), new Vector3(hi.x + 0.5f, 3f, mid.y));

            Colliders = bodyGo.AddComponent<LayoutColliderInfo>();
            Colliders.waterCells = water;
        }

        private static void AddBox(GameObject parent, Vector3 size, Vector3 localPos)
        {
            var go = new GameObject("box");
            go.transform.SetParent(parent.transform, false);
            go.transform.localPosition = localPos;
            go.AddComponent<BoxCollider>().size = size;
        }

        private void WirePlaces()
        {
            var places = _layoutRoot.Find("Places");
            foreach (Transform mk in places)
            {
                var place = mk.GetComponent<LayoutPlace>();
                if (place == null) continue;
                string id = mk.name;
                string placeName = place.placeName;
                bool hidden = place.hidden;
                _placesTotal++;

                var labelGo = new GameObject("Name_" + id);
                labelGo.transform.SetParent(transform, false);
                labelGo.transform.position = mk.position + new Vector3(0f, LabelHeight, 0f);
                var tm = labelGo.AddComponent<TextMesh>();
                tm.text = placeName;
                tm.characterSize = 0.12f;
                tm.fontSize = 48;
                tm.anchor = TextAnchor.MiddleCenter;
                tm.alignment = TextAlignment.Center;
                tm.color = Color.white;
                labelGo.AddComponent<LayoutLabelBillboard>();
                labelGo.SetActive(!hidden);
                _labels[id] = tm;

                var areaGo = new GameObject("Discover_" + id);
                areaGo.transform.SetParent(transform, false);
                areaGo.transform.position = mk.position;
                var sphere = areaGo.AddComponent<SphereCollider>();
                sphere.isTrigger = true;
                sphere.radius = _cell * DiscoverRadiusCells;
                areaGo.AddComponent<LayoutDiscoverTrigger>().Init(id, placeName, this);
            }
        }

        public void Discover(string id, string placeName)
        {
            if (_found.ContainsKey(id)) return;
            _found[id] = true;
            if (_labels.TryGetValue(id, out var label))
            {
                label.gameObject.SetActive(true);
                label.color = new Color(1f, 0.9f, 0.55f);
            }
            RefreshCount();
            DialogueLabel.Instance?.Show($"\U0001F4CD {placeName} ({_found.Count}/{_placesTotal})", ToastSeconds);
        }

        private void RefreshCount()
        {
            if (placeCountLabel != null)
            {
                placeCountLabel.text = $"\U0001F4CD 명소 {_found.Count}/{_placesTotal}";
            }
        }
    }

    /// <summary>명소 발견 트리거 — "Player" 태그가 들어오면 딱 한 번 LayoutWalk.Discover 를 부른다.</summary>
    public class LayoutDiscoverTrigger : MonoBehaviour
    {
        private string _id;
        private string _placeName;
        private LayoutWalk _walk;

        public void Init(string id, string placeName, LayoutWalk walk)
        {
            _id = id;
            _placeName = placeName;
            _walk = walk;
        }

        private void OnTriggerEnter(Collider other)
        {
            if (other.CompareTag("Player")) _walk.Discover(_id, _placeName);
        }
    }

    /// <summary>진단(`PlaytestLayoutWalkHeadless`)이 물 칸 수를 읽는 표식 — saga-godot
    /// `LayoutColliders.set_meta("water_cells")`와 같은 역할.</summary>
    public class LayoutColliderInfo : MonoBehaviour
    {
        public int waterCells;
    }

    /// <summary>이름표가 항상 카메라를 보게(Godot Label3D 의 billboard 와 같은 역할).</summary>
    public class LayoutLabelBillboard : MonoBehaviour
    {
        private void LateUpdate()
        {
            var cam = Camera.main;
            if (cam == null) return;
            transform.rotation = Quaternion.LookRotation(transform.position - cam.transform.position);
        }
    }
}
