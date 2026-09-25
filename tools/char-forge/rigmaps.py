"""char-forge 뼈 표 — build.py · bake_for_rig.py · verify.py 가 같이 쓴다.

표준 뼈 = Quaternius Universal 의 UE 마네킹 이름(README §6).
"""

# 뼈 방향을 잴 기준 자식(표준 이름). 몸통을 잇는 쪽을 고른다. 여기 없는 끝 뼈(Head·손가락 끝 마디·ball)는 부모의 맞춤을 물려받는다.
# Blender 가 glTF 를 들일 때 끝 뼈 꼬리를 어림으로 정하므로(VRM 머리 뼈는 머리카락 쪽을 가리키기도 한다) 꼬리 대신 이 표를 쓴다.
REF_CHILD = {
    'pelvis': 'spine_01', 'spine_01': 'spine_02', 'spine_02': 'spine_03', 'spine_03': 'neck_01', 'neck_01': 'Head',
}
for _s in ('l', 'r'):
    REF_CHILD.update({
        f'clavicle_{_s}': f'upperarm_{_s}', f'upperarm_{_s}': f'lowerarm_{_s}', f'lowerarm_{_s}': f'hand_{_s}',
        f'hand_{_s}': f'middle_01_{_s}', f'thigh_{_s}': f'calf_{_s}', f'calf_{_s}': f'foot_{_s}', f'foot_{_s}': f'ball_{_s}',
    })
    for _f in ('thumb', 'index', 'middle', 'ring', 'pinky'):
        REF_CHILD[f'{_f}_01_{_s}'] = f'{_f}_02_{_s}'
        REF_CHILD[f'{_f}_02_{_s}'] = f'{_f}_03_{_s}'

STD_BONES = ['root', 'pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'Head']
for _s in ('l', 'r'):
    STD_BONES += [f'clavicle_{_s}', f'upperarm_{_s}', f'lowerarm_{_s}', f'hand_{_s}',
                  f'thigh_{_s}', f'calf_{_s}', f'foot_{_s}', f'ball_{_s}']
    STD_BONES += [f'{f}_0{i}_{_s}' for f in ('thumb', 'index', 'middle', 'ring', 'pinky') for i in (1, 2, 3)]

# 표준 → 그 뼈대의 이름. 없으면(None) 그 뼈대에 대응이 없다.
IDENTITY = {n: n for n in STD_BONES}

VROID = {'root': None, 'pelvis': 'J_Bip_C_Hips', 'spine_01': 'J_Bip_C_Spine', 'spine_02': 'J_Bip_C_Chest',
         'spine_03': 'J_Bip_C_UpperChest', 'neck_01': 'J_Bip_C_Neck', 'Head': 'J_Bip_C_Head'}
for _s, _S in (('l', 'L'), ('r', 'R')):
    VROID.update({f'clavicle_{_s}': f'J_Bip_{_S}_Shoulder', f'upperarm_{_s}': f'J_Bip_{_S}_UpperArm',
                  f'lowerarm_{_s}': f'J_Bip_{_S}_LowerArm', f'hand_{_s}': f'J_Bip_{_S}_Hand',
                  f'thigh_{_s}': f'J_Bip_{_S}_UpperLeg', f'calf_{_s}': f'J_Bip_{_S}_LowerLeg',
                  f'foot_{_s}': f'J_Bip_{_S}_Foot', f'ball_{_s}': f'J_Bip_{_S}_ToeBase'})
    for _f, _v in (('thumb', 'Thumb'), ('index', 'Index'), ('middle', 'Middle'), ('ring', 'Ring'), ('pinky', 'Little')):
        for _i in (1, 2, 3):
            VROID[f'{_f}_0{_i}_{_s}'] = f'J_Bip_{_S}_{_v}{_i}'

# MPFB(MakeHuman) 내장 "game_engine" 뼈대 — UE 마네킹 이름 그대로인데 두 개만 대소문자가 다르다(2.0.17 확인)
MPFB = dict(IDENTITY, root='Root', Head='head')

MAPS = {'identity': IDENTITY, 'vroid': VROID, 'mpfb': MPFB}
