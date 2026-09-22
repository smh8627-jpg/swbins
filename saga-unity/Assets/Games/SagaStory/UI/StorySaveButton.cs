using UnityEngine;
using Saga.Story.Data;

namespace Saga.Story.UI
{
    /// <summary>"저장" 버튼의 영속 onClick 대상. 영속 리스너는 UnityEngine.Object의 메서드만
    /// 걸 수 있어, 정적 `StorySaveState.Save()`를 이 컴포넌트가 대신 받는다
    /// (`BuildTestStoryScene.BuildActionButton` 주석 — 2026-09-23 버튼 먹통 발견).</summary>
    public class StorySaveButton : MonoBehaviour
    {
        public void Save() => StorySaveState.Save();
    }
}
