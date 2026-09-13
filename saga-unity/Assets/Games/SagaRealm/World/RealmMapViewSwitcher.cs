using UnityEngine;
using Saga.Realm.Data;

namespace Saga.Realm.World
{
    /// <summary>
    /// VERTICAL_SLICE_REALM.md 2-8절 — RealmMapState.ViewingMap 하나로
    /// 디오라마(성+궤도 카메라)와 월드맵(지도+드래그 카메라) 중 한 쪽만
    /// 보이게 켜고 끈다(saga-godot 2-8절의 "숨기고 리빌드도 건너뛴다"와
    /// 같은 결 — 꺼진 쪽은 GameObject 자체가 비활성이라 Update도 안 돈다).
    /// </summary>
    public class RealmMapViewSwitcher : MonoBehaviour
    {
        [SerializeField] private GameObject dioramaRoot;
        [SerializeField] private GameObject dioramaCameraRig;
        [SerializeField] private GameObject worldMapRoot;
        [SerializeField] private GameObject worldMapCameraRig;

        private void Awake()
        {
            RealmMapState.Changed += Apply;
        }

        private void Start()
        {
            Apply();
        }

        private void OnDestroy()
        {
            RealmMapState.Changed -= Apply;
        }

        private void Apply()
        {
            bool viewingMap = RealmMapState.ViewingMap;
            if (dioramaRoot != null) dioramaRoot.SetActive(!viewingMap);
            if (dioramaCameraRig != null) dioramaCameraRig.SetActive(!viewingMap);
            if (worldMapRoot != null) worldMapRoot.SetActive(viewingMap);
            if (worldMapCameraRig != null) worldMapCameraRig.SetActive(viewingMap);
        }
    }
}
