"""임시 진단: index.html 로드 후 콘솔 로그/예외를 모아 찍고 스크린샷도 남긴다."""
import socket, base64, struct, json, time, sys, urllib.request

PORT = int(__import__('os').environ.get('CDP_PORT', '9333'))
URL = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else 'diag.png'
WAIT_S = float(sys.argv[3]) if len(sys.argv) > 3 else 8.0


def http_get_json(path):
    with urllib.request.urlopen('http://127.0.0.1:%d%s' % (PORT, path), timeout=10) as r:
        return json.loads(r.read().decode('utf-8'))


class WS:
    def __init__(self, url):
        assert url.startswith('ws://')
        rest = url[len('ws://'):]
        host, path = rest.split('/', 1)
        path = '/' + path
        if ':' in host:
            h, p = host.split(':')
            p = int(p)
        else:
            h, p = host, 80
        self.sock = socket.create_connection((h, p), timeout=10)
        key = base64.b64encode(b'0123456789012345').decode()
        req = (
            'GET %s HTTP/1.1\r\n'
            'Host: %s:%d\r\n'
            'Upgrade: websocket\r\n'
            'Connection: Upgrade\r\n'
            'Sec-WebSocket-Key: %s\r\n'
            'Sec-WebSocket-Version: 13\r\n\r\n'
        ) % (path, h, p, key)
        self.sock.sendall(req.encode())
        resp = b''
        while b'\r\n\r\n' not in resp:
            resp += self.sock.recv(4096)
        self._id = 0
        self._buf = resp.split(b'\r\n\r\n', 1)[1]

    def send(self, obj):
        payload = json.dumps(obj).encode('utf-8')
        header = bytearray()
        header.append(0x81)
        mask_bit = 0x80
        length = len(payload)
        if length < 126:
            header.append(mask_bit | length)
        elif length < 65536:
            header.append(mask_bit | 126)
            header += struct.pack('>H', length)
        else:
            header.append(mask_bit | 127)
            header += struct.pack('>Q', length)
        mask = bytes([5, 7, 9, 11])
        header += mask
        masked = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
        self.sock.sendall(bytes(header) + masked)

    def _recv_exact(self, n):
        while len(self._buf) < n:
            chunk = self.sock.recv(65536)
            if not chunk:
                raise EOFError('socket closed')
            self._buf += chunk
        data, self._buf = self._buf[:n], self._buf[n:]
        return data

    def recv(self):
        b1b2 = self._recv_exact(2)
        b1, b2 = b1b2[0], b1b2[1]
        opcode = b1 & 0x0F
        masked = (b2 & 0x80) != 0
        length = b2 & 0x7F
        if length == 126:
            length = struct.unpack('>H', self._recv_exact(2))[0]
        elif length == 127:
            length = struct.unpack('>Q', self._recv_exact(8))[0]
        if masked:
            mask = self._recv_exact(4)
            payload = bytearray(self._recv_exact(length))
            for i in range(length):
                payload[i] ^= mask[i % 4]
            payload = bytes(payload)
        else:
            payload = self._recv_exact(length)
        if opcode == 0x8:
            raise EOFError('closed by peer')
        return payload

    def call(self, method, params=None, timeout=20):
        self._id += 1
        mid = self._id
        self.send({'id': mid, 'method': method, 'params': params or {}})
        deadline = time.time() + timeout
        while time.time() < deadline:
            msg = json.loads(self.recv().decode('utf-8'))
            if msg.get('id') == mid:
                return msg
        raise TimeoutError('no response for %s' % method)

    def poll_events(self, duration):
        events = []
        deadline = time.time() + duration
        self.sock.settimeout(0.3)
        while time.time() < deadline:
            try:
                raw = self.recv()
            except socket.timeout:
                continue
            except EOFError:
                break
            try:
                msg = json.loads(raw.decode('utf-8'))
            except Exception:
                continue
            if 'method' in msg:
                events.append(msg)
        self.sock.settimeout(10)
        return events


def main():
    tabs = http_get_json('/json')
    tab = None
    for t in tabs:
        if t.get('type') == 'page':
            tab = t
            break
    if not tab:
        tab = http_get_json('/json/new?about:blank')
    ws = WS(tab['webSocketDebuggerUrl'])
    ws.call('Page.enable')
    ws.call('Runtime.enable')
    ws.call('Log.enable')
    ws.call('Page.navigate', {'url': URL})
    events = ws.poll_events(3.0)
    JS = sys.argv[4] if len(sys.argv) > 4 else None
    if JS:
        r = ws.call('Runtime.evaluate', {'expression': JS}, timeout=20)
        print('eval result:', r.get('result'))
    events += ws.poll_events(WAIT_S)
    for msg in events:
        m = msg.get('method')
        p = msg.get('params', {})
        if m == 'Runtime.consoleAPICalled':
            args = p.get('args', [])
            txt = ' '.join(str(a.get('value', a.get('description', ''))) for a in args)
            print('[console.%s] %s' % (p.get('type'), txt))
        elif m == 'Runtime.exceptionThrown':
            ed = p.get('exceptionDetails', {})
            exc = ed.get('exception', {})
            print('[EXCEPTION] %s | %s' % (ed.get('text'), exc.get('description', exc.get('value'))))
        elif m == 'Log.entryAdded':
            e = p.get('entry', {})
            print('[log.%s] %s' % (e.get('level'), e.get('text')))
    r = ws.call('Page.captureScreenshot', {'format': 'png'}, timeout=20)
    data = r['result']['data']
    with open(OUT, 'wb') as f:
        f.write(base64.b64decode(data))
    print('saved', OUT)


if __name__ == '__main__':
    main()
