using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using UnityEditor;
using UnityEngine;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 105 Q-U3 2단계 — `BuildTestSssShaderGraph.cs`로 리플렉션 기반
    /// Shader Graph 조립이 실제로 컴파일됨을(ShaderHasError=False) 확인한 뒤,
    /// 같은 기법으로 Maria 피부 전용 그래프를 만든다.
    ///
    /// BaseColor/Smoothness 블록은 일부러 비워 둔다 — URP Lit 관례상
    /// 안 이어진 블록은 그 이름 그대로(`_BaseColor`·`_Smoothness`) 머티리얼
    /// 프로퍼티로 노출되므로, `BuildMariaSkinSplit.cs`의 기존
    /// SetColor/SetFloat 오버라이드(웜톤 근사)가 그대로 먹는다. FakeSSS
    /// 출력은 **Emission**에 더한다 — 대체가 아니라 그 위에 얹는 글로우.
    /// </summary>
    public static class BuildMariaSssShaderGraph
    {
        private const string SubGraphPath = "Assets/Art/Shaders/Character/SSS_CiaranSimpson/FakeSSS.shadersubgraph";
        public const string OutputPath = "Assets/Art/CharactersRealistic/Generated/MariaSkin.shadergraph";

        private const BindingFlags InstanceFlags =
            BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.FlattenHierarchy;
        private const BindingFlags NestedTypeFlags = BindingFlags.Public | BindingFlags.NonPublic;

        [MenuItem("Saga/Build Maria SSS Shader Graph (Reflection)")]
        public static void Build()
        {
            var graphDataType = T("UnityEditor.ShaderGraph.GraphData");
            var categoryDataType = T("UnityEditor.ShaderGraph.CategoryData");
            var blockFieldsType = T("UnityEditor.ShaderGraph.BlockFields");
            var blockFieldDescriptorType = T("UnityEditor.ShaderGraph.BlockFieldDescriptor");
            var targetType = T("UnityEditor.ShaderGraph.Target");
            var universalTargetType = T("UnityEditor.Rendering.Universal.ShaderGraph.UniversalTarget", "Unity.RenderPipelines.Universal.Editor");
            var universalLitSubTargetType = T("UnityEditor.Rendering.Universal.ShaderGraph.UniversalLitSubTarget", "Unity.RenderPipelines.Universal.Editor");
            var subGraphNodeType = T("UnityEditor.ShaderGraph.SubGraphNode");
            var abstractMaterialNodeType = T("UnityEditor.ShaderGraph.AbstractMaterialNode");
            var materialSlotType = T("UnityEditor.ShaderGraph.MaterialSlot");
            var blockNodeType = T("UnityEditor.ShaderGraph.BlockNode");
            var fileUtilitiesType = T("UnityEditor.ShaderGraph.FileUtilities");

            var allTypes = new[]
            {
                graphDataType, categoryDataType, blockFieldsType, blockFieldDescriptorType, targetType,
                universalTargetType, universalLitSubTargetType, subGraphNodeType, abstractMaterialNodeType,
                materialSlotType, blockNodeType, fileUtilitiesType,
            };
            if (allTypes.Any(t => t == null))
            {
                Debug.LogError("[BuildMariaSssShaderGraph] 타입을 하나 이상 못 찾음 — 중단");
                return;
            }

            try
            {
                var universalTarget = Activator.CreateInstance(universalTargetType);
                Invoke(universalTarget, "TrySetActiveSubTarget", universalLitSubTargetType);
                var targetsArray = Array.CreateInstance(targetType, 1);
                targetsArray.SetValue(universalTarget, 0);

                var vertexDesc = blockFieldsType.GetNestedType("VertexDescription", NestedTypeFlags);
                var surfaceDesc = blockFieldsType.GetNestedType("SurfaceDescription", NestedTypeFlags);
                var blockSpecs = new (Type owner, string field)[]
                {
                    (vertexDesc, "Position"), (vertexDesc, "Normal"), (vertexDesc, "Tangent"),
                    (surfaceDesc, "BaseColor"), (surfaceDesc, "NormalTS"), (surfaceDesc, "Metallic"),
                    (surfaceDesc, "Smoothness"), (surfaceDesc, "Emission"), (surfaceDesc, "Occlusion"),
                };
                var blocksArray = Array.CreateInstance(blockFieldDescriptorType, blockSpecs.Length);
                for (var i = 0; i < blockSpecs.Length; i++)
                {
                    var field = blockSpecs[i].owner.GetField(blockSpecs[i].field, BindingFlags.Public | BindingFlags.Static);
                    blocksArray.SetValue(field.GetValue(null), i);
                }

                var graph = Activator.CreateInstance(graphDataType);
                Invoke(graph, "AddContexts");
                Invoke(graph, "InitializeOutputs", targetsArray, blocksArray);
                var defaultCategoryMethod = categoryDataType.GetMethod("DefaultCategory", BindingFlags.Public | BindingFlags.Static);
                var defaultCategory = defaultCategoryMethod.Invoke(null, new object[] { null });
                Invoke(graph, "AddCategory", defaultCategory);

                var subGraphAsset = AssetDatabase.LoadAssetAtPath<ScriptableObject>(SubGraphPath);
                if (subGraphAsset == null)
                {
                    Debug.LogError($"[BuildMariaSssShaderGraph] Sub Graph 자산을 못 찾음: {SubGraphPath}");
                    return;
                }
                var subGraphNode = Activator.CreateInstance(subGraphNodeType);
                var assetProp = subGraphNodeType.GetProperty("asset", InstanceFlags);
                assetProp.SetValue(subGraphNode, subGraphAsset);
                Invoke(graph, "AddNode", subGraphNode, true);

                // 입력 기본값 튜닝(45장 "가장 싼 근사") — Mask 기본값이 0이라
                // 안 올리면 효과가 죽는다.
                var getInputSlotsGeneric = abstractMaterialNodeType.GetMethods(InstanceFlags)
                    .First(m => m.Name == "GetInputSlots" && m.IsGenericMethodDefinition && m.GetParameters().Length == 1)
                    .MakeGenericMethod(materialSlotType);
                var listType = typeof(List<>).MakeGenericType(materialSlotType);
                var inputSlotsList = Activator.CreateInstance(listType);
                getInputSlotsGeneric.Invoke(subGraphNode, new[] { inputSlotsList });
                var rawDisplayNameMethod = materialSlotType.GetMethod("RawDisplayName", InstanceFlags);
                var overrides = new Dictionary<string, object>
                {
                    ["Mask"] = 1f,
                    ["Power"] = 2f,
                    // 105 Q-U3 최종 튜닝(2026-09-23, 직접 GUI로 검증) — 0.6(최초)·2.5·6은
                    // 전부 실제 화면에서 거의 안 보였다. Intensity=20·Colour=순빨강(5,0,0)
                    // 디버그값으로 파이프라인 자체(Mask·Dot Product·GetMainLightDir 체인)는
                    // 정상 작동함을 먼저 확정한 뒤(`02a/02b_face_closeup_*.png`에서 역광
                    // 구도 턱선·목선에 뚜렷한 글로우 확인), 웜톤 프로덕션 Colour(최대 채널
                    // 1.0, 디버그 순빨강의 1/5 세기)에 맞춰 15로 올려 코·턱선에 은은한
                    // 웜톤 하이라이트가 보이는 지점을 찾았다.
                    ["Intensity"] = 15f,
                    ["normal influence"] = 0.5f,
                    ["Colour"] = new Vector4(1f, 0.55f, 0.45f, 1f),
                };
                foreach (var slot in (IEnumerable)inputSlotsList)
                {
                    var slotName = (string)rawDisplayNameMethod.Invoke(slot, null);
                    if (overrides.TryGetValue(slotName, out var v))
                    {
                        var valueProp = slot.GetType().GetProperty("value", InstanceFlags);
                        valueProp?.SetValue(slot, v);
                    }
                }

                var findSlotGeneric = abstractMaterialNodeType.GetMethods(InstanceFlags)
                    .First(m => m.Name == "FindSlot" && m.IsGenericMethodDefinition)
                    .MakeGenericMethod(materialSlotType);
                var outputSlot = findSlotGeneric.Invoke(subGraphNode, new object[] { 1 });
                if (outputSlot == null)
                {
                    Debug.LogError("[BuildMariaSssShaderGraph] SubGraphNode 출력 슬롯(id=1)을 못 찾음");
                    return;
                }
                var slotReferenceProp = materialSlotType.GetProperty("slotReference", InstanceFlags);
                var outputSlotRef = slotReferenceProp.GetValue(outputSlot);

                var getNodesGeneric = graphDataType.GetMethods(InstanceFlags)
                    .First(m => m.Name == "GetNodes" && m.IsGenericMethodDefinition && m.GetParameters().Length == 0)
                    .MakeGenericMethod(blockNodeType);
                var blockNodes = (IEnumerable)getNodesGeneric.Invoke(graph, null);
                object emissionBlock = null;
                var descriptorProp = blockNodeType.GetProperty("descriptor", InstanceFlags);
                foreach (var bn in blockNodes)
                {
                    var descriptor = descriptorProp.GetValue(bn);
                    var descName = (string)descriptor.GetType().GetProperty("name", InstanceFlags).GetValue(descriptor);
                    if (descName == "Emission")
                    {
                        emissionBlock = bn;
                        break;
                    }
                }
                if (emissionBlock == null)
                {
                    Debug.LogError("[BuildMariaSssShaderGraph] Emission 블록 노드를 못 찾음");
                    return;
                }
                var emissionSlot = findSlotGeneric.Invoke(emissionBlock, new object[] { 0 });
                var emissionSlotRef = slotReferenceProp.GetValue(emissionSlot);

                var connectMethod = graphDataType.GetMethods(InstanceFlags)
                    .First(m => m.Name == "Connect" && m.GetParameters().Length == 2);
                connectMethod.Invoke(graph, new[] { outputSlotRef, emissionSlotRef });

                var dir = Path.GetDirectoryName(OutputPath);
                if (!AssetDatabase.IsValidFolder(dir))
                {
                    Directory.CreateDirectory(dir!);
                }
                var writeMethod = fileUtilitiesType.GetMethod("WriteShaderGraphToDisk", BindingFlags.Public | BindingFlags.Static);
                var result = writeMethod.Invoke(null, new object[] { OutputPath, graph });
                if (result == null)
                {
                    Debug.LogError("[BuildMariaSssShaderGraph] 디스크 쓰기 실패");
                    return;
                }

                AssetDatabase.Refresh();
                Debug.Log($"[BuildMariaSssShaderGraph] done — {OutputPath}");
            }
            catch (Exception e)
            {
                Debug.LogError($"[BuildMariaSssShaderGraph] 예외: {e}");
            }
        }

        [MenuItem("Saga/Verify Maria SSS Shader Graph")]
        public static void Verify()
        {
            var shader = AssetDatabase.LoadAssetAtPath<Shader>(OutputPath);
            if (shader == null)
            {
                Debug.LogError($"[BuildMariaSssShaderGraph] Verify: Shader를 못 불러옴 — {OutputPath}");
                return;
            }
            var hasError = ShaderUtil.ShaderHasError(shader);
            var messageCount = ShaderUtil.GetShaderMessageCount(shader);
            Debug.Log($"[BuildMariaSssShaderGraph] Verify: ShaderHasError={hasError}, messageCount={messageCount}");
            if (hasError || messageCount > 0)
            {
                foreach (var m in ShaderUtil.GetShaderMessages(shader))
                {
                    Debug.LogError($"[BuildMariaSssShaderGraph] Verify msg: {m.severity} {m.message} ({m.file}:{m.line})");
                }
            }
        }

        private static object Invoke(object instance, string method, params object[] args)
        {
            var m = instance.GetType().GetMethods(InstanceFlags)
                .First(mi => mi.Name == method && mi.GetParameters().Length == args.Length);
            return m.Invoke(instance, args);
        }

        private static Type T(string name, string assembly = "Unity.ShaderGraph.Editor")
        {
            var t = Type.GetType($"{name}, {assembly}");
            if (t == null)
            {
                Debug.LogError($"[BuildMariaSssShaderGraph] type not found: {name}, {assembly}");
            }
            return t;
        }
    }
}
