"""Bounded production proof; synthetic sessions only, tokens never leave memory."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import json
import time
import urllib.request
import urllib.error
from pathlib import Path

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None

parser = argparse.ArgumentParser()
parser.add_argument("--origin", required=True)
parser.add_argument("--output", required=True, type=Path)
args = parser.parse_args()
assert args.origin.startswith("https://")
opener = urllib.request.build_opener(NoRedirect)
def request(path, method="GET", body=None, token=None):
    headers = {"User-Agent": "STELE-release-verifier/1.2.0", "Content-Type": "application/json", "Origin": "https://stele.mazzeleczzare.com"}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(args.origin + path, method=method,
        headers=headers, data=json.dumps(body).encode() if body is not None else None)
    try:
        with opener.open(req, timeout=20) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as exc:
        return exc.code, None

def require(path, method="GET", body=None, token=None, status=200):
    actual, value = request(path, method, body, token)
    if actual != status:
        raise RuntimeError(f"{method} request expected {status}, received {actual}")
    return value

health = require("/health")
for path in ("/api/sessions", "/api/projects", "/api/drift"):
    require(path, status=401)
body = {"sessionMode": "RELEASE_SMOKE", "outputTarget": "claude-ai", "verbosity": "STANDARD",
        "hygieneTrigger": "MANUAL", "hygieneAfterN": 5, "activeProjectIds": []}
sessions = [require("/api/sessions", "POST", body, status=201) for _ in range(2)]
try:
    first, other = sessions
    sid, token = first["session"]["id"], first["token"]
    require(f"/api/sessions/{sid}", token=other["token"], status=401)
    retries = []
    def append(i):
        payload = {"action": "TOBIRA_FIRED", "tobiraId": f"SYNTHETIC-{i}",
                   "tobiraCode": "KAPU-SMOKE", "secretsDetected": False,
                   "integrityHash": "client-supplied-value-must-be-stripped"}
        for attempt in range(10):
            status, value = request(f"/api/sessions/{sid}/events", "POST", payload, token)
            if status == 201:
                assert value["entry"]["integrityHash"] != payload["integrityHash"]
                return attempt
            if status != 409:
                raise RuntimeError(f"append received HTTP {status}")
            time.sleep(0.05 * (attempt + 1))
        raise RuntimeError("bounded serialization retries exhausted")
    with ThreadPoolExecutor(max_workers=4) as pool:
        retries = list(pool.map(append, range(12)))
    verification = require(f"/api/sessions/{sid}/verify", token=token)["verification"]
    assert verification == {"valid": True, "entries": 12}, verification
    require(f"/api/sessions/{sid}/events", "POST", {"action": "TOBIRA_FIRED", "secretsDetected": "not-a-boolean"}, token, status=400)
finally:
    for session in sessions:
        require(f"/api/sessions/{session['session']['id']}/end", "PATCH",
                {"integrityState": "ZANSHIN", "firedTobiraIds": []}, session["token"])
require(f"/api/sessions/{sid}/events", "POST", {"action": "TOBIRA_FIRED"}, token, status=409)
result = {"health": health["status"], "version": health.get("version"),
          "admin_paths_unauthenticated": 401, "cross_session_token": 401,
          "concurrent_appends": 12, "serialization_retries": sum(retries),
          "verification": verification, "malformed_boolean": 400,
          "closed_session_append": 409, "synthetic_sessions_closed": 2,
          "scope": "synthetic ledger traffic; no existing sessions read or modified"}
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
