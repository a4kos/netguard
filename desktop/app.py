import os
import json
import sqlite3
import logging
import threading
import time
import queue
from pathlib import Path
import datetime

from flask import Flask, request, jsonify, send_from_directory, Response, stream_with_context
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from model import RiskModel
from groq_client import get_ai_analysis, get_ai_flag_explanation, get_ai_research, reload_key, validate_key
from threat_intelligence import scan_code, scan_permissions


# ─── CONFIG ──────────────────────────────────────────────────────────────────

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = Path(BASE_DIR) / "netguard.db"
STATIC_DIR = os.path.join(BASE_DIR, "static")
PORT = 5000
MAX_CONTENT_LENGTH = 1 * 1024 * 1024
MAX_SYNC_EXTENSIONS = int(os.environ.get("NETGUARD_MAX_SYNC_EXTENSIONS", "100"))
MAX_STRING_LENGTH = int(os.environ.get("NETGUARD_MAX_STRING_LENGTH", "2000"))
MAX_CODE_LENGTH = int(os.environ.get("NETGUARD_MAX_CODE_LENGTH", "20000"))
ALLOW_INSECURE = os.environ.get("NETGUARD_ALLOW_INSECURE", "0").lower() in ("1", "true", "yes")
ALLOW_ENV_WRITE = os.environ.get("NETGUARD_ALLOW_ENV_WRITE", "0").lower() in ("1", "true", "yes")
RATE_LIMIT_STORAGE_URI = os.environ.get("NETGUARD_RATE_LIMIT_STORAGE_URI", "memory://")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("netguard-api")


# ─── APP & CORS ───────────────────────────────────────────────────────────────

app = Flask(__name__, static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH

CORS(app,
     supports_credentials=True,
     origins=[
         "https://netguard.noit.eu",
         "https://netguard-api.noit.eu",
         "chrome-extension://*",
         "moz-extension://*",
         "safari-web-extension://*",
     ],
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "DELETE", "OPTIONS"],
)

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=[],
    storage_uri=RATE_LIMIT_STORAGE_URI,
)

model = RiskModel(DB_PATH)

def _get_user_token() -> str:
    """Extract the bearer token from the current request."""
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:].strip()
    return ""

@app.before_request
def require_token():
    if not request.path.startswith("/api/"):
        return
    if request.method == "OPTIONS":
        return
    token = _get_user_token()
    if not token:
        if ALLOW_INSECURE:
            log.warning("No token; allowing insecure access because NETGUARD_ALLOW_INSECURE is enabled.")
            return
        return jsonify({"error": "Authorization required."}), 401


# ─── DATABASE ─────────────────────────────────────────────────────────────────

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")

        conn.execute("""
            CREATE TABLE IF NOT EXISTS scans (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                ext_id        TEXT NOT NULL,
                name          TEXT,
                version       TEXT,
                permissions   TEXT,
                host_perms    TEXT,
                description   TEXT,
                risk_score    REAL,
                ml_score      REAL,
                severity      TEXT,
                flags         TEXT,
                ai_summary    TEXT,
                user_token    TEXT,
                scanned_at    TEXT DEFAULT (datetime('now'))
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_ext_id    ON scans(ext_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_scanned   ON scans(scanned_at)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_user_token ON scans(user_token)")

        try:
            conn.execute("ALTER TABLE scans ADD COLUMN user_token TEXT")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_user_token ON scans(user_token)")
            log.info("Migrated: added user_token column to scans.")
        except Exception:
            pass  # Column already exists

        conn.execute("""
            CREATE TABLE IF NOT EXISTS trusted_extensions (
                ext_id          TEXT NOT NULL,
                user_token      TEXT NOT NULL,
                trusted_at      TEXT DEFAULT (datetime('now')),
                trusted_version TEXT,
                PRIMARY KEY (ext_id, user_token)
            )
        """)
        conn.commit()
    log.info(f"Database ready: {DB_PATH}")


init_db()
model.train_from_db(DB_PATH)


# ─── SSE BROADCAST ────────────────────────────────────────────────────────────

_sse_clients: dict[str, list[queue.SimpleQueue]] = {}
_sse_lock = threading.Lock()


def _broadcast(user_token: str, event: str, data: dict):
    """Push a Server-Sent Event only to dashboard clients of this user."""
    msg = f"event: {event}\ndata: {json.dumps(data)}\n\n"
    with _sse_lock:
        queues = _sse_clients.get(user_token, [])
        dead = []
        for q in queues:
            try:
                q.put_nowait(msg)
            except Exception:
                dead.append(q)
        for q in dead:
            queues.remove(q)


# ─── HELPERS ──────────────────────────────────────────────────────────────────

def _severity(score: float) -> str:
    if score >= 7: return "critical"
    if score >= 5: return "high"
    if score >= 3: return "medium"
    return "low"


def _deserialize(d: dict) -> dict:
    for col in ("permissions", "host_perms", "flags"):
        if isinstance(d.get(col), str):
            try:
                d[col] = json.loads(d[col])
            except Exception:
                d[col] = []
    return d


def _sanitize_text(value, max_length: int = MAX_STRING_LENGTH) -> str:
    if not isinstance(value, str):
        return ""
    return value.strip()[:max_length]


def _normalize_list(value, max_items: int = 50):
    if isinstance(value, str):
        try:
            items = json.loads(value)
        except Exception:
            return []
    elif isinstance(value, list):
        items = value
    else:
        return []
    normalized = []
    for item in items:
        if isinstance(item, str):
            s = item.strip()
            if s and len(normalized) < max_items:
                normalized.append(s)
    return normalized


def _validate_sync_payload(data):
    if not isinstance(data, dict):
        return None, "Payload must be a JSON object."
    extensions = data.get("extensions")
    if not isinstance(extensions, list):
        return None, "Payload must include an extensions array."
    if len(extensions) > MAX_SYNC_EXTENSIONS:
        return None, f"Too many extensions; maximum is {MAX_SYNC_EXTENSIONS}."

    sanitized = []
    for ext in extensions:
        if not isinstance(ext, dict):
            continue
        ext_id = ext.get("id")
        if not isinstance(ext_id, str) or not ext_id.strip() or len(ext_id) > 64:
            continue

        safe_ext = {
            "id": ext_id.strip(),
            "name": _sanitize_text(ext.get("name", ""), 128),
            "version": _sanitize_text(ext.get("version", ""), 64),
            "description": _sanitize_text(ext.get("description", ""), 512),
            "permissions": _normalize_list(ext.get("permissions", []), max_items=50),
            "hostPermissions": _normalize_list(ext.get("hostPermissions", []), max_items=50),
            "flags": _normalize_list(ext.get("flags", []), max_items=50),
            "code": _sanitize_text(ext.get("code", ""), MAX_CODE_LENGTH),
        }
        heuristic = ext.get("riskScore")
        if isinstance(heuristic, (int, float)):
            safe_ext["riskScore"] = float(heuristic)
        sanitized.append(safe_ext)

    if not sanitized:
        return None, "No valid extension entries were found."
    return sanitized, None


def _set_security_headers(response):
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "same-origin")
    response.headers.setdefault("Permissions-Policy", "interest-cohort=()")
    response.headers.setdefault("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none';")
    if request.is_secure:
        response.headers.setdefault(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains; preload"
        )
    return response


app.after_request(_set_security_headers)


_last_retrain = 0
_RETRAIN_INTERVAL = 60
_retrain_lock = threading.Lock()

def _retrain_async():
    global _last_retrain
    now = time.time()
    with _retrain_lock:
        if now - _last_retrain < _RETRAIN_INTERVAL:
            return
        _last_retrain = now
    threading.Thread(
        target=model.train_from_db,
        args=(DB_PATH,),
        daemon=True,
        name="ng-retrain",
    ).start()


# ─── HEALTH ───────────────────────────────────────────────────────────────────

@app.route("/api/health")
def health():
    try:
        with sqlite3.connect(DB_PATH) as conn:
            count = conn.execute("SELECT COUNT(*) FROM scans").fetchone()[0]
            trusted = conn.execute("SELECT COUNT(*) FROM trusted_extensions").fetchone()[0]
        return jsonify({
            "ok": True,
            "scans": count,
            "trusted": trusted,
            "model_trained": model.model is not None,
        })
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


# ─── SETUP ────────────────────────────────────────────────────────────────────

@app.route("/api/setup", methods=["POST"])
def setup():
    data = request.get_json(force=True, silent=True) or {}
    key = (data.get("key") or "").strip()

    if not key.startswith("gsk_"):
        return jsonify({"ok": False, "error": "Key must start with 'gsk_'."}), 400
    ok, err = validate_key(key)
    if not ok:
        return jsonify({"ok": False, "error": err}), 400

    if not ALLOW_ENV_WRITE:
        return jsonify({
            "ok": False,
            "error": "Set GROQ_API_KEY in environment instead."
        }), 403

    env_path = os.path.join(BASE_DIR, ".env")
    lines = open(env_path).readlines() if os.path.isfile(env_path) else []
    lines = [l for l in lines if not l.startswith("GROQ_API_KEY=")]
    lines.append(f"GROQ_API_KEY={key}\n")
    with open(env_path, "w") as f:
        f.writelines(lines)

    reload_key()
    log.info("Groq API key saved and reloaded.")
    return jsonify({"ok": True})


# ─── SYNC ─────────────────────────────────────────────────────────────────────

@app.route("/api/sync", methods=["POST"])
def sync():
    data = request.get_json(force=True, silent=True)
    extensions, err = _validate_sync_payload(data)
    if err:
        return jsonify({"error": err}), 400

    user_token = _get_user_token()
    processed = []

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("PRAGMA journal_mode=WAL")
        for ext in extensions:
            ti_perms = scan_permissions(ext.get("permissions", []), ext.get("hostPermissions", []))
            ti_code = scan_code(ext.get("code", ""))
            all_flags = list(set(ext.get("flags", []) + ti_perms["flags"] + ti_code["flags"]))

            ml_score = model.predict(ext)
            heuristic = ext.get("riskScore", 0)
            ti_contrib = ti_perms["risk_contribution"] + ti_code["risk_contribution"]
            raw = 0.5 * heuristic + 0.3 * ti_contrib + 0.2 * (ml_score * 10)
            final = round(min(raw, 10.0), 2)

            conn.execute("""
                INSERT INTO scans
                    (ext_id, name, version, permissions, host_perms,
                     description, risk_score, ml_score, severity, flags, user_token)
                VALUES (?,?,?,?,?,?,?,?,?,?,?)
            """, (
                ext["id"],
                ext.get("name", "Unknown"),
                ext.get("version", ""),
                json.dumps(ext.get("permissions", [])),
                json.dumps(ext.get("hostPermissions", [])),
                ext.get("description", ""),
                final,
                round(ml_score, 4),
                _severity(final),
                json.dumps(all_flags),
                user_token,
            ))

            processed.append({
                "id": ext["id"],
                "name": ext.get("name"),
                "score": final,
                "severity": _severity(final),
            })

        conn.commit()

    _retrain_async()
    _broadcast(user_token, "sync", {
        "synced": len(processed),
        "results": processed,
        "timestamp": data.get("timestamp", datetime.datetime.utcnow().isoformat()),
    })

    log.info(f"Synced {len(processed)} extension(s) for token ...{user_token[-6:]}.")
    return jsonify({"synced": len(processed), "results": processed})


# ─── SERVER-SENT EVENTS ───────────────────────────────────────────────────────

@app.route("/api/events")
def sse_stream():
    user_token = _get_user_token()
    client_q: queue.SimpleQueue = queue.SimpleQueue()

    with _sse_lock:
        if user_token not in _sse_clients:
            _sse_clients[user_token] = []
        _sse_clients[user_token].append(client_q)

    def generate():
        yield "event: connected\ndata: {}\n\n"
        try:
            while True:
                try:
                    msg = client_q.get(timeout=25)
                    yield msg
                except queue.Empty:
                    yield "event: ping\ndata: {}\n\n"
        except GeneratorExit:
            pass
        finally:
            with _sse_lock:
                queues = _sse_clients.get(user_token, [])
                if client_q in queues:
                    queues.remove(client_q)

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ─── STATS ────────────────────────────────────────────────────────────────────

@app.route("/api/stats")
def stats():
    token = _get_user_token()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute("""
            SELECT
                COUNT(DISTINCT ext_id)                                        AS total,
                COUNT(DISTINCT CASE WHEN severity='critical' THEN ext_id END) AS critical,
                COUNT(DISTINCT CASE WHEN severity='high'     THEN ext_id END) AS high,
                COUNT(DISTINCT CASE WHEN severity='medium'   THEN ext_id END) AS medium,
                COUNT(DISTINCT CASE WHEN severity='low'      THEN ext_id END) AS low
            FROM scans
            WHERE user_token = ?
        """, (token,)).fetchone()
    return jsonify(dict(row))


@app.route("/api/deep-stats")
def deep_stats():
    token = _get_user_token()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row

        latest_join = """
            JOIN (
                SELECT ext_id, MAX(scanned_at) AS latest
                FROM scans WHERE user_token = :tok
                GROUP BY ext_id
            ) l ON s.ext_id = l.ext_id AND s.scanned_at = l.latest
        """

        avg_row = conn.execute(
            f"SELECT AVG(s.risk_score) AS avg_score, MAX(s.risk_score) AS max_score, MIN(s.risk_score) AS min_score FROM scans s {latest_join} WHERE s.user_token = :tok",
            {"tok": token}
        ).fetchone()

        dist_row = conn.execute(
            f"""SELECT
                SUM(CASE WHEN s.risk_score < 3 THEN 1 ELSE 0 END) AS low_count,
                SUM(CASE WHEN s.risk_score >= 3 AND s.risk_score < 5 THEN 1 ELSE 0 END) AS medium_count,
                SUM(CASE WHEN s.risk_score >= 5 AND s.risk_score < 7 THEN 1 ELSE 0 END) AS high_count,
                SUM(CASE WHEN s.risk_score >= 7 THEN 1 ELSE 0 END) AS critical_count
            FROM scans s {latest_join} WHERE s.user_token = :tok""",
            {"tok": token}
        ).fetchone()

        scan_count = conn.execute("SELECT COUNT(*) AS c FROM scans WHERE user_token=?", (token,)).fetchone()["c"]
        time_rows = conn.execute(
            "SELECT MIN(scanned_at) AS first_scan, MAX(scanned_at) AS last_scan FROM scans WHERE user_token=?",
            (token,)
        ).fetchone()

        flag_counter: dict = {}
        for row in conn.execute("SELECT flags FROM scans WHERE user_token=?", (token,)).fetchall():
            for f in json.loads(row["flags"] or "[]"):
                flag_counter[f] = flag_counter.get(f, 0) + 1
        top_flags = sorted(flag_counter.items(), key=lambda x: x[1], reverse=True)[:8]

        perm_counter: dict = {}
        for row in conn.execute("SELECT permissions FROM scans WHERE user_token=?", (token,)).fetchall():
            for p in json.loads(row["permissions"] or "[]"):
                perm_counter[p] = perm_counter.get(p, 0) + 1
        top_perms = sorted(perm_counter.items(), key=lambda x: x[1], reverse=True)[:8]

        new_exts = conn.execute("""
            SELECT COUNT(DISTINCT ext_id) AS c FROM scans
            WHERE user_token=? AND scanned_at >= datetime('now','-1 day')
              AND ext_id NOT IN (SELECT DISTINCT ext_id FROM scans WHERE user_token=? AND scanned_at < datetime('now','-1 day'))
        """, (token, token)).fetchone()["c"]

        removed_exts = conn.execute("""
            SELECT COUNT(DISTINCT ext_id) AS c FROM scans
            WHERE user_token=? AND scanned_at < datetime('now','-1 day')
              AND ext_id NOT IN (SELECT DISTINCT ext_id FROM scans WHERE user_token=? AND scanned_at >= datetime('now','-1 day'))
        """, (token, token)).fetchone()["c"]

        worst = conn.execute(
            "SELECT name, risk_score, severity FROM scans WHERE user_token=? ORDER BY risk_score DESC LIMIT 1",
            (token,)
        ).fetchone()

        scan_trend = conn.execute("""
            SELECT date(scanned_at) AS day, COUNT(DISTINCT ext_id) AS ext_count
            FROM scans WHERE user_token=? AND scanned_at >= datetime('now','-7 days')
            GROUP BY day ORDER BY day ASC
        """, (token,)).fetchall()

        ml_avg = conn.execute(
            f"SELECT AVG(s.ml_score) AS avg_ml FROM scans s {latest_join} WHERE s.user_token = :tok",
            {"tok": token}
        ).fetchone()

    return jsonify({
        "avg_score": round(avg_row["avg_score"] or 0, 2),
        "max_score": round(avg_row["max_score"] or 0, 2),
        "min_score": round(avg_row["min_score"] or 0, 2),
        "avg_ml_score": round((ml_avg["avg_ml"] or 0) * 100, 1),
        "total_scan_events": scan_count,
        "first_scan": time_rows["first_scan"] or "—",
        "last_scan": time_rows["last_scan"] or "—",
        "new_last_24h": new_exts,
        "removed_last_24h": removed_exts,
        "worst_ever": dict(worst) if worst else None,
        "top_flags": [{"flag": f, "count": c} for f, c in top_flags],
        "top_perms": [{"perm": p, "count": c} for p, c in top_perms],
        "score_dist": {
            "low":      dist_row["low_count"] or 0,
            "medium":   dist_row["medium_count"] or 0,
            "high":     dist_row["high_count"] or 0,
            "critical": dist_row["critical_count"] or 0,
        },
        "scan_trend": [{"day": r["day"], "count": r["ext_count"]} for r in scan_trend],
    })


@app.route("/api/threats")
def threats():
    token = _get_user_token()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute("""
            SELECT s.* FROM scans s
            JOIN (SELECT ext_id, MAX(scanned_at) AS latest FROM scans WHERE user_token=? GROUP BY ext_id) l
              ON s.ext_id = l.ext_id AND s.scanned_at = l.latest
            WHERE s.risk_score >= 3 AND s.user_token = ?
            ORDER BY s.risk_score DESC
        """, (token, token)).fetchall()
    return jsonify([_deserialize(dict(r)) for r in rows])


@app.route("/api/all-extensions")
def all_extensions():
    token = _get_user_token()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute("""
            SELECT s.* FROM scans s
            JOIN (SELECT ext_id, MAX(scanned_at) AS latest FROM scans WHERE user_token=? GROUP BY ext_id) l
              ON s.ext_id = l.ext_id AND s.scanned_at = l.latest
            WHERE s.user_token = ?
            ORDER BY s.risk_score DESC
        """, (token, token)).fetchall()
    return jsonify([_deserialize(dict(r)) for r in rows])


@app.route("/api/history/<ext_id>")
def history(ext_id):
    token = _get_user_token()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT risk_score, ml_score, severity, scanned_at FROM scans "
            "WHERE ext_id=? AND user_token=? ORDER BY scanned_at DESC LIMIT 30",
            (ext_id, token)
        ).fetchall()
    return jsonify([dict(r) for r in rows])


@app.route("/api/trusted")
def get_trusted():
    token = _get_user_token()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT ext_id, trusted_version, trusted_at FROM trusted_extensions WHERE user_token=?",
            (token,)
        ).fetchall()
    return jsonify([dict(r) for r in rows])


@app.route("/api/trust/<ext_id>", methods=["POST"])
def trust(ext_id):
    token = _get_user_token()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT version FROM scans WHERE ext_id=? AND user_token=? ORDER BY scanned_at DESC LIMIT 1",
            (ext_id, token)
        ).fetchone()
        if not row:
            return jsonify({"error": "Extension not found"}), 404
        conn.execute("""
            INSERT INTO trusted_extensions (ext_id, user_token, trusted_version)
            VALUES (?,?,?)
            ON CONFLICT(ext_id, user_token) DO UPDATE SET
                trusted_at=datetime('now'),
                trusted_version=excluded.trusted_version
        """, (ext_id, token, row["version"]))
        conn.commit()
    log.info(f"Trusted: {ext_id}")
    return jsonify({"ok": True, "ext_id": ext_id})


@app.route("/api/trust/<ext_id>", methods=["DELETE"])
def untrust(ext_id):
    token = _get_user_token()
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("DELETE FROM trusted_extensions WHERE ext_id=? AND user_token=?", (ext_id, token))
        conn.commit()
    return jsonify({"ok": True, "ext_id": ext_id})


@app.route("/api/delta")
def delta():
    token = _get_user_token()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute("""
            SELECT e.ext_id, e.name,
                   e.risk_score AS current_score, e.severity AS current_severity, e.scanned_at AS current_at,
                   p.risk_score AS prev_score, p.scanned_at AS prev_at
            FROM scans e
            JOIN (SELECT ext_id, MAX(scanned_at) AS latest FROM scans WHERE user_token=? GROUP BY ext_id) l
              ON e.ext_id = l.ext_id AND e.scanned_at = l.latest
            JOIN scans p ON p.ext_id = e.ext_id AND p.user_token = e.user_token
            JOIN (
                SELECT ext_id, MAX(scanned_at) AS prev
                FROM scans
                WHERE user_token=? AND scanned_at < (
                    SELECT MAX(scanned_at) FROM scans s2 WHERE s2.ext_id = scans.ext_id AND s2.user_token = scans.user_token
                )
                GROUP BY ext_id
            ) pl ON p.ext_id = pl.ext_id AND p.scanned_at = pl.prev
            WHERE e.user_token = ? AND (e.risk_score - p.risk_score) >= 2
            ORDER BY (e.risk_score - p.risk_score) DESC
        """, (token, token, token)).fetchall()

    return jsonify([{
        "ext_id": r["ext_id"],
        "name": r["name"],
        "current_score": round(r["current_score"], 2),
        "prev_score": round(r["prev_score"], 2),
        "delta": round(r["current_score"] - r["prev_score"], 2),
        "current_severity": r["current_severity"],
        "current_at": r["current_at"],
    } for r in rows])


@app.route("/api/analyze/<ext_id>", methods=["POST"])
@limiter.limit("10 per minute")
def analyze(ext_id):
    token = _get_user_token()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM scans WHERE ext_id=? AND user_token=? ORDER BY scanned_at DESC LIMIT 1",
            (ext_id, token)
        ).fetchone()
    if not row:
        return jsonify({"error": "Extension not found"}), 404

    ext_data = _deserialize(dict(row))
    summary = get_ai_analysis(ext_data)

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            UPDATE scans SET ai_summary=?
            WHERE ext_id=? AND user_token=? AND scanned_at=(
                SELECT MAX(scanned_at) FROM scans WHERE ext_id=? AND user_token=?
            )
        """, (summary, ext_id, token, ext_id, token))
        conn.commit()

    return jsonify({"summary": summary})


@app.route("/api/explain/<ext_id>", methods=["POST"])
@limiter.limit("10 per minute")
def explain(ext_id):
    token = _get_user_token()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM scans WHERE ext_id=? AND user_token=? ORDER BY scanned_at DESC LIMIT 1",
            (ext_id, token)
        ).fetchone()
    if not row:
        return jsonify({"error": "Extension not found"}), 404
    return jsonify({"explanation": get_ai_flag_explanation(_deserialize(dict(row)))})


@app.route("/api/research/<ext_id>", methods=["POST"])
@limiter.limit("5 per minute")
def research(ext_id):
    token = _get_user_token()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM scans WHERE ext_id=? AND user_token=? ORDER BY scanned_at DESC LIMIT 1",
            (ext_id, token)
        ).fetchone()
    if not row:
        return jsonify({"error": "Extension not found"}), 404
    return jsonify(get_ai_research(_deserialize(dict(row))))


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path.startswith(".."):
        return jsonify({"error": "Not found."}), 404
    candidate = os.path.join(STATIC_DIR, path)
    if path and os.path.exists(candidate) and os.path.isfile(candidate):
        return send_from_directory(STATIC_DIR, path)
    return send_from_directory(STATIC_DIR, "index.html")


if __name__ == "__main__":
    log.info(f"Starting Net Guard dev server on port {PORT}")
    app.run(host="0.0.0.0", port=PORT, debug=False, use_reloader=False)
