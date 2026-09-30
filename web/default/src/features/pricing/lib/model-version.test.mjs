import assert from 'node:assert/strict'
import test from 'node:test'
import { compareModelVersionsNewestFirst } from './model-version.ts'

test('sorts version numbers descending within a pricing group', () => {
  const models = [
    'gpt-5.3-codex-spark',
    'gpt-5.5',
    'gpt-6-sol',
    'gpt-5.4',
    'gpt-5.6-terra',
  ]
  assert.deepEqual(models.sort(compareModelVersionsNewestFirst), [
    'gpt-6-sol',
    'gpt-5.6-terra',
    'gpt-5.5',
    'gpt-5.4',
    'gpt-5.3-codex-spark',
  ])
})

test('sorts dotted and dashed versions numerically', () => {
  const models = ['claude-opus-4-8', 'claude-opus-5-1', 'claude-opus-4-10']
  assert.deepEqual(models.sort(compareModelVersionsNewestFirst), [
    'claude-opus-5-1',
    'claude-opus-4-10',
    'claude-opus-4-8',
  ])
})
