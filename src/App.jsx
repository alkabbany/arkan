import React, { useState, useEffect } from 'react'
import { ToastProvider, showToast, LoadingOverlay } from './components.jsx'
import LoginView from './LoginView.jsx'
import DashboardView from './DashboardView.jsx'
import DataEntryView from './DataEntryView.jsx'
import IndividualReportView from './IndividualReportView.jsx'
import GroupReportView from './GroupReportView.jsx'
import { loadSessions, loadNorms } from './github.js'
import { parseCsv } from './csvUtils.js'
import { computeNorms } from './analysis.js'

export default function App() {
  const [view, setView] = useState('login')
  const [username, setUsername] = useState('')

  // Shared data state
  const [sessionsCsv, setSessionsCsv] = useState('')
  const [norms, setNorms] = useState(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [dataError, setDataError] = useState('')

  // Load shared data after login
  async function loadData() {
    setDataLoading(true)
    setDataError('')
    try {
      const [sessText, normsText] = await Promise.all([
        loadSessions(),
        loadNorms(),
      ])
      setSessionsCsv(sessText)
      setNorms(computeNorms(normsText))
    } catch (e) {
      setDataError(`فشل تحميل البيانات: ${e.message}`)
      showToast('فشل تحميل البيانات', 'error')
    } finally {
      setDataLoading(false)
    }
  }

  function handleLogin(user) {
    setUsername(user)
    setView('dashboard')
    loadData()
  }

  function handleLogout() {
    setUsername('')
    setView('login')
    setSessionsCsv('')
    setNorms(null)
  }

  // Compute dashboard stats
  const sessionStats = React.useMemo(() => {
    if (!sessionsCsv) return { sessionCount: 0, playerCount: 0, latestDate: '-' }
    const rows = parseCsv(sessionsCsv)
    const playerCount = new Set(rows.map(r => r.player_id)).size
    const dates = rows.map(r => r.date).filter(Boolean).sort()
    const latestDate = dates[dates.length - 1] || '-'
    return { sessionCount: rows.length, playerCount, latestDate }
  }, [sessionsCsv])

  // Loading screen shown for all authenticated views while data loads
  if (view !== 'login' && dataLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <LoadingOverlay text="جارٍ تحميل البيانات..." />
        <ToastProvider />
      </div>
    )
  }

  if (view !== 'login' && dataError) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <p style={{ color: 'var(--red)', textAlign: 'center' }}>{dataError}</p>
        <button className="btn btn-primary" onClick={loadData}>إعادة المحاولة</button>
        <button className="btn btn-ghost" onClick={handleLogout}>تسجيل الخروج</button>
        <ToastProvider />
      </div>
    )
  }

  return (
    <>
      {view === 'login' && (
        <LoginView onLogin={handleLogin} />
      )}
      {view === 'dashboard' && (
        <DashboardView
          username={username}
          sessionStats={sessionStats}
          onNavigate={setView}
          onLogout={handleLogout}
        />
      )}
      {view === 'data-entry' && (
        <DataEntryView
          onBack={() => setView('dashboard')}
          norms={norms}
          sessionsCsv={sessionsCsv}
          onSessionsUpdated={setSessionsCsv}
        />
      )}
      {view === 'individual' && (
        <IndividualReportView
          onBack={() => setView('dashboard')}
          norms={norms}
          sessionsCsv={sessionsCsv}
        />
      )}
      {view === 'group' && (
        <GroupReportView
          onBack={() => setView('dashboard')}
          norms={norms}
          sessionsCsv={sessionsCsv}
        />
      )}
      <ToastProvider />
    </>
  )
}
