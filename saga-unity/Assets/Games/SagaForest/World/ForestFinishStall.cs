using System.Collections.Generic;
using UnityEngine;
using Saga.Forest.Data;
using Saga.Forest.UI;

namespace Saga.Forest.World
{
    /// <summary>
    /// FOREST 다음 조각 — "벽지/장판"(도배전). `World/ForestFurnitureStall.cs`와
    /// 같은 결(다가가면 쿨다운 걸고 룰렛)이지만, 벽지·장판은 여러 벌 살 필요가
    /// 없는 **집 하나당 한 벌**짜리라 재해석이 하나 더 붙는다 — 아직 안 가진
    /// 것 중에서 룰렛을 돌리다가, 다섯+다섯 다 가지면 그때부턴 **이미 가진
    /// 것끼리 공짜로 갈아입는** 룰렛으로 바뀐다(원작 admin.js가 소유한 것들
    /// 사이에서 자유롭게 갈아입히는 것과 같은 결 — 클릭 선택 UI가 없어 룰렛으로
    /// 단순화). 집 안(가구 자리 여섯 + 가구전)이 이미 빽빽해(`Editor/
    /// BuildTestVillageForestScene.cs` 주석 참고) 실내에 자리를 못 내 **집
    /// 바깥**에 세웠다.
    /// </summary>
    public class ForestFinishStall : MonoBehaviour
    {
        private const float InteractRadius = 1f;
        private const float CooldownSec = 6f;
        private const float ToastSec = 4f;

        private Transform _player;
        private ForestHouse _house;
        private float _cooldownLeft;

        private void Awake()
        {
            if (transform.childCount == 0) BuildVisual();
            var playerGo = GameObject.FindWithTag("Player");
            _player = playerGo != null ? playerGo.transform : null;
            _house = Object.FindFirstObjectByType<ForestHouse>();
        }

        private void BuildVisual()
        {
            var stand = GameObject.CreatePrimitive(PrimitiveType.Cube);
            stand.name = "Visual";
            stand.transform.SetParent(transform, false);
            stand.transform.localScale = new Vector3(1.2f, 1.4f, 0.15f);
            stand.transform.localPosition = new Vector3(0f, 0.7f, 0f);
            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "ForestFinishStall (generated)" };
            mat.color = new Color(0.75f, 0.68f, 0.5f);
            stand.GetComponent<MeshRenderer>().sharedMaterial = mat;
        }

        private void Update()
        {
            if (_cooldownLeft > 0f) _cooldownLeft -= Time.deltaTime;
            if (_player == null || _cooldownLeft > 0f) return;
            if (Vector3.Distance(transform.position, _player.position) > InteractRadius) return;

            _cooldownLeft = CooldownSec;

            var unowned = new List<(FinishKind Kind, FinishItem Item)>();
            foreach (var w in ForestFinishData.Walls) if (!ForestHomeState.OwnsFinish(FinishKind.Wall, w.Key)) unowned.Add((FinishKind.Wall, w));
            foreach (var f in ForestFinishData.Floors) if (!ForestHomeState.OwnsFinish(FinishKind.Floor, f.Key)) unowned.Add((FinishKind.Floor, f));

            if (unowned.Count > 0)
            {
                var (kind, item) = unowned[Random.Range(0, unowned.Count)];
                if (ForestHomeState.TryBuyAndEquipFinish(kind, item.Key))
                {
                    _house?.RepaintFinish();
                    DialogueLabel.Instance?.Show(
                        $"도배전 — {item.Name}을(를) 사서 발랐다(과일 -{item.FruitCost}).", ToastSec);
                }
                else
                {
                    DialogueLabel.Instance?.Show(
                        $"도배전 — 눈에 든 건 {item.Name}(과일 {item.FruitCost}개)인데, 과일이 모자라 못 샀다(보유 {ForestState.FruitCount}개).",
                        ToastSec);
                }
                return;
            }

            // 다섯+다섯 다 가졌다 — 공짜로 갈아입어 본다(원작의 "가진 것끼리
            // 자유 교체" 재해석).
            var all = new List<(FinishKind Kind, FinishItem Item)>();
            foreach (var w in ForestFinishData.Walls) all.Add((FinishKind.Wall, w));
            foreach (var f in ForestFinishData.Floors) all.Add((FinishKind.Floor, f));
            var pick = all[Random.Range(0, all.Count)];
            ForestHomeState.TryBuyAndEquipFinish(pick.Kind, pick.Item.Key);
            _house?.RepaintFinish();
            DialogueLabel.Instance?.Show($"도배전 — 이미 다 가졌다. 오늘은 {pick.Item.Name}로 갈아입어 본다.", ToastSec);
        }
    }
}
