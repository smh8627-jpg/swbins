#!/usr/bin/env bash
# Unity 배치 모드 실행 → 4파일(설치 버전 부작용) 원복을 한 줄로 (PLAN.md 104-1 ①)
# 사용: bash tools/unity-batch.sh -- -batchmode -nographics -quit -projectPath <경로> -logFile <경로> [...]
set -u
cd "$(dirname "$0")/.." || exit 1

if [ "${1:-}" = "--" ]; then shift; fi
if [ $# -eq 0 ]; then
  echo "사용: bash tools/unity-batch.sh -- <Unity.exe 인자...>" >&2
  exit 1
fi

"$@"
status=$?

git checkout -- \
  ProjectSettings/ProjectVersion.txt \
  ProjectSettings/EditorSettings.asset \
  Packages/manifest.json \
  Packages/packages-lock.json 2>/dev/null

echo "== git status (4파일 원복 후, saga-unity/ 안만)"
git status --porcelain .

exit $status
