Shader "Saga/VertexColorTriplanarLit"
{
    // Saga/VertexColorLit(같은 폴더)의 자매 셰이더 — procgen.py(tools/
    // asset-forge, PLAN.md 102-4·103-1)가 찍어내는 나무·바위 GLB용이다.
    // 그 메시들엔 UV가 없다(trimesh가 안 만든다) — 그래서 디테일 텍스처를
    // UV 대신 월드 위치 + 법선 블렌드로 투영해 읽는다(트라이플레이너).
    // 바탕색은 정점색(procgen.py가 굽는 몸통 갈색/수관 초록/바위 회색) 그대로
    // 쓰고, 그 위에 그레이스케일 디테일(bark/rock 텍스처)을 곱한다 —
    // VertexColorLit의 "디테일 오버레이" 원칙과 같은 결.
    Properties
    {
        _DetailTex ("Detail (grayscale multiply, triplanar)", 2D) = "white" {}
        _DetailTiling ("Detail Tiling (world units per repeat)", Float) = 1.5
        _DetailStrength ("Detail Strength", Range(0,1)) = 0.6
        _BlendSharpness ("Triplanar Blend Sharpness", Range(1,8)) = 4
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

            TEXTURE2D(_DetailTex); SAMPLER(sampler_DetailTex);
            float _DetailTiling;
            float _DetailStrength;
            float _BlendSharpness;

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
                float fogCoord     : TEXCOORD2;
            };

            Varyings Vert(Attributes IN)
            {
                Varyings OUT;
                VertexPositionInputs posInputs = GetVertexPositionInputs(IN.positionOS.xyz);
                OUT.positionHCS = posInputs.positionCS;
                OUT.positionWS = posInputs.positionWS;
                OUT.normalWS = TransformObjectToWorldNormal(IN.normalOS);
                OUT.color = IN.color;
                OUT.fogCoord = ComputeFogFactor(OUT.positionHCS.z);
                return OUT;
            }

            half SampleDetailTriplanar(float3 positionWS, float3 normalWS)
            {
                float2 uvX = positionWS.zy / _DetailTiling;
                float2 uvY = positionWS.xz / _DetailTiling;
                float2 uvZ = positionWS.xy / _DetailTiling;

                half dx = SAMPLE_TEXTURE2D(_DetailTex, sampler_DetailTex, uvX).r;
                half dy = SAMPLE_TEXTURE2D(_DetailTex, sampler_DetailTex, uvY).r;
                half dz = SAMPLE_TEXTURE2D(_DetailTex, sampler_DetailTex, uvZ).r;

                float3 blend = pow(abs(normalWS), _BlendSharpness);
                blend /= max(1e-4, (blend.x + blend.y + blend.z));
                return dx * blend.x + dy * blend.y + dz * blend.z;
            }

            half4 Frag(Varyings IN) : SV_Target
            {
                float3 normalWS = normalize(IN.normalWS);
                Light mainLight = GetMainLight(TransformWorldToShadowCoord(IN.positionWS));
                half ndotl = saturate(dot(normalWS, mainLight.direction));
                half3 shadowed = mainLight.color * (ndotl * mainLight.shadowAttenuation);
                half3 ambient = SampleSH(normalWS);

                half detail = SampleDetailTriplanar(IN.positionWS, normalWS);
                half3 albedo = IN.color.rgb * lerp(1.0h, detail, _DetailStrength);

                half3 lit = albedo * (shadowed + ambient);
                lit = MixFog(lit, IN.fogCoord);
                return half4(lit, 1);
            }
            ENDHLSL
        }
    }
}
