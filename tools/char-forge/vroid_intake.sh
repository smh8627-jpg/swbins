#!/usr/bin/env bash
# VRoid 로 사람이 디자인한 주역 한 명을 saga-godot 에 들인다 — 내보낸 .vrm 하나 → 게임이 바로 쓰는 몸·얼굴·CC0 동작.
# (2026-09-25 사용자 결정: 애니 얼굴은 VRoid 직접 디자인, 나머지는 이 도구가 한다. README §10)
#
#   bash tools/char-forge/vroid_intake.sh <내보낸.vrm> <id>        # id = 영문 소문자·숫자·_ (실명 금지, 예: hero_go_02)
#
# 하는 일:
#   1) assets/characters_vroid/<id>.vrm + .glb 사본(Godot 는 .vrm 확장자를 장면으로 안 읽는다)
#   2) 얼굴 데칼 굽기 → assets/characters_vroid/generated/<id>_Face_Baked.png (tools/asset-forge/vroid_face_bake_project.py)
#   3) CC0 동작 여덟을 그 뼈대에 굽고(bake_for_rig.py) 파일로 검증(verify.py — 뼈 방향 ≤5°·땅 ≤1cm)
#   4) Godot 임포트 → anim_cc0/<id>_lib.res (saga-godot/tools/ual_lib_build.gd, 자체 확인 ≤0.5°)
#   5) cel_shader_apply.gd FACE_BAKE_BY_GLB 에 한 줄 추가 · probe_anim_cc0.gd 로 실제 몸에 틀어 보기
# 게임 씬에 물리는 건(어느 자리에 쓸지) 사람이 정한 뒤 따로 한다.
set -euo pipefail
# 주의: 헤드리스 Godot 은 백그라운드에서 stdin 을 물려받으면 멈춘 채 기다린다(2026-09-25 임포트·점검이 각각 17분 넘게 멈춤) — Godot 호출엔 모두 </dev/null.
cd "$(dirname "$0")/../.."
VRM="${1:?내보낸 .vrm 경로}"
ID="${2:?id (영문 소문자·숫자·_)}"
[[ "$ID" =~ ^[a-z0-9_]+$ ]] || { echo "id 는 영문 소문자·숫자·_ 만: $ID"; exit 1; }
[ -f "$VRM" ] || { echo "파일 없음: $VRM"; exit 1; }
B="${BLENDER:-/c/Program Files/Blender Foundation/Blender 5.2/blender.exe}"
G="${GODOT:-$(ls -t /c/Users/*/AppData/Local/Temp/claude/*/*/scratchpad/godot/*console.exe 2>/dev/null | head -1)}"
[ -x "$B" ] || { echo "Blender 없음: $B (BLENDER=경로)"; exit 1; }
[ -n "$G" ] && [ -f "$G" ] || { echo "Godot 콘솔 exe 없음 (GODOT=경로, saga-godot/CLAUDE.md 에서 받는 법)"; exit 1; }
CLIPS="idle=Idle_Loop,walk=Walk_Loop,sprint=Sprint_Loop,attack=Sword_Attack,hit=Hit_Chest,dodge=Roll,death=Death01,pickup=PickUp_Table"
DST=saga-godot/assets/characters_vroid
OUT=tools/char-forge/_out
mkdir -p "$DST/generated" "$OUT"
ROOT="$(pwd -W 2>/dev/null || pwd)"  # Blender 에 넘기는 경로는 절대로

echo "== 1) 사본"
cp "$VRM" "$DST/$ID.vrm"
cp "$VRM" "$DST/$ID.glb"
py - "$DST/$ID.glb" <<'PY'
import json, struct, sys
d = open(sys.argv[1], 'rb').read()
j = json.loads(d[20:20 + struct.unpack('<I', d[12:16])[0]])
ext = j.get('extensions', {})
meta = (ext.get('VRMC_vrm') or {}).get('meta') or (ext.get('VRM') or {}).get('meta') or {}
print('VRM', 'VRMC_vrm(1.0)' if 'VRMC_vrm' in ext else 'VRM(0.x)', {k: meta.get(k) for k in (
    'commercialUsage', 'commercialUssageName', 'allowRedistribution', 'modification', 'licenseName', 'avatarPermission')})
PY

echo "== 2) 얼굴 굽기"
"$B" -b --factory-startup -P tools/asset-forge/vroid_face_bake_project.py -- "$ROOT/$DST/$ID.glb" "$ROOT/$DST/generated/${ID}_Face_Baked.png" 1024 >"$OUT/${ID}_face.log" 2>&1 \
  || { tail -20 "$OUT/${ID}_face.log"; exit 1; }
ls -la "$DST/generated/${ID}_Face_Baked.png"

echo "== 3) 동작 굽기 + 파일 검증"
"$B" -b --factory-startup -P tools/char-forge/bake_for_rig.py -- --target "$DST/$ID.glb" --map vroid --clips "$CLIPS" \
  --out "$OUT/${ID}_anims.glb" --check >"$OUT/${ID}_bake.log" 2>&1 || { tail -20 "$OUT/${ID}_bake.log"; exit 1; }
grep -E "^BAKE " "$OUT/${ID}_bake.log"
"$B" -b --factory-startup -P tools/char-forge/verify.py -- --glb "$OUT/${ID}_anims.glb" --map vroid --clips "$CLIPS" \
  >"$OUT/${ID}_verify.log" 2>&1 || { grep VERIFY "$OUT/${ID}_verify.log"; exit 1; }
grep VERIFY_RESULT "$OUT/${ID}_verify.log"

echo "== 4) Godot 임포트 + 동작 묶음"
cd saga-godot
"$G" --headless --editor --path . --quit </dev/null >"../$OUT/${ID}_import.log" 2>&1 || true
git checkout -- assets/generated/props/ 2>/dev/null || true  # 헤드리스 임포트가 매번 고쳐 쓰는 남의 .import(2026-09-25 확인)
"$G" --headless --path . --script tools/ual_lib_build.gd -- "$(cd .. && pwd -W 2>/dev/null || pwd)/$OUT/${ID}_anims.glb" \
  "res://assets/characters_vroid/$ID.glb" "$ID" </dev/null | grep -aE "^UALLIB "

echo "== 5) 셀 셰이더 얼굴 표 + 실제 몸 점검"
py - "$ID" <<'PY'
import sys
p = 'saga_core/shaders/cel_shader_apply.gd'
i = sys.argv[1]
d = open(p, 'rb').read().decode('utf-8')
key = f'"res://assets/characters_vroid/{i}.glb":'
if key in d:
    print('얼굴 표: 이미 있음')
else:
    e = '\r\n' if '\r\n' in d else '\n'
    anchor = 'const FACE_BAKE_BY_GLB := {' + e
    assert anchor in d
    line = f'\t{key}{e}\t\tpreload("res://assets/characters_vroid/generated/{i}_Face_Baked.png"),{e}'
    d = d.replace(anchor, anchor + line, 1)
    open(p, 'wb').write(d.encode('utf-8'))
    print('얼굴 표: 추가')
PY
"$G" --headless --path . --script tools/probe_anim_cc0.gd </dev/null 2>&1 | grep -aE "PROBE_ANIM|RESULT"
git status --short -- project.godot '*.import' | grep -v "characters_vroid/$ID" || true
echo "끝: $ID — 게임 어느 자리에 쓸지 정하면 그 씬의 Visual·library_path 를 이 몸으로 바꾼다."
