using UnityEngine;
using Saga.Story.Player;

namespace Saga.Story.World
{
    /// <summary>
    /// VERTICAL_SLICE_STORY.md 1절 "줄(로프) 이동 하나만" — saga-godot
    /// `story_terrain_builder.gd`의 RopeArea와 같은 결(Area3D → Unity
    /// 트리거 콜라이더). GO `Gatherable.cs`가 이미 쓰는 "CharacterController
    /// + 트리거 콜라이더 OnTriggerEnter/Exit" 패턴을 그대로 따른다(DUNGEON의
    /// Update() 폴링 거리 판정과는 다른 결 — 이 판은 GO 쪽 관례를 이어받음).
    /// </summary>
    [RequireComponent(typeof(BoxCollider))]
    public class StoryRope : MonoBehaviour
    {
        public float RopeX { get; private set; }
        public float Top { get; private set; }
        public float Bottom { get; private set; }

        public void Configure(float x, float top, float bottom)
        {
            RopeX = x;
            Top = top;
            Bottom = bottom;
        }

        private void OnTriggerEnter(Collider other)
        {
            if (!other.CompareTag("Player")) return;
            other.GetComponent<StoryPlayerController>()?.SetRopeArea(this);
        }

        private void OnTriggerExit(Collider other)
        {
            if (!other.CompareTag("Player")) return;
            other.GetComponent<StoryPlayerController>()?.ClearRopeArea(this);
        }
    }
}
