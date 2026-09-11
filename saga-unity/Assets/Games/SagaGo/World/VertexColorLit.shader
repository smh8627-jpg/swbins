Shader "Saga/VertexColorLit"
{
    // TerrainBuilder.cs가 굽는 정점 색(Color32, RGB만 씀)을 그대로 알베도로
    // 쓰는 최소 URP 라이트 셰이더. 텍스처 없이 칸 색 + 메인 라이트만으로
    // 칠한다 — Vertical Slice 단계의 primitive 표현(PLAN.md 8장)이다.
    // Cull Off — 정점 감김 방향 계산이 어긋나도 안 뚫리게 방어(saga-godot의
    // terrain_builder.gd가 cull_mode=CULL_DISABLED로 같은 걸 했던 것과 동일).
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

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS   : NORMAL;
                float4 color      : COLOR;
            };

            struct Varyings
            {
                float4 positionHCS : SV_POSITION;
                float3 normalWS    : TEXCOORD0;
                float3 positionWS  : TEXCOORD1;
                float4 color       : COLOR;
            };

            Varyings Vert(Attributes IN)
            {
                Varyings OUT;
                VertexPositionInputs posInputs = GetVertexPositionInputs(IN.positionOS.xyz);
                OUT.positionHCS = posInputs.positionCS;
                OUT.positionWS = posInputs.positionWS;
                OUT.normalWS = TransformObjectToWorldNormal(IN.normalOS);
                OUT.color = IN.color;
                return OUT;
            }

            half4 Frag(Varyings IN) : SV_Target
            {
                float3 normalWS = normalize(IN.normalWS);
                Light mainLight = GetMainLight(TransformWorldToShadowCoord(IN.positionWS));
                half ndotl = saturate(dot(normalWS, mainLight.direction));
                half3 shadowed = mainLight.color * (ndotl * mainLight.shadowAttenuation);
                half3 ambient = SampleSH(normalWS);
                half3 lit = IN.color.rgb * (shadowed + ambient);
                return half4(lit, 1);
            }
            ENDHLSL
        }
    }
}
