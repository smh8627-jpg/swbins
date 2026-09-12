namespace Saga.Story.Data
{
    /// <summary>
    /// VERTICAL_SLICE_STORY.md 1절 — 웹판 `saga-story/js/data-side.js`
    /// STAGES.field(허창 들판)를 그대로 옮긴다(발판·줄 좌표·잡졸 자리
    /// 값 하나 안 바꿈, saga-godot `field_map.gd`가 이미 미터로 옮겨 둔
    /// 값과 완전히 같다 — 다시 역산하지 않고 그 결과를 그대로 재사용).
    /// 웹은 화면 픽셀 좌표(y가 아래로 증가, floor=560이 바닥)라 미터로
    /// **스케일만** 바꿔 옮긴다.
    ///
    /// SCALE=0.02(50px≈1m) — saga-godot이 점프 높이(≈3m)를 웹의 점프
    /// 높이(JUMP²/(2·GRAV)≈152px)와 맞춰 역산해 둔 값(152px×0.02≈3.0m).
    /// 정확한 도출식이 아니라 "같은 만큼 뛰어 보인다"는 느낌만 지키는
    /// 근사치다 — 원문 그대로 이식하지 않는다.
    ///
    /// **재해석(1절 "제외" 목록)** — 사다리·문·채집·보스는 이번 슬라이스에
    /// 안 옮긴다. 줄(rope)은 다섯 중 첫째 하나만. 잡졸 스폰은 원작의
    /// "spawn:7"(전투 중 무작위 보충)이 아니라 **고정된 자리**로
    /// 단순화했다 — day/파도 시스템 자체가 범위 밖(자리 수는 2026-09-12
    /// "STORY 콘텐츠 확장"에서 KillGoal과 맞춰 셋→열로 늘림, 아래 참고).
    /// </summary>
    public static class FieldMapData
    {
        public const float ScaleMPerPx = 0.02f;
        private const float WidthPx = 2200f;
        private const float FloorPx = 560f;

        // [x, y, w] px — 웹판 FIELDS.field.plats 그대로.
        private static readonly float[,] PlatsPx =
        {
            { 320f, 430f, 260f },
            { 760f, 350f, 220f },
            { 1180f, 440f, 300f },
            { 1620f, 340f, 240f },
            { 1900f, 450f, 220f },
        };

        // 웹판 ropes[0] = [340, 430, 560, 'rope'] — kind가 'rope'인 것 중 첫째.
        private const float RopeTopPx = 430f;
        private const float RopeBottomPx = 560f;
        private const float RopeXPx = 340f;

        /// <summary>잡졸 스폰 자리(고정 열, "STORY 콘텐츠 확장" 슬라이스
        /// 2026-09-12 — 원래 셋뿐이라 사명("첫 사냥" kill 10)이 3/10에서
        /// 멈췄던 것을 KillGoal(10)과 정확히 맞춰 열 자리로 늘렸다. 원작
        /// data-side.js는 전투 중 무작위로 더 스폰하지만(day/파도 시스템,
        /// 범위 밖) 이 슬라이스는 여전히 "고정 자리" 단순화를 유지한다 —
        /// 그냥 자리 수만 늘렸다. 들판 폭(44m) 위에 고르게 흩뿌림, 로프
        /// (6.8m)·발판 다섯 자리와 안 겹치게 지상 배치만.</summary>
        private static readonly float[] EnemyXPx =
        {
            150f, 400f, 650f, 900f, 1150f, 1400f, 1650f, 1850f, 2000f, 2120f,
        };

        public static float WidthM => WidthPx * ScaleMPerPx;

        /// <summary>바닥(floor_px) 기준 높이(m) — 값이 클수록 위(웹은 y가
        /// 작을수록 위라 뒤집는다).</summary>
        public static float HeightOfPx(float yPx) => (FloorPx - yPx) * ScaleMPerPx;

        public struct Platform
        {
            public float X;
            public float Height;
            public float HalfWidth;
        }

        public static Platform[] Platforms()
        {
            int n = PlatsPx.GetLength(0);
            var result = new Platform[n];
            for (int i = 0; i < n; i++)
            {
                result[i] = new Platform
                {
                    X = PlatsPx[i, 0] * ScaleMPerPx,
                    Height = HeightOfPx(PlatsPx[i, 1]),
                    HalfWidth = PlatsPx[i, 2] * ScaleMPerPx * 0.5f,
                };
            }
            return result;
        }

        public struct RopeDef
        {
            public float X;
            public float Top;
            public float Bottom;
        }

        public static RopeDef Rope() => new RopeDef
        {
            X = RopeXPx * ScaleMPerPx,
            Top = HeightOfPx(RopeTopPx),
            Bottom = HeightOfPx(RopeBottomPx), // = 0(바닥)
        };

        public static float[] EnemyPositionsM()
        {
            var result = new float[EnemyXPx.Length];
            for (int i = 0; i < result.Length; i++) result[i] = EnemyXPx[i] * ScaleMPerPx;
            return result;
        }
    }
}
