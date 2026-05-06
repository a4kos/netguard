"use client";

import { useEffect, useState } from "react";
import type { DeepStats } from "@/lib/types";
import { API_BASE } from "@/lib/api";

export default function StatisticsView({ active }: { active: boolean }) {
  const [ds, setDs] = useState<DeepStats | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!active || loaded) return;
    fetch(`${API_BASE}/api/proxy/deep-stats`)
      .then((r) => r.json())
      .then((data) => {
        setDs(data);
        setLoaded(true);
      })
      .catch(() => {
        setError(true);
        setLoaded(true);
      });
  }, [active, loaded]);

  const subtitle = ds
    ? `Данни от ${ds.first_scan || "—"} до ${ds.last_scan || "—"}`
    : error
      ? "Грешка при зареждане на статистиката"
      : "Зареждане…";

  return (
    <>
      <div>
        <div
          style={{
            fontFamily: "'Syne',sans-serif",
            fontSize: "22px",
            fontWeight: 700,
            letterSpacing: "-0.01em"
          }}
        >
          Детайлна статистика
        </div>
        <div style={{ fontSize: "11px", color: "#495970", marginTop: "3px" }}>
          {subtitle}
        </div>
      </div>

      {}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: "12px"
        }}
      >
        <BigStatCard
          color="#23d18b"
          label="Среден риск"
          value={ds?.avg_score?.toFixed(1) ?? "—"}
          sub="от 10"
        />
        <BigStatCard
          color="#f14c4c"
          label="Най-висок риск (всички)"
          value={ds?.max_score?.toFixed(1) ?? "—"}
          sub={ds?.worst_ever?.name ?? "—"}
        />
        <BigStatCard
          color="#b48ead"
          label="Среден ML резултат"
          value={ds ? (ds.avg_ml_score ?? "—") + "%" : "—"}
          sub="аномалия %"
        />
        <BigStatCard
          color="#39d0ff"
          label="Общо сканирания"
          value={ds?.total_scan_events ?? "—"}
          sub="от инсталация"
        />
      </div>

      {}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: "12px"
        }}
      >
        <BigStatCard
          color="#23d18b"
          label="Нови (последните 24ч)"
          value={ds?.new_last_24h ?? "—"}
          sub="нови разширения"
        />
        <BigStatCard
          color="#e5c07b"
          label="Премахнати (24ч)"
          value={ds?.removed_last_24h ?? "—"}
          sub="изчезнали разширения"
        />
        <BigStatCard
          color="#b48ead"
          label="Поведенчески сигнали"
          value={ds?.signal_count ?? "—"}
          sub="eval/inject засечени"
        />
      </div>

      {}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}
      >
        <StatsCard title="Разпределение по ниво на риск">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: "12px",
              marginTop: "8px"
            }}
          >
            <DistCard
              label="Нисък"
              color="#39d0ff"
              value={ds?.score_dist?.low ?? "—"}
            />
            <DistCard
              label="Среден"
              color="#e5c07b"
              value={ds?.score_dist?.medium ?? "—"}
            />
            <DistCard
              label="Висок"
              color="#e8834a"
              value={ds?.score_dist?.high ?? "—"}
            />
            <DistCard
              label="Критичен"
              color="#f14c4c"
              value={ds?.score_dist?.critical ?? "—"}
            />
          </div>
        </StatsCard>

        <StatsCard title="Активност (последните 7 дни)">
          {ds?.scan_trend?.length ? (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "4px",
                  height: "48px",
                  marginTop: "8px"
                }}
              >
                {(() => {
                  const max = Math.max(...ds.scan_trend.map((d) => d.count), 1);
                  return ds.scan_trend.map((d, i) => {
                    const pct = Math.max((d.count / max) * 100, 6);
                    return (
                      <div
                        key={i}
                        title={`${d.day}: ${d.count} разш.`}
                        style={{
                          flex: 1,
                          background: "#0096b4",
                          borderRadius: "2px 2px 0 0",
                          height: `${pct}%`,
                          minHeight: "4px",
                          transition: "height 0.3s"
                        }}
                      />
                    );
                  });
                })()}
              </div>
              <div
                style={{ fontSize: "10px", color: "#495970", marginTop: "8px" }}
              >
                {ds.scan_trend.map((d) => d.day.slice(5)).join("  ")}
              </div>
            </>
          ) : (
            <span style={{ color: "#495970", fontSize: "11px" }}>
              Недостатъчно данни
            </span>
          )}
        </StatsCard>
      </div>

      {}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}
      >
        <StatsCard title="Най-чести маркери за заплаха">
          {ds?.top_flags?.length ? (
            ds.top_flags.map((f, i) => (
              <BarRow
                key={i}
                label={f.flag}
                count={f.count}
                max={ds.top_flags[0].count}
                color="#f14c4c"
              />
            ))
          ) : (
            <span style={{ color: "#495970", fontSize: "11px" }}>
              Няма данни
            </span>
          )}
        </StatsCard>
        <StatsCard title="Най-чести разрешения">
          {ds?.top_perms?.length ? (
            ds.top_perms.map((p, i) => (
              <BarRow
                key={i}
                label={p.perm}
                count={p.count}
                max={ds.top_perms[0].count}
                color="#39d0ff"
              />
            ))
          ) : (
            <span style={{ color: "#495970", fontSize: "11px" }}>
              Няма данни
            </span>
          )}
        </StatsCard>
      </div>

      {}
      <div
        style={{
          background: "#111820",
          border: "1px solid #1c2535",
          borderRadius: "8px",
          padding: "16px 20px",
          display: "flex",
          gap: "40px",
          alignItems: "center"
        }}
      >
        <div>
          <div
            style={{
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#495970"
            }}
          >
            Първо сканиране
          </div>
          <div style={{ fontSize: "14px", marginTop: "4px" }}>
            {ds?.first_scan ?? "—"}
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#495970"
            }}
          >
            Последно сканиране
          </div>
          <div style={{ fontSize: "14px", marginTop: "4px" }}>
            {ds?.last_scan ?? "—"}
          </div>
        </div>
      </div>
    </>
  );
}

function BigStatCard({
  color,
  label,
  value,
  sub
}: {
  color: string;
  label: string;
  value: number | string;
  sub: string;
}) {
  return (
    <div
      style={{
        background: "#111820",
        border: "1px solid #1c2535",
        borderRadius: "8px",
        padding: "18px 20px",
        position: "relative",
        overflow: "hidden"
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "2px",
          background: color
        }}
      />
      <div
        style={{
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "#495970"
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "36px",
          fontWeight: 700,
          lineHeight: 1.1,
          margin: "6px 0 2px",
          color
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: "10px", color: "#495970" }}>{sub}</div>
    </div>
  );
}

function StatsCard({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#111820",
        border: "1px solid #1c2535",
        borderRadius: "8px",
        padding: "18px 20px"
      }}
    >
      <div
        style={{
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "#39d0ff",
          marginBottom: "14px"
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function DistCard({
  label,
  color,
  value
}: {
  label: string;
  color: string;
  value: number | string;
}) {
  return (
    <div
      style={{
        background: "#0d1117",
        border: "1px solid #1c2535",
        borderRadius: "8px",
        padding: "14px 16px",
        textAlign: "center"
      }}
    >
      <div
        style={{
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#495970",
          marginBottom: "6px"
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "28px", fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function BarRow({
  label,
  count,
  max,
  color
}: {
  label: string;
  count: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontSize: "11px",
        marginBottom: "8px"
      }}
    >
      <span
        title={label}
        style={{
          minWidth: "180px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis"
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: "6px",
          background: "#2a3a4d",
          borderRadius: "3px",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: "3px",
            width: `${pct.toFixed(0)}%`,
            background: color,
            transition: "width 0.4s"
          }}
        />
      </div>
      <span style={{ minWidth: "28px", textAlign: "right", color: "#495970" }}>
        {count}
      </span>
    </div>
  );
}
