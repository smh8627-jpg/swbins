using UnityEngine;

namespace Saga.Story.World
{
    /// <summary>
    /// VERTICAL_SLICE_STORY.md — SagaDungeon `World/CharacterVisual.cs`와
    /// 완전히 같은 로직을 그대로 복사(루트 CLAUDE.md "다섯 판은 다섯 벌
    /// 복사" 원칙, SagaStory.asmdef 자체가 없어 타입을 직접 못 씀).
    /// GLB 파일은 SagaGo/SagaDungeon이 이미 쓰는 Kenney "Blocky Characters"
    /// (`Assets/Art/Characters/character-{a,b,c,d}.glb`)를 그대로 재사용.
    /// </summary>
    public static class CharacterVisual
    {
        public const float NativeHeight = 2.7f;

        public static Transform Spawn(GameObject modelPrefab, Transform parent, float targetHeight, Color tint)
        {
            var inst = Object.Instantiate(modelPrefab, parent, false);
            inst.name = "Visual";
            float scale = targetHeight / NativeHeight;
            inst.transform.localScale = Vector3.one * scale;
            inst.transform.localPosition = Vector3.zero;
            inst.transform.localRotation = Quaternion.identity;

            if (tint != Color.white) Tint(inst, tint);
            return inst.transform;
        }

        public static void Tint(GameObject visualRoot, Color color)
        {
            var block = new MaterialPropertyBlock();
            foreach (var r in visualRoot.GetComponentsInChildren<Renderer>())
            {
                r.GetPropertyBlock(block);
                block.SetColor("_BaseColor", color);
                r.SetPropertyBlock(block);
            }
        }

        public static void ClearTint(GameObject visualRoot)
        {
            var empty = new MaterialPropertyBlock();
            foreach (var r in visualRoot.GetComponentsInChildren<Renderer>())
            {
                r.SetPropertyBlock(empty);
            }
        }

        /// <summary>GLB 모델을 못 찾았을 때(다른 PC에 아직 안 받아 둔 경우 등)
        /// 쓰는 예전 primitive capsule 대체 — 씬 빌드 자체가 깨지지 않게 한다.</summary>
        public static Transform SpawnFallbackCapsule(Transform parent, float targetHeight, Color tint)
        {
            var visual = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            visual.name = "Visual";
            Object.DestroyImmediate(visual.GetComponent<Collider>());
            visual.transform.SetParent(parent, false);
            float scale = targetHeight / 2f; // primitive capsule 기본 높이 2m
            visual.transform.localScale = Vector3.one * scale;
            visual.transform.localPosition = new Vector3(0f, targetHeight * 0.5f, 0f);
            if (tint != Color.white)
            {
                var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "Fallback (generated)" };
                mat.color = tint;
                visual.GetComponent<MeshRenderer>().sharedMaterial = mat;
            }
            Debug.LogWarning($"[CharacterVisual] 캐릭터 GLB를 못 찾아 primitive capsule로 대체함 (parent={parent.name}).");
            return visual.transform;
        }
    }
}
