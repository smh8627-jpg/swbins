using UnityEngine;

namespace Saga.Dungeon.World
{
    /// <summary>
    /// 44장 "Environment" 교체 — 방/복도 바닥·벽에 실제 PBR 재질(Poly Haven,
    /// `BuildEnvironmentPbrSample.cs`가 미리 구워 둔 URP Lit 머티리얼)을
    /// 씌운다. 원본 머티리얼은 텍스처 실측 타일 크기(대략 2m 기준으로 가정)로
    /// 설계돼 있어, 표면 크기에 맞는 반복 횟수로 다시 구운 인스턴스를 새로
    /// 만든다(`DungeonRoomBuilder.MakeMaterial(color)`와 같은 결 — 공유 안
    /// 함, 인스턴스별. 방·복도 크기가 몇 종류뿐이라 인스턴스 수가 많지 않다).
    /// </summary>
    public static class EnvironmentMaterial
    {
        private const float TileMeters = 2f;

        public static Material MakeTiled(Material template, float widthMeters, float depthMeters)
        {
            var mat = new Material(template) { name = template.name + " (tiled)" };
            mat.mainTextureScale = new Vector2(
                Mathf.Max(0.1f, widthMeters / TileMeters),
                Mathf.Max(0.1f, depthMeters / TileMeters));
            return mat;
        }
    }
}
