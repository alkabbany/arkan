import { ANTHROPIC_MODEL, FACTOR_LABELS_AR, FACTOR_ORDER } from './config.js'

const API_URL = '/api/claude'

async function callClaude(prompt) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await res.json()
  console.log('=== RAW API RESPONSE ===', JSON.stringify(data).slice(0, 500))

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${data?.error?.message || JSON.stringify(data)}`)
  }

  const text = data?.content?.[0]?.text
  if (!text) throw new Error(`No text in response. Keys: ${Object.keys(data).join(', ')}`)

  console.log('=== RAW TEXT ===', text.slice(0, 300))
  return text
}

function parseJson(raw) {
  let text = raw.trim()

  // Remove markdown fences
  text = text.replace(/^```[\w]*\n?/m, '').replace(/\n?```$/m, '').trim()

  // Find JSON boundaries
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')

  if (start === -1 || end === -1) {
    console.error('No braces found. Raw:', text.slice(0, 200))
    return null
  }

  text = text.slice(start, end + 1)

  try {
    return JSON.parse(text)
  } catch (e) {
    console.error('Parse error:', e.message, 'Text:', text.slice(0, 300))
    // Last resort: return a plain object with the raw text as summary
    return { summary: raw.slice(0, 500), weak_points: [], recommendations: [] }
  }
}

// ── Individual AI report ──────────────────────────────────────────────────────
export async function generateIndividualAIReport(playerInfo, factorPercentiles) {
  const factorLines = FACTOR_ORDER.map(f =>
    `${FACTOR_LABELS_AR[f]}: ${factorPercentiles[f] ?? '-'}%`
  ).join('\n')

  const prompt = `You are a sports performance analyst. Respond ONLY with a valid JSON object, no other text.

Format:
{
  "summary": "Arabic text: general performance summary",
  "detailed_analysis": "Arabic text: detailed analysis in 2-3 paragraphs",
  "weak_points": [{"factor": "factor name in Arabic", "analysis": "explanation in Arabic"}],
  "recommendations": [{"title": "title in Arabic", "details": "details in Arabic"}]
}

Player data:
Name: ${playerInfo.name}
Age: ${playerInfo.age}
Position: ${playerInfo.position}

Percentile scores vs reference group:
${factorLines}

Rules: Write all values in Arabic. Return ONLY the JSON object.`

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
    console.error('Individual report error:', e)
    return {
      summary: `خطأ: ${e.message}`,
      detailed_analysis: '',
      weak_points: [],
      recommendations: [],
    }
  }
}

// ── Group AI report ───────────────────────────────────────────────────────────
export async function generateGroupAIReport(teamAvg) {
  const factorLines = FACTOR_ORDER.map(f =>
    `${FACTOR_LABELS_AR[f]}: ${teamAvg[f] ?? '-'}%`
  ).join('\n')

  const prompt = `You are a sports performance analyst. Respond ONLY with a valid JSON object, no other text.

Format:
{
  "summary": "Arabic text: team performance summary",
  "weak_points": [{"factor": "factor name in Arabic", "analysis": "explanation in Arabic"}],
  "recommendations": [{"title": "title in Arabic", "details": "details in Arabic"}]
}

Team average percentile scores:
${factorLines}

Rules: Write all values in Arabic. Return ONLY the JSON object.`

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
    console.error('Group report error:', e)
    return {
      summary: `خطأ: ${e.message}`,
      weak_points: [],
      recommendations: [],
    }
  }
}
