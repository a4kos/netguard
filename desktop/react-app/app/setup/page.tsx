"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api";

export default function SetupPage() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [status, setStatus] = useState<{
    type: "err" | "ok";
    text: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [inputState, setInputState] = useState<"" | "error" | "success">("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function saveKey() {
    setStatus(null);
    setInputState("");
    const trimmed = key.trim();

    if (!trimmed) {
      setStatus({
        type: "err",
        text: "Моля, въведи API ключ преди да продължиш."
      });
      inputRef.current?.focus();
      return;
    }

    if (!trimmed.startsWith("gsk_")) {
      setStatus({
        type: "err",
        text: "Ключът трябва да започва с 'gsk_'. Провери дали си го копирал изцяло."
      });
      setInputState("error");
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/proxy/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: trimmed })
      });
      const data = await resp.json();
      if (data.ok) {
        setInputState("success");
        setStatus({
          type: "ok",
          text: "✓ Ключът е валиден и запазен. Пренасочване към таблото…"
        });
        setTimeout(() => router.push("/"), 1200);
      } else {
        setInputState("error");
        setStatus({
          type: "err",
          text: data.error || "Неизвестна грешка. Опитай отново."
        });
      }
    } catch {
      setStatus({
        type: "err",
        text: "Не може да се свърже с Net Guard. Работи ли приложението?"
      });
    } finally {
      setLoading(false);
    }
  }

  const borderColor =
    inputState === "error"
      ? "#f14c4c"
      : inputState === "success"
        ? "#23d18b"
        : "#243040";

  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: "'JetBrains Mono', monospace",
        background: "#080b0f",
        color: "#cdd9e5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px"
      }}
    >
      {}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background:
            "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.04) 2px,rgba(0,0,0,0.04) 4px)"
        }}
      />

      <div
        style={{
          background: "#111820",
          border: "1px solid #243040",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "520px",
          overflow: "hidden",
          position: "relative",
          zIndex: 1
        }}
      >
        {}
        <div
          style={{
            height: "3px",
            background: "linear-gradient(90deg,#39d0ff,#0096b4)"
          }}
        />

        {}
        <div
          style={{
            padding: "32px 36px 24px",
            borderBottom: "1px solid #1c2535"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "20px"
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                background: "rgba(57,208,255,0.1)",
                border: "1px solid rgba(57,208,255,0.3)",
                borderRadius: "8px",
                display: "grid",
                placeItems: "center",
                fontSize: "20px"
              }}
            >
              🛡
            </div>
            <span
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "20px",
                fontWeight: 800,
                color: "#39d0ff",
                letterSpacing: "-0.02em"
              }}
            >
              NET<span style={{ color: "#cdd9e5" }}>GUARD</span>
            </span>
          </div>
          <h1
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "22px",
              fontWeight: 700,
              color: "#cdd9e5",
              marginBottom: "8px",
              letterSpacing: "-0.01em"
            }}
          >
            Добре дошъл!
          </h1>
          <p style={{ fontSize: "12px", color: "#495970", lineHeight: 1.6 }}>
            За да работят ИИ функциите, е нужен безплатен API ключ от Groq.
            <br />
            Регистрацията отнема под 2 минути и не изисква кредитна карта.
          </p>
        </div>

        {}
        <div style={{ padding: "28px 36px" }}>
          {}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              marginBottom: "28px"
            }}
          >
            {[
              <>
                Отвори{" "}
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener"
                  style={{
                    color: "#39d0ff",
                    textDecoration: "none",
                    borderBottom: "1px solid rgba(57,208,255,0.3)"
                  }}
                >
                  console.groq.com/keys
                </a>{" "}
                и влез с Google акаунт или имейл.
              </>,
              <>
                Натисни{" "}
                <strong style={{ color: "#cdd9e5", fontWeight: 600 }}>
                  „Create API Key"
                </strong>
                , дай му произволно име (напр.{" "}
                <strong style={{ color: "#cdd9e5", fontWeight: 600 }}>
                  NetGuard
                </strong>
                ) и копирай ключа.
              </>,
              <>
                Постави ключа по-долу и натисни{" "}
                <strong style={{ color: "#cdd9e5", fontWeight: 600 }}>
                  „Запази"
                </strong>
                . Това е всичко — повече няма да те питаме.
              </>
            ].map((text, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "14px",
                  alignItems: "flex-start"
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: "rgba(57,208,255,0.1)",
                    border: "1px solid rgba(57,208,255,0.25)",
                    color: "#39d0ff",
                    fontSize: "11px",
                    fontWeight: 700,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    marginTop: "1px"
                  }}
                >
                  {i + 1}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#cdd9e5",
                    lineHeight: 1.6
                  }}
                >
                  {text}
                </div>
              </div>
            ))}
          </div>

          {}
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "#495970",
                marginBottom: "8px"
              }}
            >
              Groq API ключ
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                ref={inputRef}
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveKey()}
                placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                autoComplete="off"
                spellCheck={false}
                style={{
                  flex: 1,
                  background: "#0d1117",
                  border: `1px solid ${borderColor}`,
                  borderRadius: "6px",
                  padding: "10px 14px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "12px",
                  color: "#cdd9e5",
                  outline: "none",
                  transition: "border-color 0.15s"
                }}
              />
              <button
                onClick={saveKey}
                disabled={loading}
                style={{
                  padding: "10px 20px",
                  background: loading ? "#2a3a4d" : "#39d0ff",
                  color: loading ? "#495970" : "#000",
                  border: "none",
                  borderRadius: "6px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  cursor: loading ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "background 0.15s"
                }}
              >
                {loading && (
                  <span
                    style={{
                      width: "11px",
                      height: "11px",
                      border: "2px solid rgba(0,0,0,0.25)",
                      borderTopColor: "#000",
                      borderRadius: "50%",
                      animation: "ng-spin 0.7s linear infinite",
                      display: "inline-block"
                    }}
                  />
                )}
                {loading ? "Проверка…" : "Запази"}
              </button>
            </div>
            {status && (
              <div
                style={{
                  fontSize: "11px",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  marginTop: "12px",
                  lineHeight: 1.5,
                  background:
                    status.type === "err"
                      ? "rgba(241,76,76,0.1)"
                      : "rgba(35,209,139,0.1)",
                  border:
                    status.type === "err"
                      ? "1px solid rgba(241,76,76,0.25)"
                      : "1px solid rgba(35,209,139,0.25)",
                  color: status.type === "err" ? "#f14c4c" : "#23d18b"
                }}
              >
                {status.text}
              </div>
            )}
          </div>
        </div>

        {}
        <div
          style={{ padding: "16px 36px 24px", borderTop: "1px solid #1c2535" }}
        >
          <p style={{ fontSize: "10px", color: "#495970", lineHeight: 1.7 }}>
            <strong style={{ color: "#e5c07b", fontWeight: 500 }}>
              ⚠ Поверителност:
            </strong>{" "}
            Ключът се съхранява само на твоя компютър (Windows Credential
            Manager) и никога не се изпраща никъде освен директно към Groq при
            ИИ анализ. Groq предлага безплатен план с достатъчно квота за
            нормална употреба.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes ng-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
