"use client";

import { useState } from "react";
import type { Extension } from "@/lib/types";
import { Badge, ScoreBar, AiBtn } from "./helpers";
import { apiFetch } from "@/lib/api";

const TD: React.CSSProperties = { padding: "11px 20px" };
const NAME_TD: React.CSSProperties = {
  padding: "11px 20px",
  fontSize: "12px",
  fontWeight: 500
};
const TRUSTED_BADGE: React.CSSProperties = {
  fontSize: "9px",
  padding: "1px 5px",
  borderRadius: "3px",
  background: "#1c2535",
  color: "#495970",
  textTransform: "uppercase",
  letterSpacing: "0.08em"
};

interface Props {
  ext: Extension;
  trusted: boolean;
  onOpenDetail: (ext: Extension) => void;
  onTrustChange: (extId: string, nowTrusted: boolean) => void;
  showVersion?: boolean;
  showPermissions?: boolean;
}

export default function ExtensionRow({
  ext,
  trusted,
  onOpenDetail,
  onTrustChange,
  showVersion,
  showPermissions
}: Props) {
  const [toggling, setToggling] = useState(false);

  const handleTrust = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setToggling(true);
    try {
      await apiFetch(`/api/proxy/trust/${ext.ext_id}`, {
        method: trusted ? "DELETE" : "POST"
      });
      onTrustChange(ext.ext_id, !trusted);
    } catch {
    } finally {
      setToggling(false);
    }
  };

  const handleQuarantine = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.postMessage({ type: "NG_OPEN_EXTENSION", extId: ext.ext_id }, "*");
  };

  return (
    <tr
      onClick={() => onOpenDetail(ext)}
      style={{
        borderBottom: "1px solid #1c2535",
        cursor: "pointer",
        opacity: trusted ? 0.45 : 1,
        transition: "opacity 0.15s, background 0.1s"
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "rgba(57,208,255,0.03)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {}
      <td style={NAME_TD}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {ext.name}
          {trusted && <span style={TRUSTED_BADGE}>Проверено</span>}
        </div>
      </td>

      {showVersion && (
        <td style={{ ...TD, fontSize: "11px", color: "#495970" }}>
          {ext.version || "—"}
        </td>
      )}

      {showPermissions && (
        <td
          style={{
            ...TD,
            color: "#495970",
            fontSize: "11px",
            maxWidth: "220px"
          }}
        >
          <div
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}
          >
            {(ext.permissions ?? []).join(", ") || "—"}
          </div>
        </td>
      )}

      <td style={TD}>
        <Badge severity={ext.severity} />
      </td>
      <td style={TD}>
        <ScoreBar score={ext.risk_score} />
      </td>

      {}
      <td
        style={{ ...TD, whiteSpace: "nowrap" }}
        onClick={(e) => e.stopPropagation()}
      >
        {}
        <button
          onClick={handleTrust}
          disabled={toggling}
          style={{
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: "10px",
            padding: "3px 8px",
            borderRadius: "4px",
            border: "1px solid",
            borderColor: trusted ? "#1c2535" : "#0096b4",
            background: "transparent",
            color: trusted ? "#495970" : "#39d0ff",
            cursor: toggling ? "wait" : "pointer",
            transition: "all 0.12s",
            marginRight: "6px"
          }}
        >
          {trusted ? "↩ Недоверен" : "✓ Доверен"}
        </button>

        {}
        {ext.risk_score >= 3 && (
          <button
            onClick={handleQuarantine}
            title="Управление в Chrome"
            style={{
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: "10px",
              padding: "3px 8px",
              borderRadius: "4px",
              border: `1px solid ${ext.risk_score >= 5 ? "#f14c4c44" : "#1c2535"}`,
              background: "transparent",
              color: ext.risk_score >= 5 ? "#f14c4c" : "#495970",
              cursor: "pointer",
              transition: "all 0.12s",
              marginRight: "6px"
            }}
          >
            ⬡ Управление
          </button>
        )}

        {}
        <AiBtn onClick={() => onOpenDetail(ext)}>⚡ ИИ</AiBtn>
      </td>
    </tr>
  );
}
