import Papa from 'papaparse'

// ── Parse CSV text → array of objects ────────────────────────────────────────
export function parseCsv(text) {
  const result = Papa.parse(text.trim(), {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  })
  return result.data
}

// ── Serialize array of objects → CSV text ────────────────────────────────────
export function serializeCsv(rows) {
  if (!rows || rows.length === 0) return ''
  return Papa.unparse(rows)
}

// ── Merge a new row into existing CSV text ────────────────────────────────────
export function appendRowToCsv(existingCsvText, newRow) {
  const rows = parseCsv(existingCsvText)
  rows.push(newRow)
  return serializeCsv(rows)
}

// ── Merge multiple rows into existing CSV text ────────────────────────────────
export function appendRowsToCsv(existingCsvText, newRows) {
  const rows = parseCsv(existingCsvText)
  return serializeCsv([...rows, ...newRows])
}

// ── Generate session ID ───────────────────────────────────────────────────────
export function generateSessionId(playerId) {
  const now = new Date()
  const ts = now.toISOString().replace(/[-:T]/g, '').slice(0, 15)
  return `${playerId}_${ts}`
}

// ── Get today's date as YYYY-MM-DD ────────────────────────────────────────────
export function getTodayDate() {
  return new Date().toISOString().slice(0, 10)
}

// ── Required columns for bulk upload validation ───────────────────────────────
export const REQUIRED_COLUMNS = [
  'player_id', 'name', 'age', 'height_cm', 'weight_kg', 'position',
  'coord3', 'force1', 'force4', 'agility1', 'endur5', 'speed5',
]

export function validateCsvColumns(rows) {
  if (!rows || rows.length === 0) return 'الملف فارغ'
  const cols = Object.keys(rows[0])
  const missing = REQUIRED_COLUMNS.filter(c => !cols.includes(c))
  if (missing.length > 0) return `أعمدة مفقودة: ${missing.join(', ')}`
  return null
}
