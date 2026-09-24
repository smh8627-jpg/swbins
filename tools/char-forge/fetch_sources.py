"""char-forge 입력 팩 받기 — sources.json 대로 _src/ 에 받아 sha256 을 맞추고 푼다.

    py tools/char-forge/fetch_sources.py          # 없는 것만 받는다
    py tools/char-forge/fetch_sources.py --force  # 다시 받는다

itch.io 무료(최소 0원) 팩은 로그인 없이 받는다: 페이지 csrf → download_url → 파일 id 로 CDN 주소.
사람 클릭이 필요 없다. 사이트가 바뀌어 막히면 사람이 받아 _src/ 에 zip 이름대로 두면 된다(sha256 만 맞으면 쓴다).
"""
import hashlib, http.cookiejar, json, os, re, sys, urllib.parse, urllib.request, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '_src')
UA = {'User-Agent': 'Mozilla/5.0 (char-forge fetch_sources)'}


def opener():
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))


def get(op, url, data=None, headers=None):
    body = urllib.parse.urlencode(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, headers={**UA, **(headers or {})})
    with op.open(req, timeout=120) as r:
        return r.read()


def itch_free_url(game, upload_name):
    op = opener()
    page_url = 'https://' + game
    html = get(op, page_url).decode('utf-8', 'replace')
    csrf = re.search(r'name="csrf_token" value="([^"]+)"', html) or re.search(r'csrf_token" value="([^"]+)"', html)
    if not csrf:
        sys.exit('itch: csrf_token 을 못 찾았다 — 사람이 받아 _src/ 에 두기')
    dl = json.loads(get(op, page_url + '/download_url', {'csrf_token': csrf.group(1)}))['url']
    dl_html = get(op, dl).decode('utf-8', 'replace')
    # 속성 순서가 요청마다 바뀐다(title·class) — 올림 칸마다 잘라 이름을 찾는다
    m = None
    for blk in dl_html.split('class="upload"')[1:]:
        if f'title="{upload_name}"' in blk:
            m = re.search(r'data-upload_id="(\d+)"', blk)
            break
    if not m:
        sys.exit(f'itch: 올림 파일 "{upload_name}" 을 못 찾았다')
    csrf2 = re.search(r'csrf_token" value="([^"]+)"', dl_html).group(1)
    # 무료 팩은 key 없이 요청해야 한다(key 를 붙이면 "invalid key")
    j = json.loads(get(op, f'{page_url}/file/{m.group(1)}?source=game_download', {'csrf_token': csrf2},
                       {'Referer': dl, 'X-Requested-With': 'XMLHttpRequest'}))
    return j['url']


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def main():
    force = '--force' in sys.argv
    os.makedirs(SRC, exist_ok=True)
    packs = json.load(open(os.path.join(HERE, 'sources.json'), encoding='utf-8'))['packs']
    for key, p in packs.items():
        zp = os.path.join(SRC, p['zip'])
        if force or not os.path.exists(zp) or sha256(zp) != p['sha256']:
            d = p['download']
            url = d['url'] if d['kind'] == 'direct' else itch_free_url(d['game'], d['upload_name'])
            print('받기', key)
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=600) as r, open(zp, 'wb') as f:
                while chunk := r.read(1 << 20):
                    f.write(chunk)
        got = sha256(zp)
        if got != p['sha256']:
            sys.exit(f'{key}: sha256 불일치 {got} — 팩이 바뀌었다. 라이선스를 다시 확인하고 sources.json 을 고친다')
        with zipfile.ZipFile(zp) as z:
            if not os.path.exists(os.path.join(SRC, p['license_file'])):
                z.extractall(SRC)
            lic = z.read(p['license_file']).decode('utf-8', 'replace')
        if 'CC0' not in lic:
            sys.exit(f'{key}: 라이선스 파일에 CC0 가 없다 — 쓰지 않는다')
        print('ok', key, p['license'])


if __name__ == '__main__':
    main()
