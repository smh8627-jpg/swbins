using UnityEngine;

namespace Saga.Core
{
    /// <summary>tools/scene-layout(글자 지도 → 씬 조립, `Assets/Editor/BuildFromLayout.cs`)가
    /// 생성 씬 루트에 남기는 메타 — 걸어 다니는 래퍼(`Saga.Go.Layout.LayoutWalk`)가 실행
    /// 시점에 읽는다. saga-godot의 `root.set_meta("layout_cell")`과 같은 역할.</summary>
    public class LayoutRoot : MonoBehaviour
    {
        public string region;
        public float cell = 4f;
    }
}
