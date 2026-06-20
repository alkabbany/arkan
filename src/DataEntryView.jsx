import React, { useState, useCallback } from 'react'
import { PageHeader, Icons, showToast, FactorRow } from './components.jsx'
import { parseCsv, serializeCsv, appendRowsToCsv, generateSessionId, getTodayDate, validateCsvColumns } from './csvUtils.js'
import { loadSessions } from './github.js'
import { writeFile } from './github.js'
import { FILES, FACTOR_VARIABLES, FACTOR_ORDER, FACTOR_LABELS_AR } from './config.js'
import { computeNorms, analyzePlayer, scoreColor } from './analysis.js'

const PLAYER_FIELDS = [
  { key: 'player_id', label: 'رقم اللاعب', type: 'number', placeholder: '101' },
  { key: 'name',      label: 'الاسم',       type: 'text',   placeholder: 'محمد علي' },
  { key: 'age',       label: 'العمر',       type: 'number', placeholder: '24' },
  { key: 'height_cm', label: 'الطول (سم)', type: 'number', placeholder: '180' },
  { key: 'weight_kg', label: 'الوزن (كجم)',type: 'number', placeholder: '75' },
  { key: 'position',  label: 'المركز',      type: 'text',   placeholder: 'Striker' },
]

const TEST_FIELDS = Object.entries(FACTOR_VARIABLES).map(([key, label]) => ({ key, label }))

export default function DataEntryView({ onBack, norms, sessionsCsv, onSessionsUpdated }) {
  const [mode, setMode] = useState('single')
  const [info, setInfo] = useState({})
  const [tests, setTests] = useState({})
  const [saving, setSaving] = useState(false)
  const [liveFactors, setLiveFactors] = useState(null)

  // Bulk
  const [bulkFile, setBulkFile] = useState(null)
  const [bulkRows, setBulkRows] = useState(null)
  const [bulkError, setBulkError] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)

  function handleTestChange(key, value) {
    const next = { ...tests, [key]: value }
    setTests(next)
    // Live analysis
    const allFilled = Object.keys(FACTOR_VARIABLES).every(k => next[k] && next[k] !== '')
    if (allFilled && norms) {
      const factors = analyzePlayer(next, norms)
      setLiveFactors(factors)
    } else {
      setLiveFactors(null)
    }
  }

  async function handleSave() {
    if (!info.player_id) { showToast('يرجى إدخال رقم اللاعب', 'error'); return }
    if (!info.name)      { showToast('يرجى إدخال اسم اللاعب', 'error'); return }

    setSaving(true)
    try {
      const record = {
        session_id: generateSessionId(info.player_id),
        player_id: info.player_id,
        name: info.name,
        age: info.age || '',
        height_cm: info.height_cm || '',
        weight_kg: info.weight_kg || '',
        position: info.position || '',
        date: getTodayDate(),
        ...Object.fromEntries(Object.keys(FACTOR_VARIABLES).map(k => [k, tests[k] || ''])),
      }

      const updated = appendRowsToCsv(sessionsCsv, [record])
      await writeFile(FILES.sessions, updated, `Add session for player ${info.player_id}`)
      onSessionsUpdated(updated)
      showToast('تم حفظ البيانات بنجاح ✓')
      setInfo({})
      setTests({})
      setLiveFactors(null)
    } catch (e) {
      showToast(`فشل الحفظ: ${e.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  function handleBulkFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setBulkFile(file)
    setBulkError('')
    setBulkRows(null)

    const reader = new FileReader()
    reader.onload = ev => {
      const rows = parseCsv(ev.target.result)
      const err = validateCsvColumns(rows)
      if (err) { setBulkError(err); return }
      setBulkRows(rows)
    }
    reader.readAsText(file)
  }

  async function handleBulkSave() {
    if (!bulkRows) return
    setBulkSaving(true)
    try {
      const today = getTodayDate()
      const newRecords = bulkRows.map(row => ({
        session_id: generateSessionId(row.player_id),
        player_id: row.player_id,
        name: row.name,
        age: row.age,
        height_cm: row.height_cm,
        weight_kg: row.weight_kg,
        position: row.position,
        date: today,
        coord3: row.coord3,
        force1: row.force1,
        force4: row.force4,
        agility1: row.agility1,
        endur5: row.endur5,
        speed5: row.speed5,
      }))

      const updated = appendRowsToCsv(sessionsCsv, newRecords)
      await writeFile(FILES.sessions, updated, `Bulk upload ${bulkRows.length} players`)
      onSessionsUpdated(updated)
      showToast(`تم رفع ${bulkRows.length} لاعب بنجاح ✓`)
      setBulkFile(null)
      setBulkRows(null)
    } catch (e) {
      showToast(`فشل الرفع: ${e.message}`, 'error')
    } finally {
      setBulkSaving(false)
    }
  }

  const colorMap = { green: 'var(--green)', yellow: 'var(--yellow)', red: 'var(--red)' }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="إدخال البيانات" onBack={onBack} />

      {/* Mode toggle */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
        {[['single', 'إدخال فردي'], ['bulk', 'رفع جماعي (CSV)']].map(([val, lbl]) => (
          <button
            key={val}
            className={mode === val ? 'btn btn-primary' : 'btn btn-ghost'}
            onClick={() => setMode(val)}
            style={{ padding: '6px 16px' }}
          >
            {val === 'bulk' && <Icons.upload />}
            {lbl}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
        {mode === 'single' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, maxWidth: 1000, margin: '0 auto' }}>

            {/* Left: form */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Player info */}
              <div>
                <div className="section-title">معلومات اللاعب</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {PLAYER_FIELDS.map(f => (
                    <div key={f.key}>
                      <label>{f.label}</label>
                      <input
                        type={f.type}
                        placeholder={f.placeholder}
                        value={info[f.key] || ''}
                        onChange={e => setInfo({ ...info, [f.key]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <hr className="divider" />

              {/* Test values */}
              <div>
                <div className="section-title">الاختبارات الأساسية</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {TEST_FIELDS.map(f => (
                    <div key={f.key}>
                      <label>{f.label}</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={tests[f.key] || ''}
                        onChange={e => handleTestChange(f.key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? <><span className="spinner" /> جارٍ الحفظ...</> : <><Icons.plus /> حفظ البيانات</>}
                </button>
              </div>
            </div>

            {/* Right: live summary */}
            <div className="card">
              <div className="section-title">ملخص الأداء (مباشر)</div>
              {liveFactors ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 8 }}>
                  {FACTOR_ORDER.map(f => (
                    <FactorRow key={f} factor={f} percentile={liveFactors[f] ?? 0} />
                  ))}
                  <hr className="divider" />
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                    القيم هي الرتبة المئوية مقارنة بالمجموعة المرجعية
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', marginTop: 20, lineHeight: 1.8 }}>
                  أدخل قيم الاختبارات لعرض التحليل الفوري
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Bulk upload */
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="section-title">رفع بيانات جماعية عبر CSV</div>

              <div style={{
                border: '2px dashed var(--border)', borderRadius: 10, padding: 32,
                textAlign: 'center', color: 'var(--text-secondary)',
              }}>
                <Icons.upload />
                <p style={{ margin: '12px 0 8px', fontSize: 14 }}>اختر ملف CSV</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
                  يجب أن يحتوي الملف على الأعمدة: player_id, name, age, height_cm, weight_kg, position, coord3, force1, force4, agility1, endur5, speed5
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleBulkFile}
                  style={{ display: 'none' }}
                  id="bulk-file-input"
                />
                <label htmlFor="bulk-file-input" className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                  <Icons.upload /> اختيار ملف
                </label>
              </div>

              {bulkFile && (
                <div style={{
                  background: 'var(--bg-input)', borderRadius: 8, padding: '10px 14px',
                  fontSize: 13, color: 'var(--text-secondary)',
                }}>
                  الملف: {bulkFile.name}
                </div>
              )}

              {bulkError && (
                <div style={{
                  background: 'var(--red-bg)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)',
                }}>
                  {bulkError}
                </div>
              )}

              {bulkRows && !bulkError && (
                <div style={{
                  background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)',
                  borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--accent)',
                }}>
                  تم قراءة {bulkRows.length} سجل بنجاح. اضغط "رفع البيانات" للحفظ.
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleBulkSave}
                  disabled={!bulkRows || !!bulkError || bulkSaving}
                >
                  {bulkSaving
                    ? <><span className="spinner" /> جارٍ الرفع...</>
                    : <><Icons.upload /> رفع البيانات</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
