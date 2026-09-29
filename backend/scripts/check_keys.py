import os, urllib.request, urllib.error
from pathlib import Path

env_path = Path(__file__).resolve().parents[1] / "test.env"   # backend/test.env
print("Looking for:", env_path, "| exists:", env_path.exists())

if env_path.exists():
    for line in env_path.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

HINTS = {401: "key is invalid or mistyped", 403: "key not allowed (API not enabled, or region blocked)",
         404: "wrong URL", 429: "no quota / no billing credit on this key"}

def check(name, url, make_headers):
    key = os.environ.get(name, "")
    print(f"\n{name}: " + (f"set ({len(key)} characters)" if key else "MISSING"))
    if not key:
        return
    try:
        req = urllib.request.Request(url, headers=make_headers(key))
        with urllib.request.urlopen(req, timeout=20) as r:
            print("  HTTP", r.status, "-> the key works")
    except urllib.error.HTTPError as e:
        print("  HTTP", e.code, "->", HINTS.get(e.code, "unexpected error"))
    except Exception as e:
        print("  Network problem:", type(e).__name__, "- check internet/VPN/firewall")

check("OPENAI_API_KEY", "https://api.openai.com/v1/models", lambda k: {"Authorization": "Bearer " + k})
check("OPENROUTER_API_KEY", "https://openrouter.ai/api/v1/models", lambda k: {"Authorization": "Bearer " + k})
check("GEMINI_API_KEY", "https://generativelanguage.googleapis.com/v1beta/models", lambda k: {"x-goog-api-key": k})