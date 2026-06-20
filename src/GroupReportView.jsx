import React, { useState, useMemo } from 'react'
import {
  PageHeader, Icons, showToast, FactorRow, FactorRadar,
  FactorBar, AIBox, StatCard, LoadingOverlay,
} from './components.jsx'
import { parseCsv } from './csvUtils.js'
import { computeTeamFactors, scoreColor } from './analysis.js'
import { generateGroupAIReport } from './aiReports.js'
import { FACTOR_ORDER, FACTOR_LABELS_AR } from './config.js'

const COLOR_MAP = { green: 'var(--green)', yellow: 'var(--yellow)', red: 'var(--red)' }

export default function GroupReportView({ onBack, norms, sessionsCsv }) {
  const [useAll, setUseAll] = useState(true)
  const [idsInput, setIdsInput] = useState('')
  const [generated, setGenerated] = useState(false)
  const [aiData, setAiData] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)

  const allRows = useMemo(() => {
    if (!sessionsCsv) return []
    return parseCsv(sessionsCsv)
  }, [sessionsCsv])

  const [teamData, setTeamData] = useState(null)
  const [error, setError] = useState('')

  function handleGenerate() {
    setError('')
    setAiData(null)
    setTeamData(null)

    let rows = allRows
    if (!useAll) {
      const ids = idsInput.split(',').map(s => s.trim()).filter(Boolean)
      if (!ids.length) { setError('أدخل أرقام اللاعبين أو اختر استخدام الجميع'); return }
      rows = allRows.filter(r => ids.includes(String(r.player_id)))
      if (!rows.length) { setError('لا توجد بيانات للأرقام المدخلة'); return }
    }

    if (!rows.length) { setError('لا توجد بيانات'); return }
    if (!norms) { setError('لم يتم تحميل بيانات المعايير'); return }

    const result = computeTeamFactors(rows, norms)
    setTeamData(result)
    setGenerated(true)
  }

  async function handleGenerateAI() {
    if (!teamData) return
    setAiLoading(true)
    try {
      const result = await generateGroupAIReport(teamData.teamAvg)
      setAiData(result)
    } catch (e) {
      showToast('فشل توليد التقرير الذكي', 'error')
    } finally {
      setAiLoading(false)
    }
  }

  const weakestFactor = teamData
    ? FACTOR_ORDER.reduce((w, f) => (teamData.teamAvg[f] < (teamData.teamAvg[w] || 100) ? f : w), FACTOR_ORDER[0])
    : null

  const topPlayers = teamData ? teamData.players.slice(0, 3) : []
  const weakPlayers = teamData ? [...teamData.players].slice(-3).reverse() : []

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="التقارير الجماعية" onBack={onBack} />

      <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, maxWidth: 1100, margin: '0 auto' }}>

          {/* Left panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="section-title">إعداد التقرير</div>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={useAll}
                  onChange={e => setUseAll(e.target.checked)}
                />
                <span style={{ fontSize: 13 }}>استخدام جميع اللاعبين</span>
              </label>

              {!useAll && (
                <div>
                  <label>أرقام اللاعبين (مفصولة بفاصلة)</label>
                  <input
                    type="text"
                    placeholder="101, 102, 103"
                    value={idsInput}
                    onChange={e => setIdsInput(e.target.value)}
                  />
                </div>
              )}

              {error && (
                <div style={{
                  background: 'var(--red-bg)', borderRadius: 8, padding: '8px 12px',
                  fontSize: 12, color: 'var(--red)',
                }}>
                  {error}
                </div>
              )}

              <button className="btn btn-primary" onClick={handleGenerate} style={{ width: '100%', justifyContent: 'center' }}>
                <Icons.chart /> توليد التقرير
              </button>

              {teamData && (
                <button
                  className="btn btn-secondary"
                  onClick={handleGenerateAI}
                  disabled={aiLoading}
                  style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
                >
                  {aiLoading
                    ? <><span className="spinner" /> جارٍ التحليل...</>
                    : <><Icons.robot /> التقييم الذكي</>}
                </button>
              )}
            </div>

            {/* Player count info */}
            {teamData && (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="section-title">ملخص</div>
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>عدد اللاعبين: </span>
                  <span style={{ fontWeight: 600 }}>{teamData.players.length}</span>
                </div>
                {weakestFactor && (
                  <div style={{ fontSize: 13 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>أضعف عامل: </span>
                    <span style={{ fontWeight: 600, color: 'var(--red)' }}>{FACTOR_LABELS_AR[weakestFactor]}</span>
                  </div>
                )}

                {/* Top players */}
                <div className="section-title" style={{ marginTop: 8 }}>أفضل اللاعبين</div>
                {topPlayers.map((p, i) => (
                  <div key={p.player_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ color: COLOR_MAP[scoreColor(p.avg)], fontWeight: i === 0 ? 600 : 400 }}>
                      {i === 0 ? '① ' : i === 1 ? '② ' : '③ '}{p.name}
                    </span>
                    <span className={'badge badge-' + scoreColor(p.avg)} style={{ fontSize: 10 }}>{p.avg}%</span>
                  </div>
                ))}

                {/* Needs work */}
                <div className="section-title" style={{ marginTop: 8 }}>يحتاج تطوير</div>
                {weakPlayers.map((p, i) => (
                  <div key={p.player_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ color: COLOR_MAP[scoreColor(p.avg)] }}>{p.name}</span>
                    <span className={'badge badge-' + scoreColor(p.avg)} style={{ fontSize: 10 }}>{p.avg}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {!generated && (
              <div className="card empty-state" style={{ minHeight: 300 }}>
                <Icons.users />
                <p>اضغط "توليد التقرير" لعرض تحليل الفريق</p>
              </div>
            )}

            {teamData && (
              <>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                  {FACTOR_ORDER.slice(0, 3).map(f => (
                    <StatCard
                      key={f}
                      label={FACTOR_LABELS_AR[f]}
                      value={`${teamData.teamAvg[f]}%`}
                      color={COLOR_MAP[scoreColor(teamData.teamAvg[f])]}
                    />
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
                  {FACTOR_ORDER.slice(3).map(f => (
                    <StatCard
                      key={f}
                      label={FACTOR_LABELS_AR[f]}
                      value={`${teamData.teamAvg[f]}%`}
                      color={COLOR_MAP[scoreColor(teamData.teamAvg[f])]}
                    />
                  ))}
                </div>

                {/* Charts */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="card">
                    <div className="section-title">المخطط الراداري</div>
                    <FactorRadar factors={teamData.teamAvg} label="متوسط الفريق" />
                  </div>
                  <div className="card">
                    <div className="section-title">مقارنة العوامل</div>
                    <FactorBar factors={teamData.teamAvg} />
                  </div>
                </div>

                {/* Factor bars */}
                <div className="card">
                  <div className="section-title">متوسطات الفريق (الرتبة المئوية)</div>
                  <div style={{ marginTop: 8 }}>
                    {FACTOR_ORDER.map(f => (
                      <FactorRow key={f} factor={f} percentile={teamData.teamAvg[f] ?? 0} />
                    ))}
                  </div>
                </div>

                {/* Player table */}
                <div className="card">
                  <div className="section-title">ترتيب اللاعبين</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>الاسم</th>
                          <th>المركز</th>
                          {FACTOR_ORDER.map(f => (
                            <th key={f} style={{ whiteSpace: 'nowrap' }}>{FACTOR_LABELS_AR[f]}</th>
                          ))}
                          <th>المتوسط</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamData.players.map((p, i) => (
                          <tr key={p.player_id}>
                            <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                            <td style={{ fontWeight: 500 }}>{p.name}</td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{p.position}</td>
                            {FACTOR_ORDER.map(f => {
                              const c = scoreColor(p.factors[f] ?? 0)
                              return (
                                <td key={f}>
                                  <span className={`badge badge-${c}`}>{p.factors[f] ?? 0}%</span>
                                </td>
                              )
                            })}
                            <td>
                              <span className={`badge badge-${scoreColor(p.avg)}`}>{p.avg}%</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* AI */}
                {(aiLoading || aiData) && (
                  <div className="card">
                    <div className="section-title">التقييم الذكي</div>
                    {aiLoading
                      ? <LoadingOverlay text="جارٍ توليد التقرير الذكي..." />
                      : <AIBox data={aiData} type="group" />}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
