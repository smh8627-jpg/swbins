using UnityEngine;
using Saga.Forest.Data;
using Saga.Forest.UI;

namespace Saga.Forest.World
{
    /// <summary>
    /// VERTICAL_SLICE_FOREST.md(saga-godot) 4절 "결정 — 포함: 채집 동사
    /// 하나만 — 나무 흔들기 → 과일 하나 획득(`GATHER.tree` 그대로,
    /// `reset:1`(하루 1회)은 이번엔 무시 — 무제한으로 흔들 수 있다, 하루/
    /// 시간 시스템 자체가 이번 슬라이스 밖이라)". "무제한"이 "매 프레임
    /// 마다"는 아니라고 보고(가만히 서 있기만 해도 초당 수십 번씩 과일이
    /// 쌓이면 숫자가 무의미해진다) DUNGEON `DungeonAmbush.cs`가 이미 쓴
    /// 것과 같은 짧은 쿨다운(2초)만 얹었다 — 문서의 "무제한"은 그대로
    /// 지킨다(재시도 횟수 제한이 없다는 뜻일 뿐, 속도 제한과는 별개).
    ///
    /// GO `VegetationBuilder.cs`가 이미 검증한 tree_oak.glb ×4.5 스케일을
    /// 그대로 재사용(2절 "나무 한 그루가 타일 하나에 딱 들어맞는다").
    /// </summary>
    public class ForestFruitTree : MonoBehaviour
    {
        private const float TreeScale = 4.5f; // GO VegetationBuilder.cs와 같은 값(tree_oak.glb 실측 기준).
        private const float GatherRadius = 2.5f;
        private const float GatherCooldownSec = 2f;
        private const string FruitName = "산딸기";
        private const float ToastSec = 3f;

        [SerializeField] private GameObject treeModel; // BuildTestVillageForestScene.cs가 tree_oak.glb를 채운다.

        private float _cooldownLeft;
        private Transform _player;

        private void Awake()
        {
            if (transform.childCount == 0) BuildVisual();
            var playerGo = GameObject.FindWithTag("Player");
            _player = playerGo != null ? playerGo.transform : null;
        }

        private void BuildVisual()
        {
            if (treeModel != null)
            {
                var inst = Object.Instantiate(treeModel, transform, false);
                inst.name = "Visual";
                inst.transform.localScale = Vector3.one * TreeScale;
                return;
            }

            // 폴백 — GLB를 못 찾은 PC에서도 씬이 안 깨지게(줄기+수관, DUNGEON
            // 바이옴 소품이 이미 쓴 결).
            var trunk = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            trunk.name = "Visual";
            trunk.transform.SetParent(transform, false);
            trunk.transform.localScale = new Vector3(0.3f, 1.2f, 0.3f);
            trunk.transform.localPosition = new Vector3(0f, 1.2f, 0f);
            var trunkMat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "TreeTrunk (generated)" };
            trunkMat.color = new Color(0.4f, 0.28f, 0.16f);
            trunk.GetComponent<MeshRenderer>().sharedMaterial = trunkMat;
            Object.Destroy(trunk.GetComponent<Collider>());

            var canopy = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            canopy.name = "Canopy";
            canopy.transform.SetParent(transform, false);
            canopy.transform.localScale = Vector3.one * 2.2f;
            canopy.transform.localPosition = new Vector3(0f, 2.6f, 0f);
            var canopyMat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "TreeCanopy (generated)" };
            canopyMat.color = new Color(0.25f, 0.5f, 0.2f);
            canopy.GetComponent<MeshRenderer>().sharedMaterial = canopyMat;
            Object.Destroy(canopy.GetComponent<Collider>());
        }

        private void Update()
        {
            if (_cooldownLeft > 0f) _cooldownLeft -= Time.deltaTime;
            if (_player == null || _cooldownLeft > 0f) return;
            if (Vector3.Distance(transform.position, _player.position) > GatherRadius) return;

            _cooldownLeft = GatherCooldownSec;
            ForestState.AddFruit(1);
            DialogueLabel.Instance?.Show($"나무를 흔들었다 — {FruitName}을(를) 주웠다 (보유 {ForestState.FruitCount}개)", ToastSec);
        }
    }
}
