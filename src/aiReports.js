import { ANTHROPIC_MODEL, FACTOR_LABELS_AR, FACTOR_ORDER } from './config.js'

const API_URL = '/api/claude'

async function callClaude(prompt) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(`API ${res.status}: ${data?.error?.message || JSON.stringify(data)}`)

  const text = data?.content?.[0]?.text
  if (!text) throw new Error('No text in response')
  return text
}

function parseJson(raw) {
  let text = raw.trim()

  // Strip any markdown fences (```json ... ``` or ``` ... ```)
  text = text.replace(/^```[\w]*\n?/gm, '').replace(/^```\n?/gm, '').trim()

  // Extract the JSON object
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) return null

  text = text.slice(start, end + 1)

  try {
    return JSON.parse(text)
  } catch {
    // Truncated JSON — extract fields individually
    const get = (key) => {
      const m = text.match(new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 's'))
      return m ? m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : ''
    }
    return {
      summary: get('summary'),
      detailed_analysis: get('detailed_analysis'),
      weak_points: [],
      recommendations: [],
    }
  }
}

// ── Individual AI report ──────────────────────────────────────────────────────
export async function generateIndividualAIReport(playerInfo, factorPercentiles) {
  const factorLines = FACTOR_ORDER.map(f =>
    `${FACTOR_LABELS_AR[f]}: ${factorPercentiles[f] ?? '-'}%`
  ).join('\n')

  const prompt = `Analyze this athlete and return a JSON object.

Player: ${playerInfo.name}, Age: ${playerInfo.age}, Position: ${playerInfo.position}

Percentile scores vs reference group:
${factorLines}

Return this exact JSON structure with Arabic text values:
{
  "summary": "paragraph summarizing overall performance",
  "detailed_analysis": "two paragraphs of detailed analysis",
  "weak_points": [
    {"factor": "factor name", "analysis": "why it is weak and its impact"}
  ],
  "recommendations": [
    {"title": "recommendation title", "details": "practical training recommendation"}
  ]
}`

  try {
    const raw = await callClaude(prompt)
    const parsed = parseJson(raw)
    if (!parsed) throw new Error('Could not parse response')
    return {
      summary: parsed.summary || '',
      detailed_analysis: parsed.detailed_analysis || '',
      weak_points: Array.isArray(parsed.weak_points) ? parsed.weak_points : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    }
  } catch (e) {
    return { summary: `خطأ: ${e.message}`, detailed_analysis: '', weak_points: [], recommendations: [] }
  }
}

// ── Group AI report ───────────────────────────────────────────────────────────
export async function generateGroupAIReport(teamAvg) {
  const factorLines = FACTOR_ORDER.map(f =>
    `${FACTOR_LABELS_AR[f]}: ${teamAvg[f] ?? '-'}%`
  ).join('\n')

  const prompt = `Analyze this team's performance and return a JSON object.

Team average percentile scores:
${factorLines}

Return this exact JSON structure with Arabic text values:
{
  "summary": "paragraph summarizing team performance",
  "weak_points": [
    {"factor": "factor name", "analysis": "why it is weak and its impact on the team"}
  ],
  "recommendations": [
    {"title": "recommendation title", "details": "practical team training recommendation"}
  ]
}`

  try {
    const raw = await callClaude(prompt)
    const parsed = parseJson(raw)
    if (!parsed) throw new Error('Could not parse response')
    return {
      summary: parsed.summary || '',
      weak_points: Array.isArray(parsed.weak_points) ? parsed.weak_points : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    }
  } catch (e) {
    return { summary: `خطأ: ${e.message}`, weak_points: [], recommendations: [] }
  }
}
