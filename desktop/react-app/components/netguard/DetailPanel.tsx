"use client";

import { useState, useEffect } from "react";
import type { Extension } from "@/lib/types";
import { Badge, AiBtn } from "./helpers";
import { API_BASE } from "@/lib/api";

interface Props {
  ext: Extension | null;
  onClose: () => void;
}

export default function DetailPanel({ ext, onClose }: Props) {
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [explainText, setExplainText] = useState<string | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [showExplain, setShowExplain] = useState(false);
  const [researchText, setResearchText] = useState<string | null>(null);
  const [researchLinks, setResearchLinks] = useState<
    { url: string; title?: string }[]
  >([]);
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchSearched, setResearchSearched] = useState(false);
  const [showResearch, setShowResearch] = useState(false);

  useEffect(() => {
    if (ext) {
      setAiText(ext.ai_summary ?? null);
      setAiLoading(false);
      setExplainText(null);
      setExplainLoading(false);
      setShowExplain(false);
      setResearchText(null);
      setResearchLinks([]);
      setResearchLoading(false);
      setResearchSearched(false);
      setShowResearch(false);
    }
  }, [ext?.ext_id]);

  if (!ext) return null;

  const perms = [...(ext.permissions ?? []), ...(ext.host_perms ?? [])];

  async function loadAI() {
    setAiLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/proxy/analyze/${ext!.ext_id}`, {
        method: "POST"
      });
      const data = await resp.json();
      setAiText(data.summary ?? "Няма отговор.");
    } catch {
      setAiText("Грешка. Зададен ли е GROQ_API_KEY?");
    } finally {
      setAiLoading(false);
    }
  }

  async function loadExplanation() {
    setShowExplain(true);
    setExplainLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/proxy/explain/${ext!.ext_id}`, {
        method: "POST"
      });
      const data = await resp.json();
      setExplainText(data.explanation ?? "Няма отговор.");
    } catch {
      setExplainText("Грешка при зареждане.");
    } finally {
      setExplainLoading(false);
    }
  }

  async function loadResearch() {
    setShowResearch(true);
    setResearchLoading(true);
    try {
      const resp = await fetch(
        `${API_BASE}/api/proxy/research/${ext!.ext_id}`,
        {
          method: "POST"
        }
      );
      const data = await resp.json();
      setResearchText(data.summary ?? "Няма резултати.");
      setResearchLinks(data.links ?? []);
      setResearchSearched(!!data.searched);
    } catch {
      setResearchText("Грешка при търсенето.");
    } finally {
      setResearchLoading(false);
    }
  }

  return (
    <>
      {}
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px"
        }}
      >
        <div
          style={{
            background: "#111820",
            border: "1px solid #243040",
            borderRadius: "10px",
            width: "100%",
            maxWidth: "680px",
            maxHeight: "90vh",
            overflowY: "auto",
            animation: "ng-fadeup 0.18s ease"
          }}
        >
          {}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              padding: "20px 24px 16px",
              borderBottom: "1px solid #1c2535"
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'Syne',sans-serif",
                  fontSize: "18px",
                  fontWeight: 700
                }}
              >
                {ext.name}
              </div>
              <div
                style={{ fontSize: "11px", color: "#495970", marginTop: "3px" }}
              >
                ID: {ext.ext_id} · v{ext.version || "?"}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "#495970",
                cursor: "pointer",
                fontSize: "18px",
                lineHeight: 1
              }}
            >
              ✕
            </button>
          </div>

          {}
          <div
            style={{
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "18px"
            }}
          >
            {}
            <Section title="Оценка на риска">
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <Badge severity={ext.severity} />
                <span style={{ fontSize: "13px" }}>
                  Резултат: <strong>{ext.risk_score?.toFixed(1)}</strong>/10
                </span>
                <span style={{ fontSize: "11px", color: "#495970" }}>
                  ML:{" "}
                  {ext.ml_score ? (ext.ml_score * 100).toFixed(0) + "%" : "—"}
                </span>
              </div>
            </Section>

            {}
            <Section title="Маркери">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {(ext.flags ?? []).length ? (
                  (ext.flags ?? []).map((f) => (
                    <span
                      key={f}
                      style={{
                        fontSize: "10px",
                        padding: "3px 9px",
                        borderRadius: "3px",
                        background: "rgba(241,76,76,0.12)",
                        color: "#f14c4c"
                      }}
                    >
                      {f}
                    </span>
                  ))
                ) : (
                  <span style={{ color: "#495970", fontSize: "11px" }}>
                    Няма маркери
                  </span>
                )}
              </div>
            </Section>

            {}
            <Section title="Разрешения">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {perms.length ? (
                  perms.map((p) => (
                    <span
                      key={p}
                      style={{
                        fontSize: "10px",
                        padding: "3px 9px",
                        borderRadius: "3px",
                        background: "#2a3a4d",
                        color: "#cdd9e5"
                      }}
                    >
                      {p}
                    </span>
                  ))
                ) : (
                  <span style={{ color: "#495970", fontSize: "11px" }}>
                    Няма
                  </span>
                )}
              </div>
            </Section>

            {}
            <Section title="ИИ анализ">
              <div
                style={{
                  background: "#0d1117",
                  border: "1px solid #1c2535",
                  borderLeft: "3px solid #39d0ff",
                  borderRadius: "6px",
                  padding: "14px 16px",
                  fontSize: "12px",
                  lineHeight: 1.7
                }}
              >
                {aiLoading ? (
                  <span style={{ color: "#495970", fontStyle: "italic" }}>
                    ⚡ Извикване на ИИ…
                  </span>
                ) : aiText ? (
                  aiText.split("\n").map((l, i) => (
                    <span key={i}>
                      {l}
                      <br />
                    </span>
                  ))
                ) : (
                  <span style={{ color: "#495970", fontStyle: "italic" }}>
                    Натиснете „Анализирай с ИИ" за оценка…
                  </span>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                  marginTop: "10px"
                }}
              >
                <AiBtn onClick={loadAI} disabled={aiLoading}>
                  ⚡ Анализирай с ИИ
                </AiBtn>
                <AiBtn onClick={loadExplanation} disabled={explainLoading}>
                  Обясни маркерите
                </AiBtn>
                <AiBtn
                  onClick={loadResearch}
                  variant="research"
                  disabled={researchLoading}
                >
                  Търси CVE / изследвания
                </AiBtn>
              </div>
            </Section>

            {/* explain */}
            {showExplain && (
              <Section title="Какво означават маркерите">
                <div
                  style={{
                    background: "#0d1117",
                    border: "1px solid #1c2535",
                    borderLeft: "3px solid #39d0ff",
                    borderRadius: "6px",
                    padding: "14px 16px",
                    fontSize: "12px",
                    lineHeight: 1.7
                  }}
                >
                  {explainLoading ? (
                    <span style={{ color: "#495970", fontStyle: "italic" }}>
                      Анализиране на маркерите…
                    </span>
                  ) : (
                    (explainText ?? "").split("\n").map((l, i) => (
                      <span key={i}>
                        {l}
                        <br />
                      </span>
                    ))
                  )}
                </div>
              </Section>
            )}

            {/* research */}
            {showResearch && (
              <Section
                title={
                  <span>
                    Изследвания и CVE{" "}
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: "9px",
                        padding: "2px 7px",
                        borderRadius: "3px",
                        background: researchSearched
                          ? "rgba(35,209,139,0.12)"
                          : "rgba(73,89,112,0.3)",
                        color: researchSearched ? "#23d18b" : "#495970",
                        border: researchSearched
                          ? "1px solid rgba(35,209,139,0.25)"
                          : "1px solid #1c2535",
                        marginLeft: "8px",
                        verticalAlign: "middle"
                      }}
                    >
                      {researchSearched
                        ? "● търсено в реално време"
                        : "статични препратки"}
                    </span>
                  </span>
                }
              >
                <div
                  style={{
                    background: "#0d1117",
                    border: "1px solid #1c2535",
                    borderLeft: "3px solid #b48ead",
                    borderRadius: "6px",
                    padding: "14px 16px",
                    fontSize: "12px",
                    lineHeight: 1.7
                  }}
                >
                  {researchLoading ? (
                    <span style={{ color: "#495970", fontStyle: "italic" }}>
                      Търсене в интернет за CVE и изследвания… (може да отнеме
                      15-30 сек.)
                    </span>
                  ) : (
                    (researchText ?? "").split("\n").map((l, i) => (
                      <span key={i}>
                        {l}
                        <br />
                      </span>
                    ))
                  )}
                </div>
                {researchLinks.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      marginTop: "10px"
                    }}
                  >
                    {researchLinks.map((l, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "8px",
                          fontSize: "11px"
                        }}
                      >
                        <span
                          style={{
                            color: "#b48ead",
                            flexShrink: 0,
                            marginTop: "2px"
                          }}
                        >
                          ›
                        </span>
                        <a
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#39d0ff",
                            textDecoration: "none",
                            wordBreak: "break-all"
                          }}
                        >
                          {l.title || l.url}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
                {!researchLoading && researchLinks.length === 0 && (
                  <div
                    style={{
                      color: "#495970",
                      fontSize: "11px",
                      marginTop: "6px"
                    }}
                  >
                    Не са намерени препратки.
                  </div>
                )}
              </Section>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes ng-fadeup{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </>
  );
}

function Section({
  title,
  children
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4
        style={{
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "#39d0ff",
          marginBottom: "10px"
        }}
      >
        {title}
      </h4>
      {children}
    </div>
  );
}
