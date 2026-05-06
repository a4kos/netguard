export interface Extension {
  id: number
  ext_id: string
  name: string
  version: string
  permissions: string[]
  host_perms: string[]
  description: string
  risk_score: number
  ml_score: number
  severity: 'critical' | 'high' | 'medium' | 'low'
  flags: string[]
  ai_summary: string | null
  scanned_at: string
}

export interface Stats {
  total: number
  critical: number
  high: number
  medium: number
  low: number
}

export interface DeepStats {
  avg_score: number
  max_score: number
  min_score: number
  avg_ml_score: number
  total_scan_events: number
  first_scan: string
  last_scan: string
  new_last_24h: number
  removed_last_24h: number
  worst_ever: { name: string; risk_score: number; severity: string } | null
  top_flags: { flag: string; count: number }[]
  top_perms: { perm: string; count: number }[]
  score_dist: { low: number; medium: number; high: number; critical: number }
  scan_trend: { day: string; count: number }[]
  signal_count: number
}
