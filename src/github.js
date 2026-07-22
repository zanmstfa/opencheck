const API_ROOT = 'https://api.github.com'
const API_VERSION = '2022-11-28'

export const CHECK_DEFINITIONS = [
  { id: 'readme', label: 'README', weight: 20 },
  { id: 'license', label: 'LICENSE', weight: 15 },
  { id: 'contributing', label: 'CONTRIBUTING', weight: 20 },
  { id: 'issueTemplate', label: 'Issue template', weight: 15 },
  { id: 'prTemplate', label: 'Pull request template', weight: 15 },
  { id: 'goodFirstIssue', label: 'Good first issue', weight: 15 },
]

export class GitHubApiError extends Error {
  constructor(message, status, rateLimit = {}) {
    super(message)
    this.name = 'GitHubApiError'
    this.status = status
    this.rateLimit = rateLimit
  }
}

export function parseRepositoryInput(rawValue) {
  const value = String(rawValue || '').trim()
  if (!value) throw new Error('Enter a GitHub repository URL to continue.')

  let candidate = value
    .replace(/^git@github\.com:/i, '')
    .replace(/^https?:\/\/(?:www\.)?github\.com\//i, '')
    .replace(/^(?:www\.)?github\.com\//i, '')
    .split(/[?#]/)[0]
    .replace(/\/$/, '')
    .replace(/\.git$/i, '')

  const parts = candidate.split('/').filter(Boolean)
  if (parts.length < 2) {
    throw new Error('Use a GitHub URL or the format owner/repository.')
  }

  const [owner, repo] = parts
  const validPart = /^[a-z0-9_.-]+$/i
  if (!validPart.test(owner) || !validPart.test(repo)) {
    throw new Error('That does not look like a valid GitHub repository.')
  }

  return { owner, repo }
}

function rateLimitFrom(response) {
  const numberOrNull = (value) => value === null ? null : Number(value)
  return {
    limit: numberOrNull(response.headers.get('x-ratelimit-limit')),
    remaining: numberOrNull(response.headers.get('x-ratelimit-remaining')),
    reset: numberOrNull(response.headers.get('x-ratelimit-reset')),
  }
}

async function apiGet(path, { fetchImpl = fetch, signal } = {}) {
  const response = await fetchImpl(`${API_ROOT}${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': API_VERSION,
    },
    signal,
  })

  const rateLimit = rateLimitFrom(response)
  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    throw new GitHubApiError(
      data?.message || `GitHub returned status ${response.status}.`,
      response.status,
      rateLimit,
    )
  }

  return { data, rateLimit }
}

const fileName = (path) => path.split('/').at(-1) || ''

export function evaluateRepositoryFiles(paths, goodFirstIssue) {
  const normalized = paths.map((path) => path.toLowerCase())
  const has = (predicate) => normalized.some(predicate)

  const availability = {
    readme: has((path) => !path.includes('/') && /^readme(?:\.[^/]+)?$/.test(path)),
    license: has((path) => !path.includes('/') && /^(?:license|licence|copying)(?:\.[^/]+)?$/.test(path)),
    contributing: has((path) => {
      const directory = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''
      return ['','.github','docs'].includes(directory) && /^contributing(?:\.[^/]+)?$/.test(fileName(path))
    }),
    issueTemplate: has((path) =>
      path.startsWith('.github/issue_template/') && !path.endsWith('/config.yml') && !path.endsWith('/config.yaml')
    ) || has((path) => /^(?:\.github\/|docs\/)?issue_template(?:\.[^/]+)?$/.test(path)),
    prTemplate: has((path) =>
      path.startsWith('.github/pull_request_template/')
    ) || has((path) => /^(?:\.github\/|docs\/)?pull_request_template(?:\.[^/]+)?$/.test(path)),
  }

  const details = {
    readme: ['Project overview found', 'Add a root README to explain the project'],
    license: ['Open-source license found', 'Add a license so reuse terms are clear'],
    contributing: ['Contribution guide found', 'Explain setup, testing, and contribution steps'],
    issueTemplate: ['Issue guidance found', 'Add an issue form or issue template'],
    prTemplate: ['Pull request guidance found', 'Add a pull request template'],
  }

  const fileChecks = CHECK_DEFINITIONS.slice(0, 5).map((definition) => ({
    ...definition,
    status: availability[definition.id] ? 'pass' : 'fail',
    detail: details[definition.id][availability[definition.id] ? 0 : 1],
  }))

  const goodFirstCheck = {
    ...CHECK_DEFINITIONS[5],
    status: goodFirstIssue === null ? 'review' : goodFirstIssue ? 'pass' : 'fail',
    detail: goodFirstIssue === null
      ? 'Could not verify beginner-friendly issues'
      : goodFirstIssue
        ? 'An open beginner-friendly issue was found'
        : 'No open issue with the “good first issue” label',
  }

  return [...fileChecks, goodFirstCheck]
}

export function calculateScore(checks) {
  return checks.reduce((score, check) => score + (check.status === 'pass' ? check.weight : 0), 0)
}

export function scoreLabel(score) {
  if (score >= 85) return 'Contribution-ready'
  if (score >= 65) return 'Strong foundation'
  if (score >= 40) return 'Needs a few essentials'
  return 'Early setup'
}

function lowestRateLimit(...limits) {
  const valid = limits.filter((limit) => limit?.remaining != null)
  if (!valid.length) return limits.find(Boolean) || null
  return valid.sort((a, b) => a.remaining - b.remaining)[0]
}

export async function inspectRepository({ owner, repo }, { fetchImpl = fetch } = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  const encodedOwner = encodeURIComponent(owner)
  const encodedRepo = encodeURIComponent(repo)

  try {
    const repositoryResponse = await apiGet(`/repos/${encodedOwner}/${encodedRepo}`, {
      fetchImpl,
      signal: controller.signal,
    })
    const repository = repositoryResponse.data

    const treePromise = apiGet(
      `/repos/${encodedOwner}/${encodedRepo}/git/trees/${encodeURIComponent(repository.default_branch)}?recursive=1`,
      { fetchImpl, signal: controller.signal },
    )

    const issuesPromise = repository.has_issues
      ? apiGet(
          `/repos/${encodedOwner}/${encodedRepo}/issues?state=open&labels=good%20first%20issue&per_page=1`,
          { fetchImpl, signal: controller.signal },
        ).catch((error) => {
          if (error instanceof GitHubApiError && error.rateLimit?.remaining === 0) throw error
          return { data: null, rateLimit: error.rateLimit || null }
        })
      : Promise.resolve({ data: [], rateLimit: null })

    const [treeResponse, issuesResponse] = await Promise.all([treePromise, issuesPromise])
    const paths = (treeResponse.data.tree || [])
      .filter((entry) => entry.type === 'blob')
      .map((entry) => entry.path)
    const goodFirstIssue = issuesResponse.data === null ? null : issuesResponse.data.length > 0
    let checks = evaluateRepositoryFiles(paths, goodFirstIssue)

    if (treeResponse.data.truncated) {
      checks = checks.map((check) => check.status === 'fail' && check.id !== 'goodFirstIssue'
        ? { ...check, status: 'review', detail: 'Repository is too large to verify this automatically' }
        : check)
    }

    const score = calculateScore(checks)

    return {
      repository: {
        fullName: repository.full_name.replace('/', ' / '),
        htmlUrl: repository.html_url,
        description: repository.description,
        stars: repository.stargazers_count,
        language: repository.language,
        archived: repository.archived,
      },
      checks,
      score,
      scoreLabel: scoreLabel(score),
      treeTruncated: Boolean(treeResponse.data.truncated),
      rateLimit: lowestRateLimit(
        repositoryResponse.rateLimit,
        treeResponse.rateLimit,
        issuesResponse.rateLimit,
      ),
    }
  } finally {
    clearTimeout(timeout)
  }
}
