using UnityEngine;
using Saga.Go.Data;

namespace Saga.Go.Audio
{
    /// <summary>
    /// PLAN.md 67장 "사운드" — `Saga.Forest.Audio.ForestAudio.cs`와 같은 결
    /// (다섯 판이 공용 로직을 각자 복사해 쓰는 관례, 루트 CLAUDE.md). 진짜
    /// Unity AudioMixer 에셋은 에디터 GUI로 사람이 노드를 잇는 방식이라
    /// 배치 모드로 못 만들어(66-2장 ⑤ 헤어카드/SSS Shader Graph와 같은 제약)
    /// 이번에도 코드로 Master/SFX 볼륨을 곱하는 것으로만 흉내 낸다.
    ///
    /// 2026-09-14 — `BanditEncounter.cs`의 강타 히트/피격 화면 플래시에
    /// 타격감 SFX를 붙이려고 먼저 만든다. **승리/패배 음악(징글)은 아직 안
    /// 붙였다** — 어느 트랙이 "이김"이고 어느 게 "짐"인지 오디오를 직접
    /// 들어야 구분되는데 이 세션은 소리를 들을 방법이 없어, 잘못 골라
    /// 승리 장면에 패배 음악이 깔리는 사고를 피하려고 일부러 보류했다.
    /// 사람이 직접 들어 보고 골라야 하는 몫(HOW_TO_PLAYTEST.md 참고할 것).
    /// </summary>
    public static class GoAudio
    {
        private const string MasterKey = "saga_go_vol_master";
        private const string SfxKey = "saga_go_vol_sfx";
        private const string BgmKey = "saga_go_vol_bgm";

        public static float MasterVolume
        {
            get => PlayerPrefs.GetFloat(MasterKey, 1f);
            set => PlayerPrefs.SetFloat(MasterKey, Mathf.Clamp01(value));
        }

        public static float SfxVolume
        {
            get => PlayerPrefs.GetFloat(SfxKey, 1f);
            set => PlayerPrefs.SetFloat(SfxKey, Mathf.Clamp01(value));
        }

        public static float BgmVolume
        {
            get => PlayerPrefs.GetFloat(BgmKey, 1f);
            set => PlayerPrefs.SetFloat(BgmKey, Mathf.Clamp01(value));
        }

        private static AudioSource _sfxSource;

        private static AudioSource EnsureSfxSource()
        {
            if (_sfxSource != null) return _sfxSource;
            var go = new GameObject("GoAudio_SfxSource");
            _sfxSource = go.AddComponent<AudioSource>();
            _sfxSource.playOnAwake = false;
            return _sfxSource;
        }

        public static void PlaySfx(AudioClip clip, float volumeScale = 1f)
        {
            if (clip == null) return;
            EnsureSfxSource().PlayOneShot(clip, MasterVolume * SfxVolume * volumeScale);
            if (GoSettingsState.VibrationOn) Handheld.Vibrate();
        }

        private static AudioSource _bgmSource;

        private static AudioSource EnsureBgmSource()
        {
            if (_bgmSource != null) return _bgmSource;
            var go = new GameObject("GoAudio_BgmSource");
            _bgmSource = go.AddComponent<AudioSource>();
            _bgmSource.playOnAwake = false;
            _bgmSource.loop = true;
            return _bgmSource;
        }

        /// <summary>2026-09-15 — 위 클래스 주석이 보류했던 건 "승리/패배처럼
        /// 어느 쪽인지 들어야 아는 곡"이었지, 상시 배경 루프 한 곡은 그
        /// 제약에 안 걸린다(docs/ASSET_GUIDE.md 해당 날짜 항목 참고). 단일
        /// 트랙을 계속 반복 재생한다 — 승패 갈림 음악은 여전히 손 안 댄다.</summary>
        public static void PlayBgm(AudioClip clip)
        {
            if (clip == null) return;
            var src = EnsureBgmSource();
            if (src.clip == clip && src.isPlaying) return;
            src.clip = clip;
            src.volume = MasterVolume * BgmVolume;
            src.Play();
        }

        /// <summary>설정에서 BGM On/Off를 누를 때마다 불러 이미 도는 트랙의
        /// 음량에도 바로 반영한다(PlaySfx는 호출마다 새로 곱하니 필요 없지만,
        /// BGM은 한 번 틀어 놓고 계속 도는 루프라 따로 갱신해야 한다).</summary>
        public static void RefreshBgmVolume()
        {
            if (_bgmSource != null) _bgmSource.volume = MasterVolume * BgmVolume;
        }
    }
}
