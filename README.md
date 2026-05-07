# Net Guard

AI-powered browser extension security monitor.

Each component works independently. The extension scans on its own. The web app adds ML scoring, ThreatIntelligence pattern matching, and Groq AI analysis when running.

---

## Architecture

```
extension/                  Chrome Extension (fully standalone)
  manifest.json
  background.js             Scans installed extensions, heuristic scoring, syncs to web app
  popup.html / popup.js     Toolbar popup — shows threats, triggers scans
  content.js                Injects page monitor
  inject.js                 Intercepts eval() and dynamic script injection

desktop/                    Python Web App (optional, enhances extension)
  app.py                    Flask server
  model.py                  IsolationForest ML model (sklearn)
  groq_client.py            Groq AI analysis — stdlib http.client only, no SDK
  threat_intelligence.py    Regex pattern database for known malicious JS
  templates/
    dashboard.html          Web dashboard
  requirements.txt
  netguard.spec             PyInstaller build config
  build.bat                 One-click Windows build script
  .env.example              API key template
```

---

## How It Works

### Threat Scoring Pipeline

Every extension gets scored by three layers:

| Layer                | Weight | Method                                                    |
| -------------------- | ------ | --------------------------------------------------------- |
| Heuristic            | 50%    | Declared permissions scored by risk level                 |
| Threat Intelligence  | 30%    | Regex patterns: crypto miners, keyloggers, C2 comms, etc. |
| ML (IsolationForest) | 20%    | Anomaly detection vs historical baseline                  |

**Final score 0–10:** 0–2 Low · 3–4 Medium · 5–6 High · 7+ Critical

The ML model bootstraps itself on synthetic data immediately and improves as real scan data accumulates in SQLite.

### Groq AI Analysis

On demand (click "Analyse" in the dashboard), Groq's `llama-3.3-70b-versatile` produces a 3-sentence plain-English assessment: what the extension can do, why the ML flagged it, and what to do about it.

Uses only Python's built-in `http.client` — no SDK, no extra packages, no PyInstaller headaches.

---

## Quick Start

### 1 — Chrome Extension (works alone, no Python needed)

1. Open Chrome → `chrome://extensions`
2. Enable **Developer Mode** (toggle, top-right)
3. **Load unpacked** → select the `extension/` folder
4. Click the Net Guard icon in your toolbar
5. Click **Scan Now**

That's it. Results appear in the popup immediately.

---

### 2 — Desktop App (ML + AI + dashboard)

**Install:**

```bash
cd desktop
pip install -r requirements.txt

cp .env.example .env
# Edit .env — paste your free Groq API key from console.groq.com
```

**Run:**

```bash
python app.py
# Browser opens automatically at http://https://netguard-api.noit.eu
```

Once running, the Chrome extension detects it automatically and sends scan results there for ML scoring and AI analysis. When the desktop app is not running, the extension continues working normally.

---

### 3 — Build the .exe (Windows)

```
cd desktop
build.bat
```

---

## Tests

### Python Backend

Located in `desktop/tests/`.

```bash
cd desktop
pip install -r requirements.txt
pytest
```

### React Frontend

Located in `desktop/react-app/tests/`.

```bash
cd desktop/react-app
npm install
npm test
```

### Browser Extension

No automated tests. Manual testing recommended.

Output: `dist\NetGuard\NetGuard.exe`

Distribute the entire `dist\NetGuard\` folder — the `.exe` on its own won't run without the DLLs beside it.

**Troubleshooting .exe crashes:**

| Symptom                        | Cause                    | Fix                                                                                  |
| ------------------------------ | ------------------------ | ------------------------------------------------------------------------------------ |
| Blank crash on double-click    | Can't see the error      | Run from `cmd.exe` instead                                                           |
| `ModuleNotFoundError: sklearn` | Hidden import missing    | Already fixed in `netguard.spec`                                                     |
| `ModuleNotFoundError: model`   | `pathex` not set         | Already fixed in `netguard.spec`                                                     |
| `Missing DLL`                  | Visual C++ not installed | Install [Visual C++ Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe) |
| `Port 5000 in use`             | Another app has 5000     | Change `PORT = 5000` in `app.py`                                                     |

---

## Why These Tech Choices

### No eventlet / SocketIO

`eventlet.monkey_patch()` creates `RLock` objects before PyInstaller's bootloader finishes. These locks can't be patched after the fact, causing silent crashes in frozen executables. This is a [known, unfixable issue](https://github.com/eventlet/eventlet/issues/702). The dashboard polls `/api/*` every 30 seconds instead — no real-time push needed for this use case.

### No TensorFlow / Keras

The autoencoder in the original codebase had broken Python syntax (floating `loss='mse'` statement, methods nested inside other methods, `ae = BehaviorAutoencoder()` called at module level mid-class-definition). Even if fixed, TensorFlow adds 500MB to the `.exe` and is notoriously difficult to bundle. `sklearn.ensemble.IsolationForest` achieves the same anomaly detection goal in ~5MB.

### No openai SDK

The SDK pulls in `httpx`, which has proxy-detection code that conflicts with PyInstaller's frozen environment. `groq_client.py` uses Python's built-in `http.client` directly — it's 60 lines, zero external deps, and works identically.

### No PostgreSQL

SQLite ships in Python's standard library, requires no server process, and stores data in a single portable `.db` file next to the `.exe`. Perfect for a local desktop tool.

### No PyQt6 GUI

Running a Qt event loop and a Flask server in the same Python process requires threading hacks. The web dashboard at `https://netguard-api.noit.eu` provides a better UI anyway and works on any OS without OS-specific Qt packages.

---

## Configuration

| File                                         | Setting                              |
| -------------------------------------------- | ------------------------------------ |
| `desktop/.env`                               | `GROQ_API_KEY=gsk_...`               |
| `desktop/app.py` line `PORT = 5000`          | Change port if 5000 is taken         |
| `extension/background.js` line `DESKTOP_URL` | Change if app runs on different port |

---

## Privacy

- All scan data stays on your machine
- Groq API calls send only: extension name, permissions list, ML score, risk flags
- No data is logged by Groq beyond the request/response cycle
- SQLite DB: `desktop/netguard.db` (local only)
- Extension storage: `chrome.storage.local` (local only)
