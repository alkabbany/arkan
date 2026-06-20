import { ANTHROPIC_MODEL, FACTOR_LABELS_AR, FACTOR_ORDER } from './config.js'

const API_URL = 'https://api.anthropic.com/v1/messages'

async function callClaude(prompt) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'API error')
  return data.content[0].text
}

function parseJson(raw) {
  let text = raw.trim().replace(/```[\w]*|```/g, '').trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) return null
  text = text.slice(start, end + 1)
  text = text.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']')
  try { return JSON.parse(text) } catch { return null }
}

// ── Individual AI report ──────────────────────────────────────────────────────
export async function generateIndividualAIReport(playerInfo, factorPercentiles) {
  const factorLines = FACTOR_ORDER.map(f =>
    `${FACTOR_LABELS_AR[f]}: الرتبة المئوية ${factorPercentiles[f] ?? '-'}%`
  ).join('\n')

  const prompt = `أنت محلل أداء رياضي محترف.

⚠️ تعليمات مهمة:
- اكتب باللغة العربية فقط
- أرجع JSON فقط بدون أي نص إضافي
- استخدم وصفاً لغوياً فقط مثل: (مرتفع، متوسط، منخفض، ضعيف، قوي)
- لا تذكر أرقاماً داخل النص
- اكتب بأسلوب احترافي تحليلي
- اجعل الفقرات تحتوي على شرح كافٍ ومترابط
- اربط بين العوامل المختلفة

الشكل المطلوب (JSON فقط):
{
  "summary": "ملخص واضح من فقرة متوسطة الطول",
  "detailed_analysis": "تحليل تفصيلي من فقرتين إلى ثلاث فقرات مترابطة",
  "weak_points": [
    { "factor": "اسم العامل", "analysis": "تحليل مفصل يشرح سبب الضعف وتأثيره" }
  ],
  "recommendations": [
    { "title": "عنوان واضح", "details": "شرح عملي لكيفية التحسين" }
  ]
}

بيانات اللاعب:
الاسم: ${playerInfo.name}
العمر: ${playerInfo.age}
المركز: ${playerInfo.position}

النتائج (الرتبة المئوية مقارنة بالمجموعة المرجعية):
${factorLines}

أرجع JSON صالح فقط بدون أي نص إضافي.`

  try {
    const raw = await callClaude(prompt)
    const parsed = parseJson(raw)
    if (!parsed) throw new Error('Invalid JSON')
    parsed.weak_points = parsed.weak_points || []
    parsed.recommendations = parsed.recommendations || []
    return parsed
  } catch (e) {
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
    `${FACTOR_LABELS_AR[f]}: الرتبة المئوية ${teamAvg[f] ?? '-'}%`
  ).join('\n')

  const prompt = `أنت محلل أداء رياضي محترف.

لديك متوسط أداء فريق رياضي (الرتبة المئوية لكل عامل):
${factorLines}

المطلوب:
1. تحليل عام لأداء الفريق بأسلوب احترافي
2. تحديد نقاط الضعف الجماعية
3. توصيات تدريبية واضحة وقابلة للتطبيق

اكتب بالعربية فقط. لا تستخدم أرقاماً في النص.

أعد النتيجة بصيغة JSON فقط:
{
  "summary": "تحليل عام من فقرة إلى فقرتين",
  "weak_points": [
    { "factor": "اسم العامل", "analysis": "تحليل سبب الضعف وأثره على الفريق" }
  ],
  "recommendations": [
    { "title": "عنوان التوصية", "details": "تفاصيل التوصية العملية" }
  ]
}`

  try {
    const raw = await callClaude(prompt)
    const parsed = parseJson(raw)
    if (!parsed) throw new Error('Invalid JSON')
    parsed.weak_points = parsed.weak_points || []
    parsed.recommendations = parsed.recommendations || []
    return parsed
  } catch (e) {
    return {
      summary: `تعذر توليد التقرير: ${e.message}`,
      weak_points: [],
      recommendations: [],
    }
  }
}
