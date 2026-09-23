// 배치표(saga-layout/1, 저장소 루트 tools/scene-layout/layout.mjs) → .unity 씬 조립.
// 새 씬 하나와 바닥 재질(Assets/Art/Generated/Layout/)만 만든다 — 기존 씬·프리팹은 안 건드린다.
//
//   메뉴: Saga > Layout > Build Scene From Layout JSON…
//   배치: Unity.exe -batchmode -nographics -quit -projectPath saga-unity \
//         -executeMethod BuildFromLayout.BuildFromArgs -layout tools/layout/out/hebei.json -out Assets/Scenes/Generated/HebeiLayout.unity
//
// 좌표: 배치표는 +z 가 남쪽(글자 그림 아래)이라 Unity(+z 북쪽)에선 z 를 뒤집는다.
// 물건은 에셋(glTFast 가 들인 GLB 프리팹)을 프리팹 인스턴스로 둔다. 없는 에셋은 건너뛰고 이름을 로그에 남긴다.
using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class BuildFromLayout
{
#pragma warning disable 0649 // JsonUtility 가 채우는 필드
    [Serializable] class Ground { public int tx; public int ty; public string kind; public float x; public float z; }
    [Serializable] class Item { public string asset; public string kind; public int tx; public int ty; public float x; public float y; public float z; public float rotY; public float scale; }
    [Serializable] class Place { public string id; public string name; public bool hidden; public float x; public float z; }
    [Serializable] class Layout
    {
        public string schema; public string source; public string region; public string name;
        public long seed; public float cell; public int w; public int h;
        public Ground[] ground; public Item[] items; public Place[] places;
    }
#pragma warning restore 0649

    const string MatDir = "Assets/Art/Generated/Layout";

    [MenuItem("Saga/Layout/Build Scene From Layout JSON…")]
    static void BuildFromMenu()
    {
        string json = EditorUtility.OpenFilePanel("배치표(saga-layout/1)", Path.Combine(Directory.GetCurrentDirectory(), "tools", "layout", "out"), "json");
        if (string.IsNullOrEmpty(json)) return;
        string scene = EditorUtility.SaveFilePanelInProject("씬 저장", Path.GetFileNameWithoutExtension(json) + "Layout", "unity", "만들 씬", "Assets/Scenes/Generated");
        if (string.IsNullOrEmpty(scene)) return;
        Build(json, scene);
    }

    /// <summary>배치 모드 입구 — -layout &lt;json&gt; -out &lt;Assets/...unity&gt;</summary>
    public static void BuildFromArgs()
    {
        string[] a = Environment.GetCommandLineArgs();
        string json = null, scene = null;
        for (int i = 0; i < a.Length - 1; i++)
        {
            if (a[i] == "-layout") json = a[i + 1];
            if (a[i] == "-out") scene = a[i + 1];
        }
        if (json == null || scene == null)
        {
            Debug.LogError("[BuildFromLayout] 사용: -executeMethod BuildFromLayout.BuildFromArgs -layout <json> -out <Assets/...unity>");
            EditorApplication.Exit(1);
            return;
        }
        EditorApplication.Exit(Build(json, scene) ? 0 : 1);
    }

    public static bool Build(string jsonPath, string scenePath)
    {
        if (!File.Exists(jsonPath)) { Debug.LogError("[BuildFromLayout] 배치표가 없다: " + jsonPath); return false; }
        if (!scenePath.StartsWith("Assets/") || !scenePath.EndsWith(".unity")) { Debug.LogError("[BuildFromLayout] 출력은 Assets/…/.unity: " + scenePath); return false; }
        string text = File.ReadAllText(jsonPath);
        Layout L = JsonUtility.FromJson<Layout>(text);
        if (L == null || L.schema != "saga-layout/1") { Debug.LogError("[BuildFromLayout] saga-layout/1 배치표가 아니다: " + jsonPath); return false; }
        Dictionary<string, Color> colors = ParseColors(text);

        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        var root = new GameObject("Layout_" + L.region);

        // 바닥 — 지형마다 재질 하나, 칸마다 판 하나(Plane 은 10×10 이라 cell/10 로 줄인다)
        var ground = new GameObject("Ground");
        ground.transform.SetParent(root.transform, false);
        var mats = new Dictionary<string, Material>();
        foreach (var g in L.ground ?? new Ground[0])
        {
            if (!mats.TryGetValue(g.kind, out Material m))
            {
                m = GroundMaterial(g.kind, colors.TryGetValue(g.kind, out Color c) ? c : Color.gray);
                mats[g.kind] = m;
            }
            var p = GameObject.CreatePrimitive(PrimitiveType.Plane);
            p.name = "g_" + g.tx + "_" + g.ty;
            p.transform.SetParent(ground.transform, false);
            p.transform.localPosition = new Vector3(g.x, 0f, -g.z);
            p.transform.localScale = new Vector3(L.cell / 10f, 1f, L.cell / 10f);
            p.GetComponent<MeshRenderer>().sharedMaterial = m;
        }

        // 물건 — 에셋 프리팹 인스턴스
        var props = new GameObject("Props");
        props.transform.SetParent(root.transform, false);
        var cache = new Dictionary<string, GameObject>();
        var missing = new HashSet<string>();
        int placed = 0;
        foreach (var it in L.items ?? new Item[0])
        {
            if (!cache.TryGetValue(it.asset, out GameObject prefab))
            {
                prefab = AssetDatabase.LoadAssetAtPath<GameObject>(it.asset);
                cache[it.asset] = prefab;
            }
            if (prefab == null) { missing.Add(it.asset); continue; }
            var go = (GameObject)PrefabUtility.InstantiatePrefab(prefab, scene);
            go.name = it.kind.Replace("@", "at_") + "_" + placed;
            go.transform.SetParent(props.transform, false);
            go.transform.localPosition = new Vector3(it.x, it.y, -it.z);
            go.transform.localRotation = Quaternion.Euler(0f, -it.rotY, 0f);
            go.transform.localScale = Vector3.one * it.scale;
            placed++;
        }

        // 명소 — 빈 표식(이름 = id, 숨은 곳은 끝에 " (hidden)")
        var places = new GameObject("Places");
        places.transform.SetParent(root.transform, false);
        foreach (var pl in L.places ?? new Place[0])
        {
            var mk = new GameObject(pl.id + (pl.hidden ? " (hidden)" : ""));
            mk.transform.SetParent(places.transform, false);
            mk.transform.localPosition = new Vector3(pl.x, 0f, -pl.z);
        }

        // 보기용 — 해와 위에서 내려다보는 카메라
        var sun = new GameObject("Sun");
        var light = sun.AddComponent<Light>();
        light.type = LightType.Directional;
        light.shadows = LightShadows.Soft;
        sun.transform.rotation = Quaternion.Euler(50f, -35f, 0f);
        var camGo = new GameObject("Overview");
        camGo.tag = "MainCamera";
        camGo.AddComponent<Camera>();
        float span = Mathf.Max(L.w, L.h) * L.cell;
        camGo.transform.position = new Vector3(0f, span * 0.9f, -span * 0.75f);
        camGo.transform.rotation = Quaternion.Euler(50f, 0f, 0f);

        EnsureFolder(Path.GetDirectoryName(scenePath).Replace('\\', '/'));
        bool ok = EditorSceneManager.SaveScene(scene, scenePath);
        AssetDatabase.Refresh();
        Debug.Log("[BuildFromLayout] 조립 " + root.name + " — 바닥 " + (L.ground?.Length ?? 0) + " · 물건 " + placed + " · 명소 " + (L.places?.Length ?? 0) +
                  " · 없는 에셋 " + missing.Count + " → " + scenePath + (ok ? " (OK)" : " (저장 실패)"));
        foreach (var m in missing) Debug.LogWarning("[BuildFromLayout] 없는 에셋: " + m);
        return ok;
    }

    /// <summary>JsonUtility 는 사전을 못 읽는다 — "groundColors": { "grass": "#8fbf6a", … } 만 따로 푼다</summary>
    static Dictionary<string, Color> ParseColors(string text)
    {
        var d = new Dictionary<string, Color>();
        Match block = Regex.Match(text, "\"groundColors\"\\s*:\\s*\\{([^}]*)\\}");
        if (!block.Success) return d;
        foreach (Match m in Regex.Matches(block.Groups[1].Value, "\"([^\"]+)\"\\s*:\\s*\"(#[0-9a-fA-F]{6})\""))
        {
            if (ColorUtility.TryParseHtmlString(m.Groups[2].Value, out Color c)) d[m.Groups[1].Value] = c;
        }
        return d;
    }

    /// <summary>Assets/a/b/c 를 AssetDatabase 가 아는 폴더로 한 단계씩 만든다(IO 로 만들면 CreateAsset 이 모른다)</summary>
    static void EnsureFolder(string path)
    {
        if (string.IsNullOrEmpty(path) || AssetDatabase.IsValidFolder(path)) return;
        string parent = Path.GetDirectoryName(path).Replace('\\', '/');
        EnsureFolder(parent);
        AssetDatabase.CreateFolder(parent, Path.GetFileName(path));
    }

    static Material GroundMaterial(string kind, Color c)
    {
        EnsureFolder(MatDir);
        string path = MatDir + "/Ground_" + kind + ".mat";
        var m = AssetDatabase.LoadAssetAtPath<Material>(path);
        if (m == null)
        {
            Shader sh = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            m = new Material(sh);
            AssetDatabase.CreateAsset(m, path);
        }
        if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", c);
        m.color = c;
        if (m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness", 0f);
        EditorUtility.SetDirty(m);
        return m;
    }
}
