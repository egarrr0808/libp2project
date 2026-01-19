import { test } from 'node:test'
import assert from 'node:assert/strict'

import { RateLimiter } from '../src/security/ratelimit.js'

test('RateLimiter allows up to maxMessages in time window', () => {
  const limiter = new RateLimiter(3, 1000)
  const peerId = 'peer-1'

  assert.equal(limiter.canSend(peerId), true)
  assert.equal(limiter.canSend(peerId), true)
  assert.equal(limiter.canSend(peerId), true)
  // 4th should be blocked
  assert.equal(limiter.canSend(peerId), false)
})

test('RateLimiter resets after timeWindow passes', async () => {
  const limiter = new RateLimiter(1, 100)
  const peerId = 'peer-2'

  assert.equal(limiter.canSend(peerId), true)
  assert.equal(limiter.canSend(peerId), false)

  // Wait for time window to expire
  await new Promise(r => setTimeout(r, 120))

  assert.equal(limiter.canSend(peerId), true)
})
