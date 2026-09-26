using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using Saga.Title;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 110 ② — `Assets/Scenes/Title.unity` 를 짓는다: 카메라(단색 배경) + `TitleScreen`(UI 는 Play 때 짓는다).
    /// 짓고 나서 에디터 빌드 씬 목록을 <see cref="SagaPlayerBuild.Scenes"/> 로 맞춘다(타이틀이 0번 — 판 씬끼리 오가는 진단도 이 목록을 쓴다).
    /// </summary>
    public static class BuildTitleScene
    {
        [MenuItem("Saga/Build Title Scene")]
        public static void Build()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var cam = new GameObject("Main Camera");
            cam.tag = "MainCamera";
            var c = cam.AddComponent<Camera>();
            c.clearFlags = CameraClearFlags.SolidColor;
            c.backgroundColor = new Color(0.05f, 0.05f, 0.07f);
            cam.AddComponent<AudioListener>();
            new GameObject("Title").AddComponent<TitleScreen>();
            EditorSceneManager.SaveScene(scene, SagaFlowPaths.TitleScene);
            SagaPlayerBuild.SyncEditorBuildScenes();
            Debug.Log("[BuildTitleScene] OK - " + SagaFlowPaths.TitleScene);
            if (Application.isBatchMode) EditorApplication.Exit(0);
        }
    }

    internal static class SagaFlowPaths
    {
        public const string TitleScene = Saga.Core.SagaFlow.TitleScenePath;
    }
}
