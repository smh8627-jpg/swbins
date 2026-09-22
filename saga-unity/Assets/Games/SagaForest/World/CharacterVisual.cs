using UnityEngine;
using Saga.Core;

namespace Saga.Forest.World
{
    /// <summary>
    /// VERTICAL_SLICE_FOREST.md — GO/DUNGEON의 World/CharacterVisual.cs를
    /// 그대로 복사(네임스페이스만 변경, 루트 CLAUDE.md "다섯 판은 다섯 벌
    /// 복사" 원칙). SagaGo가 이미 쓰는 Kenney "Blocky Characters"
    /// (`Assets/Art/Characters/character-{a,b,c,d}.glb`)를 그대로
    /// 재사용한다(PLAN.md 0장·8장의 트랙 간 자산 재사용 허용).
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
            EnsureBlobShadow(parent);
            return inst.transform;
        }

        /// <summary>PLAN.md 102-5 "그림자 계단" — Player에 붙인 것(편집기
        /// 빌드 스크립트의 `playerGo.AddComponent&lt;BlobShadow&gt;()`)과 같은
        /// 보완을 주민에게도 준다. Mobile 품질 레벨이 아니면 `BlobShadow.
        /// Awake()`가 스스로 꺼진다 — 여기선 무조건 붙여도 안전하다.</summary>
        public static void EnsureBlobShadow(Transform root)
        {
            if (root.GetComponent<BlobShadow>() == null)
            {
                root.gameObject.AddComponent<BlobShadow>();
            }
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

        public static Transform SpawnFallbackCapsule(Transform parent, float targetHeight, Color tint)
        {
            var visual = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            visual.name = "Visual";
            Object.DestroyImmediate(visual.GetComponent<Collider>());
            visual.transform.SetParent(parent, false);
            float scale = targetHeight / 2f;
            visual.transform.localScale = Vector3.one * scale;
            visual.transform.localPosition = new Vector3(0f, targetHeight * 0.5f, 0f);
            if (tint != Color.white)
            {
                var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "Fallback (generated)" };
                mat.color = tint;
                visual.GetComponent<MeshRenderer>().sharedMaterial = mat;
            }
            Debug.LogWarning($"[CharacterVisual] 캐릭터 GLB를 못 찾아 primitive capsule로 대체함 (parent={parent.name}).");
            EnsureBlobShadow(parent);
            return visual.transform;
        }
    }
}
