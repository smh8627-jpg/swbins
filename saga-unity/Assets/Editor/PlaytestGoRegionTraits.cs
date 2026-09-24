using System.Collections.Generic;
using UnityEngine;
using Saga.Go.Combat;
using Saga.Go.Data;
using Saga.Go.UI;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 108 "고정 특색 지역" 진단 — `PlaytestHeadless` 가 지역 지도 진단 뒤에 부른다(읽기만, 세이브·자리 안 바꾼다).
    /// 표(지역 일곱 · 한자 서로 다름 · 사연 · 위험 1~3 이 셋 다 쓰임) · 명단 정직성(무리 구성 ⊆ 그 지역 명단, 명단의 종류는 그 지역 어딘가에 선다,
    /// 수호장은 남쪽 공터) · 세운 적(위험도 = 선 지역, 같은 종류는 체력·공격·경험치 ÷ 배율이 같다, 수호장은 배율 안 받음) ·
    /// 글(경계 자막에 한자·위험 점, 새 지역이면 사연까지 · 지도 이름표에 위험 점 · 지도 위쪽 지금 지역 줄).
    /// </summary>
    public static class PlaytestGoRegionTraits
    {
        private static string _tag;
        private static bool _ok;

        public static bool Run(string tag)
        {
            _tag = tag;
            _ok = true;
            CheckTable();
            CheckRosters();
            string m = CheckSpawned();
            CheckTexts();
            if (_ok) Debug.Log($"[{_tag}] regionTraits OK - 표(한자·사연·위험 1~3)·명단 정직성·수호장 자리·세운 적 위험 배율·경계 자막·지도 이름표·지금 지역 줄 |{m}");
            return _ok;
        }

        private static void CheckTable()
        {
            var r = GoWorldMap.Regions;
            if (r.Length != 7) Fail($"지역 {r.Length} ≠ 7");
            var hanja = new HashSet<string>();
            var dangers = new HashSet<int>();
            foreach (var g in r)
            {
                if (string.IsNullOrEmpty(g.Hanja) || !hanja.Add(g.Hanja)) Fail($"{g.Id} 한자 \"{g.Hanja}\" 가 비었거나 겹침");
                if (string.IsNullOrEmpty(g.LoreKo) || string.IsNullOrEmpty(g.LoreKey)) Fail($"{g.Id} 사연 없음");
                if (g.Danger < 1 || g.Danger > GoWorldMap.MaxDanger) Fail($"{g.Id} 위험 {g.Danger}");
                if (g.Roster == null) Fail($"{g.Id} 명단 null");
                dangers.Add(g.Danger);
            }
            if (dangers.Count != GoWorldMap.MaxDanger) Fail($"위험 단계가 {dangers.Count}가지만 쓰임 — 지역마다 달라야");
            if (!Mathf.Approximately(GoWorldMap.DangerMul(1), 1f) || !(GoWorldMap.DangerMul(3) > GoWorldMap.DangerMul(2))) Fail("위험 배율 순서");
        }

        private static void CheckRosters()
        {
            var seen = new Dictionary<string, HashSet<FieldEnemy.Kind>>();
            foreach (var (id, members) in FieldSpawner.GroupMembers())
            {
                string region = FieldSpawner.GroupRegion(id);
                var roster = new List<FieldEnemy.Kind>(GoWorldMap.RegionOf(region).Roster);
                if (!seen.ContainsKey(region)) seen[region] = new HashSet<FieldEnemy.Kind>();
                foreach (var k in members)
                {
                    if (!roster.Contains(k)) Fail($"무리 {id}({region})의 {k} 가 그 지역 명단 밖");
                    seen[region].Add(k);
                }
            }
            string guardRegion = GoWorldMap.RegionAt(TestMapData.WorldPos(FieldSpawner.GuardianGx, FieldSpawner.GuardianGy));
            if (!seen.ContainsKey(guardRegion)) seen[guardRegion] = new HashSet<FieldEnemy.Kind>();
            seen[guardRegion].Add(FieldEnemy.Kind.Guardian);
            if (guardRegion != "south_glade") Fail($"수호장 자리가 {guardRegion}");
            foreach (var g in GoWorldMap.Regions)
            {
                foreach (var k in g.Roster)
                    if (!seen.TryGetValue(g.Id, out var s) || !s.Contains(k)) Fail($"{g.Id} 명단의 {k} 가 그 지역에 안 선다");
            }
        }

        private static string CheckSpawned()
        {
            var groupRegion = new Dictionary<string, string>();
            foreach (var (id, _) in FieldSpawner.GroupMembers()) groupRegion[id] = FieldSpawner.GroupRegion(id);
            var baseHp = new Dictionary<FieldEnemy.Kind, float>();
            var baseAtk = new Dictionary<FieldEnemy.Kind, float>();
            int n = 0, d3 = 0;
            foreach (var e in FieldEnemy.All)
            {
                if (e.IsGuardian)
                {
                    if (e.Danger != 1 || !Mathf.Approximately(e.MaxHp, FieldEnemy.GuardianHp)) Fail($"수호장이 위험 배율을 받음 {e.Danger}·{e.MaxHp}");
                    continue;
                }
                if (!groupRegion.TryGetValue(e.GroupId ?? "", out var region)) continue;
                n++;
                int want = GoWorldMap.DangerOf(region);
                if (e.Danger != want) { Fail($"{e.name}({e.GroupId}) 위험 {e.Danger} ≠ {region} {want}"); continue; }
                if (want == 3) d3++;
                float m = GoWorldMap.DangerMul(e.Danger);
                float hp = e.MaxHp / m, atk = e.Atk / m;
                if (baseHp.TryGetValue(e.EnemyKind, out var h0))
                {
                    if (Mathf.Abs(h0 - hp) > 0.5f || Mathf.Abs(baseAtk[e.EnemyKind] - atk) > 0.05f) Fail($"{e.EnemyKind} 배율을 뺀 체력·공격이 무리마다 다름 {h0}/{hp}");
                }
                else { baseHp[e.EnemyKind] = hp; baseAtk[e.EnemyKind] = atk; }
            }
            if (n == 0) Fail("들판 무리 적이 없음");
            if (d3 == 0) Fail("위험 3 지역에 선 적이 없음");
            // 해골: 동쪽 숲(위험 2)과 북쪽 산기슭(위험 3)에 다 선다 — 산기슭 쪽이 더 단단해야
            float east = -1f, north = -1f;
            foreach (var e in FieldEnemy.All)
            {
                if (e.EnemyKind != FieldEnemy.Kind.Skeleton) continue;
                if (e.GroupId == "east_grove_s") east = e.MaxHp;
                if (e.GroupId == "north_wood") north = e.MaxHp;
            }
            if (!(north > east && east > 0f)) Fail($"산기슭 해골 {north} 가 동쪽 숲 해골 {east} 보다 안 단단함");
            return $" 무리 적 {n}(위험3 {d3})·해골 체력 동쪽 {east:F0}/산기슭 {north:F0}";
        }

        private static void CheckTexts()
        {
            var r = GoWorldMap.RegionOf("north_foot");
            string fresh = WorldMapUi.EnterText("north_foot", true);
            string again = WorldMapUi.EnterText("north_foot", false);
            if (!fresh.Contains(r.Hanja) || !fresh.Contains(GoWorldMap.DangerDots(r.Danger)) || !fresh.Contains(GoWorldMap.RegionLore("north_foot")))
                Fail($"새 지역 자막 \"{fresh}\"");
            if (!again.Contains(r.Hanja) || !again.Contains(GoWorldMap.DangerDots(r.Danger)) || again.Contains(GoWorldMap.RegionLore("north_foot")))
                Fail($"다시 온 지역 자막 \"{again}\"");
            if (!again.Contains(FieldEnemy.KindName(FieldEnemy.Kind.Skeleton))) Fail($"자막에 몬스터 명단 없음 \"{again}\"");
            if (!WorldMapUi.EnterText("river", false).Contains(GoLocalization.T("region.no_foes", "적 없음"))) Fail("강 자막에 '적 없음' 없음");
            if (GoWorldMap.DangerDots(2) != "●●○") Fail($"위험 점 {GoWorldMap.DangerDots(2)}");

            var ui = WorldMapUi.Instance;
            if (ui == null) { Fail("WorldMapUi 없음"); return; }
            for (int i = 0; i < GoWorldMap.Regions.Length; i++)
            {
                string label = ui.RegionLabel(i);
                if (label != "? ? ?" && !label.Contains(GoWorldMap.DangerDots(GoWorldMap.Regions[i].Danger))) Fail($"지도 이름표에 위험 점 없음 \"{label}\"");
            }
            ui.Open();
            string now = ui.RegionInfoText;
            ui.Close();
            var fc = FieldCombat.Instance;
            string here = fc != null ? GoWorldMap.RegionAt(fc.transform.position) : "village";
            if (!now.Contains(GoWorldMap.RegionOf(here).Hanja) || !now.Contains(GoWorldMap.RegionLore(here))) Fail($"지도 지금 지역 줄 \"{now}\"");
        }

        private static void Fail(string msg)
        {
            _ok = false;
            Debug.LogError($"[{_tag}] regionTraits: {msg}");
        }
    }
}
