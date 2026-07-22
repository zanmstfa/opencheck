import './style.css'
import {
  GitHubApiError,
  inspectRepository,
  parseRepositoryInput,
} from './github.js'

const app = document.querySelector('#app')

app.innerHTML = `
  <div class="shell">
    <header class="site-header">
      <a class="brand" href="./" aria-label="OpenCheck home">
        <span class="brand-mark" aria-hidden="true"></span>
        <span>OpenCheck<span class="brand-dot">.</span></span>
      </a>
      <nav class="nav-links" aria-label="Main navigation">
        <a class="nav-link" href="#how-it-works">How it works</a>
        <a class="github-link" href="https://github.com/zanmstfa/opencheck" target="_blank" rel="noreferrer">
          <span class="github-mark" aria-hidden="true"></span>
          <span class="github-label">GitHub</span>
        </a>
      </nav>
    </header>

    <main>
      <section class="hero" aria-labelledby="hero-title">
        <p class="eyebrow">Repository readiness check</p>
        <h1 id="hero-title">Is your repository ready to welcome <span>contributors?</span></h1>
        <p class="subtitle">
          Paste a public GitHub repository. OpenCheck scans the contribution basics
          and shows what is ready — and what should come next.
        </p>

        <form class="checker" id="checker-form" novalidate>
          <label class="input-wrap" for="repo-input">
            <span class="prompt-mark" aria-hidden="true">&gt;_</span>
            <span class="sr-only">GitHub repository URL or owner and repository name</span>
            <input
              class="repo-input"
              id="repo-input"
              name="repository"
              type="text"
              value="github.com/openai/openai-agents-js"
              placeholder="github.com/owner/repository"
              spellcheck="false"
              autocomplete="off"
              aria-describedby="form-message"
            />
          </label>
          <button class="scan-button" id="scan-button" type="submit">
            <span>Check repository</span>
            <span class="button-arrow" aria-hidden="true">→</span>
          </button>
        </form>
        <p class="form-message" id="form-message" role="alert"></p>
      </section>

      <section class="result-wrap" id="result" aria-live="polite" aria-busy="false"></section>

      <section class="method" id="how-it-works" aria-labelledby="method-title">
        <div>
          <p class="eyebrow">A focused first pass</p>
          <h2 id="method-title">Six signals that make contribution easier.</h2>
        </div>
        <ol class="method-list">
          <li><span>01</span><strong>Paste a public repository</strong><small>No login or token required.</small></li>
          <li><span>02</span><strong>OpenCheck reads its public structure</strong><small>Your code and data stay on GitHub.</small></li>
          <li><span>03</span><strong>Turn gaps into next steps</strong><small>A score is guidance, not a quality verdict.</small></li>
        </ol>
      </section>
    </main>

    <footer class="site-footer">
      <span>OpenCheck is an independent open-source readiness tool.</span>
      <span>Public repositories only · GitHub REST API</span>
    </footer>
  </div>
`

const form = document.querySelector('#checker-form')
const input = document.querySelector('#repo-input')
const button = document.querySelector('#scan-button')
const result = document.querySelector('#result')
const formMessage = document.querySelector('#form-message')

const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const formatNumber = (value) => new Intl.NumberFormat('en').format(value ?? 0)

const demoReport = {
  repository: {
    fullName: 'openai / openai-agents-js',
    htmlUrl: 'https://github.com/openai/openai-agents-js',
    description: 'A lightweight, powerful framework for multi-agent workflows.',
    stars: 11800,
    language: 'TypeScript',
    archived: false,
  },
  score: 78,
  scoreLabel: 'Strong foundation',
  example: true,
  checks: [
    { id: 'readme', label: 'README', status: 'pass', detail: 'Project overview found' },
    { id: 'license', label: 'LICENSE', status: 'pass', detail: 'Open-source license found' },
    { id: 'contributing', label: 'CONTRIBUTING', status: 'pass', detail: 'Contribution guide found' },
    { id: 'issueTemplate', label: 'Issue template', status: 'fail', detail: 'No issue template found' },
    { id: 'prTemplate', label: 'Pull request template', status: 'pass', detail: 'Pull request guidance found' },
    { id: 'goodFirstIssue', label: 'Good first issue', status: 'review', detail: 'Needs a live API check' },
  ],
}

function iconForStatus(status) {
  if (status === 'pass') return '✓'
  if (status === 'fail') return '×'
  return '?'
}

function labelForStatus(status) {
  if (status === 'pass') return 'Ready'
  if (status === 'fail') return 'Missing'
  return 'Review'
}

function renderReport(report) {
  const readyCount = report.checks.filter((check) => check.status === 'pass').length
  const repo = report.repository
  const meta = [
    repo.language ? escapeHtml(repo.language) : null,
    `${formatNumber(repo.stars)} stars`,
  ].filter(Boolean)

  result.innerHTML = `
    <article class="result-card">
      <aside class="score-panel">
        <div>
          <div class="panel-kicker-row">
            <p class="panel-label">${report.example ? 'Example score' : 'Readiness score'}</p>
            ${report.example ? '<span class="demo-badge">Preview</span>' : ''}
          </div>
          <a class="repo-name" href="${escapeHtml(repo.htmlUrl)}" target="_blank" rel="noreferrer">
            ${escapeHtml(repo.fullName)} <span aria-hidden="true">↗</span>
          </a>
          <p class="repo-description">${escapeHtml(repo.description || 'No repository description provided.')}</p>
          <p class="repo-meta">${meta.join('<span aria-hidden="true">·</span>')}</p>
        </div>
        <div>
          <div class="score-ring" style="--score: ${report.score}%" role="img" aria-label="Readiness score ${report.score} out of 100">
            <div class="score-value">${report.score}<span>/100</span></div>
          </div>
          <p class="score-caption">${escapeHtml(report.scoreLabel)}</p>
        </div>
      </aside>

      <div class="checks-panel">
        <div class="checks-head">
          <div>
            <p class="panel-label">6 contribution signals</p>
            <h2>Contribution foundation</h2>
          </div>
          <p class="checks-meta">${readyCount} ready · ${6 - readyCount} to review</p>
        </div>
        ${repo.archived ? '<p class="archive-note">This repository is archived and no longer accepts changes.</p>' : ''}
        <ul class="check-list">
          ${report.checks.map((check) => `
            <li class="check-item ${check.status}">
              <span class="status-icon" aria-hidden="true">${iconForStatus(check.status)}</span>
              <span class="check-copy">
                <strong>${escapeHtml(check.label)}</strong>
                <small>${escapeHtml(check.detail)}</small>
              </span>
              <span class="check-status">${labelForStatus(check.status)}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    </article>
    <div class="result-footer">
      <span class="pulse" aria-hidden="true"></span>
      <span>${report.example
        ? 'Example only · run a check for live repository data'
        : `Checked just now${report.rateLimit?.remaining != null ? ` · ${report.rateLimit.remaining} API requests remaining` : ''}`
      }</span>
    </div>
  `
}

function renderLoading(repository) {
  result.innerHTML = `
    <article class="loading-card">
      <span class="scanner" aria-hidden="true"></span>
      <div>
        <p class="panel-label">Reading public repository data</p>
        <h2>Checking ${escapeHtml(repository.owner)} / ${escapeHtml(repository.repo)}</h2>
        <p>Looking for contribution docs, templates, and beginner-friendly issues.</p>
      </div>
    </article>
  `
}

function renderError(error) {
  let title = 'We could not check that repository.'
  let message = error.message

  if (error instanceof GitHubApiError && error.status === 404) {
    title = 'Repository not found.'
    message = 'Check the URL and make sure the repository is public.'
  } else if (error instanceof GitHubApiError && error.rateLimit?.remaining === 0) {
    title = 'GitHub’s public API limit has been reached.'
    const reset = error.rateLimit.reset
      ? new Date(error.rateLimit.reset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'later'
    message = `Try again after ${reset}. OpenCheck does not ask for a GitHub token.`
  } else if (error.name === 'AbortError') {
    title = 'GitHub took too long to respond.'
    message = 'Please try again in a moment.'
  }

  result.innerHTML = `
    <article class="error-card">
      <span class="error-mark" aria-hidden="true">!</span>
      <div>
        <p class="panel-label">Check interrupted</p>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(message)}</p>
      </div>
      <button class="retry-button" type="button">Try again</button>
    </article>
  `
  result.querySelector('.retry-button')?.addEventListener('click', () => form.requestSubmit())
}

async function runCheck(rawValue) {
  formMessage.textContent = ''

  let repository
  try {
    repository = parseRepositoryInput(rawValue)
  } catch (error) {
    formMessage.textContent = error.message
    input.focus()
    return
  }

  button.disabled = true
  button.querySelector('span:first-child').textContent = 'Checking…'
  result.setAttribute('aria-busy', 'true')
  renderLoading(repository)

  try {
    const report = await inspectRepository(repository)
    renderReport(report)
    const url = new URL(window.location.href)
    url.searchParams.set('repo', `${repository.owner}/${repository.repo}`)
    window.history.replaceState({}, '', url)
  } catch (error) {
    renderError(error)
  } finally {
    button.disabled = false
    button.querySelector('span:first-child').textContent = 'Check repository'
    result.setAttribute('aria-busy', 'false')
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault()
  runCheck(input.value)
})

renderReport(demoReport)

const queryRepository = new URLSearchParams(window.location.search).get('repo')
if (queryRepository) {
  input.value = queryRepository
  runCheck(queryRepository)
}
