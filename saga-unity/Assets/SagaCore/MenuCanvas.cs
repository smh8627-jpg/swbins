using UnityEngine;

namespace Saga.Core
{
    /// <summary>
    /// <see cref="SagaUi.NewCanvas"/> 로 만든 메뉴 캔버스(타이틀·일시정지·성능 기록표) 표시 — 판 설정의 "UI 크기"가
    /// 씬의 스케일러를 몽땅 바꿀 때 이 캔버스는 건너뛴다(<see cref="SagaUi.ApplyGameScaler"/>).
    /// </summary>
    public class MenuCanvas : MonoBehaviour { }
}
