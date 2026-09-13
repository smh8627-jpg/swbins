using UnityEngine;

namespace Saga.Realm.World
{
    /// <summary>
    /// 월드맵 성표 탭 판정용 꼬리표(VERTICAL_SLICE_REALM.md 2-9절) —
    /// `RealmWorldMapCamera.cs`가 탭(짧게 눌렀다 뗌)을 잡으면 이 컴포넌트로
    /// 성 id를 읽는다(saga-godot의 input_event bind와 같은 역할이되, 이
    /// 프로젝트는 새 Input System 전용이라 카메라 쪽에서 직접
    /// Physics.Raycast로 판정한다). **`RealmWorldMap.cs`와 같은 파일에
    /// 두 번째 클래스로 뒀다가 씬 저장 시 스크립트 참조가 guid 없는
    /// 클래스명 폴백으로 직렬화되며 GetComponent가 null을 반환하는 문제를
    /// 겪어 별도 파일로 뺐다** — 이 프로젝트의 다른 모든 MonoBehaviour와
    /// 같이 파일 하나에 클래스 하나 원칙을 지킨다.
    /// </summary>
    public class RealmCityMarkerId : MonoBehaviour
    {
        public string CityId;
    }
}
