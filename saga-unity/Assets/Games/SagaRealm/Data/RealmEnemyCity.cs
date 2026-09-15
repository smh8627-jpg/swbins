using System.Collections.Generic;

namespace Saga.Realm.Data
{
    /// <summary>
    /// VERTICAL_SLICE_REALM.md 3절 — 공격 목표 카탈로그. 처음엔 소패
    /// 하나였다(허창과 맞닿은 평범한 소성, js/data-city.js 그대로: wall
    /// 3600·land plain). **51장 "대규모 콘텐츠" — 정도를 두 번째 목표로
    /// 추가**(2026-09-14) — 소패 함락 뒤에도 계속 확장할 거리가 있도록,
    /// 복양과 맞닿은 둘째 소성. 원작 시나리오 194에서도 복양 방면 다음
    /// 목표로 실제 있던 지명(조조·여포가 다퉜던 곳)이라 이름 정책(인물
    /// 실명 금지) 대상이 아니다 — 지명이지 인물이 아니다. **병력·수치는
    /// 소패와 같은 재해석 논리**(RealmEnemyRecord 클래스 주석 참고: 적
    /// AI가 없어 정적으로 채운다) — 정도는 소패보다 한 단계 큰 다음
    /// 목표로 자리하도록 성벽·병력을 살짝 올렸다.
    /// **51장 2차 확장(2026-09-15)** — 낙양(진류의 첫 목표, 시작 성
    /// 셋 중 그때까지 목표가 없던 유일한 곳)·하비(소패 함락 뒤 이어지는
    /// 둘째 목표)·업(정도 함락 뒤 이어지는 둘째 목표) 셋을 더했다.
    /// AttackFromCityId가 "xiaopei"·"dingtao"인 항목은 그 성을 먼저
    /// 함락해 RealmCityState.ActiveCityIds에 편입시키기 전엔
    /// RealmWarState.Attack()이 출진 병력·무장을 그 성에서 못 구해
    /// 자연히 막힌다 — 별도 "잠금" 플래그 없이 기존 게이트(출진 성
    /// 소유 여부)만으로 순서가 강제된다. wall/troops는 saga-web/
    /// saga-realm/js/data-city.js 원본 성벽값 + 소패·정도가 이미 쓰던
    /// 비율(병력≈성벽×0.23)로, train은 함락 난이도가 깊어질수록(진류·
    /// 소패·복양의 첫 목표=40·45·50, 그 다음 단계=55·60) 단계적으로
    /// 올렸다.
    /// </summary>
    public class RealmEnemyRecord
    {
        public int Wall;
        public int MaxWall;
        public int Troops;
        public int Train;
        public int Tech;
        public bool Captured;
    }

    public class RealmEnemyCityDef
    {
        public readonly string Id;
        private readonly string _name;
        public string Name => RealmLocalization.T("city." + Id, _name);
        public readonly RealmLand Land;
        public readonly int BaseWall;
        public readonly int BaseTroops;
        public readonly int BaseTrain;
        public readonly int BaseTech;
        /// <summary>이 성을 칠 수 있는 유일한 출진 성 — 이 슬라이스는
        /// 성 하나당 목표 하나로 좁힌다(여러 목표를 동시에 공략하는 건
        /// 범위 밖).</summary>
        public readonly string AttackFromCityId;

        public RealmEnemyCityDef(string id, string name, RealmLand land, int baseWall, int baseTroops, int baseTrain, int baseTech, string attackFromCityId)
        {
            Id = id;
            _name = name;
            Land = land;
            BaseWall = baseWall;
            BaseTroops = baseTroops;
            BaseTrain = baseTrain;
            BaseTech = baseTech;
            AttackFromCityId = attackFromCityId;
        }
    }

    public static class RealmEnemyCity
    {
        public const string XiaopeiId = "xiaopei";
        public const string DingtaoId = "dingtao";
        public const string LuoyangId = "luoyang";
        public const string XiapiId = "xiapi";
        public const string YeId = "ye";

        public static readonly string[] AllIds = { XiaopeiId, DingtaoId, LuoyangId, XiapiId, YeId };

        private static readonly Dictionary<string, RealmEnemyCityDef> Catalog = new Dictionary<string, RealmEnemyCityDef>
        {
            // 소패는 허창(xuchang)과만 맞닿아 있다 — 이 슬라이스의 첫 출진 성.
            [XiaopeiId] = new RealmEnemyCityDef(XiaopeiId, "소패", RealmLand.Plain, baseWall: 3600, baseTroops: 800, baseTrain: 40, baseTech: 100, attackFromCityId: "xuchang"),
            // 정도는 복양(puyang)과만 맞닿아 있다 — 둘째 출진 성. 소패보다
            // 한 단계 큰 다음 목표(성벽·병력 소패의 약 1.4배).
            [DingtaoId] = new RealmEnemyCityDef(DingtaoId, "정도", RealmLand.Plain, baseWall: 5000, baseTroops: 1150, baseTrain: 45, baseTech: 100, attackFromCityId: "puyang"),
            // 낙양은 진류(chenliu)와만 맞닿아 있다 — 시작 성 셋 중 그때까지
            // 유일하게 목표가 없던 진류의 첫 출진 성(원작 LINKS: chenliu-luoyang).
            [LuoyangId] = new RealmEnemyCityDef(LuoyangId, "낙양", RealmLand.Plain, baseWall: 6800, baseTroops: 1550, baseTrain: 50, baseTech: 100, attackFromCityId: "chenliu"),
            // 하비는 소패(xiaopei)와만 맞닿아 있다(원작 LINKS: xiaopei-xiapi) —
            // 소패를 함락해야 열리는 둘째 단계 목표.
            [XiapiId] = new RealmEnemyCityDef(XiapiId, "하비", RealmLand.River, baseWall: 5200, baseTroops: 1200, baseTrain: 55, baseTech: 100, attackFromCityId: "xiaopei"),
            // 업은 정도(dingtao)와만 맞닿아 있다(원작 LINKS: puyang-ye — 정도가
            // 원작에 없는 창작 지명이라 그 다음 칸으로 자연스럽게 이어 붙였다) —
            // 정도를 함락해야 열리는 둘째 단계 목표, 다섯 중 가장 어렵다.
            [YeId] = new RealmEnemyCityDef(YeId, "업", RealmLand.Plain, baseWall: 6500, baseTroops: 1500, baseTrain: 60, baseTech: 100, attackFromCityId: "dingtao"),
        };

        public static RealmEnemyCityDef Get(string id) => Catalog.TryGetValue(id, out var d) ? d : null;

        /// <summary>이 성에서 칠 수 있는 적 성 id — 없으면 null(진류처럼
        /// 아직 어느 목표와도 안 맞닿은 성).</summary>
        public static string TargetFrom(string ourCityId)
        {
            foreach (var def in Catalog.Values)
            {
                if (def.AttackFromCityId == ourCityId) return def.Id;
            }
            return null;
        }

        public static RealmEnemyRecord NewRecord(string id)
        {
            var d = Get(id);
            if (d == null) return null;
            return new RealmEnemyRecord
            {
                Wall = d.BaseWall, MaxWall = d.BaseWall,
                Troops = d.BaseTroops, Train = d.BaseTrain, Tech = d.BaseTech,
                Captured = false,
            };
        }
    }
}
