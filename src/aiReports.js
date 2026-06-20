import { ANTHROPIC_MODEL, FACTOR_LABELS_AR, FACTOR_ORDER } from './config.js'

// Calls our Vercel serverless proxy (/api/claude) to avoid CORS
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

  if (!res.ok) {
    const msg = data?.error?.message || data?.error || JSON.stringify(data)
    throw new Error(`API error ${res.status}: ${msg}`)
  }

  // Claude returns content as array of blocks
  const block = data?.content?.find(b => b.type === 'text')
  if (!block?.text) throw new Error('Empty response from API')
  return block.text
}

function parseJson(raw) {
  // Strip markdown fences
  let text = raw.trim().replace(/```[\w]*\n?|```/g, '').trim()

  // Extract first JSON object
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) {
    console.error('No JSON object found in:', text.slice(0, 200))
    return null
  }

  text = text.slice(start, end + 1)

  // Fix common JSON issues
  text = text
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']')
    .replace(/[\u0000-\u001F\u007F]/g, ' ') // strip control chars

  try {
    return JSON.parse(text)
  } catch (e) {
    console.error('JSON parse failed:', e.message, '\nText:', text.slice(0, 300))
    return null
  }
}

// ── Individual AI report ──────────────────────────────────────────────────────
export async function generateIndividualAIReport(playerInfo, factorPercentiles) {
  const factorLines = FACTOR_ORDER.map(f =>
    `${FACTOR_LABELS_AR[f]}: الرتبة المئوية ${factorPercentiles[f] ?? '-'}%`
  ).join('\n')

  const prompt = `أنت محلل أداء رياضي محترف. أرجع JSON فقط بدون أي نص إضافي قبله أو بعده.

الشكل المطلوب:
{
  "summary": "ملخص عام للأداء في فقرة واحدة بالعربية",
  "detailed_analysis": "تحليل تفصيلي مترابط في فقرتين بالعربية",
  "weak_points": [
    { "factor": "اسم العامل", "analysis": "تحليل نقطة الضعف" }
  ],
  "recommendations": [
    { "title": "عنوان التوصية", "details": "تفاصيل التوصية" }
  ]
}

بيانات اللاعب:
- الاسم: ${playerInfo.name}
- العمر: ${playerInfo.age}
- المركز: ${playerInfo.position}

النتائج (الرتبة المئوية):
${factorLines}

قواعد: اكتب بالعربية فقط. لا تذكر أرقاماً. أرجع JSON صالح فقط.`

  try {
    const raw = await callClaude(prompt)
    const parsed = parseJson(raw)
    if (!parsed) throw new Error('Could not parse response')
    return {
      summary: parsed.summary || '',
      detailed_analysis: parsed.detailed_analysis || '',
      weak_points: parsed.weak_points || [],
      recommendations: parsed.recommendations || [],
    }
  } catch (e) {
    console.error('Individual AI report error:', e)
    return {
      summary: `تعذر توليد التقرير: ${e.message}`,
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

  const prompt = `أنت محلل أداء رياضي محترف. أرجع JSON فقط بدون أي نص إضافي.

الشكل المطلوب:
{
  "summary": "تحليل عام لأداء الفريق بالعربية",
  "weak_points": [
    { "factor": "اسم العامل", "analysis": "تحليل نقطة الضعف" }
  ],
  "recommendations": [
    { "title": "عنوان التوصية", "details": "تفاصيل التوصية" }
  ]
}

متوسطات الفريق (الرتبة المئوية):
${factorLines}

قواعد: اكتب بالعربية فقط. لا تذكر أرقاماً. أرجع JSON صالح فقط.`

  try {
    const raw = await callClaude(prompt)
    const parsed = parseJson(raw)
    if (!parsed) throw new Error('Could not parse response')
    return {
      summary: parsed.summary || '',
      weak_points: parsed.weak_points || [],
      recommendations: parsed.recommendations || [],
    }
  } catch (e) {
    console.error('Group AI report error:', e)
    return {
      summary: `تعذر توليد التقرير: ${e.message}`,
      weak_points: [],
      recommendations: [],
    }
  }
}
