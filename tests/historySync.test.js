import { test } from 'node:test'
import assert from 'node:assert/strict'

import { HistorySync, HISTORY_TOPIC } from '../src/sync/history.js'

class FakePubsub {
  constructor() {
    this.handlers = []
    this.published = []
  }

  addEventListener(event, handler) {
    if (event !== 'message') return
    this.handlers.push(handler)
  }

  async subscribe(topic) {
    // nothing needed for tests
    this.subscribedTopic = topic
  }

  async publish(topic, data) {
    this.published.push({ topic, data })
    // Loop back to all handlers to simulate local delivery
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

class FakeMessageStore {
  constructor(messages = []) {
    this.messages = messages
    this.saved = []
  }

  async getRecentMessages(limit) {
    return this.messages.slice(0, limit)
  }

  async saveMessage(m) {
    this.saved.push(m)
  }
}

test('HistorySync request/response roundtrip persists messages', async () => {
  const fakeMessages = [
    { id: 'm1', timestamp: Date.now(), content: 'hello' },
    { id: 'm2', timestamp: Date.now(), content: 'world' }
  ]

  const pubsub = new FakePubsub()

  const nodeA = {
    peerId: { toString: () => 'peer-A' },
    services: { pubsub }
  }
  const nodeB = {
    peerId: { toString: () => 'peer-B' },
    services: { pubsub }
  }

  const storeA = new FakeMessageStore()
  const storeB = new FakeMessageStore(fakeMessages)

  const syncA = new HistorySync(nodeA, storeA)
  const syncB = new HistorySync(nodeB, storeB)

  await syncA.start()
  await syncB.start()

  const since = Date.now() - 1000
  const received = await syncA.requestHistory(since, 10, 'peer-B', 1000)

  assert.equal(received.length, 2)
  // StoreA should have persisted them as well
  assert.equal(storeA.saved.length, 2)
})
