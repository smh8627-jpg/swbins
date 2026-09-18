using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering.Universal;

namespace Saga.Story.World
{
    /// <summary>
    /// PLAN.md 101-3 G "지형 반응" — URP Decal Projector로 발자국·타격
    /// 흔적을 남긴다(DUNGEON/GO `GroundDecal.cs`와 같은 로직, 이 asmdef용
    /// 사본 — 이 게임은 asmdef 자체가 없어(전역 어셈블리) 다른 판이 겪은
    /// `Unity.RenderPipelines.Universal.Runtime` 참조 추가 문제가 없다,
    /// PLAN.md 101-3 표 참고). 텍스처 자산이 없어(원작 자산 금지) 패키지
    /// 내장 기본 Decal 셰이더그래프에 단색만 입힌 사각 패치다.
    ///
    /// 수명 8s·최대 32(표 값 그대로) — 캡 초과 시 가장 오래된 것부터
    /// 즉시 지운다. 이 판은 Z가 항상 0으로 고정된 2.5D 평면이라 데칼도
    /// 그 평면(바닥)에 눕혀 투영한다.
    /// </summary>
    public class StoryGroundDecal : MonoBehaviour
    {
        public enum Kind { Footprint, HitMark }

        private const int MaxAlive = 32; // PLAN.md 101-3 G "최대 32" 그대로.
        private const float LifetimeSec = 8f; // PLAN.md 101-3 G "수명 8s" 그대로.
        private const float FadeStartSec = 6f;

        private static readonly Vector3 FootprintSize = new Vector3(0.22f, 0.32f, 0.5f);
        private static readonly Vector3 HitMarkSize = new Vector3(1f, 1f, 0.5f);
        private static readonly Color FootprintColor = new Color(0.16f, 0.13f, 0.1f, 0.5f);
        private static readonly Color HitMarkColor = new Color(0.32f, 0.2f, 0.12f, 0.65f);

        private static Material _footprintMat;
        private static Material _hitMarkMat;
        private static bool _warnedMissingShader;

        private static readonly List<StoryGroundDecal> Active = new List<StoryGroundDecal>();

        /// <summary>테스트 전용(리플렉션 대신).</summary>
        public static int ActiveCount => Active.Count;

        private DecalProjector _projector;
        private float _age;

        /// <summary>groundPos는 발밑 높이(플레이어·적 둘 다 transform.position이
        /// 이미 그 높이다). 항상 바닥을 향해 투영하도록 로컬 +Z가 아래를
        /// 보게 90도 돌린다.</summary>
        public static void Spawn(Vector3 groundPos, Kind kind)
        {
            var go = new GameObject(kind == Kind.Footprint ? "FootprintDecal (generated)" : "HitMarkDecal (generated)");
            go.transform.SetPositionAndRotation(groundPos + Vector3.up * 0.05f, Quaternion.Euler(90f, 0f, 0f));
            go.AddComponent<StoryGroundDecal>().Build(kind);
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

        private static Material BuildMaterial(Color tint)
        {
            var shader = Shader.Find("Shader Graphs/Decal");
            if (shader == null)
            {
                if (!_warnedMissingShader)
                {
                    _warnedMissingShader = true;
                    Debug.LogWarning("[StoryGroundDecal] \"Shader Graphs/Decal\" 셰이더를 못 찾음 — 지형 반응 데칼을 건너뜀.");
                }
                return null;
            }

            var mat = new Material(shader) { name = "StoryGroundDecal (generated)" };
            mat.SetColor("_BaseColor", tint);
            return mat;
        }
    }
}
