import test from 'node:test'
import assert from 'node:assert/strict'

import {
  calculateScore,
  evaluateRepositoryFiles,
  parseRepositoryInput,
  scoreLabel,
} from '../src/github.js'

test('parses common GitHub repository formats', () => {
  assert.deepEqual(parseRepositoryInput('https://github.com/openai/openai-agents-js'), {
    owner: 'openai',
    repo: 'openai-agents-js',
  })
  assert.deepEqual(parseRepositoryInput('git@github.com:openai/openai-agents-js.git'), {
    owner: 'openai',
    repo: 'openai-agents-js',
  })
  assert.deepEqual(parseRepositoryInput('openai/openai-agents-js/issues'), {
    owner: 'openai',
    repo: 'openai-agents-js',
  })
})

test('rejects incomplete repository input', () => {
  assert.throws(() => parseRepositoryInput('github.com/openai'), /owner\/repository/)
})

test('detects contribution files in supported locations', () => {
  const checks = evaluateRepositoryFiles([
    'README.md',
    'LICENSE',
    '.github/CONTRIBUTING.md',
    '.github/ISSUE_TEMPLATE/bug.yml',
    'docs/PULL_REQUEST_TEMPLATE.md',
  ], true)

  assert.equal(checks.every((check) => check.status === 'pass'), true)
  assert.equal(calculateScore(checks), 100)
})

test('scores only verified readiness signals', () => {
  const checks = evaluateRepositoryFiles(['README.md', 'LICENSE'], null)
  assert.equal(calculateScore(checks), 35)
  assert.equal(scoreLabel(35), 'Early setup')
  assert.equal(scoreLabel(70), 'Strong foundation')
  assert.equal(scoreLabel(100), 'Contribution-ready')
})
