import { parseCsv } from './csvUtils.js'
import {
  TEST_TO_FACTOR,
  FACTOR_ORDER,
  REVERSE_METRICS,
  PERC_HIGH,
  PERC_LOW,
} from './config.js'

// ── Normal CDF (error function approximation) ────────────────────────────────
function normalCdf(z) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z))
  const poly =
    t * (0.254829592 +
    t * (-0.284496736 +
    t * (1.421413741 +
    t * (-1.453152027 +
    t * 1.061405429))))
  const erf = 1 - poly * Math.exp(-z * z)
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2
}

// ── Compute mean and std from the reference population CSV text ──────────────
export function computeNorms(normsCsvText) {
  const df = parseCsv(normsCsvText)
  const vars = ['coord3', 'force1', 'force4', 'agility1', 'endur5', 'speed5']
  const norms = {}

  for (const v of vars) {
    const values = df.map(r => parseFloat(r[v])).filter(n => !isNaN(n))
    if (values.length === 0) continue
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const std = Math.sqrt(
      values.reduce((sum, x) => sum + (x - mean) ** 2, 0) / values.length
    )
    norms[v] = { mean, std }
  }

  return norms
}

// ── Compute Z-scores for a player's raw test values ──────────────────────────
export function computeZScores(rawData, norms) {
  const scores = {}

  for (const [varName, value] of Object.entries(rawData)) {
    if (!(varName in norms)) continue
    const num = parseFloat(value)
    if (isNaN(num)) continue

    const { mean, std } = norms[varName]
    if (std === 0) continue

    let z = (num - mean) / std
    if (REVERSE_METRICS.includes(varName)) z = -z
    scores[varName] = Math.round(z * 100) / 100
  }

  return scores
}

// ── Convert Z-score to percentile (0–100) ────────────────────────────────────
export function zToPercentile(z) {
  return Math.round(normalCdf(z) * 100)
}

// ── Aggregate variable Z-scores → factor percentiles ─────────────────────────
export function aggregateToFactors(zScores) {
  const factorZ = {}

  for (const [varName, z] of Object.entries(zScores)) {
    const factor = TEST_TO_FACTOR[varName]
    if (!factor) continue
    if (!factorZ[factor]) factorZ[factor] = []
    factorZ[factor].push(z)
  }

  const factors = {}
  for (const [factor, zArr] of Object.entries(factorZ)) {
    const avgZ = zArr.reduce((a, b) => a + b, 0) / zArr.length
    factors[factor] = zToPercentile(avgZ)
  }

  return factors
}

// ── Full pipeline: raw values → factor percentiles ───────────────────────────
export function analyzePlayer(rawData, norms) {
  const zScores = computeZScores(rawData, norms)
  return aggregateToFactors(zScores)
}

// ── Score color ───────────────────────────────────────────────────────────────
export function scoreColor(percentile) {
  if (percentile >= PERC_HIGH) return 'green'
  if (percentile >= PERC_LOW)  return 'yellow'
  return 'red'
}

// ── Qualitative label ─────────────────────────────────────────────────────────
export function scoreLabel(percentile) {
  if (percentile >= PERC_HIGH) return 'جيد'
  if (percentile >= PERC_LOW)  return 'متوسط'
  return 'ضعيف'
}

// ── Team averages from sessions rows (using raw values averaged per player) ──
export function computeTeamFactors(sessionRows, norms) {
  // Group by player_id, take latest session per player
  const byPlayer = {}
  for (const row of sessionRows) {
    const pid = String(row.player_id)
    if (!byPlayer[pid]) byPlayer[pid] = []
    byPlayer[pid].push(row)
  }

  const playerFactors = []
  for (const [pid, rows] of Object.entries(byPlayer)) {
    // Sort by date, take latest
    rows.sort((a, b) => new Date(a.date) - new Date(b.date))
    const latest = rows[rows.length - 1]
    const raw = {
      coord3: latest.coord3, force1: latest.force1, force4: latest.force4,
      agility1: latest.agility1, endur5: latest.endur5, speed5: latest.speed5,
    }
    playerFactors.push({
      player_id: pid,
      name: latest.name,
      position: latest.position,
      factors: analyzePlayer(raw, norms),
    })
  }

  // Team averages
  const teamAvg = {}
  for (const factor of FACTOR_ORDER) {
    const vals = playerFactors.map(p => p.factors[factor]).filter(v => v !== undefined)
    teamAvg[factor] = vals.length
      ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      : 0
  }

  // Rankings by average percentile
  const ranked = playerFactors.map(p => ({
    ...p,
    avg: Math.round(
      FACTOR_ORDER.reduce((s, f) => s + (p.factors[f] || 0), 0) / FACTOR_ORDER.length
    ),
  })).sort((a, b) => b.avg - a.avg)

  return { teamAvg, players: ranked }
}
