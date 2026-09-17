using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering.Universal;

namespace Saga.Dungeon.World
{
    /// <summary>
    /// PLAN.md 101-3 G "지형 반응" — URP Decal Projector로 발자국·타격
    /// 흔적을 남긴다(웹판은 절대 못 하는 것 — 엔진 장점). 텍스처 자산이
    /// 없어(원작 자산 금지 원칙, 루트 CLAUDE.md) 패키지 내장 기본 Decal
    /// 셰이더그래프(`Shader Graphs/Decal`)에 단색만 입힌 사각 패치다 —
    /// 발자국·타격 자국의 실제 "모양"까지는 아니다(실기 확인 대기 항목).
    /// 렌더러에 Decal Renderer Feature가 없으면 아무것도 안 그려질 뿐
    /// 예외는 안 던진다(`BuildDecalRendererFeature.cs`가 먼저 배선해 둔다).
    ///
    /// 수명 8s·최대 32(표 값 그대로) — `Active`가 32를 넘으면 가장 오래된
    /// 것부터 즉시 지운다(`DungeonEnemy.Active`와 같은 OnEnable/OnDisable
    /// 패턴). 마지막 2초는 `DecalProjector.fadeFactor`로 옅어지다 사라진다.
    /// </summary>
    public class GroundDecal : MonoBehaviour
    {
        public enum Kind { Footprint, HitMark }

        private const int MaxAlive = 32; // PLAN.md 101-3 G "최대 32" 그대로.
        private const float LifetimeSec = 8f; // PLAN.md 101-3 G "수명 8s" 그대로.
        private const float FadeStartSec = 6f; // 마지막 2초 동안 옅어지다 사라진다.

        private static readonly Vector3 FootprintSize = new Vector3(0.22f, 0.32f, 0.5f);
        private static readonly Vector3 HitMarkSize = new Vector3(1f, 1f, 0.5f);
        private static readonly Color FootprintColor = new Color(0.16f, 0.13f, 0.1f, 0.5f);
        private static readonly Color HitMarkColor = new Color(0.32f, 0.2f, 0.12f, 0.65f);

        private static Material _footprintMat;
        private static Material _hitMarkMat;
        private static bool _warnedMissingShader;

        private static readonly List<GroundDecal> Active = new List<GroundDecal>();

        /// <summary>테스트 전용(리플렉션 대신) — `HitSpark.SpawnCount`와 같은 결.</summary>
        public static int ActiveCount => Active.Count;

        private DecalProjector _projector;
        private float _age;

        /// <summary>groundPos는 발밑 높이(플레이어·적 둘 다 transform.position이
        /// 이미 그 높이다 — DamagePopup이 Vector3.up을 더해 쓰는 것과 대조).
        /// 항상 바닥을 향해 투영하도록 로컬 +Z가 아래를 보게 90도 돌린다.</summary>
        public static void Spawn(Vector3 groundPos, Kind kind)
        {
            var go = new GameObject(kind == Kind.Footprint ? "FootprintDecal (generated)" : "HitMarkDecal (generated)");
            go.transform.SetPositionAndRotation(groundPos + Vector3.up * 0.05f, Quaternion.Euler(90f, 0f, 0f));
            go.AddComponent<GroundDecal>().Build(kind);
        }

        private void OnEnable() => Active.Add(this);
        private void OnDisable() => Active.Remove(this);

        private void Build(Kind kind)
        {
            bool footprint = kind == Kind.Footprint;
            _projector = gameObject.AddComponent<DecalProjector>();
            _projector.size = footprint ? FootprintSize : HitMarkSize;
            _projector.fadeFactor = 1f;

            var material = footprint ? FootprintMaterial : HitMarkMaterial;
            if (material != null) _projector.material = material;

            if (Active.Count > MaxAlive)
            {
                var oldest = Active[0];
                if (oldest != this) Destroy(oldest.gameObject);
            }
        }

        private void Update()
        {
            _age += Time.deltaTime;
            if (_age >= LifetimeSec)
            {
                Destroy(gameObject);
                return;
            }
            if (_age >= FadeStartSec && _projector != null)
            {
                _projector.fadeFactor = Mathf.Clamp01(1f - (_age - FadeStartSec) / (LifetimeSec - FadeStartSec));
            }
        }

        private static Material FootprintMaterial
        {
            get
            {
                if (_footprintMat == null) _footprintMat = BuildMaterial(FootprintColor);
                return _footprintMat;
            }
        }

        private static Material HitMarkMaterial
        {
            get
            {
                if (_hitMarkMat == null) _hitMarkMat = BuildMaterial(HitMarkColor);
                return _hitMarkMat;
            }
        }

        /// <summary>`Shader.Find`만 쓴다(런타임 코드라 AssetDatabase 불가) —
        /// `WeaponVisual`이 "Universal Render Pipeline/Lit"을 찾는 것과
        /// 같은 결. 못 찾으면(패키지 버전 차이 등) 경고 한 번만 남기고
        /// 데칼 없이 넘어간다 — 게임 진행에 지장 없음.</summary>
        private static Material BuildMaterial(Color tint)
        {
            var shader = Shader.Find("Shader Graphs/Decal");
            if (shader == null)
            {
                if (!_warnedMissingShader)
                {
                    _warnedMissingShader = true;
                    Debug.LogWarning("[GroundDecal] \"Shader Graphs/Decal\" 셰이더를 못 찾음 — 지형 반응 데칼을 건너뜀.");
                }
                return null;
            }

            var mat = new Material(shader) { name = "GroundDecal (generated)" };
            mat.SetColor("_BaseColor", tint);
            return mat;
        }
    }
}
