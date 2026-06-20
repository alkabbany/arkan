import React from 'react'
import { Icons, PageHeader } from './components.jsx'

export default function DashboardView({ username, sessionStats, onNavigate, onLogout }) {
  const { sessionCount = 0, playerCount = 0, latestDate = '-' } = sessionStats || {}

  const cards = [
    {
      key: 'data-entry',
      title: 'إدخال بيانات لاعب',
      desc: 'إدخال فردي أو رفع ملف CSV',
      icon: <Icons.plus />,
      color: '#14B8A6',
    },
    {
      key: 'individual',
      title: 'التقارير الفردية',
      desc: 'تحليل أداء لاعب بعينه',
      icon: <Icons.user />,
      color: '#2563EB',
    },
    {
      key: 'group',
      title: 'التقارير الجماعية',
      desc: 'تحليل أداء الفريق كاملاً',
      icon: <Icons.users />,
      color: '#7C3AED',
    },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="نظام أركان لتحليل الأداء الرياضي"
        onLogout={onLogout}
        username={username}
      />

      <div style={{ flex: 1, padding: '40px 24px', maxWidth: 960, margin: '0 auto', width: '100%' }}>
        {/* Welcome */}
        <div style={{ marginBottom: 36, textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, marginBottom: 6 }}>مرحباً، {username}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            اختر أحد الخيارات للبدء
          </p>
        </div>

        {/* Navigation cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 36,
        }}>
          {cards.map(card => (
            <button
              key={card.key}
              onClick={() => onNavigate(card.key)}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '28px 20px',
                cursor: 'pointer',
                textAlign: 'right',
                transition: 'border-color 0.15s, background 0.15s',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                fontFamily: 'var(--font)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = card.color
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.background = 'var(--bg-card)'
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: card.color + '22', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: card.color,
              }}>
                {card.icon}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {card.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {card.desc}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Stats footer */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
        }}>
          <div className="stat-card">
            <span className="stat-label">إجمالي السجلات</span>
            <span className="stat-value" style={{ color: '#14B8A6' }}>{sessionCount}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">عدد اللاعبين</span>
            <span className="stat-value" style={{ color: '#2563EB' }}>{playerCount}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">آخر تقرير</span>
            <span className="stat-value" style={{ fontSize: 15 }}>{latestDate}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
