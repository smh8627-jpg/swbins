using UnityEngine;
using Saga.Forest.Data;
using Saga.Forest.UI;

namespace Saga.Forest.World
{
    /// <summary>
    /// FOREST "집 꾸미기(가구)" 슬라이스(2026-09-12) — 방 안 고정 자리 하나.
    /// 웹판(`home.js place()`/`pickUp()`)은 선 자리 아무 데나 놓지만, 이
    /// 트랙엔 아직 "놓기" 입력 자체가 없어(이동뿐인 GO판 컨트롤러 재사용)
    /// 이 프로젝트 FOREST 관례(나무·주민·집 문처럼 "다가가면 반응")를 그대로
    /// 따라 여섯 개 고정 자리(`Editor/BuildTestVillageForestScene.cs`가
    /// 배치)로 단순화했다. 비어 있으면 창고에서 가장 값진 것을 놓고, 있으면
    /// 다시 창고로 거둔다 — 항목을 고르는 UI가 없어서 "그 자리 하나에 다가가면
    /// 자동으로 뒤집힌다"는 한 동작으로 합쳤다.
    /// </summary>
    public class ForestFurnitureAnchor : MonoBehaviour
    {
        // 방 하나(6x6m)에 여섯 자리+좌판까지 몰아넣어야 해서 DUNGEON류(1.8m대)
        // 보다 훨씬 좁게 잡았다 — 서로 겹치지 않게 `Editor/BuildTestVillageForestScene
        // .cs`의 좌표와 함께 맞춘 값(자리 간 최소 간격 1.2m 이상 확보).
        private const float InteractRadius = 0.6f;
        private const float CooldownSec = 1f;
        private const float ToastSec = 3f;

        private int _index;
        private Transform _player;
        private GameObject _visual;
        private bool _synced; // 세이브 로드(GameBootstrap.Start())가 끝난 뒤 첫 프레임에 한 번 맞춘다.
        private float _cooldownLeft;

        public void SetIndex(int index) => _index = index;

        private void Awake()
        {
            var playerGo = GameObject.FindWithTag("Player");
            _player = playerGo != null ? playerGo.transform : null;
        }

        private void Update()
        {
            // `SaveState.cs`류와 같은 순서 문제(자식 Awake가 GameBootstrap.Start()의
            // 로드보다 먼저 돈다) — 그래서 시각화는 로드가 끝난 뒤인 첫 Update()
            // 프레임에 한 번만 한다(DUNGEON DungeonFloorRunner 세션이 겪은 것과
            // 다른 문제지만, 원인은 같은 실행 순서 규칙).
            if (!_synced)
            {
                _synced = true;
                RebuildVisual();
            }

            if (_cooldownLeft > 0f) _cooldownLeft -= Time.deltaTime;
            if (_player == null || _cooldownLeft > 0f) return;
            if (Vector3.Distance(transform.position, _player.position) > InteractRadius) return;

            _cooldownLeft = CooldownSec;
            string current = ForestHomeState.AnchorItem(_index);
            if (!string.IsNullOrEmpty(current))
            {
                string pickedId = ForestHomeState.PickUp(_index);
                RebuildVisual();
                var item = FurnitureItem.Get(pickedId);
                DialogueLabel.Instance?.Show($"{(item != null ? item.Name : pickedId)}을(를) 창고로 거두었다.", ToastSec);
            }
            else
            {
                string placedId = ForestHomeState.TryPlaceAny(_index);
                if (placedId == null)
                {
                    DialogueLabel.Instance?.Show("놓을 가구가 창고에 없다 — 가구전에서 먼저 사야 한다.", ToastSec);
                    return;
                }
                RebuildVisual();
                var item = FurnitureItem.Get(placedId);
                var (total, count, _) = ForestHomeState.Score();
                DialogueLabel.Instance?.Show(
                    $"{(item != null ? item.Name : placedId)}을(를) 놓았다 — 집 평가: {FurnitureItem.GradeName(total)}"
                    + $"({total}점, 가구 {count}개)",
                    ToastSec);
            }
        }

        private void RebuildVisual()
        {
            if (_visual != null)
            {
                Object.Destroy(_visual);
                _visual = null;
            }

            var item = FurnitureItem.Get(ForestHomeState.AnchorItem(_index));
            if (item == null) return;

            _visual = GameObject.CreatePrimitive(item.IsCylinder ? PrimitiveType.Cylinder : PrimitiveType.Cube);
            _visual.name = "Visual";
            _visual.transform.SetParent(transform, false);

            float sizeScale = Mathf.Lerp(0.3f, 0.8f, Mathf.InverseLerp(400f, 5200f, item.Value));
            Vector3 scale = item.IsCylinder
                ? new Vector3(sizeScale * 0.7f, sizeScale, sizeScale * 0.7f)
                : new Vector3(sizeScale, sizeScale * 0.8f, sizeScale * 0.6f);
            _visual.transform.localScale = scale;
            _visual.transform.localPosition = new Vector3(0f, scale.y * 0.5f, 0f);

            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "ForestFurniture (generated)" };
            mat.color = SetColor(item.Set);
            _visual.GetComponent<MeshRenderer>().sharedMaterial = mat;
            Object.Destroy(_visual.GetComponent<Collider>());
        }

        // 웹판 `data-village.js` FURN_SETS 색 그대로(안방·사랑방·부엌·뜰).
        private static Color SetColor(FurnitureSet set) => set switch
        {
            FurnitureSet.Anbang => new Color(0.788f, 0.541f, 0.290f),
            FurnitureSet.Sarang => new Color(0.478f, 0.416f, 0.604f),
            FurnitureSet.Buok => new Color(0.659f, 0.353f, 0.235f),
            FurnitureSet.Ddeul => new Color(0.353f, 0.604f, 0.353f),
            _ => Color.gray,
        };
    }
}
