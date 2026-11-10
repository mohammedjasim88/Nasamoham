"""Small, non-destructive checks for an authorised preview. Requires Python 3 and curl.
Usage: python3 scripts/security_http_smoke.py https://YOUR-PREVIEW.workers.dev
No stress testing, exploit payloads, credentials, paid AI activation or deployment.
"""
import concurrent.futures
import json
import subprocess
import sys
from urllib.parse import urlparse

if len(sys.argv) != 2:
    raise SystemExit('Pass the authorised preview base URL.')
base = sys.argv[1].rstrip('/')
parsed = urlparse(base)
if parsed.scheme != 'https' or parsed.path not in ('', '/') or parsed.query or parsed.fragment:
    raise SystemExit('Expected an HTTPS origin, without a path, query or fragment.')
point = 'lat=23.5946&lon=58.7351&start=2000&end=2025'
checks = [
    ('/', 'GET', None, None, 200),
    ('/api/status', 'GET', None, None, 200),
    ('/api/status', 'POST', None, None, 405),
    ('/api/status', 'GET', None, 'https://untrusted.example', 403),
    ('/api/power?lat=23&lon=58&extra=blocked', 'GET', None, None, 400),
    ('/api/power?lat=23&lat=24&lon=58', 'GET', None, None, 400),
    ('/api/boundaries?level=invalid', 'GET', None, None, 400),
    ('/api/not-real', 'GET', None, None, 404),
    ('/api/power?' + point, 'GET', None, None, 200),
    ('/api/verification?' + point + '&metric=T2M', 'GET', None, None, 200),
    ('/api/boundaries?level=governorates', 'GET', None, None, 200),
    ('/api/ask', 'POST', '{}', None, 501),  # deployed AI binding is intentionally disabled
    ('/api/ask', 'POST', 'x' * 2049, None, 413),
]
security_keys = {'content-security-policy', 'strict-transport-security', 'x-content-type-options',
                 'x-frame-options', 'permissions-policy', 'cache-control', 'allow',
                 'referrer-policy', 'access-control-allow-origin'}


def check(item):
    path, method, body, origin, expected = item
    command = ['curl', '-sS', '--max-time', '30', '-D', '-', '-w', '\nSMOKE_STATUS:%{http_code}',
               '-X', method, base + path]
    if body is not None:
        command += ['-H', 'Content-Type: application/json', '--data-binary', body]
    if origin:
        command += ['-H', 'Origin: ' + origin]
    run = subprocess.run(command, capture_output=True, text=True)
    content, _, status = run.stdout.rpartition('\nSMOKE_STATUS:')
    # Last HTTP header block follows any proxy CONNECT response.
    last_http = content.rfind('HTTP/')
    header_block, _, payload = content[last_http:].partition('\n\n')
    headers = {}
    for line in header_block.splitlines():
        if ':' in line:
            key, value = line.split(':', 1)
            if key.lower() in security_keys:
                headers[key.lower()] = value.strip()
    errors = []
    if run.returncode or status.strip() != str(expected):
        errors.append('Unexpected HTTP result')
    if headers.get('x-content-type-options') != 'nosniff':
        errors.append('Missing nosniff')
    if "frame-ancestors 'none'" not in headers.get('content-security-policy', ''):
        errors.append('Missing frame policy')
    if headers.get('strict-transport-security') != 'max-age=31536000':
        errors.append('Missing expected HSTS')
    if origin and 'access-control-allow-origin' in headers:
        errors.append('Foreign origin was allowed')
    summary = {}
    if path != '/':
        try:
            data = json.loads(payload)
            summary = {key: data[key] for key in ['error', 'code', 'ready', 'modelEnabled', 'cached'] if key in data}
            if isinstance(data.get('years'), list):
                summary['annualRows'] = len(data['years'])
                if len(data['years']) != 26:
                    errors.append('Unexpected annual row count')
            if isinstance(data.get('features'), list):
                summary['polygons'] = len(data['features'])
                if len(data['features']) != 11:
                    errors.append('Unexpected governorate count')
        except ValueError:
            errors.append('Expected JSON')
    return {'path': path, 'method': method, 'bodyBytes': len(body or ''), 'foreignOrigin': bool(origin),
            'expected': expected, 'actual': status.strip(), 'headers': headers,
            'summary': summary, 'passed': not errors, 'errors': errors}


with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    results = list(pool.map(check, checks))
print(json.dumps({'preview': base, 'passed': sum(row['passed'] for row in results),
                  'total': len(results), 'results': results}, indent=2))
raise SystemExit(0 if all(row['passed'] for row in results) else 1)
