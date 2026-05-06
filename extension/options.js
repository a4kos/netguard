const banner = document.getElementById("banner");
const tokenDot = document.getElementById("tokenDot");
const tokenLabel = document.getElementById("tokenLabel");
const tokenInput = document.getElementById("tokenInput");
const saveBtn = document.getElementById("saveBtn");
const clearBtn = document.getElementById("clearBtn");
const toggleVis = document.getElementById("toggleVis");

// ── Helpers ───────────────────────────────────────────────────────────────────

function showBanner(type, msg) {
  banner.className = `banner ${type}`;
  banner.textContent = type === "success" ? `✓  ${msg}` : `✕  ${msg}`;
  clearTimeout(banner._timer);
  banner._timer = setTimeout(() => {
    banner.className = "banner";
  }, 4000);
}

function setTokenStatus(hasToken) {
  if (hasToken) {
    tokenDot.className = "token-dot set";
    tokenLabel.textContent = "Токенът е зададен";
  } else {
    tokenDot.className = "token-dot unset";
    tokenLabel.textContent =
      "Токенът не е зададен — синхронизацията е изключена";
  }
}

// ── Load saved values on open ─────────────────────────────────────────────────

async function load() {
  const { apiToken } = await chrome.storage.sync.get("apiToken");
  setTokenStatus(!!apiToken);
  if (apiToken) {
    // Show masked version so the user knows something is stored
    tokenInput.value = apiToken;
  }

  // Load scan stats
  const { lastScanTime, threats } = await chrome.storage.local.get([
    "lastScanTime",
    "threats"
  ]);

  if (lastScanTime) {
    const d = new Date(lastScanTime);
    document.getElementById("lastScan").textContent = d.toLocaleString("bg-BG");
  }

  document.getElementById("threatCount").textContent = threats
    ? threats.length
    : "0";
}

load();

// ── Save token ────────────────────────────────────────────────────────────────

saveBtn.addEventListener("click", async () => {
  const token = tokenInput.value.trim();

  if (!token) {
    showBanner("error", "Токенът не може да е празен.");
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "Запазва…";

  try {
    await chrome.storage.sync.set({ apiToken: token });
    setTokenStatus(true);
    showBanner("success", "Токенът е запазен успешно.");
  } catch (e) {
    showBanner("error", "Грешка при запазване: " + e.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Запази";
  }
});

// Allow saving with Enter key
tokenInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveBtn.click();
});

// ── Clear token ───────────────────────────────────────────────────────────────

clearBtn.addEventListener("click", async () => {
  if (
    !confirm(
      "Сигурен ли си, че искаш да изчистиш токена? Синхронизацията ще спре."
    )
  ) {
    return;
  }

  await chrome.storage.sync.remove("apiToken");
  tokenInput.value = "";
  setTokenStatus(false);
  showBanner("success", "Токенът е изчистен.");
});
