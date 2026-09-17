using UnityEngine;
using Saga.Go.Data;
using Saga.Go.World;

namespace Saga.Go.Player
{
    /// <summary>
    /// PLAN.md 101-3 G "장비 가시화" — DUNGEON `WeaponVisual`과 같은 로직을
    /// 이 asmdef용으로 새로 짠다(SagaGo가 SagaDungeon을 참조하지 않아
    /// 타입을 직접 못 씀, 루트 CLAUDE.md "다섯 판은 다섯 벌 복사" 원칙).
    /// 장착 무기가 그동안 순수 스탯 보너스일 뿐 화면엔 아무 변화가 없던
    /// 것을 실제로 손에 들려 보여준다. 무기 메시 자산이 없어 자루+칼날을
    /// 코드로 짓는다.
    ///
    /// GO는 DUNGEON과 달리 시작 무기 개념이 없다(`Inventory.EquippedWeaponId`
    /// 기본값 null — "닫힌 빈 손", `Inventory.cs` 클래스 주석 참고) — 미장착
    /// 상태는 0등급(무광)으로 그냥 표시한다(칼을 안 든 것치곤 어색하지만,
    /// 이 슬라이스는 장비 유무 자체를 감추는 손 모델이 없어 범위 밖).
    /// `Inventory.ItemGained`(무기 슬롯만 필터링)로 갱신 — DUNGEON의
    /// `HeroState.EquipmentChanged`와 달리 재장착이 아니라 "주웠다"
    /// 이벤트라 무기가 아닌 방어구를 주웠을 때는 무시해야 한다.
    /// </summary>
    [RequireComponent(typeof(PlayerController))]
    public class WeaponVisual : MonoBehaviour
    {
        private static readonly Color[] GradeEmission =
        {
            Color.black,
            new Color(0.25f, 0.55f, 0.5f) * 0.6f,
            new Color(1f, 0.78f, 0.25f) * 1.6f,
        };

        private const float BladeLength = 0.55f;
        private const float BladeLengthPerGrade = 0.08f;
        private const float BladeWidth = 0.08f;
        private const float BladeThickness = 0.02f;

        private static readonly Color HandleColor = new Color(0.3f, 0.22f, 0.15f);
        private static readonly Color BladeBaseColor = new Color(0.75f, 0.78f, 0.8f);

        private PlayerController _controller;
        private Transform _blade;
        private MeshRenderer _bladeRenderer;

        private void Awake()
        {
            _controller = GetComponent<PlayerController>();
        }

        private void Start()
        {
            BuildVisual();
            Inventory.ItemGained += OnItemGained;
            Refresh();
        }

        private void OnDestroy()
        {
            Inventory.ItemGained -= OnItemGained;
        }

        private void OnItemGained(ItemData item, bool equipped)
        {
            if (item.Slot != ItemSlot.Weapon || !equipped) return;
            Refresh();
        }

        private void BuildVisual()
        {
            if (_controller.Visual == null) return;
            var socket = CharacterVisual.FindOrCreateWeaponSocket(_controller.Visual.gameObject, _controller.Animator);

            var handle = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            handle.name = "WeaponHandle (generated)";
            Object.Destroy(handle.GetComponent<Collider>());
            handle.transform.SetParent(socket, false);
            handle.transform.localScale = new Vector3(0.05f, 0.12f, 0.05f);
            handle.transform.localPosition = Vector3.zero;
            var handleMat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "WeaponHandle (generated)" };
            handleMat.color = HandleColor;
            handle.GetComponent<MeshRenderer>().sharedMaterial = handleMat;

            var blade = GameObject.CreatePrimitive(PrimitiveType.Cube);
            blade.name = "WeaponBlade (generated)";
            Object.Destroy(blade.GetComponent<Collider>());
            blade.transform.SetParent(socket, false);
            var bladeMat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "WeaponBlade (generated)" };
            bladeMat.color = BladeBaseColor;
            bladeMat.EnableKeyword("_EMISSION");
            blade.GetComponent<MeshRenderer>().sharedMaterial = bladeMat;

            _blade = blade.transform;
            _bladeRenderer = blade.GetComponent<MeshRenderer>();
        }

        private void Refresh()
        {
            if (_blade == null) return;

            int grade = Mathf.Clamp(ItemData.Get(Inventory.EquippedWeaponId)?.Grade ?? 0, 0, GradeEmission.Length - 1);
            float length = BladeLength + grade * BladeLengthPerGrade;
            _blade.localScale = new Vector3(BladeWidth, length, BladeThickness);
            _blade.localPosition = new Vector3(0f, length * 0.5f, 0f);
            _bladeRenderer.sharedMaterial.SetColor("_EmissionColor", GradeEmission[grade]);
        }
    }
}
