using System.Collections.Generic;
using UnityEngine;
using Saga.Realm.Data;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 109-5 "REALM 세 시대" 진단 — `PlaytestRealmSlice` 가 전 적국을 함락한 뒤(관문·시간 틈 성이 다 우리 것) 문답 앞에 부른다.
    /// 표(현대 5·미래 4·id 겹침 없음·자질 1~100·묻힌 성 아홉 모두 다르고 함락 가능한 성·관문 셋) · 명부(시대·딱지·묻힌 자리·옛 셋 그대로) ·
    /// 수색(사연 한 토막)·등용(그 성 배치·등용률 × 0.85·구간) · 퓨전 사연(뜰 수 있는 셋·본문에 관문 성·여는 카드 → 예약 →
    /// 이계 무장 합류·두 번째는 대신 보상·성 값·다시 안 뜸·월간 추첨에 섞임). 끝에 카드 상태를 비운다(합류한 무장은 뒤 세이브 왕복이 본다).
    /// </summary>
    public static class PlaytestRealmEras
    {
        private static bool _ok;

        public static bool Run()
        {
            _ok = true;
            CheckTable();
            CheckPool();
            string hire = CheckSearchHire();
            string fusion = CheckFusion();
            RealmEventState.ClearForTest();
            if (_ok) Debug.Log($"[PlaytestRealmSlice] eras OK - 시간 틈 아홉(현대 5·미래 4)·묻힌 성·딱지·사연·등용 ×{RealmEras.StrangerHireMul}·퓨전 사연 셋 사슬·이계 무장 합류 |{hire} ·{fusion}");
            return _ok;
        }

        private static void CheckTable()
        {
            int modern = 0, future = 0;
            var ids = new HashSet<string>();
            var cities = new HashSet<string>();
            foreach (var t in RealmEras.TimeOfficers)
            {
                if (t.Era == RealmEra.Modern) modern++;
                else if (t.Era == RealmEra.Future) future++;
                else Fail($"{t.Id} 시대 {t.Era}");
                if (!ids.Add(t.Id)) Fail($"id 겹침 {t.Id}");
                if (!cities.Add(t.CityId)) Fail($"묻힌 성 겹침 {t.CityId}");
                if (RealmCityData.Get(t.CityId) == null || RealmEnemyCity.Get(t.CityId) == null) Fail($"{t.Id} 성 {t.CityId} 가 함락해 들일 수 있는 적국이 아님");
                foreach (int v in new[] { t.Might, t.Wisdom, t.Command })
                    if (v < 1 || v > 100) Fail($"{t.Id} 자질 {v}");
                if (t.Rarity < 1 || t.Rarity > 5) Fail($"{t.Id} 희귀도 {t.Rarity}");
                if (string.IsNullOrEmpty(t.NameKo) || string.IsNullOrEmpty(t.TitleKo) || string.IsNullOrEmpty(t.QuoteKo)) Fail($"{t.Id} 이름·직함·말 빔");
            }
            if (modern != 5 || future != 4) Fail($"현대 {modern}·미래 {future} ≠ 5·4");
            if (cities.Count < 6) Fail($"묻힌 성 {cities.Count} < 6");

            var gateCities = new HashSet<string>();
            foreach (var g in RealmEras.Gateways)
            {
                if (!gateCities.Add(g.CityId)) Fail($"관문 성 겹침 {g.CityId}");
                if (RealmEnemyCity.Get(g.CityId) == null) Fail($"관문 {g.Key} 성 {g.CityId} 없음");
                if (!ids.Add(g.OfficerId)) Fail($"이계 무장 id 겹침 {g.OfficerId}");
            }
            if (RealmEras.Gateways.Length != 3) Fail($"관문 {RealmEras.Gateways.Length} ≠ 3");
        }

        private static void CheckPool()
        {
            foreach (var t in RealmEras.TimeOfficers)
            {
                var o = RealmOfficerPool.Get(t.Id);
                if (o == null) { Fail($"{t.Id} 가 명부에 없다"); continue; }
                if (o.Era != t.Era) Fail($"{t.Id} 명부 시대 {o.Era}");
                if (!o.Name.Contains("(" + RealmEras.EraName(t.Era) + ")")) Fail($"{t.Id} 이름 딱지 없음: {o.Name}");
                if (System.Array.IndexOf(RealmOfficerPool.HiddenAt(t.CityId), t.Id) < 0) Fail($"{t.Id} 가 {t.CityId} 에 안 묻힘");
                if (RealmEras.FoundStory(t.Id).IndexOf(t.QuoteKo, System.StringComparison.Ordinal) < 0 && RealmLocalization.CurrentLanguage == "ko") Fail($"{t.Id} 사연에 말 없음");
            }
            foreach (var g in RealmEras.Gateways)
            {
                var o = RealmOfficerPool.Get(g.OfficerId);
                if (o == null || o.Era != RealmEra.Otherworld) { Fail($"이계 무장 {g.OfficerId} 명부 이상"); continue; }
                if (!o.Name.Contains("(" + RealmEras.RegionName(g) + ")")) Fail($"{g.OfficerId} 이름 딱지 없음: {o.Name}");
                foreach (var city in System.Linq.Enumerable.Concat(RealmCityData.AllCityIds, RealmEnemyCity.AllIds))
                    if (System.Array.IndexOf(RealmOfficerPool.HiddenAt(city), g.OfficerId) >= 0) Fail($"이계 무장 {g.OfficerId} 가 재야로 묻힘({city})");
            }
            // 옛 셋은 그대로.
            if (RealmOfficerPool.HiddenAt("xuchang").Length != 0) Fail("허창에 재야가 생겼다");
            if (RealmOfficerPool.HiddenAt("chenliu").Length != 1 || RealmOfficerPool.HiddenAt("puyang").Length != 1) Fail("진류·복양 재야가 바뀌었다");
            var past = RealmOfficerPool.Get("jp_musashi");
            if (past == null || past.Era != RealmEra.Past || past.Name.Contains("(")) Fail("옛 무장에 딱지가 붙었다");
            if (RealmEras.FoundStory("jp_musashi").Length != 0) Fail("옛 무장에 시간 틈 사연");

            // 등용률 — 낯선 사람만 × 0.85, 구간 0.05~0.9.
            var stranger = RealmOfficerPool.Get("tm_gangseo");
            if (Mathf.Abs(RealmEras.AdjustHireChance(stranger, 0.5f) - 0.425f) > 0.0001f) Fail("낯선 시대 등용률 × 0.85 아님");
            if (Mathf.Abs(RealmEras.AdjustHireChance(stranger, 0.055f) - 0.05f) > 0.0001f) Fail("등용률 아래 구간 0.05 아님");
            if (Mathf.Abs(RealmEras.AdjustHireChance(past, 0.5f) - 0.5f) > 0.0001f) Fail("옛 무장 등용률이 바뀜");
        }

        private static string CheckSearchHire()
        {
            var t = RealmEras.TimeOfficers[0];
            if (!RealmCityState.OwnsCity(t.CityId)) { Fail($"{t.CityId} 를 아직 안 들였다(진단 순서?)"); return ""; }
            RealmCityState.AddGold(20000);
            RealmCityState.SetCurrentCity(t.CityId);
            string foundMsg = null;
            for (int m = 0; m < 6 && foundMsg == null; m++)
            {
                RealmCityState.NextMonth();
                var r = RealmCityState.ExecuteOrder("search");
                if (System.Linq.Enumerable.Contains(RealmCityState.FoundIds, t.Id)) foundMsg = r.Message;
            }
            if (foundMsg == null) { Fail($"{t.CityId} 수색으로 {t.Id} 를 못 찾음"); return ""; }
            if (!foundMsg.Contains("⏳") || !foundMsg.Contains(RealmLocalization.T("officer." + t.Id + ".quote", t.QuoteKo))) Fail($"찾은 글에 사연 없음: {foundMsg.Replace("\n", " | ")}");

            int months = 0;
            while (!ContainsRoster(t.Id) && months < 80)
            {
                RealmCityState.NextMonth();
                RealmCityState.ExecuteOrder("hire");
                months++;
            }
            if (!ContainsRoster(t.Id)) { Fail($"{t.Id} 등용 80달 실패"); return ""; }
            if (RealmCityState.OfficerCityId(t.Id) != t.CityId) Fail($"{t.Id} 배치 {RealmCityState.OfficerCityId(t.Id)} ≠ {t.CityId}");
            return $" {RealmOfficerPool.Get(t.Id).Name} 찾음·{months}달 만에 등용";
        }

        private static string CheckFusion()
        {
            RealmEventState.ClearForTest();
            foreach (var g in RealmEras.Gateways)
                if (!RealmCityState.OwnsCity(g.CityId)) { Fail($"관문 {g.CityId} 를 아직 안 들였다"); return ""; }
            var open = RealmEventState.OpenFusionKinds();
            var want = new[] { RealmEventState.Kind.RiftEcho, RealmEventState.Kind.PlagueMist, RealmEventState.Kind.TombBell };
            if (open.Count != 3) Fail($"뜰 수 있는 퓨전 사연 {open.Count} ≠ 3");
            foreach (var k in want) if (!open.Contains(k)) Fail($"{k} 가 안 뜬다");

            string wisest = RealmCityState.RosterIds[0];
            var kinds = new[] { RealmEventState.Kind.RiftEcho, RealmEventState.Kind.RiftGate, RealmEventState.Kind.PlagueMist,
                RealmEventState.Kind.PlagueCure, RealmEventState.Kind.TombBell, RealmEventState.Kind.TombOath };
            for (int i = 0; i < kinds.Length; i++)
            {
                if (!RealmEventState.IsFusion(kinds[i])) Fail($"{kinds[i]} 가 퓨전 카드가 아님");
                var (title, body, a, b, c) = RealmEventState.Describe(new RealmEventState.Card(kinds[i], wisest));
                string cityName = RealmCityData.Get(RealmEras.Gateways[i / 2].CityId).Name;
                if (!body.Contains(cityName)) Fail($"{kinds[i]} 본문에 관문 성 {cityName} 없음: {body}");
                if (string.IsNullOrEmpty(title) || string.IsNullOrEmpty(a) || string.IsNullOrEmpty(b) || string.IsNullOrEmpty(c)) Fail($"{kinds[i]} 글 빔");
            }

            int joined = 0;
            // 균열 — 정찰(60%)이 먹힐 때까지 → 균열의 문 예약 → 장수 합류 → 두 번째는 금.
            RealmCityState.AddGold(20000);
            for (int i = 0; i < 60 && !RealmEventState.HasPendingChain(RealmEventState.Kind.RiftGate); i++)
                RealmEventState.Resolve(new RealmEventState.Card(RealmEventState.Kind.RiftEcho, wisest), RealmEventState.Choice.A);
            if (!RealmEventState.HasPendingChain(RealmEventState.Kind.RiftGate)) Fail("균열의 울림 → 균열의 문 예약 안 됨");
            if (RealmEventState.OpenFusionKinds().Contains(RealmEventState.Kind.RiftEcho)) Fail("답한 균열의 울림이 또 뜬다");
            joined += CheckJoin(RealmEventState.Kind.RiftGate, RealmEras.GatewayOf("rift"), wisest);

            // 폐허 — 성문을 닫는다(상업 -8) → 역병의 근원 → 토벌대(병 -800) + 합류.
            var ruin = RealmEras.GatewayOf("ruin");
            int comm0 = RealmCityState.CityRecord(ruin.CityId).Comm;
            RealmEventState.Resolve(new RealmEventState.Card(RealmEventState.Kind.PlagueMist, wisest), RealmEventState.Choice.B);
            int comm1 = RealmCityState.CityRecord(ruin.CityId).Comm;
            if (comm1 != Mathf.Max(0, comm0 - 8)) Fail($"폐허의 역병 B 상업 {comm0}→{comm1}");
            if (!RealmEventState.HasPendingChain(RealmEventState.Kind.PlagueCure)) Fail("폐허의 역병 → 역병의 근원 예약 안 됨");
            int troops0 = RealmCityState.CityRecord(ruin.CityId).Troops;
            joined += CheckJoin(RealmEventState.Kind.PlagueCure, ruin, wisest);
            int troops1 = RealmCityState.CityRecord(ruin.CityId).Troops;
            // CheckJoin 이 A 를 두 번 누른다 — 병 -800 두 번(0 밑으로는 안 간다).
            if (troops1 != Mathf.Max(0, Mathf.Max(0, troops0 - 800) - 800)) Fail($"역병의 근원 A 병력 {troops0}→{troops1}");

            // 묘역 — 진혼제(치안 +8) → 망자의 맹세 → 합류.
            var tomb = RealmEras.GatewayOf("tomb");
            RealmCityState.AdjustCity(tomb.CityId, sec: -50);
            int sec0 = RealmCityState.CityRecord(tomb.CityId).Sec;
            RealmEventState.Resolve(new RealmEventState.Card(RealmEventState.Kind.TombBell, wisest), RealmEventState.Choice.A);
            int sec1 = RealmCityState.CityRecord(tomb.CityId).Sec;
            if (sec1 != Mathf.Min(100, sec0 + 8)) Fail($"묘역의 종소리 A 치안 {sec0}→{sec1}");
            if (!RealmEventState.HasPendingChain(RealmEventState.Kind.TombOath)) Fail("묘역의 종소리 → 망자의 맹세 예약 안 됨");
            joined += CheckJoin(RealmEventState.Kind.TombOath, tomb, wisest);

            // 다른 선택 하나씩 — 문을 봉한다(치안 +10)·무덤의 보물(+900냥).
            var rift = RealmEras.GatewayOf("rift");
            RealmCityState.AdjustCity(rift.CityId, sec: -50);
            int rs0 = RealmCityState.CityRecord(rift.CityId).Sec;
            RealmEventState.Resolve(new RealmEventState.Card(RealmEventState.Kind.RiftGate, wisest), RealmEventState.Choice.B);
            if (RealmCityState.CityRecord(rift.CityId).Sec != Mathf.Min(100, rs0 + 10)) Fail("균열의 문 B 치안 +10 아님");
            int g0 = RealmCityState.Gold;
            RealmEventState.Resolve(new RealmEventState.Card(RealmEventState.Kind.TombOath, wisest), RealmEventState.Choice.C);
            if (RealmCityState.Gold != g0 + 900) Fail($"망자의 맹세 C 금 {g0}→{RealmCityState.Gold}");

            if (RealmEventState.OpenFusionKinds().Count != 0) Fail("셋 다 답했는데 퓨전 사연이 또 뜬다");

            // 월간 추첨에 섞이는지 — 새 판(답한 기록 비움)에서 여러 달 굴려 퓨전 카드가 한 번은 나오는지.
            int fusionSeen = 0, cards = 0;
            for (int i = 0; i < 600 && fusionSeen == 0; i++)
            {
                RealmEventState.ClearForTest();
                RealmEventState.RollForMonth();
                if (RealmEventState.Current == null) continue;
                cards++;
                if (RealmEventState.IsFusion(RealmEventState.Current.Value.Kind)) fusionSeen++;
            }
            if (fusionSeen == 0) Fail($"월간 추첨 카드 {cards} 장에 퓨전 사연이 없다");
            return $" 이계 합류 {joined}/3·월간 추첨 {cards}장 중 퓨전 첫 등장";
        }

        /// <summary>이어지는 카드 A — 이계 무장이 관문 성에 합류하고, 한 번 더 A 면 합류 대신 보상(로스터 그대로).</summary>
        private static int CheckJoin(RealmEventState.Kind kind, RealmEras.Gateway g, string wisest)
        {
            bool before = ContainsRoster(g.OfficerId);
            var r = RealmEventState.Resolve(new RealmEventState.Card(kind, wisest), RealmEventState.Choice.A);
            if (!ContainsRoster(g.OfficerId)) { Fail($"{kind} A 로 {g.OfficerId} 합류 안 됨: {r.Message}"); return 0; }
            if (RealmCityState.OfficerCityId(g.OfficerId) != g.CityId) Fail($"{g.OfficerId} 배치 {RealmCityState.OfficerCityId(g.OfficerId)} ≠ {g.CityId}");
            if (!before && !r.Message.Contains(RealmOfficerPool.Get(g.OfficerId).Name)) Fail($"{kind} 합류 글에 이름 없음: {r.Message}");
            int count = RealmCityState.RosterIds.Count;
            var again = RealmEventState.Resolve(new RealmEventState.Card(kind, wisest), RealmEventState.Choice.A);
            if (RealmCityState.RosterIds.Count != count) Fail($"{kind} 두 번째 A 가 또 합류시켰다");
            if (again.Message.Contains(RealmOfficerPool.Get(g.OfficerId).Name)) Fail($"{kind} 두 번째 A 가 합류 글: {again.Message}");
            return before ? 0 : 1;
        }

        private static bool ContainsRoster(string id)
        {
            foreach (var r in RealmCityState.RosterIds) if (r == id) return true;
            return false;
        }

        private static void Fail(string msg)
        {
            _ok = false;
            Debug.LogError($"[PlaytestRealmSlice] eras FAIL - {msg}");
        }
    }
}
