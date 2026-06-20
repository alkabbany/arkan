import React, { useState, useEffect } from 'react'
import {
  PageHeader, Icons, showToast, FactorRow, FactorRadar,
  FactorBar, AIBox, StatCard, LoadingOverlay,
} from './components.jsx'
import { parseCsv } from './csvUtils.js'
import { analyzePlayer, scoreColor, scoreLabel } from './analysis.js'
import { generateIndividualAIReport } from './aiReports.js'
import { FACTOR_ORDER, FACTOR_LABELS_AR } from './config.js'

const COLOR_MAP = { green: 'var(--green)', yellow: 'var(--yellow)', red: 'var(--red)' }

export default function IndividualReportView({ onBack, norms, sessionsCsv }) {
  const [playerId, setPlayerId] = useState('')
  const [player, setPlayer] = useState(null)
  const [factors, setFactors] = useState(null)
  const [loading, setLoading] = useState(false)
  const [aiData, setAiData] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState('')

  // Live preview as user types
  useEffect(() => {
    if (!playerId.trim() || !sessionsCsv || !norms) return
    const rows = parseCsv(sessionsCsv)
    const playerRows = rows.filter(r => String(r.player_id) === String(playerId.trim()))
    if (playerRows.length === 0) { setPlayer(null); setFactors(null); return }
    const sorted = [...playerRows].sort((a, b) => new Date(a.date) - new Date(b.date))
    const latest = sorted[sorted.length - 1]
    const raw = {
      coord3: latest.coord3, force1: latest.force1, force4: latest.force4,
      agility1: latest.agility1, endur5: latest.endur5, speed5: latest.speed5,
    }
    const f = analyzePlayer(raw, norms)
    setPlayer(latest)
    setFactors(f)
    setAiData(null)
  }, [playerId, sessionsCsv, norms])

  async function handleGenerateAI() {
    if (!player || !factors) return
    setAiLoading(true)
    try {
      const result = await generateIndividualAIReport(
        { name: player.name, age: player.age, position: player.position },
        factors
      )
      setAiData(result)
    } catch (e) {
      showToast('فشل توليد التقرير الذكي', 'error')
    } finally {
      setAiLoading(false)
    }
  }

  const avgPercentile = factors
    ? Math.round(FACTOR_ORDER.reduce((s, f) => s + (factors[f] || 0), 0) / FACTOR_ORDER.length)
    : null

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="التقارير الفردية" onBack={onBack} />

      {/* Search bar */}
      <div style={{
        padding: '14px 24px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-card)', display: 'flex', gap: 10, alignItems: 'center',
      }}>
        <Icons.search />
        <input
          type="number"
          placeholder="أدخل رقم اللاعب..."
          value={playerId}
          onChange={e => setPlayerId(e.target.value)}
          style={{ maxWidth: 220 }}
        />
        {player && (
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {player.name} — {player.position}
          </span>
        )}
      </div>

      <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
        {!player && !playerId && (
          <div className="empty-state">
            <Icons.search />
            <p>أدخل رقم اللاعب للبدء</p>
          </div>
        )}

        {playerId && !player && (
          <div className="empty-state">
            <Icons.user />
            <p>لا توجد بيانات للاعب رقم {playerId}</p>
          </div>
        )}

        {player && factors && (
          <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Player info */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, background: '#14B8A622',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 700, color: '#14B8A6', flexShrink: 0,
                }}>
                  {player.name?.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{player.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {player.position} · العمر: {player.age} · الطول: {player.height_cm} سم · الوزن: {player.weight_kg} كجم
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    آخر جلسة: {player.date}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              <StatCard
                label="الرتبة المئوية العامة"
                value={`${avgPercentile}%`}
                color={COLOR_MAP[scoreColor(avgPercentile)]}
              />
              <StatCard
                label="أقوى عامل"
                value={FACTOR_LABELS_AR[FACTOR_ORDER.reduce((best, f) => (factors[f] > (factors[best] || 0) ? f : best), FACTOR_ORDER[0])]}
                color="var(--green)"
              />
              <StatCard
                label="أضعف عامل"
                value={FACTOR_LABELS_AR[FACTOR_ORDER.reduce((worst, f) => (factors[f] < (factors[worst] || 100) ? f : worst), FACTOR_ORDER[0])]}
                color="var(--red)"
              />
            </div>

            {/* Charts + bars */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="card">
                <div className="section-title">المخطط الراداري</div>
                <FactorRadar factors={factors} label={player.name} />
              </div>
              <div className="card">
                <div className="section-title">مقارنة العوامل</div>
                <FactorBar factors={factors} />
              </div>
            </div>

            {/* Factor detail bars */}
            <div className="card">
              <div className="section-title">تفصيل العوامل (الرتبة المئوية)</div>
              <div style={{ marginTop: 8 }}>
                {FACTOR_ORDER.map(f => (
                  <FactorRow key={f} factor={f} percentile={factors[f] ?? 0} />
                ))}
              </div>
            </div>

            {/* AI report */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div className="section-title" style={{ margin: 0 }}>التقييم الذكي</div>
                <button
                  className="btn btn-primary"
                  onClick={handleGenerateAI}
                  disabled={aiLoading}
                  style={{ padding: '7px 14px', fontSize: 12 }}
                >
                  {aiLoading
                    ? <><span className="spinner" /> جارٍ التحليل...</>
                    : <><Icons.robot /> توليد التقرير الذكي</>}
                </button>
              </div>
              {!aiData && !aiLoading && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                  اضغط الزر أعلاه لتوليد تحليل ذكي مفصل باستخدام الذكاء الاصطناعي
                </p>
              )}
              {aiLoading && (
                <div style={{ padding: '20px 0' }}>
                  <LoadingOverlay text="جارٍ توليد التقرير الذكي..." />
                </div>
              )}
              {aiData && <AIBox data={aiData} type="individual" />}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
