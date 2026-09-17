using UnityEngine;
using Saga.Go.Audio;
using Saga.Go.Data;
using Saga.Go.Player;

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
        // 67장 "사운드" — BGM 첫 슬라이스(2026-09-15, GoAudio.cs 클래스 주석
        // 참고). 편집기 빌드 스크립트가 채운다(BuildTestVillageScene.cs).
        [SerializeField] private AudioClip bgmClip;

        // PLAN.md 101-3 G "성장 연출"(2026-09-17) — DUNGEON `GameBootstrap`과
        // 같은 결(캐싱 후 레벨업 이벤트에 카메라 컷 연결).
        private CameraRig _cameraRig;

        private void Start()
        {
            SaveState.TryLoad();
            CombineStaticBatches();
            GoSettingsState.ApplyToAllScalers();
            GoSettingsState.ApplyGraphicsQuality();
            GoAudio.PlayBgm(bgmClip);
            PlayerStats.LeveledUp += OnLeveledUp;
            _cameraRig = Object.FindFirstObjectByType<CameraRig>();
        }

        private void OnDestroy()
        {
            PlayerStats.LeveledUp -= OnLeveledUp;
        }

        private void OnLeveledUp(int newLevel)
        {
            _cameraRig?.PlayLevelUpCut();
        }

        /// <summary>
        /// PLAN.md 76장 Mobile Performance Pass 이어서 — MarkStatic()으로
        /// isStatic 플래그만 걸어 둔 것으론 드로우콜이 안 준다. Terrain·
        /// Vegetation·Landmarks는 전부 코드가 Awake()에서 매번 새로 만드는
        /// 메시라(에디터에서 손으로 배치한 오브젝트가 아니라) Unity의 빌드타임
        /// 정적 배칭 대상이 아니다 — 명시로 StaticBatchingUtility.Combine()을
        /// 불러야 한다. 씬의 모든 Awake가 끝난 뒤(Start는 보장됨) 각 빌더의
        /// 루트를 기준으로 배칭한다(세 루트가 부모를 안 나눠 각자 따로).
        /// </summary>
        private void CombineStaticBatches()
        {
            foreach (var rootName in new[] { "Terrain", "Vegetation", "Landmarks" })
            {
                var root = GameObject.Find(rootName);
                if (root != null)
                {
                    StaticBatchingUtility.Combine(root);
                }
            }
        }
    }
}
