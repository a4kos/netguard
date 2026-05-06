const DASHBOARD_URL = "https://netguard.noit.eu";

const SEVERITY_BG = {
  critical: "критичен",
  high: "висок",
  medium: "среден",
  low: "нисък"
};

async function getToken() {
  const { apiToken } = await chrome.storage.sync.get("apiToken");
  return apiToken || "";
}

document.addEventListener("DOMContentLoaded", async () => {
  const $ = (id) => document.getElementById(id);

  await refreshUI();

  $("scanBtn").addEventListener("click", async () => {
    const btn = $("scanBtn");
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>Сканиране…';
    setStatus("scanning", "Сканира…");

    chrome.runtime.sendMessage({ type: "START_SCAN" }, async () => {
      await refreshUI();
      btn.disabled = false;
      btn.textContent = "Сканирай";
    });
  });

  $("dashboardBtn").addEventListener("click", async () => {
    const token = await getToken();
    chrome.tabs.create({ url: `${DASHBOARD_URL}#token=${token}` });
  });

  $("desktopHint").addEventListener("click", async () => {
    const token = await getToken();
    chrome.tabs.create({ url: `${DASHBOARD_URL}#token=${token}` });
  });
});

async function refreshUI() {
  const data = await chrome.storage.local.get([
    "threats",
    "scannedCount",
    "lastScanTime"
  ]);
  const threats = data.threats || [];
  const scanned = data.scannedCount || 0;
  const critical = threats.filter((t) => t.severity === "critical").length;

  document.getElementById("scannedCount").textContent = scanned;
  document.getElementById("threatCount").textContent = threats.length;

  const critEl = document.getElementById("criticalCount");
  critEl.textContent = critical;
  critEl.classList.toggle("has-threat", critical > 0);

  if (data.lastScanTime) {
    const d = new Date(data.lastScanTime);
    document.getElementById("lastScan").textContent =
      "Последно: " + d.toLocaleTimeString("bg-BG");
  }

  if (threats.length === 0) {
    setStatus("ok", "Защитен");
  } else if (critical > 0) {
    setStatus("warn", `${critical} критични`);
  } else {
    setStatus("warn", `${threats.length} заплахи`);
  }

  renderThreats(threats);
}

function renderThreats(threats) {
  const list = document.getElementById("threatList");
  const label = document.getElementById("sectionLabel");

  if (threats.length === 0) {
    label.textContent = "Статус";
    list.innerHTML = `
      <div class="empty">
        <div class="empty-icon">✓</div>
        <div class="empty-text">Не са открити подозрителни разширения</div>
      </div>`;
    return;
  }

  label.textContent = `Открити заплахи (${threats.length})`;

  const sorted = [...threats].sort((a, b) => b.riskScore - a.riskScore);
  list.innerHTML = sorted
    .map((t) => {
      const sev = t.severity || "low";
      const sevLabel = SEVERITY_BG[sev] || sev;
      const flags = (t.flags || []).slice(0, 2).join(", ");
      return `
        <div class="threat-card ${sev}">
          <div class="threat-top">
            <span class="threat-name" title="${esc(t.name)}">${esc(t.name)}</span>
            <span class="threat-badge badge-${sev}">${sevLabel}</span>
          </div>
          <div class="threat-meta">Риск ${t.riskScore}/10${flags ? " · " + esc(flags) : ""}</div>
        </div>`;
    })
    .join("");
}

function setStatus(type, text) {
  const pill = document.getElementById("statusPill");
  const label = document.getElementById("statusText");
  pill.className = `status-pill ${type}`;
  label.textContent = text;
}

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
