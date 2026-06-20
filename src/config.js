// ── Factor variable metadata ─────────────────────────────────────────────────
export const FACTOR_VARIABLES = {
  coord3:   'التوافق الحركي للعين والرجل',
  force1:   'قوة القبضة',
  force4:   'الانبطاح المائل ثني الذراعين',
  agility1: 'T-Test (الرشاقة)',
  endur5:   'Yo-Yo IR1',
  speed5:   'اختبار نيلسون لسرعة رد الفعل',
}

export const TEST_TO_FACTOR = {
  coord3:   'coord',
  force1:   'strength',
  force4:   'strength',
  agility1: 'agility',
  endur5:   'endurance',
  speed5:   'reaction',
}

export const FACTOR_LABELS_AR = {
  coord:      'التوافق الحركي',
  strength:   'القوة العضلية',
  agility:    'الرشاقة',
  endurance:  'التحمل',
  reaction:   'سرعة رد الفعل',
}

// Variables where LOWER is better (reversed for Z-score)
export const REVERSE_METRICS = ['agility1', 'speed5']

// Factor order
export const FACTOR_ORDER = ['coord', 'strength', 'agility', 'endurance', 'reaction']

// ── GitHub config ─────────────────────────────────────────────────────────────
// Set these as Vercel environment variables:
//   VITE_GITHUB_TOKEN   → your personal access token (repo scope)
//   VITE_GITHUB_OWNER   → your GitHub username
//   VITE_GITHUB_REPO    → your repository name
//   VITE_GITHUB_BRANCH  → branch name (default: main)

export const GITHUB_CONFIG = {
  token:  import.meta.env.VITE_GITHUB_TOKEN  || '',
  owner:  import.meta.env.VITE_GITHUB_OWNER  || '',
  repo:   import.meta.env.VITE_GITHUB_REPO   || '',
  branch: import.meta.env.VITE_GITHUB_BRANCH || 'main',
}

// File paths inside the repo
export const FILES = {
  users:     'valid_users.csv',
  sessions:  'sessions.csv',
  norms:     'dummy_players_data_all_players.csv',
}

// ── Anthropic ─────────────────────────────────────────────────────────────────
export const ANTHROPIC_MODEL = 'claude-sonnet-4-6'

// ── Percentile thresholds ─────────────────────────────────────────────────────
export const PERC_HIGH   = 67   // ≥ 67 → green
export const PERC_LOW    = 33   // < 33 → red
