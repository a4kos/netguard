const DESKTOP_URL = "https://netguard.noit.eu";
const SCAN_INTERVAL_MINUTES = 5;

// ─── TOKEN ────────────────────────────────────────────────────────────────────
// Each installation gets a unique token generated on first install.
// It is stored in chrome.storage.sync and never leaves the browser except as
// the Authorization header sent to the API. No token is ever hardcoded.

async function getToken() {
  let { apiToken } = await chrome.storage.sync.get("apiToken");
  if (!apiToken) {
    apiToken = "ng-" + crypto.randomUUID();
    await chrome.storage.sync.set({ apiToken });
    console.log("[Net Guard] New unique token generated.");
  }
  return apiToken;
}

// ─────────────────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("security_scan", {
    periodInMinutes: SCAN_INTERVAL_MINUTES
  });
  console.log("[Net Guard] Installed. Periodic scan scheduled.");
  runScan();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "security_scan") runScan();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "START_SCAN") {
    runScan().then(() => sendResponse({ status: "done" }));
    return true;
  }

  if (request.type === "GET_STATE") {
    chrome.storage.local.get(
      ["threats", "lastScanTime", "scannedCount"],
      sendResponse
    );
    return true;
  }

  if (request.type === "BEHAVIORAL_SIGNAL") {
    recordBehavioralSignal(request.detail);
  }
});

async function runScan() {
  console.log("[Net Guard] Scanning extensions...");

  const extensions = await chrome.management.getAll();
  const candidates = extensions.filter(
    (e) => e.enabled && e.type === "extension" && e.id !== chrome.runtime.id
  );

  const results = candidates.map(scoreExtension);
  const threats = results.filter((r) => r.riskScore >= 3);

  await chrome.storage.local.set({
    threats,
    allExtensions: results,
    scannedCount: candidates.length,
    lastScanTime: new Date().toISOString()
  });

  const critical = threats.filter((t) => t.riskScore >= 7);
  if (critical.length > 0) {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon48.png",
      title: "Net Guard — Threat Detected",
      message: `${critical.length} high-risk extension(s) found. Open Net Guard for details.`
    });
  }

  await syncToDesktop(results);

  console.log(
    `[Net Guard] Scan complete. ${threats.length} threat(s) from ${candidates.length} extensions.`
  );
}

const RISKY_PERMISSIONS = {
  debugger: 4,
  nativeMessaging: 3,
  proxy: 3,
  webRequest: 2,
  webRequestBlocking: 2,
  cookies: 2,
  history: 2,
  tabs: 1,
  bookmarks: 1,
  downloads: 1
};

const RISKY_HOST_PATTERNS = [
  { pattern: /<all_urls>/, weight: 3, label: "Access to all websites" },
  { pattern: /https?:\/\/\*/, weight: 2, label: "Broad HTTP access" }
];

function scoreExtension(ext) {
  let score = 0;
  const flags = [];

  (ext.permissions || []).forEach((p) => {
    if (RISKY_PERMISSIONS[p]) {
      score += RISKY_PERMISSIONS[p];
      flags.push(`Permission: ${p}`);
    }
  });

  (ext.hostPermissions || []).forEach((h) => {
    RISKY_HOST_PATTERNS.forEach(({ pattern, weight, label }) => {
      if (pattern.test(h)) {
        score += weight;
        flags.push(label);
      }
    });
  });

  if (!ext.description || ext.description.trim().length < 10) {
    score += 1;
    flags.push("No description");
  }

  const uniqueFlags = [...new Set(flags)];

  return {
    id: ext.id,
    name: ext.name,
    description: ext.description || "",
    version: ext.version,
    permissions: ext.permissions || [],
    hostPermissions: ext.hostPermissions || [],
    riskScore: Math.min(score, 10),
    flags: uniqueFlags,
    severity: scoreSeverity(score),
    detectedAt: new Date().toISOString()
  };
}

function scoreSeverity(score) {
  if (score >= 7) return "critical";
  if (score >= 5) return "high";
  if (score >= 3) return "medium";
  return "low";
}

async function syncToDesktop(extensions) {
  const token = await getToken();

  try {
    const resp = await fetch(`${DESKTOP_URL}/api/proxy/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ extensions, timestamp: new Date().toISOString() }),
      signal: AbortSignal.timeout(5000)
    });

    if (resp.ok) {
      console.log("[Net Guard] Synced to desktop app.");
    } else {
      const body = await resp.text().catch(() => "(unreadable)");
      console.warn(`[Net Guard] Sync failed — HTTP ${resp.status}: ${body}`);
    }
  } catch (err) {
    console.warn("[Net Guard] Desktop app not reachable:", err.message);
  }
}

async function recordBehavioralSignal(detail) {
  const { signals = [] } = await chrome.storage.local.get("signals");
  signals.unshift({ ...detail, time: new Date().toISOString() });
  await chrome.storage.local.set({ signals: signals.slice(0, 100) });
  syncToDesktop([{ type: "behavioral_signal", detail }]).catch(() => {});
}
