using TMPro;
using UnityEngine;
using UnityEngine.UI;
using Saga.Go.Combat;
using Saga.Go.Data;

namespace Saga.Go.UI
{
    /// <summary>
    /// PLAN.md 107-8 "지역 사명 사슬" — `WorldMapBuilder` 가 Play 때 붙인다.
    /// - 들판 무리를 한꺼번에 다 쓰러뜨리면(`FieldEnemy.Killed` → `FieldSpawner.GroupWiped`) 그 무리가 선 지역의 토벌 셈을 올린다.
    /// - 0.25초마다 단을 다시 세어 아직 안 받은 보상을 준다(역참·망루·수호장·보물 상자는 이벤트가 제각각이라 다시 세는 쪽이 단순하다).
    /// - 위쪽 가운데(목표판·자막 아래) 한 줄: "◆ 이름 사명 n/3 · 다음 할 일". 지금 선 지역에 사명이 없거나 다 끝났으면 숨는다.
    ///   보상을 받으면 그 줄이 4초 동안 금빛 보상 글로 바뀐다(자막 `DialogueLabel` 은 수호장 토벌 글 등과 겹쳐 덮이니 안 쓴다).
    /// </summary>
    public class RegionMissionHud : MonoBehaviour
    {
        public const float RefreshSec = 0.25f;
        public const float FlashSec = 4f;

        public static RegionMissionHud Instance { get; private set; }

        private TextMeshProUGUI _line;
        private float _refresh;
        private float _flashLeft;

        public string LineText => _line != null ? _line.text : "";
        public bool LineShown => _line != null && _line.gameObject.activeSelf;
        public bool Flashing => _flashLeft > 0f;

        private void Awake() => Instance = this;

        private void Start()
        {
            var canvas = EncounterUiKit.NewCanvas("RegionMissionUI");
            canvas.sortingOrder = 4;
            _line = EncounterUiKit.NewText(canvas.transform, "", new Vector2(0.5f, 1f), new Vector2(0f, -228f), new Vector2(680f, 46f), 24);
            _line.raycastTarget = false;
            Saga.Core.TmpEffect.Add(_line.gameObject, Saga.Core.TmpEffect.Kind.Outline, new Color(0f, 0f, 0f, 0.8f), 0.18f);
            _line.gameObject.SetActive(false);
            FieldEnemy.Killed += OnKilled;
        }

        private void OnDestroy()
        {
            FieldEnemy.Killed -= OnKilled;
            if (Instance == this) Instance = null;
        }

        /// <summary>진단용 — 보상 글을 거두고 다음 Tick 에 곧바로 다시 세게 한다(보상은 주지 않는다).</summary>
        public void ClearFlashForTest()
        {
            _flashLeft = 0f;
            _refresh = 0f;
            if (_line != null) _line.gameObject.SetActive(false);
        }

        private void OnKilled(FieldEnemy e)
        {
            if (e == null || e.IsGuardian || !FieldSpawner.GroupWiped(e.GroupId)) return;
            if (RegionMissionState.AddClear(GoRegionMission.RegionOfGroup(e.GroupId))) _refresh = 0f;
        }

        private void Update()
        {
            var fc = FieldCombat.Instance;
            if (fc != null) Tick(fc.transform.position, Time.deltaTime);
        }

        /// <summary>진단도 부른다 — dt 만큼 지나게 하고, 새로 셀 때가 됐으면 보상을 주고 줄을 고친다.</summary>
        public void Tick(Vector3 playerPos, float dt)
        {
            if (_line == null) return;
            if (_flashLeft > 0f) _flashLeft -= dt;
            _refresh -= dt;
            if (_refresh > 0f) return;
            _refresh = RefreshSec;

            var paid = RegionMissionState.Refresh();
            if (paid.Count > 0)
            {
                var p = paid[paid.Count - 1]; // 한꺼번에 둘(2단·평정)이면 평정 글만 — 금·경험은 둘 다 들어갔다
                int gold = 0, exp = 0;
                foreach (var q in paid) if (q.RegionId == p.RegionId) { gold += q.Gold; exp += q.Exp; }
                string name = GoWorldMap.RegionName(p.RegionId);
                _line.text = p.Stage >= GoRegionMission.Stages
                    ? string.Format(GoLocalization.T("mission.clear", "◆ {0} 평정! — 금 {1}냥 · 경험치 {2}"), name, gold, exp)
                    : string.Format(GoLocalization.T("mission.stage_paid", "◆ {0} 사명 {1}/{2} — 금 {3}냥 · 경험치 {4}"), name, p.Stage, GoRegionMission.Stages, gold, exp);
                _line.color = new Color(1f, 0.85f, 0.35f);
                _line.gameObject.SetActive(true);
                _flashLeft = FlashSec;
                return;
            }
            if (_flashLeft > 0f) return;

            string text = ViewOf(GoWorldMap.RegionAt(playerPos));
            _line.color = new Color(0.95f, 0.93f, 0.85f);
            _line.text = text ?? "";
            _line.gameObject.SetActive(text != null);
        }

        /// <summary>그 지역 사명 한 줄 — 사명이 없거나 다 끝났으면 null.</summary>
        public static string ViewOf(string regionId)
        {
            int i = GoRegionMission.IndexOf(regionId);
            if (i < 0) return null;
            var m = GoRegionMission.Missions[i];
            int stage = RegionMissionState.StageOf(regionId);
            if (stage >= GoRegionMission.Stages) return null;
            string next;
            if (stage == 0)
            {
                next = m.WaypointId == null
                    ? GoLocalization.T("mission.next.tower", "옛 망루 꼭대기에 올라라")
                    : string.Format(GoLocalization.T("mission.next.waypoint", "{0}을 켜라"), WaypointName(m.WaypointId));
            }
            else if (stage == 1)
            {
                next = string.Format(GoLocalization.T("mission.next.clears", "이 지역 무리 토벌 {0}/{1}"),
                    RegionMissionState.ClearsOf(regionId), GoRegionMission.ClearsNeeded);
            }
            else if (m.Final == GoRegionMission.Final.Guardian)
            {
                next = GoLocalization.T("mission.next.guardian", "망루 수호장을 쓰러뜨려라");
            }
            else
            {
                GoRegionMission.ChestProgress(regionId, out int opened, out int total);
                next = string.Format(GoLocalization.T("mission.next.chests", "이 지역 보물 상자 {0}/{1}"), opened, total);
            }
            return string.Format(GoLocalization.T("mission.line", "◆ {0} 사명 {1}/{2} · {3}"),
                GoWorldMap.RegionName(regionId), stage, GoRegionMission.Stages, next);
        }

        private static string WaypointName(string id)
        {
            foreach (var w in GoWorldMap.Waypoints) if (w.Id == id) return GoWorldMap.WaypointName(w);
            return id;
        }
    }
}
