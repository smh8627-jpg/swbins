using System.Collections.Generic;
using TMPro;
using UnityEngine;

namespace Saga.Core
{
    /// <summary>
    /// PLAN.md 110 ⑤ — TextMeshPro 글자의 테두리·그림자. 옛 `UI.Text` 에 붙이던 uGUI `Outline`/`Shadow` 는
    /// TMP 메시에 먹지 않아, 글꼴 재질을 복사해 SDF 테두리(OUTLINE_ON)·밑그림자(UNDERLAY_ON)를 켠다.
    /// 같은 (글꼴 재질, 종류, 색, 두께) 는 재질 하나를 나눠 써 드로우콜을 안 늘린다.
    /// 에디터 씬 빌더가 붙여도 되게 재질은 **플레이 때(Awake)** 만 입힌다 — 에디터에서 만든 임시 재질은 씬에 저장되지 않는다.
    /// </summary>
    [RequireComponent(typeof(TMP_Text))]
    public class TmpEffect : MonoBehaviour
    {
        public enum Kind { Outline, Shadow }

        [SerializeField] private Kind kind = Kind.Outline;
        [SerializeField] private Color color = new Color(0f, 0f, 0f, 0.85f);
        /// <summary>테두리 = SDF 두께(0~0.5), 그림자 = 오른쪽 아래로 밀기(0~1).</summary>
        [SerializeField] private float size = 0.2f;

        private static readonly Dictionary<(int, Kind, Color, float), Material> Shared = new Dictionary<(int, Kind, Color, float), Material>();

        public Kind EffectKind => kind;

        public static TmpEffect Add(GameObject go, Kind kind, Color color, float size)
        {
            var e = go.GetComponent<TmpEffect>();
            if (e == null) e = go.AddComponent<TmpEffect>();
            e.kind = kind;
            e.color = color;
            e.size = size;
            if (Application.isPlaying) e.Apply();
            return e;
        }

        private void Awake() => Apply();

        public void Apply()
        {
            var t = GetComponent<TMP_Text>();
            if (t == null || t.font == null) return;
            var baseMat = t.font.material;
            var key = (baseMat.GetInstanceID(), kind, color, size);
            if (!Shared.TryGetValue(key, out var mat) || mat == null)
            {
                mat = new Material(baseMat) { name = $"{baseMat.name} ({kind})" };
                if (kind == Kind.Outline)
                {
                    mat.EnableKeyword(ShaderUtilities.Keyword_Outline);
                    mat.SetFloat(ShaderUtilities.ID_OutlineWidth, size);
                    mat.SetColor(ShaderUtilities.ID_OutlineColor, color);
                }
                else
                {
                    mat.EnableKeyword(ShaderUtilities.Keyword_Underlay);
                    mat.SetColor(ShaderUtilities.ID_UnderlayColor, color);
                    mat.SetFloat(ShaderUtilities.ID_UnderlayOffsetX, size);
                    mat.SetFloat(ShaderUtilities.ID_UnderlayOffsetY, -size);
                    mat.SetFloat(ShaderUtilities.ID_UnderlaySoftness, 0.15f);
                }
                Shared[key] = mat;
            }
            t.fontSharedMaterial = mat;
        }
    }
}
