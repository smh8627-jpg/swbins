using UnityEditor;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 66-2장 "다음에 할 일" — 사람이 mixamo.com에서 받아
    /// Assets/Art/CharactersRealistic/(.gitignore 대상, 로컬 전용)에 넣은
    /// Maria 몸 FBX + 애니메이션 FBX 8개를 Humanoid로 리깅한다. 리깅 절차
    /// 자체는 `MixamoRigUtil.cs`(44장 두 번째 캐릭터 Abe와 공용).
    /// </summary>
    public static class SetupMixamoCharacterImport
    {
        private const string Dir = "Assets/Art/CharactersRealistic/";
        private const string BodyFileName = "Maria WProp J J Ong.fbx";

        private static readonly MixamoRigUtil.AnimMapping[] AnimMap =
        {
            new("Action Idle To Fight Idle", "idle", true),
            new("Walking", "walk", true),
            new("Running", "run", true),
            new("Sword And Shield Slash", "attack", false),
            new("Hit Reaction", "hit", false),
            new("Stand To Roll", "dodge", false),
            new("Two Handed Sword Death", "death", false),
            new("Picking Up", "interaction", false),
        };

        [MenuItem("Saga/Setup Mixamo Character Import")]
        public static void Setup()
        {
            MixamoRigUtil.RigCharacter(Dir, BodyFileName, AnimMap, "SetupMixamoCharacterImport");
        }
    }
}
