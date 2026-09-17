using UnityEngine;

namespace Saga.Go.World
{
    /// <summary>
    /// PLAN.md 8장 "실제 3D 에셋" 첫 조각 — Kenney Blocky Characters(CC0,
    /// saga-godot의 assets/characters/*.glb와 같은 파일, docs/ASSET_GUIDE.md
    /// 참고) 실측값을 바탕으로 캐릭터 GLB를 스폰/색조 적용하는 공용 로직.
    /// 실측(MeasureCharacterGlb.cs) 결과 4종 전부 같은 골격 — 크기
    /// 1.6×2.7×0.8, 피벗이 발밑(min.y=0)이라 primitive capsule과 달리 y
    /// 오프셋이 필요 없다.
    /// </summary>
    public static class CharacterVisual
    {
        /// <summary>character-*.glb 4종 전부의 실측 높이(m) — MeasureCharacterGlb 참고.</summary>
        public const float NativeHeight = 2.7f;

        /// <summary>플레이어·NPC·산적이 전부 같은 목표 높이(기존 primitive capsule
        /// 시절 CharacterController.height=3.4와 동일 — 충돌·카메라 높이와 안 어긋나게).</summary>
        public const float HumanHeight = 3.4f;

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

        /// <summary>산적의 "강타 예고" 텔레그래프처럼 순간적으로 색을 덮어썼다
        /// 되돌리는 연출에도 쓴다 — GLB는 몸통·팔·다리·머리가 각각 다른
        /// Renderer라 전부 찾아 같이 바꿔야 primitive capsule 시절(단일
        /// Renderer)과 같은 효과가 난다.</summary>
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

        /// <summary>Tint 적용을 지우고 원래 텍스처 색으로 되돌린다.</summary>
        public static void ClearTint(GameObject visualRoot)
        {
            var empty = new MaterialPropertyBlock();
            foreach (var r in visualRoot.GetComponentsInChildren<Renderer>())
            {
                r.SetPropertyBlock(empty);
            }
        }

        private const string FallbackSocketName = "WeaponSocket (fallback)";

        /// <summary>PLAN.md 101-3 G "장비 가시화" — 무기를 쥘 소켓(DUNGEON
        /// `Saga.Dungeon.World.CharacterVisual.FindOrCreateWeaponSocket()`과
        /// 같은 로직, 이 asmdef가 SagaDungeon을 참조하지 않아 복사). Humanoid
        /// Animator(Maria)는 본 이름이 뭐든 Avatar 매핑이 같아 `GetBoneTransform`
        /// 하나로 공용. 리깅 없는 폴백(Kenney GLB·capsule)은 시각 루트 밑에
        /// 고정 오프셋 자식을 만들어 대신한다. **`animator.isHuman`으로 먼저
        /// 거를 것** — Animator가 있어도 Avatar가 없거나 Humanoid가 아니면
        /// `GetBoneTransform`이 `InvalidOperationException`을 던진다(DUNGEON
        /// 쪽 작업에서 실제로 겪은 함정).</summary>
        public static Transform FindOrCreateWeaponSocket(GameObject visualRoot, Animator animator)
        {
            if (animator != null && animator.isHuman)
            {
                var hand = animator.GetBoneTransform(HumanBodyBones.RightHand);
                if (hand != null) return hand;
            }

            var existing = visualRoot.transform.Find(FallbackSocketName);
            if (existing != null) return existing;

            var socket = new GameObject(FallbackSocketName).transform;
            socket.SetParent(visualRoot.transform, false);
            socket.localPosition = new Vector3(0.35f, 1.1f, 0.15f);
            return socket;
        }

        /// <summary>GLB 모델을 못 찾았을 때(다른 PC에 아직 안 받아 둔 경우 등)
        /// 쓰는 예전 primitive capsule 대체 — 씬 빌드 자체가 깨지지 않게 한다.</summary>
        public static Transform SpawnFallbackCapsule(Transform parent, Color tint)
        {
            var visual = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            visual.name = "Visual";
            Object.DestroyImmediate(visual.GetComponent<Collider>());
            visual.transform.SetParent(parent, false);
            visual.transform.localScale = new Vector3(1.8f, 1.7f, 1.8f);
            visual.transform.localPosition = new Vector3(0f, 1.7f, 0f);
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
