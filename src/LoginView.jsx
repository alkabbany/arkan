import React, { useState } from 'react'
import { validateUser } from './auth.js'
import { Icons, showToast } from './components.jsx'

export default function LoginView({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور')
      return
    }
    setLoading(true)
    setError('')
    try {
      const ok = await validateUser(username, password)
      if (ok) {
        showToast('مرحباً بك في نظام أركان')
        onLogin(username)
      } else {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة')
      }
    } catch (e) {
      setError('تعذر الاتصال بالخادم. تحقق من الإعدادات.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg-base)',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, background: '#14B8A6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', fontSize: 28, fontWeight: 700, color: '#fff',
          }}>أ</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>نظام أركان</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            لتحليل الأداء الرياضي
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label>اسم المستخدم</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="أدخل اسم المستخدم"
              autoComplete="username"
              disabled={loading}
            />
          </div>
          <div>
            <label>كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="أدخل كلمة المرور"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {error && (
            <div style={{
              background: 'var(--red-bg)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--red)',
              textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
          >
            {loading ? <><span className="spinner" /> جارٍ التحقق...</> : 'تسجيل الدخول'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, marginTop: 20 }}>
          نظام أركان لتحليل الأداء الرياضي • جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  )
}
