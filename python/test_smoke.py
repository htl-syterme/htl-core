"""Smoke tests for htl_verify. Run: python3 python/test_smoke.py"""
import base64, hmac, hashlib, json, time, sys
sys.path.insert(0, 'python')
from htl_verify import verify, Untrusted

SECRET = b'test_secret_123'

def make(score, iat=None, exp=None):
    now = int(time.time())
    iat = iat or now
    exp = exp or (now + 120)
    payload = json.dumps({'sub': 'test', 'score': score, 'iat': iat, 'exp': exp, 'nonce': 'x'}).encode()
    p64 = base64.urlsafe_b64encode(payload).rstrip(b'=').decode()
    sig = hmac.new(SECRET, p64.encode('ascii'), hashlib.sha256).digest()
    s64 = base64.urlsafe_b64encode(sig).rstrip(b'=').decode()
    return f'v1.{p64}.{s64}'

def run():
    now = int(time.time())
    assert verify(make(0.88), key=SECRET)['score'] == 0.88
    for label, tok, key, iat, exp, sc in [
        ('wrong secret', make(0.88), b'wrong', None, None, None),
        ('tampered', None, SECRET, None, None, None),
        ('expired', None, SECRET, now-300, now-100, 0.88),
        ('out of bounds', None, SECRET, None, None, 5.0),
    ]:
        if tok is None and label == 'tampered':
            t = make(0.88)
            p = t.split('.')
            p[1] = p[1][:-1] + ('A' if p[1][-1] != 'A' else 'B')
            tok = '.'.join(p)
        elif tok is None:
            tok = make(sc, iat=iat, exp=exp)
        try:
            verify(tok, key=key)
            assert False, f'{label} should have failed'
        except Untrusted:
            pass
    print('5/5 tests OK')

if __name__ == '__main__':
    run()
