using System;
using System.Collections;
using System.IO;
using System.Linq;
using System.Reflection;
using UnityEditor;
using UnityEngine;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 105 Q-U3 — "Shader Graph 노드 배선은 코드로 불가 → 사람 GUI 몫"으로
    /// 적혀 있었지만, 사용자가 위험을 감수하고 리플렉션 기반 시도를 명시적으로
    /// 요청했다(2026-09-22). Shader Graph 핵심 타입(GraphData·SubGraphNode 등)이
    /// 전부 internal이라(SSS 화면 그림자 때 썼던 ScreenSpaceShadows 트릭과 같은
    /// 결) Type.GetType(...)+리플렉션으로 GraphData를 통째로 조립해
    /// `FileUtilities.WriteShaderGraphToDisk`(내부 API)로 저장한다 —
    /// `GraphUtil.CreateNewGraphWithOutputs`가 실제로 쓰는 `NewGraphAction.Action`
    /// (Editor/Data/Util/GraphUtil.cs) 코드를 그대로 재현.
    ///
    /// **테스트 전용** — 실제 캐릭터 자산은 안 건드리고
    /// `CharactersRealistic/Generated/`(gitignore) 안에 새 그래프만 만든다.
    /// 배치 컴파일로 임포트 오류 여부만 확인하는 1단계, 성공을 확인한 뒤에만
    /// 실제 MariaSkin에 적용(다음 단계, 별도 도구).
    /// </summary>
    public static class BuildTestSssShaderGraph
    {
        private const string SubGraphPath = "Assets/Art/Shaders/Character/SSS_CiaranSimpson/FakeSSS.shadersubgraph";
        private const string OutputPath = "Assets/Art/CharactersRealistic/Generated/Test_SSS_Graph.shadergraph";

        private const BindingFlags InstanceFlags =
            BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.FlattenHierarchy;
        private const BindingFlags NestedTypeFlags = BindingFlags.Public | BindingFlags.NonPublic;

        [MenuItem("Saga/Test Build SSS Shader Graph (Reflection)")]
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
                Debug.LogError("[BuildTestSssShaderGraph] 타입을 하나 이상 못 찾음(위 로그 참고) — 중단");
                return;
            }

            try
            {
                // 1) targets: URP Lit
                var universalTarget = Activator.CreateInstance(universalTargetType);
                Invoke(universalTarget, "TrySetActiveSubTarget", universalLitSubTargetType);
                var targetsArray = Array.CreateInstance(targetType, 1);
                targetsArray.SetValue(universalTarget, 0);

                // 2) blocks: 표준 Lit 서피스 블록 9개
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

                // 3) graph 뼈대 (NewGraphAction.Action 과 같은 순서)
                var graph = Activator.CreateInstance(graphDataType);
                Invoke(graph, "AddContexts");
                Invoke(graph, "InitializeOutputs", targetsArray, blocksArray);
                var defaultCategoryMethod = categoryDataType.GetMethod("DefaultCategory", BindingFlags.Public | BindingFlags.Static);
                var defaultCategory = defaultCategoryMethod.Invoke(null, new object[] { null });
                Invoke(graph, "AddCategory", defaultCategory);

                // 4) FakeSSS Sub Graph 노드 — asset 세터가 UpdateSlots()를 자동 호출
                var subGraphAsset = AssetDatabase.LoadAssetAtPath<ScriptableObject>(SubGraphPath);
                if (subGraphAsset == null)
                {
                    Debug.LogError($"[BuildTestSssShaderGraph] Sub Graph 자산을 못 찾음: {SubGraphPath}");
                    return;
                }
                var subGraphNode = Activator.CreateInstance(subGraphNodeType);
                var assetProp = subGraphNodeType.GetProperty("asset", InstanceFlags);
                assetProp.SetValue(subGraphNode, subGraphAsset);
                Invoke(graph, "AddNode", subGraphNode, true);

                // 5) 출력 슬롯(subgraph의 SubGraphOutputNode 슬롯 id=1 "Color")
                var findSlotGeneric = abstractMaterialNodeType.GetMethods(InstanceFlags)
                    .First(m => m.Name == "FindSlot" && m.IsGenericMethodDefinition)
                    .MakeGenericMethod(materialSlotType);
                var outputSlot = findSlotGeneric.Invoke(subGraphNode, new object[] { 1 });
                if (outputSlot == null)
                {
                    Debug.LogError("[BuildTestSssShaderGraph] SubGraphNode 출력 슬롯(id=1)을 못 찾음 — FakeSSS 구조가 바뀌었을 수 있다");
                    return;
                }
                var slotReferenceProp = materialSlotType.GetProperty("slotReference", InstanceFlags);
                var outputSlotRef = slotReferenceProp.GetValue(outputSlot);

                // 6) BaseColor 블록 노드 찾기
                var getNodesGeneric = graphDataType.GetMethods(InstanceFlags)
                    .First(m => m.Name == "GetNodes" && m.IsGenericMethodDefinition && m.GetParameters().Length == 0)
                    .MakeGenericMethod(blockNodeType);
                var blockNodes = (IEnumerable)getNodesGeneric.Invoke(graph, null);
                object baseColorBlock = null;
                var descriptorProp = blockNodeType.GetProperty("descriptor", InstanceFlags);
                foreach (var bn in blockNodes)
                {
                    var descriptor = descriptorProp.GetValue(bn);
                    var descName = (string)descriptor.GetType().GetProperty("name", InstanceFlags).GetValue(descriptor);
                    if (descName == "BaseColor")
                    {
                        baseColorBlock = bn;
                        break;
                    }
                }
                if (baseColorBlock == null)
                {
                    Debug.LogError("[BuildTestSssShaderGraph] BaseColor 블록 노드를 못 찾음");
                    return;
                }
                var baseColorSlot = findSlotGeneric.Invoke(baseColorBlock, new object[] { 0 });
                var baseColorSlotRef = slotReferenceProp.GetValue(baseColorSlot);

                // 7) 연결: FakeSSS.Color(Vector4) → BaseColor 블록 입력
                var connectMethod = graphDataType.GetMethods(InstanceFlags)
                    .First(m => m.Name == "Connect" && m.GetParameters().Length == 2);
                connectMethod.Invoke(graph, new[] { outputSlotRef, baseColorSlotRef });

                // 8) 디스크에 쓰기
                var dir = Path.GetDirectoryName(OutputPath);
                if (!AssetDatabase.IsValidFolder(dir))
                {
                    Directory.CreateDirectory(dir!);
                }
                var writeMethod = fileUtilitiesType.GetMethod("WriteShaderGraphToDisk", BindingFlags.Public | BindingFlags.Static);
                var result = writeMethod.Invoke(null, new object[] { OutputPath, graph });
                if (result == null)
                {
                    Debug.LogError("[BuildTestSssShaderGraph] 디스크 쓰기 실패");
                    return;
                }

                AssetDatabase.Refresh();
                Debug.Log($"[BuildTestSssShaderGraph] done — {OutputPath}");
            }
            catch (Exception e)
            {
                Debug.LogError($"[BuildTestSssShaderGraph] 예외: {e}");
            }
        }

        private static object Invoke(object instance, string method, params object[] args)
        {
            var m = instance.GetType().GetMethods(InstanceFlags)
                .First(mi => mi.Name == method && mi.GetParameters().Length == args.Length);
            return m.Invoke(instance, args);
        }

        [MenuItem("Saga/Test Verify SSS Shader Graph")]
        public static void Verify()
        {
            var shader = AssetDatabase.LoadAssetAtPath<Shader>(OutputPath);
            if (shader == null)
            {
                Debug.LogError($"[BuildTestSssShaderGraph] Verify: Shader를 못 불러옴 — {OutputPath}");
                return;
            }
            var hasError = ShaderUtil.ShaderHasError(shader);
            var message = ShaderUtil.GetShaderMessageCount(shader);
            Debug.Log($"[BuildTestSssShaderGraph] Verify: ShaderHasError={hasError}, messageCount={message}");
            if (hasError || message > 0)
            {
                foreach (var m in ShaderUtil.GetShaderMessages(shader))
                {
                    Debug.LogError($"[BuildTestSssShaderGraph] Verify msg: {m.severity} {m.message} ({m.file}:{m.line})");
                }
            }
        }

        private static Type T(string name, string assembly = "Unity.ShaderGraph.Editor")
        {
            var t = Type.GetType($"{name}, {assembly}");
            if (t == null)
            {
                Debug.LogError($"[BuildTestSssShaderGraph] type not found: {name}, {assembly}");
            }
            return t;
        }
    }
}
