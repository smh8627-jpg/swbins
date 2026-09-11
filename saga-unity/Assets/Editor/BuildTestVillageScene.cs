using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using Saga.Go.World;

namespace Saga.EditorTools
{
    /// <summary>
    /// VERTICAL_SLICE.md Phase 3 — TestVillage 씬을 코드로 조립해 저장한다.
    /// 손으로 .unity YAML을 쓰지 않는다(깨지기 쉽다) — 이 스크립트를
    /// -executeMethod로 배치 모드에서 돌려서 만든다. 다음에 지형·소품이
    /// 늘어도 이 스크립트를 다시 실행하면 된다(멱등 — 기존 씬을 지우고
    /// 다시 짠다).
    /// </summary>
    public static class BuildTestVillageScene
    {
        private const string ScenePath = "Assets/Scenes/TestVillage.unity";

        [MenuItem("Saga/Build TestVillage Scene")]
        public static void Build()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            // 빛
            var sunGo = new GameObject("Sun");
            var sun = sunGo.AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.intensity = 1.1f;
            sun.shadows = LightShadows.Soft;
            sunGo.transform.rotation = Quaternion.Euler(45f, -30f, 0f);

            // 땅(TerrainBuilder가 Awake에서 스스로 짓는다 — 에디터에서 씬을
            // 새로 열 때도 매번 다시 지어지므로 저장할 필요가 없다. 다만
            // 배치 모드 저장 시점엔 Awake가 아직 안 돌았을 수 있어 여기서
            // 명시로 한 번 부른다 — BuildGround()가 MeshFilter.sharedMesh에
            // 실제 메시를 만들어 두므로 씬 파일에 메시 데이터까지 같이 남는다)
            var terrainGo = new GameObject("Terrain");
            var terrainBuilder = terrainGo.AddComponent<TerrainBuilder>();
            terrainBuilder.Build();

            // 카메라(검토용 — Player가 들어오기 전까지 씬 뷰 기본 카메라)
            var camGo = new GameObject("ReviewCamera");
            var cam = camGo.AddComponent<Camera>();
            camGo.transform.position = new Vector3(0, 300, 140);
            camGo.transform.rotation = Quaternion.LookRotation(new Vector3(0, -0.9063f, -0.4226f), Vector3.forward);
            cam.tag = "MainCamera";

            EditorSceneManager.SaveScene(scene, ScenePath);
            Debug.Log($"[BuildTestVillageScene] saved to {ScenePath} — verts={terrainGo.GetComponent<MeshFilter>().sharedMesh.vertexCount}");
        }
    }
}
