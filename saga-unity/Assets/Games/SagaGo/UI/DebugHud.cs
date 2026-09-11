using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.UI;

namespace Saga.Go.UI
{
    /// <summary>
    /// PLAN.md 46장·66-1장 — 디버그 빌드에서만 현재 렌더 파이프라인 프로파일과
    /// FPS를 표시한다(릴리즈 빌드에서는 자동으로 숨는다). saga-godot의
    /// renderer_debug_label.gd와 같은 정신·같은 최소 범위 — PLAN.md
    /// 44~49장이 나열한 전체 목록(Draw Calls/Enemy Count/Current Quest 등)은
    /// 아직 그 시스템 자체가 없어서(Enemy/Quest는 이 슬라이스 범위 밖) 안
    /// 만든다, saga-godot도 실제로는 렌더러 이름만 보여준다.
    /// </summary>
    // 이름 주의 — "DebugOverlay"는 UnityEngine.Rendering.DebugOverlay와
    // 겹쳐 컴파일 에러(CS0104)가 난다. DebugHud로 피했다.
    public class DebugHud : MonoBehaviour
    {
        [SerializeField] private Text label;

        private float _fpsTimer;
        private int _frameCount;
        private float _fps;

        private void Awake()
        {
            if (!Debug.isDebugBuild)
            {
                gameObject.SetActive(false);
            }
        }

        private void Update()
        {
            _frameCount++;
            _fpsTimer += Time.unscaledDeltaTime;
            if (_fpsTimer >= 0.5f)
            {
                _fps = _frameCount / _fpsTimer;
                _frameCount = 0;
                _fpsTimer = 0f;
                Refresh();
            }
        }

        private void Refresh()
        {
            if (label == null) return;
            var pipeline = GraphicsSettings.currentRenderPipeline;
            string name = pipeline != null ? pipeline.name : "(built-in)";
            label.text = $"renderer: {name}\n{_fps:F0} fps";
        }
    }
}
