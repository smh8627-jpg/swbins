using UnityEngine;
using Saga.Story.Audio;
using Saga.Story.Data;

namespace Saga.Story.World
{
    /// <summary>
    /// SagaDungeon/SagaGo의 World/GameBootstrap.cs와 같은 역할(네임스페이스만
    /// 변경) — 씬이 다 올라온 뒤 저장 파일이 있으면 위치·사명 진행도를
    /// 되돌린다.
    /// </summary>
    public class GameBootstrap : MonoBehaviour
    {
        // 67장 "사운드" BGM(2026-09-15, StoryAudio.cs 참고).
        [SerializeField] private AudioClip bgmClip;

        private void Start()
        {
            StorySaveState.TryLoad();
            StorySettingsState.ApplyToAllScalers();
            StorySettingsState.ApplyGraphicsQuality();
            StoryAudio.PlayBgm(bgmClip);
        }
    }
}
