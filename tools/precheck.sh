#!/usr/bin/env bash
# 커밋 전 자동 점검 (SAGA-DESIGN.md §8-5·§9) — Git Bash 에서 `bash tools/precheck.sh [폴더...]`
#   1) 웹 다섯 판 js 구문 (node -c, vendor 제외)
#   2) 문서 크기 상한 (CLAUDE.md 6KB · PLAN 70KB(사가블로 90KB) · PROJECT_STATE 15KB)
# 서버·브라우저는 띄우지 않는다. _test.html 진단은 사용자가 실기 확인할 때 따로 돈다.
set -u
cd "$(dirname "$0")/.." || exit 1
fail=0

echo "== js 구문"
targets=("$@"); [ ${#targets[@]} -eq 0 ] && targets=(saga-web/saga-go saga-web/saga-dungeon saga-web/saga-forest saga-web/saga-story saga-web/saga-realm)
for d in "${targets[@]}"; do
  [ -d "$d/js" ] || continue
  while IFS= read -r f; do
    node --check "$f" 2>/tmp/precheck.err || { echo "FAIL $f"; head -3 /tmp/precheck.err; fail=1; }
  done < <(find "$d/js" -name '*.js' -not -path '*/vendor/*')
done

echo "== 문서 크기"
limit() { # 파일 상한(바이트)
  local f=$1 max=$2; [ -f "$f" ] || return 0
  local n; n=$(wc -c <"$f")
  if [ "$n" -gt "$max" ]; then echo "OVER $f ${n}B > ${max}B"; fail=1; else echo "ok   $f ${n}B"; fi
}
limit CLAUDE.md 6144
for f in saga-web/*/CLAUDE.md saga-godot/CLAUDE.md saga-unity/CLAUDE.md; do limit "$f" 6144; done
limit SAGA-DESIGN.md 40960
for g in saga-go saga-forest saga-story saga-realm; do limit "saga-web/$g/PLAN.md" 71680; done
limit saga-web/saga-dungeon/PLAN.md 92160
limit saga-godot/docs/PROJECT_STATE.md 15360
limit saga-unity/docs/PROJECT_STATE.md 15360

[ $fail -eq 0 ] && echo "PRECHECK OK" || { echo "PRECHECK FAIL"; exit 1; }
