#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OBJ 재질별 분리 — 다섯 판이 GLB 자산을 받을 때 원본이 OBJ(+MTL)뿐인 경우 쓴다.
saga-dungeon/assets/ASSET_LICENSES.md 의 "PolyScan — 집 둘" 절에서 손으로
하던 걸 재현 가능한 스크립트로 뽑았다 — tools/glb-compress 처럼 다섯 판이
공통으로 쓰는 도구라 게임 폴더 밖(tools/)에 둔다.

무엇을 하나: trimesh 로 OBJ 를 object+material 기준으로 갈라(원본 이력과
정확히 같은 옵션 — split_object=True, group_material=True), 재질 그룹마다
따로 GLB 하나씩 구워낸다. **여기까지만 기계적으로 한다** — 어떤 조각을
남기고 어떤 걸 버릴지, 텍스처를 어떻게 줄일지, 여러 조각을 다시 한 장면으로
합칠지는 자산마다 다른 판단이 필요해서 일부러 자동화하지 않는다(원본
이력에서도 매번 사람이 봤다). 이 스크립트가 끝나면 나온 GLB들을 눈으로
확인하고 필요한 것만 골라 손으로 다음 단계(텍스처 축소·재질 합치기 등)를
진행한다.

무엇을 안 하나: .rar/.zip 압축 해제(7-Zip 등으로 미리 풀어 둘 것),
텍스처 축소·재압축, 여러 조각을 하나의 GLB로 재조립.

알려진 함정 (원본 이력에서 실제로 겪음): OBJ 의 `mtllib` 줄이 가리키는
파일명과 실제로 폴더에 든 .mtl 파일 이름이 다르면, trimesh 가 에러 없이
조용히 재질을 다 "material_0" 하나로 뭉개 버린다. 이 스크립트는 변환 전에
mtllib 참조를 미리 확인해서 어긋나 있으면 실행을 멈추고 알려준다.

사용법:
    pip install trimesh   (한 번만)
    python split.py <원본.obj> [--out 출력폴더]

    <원본.obj>   재질별로 가를 OBJ 파일
    --out        출력 폴더(생략하면 OBJ 와 같은 폴더 밑에 "<obj이름>_split/")

출력: <출력폴더>/<재질그룹명>.glb 여러 개 + 표준출력에 그룹별 정점·삼각형
수·파일 크기 요약.
"""
import argparse
import os
import re
import sys

# 윈도우 콘솔 기본 코드페이지(cp949)로는 한글 문장의 em-dash(—) 등이
# UnicodeEncodeError 로 죽는다 — 표준출력을 UTF-8로 강제한다.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, 'reconfigure'):
        try:
            _stream.reconfigure(encoding='utf-8')
        except Exception:
            pass


def check_mtllib(obj_path):
    """mtllib 참조가 실제 파일과 맞는지 미리 확인한다. 안 맞으면
    (참조된 이름, 실제 폴더에 있는 .mtl 목록) 을 돌려준다 — 맞으면 None."""
    folder = os.path.dirname(os.path.abspath(obj_path)) or '.'
    referenced = []
    with open(obj_path, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            m = re.match(r'\s*mtllib\s+(.+)\s*$', line)
            if m:
                referenced.append(m.group(1).strip())
    if not referenced:
        return None
    actual = [n for n in os.listdir(folder) if n.lower().endswith('.mtl')]
    missing = [r for r in referenced if r not in actual]
    if missing:
        return (missing, actual)
    return None


def main():
    ap = argparse.ArgumentParser(description='OBJ 를 재질별로 갈라 GLB 여러 개로 내보낸다')
    ap.add_argument('obj_path', help='원본 .obj 파일')
    ap.add_argument('--out', help='출력 폴더 (생략하면 <obj이름>_split/)')
    args = ap.parse_args()

    if not os.path.isfile(args.obj_path):
        sys.exit('파일을 찾을 수 없음: ' + args.obj_path)

    mismatch = check_mtllib(args.obj_path)
    if mismatch:
        missing, actual = mismatch
        print('경고: mtllib 참조가 실제 파일과 안 맞습니다 — 이대로 돌리면 재질이')
        print('      전부 material_0 하나로 뭉개질 수 있습니다(원본 이력에서 실제로 겪음).')
        print('  참조된 파일명:', ', '.join(missing))
        print('  실제 폴더의 .mtl:', ', '.join(actual) if actual else '(없음)')
        print('  .mtl 파일을 참조된 이름으로 복사해 두고 다시 실행하세요.')
        sys.exit(1)

    try:
        import trimesh
    except ImportError:
        sys.exit('trimesh 가 안 깔려 있습니다 — 먼저: pip install trimesh')

    out_dir = args.out or (os.path.splitext(args.obj_path)[0] + '_split')
    os.makedirs(out_dir, exist_ok=True)

    scene = trimesh.load(args.obj_path, split_object=True, group_material=True)
    geometries = scene.geometry if hasattr(scene, 'geometry') else {'mesh': scene}

    if not geometries:
        sys.exit('갈라낼 지오메트리가 없습니다 — OBJ 내용을 확인하세요.')

    print('%d 개 재질 그룹으로 갈렸습니다:' % len(geometries))
    rows = []
    for name, geom in geometries.items():
        safe_name = re.sub(r'[^A-Za-z0-9_.-]', '_', str(name)) or 'part'
        out_path = os.path.join(out_dir, safe_name + '.glb')
        geom.export(out_path)
        size_kb = os.path.getsize(out_path) / 1024.0
        verts = len(geom.vertices) if hasattr(geom, 'vertices') else 0
        faces = len(geom.faces) if hasattr(geom, 'faces') else 0
        rows.append((name, verts, faces, size_kb, out_path))

    name_w = max(len(str(r[0])) for r in rows) + 2
    for name, verts, faces, size_kb, out_path in rows:
        print('  %-*s 정점 %6d  삼각형 %6d  %7.1fKB  -> %s' %
              (name_w, name, verts, faces, size_kb, out_path))

    print('\n다음은 사람이 확인: 어떤 조각을 남길지, 텍스처를 얼마나 줄일지,')
    print('여러 조각을 다시 합칠지는 자산마다 다르니 여기서부터는 직접 판단하세요.')


if __name__ == '__main__':
    main()
