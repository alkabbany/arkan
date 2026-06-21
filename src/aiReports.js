import { ANTHROPIC_MODEL, FACTOR_LABELS_AR, FACTOR_ORDER } from './config.js'

const API_URL = '/api/claude'

async function callClaude(messages) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 4000,
      messages,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`API ${res.status}: ${data?.error?.message || JSON.stringify(data)}`)
  const text = data?.content?.[0]?.text
  if (!text) throw new Error('No text in response')
  return text
}

// ── Robust JSON extractor ─────────────────────────────────────────────────────
// Handles: raw JSON, ```json...```, partial JSON, JSON buried in text
function extractJson(raw) {
  // 1. Strip all markdown fences
  let text = raw
    .replace(/^[\s\S]*?```(?:json)?\s*/i, '')  // remove everything up to and including opening fence
    .replace(/\s*```[\s\S]*$/i, '')              // remove closing fence and everything after
    .trim()

  // If no fence was found, use original
  if (text.length < 10) text = raw.trim()

  // 2. Find the outermost { ... }
  let depth = 0, start = -1, end = -1
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') { if (depth === 0) start = i; depth++ }
    else if (text[i] === '}') { depth--; if (depth === 0) { end = i; break } }
  }

  if (start === -1 || end === -1) return null
  const jsonStr = text.slice(start, end + 1)

  // 3. Try parsing
  try { return JSON.parse(jsonStr) } catch {}

  // 4. Fix common issues and retry
  const fixed = jsonStr
    .replace(/,\s*([}\]])/g, '$1')           // trailing commas
    .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":') // unquoted keys
    .replace(/:\s*'([^']*)'/g, ': "$1"')      // single-quoted values
  try { return JSON.parse(fixed) } catch {}

  // 5. Last resort: regex-extract each field individually
  const get = (key) => {
    // Match "key": "value" including multiline values
    const m = raw.match(new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.|\n)*)"`, 's'))
    return m ? m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim() : null
  }

  const getArray = (key) => {
    // Find the array for this key and extract objects from it
    const m = raw.match(new RegExp(`"${key}"\\s*:\\s*\\[(.*?)\\]`, 's'))
    if (!m) return []
    const items = []
    const objRe = /\{([^{}]*)\}/gs
    let match
    while ((match = objRe.exec(m[1])) !== null) {
      const obj = {}
      const kvRe = /"(\w+)"\s*:\s*"((?:[^"\\]|\\.)*)"/gs
      let kv
      while ((kv = kvRe.exec(match[1])) !== null) {
        obj[kv[1]] = kv[2].replace(/\\n/g, '\n').trim()
      }
      if (Object.keys(obj).length) items.push(obj)
    }
    return items
  }

  return {
    summary:           get('summary') || '',
    detailed_analysis: get('detailed_analysis') || '',
    weak_points:       getArray('weak_points'),
    recommendations:   getArray('recommendations'),
  }
}

// ── Individual AI report ──────────────────────────────────────────────────────
export async function generateIndividualAIReport(playerInfo, factorPercentiles) {
  const factorLines = FACTOR_ORDER
    .map(f => `- ${FACTOR_LABELS_AR[f]}: ${factorPercentiles[f] ?? '-'}%`)
    .join('\n')

  // Two-turn conversation: ask Claude to plan then produce JSON
  const messages = [
    {
      role: 'user',
      content: `أنت محلل أداء رياضي محترف. ستحلل بيانات لاعب وتُنتج تقريراً.

بيانات اللاعب:
- الاسم: ${playerInfo.name}
- العمر: ${playerInfo.age}
- المركز: ${playerInfo.position}

الرتب المئوية مقارنة بالمجموعة المرجعية:
${factorLines}

اكتب تحليلاً احترافياً بالعربية يتضمن: ملخصاً عاماً، تحليلاً تفصيلياً، نقاط الضعف، وتوصيات تدريبية.`
    },
    {
      role: 'assistant',
      content: 'سأحلل بيانات اللاعب وأقدم تقريراً احترافياً شاملاً.'
    },
    {
      role: 'user',
      content: `ممتاز. الآن أعد نفس المحتوى بالضبط لكن في صيغة JSON فقط، بدون أي نص خارج الـ JSON:

{
  "summary": "الملخص العام هنا",
  "detailed_analysis": "التحليل التفصيلي هنا",
  "weak_points": [{"factor": "اسم العامل", "analysis": "التحليل"}],
  "recommendations": [{"title": "العنوان", "details": "التفاصيل"}]
}`
    }
  ]

  try {
    const raw = await callClaude(messages)
    const parsed = extractJson(raw)
    if (!parsed) throw new Error('Could not extract JSON')
    return {
      summary:           parsed.summary || '',
      detailed_analysis: parsed.detailed_analysis || '',
      weak_points:       Array.isArray(parsed.weak_points) ? parsed.weak_points : [],
      recommendations:   Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    }
  } catch (e) {
    console.error('Individual report error:', e)
    return { summary: `خطأ: ${e.message}`, detailed_analysis: '', weak_points: [], recommendations: [] }
  }
}

// ── Group AI report ───────────────────────────────────────────────────────────
export async function generateGroupAIReport(teamAvg) {
  const factorLines = FACTOR_ORDER
    .map(f => `- ${FACTOR_LABELS_AR[f]}: ${teamAvg[f] ?? '-'}%`)
    .join('\n')

  const messages = [
    {
      role: 'user',
      content: `أنت محلل أداء رياضي محترف. ستحلل أداء فريق وتُنتج تقريراً.

متوسطات الفريق (الرتبة المئوية):
${factorLines}

اكتب تحليلاً احترافياً بالعربية يتضمن: ملخصاً عاماً، نقاط الضعف الجماعية، وتوصيات تدريبية.`
    },
    {
      role: 'assistant',
      content: 'سأحلل أداء الفريق وأقدم تقريراً احترافياً شاملاً.'
    },
    {
      role: 'user',
      content: `ممتاز. الآن أعد نفس المحتوى بالضبط لكن في صيغة JSON فقط، بدون أي نص خارج الـ JSON:

{
  "summary": "الملخص العام هنا",
  "weak_points": [{"factor": "اسم العامل", "analysis": "التحليل"}],
  "recommendations": [{"title": "العنوان", "details": "التفاصيل"}]
}`
    }
  ]

  try {
    const raw = await callClaude(messages)
    const parsed = extractJson(raw)
    if (!parsed) throw new Error('Could not extract JSON')
    return {
      summary:     parsed.summary || '',
      weak_points: Array.isArray(parsed.weak_points) ? parsed.weak_points : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    }
  } catch (e) {
    console.error('Group report error:', e)
    return { summary: `خطأ: ${e.message}`, weak_points: [], recommendations: [] }
  }
}
