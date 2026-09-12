Shader "Saga/ForestWorldCurve"
{
    // VERTICAL_SLICE_FOREST.md(saga-godot) 1절 "구면 투영" 결정을 Unity
    // URP로 옮겼다 — 진짜로 휜 지오메트리가 아니라 순수 정점 셰이더 트릭,
    // 세계 좌표·걷기·판정은 C#에서 계속 평면으로 계산한다(그쪽 문서와
    // 같은 경계). SagaGo `VertexColorLit.shader`를 뼈대로 그대로 재사용
    // (이미 이 프로젝트에서 검증된 URP 최소 라이트 셰이더 구조) — 정점
    // 색 대신 단색 `_BaseColor`, 그리고 곡률 오프셋만 추가했다.
    //
    // 곡률 공식(godot의 world_curve.gdshaderinc와 동일):
    //   offset = dot(worldXZ - center.xz, worldXZ - center.xz) * _CurveAmount
    //   position.y -= offset   ("파낸다=낮아진다", 그릇 모양)
    // **전제 — Y축 회전만 쓰는 오브젝트에만 유효하다**(이 프로젝트의 월드
    // 오브젝트는 전부 그렇다, godot 문서의 같은 전제 그대로) — 그래서
    // 오브젝트 로컬 Y에서 바로 빼도 최종 월드 결과가 어긋나지 않는다.
    // `_SagaWorldCurveCenter`는 전역(글로벌) 파라미터 —
    // `World/ForestWorldCurveDriver.cs`가 매 프레임 플레이어 위치로 갱신한다.
    // 이 값을 보는 모든 머티리얼(땅·나무·NPC 등)이 같은 값을 봐야 한다 —
    // 땅만 휘고 나무는 안 휘면 나무가 공중에 뜬 것처럼 보인다. 실내
    // 머티리얼은 이 셰이더를 아예 안 물리는 것으로 "안 휨"을 표현한다.
    Properties
    {
        _BaseColor("Base Color", Color) = (0.35, 0.55, 0.25, 1)
        _CurveAmount("Curve Amount", Float) = 0.004
    }
    SubShader
    {
        Tags { "RenderType" = "Opaque" "RenderPipeline" = "UniversalPipeline" "Queue" = "Geometry" }
        Cull Off

        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode" = "UniversalForward" }

            HLSLPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS_CASCADE
            #pragma multi_compile_fog

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            half4 _BaseColor;
            float _CurveAmount;
            float3 _SagaWorldCurveCenter;

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS   : NORMAL;
            };

            struct Varyings
            {
                float4 positionHCS : SV_POSITION;
                float3 normalWS    : TEXCOORD0;
                float3 positionWS  : TEXCOORD1;
                float fogCoord     : TEXCOORD2;
            };

            Varyings Vert(Attributes IN)
            {
                Varyings OUT;

                float3 positionOS = IN.positionOS.xyz;
                float3 rawWorldPos = TransformObjectToWorld(positionOS);
                float2 diff = rawWorldPos.xz - _SagaWorldCurveCenter.xz;
                float offset = dot(diff, diff) * _CurveAmount;
                positionOS.y -= offset;

                VertexPositionInputs posInputs = GetVertexPositionInputs(positionOS);
                OUT.positionHCS = posInputs.positionCS;
                OUT.positionWS = posInputs.positionWS;
                OUT.normalWS = TransformObjectToWorldNormal(IN.normalOS);
                OUT.fogCoord = ComputeFogFactor(OUT.positionHCS.z);
                return OUT;
            }

            half4 Frag(Varyings IN) : SV_Target
            {
                float3 normalWS = normalize(IN.normalWS);
                Light mainLight = GetMainLight(TransformWorldToShadowCoord(IN.positionWS));
                half ndotl = saturate(dot(normalWS, mainLight.direction));
                half3 shadowed = mainLight.color * (ndotl * mainLight.shadowAttenuation);
                half3 ambient = SampleSH(normalWS);
                half3 lit = _BaseColor.rgb * (shadowed + ambient);
                lit = MixFog(lit, IN.fogCoord);
                return half4(lit, _BaseColor.a);
            }
            ENDHLSL
        }
    }
}
