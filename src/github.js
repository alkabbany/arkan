import { GITHUB_CONFIG, FILES } from './config.js'

const BASE = 'https://api.github.com'

function headers() {
  return {
    Authorization: `Bearer ${GITHUB_CONFIG.token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

// ── Fetch a file via GitHub Contents API (authenticated, no CORS issues) ──────
export async function fetchFileText(path) {
  const { owner, repo, branch } = GITHUB_CONFIG
  const url = `${BASE}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`
  const res = await fetch(url, { headers: headers(), cache: 'no-store' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `Failed to fetch ${path}: ${res.status}`)
  }
  const data = await res.json()
  // GitHub returns file content as base64
  return decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))))
}

// ── Get file SHA (needed for updates) ────────────────────────────────────────
async function getFileSha(path) {
  const { owner, repo, branch } = GITHUB_CONFIG
  const url = `${BASE}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`
  const res = await fetch(url, { headers: headers() })
  if (!res.ok) return null
  const data = await res.json()
  return data.sha || null
}

// ── Write a file to GitHub ────────────────────────────────────────────────────
export async function writeFile(path, content, message) {
  const { owner, repo, branch } = GITHUB_CONFIG
  const url = `${BASE}/repos/${owner}/${repo}/contents/${path}`
  const sha = await getFileSha(path)
  const encoded = btoa(unescape(encodeURIComponent(content)))

  const body = {
    message: message || `Update ${path}`,
    content: encoded,
    branch,
    ...(sha ? { sha } : {}),
  }

  const res = await fetch(url, {
    method: 'PUT',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || `Failed to write ${path}`)
  }

  return res.json()
}

// ── Convenience loaders ───────────────────────────────────────────────────────
export const loadUsers    = () => fetchFileText(FILES.users)
export const loadSessions = () => fetchFileText(FILES.sessions)
export const loadNorms    = () => fetchFileText(FILES.norms)
