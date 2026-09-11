using UnityEngine;
using Saga.Go.Data;

namespace Saga.Go.World
{
    /// <summary>
    /// saga-godot의 test_village.gd `_ready() { SaveState.try_load() }`와
    /// 같은 역할 — 씬이 다 올라온 뒤 저장 파일이 있으면 부대·플레이어
    /// 위치를 되돌린다. Start()를 쓴다(Awake는 오브젝트마다 순서가 뒤섞일
    /// 수 있지만, Start는 씬의 모든 Awake가 끝난 뒤 불려 Player가 이미
    /// 자리 잡은 뒤라는 게 보장된다).
    /// </summary>
    public class GameBootstrap : MonoBehaviour
    {
        private void Start()
        {
            SaveState.TryLoad();
        }
    }
}
