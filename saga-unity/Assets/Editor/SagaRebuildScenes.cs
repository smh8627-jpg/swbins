using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 110 ⑤ — 다섯 판 씬(+ LayoutWalk)을 씬 빌더로 한 번에 다시 짓는다(배치 한 번에 `-executeMethod` 하나라 묶음).
    /// 끝에 씬마다 옛 `UnityEngine.UI.Text` 컴포넌트 수를 세어 0 이 아니면 실패. 콘솔 "[SagaRebuildScenes] OK/FAIL".
    /// 씬 재빌드는 컷 타임라인(`*.playable`) 트랙 ID 도 새로 쓴다 — 씬과 같이 커밋한다(PROJECT_STATE 알려진 오류).
    /// </summary>
    public static class SagaRebuildScenes
    {
        private const string LegacyTextGuid = "5f7201a12d95ffc409449d95f23cf332"; // UnityEngine.UI.Text 스크립트

        private static readonly (string scene, Action build)[] Builders =
        {
            ("Assets/Scenes/TestVillage.unity", BuildTestVillageScene.Build),
            ("Assets/Scenes/TestDungeon.unity", BuildTestDungeonScene.Build),
            ("Assets/Scenes/TestVillageForest.unity", BuildTestVillageForestScene.Build),
            ("Assets/Scenes/TestField.unity", BuildTestStoryScene.Build),
            ("Assets/Scenes/TestCity.unity", BuildTestCityScene.Build),
            ("Assets/Scenes/LayoutWalk.unity", BuildLayoutWalkScene.Build),
        };

        [MenuItem("Saga/Build/Rebuild All Game Scenes")]
        public static void RebuildAll()
        {
            bool ok = true;
            foreach (var (scene, build) in Builders)
            {
                var t0 = DateTime.Now;
                try { build(); }
                catch (Exception e) { ok = false; Debug.LogError($"[SagaRebuildScenes] {scene} 빌더 예외: {e}"); continue; }
                Debug.Log($"[SagaRebuildScenes] {scene} — {(DateTime.Now - t0).TotalSeconds:F0}초");
            }
            ok &= CountLegacyText(true) == 0;
            Debug.Log($"[SagaRebuildScenes] {(ok ? "OK" : "FAIL")}");
            if (Application.isBatchMode) EditorApplication.Exit(ok ? 0 : 1);
        }

        /// <summary>커밋된 씬·프리팹 안의 옛 UI.Text 컴포넌트 수(YAML 의 스크립트 GUID 로 센다).</summary>
        public static int CountLegacyText(bool log)
        {
            int total = 0;
            var files = Directory.GetFiles("Assets", "*.unity", SearchOption.AllDirectories)
                .Concat(Directory.GetFiles("Assets", "*.prefab", SearchOption.AllDirectories));
            foreach (var f in files)
            {
                int n = File.ReadLines(f).Count(l => l.Contains(LegacyTextGuid));
                if (n == 0) continue;
                total += n;
                if (log) Debug.LogWarning($"[SagaRebuildScenes] 옛 UI.Text {n}개: {f.Replace('\\', '/')}");
            }
            return total;
        }
    }
}
