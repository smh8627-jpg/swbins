using UnityEngine;

namespace Saga.Dungeon.World
{
    /// <summary>
    /// VERTICAL_SLICE_DUNGEON.md 다음 슬라이스 "GLB 자산 도입" — SagaGo
    /// `World/CharacterVisual.cs`와 완전히 같은 로직을 그대로 복사(루트
    /// CLAUDE.md "다섯 판은 다섯 벌 복사" 원칙을 이 Unity 트랙에도 적용,
    /// SagaDungeon.asmdef가 SagaGo를 참조하지 않아 타입을 직접 못 씀).
    /// **GLB 파일 자체는 새로 안 받고 SagaGo가 이미 쓰는 Kenney "Blocky
    /// Characters"(`Assets/Art/Characters/character-{a,b,c,d}.glb`)를
    /// 그대로 재사용한다** — PLAN.md 0장·8장이 이미 트랙 간 자산 재사용을
    /// 허용해 뒀고(saga-godot↔saga-unity), 같은 saga-unity 안에서 GO↔
    /// DUNGEON이 에셋 파일(코드 아님)을 공유하는 것도 같은 원칙의 연장.
    /// 실측(SagaGo `MeasureCharacterGlb.cs`)값도 그대로: 1.6×2.7×0.8,
    /// 피벗 발밑.
    /// </summary>
    public static class CharacterVisual
    {
        public const float NativeHeight = 2.7f;

        /// <summary>
        /// modelPrefab을 parent 밑에 심고 targetHeight에 맞춰 균일 스케일한다.
        /// tint가 Color.white가 아니면 URP Lit의 _BaseColor를
        /// MaterialPropertyBlock으로 덮어써(공유 머티리얼은 안 건드림) 같은
        /// 모델을 여러 색으로 구분해 쓸 수 있게 한다.
        /// </summary>
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

        /// <summary>산적/두목의 "강타 예고" 텔레그래프처럼 순간적으로 색을
        /// 덮어썼다 되돌리는 연출에도 쓴다 — GLB는 몸통·팔·다리·머리가
        /// 각각 다른 Renderer라 전부 찾아 같이 바꿔야 primitive capsule
        /// 시절(단일 Renderer)과 같은 효과가 난다.</summary>
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
        /// 쓰는 예전 primitive capsule 대체 — 씬 빌드 자체가 깨지지 않게 한다.
        /// targetHeight는 capsule 기본 높이(2m) 기준 스케일로 환산한다.</summary>
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
