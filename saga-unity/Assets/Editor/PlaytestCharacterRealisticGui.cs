using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace Saga.EditorTools
{
    /// <summary>
    /// 66-2장 ⑧이 만든 TestCharacterRealistic 씬을 실제 GUI 에디터로 열어
    /// Play 모드에서 idle/run/attack 세 장면을 스크린샷으로 찍는다 —
    /// 사용자가 "직접 확인해"로 명시적으로 요청했을 때만 쓴다(루트
    /// CLAUDE.md·이 폴더 CLAUDE.md의 "개발 중엔 GUI 스크린샷 습관적으로
    /// 안 찍는다" 원칙의 예외). 끝나면 스스로 EditorApplication.Exit로
    /// Unity를 완전히 종료한다 — 남겨 두지 않는다.
    /// </summary>
    public static class PlaytestCharacterRealisticGui
    {
        private const string ScenePath = "Assets/Scenes/TestCharacterRealistic.unity";
        public const string ShotDir =
            "C:/Users/user/AppData/Local/Temp/claude/C--swbins/9a55a781-4a58-4c0b-9d1b-4a2ec609d4c9/scratchpad/unity_screens/";

        private static bool _origEnterPlayModeOptionsEnabled;
        private static EnterPlayModeOptions _origEnterPlayModeOptions;
        private static int _frame;
        private static int _stage;
        private static Vector3 _origCamPos;
        private static Quaternion _origCamRot;
        private static Color _origAmbient;

        [MenuItem("Saga/Playtest TestCharacterRealistic (GUI Screenshot)")]
        public static void Run()
        {
            Directory.CreateDirectory(ShotDir);

            _origEnterPlayModeOptionsEnabled = EditorSettings.enterPlayModeOptionsEnabled;
            _origEnterPlayModeOptions = EditorSettings.enterPlayModeOptions;
            EditorSettings.enterPlayModeOptionsEnabled = true;
            EditorSettings.enterPlayModeOptions =
                EnterPlayModeOptions.DisableDomainReload | EnterPlayModeOptions.DisableSceneReload;

            EditorSceneManager.OpenScene(ScenePath);
            SetupBloomVolume();
            var cam = Camera.main;
            if (cam != null)
            {
                _origCamPos = cam.transform.position;
                _origCamRot = cam.transform.rotation;
            }
            _origAmbient = RenderSettings.ambientLight;
            _frame = 0;
            _stage = 0;
            EditorApplication.playModeStateChanged += OnStateChanged;
            EditorApplication.isPlaying = true;
        }

        // 이 씬은 리그 확인용이라 Volume이 원래 없다(BuildTestCharacterRealisticScene
        // 주석 참고) — SSS 글로우는 Emission이 Bloom을 거쳐야 눈에 띄는데 Bloom을
        // 태울 Volume 자체가 없어 105 Q-U3 확인이 안 됐다(2026-09-23 PROJECT_STATE
        // 기록). 씬엔 저장하지 않고 Play 중에만 임시로 추가한다(FF16Volume_PC.asset과
        // 같은 값 — threshold 0.9, scatter 0.6 — intensity만 확인용으로 살짝 올림).
        private static void SetupBloomVolume()
        {
            var volumeGo = new GameObject("TempBloomVolume");
            var volume = volumeGo.AddComponent<Volume>();
            volume.isGlobal = true;
            volume.priority = 100f;
            var profile = ScriptableObject.CreateInstance<VolumeProfile>();
            var bloom = profile.Add<Bloom>(true);
            bloom.threshold.Override(0.9f);
            bloom.intensity.Override(0.6f);
            bloom.scatter.Override(0.6f);
            bloom.tint.Override(new Color(1f, 0.95f, 0.85f));
            volume.sharedProfile = profile;

            var cam = Camera.main;
            if (cam != null)
            {
                var camData = cam.GetUniversalAdditionalCameraData();
                camData.renderPostProcessing = true;
            }
        }

        private static void OnStateChanged(PlayModeStateChange state)
        {
            if (state == PlayModeStateChange.EnteredPlayMode)
            {
                EditorApplication.update += Tick;
            }
            else if (state == PlayModeStateChange.EnteredEditMode)
            {
                EditorApplication.playModeStateChanged -= OnStateChanged;
                EditorSettings.enterPlayModeOptionsEnabled = _origEnterPlayModeOptionsEnabled;
                EditorSettings.enterPlayModeOptions = _origEnterPlayModeOptions;
                Debug.Log($"[PlaytestCharacterRealisticGui] done, screenshots in {ShotDir}");
                EditorApplication.Exit(0);
            }
        }

        private static void Tick()
        {
            _frame++;
            var mariaGo = GameObject.Find("Maria");
            var animator = mariaGo != null ? mariaGo.GetComponent<Animator>() : null;

            switch (_stage)
            {
                case 0: // idle 정착 대기 — 첫 프레임들은 셰이더 변형이 아직 컴파일 중이라
                        // 엉뚱한 색(예: SSS Shader Graph 미컴파일 시 네온 시안)으로 찍힐 수
                        // 있어(2026-09-13·2026-09-22 실제로 겪음) 넉넉히 기다린다. **주의**:
                        // `BuildMariaSssShaderGraph.Build()`로 그래프를 방금 재빌드한 직후엔
                        // 300으로도 부족해 네온 시안이 찍힌 적 있다(2026-09-23, 900으로
                        // 임시로 늘려 확인) — 그래프를 안 건드린 평소엔 300이면 충분.
                    if (_frame >= 300)
                    {
                        // 이 스테이지 안에서 캡처만 하고 카메라는 절대 안 건드린다 —
                        // `ScreenCapture.CaptureScreenshot()`는 호출 시점이 아니라 그 프레임이
                        // 실제로 렌더된 뒤(=같은 Update 안에서 나중에 실행되는 코드까지 반영된
                        // 상태) 찍힌다는 걸 실제로 겪었다(2026-09-23) — 같은 tick에서 캡처 직후
                        // 카메라를 옮기면 그 프레임 자체가 옮긴 위치로 찍힌다. 그래서 카메라를
                        // 옮기는 코드는 반드시 "캡처 다음 stage"로 분리한다.
                        ScreenCapture.CaptureScreenshot(ShotDir + "01_idle.png");
                        _stage = 1;
                        _frame = 0;
                    }
                    break;
                case 1: // 105 Q-U3 글로우 확인용 얼굴 클로즈업 카메라 셋업(캡처 없음, 2026-09-23
                        // 세 번째 교체) — 골반·허벅지는 실제론 grey 스판덱스 의상 서브메시였다
                        // (maria_diffuse.png 아틀라스엔 그 자리가 살구색 피부로 그려져 있어
                        // UV/서브메시가 옷임을 확인, 실제로 겪음). 세계축(+Z)을 얼굴 방향으로
                        // 가정한 1차 시도도 캐릭터가 프레임 밖으로 빗나갔다 — Humanoid Head
                        // 본의 실제 `forward`를 그대로 써서 그 앞에 카메라를 둔다. attack
                        // 애니메이션 도중(스윙 자세)에 잡으면 머리가 크게 숙여진 프레임을 잡을
                        // 때가 있어(재현 불안정) idle 정착 직후의 안정된 포즈에서 잡는다.
                    if (_frame >= 1)
                    {
                        var cam = Camera.main;
                        if (cam != null && animator != null)
                        {
                            var head = animator.GetBoneTransform(HumanBodyBones.Head);
                            if (head != null)
                            {
                                cam.transform.position = head.position + head.forward * 0.7f + Vector3.up * 0.05f;
                                cam.transform.LookAt(head.position + Vector3.up * 0.02f);

                                // 씬의 기본 Directional Light(Euler 40,30,0)는 원래 뒤통수 샷용이라
                                // 얼굴 쪽에서 보면 역광이 된다 — 이 카메라 배치가 FakeSSS(뒤에서 오는
                                // 빛을 얇은 부위 너머로 투과시켜 보여주는 기법)에 맞는 역광 구도다.
                                // 105 Q-U3 글로우 판정을 사용자 대신 직접 해봄(2026-09-23, 다섯 번째
                                // 교체) — ambient 두 단계(낮음→높음)로 비교 캡처해 실제로 코·턱선에
                                // 웜톤 하이라이트가 보임을 확인, `BuildMariaSssShaderGraph.cs`의
                                // Intensity를 0.6→15로 올려 최종 확정(경위는 그 파일 주석).
                                RenderSettings.ambientLight = new Color(0.42f, 0.4f, 0.38f);
                            }
                        }
                        _stage = 2;
                        _frame = 0;
                    }
                    break;
                case 2: // 저 ambient 캡처 후 고 ambient로 전환(비교용, 캡처 없음)
                    if (_frame >= 20)
                    {
                        ScreenCapture.CaptureScreenshot(ShotDir + "02a_face_closeup_lowamb.png");
                        RenderSettings.ambientLight = new Color(0.6f, 0.58f, 0.55f);
                        _stage = 7;
                        _frame = 0;
                    }
                    break;
                case 7: // 고 ambient 정착 대기 후 캡처(카메라 복원은 다음 stage)
                    if (_frame >= 20)
                    {
                        ScreenCapture.CaptureScreenshot(ShotDir + "02b_face_closeup_highamb.png");
                        _stage = 3;
                        _frame = 0;
                    }
                    break;
                case 3: // 카메라·Ambient 원복 + run 시작(캡처 없음)
                    if (_frame >= 1)
                    {
                        var cam = Camera.main;
                        if (cam != null)
                        {
                            cam.transform.position = _origCamPos;
                            cam.transform.rotation = _origCamRot;
                        }
                        RenderSettings.ambientLight = _origAmbient;
                        if (animator != null)
                        {
                            animator.SetFloat("Speed", 1f);
                        }
                        _stage = 4;
                        _frame = 0;
                    }
                    break;
                case 4: // run 정착 대기
                    if (_frame >= 60)
                    {
                        ScreenCapture.CaptureScreenshot(ShotDir + "03_run.png");
                        if (animator != null)
                        {
                            animator.SetFloat("Speed", 0f);
                            animator.SetTrigger("Attack");
                        }
                        _stage = 5;
                        _frame = 0;
                    }
                    break;
                case 5: // attack 클립 중간 지점
                    if (_frame >= 20)
                    {
                        ScreenCapture.CaptureScreenshot(ShotDir + "04_attack.png");
                        _stage = 6;
                        _frame = 0;
                    }
                    break;
                case 6: // 캡처 파일 쓰기 여유 후 종료
                    if (_frame >= 20)
                    {
                        EditorApplication.update -= Tick;
                        EditorApplication.isPlaying = false;
                    }
                    break;
            }
        }
    }
}
