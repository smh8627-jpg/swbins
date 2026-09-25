namespace Saga.Realm.Data
{
    /// <summary>
    /// VERTICAL_SLICE_REALM.md 3절 — rtk.js 판정이 쓰는 자질 셋(무력·지력·
    /// 통솔)을 그대로 옮긴 무장 한 명. 이름은 루트 CLAUDE.md 이름 정책에
    /// 따라 js/data.js HEROES가 이미 정해 둔 가명을 그대로 쓴다(id는
    /// 원본과 같게 둬 나중에 다른 REALM 콘텐츠와 물려도 안 어긋난다).
    /// </summary>
    public class RealmOfficer
    {
        public readonly string Id;
        private readonly string _name;
        /// <summary>PLAN.md 109-5 — 시간 틈·이계 사람은 이름 뒤에 딱지(현대·미래·균열…)가 붙는다(`RealmEras.Tag`).</summary>
        public string Name
        {
            get
            {
                string n = RealmLocalization.T("officer." + Id, _name);
                string tag = RealmEras.Tag(Id, Era);
                return tag.Length == 0 ? n : $"{n}({tag})";
            }
        }
        public readonly RealmEra Era;
        public readonly int Might;
        public readonly int Wisdom;
        public readonly int Command;
        public readonly int Rarity;

        public RealmOfficer(string id, string name, int might, int wisdom, int command, int rarity, RealmEra era = RealmEra.Past)
        {
            Era = era;
            Id = id;
            _name = name;
            Might = might;
            Wisdom = wisdom;
            Command = command;
            Rarity = rarity;
        }
    }
}
