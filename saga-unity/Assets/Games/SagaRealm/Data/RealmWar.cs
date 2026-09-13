using UnityEngine;

namespace Saga.Realm.Data
{
    /// <summary>
    /// VERTICAL_SLICE_REALM.md 3절 "전쟁 — 첫 전투 슬라이스"(saga-godot
    /// REALM 참고, 개념만) — js/war.js의 armyPower()/stepRound()/fight()
    /// 판정식 그대로(계수 0.055·ROUT 0.35·성벽 배율 0.9·공성 배율 0.045
    /// 전부 원작 값, 새로 안 지어냈다). 진형·일기토·수전·화공·진영(camp)은
    /// 이 슬라이스 범위 밖(문서 "뺀 것" 그대로) — 그 갈래들이 곱하던
    /// 배율은 전부 1로 고정한 것과 같다.
    /// </summary>
    public static class RealmWar
    {
        public const int Rounds = 10; // war.js ROUNDS
        public const float Rout = 0.35f; // war.js ROUT

        public readonly struct FightResult
        {
            public readonly bool Won;
            public readonly bool Routed;
            public readonly int LossA;
            public readonly int LossD;
            public readonly int WallFrom;
            public readonly int WallTo;
            public readonly bool Sortie;

            public FightResult(bool won, bool routed, int lossA, int lossD, int wallFrom, int wallTo, bool sortie)
            {
                Won = won; Routed = routed; LossA = lossA; LossD = lossD;
                WallFrom = wallFrom; WallTo = wallTo; Sortie = sortie;
            }
        }

        /// <summary>부대 전투력 = 병력×훈련×기술×장수 보정. 장수 보정은
        /// 가장 나은 한 사람이 끌고 나머지는 조금씩 보탠다(war.js
        /// armyPower() 그대로 — 진형·수전 보정은 이 슬라이스에 없어
        /// 항상 1).</summary>
        public static float ArmyPower(RealmArmy army)
        {
            float trainF = 0.5f + Mathf.Clamp(army.Train, 0, 100) / 200f;
            float techF = 0.7f + Mathf.Clamp(army.Tech, 0, 900) / 900f * 0.6f;

            int bestCmd = 0, bestMight = 0;
            float extra = 0f;
            foreach (var id in army.OfficerIds)
            {
                var o = RealmOfficerPool.Get(id);
                if (o == null) continue;
                if (o.Command > bestCmd) bestCmd = o.Command;
                if (o.Might > bestMight) bestMight = o.Might;
                extra += (o.Command + o.Might) / 2f;
            }
            float lead = 1f + bestCmd / 100f * 0.5f + bestMight / 100f * 0.25f +
                         Mathf.Max(0, army.OfficerIds.Count - 1) * 0.03f;
            if (extra == 0f) lead = 0.6f; // 장수 없는 군대는 오합지졸이다.

            return army.Troops * trainF * techF * lead * army.Morale;
        }

        /// <summary>합(合) 하나 — war.js stepRound() 그대로.</summary>
        private static string StepRound(RealmArmy atk, RealmArmy def, RealmEnemyRecord wallRef, RealmLand land, bool sortie)
        {
            float wallF = sortie
                ? RealmCityData.DefMul(land)
                : RealmCityData.DefMul(land) * (1f + (float)wallRef.Wall / Mathf.Max(1, wallRef.MaxWall) * 0.9f);

            float ap = ArmyPower(atk);
            float dp = ArmyPower(def) * wallF;

            int lossA = Mathf.RoundToInt(dp * 0.055f * (0.85f + UnityEngine.Random.value * 0.3f));
            int lossD = Mathf.RoundToInt(ap * 0.055f * (0.85f + UnityEngine.Random.value * 0.3f));
            atk.Troops = Mathf.Max(0, atk.Troops - lossA);
            def.Troops = Mathf.Max(0, def.Troops - lossD);

            if (!sortie)
            {
                wallRef.Wall = Mathf.Max(0, Mathf.RoundToInt(wallRef.Wall - atk.Troops * 0.045f * RealmCityData.SiegeMul(land)));
            }

            if (def.Troops <= 0) return "won";
            if (atk.Troops <= atk.Start * Rout) return "routed";
            if (!sortie && wallRef.Wall <= 0 && def.Troops < atk.Troops * 0.5f) return "won";
            if (!sortie && def.Troops <= atk.Troops * 0.08f) return "won";
            if (sortie && def.Troops < atk.Troops * 0.25f) return "won";
            return null;
        }

        /// <summary>한 달치 싸움 — war.js fight() 그대로(최대 10합).
        /// 승부가 안 갈리면(날이 저묾) 이 슬라이스엔 진영(camp) 시스템이
        /// 없어 routed와 같이 취급한다(문서 "뺀 것" 재해석).</summary>
        public static FightResult Fight(RealmArmy atk, RealmArmy def, RealmEnemyRecord wallRef, RealmLand land)
        {
            bool sortie = def.Troops > atk.Troops * 0.85f;
            int wallFrom = wallRef.Wall;
            bool won = false, routed = false;

            for (int r = 0; r < Rounds; r++)
            {
                string outcome = StepRound(atk, def, wallRef, land, sortie);
                if (outcome == "won") { won = true; break; }
                if (outcome == "routed") { routed = true; break; }
            }
            if (!won && !routed) routed = true; // 날이 저묾 — 진영 없이 물러난 것과 같이.

            return new FightResult(won, routed, atk.Start - atk.Troops, def.Start - def.Troops,
                wallFrom, wallRef.Wall, sortie);
        }
    }
}
