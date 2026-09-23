using UnityEngine;

namespace Saga.Dungeon.World
{
    /// <summary>
    /// PLAN.md 106-2 "잊힌 능묘" 소품(상자·문·블록·금 간 벽·벽력탄)이 같이 쓰는 조립 헬퍼.
    /// 재질은 편집기 빌드(`BuildTestDungeonScene.BuildTemple`)가 PBR 애셋(나무 판자·
    /// 성벽 돌·등롱 금속)을 넣어 주고, 비어 있으면 같은 톤의 단색 Lit 로 대신한다.
    /// 편집기에서 짓는 부품은 씬에 저장되므로 색은 `MaterialPropertyBlock`(저장 안 됨)
    /// 대신 재질로 준다.
    /// </summary>
    public static class TempleVisuals
    {
        public static readonly Color WoodColor = new Color(0.33f, 0.22f, 0.13f);
        public static readonly Color StoneColor = new Color(0.42f, 0.4f, 0.37f);
        public static readonly Color IronColor = new Color(0.22f, 0.22f, 0.24f);
        public static readonly Color GoldColor = new Color(0.95f, 0.72f, 0.25f);

        public static Material Solid(Color color, float metallic = 0f, float smoothness = 0.3f)
        {
            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "Temple (generated)" };
            mat.color = color;
            mat.SetFloat("_Metallic", metallic);
            mat.SetFloat("_Smoothness", smoothness);
            return mat;
        }

        public static Material Glow(Color color)
        {
            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "TempleGlow (generated)" };
            mat.color = color;
            mat.EnableKeyword("_EMISSION");
            mat.SetColor("_EmissionColor", color * 2.5f);
            return mat;
        }

        /// <summary>상자 모양 부품 하나. <paramref name="collider"/>가 false 면 충돌체를 뗀다.</summary>
        public static Transform Box(Transform parent, string name, Vector3 localPos, Vector3 size, Material mat, bool collider = true)
        {
            return Primitive(PrimitiveType.Cube, parent, name, localPos, size, mat, collider);
        }

        public static Transform Primitive(PrimitiveType type, Transform parent, string name, Vector3 localPos,
            Vector3 size, Material mat, bool collider)
        {
            var go = GameObject.CreatePrimitive(type);
            go.name = name;
            go.transform.SetParent(parent, false);
            go.transform.localPosition = localPos;
            go.transform.localScale = size;
            go.GetComponent<MeshRenderer>().sharedMaterial = mat;
            if (!collider) DestroySafe(go.GetComponent<Collider>());
            return go.transform;
        }

        public static void DestroySafe(Object obj)
        {
            if (obj == null) return;
            if (Application.isPlaying) Object.Destroy(obj);
            else Object.DestroyImmediate(obj);
        }

        /// <summary>플레이어와의 수평 거리(높이 무시).</summary>
        public static float FlatDistance(Vector3 a, Vector3 b)
        {
            a.y = 0f;
            b.y = 0f;
            return Vector3.Distance(a, b);
        }
    }
}
