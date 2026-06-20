import React, { useEffect, useState } from 'react'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts'
import { FACTOR_LABELS_AR, FACTOR_ORDER, PERC_HIGH, PERC_LOW } from './config.js'
import { scoreColor } from './analysis.js'

// ── Icons (inline SVG) ────────────────────────────────────────────────────────
export const Icons = {
  logo: () => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="14" fill="#14B8A6"/>
      <text x="14" y="19" textAnchor="middle" fill="white" fontSize="14" fontWeight="700" fontFamily="IBM Plex Sans Arabic,Arial">أ</text>
    </svg>
  ),
  user: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  logout: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  chart: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  users: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  upload: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="16,16 12,12 8,16"/><line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
  ),
  plus: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  robot: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M12 11V3"/>
      <circle cx="12" cy="3" r="1"/><circle cx="8" cy="16" r="1" fill="currentColor" stroke="none"/>
      <circle cx="16" cy="16" r="1" fill="currentColor" stroke="none"/>
      <path d="M8 20h8"/>
    </svg>
  ),
  download: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  back: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/>
    </svg>
  ),
  search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
}

// ── Toast system ──────────────────────────────────────────────────────────────
let _setToasts = null

export function ToastProvider() {
  const [toasts, setToasts] = useState([])
  _setToasts = setToasts
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
      ))}
    </div>
  )
}

export function showToast(msg, type = 'success', duration = 2500) {
  if (!_setToasts) return
  const id = Date.now()
  _setToasts(prev => [...prev, { id, msg, type }])
  setTimeout(() => _setToasts(prev => prev.filter(t => t.id !== id)), duration)
}

// ── Score bar ─────────────────────────────────────────────────────────────────
export function ScoreBar({ percentile }) {
  const c = scoreColor(percentile)
  const colorMap = { green: 'var(--green)', yellow: 'var(--yellow)', red: 'var(--red)' }
  return (
    <div className="progress-bar" style={{ flex: 1 }}>
      <div
        className="progress-fill"
        style={{ width: `${percentile}%`, background: colorMap[c] }}
      />
    </div>
  )
}

// ── Score badge ───────────────────────────────────────────────────────────────
export function ScoreBadge({ percentile }) {
  const c = scoreColor(percentile)
  return <span className={`badge badge-${c}`}>{percentile}%</span>
}

// ── Factor row ────────────────────────────────────────────────────────────────
export function FactorRow({ factor, percentile }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <span style={{ width: 130, fontSize: 13, textAlign: 'right', color: 'var(--text-primary)', flexShrink: 0 }}>
        {FACTOR_LABELS_AR[factor]}
      </span>
      <ScoreBar percentile={percentile} />
      <ScoreBadge percentile={percentile} />
    </div>
  )
}

// ── Radar chart ───────────────────────────────────────────────────────────────
export function FactorRadar({ factors, label = 'الأداء' }) {
  const data = FACTOR_ORDER.map(f => ({
    subject: FACTOR_LABELS_AR[f],
    value: factors[f] ?? 0,
    fullMark: 100,
  }))
  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <PolarGrid stroke="#334155" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'IBM Plex Sans Arabic,Arial' }}
        />
        <Radar
          name={label}
          dataKey="value"
          stroke="#14B8A6"
          fill="#14B8A6"
          fillOpacity={0.25}
          dot={{ fill: '#14B8A6', r: 3 }}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}

// ── Bar chart ─────────────────────────────────────────────────────────────────
export function FactorBar({ factors }) {
  const data = FACTOR_ORDER.map(f => ({
    name: FACTOR_LABELS_AR[f],
    value: factors[f] ?? 0,
  }))
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 10, bottom: 30, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'IBM Plex Sans Arabic,Arial' }}
          angle={-20}
          textAnchor="end"
          height={50}
        />
        <YAxis domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 10 }} />
        <Tooltip
          contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8, color: '#F1F5F9' }}
          formatter={(v) => [`${v}%`, 'الرتبة المئوية']}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={
                entry.value >= PERC_HIGH ? '#22C55E'
                : entry.value >= PERC_LOW  ? '#FACC15'
                : '#EF4444'
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── AI Result box ─────────────────────────────────────────────────────────────
export function AIBox({ data, type = 'individual' }) {
  if (!data) return null
  return (
    <div className="ai-box">
      <div className="ai-label">
        <Icons.robot /> تحليل الذكاء الاصطناعي
      </div>
      {data.summary && (
        <div className="ai-section">
          <strong>التقييم العام</strong>
          <p>{data.summary}</p>
        </div>
      )}
      {type === 'individual' && data.detailed_analysis && (
        <div className="ai-section">
          <strong>التحليل التفصيلي</strong>
          <p>{data.detailed_analysis}</p>
        </div>
      )}
      {data.weak_points?.length > 0 && (
        <div className="ai-section">
          <strong>نقاط الضعف</strong>
          <ul>
            {data.weak_points.map((wp, i) => (
              <li key={i}>
                <b style={{ color: 'var(--text-primary)' }}>{wp.factor}:</b>{' '}
                {wp.analysis || wp}
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.recommendations?.length > 0 && (
        <div className="ai-section">
          <strong>التوصيات التدريبية</strong>
          <ul>
            {data.recommendations.map((r, i) => (
              <li key={i}>
                {r.title
                  ? <><b style={{ color: 'var(--text-primary)' }}>{r.title}:</b> {r.details}</>
                  : r
                }
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, color }) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <span className="stat-value" style={color ? { color } : {}}>{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  )
}

// ── Page header ───────────────────────────────────────────────────────────────
export function PageHeader({ title, onBack, onLogout, username }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 24px', borderBottom: '1px solid var(--border)',
      background: 'var(--bg-card)', position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {onBack && (
          <button className="btn btn-ghost" onClick={onBack} style={{ padding: '6px 12px' }}>
            <Icons.back /> رجوع
          </button>
        )}
        {onLogout && (
          <button className="btn btn-ghost" onClick={onLogout} style={{ padding: '6px 12px' }}>
            <Icons.logout /> خروج
          </button>
        )}
        {username && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icons.user /> {username}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>{title}</span>
        <Icons.logo />
      </div>
    </div>
  )
}

// ── Loading overlay ───────────────────────────────────────────────────────────
export function LoadingOverlay({ text = 'جارٍ التحميل...' }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: 14, color: 'var(--text-secondary)',
    }}>
      <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      <span>{text}</span>
    </div>
  )
}
