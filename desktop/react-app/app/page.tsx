"use client";

import { useState, useEffect, useCallback } from "react";
import type { Extension, Stats } from "@/lib/types";
import OverviewView from "@/components/netguard/OverviewView";
import ThreatsView from "@/components/netguard/ThreatsView";
import AllExtensionsView from "@/components/netguard/AllExtensionsView";
import StatisticsView from "@/components/netguard/StatisticsView";
import DetailPanel from "@/components/netguard/DetailPanel";

type ViewId = "overview" | "threats" | "all" | "statview";

const NAV_ITEMS: { id: ViewId; icon: string; label: string }[] = [
  { id: "overview", icon: "◈", label: "Общ преглед" },
  { id: "threats", icon: "⚠", label: "Заплахи" },
  { id: "all", icon: "☰", label: "Всички разширения" },
  { id: "statview", icon: "◉", label: "Статистика" }
];

function getStoredToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("ng_token") ?? "";
}

function makeHeaders(token: string): HeadersInit {
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

export default function Dashboard() {
  const [view, setView] = useState<ViewId>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [threats, setThreats] = useState<Extension[]>([]);
  const [allExts, setAllExts] = useState<Extension[]>([]);
  const [lastUpdated, setLastUpdated] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [activeExt, setActiveExt] = useState<Extension | null>(null);
  const [token, setToken] = useState<string>("");

  // ── 1. Extract token from URL hash on first load, save to localStorage
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#token=")) {
      const t = decodeURIComponent(hash.slice(7));
      localStorage.setItem("ng_token", t);
      window.history.replaceState(null, "", window.location.pathname);
      setToken(t);
    } else {
      setToken(localStorage.getItem("ng_token") ?? "");
    }
  }, []);

  // ── 2. Fetch data — token is a dependency so it re-runs when token arrives
  const loadAll = useCallback(async (tok: string) => {
    if (!tok) return;
    const headers = makeHeaders(tok);
    try {
      const [s, t, a] = await Promise.all([
        fetch("/api/proxy/stats", { headers }).then((r) => r.json()),
        fetch("/api/proxy/threats", { headers }).then((r) => r.json()),
        fetch("/api/proxy/all-extensions", { headers }).then((r) => r.json())
      ]);
      setStats(s);
      setThreats(t);
      setAllExts(a);
      setLoadError(false);
      setLastUpdated(
        "Последно обновено: " + new Date().toLocaleTimeString("bg-BG")
      );
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    loadAll(token);
    const interval = setInterval(() => loadAll(token), 30_000);
    return () => clearInterval(interval);
  }, [token, loadAll]);

  // ── 3. Clock ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => setCurrentTime(new Date().toLocaleTimeString("bg-BG"));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const headerStatusText = !token
    ? "Отвори таблото от разширението"
    : loadError
      ? "Грешка при зареждане"
      : allExts.length > 0
        ? `${allExts.length} разширения проследени`
        : "Свързване…";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr",
        minHeight: "100vh",
        fontFamily: "'JetBrains Mono',monospace",
        background: "#080b0f",
        color: "#cdd9e5"
      }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.05) 2px,rgba(0,0,0,0.05) 4px)",
          pointerEvents: "none",
          zIndex: 9999
        }}
      />

      <header
        style={{
          borderBottom: "1px solid #1c2535",
          background: "#0d1117",
          padding: "0 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "56px",
          position: "relative",
          zIndex: 10
        }}
      >
        <div
          style={{
            fontFamily: "'Syne',sans-serif",
            fontSize: "18px",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "#39d0ff"
          }}
        >
          NET<span style={{ color: "#cdd9e5" }}>GUARD</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            fontSize: "11px",
            color: "#495970"
          }}
        >
          <span>
            <span
              style={{
                display: "inline-block",
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: token ? "#23d18b" : "#f14c4c",
                marginRight: "6px",
                verticalAlign: "middle",
                animation: "ng-blink 1.8s infinite"
              }}
            />
            НА ЖИВО
          </span>
          <span>{currentTime}</span>
          <span>{headerStatusText}</span>
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "220px 1fr",
          height: "calc(100vh - 56px)",
          overflow: "hidden",
          position: "relative",
          zIndex: 1
        }}
      >
        <nav
          style={{
            borderRight: "1px solid #1c2535",
            background: "#0d1117",
            display: "flex",
            flexDirection: "column",
            padding: "20px 0",
            gap: "2px",
            overflowY: "auto"
          }}
        >
          <div
            style={{
              fontSize: "9px",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: "#495970",
              padding: "8px 20px 4px"
            }}
          >
            Изгледи
          </div>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "9px 20px",
                cursor: "pointer",
                fontSize: "12px",
                color: view === item.id ? "#39d0ff" : "#495970",
                background:
                  view === item.id ? "rgba(57,208,255,0.07)" : "transparent",
                borderLeft: `2px solid ${view === item.id ? "#39d0ff" : "transparent"}`,
                fontFamily: "'JetBrains Mono',monospace",
                transition: "all 0.12s",
                textAlign: "left",
                width: "100%"
              }}
            >
              <span
                style={{ fontSize: "14px", width: "18px", textAlign: "center" }}
              >
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}

          <div
            style={{
              marginTop: "auto",
              padding: "16px 20px",
              borderTop: "1px solid #1c2535"
            }}
          >
            <div
              style={{
                fontSize: "9px",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: "#495970",
                marginBottom: "8px"
              }}
            >
              Обобщение
            </div>
            {[
              { label: "Критични", value: stats?.critical, color: "#f14c4c" },
              { label: "Високи", value: stats?.high, color: "#e8834a" },
              { label: "Средни", value: stats?.medium, color: "#e5c07b" },
              { label: "Сканирани", value: stats?.total, color: "#cdd9e5" }
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "5px 0",
                  fontSize: "11px"
                }}
              >
                <span style={{ color: "#495970" }}>{s.label}</span>
                <span style={{ fontWeight: 500, color: s.color }}>
                  {s.value ?? "—"}
                </span>
              </div>
            ))}
          </div>
        </nav>

        <main
          style={{
            overflowY: "auto",
            padding: "28px 32px",
            display: "flex",
            flexDirection: "column",
            gap: "24px"
          }}
        >
          {view === "overview" && (
            <OverviewView
              stats={stats}
              threats={threats}
              onOpenDetail={setActiveExt}
              lastUpdated={lastUpdated}
            />
          )}
          {view === "threats" && (
            <ThreatsView threats={threats} onOpenDetail={setActiveExt} />
          )}
          {view === "all" && (
            <AllExtensionsView
              extensions={allExts}
              onOpenDetail={setActiveExt}
            />
          )}
          {view === "statview" && (
            <StatisticsView active={view === "statview"} />
          )}
        </main>
      </div>

      {activeExt && (
        <DetailPanel ext={activeExt} onClose={() => setActiveExt(null)} />
      )}

      <style>{`
        @keyframes ng-blink { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes ng-spin   { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a3a4d; border-radius: 3px; }
      `}</style>
    </div>
  );
}
