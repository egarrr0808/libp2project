import { test } from 'node:test'
import assert from 'node:assert/strict'

import { MessageHandler } from '../../src/messages/handler.js'
import { KeyManager } from '../../src/crypto/keys.js'
import { MessageSigner } from '../../src/crypto/signing.js'
import { RateLimiter } from '../../src/security/ratelimit.js'
import { TOPIC } from '../../src/network/node.js'

// Minimal in-memory message store for this test
class InMemoryMessageStore {
  constructor() {
    this.messages = []
  }

  async saveMessage(m) {
    this.messages.push(m)
  }

  async getRecentMessages(limit) {
    return this.messages.slice(-limit)
  }
}

// Simple in-process pubsub bus shared by two nodes
class FakePubsub {
  constructor() {
    this.handlers = []
  }

  addEventListener(event, handler) {
    if (event !== 'message') return
    this.handlers.push(handler)
  }

  async subscribe(topic) {
    this.topic = topic
  }

  async publish(topic, data) {
    for (const h of this.handlers) {
      h({
        detail: {
          topic,
          data
        }
      })
    }
  }
}

test('two handlers exchange a signed message over shared pubsub bus', async () => {
  const pubsub = new FakePubsub()

  const keyA = new KeyManager()
  await keyA.initialize()
  const privA = keyA.getPrivateKey()
  const pubA = keyA.getPublicKeyString()

  const keyB = new KeyManager()
  await keyB.initialize()
  const privB = keyB.getPrivateKey()
  const pubB = keyB.getPublicKeyString()

  const nodeA = {
    peerId: { toString: () => 'peer-A' },
    services: { pubsub }
  }
  const nodeB = {
    peerId: { toString: () => 'peer-B' },
    services: { pubsub }
  }

  const storeA = new InMemoryMessageStore()
  const storeB = new InMemoryMessageStore()

  const handlerA = new MessageHandler(nodeA, new MessageSigner(privA), pubA, storeA, new RateLimiter())
  const handlerB = new MessageHandler(nodeB, new MessageSigner(privB), pubB, storeB, new RateLimiter())

  let received = null
  await handlerB.subscribe((msg) => {
    received = msg
  })
  await handlerA.subscribe(() => {})

  await handlerA.send('hello from A')

  const deadline = Date.now() + 2000
  while (!received && Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 20))
  }

  assert.ok(received, 'B should receive a message')
  assert.equal(received.content, 'hello from A')
  assert.equal(received.senderId, 'peer-A')

  // Ensure it was stored on B side
  const recentB = await storeB.getRecentMessages(10)
  assert.equal(recentB.length, 1)
  assert.equal(recentB[0].content, 'hello from A')
})
