Shader "Saga/WaterfallUnlit"
{
    // PLAN.md 109-9 폭포 — 절벽 면에 걸친 물 판. uv.x = 폭(0~1), uv.y = 위에서부터 내려온 거리(m).
    // 폭을 가는 줄기 여럿으로 나눠 줄기마다 조금씩 다른 빠르기로 흰 물살이 흘러내리고, 윗가장자리(물이 넘치는 턱)는 더 희고
    // 양옆은 흐려진다. `WaterUnlit` 과 같은 반투명 Unlit·안개(새 텍스처 없음).
    Properties
    {
        _Color ("Water", Color) = (0.36, 0.58, 0.72, 0.62)
        _FoamColor ("Foam", Color) = (0.93, 0.97, 1.0, 0.95)
        _Speed ("Speed", Float) = 1.4
        _Streaks ("Streaks", Float) = 22
    }
    SubShader
    {
        Tags { "RenderType" = "Transparent" "Queue" = "Transparent" "RenderPipeline" = "UniversalPipeline" }
        Blend SrcAlpha OneMinusSrcAlpha
        ZWrite Off
        Cull Off

        Pass
        {
            Name "Unlit"
            HLSLPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma multi_compile_fog
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            float4 _Color;
            float4 _FoamColor;
            float _Speed;
            float _Streaks;

            struct Attributes { float4 positionOS : POSITION; float2 uv : TEXCOORD0; };
            struct Varyings
            {
                float4 positionHCS : SV_POSITION;
                float2 uv : TEXCOORD0;
                float fogCoord : TEXCOORD1;
            };

            float Hash(float n) { return frac(sin(n * 12.9898) * 43758.5453); }

            Varyings Vert(Attributes IN)
            {
                Varyings OUT;
                OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);
                OUT.uv = IN.uv;
                OUT.fogCoord = ComputeFogFactor(OUT.positionHCS.z);
                return OUT;
            }

            half4 Frag(Varyings IN) : SV_Target
            {
                float t = _Time.y * _Speed;
                float col = floor(IN.uv.x * _Streaks);
                float h = Hash(col + 1.0);
                float h2 = Hash(col + 37.0);
                // 줄기마다 다른 빠르기·간격으로 흘러내리는 물살 두 겹
                float s1 = frac(IN.uv.y * (0.10 + h * 0.06) - t * (0.7 + h * 0.5) + h);
                float s2 = frac(IN.uv.y * (0.23 + h2 * 0.1) - t * (1.1 + h2 * 0.6) + h2);
                float streak = smoothstep(0.6, 1.0, s1) * 0.8 + smoothstep(0.75, 1.0, s2) * 0.5;
                float lip = saturate(1.0 - IN.uv.y / 2.5) * 0.55;
                float foam = saturate(streak + lip);
                float edge = smoothstep(0.0, 0.12, IN.uv.x) * smoothstep(0.0, 0.12, 1.0 - IN.uv.x);
                half3 c = lerp(_Color.rgb, _FoamColor.rgb, foam);
                half a = lerp(_Color.a, _FoamColor.a, foam) * edge;
                return half4(MixFog(c, IN.fogCoord), a);
            }
            ENDHLSL
        }
    }
}
