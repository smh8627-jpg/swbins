using UnityEngine;

namespace Saga.Realm.World
{
    /// <summary>
    /// 44장 "Environment/Building" 교체 — Saga.Dungeon.World.EnvironmentMaterial.cs와
    /// 같은 결(다섯 판이 공용 로직을 각자 복사해 쓰는 관례, 루트 CLAUDE.md).
    /// 성 디오라마 바닥/성벽에 실제 PBR 재질(Poly Haven)을 씌울 때, 표면
    /// 크기에 맞는 반복 횟수로 다시 구운 인스턴스를 만든다(공유 안 함 —
    /// RealmCityBuilder.Spawn(color)와 같은 결).
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
