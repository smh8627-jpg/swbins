using TMPro;
using UnityEngine;

namespace Saga.Core
{
    /// <summary>
    /// PLAN.md 110 ⑤ — 월드 공간 글자(피해 숫자·이름표·줍기 글). 옛 `TextMesh` 는 내장 글꼴이라 폰에서 한글이 □ 로 나온다 →
    /// TextMeshPro(3D, 기본 글꼴 Noto Sans KR). 크기는 옛 값 그대로 옮긴다: TextMesh 글자 높이 ≈ fontSize × characterSize / 10 m,
    /// TMP 3D 는 fontSize / 10 m 라 <c>size = 옛 fontSize × 옛 characterSize</c>.
    /// 방향 규칙도 같다(글자 앞면 = -Z, 카메라 반대쪽을 보게 돌리는 기존 빌보드 코드가 그대로 맞는다).
    /// </summary>
    public static class SagaWorldText
    {
        public static TextMeshPro Add(GameObject go, string text, float size, Color color)
        {
            var t = go.AddComponent<TextMeshPro>();
            t.text = text;
            t.fontSize = size;
            t.color = color;
            t.alignment = TextAlignmentOptions.Center;
            t.textWrappingMode = TextWrappingModes.NoWrap;
            t.overflowMode = TextOverflowModes.Overflow;
            t.rectTransform.sizeDelta = new Vector2(size * 0.6f, size * 0.15f); // 가운데 맞춤 기준 칸(넘쳐도 그린다)
            return t;
        }
    }
}
