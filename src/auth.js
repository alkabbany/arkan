import { parseCsv } from './csvUtils.js'
import { loadUsers } from './github.js'

export async function validateUser(username, password) {
  try {
    const text = await loadUsers()
    const rows = parseCsv(text)
    return rows.some(
      r =>
        String(r.username).trim() === String(username).trim() &&
        String(r.password).trim() === String(password).trim()
    )
  } catch (e) {
    console.error('Auth error:', e)
    return false
  }
}
