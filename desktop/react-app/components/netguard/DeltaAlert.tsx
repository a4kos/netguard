"use client";

import { useState, useEffect } from "react";
import { API_BASE } from "@/lib/api";

interface DeltaItem {
  ext_id: string;
  name: string;
  current_score: number;
  prev_score: number;
  delta: number;
  current_severity: string;
}

export default function DeltaAlert() {
  const [deltas, setDeltas] = useState<DeltaItem[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/proxy/delta`)
      .then((r) => r.json())
      .then(setDeltas)
      .catch(() => {});
  }, []);

  if (deltas.length === 0) return null;

  return (
    <div
      style={{
        background: "#1a1008",
        border: "1px solid #e8834a44",
        borderLeft: "3px solid #e8834a",
        borderRadius: "8px",
        padding: "14px 18px",
        display: "flex",
        flexDirection: "column",
        gap: "8px"
      }}
    >
      <div
        style={{
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "#e8834a",
          fontWeight: 500
        }}
      >
        ⚠ Промяна в риска от последното сканиране
      </div>
      {deltas.map((d) => (
        <div
          key={d.ext_id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: "12px",
            color: "#cdd9e5"
          }}
        >
          <span style={{ fontWeight: 500, flex: 1 }}>{d.name}</span>
          <span style={{ color: "#495970" }}>{d.prev_score.toFixed(1)}</span>
          <span style={{ color: "#495970" }}>→</span>
          <span style={{ color: "#f14c4c", fontWeight: 600 }}>
            {d.current_score.toFixed(1)}
          </span>
          <span
            style={{
              fontSize: "10px",
              padding: "2px 6px",
              borderRadius: "3px",
              background: "#f14c4c22",
              color: "#f14c4c"
            }}
          >
            +{d.delta.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}
