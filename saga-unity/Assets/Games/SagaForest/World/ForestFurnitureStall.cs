using UnityEngine;
using Saga.Forest.Data;
using Saga.Forest.UI;

namespace Saga.Forest.World
{
    /// <summary>
    /// FOREST "집 꾸미기(가구)" 슬라이스(2026-09-12) — 집 안 좌판. 웹판
    /// `home.js shopToday()`(날짜 해시로 매일 4점만 진열)는 이 프로젝트에
    /// day/시간 시스템이 아예 없어 그대로 못 옮긴다 — 대신 `World/LuckyCairn.cs`
    /// (GO)가 이미 쓴 "다가가면 쿨다운 걸고 룰렛 하나" 패턴으로, 14종
    /// 전체를 상시 룰렛에 걸었다(오늘만 4점이 아니라 매번 무작위 1점).
    /// 산 것은 바로 놓이지 않고 창고(`ForestHomeState.Stock`)에 쌓인다 —
    /// `ForestFurnitureAnchor`의 빈 자리에 다가가면 창고에서 놓인다.
    /// </summary>
    public class ForestFurnitureStall : MonoBehaviour
    {
        // ForestFurnitureAnchor(0.6m)와 겹치지 않게 좁게 잡음(`Editor/
        // BuildTestVillageForestScene.cs`의 좌표 배치와 함께 맞춘 값).
        private const float InteractRadius = 0.8f;
        private const float CooldownSec = 6f; // GO 성황당(20초)보다 짧게 — 여러 번 사야 완성되는 수집 루프라서.
        private const float ToastSec = 3.5f;

        private Transform _player;
        private float _cooldownLeft;

        private void Awake()
        {
            if (transform.childCount == 0) BuildVisual();
            var playerGo = GameObject.FindWithTag("Player");
            _player = playerGo != null ? playerGo.transform : null;
        }

        private void BuildVisual()
        {
            var stand = GameObject.CreatePrimitive(PrimitiveType.Cube);
            stand.name = "Visual";
            stand.transform.SetParent(transform, false);
            stand.transform.localScale = new Vector3(1.2f, 0.5f, 0.6f);
            stand.transform.localPosition = new Vector3(0f, 0.25f, 0f);
            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "ForestFurnitureStall (generated)" };
            mat.color = new Color(0.55f, 0.35f, 0.2f);
            stand.GetComponent<MeshRenderer>().sharedMaterial = mat;
        }

        private void Update()
        {
            if (_cooldownLeft > 0f) _cooldownLeft -= Time.deltaTime;
            if (_player == null || _cooldownLeft > 0f) return;
            if (Vector3.Distance(transform.position, _player.position) > InteractRadius) return;

            _cooldownLeft = CooldownSec;
            var item = FurnitureItem.Catalog[Random.Range(0, FurnitureItem.Catalog.Length)];
            if (ForestHomeState.TryBuy(item.Id))
            {
                DialogueLabel.Instance?.Show(
                    $"가구전 — {item.Name}을(를) 샀다(과일 -{item.FruitCost}) — 빈 자리에 다가가면 창고에서 놓인다.",
                    ToastSec);
            }
            else
            {
                DialogueLabel.Instance?.Show(
                    $"가구전 — 오늘 눈에 든 건 {item.Name}(과일 {item.FruitCost}개)인데, 과일이 모자라 못 샀다(보유 {ForestState.FruitCount}개).",
                    ToastSec);
            }
        }
    }
}
