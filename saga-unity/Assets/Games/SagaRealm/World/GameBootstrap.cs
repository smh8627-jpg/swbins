using UnityEngine;
using Saga.Realm.Data;

namespace Saga.Realm.World
{
    /// <summary>SagaGo/SagaStory GameBootstrap.cs와 같은 역할 — 씬이 다
    /// 올라온 뒤 저장 파일이 있으면 RealmCityState를 되돌린다.</summary>
    public class GameBootstrap : MonoBehaviour
    {
        private void Start()
        {
            RealmSaveState.TryLoad();
        }
    }
}
