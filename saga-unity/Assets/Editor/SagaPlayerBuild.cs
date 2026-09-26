using System.IO;
using System.Linq;
using System.Text;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 110 상용화 ① "실제 빌드 한 번" — 다섯 판 씬을 실행 파일로 묶는다(배치 모드 `-executeMethod`).
    /// 결과물은 `Build/`(gitignore). 끝나면 `Build/<대상>/build_report.txt` 에 결과·크기·시간·경고/오류 수와
    /// 가장 큰 에셋 스물을 적고, 콘솔에 "[SagaPlayerBuild] OK/FAIL" 한 줄. 실패면 종료 코드 1.
    /// 프로젝트 설정(PlayerSettings)은 건드리지 않는다 — 빌드 옵션만 이 호출 안에서 준다.
    /// </summary>
    public static class SagaPlayerBuild
    {
        /// <summary>다섯 판 씬 — 첫 씬이 켜질 때 뜬다(타이틀·판 고르기는 110 ⑤).</summary>
        public static readonly string[] Scenes =
        {
            "Assets/Scenes/TestVillage.unity",       // GO
            "Assets/Scenes/TestDungeon.unity",       // DUNGEON
            "Assets/Scenes/TestVillageForest.unity", // FOREST
            "Assets/Scenes/TestField.unity",         // STORY
            "Assets/Scenes/TestCity.unity",          // REALM
        };

        [MenuItem("Saga/Build/Windows Player")]
        public static void BuildWindows() =>
            Run(BuildTarget.StandaloneWindows64, BuildTargetGroup.Standalone, "Build/Windows/SAGA.exe");

        [MenuItem("Saga/Build/Android APK")]
        public static void BuildAndroid()
        {
            EditorUserBuildSettings.buildAppBundle = false;
            Run(BuildTarget.Android, BuildTargetGroup.Android, "Build/Android/SAGA.apk");
        }

        private static void Run(BuildTarget target, BuildTargetGroup group, string output)
        {
            foreach (var s in Scenes)
                if (!File.Exists(s)) { Finish(false, $"씬 없음 {s}", null, output); return; }

            if (EditorUserBuildSettings.activeBuildTarget != target)
                EditorUserBuildSettings.SwitchActiveBuildTarget(group, target);

            Directory.CreateDirectory(Path.GetDirectoryName(output));
            var opts = new BuildPlayerOptions
            {
                scenes = Scenes,
                locationPathName = output,
                target = target,
                targetGroup = group,
                options = BuildOptions.DetailedBuildReport,
            };
            var report = BuildPipeline.BuildPlayer(opts);
            bool ok = report.summary.result == BuildResult.Succeeded;
            CleanPerformanceTestArtifacts();
            Finish(ok, report.summary.result.ToString(), report, output);
        }

        /// <summary>성능 테스트 패키지가 빌드마다 `Assets/Resources/PerformanceTestRun*.json` 을 남긴다 — 저장소에 안 들이게 치운다.</summary>
        private static void CleanPerformanceTestArtifacts()
        {
            foreach (var f in new[] { "Assets/Resources/PerformanceTestRunInfo.json", "Assets/Resources/PerformanceTestRunSettings.json" })
                if (File.Exists(f)) AssetDatabase.DeleteAsset(f);
            if (AssetDatabase.IsValidFolder("Assets/Resources") && Directory.GetFileSystemEntries("Assets/Resources").Length == 0)
                AssetDatabase.DeleteAsset("Assets/Resources");
        }

        private static void Finish(bool ok, string why, BuildReport report, string output)
        {
            var sb = new StringBuilder();
            sb.AppendLine($"result: {why}");
            if (report != null)
            {
                var s = report.summary;
                sb.AppendLine($"target: {s.platform} · size: {s.totalSize / (1024f * 1024f):F1} MB · time: {s.totalTime.TotalMinutes:F1} min");
                sb.AppendLine($"errors: {s.totalErrors} · warnings: {s.totalWarnings}");
                foreach (var step in report.steps)
                    foreach (var m in step.messages)
                        if (m.type == LogType.Error || m.type == LogType.Exception)
                            sb.AppendLine($"ERROR [{step.name}] {m.content.Split('\n')[0]}");
                var packed = report.packedAssets.SelectMany(p => p.contents)
                    .GroupBy(c => c.sourceAssetPath)
                    .Select(g => (path: g.Key, bytes: g.Sum(c => (long)c.packedSize)))
                    .OrderByDescending(x => x.bytes).Take(20);
                sb.AppendLine("largest assets:");
                foreach (var (path, bytes) in packed) sb.AppendLine($"  {bytes / (1024f * 1024f),7:F1} MB  {path}");
            }
            var dir = Path.GetDirectoryName(output);
            Directory.CreateDirectory(dir);
            File.WriteAllText(Path.Combine(dir, "build_report.txt"), sb.ToString());
            Debug.Log($"[SagaPlayerBuild] {(ok ? "OK" : "FAIL")} - {output}\n{sb}");
            if (Application.isBatchMode) EditorApplication.Exit(ok ? 0 : 1);
        }
    }
}
