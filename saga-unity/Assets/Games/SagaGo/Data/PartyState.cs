using System;
using System.Collections.Generic;

namespace Saga.Go.Data
{
    /// <summary>
    /// VERTICAL_SLICE.md 완료 조건(12단계 루프)의 "도적이 부대에 합류한다" ·
    /// "부대 전투력이 올랐다는 걸 화면에서 확인한다"를 위한 최소 구현.
    /// saga-godot의 project.godot [autoload] 싱글턴(party_state.gd)과 같은
    /// 역할 — Unity엔 오토로드가 없어 static 클래스로 대신한다(씬을 새로
    /// 열어도 값이 남는다는 뜻이 아니라, 어느 스크립트에서든 이름으로 바로
    /// 쓸 수 있다는 뜻만 같다). Phase 7(Stats/Item/Inventory/Equipment)을
    /// 통째로 만드는 게 아니라, 등용한 인원 수만 세고 그 수에 비례해
    /// 공격력/방어력을 올린다.
    ///
    /// BaseAtk/BaseDef는 예전 BanditEncounter의 임시 상수와 같은 값이다 —
    /// 아직 아무도 등용하지 않았을 때 기존 전투 밸런스가 그대로 유지되도록
    /// 맞췄다.
    /// </summary>
    public static class PartyState
    {
        public const float BaseAtk = 60f;
        public const float BaseDef = 35f;
        public const float AtkPerMember = 18f;
        public const float DefPerMember = 10f;

        private static readonly List<string> Members = new List<string>();

        public static float Atk { get; private set; } = BaseAtk;
        public static float Def { get; private set; } = BaseDef;

        /// <summary>SaveState.cs가 저장할 때 읽는다 — 바깥에서 못 고친다.</summary>
        public static IReadOnlyList<string> MemberIds => Members;

        public static event Action<float, float> PowerChanged;

        public static void Recruit(string id)
        {
            Members.Add(id);
            Recompute();
            PowerChanged?.Invoke(Atk, Def);
        }

        /// <summary>세이브 파일을 불러온 뒤 여기로 넘긴다 — Recruit()와 다르게
        /// 이미 정해진 목록을 통째로 앉히고 수치만 다시 계산한다(한 명씩
        /// 등용하며 이벤트를 여러 번 쏘지 않는다).</summary>
        public static void Restore(IEnumerable<string> savedMembers)
        {
            Members.Clear();
            Members.AddRange(savedMembers);
            Recompute();
            PowerChanged?.Invoke(Atk, Def);
        }

        private static void Recompute()
        {
            Atk = BaseAtk + Members.Count * AtkPerMember;
            Def = BaseDef + Members.Count * DefPerMember;
        }
    }
}
